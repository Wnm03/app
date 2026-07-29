'use strict';
// tests/vehicle-catalog-import-stock-push.test.js — cakupan
// modules/vehicle/vehicle-catalog-import-stock-push.js (fitur "Push ke
// Stok Sparepart" pasca Import Katalog). `run()` dites sbg logic MURNI
// (stub `syncPartsStockFromCatalog`, pola sama
// tests/tx-stok-sparepart-catalog-link.test.js). `promptAndRun()` dites
// dgn stub `askConfirm`/`showPromptModal`/`toast`/`save` (bukan DOM
// asli) — cukup utk cakupan orkestrasi (kapan `run()` dipanggil/tidak),
// sama pola tests/sparepart-ocr-catalog-add.test.js utk modul sejenis.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(extra) {
  return loadSource(
    ['modules/vehicle/vehicle-catalog-import-stock-push.js'],
    Object.assign({}, extra || {}),
    ['VehicleCatalogImportStockPush']
  );
}

// ------------------------------------------------------------------------
// run() — logic murni
// ------------------------------------------------------------------------
test('run() — menghubungkan tiap item lewat syncPartsStockFromCatalog(), qty ditambahkan ke tiap baris', () => {
  const linked = [];
  const stock = { a1: { id: 'st_a1', catalogId: 'a1', qty: 0 }, a2: { id: 'st_a2', catalogId: 'a2', qty: 3 } };
  const ctx = makeCtx({
    syncPartsStockFromCatalog: (item) => { linked.push(item.id); return stock[item.id]; },
  });
  const result = ctx.VehicleCatalogImportStockPush.run(
    [{ id: 'a1', partName: 'Kampas Rem' }, { id: 'a2', partName: 'Busi' }],
    5
  );
  assert.deepEqual(linked, ['a1', 'a2']);
  assert.equal(result.pushed, 2);
  assert.equal(result.totalQtyAdded, 10);
  assert.equal(stock.a1.qty, 5);
  assert.equal(stock.a2.qty, 8); // qty existing DITAMBAH, bukan ditimpa
});

test('run() — qty 0/negatif/NaN tetap menghubungkan part tapi TIDAK menambah qty', () => {
  const stock = { a1: { id: 'st_a1', qty: 2 } };
  const ctx = makeCtx({
    syncPartsStockFromCatalog: (item) => stock[item.id],
  });
  const result = ctx.VehicleCatalogImportStockPush.run([{ id: 'a1' }], 0);
  assert.equal(result.pushed, 1);
  assert.equal(result.totalQtyAdded, 0);
  assert.equal(stock.a1.qty, 2);
});

test('run() — array kosong -> {pushed:0, totalQtyAdded:0}, TIDAK memanggil syncPartsStockFromCatalog', () => {
  let calls = 0;
  const ctx = makeCtx({ syncPartsStockFromCatalog: () => { calls++; return {}; } });
  const result = ctx.VehicleCatalogImportStockPush.run([], 5);
  assert.equal(result.pushed, 0);
  assert.equal(result.totalQtyAdded, 0);
  assert.equal(calls, 0);
});

test('run() — syncPartsStockFromCatalog belum tersedia -> gagal aman, tidak melempar', () => {
  const ctx = makeCtx({}); // sengaja tidak inject syncPartsStockFromCatalog
  const result = ctx.VehicleCatalogImportStockPush.run([{ id: 'a1' }], 5);
  assert.equal(result.pushed, 0);
  assert.equal(result.totalQtyAdded, 0);
});

// ------------------------------------------------------------------------
// promptAndRun() — orkestrasi (stub modal, bukan DOM asli)
// ------------------------------------------------------------------------
test('promptAndRun() — array kosong -> return null, TIDAK menampilkan modal apa pun', async () => {
  let confirmCalled = false;
  const ctx = makeCtx({ askConfirm: async () => { confirmCalled = true; return true; } });
  const result = await ctx.VehicleCatalogImportStockPush.promptAndRun([]);
  assert.equal(result, null);
  assert.equal(confirmCalled, false);
});

test('promptAndRun() — user batal di konfirmasi pertama -> return null, run() tidak dipanggil', async () => {
  let syncCalled = false;
  const ctx = makeCtx({
    askConfirm: async () => false,
    showPromptModal: async () => '5',
    syncPartsStockFromCatalog: () => { syncCalled = true; return {}; },
  });
  const result = await ctx.VehicleCatalogImportStockPush.promptAndRun([{ id: 'a1' }]);
  assert.equal(result, null);
  assert.equal(syncCalled, false);
});

test('promptAndRun() — user batal di prompt qty (null) -> return null, run() tidak dipanggil', async () => {
  let syncCalled = false;
  const ctx = makeCtx({
    askConfirm: async () => true,
    showPromptModal: async () => null,
    syncPartsStockFromCatalog: () => { syncCalled = true; return {}; },
  });
  const result = await ctx.VehicleCatalogImportStockPush.promptAndRun([{ id: 'a1' }]);
  assert.equal(result, null);
  assert.equal(syncCalled, false);
});

test('promptAndRun() — konfirmasi + qty diisi -> memanggil run(), save(), populateTxStockSelect(), toast() ringkasan', async () => {
  const stock = { a1: { id: 'st_a1', qty: 0 } };
  let saveCalled = false;
  let populateCalled = false;
  let toastMsg = null;
  const ctx = makeCtx({
    askConfirm: async () => true,
    showPromptModal: async () => '10',
    syncPartsStockFromCatalog: (item) => stock[item.id],
    save: () => { saveCalled = true; },
    populateTxStockSelect: () => { populateCalled = true; },
    toast: (msg) => { toastMsg = msg; },
  });
  const result = await ctx.VehicleCatalogImportStockPush.promptAndRun([{ id: 'a1' }]);
  assert.equal(result.pushed, 1);
  assert.equal(result.totalQtyAdded, 10);
  assert.equal(stock.a1.qty, 10);
  assert.equal(saveCalled, true);
  assert.equal(populateCalled, true);
  assert.match(toastMsg, /1 part/);
});

test('promptAndRun() — qty dikosongkan (string kosong) -> tetap jalan, part dihubungkan tanpa tambah qty', async () => {
  const stock = { a1: { id: 'st_a1', qty: 0 } };
  let toastMsg = null;
  const ctx = makeCtx({
    askConfirm: async () => true,
    showPromptModal: async () => '',
    syncPartsStockFromCatalog: (item) => stock[item.id],
    save: () => {},
    toast: (msg) => { toastMsg = msg; },
  });
  const result = await ctx.VehicleCatalogImportStockPush.promptAndRun([{ id: 'a1' }]);
  assert.equal(result.pushed, 1);
  assert.equal(result.totalQtyAdded, 0);
  assert.equal(stock.a1.qty, 0);
  assert.match(toastMsg, /1 part/);
});
