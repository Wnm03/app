'use strict';
// tests/financial-goal-api.test.js — cakupan modules/finance/financial-goal-api.js
// (FinancialGoalAPI), sebelumnya 0 test file yang menyentuhnya langsung.
// 2 sumber di-mock: goalAdapterList(D) (goal-goal apa adanya) &
// CashFlowProjectionAPI.summary() (surplus bulanan).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ D, goalAdapterList, CashFlowProjectionAPI }) {
  const extra = { D: D !== undefined ? D : {} };
  if (goalAdapterList !== undefined) extra.goalAdapterList = goalAdapterList;
  if (CashFlowProjectionAPI !== undefined) extra.CashFlowProjectionAPI = CashFlowProjectionAPI;
  return loadSource(['modules/finance/financial-goal-api.js'], extra, ['FinancialGoalAPI']);
}

function goal(o) { return Object.assign({ id: 'g1', sourceKind: 'target', name: 'Goal', emoji: '🎯', targetAmount: 0, currentAmount: 0, progressPct: 0 }, o); }
const surplusOk = (n) => ({ summary: () => ({ ok: true, income: { avgMonthly: n >= 0 ? n + 3000000 : 3000000 }, expense: { avgMonthly: n >= 0 ? 3000000 : 3000000 - n } }) });

// --- _goals() ---

test('_goals() -> {ok:false} kalau goalAdapterList belum dimuat', () => {
  const { FinancialGoalAPI: api } = makeCtx({});
  assert.equal(api._goals().ok, false);
});

test('_goals() -> {ok:false} kalau D belum tersedia', () => {
  const { FinancialGoalAPI: api } = makeCtx({ D: null, goalAdapterList: () => [] });
  assert.equal(api._goals().ok, false);
});

test('_goals() -> {ok:false} kalau goalAdapterList() throw', () => {
  const { FinancialGoalAPI: api } = makeCtx({ goalAdapterList: () => { throw new Error('x'); } });
  assert.equal(api._goals().ok, false);
});

// --- financialGoals() ---

test('financialGoals() -> goals apa adanya + count', () => {
  const { FinancialGoalAPI: api } = makeCtx({ goalAdapterList: () => [goal({ id: 'a' }), goal({ id: 'b' })] });
  const r = api.financialGoals();
  assert.equal(r.ok, true);
  assert.equal(r.count, 2);
  assert.equal(r.goals.length, 2);
});

// --- goalProgress() ---

test('goalProgress() -> pengelompokan achieved(>=100)/inProgress(0<x<100)/notStarted(<=0) + avgProgressPct', () => {
  const { FinancialGoalAPI: api } = makeCtx({
    goalAdapterList: () => [goal({ progressPct: 100 }), goal({ progressPct: 50 }), goal({ progressPct: 0 })],
  });
  const r = api.goalProgress();
  assert.equal(r.count, 3);
  assert.equal(r.achievedCount, 1);
  assert.equal(r.inProgressCount, 1);
  assert.equal(r.notStartedCount, 1);
  assert.equal(r.avgProgressPct, 50); // (100+50+0)/3
});

test('goalProgress() -> avgProgressPct 0 & semua count 0 kalau tidak ada goal', () => {
  const { FinancialGoalAPI: api } = makeCtx({ goalAdapterList: () => [] });
  const r = api.goalProgress();
  assert.equal(r.count, 0);
  assert.equal(r.avgProgressPct, 0);
});

// --- _surplus() ---

test('_surplus() -> {ok:false} kalau CashFlowProjectionAPI belum dimuat', () => {
  const { FinancialGoalAPI: api } = makeCtx({});
  assert.equal(api._surplus().ok, false);
});

test('_surplus() -> monthlySurplus = income.avgMonthly - expense.avgMonthly', () => {
  const { FinancialGoalAPI: api } = makeCtx({ CashFlowProjectionAPI: { summary: () => ({ ok: true, income: { avgMonthly: 8000000 }, expense: { avgMonthly: 3000000 } }) } });
  assert.equal(api._surplus().monthlySurplus, 5000000);
});

// --- targetProjection() ---

test('targetProjection() -> skip goal tanpa targetAmount atau sudah tercapai (progressPct>=100)', () => {
  const { FinancialGoalAPI: api } = makeCtx({
    goalAdapterList: () => [goal({ id: 'noTarget', targetAmount: 0, progressPct: 50 }), goal({ id: 'done', targetAmount: 1000000, currentAmount: 1000000, progressPct: 100 })],
    CashFlowProjectionAPI: surplusOk(2000000),
  });
  const r = api.targetProjection();
  assert.equal(r.ok, true);
  assert.equal(r.projections.length, 0);
});

