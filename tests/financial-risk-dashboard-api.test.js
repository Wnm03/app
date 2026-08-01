'use strict';
// tests/financial-risk-dashboard-api.test.js — cakupan
// modules/finance/financial-risk-dashboard-api.js
// (FinancialRiskDashboardAPI), sebelumnya 0 test file yang menyentuhnya
// langsung. File ini menggabungkan warning dari 3 sumber lain
// (DebtOptimizerAPI/FinancialHealthScoreAPI/FinanceIntelligence) + 1
// helper lokal (_emergencyFundRisk, baca D.targets langsung), lalu
// mengkategorikan JUMLAH faktor risiko jadi Rendah/Sedang/Tinggi.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(targets) { return { targets: targets || [] }; }

function makeCtx({ D, DebtOptimizerAPI, FinancialHealthScoreAPI, FinanceIntelligence }) {
  const extra = { D: D || makeD() };
  if (DebtOptimizerAPI !== undefined) extra.DebtOptimizerAPI = DebtOptimizerAPI;
  if (FinancialHealthScoreAPI !== undefined) extra.FinancialHealthScoreAPI = FinancialHealthScoreAPI;
  if (FinanceIntelligence !== undefined) extra.FinanceIntelligence = FinanceIntelligence;
  return loadSource(['modules/finance/financial-risk-dashboard-api.js'], extra, ['FinancialRiskDashboardAPI']);
}

// --- helper internal: guard "belum dimuat" / throw -> [] (tidak pernah throw) ---

test('_debtRisk()/_healthRisk()/_cashflowBudgetRisk() -> [] kalau sumbernya belum dimuat', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({ D: makeD([{ isDanaDarurat: true, amount: 100, saved: 100 }]) });
  assert.equal(api._debtRisk().length, 0);
  assert.equal(api._healthRisk().length, 0);
  assert.equal(api._cashflowBudgetRisk().length, 0);
});

test('_debtRisk() -> [] kalau debtRecommendation() throw (tidak ikut throw)', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({ DebtOptimizerAPI: { debtRecommendation: () => { throw new Error('x'); } } });
  assert.equal(api._debtRisk().length, 0);
});

test('_debtRisk()/_healthRisk()/_cashflowBudgetRisk() -> hanya item type warning yang lolos, dibungkus domain+icon', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({
    DebtOptimizerAPI: { debtRecommendation: () => [{ type: 'warning', code: 'debt_high_dsr', message: 'DSR tinggi' }, { type: 'positive', code: 'ok' }] },
    FinancialHealthScoreAPI: { financialHealthRecommendation: () => [{ type: 'warning', code: 'health_component_low', message: 'Tabungan rendah' }] },
    FinanceIntelligence: { insights: () => [{ type: 'info', code: 'x' }, { type: 'warning', code: 'defisit_bulanan', message: 'Defisit' }] },
  });
  const debt = api._debtRisk();
  assert.equal(debt.length, 1);
  assert.equal(debt[0].domain, 'debt');
  assert.equal(debt[0].icon, '📕');
  assert.equal(debt[0].code, 'debt_high_dsr');

  const health = api._healthRisk();
  assert.equal(health.length, 1);
  assert.equal(health[0].domain, 'health');

  const cf = api._cashflowBudgetRisk();
  assert.equal(cf.length, 1);
  assert.equal(cf[0].domain, 'cashflow_budget');
});

// --- _emergencyFundRisk() ---

test('_emergencyFundRisk() -> [] kalau target Dana Darurat sudah tercapai (saved>=amount)', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({ D: makeD([{ isDanaDarurat: true, amount: 6000000, saved: 6000000 }]) });
  assert.equal(api._emergencyFundRisk().length, 0);
});

test('_emergencyFundRisk() -> 1 item warning + % progres kalau belum tercapai', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({ D: makeD([{ isDanaDarurat: true, amount: 10000000, saved: 4000000 }]) });
  const r = api._emergencyFundRisk();
  assert.equal(r.length, 1);
  assert.equal(r[0].type, 'warning');
  assert.equal(r[0].domain, 'emergency_fund');
  assert.match(r[0].message, /40% dari target/);
});

test('_emergencyFundRisk() -> pesan "Belum ada Target" kalau belum punya target Dana Darurat sama sekali', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({ D: makeD([]) });
  const r = api._emergencyFundRisk();
  assert.equal(r.length, 1);
  assert.match(r[0].message, /Belum ada Target Dana Darurat/);
});

// --- riskFactors() / riskLevel() / summary() ---

test('riskFactors() -> gabungan ke-4 sumber apa adanya', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({
    D: makeD([{ isDanaDarurat: true, amount: 10000000, saved: 1000000 }]),
    DebtOptimizerAPI: { debtRecommendation: () => [{ type: 'warning', code: 'a' }] },
    FinancialHealthScoreAPI: { financialHealthRecommendation: () => [{ type: 'warning', code: 'b' }] },
  });
  const r = api.riskFactors();
  assert.equal(r.length, 3); // debt + health + emergency fund
});

test('riskLevel() -> 0 faktor -> Rendah, 1-2 -> Sedang, 3+ -> Tinggi', () => {
  const low = makeCtx({ D: makeD([{ isDanaDarurat: true, amount: 100, saved: 100 }]) }).FinancialRiskDashboardAPI.riskLevel();
  assert.equal(low.count, 0); assert.equal(low.level, 'low'); assert.equal(low.label, 'Rendah');

  const medium = makeCtx({
    D: makeD([{ isDanaDarurat: true, amount: 100, saved: 100 }]),
    DebtOptimizerAPI: { debtRecommendation: () => [{ type: 'warning', code: 'a' }] },
  }).FinancialRiskDashboardAPI.riskLevel();
  assert.equal(medium.count, 1); assert.equal(medium.level, 'medium'); assert.equal(medium.label, 'Sedang');

  const high = makeCtx({
    D: makeD([]), // emergency fund warning (1)
    DebtOptimizerAPI: { debtRecommendation: () => [{ type: 'warning', code: 'a' }] }, // (2)
    FinancialHealthScoreAPI: { financialHealthRecommendation: () => [{ type: 'warning', code: 'b' }] }, // (3)
  }).FinancialRiskDashboardAPI.riskLevel();
  assert.equal(high.count, 3); assert.equal(high.level, 'high'); assert.equal(high.label, 'Tinggi');
});

test('summary() -> ok selalu true walau ke-4 sumber belum dimuat sama sekali', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({ D: makeD([{ isDanaDarurat: true, amount: 100, saved: 100 }]) });
  const r = api.summary();
  assert.equal(r.ok, true);
  assert.equal(r.riskFactors.length, 0);
  assert.equal(r.riskLevel.count, 0); assert.equal(r.riskLevel.level, 'low'); assert.equal(r.riskLevel.label, 'Rendah');
});
