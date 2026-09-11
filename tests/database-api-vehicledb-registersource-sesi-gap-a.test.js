'use strict';
// tests/database-api-vehicledb-registersource-sesi-gap-a.test.js — cakupan
// sesi CODING gap (a) Sesi B (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md
// §2g/§7; desain: DESAIN-SESI-B-GAP-A-VEHICLE-DB-REGISTRASI.md v1664).
//
// Yang dites: (1) DatabaseAPI.vehicle.registerSource() dipanggil &
// hasilnya MENGGANTIKAN VEHICLE_DB_RECORDS literal saat datanya sengaja
// dibuat beda (pola "test override data", sama filosofi
// database-api-master-generic-wiring-followup.test.js) -- baik lewat
// getAll()/getById()/findTorsiByName()/findSpecByName() maupun
// _vehicleModelRecords() (DatabaseAPI.vehicleModel.*); (2) pairing
// toleran torsi-only/spec-only; (3) seed IndexedDB (_vehicleDbDoLoad)
// memakai _vehicleDbRecords() (jadi ikut registered source) saat storage
// kosong; (4) muat KEDUA file (database-api.js + sparepart-servis-b.js)
// bersama -- registerSource() benar2 terpanggil TAPI hasil getAll()/
// findTorsiByName() TETAP IDENTIK dgn sebelum sesi ini (parity, karena
// TORSI_DB+VEHICLE_SPEC_DB == VEHICLE_DB_RECORDS by construction); (5) 0
// regresi -- database-api.js dimuat SENDIRIAN (tanpa sparepart-servis-b.js)
// tetap fallback ke VEHICLE_DB_RECORDS literal seperti sebelumnya
// (Keputusan (A) additive, dokumen desain §5 -- literal TIDAK dihapus).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const DB_API_FILE = 'modules/engine/database-api.js';
const SERVIS_B_FILE = 'modules/vehicle/sparepart-servis-b.js';
const MY_WRENCH_STUB = { minLbft: 10, maxLbft: 80 };

// ---------------------------------------------------------------------
// registerSource() -- API murni di database-api.js
// ---------------------------------------------------------------------

test('registerSource(): dipanggil dgn data BEDA dari VEHICLE_DB_RECORDS -> getAll()/getById() balikin data yang diregistrasi, bukan literal', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  const custom = [{
    id: 'custom-1', displayName: 'Custom Model TEST',
    torsi: { matchNames: ['custom model'], cats: [] },
    spec: { matchNames: ['custom model'] },
  }];
  ctx.DatabaseAPI.vehicle.registerSource(custom);
  const all = ctx.DatabaseAPI.vehicle.getAll();
  assert.equal(all.length, 1);
  assert.equal(all[0].id, 'custom-1');
  assert.equal(ctx.DatabaseAPI.vehicle.getById('custom-1').displayName, 'Custom Model TEST');
  assert.equal(ctx.DatabaseAPI.vehicle.getById('vario-125'), null, 'literal VEHICLE_DB_RECORDS tidak lagi terlihat setelah registerSource()');
});

test('registerSource(): findTorsiByName()/findSpecByName() ikut baca dari data teregistrasi', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  const custom = [{
    id: 'custom-1', displayName: 'Custom Model TEST',
    torsi: { matchNames: ['custom model'], cats: [] },
    spec: { matchNames: ['custom model'] },
  }];
  ctx.DatabaseAPI.vehicle.registerSource(custom);
  const torsi = ctx.DatabaseAPI.vehicle.findTorsiByName('ada custom model di motor saya');
  assert.ok(torsi);
  assert.deepEqual(torsi.matchNames, ['custom model']);
  const spec = ctx.DatabaseAPI.vehicle.findSpecByName('custom model juga di sini');
  assert.ok(spec);
});

test('registerSource(): argumen bukan array -> no-op (data teregistrasi sebelumnya/literal tidak berubah)', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  const before = ctx.DatabaseAPI.vehicle.getAll().length;
  ctx.DatabaseAPI.vehicle.registerSource('bukan array');
  ctx.DatabaseAPI.vehicle.registerSource(null);
  ctx.DatabaseAPI.vehicle.registerSource(undefined);
  assert.equal(ctx.DatabaseAPI.vehicle.getAll().length, before);
});

