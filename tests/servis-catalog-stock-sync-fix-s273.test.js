'use strict';
// tests/servis-catalog-stock-sync-fix-s273.test.js — FIX (S273): implementasi
// rekomendasi audit Sesi 272 (CHANGELOG.md § Sesi 272 "Rekomendasi
// perbaikan").
//
// SEBELUM (S272, gap terbukti): `Servis._saveInner()` cuma pakai
// `Servis.findMatchingStockByName()` (match NAMA, case-insensitive) untuk
// menentukan `catalogLinkedStockId`, TIDAK PERNAH memeriksa field
// `catalogId` yang sudah ada di D.partsStock sejak Sesi 266/269. Akibatnya
// rename baris Stok Sparepart manual bikin stok diam-diam tidak terpotong,
// dan 2 baris stok bernama sama bisa membuat servis motong stok yang salah.
//
// SESUDAH (S273, fix ini): `Servis.findMatchingStockByCatalogId()` (baru)
// dicek LEBIH DULU — match presisi via `catalogId`, tahan terhadap rename
// nama stok manual & tidak ambigu saat nama duplikat.
// `findMatchingStockByName()` jadi FALLBACK saja, dipakai hanya kalau match
// via `catalogId` gagal (baris stok lama dari sebelum Sesi 266 yang belum
// pernah punya `catalogId`). Tidak ada skema data baru, 0 migrasi — persis
// seperti dijanjikan di rekomendasi S272.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeOption(value, oem, name) {
  return { value: String(value), dataset: { oem: oem || '', name: name || '' } };
}

function makeFakeDoc(values) {
  const els = {};
  Object.keys(values).forEach((id) => {
    const v = values[id];
    if (v && typeof v === 'object' && v.__select) {
      els[id] = { value: v.value, selectedOptions: v.value ? [makeOption(v.value, v.oem, v.name)] : [] };
    } else if (typeof v === 'boolean') {
      els[id] = { checked: v };
    } else {
      els[id] = { value: v };
    }
  });
  return { doc: { getElementById: (id) => els[id] || null } };
}

function selectField(value, oem, name) {
  return { __select: true, value, oem, name };
}

function makeCtx({ document, D, curVehicleId, calls }) {
  return loadSource(
    ['car-notes.js'],
    {
      document, D, curVehicleId,
      uid: (() => { let n = 9000; return () => (n += 1); })(),
      escapeHtml: (s) => String(s),
      matchingVehicleName: () => null,
      codeFromName: (s) => String(s).toLowerCase(),
      getVehicleKm: () => 0,
      resolveVehicleTxCategory: () => 'Transportasi',
      save: () => calls.push('save'),
      closeModal: (id) => calls.push('closeModal:' + id),
      toast: (msg) => calls.push('toast:' + msg),
      renderCnTab: () => calls.push('renderCnTab'),
      renderDashboard: () => calls.push('renderDashboard'),
      renderKeuangan: () => calls.push('renderKeuangan'),
      askConfirm: async () => true,
      withSaveGuardAsync: (key, modalId, fn) => fn(),
      Sparepart: {
        renderStockList: () => calls.push('Sparepart.renderStockList'),
        renderCatList: () => calls.push('Sparepart.renderCatList'),
      },
      VehicleCatalogServisLink: {
        attachToServis: (servisId, refs) => calls.push('attachToServis:' + servisId + ':' + JSON.stringify(refs)),
      },
    },
    ['Servis'],
  );
}

function baseD(overrides = {}) {
  return Object.assign({
    vehicles: [{ id: 'v1', name: 'Vario' }],
    accounts: [{ id: 'a1', name: 'Cash' }],
    sparepartCats: [],
    partsStock: [],
    servisLogs: [],
    transactions: [],
  }, overrides);
}

function baseFields(overrides = {}) {
  return Object.assign({
    servisItem: 'Ganti Oli',
    servisCost: '50000',
    servisDate: '2026-07-27',
    servisNote: '',
    servisAcc: 'a1',
    servisKm: '10000',
    servisInterval: '',
    servisPartId: '',
    servisPartQty: '1',
    servisCatalogPartId: selectField('', '', ''),
    servisCatalogPartQty: '1',
  }, overrides);
}

