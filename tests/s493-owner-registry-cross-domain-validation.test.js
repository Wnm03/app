'use strict';
// tests/s493-owner-registry-cross-domain-validation.test.js — Sesi 493
// (langkah 5/5, PLAN-owner-registry-multi-session.md): Validasi Silang &
// Cleanup, MURNI PENGUJIAN — 0 baris business logic diubah sesi ini.
//
// Target: buktikan bahwa satu `ownerId` yang lahir dari
// `OwnerRegistry.findOrCreate()` (S489, dipakai `aset.js` S490 &
// `investasi-view.js` S491) bisa dipakai KONSISTEN lintas 3 domain — Aset
// (`MultiOwnerEngine` langsung, pola sama `aset.js`), Investasi
// (`Investment.getOwners()`/holding), dan Titipan
// (`DanaTitipanPortfolioAPI.listExistingOwners()`/`build()`, S492) —
// TANPA mengubah 1 baris pun formula `validateOwners()`/`splitByPorsi()`/
// `getOwners()`/agregasi SELF-non-SELF yang sudah ada. Semua angka di
// bawah dihitung LEWAT fungsi asli (0 hardcode ekspektasi hasil rumus),
// hanya struktur input/dedup ownerId yang jadi fokus pengujian sesi ini.
//
// HARD RULE (sama seperti S492): 0 migrasi/rename/merge/ubah ownerId data
// existing. Test ini murni membangun skenario BARU (D lokal per test),
// tidak menyentuh data lama mana pun.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => { D._saved = (D._saved || 0) + 1; }, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n) },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'OwnerRegistry', 'DanaTitipanPortfolioAPI'],
  );
}

function baseD() {
  return { assets: [], investments: [], investmentTx: [], investmentWatchlist: [], debts: [], ownerRegistry: [] };
}

test('1. ownerId dari OwnerRegistry.findOrCreate() dipakai KONSISTEN di Aset + Investasi -> ownerId identik, dedup by nama (bukan dobel identity)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const budiId = ctx.OwnerRegistry.findOrCreate('Budi');
  // Simulasi pola persis saveOwners() aset.js S490 & investasi-view.js S491:
  // baris non-SELF baru -> ownerId dari findOrCreate() (bukan uid() lagi).
  const budiIdLagi = ctx.OwnerRegistry.findOrCreate('Budi'); // dipilih lagi di Investasi
  assert.equal(budiId, budiIdLagi); // 1 identity, bukan 2
  assert.equal(D.ownerRegistry.length, 1);

  const asset = { id: 'a1', nilai: 100000000, owners: [
    { ownerId: 'SELF', porsi: 40, ownerName: 'Milik Sendiri', isSelf: true },
    { ownerId: budiId, porsi: 60, ownerName: 'Budi', isSelf: false },
  ] };
  const holding = { id: 'h1', name: 'Reksadana X', unit: 1000, avgPrice: 1000, currentPrice: 1200, owners: [
    { ownerId: budiId, porsi: 100, ownerName: 'Budi', isSelf: false },
  ] };
  D.investments.push(holding);

  const assetOwners = ctx.MultiOwnerEngine.getOwners(asset);
  const invOwners = ctx.Investment.getOwners(holding);
  assert.equal(assetOwners.ok, true);
  const assetBudi = assetOwners.owners.find((o) => !o.isSelf);
  const invBudi = invOwners.find((o) => !o.isSelf);
  assert.equal(assetBudi.ownerId, budiId);
  assert.equal(invBudi.ownerId, budiId);
  assert.equal(assetBudi.ownerId, invBudi.ownerId); // 1 ownerId, 2 domain
});

