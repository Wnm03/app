'use strict';
// tests/finance-intelligence-cache.test.js — cakupan cache per-siklus-render
// utk computeCashflowForecast() (tx-list-cashflow.js) & FinanceIntelligence.
// incomeVsExpense()/budgetSummary() (finance-intelligence.js). Fokus: hasil
// tetap benar, cache dipakai utk panggilan tanpa argumen, argumen eksplisit
// SELALU bypass cache (fresh), dan invalidateCache() bikin data ikut update.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    accounts: [{ id: 'a1', name: 'Kas', baseBalance: 1000000, includeInBalance: true }],
    transactions: [
      { accountId: 'a1', type: 'income', amount: 500000, date: new Date().toISOString().slice(0, 10) },
      { accountId: 'a1', type: 'expense', amount: 200000, date: new Date().toISOString().slice(0, 10) },
    ],
    bills: [],
    budgets: [],
    assets: [],
  };
}

function makeCtx(D) {
  return loadSource(
    ['modules/finance/akun.js', 'modules/finance/tx-list-cashflow.js', 'modules/finance/finance-intelligence.js'],
    { D, curMonth: new Date().getMonth(), curYear: new Date().getFullYear() },
    ['FinanceIntelligence']
  );
}

test('computeCashflowForecast() — cache dipakai ulang sampai di-invalidate', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const first = ctx.computeCashflowForecast();
  D.transactions.push({ accountId: 'a1', type: 'income', amount: 999999999, date: new Date().toISOString().slice(0, 10) });
  const second = ctx.computeCashflowForecast();
  assert.equal(second.incAvg, first.incAvg, 'masih cache lama sebelum invalidate');
  ctx.invalidateCashflowForecastCache();
  const third = ctx.computeCashflowForecast();
  assert.notEqual(third.incAvg, first.incAvg, 'harus ikut data baru setelah invalidate');
});

test('FinanceIntelligence.incomeVsExpense() tanpa argumen — dicache; dengan range eksplisit — selalu fresh (bypass cache)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const a = ctx.FinanceIntelligence.incomeVsExpense();
  assert.equal(a.income, 500000);
  D.transactions.push({ accountId: 'a1', type: 'income', amount: 100000, date: new Date().toISOString().slice(0, 10) });
  const b = ctx.FinanceIntelligence.incomeVsExpense();
  assert.equal(b.income, 500000, 'masih cache lama (panggilan tanpa argumen)');
  const explicitRange = { from: new Date(2000, 0, 1), to: new Date(2000, 11, 31) };
  const c = ctx.FinanceIntelligence.incomeVsExpense(explicitRange);
  assert.equal(c.income, 0, 'range eksplisit di luar data -> hasil fresh, bukan dari cache default');
  ctx.FinanceIntelligence.invalidateCache();
  const d = ctx.FinanceIntelligence.incomeVsExpense();
  assert.equal(d.income, 600000, 'setelah invalidateCache() ikut data terbaru');
});

test('FinanceIntelligence.budgetSummary() tanpa argumen — dicache; dgn month/year eksplisit — selalu fresh', () => {
  const D = makeD();
  D.budgets = [{ id: 'b1', name: 'Makan', limit: 1000000, period: 'bulanan' }];
  global.Budget = {
    matchesPeriod: () => true,
    matchesTx: () => true,
    getUsed(b) { return (D.transactions || []).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0); },
    getEffectiveLimit(b) { return b.limit; },
  };
  const ctx = makeCtx(D);
  ctx.Budget = global.Budget;
  const a = ctx.FinanceIntelligence.budgetSummary();
  assert.equal(a.totalUsed, 200000);
  D.transactions.push({ accountId: 'a1', type: 'expense', amount: 300000, date: new Date().toISOString().slice(0, 10) });
  const b = ctx.FinanceIntelligence.budgetSummary();
  assert.equal(b.totalUsed, 200000, 'masih cache lama (tanpa argumen)');
  const c = ctx.FinanceIntelligence.budgetSummary(0, 1999);
  assert.equal(c.totalUsed, 500000, 'month/year eksplisit selalu fresh, tidak dari cache');
  ctx.FinanceIntelligence.invalidateCache();
  const d = ctx.FinanceIntelligence.budgetSummary();
  assert.equal(d.totalUsed, 500000, 'setelah invalidateCache() ikut data terbaru');
  delete global.Budget;
});
