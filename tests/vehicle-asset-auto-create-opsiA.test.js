'use strict';
// tests/vehicle-asset-auto-create-opsiA.test.js — cakupan patch "Auto-Create
// Asset dari Kendaraan SELF (Opsi A)" (lihat PATCH-README-vehicle-asset-auto-
// create-opsi-a.md & AUDIT-SYNC-ASET-KEPEMILIKAN-SENDIRI-KE-BUKU-ASET.md).
// Fokus: _autoCreateVehicleAsset(v,ownership) & _syncVehNilaiWrap(v) di
// modules/vehicle/vehicle-core.js. Pola harness sama seperti
// vehicle-asset-identity-link-s506.test.js (loadSource, D minimal, document
// di-mock cukup untuk getElementById('vehNilai')/('vehNilaiWrap')).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, domValues) {
  const values = Object.assign({ vehNilai: '' }, domValues || {});
  const els = {};
  const getEl = (id) => {
    if (!els[id]) els[id] = { value: values[id] !== undefined ? values[id] : '', style: {} };
    return els[id];
  };
  let _n = 0;
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/vehicle/vehicle-core.js'],
    {
      D,
      document: { getElementById: getEl },
      escapeHtml: (s) => String(s),
      sameId: (a, b) => String(a) === String(b),
      uid: () => 'asset_auto_' + (_n += 1),
      todayStr: () => '2026-08-29',
    },
    ['resolveVehicleAssetLink', 'isVehicleOwnershipSelf']
  );
  ctx.__els = els;
  return ctx;
}

test('_autoCreateVehicleAsset: kendaraan baru ownership SELF & assetId kosong -> auto-create 1 entry D.assets', () => {
  const D = { assets: [] };
  const ctx = makeCtx(D);
  const v = { id: 'veh_1', name: 'Vario 125' };
  ctx._autoCreateVehicleAsset(v, 'SELF');

  assert.equal(D.assets.length, 1);
  const a = D.assets[0];
  assert.equal(a.jenis, 'Kendaraan');
  assert.equal(a.name, 'Vario 125');
  assert.equal(a.ownership, 'SELF');
  assert.equal(a.nilai, 0, 'field #vehNilai kosong -> nilai default 0, TIDAK memaksa isi angka');
  assert.equal(a.autoCreatedFromVehicleId, 'veh_1');
  assert.equal(v.assetId, a.id, 'v.assetId harus diarahkan ke aset baru');
});

test('_autoCreateVehicleAsset: nilai awal aset diambil dari field #vehNilai kalau diisi', () => {
  const D = { assets: [] };
  const ctx = makeCtx(D, { vehNilai: '15000000' });
  const v = { id: 'veh_2', name: 'Brio' };
  ctx._autoCreateVehicleAsset(v, 'SELF');

  assert.equal(D.assets[0].nilai, 15000000);
});

test('_autoCreateVehicleAsset: ownership BUKAN SELF & assetId kosong -> tidak membuat apa pun', () => {
  const D = { assets: [] };
  const ctx = makeCtx(D);
  const v = { id: 'veh_3', name: 'Motor Kantor' };
  ctx._autoCreateVehicleAsset(v, 'FAMILY');

  assert.equal(D.assets.length, 0);
  assert.equal(v.assetId, undefined);
});

