'use strict';
// tests/s523a-owner-identity-duplicate-orphan-audit.test.js — Sesi 523-A
// (S523 BUG REGISTER, BUG-03/04/05/10/11/13). MURNI AUDIT + REGRESSION
// TEST, 0 baris business logic diubah sesi ini (lihat S523-A-REPORT.md
// untuk root cause detail per bug). Semua angka/urutan dihitung LEWAT
// fungsi asli (findOrCreate/build/listExistingOwners/deleteCommitment/
// getReturns), 0 hardcode ekspektasi rumus.
//
// Cakupan wajib (S523 prompt §TEST):
//   1. findOrCreate('Aku') dipanggil dua kali -> kontrak existing (1 id).
//   2. Duplicate name dengan ownerId berbeda -> TIDAK auto-merge.
//   3. ownerId yang sama TIDAK dirender dua kali untuk linkage yang sama
//      (listExistingOwners() dedup gabungan + build() ownersMap dedup).
//   4. Referensi owner lintas domain (Investment/Asset/Commitment/
//      Return/Transaction) dapat ditrace dengan benar dari 1 ownerId.
// Tambahan (bukti BUG-04 — "owner tetap muncul setelah commitment
// dihapus" TERBUKTI BUKAN bug, melainkan isolasi domain yang disengaja):
//   5. deleteCommitment() hanya menghapus D.titipanCommitments; owner yang
//      masih dipakai Investment/Asset TETAP muncul di build() (benar).
//   6. Owner yang HANYA punya commitment (0 Investment/Asset) -> hilang
//      dari build() setelah deleteCommitment() (juga benar, konsisten).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => { D._saved = (D._saved || 0) + 1; }, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n) },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'OwnerRegistry', 'DanaTitipanPortfolioAPI'],
  );
}

function baseD() {
  return {
    assets: [], investments: [], investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [], titipanCommitments: [], titipanReturns: [],
    ownerRegistry: [],
  };
}

test('S523-A.1. findOrCreate("Aku") dipanggil DUA KALI -> balikin id yang SAMA (kontrak existing, 0 duplikat)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const id1 = ctx.OwnerRegistry.findOrCreate('Aku');
  const id2 = ctx.OwnerRegistry.findOrCreate('Aku');
  assert.equal(id1, id2);
  assert.equal(D.ownerRegistry.length, 1);
  // Variasi kapitalisasi/whitespace tetap match by kontrak existing
  // (trim + lowercase, lihat owner-registry.js findOrCreate()).
  const id3 = ctx.OwnerRegistry.findOrCreate('  aku  ');
  assert.equal(id3, id1);
  assert.equal(D.ownerRegistry.length, 1);
});

test('S523-A.2. Duplicate NAMA dengan ownerId BERBEDA (legacy id vs registry id) -> TIDAK otomatis digabung di manapun (registry, listExistingOwners, build)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  // "Budi" via registry (S489+)
  const budiRegistryId = ctx.OwnerRegistry.findOrCreate('Budi');
  // "Budi" LAIN, ownerId manual/legacy (data sebelum S489, TIDAK lewat findOrCreate)
  const budiLegacyId = 'legacy-manual-budi-001';
  assert.notEqual(budiRegistryId, budiLegacyId);

  D.investments.push(
    { id: 'h1', name: 'Reksadana X', unit: 1000, avgPrice: 1000, currentPrice: 1200, owners: [
      { ownerId: budiRegistryId, porsi: 100, ownerName: 'Budi', isSelf: false },
    ] },
    { id: 'h2', name: 'Emas', unit: 10, avgPrice: 1000000, currentPrice: 1100000, owners: [
      { ownerId: budiLegacyId, porsi: 100, ownerName: 'Budi', isSelf: false },
    ] },
  );

  // Registry sendiri: hanya 1 entri (budiRegistryId) -- findOrCreate tidak
  // pernah dipanggil untuk owner legacy, jadi tidak ada penggabungan paksa.
  assert.equal(D.ownerRegistry.length, 1);

  // listExistingOwners() -> 2 entri TERPISAH walau nama sama persis "Budi".
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  const budiEntries = owners.filter((o) => o.ownerName === 'Budi');
  assert.equal(budiEntries.length, 2, 'dua identitas "Budi" harus tetap terpisah, bukan digabung by nama');
  const ids = budiEntries.map((o) => String(o.ownerId)).sort();
  const expectedIds = [budiLegacyId, budiRegistryId].map(String).sort();
  assert.equal(ids.join(','), expectedIds.join(','));

  // build() -> 2 kartu owner terpisah (ownersMap key = ownerId, bukan nama).
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const budiCards = projection.owners.filter((o) => o.ownerName === 'Budi');
  assert.equal(budiCards.length, 2, 'dashboard harus tetap membedakan 2 identitas "Budi" berbeda berdasarkan ownerId');
});

