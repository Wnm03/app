'use strict';
// tests/s567-filtertx-owner-split.test.js — Sesi 567.
//
// Target eksplisit user (lanjutan sesi 566): "riwayat transaksi ... tiap
// transaksi (modal/pengeluaran) dipecah per porsi pemilik lalu ditotal per
// orang."
//
// Sebelum sesi ini, showFilteredTx(scope='account') (dipakai saat kartu
// akun "(via Aset)" diketuk) cuma menampilkan total flat (income-expense)
// -- tidak ada pemecahan per porsi pemilik sama sekali, walau akunnya
// tertaut ke Aset multi-owner.
//
// Fix: elemen baru #filterTxOwnerSplit (modals.js, filterTxModal) diisi
// HANYA kalau scope==='account' DAN akun itu tertaut (D.assets[].accountId)
// ke Aset yang MultiOwnerEngine.getOwners()-nya balikin owners. Modal
// (total income) & Pengeluaran (total expense) masing-masing dipecah per
// porsi lewat REUSE MultiOwnerEngine.splitByPorsi() (0 rumus baru, sama
// fungsi yang dipakai resolveTxAssetSplit() per-transaksi di transaksi.js)
// -- 0 perubahan untuk scope lain atau akun yang tidak tertaut.

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
    filterTxOwnerSplit: makeEl(),
    filterTxList: makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {} }),
  };
  const fakeDoc = {
    getElementById: (id) => els[id] || null,
    createElement: () => makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {}, dataset: {}, querySelector: () => makeEl() }),
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
    ['MultiOwnerEngine']
  );
  return { ctx, els };
}

test('showFilteredTx(scope=account) — akun tertaut aset multi-owner -> tab per pemilik (bukan patungan/gabung), detail default owner pertama', () => {
  const D = {
    assets: [{ id: 'as1', name: 'Majoris', accountId: 'acc1', owners: [{ ownerId: 'SELF', ownerName: 'renov', porsi: 80 }, { ownerId: 'sihab', ownerName: 'mas sihab', porsi: 20 }] }],
    transactions: [
      { id: 't1', accountId: 'acc1', type: 'income', amount: 1000000, date: '2026-08-01' },
      { id: 't2', accountId: 'acc1', type: 'expense', amount: 200000, date: '2026-08-02' },
    ],
  };
  const { ctx, els } = makeCtx(D);
  ctx.showFilteredTx('account', 'all', 'Akun Test', 'acc1');
  const html = els.filterTxOwnerSplit.innerHTML;
  assert.equal(els.filterTxOwnerSplit.style.display, 'block', 'blok porsi harus ditampilkan');
  // S568: kedua NAMA pemilik muncul sbg tombol tab (bukan detail lengkap keduanya sekaligus)
  assert.ok(html.includes('>renov<'), 'tombol tab owner 1 (renov) harus tampil');
  assert.ok(html.includes('>mas sihab<'), 'tombol tab owner 2 (mas sihab) harus tampil');
  // Default (belum diklik) -> hanya detail owner PERTAMA (renov) yang tampil
  assert.ok(html.includes('renov (80%)'), 'detail default harus owner pertama (renov)');
  assert.ok(!html.includes('mas sihab (20%)'), 'detail owner kedua TIDAK boleh tampil bersamaan (bukan mode patungan)');
  // FIX SESI (laporan user 2026-08-15, lanjutan S608 -- root cause di
  // resolveTxOwnerAssignment(), filter-laporan.js): fallback "owner
  // PERTAMA menang" DIHAPUS. Transaksi t1/t2 TIDAK punya deductionOwnerId/
  // ownerPorsiId eksplisit -> SEKARANG tidak dihitung ke SIAPA PUN (bukan
  // cuma tidak ke mas sihab, renov juga TIDAK dapat bagian) -- konsisten
  // dgn semangat "hanya yang ditandai eksplisit yang dihitung".
  assert.ok(html.includes('Modal Rp0'), 'transaksi tanpa penanda eksplisit TIDAK dihitung ke owner mana pun (bukan fallback owner pertama lagi)');
  assert.ok(html.includes('Pengeluaran Rp0'), 'pengeluaran tanpa penanda eksplisit juga tidak dihitung');
  assert.ok(html.includes('Total Rp0'), 'total net jadi 0 krn belum ada satu pun transaksi yang ditandai eksplisit');

  // Data owner kedua tetap TERSEDIA (siap ditampilkan begitu tabnya diklik) lewat
  // window._filterTxOwnerSplitRows, walau tidak dirender bersamaan di HTML awal.
  const rows = ctx.window._filterTxOwnerSplitRows;
  assert.equal(rows.length, 2, 'data 2 owner harus tersimpan utk dipakai saat tab diklik');
  assert.equal(rows[1].name, 'mas sihab');
  assert.ok(rows[1].detailHtml.includes('mas sihab (20%)'));
  assert.ok(rows[1].detailHtml.includes('Modal Rp0'), 'owner kedua tidak dapat bagian krn tidak ada tx yang ditandai eksplisit utk dia');
});

