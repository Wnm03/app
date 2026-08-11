'use strict';
// tests/s560-owners-to-registry-migration-r2.test.js — R2 (audit
// ownership/titipan, lanjutan GAP3-AUD-001 S545/546, toVersion:7).
//
// Aset.migrateOwnersToRegistry() / Investment.migrateOwnersToRegistry():
// baris owners[] non-SELF yang dibuat SEBELUM assetOwnersModal/
// investmentOwnersModal disambung ke OwnerRegistry (S490/S491) masih pakai
// ownerId ad-hoc lama — 2 entity dgn owner NAMA sama seharusnya konvergen
// ke 1 ownerId kanonik setelah migrasi. Berbeda dari GAP3-AUD-001 (S545)
// yang menyasar holding TANPA owners[] sama sekali (fundSource literal).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeAsetCtx(D) {
  let _n = 0;
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/aset.js'],
    { D, escapeHtml: (s) => String(s), uid: () => 'u' + (_n += 1), sameId: (a, b) => String(a) === String(b), save: () => { D._saved = (D._saved || 0) + 1; }, toast: () => {}, todayStr: () => '2026-08-11' },
    ['Aset', 'OwnershipEngine', 'MultiOwnerEngine', 'OwnerRegistry'],
  );
}

function makeInvCtx(D) {
  let _n = 0;
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/investasi.js'],
    { D, uid: () => 'u' + (_n += 1), save: () => { D._saved = (D._saved || 0) + 1; }, escapeHtml: (s) => String(s) },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'OwnerRegistry'],
  );
}

test('Aset.migrateOwnersToRegistry() — 2 aset, owner nama sama, ownerId beda -> konvergen ke 1 ownerId kanonik', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Ruko', nilai: 1000, owners: [{ ownerId: 'SELF', porsi: 60, isSelf: true, ownerName: 'Milik Sendiri' }, { ownerId: 'old_budi_1', porsi: 40, ownerName: 'Budi', isSelf: false }] },
      { id: 'a2', name: 'Tanah', nilai: 2000, owners: [{ ownerId: 'SELF', porsi: 50, isSelf: true, ownerName: 'Milik Sendiri' }, { ownerId: 'old_budi_2', porsi: 50, ownerName: 'Budi', isSelf: false }] },
    ],
    debts: [
      { id: 'd1', name: 'Budi', nilai: 400, linkedAssetId: 'a1', linkedOwnerId: 'old_budi_1', lunas: false },
      { id: 'd2', name: 'Budi', nilai: 1000, linkedAssetId: 'a2', linkedOwnerId: 'old_budi_2', lunas: false },
    ],
    accounts: [], transactions: [], ownerRegistry: [],
  };
  const ctx = makeAsetCtx(D);
  const res = ctx.Aset.migrateOwnersToRegistry();
  assert.equal(res.migrated, 2);
  assert.equal(res.conflicts, 0);
  const id1 = D.assets[0].owners.find((o) => !o.isSelf).ownerId;
  const id2 = D.assets[1].owners.find((o) => !o.isSelf).ownerId;
  assert.equal(id1, id2, 'ownerId "Budi" harus sama lintas aset setelah migrasi');
  assert.equal(D.ownerRegistry.filter((o) => o.name === 'Budi').length, 1, '0 duplikat di registry');
  // Kontinuitas utang: id debt d1/d2 TIDAK berubah, cuma linkedOwnerId
  assert.equal(D.debts.find((d) => d.id === 'd1').linkedOwnerId, id1);
  assert.equal(D.debts.find((d) => d.id === 'd2').linkedOwnerId, id1);
  assert.equal(D.debts.length, 2, '0 debt baru dibuat, 0 debt hilang');
});