test('registerSource(): pairing toleran -- entri torsi-only (0 spec) tetap terdaftar, spec undefined', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  const custom = [
    { id: 'torsi-only', displayName: 'Torsi Only Model', torsi: { matchNames: ['torsi only'], cats: [] } },
  ];
  ctx.DatabaseAPI.vehicle.registerSource(custom);
  const rec = ctx.DatabaseAPI.vehicle.getById('torsi-only');
  assert.ok(rec);
  assert.ok(rec.torsi);
  assert.equal(rec.spec, undefined);
  assert.equal(ctx.DatabaseAPI.vehicle.findSpecByName('torsi only'), null);
});

test('registerSource(): pairing toleran -- entri spec-only (0 torsi) tetap terdaftar, torsi undefined', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  const custom = [
    { id: 'spec-only', displayName: 'Spec Only Model', spec: { matchNames: ['spec only'] } },
  ];
  ctx.DatabaseAPI.vehicle.registerSource(custom);
  const rec = ctx.DatabaseAPI.vehicle.getById('spec-only');
  assert.ok(rec);
  assert.ok(rec.spec);
  assert.equal(rec.torsi, undefined);
  assert.equal(ctx.DatabaseAPI.vehicle.findTorsiByName('spec only'), null);
});

test('_vehicleModelRecords() via DatabaseAPI.vehicleModel.getAll(): registered source dipakai walau storage IndexedDB belum pernah dimuat', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  const custom = [{
    id: 'custom-1', displayName: 'Custom Model TEST',
    torsi: { matchNames: ['custom model'], cats: [] },
  }];
  ctx.DatabaseAPI.vehicle.registerSource(custom);
  const models = ctx.DatabaseAPI.vehicleModel.getAll();
  assert.equal(models.length, 1);
  assert.equal(models[0].id, 'custom-1');
  assert.equal(models[0].name, 'Custom Model TEST');
});

// ---------------------------------------------------------------------
// Seed IndexedDB (_vehicleDbDoLoad) -- storage kosong harus seed dari
// registered source (bukan VEHICLE_DB_RECORDS) kalau ada
// ---------------------------------------------------------------------

function makeIdb(initial) {
  const store = initial ? { 'vehicledb:active': initial } : {};
  const calls = { get: 0, set: 0 };
  return {
    store, calls,
    async get(k) { calls.get++; return store[k]; },
    async set(k, v) { calls.set++; store[k] = v; return true; },
  };
}

test('ensureLoaded(): storage kosong + registerSource() sudah dipanggil -> seed IndexedDB dari data teregistrasi, BUKAN VEHICLE_DB_RECORDS', async () => {
  const idb = makeIdb(null);
  const ctx = loadSource([DB_API_FILE], { IDBStore: idb }, ['DatabaseAPI']);
  const custom = [{
    id: 'custom-1', displayName: 'Custom Model TEST',
    torsi: { matchNames: ['custom model'], cats: [] },
    spec: { matchNames: ['custom model'] },
  }];
  ctx.DatabaseAPI.vehicle.registerSource(custom);
  await ctx.DatabaseAPI.vehicle.ensureLoaded();
  assert.equal(idb.calls.set, 1);
  const seeded = idb.store['vehicledb:active'];
  assert.equal(seeded.length, 1);
  assert.equal(seeded[0].id, 'custom-1');
  assert.equal(ctx.DatabaseAPI.vehicle.getAll().length, 1);
});

test('ensureLoaded(): storage kosong TANPA registerSource() -> tetap seed dari VEHICLE_DB_RECORDS literal seperti sebelumnya (0 regresi)', async () => {
  const idb = makeIdb(null);
  const ctx = loadSource([DB_API_FILE], { IDBStore: idb }, ['DatabaseAPI']);
  await ctx.DatabaseAPI.vehicle.ensureLoaded();
  const seeded = idb.store['vehicledb:active'];
  assert.ok(seeded.some((r) => r.id === 'vario-125'));
  assert.ok(seeded.some((r) => r.id === 'beat-fi'));
});

