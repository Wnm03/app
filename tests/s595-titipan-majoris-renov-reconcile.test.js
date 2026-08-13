'use strict';
// tests/s595-titipan-majoris-renov-reconcile.test.js — SESI S595
// (kontrak audit final, lanjutan AUDIT-DANA-TITIPAN-MAJORIS-PORSI-SYNC.md).
//
// Target:
//   1. `DanaTitipanPortfolioAPI._majorisLinkedAccountIds(owners)` — resolve
//      akun-akun tertaut SELURUH holding Dana Titipan (union semua owner),
//      REUSE relasi h.type==='aset'+h.linkedAssetId / h.linkedInvestmentId
//      -> asset.accountId yang SAMA PERSIS
//      `_expenseComparisonForOwner()` (Sesi C/S597, per-owner) — beda
//      scope: fungsi ini level KARTU (semua owner sekaligus).
//   2. `DanaTitipanPortfolioAPI.majorisRenovReconciliation(owners,
//      principalAmountTotal)` — baris pembanding OTOMATIS "Pengeluaran
//      Majoris (dari transaksi Renov)" + "Sisa Saldo Majoris Belum
//      Terpotong", scope filter `t.renovProjectLinkId` truthy (tag scope
//      "Dana Titipan Renov" YANG SUDAH ADA, transaksi.js/linktx.js/
//      tx-renov.js/renovasi.js — 0 field baru).
//   3. Wiring markup di `DanaTitipanPortfolioPresenter._renderNow()` —
//      baris baru muncul tepat di bawah "Total Pokok Dikomit" (0 baris
//      lama diubah/dihapus).
//
// 0 rumus Pokok Dikomit manual disentuh, 0 field D baru, 0 sentuhan owner
// resolution Gap #1. Additive murni.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeApiCtx(D) {
  return loadSource(
    ['modules/finance/dana-titipan-aggregation-api.js'],
    {
      D,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      save: () => {},
      sameId: (a, b) => String(a) === String(b),
    },
    ['DanaTitipanPortfolioAPI', 'sameId'],
  );
}

function baseD(extra) {
  return { investments: [], investmentTx: [], investmentWatchlist: [], debts: [], assets: [], transactions: [], accounts: [], ...extra };
}

// ===== Bagian A: _majorisLinkedAccountIds(owners) =====

test('A1. owner dgn holding aset ber-accountId -> 1 accountId', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000 }],
  });
  const ctx = makeApiCtx(D);
  const owners = [{ ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] }];
  const ids = Array.from(ctx.DanaTitipanPortfolioAPI._majorisLinkedAccountIds(owners));
  assert.deepEqual(ids, ['acc1']);
});

test('A2. holding investasi tertaut balik ke Aset ber-accountId -> ikut kehitung', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', investmentId: 'h1', nilai: 1000000 }],
  });
  const ctx = makeApiCtx(D);
  const owners = [{ ownerId: 'renov', holdings: [{ type: 'investasi', linkedInvestmentId: 'h1' }] }];
  const ids = Array.from(ctx.DanaTitipanPortfolioAPI._majorisLinkedAccountIds(owners));
  assert.deepEqual(ids, ['acc1']);
});

test('A3. 2 owner beda, sama-sama tertaut ke akun yang SAMA -> dedup, 1 accountId', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000 }],
  });
  const ctx = makeApiCtx(D);
  const owners = [
    { ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] },
    { ownerId: 'sihab', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] },
  ];
  const ids = Array.from(ctx.DanaTitipanPortfolioAPI._majorisLinkedAccountIds(owners));
  assert.deepEqual(ids, ['acc1']);
});

test('A4. tidak ada holding tertaut akun sama sekali -> []', () => {
  const D = baseD();
  const ctx = makeApiCtx(D);
  assert.deepEqual(Array.from(ctx.DanaTitipanPortfolioAPI._majorisLinkedAccountIds([{ ownerId: 'renov', holdings: [] }])), []);
  assert.deepEqual(Array.from(ctx.DanaTitipanPortfolioAPI._majorisLinkedAccountIds([])), []);
  assert.deepEqual(Array.from(ctx.DanaTitipanPortfolioAPI._majorisLinkedAccountIds(undefined)), []);
});

// ===== Bagian B: majorisRenovReconciliation(owners, principalAmountTotal) =====

test('B1. expense ber-renovProjectLinkId di akun tertaut -> Pengeluaran Majoris terhitung, Sisa = Pokok - Pengeluaran', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000 }],
    transactions: [
      { type: 'expense', accountId: 'acc1', amount: 3000000, renovProjectLinkId: 'p1' },
      { type: 'expense', accountId: 'acc1', amount: 2000000, renovProjectLinkId: 'p1' },
    ],
  });
  const ctx = makeApiCtx(D);
  const owners = [{ ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] }];
  const r = ctx.DanaTitipanPortfolioAPI.majorisRenovReconciliation(owners, 10000000);
  assert.ok(r);
  assert.equal(r.pengeluaranMajoris, 5000000);
  assert.equal(r.sisaSaldo, 5000000);
});

test('B2. expense TANPA renovProjectLinkId -> tidak ikut dihitung', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000 }],
    transactions: [
      { type: 'expense', accountId: 'acc1', amount: 3000000, renovProjectLinkId: 'p1' },
      { type: 'expense', accountId: 'acc1', amount: 999999999 }, // tidak ada renovProjectLinkId
    ],
  });
  const ctx = makeApiCtx(D);
  const owners = [{ ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] }];
  const r = ctx.DanaTitipanPortfolioAPI.majorisRenovReconciliation(owners, 10000000);
  assert.equal(r.pengeluaranMajoris, 3000000);
});

