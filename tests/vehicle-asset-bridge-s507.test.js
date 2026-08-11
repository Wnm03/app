'use strict';
// tests/vehicle-asset-bridge-s507.test.js — cakupan S507 (Vehicle ↔ Asset
// Read-Only Bridge, lanjutan S506 Identity Link). Fokus test: resolveLinkedVehicleAsset()
// & vehAssetBridgeHtml() (fungsi murni di modules/vehicle/vehicle-core.js, tidak sentuh
// DOM) dan vehMetaText() (juga murni, tidak baca DOM — hanya baca v/D/OwnershipEngine/
// MultiOwnerEngine) — sama batasan loadSource.js seperti tests/vehicle-jenis.test.js &
// tests/vehicle-asset-identity-link-s506.test.js.
//
// PENTING: S507 murni READ-ONLY bridge — TIDAK ada field baru di vehicle (assetValue/
// assetOwners/dst), TIDAK ada copy data D.assets->D.vehicles, TIDAK ada SSOT baru,
// TIDAK sentuh MultiOwnerEngine/OwnershipEngine/aset.js/Car Notes. Test di sini
// memverifikasi baca-live D.assets tiap panggilan (bukan snapshot).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(assets) {
  const D = { assets: assets || [], deliveryPlans: [] };
  return loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/shared/format-tema.js', 'modules/vehicle/vehicle-core.js'],
    { D, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s) },
    ['resolveLinkedVehicleAsset', 'vehAssetBridgeHtml', 'vehMetaText']
  );
}

