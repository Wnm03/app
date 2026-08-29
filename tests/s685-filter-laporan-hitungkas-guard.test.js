'use strict';
// tests/s685-filter-laporan-hitungkas-guard.test.js — showFilteredTx()
// (modules/finance/filter-laporan.js) sekarang guard t.hitungKas!==false
// pada agregat moneter (filterTxSummary total & split modal/pengeluaran per
// pemilik), pola sama computeCashflowForecast() (tx-list-cashflow.js). Baris
// "📝 Catatan saja" (hitungKas:false) TETAP ikut tampil di daftar (sorted
// tidak difilter) -- yang di-guard cuma total/summary. Harness fakeDom
// direuse dari tests/s648-showfilteredtx-keuangan-search-scope.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(initial = {}) {
  return { innerHTML: '', textContent: '', style: {}, value: '', ...initial };
}

function makeCtx(D, extra = {}) {
  const els = Object.assign(
    {
      filterTxTitle: makeEl(),
      filterTxSummary: makeEl(),
      filterTxOwnerSplit: null,
      filterTxList: makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {} }),
      kfTipe: makeEl({ value: 'semua' }),
      kfKat: makeEl({ value: 'semua' }),
      kfSub: makeEl({ value: 'semua' }),
      kfAcc: makeEl({ value: 'semua' }),
      kfMethod: makeEl({ value: 'semua' }),
      kfSearch: makeEl({ value: '' }),
    },
    extra.els || {},
  );
  const fakeDoc = {
    getElementById: (id) => (id in els ? els[id] : null),
    createElement: () => makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {}, dataset: {}, querySelector: () => makeEl() }),
  };
  const ctx = loadSource(
    ['modules/finance/filter-laporan.js'],
    {
      document: fakeDoc,
      D,
      sameId: (a, b) => String(a) === String(b),
      fmt: (n) => 'Rp' + n,
      escapeHtml: (s) => String(s),
      txHTML: (t) => `<div data-id="${t.id}"></div>`,
      curMonth: 7,
      curYear: 2026,
      openModal: () => {},
    },
    [],
  );
  return { ctx, els };
}

test('showFilteredTx(scope=dashboard) — tx hitungKas:false TIDAK ikut Total, tapi tetap ikut dihitung ke jumlah baris', () => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-05`;
  const D = {
    accounts: [{ id: 'acc1', name: 'BCA' }],
    transactions: [
      { id: 't1', accountId: 'acc1', type: 'income', amount: 500000, date: dateStr },
      { id: 't2', accountId: 'acc1', type: 'income', amount: 999999, date: dateStr, hitungKas: false },
    ],
  };
  const { ctx, els } = makeCtx(D);
  ctx.showFilteredTx('dashboard', 'income', 'Pemasukan', null);
  // t2 (Catatan saja) TIDAK ikut Total, tapi jumlah baris (2 transaksi) tetap termasuk t2
  assert.equal(els.filterTxSummary.textContent, '2 transaksi · Total Rp500000');
});

test('showFilteredTx(scope=dashboard) — semua tx hitungKas:false -> Total 0, baris tetap tidak difilter keluar', () => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-05`;
  const D = {
    accounts: [{ id: 'acc1', name: 'BCA' }],
    transactions: [
      { id: 't1', accountId: 'acc1', type: 'expense', amount: 200000, date: dateStr, hitungKas: false },
    ],
  };
  const { ctx, els } = makeCtx(D);
  ctx.showFilteredTx('dashboard', 'expense', 'Pengeluaran', null);
  assert.equal(els.filterTxSummary.textContent, '1 transaksi · Total Rp0');
});

test('showFilteredTx() — tanpa hitungKas sama sekali (undefined, data lama) tetap dihitung normal ke Total (default true)', () => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-05`;
  const D = {
    accounts: [{ id: 'acc1', name: 'BCA' }],
    transactions: [{ id: 't1', accountId: 'acc1', type: 'income', amount: 500000, date: dateStr }],
  };
  const { ctx, els } = makeCtx(D);
  ctx.showFilteredTx('dashboard', 'income', 'Pemasukan', null);
  assert.equal(els.filterTxSummary.textContent, '1 transaksi · Total Rp500000');
});
