'use strict';
// tests/s635-titipan-reconcile-transaction-owner-refs.test.js — S635, saran
// Prioritas #2 AUDIT-DATA-HEALTH-BACKUP-2026-08-16.md: TitipanReconcile.
// checkTransactionOwnerRefs() mendeteksi transaksi ber-`deductionOwnerId`
// yang sudah tidak match owner mana pun yang valid SAAT INI utk akun
// transaksi itu (porsi aset/holding/akun tertaut sudah diubah setelah
// transaksi dibuat). Pola sama dgn tests/titipan-reconcile.test.js
// (require langsung modul, mock via global.*) — TIDAK pakai loadSource krn
// modul ini murni baca `D`/`resolveOwnerDefaultForAccount` lewat bare
// identifier (sama pola global.D/global.MultiOwnerEngine yang sudah ada).

const test = require('node:test');
const assert = require('node:assert');
const TitipanReconcile = require('../modules/finance/titipan-reconcile.js');

function setD(transactions) {
  global.D = { assets: [], debts: [], investments: [], transactions };
}

test('checkTransactionOwnerRefs() ok=true kalau deductionOwnerId cocok owner valid saat ini', () => {
  setD([{ id: 'tx1', accountId: 'acc1', deductionOwnerId: 'owner_budi' }]);
  global.resolveOwnerDefaultForAccount = (accId) => {
    assert.strictEqual(accId, 'acc1');
    return { ok: true, source: 'asset', owners: [{ ownerId: 'owner_budi' }, { ownerId: 'owner_sri' }] };
  };
  const res = TitipanReconcile.checkTransactionOwnerRefs();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.orphan, []);
  delete global.resolveOwnerDefaultForAccount;
});

test('checkTransactionOwnerRefs() deteksi orphan (porsi aset sudah diubah, ownerId lama basi)', () => {
  // Skenario audit asli: akun "Saldo tagihan" tertaut aset "Majoris", porsi
  // disusun ulang -- transaksi lama masih nunjuk ownerId yang sudah tidak
  // ada di porsi terbaru.
  setD([
    { id: 'tx1', accountId: 'acc_saldo_tagihan', deductionOwnerId: 'owner_lama' },
    { id: 'tx2', accountId: 'acc_saldo_tagihan', deductionOwnerId: 'owner_lama' },
  ]);
  global.resolveOwnerDefaultForAccount = () => ({
    ok: true,
    source: 'asset',
    owners: [{ ownerId: 'owner_renov' }, { ownerId: 'owner_sihab' }, { ownerId: 'SELF' }],
  });
  const res = TitipanReconcile.checkTransactionOwnerRefs();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.orphan.length, 2);
  assert.strictEqual(res.orphan[0].txId, 'tx1');
  assert.strictEqual(res.orphan[0].accountId, 'acc_saldo_tagihan');
  assert.strictEqual(res.orphan[0].deductionOwnerId, 'owner_lama');
  delete global.resolveOwnerDefaultForAccount;
});

test('checkTransactionOwnerRefs() lewati transaksi tanpa deductionOwnerId/accountId', () => {
  setD([{ id: 'tx1', accountId: 'acc1' }, { id: 'tx2', deductionOwnerId: 'owner_x' }]);
  global.resolveOwnerDefaultForAccount = () => ({ ok: true, owners: [{ ownerId: 'owner_y' }] });
  const res = TitipanReconcile.checkTransactionOwnerRefs();
  assert.strictEqual(res.ok, true);
  delete global.resolveOwnerDefaultForAccount;
});

test('checkTransactionOwnerRefs() lewati akun single-owner (resolver balik owners kosong, source:none) -- hindari false-positive', () => {
  setD([{ id: 'tx1', accountId: 'acc1', deductionOwnerId: 'owner_x' }]);
  global.resolveOwnerDefaultForAccount = () => ({ ok: true, source: 'none', owners: [] });
  const res = TitipanReconcile.checkTransactionOwnerRefs();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.orphan, []);
  delete global.resolveOwnerDefaultForAccount;
});

