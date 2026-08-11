'use strict';
// tests/s503-allocated-excluding-cross-domain-investment-aset.test.js —
// Sesi E (PROMPT-SESI-E-ALLOCATEDEXCLUDING-LINTAS-DOMAIN.md): generalisasi
// `DanaTitipanPortfolioAPI.allocatedExcluding()` supaya lintas domain
// Investment + Aset (sebelumnya HANYA Investment, S494), fondasi utk fitur
// Kuota Dana Titipan `assetOwnersModal` (UI-nya BELUM dikerjakan di sesi
// ini). 0 modifikasi test existing (s494/s499 semua tetap lolos tanpa
// disentuh) — file ini murni tambahan, sesuai §7/§8/§15 prompt sesi.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => {}, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n) },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI'],
  );
}

function baseD(assets, investments, titipanCommitments) {
  return {
    assets: assets || [], investments: investments || [], investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [], titipanCommitments: titipanCommitments || [], titipanReturns: [],
  };
}

// ---- §7 Test A — Investment -> Investment (basis cost, sama pola S494) ----

test('A. Investment -> Investment: Budi 50jt principal, exclude Investment B -> hanya Investment A (20jt)', () => {
  const D = baseD([], [
    { id: 'invA', name: 'BBCA', unit: 1, avgPrice: 20000000, currentPrice: 20000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    { id: 'invB', name: 'BBRI', unit: 1, avgPrice: 10000000, currentPrice: 10000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ], [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 50000000 }]);
  const ctx = makeCtx(D);
  const result = ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', { holdingId: 'invB' });
  assert.equal(result, 20000000);
});

// ---- §7 Test B — Asset -> Asset ----

test('B. Asset -> Asset: Budi 50jt principal, exclude Aset B -> hanya Aset A (20jt)', () => {
  const D = baseD([
    { id: 'asetA', name: 'Tanah A', nilai: 20000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    { id: 'asetB', name: 'Tanah B', nilai: 10000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ], [], [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 50000000 }]);
  const ctx = makeCtx(D);
  const result = ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', { assetId: 'asetB' });
  assert.equal(result, 20000000);
});

// ---- §7 Test C — Investment + Asset, exclude Investment ----

test('C. Investment A (20jt) + Aset A (10jt) + Investment B (5jt, excluded) -> 30jt', () => {
  const D = baseD(
    [{ id: 'asetA', name: 'Tanah A', nilai: 10000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [
      { id: 'invA', name: 'BBCA', unit: 1, avgPrice: 20000000, currentPrice: 20000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
      { id: 'invB', name: 'BBRI', unit: 1, avgPrice: 5000000, currentPrice: 5000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    ],
    [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 50000000 }],
  );
  const ctx = makeCtx(D);
  const result = ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', { holdingId: 'invB' });
  assert.equal(result, 30000000);
});

// ---- §7 Test D — Investment + Asset, exclude Asset ----

test('D. Investment A (20jt) + Aset A (10jt) + Aset B (5jt, excluded) -> 30jt', () => {
  const D = baseD(
    [
      { id: 'asetA', name: 'Tanah A', nilai: 10000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
      { id: 'asetB', name: 'Tanah B', nilai: 5000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    ],
    [{ id: 'invA', name: 'BBCA', unit: 1, avgPrice: 20000000, currentPrice: 20000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 50000000 }],
  );
  const ctx = makeCtx(D);
  const result = ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', { assetId: 'asetB' });
  assert.equal(result, 30000000);
});

// ---- §8 Cross-domain over-allocation scenario (bug yang memicu sesi ini) ----

test('E. Over-allocation guard: Aset lama 20jt, exclude Aset baru (draft 50% dari 40jt) -> tetap 20jt (Aset baru sendiri tidak ikut dihitung)', () => {
  const D = baseD(
    [
      { id: 'asetLama', name: 'Tanah Lama', nilai: 20000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
      { id: 'asetBaru', name: 'Tanah Baru', nilai: 40000000, owners: [{ ownerId: 'budi', porsi: 50, ownerName: 'Budi', isSelf: false }] },
    ],
    [],
    [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 50000000 }],
  );
  const ctx = makeCtx(D);
  const result = ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', { assetId: 'asetBaru' });
  assert.equal(result, 20000000);
  // caller nantinya: principal(50) - excluding(20) - draft(20) = 10jt sisa.
  const draftNominal = 40000000 * 0.5;
  const sisa = 50000000 - result - draftNominal;
  assert.equal(sisa, 10000000);
});

// ---- §15 Edge cases ----

test('F. ownerId kosong/null -> 0 (tidak throw)', () => {
  const D = baseD([{ id: 'a1', name: 'A', nilai: 10000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }]);
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding('', { assetId: 'a1' }), 0);
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding(null, { assetId: 'a1' }), 0);
});

test('G. ownerId tidak ditemukan di domain manapun -> 0', () => {
  const D = baseD(
    [{ id: 'a1', name: 'A', nilai: 10000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'h1', name: 'H', unit: 1, avgPrice: 10000000, currentPrice: 10000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
  );
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding('cici', {}), 0);
});

test('H. tidak ada Investment sama sekali -> Aset tetap dihitung', () => {
  const D = baseD([{ id: 'a1', name: 'A', nilai: 15000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }], []);
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', {}), 15000000);
});

test('I. tidak ada Aset sama sekali -> Investment tetap dihitung', () => {
  const D = baseD([], [{ id: 'h1', name: 'H', unit: 1, avgPrice: 15000000, currentPrice: 15000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }]);
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', {}), 15000000);
});

test('J. tidak ada Investment maupun Aset -> 0', () => {
  const D = baseD([], []);
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', {}), 0);
});

test('K. holdingId/assetId yang dikecualikan tidak ditemukan -> allocation lain tetap dihitung utuh', () => {
  const D = baseD(
    [{ id: 'a1', name: 'A', nilai: 10000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'h1', name: 'H', unit: 1, avgPrice: 10000000, currentPrice: 10000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
  );
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', { holdingId: 'tidak-ada', assetId: 'tidak-ada-juga' }), 20000000);
});

test('L. owner SELF tetap dikecualikan lintas domain (konsisten build())', () => {
  const D = baseD(
    [{ id: 'a1', name: 'A', nilai: 10000000, owners: [{ ownerId: 'aku', porsi: 100, ownerName: 'Aku', isSelf: true }] }],
    [{ id: 'h1', name: 'H', unit: 1, avgPrice: 10000000, currentPrice: 10000000, owners: [{ ownerId: 'aku', porsi: 100, ownerName: 'Aku', isSelf: true }] }],
  );
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding('aku', {}), 0);
});

// ---- Backward compatibility: bentuk lama exclusion=string (holdingId) ----

test('M. backward-compat: exclusion sbg string (bentuk lama S494) tetap exclude holding Investment, TIDAK menyentuh domain Aset', () => {
  const D = baseD(
    [{ id: 'a1', name: 'A', nilai: 10000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [
      { id: 'h1', name: 'H1', unit: 1, avgPrice: 20000000, currentPrice: 20000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
      { id: 'h2', name: 'H2', unit: 1, avgPrice: 5000000, currentPrice: 5000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    ],
  );
  const ctx = makeCtx(D);
  // exclusion = 'h2' (string) -> hanya h1 (20jt) + a1 (10jt), h2 dikecualikan.
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', 'h2'), 30000000);
});

test('N. backward-compat: exclusion null/undefined -> semua instrumen kedua domain dihitung (sama pola lama "tanpa holdingId")', () => {
  const D = baseD(
    [{ id: 'a1', name: 'A', nilai: 10000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'h1', name: 'H1', unit: 1, avgPrice: 20000000, currentPrice: 20000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
  );
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', null), 30000000);
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', undefined), 30000000);
});