test('2. ownerId registry yang sama muncul di holding Investasi -> Titipan listExistingOwners() mengenalinya (union holding, S485a/S492 tidak berubah)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const budiId = ctx.OwnerRegistry.findOrCreate('Budi');
  D.investments.push({ id: 'h1', name: 'Emas', unit: 10, avgPrice: 1000000, currentPrice: 1100000, owners: [
    { ownerId: budiId, porsi: 100, ownerName: 'Budi', isSelf: false },
  ] });
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  assert.equal(owners.length, 1); // union holding + registry dedup by id (S492) -> 1 entri, bukan 2
  assert.equal(owners[0].ownerId, budiId);
  const record = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: budiId, ownerName: 'Budi', principalAmount: 10000000, committedDate: '2026-01-01', notes: '' });
  assert.equal(record.ownerId, budiId);
});

test('3. Titipan build() agregasi allocatedPrincipal per owner BENAR ketika ownerId sama (dari registry) dipakai di 2 holding berbeda — 0 rumus baru, 100% reuse splitByPorsi()', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const budiId = ctx.OwnerRegistry.findOrCreate('Budi');
  D.investments.push(
    { id: 'h1', name: 'Reksadana X', unit: 1000, avgPrice: 1000, currentPrice: 1200, owners: [
      { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true },
      { ownerId: budiId, porsi: 50, ownerName: 'Budi', isSelf: false },
    ] },
    { id: 'h2', name: 'Emas', unit: 10, avgPrice: 1000000, currentPrice: 1100000, owners: [
      { ownerId: budiId, porsi: 100, ownerName: 'Budi', isSelf: false },
    ] },
  );
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const budiBucket = projection.owners.find((o) => o.ownerId === budiId);
  assert.ok(budiBucket, 'owner budi harus muncul di projection');
  assert.equal(budiBucket.holdings.length, 2); // 2 holding tergabung ke 1 identity yang sama

  // Verifikasi angka dihitung LEWAT fungsi asli (splitByPorsi), bukan hardcode manual:
  const h1Cost = ctx.Investment.holdingCost(D.investments[0]);
  const h1Split = ctx.MultiOwnerEngine.splitByPorsi(h1Cost, ctx.Investment.getOwners(D.investments[0]));
  const h2Cost = ctx.Investment.holdingCost(D.investments[1]);
  const h2Split = ctx.MultiOwnerEngine.splitByPorsi(h2Cost, ctx.Investment.getOwners(D.investments[1]));
  const expectedAllocated = h1Split.splits.find((s) => s.ownerId === budiId).bagian + h2Split.splits.find((s) => s.ownerId === budiId).bagian;
  assert.equal(budiBucket.allocatedPrincipal, expectedAllocated);
});

test('4. Agregasi SELF/non-SELF di Aset TIDAK berubah walau ownerId non-SELF berasal dari registry (bukan uid() manual) — validateOwners()/splitByPorsi() reuse 100%', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const ayahId = ctx.OwnerRegistry.findOrCreate('Ayah');
  const asset = { id: 'a1', nilai: 200000000, keuntungan: 20000000, owners: [
    { ownerId: 'SELF', porsi: 70, ownerName: 'Milik Sendiri', isSelf: true },
    { ownerId: ayahId, porsi: 30, ownerName: 'Ayah', isSelf: false },
  ] };
  const res = ctx.MultiOwnerEngine.getOwners(asset);
  assert.equal(res.ok, true);
  assert.equal(ctx.MultiOwnerEngine.selfPorsi(asset), 70); // porsi SELF tidak terpengaruh sumber ownerId non-SELF
  assert.equal(ctx.MultiOwnerEngine.selfOwnedValue(asset, asset.nilai), 200000000 * 0.7);
  const split = ctx.MultiOwnerEngine.splitByPorsi(asset.keuntungan, res.owners);
  assert.equal(split.ok, true);
  const ayahSplit = split.splits.find((s) => s.ownerId === ayahId);
  assert.equal(ayahSplit.bagian, 20000000 * 0.3);
});