test('showFilteredTx(scope=account) — transaksi dgn ownerPorsiId eksplisit -> dihitung ke owner yang DIPILIH, bukan owner pertama/proporsi', () => {
  const D = {
    assets: [{ id: 'as1', name: 'Majoris', accountId: 'acc1', owners: [{ ownerId: 'SELF', ownerName: 'renov', porsi: 80 }, { ownerId: 'sihab', ownerName: 'mas sihab', porsi: 20 }] }],
    transactions: [
      { id: 't1', accountId: 'acc1', type: 'income', amount: 1000000, date: '2026-08-01', ownerPorsiId: 'sihab' },
      { id: 't2', accountId: 'acc1', type: 'expense', amount: 200000, date: '2026-08-02' },
    ],
  };
  const { ctx, els } = makeCtx(D);
  ctx.showFilteredTx('account', 'all', 'Akun Test', 'acc1');
  const rows = ctx.window._filterTxOwnerSplitRows;
  // t1 eksplisit ditandai utk 'sihab' -> modal 1.000.000 masuk ke mas sihab, bukan renov
  assert.ok(rows[0].detailHtml.includes('Modal Rp0'), 'renov (owner pertama) tidak dapat modal krn t1 eksplisit milik sihab');
  // FIX SESI (laporan user 2026-08-15): t2 TIDAK punya ownerPorsiId eksplisit ->
  // 0 fallback ke owner pertama lagi, jadi tidak dihitung ke siapa pun.
  assert.ok(rows[0].detailHtml.includes('Pengeluaran Rp0'), 't2 tanpa ownerPorsiId eksplisit tidak dihitung ke siapa pun (0 fallback owner pertama)');
  assert.ok(rows[1].detailHtml.includes('Modal Rp1000000'), 'mas sihab dapat modal penuh krn t1 eksplisit ditandai miliknya');
});

// SESI S608 (audit user "apakah data dari akun transaksi yg ditautkan dari dana
// titipan sync otomatis ke dashboard Dana Titipan"): SEBELUM sesi ini, kartu ini
// membaca `t.ownerPorsiId` -- field yg TIDAK PERNAH ditulis lagi sejak
// `updateTxOwnerPorsiOptions()` dihapus (AUDIT-S540/B1-B12-DOUBLECOUNT), padahal
// badge "👤 Ditanggung: <owner>" di baris transaksi (tx-list-cashflow.js) sudah
// baca `t.deductionOwnerId` (S574) -- 2 tampilan beda sumber utk data yg sama.
// Test ini membuktikan kartu "Porsi per Pemilik" SEKARANG ikut baca
// `t.deductionOwnerId`, konsisten dgn badge per-baris.
test('showFilteredTx(scope=account) — FIX SYNC S608: transaksi dgn deductionOwnerId eksplisit -> dihitung ke owner yang DITANDAI (sama dgn badge "Ditanggung" di baris transaksi), bukan owner pertama', () => {
  const D = {
    assets: [{ id: 'as1', name: 'Majoris', accountId: 'acc1', owners: [{ ownerId: 'SELF', ownerName: 'renov', porsi: 80 }, { ownerId: 'sihab', ownerName: 'mas sihab', porsi: 20 }] }],
    transactions: [
      { id: 't1', accountId: 'acc1', type: 'income', amount: 1000000, date: '2026-08-01', deductionOwnerId: 'sihab' },
      { id: 't2', accountId: 'acc1', type: 'expense', amount: 200000, date: '2026-08-02' },
    ],
  };
  const { ctx, els } = makeCtx(D);
  ctx.showFilteredTx('account', 'all', 'Akun Test', 'acc1');
  const rows = ctx.window._filterTxOwnerSplitRows;
  assert.ok(rows[0].detailHtml.includes('Modal Rp0'), 'renov (owner pertama) tidak dapat modal krn t1 eksplisit milik sihab via deductionOwnerId');
  // FIX SESI (laporan user 2026-08-15): t2 tanpa deductionOwnerId eksplisit ->
  // 0 fallback ke owner pertama lagi.
  assert.ok(rows[0].detailHtml.includes('Pengeluaran Rp0'), 't2 tanpa deductionOwnerId eksplisit tidak dihitung ke siapa pun (0 fallback owner pertama)');
  assert.ok(rows[1].detailHtml.includes('Modal Rp1000000'), 'mas sihab dapat modal penuh krn t1 eksplisit ditandai deductionOwnerId miliknya');
});

