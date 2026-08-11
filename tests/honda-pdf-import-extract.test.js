'use strict';
// tests/honda-pdf-import-extract.test.js — cakupan
// modules/vehicle/honda-pdf-import-extract.js (Tahap 7D-2, Extract Text ->
// Preview). VehicleCatalogImport.extractPdfText() DI-STUB (bukan pdf.js
// sungguhan — butuh browser nyata, pola sama tests/vehicle-catalog-
// import.test.js) supaya test ini murni menguji ORKESTRASI file ini.
// HondaPdfImport (Tahap 7D-1) di-load ASLI (bukan stub) supaya update()/
// get()/list() teruji end-to-end lewat IDBStore mock in-memory.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

let _uidCounter = 0;
function makeIdbStoreMock(initial) {
  const db = Object.assign({}, initial || {});
  return {
    _db: db,
    async get(key) { return db[key]; },
    async set(key, value) { db[key] = value; return true; },
  };
}

function makeCtx(opts) {
  opts = opts || {};
  _uidCounter = 0;
  const toasts = [];
  const idb = makeIdbStoreMock(opts.initialStore ? { 'honda-pdf-import:store': opts.initialStore } : {});
  const extractCalls = [];
  const extraGlobals = {
    uid: () => 'uid-' + (++_uidCounter),
    sameId: (a, b) => String(a) === String(b),
    IDBStore: idb,
    toast: (msg) => toasts.push(msg),
    atob: (b64) => Buffer.from(b64, 'base64').toString('binary'),
    btoa: (bin) => Buffer.from(bin, 'binary').toString('base64'),
  };
  if (opts.withVehicleCatalogImport !== false) {
    extraGlobals.VehicleCatalogImport = Object.assign(
      {
        extractPdfText: async (fileLike) => {
          extractCalls.push(fileLike);
          if (opts.extractShouldThrow) throw opts.extractShouldThrow;
          if (typeof opts.extractResult === 'function') return opts.extractResult(fileLike);
          return opts.extractResult !== undefined ? opts.extractResult : 'TEKS HASIL EXTRACT';
        },
      },
      opts.vehicleCatalogImportOverrides || {}
    );
  }
  const ctx = loadSource(
    ['modules/vehicle/honda-pdf-import.js', 'modules/vehicle/honda-pdf-import-extract.js'],
    extraGlobals,
    ['HondaPdfImport', 'HondaPdfImportExtract']
  );
  return { ctx, idb, toasts, extractCalls };
}

// ------------------------------------------------------------------------
// base64ToArrayBuffer() — murni
// ------------------------------------------------------------------------
test('base64ToArrayBuffer() — decode data URL "data:application/pdf;base64,..." jadi ArrayBuffer benar', () => {
  const { ctx } = makeCtx();
  const original = 'Hello PDF';
  const b64 = Buffer.from(original, 'utf8').toString('base64');
  const dataUrl = 'data:application/pdf;base64,' + b64;
  const buf = ctx.HondaPdfImportExtract.base64ToArrayBuffer(dataUrl);
  const decoded = Buffer.from(buf).toString('utf8');
  assert.equal(decoded, original);
});

test('base64ToArrayBuffer() — base64 mentah tanpa prefix data URL tetap ter-decode', () => {
  const { ctx } = makeCtx();
  const original = 'RAW BASE64';
  const b64 = Buffer.from(original, 'utf8').toString('base64');
  const buf = ctx.HondaPdfImportExtract.base64ToArrayBuffer(b64);
  const decoded = Buffer.from(buf).toString('utf8');
  assert.equal(decoded, original);
});

test('base64ToArrayBuffer() — input bukan string -> tidak error, buffer kosong', () => {
  const { ctx } = makeCtx();
  const buf = ctx.HondaPdfImportExtract.base64ToArrayBuffer(undefined);
  assert.equal(buf.byteLength, 0);
});

// ------------------------------------------------------------------------
// makeFileLike() — adapter murni
// ------------------------------------------------------------------------
test('makeFileLike() — arrayBuffer() balik ArrayBuffer hasil decode dataBase64 record', async () => {
  const { ctx } = makeCtx();
  const original = 'ISI PDF PALSU';
  const b64 = Buffer.from(original, 'utf8').toString('base64');
  const fileLike = ctx.HondaPdfImportExtract.makeFileLike({
    fileName: 'test.pdf',
    mimeType: 'application/pdf',
    dataBase64: 'data:application/pdf;base64,' + b64,
  });
  assert.equal(fileLike.name, 'test.pdf');
  const buf = await fileLike.arrayBuffer();
  assert.equal(Buffer.from(buf).toString('utf8'), original);
});

