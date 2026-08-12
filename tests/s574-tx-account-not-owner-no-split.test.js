'use strict';
// tests/s574-tx-account-not-owner-no-split.test.js — Sesi 574
// (BUGFIX LANJUTAN "akun pembayar ≠ pemilik aset").
//
// Latar: audit user menemukan UI Riwayat (filterTxModal) masih menampilkan
// blok "👥 Porsi per Pemilik" hasil MEMECAH nominal transaksi (modal/
// pengeluaran) berdasarkan akun pembayaran (#txAcc) yang dicocokkan ke Aset
// lewat accountId. Itu keliru secara konsep: akun/metode pembayaran HANYA
// menentukan saldo mana yang dipotong -- TIDAK PERNAH otomatis jadi owner
// aset, dan TIDAK PERNAH masuk ke perhitungan porsi.
//
// Fix (filter-laporan.js, showFilteredTx): seluruh blok split dihapus.
// selectFilterTxOwnerSplit() / resolveTxOwnerSplitForAccount() /
// resolveTxOwnerAssignment() ikut dihapus (sudah 0 pemanggil live setelah
// blok split dihapus). #filterTxOwnerSplit sekarang SELALU disembunyikan &
// dikosongkan tanpa syarat, apa pun scope/akun/asetnya.
//
// Skenario wajib dari user: aset owner A 20% + B 80%, pembayaran dari akun
// "Sucorinvest" Rp1.000.000 -> Sucorinvest -Rp1.000.000, akun lain
// ("Majoris") TIDAK berkurang, ownership aset TETAP A 20% + B 80% (tidak
// diubah/ditulis oleh transaksi), dan TIDAK ADA split Rp200.000/Rp800.000
// berdasarkan owner di mana pun (riwayat transaksi maupun struktur data).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(initial = {}) {
  return { innerHTML: '', textContent: '', style: {}, ...initial };
}

function makeCtx(D) {
  const els = {
    filterTxTitle: makeEl(),
    filterTxSummary: makeEl(),
    filterTxOwnerSplit: makeEl({ style: { display: 'block' }, innerHTML: '<div>stale dari render sebelumnya</div>' }),
    filterTxList: makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {} }),
  };
  const fakeDoc = {
    getElementById: (id) => els[id] || null,
    createElement: () => makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {}, dataset: {}, querySelector: () => makeEl() }),
    querySelectorAll: () => [],
    querySelector: () => null,
  };
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/finance/filter-laporan.js'],
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
    ['MultiOwnerEngine'],
  );
  return { ctx, els };
}

test('showFilteredTx(scope=account): akun tertaut aset multi-owner TIDAK PERNAH menampilkan "Porsi per Pemilik" -- #filterTxOwnerSplit selalu disembunyikan & dikosongkan', () => {
  const D = {
    assets: [{ id: 'as1', name: 'Sucorinvest', accountId: 'acc-sucor', owners: [
      { ownerId: 'A', ownerName: 'A', porsi: 20 },
      { ownerId: 'B', ownerName: 'B', porsi: 80 },
    ] }],
    accounts: [
      { id: 'acc-sucor', name: 'Sucorinvest', balance: 5000000 },
      { id: 'acc-majoris', name: 'Majoris', balance: 2000000 },
    ],
    transactions: [
      { id: 't1', type: 'expense', accountId: 'acc-sucor', amount: 1000000, date: '2026-08-01' },
    ],
  };
  const { ctx, els } = makeCtx(D);
  ctx.showFilteredTx('account', 'all', 'Sucorinvest', 'acc-sucor');

  // #filterTxOwnerSplit harus SELALU disembunyikan & dikosongkan -- 0 split
  // ditampilkan, walau akunnya tertaut aset multi-owner dgn owners eksplisit.
  assert.equal(els.filterTxOwnerSplit.innerHTML, '');
  assert.equal(els.filterTxOwnerSplit.style.display, 'none');

  // Ringkasan tetap flat/utuh (tidak dipecah per owner) -- total = 1 transaksi
  // expense Rp1.000.000 penuh, bukan Rp200.000/Rp800.000.
  assert.match(els.filterTxSummary.textContent, /1 transaksi/);
  assert.match(els.filterTxSummary.textContent, /-Rp1000000/);
});

test('resolveTxOwnerAssignment / selectFilterTxOwnerSplit (fungsi PEMECAH transaksi per owner) tidak lagi ada -- resolveTxOwnerSplitForAccount (resolver murni baca-ownership, dipakai modul lain) tetap ada', () => {
  const D = { assets: [], accounts: [], transactions: [] };
  const { ctx } = makeCtx(D);
  assert.equal(typeof ctx.resolveTxOwnerAssignment, 'undefined');
  assert.equal(typeof ctx.selectFilterTxOwnerSplit, 'undefined');
  assert.equal(typeof ctx.resolveTxOwnerSplitForAccount, 'function');
});

test('Contoh wajib user: pembayaran dari Sucorinvest TIDAK memotong Majoris & TIDAK mengubah ownership aset (A 20% + B 80% tetap utuh)', () => {
  const D = {
    assets: [{ id: 'as1', name: 'Sucorinvest', accountId: 'acc-sucor', owners: [
      { ownerId: 'A', ownerName: 'A', porsi: 20 },
      { ownerId: 'B', ownerName: 'B', porsi: 80 },
    ] }],
    accounts: [
      { id: 'acc-sucor', name: 'Sucorinvest', balance: 5000000 },
      { id: 'acc-majoris', name: 'Majoris', balance: 2000000 },
    ],
    transactions: [
      { id: 't1', type: 'expense', accountId: 'acc-sucor', amount: 1000000, date: '2026-08-01' },
    ],
  };
  const { ctx } = makeCtx(D);
  ctx.showFilteredTx('account', 'all', 'Sucorinvest', 'acc-sucor');

  // Akun Majoris SAMA SEKALI tidak disentuh oleh showFilteredTx() (bukan
  // pembayar transaksi ini) -- saldo tetap seperti semula.
  const majoris = D.accounts.find((a) => a.id === 'acc-majoris');
  assert.equal(majoris.balance, 2000000);

  // Ownership aset tetap PERSIS seperti semula -- showFilteredTx() (fungsi
  // baca-riwayat) tidak pernah menulis/mengubah D.assets[].owners.
  const asset = D.assets.find((a) => a.id === 'as1');
  assert.deepEqual(asset.owners, [
    { ownerId: 'A', ownerName: 'A', porsi: 20 },
    { ownerId: 'B', ownerName: 'B', porsi: 80 },
  ]);
});
