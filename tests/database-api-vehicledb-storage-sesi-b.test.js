'use strict';
// tests/database-api-vehicledb-storage-sesi-b.test.js — cakupan Sesi B
// (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §4 Fase 1 poin 2): pindahkan
// Vehicle Database dari konstanta kode (VEHICLE_DB_RECORDS) ke data
// tersimpan (IndexedDB via IDBStore, pola sama ai-core.js), key
// 'vehicledb:active'. Cakupan sesi ini CUMA DatabaseAPI.vehicle
// (ensureLoaded/isLoaded/invalidateCache + getAll/getById/findTorsiByName/
// findSpecByName baca dari cache aktif) — consumer sync (findTorsiDb() dkk
// di sparepart-servis-b.js) SENGAJA TIDAK disentuh sesi ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const DB_API_FILE = 'modules/engine/database-api.js';

function makeIdb(initial) {
  const store = initial ? { 'vehicledb:active': initial } : {};
  const calls = { get: 0, set: 0 };
  return {
    store,
    calls,
    async get(k) { calls.get++; return store[k]; },
    async set(k, v) { calls.set++; store[k] = v; return true; },
  };
}

test('ensureLoaded(): storage kosong -> seed dari VEHICLE_DB_RECORDS, tulis-balik 1x (write-through)', async () => {
  const idb = makeIdb(null);
  const ctx = loadSource([DB_API_FILE], { IDBStore: idb }, ['DatabaseAPI']);
  assert.equal(ctx.DatabaseAPI.vehicle.isLoaded(), false);
  const before = ctx.DatabaseAPI.vehicle.getAll().length;
  await ctx.DatabaseAPI.vehicle.ensureLoaded();
  const after = ctx.DatabaseAPI.vehicle.getAll().length;
  assert.equal(before, after, 'seed harus identik jumlahnya dgn literal (0 data hilang/nambah)');
  assert.equal(ctx.DatabaseAPI.vehicle.isLoaded(), true);
  assert.equal(idb.calls.set, 1, 'harus tulis-balik TEPAT 1x saat seed');
  assert.ok(Array.isArray(idb.store['vehicledb:active']));
});

test('ensureLoaded(): storage sudah terisi -> baca dari situ, TIDAK menimpa/nulis ulang', async () => {
  const custom = [{
    id: 'custom-1', displayName: 'Custom Model',
    torsi: { matchNames: ['custom model'], cats: {} },
    spec: { matchNames: ['custom model'] },
  }];
  const idb = makeIdb(custom);
  const ctx = loadSource([DB_API_FILE], { IDBStore: idb }, ['DatabaseAPI']);
  await ctx.DatabaseAPI.vehicle.ensureLoaded();
  assert.equal(idb.calls.set, 0, 'storage sudah ada isi -> 0 penulisan (bukan seed ulang)');
  const all = ctx.DatabaseAPI.vehicle.getAll();
  assert.equal(all.length, 1);
  assert.equal(all[0].id, 'custom-1');
  const torsi = ctx.DatabaseAPI.vehicle.findTorsiByName('ada custom model di sini');
  assert.ok(torsi);
  assert.deepEqual(torsi.matchNames, ['custom model']);
});

test('ensureLoaded(): dipanggil 2x -> IDBStore.get() cuma dipanggil 1x (cache in-memory, no repeat round-trip)', async () => {
  const idb = makeIdb(null);
  const ctx = loadSource([DB_API_FILE], { IDBStore: idb }, ['DatabaseAPI']);
  await ctx.DatabaseAPI.vehicle.ensureLoaded();
  await ctx.DatabaseAPI.vehicle.ensureLoaded();
  assert.equal(idb.calls.get, 1);
  assert.equal(idb.calls.set, 1);
});

test('invalidateCache(): reset in-memory -> ensureLoaded() berikutnya baca ulang dari storage', async () => {
  const idb = makeIdb(null);
  const ctx = loadSource([DB_API_FILE], { IDBStore: idb }, ['DatabaseAPI']);
  await ctx.DatabaseAPI.vehicle.ensureLoaded();
  assert.equal(ctx.DatabaseAPI.vehicle.isLoaded(), true);
  ctx.DatabaseAPI.vehicle.invalidateCache();
  assert.equal(ctx.DatabaseAPI.vehicle.isLoaded(), false);
  await ctx.DatabaseAPI.vehicle.ensureLoaded();
  assert.equal(idb.calls.get, 2, 'harus read ulang dari IDBStore setelah invalidate');
});

test('TANPA IDBStore sama sekali (env terisolasi) -> ensureLoaded() tidak throw, fallback ke literal seed, isLoaded() tetap jadi true', async () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  assert.equal(typeof ctx.IDBStore, 'undefined');
  await assert.doesNotReject(ctx.DatabaseAPI.vehicle.ensureLoaded());
  assert.equal(ctx.DatabaseAPI.vehicle.isLoaded(), true);
  const torsi = ctx.DatabaseAPI.vehicle.findTorsiByName('Honda Vario 125 CBS');
  assert.ok(torsi);
  assert.ok(torsi.matchNames.includes('vario 125'));
});

test('IDBStore.get() reject (error IndexedDB) -> ensureLoaded() tidak throw, fallback ke literal seed', async () => {
  const idb = { async get() { throw new Error('boom'); }, async set() { return true; } };
  const ctx = loadSource([DB_API_FILE], { IDBStore: idb }, ['DatabaseAPI']);
  await assert.doesNotReject(ctx.DatabaseAPI.vehicle.ensureLoaded());
  assert.equal(ctx.DatabaseAPI.vehicle.isLoaded(), true);
  const torsi = ctx.DatabaseAPI.vehicle.findTorsiByName('Honda BeAT FI hitam');
  assert.ok(torsi);
  assert.ok(torsi.matchNames.includes('beat fi'));
});

test('0 regresi: getAll/getById/findTorsiByName/findSpecByName tetap sync & jalan SEBELUM ensureLoaded() pernah dipanggil sama sekali', () => {
  const idb = makeIdb(null);
  const ctx = loadSource([DB_API_FILE], { IDBStore: idb }, ['DatabaseAPI']);
  // Sengaja TIDAK memanggil ensureLoaded() -- konsumer lama (findTorsiDb() dkk)
  // tidak pernah await apa pun, harus tetap dapat data literal langsung.
  assert.equal(ctx.DatabaseAPI.vehicle.getAll().length > 0, true);
  assert.ok(ctx.DatabaseAPI.vehicle.getById('vario-125'));
  const torsi = ctx.DatabaseAPI.vehicle.findTorsiByName('Honda Vario 125 CBS');
  assert.ok(torsi);
  const spec = ctx.DatabaseAPI.vehicle.findSpecByName('Honda BeAT FI hitam');
  assert.ok(spec);
  assert.equal(idb.calls.get, 0, 'IDBStore belum boleh disentuh sama sekali sebelum ensureLoaded() dipanggil');
});

test('getAll() balikin salinan dangkal, bukan referensi ke cache aktif (mutasi hasil tidak bocor ke sumber)', async () => {
  const idb = makeIdb(null);
  const ctx = loadSource([DB_API_FILE], { IDBStore: idb }, ['DatabaseAPI']);
  await ctx.DatabaseAPI.vehicle.ensureLoaded();
  const a = ctx.DatabaseAPI.vehicle.getAll();
  a.push({ id: 'injected' });
  const b = ctx.DatabaseAPI.vehicle.getAll();
  assert.equal(b.some((r) => r.id === 'injected'), false);
});