test('showFilteredTx(scope=account) — deductionOwnerId diprioritaskan di atas ownerPorsiId legacy kalau keduanya somehow ada (deductionOwnerId menang)', () => {
  const D = {
    assets: [{ id: 'as1', name: 'Majoris', accountId: 'acc1', owners: [{ ownerId: 'SELF', ownerName: 'renov', porsi: 80 }, { ownerId: 'sihab', ownerName: 'mas sihab', porsi: 20 }] }],
    transactions: [
      { id: 't1', accountId: 'acc1', type: 'income', amount: 1000000, date: '2026-08-01', deductionOwnerId: 'sihab', ownerPorsiId: 'SELF' },
    ],
  };
  const { ctx } = makeCtx(D);
  ctx.showFilteredTx('account', 'all', 'Akun Test', 'acc1');
  const rows = ctx.window._filterTxOwnerSplitRows;
  assert.ok(rows[1].detailHtml.includes('Modal Rp1000000'), 'deductionOwnerId (sihab) menang di atas ownerPorsiId legacy (SELF)');
});

test('showFilteredTx(scope=account) — akun TIDAK tertaut ke aset apa pun -> #filterTxOwnerSplit tetap kosong/tersembunyi', () => {
  const D = {
    assets: [],
    transactions: [{ id: 't1', accountId: 'acc1', type: 'income', amount: 50000, date: '2026-08-01' }],
  };
  const { ctx, els } = makeCtx(D);
  ctx.showFilteredTx('account', 'all', 'Akun Test', 'acc1');
  assert.equal(els.filterTxOwnerSplit.innerHTML, '', 'tidak boleh ada isi porsi utk akun tidak tertaut');
  assert.equal(els.filterTxOwnerSplit.style.display, 'none', 'blok porsi harus tersembunyi');
});

test('showFilteredTx(scope!=="account") — misal scope "laporan" -> #filterTxOwnerSplit tetap kosong/tersembunyi walau ada aset multi-owner', () => {
  const D = {
    assets: [{ id: 'as1', accountId: 'acc1', owners: [{ ownerId: 'SELF', ownerName: 'renov', porsi: 100 }] }],
    transactions: [{ id: 't1', accountId: 'acc1', type: 'income', amount: 50000, date: '2026-08-01' }],
  };
  const { ctx, els } = makeCtx(D);
  ctx.curMonth = new Date('2026-08-01').getMonth();
  ctx.curYear = new Date('2026-08-01').getFullYear();
  ctx.getRange = () => ({ from: new Date('2026-01-01'), to: new Date('2026-12-31') });
  ctx.getLaporanFilters = () => ({});
  ctx.showFilteredTx('laporan', 'all', 'Laporan Test');
  assert.equal(els.filterTxOwnerSplit.innerHTML, '', 'scope selain account tidak boleh memicu blok porsi');
  assert.equal(els.filterTxOwnerSplit.style.display, 'none');
});

test('showFilteredTx(scope=account) — elemen #filterTxOwnerSplit tidak ada di DOM (halaman lain) -> tidak error', () => {
  const D = {
    assets: [{ id: 'as1', accountId: 'acc1', owners: [{ ownerId: 'SELF', ownerName: 'renov', porsi: 100 }] }],
    transactions: [{ id: 't1', accountId: 'acc1', type: 'income', amount: 50000, date: '2026-08-01' }],
  };
  const els = {
    filterTxTitle: makeEl(),
    filterTxSummary: makeEl(),
    filterTxList: makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {} }),
  };
  const fakeDoc = {
    getElementById: (id) => els[id] || null,
    createElement: () => makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {}, dataset: {}, querySelector: () => makeEl() }),
  };
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/finance/filter-laporan.js'],
    { document: fakeDoc, D, sameId: (a, b) => String(a) === String(b), fmt: (n) => 'Rp' + n, escapeHtml: (s) => String(s), txHTML: (t) => `<div data-id="${t.id}"></div>`, curMonth: 7, curYear: 2026, openModal: () => {} },
    ['MultiOwnerEngine']
  );
  assert.doesNotThrow(() => ctx.showFilteredTx('account', 'all', 'Akun Test', 'acc1'));
});
