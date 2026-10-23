'use strict';
// S2705 — FI.monthsOfDataAvailable / FI.annualExpense tanpa alokasi Date per transaksi.
// Diferensial vs implementasi lama (tests/fixtures/s2705-modules-calc-original.js): hasil harus identik,
// termasuk tanggal tak valid, null, hitungKas=false, dan penyaringan kategori.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

function load(file, D) {
  const ctx = {
    console, D, window: {}, document: {}, localStorage: {},
    getCachedTxDateMs: (t) => (t ? new Date(t.date).getTime() : NaN),
    budgetMatchesTx: (b, t) => b.catIds.includes('__total__') || b.catIds.includes(t.category),
    totalAssetValue: () => 0, totalSaldoAkun: () => 0, totalPiutangValue: () => 0
  };
  vm.createContext(ctx);
  vm.runInContext(file + '\nthis.FI=FI;', ctx);
  return ctx.FI;
}
const NEW = read('modules/shared/modules-calc.js');
const OLD = read('tests/fixtures/s2705-modules-calc-original.js');

function rnd(seed) { let x = seed; return () => (x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296; }
function makeD(seed, n, fi) {
  const r = rnd(seed), now = Date.now();
  const cats = ['a', 'b', 'c'];
  const txs = [];
  for (let i = 0; i < n; i++) {
    const k = r();
    let date;
    if (k < 0.05) date = 'bukan-tanggal'; else if (k < 0.08) date = ''; else if (k < 0.1) date = null;
    else date = new Date(now - Math.floor(r() * 400) * 86400000).toISOString().slice(0, 10);
    const t = { date, amount: Math.round(r() * 1e6), category: cats[Math.floor(r() * 3)] };
    if (r() < 0.1) t.hitungKas = false;
    txs.push(t);
  }
  if (n > 2) txs[1] = null;
  return { transactions: txs, finansialFreedom: fi };
}

for (const [name, n, fi] of [
  ['kosong', 0, {}], ['kecil', 7, {}], ['besar', 3000, { avgMonths: 12 }],
  ['kategori', 500, { expenseCatIds: ['a', 'c'], avgMonths: 3 }], ['swr', 400, { swr: 3, avgMonths: 24 }]
]) {
  test('identik: ' + name, () => {
    const dn = makeD(42 + n, n, fi), dr = makeD(42 + n, n, fi);
    const a = load(NEW, dn), b = load(OLD, dr);
    assert.equal(a.monthsOfDataAvailable(), b.monthsOfDataAvailable());
    assert.equal(a.effectiveMonths(), b.effectiveMonths());
    const x = a.annualExpense(), y = b.annualExpense();
    assert.ok(Object.is(x, y), x + ' vs ' + y);
    assert.ok(Object.is(a.targetNominal(), b.targetNominal()));
  });
}

test('semua tanggal tak valid: perilaku sama (NaN)', () => {
  const mk = () => ({ transactions: [{ date: 'x', amount: 1, category: 'a' }, { date: '2026-01-01', amount: 1, category: 'a' }], finansialFreedom: {} });
  const a = load(NEW, mk()), b = load(OLD, mk());
  assert.ok(Object.is(a.monthsOfDataAvailable(), b.monthsOfDataAvailable()));
  assert.ok(Object.is(a.annualExpense(), b.annualExpense()));
});