test('5. validateOwners() total porsi 100% + ownerId duplikat TETAP ditolak sama persis walau salah satu ownerId berasal dari registry (0 pengecualian utk ownerId hasil findOrCreate)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const budiId = ctx.OwnerRegistry.findOrCreate('Budi');
  // Total != 100 -> tetap ditolak (regresi formula lama, bukan bug baru)
  const notEnough = ctx.MultiOwnerEngine.validateOwners([
    { ownerId: 'SELF', porsi: 50 },
    { ownerId: budiId, porsi: 40 },
  ]);
  assert.equal(notEnough.ok, false);
  assert.match(notEnough.reason, /100%/);
  // ownerId duplikat (walau salah satunya dari registry) -> tetap ditolak
  const dup = ctx.MultiOwnerEngine.validateOwners([
    { ownerId: budiId, porsi: 60 },
    { ownerId: budiId, porsi: 40 },
  ]);
  assert.equal(dup.ok, false);
  assert.match(dup.reason, /duplikat/);
  // Total persis 100 & ownerId unik -> tetap diterima
  const ok = ctx.MultiOwnerEngine.validateOwners([
    { ownerId: 'SELF', porsi: 60 },
    { ownerId: budiId, porsi: 40 },
  ]);
  assert.equal(ok.ok, true);
  assert.equal(ok.total, 100);
});

test('6. Isolasi lintas domain: menyimpan owners Aset (via MultiOwnerEngine.setOwners) TIDAK mengubah D.investments/D.ownerRegistry/D.titipanCommitments milik domain lain', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const budiId = ctx.OwnerRegistry.findOrCreate('Budi');
  D.investments.push({ id: 'h1', name: 'Reksadana X', unit: 1000, avgPrice: 1000, currentPrice: 1200, owners: [
    { ownerId: budiId, porsi: 100, ownerName: 'Budi', isSelf: false },
  ] });
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: budiId, ownerName: 'Budi', principalAmount: 5000000, committedDate: '', notes: '' });
  const investmentsBefore = JSON.stringify(D.investments);
  const registryBefore = JSON.stringify(D.ownerRegistry);
  const commitmentsBefore = JSON.stringify(D.titipanCommitments);

  const asset = { id: 'a1', nilai: 100000000, owners: [
    { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true },
    { ownerId: budiId, porsi: 50, ownerName: 'Budi', isSelf: false },
  ] };
  const setRes = ctx.MultiOwnerEngine.setOwners(asset, asset.owners);
  assert.equal(setRes.ok, true);

  assert.equal(JSON.stringify(D.investments), investmentsBefore);
  assert.equal(JSON.stringify(D.ownerRegistry), registryBefore);
  assert.equal(JSON.stringify(D.titipanCommitments), commitmentsBefore);
  // setOwners() itu sendiri PURE (tidak menulis D sama sekali) — entity asli aset juga tidak dimutasi
  assert.notEqual(setRes.entity, asset);
  assert.deepEqual(asset.owners, [
    { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true },
    { ownerId: budiId, porsi: 50, ownerName: 'Budi', isSelf: false },
  ]); // entity asli tidak berubah
});

test('7. REGRESI eksplisit: legacy owner (ownerId manual, BUKAN dari registry) tetap diterima berdampingan dgn owner registry di aset/holding yang SAMA — 0 migrasi dipaksakan', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const ciciId = ctx.OwnerRegistry.findOrCreate('Cici'); // owner BARU via registry (S490+)
  const asset = { id: 'a1', nilai: 300000000, owners: [
    { ownerId: 'SELF', porsi: 20, ownerName: 'Milik Sendiri', isSelf: true },
    { ownerId: 'legacy-manual-id-xyz', porsi: 50, ownerName: 'Ayah (data lama)', isSelf: false }, // ownerId lama, dibuat sebelum S489, TIDAK di registry
    { ownerId: ciciId, porsi: 30, ownerName: 'Cici', isSelf: false },
  ] };
  const res = ctx.MultiOwnerEngine.getOwners(asset);
  assert.equal(res.ok, true);
  assert.equal(res.isSynthesized, false); // owners.length valid & total 100 -> dipakai apa adanya, TIDAK disintesis ulang
  const ids = res.owners.map((o) => o.ownerId).sort();
  assert.deepEqual(ids, ['SELF', ciciId, 'legacy-manual-id-xyz'].sort());
  assert.equal(ctx.MultiOwnerEngine.selfPorsi(asset), 20);
});
