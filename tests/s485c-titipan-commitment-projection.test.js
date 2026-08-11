'use strict';
// tests/s485c-titipan-commitment-projection.test.js — Sesi 485c (Gap #3
// audit, langkah 3/5 dari rencana multi-sesi:
// RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md).
//
// Target: `DanaTitipanPortfolioAPI.build()` diperluas -- union owner
// (commitment + holding), `principalAmount`/`estimatedUnallocated`/
// `overAllocatedAmount`/`allocationStatus` per owner, totals baru
// (`principalAmountTotal`/`estimatedUnallocatedTotal`/
// `overAllocatedTotal`). Ini adalah layer paling berisiko secara logika
// (allocation guard) -- paling banyak test case, sengaja diisolasi dari
// UI (belum ada modal/render extension sesi ini, itu Sesi 485d).

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

function baseD(investments, titipanCommitments) {
  return { investments, investmentTx: [], investmentWatchlist: [], debts: [], accounts: [], transactions: [], titipanCommitments };
}

test('1. commitment + allocation < principal -> OK, estimatedUnallocated benar, overAllocatedAmount 0', () => {
  const D = baseD(
    [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 30000000, currentPrice: 30000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 50000000 }],
  );
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.allocationStatus, 'OK');
  assert.equal(budi.principalAmount, 50000000);
  assert.equal(budi.estimatedUnallocated, 20000000);
  assert.equal(budi.overAllocatedAmount, 0);
});

test('2. commitment + allocation > principal -> OVER_ALLOCATED, unallocated=0, overAllocatedAmount benar', () => {
  const D = baseD(
    [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 30000000, currentPrice: 30000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 10000000 }],
  );
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.allocationStatus, 'OVER_ALLOCATED');
  assert.equal(budi.estimatedUnallocated, 0);
  assert.equal(budi.overAllocatedAmount, 20000000);
});

test('3. commitment tanpa holding sama sekali -> allocated=0, currentValue=0, gain=0, unallocated=principal, status OK', () => {
  const D = baseD([], [{ id: 'c1', ownerId: 'cici', ownerName: 'Cici', principalAmount: 15000000 }]);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 1);
  const cici = p.owners[0];
  assert.equal(cici.ownerId, 'cici');
  assert.equal(cici.allocatedPrincipal, 0);
  assert.equal(cici.currentValue, 0);
  assert.equal(cici.gain, 0);
  assert.equal(cici.estimatedUnallocated, 15000000);
  assert.equal(cici.allocationStatus, 'OK');
  assert.equal(cici.holdings.length, 0);
});

test('4. holding tanpa commitment -> principalAmount:null, estimatedUnallocated:null, status PRINCIPAL_NOT_SET (bukan 0)', () => {
  const D = baseD(
    [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 9000000, currentPrice: 9500000, owners: [{ ownerId: 'ayah', porsi: 100, ownerName: 'Ayah', isSelf: false }] }],
    [],
  );
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const ayah = p.owners.find((o) => o.ownerId === 'ayah');
  assert.equal(ayah.principalAmount, null);
  assert.equal(ayah.estimatedUnallocated, null);
  assert.equal(ayah.allocationStatus, 'PRINCIPAL_NOT_SET');
  assert.equal(ayah.overAllocatedAmount, 0);
});

test('5. principal = allocated persis -> unallocated = 0, status OK (bukan OVER_ALLOCATED)', () => {
  const D = baseD(
    [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 20000000, currentPrice: 21000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 20000000 }],
  );
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.allocationStatus, 'OK');
  assert.equal(budi.estimatedUnallocated, 0);
  assert.equal(budi.overAllocatedAmount, 0);
});

test('6. multi-holding satu owner + multi-owner satu holding (regresi kombinasi, angka tetap benar)', () => {
  const D = baseD(
    [
      { id: 'h1', name: 'BBCA', unit: 1, avgPrice: 10000000, currentPrice: 11000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
      { id: 'h2', name: 'RDPU', unit: 1, avgPrice: 5000000, currentPrice: 5200000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
      {
        id: 'h3', name: 'Obligasi Y', unit: 1, avgPrice: 10000000, currentPrice: 10500000,
        owners: [
          { ownerId: 'budi', porsi: 50, ownerName: 'Budi', isSelf: false },
          { ownerId: 'ayah', porsi: 50, ownerName: 'Ayah', isSelf: false },
        ],
      },
    ],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 20000000 }],
  );
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  // h1 cost 10jt + h2 cost 5jt + h3 50% cost 5jt = 20jt
  assert.equal(budi.allocatedPrincipal, 20000000);
  assert.equal(budi.allocationStatus, 'OK');
  assert.equal(budi.estimatedUnallocated, 0);
  const ayah = p.owners.find((o) => o.ownerId === 'ayah');
  assert.equal(ayah.allocatedPrincipal, 5000000);
  assert.equal(ayah.principalAmount, null);
  assert.equal(ayah.allocationStatus, 'PRINCIPAL_NOT_SET');
});

