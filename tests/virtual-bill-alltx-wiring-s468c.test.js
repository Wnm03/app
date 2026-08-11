'use strict';
// tests/virtual-bill-alltx-wiring-s468c.test.js — cakupan sesi s468c dari
// s468-PLAN-virtual-bill-item-tx-list.md: wiring section "⏳ Akan Jatuh
// Tempo" (item virtual, dari generateVirtualBillItemsForMonth()) ke
// renderKeuangan()/#allTx, DENGAN guard periode wajib (temuan #7): section
// HANYA tampil kalau txListPeriode==='bulan' DAN curYear/curMonth == bulan/
// tahun aktual (new Date()) sekarang.
//
// renderKeuangan() (modules-render.js) adalah fungsi besar dgn banyak
// dependency lintas-modul -- dites via extractFunction() (helper khusus utk
// kasus ini, lihat tests/helpers/loadSource.js) supaya tidak perlu me-mock
// puluhan modul lain, sambil tetap menjalankan SOURCE ASLI (bukan salinan).

const test = require('node:test');
const assert = require('node:assert/strict');
const { extractFunction } = require('./helpers/loadSource');
const vm = require('vm');

function makeEl(id) {
  return {
    id, innerHTML: '', textContent: '', className: '', style: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    querySelector: () => ({ textContent: '' }),
  };
}

function makeDocument(els) {
  const registry = new Map(Object.entries(els));
  return { getElementById: (id) => registry.has(id) ? registry.get(id) : (registry.set(id, makeEl(id)), registry.get(id)) };
}

function runRenderKeuangan(D, opts) {
  const fn = extractFunction('modules/shared/modules-render.js', 'renderKeuangan');
  const els = {
    monthLabel: makeEl('monthLabel'),
    txListMonthLabel: makeEl('txListMonthLabel'),
    mIncome: makeEl('mIncome'),
    mExpense: makeEl('mExpense'),
    mNet: makeEl('mNet'),
    allTxVirtualBills: makeEl('allTxVirtualBills'),
    allTx: makeEl('allTx'),
    allTxLoadMoreWrap: makeEl('allTxLoadMoreWrap'),
  };
  const document = makeDocument(els);
  const genCalls = [];
  const sandbox = {
    console,
    D,
    document,
    curMonth: opts.curMonth,
    curYear: opts.curYear,
    txListPeriode: opts.txListPeriode,
    txListPage: 1,
    TX_PAGE_SIZE: 20,
    MONTHS_FULL: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    fmtFull: (n) => 'Rp ' + Math.round(n || 0),
    txHTML: (t) => `<div data-tx-id="${t.id}">${t.virtual ? 'VIRTUAL' : 'REAL'}</div>`,
    getKeuFilters: () => ({}),
    getTxListRange: () => ({ from: new Date(0), to: new Date(8640000000000000) }),
    txMatchesFilters: () => true,
    txMatchesSearch: () => true,
    updateKfBadge: () => {},
    renderKeuAbsensiGajiCard: () => {},
    runDeferredOrNow: () => {}, // sengaja tidak eksekusi callback -- widget2 di dalamnya irrelevant utk test ini
    generateVirtualBillItemsForMonth: (y, m) => { genCalls.push([y, m]); return opts.vItems || []; },
  };
  const context = vm.createContext(sandbox);
  const wrapped = `(${fn.toString()})()`;
  new vm.Script(wrapped, { filename: 'renderKeuangan-invoke' }).runInContext(context);
  return { els, genCalls };
}

function baseD() {
  return { transactions: [], accounts: [] };
}

test('renderKeuangan() — txListPeriode="bulan" & bulan aktual -> section virtual dirender + generator terpanggil', () => {
  const now = new Date();
  const { els, genCalls } = runRenderKeuangan(baseD(), {
    curMonth: now.getMonth(), curYear: now.getFullYear(), txListPeriode: 'bulan',
    vItems: [{ id: 'vbill_b1_x', virtual: true }],
  });
  assert.equal(genCalls.length, 1, 'generateVirtualBillItemsForMonth harus terpanggil');
  assert.deepEqual(genCalls[0], [now.getFullYear(), now.getMonth()]);
  assert.match(els.allTxVirtualBills.innerHTML, /Akan Jatuh Tempo/);
  assert.match(els.allTxVirtualBills.innerHTML, /VIRTUAL/);
});

test('renderKeuangan() — nav ke bulan lain (bukan bulan aktual) -> section virtual TIDAK dirender', () => {
  const now = new Date();
  const otherMonth = (now.getMonth() + 1) % 12;
  const otherYear = otherMonth === 0 ? now.getFullYear() + 1 : now.getFullYear();
  const { els, genCalls } = runRenderKeuangan(baseD(), {
    curMonth: otherMonth, curYear: otherYear, txListPeriode: 'bulan',
    vItems: [{ id: 'vbill_b1_x', virtual: true }],
  });
  assert.equal(genCalls.length, 0, 'generator TIDAK boleh dipanggil kalau bukan bulan aktual');
  assert.equal(els.allTxVirtualBills.innerHTML, '');
});

test('renderKeuangan() — txListPeriode selain "bulan" (mis. "minggu") -> section virtual TIDAK dirender walau bulan aktual', () => {
  const now = new Date();
  const { els, genCalls } = runRenderKeuangan(baseD(), {
    curMonth: now.getMonth(), curYear: now.getFullYear(), txListPeriode: 'minggu',
    vItems: [{ id: 'vbill_b1_x', virtual: true }],
  });
  assert.equal(genCalls.length, 0);
  assert.equal(els.allTxVirtualBills.innerHTML, '');
});

test('renderKeuangan() — 0 item virtual bulan ini -> section kosong (bukan error), #allTx tetap normal', () => {
  const now = new Date();
  const { els } = runRenderKeuangan(baseD(), {
    curMonth: now.getMonth(), curYear: now.getFullYear(), txListPeriode: 'bulan',
    vItems: [],
  });
  assert.equal(els.allTxVirtualBills.innerHTML, '');
});

test('renderKeuangan() — mIncome/mExpense/mNet dihitung dari txM (D.transactions), TIDAK terpengaruh item virtual (regresi wajib)', () => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const D = { transactions: [{ id: 't1', type: 'income', amount: 1000000, date: dateStr }], accounts: [] };
  const { els } = runRenderKeuangan(D, {
    curMonth: now.getMonth(), curYear: now.getFullYear(), txListPeriode: 'bulan',
    vItems: [{ id: 'vbill_b1_x', virtual: true, amount: 9999999 }],
  });
  assert.equal(els.mIncome.textContent, 'Rp 1000000', 'mIncome harus murni dari D.transactions, tidak ikut nominal item virtual');
});
