'use strict';
// tests/fix-holding-direct-account-titipan-and-ghost-asset-link.test.js — laporan
// user Agustus 2026 (screenshot investmentModal "Majoris (Reksadana)"):
//
// BUG A — "aset di holding yg diatur porsinya lewat dana titipan dan ditautkan
// ke akun [lewat 🔗 Hubungkan ke Akun, S601-3], transaksi cicilan/renov di akun
// itu tidak terhitung di Dana Titipan". ROOT CAUSE: `resolveTxOwnerSplitForAccount()`
// (filter-laporan.js) & `_expenseComparisonForOwner()`/`_majorisLinkedAccountIds()`
// (dana-titipan-portfolio-render.js/dana-titipan-aggregation-api.js) HANYA
// resolve akun tertaut lewat sebuah Aset perantara (`asset.accountId`) — Holding
// yang ditautkan LANGSUNG ke akun (`h.accountId`, S601-3, TANPA Aset sama
// sekali) tidak pernah menghasilkan `accountId`, jadi transaksi di akun itu
// diam-diam TIDAK ikut dihitung.
//
// BUG B — "ditautkan ke Buku Aset, di Buku Aset tidak tampil, malah dobel data
// di dropdown & toast 'Kepemilikan beda'". ROOT CAUSE: `investmentAssetLinkOptionsHtml()`
// (dropdown "🔗 Hubungkan ke Buku Aset" di investmentModal) & `resolveInvestmentAssetLink()`
// tidak mengecualikan Aset yang sudah dimigrasi otomatis (`_migratedToInvestmentId`)
// atau ditautkan manual (`investmentId`) ke Holding LAIN — Aset "ghost" ini sudah
// disembunyikan dari Buku Aset (by design) tapi TETAP bisa dipilih & ditautkan
// lagi ke Holding BARU di sini, bikin 1 instrumen fisik tampil di 2 holding
// sekaligus + kepemilikan holding baru dibandingkan ke kepemilikan Aset ghost yang
// sudah basi (toast mismatch palsu).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeDanaTitipanCtx(D) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/finance/filter-laporan.js',
      'modules/finance/transaksi.js',
      'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',
    ],
    {
      D,
      document: { getElementById: () => null },
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      save: () => {},
      toast: () => {},
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
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter', 'resolveTxOwnerSplitForAccount', 'findLinkedHoldingForAccount', 'sameId'],
  );
}

function baseD(extra) {
  return { investments: [], investmentTx: [], investmentWatchlist: [], debts: [], assets: [], transactions: [], accounts: [], ...extra };
}

function makeAssetLinkCtx(assets, investments) {
  const D = { assets: assets || [], investments: investments || [] };
  return loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js'],
    { D, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s) },
    [
      'resolveInvestmentAssetLink',
      'resolveLinkedInvestmentAsset',
      'investmentAssetLinkOptionsHtml',
      'investmentCrossCheckWarning',
    ]
  );
}

// ---------------------------------------------------------------------------
// BUG A: resolveTxOwnerSplitForAccount() — prioritas 0 Holding tertaut langsung
// ---------------------------------------------------------------------------

test('A1. resolveTxOwnerSplitForAccount() -- akun tertaut LANGSUNG ke Holding (h.accountId, S601-3, 0 Aset) tetap resolve owners', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'Majoris', accountId: 'acc1', unit: 1, avgPrice: 1000000, currentPrice: 1000000, owners: [
      { ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false },
    ] }],
  });
  const ctx = makeDanaTitipanCtx(D);
  const resolved = ctx.resolveTxOwnerSplitForAccount('acc1');
  assert.ok(resolved);
  assert.equal(resolved.owners.length, 1);
  assert.equal(resolved.owners[0].ownerId, 'renov');
});

test('A2. resolveTxOwnerSplitForAccount() -- Holding & Aset SAMA-SAMA tertaut akun yang sama -> Holding MENANG (konsisten resolveOwnerDefaultForAccount)', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'Majoris', accountId: 'acc1', unit: 1, avgPrice: 1000000, currentPrice: 1000000, owners: [
      { ownerId: 'renov', porsi: 70, ownerName: 'renov', isSelf: false },
      { ownerId: 'sihab', porsi: 30, ownerName: 'Mas Sihab', isSelf: false },
    ] }],
    assets: [{ id: 'a1', name: 'Majoris (aset lama)', accountId: 'acc1', nilai: 1, owners: [
      { ownerId: 'lain', porsi: 100, ownerName: 'Orang Lain', isSelf: false },
    ] }],
  });
  const ctx = makeDanaTitipanCtx(D);
  const resolved = ctx.resolveTxOwnerSplitForAccount('acc1');
  assert.ok(resolved);
  assert.equal(resolved.owners.length, 2);
  assert.ok(resolved.owners.some((o) => o.ownerId === 'renov'));
});