test('kasus normal: part katalog dgn catalogId cocok -> stok terpotong benar', async () => {
  const D = baseD({ partsStock: [{ id: 'st_1', name: 'Oli Mesin', qty: 10, unit: 'L', catalogId: 'cat_1' }] });
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({
    servisCatalogPartId: selectField('cat_1', 'AHM-OLI', 'Oli Mesin'),
    servisCatalogPartQty: '2',
  }));
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', calls });
  ctx.Servis.editId = null;
  await ctx.Servis._saveInner();

  const log = D.servisLogs[0];
  assert.equal(log.catalogPartLinkedStockId, 'st_1');
  assert.equal(D.partsStock[0].qty, 8); // 10-2
});

test('FIX: baris stok di-rename manual, catalogId sama -> tetap ketemu & stok terpotong (gap S272 tertutup)', async () => {
  // Simulasi: user rename baris stok lewat "Edit Stok Sparepart"
  // (Sparepart.saveStock() cuma Object.assign name/catId/code/qty/dst,
  // catalogId TETAP UTUH -- lihat modules/vehicle/sparepart-servis.js).
  const D = baseD({ partsStock: [{ id: 'st_1', name: 'Oli Mesin Federal 20W-50', qty: 10, unit: 'L', catalogId: 'cat_1' }] });
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({
    // Nama di Katalog TIDAK berubah ('Oli Mesin') -- match via catalogId
    // tidak peduli nama di sisi stok berbeda.
    servisCatalogPartId: selectField('cat_1', 'AHM-OLI', 'Oli Mesin'),
    servisCatalogPartQty: '2',
  }));
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', calls });
  ctx.Servis.editId = null;
  await ctx.Servis._saveInner();

  const log = D.servisLogs[0];
  // Sebelum fix: null (gap). Sesudah fix: match presisi via catalogId.
  assert.equal(log.catalogPartLinkedStockId, 'st_1');
  assert.equal(D.partsStock[0].qty, 8); // stok BERKURANG benar -- gap tertutup
});

test('FIX #2: 2 baris stok nama sama tapi catalogId beda -> servis potong stok yang BENAR', async () => {
  const D = baseD({
    partsStock: [
      { id: 'st_1', name: 'Oli Mesin', qty: 5, unit: 'L', catalogId: 'cat_A' },
      { id: 'st_2', name: 'Oli Mesin', qty: 20, unit: 'L', catalogId: 'cat_B' },
    ],
  });
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({
    // User pilih part katalog cat_B (bukan cat_A) di dropdown Servis.
    servisCatalogPartId: selectField('cat_B', 'AHM-OLI-B', 'Oli Mesin'),
    servisCatalogPartQty: '2',
  }));
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', calls });
  ctx.Servis.editId = null;
  await ctx.Servis._saveInner();

  const log = D.servisLogs[0];
  // Match presisi via catalogId -> st_2 (cat_B), BUKAN st_1 (match nama
  // pertama seperti perilaku lama).
  assert.equal(log.catalogPartLinkedStockId, 'st_2');
  assert.equal(D.partsStock[0].qty, 5); // st_1 (cat_A, tidak dipakai) TIDAK kepotong
  assert.equal(D.partsStock[1].qty, 18); // st_2 (cat_B, BENERAN dipakai) kepotong benar
});

test('FALLBACK: baris stok lama TANPA catalogId (dibuat sebelum Sesi 266) -> tetap match via nama', async () => {
  // findMatchingStockByCatalogId() gagal (tidak ada baris ber-catalogId
  // cat_1) -> fallback ke findMatchingStockByName(), sama seperti perilaku
  // lama untuk kasus ini. Memastikan fallback tidak rusak oleh fix.
  const D = baseD({ partsStock: [{ id: 'st_old', name: 'Oli Mesin', qty: 7, unit: 'L' }] }); // tanpa catalogId
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({
    servisCatalogPartId: selectField('cat_1', 'AHM-OLI', 'Oli Mesin'),
    servisCatalogPartQty: '3',
  }));
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', calls });
  ctx.Servis.editId = null;
  await ctx.Servis._saveInner();

  const log = D.servisLogs[0];
  assert.equal(log.catalogPartLinkedStockId, 'st_old'); // fallback name-match tetap jalan
  assert.equal(D.partsStock[0].qty, 4); // 7-3
});
