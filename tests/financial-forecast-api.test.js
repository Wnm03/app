'use strict';
// tests/financial-forecast-api.test.js — cakupan
// modules/finance/financial-forecast-api.js (FinancialForecastAPI),
// sebelumnya 0 test file yang menyentuhnya langsung. Pola SAMA PERSIS
// cashflow-projection-api.test.js: file ini PURE wrapper (100% reuse
// FinanceDashboard.getAIHook().cashflow), dites lewat mock FinanceDashboard.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const OK_CASHFLOW = {
  ok: true,
  incAvg: 5000000, expAvg: 3000000, months: 3,
  currentMonth: { income: 5200000, expense: 2800000 },
  saldoNow: 10000000, projected: 12000000, billsDue: 500000,
  upcoming: [{ id: 'b1' }, { id: 'b2' }],
};

function makeCtx(FinanceDashboard) {
  return loadSource(
    ['modules/finance/financial-forecast-api.js'],
    FinanceDashboard !== undefined ? { FinanceDashboard } : {},
    ['FinancialForecastAPI'],
  );
}

test('_cashflow() -> {ok:false} kalau FinanceDashboard belum dimuat', () => {
  const { FinancialForecastAPI } = makeCtx(undefined);
  const r = FinancialForecastAPI._cashflow();
  assert.equal(r.ok, false);
  assert.match(r.reason, /belum dimuat/);
});

test('_cashflow() -> {ok:false} dari getAIHook() diteruskan apa adanya', () => {
  const { FinancialForecastAPI } = makeCtx({ getAIHook: () => ({ ok: false, reason: 'hook gagal' }) });
  const r = FinancialForecastAPI._cashflow();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'hook gagal');
});

test('_cashflow() -> {ok:false} default kalau hook.cashflow tidak ada/gagal', () => {
  const { FinancialForecastAPI } = makeCtx({ getAIHook: () => ({ ok: true, cashflow: null }) });
  const r = FinancialForecastAPI._cashflow();
  assert.equal(r.ok, false);
  assert.match(r.reason, /tidak tersedia/);
});

test('incomeForecast() -> field dibaca apa adanya (incAvg/months/currentMonth.income)', () => {
  const { FinancialForecastAPI } = makeCtx({ getAIHook: () => ({ ok: true, cashflow: OK_CASHFLOW }) });
  const r = FinancialForecastAPI.incomeForecast();
  assert.equal(r.ok, true);
  assert.equal(r.avgMonthly, 5000000);
  assert.equal(r.months, 3);
  assert.equal(r.currentMonthIncome, 5200000);
});

test('expenseForecast() -> field dibaca apa adanya (expAvg/months/currentMonth.expense)', () => {
  const { FinancialForecastAPI } = makeCtx({ getAIHook: () => ({ ok: true, cashflow: OK_CASHFLOW }) });
  const r = FinancialForecastAPI.expenseForecast();
  assert.equal(r.ok, true);
  assert.equal(r.avgMonthly, 3000000);
  assert.equal(r.months, 3);
  assert.equal(r.currentMonthExpense, 2800000);
});

test('cashflowProjection() -> upcomingCount = upcoming.length, field lain apa adanya', () => {
  const { FinancialForecastAPI } = makeCtx({ getAIHook: () => ({ ok: true, cashflow: OK_CASHFLOW }) });
  const r = FinancialForecastAPI.cashflowProjection();
  assert.equal(r.ok, true);
  assert.equal(r.saldoNow, 10000000);
  assert.equal(r.projected, 12000000);
  assert.equal(r.billsDue, 500000);
  assert.equal(r.upcomingCount, 2);
});

test('cashflowProjection() -> upcomingCount = 0 kalau upcoming kosong/tidak ada', () => {
  const { FinancialForecastAPI } = makeCtx({ getAIHook: () => ({ ok: true, cashflow: { ...OK_CASHFLOW, upcoming: undefined } }) });
  const r = FinancialForecastAPI.cashflowProjection();
  assert.equal(r.upcomingCount, 0);
});

test('summary() -> ok:true & gabungan ke-3 forecast kalau cashflow ok', () => {
  const { FinancialForecastAPI } = makeCtx({ getAIHook: () => ({ ok: true, cashflow: OK_CASHFLOW }) });
  const r = FinancialForecastAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.income.avgMonthly, 5000000);
  assert.equal(r.expense.avgMonthly, 3000000);
  assert.equal(r.cashflowProjection.saldoNow, 10000000);
});

test('summary() -> ok:false kalau FinanceDashboard belum dimuat (tidak throw)', () => {
  const { FinancialForecastAPI } = makeCtx(undefined);
  const r = FinancialForecastAPI.summary();
  assert.equal(r.ok, false);
  assert.equal(r.income.ok, false);
  assert.equal(r.expense.ok, false);
  assert.equal(r.cashflowProjection.ok, false);
});
