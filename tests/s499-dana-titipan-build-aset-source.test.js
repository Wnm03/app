'use strict';
// tests/s499-dana-titipan-build-aset-source.test.js — Sesi B1
// (AUDIT-SESI-B-PERLUASAN-ASET.md §5, "Sesi B1 (wajib, kecil)"):
// `DanaTitipanPortfolioAPI.build()` diperluas jadi source ke-2 (Domain
// Aset), lewat `_asetOwnersForTitipan()` (F1 guard) + `_assetSplits()`
// (F2 Opsi A). 3 acceptance test wajib sesuai §5 audit:
//   (a) aset ber-`ownership` non-SELF TANPA `owners[]` eksplisit ->
//       TIDAK muncul di build() (regresi-guard F1).
//   (b) aset ber-`owners[]` eksplisit (porsi majemuk) -> muncul,
//       atribusi benar per nama.
//   (c) union dgn owner Investasi yang sudah ada (1 orang titip di 2
//       domain sekaligus -> 1 kartu, gabungan allocatedPrincipal).
//
// 0 modifikasi test existing (S484/S485a-e/S486/S498 semua harus tetap
// lolos tanpa disentuh) -- file ini murni tambahan.

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

function baseD(assets, investments) {
  return {
    assets: assets || [], investments: investments || [], investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [], titipanCommitments: [], titipanReturns: [],
  };
}

test('B1(a). aset ownership non-SELF tanpa owners[] eksplisit -> TIDAK muncul di build() (F1 regresi-guard)', () => {
  const D = baseD([
    { id: 'a1', name: 'Ruko Legacy', nilai: 100000000, ownership: 'THIRD_PARTY' },
  ]);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 0);
  assert.equal(p.totals.allocatedPrincipalTotal, 0);
  assert.equal(p.totals.currentValueTotal, 0);
});

test('B1(b). aset dgn owners[] eksplisit (porsi majemuk) -> muncul, porsi & nama owner benar, gain=0 (F2 Opsi A)', () => {
  const D = baseD([
    {
      id: 'a1', name: 'Tanah Kavling', nilai: 200000000,
      owners: [
        { ownerId: 'ayah', porsi: 70, ownerName: 'Ayah', isSelf: false },
        { ownerId: 'budi', porsi: 30, ownerName: 'Budi', isSelf: false },
      ],
    },
  ]);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 2);
  const ayah = p.owners.find((x) => x.ownerId === 'ayah');
  const budi = p.owners.find((x) => x.ownerId === 'budi');
  assert.equal(ayah.allocatedPrincipal, 200000000 * 0.7);
  assert.equal(ayah.currentValue, 200000000 * 0.7);
  assert.equal(ayah.gain, 0);
  assert.equal(budi.allocatedPrincipal, 200000000 * 0.3);
  assert.equal(budi.currentValue, 200000000 * 0.3);
  assert.equal(budi.gain, 0);
  assert.equal(ayah.holdings.length, 1);
  assert.equal(ayah.holdings[0].holdingId, 'a1');
  assert.equal(ayah.holdings[0].name, 'Tanah Kavling');
  assert.equal(ayah.holdings[0].type, 'aset');
  assert.equal(ayah.holdings[0].ownerPct, 70);
});

test('B1(c). owner sama titip di Investasi + Aset -> 1 kartu owner, allocatedPrincipal digabung', () => {
  const D = baseD(
    [
      {
        id: 'a1', name: 'Tanah Kavling', nilai: 100000000,
        owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }],
      },
    ],
    [
      { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, fundSource: 'titipan', titipanOwner: 'Budi' },
    ],
  );
  const ctx = makeCtx(D);
  // holding 'titipan' legacy balik ownerId literal 'titipan_investor' --
  // pakai owners[] eksplisit di investment JUGA supaya ownerId match 'budi'
  // (union hanya terjadi kalau ownerId SAMA persis, sesuai desain existing).
  D.investments[0].owners = [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }];
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 1);
  const budi = p.owners[0];
  assert.equal(budi.ownerId, 'budi');
  assert.equal(budi.allocatedPrincipal, 100000000 + 800000);
  assert.equal(budi.currentValue, 100000000 + 900000);
  assert.equal(budi.gain, 100000);
  assert.equal(budi.holdings.length, 2);
  const assetLine = budi.holdings.find((h) => h.type === 'aset');
  const investLine = budi.holdings.find((h) => h.type !== 'aset');
  assert.ok(assetLine);
  assert.ok(investLine);
  assert.equal(assetLine.allocatedPrincipal, 100000000);
  assert.equal(investLine.allocatedPrincipal, 800000);
});

test('B1. guard: build() aman kalau D.assets tidak ada / bukan array (0 crash, murni skip)', () => {
  const D = { investments: [] };
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 0);
});