test('makeFileLike() — size terisi dari record.fileSize (bukan undefined) — BUGFIX: extractPdfText() asli throw "File PDF kosong atau tidak terbaca" kalau file.size falsy', () => {
  const { ctx } = makeCtx();
  const fileLike = ctx.HondaPdfImportExtract.makeFileLike({
    fileName: 'test.pdf',
    mimeType: 'application/pdf',
    fileSize: 12345,
    dataBase64: 'data:application/pdf;base64,SVNJIFBERiBQQUxTVQ==',
  });
  assert.equal(fileLike.size, 12345);
});

test('makeFileLike() — record.fileSize kosong/0 -> size dihitung dari decode dataBase64 (tetap > 0, bukan undefined)', () => {
  const { ctx } = makeCtx();
  const original = 'ISI PDF PALSU YANG LEBIH PANJANG SUPAYA JELAS > 0';
  const b64 = Buffer.from(original, 'utf8').toString('base64');
  const fileLike = ctx.HondaPdfImportExtract.makeFileLike({
    fileName: 'test.pdf',
    mimeType: 'application/pdf',
    dataBase64: 'data:application/pdf;base64,' + b64,
  });
  assert.equal(fileLike.size, original.length);
});

// ------------------------------------------------------------------------
// previewText() — murni
// ------------------------------------------------------------------------
test('previewText() — teks pendek dikembalikan apa adanya', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.HondaPdfImportExtract.previewText('teks pendek'), 'teks pendek');
});

test('previewText() — teks panjang dipotong ke PREVIEW_LEN default (500) + elipsis', () => {
  const { ctx } = makeCtx();
  const long = 'x'.repeat(600);
  const preview = ctx.HondaPdfImportExtract.previewText(long);
  assert.equal(preview.length, 501); // 500 char + '…'
  assert.ok(preview.endsWith('…'));
});

test('previewText() — maxLen custom dihormati', () => {
  const { ctx } = makeCtx();
  const preview = ctx.HondaPdfImportExtract.previewText('abcdefghij', 5);
  assert.equal(preview, 'abcde…');
});

test('previewText() — input bukan string -> string kosong', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.HondaPdfImportExtract.previewText(undefined), '');
});

// ------------------------------------------------------------------------
// extractText() — orkestrasi utama
// ------------------------------------------------------------------------
async function stageOneFile(ctx, overrides) {
  const res = await ctx.HondaPdfImport.add(Object.assign({
    fileName: 'katalog.pdf',
    mimeType: 'application/pdf',
    dataBase64: 'data:application/pdf;base64,' + Buffer.from('dummy').toString('base64'),
  }, overrides || {}));
  return res.item;
}

test('extractText() — sukses: simpan extractedText + status "extracted" ke record', async () => {
  const { ctx, extractCalls } = makeCtx({ extractResult: 'NAMA PART A Rp10.000' });
  const item = await stageOneFile(ctx);
  const res = await ctx.HondaPdfImportExtract.extractText(item.id);
  assert.equal(res.success, true);
  assert.equal(res.text, 'NAMA PART A Rp10.000');
  assert.equal(res.item.status, 'extracted');
  assert.equal(res.item.extractedText, 'NAMA PART A Rp10.000');
  assert.equal(extractCalls.length, 1);
  const stored = await ctx.HondaPdfImport.get(item.id);
  assert.equal(stored.status, 'extracted');
});

test('extractText() — id tidak ditemukan -> success:false, tidak memanggil extractPdfText', async () => {
  const { ctx, extractCalls } = makeCtx();
  const res = await ctx.HondaPdfImportExtract.extractText('tidak-ada');
  assert.equal(res.success, false);
  assert.ok(res.errors.some((e) => e.includes('tidak ditemukan')));
  assert.equal(extractCalls.length, 0);
});

test('extractText() — extractPdfText() throw -> record ditandai status "failed" + extractError', async () => {
  const { ctx } = makeCtx({ extractShouldThrow: new Error('gagal baca halaman PDF') });
  const item = await stageOneFile(ctx);
  const res = await ctx.HondaPdfImportExtract.extractText(item.id);
  assert.equal(res.success, false);
  assert.ok(res.errors.some((e) => e.includes('gagal baca halaman PDF')));
  const stored = await ctx.HondaPdfImport.get(item.id);
  assert.equal(stored.status, 'failed');
  assert.equal(stored.extractError, 'gagal baca halaman PDF');
});

test('extractText() — VehicleCatalogImport belum dimuat -> record "failed", pesan jelas', async () => {
  const { ctx } = makeCtx({ withVehicleCatalogImport: false });
  const item = await stageOneFile(ctx);
  const res = await ctx.HondaPdfImportExtract.extractText(item.id);
  assert.equal(res.success, false);
  assert.ok(res.errors[0].includes('VehicleCatalogImport belum tersedia'));
  const stored = await ctx.HondaPdfImport.get(item.id);
  assert.equal(stored.status, 'failed');
});

