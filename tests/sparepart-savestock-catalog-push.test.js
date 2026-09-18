'use strict';
// tests/sparepart-savestock-catalog-push.test.js — cakupan Tahap 10
// (lanjutan Tahap 9, jembatan Vehicle Catalog <-> Stok Sparepart Keuangan):
// Sparepart.saveStock() (modules/vehicle/sparepart-servis.js, dipanggil
// dari modal "⚙️ Atur -> Kelola Stok Sparepart") sekarang JUGA otomatis
// bikin entri di Vehicle Catalog untuk part baru (bukan edit), best-effort
// & tidak memblokir simpan stok kalau VehicleCatalog gagal/belum ada.
// Pola sama persis applyTxStockFromTx() di tx-stok-sparepart.js (arah
// sebaliknya: Keuangan -> Katalog), lihat
// tests/tx-stok-sparepart-catalog-link.test.js untuk fungsi bridge murninya
// (syncPartsStockFromCatalog / syncUnlinkedCatalogPartsToStock).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFields(values) {
  const els = {};
  Object.keys(values).forEach((id) => { els[id] = { value: values[id] }; });
  return { getElementById: (id) => els[id] || null };
}

function makeCtx({ D, document, VehicleCatalog, VehicleCatalogWriteSOT, calls }) {
  return loadSource(
    ['modules/vehicle/sparepart-servis.js', 'modules/vehicle/sparepart-servis-ui.js'],
    {
      D,
      document,
      VehicleCatalog,
      VehicleCatalogWriteSOT,
      codeFromName: (s) => String(s).slice(0, 3).toUpperCase(),
      save: () => calls.push('save'),
      closeModal: () => calls.push('closeModal'),
      toast: (m) => calls.push('toast:' + m),
      MY_WRENCH: {},
    },
    ['Sparepart']
  );
}

function baseFieldValues(overrides) {
  return Object.assign(
    {
      stockName: 'Oli Mesin Yamalube 1L',
      stockCatId: '',
      stockCode: '',
      stockQty: '2',
      stockUnit: 'botol',
      stockMin: '1',
      stockPrice: '35000',
      stockNote: '',
    },
    overrides || {}
  );
}

test('saveStock() — part baru (bukan edit) dipush best-effort lewat VehicleCatalogWriteSOT.ensurePart()', async () => {
  const D = { partsStock: [], sparepartCats: [] };
  const document = makeFields(baseFieldValues());
  const calls = [];
  const ensureCalls = [];
  const VehicleCatalog = {};
  const VehicleCatalogWriteSOT = {
    ensurePart: (payload) => {
      ensureCalls.push(payload);
      return Promise.resolve({ id: 'cat_new_1', ...payload });
    },
  };
  const ctx = makeCtx({ D, document, VehicleCatalog, VehicleCatalogWriteSOT, calls });
  ctx.Sparepart.stockEditIdx = null;
  ctx.Sparepart.saveStock();
  assert.equal(D.partsStock.length, 1);
  assert.equal(D.partsStock[0].name, 'Oli Mesin Yamalube 1L');
  assert.equal(ensureCalls.length, 1);
  assert.equal(ensureCalls[0].partName, 'Oli Mesin Yamalube 1L');
  assert.equal(ensureCalls[0].category, 'Umum'); // tidak pilih kategori -> fallback Umum
  // VehicleCatalog.create() async -> tunggu microtask sebelum cek catalogId ter-set
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(D.partsStock[0].catalogId, 'cat_new_1');
  assert.ok(calls.filter((c) => c === 'save').length >= 2); // save() awal + save() setelah catalogId ter-set
});

test('saveStock() — kategori dipilih -> nama kategori ikut dikirim ke Write SOT', async () => {
  const D = { partsStock: [], sparepartCats: [{ id: 'sp1', name: 'Oli', code: 'OLI', intervalKm: 0 }] };
  const document = makeFields(baseFieldValues({ stockCatId: 'sp1' }));
  const calls = [];
  const ensureCalls = [];
  const VehicleCatalog = {};
  const VehicleCatalogWriteSOT = {
    ensurePart: (payload) => { ensureCalls.push(payload); return Promise.resolve({ id: 'cat_new_2', ...payload }); },
  };
  const ctx = makeCtx({ D, document, VehicleCatalog, VehicleCatalogWriteSOT, calls });
  ctx.Sparepart.stockEditIdx = null;
  ctx.Sparepart.saveStock();
  assert.equal(ensureCalls[0].category, 'Oli');
});

test('saveStock() — edit item existing TIDAK memicu Write SOT lagi', () => {
  const D = { partsStock: [{ id: 'st_1', name: 'Lama', catId: null, code: 'X', qty: 1, unit: 'pcs', minStock: 1, price: 0, note: '' }], sparepartCats: [] };
  const document = makeFields(baseFieldValues({ stockName: 'Nama Diubah' }));
  const calls = [];
  let ensureCalled = 0;
  const VehicleCatalog = {};
  const VehicleCatalogWriteSOT = { ensurePart: () => { ensureCalled++; return Promise.resolve({ id: 'x' }); } };
  const ctx = makeCtx({ D, document, VehicleCatalog, VehicleCatalogWriteSOT, calls });
  ctx.Sparepart.stockEditIdx = 0;
  ctx.Sparepart.saveStock();
  assert.equal(D.partsStock[0].name, 'Nama Diubah');
  assert.equal(ensureCalled, 0);
});

test('saveStock() — Write SOT tidak tersedia -> tetap simpan stok tanpa error', () => {
  const D = { partsStock: [], sparepartCats: [] };
  const document = makeFields(baseFieldValues());
  const calls = [];
  const ctx = makeCtx({ D, document, VehicleCatalog: undefined, VehicleCatalogWriteSOT: undefined, calls });
  ctx.Sparepart.stockEditIdx = null;
  assert.doesNotThrow(() => ctx.Sparepart.saveStock());
  assert.equal(D.partsStock.length, 1);
});

test('saveStock() — Write SOT reject -> best-effort, stok tetap tersimpan dan catalogId belum terisi', async () => {
  const D = { partsStock: [], sparepartCats: [] };
  const document = makeFields(baseFieldValues());
  const calls = [];
  const VehicleCatalog = {};
  const VehicleCatalogWriteSOT = { ensurePart: () => Promise.reject(new Error('gagal')) };
  const ctx = makeCtx({ D, document, VehicleCatalog, VehicleCatalogWriteSOT, calls });
  ctx.Sparepart.stockEditIdx = null;
  assert.doesNotThrow(() => ctx.Sparepart.saveStock());
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(D.partsStock.length, 1);
  assert.equal(D.partsStock[0].catalogId, undefined);
});
