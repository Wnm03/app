'use strict';
// tests/database-api-vehiclemodel-storage-sync-followup.test.js — cakupan
// modules/engine/database-api.js, follow-up setelah Sesi B (ROADMAP-
// KONSOLIDASI-DATABASE-SERVIS-v2.md §2c, temuan "🟡 sebagian" Fase 1 poin
// 2): sebelum sesi ini, DatabaseAPI.vehicleModel.getAll()/getById()/
// dbVehicleModelFindByName() SELALU baca VEHICLE_MODELS (turunan statis
// dari VEHICLE_DB_RECORDS literal), tidak pernah ikut Vehicle Database
// aktif (_vehicleDbActiveRecords, sudah storage-aware sejak Sesi B lewat
// dbVehicleGetAll()/dbVehicleGetById()). Sesi ini menutup gap itu lewat
// `_vehicleModelRecords()` — pola loadSource() & gaya test SAMA PERSIS
// tests/database-api-vehicledb-storage-sesi-b.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const FILE = 'modules/engine/database-api.js';

test('sebelum ensureLoaded() dipanggil: vehicleModel tetap dari VEHICLE_MODELS (fallback literal, 0 regresi)', () => {
  const ctx = loadSource([FILE], {}, ['DatabaseAPI', 'VEHICLE_MODELS']);
  const all = ctx.DatabaseAPI.vehicleModel.getAll();
  assert.strictEqual(all.length, ctx.VEHICLE_MODELS.length);
  assert.deepStrictEqual(
    all.map((m) => m.id).sort(),
    ctx.VEHICLE_MODELS.map((m) => m.id).sort()
  );
});

test('setelah ensureLoaded() dgn storage kosong: vehicleModel tetap sama (seed = VEHICLE_DB_RECORDS, sinkron dgn VEHICLE_MODELS)', async () => {
  const store = {};
  const IDBStore = {
    async get(key) { return store[key]; },
    async set(key, val) { store[key] = val; },
  };
  const ctx = loadSource([FILE], { IDBStore }, ['DatabaseAPI', 'VEHICLE_MODELS']);
  await ctx.DatabaseAPI.vehicle.ensureLoaded();
  const all = ctx.DatabaseAPI.vehicleModel.getAll();
  assert.strictEqual(all.length, ctx.VEHICLE_MODELS.length);
  assert.deepStrictEqual(
    all.map((m) => m.id).sort(),
    ctx.VEHICLE_MODELS.map((m) => m.id).sort()
  );
});

test('setelah storage aktif BERUBAH (mis. CRUD Fase 2 nanti menambah model baru): vehicleModel.getAll()/getById() ikut berubah, TIDAK lagi beku di VEHICLE_MODELS lama', async () => {
  const modelBaru = {
    id: 'model-baru-uji',
    displayName: 'Honda Model Baru (Uji)',
    torsi: { matchNames: ['model baru uji'] },
  };
  const store = {};
  const IDBStore = {
    async get(key) { return store[key]; },
    async set(key, val) { store[key] = val; },
  };
  const ctx = loadSource([FILE], { IDBStore }, ['DatabaseAPI', 'VEHICLE_MODELS']);

  // Muat sekali (seed dari literal, ditulis-balik ke storage).
  await ctx.DatabaseAPI.vehicle.ensureLoaded();
  assert.strictEqual(ctx.DatabaseAPI.vehicleModel.getById('model-baru-uji'), null, 'belum ada sebelum storage diubah');

  // Simulasikan penulis lain (CRUD) menambah 1 record ke storage aktif,
  // lalu invalidateCache() supaya baca ulang (pola sama komentar
  // dbVehicleInvalidateCache() di database-api.js).
  const current = await IDBStore.get('vehicledb:active');
  await IDBStore.set('vehicledb:active', current.concat([modelBaru]));
  ctx.DatabaseAPI.vehicle.invalidateCache();
  await ctx.DatabaseAPI.vehicle.ensureLoaded();

  const found = ctx.DatabaseAPI.vehicleModel.getById('model-baru-uji');
  assert.ok(found, 'vehicleModel.getById() harus ikut lihat record baru dari storage aktif');
  assert.strictEqual(found.name, 'Honda Model Baru (Uji)');
  assert.strictEqual(found.manufacturerId, 'honda');
  assert.deepStrictEqual(found.matchNames, ['model baru uji']);

  const allAfter = ctx.DatabaseAPI.vehicleModel.getAll();
  assert.strictEqual(allAfter.length, ctx.VEHICLE_MODELS.length + 1, 'getAll() harus ikut bertambah 1');
});

test('dbVehicleModelFindByName(): ikut cari di storage aktif (bukan cuma VEHICLE_MODELS literal beku)', async () => {
  const modelBaru = {
    id: 'model-baru-uji-2',
    displayName: 'Honda Model Baru 2 (Uji)',
    torsi: { matchNames: ['model baru dua'] },
  };
  const store = {};
  const IDBStore = {
    async get(key) { return store[key]; },
    async set(key, val) { store[key] = val; },
  };
  const ctx = loadSource([FILE], { IDBStore }, ['dbVehicleModelFindByName', 'DatabaseAPI']);

  await ctx.DatabaseAPI.vehicle.ensureLoaded();
  assert.strictEqual(ctx.dbVehicleModelFindByName('Motor Model Baru Dua Saya'), null);

  const current = await IDBStore.get('vehicledb:active');
  await IDBStore.set('vehicledb:active', current.concat([modelBaru]));
  ctx.DatabaseAPI.vehicle.invalidateCache();
  await ctx.DatabaseAPI.vehicle.ensureLoaded();

  const found = ctx.dbVehicleModelFindByName('Motor Model Baru Dua Saya');
  assert.ok(found, 'findByName harus ikut cari di storage aktif setelah reload');
  assert.strictEqual(found.id, 'model-baru-uji-2');
});

test('getAll()/getById() tetap balikin salinan dangkal — mutasi hasil tidak bocor ke sumber (pola sama dbVehicleGetAll())', () => {
  const ctx = loadSource([FILE], {}, ['DatabaseAPI']);
  const all1 = ctx.DatabaseAPI.vehicleModel.getAll();
  const lenBefore = all1.length;
  all1.push({ id: 'suntikan-palsu' });
  assert.strictEqual(ctx.DatabaseAPI.vehicleModel.getAll().length, lenBefore, 'mutasi hasil getAll() tidak boleh bocor ke sumber');
});

test('manufacturer TIDAK berubah sesi ini (MANUFACTURERS tetap hardcoded 1 record, di luar cakupan storage-sync)', () => {
  const ctx = loadSource([FILE], {}, ['DatabaseAPI']);
  const all = ctx.DatabaseAPI.manufacturer.getAll();
  assert.strictEqual(all.length, 1);
  assert.strictEqual(all[0].id, 'honda');
});