// ---------------------------------------------------------------------
// Muat KEDUA file bersama -- pola nyata di app (database-api.js dimuat
// SEBELUM sparepart-servis-b.js, GROUP_B scripts/build.js)
// ---------------------------------------------------------------------

test('Muat database-api.js + sparepart-servis-b.js bersama: registerSource() terpanggil OTOMATIS (top-level IIFE), 0 error', () => {
  assert.doesNotThrow(() => {
    loadSource([DB_API_FILE, SERVIS_B_FILE], { D: { vehicles: [] }, MY_WRENCH: MY_WRENCH_STUB }, ['DatabaseAPI']);
  });
});

test('Muat KEDUA file bersama: getAll()/findTorsiByName()/findSpecByName() hasilnya IDENTIK dgn sebelum sesi ini (parity vs VEHICLE_DB_RECORDS literal, by construction)', () => {
  const ctx = loadSource([DB_API_FILE, SERVIS_B_FILE], { D: { vehicles: [] }, MY_WRENCH: MY_WRENCH_STUB }, ['DatabaseAPI']);
  const all = ctx.DatabaseAPI.vehicle.getAll();
  assert.equal(all.length, 2);
  assert.ok(all.some((r) => r.id === 'vario-125'));
  assert.ok(all.some((r) => r.id === 'beat-fi'));

  const torsiVario = ctx.DatabaseAPI.vehicle.findTorsiByName('Honda Vario 125 CBS');
  assert.ok(torsiVario);
  assert.ok(torsiVario.matchNames.includes('vario 125'));

  const specBeat = ctx.DatabaseAPI.vehicle.findSpecByName('Honda BeAT FI hitam');
  assert.ok(specBeat);
  assert.ok(specBeat.matchNames.includes('beat fi'));

  // BeAT FI: matchNames torsi vs spec SENGAJA beda (torsi terima alias
  // "vario 110", spec tidak) -- pairing by id TIDAK boleh menyamakan
  // keduanya (lihat dokumen desain §3).
  const beatRec = ctx.DatabaseAPI.vehicle.getById('beat-fi');
  assert.ok(beatRec.torsi.matchNames.includes('vario 110'));
  assert.equal(beatRec.spec.matchNames.includes('vario 110'), false);
});

test('Muat KEDUA file bersama: findVehicleSpec()/findTorsiDb() (sparepart-servis-b.js, konsumen lama) tetap dapat hasil sama seperti lewat DatabaseAPI langsung', () => {
  const ctx = loadSource([DB_API_FILE, SERVIS_B_FILE], { D: { vehicles: [] }, MY_WRENCH: MY_WRENCH_STUB }, ['DatabaseAPI']);
  const torsi = ctx.findTorsiDb('Honda Vario 125');
  assert.ok(torsi);
  assert.ok(torsi.matchNames.includes('vario 125'));
  const spec = ctx.findVehicleSpec('Honda BeAT FI');
  assert.ok(spec);
});

test('0 regresi: database-api.js dimuat SENDIRIAN (tanpa sparepart-servis-b.js) -> registerSource() tidak pernah terpanggil, fallback VEHICLE_DB_RECORDS literal seperti sebelum sesi ini', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  const all = ctx.DatabaseAPI.vehicle.getAll();
  assert.equal(all.length, 2);
  assert.ok(all.some((r) => r.id === 'vario-125'));
  assert.ok(all.some((r) => r.id === 'beat-fi'));
});

test('0 regresi: sparepart-servis-b.js dimuat SENDIRIAN (tanpa database-api.js) -> IIFE registrasi no-op, findTorsiDb()/findVehicleSpec() tetap jalan via literal TORSI_DB/VEHICLE_SPEC_DB', () => {
  const ctx = loadSource([SERVIS_B_FILE], { D: { vehicles: [] }, MY_WRENCH: MY_WRENCH_STUB });
  assert.equal(typeof ctx.DatabaseAPI, 'undefined');
  const torsi = ctx.findTorsiDb('Honda Vario 125');
  assert.ok(torsi);
  const spec = ctx.findVehicleSpec('Honda BeAT FI');
  assert.ok(spec);
});
