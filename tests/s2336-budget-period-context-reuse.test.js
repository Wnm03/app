'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadBudget(transactions, DateImpl = Date) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'budget.js'), 'utf8') + '\n;globalThis.__Budget = Budget;';
  const context = {
    D: { transactions, budgets: [], categories: { income: [], expense: [{ id: 'food', name: 'Makan', subs: [{ id: 'snack', name: 'Camilan' }] }] } },
    window: {}, document: { getElementById: () => null, querySelectorAll: () => [] },
    localStorage: { getItem: () => null, setItem: () => {} },
    console, Date: DateImpl, Math, JSON, Array, Object, Number, String,
    save() {}, safeSetItem() {}, toast() {}, fmt() {}, fmtFull() {}, escapeHtml: s => String(s),
    uid: () => 'test-id', curMonth: new Date().getMonth(), curYear: new Date().getFullYear(),
    daysInMonth: 30, scrollTabBarIntoView() {}
  };
  vm.createContext(context);
  vm.runInContext(source, context, { timeout: 1000 });
  return context.__Budget;
}

function legacyUsed(transactions, budget, month, year, now = new Date()) {
  return transactions.filter(t => {
    if (t.type !== 'expense') return false;
    const d = new Date(t.date);
    const period = budget.period || 'bulanan';
    if (period === 'mingguan') {
      const dow = (now.getDay() + 6) % 7;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
      return d >= monday && d <= sunday;
    }
    if (period === 'tahunan') return d.getFullYear() === (year ?? new Date().getFullYear());
    if (period === 'sekali') {
      const startDate = budget.createdAt ? budget.createdAt.slice(0, 10) : null;
      return !(startDate && t.date < startDate);
    }
    return d.getMonth() === (month ?? new Date().getMonth()) && d.getFullYear() === (year ?? new Date().getFullYear());
  }).reduce((sum, t) => sum + t.amount, 0);
}

test('S2336 budget period context preserves used totals across all supported periods', () => {
  const now = new Date();
  const dates = [-400, -35, -8, -2, 0, 2].map(offset => {
    const d = new Date(now); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10);
  });
  const txs = dates.map((date, i) => ({ id: String(i), type: i === 2 ? 'income' : 'expense', date, amount: (i + 1) * 1000, category: i % 2 ? 'Makan' : 'Camilan', subcategory: i % 2 ? '' : 'Camilan' }));
  const budget = loadBudget(txs);
  for (const period of ['bulanan', 'mingguan', 'tahunan', 'sekali']) {
    const b = { period, catIds: ['__total__'], createdAt: dates[1], limit: 100000, rollover: false };
    const actual = budget.getUsed(b, now.getMonth(), now.getFullYear());
    assert.equal(actual, legacyUsed(txs, b, now.getMonth(), now.getFullYear()), `period=${period}`);
  }
});

test('S2336 weekly render computes week boundaries once instead of per transaction', () => {
  let constructions = 0;
  class CountingDate extends Date {
    constructor(...args) { super(...args); constructions++; }
  }
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const txs = Array.from({ length: 120 }, (_, i) => ({ type: 'expense', date, amount: 100, category: 'Makan' }));
  const budget = loadBudget(txs, CountingDate);
  const before = constructions;
  const actual = budget.getUsed({ period: 'mingguan', catIds: ['__total__'] });
  const used = constructions - before;
  assert.equal(actual, 12000);
  assert.ok(used <= txs.length + 3, `expected at most one context and two bounds plus one parse per transaction; saw ${used}`);
});

test('S2336 rollover keeps previous-month expense math and category matching', () => {
  const now = new Date();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 12).toISOString().slice(0, 10);
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 12).toISOString().slice(0, 10);
  const txs = [
    { type: 'expense', date: previousMonth, amount: 20000, category: 'Makan' },
    { type: 'income', date: previousMonth, amount: 90000, category: 'Makan' },
    { type: 'expense', date: currentMonth, amount: 5000, category: 'Makan' },
    { type: 'expense', date: previousMonth, amount: 30000, category: 'Transport' }
  ];
  const budget = loadBudget(txs);
  const b = { period: 'bulanan', catIds: ['food'], limit: 50000, rollover: true };
  const month = now.getMonth(), year = now.getFullYear();
  const pm = month === 0 ? 11 : month - 1;
  const py = month === 0 ? year - 1 : year;
  const oldPreviousUsed = txs.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === pm && d.getFullYear() === py && t.type === 'expense' && t.category === 'Makan';
  }).reduce((sum, t) => sum + t.amount, 0);
  const expected = b.limit + Math.max(0, b.limit - oldPreviousUsed);
  assert.equal(budget.getEffectiveLimit(b, month, year), expected);
});