test('extractText() — hasil kosong (PDF tanpa teks) tetap success:true, extractedText:""', async () => {
  const { ctx } = makeCtx({ extractResult: '' });
  const item = await stageOneFile(ctx);
  const res = await ctx.HondaPdfImportExtract.extractText(item.id);
  assert.equal(res.success, true);
  assert.equal(res.text, '');
  assert.equal(res.item.status, 'extracted');
});

test('extractText() — fileLike yang dikirim ke extractPdfText berisi arrayBuffer() fungsi & nama file benar', async () => {
  let capturedFile = null;
  const { ctx } = makeCtx({
    extractResult: async (fileLike) => { capturedFile = fileLike; return 'ok'; },
  });
  const item = await stageOneFile(ctx, { fileName: 'manual-honda.pdf' });
  await ctx.HondaPdfImportExtract.extractText(item.id);
  assert.equal(capturedFile.name, 'manual-honda.pdf');
  assert.equal(typeof capturedFile.arrayBuffer, 'function');
});

// ------------------------------------------------------------------------
// extractAll() — batch
// ------------------------------------------------------------------------
test('extractAll() — extract semua file berstatus pending, hitungan benar', async () => {
  const { ctx } = makeCtx({ extractResult: 'teks' });
  await stageOneFile(ctx, { fileName: 'a.pdf' });
  await stageOneFile(ctx, { fileName: 'b.pdf' });
  await stageOneFile(ctx, { fileName: 'c.pdf' });
  const summary = await ctx.HondaPdfImportExtract.extractAll();
  assert.equal(summary.extracted, 3);
  assert.equal(summary.failed, 0);
  assert.equal(summary.items.length, 3);
});

test('extractAll() — file yang sudah "extracted" sebelumnya TIDAK diproses ulang', async () => {
  const { ctx } = makeCtx({ extractResult: 'teks' });
  const item = await stageOneFile(ctx);
  await ctx.HondaPdfImportExtract.extractText(item.id); // jadi 'extracted'
  const summary = await ctx.HondaPdfImportExtract.extractAll();
  assert.equal(summary.extracted, 0);
  assert.equal(summary.failed, 0);
});

test('extractAll() — campuran sukses & gagal, satu gagal tidak menghentikan yang lain', async () => {
  let call = 0;
  const { ctx } = makeCtx({
    extractResult: () => {
      call++;
      if (call === 2) throw new Error('rusak');
      return 'teks ' + call;
    },
  });
  await stageOneFile(ctx, { fileName: 'a.pdf' });
  await stageOneFile(ctx, { fileName: 'b.pdf' });
  await stageOneFile(ctx, { fileName: 'c.pdf' });
  const summary = await ctx.HondaPdfImportExtract.extractAll();
  assert.equal(summary.extracted, 2);
  assert.equal(summary.failed, 1);
  assert.ok(summary.errors.length >= 1);
});

test('extractAll() — tidak ada file pending -> extracted:0/failed:0, tidak error', async () => {
  const { ctx } = makeCtx();
  const summary = await ctx.HondaPdfImportExtract.extractAll();
  assert.equal(summary.extracted, 0);
  assert.equal(summary.failed, 0);
  assert.equal(summary.items.length, 0);
});

// ------------------------------------------------------------------------
// extractAndPreview() — orkestrasi + toast
// ------------------------------------------------------------------------
test('extractAndPreview() — sukses dgn teks -> toast sukses, return hasil extractText()', async () => {
  const { ctx, toasts } = makeCtx({ extractResult: 'ADA TEKS' });
  const item = await stageOneFile(ctx);
  const res = await ctx.HondaPdfImportExtract.extractAndPreview(item.id);
  assert.equal(res.success, true);
  assert.ok(toasts.some((t) => t.includes('berhasil dibaca')));
});

test('extractAndPreview() — sukses tapi teks kosong -> toast peringatan tidak ada teks', async () => {
  const { ctx, toasts } = makeCtx({ extractResult: '' });
  const item = await stageOneFile(ctx);
  await ctx.HondaPdfImportExtract.extractAndPreview(item.id);
  assert.ok(toasts.some((t) => t.includes('tidak ada teks terdeteksi')));
});

test('extractAndPreview() — gagal -> toast error berisi pesan errors[0]', async () => {
  const { ctx, toasts } = makeCtx({ extractShouldThrow: new Error('koneksi timeout') });
  const item = await stageOneFile(ctx);
  await ctx.HondaPdfImportExtract.extractAndPreview(item.id);
  assert.ok(toasts.some((t) => t.includes('koneksi timeout')));
});