test('B3. income (bukan expense) ber-renovProjectLinkId -> tidak ikut dihitung', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000 }],
    transactions: [
      { type: 'expense', accountId: 'acc1', amount: 1000000, renovProjectLinkId: 'p1' },
      { type: 'income', accountId: 'acc1', amount: 500000, renovProjectLinkId: 'p1' },
    ],
  });
  const ctx = makeApiCtx(D);
  const owners = [{ ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] }];
  const r = ctx.DanaTitipanPortfolioAPI.majorisRenovReconciliation(owners, 10000000);
  assert.equal(r.pengeluaranMajoris, 1000000);
});

test('B4. expense di akun LAIN (bukan akun tertaut Majoris) -> tidak ikut dihitung', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000 }],
    transactions: [
      { type: 'expense', accountId: 'acc1', amount: 1000000, renovProjectLinkId: 'p1' },
      { type: 'expense', accountId: 'acc-lain', amount: 7000000, renovProjectLinkId: 'p1' },
    ],
  });
  const ctx = makeApiCtx(D);
  const owners = [{ ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] }];
  const r = ctx.DanaTitipanPortfolioAPI.majorisRenovReconciliation(owners, 10000000);
  assert.equal(r.pengeluaranMajoris, 1000000);
});

test('B5. tidak ada akun tertaut sama sekali -> null (baris disembunyikan)', () => {
  const D = baseD();
  const ctx = makeApiCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioAPI.majorisRenovReconciliation([{ ownerId: 'renov', holdings: [] }], 10000000), null);
});

test('B6. Pengeluaran Majoris melebihi Pokok Dikomit -> Sisa NEGATIF, TIDAK di-clamp', () => {
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

test('B7. 2 owner beda tertaut akun yang SAMA -> expense akun itu TIDAK dihitung dobel', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000 }],
    transactions: [{ type: 'expense', accountId: 'acc1', amount: 1000000, renovProjectLinkId: 'p1' }],
  });
  const ctx = makeApiCtx(D);
  const owners = [
    { ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] },
    { ownerId: 'sihab', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] },
  ];
  const r = ctx.DanaTitipanPortfolioAPI.majorisRenovReconciliation(owners, 10000000);
  assert.equal(r.pengeluaranMajoris, 1000000);
});

test('B8. principalAmountTotal tidak diberikan/bukan angka -> diperlakukan 0, 0 crash', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000 }],
    transactions: [{ type: 'expense', accountId: 'acc1', amount: 1000000, renovProjectLinkId: 'p1' }],
  });
  const ctx = makeApiCtx(D);
  const owners = [{ ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] }];
  const r = ctx.DanaTitipanPortfolioAPI.majorisRenovReconciliation(owners, undefined);
  assert.equal(r.sisaSaldo, -1000000);
});

// ===== Bagian C: wiring markup renderInto()/_renderNow() =====

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

test('C1. baris "Pengeluaran Majoris"/"Sisa Saldo Majoris" muncul di bawah "Total Pokok Dikomit"', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000, owners: [
      { ownerId: 'renov', porsi: 100, ownerName: 'Renov', isSelf: false },
    ] }],
    titipanCommitments: [{ ownerId: 'renov', ownerName: 'Renov', principalAmount: 10000000 }],
    transactions: [{ type: 'expense', accountId: 'acc1', amount: 3000000, renovProjectLinkId: 'p1' }],
  });
  const ctx = makeRenderCtx(D);
  const el = fakeEl();
  ctx.DanaTitipanPortfolioPresenter._renderNow(el);
  const html = el.innerHTML;
  assert.ok(html.includes('Total Pokok Dikomit'));
  assert.ok(html.includes('Pengeluaran Majoris (dari transaksi Renov)'));
  assert.ok(html.includes('Sisa Saldo Majoris Belum Terpotong'));
  // urutan: "Total Pokok Dikomit" harus muncul SEBELUM baris Majoris baru.
  assert.ok(html.indexOf('Total Pokok Dikomit') < html.indexOf('Pengeluaran Majoris'));
});

test('C2. tidak ada akun tertaut -> baris Majoris TIDAK muncul (0 error)', () => {
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
});

test('C3. Sisa Saldo negatif -> badge "⚠️ Melebihi pokok" tampil', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000, owners: [
      { ownerId: 'renov', porsi: 100, ownerName: 'Renov', isSelf: false },
    ] }],
    titipanCommitments: [{ ownerId: 'renov', ownerName: 'Renov', principalAmount: 1000000 }],
    transactions: [{ type: 'expense', accountId: 'acc1', amount: 5000000, renovProjectLinkId: 'p1' }],
  });
  const ctx = makeRenderCtx(D);
  const el = fakeEl();
  ctx.DanaTitipanPortfolioPresenter._renderNow(el);
  assert.ok(el.innerHTML.includes('⚠️ Melebihi pokok'));
});

test('C4. 0 logic "Pokok Dikomit" manual berubah -- Total Pokok Dikomit tetap dari totals.principalAmountTotal apa adanya', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000, owners: [
      { ownerId: 'renov', porsi: 100, ownerName: 'Renov', isSelf: false },
    ] }],
    titipanCommitments: [{ ownerId: 'renov', ownerName: 'Renov', principalAmount: 7000000 }],
    transactions: [{ type: 'expense', accountId: 'acc1', amount: 1000000, renovProjectLinkId: 'p1' }],
  });
  const ctx = makeRenderCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(projection.totals.principalAmountTotal, 7000000);
  const el = fakeEl();
  ctx.DanaTitipanPortfolioPresenter._renderNow(el);
  assert.ok(el.innerHTML.includes('7000000'));
});
