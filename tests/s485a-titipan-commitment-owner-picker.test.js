'use strict';
// tests/s485a-titipan-commitment-owner-picker.test.js — Sesi 485a (Gap #3
// audit, langkah 1/5 dari rencana multi-sesi:
// RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md).
//
// Target: `DanaTitipanPortfolioAPI.listExistingOwners()` — owner picker
// read-only, dedup by `ownerId` (BUKAN `ownerName`), 100% reuse
// Investment.getHoldings()/getOwners() (0 registry baru, 0
// D.titipanOwners[]). Sesi ini SENGAJA belum menguji CRUD/projection
// baru (D.titipanCommitments belum ditulis di manapun sesi ini) — itu
// giliran Sesi 485b/485c. Test terakhir memastikan build()/render() S484
// lama TIDAK berubah perilakunya sama sekali di sesi ini (0 regresi).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => {}, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n) },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI'],
  );
}

function baseD(investments) {
  return { investments, investmentTx: [], investmentWatchlist: [], debts: [] };
}

test('1. listExistingOwners(): satu owner satu holding -> 1 entri {ownerId, ownerName}', () => {
  const D = baseD([
    { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, fundSource: 'titipan', titipanOwner: 'Budi' },
  ]);
  const ctx = makeCtx(D);
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  assert.equal(owners.length, 1);
  assert.equal(owners[0].ownerId, 'titipan_investor');
  assert.equal(owners[0].ownerName, 'Budi');
});

test('2. dedup by ownerId: owner sama muncul di beberapa holding -> 1 entri saja', () => {
  const D = baseD([
    { id: 'h1', name: 'Reksadana X', unit: 1000, avgPrice: 1000, currentPrice: 1200, owners: [{ ownerId: 'budi-1', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    { id: 'h2', name: 'Emas', unit: 10, avgPrice: 1000000, currentPrice: 1100000, owners: [{ ownerId: 'budi-1', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  const ctx = makeCtx(D);
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  assert.equal(owners.length, 1);
  assert.equal(owners[0].ownerId, 'budi-1');
});

test('3. ownerName sama TAPI ownerId beda -> tetap 2 entri terpisah (DILARANG merge by nama)', () => {
  const D = baseD([
    { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi-a', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    { id: 'h2', name: 'RDPU', unit: 50, avgPrice: 20000, currentPrice: 20500, owners: [{ ownerId: 'budi-b', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  const ctx = makeCtx(D);
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  assert.equal(owners.length, 2);
  const ids = [...owners].map((o) => o.ownerId).sort();
  assert.deepEqual(ids, ['budi-a', 'budi-b']);
});

test('4. multi-owner satu holding -> semua owner non-SELF masuk, SELF dikecualikan', () => {
  const D = baseD([
    {
      id: 'h1', name: 'Obligasi Y', unit: 100, avgPrice: 100000, currentPrice: 106000,
      owners: [
        { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true },
        { ownerId: 'ayah', porsi: 30, ownerName: 'Ayah', isSelf: false },
        { ownerId: 'budi', porsi: 20, ownerName: 'Budi', isSelf: false },
      ],
    },
  ]);
  const ctx = makeCtx(D);
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  const ids = [...owners].map((o) => o.ownerId).sort();
  assert.deepEqual(ids, ['ayah', 'budi']);
});

test('5. legacy titipan_investor collision: 2 holding legacy beda orang -> collapse jadi 1 entri (PRE-EXISTING, bukan bug baru sesi ini)', () => {
  const D = baseD([
    { id: 'h1', name: 'Deposito Lama Budi', unit: 1, avgPrice: 5000000, currentPrice: 5000000, fundSource: 'titipan', titipanOwner: 'Budi' },
    { id: 'h2', name: 'Deposito Lama Cici', unit: 1, avgPrice: 3000000, currentPrice: 3000000, fundSource: 'titipan', titipanOwner: 'Cici' },
  ]);
  const ctx = makeCtx(D);
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  // Terdokumentasikan sbg keterbatasan yg diketahui, BUKAN diperbaiki sesi ini.
  assert.equal(owners.length, 1);
  assert.equal(owners[0].ownerId, 'titipan_investor');
  assert.equal(owners[0].ownerName, 'Budi'); // holding pertama yang menang, bukan Cici
});

test('6. tidak ada holding sama sekali -> array kosong, tidak throw', () => {
  const D = baseD([]);
  const ctx = makeCtx(D);
  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioAPI.listExistingOwners());
  assert.equal(ctx.DanaTitipanPortfolioAPI.listExistingOwners().length, 0);
});

test('7. holding malformed (null/undefined/tanpa owners valid) tidak membuat listExistingOwners() crash', () => {
  const D = baseD([
    null,
    undefined,
    { id: 'h1', name: 'Data Rusak' },
    { id: 'h2', name: 'B', owners: [{ ownerId: 'a', porsi: 100, ownerName: 'A', isSelf: false }] },
  ]);
  const ctx = makeCtx(D);
  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioAPI.listExistingOwners());
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  assert.ok(owners.find((o) => o.ownerId === 'a'));
});

test('8. guard: listExistingOwners() aman dipanggil tanpa Investment/MultiOwnerEngine dimuat', () => {
  const ctx = loadSource(
    ['modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',],
    { D: { investments: [] } },
    ['DanaTitipanPortfolioAPI'],
  );
  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioAPI.listExistingOwners());
  assert.equal(ctx.DanaTitipanPortfolioAPI.listExistingOwners().length, 0);
});

test('9. urutan output deterministik: mengikuti urutan kemunculan pertama di getHoldings(), tidak di-sort ulang', () => {
  const D = baseD([
    { id: 'h1', name: 'B', owners: [{ ownerId: 'z-owner', porsi: 100, ownerName: 'Z', isSelf: false }] },
    { id: 'h2', name: 'A', owners: [{ ownerId: 'a-owner', porsi: 100, ownerName: 'A', isSelf: false }] },
  ]);
  const ctx = makeCtx(D);
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  assert.deepEqual([...owners].map((o) => o.ownerId), ['z-owner', 'a-owner']);
});

test('10. REGRESI: build()/totals S484 lama tidak berubah sama sekali di sesi ini', () => {
  const D = baseD([
    { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, fundSource: 'titipan', titipanOwner: 'Budi' },
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
  // Sesi 485c menambah field totals baru (principalAmountTotal dkk.) --
  // update sesuai per catatan di komentar test ini sebelumnya. Tanpa
  // D.titipanCommitments (tidak diset di test ini), field baru itu tetap
  // 0/tidak mengubah allocatedPrincipalTotal/currentValueTotal/gainTotal
  // lama (0 regresi nilai, hanya bentuk objek totals yang bertambah).
  // -- returnedTotalSum/outstandingPrincipalTotal -- additive, tidak
  // mengubah field lama (lihat s486, DanaTitipanReturnUI).
  assert.deepEqual(Object.keys(p.totals).sort(), ['allocatedPrincipalTotal', 'currentValueTotal', 'gainTotal', 'principalAmountTotal', 'estimatedUnallocatedTotal', 'overAllocatedTotal', 'returnedTotalSum', 'outstandingPrincipalTotal'].sort());
  assert.equal(p.totals.allocatedPrincipalTotal, 800000 + 25000);
});

test('11. D.titipanCommitments TIDAK diinisialisasi/ditulis oleh listExistingOwners() (sesi ini murni baca, 0 tulis)', () => {
  const D = baseD([
    { id: 'h1', name: 'BBCA', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  assert.equal(D.titipanCommitments, undefined);
});
