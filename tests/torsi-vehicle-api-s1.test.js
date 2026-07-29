'use strict';
// tests/torsi-vehicle-api-s1.test.js — cakupan Sesi 1
// (DESIGN_torsi-vehicle-selector_shop-import-export.md, Bagian A).
//
// Target: TorsiVehicleAPI (modules/vehicle/torsi-vehicle-api.js) — 100% reuse
// ShopKatalogDinamisAPI.daftarKendaraan() + checklistUntuk()/setCheck() atas
// bentuk data ASLI D.torsiChecklist[vehicleId]={checked,biaya,pageMode} (lihat
// Torsi.persist() di car-notes.js) + initTorsiVehicleMigration() jaring
// pengaman data flat lama.
//
// RULE yang dites di sini:
//   - daftarKendaraan() identik ShopKatalogDinamisAPI.daftarKendaraan() (1
//     sumber kebenaran, tidak boleh berbeda hasil).
//   - checklistUntuk() baca apa adanya, TIDAK menulis record baru kalau belum
//     ada checklist utk kendaraan itu (no side-effect on read).
//   - setCheck() menulis ke slot vehicleId yang benar, TIDAK menyentuh data
//     kendaraan lain.
//   - _migrateFlatToPerVehicle() (Sesi "Revisi migrasi") memindahkan data
//     flat lama ke kendaraan pertama TANPA membuang data (_legacyFlat),
//     idempoten secara alami (deteksi by-shape, BUKAN flag
//     D._migratedTorsiVehicle — sudah dihapus), dan dipanggil lewat
//     DATA_MIGRATIONS (toVersion:4) + runDataMigrations() di
//     features-helpers-global-security.js, bukan entry point terpisah lagi.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides = {}) {
  return {
    vehicles: [
      { id: 'veh_1', name: 'Vario 125', emoji: '🏍️', jenis: 'motor' },
      { id: 'veh_2', name: 'Brio', emoji: '🚗', jenis: 'mobil' },
    ],
    torsiChecklist: {},
    ...overrides,
  };
}

function makeCtx(D) {
  return loadSource(
    ['modules/vehicle/shop-katalog-dinamis-api.js', 'modules/vehicle/torsi-vehicle-api.js'],
    { D, save: () => {} },
    ['ShopKatalogDinamisAPI', 'TorsiVehicleAPI'],
  );
}

test('TorsiVehicleAPI.daftarKendaraan() — identik ShopKatalogDinamisAPI.daftarKendaraan()', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.deepEqual(ctx.TorsiVehicleAPI.daftarKendaraan(), ctx.ShopKatalogDinamisAPI.daftarKendaraan());
});

test('TorsiVehicleAPI.MAX_KENDARAAN — reuse ShopKatalogDinamisAPI.MAX_KENDARAAN', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.TorsiVehicleAPI.MAX_KENDARAAN, ctx.ShopKatalogDinamisAPI.MAX_KENDARAAN);
});

test('checklistUntuk() — kendaraan tanpa record: ok:true, checked/biaya kosong, TIDAK menulis apa pun', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const res = ctx.TorsiVehicleAPI.checklistUntuk('veh_1');
  assert.equal(res.ok, true);
  assert.equal(res.kendaraan.name, 'Vario 125');
  assert.equal(Object.keys(res.checked).length, 0);
  assert.equal(Object.keys(res.biaya).length, 0);
  assert.equal(res.pageMode, 'normal');
  assert.equal(D.torsiChecklist.veh_1, undefined, 'read-only, tidak boleh membuat record baru');
});

test('checklistUntuk() — kendaraan tidak ditemukan / id kosong', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.TorsiVehicleAPI.checklistUntuk('veh_x').ok, false);
  assert.equal(ctx.TorsiVehicleAPI.checklistUntuk(null).ok, false);
});

test('setCheck() — menulis checked & biaya ke slot vehicleId yang benar, tidak menyentuh kendaraan lain', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const r1 = ctx.TorsiVehicleAPI.setCheck('veh_1', 'baut_as_roda_depan', { checked: true, biaya: 15000 });
  assert.equal(r1.ok, true);
  assert.equal(D.torsiChecklist.veh_1.checked.baut_as_roda_depan, true);
  assert.equal(D.torsiChecklist.veh_1.biaya.baut_as_roda_depan, 15000);
  assert.equal(D.torsiChecklist.veh_2, undefined, 'kendaraan lain tidak boleh ikut ke-record');

  const readBack = ctx.TorsiVehicleAPI.checklistUntuk('veh_1');
  assert.equal(readBack.checked.baut_as_roda_depan, true);
  assert.equal(readBack.biaya.baut_as_roda_depan, 15000);
});

test('setCheck() — partial patch (cuma checked, tanpa biaya) tidak menimpa biaya yang sudah ada', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.TorsiVehicleAPI.setCheck('veh_1', 'kampas_rem', { checked: true, biaya: 30000 });
  ctx.TorsiVehicleAPI.setCheck('veh_1', 'kampas_rem', { checked: false });
  assert.equal(D.torsiChecklist.veh_1.checked.kampas_rem, false);
  assert.equal(D.torsiChecklist.veh_1.biaya.kampas_rem, 30000, 'biaya lama harus tetap ada, tidak boleh hilang');
});

test('setCheck() — vehicleId tidak valid ditolak', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const res = ctx.TorsiVehicleAPI.setCheck('veh_x', 'busi', { checked: true });
  assert.equal(res.ok, false);
  assert.deepEqual(D.torsiChecklist, {});
});

