'use strict';
// tests/sparepart-ocr.test.js — cakupan modules/vehicle/sparepart-ocr.js
// (Tahap 7C-1, Engine OCR Sparepart Fondasi). Hanya bagian LOGIC MURNI yang
// dites di sini (recognizeFile(), errorMessage(), orkestrasi scan() lewat
// SparepartScanner.pickImageFile() yang di-stub) — pemilihan file galeri
// asli (fallback sendiri, dipakai kalau SparepartScanner TIDAK ada) butuh
// DOM asli browser, TIDAK dites lewat harness node:vm ini, pola SAMA
// PERSIS tests/sparepart-scanner.test.js (pickImageFile/decodeFromFile
// juga tidak dites di sana dengan alasan yang sama).
//
// ocrRecognize() DI-STUB (bukan load scan-ocr.js asli/Tesseract sungguhan)
// supaya test ini murni menguji ORKESTRASI sparepart-ocr.js (pilih file ->
// OCR -> toast), terpisah dari detail implementasi Tesseract itu sendiri.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts) {
  opts = opts || {};
  const toasts = [];
  const ocrCalls = [];
  const ocrResult = opts.ocrResult !== undefined ? opts.ocrResult : { data: { text: '  KAMPAS REM DEPAN AHM 12345  ' } };
  const extraGlobals = {
    toast: (msg) => toasts.push(msg),
  };
  if (opts.withOcrRecognize !== false) {
    extraGlobals.ocrRecognize = async (file) => {
      ocrCalls.push(file);
      if (opts.ocrShouldThrow) throw opts.ocrShouldThrow;
      return typeof ocrResult === 'function' ? ocrResult(file) : ocrResult;
    };
  }
  if (opts.sparepartScanner !== false) {
    extraGlobals.SparepartScanner = Object.assign(
      { pickImageFile: () => Promise.resolve(opts.pickedFile !== undefined ? opts.pickedFile : { name: 'foto.jpg' }) },
      opts.sparepartScanner || {}
    );
  }
  if (opts.scanErrorMessage !== false && opts.withScanErrorMessage !== false) {
    extraGlobals.scanErrorMessage = opts.scanErrorMessage || ((err) => 'SO:' + ((err && err.message) || String(err)));
  }
  const ctx = loadSource(['modules/vehicle/sparepart-ocr.js'], extraGlobals, ['SparepartOcr']);
  return { ctx, toasts, ocrCalls };
}

// ------------------------------------------------------------------------
// recognizeFile() — logic murni OCR 1 file, reuse ocrRecognize()
// ------------------------------------------------------------------------
test('recognizeFile() — file kosong/null langsung balik string kosong, TIDAK memanggil ocrRecognize', async () => {
  const { ctx, ocrCalls } = makeCtx();
  const text = await ctx.SparepartOcr.recognizeFile(null);
  assert.equal(text, '');
  assert.equal(ocrCalls.length, 0);
});

test('recognizeFile() — memanggil ocrRecognize(file) & mengembalikan result.data.text ter-trim()', async () => {
  const { ctx, ocrCalls } = makeCtx();
  const file = { name: 'label.jpg' };
  const text = await ctx.SparepartOcr.recognizeFile(file);
  assert.equal(text, 'KAMPAS REM DEPAN AHM 12345');
  assert.deepEqual(ocrCalls, [file]);
});

test('recognizeFile() — result.data.text bukan string (mis. undefined) -> balik string kosong', async () => {
  const { ctx } = makeCtx({ ocrResult: { data: {} } });
  const text = await ctx.SparepartOcr.recognizeFile({ name: 'x.jpg' });
  assert.equal(text, '');
});

test('recognizeFile() — ocrRecognize() belum tersedia (scan-ocr.js belum dimuat) -> throw pesan jelas', async () => {
  const { ctx } = makeCtx({ withOcrRecognize: false });
  await assert.rejects(
    () => ctx.SparepartOcr.recognizeFile({ name: 'x.jpg' }),
    /Modul OCR belum tersedia/
  );
});

