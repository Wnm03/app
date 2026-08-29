'use strict';
// tests/s569-resolve-tx-owner-split-stale-fix.test.js — Sesi A
// (AUDIT-DANA-TITIPAN-MAJORIS-PORSI-SYNC.md, acceptance criterion P0
// "owner source setelah link").
//
// Masalah yang diperbaiki (lihat §2 audit): saat Aset di-link ke Holding
// Investasi, a.owners disalin SEKALI ke holding lalu tidak ikut berubah
// kalau porsi di Holding diedit belakangan. showFilteredTx(scope='account')
// sebelum sesi ini baca MultiOwnerEngine.getOwners(a) LANGSUNG dari a.owners
// -- jadi split transaksi bisa diam-diam pakai porsi LAMA walau porsi
// sebenarnya sudah berubah di Holding.
//
// Fix: resolveTxOwnerSplitForAccount(accountId) (filter-laporan.js) --
// SATU titik baca owner, urutan sumber DIKUNCI:
//   1. Aset tertaut ke Holding (a.investmentId, holding masih ada) ->
//      Aset._resolveLinkedInvestmentOwners() (baca LIVE Investment.getOwners()).
//   2. Belum tertaut / tautan orphan -> fallback MultiOwnerEngine.getOwners(a)
//      (perilaku lama, 0 regresi).
// showFilteredTx() sekarang WAJIB lewat fungsi ini, bukan baca a.owners
// langsung lagi.
//
// DILARANG oleh audit: mengganti principalAmount, bikin rumus split baru,
// mengubah usedTotal -- sesi ini CUMA ganti SUMBER owners yang dipakai
// MultiOwnerEngine.splitByPorsi() yang SUDAH ADA (0 rumus baru).

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
    ['modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/filter-laporan.js'],
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
      closeModal: () => {},
      uid: () => 'x',
      save: () => {},
      toast: () => {},
      fmtFull: (n) => 'Rp' + n,
      todayStr: () => '2026-08-11',
    },
    ['Aset', 'MultiOwnerEngine', 'Investment']
  );
  ctx.Aset.renderList = () => {};
  return { ctx, els };
}

// ---- Test 1: P0 — porsi Holding berubah SETELAH link -> split transaksi ikut berubah ----
test('resolveTxOwnerSplitForAccount() — porsi diedit di Holding SETELAH aset linked -> split pakai porsi TERBARU (bukan a.owners lama/stale)', () => {
  const D = {
    assets: [{
      id: 'as1', name: 'Majoris', accountId: 'acc1', investmentId: 'inv1',
      // a.owners SENGAJA masih porsi LAMA (snapshot saat link dulu) -- harus
      // DIABAIKAN begitu aset tertaut ke Holding yang masih ada.
      owners: [{ ownerId: 'SELF', ownerName: 'renov', porsi: 80 }, { ownerId: 'sihab', ownerName: 'mas sihab', porsi: 20 }],
    }],
    investments: [{
      id: 'inv1', name: 'Majoris Holding',
      // Porsi TERBARU di Holding, sudah diedit user (beda dari a.owners di atas)
      owners: [{ ownerId: 'SELF', ownerName: 'renov', porsi: 50 }, { ownerId: 'sihab', ownerName: 'mas sihab', porsi: 50 }],
    }],
    transactions: [
      { id: 't1', accountId: 'acc1', type: 'income', amount: 1000000, date: '2026-08-01' },
      { id: 't2', accountId: 'acc1', type: 'expense', amount: 200000, date: '2026-08-02' },
    ],
  };
  const { ctx, els } = makeCtx(D);
  ctx.showFilteredTx('account', 'all', 'Akun Test', 'acc1');
  const html = els.filterTxOwnerSplit.innerHTML;
  assert.equal(els.filterTxOwnerSplit.style.display, 'block');
  // Porsi HARUS 50/50 (dari Holding), BUKAN 80/20 (dari a.owners lama)
  assert.ok(html.includes('renov (50%)'), 'detail owner pertama harus pakai porsi Holding terbaru (50%), bukan a.owners lama (80%)');
  // FIX SESI (laporan user 2026-08-15): amount TIDAK lagi proporsional ke %
  // (0.5*1000000), DAN TIDAK lagi fallback penuh ke owner pertama --
  // transaksi tanpa deductionOwnerId/ownerPorsiId eksplisit sekarang tidak
  // dihitung ke siapa pun sama sekali.
  assert.ok(html.includes('Modal Rp0'), 'transaksi tanpa penanda eksplisit tidak dihitung ke owner mana pun');
  const rows = ctx.window._filterTxOwnerSplitRows;
  assert.equal(rows.length, 2);
  assert.ok(rows[1].detailHtml.includes('mas sihab (50%)'), 'owner kedua juga harus 50% (porsi Holding terbaru)');
});