test('checkTransactionOwnerRefs() fallback ok=true kalau resolveOwnerDefaultForAccount belum dimuat', () => {
  setD([{ id: 'tx1', accountId: 'acc1', deductionOwnerId: 'owner_x' }]);
  delete global.resolveOwnerDefaultForAccount;
  const res = TitipanReconcile.checkTransactionOwnerRefs();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.orphan, []);
});

test('checkTransactionOwnerRefs() aman (tidak throw, ok=true) kalau D/D.transactions belum ada', () => {
  delete global.D;
  delete global.resolveOwnerDefaultForAccount;
  const res1 = TitipanReconcile.checkTransactionOwnerRefs();
  assert.strictEqual(res1.ok, true);
  global.D = {};
  const res2 = TitipanReconcile.checkTransactionOwnerRefs();
  assert.strictEqual(res2.ok, true);
});

test('checkTransactionOwnerRefs() tidak throw kalau resolveOwnerDefaultForAccount melempar error utk 1 transaksi (transaksi lain tetap dicek)', () => {
  setD([
    { id: 'tx1', accountId: 'acc_error', deductionOwnerId: 'owner_x' },
    { id: 'tx2', accountId: 'acc_ok', deductionOwnerId: 'owner_lama' },
  ]);
  global.resolveOwnerDefaultForAccount = (accId) => {
    if (accId === 'acc_error') throw new Error('boom');
    return { ok: true, owners: [{ ownerId: 'owner_baru' }] };
  };
  const res = TitipanReconcile.checkTransactionOwnerRefs();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.orphan.length, 1);
  assert.strictEqual(res.orphan[0].txId, 'tx2');
  delete global.resolveOwnerDefaultForAccount;
});

// --- Wiring ke checkAll() (S635) ---

test('checkAll() ok=false kalau HANYA transactionOwnerRefs gagal (4 sub-check lain tetap ok)', () => {
  global.D = { assets: [], debts: [], investments: [], transactions: [{ id: 'tx1', accountId: 'acc1', deductionOwnerId: 'owner_lama' }] };
  global.MultiOwnerEngine = { getOwners: () => ({ ok: true, owners: [] }) };
  global.Investment = { getOwners: () => [], holdingCost: () => 0 };
  global.resolveOwnerDefaultForAccount = () => ({ ok: true, owners: [{ ownerId: 'owner_baru' }] });
  const res = TitipanReconcile.checkAll();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.sync.ok, true);
  assert.strictEqual(res.ownerIdConsistency.ok, true);
  assert.strictEqual(res.debtNameStaleness.ok, true);
  assert.strictEqual(res.accountSync.ok, true);
  assert.strictEqual(res.transactionOwnerRefs.ok, false);
  assert.strictEqual(res.transactionOwnerRefs.orphan.length, 1);
  delete global.resolveOwnerDefaultForAccount;
});

test('checkAll() ok=true kalau semua 5 sub-check ok, termasuk transactionOwnerRefs', () => {
  global.D = { assets: [], debts: [], investments: [], transactions: [{ id: 'tx1', accountId: 'acc1', deductionOwnerId: 'owner_baru' }] };
  global.MultiOwnerEngine = { getOwners: () => ({ ok: true, owners: [] }) };
  global.Investment = { getOwners: () => [], holdingCost: () => 0 };
  global.resolveOwnerDefaultForAccount = () => ({ ok: true, owners: [{ ownerId: 'owner_baru' }] });
  const res = TitipanReconcile.checkAll();
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.transactionOwnerRefs.ok, true);
  delete global.resolveOwnerDefaultForAccount;
});

test('checkAll() tidak throw & tetap ok=true kalau D/registry/resolveOwnerDefaultForAccount belum ada sama sekali (0 regresi utk konsumen lama)', () => {
  delete global.D;
  delete global.resolveOwnerDefaultForAccount;
  const res = TitipanReconcile.checkAll();
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.transactionOwnerRefs.ok, true);
});