test('A3. resolveTxOwnerSplitForAccount() -- 0 regresi: akun HANYA tertaut Aset (rute lama) tetap jalan', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000, owners: [
      { ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false },
    ] }],
  });
  const ctx = makeDanaTitipanCtx(D);
  const resolved = ctx.resolveTxOwnerSplitForAccount('acc1');
  assert.ok(resolved);
  assert.equal(resolved.owners[0].ownerId, 'renov');
});

// ---------------------------------------------------------------------------
// BUG A: _expenseComparisonForOwner() -- baris "Estimasi dari Transaksi <Akun>"
// ---------------------------------------------------------------------------

test('A4. _expenseComparisonForOwner() -- holding titipan tertaut LANGSUNG ke akun (h.accountId), transaksi cicilan/renov ikut terhitung', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'Majoris', accountId: 'acc1', unit: 1, avgPrice: 1000000, currentPrice: 1000000, owners: [
      { ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false },
    ] }],
    transactions: [
      // FIX SESI (laporan user 2026-08-15): deductionOwnerId eksplisit WAJIB
      // dicantumkan sekarang -- resolveTxOwnerAssignment() tidak lagi
      // fallback ke owners[0] utk transaksi yg tidak pernah ditandai
      // penanggungnya (lihat filter-laporan.js).
      { type: 'expense', accountId: 'acc1', amount: 154280, payMethod: 'cicilan', deductionOwnerId: 'renov' },
      { type: 'expense', accountId: 'acc1', amount: 51940, payMethod: 'cicilan', deductionOwnerId: 'renov' },
      { type: 'expense', accountId: 'acc-lain', amount: 999999 },
    ],
  });
  const ctx = makeDanaTitipanCtx(D);
  const o = { ownerId: 'renov', holdings: [{ type: 'investasi', linkedInvestmentId: 'h1' }] };
  const cmp = ctx.DanaTitipanPortfolioPresenter._expenseComparisonForOwner(o);
  assert.ok(cmp, 'baris pembanding TIDAK BOLEH null -- ini persis bug yang dilaporkan user');
  assert.equal(cmp.total, 154280 + 51940);
  assert.equal(cmp.accountNames.length, 1);
  assert.equal(cmp.accountNames[0], 'Majoris');
});

test('A5. _expenseComparisonForOwner() -- 0 regresi: holding TANPA accountId langsung, tertaut lewat Aset perantara tetap jalan (rute lama)', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'Majoris', unit: 1, avgPrice: 1000000, currentPrice: 1000000, owners: [
      { ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false },
    ] }],
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', investmentId: 'h1', nilai: 1000000 }],
    // FIX SESI (laporan user 2026-08-15): deductionOwnerId eksplisit wajib
    // dicantumkan sekarang (0 fallback owners[0] lagi).
    transactions: [{ type: 'expense', accountId: 'acc1', amount: 200000, deductionOwnerId: 'renov' }],
  });
  const ctx = makeDanaTitipanCtx(D);
  const o = { ownerId: 'renov', holdings: [{ type: 'investasi', linkedInvestmentId: 'h1' }] };
  const cmp = ctx.DanaTitipanPortfolioPresenter._expenseComparisonForOwner(o);
  assert.ok(cmp);
  assert.equal(cmp.total, 200000);
});

test('A6. _majorisLinkedAccountIds() -- akun tertaut LANGSUNG ke Holding ikut masuk union akun (dipakai "Pengeluaran Majoris" level kartu)', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'Majoris', accountId: 'acc1', unit: 1, avgPrice: 1000000, currentPrice: 1000000, owners: [
      { ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false },
    ] }],
  });
  const ctx = makeDanaTitipanCtx(D);
  const owners = [{ ownerId: 'renov', holdings: [{ type: 'investasi', linkedInvestmentId: 'h1' }] }];
  const ids = ctx.DanaTitipanPortfolioAPI._majorisLinkedAccountIds(owners);
  assert.equal(ids.length, 1);
  assert.equal(ids[0], 'acc1');
});

test('A7. majorisRenovReconciliation() -- pengeluaran Renov di akun tertaut langsung ke Holding ikut terhitung end-to-end', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'Majoris', accountId: 'acc1', unit: 1, avgPrice: 1000000, currentPrice: 1000000, owners: [
      { ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false },
    ] }],
    transactions: [
      { type: 'expense', accountId: 'acc1', amount: 154280, renovProjectLinkId: 'p1' },
      { type: 'expense', accountId: 'acc1', amount: 51940, renovProjectLinkId: 'p1' },
    ],
  });
  const ctx = makeDanaTitipanCtx(D);
  const owners = [{ ownerId: 'renov', holdings: [{ type: 'investasi', linkedInvestmentId: 'h1' }] }];
  const result = ctx.DanaTitipanPortfolioAPI.majorisRenovReconciliation(owners, 1000000);
  assert.ok(result, 'harus mengenali akun tertaut LANGSUNG ke holding, bukan cuma via Aset');
  assert.equal(result.pengeluaranMajoris, 154280 + 51940);
  assert.equal(result.sisaSaldo, 1000000 - (154280 + 51940));
});

