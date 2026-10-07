'use strict';
const { localIso } = require('./helpers/localIso');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');

function loadCalc(D) {
  return loadSource(['budget.js', 'modules/shared/modules-calc.js'], { D }, ['FI', 'SalaryAllocation', 'Pensiun']);
}
const dateAtMonth = offset => {
  const now = new Date();
  return localIso(new Date(now.getFullYear(), now.getMonth() + offset, 1));
};

test('S2338 FI monthlySurplus preserves cash-only income/expense totals and excludes transfers', () => {
  const D = { transactions: [
    { type: 'income', date: dateAtMonth(-1), amount: 900, hitungKas: true },
    { type: 'expense', date: dateAtMonth(-1), amount: 200, hitungKas: true },
    { type: 'income', date: dateAtMonth(0), amount: 500, hitungKas: false },
    { type: 'transfer', date: dateAtMonth(0), amount: 400, hitungKas: true },
    { type: 'expense', date: dateAtMonth(-8), amount: 700, hitungKas: true },
  ], finansialFreedom: { avgMonths: 2 } };
  const ctx = loadCalc(D);
  assert.equal(ctx.FI.monthlySurplus(2), 350);
});

test('S2338 SalaryAllocation keeps income-only and hitungKas filtering', () => {
  const D = { transactions: [
    { type: 'income', date: dateAtMonth(-1), amount: 1200, hitungKas: true },
    { type: 'income', date: dateAtMonth(0), amount: 800, hitungKas: true },
    { type: 'income', date: dateAtMonth(0), amount: 9999, hitungKas: false },
    { type: 'expense', date: dateAtMonth(0), amount: 4000, hitungKas: true },
  ], finansialFreedom: { avgMonths: 2 } };
  const ctx = loadCalc(D);
  assert.equal(ctx.SalaryAllocation.avgMonthlyIncome(), 1000);
});

test('S2338 Pensiun avgSurplus preserves its legacy treatment of hitungKas:false', () => {
  const D = { transactions: [
    { type: 'income', date: dateAtMonth(-1), amount: 900, hitungKas: true },
    { type: 'expense', date: dateAtMonth(-1), amount: 200, hitungKas: true },
    { type: 'income', date: dateAtMonth(0), amount: 300, hitungKas: false },
    { type: 'expense', date: dateAtMonth(-8), amount: 700, hitungKas: true },
  ], pensiun: { rekoBulan: 2 }, finansialFreedom: { avgMonths: 2 } };
  const ctx = loadCalc(D);
  const result = ctx.Pensiun.avgSurplus();
  assert.equal(result.months, 2);
  assert.equal(result.surplus, 500);
});

test('S2338 projection aggregators no longer filter the selected transaction array twice', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'modules/shared/modules-calc.js'), 'utf8');
  const monthly = source.slice(source.indexOf('monthlySurplus(monthsOverride){'), source.indexOf('estimateMonthsToTarget('));
  const salary = source.slice(source.indexOf('avgMonthlyIncome(){'), source.indexOf('suggest(){', source.indexOf('avgMonthlyIncome(){')));
  const pension = source.slice(source.indexOf('avgSurplus(){', source.indexOf('const Pensiun=')), source.indexOf('danaTerkumpul(){', source.indexOf('const Pensiun=')));
  assert.doesNotMatch(monthly, /txs\.filter\(/);
  assert.doesNotMatch(salary, /D\.transactions\.filter\(/);
  assert.doesNotMatch(pension, /txs\.filter\(/);
});