test('_migrateFlatToPerVehicle(d) — data flat lama dipindah ke kendaraan pertama, tidak dibuang', () => {
  const D = makeD({
    torsiChecklist: {
      baut_as_roda_depan: { checked: true, catatan: 'sudah ganti', tanggal: '2025-01-01' },
    },
  });
  const ctx = makeCtx(D);
  ctx.TorsiVehicleAPI._migrateFlatToPerVehicle(D);
  assert.ok(D.torsiChecklist.veh_1, 'record dipindah ke kendaraan pertama');
  assert.equal(Object.keys(D.torsiChecklist.veh_1.checked).length, 0);
  assert.equal(Object.keys(D.torsiChecklist.veh_1.biaya).length, 0);
  assert.equal(D.torsiChecklist.veh_1._legacyFlat.baut_as_roda_depan.checked, true, 'data lama tidak dibuang');
});

test('_migrateFlatToPerVehicle(d) — data yang SUDAH per-kendaraan (bentuk asli build ini) TIDAK diubah', () => {
  const D = makeD({
    torsiChecklist: {
      veh_1: { checked: { busi: true }, biaya: { busi: 25000 }, pageMode: 'checklist' },
    },
  });
  const ctx = makeCtx(D);
  ctx.TorsiVehicleAPI._migrateFlatToPerVehicle(D);
  assert.equal(D.torsiChecklist.veh_1.checked.busi, true);
  assert.equal(D.torsiChecklist.veh_1.pageMode, 'checklist');
  assert.equal(D.torsiChecklist.veh_1._legacyFlat, undefined);
});

test('_migrateFlatToPerVehicle(d) — idempotent secara alami (deteksi by-shape, bukan flag)', () => {
  const D = makeD({
    torsiChecklist: { baut_as_roda_depan: { checked: true, catatan: 'x', tanggal: 'y' } },
  });
  const ctx = makeCtx(D);
  ctx.TorsiVehicleAPI._migrateFlatToPerVehicle(D);
  const afterFirst = JSON.stringify(D.torsiChecklist);
  ctx.TorsiVehicleAPI._migrateFlatToPerVehicle(D);
  assert.equal(JSON.stringify(D.torsiChecklist), afterFirst, 'panggilan kedua tidak boleh mengubah apa pun lagi (bentuknya sudah per-kendaraan)');
});

test('_migrateFlatToPerVehicle(d) — D.vehicles kosong: dibiarkan apa adanya', () => {
  const D = makeD({ vehicles: [], torsiChecklist: { flatkey: { checked: true, catatan: 'x', tanggal: 'y' } } });
  const ctx = makeCtx(D);
  ctx.TorsiVehicleAPI._migrateFlatToPerVehicle(D);
  assert.deepEqual(D.torsiChecklist, { flatkey: { checked: true, catatan: 'x', tanggal: 'y' } });
});

// --- Integrasi dgn mekanisme migrasi formal (Sesi "Revisi migrasi") ---
// Memuat modules/shared/features-helpers-global-security.js BENERAN (bukan
// stub) supaya DATA_MIGRATIONS/runDataMigrations/SCHEMA_VERSION yang dites
// adalah kode asli, konsisten pola loadSource() di seluruh repo ini.
// CATATAN: file ini mendeklarasikan `let D = {...default...}` sendiri di
// top-level, jadi D TIDAK bisa di-inject lewat extraGlobals (akan
// di-shadow) — harus expose `D` lalu MUTASI in-place (object reference yang
// sama dipakai closure runDataMigrations()/DATA_MIGRATIONS di dalam file).
test('DATA_MIGRATIONS toVersion:4 — runDataMigrations() memicu migrasi torsi flat lewat TorsiVehicleAPI, tanpa flag D._migratedTorsiVehicle', () => {
  const ctx = loadSource(
    ['modules/vehicle/torsi-vehicle-api.js', 'modules/shared/features-helpers-global-security.js'],
    {
      DEFAULT_COBEK_KATEGORI: [], DEFAULT_CATS: { income: [], expense: [] }, DEFAULT_ACCOUNTS: [], DEFAULT_SPAREPARTS: [],
      uid: (() => { let n = 0; return () => 'uid_' + (n++); })(),
    },
    ['TorsiVehicleAPI', 'SCHEMA_VERSION', 'D'],
  );
  // D default dari file ini SUDAH punya vehicles:[{id:'veh_1',...}] (lihat
  // baris `let D = {...}`); di sini cukup override torsiChecklist lama +
  // schemaVersion, lalu jalankan migrasi lewat runDataMigrations() asli.
  ctx.D.schemaVersion = 3;
  ctx.D.torsiChecklist = { baut_as_roda_depan: { checked: true, catatan: 'sudah ganti', tanggal: '2025-01-01' } };
  ctx.runDataMigrations(3);
  assert.equal(ctx.D.schemaVersion, ctx.SCHEMA_VERSION, 'schemaVersion harus naik ke SCHEMA_VERSION terbaru (4)');
  assert.ok(ctx.D.torsiChecklist.veh_1, 'migrasi torsi ikut jalan lewat runDataMigrations(), bukan pemanggilan terpisah');
  assert.equal(ctx.D.torsiChecklist.veh_1._legacyFlat.baut_as_roda_depan.checked, true, 'data lama tidak dibuang');
  assert.equal(ctx.D._migratedTorsiVehicle, undefined, 'flag lama tidak boleh muncul lagi -- guard sekarang murni via schemaVersion');
});
