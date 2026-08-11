'use strict';
// tests/s549-getitemsuggestions-per-vehicle-filter.test.js — FIX (S549):
// implementasi rekomendasi audit user (Sesi 548) — Sparepart.getItemSuggestions()
// (dropdown "Jenis Servis/Item" di modal Catat Servis/Sparepart) dulu
// menggabungkan nama dari 3 sumber (Kategori Sparepart, Stok Sparepart,
// Katalog Suku Cadang) TANPA filter kendaraan aktif untuk 2 sumber terakhir
// -- beda dgn dropdown lain di modal yang sama, "Part dari Vehicle Catalog"
// (servisCatalogPartId), yang SUDAH difilter via VehicleCatalog.filterForVehicle().
//
// SEBELUM (gap terbukti):
//  - populateDatalist(): VehicleCatalog.getAll() diambil MENTAH tanpa filter
//    -> _catalogNameCache berisi nama part dari SEMUA kendaraan.
//  - getItemSuggestions(): D.partsStock digabung tanpa cek
//    Sparepart.isPartForVehicle() (padahal fungsi itu SUDAH ADA & dipakai
//    persis utk kasus yang sama di dropdown "Gunakan Stok Sparepart").
//
// SESUDAH (fix ini): kedua sumber direuse filter yang SUDAH ADA (0 fungsi
// baru, 0 skema data baru) -- VehicleCatalog.filterForVehicle() &
// Sparepart.isPartForVehicle() -- konsisten dgn servisCatalogPartId.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ D, VehicleCatalog, curVehicleId, catalogNameCache }) {
  const ctx = loadSource(
    ['modules/vehicle/sparepart-servis.js'],
    {
      D,
      VehicleCatalog,
      curVehicleId,
      codeFromName: (s) => String(s).slice(0, 3).toUpperCase(),
      save: () => {},
      toast: () => {},
      askConfirm: async () => true,
      renderServisList: () => {},
      renderDashboardServisReminder: () => {},
      escapeHtml: (s) => String(s == null ? '' : s),
      document: { getElementById: () => null },
      MY_WRENCH: {},
    },
    ['Sparepart']
  );
  if (catalogNameCache) ctx.Sparepart._catalogNameCache = catalogNameCache;
  return ctx;
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

test('FIX: getItemSuggestions() — item Stok Sparepart dgn catalogId part khusus kendaraan LAIN TIDAK ikut disarankan', async () => {
  const D = baseD({
    partsStock: [
      { id: 'st_veh1', name: 'Kampas Rem Vario', qty: 5, unit: 'set', catalogId: 'cat_v1' },
      { id: 'st_veh2', name: 'Kampas Rem Beat', qty: 3, unit: 'set', catalogId: 'cat_v2' },
    ],
  });
  const VehicleCatalog = {
    isLoaded: () => true,
    getStore: () => ({
      items: [
        { id: 'cat_v1', partName: 'Kampas Rem Vario', compatibleVehicleIds: ['veh1'] },
        { id: 'cat_v2', partName: 'Kampas Rem Beat', compatibleVehicleIds: ['veh2'] },
      ],
    }),
    getAll: async () => [
      { id: 'cat_v1', partName: 'Kampas Rem Vario', compatibleVehicleIds: ['veh1'] },
      { id: 'cat_v2', partName: 'Kampas Rem Beat', compatibleVehicleIds: ['veh2'] },
    ],
  };
  const ctx = makeCtx({ D, VehicleCatalog, curVehicleId: 'veh1' });

  const suggestions = ctx.Sparepart.getItemSuggestions();
  assert.ok(suggestions.includes('Kampas Rem Vario'), 'part utk kendaraan aktif (veh1) harus tampil');
  assert.ok(!suggestions.includes('Kampas Rem Beat'), 'part khusus kendaraan LAIN (veh2) TIDAK boleh tampil');
});

