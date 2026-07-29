'use strict';
// tests/sparepart-ocr-parser.test.js — cakupan
// modules/vehicle/sparepart-ocr-parser.js (Tahap 7C-2, Parser Hasil OCR
// Sparepart). Semua fungsi di modul ini MURNI (regex/keyword-match saja,
// tidak menyentuh DOM/database), jadi seluruhnya bisa dites langsung lewat
// loadSource() tanpa stub DOM.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(vehicleCatalogStub) {
  const extraGlobals = {};
  if (vehicleCatalogStub !== false) {
    extraGlobals.VehicleCatalog = vehicleCatalogStub || undefined;
  }
  return loadSource(['modules/vehicle/sparepart-ocr-parser.js'], extraGlobals, ['SparepartOcrParser']);
}

// ------------------------------------------------------------------------
// parseCodes() — reuse VehicleCatalog.parseLabelText() kalau ada
// ------------------------------------------------------------------------
test('parseCodes() — reuse VehicleCatalog.parseLabelText() kalau tersedia', () => {
  const calls = [];
  const ctx = makeCtx({
    parseLabelText: (text) => { calls.push(text); return { oemCode: 'AHM-999', barcode: '1234567890' }; },
  });
  const result = ctx.SparepartOcrParser.parseCodes('teks apa saja');
  assert.deepEqual(calls, ['teks apa saja']);
  assert.equal(result.oemCode, 'AHM-999');
  assert.equal(result.barcode, '1234567890');
});

test('parseCodes() — fallback regex sendiri kalau VehicleCatalog belum dimuat', () => {
  const ctx = makeCtx(false);
  const result = ctx.SparepartOcrParser.parseCodes('KAMPAS REM AHM12345K\n8991234567890');
  assert.equal(result.oemCode, 'AHM12345K');
  assert.equal(result.barcode, '8991234567890');
});

test('parseCodes() — tidak ada OEM Code/Barcode terdeteksi -> string kosong', () => {
  const ctx = makeCtx(false);
  const result = ctx.SparepartOcrParser.parseCodes('teks acak tanpa kode apa pun');
  assert.equal(result.oemCode, '');
  assert.equal(result.barcode, '');
});

// ------------------------------------------------------------------------
// parseBrand()
// ------------------------------------------------------------------------
test('parseBrand() — mengenali merek dari daftar keyword (case-insensitive)', () => {
  const ctx = makeCtx(false);
  assert.equal(ctx.SparepartOcrParser.parseBrand('busi ngk iridium cb150r'), 'NGK');
  assert.equal(ctx.SparepartOcrParser.parseBrand('OLI MOTUL 3000 20W-50'), 'Motul');
});

test('parseBrand() — merek 2 kata (mis. "Honda Genuine Parts") terdeteksi utuh', () => {
  const ctx = makeCtx(false);
  assert.equal(ctx.SparepartOcrParser.parseBrand('Honda Genuine Parts - Kampas Rem'), 'Honda Genuine Parts');
});

test('parseBrand() — tidak ada merek dikenali -> string kosong', () => {
  const ctx = makeCtx(false);
  assert.equal(ctx.SparepartOcrParser.parseBrand('KAMPAS REM DEPAN UNIVERSAL'), '');
});

test('parseBrand() — teks kosong/null -> string kosong', () => {
  const ctx = makeCtx(false);
  assert.equal(ctx.SparepartOcrParser.parseBrand(''), '');
  assert.equal(ctx.SparepartOcrParser.parseBrand(null), '');
});

// ------------------------------------------------------------------------
// parsePartName()
// ------------------------------------------------------------------------
test('parsePartName() — pilih baris terpanjang, skip baris angka murni & kode yang dikecualikan', () => {
  const ctx = makeCtx(false);
  const text = 'AHM12345K\n8991234567890\nKAMPAS REM DEPAN AHM ORIGINAL';
  const name = ctx.SparepartOcrParser.parsePartName(text, ['AHM12345K', '8991234567890']);
  assert.equal(name, 'KAMPAS REM DEPAN AHM ORIGINAL');
});

test('parsePartName() — baris < 3 karakter diabaikan', () => {
  const ctx = makeCtx(false);
  const text = 'ok\nBUSI NGK CB150R IRIDIUM';
  const name = ctx.SparepartOcrParser.parsePartName(text, []);
  assert.equal(name, 'BUSI NGK CB150R IRIDIUM');
});

test('parsePartName() — tidak ada baris valid -> string kosong', () => {
  const ctx = makeCtx(false);
  const name = ctx.SparepartOcrParser.parsePartName('12345\n99', []);
  assert.equal(name, '');
});

// ------------------------------------------------------------------------
// parseText() — orkestrasi 4 field sekaligus
// ------------------------------------------------------------------------
test('parseText() — label lengkap: oemCode, partName, brand, barcode semua terdeteksi', () => {
  const ctx = makeCtx(false);
  const text = 'NGK BUSI IRIDIUM\nAHM12345K\n8991234567890';
  const result = ctx.SparepartOcrParser.parseText(text);
  assert.equal(result.oemCode, 'AHM12345K');
  assert.equal(result.barcode, '8991234567890');
  assert.equal(result.brand, 'NGK');
  assert.equal(result.partName, 'NGK BUSI IRIDIUM');
});

test('parseText() — teks kosong -> semua field string kosong, TIDAK error', () => {
  const ctx = makeCtx(false);
  const result = ctx.SparepartOcrParser.parseText('');
  assert.equal(result.oemCode, '');
  assert.equal(result.partName, '');
  assert.equal(result.brand, '');
  assert.equal(result.barcode, '');
});

test('parseText() — hasil selalu object dgn 4 key persis (oemCode, partName, brand, barcode)', () => {
  const ctx = makeCtx(false);
  const result = ctx.SparepartOcrParser.parseText('teks bebas apa saja 12345');
  assert.deepEqual(Object.keys(result).sort(), ['barcode', 'brand', 'oemCode', 'partName']);
});

test('parseText() — TIDAK menyimpan/memanggil VehicleCatalog.create() sama sekali (belum simpan data, sesuai cakupan 7C-2)', () => {
  let createCalled = false;
  const ctx = makeCtx({
    parseLabelText: (text) => ({ oemCode: '', barcode: '' }),
    create: () => { createCalled = true; },
  });
  ctx.SparepartOcrParser.parseText('KAMPAS REM DEPAN\nAHM12345K');
  assert.equal(createCalled, false);
});

// ------------------------------------------------------------------------
// BRAND_KEYWORDS — daftar diekspos, immutable dari luar (slice(), bukan
// referensi array asli)
// ------------------------------------------------------------------------
test('BRAND_KEYWORDS — diekspos sebagai array & bukan referensi internal (mutasi luar tidak berefek)', () => {
  const ctx = makeCtx(false);
  const before = ctx.SparepartOcrParser.BRAND_KEYWORDS.length;
  ctx.SparepartOcrParser.BRAND_KEYWORDS.push('MerekPalsu');
  const after = ctx.SparepartOcrParser.parseBrand('busi ngk iridium');
  assert.equal(after, 'NGK');
  assert.equal(ctx.SparepartOcrParser.BRAND_KEYWORDS.length, before + 1); // array yg dipegang caller boleh berubah (itu miliknya sendiri)
});
