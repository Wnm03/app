'use strict';
// tests/s648-showfilteredtx-keuangan-search-scope.test.js — regresi BUG-010
// (TODO.md, "Filter Laporan — Sesi Audit filter-laporan.js"):
//   showFilteredTx(scope='keuangan') cuma filter pakai txMatchesFilters(t,kf)
//   -- TIDAK ikut txMatchesSearch(t,kf.search), padahal renderKeuangan()
//   (modules-render.js, bagian render #txList) sudah lebih dulu benar pakai
//   KEDUANYA (txMatchesFilters(t,kf)&&txMatchesSearch(t,kf.search)).
//   Akibatnya: user ketik kata kunci di kolom cari filter Keuangan (#kfSearch),
//   list utama sudah kefilter sesuai pencarian, tapi tap kartu ringkasan
//   (mis. "Pemasukan"/"Pengeluaran" bulan ini) yang memanggil showFilteredTx()
//   masih nampilin transaksi TANPA filter pencarian itu.
// Fix: tambah &&txMatchesSearch(t,kf.search) ke filter scope 'keuangan',
// pola sama modules-render.js. Pakai fakeDom minimal (pola sama
// tests/s567-filtertx-owner-split.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(initial = {}) {
  return { innerHTML: '', textContent: '', style: {}, value: '', ...initial };
}

function makeCtx(D, kfValues) {
  const filterEls = {
    kfTipe: makeEl({ value: (kfValues && kfValues.tipe) || 'semua' }),
    kfKat: makeEl({ value: (kfValues && kfValues.kat) || 'semua' }),
    kfSub: makeEl({ value: (kfValues && kfValues.sub) || 'semua' }),
    kfAcc: makeEl({ value: (kfValues && kfValues.acc) || 'semua' }),
    kfMethod: makeEl({ value: (kfValues && kfValues.method) || 'semua' }),
    kfSearch: makeEl({ value: (kfValues && kfValues.search) || '' }),
  };
  const els = Object.assign(
    {
      filterTxTitle: makeEl(),
      filterTxSummary: makeEl(),
      filterTxOwnerSplit: null,
      filterTxList: makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {} }),
    },
    filterEls,
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

test('showFilteredTx(scope=keuangan) — kfSearch terisi -> transaksi yang TIDAK match kata kunci tidak ikut ditampilkan/dihitung', () => {
  const D = {
    accounts: [{ id: 'acc1', name: 'BCA' }],
    transactions: [
      { id: 't1', accountId: 'acc1', type: 'income', amount: 500000, date: '2026-08-05', category: 'Gaji', note: 'gaji agustus' },
      { id: 't2', accountId: 'acc1', type: 'income', amount: 300000, date: '2026-08-06', category: 'Bonus', note: 'bonus proyek cobek' },
    ],
  };
  const { ctx, els } = makeCtx(D, { search: 'cobek' });
  ctx.showFilteredTx('keuangan', 'income', 'Pemasukan', null);
  // Hanya t2 ("bonus proyek cobek") yang match kata kunci "cobek" -> total = 300000
  assert.equal(els.filterTxSummary.textContent, '1 transaksi · Total Rp300000');
});

test('showFilteredTx(scope=keuangan) — kfSearch kosong -> 0 regresi, semua transaksi bulan berjalan tetap ikut', () => {
  const D = {
    accounts: [{ id: 'acc1', name: 'BCA' }],
    transactions: [
      { id: 't1', accountId: 'acc1', type: 'income', amount: 500000, date: '2026-08-05', category: 'Gaji', note: 'gaji agustus' },
      { id: 't2', accountId: 'acc1', type: 'income', amount: 300000, date: '2026-08-06', category: 'Bonus', note: 'bonus proyek cobek' },
    ],
  };
  const { ctx, els } = makeCtx(D, { search: '' });
  ctx.showFilteredTx('keuangan', 'income', 'Pemasukan', null);
  assert.equal(els.filterTxSummary.textContent, '2 transaksi · Total Rp800000');
});

test('showFilteredTx(scope=keuangan) — kfSearch cocok nama akun -> ikut match (konsisten dgn txMatchesSearch yang juga cek nama akun)', () => {
  const D = {
    accounts: [{ id: 'acc1', name: 'BCA Utama' }, { id: 'acc2', name: 'Cash' }],
    transactions: [
      { id: 't1', accountId: 'acc1', type: 'expense', amount: 100000, date: '2026-08-05', category: 'Belanja', note: '' },
      { id: 't2', accountId: 'acc2', type: 'expense', amount: 50000, date: '2026-08-06', category: 'Belanja', note: '' },
    ],
  };
  const { ctx, els } = makeCtx(D, { search: 'bca' });
  ctx.showFilteredTx('keuangan', 'expense', 'Pengeluaran', null);
  assert.equal(els.filterTxSummary.textContent, '1 transaksi · Total -Rp100000');
});

test('showFilteredTx(scope!==keuangan, mis. laporan) — 0 regresi, kfSearch tidak dipakai sama sekali (pola lama tetap)', () => {
  const D = {
    accounts: [{ id: 'acc1', name: 'BCA' }],
    transactions: [
      { id: 't1', accountId: 'acc1', type: 'income', amount: 500000, date: '2026-08-05', category: 'Gaji', note: 'gaji agustus' },
    ],
  };
  const els = {
    filterTxTitle: makeEl(),
    filterTxSummary: makeEl(),
    filterTxOwnerSplit: null,
    filterTxList: makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {} }),
    fFrom: makeEl({ value: '' }),
    fTo: makeEl({ value: '' }),
    fTipe: makeEl({ value: 'semua' }),
    fKat: makeEl({ value: 'semua' }),
    fSub: makeEl({ value: 'semua' }),
    fAcc: makeEl({ value: 'semua' }),
    fMethod: makeEl({ value: 'semua' }),
  };
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
      getRange: () => ({ from: new Date('2026-01-01'), to: new Date('2026-12-31') }),
    },
    [],
  );
  ctx.showFilteredTx('laporan', 'income', 'Laporan', null);
  assert.equal(els.filterTxSummary.textContent, '1 transaksi · Total Rp500000', 'scope laporan tidak tersentuh fix ini');
});
