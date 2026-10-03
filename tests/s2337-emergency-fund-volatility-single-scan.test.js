'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadCalc(D, DateImpl = Date) {
  return loadSource(
    ['budget.js', 'modules/shared/modules-calc.js'],
    { D, Date: DateImpl, fmtFull: String },
    ['FI', 'SalaryAllocation', 'DanaDaruratAI', 'FinCoach']
  );
}

function legacyCv(transactions, monthsAvail, now = new Date()) {
  const monthly = [];
  for (let i = 0; i < monthsAvail; i++) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const total = transactions.filter(t => t.type === 'income' && t.hitungKas !== false && new Date(t.date) >= from && new Date(t.date) <= to).reduce((sum, t) => sum + t.amount, 0);
    monthly.push(total);
  }
  const mean = monthly.reduce((a, b) => a + b, 0) / monthly.length;
  if (!(mean > 0)) return null;
  const variance = monthly.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / monthly.length;
  return Math.sqrt(variance) / mean;
}

test('S2337 emergency-fund monthly volatility matches legacy result while scanning transactions once', () => {
  const now = new Date();
  const txs = [];
  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, Math.min(10, now.getDate())).toISOString().slice(0, 10);
    for (let j = 0; j < 20; j++) txs.push({ type: 'income', amount: 500000 + i * 25000, date });
    txs.push({ type: 'income', amount: 9000000, date, hitungKas: false });
    txs.push({ type: 'expense', amount: 700000, date });
  }
  const D = { transactions: txs, workDays: [], targets: [], budgets: [], categories: { income: [], expense: [] }, finansialFreedom: { avgMonths: 6 } };
  const { DanaDaruratAI } = loadCalc(D);
  const actual = DanaDaruratAI.computeRecommendation();
  const monthsAvail = Math.min(6, (now.getFullYear() - new Date(txs[txs.length - 1].date).getFullYear()) * 12 + (now.getMonth() - new Date(txs[txs.length - 1].date).getMonth()) + 1);
  const expected = legacyCv(txs, monthsAvail, now);
  assert.ok(actual.cv !== null);
  assert.ok(Math.abs(actual.cv - expected) < 1e-12, `expected CV ${expected}, received ${actual.cv}`);
});

test('S2337 recommendation keeps Catatan saja income excluded from volatility', () => {
  const now = new Date();
  const txs = [];
  for (let i = 0; i < 3; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, Math.min(10, now.getDate())).toISOString().slice(0, 10);
    txs.push({ type: 'income', amount: 900000, date });
    txs.push({ type: 'income', amount: 9000000, date, hitungKas: false });
  }
  const { DanaDaruratAI } = loadCalc({ transactions: txs, workDays: [], targets: [], budgets: [], categories: { income: [], expense: [] }, finansialFreedom: { avgMonths: 3 } });
  const rec = DanaDaruratAI.computeRecommendation();
  assert.ok(rec.cv === null || rec.cv < 1e-12, `CV should stay stable, got ${rec.cv}`);
  assert.equal(rec.multiplier, 6);
});
