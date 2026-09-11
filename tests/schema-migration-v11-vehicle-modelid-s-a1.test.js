'use strict';
// tests/schema-migration-v11-vehicle-modelid-s-a1.test.js — cakupan
// modules/shared/features-helpers-global-security.js migrasi toVersion:11
// (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi A1): backfill
// D.vehicles[].modelId dari DatabaseAPI.vehicleModel.findByName(). Pola
// test murni panggil migrate(d) langsung (bukan lewat runDataMigrations()
// yang baca/tulis D global) — konsisten dgn migrasi-migrasi lama lain yg
// juga di-guard typeof (toVersion:4/6/7).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const DB_API_FILE = 'modules/engine/database-api.js';
const SCHEMA_FILE = 'modules/shared/features-helpers-global-security.js';

// Stub minimal supaya evaluasi top-level `let D = {...}` di
// features-helpers-global-security.js tidak ReferenceError (D itu sendiri
// TIDAK dipakai di test ini, cuma harus berhasil ter-parse).
const STUB_CONTEXT = {
  DEFAULT_COBEK_KATEGORI: [],
  DEFAULT_ACCOUNTS: [],
  DEFAULT_CATS: { income: [], expense: [] },
  DEFAULT_SPAREPARTS: [],
};

function getMigration11(files) {
  const ctx = loadSource(files, { ...STUB_CONTEXT }, ['DATA_MIGRATIONS', 'SCHEMA_VERSION']);
  const m = ctx.DATA_MIGRATIONS.find((mig) => mig.toVersion === 11);
  return { migration: m, ctx };
}

test('SCHEMA_VERSION dinaikkan ke 11', () => {
  const { ctx } = getMigration11([SCHEMA_FILE]);
  assert.strictEqual(ctx.SCHEMA_VERSION, 11);
});

test('migrasi toVersion:11 ada, desc menyebut Sesi A1/modelId', () => {
  const { migration } = getMigration11([SCHEMA_FILE]);
  assert.ok(migration, 'migrasi toVersion:11 harus terdaftar di DATA_MIGRATIONS');
  assert.match(migration.desc, /modelId/);
});

test('GUARD: DatabaseAPI belum termuat (mis. test terisolasi) — migrate() no-op, tidak throw', () => {
  const { migration } = getMigration11([SCHEMA_FILE]); // database-api.js SENGAJA tidak dimuat
  const d = { vehicles: [{ id: 'veh_1', name: 'Vario 125' }] };
  assert.doesNotThrow(() => migration.migrate(d));
  assert.strictEqual(d.vehicles[0].modelId, undefined, 'tanpa DatabaseAPI, modelId tidak boleh terisi (bukan tebakan)');
});

test('backfill modelId via DatabaseAPI.vehicleModel.findByName() ketika match ditemukan', () => {
  const { migration } = getMigration11([DB_API_FILE, SCHEMA_FILE]);
  const d = { vehicles: [{ id: 'veh_1', name: 'Motor Vario 125 Merah' }, { id: 'veh_2', name: 'BeAT FI hitam' }] };
  migration.migrate(d);
  assert.strictEqual(d.vehicles[0].modelId, 'vario-125');
  assert.strictEqual(d.vehicles[1].modelId, 'beat-fi');
});

test('tidak match (mis. merk lain) — modelId dilewati, 0 tebakan', () => {
  const { migration } = getMigration11([DB_API_FILE, SCHEMA_FILE]);
  const d = { vehicles: [{ id: 'veh_1', name: 'Yamaha NMAX' }] };
  migration.migrate(d);
  assert.strictEqual(d.vehicles[0].modelId, undefined);
});

test('entri yang SUDAH punya modelId dilewati (tidak ditimpa)', () => {
  const { migration } = getMigration11([DB_API_FILE, SCHEMA_FILE]);
  const d = { vehicles: [{ id: 'veh_1', name: 'Vario 125', modelId: 'sudah-ada' }] };
  migration.migrate(d);
  assert.strictEqual(d.vehicles[0].modelId, 'sudah-ada');
});

test('d.vehicles kosong/tidak ada — no-op aman', () => {
  const { migration } = getMigration11([DB_API_FILE, SCHEMA_FILE]);
  assert.doesNotThrow(() => migration.migrate({}));
  assert.doesNotThrow(() => migration.migrate({ vehicles: [] }));
});

test('field lain di tiap D.vehicles entry TIDAK diubah/dihapus (murni tambah modelId)', () => {
  const { migration } = getMigration11([DB_API_FILE, SCHEMA_FILE]);
  const d = { vehicles: [{ id: 'veh_1', name: 'Vario 125', emoji: '🏍️', serviceIntervalKm: 3000 }] };
  migration.migrate(d);
  assert.strictEqual(d.vehicles[0].emoji, '🏍️');
  assert.strictEqual(d.vehicles[0].serviceIntervalKm, 3000);
  assert.strictEqual(d.vehicles[0].modelId, 'vario-125');
});
