'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');

function ctx({ projected = 1000, forecastOk = true, debt = null, goals = null, budget = null } = {}) {
  const writes = { save: 0 };
  const FinancialForecastAPI = { summary: () => forecastOk
    ? { ok: true, cashflowProjection: { projected } }
    : { ok: false, reason: 'forecast unavailable' } };
  const DebtOptimizerAPI = { summary: () => debt || { ok: true, debtOverview: { activeCount: 0 }, dsr: { ok: true, pct: 10 } } };
  const FinancialGoalAPI = { summary: () => goals || { ok: true, goalProgress: { ok: true, count: 0, achievedCount: 0 } } };
  const BudgetRecommendationAPI = { summary: () => budget || { ok: true, overCount: 0 } };
  const loaded = loadSource(['modules/finance/finance-allocation-api.js'], {
    FinancialForecastAPI, DebtOptimizerAPI, FinancialGoalAPI, BudgetRecommendationAPI,
    save: () => { writes.save++; }, D: { transactions: [], bills: [] },
  }, ['FinanceAllocationAPI']);
  return { api: loaded.FinanceAllocationAPI, writes };
}

test('S2601: missing or failed forecast returns INSUFFICIENT_DATA and blocks investment', () => {
  const { api } = ctx({ forecastOk: false });
  const result = api.summary();
  assert.equal(result.ok, false);
  assert.equal(result.status, 'INSUFFICIENT_DATA');
  assert.equal(result.safeInvestableAmount, null);
  assert.equal(result.investmentAllowed, false);
  assert.equal(result.actualFreeCashVerified, false);
  assert.equal(result.recommendations[0].code, 'verify-data');
});

test('S2601: negative projected balance is DEFICIT and never suggests investment', () => {
  const { api } = ctx({ projected: -125000 });
  const result = api.summary();
  assert.equal(result.status, 'DEFICIT');
  assert.equal(result.projectedEndingBalance, -125000);
  assert.equal(result.investmentAllowed, false);
  assert.equal(result.safeInvestableAmount, null);
  assert.ok(result.recommendations.some(x => x.code === 'protect-essentials'));
});

test('S2601: zero projected balance is NO_FREE_CASH', () => {
  const { api } = ctx({ projected: 0 });
  const result = api.summary();
  assert.equal(result.status, 'NO_FREE_CASH');
  assert.equal(result.investmentAllowed, false);
});

test('S2601: positive projection is not misrepresented as actual investable cash', () => {
  const { api } = ctx({ projected: 250000, debt: { ok: true, debtOverview: { activeCount: 1 }, dsr: { ok: true, pct: 34 } }, goals: { ok: true, goalProgress: { ok: true, count: 2, achievedCount: 1 } }, budget: { ok: true, spendingAnalysis: { overCount: 1 } } });
  const result = api.summary();
  assert.equal(result.status, 'SURPLUS');
  assert.equal(result.actualFreeCashVerified, false);
  assert.equal(result.safeInvestableAmount, null);
  assert.equal(result.investmentAllowed, false);
  assert.deepEqual(Array.from(result.recommendations, x => x.code), ['verify-actual-cash', 'review-budget', 'review-obligations-goals', 'verify-free-cash']);
});

test('S2601: API is read-only and only composes existing APIs', () => {
  const { api, writes } = ctx({ projected: 1 });
  const result = api.summary();
  assert.equal(result.basis, '30-day-projection');
  assert.equal(writes.save, 0);
  assert.deepEqual(Array.from(result.sources), ['FinancialForecastAPI.summary()']);
});

test('S2601: dashboard-provided cashflow is reused without recalculating forecast', () => {
  let forecastCalls = 0;
  const loaded = loadSource(['modules/finance/finance-allocation-api.js'], {
    FinancialForecastAPI: { summary: () => { forecastCalls++; return { ok: true, cashflowProjection: { projected: 99 } }; } },
  }, ['FinanceAllocationAPI']);
  const result = loaded.FinanceAllocationAPI.summary({ ok: true, projected: 50 });
  assert.equal(result.projectedEndingBalance, 50);
  assert.equal(forecastCalls, 0);
});

test('S2601: API has no direct storage mutation or duplicated cash/obligation formula', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'modules/finance/finance-allocation-api.js'), 'utf8');
  assert.doesNotMatch(source, /localStorage|indexedDB|\.save\s*\(|D\.(transactions|bills|accounts)\s*=/);
  assert.doesNotMatch(source, /localStorage|indexedDB|\.save\s*\(|D\.(transactions|bills|accounts)\s*=/);
  assert.match(source, /totalSaldoAkun\(\)/);
  assert.match(source, /computeCashflowForecast\(\)/);
  assert.match(source, /getMonthlyCashProjection\(\)/);
  assert.match(source, /safeInvestableAmount:\s*null/);
});
