'use strict';
// tests/vehicle-catalog-servis-snapshot.test.js — cakupan Sesi 180
// (Tahap 6B2): snapshot ringan opsional {catalogPartId, catalogPartQty,
// catalogPartOemCode} langsung di D.servisLogs, ditulis dari
// Servis._saveInner (car-notes.js), pola sama usedPartId/usedPartQty yang
// sudah ada. Field ini TERPISAH & ADDITIF dari mekanisme catalogPartRefs
// (Tahap 6 Sesi 1, modules/vehicle/vehicle-catalog-servis-link.js — sudah
// dites tersendiri di tests/vehicle-catalog-servis-link.test.js, TIDAK
// diubah sesi ini): keduanya tetap ditulis berdampingan, tidak saling
// menggantikan.
//
// Yang dites:
//  - Data lengkap (part dipilih) -> ketiga field tersimpan sesuai form.
//  - Data kosong (tidak pilih part katalog) -> optional, jadi null/0/''
//    (bukan undefined/error) -- konsisten pola usedPartId/usedPartQty.
//  - usedPartId/usedPartQty & mekanisme stok TIDAK berubah/tersentuh.
//  - Edit catatan servis existing -> field ter-update di tempat (bukan
//    menambah entri baru), konsisten alur edit yang sudah ada.
//  - VehicleCatalogServisLink.attachToServis (catalogPartRefs) tetap
//    terpanggil apa adanya, tidak dihapus/diganti.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeOption(value, oem) {
  return { value: String(value), dataset: { oem: oem || '' } };
}

function makeFakeDoc(values) {
  const els = {};
  Object.keys(values).forEach((id) => {
    const v = values[id];
    if (v && typeof v === 'object' && v.__select) {
      // Elemen <select> tiruan: butuh .value & .selectedOptions[0].dataset.oem
      // (dibaca Servis._saveInner utk snapshot catalogPartOemCode, sinkron,
      // tanpa panggilan VehicleCatalog tambahan).
      els[id] = { value: v.value, selectedOptions: v.value ? [makeOption(v.value, v.oem)] : [] };
    } else if (typeof v === 'boolean') {
      els[id] = { checked: v };
    } else {
      els[id] = { value: v };
    }
  });
  return {
    doc: { getElementById: (id) => els[id] || null },
    els,
  };
}

function selectField(value, oem) {
  return { __select: true, value, oem };
}

function makeCtx({ document, D, curVehicleId, calls } = {}) {
  return loadSource(
    ['car-notes.js'],
    {
      document,
      D,
      curVehicleId,
      uid: (() => { let n = 5000; return () => (n += 1); })(),
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
    servisDate: '2026-07-22',
    servisNote: '',
    servisAcc: 'a1',
    servisKm: '10000',
    servisInterval: '',
    servisPartId: '',
    servisPartQty: '1',
    servisCatalogPartId: selectField('', ''),
    servisCatalogPartQty: '1',
  }, overrides);
}

// ------------------------------------------------------------------------
// Simpan baru — part katalog dipilih
// ------------------------------------------------------------------------
test('Servis._saveInner (baru) — part katalog dipilih -> catalogPartId/Qty/OemCode tersimpan di D.servisLogs', async () => {
  const D = baseD();
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({
    servisCatalogPartId: selectField('cat1', 'AHM-123'),
    servisCatalogPartQty: '3',
  }));
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', calls });

  ctx.Servis.editId = null;
  await ctx.Servis._saveInner();

  assert.equal(D.servisLogs.length, 1);
  const log = D.servisLogs[0];
  assert.equal(log.catalogPartId, 'cat1');
  assert.equal(log.catalogPartQty, 3);
  assert.equal(log.catalogPartOemCode, 'AHM-123');
});

// ------------------------------------------------------------------------
// Simpan baru — tidak pilih part katalog (optional)
// ------------------------------------------------------------------------
test('Servis._saveInner (baru) — tidak pilih part katalog -> field optional, null/0/"" (bukan undefined)', async () => {
  const D = baseD();
  const calls = [];
  const { doc } = makeFakeDoc(baseFields());
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', calls });

  ctx.Servis.editId = null;
  await ctx.Servis._saveInner();

  assert.equal(D.servisLogs.length, 1);
  const log = D.servisLogs[0];
  assert.equal(log.catalogPartId, null);
  assert.equal(log.catalogPartQty, 0);
  assert.equal(log.catalogPartOemCode, '');
});

