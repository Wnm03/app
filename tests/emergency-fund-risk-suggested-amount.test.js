'use strict';
// tests/emergency-fund-risk-suggested-amount.test.js — Sesi A2
// (LANGKAH-SESI-IMPLEMENTASI.md Kelompok A, lanjutan A1): cakupan field
// baru `suggestedAmount` di _emergencyFundRisk()
// (modules/finance/financial-risk-dashboard-api.js), yang reuse
// `suggestEmergencyFundTarget()` (A1, modules/finance/tx-list-cashflow.js).
// Test lama di tests/financial-risk-dashboard-api.test.js TIDAK diubah
// (semuanya tetap pass tanpa modifikasi -- suggestedAmount cuma field
// TAMBAHAN, guard typeof bikin field itu jatuh ke `null` kalau
// suggestEmergencyFundTarget tidak ikut di-inject, persis situasi test lama).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(targets) { return { targets: targets || [] }; }

function makeCtx({ D, suggestEmergencyFundTarget } = {}) {
  const extra = { D: D || makeD() };
  if (suggestEmergencyFundTarget !== undefined) extra.suggestEmergencyFundTarget = suggestEmergencyFundTarget;
  return loadSource(['modules/finance/financial-risk-dashboard-api.js'], extra, ['FinancialRiskDashboardAPI']);
}

test('_emergencyFundRisk() -> suggestedAmount null kalau suggestEmergencyFundTarget belum dimuat (guard typeof, tidak throw)', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({ D: makeD([{ isDanaDarurat: true, amount: 10000000, saved: 4000000 }]) });
  const r = api._emergencyFundRisk();
  assert.equal(r.length, 1);
  assert.equal(r[0].suggestedAmount, null);
});

test('_emergencyFundRisk() -> suggestedAmount null kalau suggestEmergencyFundTarget() balikin {ok:false} (mis. data historis belum cukup)', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({
    D: makeD([{ isDanaDarurat: true, amount: 10000000, saved: 4000000 }]),
    suggestEmergencyFundTarget: () => ({ ok: false, reason: 'data pengeluaran historis belum cukup' }),
  });
  const r = api._emergencyFundRisk();
  assert.equal(r[0].suggestedAmount, null);
});

test('_emergencyFundRisk() -> suggestedAmount null kalau suggestEmergencyFundTarget() throw (guard try/catch, tidak ikut throw)', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({
    D: makeD([{ isDanaDarurat: true, amount: 10000000, saved: 4000000 }]),
    suggestEmergencyFundTarget: () => { throw new Error('x'); },
  });
  assert.doesNotThrow(() => api._emergencyFundRisk());
  assert.equal(api._emergencyFundRisk()[0].suggestedAmount, null);
});

test('_emergencyFundRisk() -> suggestedAmount terisi dari targetAmount kalau suggestEmergencyFundTarget() ok:true', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({
    D: makeD([{ isDanaDarurat: true, amount: 10000000, saved: 4000000 }]),
    suggestEmergencyFundTarget: () => ({ ok: true, monthlyExpenseAvg: 2000000, multiplier: 6, targetAmount: 12000000, basedOnMonths: 3 }),
  });
  const r = api._emergencyFundRisk();
  assert.equal(r[0].suggestedAmount, 12000000);
});

test('_emergencyFundRisk() -> field lain (domain/type/code/message) TIDAK berubah walau suggestedAmount ditambahkan', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({
    D: makeD([{ isDanaDarurat: true, amount: 10000000, saved: 4000000 }]),
    suggestEmergencyFundTarget: () => ({ ok: true, targetAmount: 12000000 }),
  });
  const r = api._emergencyFundRisk();
  assert.equal(r[0].domain, 'emergency_fund');
  assert.equal(r[0].icon, '🚨');
  assert.equal(r[0].type, 'warning');
  assert.equal(r[0].code, 'risk_emergency_fund_low');
  assert.match(r[0].message, /40% dari target/);
});

test('_emergencyFundRisk() -> [] kalau target SUDAH tercapai (logic "done" tidak berubah), walau suggestEmergencyFundTarget tersedia', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({
    D: makeD([{ isDanaDarurat: true, amount: 6000000, saved: 6000000 }]),
    suggestEmergencyFundTarget: () => ({ ok: true, targetAmount: 12000000 }),
  });
  assert.equal(api._emergencyFundRisk().length, 0);
});

test('_emergencyFundRisk() -> belum ada Target Dana Darurat sama sekali -> tetap 1 item warning + suggestedAmount tetap bisa terisi', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({
    D: makeD([]),
    suggestEmergencyFundTarget: () => ({ ok: true, targetAmount: 9000000 }),
  });
  const r = api._emergencyFundRisk();
  assert.equal(r.length, 1);
  assert.match(r[0].message, /Belum ada Target Dana Darurat/);
  assert.equal(r[0].suggestedAmount, 9000000);
});

test('riskFactors()/riskLevel() -> jumlah & kategori TIDAK berubah oleh field suggestedAmount (0 regresi ke logic count-based risk level)', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({
    D: makeD([]), // 1 warning: belum ada target dana darurat
    suggestEmergencyFundTarget: () => ({ ok: true, targetAmount: 9000000 }),
  });
  const factors = api.riskFactors();
  assert.equal(factors.length, 1);
  const level = api.riskLevel();
  assert.equal(level.count, 1);
  assert.equal(level.level, 'medium');
  assert.equal(level.label, 'Sedang');
});