test('FIX: part universal (compatibleVehicleIds kosong) TETAP tampil di kendaraan mana pun (backward compatible)', async () => {
  const D = baseD({
    partsStock: [
      { id: 'st_universal', name: 'Oli Rem Universal', qty: 2, unit: 'botol' }, // tanpa catalogId
    ],
  });
  const VehicleCatalog = { isLoaded: () => true, getStore: () => ({ items: [] }), getAll: async () => [] };
  const ctx = makeCtx({ D, VehicleCatalog, curVehicleId: 'veh1' });

  const suggestions = ctx.Sparepart.getItemSuggestions();
  assert.ok(suggestions.includes('Oli Rem Universal'));
});

test('FIX: populateDatalist() — cache nama Katalog Suku Cadang difilter per curVehicleId (konsisten dgn servisCatalogPartId)', async () => {
  const D = baseD();
  const VehicleCatalog = {
    isLoaded: () => true,
    getStore: () => ({ items: [] }),
    getAll: async () => [
      { id: 'cat_v1', partName: 'Busi Vario', compatibleVehicleIds: ['veh1'] },
      { id: 'cat_v2', partName: 'Busi Beat', compatibleVehicleIds: ['veh2'] },
      { id: 'cat_universal', partName: 'Grease Serbaguna', compatibleVehicleIds: [] },
    ],
    // Mock persis perilaku VehicleCatalog.filterForVehicle() asli
    // (modules/vehicle/vehicle-catalog.js) -- part universal (compatibleVehicleIds
    // kosong) selalu lolos, part khusus kendaraan lain difilter keluar.
    filterForVehicle: (items, vehicleId) => {
      if (!vehicleId) return (items || []).slice();
      return (items || []).filter((it) => !Array.isArray(it.compatibleVehicleIds) || !it.compatibleVehicleIds.length
        || it.compatibleVehicleIds.some((id) => String(id) === String(vehicleId)));
    },
  };
  const ctx = makeCtx({ D, VehicleCatalog, curVehicleId: 'veh1' });

  await ctx.Sparepart.populateDatalist();
  // populateDatalist() pakai .then() internal (bukan async/await eksplisit) --
  // tunggu 1 microtask tambahan supaya promise .then() sempat resolve.
  await new Promise((r) => setImmediate(r));

  assert.ok(ctx.Sparepart._catalogNameCache.includes('Busi Vario'));
  assert.ok(ctx.Sparepart._catalogNameCache.includes('Grease Serbaguna'), 'part universal tetap masuk cache');
  assert.ok(!ctx.Sparepart._catalogNameCache.includes('Busi Beat'), 'part khusus kendaraan lain TIDAK masuk cache');
});

test('REGRESI: kategori Kategori Sparepart (D.sparepartCats) TETAP tidak difilter kendaraan (sumber ini memang bukan per-kendaraan)', async () => {
  const D = baseD({
    sparepartCats: [{ id: 'c1', name: 'Ganti Oli Mesin', intervalKm: 2000 }],
  });
  const VehicleCatalog = { isLoaded: () => true, getStore: () => ({ items: [] }), getAll: async () => [] };
  const ctx = makeCtx({ D, VehicleCatalog, curVehicleId: 'veh1' });

  const suggestions = ctx.Sparepart.getItemSuggestions();
  assert.ok(suggestions.includes('Ganti Oli Mesin'));
});

test('REGRESI: curVehicleId kosong/null -> tidak ada filter diterapkan sama sekali (fail-open, sama seperti isPartForVehicle()/filterForVehicle() di tempat lain)', async () => {
  const D = baseD({
    partsStock: [{ id: 'st_v2', name: 'Part Khusus Beat', qty: 1, unit: 'pcs', catalogId: 'cat_v2' }],
  });
  const VehicleCatalog = {
    isLoaded: () => true,
    getStore: () => ({ items: [{ id: 'cat_v2', partName: 'Part Khusus Beat', compatibleVehicleIds: ['veh2'] }] }),
    getAll: async () => [],
  };
  const ctx = makeCtx({ D, VehicleCatalog, curVehicleId: null });

  const suggestions = ctx.Sparepart.getItemSuggestions();
  assert.ok(suggestions.includes('Part Khusus Beat'), 'tanpa kendaraan aktif, semua part tetap tampil (tidak fail-hidden)');
});