test('recognizeFile() — ocrRecognize() melempar error -> ikut dilempar apa adanya (tidak ditelan)', async () => {
  const { ctx } = makeCtx({ ocrShouldThrow: new Error('worker gagal') });
  await assert.rejects(
    () => ctx.SparepartOcr.recognizeFile({ name: 'x.jpg' }),
    /worker gagal/
  );
});

// ------------------------------------------------------------------------
// errorMessage() — reuse scanErrorMessage()
// ------------------------------------------------------------------------
test('errorMessage() — reuse penuh scanErrorMessage() kalau tersedia', () => {
  const { ctx } = makeCtx();
  const msg = ctx.SparepartOcr.errorMessage(new Error('boom'));
  assert.equal(msg, 'SO:boom');
});

test('errorMessage() — fallback generik kalau scanErrorMessage tidak tersedia', () => {
  const { ctx } = makeCtx({ withScanErrorMessage: false });
  const msg = ctx.SparepartOcr.errorMessage(undefined);
  assert.match(msg, /error tidak diketahui/);
});

// ------------------------------------------------------------------------
// pickImageFile() — reuse SparepartScanner.pickImageFile() kalau ada
// ------------------------------------------------------------------------
test('pickImageFile() — reuse SparepartScanner.pickImageFile() kalau SparepartScanner sudah dimuat', async () => {
  let called = 0;
  const { ctx } = makeCtx({
    sparepartScanner: { pickImageFile: () => { called++; return Promise.resolve({ name: 'reuse.jpg' }); } },
  });
  const file = await ctx.SparepartOcr.pickImageFile();
  assert.equal(called, 1);
  assert.equal(file.name, 'reuse.jpg');
});

// ------------------------------------------------------------------------
// scan() — orkestrasi penuh: pickImageFile -> recognizeFile -> toast
// ------------------------------------------------------------------------
test('scan() — tidak ada gambar dipilih -> toast peringatan, return null, TIDAK memanggil OCR', async () => {
  const { ctx, toasts, ocrCalls } = makeCtx({ pickedFile: null });
  const result = await ctx.SparepartOcr.scan();
  assert.equal(result, null);
  assert.equal(ocrCalls.length, 0);
  assert.ok(toasts.some((t) => /Tidak ada gambar dipilih/.test(t)));
});

test('scan() — sukses, teks terbaca -> mengembalikan STRING teks OCR saja (bukan object)', async () => {
  const { ctx, toasts } = makeCtx();
  const result = await ctx.SparepartOcr.scan();
  assert.equal(typeof result, 'string');
  assert.equal(result, 'KAMPAS REM DEPAN AHM 12345');
  assert.ok(toasts.some((t) => /Teks berhasil dibaca/.test(t)));
});

test('scan() — foto terbaca tapi tidak ada teks terdeteksi -> return string kosong, toast peringatan', async () => {
  const { ctx, toasts } = makeCtx({ ocrResult: { data: { text: '   ' } } });
  const result = await ctx.SparepartOcr.scan();
  assert.equal(result, '');
  assert.ok(toasts.some((t) => /Tidak ada teks terbaca/.test(t)));
});

test('scan() — ocrRecognize() gagal (reject) -> toast pesan gagal (reuse errorMessage()), return null', async () => {
  const { ctx, toasts } = makeCtx({ ocrShouldThrow: new Error('jaringan putus') });
  const result = await ctx.SparepartOcr.scan();
  assert.equal(result, null);
  assert.ok(toasts.some((t) => /Gagal OCR/.test(t) && /jaringan putus/.test(t)));
});

test('scan() — TIDAK menyentuh VehicleCatalog sama sekali (belum integrasi, sesuai cakupan 7C-1)', async () => {
  const { ctx } = makeCtx();
  assert.equal(typeof ctx.VehicleCatalog, 'undefined');
  await ctx.SparepartOcr.scan();
  // Tidak ada assertion tambahan diperlukan -- kalau file ini pernah
  // memanggil VehicleCatalog.*, load di atas akan throw ReferenceError
  // duluan krn VehicleCatalog memang sengaja TIDAK di-inject ke sandbox.
});
