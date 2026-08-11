'use strict';
// tests/s484-dana-titipan-portfolio-presenter.test.js — Sesi 484 (Dana
// Titipan dalam Investasi: Portfolio Allocation Projection, gap #1-2 dari
// audit "Atur Porsi Kepemilikan" Sesi 483).
//
// Target: `DanaTitipanPortfolioAPI.build()`
// (modules/finance/dana-titipan-portfolio-presenter.js) — grouping
// pokok/nilai-sekarang/P&L PER OWNER lintas semua holding investasi, 100%
// reuse Investment.getOwners()/holdingCost()/holdingValue()/
// holdingGainLoss() + MultiOwnerEngine.splitByPorsi() (0 rumus baru).
//
// SENGAJA TIDAK diuji di sini (gap #3, belum diputuskan): tidak ada angka
// "kas belum teralokasi", tidak ada field pokok titipan top-down, tidak
// ada validasi allocation<=principal — lihat test terakhir di bawah yang
// justru MEMASTIKAN field itu TIDAK muncul.

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

function baseD(investments) {
  return { investments, investmentTx: [], investmentWatchlist: [], debts: [] };
}

test('1. satu owner -> satu holding: pokok/nilai/gain sama persis holdingCost/Value/GainLoss', () => {
  const D = baseD([
    { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, fundSource: 'titipan', titipanOwner: 'Budi' },
  ]);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 1);
  const o = p.owners[0];
  assert.equal(o.ownerName, 'Budi');
  assert.equal(o.allocatedPrincipal, 800000); // 100*8000
  assert.equal(o.currentValue, 900000); // 100*9000
  assert.equal(o.gain, 100000);
  assert.equal(o.holdings.length, 1);
  assert.equal(o.holdings[0].holdingId, 'h1');
  assert.equal(o.holdings[0].ownerPct, 100);
});

test('2. satu owner -> beberapa holding: teragregasi ke satu bucket owner', () => {
  const D = baseD([
    { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, fundSource: 'titipan', titipanOwner: 'Budi' },
    { id: 'h2', name: 'Emas', unit: 10, avgPrice: 1000000, currentPrice: 1100000, fundSource: 'titipan', titipanOwner: 'Budi' },
  ]);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 1);
  const o = p.owners[0];
  assert.equal(o.holdings.length, 2);
  assert.equal(o.allocatedPrincipal, 800000 + 10000000);
  assert.equal(o.currentValue, 900000 + 11000000);
});

test('3. satu holding -> beberapa owner (multi-owner h.owners[]): dipecah proporsional', () => {
  const D = baseD([
    {
      id: 'h1', name: 'Reksadana X', unit: 1000, avgPrice: 1000, currentPrice: 1200,
      owners: [
        { ownerId: 'ayah', porsi: 60, ownerName: 'Ayah', isSelf: false },
        { ownerId: 'budi', porsi: 40, ownerName: 'Budi', isSelf: false },
      ],
    },
  ]);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 2);
  const ayah = p.owners.find((x) => x.ownerId === 'ayah');
  const budi = p.owners.find((x) => x.ownerId === 'budi');
  assert.equal(ayah.allocatedPrincipal, 1000000 * 0.6);
  assert.equal(budi.allocatedPrincipal, 1000000 * 0.4);
  assert.equal(ayah.currentValue, 1200000 * 0.6);
  assert.equal(budi.currentValue, 1200000 * 0.4);
});

test('4. SELF + THIRD_PARTY campur dalam satu holding: hanya porsi non-SELF masuk projection', () => {
  const D = baseD([
    {
      id: 'h1', name: 'Obligasi Y', unit: 100, avgPrice: 100000, currentPrice: 106000,
      owners: [
        { ownerId: 'SELF', porsi: 70, ownerName: 'Milik Sendiri', isSelf: true },
        { ownerId: 'ayah', porsi: 30, ownerName: 'Ayah', isSelf: false },
      ],
    },
  ]);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 1);
  assert.equal(p.owners[0].ownerId, 'ayah');
  assert.equal(p.owners[0].allocatedPrincipal, 10000000 * 0.3);
  assert.equal(p.owners[0].currentValue, 10600000 * 0.3);
});

test('5. legacy titipanOwner (fundSource:"titipan", tanpa h.owners): tetap terbaca via sintesis getOwners()', () => {
  const D = baseD([
    { id: 'h1', name: 'Deposito Lama', unit: 1, avgPrice: 5000000, currentPrice: 5000000, fundSource: 'titipan', titipanOwner: '  Cici  ' },
  ]);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 1);
  assert.equal(p.owners[0].ownerName, 'Cici');
  assert.equal(p.owners[0].ownerId, 'titipan_investor');
});

test('6. multi-owner owners[] (bukan legacy): dipakai apa adanya, fundSource diabaikan', () => {
  const D = baseD([
    {
      id: 'h1', name: 'Saham Z', unit: 50, avgPrice: 4000, currentPrice: 4500, fundSource: 'sendiri',
      owners: [
        { ownerId: 'x', porsi: 100, ownerName: 'Investor X', isSelf: false },
      ],
    },
  ]);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 1);
  assert.equal(p.owners[0].ownerName, 'Investor X');
  assert.equal(p.owners[0].allocatedPrincipal, 200000);
});