// ------------------------------------------------------------------------
// usedPartId / mekanisme stok TIDAK berubah
// ------------------------------------------------------------------------
test('Servis._saveInner — usedPartId/usedPartQty & stok TIDAK terpengaruh field katalog baru', async () => {
  const D = baseD({ partsStock: [{ id: 'p1', name: 'Oli Mesin', qty: 10, unit: 'L' }] });
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({
    servisPartId: 'p1',
    servisPartQty: '2',
    servisCatalogPartId: selectField('cat1', 'AHM-999'),
    servisCatalogPartQty: '1',
  }));
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', calls });

  ctx.Servis.editId = null;
  await ctx.Servis._saveInner();

  const log = D.servisLogs[0];
  assert.equal(log.usedPartId, 'p1');
  assert.equal(log.usedPartQty, 2);
  assert.equal(D.partsStock[0].qty, 8, 'stok tetap terpotong seperti biasa, tidak terpengaruh field katalog baru');
  // Field katalog baru tetap tersimpan berdampingan.
  assert.equal(log.catalogPartId, 'cat1');
  assert.equal(log.catalogPartOemCode, 'AHM-999');
});

// ------------------------------------------------------------------------
// VehicleCatalogServisLink (catalogPartRefs) tetap terpanggil apa adanya
// ------------------------------------------------------------------------
test('Servis._saveInner — VehicleCatalogServisLink.attachToServis tetap terpanggil (mekanisme catalogPartRefs Sesi 1 tidak dihapus)', async () => {
  const D = baseD();
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({
    servisCatalogPartId: selectField('cat1', 'AHM-123'),
    servisCatalogPartQty: '3',
  }));
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', calls });

  ctx.Servis.editId = null;
  await ctx.Servis._saveInner();

  const servisId = D.servisLogs[0].id;
  assert.ok(calls.includes(`attachToServis:${servisId}:[{"catalogId":"cat1","qty":3}]`));
});

// ------------------------------------------------------------------------
// Edit — field ter-update di tempat, bukan entri baru
// ------------------------------------------------------------------------
test('Servis._saveInner (edit) — catalogPartId/Qty/OemCode ter-update di tempat, tidak menambah entri baru', async () => {
  const D = baseD({
    servisLogs: [{
      id: 's1', vehicleId: 'v1', date: '2026-07-01', item: 'Ganti Oli', km: 9000, cost: 40000,
      note: '', accountId: 'a1', usedPartId: null, usedPartQty: 0,
      catalogPartId: 'cat-old', catalogPartQty: 1, catalogPartOemCode: 'OLD-1',
    }],
  });
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({
    servisCatalogPartId: selectField('cat-new', 'NEW-2'),
    servisCatalogPartQty: '5',
  }));
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', calls });

  ctx.Servis.editId = 's1';
  await ctx.Servis._saveInner();

  assert.equal(D.servisLogs.length, 1, 'edit tidak boleh menambah entri baru');
  const log = D.servisLogs[0];
  assert.equal(log.catalogPartId, 'cat-new');
  assert.equal(log.catalogPartQty, 5);
  assert.equal(log.catalogPartOemCode, 'NEW-2');
});

test('Servis._saveInner (edit) — hapus pilihan part katalog -> field balik ke optional/default', async () => {
  const D = baseD({
    servisLogs: [{
      id: 's1', vehicleId: 'v1', date: '2026-07-01', item: 'Ganti Oli', km: 9000, cost: 40000,
      note: '', accountId: 'a1', usedPartId: null, usedPartQty: 0,
      catalogPartId: 'cat-old', catalogPartQty: 1, catalogPartOemCode: 'OLD-1',
    }],
  });
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({ servisCatalogPartId: selectField('', '') }));
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', calls });

  ctx.Servis.editId = 's1';
  await ctx.Servis._saveInner();

  const log = D.servisLogs[0];
  assert.equal(log.catalogPartId, null);
  assert.equal(log.catalogPartQty, 0);
  assert.equal(log.catalogPartOemCode, '');
});

// ------------------------------------------------------------------------
// Guard: servisCatalogPartId tidak ada di DOM (mis. modal versi lama)
// ------------------------------------------------------------------------
test('Servis._saveInner — elemen servisCatalogPartId tidak ada -> tidak error, field katalog jadi default optional', async () => {
  const D = baseD();
  const calls = [];
  const fields = baseFields();
  delete fields.servisCatalogPartId;
  delete fields.servisCatalogPartQty;
  const { doc } = makeFakeDoc(fields);
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', calls });

  ctx.Servis.editId = null;
  await assert.doesNotReject(() => ctx.Servis._saveInner());

  const log = D.servisLogs[0];
  assert.equal(log.catalogPartId, null);
  assert.equal(log.catalogPartQty, 0);
  assert.equal(log.catalogPartOemCode, '');
});
