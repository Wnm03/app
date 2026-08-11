'use strict';
// tests/vehicle-asset-view-action-s509b.test.js — cakupan S509b (Vehicle →
// "Lihat di Buku Aset", PROMPT IMPLEMENTASI S509b, lanjutan audit S509).
// Fokus test: vehAssetViewActionHtml() & baris tombol navigasi baru di
// vehAssetBridgeHtml() (fungsi murni di modules/vehicle/vehicle-core.js,
// tidak sentuh DOM) — sama batasan loadSource.js seperti
// tests/vehicle-asset-bridge-s507.test.js & tests/vehicle-asset-titipan-s508.test.js.
//
// PENTING: S509b murni navigasi UI. TIDAK ada schema baru di D.vehicles/
// D.assets, TIDAK ada resolver kedua (reuse resolveLinkedVehicleAsset() S507
// yang reuse resolveVehicleAssetLink() S506), TIDAK ada modal baru (reuse
// Aset.openModal() existing + dispatcher data-action/data-args generik yang
// sudah ada). Test di sini memverifikasi: tombol MUNCUL hanya pada kondisi
// resolve sukses, TIDAK MUNCUL pada kondisi lain (assetId kosong/orphan/
// bukan Kendaraan), pakai data-action="Aset.openModal" dgn data-args berisi
// asset.id yang benar, dan output S507/S508 existing tidak berubah selain
// tambahan baris ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(assets) {
  const D = { assets: assets || [], deliveryPlans: [] };
  return loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/shared/format-tema.js', 'modules/vehicle/vehicle-core.js'],
    { D, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s) },
    ['resolveLinkedVehicleAsset', 'vehAssetBridgeHtml', 'vehAssetViewActionHtml']
  );
}

const kendaraanAsset = { id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125', nilai: 20000000 };
const tanahAsset = { id: 'asset_2', jenis: 'Tanah', name: 'Tanah Bogor', nilai: 500000000 };

// 1) Vehicle tanpa assetId -> tombol tidak ada.
test('vehAssetBridgeHtml: tombol "Lihat di Buku Aset" TIDAK ada kalau vehicle belum punya assetId', () => {
  const ctx = makeCtx([kendaraanAsset]);
  const html = ctx.vehAssetBridgeHtml({ id: 'veh_1', name: 'Vario' });
  assert.match(html, /Belum terhubung ke Buku Aset/);
  assert.doesNotMatch(html, /Lihat di Buku Aset/);
});

// 2) Vehicle dengan assetId valid ke Asset jenis Kendaraan -> tombol ada.
test('vehAssetBridgeHtml: tombol "Lihat di Buku Aset" ADA kalau link ke asset Kendaraan valid', () => {
  const ctx = makeCtx([kendaraanAsset]);
  const html = ctx.vehAssetBridgeHtml({ id: 'veh_1', assetId: 'asset_1' });
  assert.match(html, /🔍 Lihat di Buku Aset/);
});

// 3) Tombol pakai data-action="Aset.openModal".
test('vehAssetViewActionHtml: memakai data-action="Aset.openModal" (reuse existing, bukan modal baru)', () => {
  const ctx = makeCtx([kendaraanAsset]);
  const html = ctx.vehAssetViewActionHtml(kendaraanAsset);
  assert.match(html, /data-action="Aset\.openModal"/);
});

// 4) data-args berisi asset.id yang benar. Pakai escapeHtml() NYATA di sini
// (bukan stub passthrough makeCtx) supaya atribut HTML valid & bisa
// diparse balik jadi JSON, sama seperti test #7 di bawah.
test('vehAssetViewActionHtml: data-args berisi asset.id yang benar', () => {
  function realEscapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  const D = { assets: [kendaraanAsset], deliveryPlans: [] };
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/shared/format-tema.js', 'modules/vehicle/vehicle-core.js'],
    { D, sameId: (a, b) => String(a) === String(b), escapeHtml: realEscapeHtml },
    ['vehAssetViewActionHtml']
  );
  const html = ctx.vehAssetViewActionHtml(kendaraanAsset);
  const m = html.match(/data-args="([^"]*)"/);
  assert.ok(m, 'data-args attribute harus ada');
  const raw = m[1].replace(/&quot;/g, '"');
  assert.deepEqual(JSON.parse(raw), ['asset_1']);
});

