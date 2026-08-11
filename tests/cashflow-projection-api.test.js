'use strict';
// tests/cashflow-projection-api.test.js — cakupan
// modules/finance/cashflow-projection-api.js (CashFlowProjectionAPI),
// sebelumnya 0 test file yang menyentuhnya langsung. File ini PURE wrapper
// (100% reuse FinancialForecastAPI.summary(), 0 hitungan baru) jadi cukup
// dites lewat mock FinancialForecastAPI, tanpa perlu D/document.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const OK_FORECAST = {
  ok: true,
  income: { avgMonthly: 5000000, months: 3, currentMonthIncome: 5200000 },
  expense: { avgMonthly: 3000000, months: 3, currentMonthExpense: 2800000 },
  cashflowProjection: { saldoNow: 10000000, projected: 12000000, billsDue: 500000, upcomingCount: 2 },
};

function makeCtx(FinancialForecastAPI) {
  return loadSource(
    ['modules/finance/cashflow-projection-api.js'],
    FinancialForecastAPI !== undefined ? { FinancialForecastAPI } : {},
    ['CashFlowProjectionAPI'],
  );
}

test('_forecast() -> {ok:false} kalau FinancialForecastAPI belum dimuat', () => {
  const { CashFlowProjectionAPI } = makeCtx(undefined);
  const r = CashFlowProjectionAPI._forecast();
  assert.equal(r.ok, false);
  assert.match(r.reason, /belum dimuat/);
});

test('_forecast() -> {ok:false} diteruskan apa adanya kalau summary() gagal', () => {
  const { CashFlowProjectionAPI } = makeCtx({ summary: () => ({ ok: false, reason: 'x' }) });
  const r = CashFlowProjectionAPI._forecast();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'x');
});

test('_forecast() -> {ok:false} default kalau summary() balikin null/undefined', () => {
  const { CashFlowProjectionAPI } = makeCtx({ summary: () => null });
  const r = CashFlowProjectionAPI._forecast();
  assert.equal(r.ok, false);
  assert.match(r.reason, /tidak tersedia/);
});

test('incomeProjection() -> field dibaca apa adanya dari summary().income', () => {
  const { CashFlowProjectionAPI } = makeCtx({ summary: () => OK_FORECAST });
  const r = CashFlowProjectionAPI.incomeProjection();
  assert.equal(r.ok, true);
  assert.equal(r.avgMonthly, 5000000);
  assert.equal(r.months, 3);
  assert.equal(r.currentMonthIncome, 5200000);
});

test('expenseProjection() -> field dibaca apa adanya dari summary().expense', () => {
  const { CashFlowProjectionAPI } = makeCtx({ summary: () => OK_FORECAST });
  const r = CashFlowProjectionAPI.expenseProjection();
  assert.equal(r.ok, true);
  assert.equal(r.avgMonthly, 3000000);
  assert.equal(r.months, 3);
  assert.equal(r.currentMonthExpense, 2800000);
});

test('cashBalanceForecast() -> field dibaca apa adanya dari summary().cashflowProjection', () => {
  const { CashFlowProjectionAPI } = makeCtx({ summary: () => OK_FORECAST });
  const r = CashFlowProjectionAPI.cashBalanceForecast();
  assert.equal(r.ok, true);
  assert.equal(r.saldoNow, 10000000);
  assert.equal(r.projected, 12000000);
  assert.equal(r.billsDue, 500000);
  assert.equal(r.upcomingCount, 2);
});

test('incomeProjection()/expenseProjection()/cashBalanceForecast() -> {ok:false} kalau forecast gagal, tanpa akses field', () => {
  const { CashFlowProjectionAPI } = makeCtx({ summary: () => ({ ok: false, reason: 'gagal' }) });
  assert.equal(CashFlowProjectionAPI.incomeProjection().ok, false);
  assert.equal(CashFlowProjectionAPI.expenseProjection().ok, false);
  assert.equal(CashFlowProjectionAPI.cashBalanceForecast().ok, false);
});

test('summary() -> ok:true & gabungan ke-3 proyeksi kalau forecast ok', () => {
  const { CashFlowProjectionAPI } = makeCtx({ summary: () => OK_FORECAST });
  const r = CashFlowProjectionAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.income.avgMonthly, 5000000);
  assert.equal(r.expense.avgMonthly, 3000000);
  assert.equal(r.cashBalance.saldoNow, 10000000);
});

test('summary() -> ok:false kalau FinancialForecastAPI belum dimuat (tidak throw)', () => {
  const { CashFlowProjectionAPI } = makeCtx(undefined);
  const r = CashFlowProjectionAPI.summary();
  assert.equal(r.ok, false);
  assert.equal(r.income.ok, false);
  assert.equal(r.expense.ok, false);
  assert.equal(r.cashBalance.ok, false);
});
