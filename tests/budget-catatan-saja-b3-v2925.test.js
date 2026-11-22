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

// B3 (audit browser v2925): transaksi "catatan saja" (hitungKas:false) tidak boleh masuk anggaran.
const now = new Date();
const M = now.getMonth(), Y = now.getFullYear();
const PM = M === 0 ? 11 : M - 1, PY = M === 0 ? Y - 1 : Y;

test('B3 getUsed melewati pengeluaran hitungKas:false', () => {
  const txs = [
    { type: 'expense', date: dateInMonth(Y, M), amount: 35800, category: 'Makan' },
    { type: 'expense', date: dateInMonth(Y, M), amount: 10000, category: 'Makan', hitungKas: false },
    { type: 'expense', date: dateInMonth(Y, M), amount: 7000, category: 'Makan', hitungKas: true },
  ];
  const { Budget } = loadBudget(txs);
  const b = { period: 'bulanan', catIds: ['food'], limit: 100000 };
  assert.equal(Budget.getUsed(b, M, Y), 42800);
  assert.equal(Budget.getUsed({ ...b, catIds: ['__total__'] }, M, Y), 42800);
});

test('B3 rollover bulan lalu tidak menghitung hitungKas:false', () => {
  const txs = [
    { type: 'expense', date: dateInMonth(PY, PM), amount: 20000, category: 'Makan' },
    { type: 'expense', date: dateInMonth(PY, PM), amount: 30000, category: 'Makan', hitungKas: false },
  ];
  const { Budget } = loadBudget(txs);
  const b = { period: 'bulanan', catIds: ['food'], limit: 50000, rollover: true };
  assert.equal(Budget.getEffectiveLimit(b, M, Y), 80000); // 50000 + (50000-20000)
});

test('B3 matchesTx/drill-down konsisten dengan getUsed', () => {
  const txs = [
    { type: 'expense', date: dateInMonth(Y, M), amount: 5000, category: 'Makan' },
    { type: 'expense', date: dateInMonth(Y, M), amount: 9000, category: 'Makan', hitungKas: false },
  ];
  const { Budget } = loadBudget(txs);
  const b = { period: 'bulanan', catIds: ['food'], limit: 100000 };
  const drill = txs.filter(t => Budget.matchesPeriod(b, t, M, Y) && Budget.matchesTx(b, t));
  assert.equal(drill.length, 1);
  assert.equal(drill.reduce((s, t) => s + t.amount, 0), Budget.getUsed(b, M, Y));
});

test('B3 hitungKas undefined/null/true tetap dihitung (tidak regresi data lama)', () => {
  const txs = [
    { type: 'expense', date: dateInMonth(Y, M), amount: 1000, category: 'Makan' },
    { type: 'expense', date: dateInMonth(Y, M), amount: 2000, category: 'Makan', hitungKas: null },
    { type: 'expense', date: dateInMonth(Y, M), amount: 4000, category: 'Makan', hitungKas: true },
  ];
  const { Budget } = loadBudget(txs);
  assert.equal(Budget.getUsed({ period: 'bulanan', catIds: ['food'], limit: 1 }, M, Y), 7000);
});
