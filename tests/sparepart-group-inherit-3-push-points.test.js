'use strict';
// tests/sparepart-group-inherit-3-push-points.test.js — lanjutan audit
// grouping (lihat tests/sparepart-reminder-grouping-audit.test.js). Sesi
// v1638 baru menyimpan group/groupIcon secara PERSISTEN di 1 dari 4 titik
// push() ke D.sparepartCats (commitRecommend(), lewat kandidat
// recommendCategories() yang sudah bawa group). 3 titik push() lain masih
// push tanpa group sama sekali (cat.group baru terisi runtime lewat
// resolveCatGroup() saat DIBACA, bukan saat DIBUAT):
//   1) Sparepart.saveCat()        — tambah kategori manual lewat form
//   2) Sparepart.syncFromCatalog() — sinkron dari Katalog Suku Cadang
//   3) Sparepart.commitCategoryCSV() — import CSV kategori
// Sesi ini: ketiganya reuse resolveCatGroup() (0 rumus grouping baru) supaya
// kategori baru dari jalur manapun langsung punya group tersimpan, konsisten
// dengan commitRecommend().

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(initial) {
  return Object.assign(
    { value: '', disabled: false, textContent: '', checked: false, innerHTML: '', style: {}, dataset: {}, oninput: null, classList: { add() {}, remove() {} } },
    initial || {}
  );
}

function baseD(overrides) {
  return Object.assign(
    {
      vehicles: [
        { id: 'veh1', name: 'Vario 125', jenis: 'motor' },
        { id: 'veh2', name: 'Xpander', jenis: 'mobil' },
      ],
      sparepartCats: [],
      partsStock: [],
      servisLogs: [],
    },
    overrides || {}
  );
}

// --- 1) saveCat() ---------------------------------------------------------

function makeSaveCatCtx(D, curVehicleId) {
  const els = {
    sparepartName: makeEl({ value: 'Busi' }),
    sparepartInterval: makeEl({ value: '8000' }),
    sparepartIntervalBulan: makeEl({ value: '' }),
    sparepartCode: makeEl({ value: '' }),
    sparepartShowInReminder: makeEl({ checked: true }),
    sparepartVehicleId: makeEl(),
  };
  const document = { getElementById: (id) => els[id] || null };
  return loadSource(
    ['modules/vehicle/sparepart-servis.js', 'modules/vehicle/sparepart-servis-b.js'],
    {
      D,
      document,
      curVehicleId,
      openModal: () => {},
      closeModal: () => {},
      save: () => {},
      toast: () => {},
      askConfirm: async () => true,
      renderServisList: () => {},
      renderDashboardServisReminder: () => {},
      matchingVehicleName: () => null,
      codeFromName: (s) => String(s).slice(0, 3).toUpperCase(),
      MY_WRENCH: {},
    },
    ['Sparepart']
  );
}

test('saveCat() — kategori baru (nama match TORSI_DB kendaraan aktif) langsung tersimpan dgn group/groupIcon', () => {
  const D = baseD();
  const ctx = makeSaveCatCtx(D, 'veh1');
  ctx.Sparepart.catEditIdx = null;
  ctx.Sparepart.saveCat();
  const cat = D.sparepartCats.find((c) => c.name === 'Busi');
  assert.ok(cat, 'kategori Busi harus tersimpan');
  assert.equal(cat.group, 'Perawatan Berkala');
  assert.equal(cat.groupIcon, '🛠️');
});

test('saveCat() — nama tidak match apa pun -> tetap tersimpan dgn group "Lainnya" (bukan undefined)', () => {
  const D = baseD();
  const ctx = makeSaveCatCtx(D, 'veh1');
  ctx.Sparepart.catEditIdx = null;
  const els = ctx.document.getElementById('sparepartName');
  els.value = 'Part Aneh Bin Ajaib XYZ';
  ctx.Sparepart.saveCat();
  const cat = D.sparepartCats.find((c) => c.name === 'Part Aneh Bin Ajaib XYZ');
  assert.ok(cat);
  assert.equal(cat.group, 'Lainnya');
  assert.equal(cat.groupIcon, '📦');
});

