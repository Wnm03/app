'use strict';
// tests/sparepart-ocr-catalog-add.test.js — cakupan
// modules/vehicle/sparepart-ocr-catalog-add.js: kalau part TIDAK ditemukan
// (SparepartOcrCatalogLink, Tahap 7C-3a), buka form tambah part
// (VehicleCatalogUI.openForm(), SUDAH ADA) lalu ISI OTOMATIS (prefill)
// field yang ada & tidak kosong dari hasil parse OCR (perilaku Tahap
// 7C-3c dikembalikan sesi ini) — lalu simpan (VehicleCatalogUI.save())
// HANYA SETELAH konfirmasi (askConfirm()).
// VehicleCatalogUI/askConfirm/document di-mock lewat extraGlobals (pola
// sama tests/sparepart-ocr-catalog-link.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeElement(initial) {
  return { value: initial === undefined ? '' : initial };
}

function makeFakeDocument(elements) {
  return {
    getElementById(id) {
      return elements[id] || null;
    },
  };
}

function makeVehicleCatalogUI({ openFormFail, saveFail } = {}) {
  return {
    calls: { openForm: [], save: 0 },
    async openForm(id) {
      this.calls.openForm.push(id);
      if (openFormFail) throw new Error('openForm gagal');
    },
    async save() {
      this.calls.save++;
      if (saveFail) throw new Error('save gagal');
    },
  };
}

function makeCtx({ vcUI, askConfirmImpl, elements } = {}) {
  const VehicleCatalogUI = vcUI !== undefined ? vcUI : makeVehicleCatalogUI();
  const extraGlobals = { VehicleCatalogUI };
  if (askConfirmImpl !== undefined) extraGlobals.askConfirm = askConfirmImpl;
  if (elements !== undefined) extraGlobals.document = makeFakeDocument(elements);
  const ctx = loadSource(
    ['modules/vehicle/sparepart-ocr-catalog-add.js'],
    extraGlobals,
    ['SparepartOcrCatalogAdd']
  );
  return { ctx, VehicleCatalogUI };
}

const SAMPLE_PARSED = {
  oemCode: 'AHM12345K',
  partName: 'Kampas Rem Depan',
  brand: 'Aspira',
  barcode: '8991234567890',
};