test('7. totals.estimatedUnallocatedTotal tidak memasukkan owner PRINCIPAL_NOT_SET', () => {
  const D = baseD(
    [
      { id: 'h1', name: 'BBCA', unit: 1, avgPrice: 5000000, currentPrice: 5000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
      { id: 'h2', name: 'RDPU', unit: 1, avgPrice: 3000000, currentPrice: 3000000, owners: [{ ownerId: 'ayah', porsi: 100, ownerName: 'Ayah', isSelf: false }] },
    ],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 8000000 }],
  );
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  // budi: principal 8jt, allocated 5jt -> unallocated 3jt. ayah: PRINCIPAL_NOT_SET -> tidak ikut disumbangkan.
  assert.equal(p.totals.estimatedUnallocatedTotal, 3000000);
  assert.equal(p.totals.principalAmountTotal, 8000000);
});

test('8. Test case utama (spec): Budi Rp100jt, BBCA+RDPU+Emas -> allocated 70jt, unallocated 30jt, currentValue 75jt, gain 5jt, OK', () => {
  const D = baseD(
    [
      { id: 'h1', name: 'BBCA', unit: 1, avgPrice: 30000000, currentPrice: 32000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
      { id: 'h2', name: 'RDPU', unit: 1, avgPrice: 20000000, currentPrice: 21000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
      { id: 'h3', name: 'Emas', unit: 1, avgPrice: 20000000, currentPrice: 22000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    ],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 100000000 }],
  );
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.allocatedPrincipal, 70000000);
  assert.equal(budi.estimatedUnallocated, 30000000);
  assert.equal(budi.currentValue, 75000000);
  assert.equal(budi.gain, 5000000);
  assert.equal(budi.allocationStatus, 'OK');
});

test('9. tanpa D.titipanCommitments sama sekali (undefined) -> semua owner PRINCIPAL_NOT_SET, totals principal 0, tidak throw', () => {
  const D = baseD(
    [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1000000, currentPrice: 1000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    undefined,
  );
  const ctx = makeCtx(D);
  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioAPI.build());
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners[0].allocationStatus, 'PRINCIPAL_NOT_SET');
  assert.equal(p.totals.principalAmountTotal, 0);
  assert.equal(p.totals.estimatedUnallocatedTotal, 0);
  assert.equal(p.totals.overAllocatedTotal, 0);
});

test('10. commitment dgn principalAmount 0 -> valid (bukan null), status OK kalau allocated juga 0', () => {
  const D = baseD([], [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 0 }]);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners[0];
  assert.equal(budi.principalAmount, 0);
  assert.equal(budi.allocationStatus, 'OK');
  assert.equal(budi.estimatedUnallocated, 0);
});

test('11. REGRESI: allocatedPrincipal/currentValue/gain per owner & totals lama tidak berubah nilainya (S484/485a/485b tanpa commitment)', () => {
  const D = baseD([
    { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, fundSource: 'titipan', titipanOwner: 'Budi' },
    {
      id: 'h2', name: 'B', unit: 100, avgPrice: 500, currentPrice: 400,
      owners: [
        { ownerId: 'ayah', porsi: 50, ownerName: 'Ayah', isSelf: false },
        { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true },
      ],
    },
  ], []);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.totals.allocatedPrincipalTotal, 800000 + 25000);
  assert.equal(p.totals.principalAmountTotal, 0);
});

test('12. guard: build() aman tanpa Investment dimuat, commitment tanpa holding tetap muncul', () => {
  const ctx = loadSource(
    ['modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    { D: { investments: [], titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 5000000 }] } },
    ['DanaTitipanPortfolioAPI'],
  );
  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioAPI.build());
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 1);
  assert.equal(p.owners[0].ownerId, 'budi');
  assert.equal(p.owners[0].principalAmount, 5000000);
  assert.equal(p.owners[0].allocationStatus, 'OK');
});