// --- 2) syncFromCatalog() -------------------------------------------------

function makeSyncCtx({ D, VehicleCatalog, curVehicleId, calls }) {
  return loadSource(
    ['modules/vehicle/sparepart-servis.js', 'modules/vehicle/sparepart-servis-b.js'],
    {
      D,
      VehicleCatalog,
      curVehicleId,
      codeFromName: (s) => String(s).slice(0, 3).toUpperCase(),
      save: () => calls.push('save'),
      toast: (m) => calls.push('toast:' + m),
      askConfirm: async () => true,
      renderServisList: () => calls.push('renderServisList'),
      renderDashboardServisReminder: () => calls.push('renderDashboardServisReminder'),
      escapeHtml: (s) => String(s == null ? '' : s),
      document: { getElementById: () => null },
      MY_WRENCH: {},
    },
    ['Sparepart']
  );
}

test('syncFromCatalog() — kategori baru dari Katalog match by partName (bukan label category umum) simpan group/groupIcon', async () => {
  const D = baseD();
  const calls = [];
  const items = [
    { id: 'cat1', partName: 'Busi', category: 'Umum', compatibleVehicleIds: ['veh1'], isDraft: false },
  ];
  const VehicleCatalog = { getAll: async () => items };
  const ctx = makeSyncCtx({ D, VehicleCatalog, curVehicleId: 'veh1', calls });

  await ctx.Sparepart.syncFromCatalog();

  const cat = D.sparepartCats.find((c) => c.name === 'Umum');
  assert.ok(cat, 'kategori "Umum" (dari it.category) harus dibuat');
  assert.equal(cat.group, 'Perawatan Berkala', 'group harus dari match it.partName ("Busi"), bukan dari catName "Umum"');
  assert.equal(cat.groupIcon, '🛠️');
});

// --- 3) commitCategoryCSV() -----------------------------------------------

function makeCsvCtx({ D, curVehicleId, calls }) {
  return loadSource(
    ['modules/vehicle/sparepart-servis.js', 'modules/vehicle/sparepart-servis-b.js'],
    {
      D,
      curVehicleId,
      save: () => (calls || []).push('save'),
      codeFromName: (s) => String(s).slice(0, 3).toUpperCase(),
      document: { getElementById: () => null, querySelectorAll: () => [] },
      MY_WRENCH: {},
    },
    ['Sparepart']
  );
}

test('commitCategoryCSV() — baris baru simpan group/groupIcon (match TORSI_DB kendaraan aktif via curVehicleId)', () => {
  const D = baseD();
  const calls = [];
  const ctx = makeCsvCtx({ D, curVehicleId: 'veh1', calls });
  const res = ctx.Sparepart.commitCategoryCSV([{ nama: 'Busi', intervalKm: 8000 }]);
  assert.equal(res.created, 1);
  const cat = D.sparepartCats.find((c) => c.name === 'Busi');
  assert.ok(cat);
  assert.equal(cat.group, 'Perawatan Berkala');
  assert.equal(cat.groupIcon, '🛠️');
});

test('commitCategoryCSV() — tanpa curVehicleId (konteks non-kendaraan) tetap aman, fallback GENERIC_GROUP_BY_NAME/"Lainnya"', () => {
  const D = baseD();
  const calls = [];
  const ctx = makeCsvCtx({ D, curVehicleId: undefined, calls });
  const res = ctx.Sparepart.commitCategoryCSV([{ nama: 'Aki', intervalKm: 12000 }]);
  assert.equal(res.created, 1);
  const cat = D.sparepartCats.find((c) => c.name === 'Aki');
  assert.ok(cat);
  assert.equal(cat.group, 'Kelistrikan & Panel');
});

