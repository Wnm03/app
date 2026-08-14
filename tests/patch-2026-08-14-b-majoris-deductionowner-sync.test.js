'use strict';
// tests/patch-2026-08-14-b-majoris-deductionowner-sync.test.js — SESI 2
// (lanjutan PATCH-2026-08-14, "Catatan tambahan" di
// AUDIT-estimasi-belum-teralokasi.md — sinyal pengeluaran KETIGA).
//
// `majorisRenovReconciliation()` (filter t.renovProjectLinkId) dan
// `o.linkedExpenseTotal` per-owner (filter t.deductionOwnerId, dipakai
// estimatedUnallocated sejak PATCH-2026-08-14 sesi 1) BISA menghasilkan
// angka berbeda utk data yang sama karena dua tag scope berbeda. Fix sesi
// ini: TIDAK menyatukan rumus (0 regresi kontrak S595 B1-B9/C1-C4) —
// tambah `deductionOwnerTotal` + `synced` di return `majorisRenovReconciliation()`
// supaya divergensi terlihat, plus baris peringatan di render kalau tidak sinkron.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeApiCtx(D) {
  return loadSource(
    ['modules/finance/dana-titipan-aggregation-api.js'],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => {}, sameId: (a, b) => String(a) === String(b) },
    ['DanaTitipanPortfolioAPI', 'sameId'],
  );
}

function baseD(extra) {
  return { investments: [], investmentTx: [], investmentWatchlist: [], debts: [], assets: [], transactions: [], accounts: [], ...extra };
}

test('1. kedua tag scope sama-sama menandai transaksi yang sama -> synced true, deductionOwnerTotal = pengeluaranMajoris', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000 }],
    transactions: [{ type: 'expense', accountId: 'acc1', amount: 3000000, renovProjectLinkId: 'p1' }],
  });
  const ctx = makeApiCtx(D);
  const owners = [{ ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }], linkedExpenseTotal: 3000000 }];
  const r = ctx.DanaTitipanPortfolioAPI.majorisRenovReconciliation(owners, 10000000);
  assert.equal(r.pengeluaranMajoris, 3000000);
  assert.equal(r.deductionOwnerTotal, 3000000);
  assert.equal(r.synced, true);
});

test('2. transaksi ber-renovProjectLinkId tapi TANPA deductionOwnerId (linkedExpenseTotal owner tetap 0) -> synced false', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000 }],
    transactions: [{ type: 'expense', accountId: 'acc1', amount: 3000000, renovProjectLinkId: 'p1' }],
  });
  const ctx = makeApiCtx(D);
  const owners = [{ ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }], linkedExpenseTotal: 0 }];
  const r = ctx.DanaTitipanPortfolioAPI.majorisRenovReconciliation(owners, 10000000);
  assert.equal(r.pengeluaranMajoris, 3000000);
  assert.equal(r.deductionOwnerTotal, 0);
  assert.equal(r.synced, false);
});

test('3. owner belum pernah lewat build() (linkedExpenseTotal undefined) -> deductionOwnerTotal 0, 0 crash', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000 }],
    transactions: [{ type: 'expense', accountId: 'acc1', amount: 1000000, renovProjectLinkId: 'p1' }],
  });
  const ctx = makeApiCtx(D);
  const owners = [{ ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] }];
  const r = ctx.DanaTitipanPortfolioAPI.majorisRenovReconciliation(owners, 10000000);
  assert.equal(r.deductionOwnerTotal, 0);
  assert.equal(r.synced, false);
});

test('4. kontrak lama S595 (pengeluaranMajoris/sisaSaldo) tetap sama persis -- 0 regresi formula', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000 }],
    transactions: [
      { type: 'expense', accountId: 'acc1', amount: 12000000, renovProjectLinkId: 'p1' },
    ],
  });
  const ctx = makeApiCtx(D);
  const owners = [{ ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] }];
  const r = ctx.DanaTitipanPortfolioAPI.majorisRenovReconciliation(owners, 10000000);
  assert.equal(r.pengeluaranMajoris, 12000000);
  assert.equal(r.sisaSaldo, -2000000);
});

// ===== Wiring render: baris peringatan additive kalau tidak sinkron =====

function makeRenderCtx(D) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/finance/filter-laporan.js',
      'modules/finance/dana-titipan-aggregation-api.js',
      'modules/finance/dana-titipan-commitment-return-api.js',
      'modules/finance/dana-titipan-portfolio-render.js',
    ],
    {
      D,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      save: () => {},
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      sameId: (a, b) => String(a) === String(b),
      Aset: {
        _resolveLinkedInvestmentOwners(a) {
          if (!a || !a.investmentId) return null;
          const h = (D.investments || []).find((x) => String(x.id) === String(a.investmentId));
          if (!h) return null;
          return h.owners || [];
        },
      },
    },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter', 'resolveTxOwnerSplitForAccount', 'sameId'],
  );
}

function fakeEl() {
  return { innerHTML: '', querySelectorAll: () => [] };
}

test('5. render: ada expense di akun tertaut yg TIDAK ditandai renovProjectLinkId (tapi tetap ikut linkedExpenseTotal via deductionOwnerId) -> baris peringatan tampil', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000, owners: [
      { ownerId: 'renov', porsi: 100, ownerName: 'Renov', isSelf: false },
    ] }],
    titipanCommitments: [{ ownerId: 'renov', ownerName: 'Renov', principalAmount: 10000000 }],
    transactions: [
      { type: 'expense', accountId: 'acc1', amount: 3000000, renovProjectLinkId: 'p1' },
      // belanja mingguan biasa di akun yg SAMA, TANPA tag "Proyek Renovasi"
      // -- tetap ikut o.linkedExpenseTotal (deductionOwnerId-based) tapi
      // TIDAK ikut pengeluaranMajoris (renovProjectLinkId-based).
      { type: 'expense', accountId: 'acc1', amount: 500000, deductionOwnerId: 'renov' },
    ],
  });
  const ctx = makeRenderCtx(D);
  const el = fakeEl();
  ctx.DanaTitipanPortfolioPresenter._renderNow(el);
  assert.ok(el.innerHTML.includes('Beda dgn total'));
});

test('6. render: 0 pengeluaran sama sekali -> tidak ada baris Majoris (pola lama tetap, 0 regresi)', () => {
  const D = baseD({
    titipanCommitments: [{ ownerId: 'renov', ownerName: 'Renov', principalAmount: 10000000 }],
    investments: [{ id: 'h1', name: 'Saham X', unit: 1, avgPrice: 5000000, currentPrice: 5000000, owners: [
      { ownerId: 'renov', porsi: 100, ownerName: 'Renov', isSelf: false },
    ] }],
  });
  const ctx = makeRenderCtx(D);
  const el = fakeEl();
  ctx.DanaTitipanPortfolioPresenter._renderNow(el);
  assert.ok(!el.innerHTML.includes('Pengeluaran Majoris'));
  assert.ok(!el.innerHTML.includes('Beda dgn total'));
});