// ---------------------------------------------------------------------------
// BUG B: resolveInvestmentAssetLink() / investmentAssetLinkOptionsHtml() /
// investmentCrossCheckWarning() -- ghost asset (sudah pindah ke Holding lain)
// tidak lagi dianggap tautan aktif & tidak lagi ditawarkan sbg opsi baru.
// ---------------------------------------------------------------------------

test('B1. resolveInvestmentAssetLink() -- Aset yang sudah dimigrasi otomatis (_migratedToInvestmentId ke Holding LAIN) balik null (bukan tautan efektif)', () => {
  const assets = [{ id: 'a1', name: 'Majoris', jenis: 'Reksadana', _migratedToInvestmentId: 'h-lama' }];
  const ctx = makeAssetLinkCtx(assets, []);
  assert.equal(ctx.resolveInvestmentAssetLink('a1'), null);
});

test('B2. resolveInvestmentAssetLink() -- Aset yang ditautkan manual (investmentId) ke Holding LAIN balik null juga', () => {
  const assets = [{ id: 'a1', name: 'Majoris', jenis: 'Reksadana', investmentId: 'h-lama' }];
  const ctx = makeAssetLinkCtx(assets, []);
  assert.equal(ctx.resolveInvestmentAssetLink('a1'), null);
});

test('B3. resolveInvestmentAssetLink() -- Aset biasa (bukan ghost) tetap resolve normal, 0 regresi', () => {
  const assets = [{ id: 'a1', name: 'Majoris', jenis: 'Reksadana' }];
  const ctx = makeAssetLinkCtx(assets, []);
  const r = ctx.resolveInvestmentAssetLink('a1');
  assert.ok(r);
  assert.equal(r.id, 'a1');
});

test('B4. investmentAssetLinkOptionsHtml() -- Aset ghost (_migratedToInvestmentId) TIDAK ditawarkan sbg opsi baru', () => {
  const assets = [
    { id: 'a1', name: 'Majoris', jenis: 'Reksadana', _migratedToInvestmentId: 'h-lama' },
    { id: 'a2', name: 'Tanah Bogor', jenis: 'Tanah' },
  ];
  const ctx = makeAssetLinkCtx(assets, []);
  const html = ctx.investmentAssetLinkOptionsHtml('');
  assert.ok(!html.includes('value="a1"'), 'aset ghost tidak boleh muncul sbg opsi baru');
  assert.ok(html.includes('value="a2"'));
});

test('B5. investmentAssetLinkOptionsHtml() -- Aset ghost yang KEBETULAN sudah jadi currentAssetId (data lama) tetap tampil/terpilih (0 hilang mendadak)', () => {
  const assets = [{ id: 'a1', name: 'Majoris', jenis: 'Reksadana', _migratedToInvestmentId: 'h-lama' }];
  const ctx = makeAssetLinkCtx(assets, []);
  const html = ctx.investmentAssetLinkOptionsHtml('a1');
  assert.ok(html.includes('value="a1"'));
  assert.ok(html.includes('selected'));
});

test('B6. investmentCrossCheckWarning() -- holding titipan ditautkan (h.assetId) ke Aset ghost -> TIDAK muncul toast "Kepemilikan beda" palsu', () => {
  const assets = [{ id: 'a1', name: 'Majoris', jenis: 'Reksadana', _migratedToInvestmentId: 'h-lama', owners: [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }] }];
  const investments = [{ id: 'h2', name: 'Majoris', assetId: 'a1', unit: 7574.3814, avgPrice: 1.5, currentPrice: 1.5, fundSource: 'titipan', owners: [
    { ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false },
  ] }];
  const ctx = makeAssetLinkCtx(assets, investments);
  const h = investments[0];
  assert.equal(ctx.investmentCrossCheckWarning(h), null, 'link ke aset ghost harus dianggap TIDAK tertaut efektif -> 0 badge mismatch palsu');
});

test('B7. investmentCrossCheckWarning() -- 0 regresi: holding tertaut ke Aset NYATA (bukan ghost) dgn kepemilikan beda TETAP memicu warning', () => {
  const assets = [{ id: 'a1', name: 'Majoris', jenis: 'Reksadana', owners: [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }] }];
  const investments = [{ id: 'h2', name: 'Majoris', assetId: 'a1', unit: 1, avgPrice: 1, currentPrice: 1, fundSource: 'titipan', owners: [
    { ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false },
  ] }];
  const ctx = makeAssetLinkCtx(assets, investments);
  const h = investments[0];
  assert.equal(ctx.investmentCrossCheckWarning(h), '⚠️ Kepemilikan beda dgn Buku Aset yang ditautkan');
});
