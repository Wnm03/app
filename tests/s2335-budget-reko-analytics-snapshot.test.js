'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadBudgetReko(transactions, settings = { months: 3, buffer: 10 }) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'budget.js'), 'utf8') + '\n;globalThis.__BudgetReko = BudgetReko;';
  const context = {
    D: { transactions, budgetReko: settings, categories: { expense: [] }, budgets: [] },
    window: {}, document: { getElementById: () => null, querySelectorAll: () => [] },
    localStorage: { getItem: () => null, setItem: () => {} },
    console, Date, Math, JSON, Array, Object, Number, String,
    save() {}, safeSetItem() {}, toast() {}, fmt() {}, fmtFull() {}, escapeHtml: s => String(s),
    uid: () => 'test-id', curMonth: new Date().getMonth(), curYear: new Date().getFullYear(),
    daysInMonth: 30, scrollTabBarIntoView() {}
  };
  vm.createContext(context);
  vm.runInContext(source, context, { timeout: 1000 });
  return context.__BudgetReko;
}

function reference(transactions, configuredMonths = 3) {
  if (!transactions.length) return { available: 0, months: 1, incomeTotal: 0, categories: [] };
  let earliest = null;
  transactions.forEach(t => { const d = new Date(t.date); if (!earliest || d < earliest) earliest = d; });
  const now = new Date();
  const available = Math.max(1, (now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth()) + 1);
  const months = Math.max(1, Math.min(configuredMonths, available || 1));
  const from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const inRange = transactions.filter(t => new Date(t.date) >= from && new Date(t.date) <= now);
  const incomeTotal = inRange.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const map = {};
  inRange.filter(t => t.type === 'expense').forEach(t => {
    const key = t.category || 'Lainnya';
    if (!map[key]) map[key] = { total: 0, count: 0 };
    map[key].total += t.amount; map[key].count++;
  });
  const categories = Object.entries(map).map(([name, v]) => ({ name, total: v.total, count: v.count, avgPerMonth: v.total / months })).sort((a, b) => b.avgPerMonth - a.avgPerMonth);
  return { available, months, incomeTotal, categories };
}

test('S2335 snapshot matches legacy recommendation math for empty, mixed, and out-of-range histories', () => {
  const now = new Date();
  const monthDate = offset => new Date(now.getFullYear(), now.getMonth() + offset, 10).toISOString().slice(0, 10);
  const datasets = [
    [],
    [
      { type: 'income', date: monthDate(-1), amount: 3000000 },
      { type: 'expense', date: monthDate(-1), amount: 200000, category: 'Makan' },
      { type: 'expense', date: monthDate(-2), amount: 100000, category: 'Makan' },
      { type: 'expense', date: monthDate(-8), amount: 999999, category: 'Lama' },
      { type: 'transfer', date: monthDate(0), amount: 400000, category: 'Lainnya' }
    ]
  ];
  for (const txs of datasets) {
    const api = loadBudgetReko(txs);
    const actual = api.analyticsSnapshot();
    assert.deepEqual(JSON.parse(JSON.stringify(actual)), reference(txs));
    assert.equal(api.incomeAvgPerMonth(actual), reference(txs).incomeTotal / reference(txs).months);
    assert.deepEqual(JSON.parse(JSON.stringify(api.computeCategoryAverages(actual))), reference(txs).categories);
  }
});

test('S2335 render-local analytics snapshot scans transactions twice regardless of metric count', () => {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), 10).toISOString().slice(0, 10);
  const base = Array.from({ length: 200 }, (_, i) => ({ type: i % 3 ? 'expense' : 'income', date, amount: i + 1, category: `Category ${i % 8}` }));
  let traversals = 0;
  const tracked = new Proxy(base, { get(target, prop, receiver) {
    if (prop === 'forEach') return (...args) => { traversals++; return Array.prototype.forEach.apply(target, args); };
    return Reflect.get(target, prop, receiver);
  }});
  const api = loadBudgetReko(tracked);
  const snapshot = api.analyticsSnapshot();
  api.incomeAvgPerMonth(snapshot);
  api.computeCategoryAverages(snapshot);
  assert.equal(traversals, 2);
});
