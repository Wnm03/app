'use strict';
// tests/s523c-commitment-delete-vs-owner-linkage.test.js — Sesi 523-C
// (AUDIT-S523-C-COMMITMENT-DELETE-VS-OWNER-LINKAGE.md, BUG-02/BUG-06/BUG-14
// dari S523 BUG REGISTER). Fokus SESI INI HANYA: BUG-02, BUG-06, BUG-14.
//
// Target: `DanaTitipanPortfolioAPI.deleteCommitment(ownerId)` (Sesi 522,
// TIDAK diubah sesi ini) vs `DanaTitipanPortfolioAPI.removeOwnerLinkage(ownerId)`
// (BARU sesi ini) — dua operasi TERPISAH secara kontrak, reuse mekanisme
// yang SAMA (0 rumus baru). Root cause & kontrak lengkap: lihat komentar
// `removeOwnerLinkage()` di modules/finance/dana-titipan-portfolio-presenter.js.
//
// 0 modifikasi test existing (S484/485a-e/486/492/494/498/499/504/514/515/
// 516/519/522/523a/523b semua harus tetap lolos tanpa disentuh) — file ini
// murni tambahan.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/shared/owner-registry.js',
      'modules/asset/investasi.js',
      'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',
    ],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => { D._saved = (D._saved || 0) + 1; }, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n) },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'OwnerRegistry', 'DanaTitipanPortfolioAPI'],
  );
}

function baseD(assets, investments) {
  return {
    assets: assets || [], investments: investments || [], investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [], titipanCommitments: [], titipanReturns: [], ownerRegistry: [],
  };
}

// ---------------------------------------------------------------------
// BUG-14: full lifecycle — create owner -> commitment -> delete commitment
// ---------------------------------------------------------------------

test('S523C(1). Lifecycle: create owner (OwnerRegistry) -> punya porsi di Investasi -> commitment -> deleteCommitment() -> commitment hilang, owner global TETAP ADA', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const ownerId = ctx.OwnerRegistry.findOrCreate('Budi');
  D.investments.push({ id: 'h1', name: 'Reksadana X', type: 'reksadana', unit: 10, avgPrice: 1000000, currentPrice: 1000000, owners: [{ ownerId, porsi: 100, ownerName: 'Budi', isSelf: false }] });

  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId, ownerName: 'Budi', principalAmount: 10000000 });
  assert.equal(D.titipanCommitments.length, 1);

  const ok = ctx.DanaTitipanPortfolioAPI.deleteCommitment(ownerId);
  assert.equal(ok, true);
  assert.equal(D.titipanCommitments.length, 0);

  // owner global (OwnerRegistry) tetap ada -- deleteCommitment() TIDAK
  // pernah menyentuh D.ownerRegistry.
  assert.equal(D.ownerRegistry.length, 1);
  assert.equal(D.ownerRegistry[0].id, ownerId);
  assert.equal(D.ownerRegistry[0].name, 'Budi');
});

test('S523C(2). Lifecycle end-to-end: create -> commitment -> delete -> owner visibility -> cross-domain safety, satu skenario (BUG-14)', () => {
  const D = baseD(
    [{ id: 'a1', name: 'Tanah', nilai: 20000000, owners: [{ ownerId: 'x', porsi: 100, ownerName: 'Xena', isSelf: false }] }],
  );
  const ctx = makeCtx(D);

  // create
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'x', ownerName: 'Xena', principalAmount: 20000000 });
  assert.equal(D.titipanCommitments.length, 1);

  // commitment muncul di build() projection
  let projection = ctx.DanaTitipanPortfolioAPI.build();
  let card = projection.owners.find((o) => o.ownerId === 'x');
  assert.ok(card);
  assert.equal(card.principalAmount, 20000000);

  // delete commitment
  ctx.DanaTitipanPortfolioAPI.deleteCommitment('x');
  assert.equal(D.titipanCommitments.length, 0);

  // owner visibility: owner MASIH muncul di projection (masih punya porsi
  // di D.assets) tapi principalAmount kembali PRINCIPAL_NOT_SET (bukan 0)
  // -- persis temuan BUG-04 S523-A (isolasi domain disengaja, BUKAN bug).
  projection = ctx.DanaTitipanPortfolioAPI.build();
  card = projection.owners.find((o) => o.ownerId === 'x');
  assert.ok(card, 'owner tetap tampil karena masih punya porsi Aset');
  assert.equal(card.principalAmount, null);
  assert.equal(card.allocationStatus, 'PRINCIPAL_NOT_SET');

  // cross-domain safety: D.assets sama sekali tidak berubah
  assert.equal(D.assets[0].owners[0].ownerId, 'x');
  assert.equal(D.assets[0].owners[0].porsi, 100);
});

// ---------------------------------------------------------------------
// BUG-02: delete commitment tidak otomatis menghapus OwnerRegistry
// ---------------------------------------------------------------------

