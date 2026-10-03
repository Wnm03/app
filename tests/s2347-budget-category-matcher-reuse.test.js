'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadBudget(transactions) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'budget.js'), 'utf8') + '\n;globalThis.__Budget = Budget;';
  const context = {
    D: { transactions, budgets: [], categories: { income: [], expense: [
      { id: 'food', name: 'Makan', subs: [{ id: 'snack', name: 'Camilan' }] },
      { id: 'transport', name: 'Transport', subs: [] },
    ] } },
    window: {}, document: { getElementById: () => null, querySelectorAll: () => [] },
    localStorage: { getItem: () => null, setItem: () => {} },
    console, Date, Math, JSON, Array, Object, Number, String,
    save() {}, safeSetItem() {}, toast() {}, fmt() {}, fmtFull() {}, escapeHtml: s => String(s),
    uid: () => 'test-id', curMonth: new Date().getMonth(), curYear: new Date().getFullYear(),
    daysInMonth: 30, scrollTabBarIntoView() {},
  };
  vm.createContext(context);
  vm.runInContext(source, context, { timeout: 1000 });
  return { Budget: context.__Budget, context };
}

const today = new Date().toISOString().slice(0, 10);

test('S2347 getUsed resolves category metadata once per budget scan and preserves matching totals', () => {
  const transactions = Array.from({ length: 150 }, (_, i) => ({
    type: 'expense', date: today, amount: 10,
    category: i % 2 ? 'Makan' : 'Transport',
    subcategory: '',
  }));
  const { Budget } = loadBudget(transactions);
  const original = Budget.getCatInfoById;
  let calls = 0;
  Budget.getCatInfoById = function (id) { calls++; return original.call(this, id); };
  const used = Budget.getUsed({ period: 'bulanan', catIds: ['food', 'transport'] }, new Date().getMonth(), new Date().getFullYear());
  assert.equal(used, 1500);
  assert.equal(calls, 2, 'category metadata is resolved once per selected category, not per transaction');
});

test('S2347 matcher stays fresh across calls and preserves total-budget and non-expense behavior', () => {
  const transactions = [
    { type: 'expense', date: today, amount: 50, category: 'Makan', subcategory: 'Camilan' },
    { type: 'expense', date: today, amount: 30, category: 'Transport', subcategory: '' },
    { type: 'income', date: today, amount: 999, category: 'Makan', subcategory: 'Camilan' },
  ];
  const { Budget, context } = loadBudget(transactions);
  const month = new Date().getMonth(), year = new Date().getFullYear();
  assert.equal(Budget.getUsed({ period: 'bulanan', catIds: ['snack'] }, month, year), 50);
  context.D.categories.expense[0].subs[0].name = 'Jajan';
  assert.equal(Budget.getUsed({ period: 'bulanan', catIds: ['snack'] }, month, year), 0, 'category edits are reflected on the next call');
  assert.equal(Budget.getUsed({ period: 'bulanan', catIds: ['__total__'] }, month, year), 80);
});

test('S2347 does not resolve category metadata when no in-period expense exists', () => {
  const { Budget } = loadBudget([{ type: 'income', date: today, amount: 500, category: 'Makan' }]);
  let calls = 0;
  const original = Budget.getCatInfoById;
  Budget.getCatInfoById = function (...args) { calls++; return original.apply(this, args); };
  assert.equal(Budget.getUsed({ period: 'bulanan', catIds: ['food'] }, new Date().getMonth(), new Date().getFullYear()), 0);
  assert.equal(calls, 0);
});
