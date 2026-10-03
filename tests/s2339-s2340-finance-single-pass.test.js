'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');

test('S2339 incomeVsExpense scans transactions once and preserves ownership, date, and txCount semantics', () => {
  const transactions = [
    { type: 'income', date: '2026-10-05', amount: 100, accountId: 'self' },
    { type: 'expense', date: '2026-10-06', amount: 25, accountId: 'self' },
    { type: 'transfer', date: '2026-10-07', amount: 500, accountId: 'self' },
    { type: 'income', date: '2026-10-08', amount: 900, accountId: 'other' },
    { type: 'income', date: '2026-09-30', amount: 700, accountId: 'self' },
  ];
  let iteratorCalls = 0;
  const iterableTransactions = {
    [Symbol.iterator]() {
      iteratorCalls++;
      return transactions[Symbol.iterator]();
    },
  };
  const ctx = loadSource(['modules/finance/finance-intelligence.js'], {
    D: { transactions: iterableTransactions, accounts: [{ id: 'self' }, { id: 'other' }] },
    OwnershipEngine: { resolve: account => ({ type: account.id === 'self' ? 'SELF' : 'THIRD_PARTY' }) },
  }, ['FinanceIntelligence']);
  const result = ctx.FinanceIntelligence.incomeVsExpense({ from: new Date('2026-10-01T00:00:00'), to: new Date('2026-10-31T23:59:59.999') });
  assert.equal(iteratorCalls, 1);
  assert.equal(result.income, 100);
  assert.equal(result.expense, 25);
  assert.equal(result.net, 75);
  assert.equal(result.txCount, 3, 'qualifying transfer remains included in txCount');
});

test('S2340 cash projection evaluates bill paid status once and occurrences at most once per bill', () => {
  const calls = { paid: new Map(), occurrence: new Map() };
  const bills = [
    { id: 'paid', name: 'Lunas', amount: 100 },
    { id: 'open', name: 'Belum lunas', amount: 40 },
  ];
  const ctx = loadSource(['modules/finance/cash-projection.js'], {
    D: { transactions: [], workDays: [], bills, debts: [], piutang: [], profile: {} },
    getBillPaidThisPeriodInfo: bill => {
      calls.paid.set(bill.id, (calls.paid.get(bill.id) || 0) + 1);
      return bill.id === 'paid' ? { paid: true } : null;
    },
    getBillOccurrencesInMonth: bill => {
      calls.occurrence.set(bill.id, (calls.occurrence.get(bill.id) || 0) + 1);
      return bill.id === 'paid' ? [{}, {}] : [{}, {}, {}];
    },
    getBillStats: () => ({ monthTotal: 320 }),
  });
  const result = ctx.getMonthlyCashProjection(9, 2026, { includeKiriman: false, includePendingGaji: false });
  assert.equal(result.sisaKewajiban, 120);
  assert.equal(result.billMonthTotal, 320, 'calendar-mode gross total remains sourced from getBillStats');
  assert.equal(result.billPaidThisPeriod, 100);
  assert.equal(calls.paid.get('paid'), 1);
  assert.equal(calls.paid.get('open'), 1);
  assert.equal(calls.occurrence.has('paid'), false, 'paid bill does not need occurrence count in calendar mode');
  assert.equal(calls.occurrence.get('open'), 1);
});

test('S2339/S2340 source guards against the old repeated-filter/repeated-bill pattern', () => {
  const root = path.join(__dirname, '..');
  const fi = fs.readFileSync(path.join(root, 'modules/finance/finance-intelligence.js'), 'utf8');
  const income = fi.slice(fi.indexOf('incomeVsExpense(range) {'), fi.indexOf('cashflowSummary() {'));
  assert.doesNotMatch(income, /txs\.filter\(/);
  const cp = fs.readFileSync(path.join(root, 'modules/finance/cash-projection.js'), 'utf8');
  const section = cp.slice(cp.indexOf('const kewajibanItems=[];'), cp.indexOf('// FIX GAP-CP-002'));
  assert.doesNotMatch(section, /\(D\.bills\|\|\[\]\)\.filter\(/);
  assert.match(section, /for \(const b of \(D\.bills\|\|\[\]\)\)/);
});
