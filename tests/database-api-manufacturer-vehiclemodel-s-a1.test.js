'use strict';
// tests/database-api-manufacturer-vehiclemodel-s-a1.test.js — cakupan
// modules/engine/database-api.js, Sesi A1 (ROADMAP-KONSOLIDASI-DATABASE-
// SERVIS-v2.md §7): manufacturers + vehicle_models relasional, fondasi
// murni. Pola loadSource() & struktur test SAMA PERSIS
// tests/database-api-vehicle-migration.test.js (Sesi 1/N sebelumnya).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const FILE = 'modules/engine/database-api.js';

test('MANUFACTURERS: 1 record Honda, VEHICLE_MODELS diturunkan 1:1 dari VEHICLE_DB_RECORDS', () => {
  const ctx = loadSource([FILE], {}, ['MANUFACTURERS', 'VEHICLE_MODELS', 'VEHICLE_DB_RECORDS']);
  assert.strictEqual(ctx.MANUFACTURERS.length, 1);
  // Perbandingan field-per-field (bukan deepStrictEqual objek utuh) --
  // objek ini dibuat di sandbox vm terpisah (Object lintas-realm), jadi
  // deepStrictEqual pada objek utuh bisa gagal murni krn constructor/
  // prototype beda walau isi field identik. Bukan bug data, bug harness.
  assert.strictEqual(ctx.MANUFACTURERS[0].id, 'honda');
  assert.strictEqual(ctx.MANUFACTURERS[0].name, 'Honda');

  assert.strictEqual(ctx.VEHICLE_MODELS.length, ctx.VEHICLE_DB_RECORDS.length);
  assert.deepStrictEqual(
    ctx.VEHICLE_MODELS.map((m) => m.id).sort(),
    ctx.VEHICLE_DB_RECORDS.map((r) => r.id).sort()
  );
  ctx.VEHICLE_MODELS.forEach((m) => assert.strictEqual(m.manufacturerId, 'honda'));
});

test('MANUFACTURERS/VEHICLE_MODELS: matchNames vehicleModel identik dgn torsi.matchNames record asal (0 data ditulis ulang)', () => {
  const ctx = loadSource([FILE], {}, ['VEHICLE_MODELS', 'VEHICLE_DB_RECORDS']);
  const vario = ctx.VEHICLE_MODELS.find((m) => m.id === 'vario-125');
  const varioSrc = ctx.VEHICLE_DB_RECORDS.find((r) => r.id === 'vario-125');
  assert.deepStrictEqual(vario.matchNames, varioSrc.torsi.matchNames);
  assert.strictEqual(vario.name, varioSrc.displayName);
});

test('API: DatabaseAPI.manufacturer.getAll()/getById() — salinan, tidak bocor ke sumber', () => {
  const ctx = loadSource([FILE], {}, ['DatabaseAPI']);
  const all1 = ctx.DatabaseAPI.manufacturer.getAll();
  assert.strictEqual(all1.length, 1);
  all1.push({ id: 'suntikan-palsu' });
  assert.strictEqual(ctx.DatabaseAPI.manufacturer.getAll().length, 1, 'mutasi hasil getAll() tidak boleh bocor ke sumber');

  assert.strictEqual(ctx.DatabaseAPI.manufacturer.getById('honda').name, 'Honda');
  assert.strictEqual(ctx.DatabaseAPI.manufacturer.getById('yamaha'), null);
  assert.strictEqual(ctx.DatabaseAPI.manufacturer.getById(''), null);
  assert.strictEqual(ctx.DatabaseAPI.manufacturer.getById(null), null);
});

test('API: DatabaseAPI.vehicleModel.getAll()/getById() — salinan, tidak bocor ke sumber', () => {
  const ctx = loadSource([FILE], {}, ['DatabaseAPI']);
  const all1 = ctx.DatabaseAPI.vehicleModel.getAll();
  assert.strictEqual(all1.length, 2);
  all1.push({ id: 'suntikan-palsu' });
  assert.strictEqual(ctx.DatabaseAPI.vehicleModel.getAll().length, 2, 'mutasi hasil getAll() tidak boleh bocor ke sumber');

  assert.strictEqual(ctx.DatabaseAPI.vehicleModel.getById('vario-125').name, 'Honda Vario 125 (KZR)');
  assert.strictEqual(ctx.DatabaseAPI.vehicleModel.getById('beat-fi').name, 'Honda BeAT FI Gen 1');
  assert.strictEqual(ctx.DatabaseAPI.vehicleModel.getById('tidak-ada'), null);
  assert.strictEqual(ctx.DatabaseAPI.vehicleModel.getById(''), null);
});

test('API: DatabaseAPI.vehicleModel.findByName() — substring match case-insensitive, pola sama findTorsiByName()', () => {
  const ctx = loadSource([FILE], {}, ['DatabaseAPI']);
  assert.strictEqual(ctx.DatabaseAPI.vehicleModel.findByName('Honda Vario 125 CBS 2023').id, 'vario-125');
  assert.strictEqual(ctx.DatabaseAPI.vehicleModel.findByName('motor BEAT FI hitam').id, 'beat-fi');
  // asimetri asli dipertahankan (matchNames diturunkan dari torsi.matchNames): BeAT FI juga cocok utk 'vario 110'
  assert.strictEqual(ctx.DatabaseAPI.vehicleModel.findByName('Honda Vario 110 ESP').id, 'beat-fi');
  assert.strictEqual(ctx.DatabaseAPI.vehicleModel.findByName('Honda PCX 160'), null);
  assert.strictEqual(ctx.DatabaseAPI.vehicleModel.findByName(''), null);
  assert.strictEqual(ctx.DatabaseAPI.vehicleModel.findByName(null), null);
});

test('WINDOW: DatabaseAPI.manufacturer/vehicleModel ikut terekspos ke window (0 namespace baru terlewat)', () => {
  const windowObj = {};
  loadSource([FILE], { window: windowObj }, []);
  assert.strictEqual(typeof windowObj.DatabaseAPI.manufacturer.getAll, 'function');
  assert.strictEqual(typeof windowObj.DatabaseAPI.vehicleModel.getAll, 'function');
  assert.strictEqual(typeof windowObj.DatabaseAPI.vehicleModel.findByName, 'function');
});
