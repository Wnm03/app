'use strict';
// tests/sparepart-catmodal-vehicle-edit-audit.test.js — audit user (lihat
// chat, dari screenshot "🔧 Kelola Kategori Sparepart & Interval Servis"):
// dropdown "Berlaku untuk Kendaraan" di modal Kategori Sparepart dulu (S629)
// SELALU dikunci/disabled, baik tambah baru MAUPUN edit -- vehicleId yang
// tersimpan SELALU dipaksa ikut curVehicleId (tab kendaraan aktif), user
// tidak bisa pindahkan kategori existing ke kendaraan lain / ke universal
// lewat modal ini. Permintaan user sesi ini: saat TAMBAH baru tetap dikunci
// (perilaku lama, wajar ikut tab aktif), tapi saat EDIT kategori yang SUDAH
// ADA, dropdown harus BISA diubah manual. Test ini pakai document stub
// custom (bukan permissive default loadSource) supaya bisa baca .disabled/
// .value elemen DOM asli, sama pola dgn
// tests/sparepart-render-dashboard-vehicle-scope-audit.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(initial) {
  return Object.assign(
    { value: '', disabled: false, textContent: '', checked: false, innerHTML: '', style: {}, dataset: {}, oninput: null, classList: { add() {}, remove() {} } },
    initial || {}
  );
}

function makeCtx(D, curVehicleId) {
  const els = {
    sparepartModalTitle: makeEl(),
    sparepartName: makeEl(),
    sparepartCode: makeEl(),
    sparepartInterval: makeEl(),
    sparepartShowInReminder: makeEl({ checked: true }),
    sparepartVehicleId: makeEl(),
    sparepartVehicleHint: makeEl(),
    sparepartAiSuggestBox: makeEl(),
    sparepartDelBtn: makeEl(),
    sparepartCatList: makeEl(),
  };
  const document = { getElementById: (id) => els[id] || null };
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'modules/vehicle/sparepart-servis.js'],
    {
      D,
      document,
      curVehicleId,
      openModal: () => {},
      closeModal: () => {},
      save: () => {},
      toast: () => {},
      fmt: (n) => String(n),
      askConfirm: async () => true,
      renderServisList: () => {},
      renderDashboardServisReminder: () => {},
      matchingVehicleName: () => null,
      MY_WRENCH: { brand: 'MOLLAR', sku: 'MLR-B11950', minNm: 13.56, maxNm: 108.48, minLbft: 10, maxLbft: 80, panjang: 280 },
    },
    ['Sparepart']
  );
  return { ctx, els };
}

function makeD(cats) {
  return { vehicles: [{ id: 'veh1', name: 'Vario 125' }, { id: 'veh2', name: 'Beat FI' }], sparepartCats: cats || [], partsStock: [] };
}

test('TAMBAH kategori baru — dropdown kendaraan TETAP terkunci (disabled), auto ikut curVehicleId (perilaku S629 tidak berubah)', () => {
  const D = makeD();
  const { ctx, els } = makeCtx(D, 'veh1');
  ctx.Sparepart.openCatModal(null);
  assert.equal(els.sparepartVehicleId.disabled, true);
  assert.equal(els.sparepartVehicleId.value, 'veh1');
  els.sparepartName.value = 'Oli Mesin';
  els.sparepartInterval.value = '2000';
  ctx.Sparepart.saveCat();
  assert.equal(D.sparepartCats[0].vehicleId, 'veh1');
});

test('EDIT kategori existing — dropdown kendaraan TERBUKA (enabled), nilai awal = vehicleId tersimpan (bukan dipaksa curVehicleId)', () => {
  const D = makeD([{ id: 'sp1', name: 'Ganti Oli', code: 'GAN', intervalKm: 2000, vehicleId: 'veh2' }]);
  const { ctx, els } = makeCtx(D, 'veh1'); // tab aktif veh1, tapi kategori ini milik veh2
  ctx.Sparepart.openCatModal(0);
  assert.equal(els.sparepartVehicleId.disabled, false);
  assert.equal(els.sparepartVehicleId.value, 'veh2');
});

test('EDIT kategori existing — user pindahkan ke "🌐 Semua kendaraan" via select, tersimpan sbg universal (vehicleId null)', () => {
  const D = makeD([{ id: 'sp1', name: 'Ganti Oli', code: 'GAN', intervalKm: 2000, vehicleId: 'veh2' }]);
  const { ctx, els } = makeCtx(D, 'veh1');
  ctx.Sparepart.openCatModal(0);
  els.sparepartVehicleId.value = ''; // user pilih "🌐 Semua kendaraan" di dropdown
  ctx.Sparepart.saveCat();
  assert.equal(D.sparepartCats[0].vehicleId, null);
});

test('EDIT kategori universal (vehicleId null) — user pindahkan manual ke kendaraan lain via select', () => {
  const D = makeD([{ id: 'sp1', name: 'Baut Universal', code: 'BAU', intervalKm: 5000, vehicleId: null }]);
  const { ctx, els } = makeCtx(D, 'veh1');
  ctx.Sparepart.openCatModal(0);
  assert.equal(els.sparepartVehicleId.value, ''); // awalnya universal
  els.sparepartVehicleId.value = 'veh2'; // user pindahkan manual ke Beat FI
  ctx.Sparepart.saveCat();
  assert.equal(D.sparepartCats[0].vehicleId, 'veh2');
});

