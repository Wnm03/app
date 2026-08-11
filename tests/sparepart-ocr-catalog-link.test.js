'use strict';
// tests/sparepart-ocr-catalog-link.test.js — cakupan
// modules/vehicle/sparepart-ocr-catalog-link.js (Tahap 7C-3a: jembatan
// hasil SparepartOcrParser <-> VehicleCatalog, HANYA cari/found-not-found,
// TIDAK bikin draft). VehicleCatalog & SparepartOcrParser di-mock lewat
// extraGlobals (pola sama tests/vehicle-catalog-servis-link.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCatalog(items) {
  const list = items || [];
  return {
    calls: { findByCode: 0, getAll: 0 },
    async findByCode(code) {
      this.calls.findByCode++;
      const c = (code || '').toString().trim().toLowerCase();
      if (!c) return null;
      return list.find((it) => (it.barcode && it.barcode.toLowerCase() === c) || (it.oemCode && it.oemCode.toLowerCase() === c)) || null;
    },
    async getAll() {
      this.calls.getAll++;
      return list.slice();
    },
  };
}

function makeCtx({ items, parserStub } = {}) {
  const VehicleCatalog = makeCatalog(items);
  const extraGlobals = { VehicleCatalog };
  if (parserStub !== undefined) extraGlobals.SparepartOcrParser = parserStub;
  const ctx = loadSource(
    ['modules/vehicle/sparepart-ocr-catalog-link.js'],
    extraGlobals,
    ['SparepartOcrCatalogLink']
  );
  return { ctx, VehicleCatalog };
}

// ------------------------------------------------------------------------
// findByCode() — exact match oemCode/barcode (reuse findByCode) & Part
// Number/aftermarketCode (tambahan di sini)
// ------------------------------------------------------------------------
test('findByCode() — ketemu lewat oemCode (reuse VehicleCatalog.findByCode)', async () => {
  const { ctx, VehicleCatalog } = makeCtx({ items: [{ id: 'p1', oemCode: 'AHM-123', barcode: '', aftermarketCode: '' }] });
  const item = await ctx.SparepartOcrCatalogLink.findByCode('AHM-123');
  assert.equal(item.id, 'p1');
  assert.equal(VehicleCatalog.calls.findByCode, 1);
});

test('findByCode() — ketemu lewat barcode (reuse VehicleCatalog.findByCode)', async () => {
  const { ctx } = makeCtx({ items: [{ id: 'p2', oemCode: '', barcode: '8991234567890', aftermarketCode: '' }] });
  const item = await ctx.SparepartOcrCatalogLink.findByCode('8991234567890');
  assert.equal(item.id, 'p2');
});

test('findByCode() — ketemu lewat Part Number/aftermarketCode (case-insensitive)', async () => {
  const { ctx, VehicleCatalog } = makeCtx({ items: [{ id: 'p3', oemCode: '', barcode: '', aftermarketCode: 'FDR-XYZ-01' }] });
  const item = await ctx.SparepartOcrCatalogLink.findByCode('fdr-xyz-01');
  assert.equal(item.id, 'p3');
  assert.equal(VehicleCatalog.calls.getAll, 1);
});

test('findByCode() — tidak ketemu di ketiga field -> null', async () => {
  const { ctx } = makeCtx({ items: [{ id: 'p4', oemCode: 'LAIN', barcode: '000', aftermarketCode: 'BEDA' }] });
  const item = await ctx.SparepartOcrCatalogLink.findByCode('TIDAK-ADA');
  assert.equal(item, null);
});

test('findByCode() — kode kosong -> null, tidak memanggil VehicleCatalog sama sekali', async () => {
  const { ctx, VehicleCatalog } = makeCtx({ items: [{ id: 'p5', oemCode: 'X', barcode: '', aftermarketCode: '' }] });
  const item = await ctx.SparepartOcrCatalogLink.findByCode('   ');
  assert.equal(item, null);
  assert.equal(VehicleCatalog.calls.findByCode, 0);
  assert.equal(VehicleCatalog.calls.getAll, 0);
});

test('findByCode() — VehicleCatalog belum tersedia -> null, tidak error', async () => {
  const ctx = loadSource(['modules/vehicle/sparepart-ocr-catalog-link.js'], {}, ['SparepartOcrCatalogLink']);
  const item = await ctx.SparepartOcrCatalogLink.findByCode('AHM-123');
  assert.equal(item, null);
});

// ------------------------------------------------------------------------
// findFromParsed() — orkestrasi utama 7C-3a: hasil parse -> found/not found
// ------------------------------------------------------------------------
test('findFromParsed() — ketemu via oemCode -> found:true, matchedBy:"oemCode"', async () => {
  const { ctx } = makeCtx({ items: [{ id: 'p1', oemCode: 'AHM12345K', barcode: '', aftermarketCode: '' }] });
  const res = await ctx.SparepartOcrCatalogLink.findFromParsed({ oemCode: 'AHM12345K', barcode: '', partName: 'Kampas Rem', brand: 'AHM' });
  assert.equal(res.found, true);
  assert.equal(res.item.id, 'p1');
  assert.equal(res.matchedBy, 'oemCode');
});