test('S523C(3). deleteCommitment() ISOLASI TOTAL termasuk OwnerRegistry -- root cause BUG-02 dikonfirmasi BUKAN masalah di kode saat ini', () => {
  const D = baseD([{ id: 'a1', name: 'Kamera', nilai: 15000000, owners: [{ ownerId: 'kamera_owner', porsi: 100, ownerName: 'Kamera', isSelf: false }] }]);
  const ctx = makeCtx(D);
  const registryId = ctx.OwnerRegistry.findOrCreate('Kamera Person');
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'kamera_owner', ownerName: 'Kamera', principalAmount: 15000000 });

  const beforeRegistry = JSON.stringify(D.ownerRegistry);
  const beforeAssets = JSON.stringify(D.assets);
  const beforeInvestments = JSON.stringify(D.investments);
  const beforeTx = JSON.stringify(D.transactions);
  const beforeReturns = JSON.stringify(D.titipanReturns);

  ctx.DanaTitipanPortfolioAPI.deleteCommitment('kamera_owner');

  assert.equal(JSON.stringify(D.ownerRegistry), beforeRegistry);
  assert.equal(JSON.stringify(D.assets), beforeAssets);
  assert.equal(JSON.stringify(D.investments), beforeInvestments);
  assert.equal(JSON.stringify(D.transactions), beforeTx);
  assert.equal(JSON.stringify(D.titipanReturns), beforeReturns);
  // registryId tidak terpakai di commitment ini, sekadar bukti entry lain
  // di registry juga tidak ikut kesenggol.
  assert.ok(D.ownerRegistry.find((o) => o.id === registryId));
});

// ---------------------------------------------------------------------
// BUG-06: scoped removal dari Dana Titipan (removeOwnerLinkage)
// ---------------------------------------------------------------------

test('S523C(4). removeOwnerLinkage() melepas commitment (linkage) tapi TIDAK menghapus owner global / OwnerRegistry', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const ownerId = ctx.OwnerRegistry.findOrCreate('Cici');
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId, ownerName: 'Cici', principalAmount: 5000000 });
  assert.equal(D.titipanCommitments.length, 1);

  const removed = ctx.DanaTitipanPortfolioAPI.removeOwnerLinkage(ownerId);
  assert.equal(removed, true);
  assert.equal(D.titipanCommitments.length, 0);

  assert.equal(D.ownerRegistry.length, 1);
  assert.equal(D.ownerRegistry[0].id, ownerId);
});

test('S523C(5). removeOwnerLinkage() pada owner tanpa commitment -> return false, 0 perubahan (no-op aman, tidak throw)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const ownerId = ctx.OwnerRegistry.findOrCreate('Deni');
  const before = JSON.stringify(D);
  const removed = ctx.DanaTitipanPortfolioAPI.removeOwnerLinkage('tidak_ada_commitment');
  assert.equal(removed, false);
  assert.equal(JSON.stringify(D), before);
  void ownerId;
});

test('S523C(6). removeOwnerLinkage() ISOLASI TOTAL -- TIDAK menyentuh titipanReturns/Investment/Asset/Transaction/OwnerRegistry (hanya D.titipanCommitments)', () => {
  const D = baseD(
    [{ id: 'a1', name: 'Ruko', nilai: 100000000, owners: [{ ownerId: 'eka', porsi: 50, ownerName: 'Eka', isSelf: false }, { ownerId: 'self', porsi: 50, ownerName: 'Aku', isSelf: true }] }],
    [{ id: 'h1', name: 'Saham Y', type: 'saham', unit: 5, avgPrice: 2000000, currentPrice: 2000000, owners: [{ ownerId: 'eka', porsi: 100, ownerName: 'Eka', isSelf: false }] }],
  );
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'eka', ownerName: 'Eka', principalAmount: 60000000 });
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'eka', ownerName: 'Eka', amount: 1000000 });
  D.transactions.push({ id: 't1', type: 'expense', amount: 200000, titipanLinkId: 'eka', titipanTalangan: false });
  ctx.OwnerRegistry.findOrCreate('Registry Only Person');

  const beforeReturns = JSON.stringify(D.titipanReturns);
  const beforeAssets = JSON.stringify(D.assets);
  const beforeInvestments = JSON.stringify(D.investments);
  const beforeTx = JSON.stringify(D.transactions);
  const beforeRegistry = JSON.stringify(D.ownerRegistry);

  const removed = ctx.DanaTitipanPortfolioAPI.removeOwnerLinkage('eka');
  assert.equal(removed, true);
  assert.equal(D.titipanCommitments.length, 0);

  assert.equal(JSON.stringify(D.titipanReturns), beforeReturns);
  assert.equal(JSON.stringify(D.assets), beforeAssets);
  assert.equal(JSON.stringify(D.investments), beforeInvestments);
  assert.equal(JSON.stringify(D.transactions), beforeTx);
  assert.equal(JSON.stringify(D.ownerRegistry), beforeRegistry);
});