test('commitCategoryCSV() — baris UPDATE kategori existing tidak menimpa group yg sudah tersimpan (di luar scope sesi ini)', () => {
  const D = baseD({
    sparepartCats: [{ id: 'sp_old', name: 'Busi', code: 'BUS', intervalKm: 6000, intervalBulan: 0, showInReminder: true, group: 'Grup Lama Manual', groupIcon: '🧩' }],
  });
  const calls = [];
  const ctx = makeCsvCtx({ D, curVehicleId: 'veh1', calls });
  const res = ctx.Sparepart.commitCategoryCSV([{ nama: 'Busi', intervalKm: 9000 }]);
  assert.equal(res.updated, 1);
  const cat = D.sparepartCats.find((c) => c.name === 'Busi');
  assert.equal(cat.intervalKm, 9000, 'intervalKm ikut diupdate seperti biasa');
  assert.equal(cat.group, 'Grup Lama Manual', 'group existing tidak disentuh oleh jalur UPDATE (hanya jalur CREATE yang di-scope sesi ini)');
});

// --- 4) saveCat() EDIT — recompute group kalau nama/kendaraan berubah -----

test('saveCat() EDIT — nama TIDAK berubah -> group existing (manual) dibiarkan apa adanya', () => {
  const D = baseD({
    sparepartCats: [{ id: 'sp_x', name: 'Busi', code: 'BUS', intervalKm: 6000, intervalBulan: 0, showInReminder: true, vehicleId: 'veh1', group: 'Grup Manual Kustom', groupIcon: '🧩' }],
  });
  const ctx = makeSaveCatCtx(D, 'veh1');
  ctx.Sparepart.catEditIdx = 0;
  const els = ctx.document.getElementById('sparepartVehicleId');
  els.value = 'veh1';
  ctx.Sparepart.saveCat();
  const cat = D.sparepartCats[0];
  assert.equal(cat.intervalKm, 8000, 'interval tetap ikut terupdate seperti biasa');
  assert.equal(cat.group, 'Grup Manual Kustom', 'group manual tidak ditimpa krn nama & kendaraan tidak berubah');
});

test('saveCat() EDIT — nama berubah -> group direcompute sesuai nama baru', () => {
  const D = baseD({
    sparepartCats: [{ id: 'sp_x', name: 'Nama Lama Aneh', code: 'NLA', intervalKm: 6000, intervalBulan: 0, showInReminder: true, vehicleId: 'veh1', group: 'Lainnya', groupIcon: '📦' }],
  });
  const ctx = makeSaveCatCtx(D, 'veh1');
  ctx.Sparepart.catEditIdx = 0;
  const els = ctx.document.getElementById('sparepartVehicleId');
  els.value = 'veh1';
  // rename ke "Busi" (match TORSI_DB Vario 125 -> Perawatan Berkala)
  ctx.document.getElementById('sparepartName').value = 'Busi';
  ctx.Sparepart.saveCat();
  const cat = D.sparepartCats[0];
  assert.equal(cat.name, 'Busi');
  assert.equal(cat.group, 'Perawatan Berkala', 'group direcompute mengikuti nama baru');
  assert.equal(cat.groupIcon, '🛠️');
});

test('saveCat() EDIT — kendaraan dipindah -> group direcompute sesuai TORSI_DB kendaraan baru', () => {
  const D = baseD({
    sparepartCats: [{ id: 'sp_x', name: 'Aki', code: 'AKI', intervalKm: 12000, intervalBulan: 0, showInReminder: true, vehicleId: 'veh1', group: 'Kelistrikan & Panel', groupIcon: '🔌' }],
  });
  const ctx = makeSaveCatCtx(D, 'veh2');
  ctx.Sparepart.catEditIdx = 0;
  ctx.document.getElementById('sparepartName').value = 'Aki';
  const els = ctx.document.getElementById('sparepartVehicleId');
  els.value = 'veh2'; // pindah dari veh1 -> veh2 (Xpang, tanpa TORSI_DB -> fallback GENERIC_GROUP_BY_NAME, tetap "Kelistrikan & Panel")
  ctx.Sparepart.saveCat();
  const cat = D.sparepartCats[0];
  assert.equal(cat.vehicleId, 'veh2');
  assert.equal(cat.group, 'Kelistrikan & Panel');
});