test('S523-A.3. ownerId yang SAMA TIDAK dirender dua kali untuk linkage yang sama (dedup gabungan listExistingOwners() + dedup ownersMap build())', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const budiId = ctx.OwnerRegistry.findOrCreate('Budi');
  // ownerId yang SAMA dipakai di 2 holding Investasi berbeda + 1 aset +
  // 1 commitment -- linkage berbeda-beda, tapi identitas (ownerId) sama.
  D.investments.push(
    { id: 'h1', name: 'Reksadana X', unit: 1000, avgPrice: 1000, currentPrice: 1200, owners: [
      { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true },
      { ownerId: budiId, porsi: 50, ownerName: 'Budi', isSelf: false },
    ] },
    { id: 'h2', name: 'Emas', unit: 10, avgPrice: 1000000, currentPrice: 1100000, owners: [
      { ownerId: budiId, porsi: 100, ownerName: 'Budi', isSelf: false },
    ] },
  );
  D.assets.push({ id: 'a1', nilai: 50000000, owners: [
    { ownerId: 'SELF', porsi: 60, ownerName: 'Milik Sendiri', isSelf: true },
    { ownerId: budiId, porsi: 40, ownerName: 'Budi', isSelf: false },
  ] });
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: budiId, ownerName: 'Budi', principalAmount: 20000000, committedDate: '2026-01-01', notes: '' });

  // listExistingOwners(): 1 entri saja utk budiId walau muncul di 3 sumber union.
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  const budiEntries = owners.filter((o) => o.ownerId === budiId);
  assert.equal(budiEntries.length, 1);

  // build(): 1 kartu owner saja, tapi holdings-nya berisi SEMUA linkage
  // (2 holding investasi + 1 aset) tergabung ke 1 identity yang sama.
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const budiCards = projection.owners.filter((o) => o.ownerId === budiId);
  assert.equal(budiCards.length, 1, 'ownerId yang sama harus 1 kartu, bukan dirender ulang per linkage');
  assert.equal(budiCards[0].holdings.length, 3, '3 linkage (h1, h2, a1) tergabung ke 1 kartu, bukan 3 kartu terpisah');
});

test('S523-A.4. Referensi ownerId dapat ditrace lintas domain: Investment, Asset, Commitment, Return, Transaction', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const budiId = ctx.OwnerRegistry.findOrCreate('Budi');

  D.investments.push({ id: 'h1', name: 'Reksadana X', unit: 1000, avgPrice: 1000, currentPrice: 1200, owners: [
    { ownerId: budiId, porsi: 100, ownerName: 'Budi', isSelf: false },
  ] });
  D.assets.push({ id: 'a1', nilai: 10000000, owners: [
    { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true },
    { ownerId: budiId, porsi: 50, ownerName: 'Budi', isSelf: false },
  ] });
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: budiId, ownerName: 'Budi', principalAmount: 15000000, committedDate: '2026-01-01', notes: '' });
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: budiId, ownerName: 'Budi', amount: 1000000, returnDate: '2026-02-01', notes: '' });
  D.transactions.push({ id: 'tx1', type: 'expense', amount: 500000, titipanLinkId: budiId, titipanTalangan: true });

  // 1) Investment
  const invOwners = ctx.Investment.getOwners(D.investments[0]);
  assert.ok(invOwners.some((o) => o.ownerId === budiId), 'Investment.getOwners() harus mengandung budiId');

  // 2) Asset
  const assetOwners = ctx.MultiOwnerEngine.getOwners(D.assets[0]);
  assert.ok(assetOwners.owners.some((o) => o.ownerId === budiId), 'MultiOwnerEngine.getOwners() (Aset) harus mengandung budiId');

  // 3) Dana Titipan Commitment
  const commitments = ctx.DanaTitipanPortfolioAPI.getCommitments();
  assert.ok(commitments.some((c) => c.ownerId === budiId), 'getCommitments() harus mengandung budiId');

  // 4) Dana Titipan Return
  const returns = ctx.DanaTitipanPortfolioAPI.getReturns(budiId);
  assert.equal(returns.length, 1);
  assert.equal(returns[0].ownerId, budiId);

  // 5) Transaction/linkage lain (titipanLinkId)
  const linkedTx = D.transactions.filter((t) => t.titipanLinkId === budiId);
  assert.equal(linkedTx.length, 1);

  // 6) build() projection: SEMUA jejak di atas nyatu ke 1 kartu owner
  // (allocated dari Investment+Aset, principal dari commitment, returned
  // dari return, used/talangan dari transaksi) -- 1 ownerId, 1 kartu.
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const budiCard = projection.owners.find((o) => o.ownerId === budiId);
  assert.ok(budiCard);
  assert.equal(budiCard.holdings.length, 2); // h1 (investasi) + a1 (aset)
  assert.equal(budiCard.principalAmount, 15000000);
  assert.equal(budiCard.returnedTotal, 1000000);
  assert.equal(budiCard.usedTotal, 500000);
  assert.equal(budiCard.talanganTotal, 500000);
});

