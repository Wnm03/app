'use strict';
// tests/s522-dana-titipan-owner-aset-hapus.test.js — Sesi 522
// (FIX-S521-DANA-TITIPAN-UI-MULTIOWNER.md). Dua gap terpisah yang
// diperbaiki sesi ini:
//   1. `DanaTitipanPortfolioAPI.listExistingOwners()` sekarang JUGA
//      union ke domain Aset (`D.assets[].owners[]` eksplisit, via
//      `_asetOwnersForTitipan()` — 100% reuse guard yang sudah dipakai
//      `build()`, 0 rumus baru). Sebelumnya cuma union Investasi +
//      OwnerRegistry, jadi owner yang HANYA diatur porsinya lewat Buku
//      Aset (mis. "kamera") muncul sbg kartu dashboard tapi ditolak
//      "Owner tidak ditemukan" saat Simpan di `titipanCommitmentModal`.
//   2. `DanaTitipanPortfolioAPI.deleteCommitment(ownerId)` — sebelumnya
//      tidak ada fungsi hapus sama sekali utk commitment (cuma
//      saveCommitment()/getCommitments()).
//
// 0 modifikasi test existing (S484/485a-e/486/492/494/498/499/504/514/
// 515/516/519 semua harus tetap lolos tanpa disentuh) — file ini murni
// tambahan.

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

test('S522(a). owner yang HANYA punya porsi di Aset (bukan Investasi/Registry) -> MUNCUL di listExistingOwners() (fix root cause "kamera")', () => {
  const D = baseD([
    {
      id: 'a1', name: 'Kamera Mirrorless', nilai: 15000000,
      owners: [
        { ownerId: 'ayah', porsi: 40, ownerName: 'Ayah', isSelf: false },
        { ownerId: 'kamera_owner', porsi: 60, ownerName: 'Kamera', isSelf: false },
      ],
    },
  ]);
  const ctx = makeCtx(D);
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  const ids = owners.map((o) => o.ownerId);
  assert.ok(ids.includes('ayah'));
  assert.ok(ids.includes('kamera_owner'));
  const kamera = owners.find((o) => o.ownerId === 'kamera_owner');
  assert.equal(kamera.ownerName, 'Kamera');
});

test('S522(b). saveCommitment() sekarang BERHASIL utk owner yang cuma ada di domain Aset (regresi bug "Owner tidak ditemukan")', () => {
  const D = baseD([
    { id: 'a1', name: 'Kamera Mirrorless', nilai: 15000000, owners: [{ ownerId: 'kamera_owner', porsi: 100, ownerName: 'Kamera', isSelf: false }] },
  ]);
  const ctx = makeCtx(D);
  const record = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'kamera_owner', ownerName: 'Kamera', principalAmount: 15000000 });
  assert.equal(record.ownerId, 'kamera_owner');
  assert.equal(D.titipanCommitments.length, 1);
});

test('S522(c). aset ownership SINTESIS (legacy `a.ownership`, bukan `owners[]` eksplisit) TETAP TIDAK muncul di listExistingOwners() (F1 regresi-guard tetap berlaku)', () => {
  const D = baseD([
    { id: 'a1', name: 'Ruko Legacy', nilai: 100000000, ownership: 'THIRD_PARTY' },
  ]);
  const ctx = makeCtx(D);
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  assert.equal(owners.length, 0);
});

test('S522(d). owner sudah ada dari Investasi -> domain Aset TIDAK bikin duplikat (dedup by ownerId, union holding tetap menang)', () => {
  const D = baseD(
    [{ id: 'a1', name: 'Tanah', nilai: 50000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi (dari Aset)', isSelf: false }] }],
    [{ id: 'h1', name: 'Reksadana X', type: 'reksadana', unit: 10, avgPrice: 1000000, currentPrice: 1000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi (dari Investasi)', isSelf: false }] }],
  );
  const ctx = makeCtx(D);
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  const budiEntries = owners.filter((o) => o.ownerId === 'budi');
  assert.equal(budiEntries.length, 1);
  assert.equal(budiEntries[0].ownerName, 'Budi (dari Investasi)');
});

test('S522(e). deleteCommitment(ownerId) menghapus record & return true; ownerId tak dikenal -> return false, 0 perubahan', () => {
  const D = baseD([{ id: 'a1', name: 'Kamera', nilai: 15000000, owners: [{ ownerId: 'kamera_owner', porsi: 100, ownerName: 'Kamera', isSelf: false }] }]);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'kamera_owner', ownerName: 'Kamera', principalAmount: 15000000 });
  assert.equal(D.titipanCommitments.length, 1);
  const notFound = ctx.DanaTitipanPortfolioAPI.deleteCommitment('tidak_ada');
  assert.equal(notFound, false);
  assert.equal(D.titipanCommitments.length, 1);
  const ok = ctx.DanaTitipanPortfolioAPI.deleteCommitment('kamera_owner');
  assert.equal(ok, true);
  assert.equal(D.titipanCommitments.length, 0);
});

test('S522(f). deleteCommitment() ISOLASI TOTAL — hanya menyentuh D.titipanCommitments, 0 sentuhan ke titipanReturns/assets/investments/accounts/transactions', () => {
  const D = baseD([{ id: 'a1', name: 'Kamera', nilai: 15000000, owners: [{ ownerId: 'kamera_owner', porsi: 100, ownerName: 'Kamera', isSelf: false }] }]);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'kamera_owner', ownerName: 'Kamera', principalAmount: 15000000 });
  const before = JSON.stringify({ assets: D.assets, investments: D.investments, accounts: D.accounts, transactions: D.transactions, titipanReturns: D.titipanReturns });
  ctx.DanaTitipanPortfolioAPI.deleteCommitment('kamera_owner');
  const after = JSON.stringify({ assets: D.assets, investments: D.investments, accounts: D.accounts, transactions: D.transactions, titipanReturns: D.titipanReturns });
  assert.equal(before, after);
});