// ------------------------------------------------------------------------
// fields() — presenter murni, hanya 3 field yang dipetakan
// ------------------------------------------------------------------------
test('fields() — memetakan partName/oemCode/barcode apa adanya (trim), brand/category TIDAK dipetakan', () => {
  const { ctx } = makeCtx();
  const f = ctx.SparepartOcrCatalogAdd.fields(SAMPLE_PARSED);
  assert.equal(f.partName, 'Kampas Rem Depan');
  assert.equal(f.oemCode, 'AHM12345K');
  assert.equal(f.barcode, '8991234567890');
  assert.equal(Object.prototype.hasOwnProperty.call(f, 'brand'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(f, 'category'), false);
});

test('fields() — parsed kosong/undefined -> semua field string kosong, tidak melempar', () => {
  const { ctx } = makeCtx();
  const fUndef = ctx.SparepartOcrCatalogAdd.fields(undefined);
  const fEmpty = ctx.SparepartOcrCatalogAdd.fields({});
  for (const f of [fUndef, fEmpty]) {
    assert.equal(f.partName, '');
    assert.equal(f.oemCode, '');
    assert.equal(f.barcode, '');
  }
});

test('fields() — trim whitespace di tiap field', () => {
  const { ctx } = makeCtx();
  const f = ctx.SparepartOcrCatalogAdd.fields({ partName: '  Kampas Rem  ', oemCode: ' AHM123 ', barcode: ' 899123 ' });
  assert.equal(f.partName, 'Kampas Rem');
  assert.equal(f.oemCode, 'AHM123');
  assert.equal(f.barcode, '899123');
});

// ------------------------------------------------------------------------
// open() — HANYA jalan kalau found:false
// ------------------------------------------------------------------------
test('open() — found:true -> TIDAK membuka form, return null, openForm() TIDAK dipanggil', async () => {
  const { ctx, VehicleCatalogUI } = makeCtx();
  const result = await ctx.SparepartOcrCatalogAdd.open({ found: true, item: { id: 'p1' } }, SAMPLE_PARSED);
  assert.equal(result, null);
  assert.equal(VehicleCatalogUI.calls.openForm.length, 0);
});

test('open() — found:false -> buka form TANPA id (mode tambah), lalu prefill 3 field dari hasil parse OCR', async () => {
  const elements = {
    catPartName: makeFakeElement(),
    catOemCode: makeFakeElement(),
    catBarcode: makeFakeElement(),
  };
  const { ctx, VehicleCatalogUI } = makeCtx({ elements });
  const result = await ctx.SparepartOcrCatalogAdd.open({ found: false, item: null }, SAMPLE_PARSED);
  assert.equal(VehicleCatalogUI.calls.openForm.length, 1);
  assert.equal(VehicleCatalogUI.calls.openForm[0], undefined); // dipanggil TANPA id -> mode "Tambah Part Baru"
  assert.equal(elements.catPartName.value, 'Kampas Rem Depan');
  assert.equal(elements.catOemCode.value, 'AHM12345K');
  assert.equal(elements.catBarcode.value, '8991234567890');
  assert.equal(result.opened, true);
});

test('open() — result undefined (bukan {found:...}) -> diperlakukan sama seperti found:false, tetap prefill', async () => {
  const elements = { catPartName: makeFakeElement(), catOemCode: makeFakeElement(), catBarcode: makeFakeElement() };
  const { ctx, VehicleCatalogUI } = makeCtx({ elements });
  const result = await ctx.SparepartOcrCatalogAdd.open(undefined, SAMPLE_PARSED);
  assert.equal(VehicleCatalogUI.calls.openForm.length, 1);
  assert.equal(elements.catPartName.value, 'Kampas Rem Depan');
  assert.equal(result.opened, true);
});

test('open() — hasil parse OCR sebagian kosong -> field form yang bersangkutan TIDAK ditimpa (tetap apa adanya)', async () => {
  const elements = {
    catPartName: makeFakeElement('Sudah Ada'),
    catOemCode: makeFakeElement(),
    catBarcode: makeFakeElement(),
  };
  const { ctx } = makeCtx({ elements });
  await ctx.SparepartOcrCatalogAdd.open({ found: false }, { oemCode: '', partName: '', barcode: '899123' });
  assert.equal(elements.catPartName.value, 'Sudah Ada'); // parsed.partName kosong -> tidak ditimpa
  assert.equal(elements.catOemCode.value, ''); // parsed.oemCode kosong -> tidak ditimpa
  assert.equal(elements.catBarcode.value, '899123'); // parsed.barcode ada -> ditulis
});

test('open() — parsed kosong/undefined -> tidak ada field yang ditimpa, tetap return {opened:true}', async () => {
  const elements = {
    catPartName: makeFakeElement('Sudah Ada'),
    catOemCode: makeFakeElement('Sudah Ada Juga'),
    catBarcode: makeFakeElement(),
  };
  const { ctx } = makeCtx({ elements });
  const result = await ctx.SparepartOcrCatalogAdd.open({ found: false }, undefined);
  assert.equal(elements.catPartName.value, 'Sudah Ada');
  assert.equal(elements.catOemCode.value, 'Sudah Ada Juga');
  assert.equal(elements.catBarcode.value, '');
  assert.equal(result.opened, true);
});

test('open() — elemen form tertentu tidak ada di DOM -> field lain tetap diprefill, tidak melempar', async () => {
  const elements = {
    catOemCode: makeFakeElement(),
    catBarcode: makeFakeElement(),
    // catPartName sengaja tidak ada
  };
  const { ctx } = makeCtx({ elements });
  const result = await ctx.SparepartOcrCatalogAdd.open({ found: false }, SAMPLE_PARSED);
  assert.equal(elements.catOemCode.value, 'AHM12345K');
  assert.equal(elements.catBarcode.value, '8991234567890');
  assert.equal(result.opened, true);
});

test('open() — VehicleCatalogUI belum tersedia -> return null, tidak melempar', async () => {
  const ctx = loadSource(['modules/vehicle/sparepart-ocr-catalog-add.js'], {}, ['SparepartOcrCatalogAdd']);
  const result = await ctx.SparepartOcrCatalogAdd.open({ found: false }, SAMPLE_PARSED);
  assert.equal(result, null);
});

test('open() — VehicleCatalogUI.openForm bukan fungsi -> return null, tidak melempar', async () => {
  const { ctx } = makeCtx({ vcUI: { openForm: 'bukan-fungsi' } });
  const result = await ctx.SparepartOcrCatalogAdd.open({ found: false }, SAMPLE_PARSED);
  assert.equal(result, null);
});

test('open() — document tidak tersedia -> tetap membuka form, tidak melempar', async () => {
  const { ctx, VehicleCatalogUI } = makeCtx({ elements: undefined }); // document default stub dari loadSource
  const result = await ctx.SparepartOcrCatalogAdd.open({ found: false }, SAMPLE_PARSED);
  assert.equal(VehicleCatalogUI.calls.openForm.length, 1);
  assert.equal(result.opened, true);
});

// ------------------------------------------------------------------------
// confirmAndSave() — konfirmasi WAJIB sebelum save() benar-benar dipanggil
// ------------------------------------------------------------------------
test('confirmAndSave() — user konfirmasi Ya -> save() dipanggil 1x, return true', async () => {
  let askConfirmCalledWith = null;
  const askConfirmImpl = async (msg, opts) => {
    askConfirmCalledWith = { msg, opts };
    return true;
  };
  const { ctx, VehicleCatalogUI } = makeCtx({ askConfirmImpl });
  const result = await ctx.SparepartOcrCatalogAdd.confirmAndSave();
  assert.equal(result, true);
  assert.equal(VehicleCatalogUI.calls.save, 1);
  assert.ok(askConfirmCalledWith.msg.length > 0);
});

test('confirmAndSave() — user tekan Batal -> save() TIDAK PERNAH dipanggil, return false', async () => {
  const askConfirmImpl = async () => false;
  const { ctx, VehicleCatalogUI } = makeCtx({ askConfirmImpl });
  const result = await ctx.SparepartOcrCatalogAdd.confirmAndSave();
  assert.equal(result, false);
  assert.equal(VehicleCatalogUI.calls.save, 0);
});

test('confirmAndSave() — askConfirm belum tersedia -> return false, save() TIDAK dipanggil', async () => {
  const VehicleCatalogUI = makeVehicleCatalogUI();
  const ctx = loadSource(
    ['modules/vehicle/sparepart-ocr-catalog-add.js'],
    { VehicleCatalogUI },
    ['SparepartOcrCatalogAdd']
  );
  const result = await ctx.SparepartOcrCatalogAdd.confirmAndSave();
  assert.equal(result, false);
  assert.equal(VehicleCatalogUI.calls.save, 0);
});

test('confirmAndSave() — VehicleCatalogUI.save belum tersedia -> return false, tidak melempar', async () => {
  const askConfirmImpl = async () => true;
  const { ctx } = makeCtx({ vcUI: { openForm: async () => {}, save: 'bukan-fungsi' }, askConfirmImpl });
  const result = await ctx.SparepartOcrCatalogAdd.confirmAndSave();
  assert.equal(result, false);
});

// ------------------------------------------------------------------------
// Verifikasi eksplisit: alur manual save() (tanpa konfirmasi) TIDAK
// tersentuh — confirmAndSave() cuma memanggil save() yang SUDAH ADA, tidak
// mendefinisikan ulang logic simpan.
// ------------------------------------------------------------------------
test('confirmAndSave() — TIDAK mendefinisikan ulang logic simpan, murni delegasi ke VehicleCatalogUI.save() yang sudah ada', async () => {
  const saveCalls = [];
  const VehicleCatalogUI = {
    async openForm() {},
    async save() { saveCalls.push('save-dipanggil'); },
  };
  const askConfirmImpl = async () => true;
  const ctx = loadSource(
    ['modules/vehicle/sparepart-ocr-catalog-add.js'],
    { VehicleCatalogUI, askConfirm: askConfirmImpl },
    ['SparepartOcrCatalogAdd']
  );
  await ctx.SparepartOcrCatalogAdd.confirmAndSave();
  assert.deepEqual(saveCalls, ['save-dipanggil']);
});