test('S523-A.5 (BUG-04, TERBUKTI BUKAN BUG). deleteCommitment() HANYA menghapus D.titipanCommitments -- owner yang masih dipakai Investment/Asset TETAP muncul di build() (isolasi domain disengaja, bukan bug)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const budiId = ctx.OwnerRegistry.findOrCreate('Budi');
  D.investments.push({ id: 'h1', name: 'Reksadana X', unit: 1000, avgPrice: 1000, currentPrice: 1200, owners: [
    { ownerId: budiId, porsi: 100, ownerName: 'Budi', isSelf: false },
  ] });
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: budiId, ownerName: 'Budi', principalAmount: 5000000, committedDate: '2026-01-01', notes: '' });

  const deleted = ctx.DanaTitipanPortfolioAPI.deleteCommitment(budiId);
  assert.equal(deleted, true);
  assert.equal(D.titipanCommitments.length, 0);

  // Owner global (registry) & Investment TIDAK ikut terhapus.
  assert.equal(D.ownerRegistry.length, 1);
  assert.equal(D.investments[0].owners.length, 1);

  // build() -- Budi TETAP tampil (masih ada holding Investasi), hanya
  // principalAmount/allocationStatus yang kembali PRINCIPAL_NOT_SET.
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const budiCard = projection.owners.find((o) => o.ownerId === budiId);
  assert.ok(budiCard, 'owner harus TETAP muncul karena masih dipakai Investment (bukan bug -- sesuai desain isolasi domain)');
  assert.equal(budiCard.principalAmount, null);
  assert.equal(budiCard.allocationStatus, 'PRINCIPAL_NOT_SET');
});

test('S523-A.6. Owner yang HANYA punya commitment (0 Investment/Asset) -> menghilang dari build() setelah deleteCommitment() (konsisten, bukan orphan)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const ciciId = ctx.OwnerRegistry.findOrCreate('Cici');
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: ciciId, ownerName: 'Cici', principalAmount: 3000000, committedDate: '2026-01-01', notes: '' });

  let projection = ctx.DanaTitipanPortfolioAPI.build();
  assert.ok(projection.owners.find((o) => o.ownerId === ciciId), 'sebelum dihapus, Cici muncul dari commitMap walau 0 holding');

  ctx.DanaTitipanPortfolioAPI.deleteCommitment(ciciId);
  projection = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(projection.owners.find((o) => o.ownerId === ciciId), undefined, 'setelah dihapus & tanpa holding lain, Cici hilang dari projection (konsisten, bukan bug)');

  // Identitas global (OwnerRegistry) tetap ada -- hanya linkage Dana
  // Titipan yang hilang, sesuai target desain §4 (bukan global delete).
  assert.equal(D.ownerRegistry.length, 1);
  assert.equal(D.ownerRegistry[0].id, ciciId);
});
