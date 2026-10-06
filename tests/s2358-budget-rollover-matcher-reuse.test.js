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
  context.FinanceCategorySOT={
    list:()=>context.D.categories.expense,
    findById:(domain,id)=>{for(const c of context.D.categories.expense||[]){if(c.id===id)return {id:c.id,name:c.name,subs:c.subs||[]};}return null;},
    findSub:(c,id)=>(c&&c.subs||[]).find(s=>s.id===id)||null,
    findByName:(domain,name)=>{for(const c of context.D.categories.expense||[]){if(c.name===name)return c;const sub=(c.subs||[]).find(x=>x.name===name);if(sub)return {id:sub.id,name:sub.name,parentId:c.id,parentName:c.name};}return null;}
  };
  vm.createContext(context);
  vm.runInContext(source, context, { timeout: 1000 });
  return { Budget: context.__Budget, context };
}

function dateInMonth(year, month, day = 12) {
  return new Date(year, month, day, 12).toISOString().slice(0, 10);
}

test('S2358 rollover resolves category metadata only for previous-month expenses', () => {
  const now = new Date();
  const pm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const txs = [
    { type: 'expense', date: dateInMonth(py, pm), amount: 20000, category: 'Makan' },
    { type: 'income', date: dateInMonth(py, pm), amount: 90000, category: 'Makan' },
    { type: 'expense', date: dateInMonth(now.getFullYear(), now.getMonth()), amount: 5000, category: 'Makan' },
    { type: 'expense', date: dateInMonth(py, pm), amount: 30000, category: 'Transport' },
  ];
  const { Budget } = loadBudget(txs);
  const original = Budget.getCatInfoById;
  let calls = 0;
  Budget.getCatInfoById = function (id) { calls++; return original.call(this, id); };
  const b = { period: 'bulanan', catIds: ['food'], limit: 50000, rollover: true };
  assert.equal(Budget.getEffectiveLimit(b, now.getMonth(), now.getFullYear()), 80000);
  assert.equal(calls, 1, 'matcher metadata is resolved once for the one selected category');
});

test('S2358 rollover matcher is fresh on the next call after category edits', () => {
  const now = new Date();
  const pm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const txs = [{ type: 'expense', date: dateInMonth(py, pm), amount: 20000, category: 'Makan' }];
  const { Budget, context } = loadBudget(txs);
  const b = { period: 'bulanan', catIds: ['food'], limit: 50000, rollover: true };
  assert.equal(Budget.getEffectiveLimit(b, now.getMonth(), now.getFullYear()), 80000);
  context.D.categories.expense[0].name = 'Pangan';
  assert.equal(Budget.getEffectiveLimit(b, now.getMonth(), now.getFullYear()), 100000);
});
