'use strict';
// tests/database-api-vehicledb-ensureloaded-dedup-sesi-b-followup.test.js —
// Sesi B-followup (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 baris 349,
// gap (c) "konsumen findTorsiDb/findVehicleSpec masih baca sync tanpa await
// ensureLoaded()"). Setelah diaudit, konsumen sync (resolveCatGroup() dkk)
// SEMUANYA dipanggil dari jalur render UI yang baru bisa jalan SETELAH
// load() selesai, dan load() SUDAH await DatabaseAPI.vehicle.ensureLoaded()
// -- mengubah resolveCatGroup() dkk jadi async utk await langsung di situ
// butuh refactor besar ke rantai render, DITOLAK (di luar cakupan "1 gap
// kecil"). Perbaikan yang diambil: dedup pemanggilan ensureLoaded() lewat
// _vehicleDbLoadPromise, supaya kalau lebih dari 1 titik memanggilnya
// "bersamaan" sebelum yang pertama selesai, cuma ADA SATU round-trip
// IndexedDB yang benar-benar jalan -- mengurangi risiko race storage utk
// kasus itu (bukan menghapusnya 100%, tapi bukan itu klaim sesi ini).
//
// Cakupan test ini CUMA dedup call ensureLoaded() (fungsi baru
// _vehicleDbDoLoad() + _vehicleDbLoadPromise) -- tidak menyentuh/mengubah
// test kontrak lama (database-api-vehicledb-storage-sesi-b.test.js), yang
// masih 100% pass tanpa modifikasi (dikonfirmasi dijalankan bersamaan
// sebelum sesi ini ditutup).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const DB_API_FILE = 'modules/engine/database-api.js';

function makeIdb(initial, delayMs) {
  const store = initial ? { 'vehicledb:active': initial } : {};
  const calls = { get: 0, set: 0 };
  return {
    store,
    calls,
    async get(k) {
      calls.get++;
      if (delayMs) await new Promise((r) => setTimeout(r, 0));
      return store[k];
    },
    async set(k, v) {
      calls.set++;
      store[k] = v;
      return true;
    },
  };
}

test('ensureLoaded() dipanggil 2x BERSAMAAN (belum ada yang selesai) -> IDBStore.get()/set() tetap cuma 1x, kedua pemanggil dapat data sama', async () => {
  const idb = makeIdb(null, true);
  const ctx = loadSource([DB_API_FILE], { IDBStore: idb }, ['DatabaseAPI']);
  const p1 = ctx.DatabaseAPI.vehicle.ensureLoaded();
  const p2 = ctx.DatabaseAPI.vehicle.ensureLoaded();
  assert.notEqual(p1, undefined);
  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(idb.calls.get, 1, 'dipanggil 2x bersamaan tidak boleh memicu 2x baca IndexedDB');
  assert.equal(idb.calls.set, 1, 'dipanggil 2x bersamaan tidak boleh memicu 2x tulis-balik seed');
  assert.equal(r1.length, r2.length);
  assert.equal(ctx.DatabaseAPI.vehicle.isLoaded(), true);
});

test('invalidateCache() mereset dedup guard -- ensureLoaded() sesudahnya beneran baca ulang, bukan promise lama', async () => {
  const idb = makeIdb(null);
  const ctx = loadSource([DB_API_FILE], { IDBStore: idb }, ['DatabaseAPI']);
  await ctx.DatabaseAPI.vehicle.ensureLoaded();
  assert.equal(idb.calls.get, 1);
  ctx.DatabaseAPI.vehicle.invalidateCache();
  assert.equal(ctx.DatabaseAPI.vehicle.isLoaded(), false);
  await ctx.DatabaseAPI.vehicle.ensureLoaded();
  assert.equal(idb.calls.get, 2, 'setelah invalidateCache(), ensureLoaded() berikutnya harus baca ulang IndexedDB (bukan kebagian promise lama yang sudah selesai)');
});

test('0 regresi: kontrak lama tetap berlaku -- sebelum ensureLoaded() pernah dipanggil, IDBStore tidak disentuh sama sekali (getter sync TIDAK memicu load sendiri)', () => {
  const idb = makeIdb(null);
  const ctx = loadSource([DB_API_FILE], { IDBStore: idb }, ['DatabaseAPI']);
  assert.equal(ctx.DatabaseAPI.vehicle.getAll().length > 0, true);
  ctx.DatabaseAPI.vehicle.findTorsiByName('Honda Vario 125 CBS');
  ctx.DatabaseAPI.vehicle.findSpecByName('Honda BeAT FI hitam');
  assert.equal(idb.calls.get, 0, 'getter sync tidak boleh memicu ensureLoaded() otomatis -- itu keputusan eksplisit sesi ini (lihat catatan file), bukan celah yang kelewat');
});
