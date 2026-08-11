'use strict';
// tests/asset-vehicle-view-action-s509c.test.js — cakupan S509c (Asset ->
// "Lihat di Kendaraan", PROMPT IMPLEMENTASI S509c, simetris dgn S509b).
// Fokus test: resolveVehicleByAssetId() (fungsi murni di
// modules/vehicle/vehicle-core.js, tidak sentuh DOM) — pola sama persis
// tests/vehicle-asset-identity-link-s506.test.js. Rendering tombol di
// assetModal (Aset._renderVehicleLinkAction, baca/tulis document.getElementById)
// & wrapper assetActionViewVehicle (panggil editVehicle() yang juga baca DOM)
// sengaja TIDAK dites di sini sesuai batasan loadSource.js (lihat catatan di
// file itu), cukup diverifikasi manual/smoke-test — sama batasan yang berlaku
// utk openVehicleModal/editVehicle/saveVehicle di s506.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(vehicles) {
  const D = { vehicles: vehicles || [] };
  return loadSource(
    ['modules/vehicle/vehicle-core.js'],
    { D, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s) },
    ['resolveVehicleByAssetId']
  );
}

// 1) assetId kosong/undefined -> null
test('resolveVehicleByAssetId: null kalau assetId kosong/undefined', () => {
  const ctx = makeCtx([{ id: 'veh_1', assetId: 'asset_1' }]);
  assert.equal(ctx.resolveVehicleByAssetId(''), null);
  assert.equal(ctx.resolveVehicleByAssetId(undefined), null);
  assert.equal(ctx.resolveVehicleByAssetId(null), null);
});

// 2) Tidak ada vehicle manapun yang assetId-nya match -> null
test('resolveVehicleByAssetId: null kalau tidak ada vehicle yang assetId-nya match', () => {
  const ctx = makeCtx([{ id: 'veh_1', assetId: 'asset_9' }, { id: 'veh_2' }]);
  assert.equal(ctx.resolveVehicleByAssetId('asset_1'), null);
});

// 3) Ada 1 vehicle yang match -> balikin vehicle itu
test('resolveVehicleByAssetId: balikin vehicle kalau assetId match', () => {
  const veh = { id: 'veh_1', assetId: 'asset_1', name: 'Vario 125' };
  const ctx = makeCtx([{ id: 'veh_0' }, veh, { id: 'veh_2', assetId: 'asset_2' }]);
  assert.deepEqual(ctx.resolveVehicleByAssetId('asset_1'), veh);
});

// 4) Banyak vehicle, hanya 1 yang assetId match -> balikin yang benar (bukan yang lain)
test('resolveVehicleByAssetId: pilih vehicle yang benar di antara banyak vehicle', () => {
  const target = { id: 'veh_3', assetId: 'asset_target', name: 'Beat' };
  const ctx = makeCtx([
    { id: 'veh_1', assetId: 'asset_other1' },
    { id: 'veh_2', assetId: 'asset_other2' },
    target,
    { id: 'veh_4', assetId: 'asset_other3' },
  ]);
  assert.deepEqual(ctx.resolveVehicleByAssetId('asset_target'), target);
});

// 5) Edge case data kotor: lebih dari 1 vehicle share assetId sama -> balikin
// MATCH PERTAMA (urutan D.vehicles), didokumentasikan eksplisit, tidak crash.
test('resolveVehicleByAssetId: assetId dipakai >1 vehicle (data kotor) -> balikin match pertama, tidak crash', () => {
  const first = { id: 'veh_1', assetId: 'asset_shared', name: 'Pertama' };
  const second = { id: 'veh_2', assetId: 'asset_shared', name: 'Kedua' };
  const ctx = makeCtx([first, second]);
  assert.deepEqual(ctx.resolveVehicleByAssetId('asset_shared'), first);
});

// 6) D.vehicles kosong / tidak ada -> null, tidak crash
test('resolveVehicleByAssetId: D.vehicles kosong -> null, tidak crash', () => {
  const ctx = makeCtx([]);
  assert.equal(ctx.resolveVehicleByAssetId('asset_1'), null);
});