test('findFromParsed() — oemCode tidak ketemu, fallback ke barcode -> found:true, matchedBy:"barcode"', async () => {
  const { ctx } = makeCtx({ items: [{ id: 'p2', oemCode: '', barcode: '8991234567890', aftermarketCode: '' }] });
  const res = await ctx.SparepartOcrCatalogLink.findFromParsed({ oemCode: 'TIDAK-ADA-DI-KATALOG', barcode: '8991234567890' });
  assert.equal(res.found, true);
  assert.equal(res.item.id, 'p2');
  assert.equal(res.matchedBy, 'barcode');
});

test('findFromParsed() — oemCode & barcode sama-sama tidak cocok -> found:false, item:null (bukan error)', async () => {
  const { ctx } = makeCtx({ items: [{ id: 'p3', oemCode: 'LAIN', barcode: '000', aftermarketCode: '' }] });
  const res = await ctx.SparepartOcrCatalogLink.findFromParsed({ oemCode: 'TIDAK-ADA', barcode: '999' });
  assert.equal(res.found, false);
  assert.equal(res.item, null);
  assert.equal(res.error, undefined);
});

test('findFromParsed() — oemCode & barcode sama-sama kosong -> found:false + error, tidak query VehicleCatalog', async () => {
  const { ctx, VehicleCatalog } = makeCtx({ items: [{ id: 'p4', oemCode: 'X', barcode: 'Y', aftermarketCode: '' }] });
  const res = await ctx.SparepartOcrCatalogLink.findFromParsed({ oemCode: '', barcode: '', partName: 'Teks tanpa kode' });
  assert.equal(res.found, false);
  assert.equal(res.item, null);
  assert.equal(typeof res.error, 'string');
  assert.equal(VehicleCatalog.calls.findByCode, 0);
  assert.equal(VehicleCatalog.calls.getAll, 0);
});

test('findFromParsed() — parsed undefined/null -> diperlakukan sama seperti field kosong, tidak error', async () => {
  const { ctx } = makeCtx({ items: [] });
  const res1 = await ctx.SparepartOcrCatalogLink.findFromParsed(undefined);
  const res2 = await ctx.SparepartOcrCatalogLink.findFromParsed(null);
  assert.equal(res1.found, false);
  assert.equal(res2.found, false);
});

test('findFromParsed() — TIDAK pernah memanggil VehicleCatalog.create()/update() (hanya cari, tidak simpan)', async () => {
  const items = [{ id: 'p1', oemCode: 'AHM12345K', barcode: '', aftermarketCode: '' }];
  const VehicleCatalog = makeCatalog(items);
  let createCalled = false;
  let updateCalled = false;
  VehicleCatalog.create = () => { createCalled = true; };
  VehicleCatalog.update = () => { updateCalled = true; };
  const ctx = loadSource(['modules/vehicle/sparepart-ocr-catalog-link.js'], { VehicleCatalog }, ['SparepartOcrCatalogLink']);
  await ctx.SparepartOcrCatalogLink.findFromParsed({ oemCode: 'TIDAK-ADA', barcode: '999' });
  assert.equal(createCalled, false);
  assert.equal(updateCalled, false);
});

// ------------------------------------------------------------------------
// findFromText() — varian: teks OCR mentah -> parse (reuse
// SparepartOcrParser.parseText()) -> cari
// ------------------------------------------------------------------------
test('findFromText() — reuse SparepartOcrParser.parseText() untuk parsing, lalu cari ke VehicleCatalog', async () => {
  const calls = [];
  const parserStub = {
    parseText(text) {
      calls.push(text);
      return { oemCode: 'AHM12345K', barcode: '8991234567890', partName: 'Kampas Rem Depan', brand: 'AHM' };
    },
  };
  const { ctx } = makeCtx({ items: [{ id: 'p1', oemCode: 'AHM12345K', barcode: '', aftermarketCode: '' }], parserStub });
  const res = await ctx.SparepartOcrCatalogLink.findFromText('teks OCR mentah apa saja');
  assert.deepEqual(calls, ['teks OCR mentah apa saja']);
  assert.equal(res.found, true);
  assert.equal(res.item.id, 'p1');
  assert.equal(res.matchedBy, 'oemCode');
});

test('findFromText() — SparepartOcrParser belum tersedia -> found:false + error, tidak error/exception', async () => {
  const ctx = loadSource(['modules/vehicle/sparepart-ocr-catalog-link.js'], { VehicleCatalog: makeCatalog([]) }, ['SparepartOcrCatalogLink']);
  const res = await ctx.SparepartOcrCatalogLink.findFromText('teks apa saja');
  assert.equal(res.found, false);
  assert.equal(res.item, null);
  assert.equal(typeof res.error, 'string');
});

test('findFromText() — parse hasilnya tanpa kode sama sekali -> found:false, tidak query katalog', async () => {
  const parserStub = { parseText: () => ({ oemCode: '', barcode: '', partName: 'Teks acak', brand: '' }) };
  const { ctx, VehicleCatalog } = makeCtx({ items: [{ id: 'p1', oemCode: 'X', barcode: 'Y', aftermarketCode: '' }], parserStub });
  const res = await ctx.SparepartOcrCatalogLink.findFromText('teks tanpa kode apa pun');
  assert.equal(res.found, false);
  assert.equal(VehicleCatalog.calls.findByCode, 0);
  assert.equal(VehicleCatalog.calls.getAll, 0);
});