test('Aset.migrateOwnersToRegistry() — idempotent, jalan 2x tidak mengubah apa pun lagi', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Ruko', nilai: 1000, owners: [{ ownerId: 'old_budi_1', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    ],
    debts: [], accounts: [], transactions: [], ownerRegistry: [],
  };
  const ctx = makeAsetCtx(D);
  const res1 = ctx.Aset.migrateOwnersToRegistry();
  assert.equal(res1.migrated, 1);
  const idAfter1 = D.assets[0].owners[0].ownerId;
  const res2 = ctx.Aset.migrateOwnersToRegistry();
  assert.equal(res2.migrated, 0, 'sesi kedua: 0 baris berubah lagi');
  assert.equal(D.assets[0].owners[0].ownerId, idAfter1);
  assert.equal(D.ownerRegistry.length, 1, 'tidak nambah entri registry baru');
});

test('Aset.migrateOwnersToRegistry() — guard tabrakan: 2 baris nama sama di 1 aset yang sama -> di-skip, dicatat conflicts', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Ruko', nilai: 1000, owners: [{ ownerId: 'SELF', porsi: 20, isSelf: true, ownerName: 'Milik Sendiri' }, { ownerId: 'old_x', porsi: 40, ownerName: 'Cici', isSelf: false }, { ownerId: 'old_y', porsi: 40, ownerName: 'Cici', isSelf: false }] },
    ],
    debts: [], accounts: [], transactions: [], ownerRegistry: [],
  };
  const ctx = makeAsetCtx(D);
  const res = ctx.Aset.migrateOwnersToRegistry();
  assert.equal(res.conflicts, 1);
  assert.equal(res.migrated, 0);
  assert.equal(D.assets[0].owners[1].ownerId, 'old_x', 'aset dgn konflik TIDAK diubah sama sekali');
  assert.equal(D.assets[0].owners[2].ownerId, 'old_y');
});

test('Investment.migrateOwnersToRegistry() — 2 holding, owner nama sama, ownerId beda -> konvergen', () => {
  const D = {
    investments: [
      { id: 'h1', name: 'Saham A', unit: 1, avgPrice: 1000, currentPrice: 1000, owners: [{ ownerId: 'SELF', porsi: 70, isSelf: true, ownerName: 'Milik Sendiri' }, { ownerId: 'old_cici_1', porsi: 30, ownerName: 'Cici', isSelf: false }] },
      { id: 'h2', name: 'Saham B', unit: 1, avgPrice: 2000, currentPrice: 2000, owners: [{ ownerId: 'SELF', porsi: 50, isSelf: true, ownerName: 'Milik Sendiri' }, { ownerId: 'old_cici_2', porsi: 50, ownerName: 'Cici', isSelf: false }] },
    ],
    investmentTx: [], investmentWatchlist: [],
    debts: [
      { id: 'd1', name: 'Cici', nilai: 300, linkedInvestmentId: 'h1', linkedOwnerId: 'old_cici_1', lunas: false },
    ],
    accounts: [], transactions: [], ownerRegistry: [],
  };
  const ctx = makeInvCtx(D);
  const res = ctx.Investment.migrateOwnersToRegistry();
  assert.equal(res.migrated, 2);
  const id1 = D.investments[0].owners.find((o) => !o.isSelf).ownerId;
  const id2 = D.investments[1].owners.find((o) => !o.isSelf).ownerId;
  assert.equal(id1, id2, 'ownerId "Cici" harus sama lintas holding setelah migrasi');
  assert.equal(D.debts.find((d) => d.id === 'd1').linkedOwnerId, id1, 'debt d1 direlabel, id tetap sama');
});

test('Investment.migrateOwnersToRegistry() — holding tanpa owners[] (mis. fundSource literal) di-skip, bukan error', () => {
  const D = {
    investments: [{ id: 'h1', name: 'Legacy', unit: 1, avgPrice: 1, currentPrice: 1, fundSource: 'titipan', titipanOwner: 'Budi' }],
    investmentTx: [], investmentWatchlist: [], debts: [], accounts: [], transactions: [], ownerRegistry: [],
  };
  const ctx = makeInvCtx(D);
  const res = ctx.Investment.migrateOwnersToRegistry();
  assert.equal(res.migrated, 0);
  assert.equal(res.skipped, 1);
  assert.equal(res.conflicts, 0);
});