// ---- Test 2: fallback — aset TIDAK tertaut Holding -> tetap pakai a.owners (0 regresi) ----
test('resolveTxOwnerSplitForAccount() — aset belum linked ke Holding -> fallback MultiOwnerEngine.getOwners(a.owners), perilaku lama', () => {
  const D = {
    assets: [{ id: 'as1', name: 'Majoris', accountId: 'acc1', owners: [{ ownerId: 'SELF', ownerName: 'renov', porsi: 80 }, { ownerId: 'sihab', ownerName: 'mas sihab', porsi: 20 }] }],
    investments: [],
    transactions: [
      { id: 't1', accountId: 'acc1', type: 'income', amount: 1000000, date: '2026-08-01' },
      { id: 't2', accountId: 'acc1', type: 'expense', amount: 200000, date: '2026-08-02' },
    ],
  };
  const { ctx, els } = makeCtx(D);
  ctx.showFilteredTx('account', 'all', 'Akun Test', 'acc1');
  const html = els.filterTxOwnerSplit.innerHTML;
  assert.ok(html.includes('renov (80%)'), 'akun belum linked harus tetap pakai a.owners (80%)');
  // FIX SESI (laporan user 2026-08-15): 0 fallback ke owner pertama lagi
  // (bukan proporsi 80% juga -- lihat catatan sesi di atas).
  assert.ok(html.includes('Modal Rp0'));
});

// ---- Test 3: tautan orphan (holding sudah dihapus) -> fallback ke a.owners, tidak error ----
test('resolveTxOwnerSplitForAccount() — a.investmentId menunjuk Holding yang sudah dihapus (orphan) -> fallback a.owners, tidak error/crash', () => {
  const D = {
    assets: [{ id: 'as1', name: 'Majoris', accountId: 'acc1', investmentId: 'inv-deleted', owners: [{ ownerId: 'SELF', ownerName: 'renov', porsi: 70 }, { ownerId: 'sihab', ownerName: 'mas sihab', porsi: 30 }] }],
    investments: [],
    transactions: [{ id: 't1', accountId: 'acc1', type: 'income', amount: 1000000, date: '2026-08-01' }],
  };
  const { ctx, els } = makeCtx(D);
  assert.doesNotThrow(() => ctx.showFilteredTx('account', 'all', 'Akun Test', 'acc1'));
  const html = els.filterTxOwnerSplit.innerHTML;
  assert.ok(html.includes('renov (70%)'), 'tautan orphan harus fallback ke a.owners, bukan crash/kosong');
});

// ---- Test 4: P0 — principalAmount/titipanCommitments TIDAK disentuh sama sekali ----
test('resolveTxOwnerSplitForAccount() / showFilteredTx() — 0 mutasi ke D.titipanCommitments atau D.investments (PURE read-only)', () => {
  const commitmentsBefore = [{ id: 'c1', principalAmount: 10133585, usedTotal: 2000000 }];
  const investmentsBefore = [{ id: 'inv1', name: 'Majoris Holding', owners: [{ ownerId: 'SELF', ownerName: 'renov', porsi: 50 }, { ownerId: 'sihab', ownerName: 'mas sihab', porsi: 50 }] }];
  const D = {
    assets: [{ id: 'as1', name: 'Majoris', accountId: 'acc1', investmentId: 'inv1', owners: [{ ownerId: 'SELF', ownerName: 'renov', porsi: 80 }, { ownerId: 'sihab', ownerName: 'mas sihab', porsi: 20 }] }],
    investments: investmentsBefore,
    titipanCommitments: commitmentsBefore,
    transactions: [{ id: 't1', accountId: 'acc1', type: 'expense', amount: 500000, date: '2026-08-01' }],
  };
  const snapshotCommitments = JSON.parse(JSON.stringify(commitmentsBefore));
  const snapshotInvestments = JSON.parse(JSON.stringify(investmentsBefore));
  const { ctx } = makeCtx(D);
  ctx.showFilteredTx('account', 'all', 'Akun Test', 'acc1');
  assert.deepEqual(D.titipanCommitments, snapshotCommitments, 'titipanCommitments (principalAmount/usedTotal) tidak boleh berubah');
  assert.deepEqual(D.investments, snapshotInvestments, 'D.investments (porsi Holding) tidak boleh ikut termutasi cuma krn dibaca');
});