test('targetProjection() -> remaining = targetAmount-currentAmount, monthsNeeded = ceil(remaining/surplus)', () => {
  const { FinancialGoalAPI: api } = makeCtx({
    goalAdapterList: () => [goal({ id: 'g1', targetAmount: 10000000, currentAmount: 4000000, progressPct: 40 })],
    CashFlowProjectionAPI: { summary: () => ({ ok: true, income: { avgMonthly: 5000000 }, expense: { avgMonthly: 3000000 } }) }, // surplus 2jt
  });
  const r = api.targetProjection();
  assert.equal(r.monthlySurplus, 2000000);
  assert.equal(r.projections[0].remaining, 6000000);
  assert.equal(r.projections[0].monthsNeeded, 3); // ceil(6jt/2jt)
});

test('targetProjection() -> monthsNeeded null kalau surplus<=0', () => {
  const { FinancialGoalAPI: api } = makeCtx({
    goalAdapterList: () => [goal({ id: 'g1', targetAmount: 10000000, currentAmount: 4000000, progressPct: 40 })],
    CashFlowProjectionAPI: { summary: () => ({ ok: true, income: { avgMonthly: 3000000 }, expense: { avgMonthly: 5000000 } }) }, // surplus -2jt
  });
  const r = api.targetProjection();
  assert.equal(r.monthlySurplus, -2000000);
  assert.equal(r.projections[0].monthsNeeded, null);
});

test('targetProjection() -> {ok:false} diteruskan kalau goals gagal atau surplus gagal', () => {
  const failGoals = makeCtx({}).FinancialGoalAPI;
  assert.equal(failGoals.targetProjection().ok, false);

  const failSurplus = makeCtx({ goalAdapterList: () => [goal({ progressPct: 50, targetAmount: 100 })] }).FinancialGoalAPI;
  assert.equal(failSurplus.targetProjection().ok, false);
});

// --- goalRecommendation() ---

test('goalRecommendation() -> [] kalau tidak ada goal sama sekali', () => {
  const { FinancialGoalAPI: api } = makeCtx({ goalAdapterList: () => [] });
  assert.equal(api.goalRecommendation().length, 0);
});

test('goalRecommendation() -> "goal_no_surplus" (warning) kalau surplus<=0 & ada goal belum tercapai', () => {
  const { FinancialGoalAPI: api } = makeCtx({
    goalAdapterList: () => [goal({ progressPct: 50, targetAmount: 1000000 })],
    CashFlowProjectionAPI: { summary: () => ({ ok: true, income: { avgMonthly: 3000000 }, expense: { avgMonthly: 5000000 } }) },
  });
  const recs = api.goalRecommendation();
  assert.ok(recs.some((r) => r.code === 'goal_no_surplus' && r.type === 'warning'));
});

test('goalRecommendation() -> "goal_near_complete" (positive) untuk goal progress 80-99%', () => {
  const { FinancialGoalAPI: api } = makeCtx({
    goalAdapterList: () => [goal({ name: 'Dana Darurat', progressPct: 90, targetAmount: 1000000 })],
    CashFlowProjectionAPI: surplusOk(2000000),
  });
  const recs = api.goalRecommendation();
  const near = recs.find((r) => r.code === 'goal_near_complete');
  assert.equal(near.type, 'positive');
  assert.match(near.message, /Dana Darurat/);
});

test('goalRecommendation() -> "goal_not_started" (info) untuk goal progress<=0', () => {
  const { FinancialGoalAPI: api } = makeCtx({
    goalAdapterList: () => [goal({ name: 'Beli Motor', progressPct: 0, targetAmount: 1000000 })],
    CashFlowProjectionAPI: surplusOk(2000000),
  });
  const recs = api.goalRecommendation();
  const ns = recs.find((r) => r.code === 'goal_not_started');
  assert.equal(ns.type, 'info');
});

test('goalRecommendation() -> "goal_all_achieved" (positive) kalau semua goal tercapai', () => {
  const { FinancialGoalAPI: api } = makeCtx({
    goalAdapterList: () => [goal({ progressPct: 100 }), goal({ id: 'g2', progressPct: 100 })],
    CashFlowProjectionAPI: surplusOk(2000000),
  });
  const recs = api.goalRecommendation();
  assert.ok(recs.some((r) => r.code === 'goal_all_achieved' && r.type === 'positive'));
});

// --- summary() ---

test('summary() -> ok:true & gabungan ke-3 kalau goalProgress ok', () => {
  const { FinancialGoalAPI: api } = makeCtx({
    goalAdapterList: () => [goal({ progressPct: 50, targetAmount: 1000000 })],
    CashFlowProjectionAPI: surplusOk(2000000),
  });
  const r = api.summary();
  assert.equal(r.ok, true);
  assert.equal(r.goalProgress.count, 1);
  assert.ok(Array.isArray(r.recommendation));
});

test('summary() -> ok:false kalau goalAdapterList belum dimuat, recommendation tetap array kosong', () => {
  const { FinancialGoalAPI: api } = makeCtx({});
  const r = api.summary();
  assert.equal(r.ok, false);
  assert.equal(r.recommendation.length, 0);
});