// 5) Vehicle dengan orphan assetId -> warning tetap ada, tombol tidak ada.
test('vehAssetBridgeHtml: assetId orphan -> warning tetap tampil, tombol TIDAK ada', () => {
  const ctx = makeCtx([]);
  const html = ctx.vehAssetBridgeHtml({ id: 'veh_1', assetId: 'asset_ghost' });
  assert.match(html, /Link Buku Aset tidak ditemukan/);
  assert.doesNotMatch(html, /Lihat di Buku Aset/);
});

// 6) assetId menunjuk Asset non-Kendaraan -> diperlakukan invalid, tombol tidak ada.
test('vehAssetBridgeHtml: assetId menunjuk asset jenis bukan Kendaraan -> tombol TIDAK ada', () => {
  const ctx = makeCtx([tanahAsset]);
  const html = ctx.vehAssetBridgeHtml({ id: 'veh_1', assetId: 'asset_2' });
  assert.match(html, /Link Buku Aset tidak ditemukan/);
  assert.doesNotMatch(html, /Lihat di Buku Aset/);
});

// 7) Asset ID mengandung karakter yang perlu escaping -> markup tetap aman
// (pakai escapeHtml() nyata, bukan stub passthrough seperti ctx lain di atas).
test('vehAssetViewActionHtml: asset.id dengan karakter khusus tetap di-escape dgn aman', () => {
  const D = { assets: [], deliveryPlans: [] };
  function realEscapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/shared/format-tema.js', 'modules/vehicle/vehicle-core.js'],
    { D, sameId: (a, b) => String(a) === String(b), escapeHtml: realEscapeHtml },
    ['vehAssetViewActionHtml']
  );
  const trickyAsset = { id: 'asset_"><img src=x>', jenis: 'Kendaraan', name: 'Tricky' };
  const html = ctx.vehAssetViewActionHtml(trickyAsset);
  // Tidak boleh ada tag <img yang lolos mentah ke markup
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /data-action="Aset\.openModal"/);
});

// 8) Existing S507/S508 bridge output tetap ada dan tidak berubah selain
// tambahan action (nilai, kepemilikan, dana titipan tetap muncul apa adanya).
test('vehAssetBridgeHtml: baris Nilai (S507) tetap ada berdampingan dgn tombol baru (S509b)', () => {
  const ctx = makeCtx([kendaraanAsset]);
  const html = ctx.vehAssetBridgeHtml({ id: 'veh_1', assetId: 'asset_1' });
  assert.match(html, /Terhubung ke Buku Aset/);
  assert.match(html, /Nilai: Rp 20\.000\.000/);
  assert.match(html, /🔍 Lihat di Buku Aset/);
});

// 9) Tidak ada snapshot field baru ke vehicle (S509b tetap read-only, sama
// prinsip S507/S508 — vehicle HANYA menyimpan assetId).
test('vehAssetBridgeHtml: TIDAK menulis field snapshot apa pun ke object vehicle', () => {
  const ctx = makeCtx([kendaraanAsset]);
  const v = { id: 'veh_1', assetId: 'asset_1' };
  ctx.vehAssetBridgeHtml(v);
  assert.deepEqual(Object.keys(v).sort(), ['assetId', 'id']);
  assert.equal(v.assetValue, undefined);
  assert.equal(v.assetOwners, undefined);
  assert.equal(v.titipanAmount, undefined);
  assert.equal(v.titipanPrincipal, undefined);
  assert.equal(v.titipanQuota, undefined);
});

// 10) Action hanya navigasi ke Aset.openModal existing, bukan implementasi
// modal baru — pastikan tidak ada nama data-action lain (mis. modal khusus
// S509b) yang muncul di output.
test('vehAssetViewActionHtml: HANYA memanggil Aset.openModal, bukan handler/modal baru', () => {
  const ctx = makeCtx([kendaraanAsset]);
  const html = ctx.vehAssetViewActionHtml(kendaraanAsset);
  const actionMatches = html.match(/data-action="[^"]*"/g) || [];
  assert.deepEqual(actionMatches, ['data-action="Aset.openModal"']);
});
