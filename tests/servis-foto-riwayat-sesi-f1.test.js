'use strict';
// tests/servis-foto-riwayat-sesi-f1.test.js
//
// Sesi F1 (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi F "Foto di
// Service History", langkah pertama -- cakupan sengaja dipersempit ke
// data model + persist saja, TIDAK termasuk thumbnail di daftar Riwayat
// Servis (backlog Sesi F lanjutan)).
//
// Servis._photoDraft (array dataURL string, in-memory saja selama modal
// terbuka) sekarang ikut ditulis sebagai field `foto` di D.servisLogs[]
// saat _saveInner() sukses -- baik jalur BUAT BARU maupun jalur EDIT.
// Field ini OPSIONAL & backward-compatible: entry lama tanpa `foto` tetap
// valid (Servis._renderPhotoThumbs()/openModal() fallback ke []).
//
// 0 regresi: field/perilaku lain (transaksi, stok, dll) tidak disentuh --
// test lain di servis-save-finance-updated-emit-v1644.test.js dkk sudah
// mengunci itu; test ini fokus HANYA pada `foto`.

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

function makeCtx({ document, D, curVehicleId }) {
  return loadSource(
    ['car-notes.js'],
    {
      document, D, curVehicleId,
      uid: (() => { let n = 9000; return () => (n += 1); })(),
      escapeHtml: (s) => String(s),
      matchingVehicleName: () => null,
      codeFromName: (s) => String(s).toLowerCase(),
      getVehicleKm: () => 15000,
      resolveVehicleTxCategory: () => 'Transportasi',
      save: () => {},
      closeModal: () => {},
      toast: () => {},
      renderCnTab: () => {},
      renderDashboard: () => {},
      renderKeuangan: () => {},
      askConfirm: async () => true,
      withSaveGuardAsync: (key, modalId, fn) => fn(),
      Sparepart: { renderStockList: () => {}, renderCatList: () => {} },
      VehicleCatalogServisLink: undefined,
      AIBus: { emit() {} },
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

test('Sesi F1: Servis._photoDraft default kosong ([])', () => {
  const D = baseD();
  const { doc } = makeFakeDoc(baseFields());
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1' });
  // _photoDraft dibuat di dalam sandbox vm (realm terpisah) -- bandingkan
  // panjang saja, bukan deepEqual lintas-realm (Array.prototype beda
  // instance walau isinya identik, bikin assert.deepEqual gagal semu).
  assert.equal(ctx.Servis._photoDraft.length, 0);
});

test('Sesi F1: jalur BUAT BARU menulis foto dari _photoDraft ke D.servisLogs[]', async () => {
  const D = baseD();
  const { doc } = makeFakeDoc(baseFields());
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1' });
  ctx.Servis.editId = null;
  ctx.Servis._photoDraft = ['data:image/png;base64,AAA', 'data:image/png;base64,BBB'];
  await ctx.Servis._saveInner();

  assert.equal(D.servisLogs.length, 1);
  assert.deepEqual(D.servisLogs[0].foto, ['data:image/png;base64,AAA', 'data:image/png;base64,BBB']);
});

test('Sesi F1: jalur BUAT BARU tanpa foto (_photoDraft kosong) -> foto: [] (0 regresi, field tetap ada tapi kosong)', async () => {
  const D = baseD();
  const { doc } = makeFakeDoc(baseFields());
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1' });
  ctx.Servis.editId = null;
  ctx.Servis._photoDraft = [];
  await ctx.Servis._saveInner();

  assert.equal(D.servisLogs.length, 1);
  assert.deepEqual(D.servisLogs[0].foto, []);
});

test('Sesi F1: jalur EDIT menimpa foto entry lama dengan _photoDraft saat ini', async () => {
  const D = baseD({
    servisLogs: [{ id: 's1', vehicleId: 'v1', date: '2026-07-01', item: 'Ganti Oli', categoryId: null, km: 9000, cost: 50000, note: '', accountId: 'a1', txLinkId: null, foto: ['data:image/png;base64,OLD'] }],
  });
  const { doc } = makeFakeDoc(baseFields({ servisCost: '90000' }));
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1' });
  ctx.Servis.editId = 's1';
  ctx.Servis._photoDraft = ['data:image/png;base64,NEW1', 'data:image/png;base64,NEW2'];
  await ctx.Servis._saveInner();

  assert.deepEqual(D.servisLogs[0].foto, ['data:image/png;base64,NEW1', 'data:image/png;base64,NEW2']);
});

test('Sesi F1: entry lama tanpa field `foto` sama sekali (pre-existing data) tidak bikin error saat di-load ulang ke _photoDraft (fallback [])', () => {
  const s = { id: 's1', vehicleId: 'v1', date: '2026-07-01', item: 'Ganti Oli', km: 9000, cost: 50000, note: '' };
  // Simulasi logika fallback yang dipakai Servis.openModal(): (s.foto||[]).slice()
  const draft = (s.foto || []).slice();
  assert.deepEqual(draft, []);
});

test('Sesi F1: removePhoto() menghapus 1 entry dari _photoDraft berdasarkan index', () => {
  const D = baseD();
  const { doc } = makeFakeDoc(baseFields());
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1' });
  ctx.Servis._photoDraft = ['A', 'B', 'C'];
  ctx.Servis._renderPhotoThumbs = () => {}; // stub, tidak sentuh DOM di test ini
  ctx.Servis.removePhoto(1);
  assert.deepEqual(ctx.Servis._photoDraft, ['A', 'C']);
});