test('_autoCreateVehicleAsset: v.assetId sudah tertaut ke aset auto-created milik kendaraan ini -> ownership aset ikut disinkron', () => {
  const asset = { id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125', ownership: 'SELF', autoCreatedFromVehicleId: 'veh_1' };
  const D = { assets: [asset] };
  const ctx = makeCtx(D);
  const v = { id: 'veh_1', name: 'Vario 125', assetId: 'asset_1' };

  ctx._autoCreateVehicleAsset(v, 'FAMILY');

  assert.equal(D.assets.length, 1, 'tidak ada aset baru dibuat / tidak ada yang dihapus (no cascade-delete)');
  assert.equal(asset.ownership, 'FAMILY', 'ownership aset disinkron satu arah mengikuti kendaraan');
});

test('_autoCreateVehicleAsset: v.assetId tertaut ke aset hasil LINK MANUAL (bukan auto-created milik kendaraan ini) -> tidak disentuh sama sekali', () => {
  const asset = { id: 'asset_9', jenis: 'Kendaraan', name: 'Brio Lama', ownership: 'FAMILY' };
  const D = { assets: [asset] };
  const ctx = makeCtx(D);
  const v = { id: 'veh_9', name: 'Brio', assetId: 'asset_9' };

  ctx._autoCreateVehicleAsset(v, 'SELF');

  assert.equal(asset.ownership, 'FAMILY', 'ownership aset hasil link manual tidak boleh ikut berubah walau ownership kendaraan SELF');
  assert.equal(asset.name, 'Brio Lama', 'nama aset hasil link manual tidak boleh ikut berubah');
  assert.equal(D.assets.length, 1);
});

test('_autoCreateVehicleAsset: kendaraan di-rename -> nama aset auto-created ikut disinkron (gap audit lanjutan)', () => {
  const asset = { id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125', ownership: 'SELF', autoCreatedFromVehicleId: 'veh_1' };
  const D = { assets: [asset] };
  const ctx = makeCtx(D);
  const v = { id: 'veh_1', name: 'Vario 125 (Adik)', assetId: 'asset_1' };

  ctx._autoCreateVehicleAsset(v, 'SELF');

  assert.equal(asset.name, 'Vario 125 (Adik)', 'nama aset auto-created harus ikut sinkron ke nama kendaraan terbaru');
});

test('_autoCreateVehicleAsset: aset auto-created milik KENDARAAN LAIN -> nama tidak ikut disinkron walau v.name sama polanya', () => {
  const assetLain = { id: 'asset_5', jenis: 'Kendaraan', name: 'Motor Lama', ownership: 'SELF', autoCreatedFromVehicleId: 'veh_lain' };
  const D = { assets: [assetLain] };
  const ctx = makeCtx(D);
  const v = { id: 'veh_1', name: 'Nama Baru', assetId: 'asset_5' };

  ctx._autoCreateVehicleAsset(v, 'SELF');

  assert.equal(assetLain.name, 'Motor Lama', 'nama aset auto-created kendaraan lain tidak boleh ikut tersinkron');
});

test('_autoCreateVehicleAsset: aset lain punya autoCreatedFromVehicleId milik KENDARAAN LAIN -> tidak ikut disinkron', () => {
  const assetLain = { id: 'asset_5', jenis: 'Kendaraan', ownership: 'SELF', autoCreatedFromVehicleId: 'veh_lain' };
  const D = { assets: [assetLain] };
  const ctx = makeCtx(D);
  const v = { id: 'veh_1', name: 'Vario 125', assetId: 'asset_5' };

  ctx._autoCreateVehicleAsset(v, 'FAMILY');

  assert.equal(assetLain.ownership, 'SELF', 'aset auto-created kendaraan lain tidak boleh ikut tersinkron');
});

test('_syncVehNilaiWrap: kendaraan BELUM tertaut Aset -> wrap tampil (display kosong)', () => {
  const D = { assets: [] };
  const ctx = makeCtx(D);
  const v = { id: 'veh_1', name: 'Vario 125' };
  ctx._syncVehNilaiWrap(v);

  assert.equal(ctx.__els.vehNilaiWrap.style.display, '');
});

test('_syncVehNilaiWrap: kendaraan SUDAH tertaut valid ke Aset -> wrap disembunyikan', () => {
  const asset = { id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125' };
  const D = { assets: [asset] };
  const ctx = makeCtx(D);
  const v = { id: 'veh_1', name: 'Vario 125', assetId: 'asset_1' };
  ctx._syncVehNilaiWrap(v);

  assert.equal(ctx.__els.vehNilaiWrap.style.display, 'none');
});

test('_syncVehNilaiWrap: v=null (tambah kendaraan baru) -> wrap selalu tampil', () => {
  const D = { assets: [] };
  const ctx = makeCtx(D);
  ctx._syncVehNilaiWrap(null);

  assert.equal(ctx.__els.vehNilaiWrap.style.display, '');
});

test('_syncVehNilaiWrap: selalu reset isi #vehNilai ke string kosong', () => {
  const D = { assets: [] };
  const ctx = makeCtx(D, { vehNilai: '999' });
  ctx._syncVehNilaiWrap(null);

  assert.equal(ctx.__els.vehNilai.value, '');
});
