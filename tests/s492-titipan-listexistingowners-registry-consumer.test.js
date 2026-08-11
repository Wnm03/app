'use strict';
// tests/s492-titipan-listexistingowners-registry-consumer.test.js — Sesi
// 492 (langkah 4/5, PLAN-owner-registry-multi-session.md). Gate #2 =
// SENTUH (dikonfirmasi eksplisit sebelum sesi ini mulai, lihat
// s492-SESSION-NOTE.md).
//
// Target: `DanaTitipanPortfolioAPI.listExistingOwners()` sekarang JUGA
// consumer `OwnerRegistry.listAll()` (S489) — DITAMBAHKAN sebagai sumber
// kedua (append, dedup gabungan by id), union holding lama (S485a) TIDAK
// diganti/dihapus. Scope SENGAJA dipersempit persis satu titik ini —
// TIDAK migrasi, TIDAK rename, TIDAK merge, TIDAK ubah ownerId data
// existing. Semua 11 test s485a-titipan-commitment-owner-picker.test.js
// (union holding lama) HARUS tetap hijau tanpa modifikasi — itu bukti
// "data legacy tetap aman" yang diminta.

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

function baseD(investments, ownerRegistry) {
  return { investments: investments || [], investmentTx: [], investmentWatchlist: [], debts: [], ownerRegistry: ownerRegistry || [] };
}

test('1. registry kosong (Gate #1 seed kosong) + holding lama -> hasil PERSIS sama seperti sebelum S492 (union holding saja)', () => {
  const D = baseD([
    { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, fundSource: 'titipan', titipanOwner: 'Budi' },
  ], []);
  const ctx = makeCtx(D);
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  assert.equal(owners.length, 1);
  assert.equal(owners[0].ownerId, 'titipan_investor');
  assert.equal(owners[0].ownerName, 'Budi');
});

test('2. registry punya entri (dari S490/491) + TIDAK ADA holding -> entri registry ikut muncul (bukti "menjadi consumer")', () => {
  const D = baseD([], [{ id: 'reg-1', name: 'Cici' }]);
  const ctx = makeCtx(D);
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  assert.equal(owners.length, 1);
  assert.equal(owners[0].ownerId, 'reg-1');
  assert.equal(owners[0].ownerName, 'Cici');
});

test('3. holding lama + registry baru, owner BERBEDA -> gabungan (union holding dulu, registry sesudah), 0 owner hilang', () => {
  const D = baseD(
    [{ id: 'h1', name: 'Reksadana X', unit: 1000, avgPrice: 1000, currentPrice: 1200, owners: [{ ownerId: 'budi-1', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'reg-1', name: 'Ani' }],
  );
  const ctx = makeCtx(D);
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  assert.deepEqual([...owners].map((o) => o.ownerId), ['budi-1', 'reg-1']);
  assert.deepEqual([...owners].map((o) => o.ownerName), ['Budi', 'Ani']);
});

test('4. dedup gabungan: id registry KEBETULAN sama dgn ownerId holding -> entri holding (union lama) menang, tidak duplikat', () => {
  const D = baseD(
    [{ id: 'h1', name: 'Emas', unit: 10, avgPrice: 1000000, currentPrice: 1100000, owners: [{ ownerId: 'shared-id', porsi: 100, ownerName: 'Budi (holding)', isSelf: false }] }],
    [{ id: 'shared-id', name: 'Budi (registry)' }],
  );
  const ctx = makeCtx(D);
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  assert.equal(owners.length, 1);
  assert.equal(owners[0].ownerId, 'shared-id');
  assert.equal(owners[0].ownerName, 'Budi (holding)'); // union lama menang, tidak ditimpa registry
});

test('5. D.investments / D.ownerRegistry TIDAK dimutasi oleh listExistingOwners() (0 migrasi/rename/merge/ubah ownerId)', () => {
  const investments = [
    { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi-a', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ];
  const ownerRegistry = [{ id: 'reg-1', name: 'Budi' }]; // sengaja nama kembar, ownerId beda -> harus TETAP 2 entri terpisah
  const D = baseD(investments, ownerRegistry);
  const before = JSON.stringify({ investments: D.investments, ownerRegistry: D.ownerRegistry });
  const owners = ctxCall(D);
  const after = JSON.stringify({ investments: D.investments, ownerRegistry: D.ownerRegistry });
  assert.equal(before, after); // tidak ada mutasi data existing
  assert.equal(D._saved, undefined); // tidak pernah panggil save() (murni baca)
  assert.equal(owners.length, 2); // nama sama, ownerId beda -> TETAP 2 entri (dilarang merge by nama)
  assert.deepEqual([...owners].map((o) => o.ownerId).sort(), ['budi-a', 'reg-1']);
});
function ctxCall(D) {
  const ctx = makeCtx(D);
  return ctx.DanaTitipanPortfolioAPI.listExistingOwners();
}

test('6. saveCommitment() untuk ownerId yang HANYA ada di registry (belum ada holding sama sekali) -> tetap valid (existing-owner-only tervalidasi lewat sumber gabungan)', () => {
  const D = baseD([], [{ id: 'reg-1', name: 'Dedi' }]);
  const ctx = makeCtx(D);
  const record = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'reg-1', ownerName: 'Dedi', principalAmount: 5000000, committedDate: '2026-01-01', notes: '' });
  assert.equal(record.ownerId, 'reg-1');
  assert.equal(D.titipanCommitments.length, 1);
});

test('7. guard: listExistingOwners() aman dipanggil tanpa OwnerRegistry dimuat sama sekali (0 crash, fallback union holding saja)', () => {
  const D = { investments: [{ id: 'h1', name: 'A', owners: [{ ownerId: 'a', porsi: 100, ownerName: 'A', isSelf: false }] }] };
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    { D, uid: () => 'u1', save: () => {} },
    ['Investment', 'DanaTitipanPortfolioAPI'],
  );
  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioAPI.listExistingOwners());
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  assert.equal(owners.length, 1);
  assert.equal(owners[0].ownerId, 'a');
});

test('8. registry dgn entri malformed (tanpa id, id kosong) tidak membuat listExistingOwners() crash; entri tanpa nama pakai fallback (pola sama union holding)', () => {
  const D = baseD([], [null, undefined, { id: '', name: 'X' }, { id: 'reg-1', name: '' }, { id: 'reg-2', name: 'Valid' }]);
  const ctx = makeCtx(D);
  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioAPI.listExistingOwners());
  const owners = ctx.DanaTitipanPortfolioAPI.listExistingOwners();
  assert.deepEqual([...owners].map((o) => o.ownerId), ['reg-1', 'reg-2']);
  assert.equal(owners[0].ownerName, 'Pemilik dana titipan'); // nama kosong -> fallback, pola sama union holding
  assert.equal(owners[1].ownerName, 'Valid');
});