// 1) Vehicle tanpa assetId -> normal
test('resolveLinkedVehicleAsset: null kalau vehicle tidak punya assetId', () => {
  const ctx = makeCtx([{ id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125', nilai: 20000000 }]);
  assert.equal(ctx.resolveLinkedVehicleAsset({ id: 'veh_1', name: 'Vario' }), null);
});

test('vehAssetBridgeHtml: "Belum terhubung ke Buku Aset" kalau assetId kosong', () => {
  const ctx = makeCtx([]);
  const html = ctx.vehAssetBridgeHtml({ id: 'veh_1', name: 'Vario' });
  assert.match(html, /Belum terhubung ke Buku Aset/);
});

// 2) Asset valid -> tampil info
test('resolveLinkedVehicleAsset: balikin asset kalau assetId valid & jenis Kendaraan', () => {
  const asset = { id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125', nilai: 20000000 };
  const ctx = makeCtx([asset]);
  assert.deepEqual(ctx.resolveLinkedVehicleAsset({ id: 'veh_1', assetId: 'asset_1' }), asset);
});

test('vehAssetBridgeHtml: tampilkan nilai aset kalau link valid', () => {
  const ctx = makeCtx([{ id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125', nilai: 20000000 }]);
  const html = ctx.vehAssetBridgeHtml({ id: 'veh_1', assetId: 'asset_1' });
  assert.match(html, /Terhubung ke Buku Aset/);
  assert.match(html, /Rp 20\.000\.000/);
});

// 3) Asset non-kendaraan -> ignore (diperlakukan sama dgn orphan: assetId
// mengarah ke entry yg tidak lagi valid utk kendaraan)
test('resolveLinkedVehicleAsset: null kalau asset ada tapi jenis BUKAN Kendaraan', () => {
  const ctx = makeCtx([{ id: 'asset_2', jenis: 'Tanah', name: 'Kavling', nilai: 500000000 }]);
  assert.equal(ctx.resolveLinkedVehicleAsset({ id: 'veh_1', assetId: 'asset_2' }), null);
});

// 4) Orphan -> warning, TIDAK ada auto-delete assetId (itu tanggung jawab
// saveVehicle() saja, bukan fungsi read-only ini)
test('vehAssetBridgeHtml: warning orphan kalau asset sudah tidak ditemukan', () => {
  const ctx = makeCtx([]); // assetId merujuk ke asset yang tidak ada
  const veh = { id: 'veh_1', assetId: 'asset-yang-sudah-dihapus' };
  const html = ctx.vehAssetBridgeHtml(veh);
  assert.match(html, /⚠️ Link Buku Aset tidak ditemukan/);
  assert.equal(veh.assetId, 'asset-yang-sudah-dihapus'); // TIDAK dihapus
});

test('vehAssetBridgeHtml: warning orphan juga utk asset jenis bukan Kendaraan (lihat §3)', () => {
  const ctx = makeCtx([{ id: 'asset_2', jenis: 'Tanah', name: 'Kavling', nilai: 500000000 }]);
  const html = ctx.vehAssetBridgeHtml({ id: 'veh_1', assetId: 'asset_2' });
  assert.match(html, /⚠️ Link Buku Aset tidak ditemukan/);
});

// 5) Multi-owner -> tampil benar ("70% Budi · 30% Ayah" style)
test('vehAssetBridgeHtml: tampilkan ringkasan porsi kalau aset multi-owner', () => {
  const asset = {
    id: 'asset_1', jenis: 'Kendaraan', name: 'Brio', nilai: 150000000,
    owners: [
      { ownerId: 'SELF', ownerName: 'Budi', porsi: 70, isSelf: true },
      { ownerId: 'ayah', ownerName: 'Ayah', porsi: 30, isSelf: false },
    ],
  };
  const ctx = makeCtx([asset]);
  const html = ctx.vehAssetBridgeHtml({ id: 'veh_1', assetId: 'asset_1' });
  assert.match(html, /Kepemilikan:/);
  assert.match(html, /70% Budi/);
  assert.match(html, /30% Ayah/);
});

test('vehAssetBridgeHtml: TIDAK ada baris Kepemilikan kalau aset single-owner (porsi 100%)', () => {
  const ctx = makeCtx([{ id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125', nilai: 20000000 }]);
  const html = ctx.vehAssetBridgeHtml({ id: 'veh_1', assetId: 'asset_1' });
  assert.doesNotMatch(html, /Kepemilikan:/);
});

// live read (bukan snapshot) — ubah D.assets setelah vehicle dibuat, hasil
// harus ikut berubah (TIDAK ada copy/cache di sisi vehicle)
test('vehAssetBridgeHtml: baca live dari D.assets, bukan snapshot/cache', () => {
  const asset = { id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125', nilai: 20000000 };
  const ctx = makeCtx([asset]);
  const veh = { id: 'veh_1', assetId: 'asset_1' };
  const before = ctx.vehAssetBridgeHtml(veh);
  assert.match(before, /Rp 20\.000\.000/);
  asset.nilai = 25000000; // update aset LANGSUNG di D.assets, bukan lewat vehicle
  const after = ctx.vehAssetBridgeHtml(veh);
  assert.match(after, /Rp 25\.000\.000/);
});

// 6) Car Notes / vehicle record TIDAK berubah — S507 tidak boleh menambah
// field baru ke vehicle (assetValue/assetOwners/ownership snapshot/dst)
test('vehAssetBridgeHtml: TIDAK menulis field apa pun ke object vehicle (read-only murni)', () => {
  const ctx = makeCtx([{ id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125', nilai: 20000000, owners: [
    { ownerId: 'SELF', ownerName: 'Budi', porsi: 60, isSelf: true },
    { ownerId: 'adik', ownerName: 'Adik', porsi: 40, isSelf: false },
  ] }]);
  const veh = { id: 'veh_1', assetId: 'asset_1', name: 'Vario', jenis: 'motor' };
  const before = JSON.stringify(veh);
  ctx.vehAssetBridgeHtml(veh);
  ctx.resolveLinkedVehicleAsset(veh);
  assert.equal(JSON.stringify(veh), before); // vehicle record tidak berubah sama sekali
});

// vehMetaText() integration — pastikan bridge ikut muncul di tiap jenis
// kendaraan (motor/mobil/listrik) tanpa merusak teks S506 (ownership badge)
// yang sudah ada.
test('vehMetaText: bridge text muncul utk kendaraan jenis motor (default)', () => {
  const ctx = makeCtx([{ id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125', nilai: 20000000 }]);
  const html = ctx.vehMetaText({ id: 'veh_1', jenis: 'motor', assetId: 'asset_1', serviceIntervalKm: 3000 });
  assert.match(html, /Interval servis: 3\.000 km/);
  assert.match(html, /Terhubung ke Buku Aset/);
});

test('vehMetaText: bridge text muncul utk kendaraan jenis mobil', () => {
  const ctx = makeCtx([]);
  const html = ctx.vehMetaText({ id: 'veh_1', jenis: 'mobil', assetId: 'asset-tidak-ada', serviceIntervalKm: 5000 });
  assert.match(html, /Oli mesin:/);
  assert.match(html, /⚠️ Link Buku Aset tidak ditemukan/);
});

test('vehMetaText: bridge text muncul utk kendaraan jenis listrik', () => {
  const ctx = makeCtx([]);
  const html = ctx.vehMetaText({ id: 'veh_1', jenis: 'listrik', batteryCapacityKwh: 5.5 });
  assert.match(html, /Kapasitas baterai: 5\.5 kWh/);
  assert.match(html, /Belum terhubung ke Buku Aset/);
});
