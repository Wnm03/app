'use strict';
// tests/sparepart-sync-from-catalog-s331.test.js — cakupan fitur baru
// Sparepart.syncFromCatalog() (modules/vehicle/sparepart-servis.js), tombol
// "🔄 Sinkron dari Katalog Suku Cadang" di 🔧 Kelola Kategori Sparepart &
// Interval Servis (permintaan eksplisit user, Sesi 331).
//
// Beda dari syncPartsStockFromCatalog() (tx-stok-sparepart.js, sudah ada
// test terpisah di tx-stok-sparepart-catalog-link.test.js):
//  1) Filter per KENDARAAN AKTIF (compatibleVehicleIds harus eksplisit
//     memuat curVehicleId) — "beda kendaraan beda katalog".
//  2) intervalKm kategori baru diisi dari TORSI_DB (lewat
//     suggestServiceIntervalKm() yang sudah ada di file yang sama), bukan
//     selalu 0.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ D, VehicleCatalog, curVehicleId, calls, confirmAnswer }) {
  return loadSource(
    ['modules/vehicle/sparepart-servis.js'],
    {
      D,
      VehicleCatalog,
      curVehicleId,
      codeFromName: (s) => String(s).slice(0, 3).toUpperCase(),
      save: () => calls.push('save'),
      toast: (m) => calls.push('toast:' + m),
      askConfirm: async (msg) => { calls.push('askConfirm:' + msg); return confirmAnswer !== false; },
      renderServisList: () => calls.push('renderServisList'),
      renderDashboardServisReminder: () => calls.push('renderDashboardServisReminder'),
      escapeHtml: (s) => String(s == null ? '' : s),
      document: { getElementById: () => null },
      MY_WRENCH: {},
    },
    ['Sparepart']
  );
}

function baseD(overrides) {
  return Object.assign(
    {
      vehicles: [{ id: 'veh1', name: 'Vario 125' }, { id: 'veh2', name: 'Beat FI' }],
      sparepartCats: [],
      partsStock: [],
      servisLogs: [],
    },
    overrides || {}
  );
}

test('syncFromCatalog() — hanya mengambil part yang compatibleVehicleIds memuat kendaraan aktif ("beda kendaraan beda katalog")', async () => {
  const D = baseD();
  const calls = [];
  const items = [
    { id: 'cat1', partName: 'Busi', category: 'Perawatan Berkala', compatibleVehicleIds: ['veh1'], isDraft: false },
    { id: 'cat2', partName: 'Kampas Rem Depan', category: 'Sistem Rem', compatibleVehicleIds: ['veh2'], isDraft: false },
  ];
  const VehicleCatalog = { getAll: async () => items };
  const ctx = makeCtx({ D, VehicleCatalog, curVehicleId: 'veh1', calls });

  await ctx.Sparepart.syncFromCatalog();

  // Hanya "Busi" (veh1) yang disinkron, "Kampas Rem Depan" (veh2) dilewati.
  assert.equal(D.partsStock.length, 1);
  assert.equal(D.partsStock[0].name, 'Busi');
  assert.equal(D.partsStock[0].catalogId, 'cat1');
  assert.ok(calls.includes('save'));
});

test('syncFromCatalog() — intervalKm kategori baru diambil dari TORSI_DB (bukan 0)', async () => {
  const D = baseD();
  const calls = [];
  // "Busi" ada di TORSI_DB utk Vario 125 dgn interval "Ganti tiap 8.000 km".
  const items = [
    { id: 'cat1', partName: 'Busi', category: 'Mesin', compatibleVehicleIds: ['veh1'], isDraft: false },
  ];
  const VehicleCatalog = { getAll: async () => items };
  const ctx = makeCtx({ D, VehicleCatalog, curVehicleId: 'veh1', calls });

  await ctx.Sparepart.syncFromCatalog();

  assert.equal(D.sparepartCats.length, 1);
  assert.equal(D.sparepartCats[0].name, 'Mesin');
  assert.equal(D.sparepartCats[0].intervalKm, 8000);
  assert.equal(D.sparepartCats[0].showInReminder, true);
});

test('syncFromCatalog() — part tanpa match di TORSI_DB/fallback dibuat dgn intervalKm 0 & showInReminder false', async () => {
  const D = baseD();
  const calls = [];
  const items = [
    { id: 'cat1', partName: 'Aksesoris Unik XYZ', category: 'Custom', compatibleVehicleIds: ['veh1'], isDraft: false },
  ];
  const VehicleCatalog = { getAll: async () => items };
  const ctx = makeCtx({ D, VehicleCatalog, curVehicleId: 'veh1', calls });

  await ctx.Sparepart.syncFromCatalog();

  assert.equal(D.sparepartCats[0].intervalKm, 0);
  assert.equal(D.sparepartCats[0].showInReminder, false);
});

