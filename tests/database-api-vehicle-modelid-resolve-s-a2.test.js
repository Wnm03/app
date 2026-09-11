'use strict';
// tests/database-api-vehicle-modelid-resolve-s-a2.test.js — cakupan Sesi A2
// (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7): titik baca
// DatabaseAPI.vehicle.findTorsiByName()/findSpecByName() + wrapper
// findTorsiDb()/findVehicleSpec() (sparepart-servis-b.js) sekarang terima
// `modelId` opsional (dari D.vehicles[].modelId, Sesi A1) — exact match
// LANGSUNG by id kalau diisi & valid, fallback ke substring name-match
// (perilaku lama, 0 berubah) kalau tidak.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const DB_API_FILE = 'modules/engine/database-api.js';
const SPAREPART_B_FILE = 'modules/vehicle/sparepart-servis-b.js';

// --- DatabaseAPI.vehicle.findTorsiByName()/findSpecByName() langsung ---

test('findTorsiByName(vehName, modelId): modelId valid -> exact match by id, name diabaikan sepenuhnya', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  // vehName sengaja nyasar (tidak match apa pun) -- modelId yang menentukan.
  const torsi = ctx.DatabaseAPI.vehicle.findTorsiByName('Motor Tidak Dikenal', 'vario-125');
  assert.ok(torsi);
  assert.ok(torsi.matchNames.includes('vario 125'));
});

test('findSpecByName(vehName, modelId): modelId valid -> exact match by id', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  const spec = ctx.DatabaseAPI.vehicle.findSpecByName('Motor Tidak Dikenal', 'beat-fi');
  assert.ok(spec);
  assert.ok(spec.matchNames.includes('beat fi'));
});

test('modelId tidak dikenal (typo/id lama) -> fallback ke name-match seperti biasa, 0 error', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  const torsi = ctx.DatabaseAPI.vehicle.findTorsiByName('Honda Vario 125 CBS', 'id-yang-tidak-ada');
  assert.ok(torsi, 'harus tetap ketemu lewat fallback name-match');
  assert.ok(torsi.matchNames.includes('vario 125'));
});

test('modelId kosong/undefined -> perilaku 100% sama seperti sebelum Sesi A2 (name-match murni)', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  assert.deepStrictEqual(
    JSON.stringify(ctx.DatabaseAPI.vehicle.findTorsiByName('Honda Vario 125 CBS')),
    JSON.stringify(ctx.DatabaseAPI.vehicle.findTorsiByName('Honda Vario 125 CBS', undefined))
  );
  assert.strictEqual(ctx.DatabaseAPI.vehicle.findTorsiByName('Honda PCX 160'), null);
  assert.strictEqual(ctx.DatabaseAPI.vehicle.findTorsiByName('', ''), null);
});

test('modelId menang atas name yang sebetulnya match ke model LAIN (bukti exact-match diprioritaskan, bukan cuma dipakai kalau name gagal)', () => {
  const ctx = loadSource([DB_API_FILE], {}, ['DatabaseAPI']);
  // vehName mengandung 'vario 125' (match ke vario-125 kalau name-only),
  // tapi modelId eksplisit nunjuk beat-fi -- modelId harus menang.
  const torsi = ctx.DatabaseAPI.vehicle.findTorsiByName('Honda Vario 125 (dulu ganti ke BeAT)', 'beat-fi');
  assert.ok(torsi.matchNames.includes('beat fi'));
  assert.ok(!torsi.matchNames.includes('vario 125') || torsi.matchNames.includes('vario 110'), 'harus torsi BeAT FI (menyertakan vario 110 di matchNames-nya), bukan torsi Vario 125');
});

// --- wrapper findTorsiDb()/findVehicleSpec() (sparepart-servis-b.js) ---

function loadWrapperCtx(withDatabaseAPI) {
  const files = withDatabaseAPI
    ? [DB_API_FILE, SPAREPART_B_FILE]
    : [SPAREPART_B_FILE];
  return loadSource(
    files,
    { MY_WRENCH: { minLbft: 10, maxLbft: 80 } },
    withDatabaseAPI ? ['DatabaseAPI', 'TORSI_DB', 'VEHICLE_SPEC_DB'] : ['TORSI_DB', 'VEHICLE_SPEC_DB'],
  );
}

test('findTorsiDb(vehName, modelId): modelId diteruskan ke DatabaseAPI, exact match', () => {
  const ctx = loadWrapperCtx(true);
  const torsi = ctx.findTorsiDb('nama sembarang', 'vario-125');
  assert.ok(torsi);
  assert.ok(torsi.matchNames.includes('vario 125'));
});

test('findVehicleSpec(vehName, modelId): modelId diteruskan ke DatabaseAPI, exact match', () => {
  const ctx = loadWrapperCtx(true);
  const spec = ctx.findVehicleSpec('nama sembarang', 'beat-fi');
  assert.ok(spec);
  assert.ok(spec.matchNames.includes('beat fi'));
});

test('findTorsiDb()/findVehicleSpec() TANPA DatabaseAPI (fallback literal) -- modelId diabaikan, 0 regresi ke perilaku lama', () => {
  const ctx = loadWrapperCtx(false);
  assert.equal(typeof ctx.DatabaseAPI, 'undefined');
  const torsi = ctx.findTorsiDb('Honda Vario 125 CBS', 'modelid-apa-saja-diabaikan');
  assert.ok(torsi);
  assert.ok(torsi.matchNames.includes('vario 125'));
  const spec = ctx.findVehicleSpec('Honda BeAT FI hitam', 'modelid-apa-saja-diabaikan');
  assert.ok(spec);
  assert.ok(spec.matchNames.includes('beat fi'));
});

test('findTorsiDb(undefined, undefined) / findVehicleSpec(undefined, undefined) -- null, tidak throw (guard "!vehName&&!modelId" baru)', () => {
  const ctx = loadWrapperCtx(true);
  assert.strictEqual(ctx.findTorsiDb(undefined, undefined), null);
  assert.strictEqual(ctx.findVehicleSpec(undefined, undefined), null);
  assert.strictEqual(ctx.findTorsiDb(null, null), null);
});

test('findTorsiDb(vehName tanpa modelId): perilaku identik sebelum Sesi A2 (1 argumen tetap jalan)', () => {
  const ctx = loadWrapperCtx(true);
  const torsi = ctx.findTorsiDb('Honda Vario 125 CBS 2023');
  assert.ok(torsi);
  assert.ok(torsi.matchNames.includes('vario 125'));
  assert.strictEqual(ctx.findTorsiDb('Honda PCX 160'), null);
});