test('S523C(7). Investment/Asset tetap aman: porsi kepemilikan owner lain TIDAK berubah setelah removeOwnerLinkage() satu owner', () => {
  const D = baseD(
    [{ id: 'a1', name: 'Tanah Bersama', nilai: 40000000, owners: [{ ownerId: 'f1', porsi: 50, ownerName: 'Fajar', isSelf: false }, { ownerId: 'f2', porsi: 50, ownerName: 'Gita', isSelf: false }] }],
  );
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'f1', ownerName: 'Fajar', principalAmount: 20000000 });
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'f2', ownerName: 'Gita', principalAmount: 20000000 });

  ctx.DanaTitipanPortfolioAPI.removeOwnerLinkage('f1');

  // f1's commitment gone, f2 untouched
  assert.equal(D.titipanCommitments.find((c) => c.ownerId === 'f1'), undefined);
  assert.ok(D.titipanCommitments.find((c) => c.ownerId === 'f2'));

  // porsi kepemilikan Aset (kedua owner) 100% utuh
  assert.equal(D.assets[0].owners.length, 2);
  assert.equal(D.assets[0].owners.find((o) => o.ownerId === 'f1').porsi, 50);
  assert.equal(D.assets[0].owners.find((o) => o.ownerId === 'f2').porsi, 50);
});

// ---------------------------------------------------------------------
// deleteCommitment() dan removeOwnerLinkage() tidak saling mencampur
// ---------------------------------------------------------------------

test('S523C(8). deleteCommitment() dan removeOwnerLinkage() tidak saling mencampur antar owner berbeda', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const owA = ctx.OwnerRegistry.findOrCreate('Owner A');
  const owB = ctx.OwnerRegistry.findOrCreate('Owner B');
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: owA, ownerName: 'Owner A', principalAmount: 1000000 });
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: owB, ownerName: 'Owner B', principalAmount: 2000000 });
  assert.equal(D.titipanCommitments.length, 2);

  // deleteCommitment() dipanggil utk A -- B tidak boleh ikut kesenggol
  ctx.DanaTitipanPortfolioAPI.deleteCommitment(owA);
  assert.equal(D.titipanCommitments.length, 1);
  assert.equal(D.titipanCommitments[0].ownerId, owB);

  // removeOwnerLinkage() dipanggil utk B -- A (sudah kosong) tidak error/ikut apa2
  const removed = ctx.DanaTitipanPortfolioAPI.removeOwnerLinkage(owB);
  assert.equal(removed, true);
  assert.equal(D.titipanCommitments.length, 0);

  // kedua owner tetap ada di OwnerRegistry (keduanya operasi scoped, 0 global delete)
  assert.equal(D.ownerRegistry.length, 2);
});

test('S523C(9). Memanggil deleteCommitment() lalu removeOwnerLinkage() pada owner YANG SAMA -- kedua-duanya aman, panggilan kedua no-op (false), 0 error', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const ownerId = ctx.OwnerRegistry.findOrCreate('Hana');
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId, ownerName: 'Hana', principalAmount: 3000000 });

  const first = ctx.DanaTitipanPortfolioAPI.deleteCommitment(ownerId);
  assert.equal(first, true);

  const second = ctx.DanaTitipanPortfolioAPI.removeOwnerLinkage(ownerId);
  assert.equal(second, false); // sudah kosong, no-op aman
  assert.equal(D.titipanCommitments.length, 0);
  assert.equal(D.ownerRegistry.length, 1); // owner global tetap ada
});

test('S523C(10). removeOwnerLinkage() TIDAK pernah menambah/menghapus entry OwnerRegistry (bukan API delete owner global -- BATASAN "Jangan global delete owner")', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.OwnerRegistry.findOrCreate('Ivan');
  ctx.OwnerRegistry.findOrCreate('Joko');
  const beforeCount = D.ownerRegistry.length;
  assert.equal(beforeCount, 2);

  // removeOwnerLinkage dipanggil berkali-kali dgn ownerId acak/tidak dikenal
  ctx.DanaTitipanPortfolioAPI.removeOwnerLinkage('acak-1');
  ctx.DanaTitipanPortfolioAPI.removeOwnerLinkage('acak-2');
  ctx.DanaTitipanPortfolioAPI.removeOwnerLinkage(D.ownerRegistry[0].id);

  assert.equal(D.ownerRegistry.length, beforeCount); // OwnerRegistry TIDAK PERNAH berubah lewat fungsi ini
});

test('S523C(11). deleteCommitment dan removeOwnerLinkage keduanya EXPORT dari DanaTitipanPortfolioAPI sbg fungsi TERPISAH (bukan fungsi yang sama secara referensi -- kontrak dua nama)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.equal(typeof ctx.DanaTitipanPortfolioAPI.deleteCommitment, 'function');
  assert.equal(typeof ctx.DanaTitipanPortfolioAPI.removeOwnerLinkage, 'function');
  assert.notEqual(ctx.DanaTitipanPortfolioAPI.deleteCommitment, ctx.DanaTitipanPortfolioAPI.removeOwnerLinkage);
});
