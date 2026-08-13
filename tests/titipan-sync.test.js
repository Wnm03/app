// tests/titipan-sync.test.js — test TitipanSync (modules/finance/titipan-sync.js).
// Pola sama dgn tests/titipan-reconcile.test.js: node:test + assert, mock
// Aset minimal (reconcile() sesi 10a cuma membungkus Aset._syncOwnerDebts,
// jadi mock di sini hanya perlu meniru KEHADIRAN/KETIADAAN fungsi itu, tidak
// perlu mereplikasi logic sync sungguhan -- itu sudah dites tuntas di
// tests/asset*.test.js yang ada).
const test = require('node:test');
const assert = require('node:assert');
const TitipanSync = require('../modules/finance/titipan-sync.js');

test('reconcile(a) ok=true & memanggil Aset._syncOwnerDebts(a) persis 1x saat tersedia', () => {
  const a = { id: 'a1', nilai: 1000000 };
  let calls = [];
  global.Aset = {
    _syncOwnerDebts(asset) { calls.push(asset); },
  };
  const res = TitipanSync.reconcile(a);
  assert.deepStrictEqual(res, { ok: true, synced: true });
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0], a); // objek yang sama, bukan copy
  delete global.Aset;
});

test('reconcile(a) tidak melempar & synced=false kalau Aset belum dimuat', () => {
  delete global.Aset;
  const res = TitipanSync.reconcile({ id: 'a2', nilai: 500000 });
  assert.deepStrictEqual(res, { ok: false, synced: false, reason: 'sync-unavailable' });
});

test('reconcile(a) synced=false kalau Aset ada tapi _syncOwnerDebts bukan fungsi', () => {
  global.Aset = { _syncOwnerDebts: null };
  const res = TitipanSync.reconcile({ id: 'a3', nilai: 500000 });
  assert.deepStrictEqual(res, { ok: false, synced: false, reason: 'sync-unavailable' });
  delete global.Aset;
});

test('reconcile(a) ok=false kalau a falsy (null) -- 0 panggilan ke Aset', () => {
  let calls = 0;
  global.Aset = { _syncOwnerDebts() { calls++; } };
  const res = TitipanSync.reconcile(null);
  assert.deepStrictEqual(res, { ok: false, synced: false, reason: 'no-asset' });
  assert.strictEqual(calls, 0);
  delete global.Aset;
});

test('reconcile(a) ok=false kalau a undefined -- 0 panggilan ke Aset', () => {
  let calls = 0;
  global.Aset = { _syncOwnerDebts() { calls++; } };
  const res = TitipanSync.reconcile(undefined);
  assert.deepStrictEqual(res, { ok: false, synced: false, reason: 'no-asset' });
  assert.strictEqual(calls, 0);
  delete global.Aset;
});

test('reconcile(a) meneruskan exception asli dari _syncOwnerDebts (tidak ditelan try/catch)', () => {
  global.Aset = {
    _syncOwnerDebts() { throw new Error('boom dari MultiOwnerEngine.getOwners()'); },
  };
  assert.throws(() => TitipanSync.reconcile({ id: 'a4' }), /boom dari MultiOwnerEngine/);
  delete global.Aset;
});

test('reconcile(a) tidak membaca/menulis field lain di luar apa yang dilakukan _syncOwnerDebts', () => {
  const a = { id: 'a5', nilai: 750000, owners: [{ ownerId: 'o1', isSelf: false, porsi: 20 }] };
  const snapshotBefore = JSON.stringify(a);
  global.Aset = {
    _syncOwnerDebts(asset) { asset.__synced = true; }, // simulasi 1 efek samping asli
  };
  TitipanSync.reconcile(a);
  // reconcile() sendiri 0 mutasi tambahan -- satu-satunya perubahan pada `a`
  // datang dari _syncOwnerDebts() yang dipanggilnya, bukan dari reconcile().
  assert.strictEqual(a.__synced, true);
  delete a.__synced;
  assert.strictEqual(JSON.stringify(a), snapshotBefore);
  delete global.Aset;
});