test('syncFromCatalog() — kategori nama sama TIDAK dibuat ulang, dilengkapi interval kalau masih kosong tanpa menimpa milik user', async () => {
  const D = baseD({
    sparepartCats: [{ id: 'spExisting', name: 'Mesin', code: 'MES', intervalKm: 0, showInReminder: false }],
  });
  const calls = [];
  const items = [
    { id: 'cat1', partName: 'Busi', category: 'Mesin', compatibleVehicleIds: ['veh1'], isDraft: false },
  ];
  const VehicleCatalog = { getAll: async () => items };
  const ctx = makeCtx({ D, VehicleCatalog, curVehicleId: 'veh1', calls });

  await ctx.Sparepart.syncFromCatalog();

  // Tidak ada kategori baru dibuat, kategori "Mesin" yang sudah ada dilengkapi.
  assert.equal(D.sparepartCats.length, 1);
  assert.equal(D.sparepartCats[0].intervalKm, 8000);
});

test('syncFromCatalog() — kategori yang sudah punya interval manual TIDAK ditimpa', async () => {
  const D = baseD({
    sparepartCats: [{ id: 'spExisting', name: 'Mesin', code: 'MES', intervalKm: 3000, showInReminder: true }],
  });
  const calls = [];
  const items = [
    { id: 'cat1', partName: 'Busi', category: 'Mesin', compatibleVehicleIds: ['veh1'], isDraft: false },
  ];
  const VehicleCatalog = { getAll: async () => items };
  const ctx = makeCtx({ D, VehicleCatalog, curVehicleId: 'veh1', calls });

  await ctx.Sparepart.syncFromCatalog();

  assert.equal(D.sparepartCats[0].intervalKm, 3000);
});

test('syncFromCatalog() — idempotent: part yang sudah tersinkron (ada catalogId) dilewati di panggilan berikutnya', async () => {
  const D = baseD({
    partsStock: [{ id: 'st_existing', name: 'Busi', catId: null, code: 'BUS-001', qty: 0, unit: 'pcs', minStock: 1, price: 0, note: '', catalogId: 'cat1' }],
  });
  const calls = [];
  const items = [
    { id: 'cat1', partName: 'Busi', category: 'Mesin', compatibleVehicleIds: ['veh1'], isDraft: false },
  ];
  const VehicleCatalog = { getAll: async () => items };
  const ctx = makeCtx({ D, VehicleCatalog, curVehicleId: 'veh1', calls });

  await ctx.Sparepart.syncFromCatalog();

  assert.equal(D.partsStock.length, 1); // tidak nambah lagi
  assert.ok(calls.some((c) => c.startsWith('toast:ℹ️ Semua part')));
});

test('syncFromCatalog() — draft part (isDraft:true) diabaikan', async () => {
  const D = baseD();
  const calls = [];
  const items = [
    { id: 'cat1', partName: 'Draft Belum Lengkap', category: 'Umum', compatibleVehicleIds: ['veh1'], isDraft: true },
  ];
  const VehicleCatalog = { getAll: async () => items };
  const ctx = makeCtx({ D, VehicleCatalog, curVehicleId: 'veh1', calls });

  await ctx.Sparepart.syncFromCatalog();

  assert.equal(D.partsStock.length, 0);
  assert.equal(D.sparepartCats.length, 0);
});

test('syncFromCatalog() — batal di preview (askConfirm=false) tidak mengubah apa pun', async () => {
  const D = baseD();
  const calls = [];
  const items = [
    { id: 'cat1', partName: 'Busi', category: 'Mesin', compatibleVehicleIds: ['veh1'], isDraft: false },
  ];
  const VehicleCatalog = { getAll: async () => items };
  const ctx = makeCtx({ D, VehicleCatalog, curVehicleId: 'veh1', calls, confirmAnswer: false });

  await ctx.Sparepart.syncFromCatalog();

  assert.equal(D.partsStock.length, 0);
  assert.equal(D.sparepartCats.length, 0);
  assert.ok(!calls.includes('save'));
});

test('syncFromCatalog() — tidak ada kendaraan aktif -> toast peringatan, tidak error', async () => {
  const D = baseD();
  const calls = [];
  const VehicleCatalog = { getAll: async () => [] };
  const ctx = makeCtx({ D, VehicleCatalog, curVehicleId: null, calls });

  await ctx.Sparepart.syncFromCatalog();

  assert.ok(calls.some((c) => c.startsWith('toast:⚠️ Pilih kendaraan')));
});
