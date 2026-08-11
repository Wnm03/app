'use strict';
// tests/vehicle-asset-identity-link-s506.test.js — cakupan S506 (Vehicle ↔
// Asset Identity Link, Option A: D.vehicles.assetId → D.assets.id). Fokus
// test: resolveVehicleAssetLink() & vehicleAssetLinkOptionsHtml() (fungsi
// murni di modules/vehicle/vehicle-core.js, tidak sentuh DOM) — pemilihan
// modal (openVehicleModal/editVehicle/saveVehicle, baca document.getElementById)
// sengaja TIDAK dites di sini sesuai batasan loadSource.js (lihat catatan di
// file itu & pola vehicle-jenis.test.js), cukup diverifikasi manual/smoke-test.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(assets) {
  const D = { assets: assets || [] };
  return loadSource(
    ['modules/vehicle/vehicle-core.js'],
    { D, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s) },
    ['resolveVehicleAssetLink', 'vehicleAssetLinkOptionsHtml']
  );
}

test('resolveVehicleAssetLink: null kalau assetId kosong/undefined', () => {
  const ctx = makeCtx([{ id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125' }]);
  assert.equal(ctx.resolveVehicleAssetLink(''), null);
  assert.equal(ctx.resolveVehicleAssetLink(undefined), null);
});

test('resolveVehicleAssetLink: balikin asset kalau ada DAN jenis === Kendaraan', () => {
  const asset = { id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125' };
  const ctx = makeCtx([asset]);
  assert.deepEqual(ctx.resolveVehicleAssetLink('asset_1'), asset);
});

test('resolveVehicleAssetLink: null kalau asset tidak ditemukan (id salah/sudah dihapus)', () => {
  const ctx = makeCtx([{ id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125' }]);
  assert.equal(ctx.resolveVehicleAssetLink('asset-yang-tidak-ada'), null);
});

test('resolveVehicleAssetLink: null kalau asset ada TAPI jenis BUKAN Kendaraan (Tanah/Rumah/Emas/dst ditolak)', () => {
  const ctx = makeCtx([{ id: 'asset_2', jenis: 'Tanah', name: 'Kavling Pekalongan' }]);
  assert.equal(ctx.resolveVehicleAssetLink('asset_2'), null);
});

test('vehicleAssetLinkOptionsHtml: selalu ada opsi "Tidak terhubung" di posisi pertama', () => {
  const ctx = makeCtx([]);
  const html = ctx.vehicleAssetLinkOptionsHtml(null);
  assert.match(html, /^<option value="">— Tidak terhubung —<\/option>/);
});

test('vehicleAssetLinkOptionsHtml: HANYA menampilkan D.assets jenis Kendaraan, bukan jenis lain', () => {
  const ctx = makeCtx([
    { id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125' },
    { id: 'asset_2', jenis: 'Tanah', name: 'Kavling Pekalongan' },
    { id: 'asset_3', jenis: 'Emas/Logam Mulia', name: 'Emas 10gr' },
  ]);
  const html = ctx.vehicleAssetLinkOptionsHtml(null);
  assert.match(html, /Vario 125/);
  assert.doesNotMatch(html, /Kavling Pekalongan/);
  assert.doesNotMatch(html, /Emas 10gr/);
});

test('vehicleAssetLinkOptionsHtml: option milik currentAssetId ditandai selected', () => {
  const ctx = makeCtx([
    { id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125' },
    { id: 'asset_2', jenis: 'Kendaraan', name: 'Brio' },
  ]);
  const html = ctx.vehicleAssetLinkOptionsHtml('asset_2');
  assert.match(html, /value="asset_2" selected/);
  assert.doesNotMatch(html, /value="asset_1" selected/);
});
