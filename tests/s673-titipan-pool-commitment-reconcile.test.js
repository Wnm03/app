// tests/s673-titipan-pool-commitment-reconcile.test.js — SESI FIX-2026-09-01-lanjutan.
// Audit "gap kekurangan Dana Titipan": D.titipanPool[]/D.titipanCommitments[] tidak pernah
// ikut TitipanReconcile.checkAll()/Tes Otomatis -- ditutup lewat checkPoolCommitment() baru
// (titipan-reconcile.js), 0 rumus baru (100% reuse DanaTitipanPoolAPI.status()/
// DanaTitipanPortfolioAPI.build().owners[].allocationStatus).
const test = require('node:test');
const assert = require('node:assert');
const TitipanReconcile = require('../modules/finance/titipan-reconcile.js');

test('checkPoolCommitment() ok=true & poolStatus null kalau DanaTitipanPoolAPI/DanaTitipanPortfolioAPI belum dimuat (guard, 0 false-positive)', () => {
  delete global.DanaTitipanPoolAPI;
  delete global.DanaTitipanPortfolioAPI;
  const res = TitipanReconcile.checkPoolCommitment();
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.poolStatus, null);
  assert.deepStrictEqual(res.overAllocatedOwners, []);
});

test('checkPoolCommitment() ok=true kalau poolStatus OK & 0 owner over-allocated', () => {
  global.DanaTitipanPoolAPI = { status: () => 'OK' };
  global.DanaTitipanPortfolioAPI = { build: () => ({ owners: [{ ownerId: 'o1', ownerName: 'Budi', allocationStatus: 'OK', overAllocatedAmount: 0 }] }) };
  const res = TitipanReconcile.checkPoolCommitment();
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.poolStatus, 'OK');
  assert.deepStrictEqual(res.overAllocatedOwners, []);
  delete global.DanaTitipanPoolAPI;
  delete global.DanaTitipanPortfolioAPI;
});

test('checkPoolCommitment() ok=true kalau poolStatus NOT_MIGRATED (belum ada entry pool, bukan gap)', () => {
  global.DanaTitipanPoolAPI = { status: () => 'NOT_MIGRATED' };
  const res = TitipanReconcile.checkPoolCommitment();
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.poolStatus, 'NOT_MIGRATED');
  delete global.DanaTitipanPoolAPI;
});

test('checkPoolCommitment() deteksi poolStatus OVER_ALLOCATED (komitmen lintas owner > total pool masuk)', () => {
  global.DanaTitipanPoolAPI = { status: () => 'OVER_ALLOCATED' };
  const res = TitipanReconcile.checkPoolCommitment();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.poolStatus, 'OVER_ALLOCATED');
  delete global.DanaTitipanPoolAPI;
});

test('checkPoolCommitment() deteksi owner ber-allocationStatus OVER_ALLOCATED dari build()', () => {
  global.DanaTitipanPortfolioAPI = {
    build: () => ({
      owners: [
        { ownerId: 'o1', ownerName: 'Budi', allocationStatus: 'OK', overAllocatedAmount: 0 },
        { ownerId: 'o2', ownerName: 'Siti', allocationStatus: 'OVER_ALLOCATED', overAllocatedAmount: 250000 },
      ],
    }),
  };
  const res = TitipanReconcile.checkPoolCommitment();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.overAllocatedOwners.length, 1);
  assert.strictEqual(res.overAllocatedOwners[0].ownerId, 'o2');
  assert.strictEqual(res.overAllocatedOwners[0].overAllocatedAmount, 250000);
  delete global.DanaTitipanPortfolioAPI;
});

test('checkPoolCommitment() TIDAK crash kalau build()/status() melempar error (guard try/catch)', () => {
  global.DanaTitipanPoolAPI = { status: () => { throw new Error('boom'); } };
  global.DanaTitipanPortfolioAPI = { build: () => { throw new Error('boom'); } };
  const res = TitipanReconcile.checkPoolCommitment();
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.poolStatus, null);
  assert.deepStrictEqual(res.overAllocatedOwners, []);
  delete global.DanaTitipanPoolAPI;
  delete global.DanaTitipanPortfolioAPI;
});

test('checkAll() menyertakan poolCommitment sbg sub-check ke-7, ok keseluruhan AND dari semua sub-check', () => {
  global.D = { assets: [], debts: [], investments: [] };
  global.MultiOwnerEngine = { getOwners: () => ({ ok: true, owners: [] }) };
  global.Investment = { getOwners: () => [], holdingCost: () => 0 };
  global.DanaTitipanPoolAPI = { status: () => 'OVER_ALLOCATED' };
  const r = TitipanReconcile.checkAll();
  assert.ok('poolCommitment' in r, 'checkAll() harus menyertakan field poolCommitment');
  assert.strictEqual(r.poolCommitment.ok, false);
  assert.strictEqual(r.ok, false, 'ok keseluruhan harus false krn poolCommitment gagal, walau 6 sub-check lain ok');
  delete global.DanaTitipanPoolAPI;
  delete global.D;
  delete global.MultiOwnerEngine;
  delete global.Investment;
});

test('checkAll() poolCommitment.ok=true & tidak mempengaruhi ok keseluruhan kalau modul Pool/Portfolio tidak dimuat', () => {
  global.D = { assets: [], debts: [], investments: [] };
  global.MultiOwnerEngine = { getOwners: () => ({ ok: true, owners: [] }) };
  global.Investment = { getOwners: () => [], holdingCost: () => 0 };
  delete global.DanaTitipanPoolAPI;
  delete global.DanaTitipanPortfolioAPI;
  const r = TitipanReconcile.checkAll();
  assert.strictEqual(r.poolCommitment.ok, true);
  assert.strictEqual(r.ok, true);
  delete global.D;
  delete global.MultiOwnerEngine;
  delete global.Investment;
});