test('EDIT kategori existing — kalau select TIDAK diubah user, vehicleId lama tetap tersimpan apa adanya', () => {
  const D = makeD([{ id: 'sp1', name: 'Ganti Oli', code: 'GAN', intervalKm: 2000, vehicleId: 'veh2' }]);
  const { ctx, els } = makeCtx(D, 'veh1');
  ctx.Sparepart.openCatModal(0);
  ctx.Sparepart.saveCat(); // select tidak disentuh, masih 'veh2' dari openCatModal
  assert.equal(D.sparepartCats[0].vehicleId, 'veh2');
});

// --- Stok Sparepart (pola identik, elId 'stockVehicleId') ---

function makeStockEls() {
  return {
    stockModalTitle: makeEl(),
    stockCatId: makeEl(),
    stockName: makeEl(),
    stockCode: makeEl(),
    stockQty: makeEl(),
    stockUnit: makeEl(),
    stockMin: makeEl(),
    stockPrice: makeEl(),
    stockNote: makeEl(),
    stockVehicleId: makeEl(),
    stockVehicleHint: makeEl(),
    stockCatSearch: makeEl(),
  };
}

function makeStockCtx(D, curVehicleId) {
  const els = makeStockEls();
  const document = { getElementById: (id) => els[id] || null };
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'modules/vehicle/sparepart-servis.js'],
    {
      D,
      document,
      curVehicleId,
      openModal: () => {},
      closeModal: () => {},
      save: () => {},
      toast: () => {},
      fmt: (n) => String(n),
      MY_WRENCH: { brand: 'MOLLAR', sku: 'MLR-B11950', minNm: 13.56, maxNm: 108.48, minLbft: 10, maxLbft: 80, panjang: 280 },
    },
    ['Sparepart']
  );
  return { ctx, els };
}

test('TAMBAH stok baru — dropdown kendaraan tetap terkunci, auto ikut curVehicleId (perilaku S629 tidak berubah)', () => {
  const D = makeD();
  const { ctx, els } = makeStockCtx(D, 'veh1');
  ctx.Sparepart.openStockModal(null);
  assert.equal(els.stockVehicleId.disabled, true);
  els.stockName.value = 'Kampas Rem';
  ctx.Sparepart.saveStock();
  assert.equal(D.partsStock[0].vehicleId, 'veh1');
});

test('EDIT stok existing — dropdown terbuka, bisa dipindah manual ke kendaraan lain', () => {
  const D = makeD();
  D.partsStock = [{ id: 'st1', name: 'Kampas Rem', code: 'KAM-001', qty: 2, vehicleId: 'veh2' }];
  const { ctx, els } = makeStockCtx(D, 'veh1');
  ctx.Sparepart.openStockModal(0);
  assert.equal(els.stockVehicleId.disabled, false);
  assert.equal(els.stockVehicleId.value, 'veh2');
  els.stockVehicleId.value = ''; // pindahkan ke universal
  ctx.Sparepart.saveStock();
  assert.equal(D.partsStock[0].vehicleId, null);
});

// --- Tab Rekomendasi AI selalu tampil sesuai kendaraan aktif ---

test('openCatModal() TAMBAH baru dgn nama kosong — box AI disembunyikan (bukan toast error)', () => {
  const D = makeD();
  const { ctx, els } = makeCtx(D, 'veh1');
  ctx.Sparepart.openCatModal(null);
  assert.equal(els.sparepartAiSuggestBox.classList, els.sparepartAiSuggestBox.classList); // no throw
  assert.match(els.sparepartAiSuggestBox.innerHTML, /^$|u-dnone/); // tetap kosong/disembunyikan, tidak mengganggu
});

test('openCatModal() EDIT kategori existing — box AI otomatis terisi tanpa perlu tap tombol manual', () => {
  const D = makeD([{ id: 'sp1', name: 'Oli Mesin', code: 'OLI', intervalKm: 1500, vehicleId: 'veh1' }]);
  const { ctx, els } = makeCtx(D, 'veh1');
  ctx.Sparepart.openCatModal(0);
  // suggestServiceIntervalKm mungkin balik null kalau TORSI_DB tidak ter-load di sandbox test ini,
  // yang penting: box TIDAK kosong/dnone (fungsi auto-render benar-benar dipanggil), bukan nunggu klik.
  assert.notEqual(els.sparepartAiSuggestBox.innerHTML, '');
});

test('autoSuggestInterval() — nama kosong TIDAK toast error (beda dari suggestInterval() manual)', () => {
  const D = makeD();
  let toasted = false;
  const { ctx, els } = makeCtx(D, 'veh1');
  ctx.toast = () => { toasted = true; };
  els.sparepartName.value = '';
  ctx.Sparepart.autoSuggestInterval();
  assert.equal(toasted, false);
});