test('7. cost/value/gain teragregasi per owner (bukan cuma per holding)', () => {
  const D = baseD([
    { id: 'h1', name: 'A', unit: 10, avgPrice: 1000, currentPrice: 1200, fundSource: 'titipan', titipanOwner: 'Budi' },
    { id: 'h2', name: 'B', unit: 5, avgPrice: 2000, currentPrice: 1800, fundSource: 'titipan', titipanOwner: 'Budi' }, // rugi
  ]);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const o = p.owners[0];
  assert.equal(o.allocatedPrincipal, 10000 + 10000);
  assert.equal(o.currentValue, 12000 + 9000);
  assert.equal(o.gain, 2000 + (-1000));
});

test('8. total projection = jumlah seluruh owner (allocatedPrincipalTotal/currentValueTotal/gainTotal)', () => {
  const D = baseD([
    { id: 'h1', name: 'A', unit: 10, avgPrice: 1000, currentPrice: 1200, fundSource: 'titipan', titipanOwner: 'Budi' },
    {
      id: 'h2', name: 'B', unit: 100, avgPrice: 500, currentPrice: 400,
      owners: [
        { ownerId: 'ayah', porsi: 50, ownerName: 'Ayah', isSelf: false },
        { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true },
      ],
    },
  ]);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const sumPrincipal = p.owners.reduce((s, o) => s + o.allocatedPrincipal, 0);
  const sumValue = p.owners.reduce((s, o) => s + o.currentValue, 0);
  const sumGain = p.owners.reduce((s, o) => s + o.gain, 0);
  assert.equal(p.totals.allocatedPrincipalTotal, sumPrincipal);
  assert.equal(p.totals.currentValueTotal, sumValue);
  assert.equal(p.totals.gainTotal, sumGain);
  assert.equal(p.totals.allocatedPrincipalTotal, 10000 + 25000);
});

test('9. holding tanpa data valuasi lengkap (unit/avgPrice/currentPrice hilang) tidak membuat build() crash', () => {
  const D = baseD([
    { id: 'h1', name: 'Data Rusak', fundSource: 'titipan', titipanOwner: 'Budi' }, // unit/avgPrice/currentPrice semua undefined
    { id: 'h2', name: null, unit: NaN, avgPrice: undefined, currentPrice: null, owners: [{ ownerId: 'a', porsi: 100, ownerName: 'A', isSelf: false }] },
    null,
    undefined,
  ]);
  const ctx = makeCtx(D);
  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioAPI.build());
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.ok(Array.isArray(p.owners));
  // holding tanpa unit/avgPrice -> cost/value/gain = 0, owner tetap muncul (porsi 100%, nominal 0).
  const budi = p.owners.find((o) => o.ownerName === 'Budi');
  assert.ok(budi);
  assert.equal(budi.allocatedPrincipal, 0);
});

test('10. UPDATE Sesi 485c: gap #3 (pokok/allocation guard) sekarang dikerjakan via D.titipanCommitments -- tanpa commitment (spt test ini), owner tetap PRINCIPAL_NOT_SET & totals principal 0 (0 regresi ke allocatedPrincipalTotal/currentValueTotal/gainTotal lama)', () => {
  const D = baseD([
    { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, fundSource: 'titipan', titipanOwner: 'Budi' },
  ]);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const keys = Object.keys(p.totals);
  // UPDATE Sesi 486 (Case F): 2 field derived baru ditambahkan ke totals
  // -- returnedTotalSum/outstandingPrincipalTotal (lihat
  // RENCANA-SESI-CASEF-PARTIAL-RETURN-S486.md) -- additive, tidak
  // menghapus/mengubah field lama di atas.
  assert.deepEqual(keys.sort(), ['allocatedPrincipalTotal', 'currentValueTotal', 'gainTotal', 'principalAmountTotal', 'estimatedUnallocatedTotal', 'overAllocatedTotal', 'returnedTotalSum', 'outstandingPrincipalTotal'].sort());
  assert.ok(!('kasBelumDiinvestasikan' in p.totals));
  assert.ok(!('totalTitipan' in p.totals));
  assert.ok(!('totalDanaTitipan' in p.totals));
  assert.ok(!('totalPrincipal' in p.totals));
  // Nama field literal "kasBelumDiinvestasikan"/"titipanPokok" tetap TIDAK PERNAH dipakai (nama field
  // resmi sesuai spec Sesi 485c: principalAmount/estimatedUnallocated/overAllocatedAmount/allocationStatus).
  const ownerKeys = Object.keys(p.owners[0]);
  assert.ok(!('kasBelumDiinvestasikan' in p.owners[0]));
  assert.ok(!('titipanPokok' in p.owners[0]));
  assert.equal(p.owners[0].allocationStatus, 'PRINCIPAL_NOT_SET');
  assert.equal(p.owners[0].principalAmount, null);
  assert.equal(p.totals.principalAmountTotal, 0);
});

test('guard: DanaTitipanPortfolioAPI aman dipakai tanpa Investment/MultiOwnerEngine dimuat', () => {
  const ctx = loadSource(
    ['modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    { D: { investments: [] } },
    ['DanaTitipanPortfolioAPI'],
  );
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 0);
  assert.equal(p.totals.allocatedPrincipalTotal, 0);
  assert.equal(p.totals.currentValueTotal, 0);
  assert.equal(p.totals.gainTotal, 0);
});
