'use strict';
// tests/honda-pdf-import-parse.test.js — cakupan
// modules/vehicle/honda-pdf-import-parse.js (Tahap 7D-3, Parse Text ->
// JSON). VehicleCatalogImport.parseCatalogRows() DI-STUB (pola sama
// tests/honda-pdf-import-extract.test.js) supaya test ini murni menguji
// ORKESTRASI file ini. HondaPdfImport (Tahap 7D-1) di-load ASLI (bukan
// stub) supaya update()/get()/list() teruji end-to-end lewat IDBStore
// mock in-memory.

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
  const parseCalls = [];
  const extraGlobals = {
    uid: () => 'uid-' + (++_uidCounter),
    sameId: (a, b) => String(a) === String(b),
    IDBStore: idb,
    toast: (msg) => toasts.push(msg),
  };
  if (opts.withVehicleCatalogImport !== false) {
    extraGlobals.VehicleCatalogImport = Object.assign(
      {
        parseCatalogRows: (text) => {
          parseCalls.push(text);
          if (opts.parseShouldThrow) throw opts.parseShouldThrow;
          if (typeof opts.parseResult === 'function') return opts.parseResult(text);
          return opts.parseResult !== undefined ? opts.parseResult : [{ partName: 'PART A', oemCode: '', barcode: '', price: null, raw: text }];
        },
      },
      opts.vehicleCatalogImportOverrides || {}
    );
  }
  const ctx = loadSource(
    ['modules/vehicle/honda-pdf-import.js', 'modules/vehicle/honda-pdf-import-parse.js'],
    extraGlobals,
    ['HondaPdfImport', 'HondaPdfImportParse']
  );
  return { ctx, idb, toasts, parseCalls };
}

async function stageOneFile(ctx, overrides) {
  const res = await ctx.HondaPdfImport.add(Object.assign({
    fileName: 'katalog.pdf',
    mimeType: 'application/pdf',
    dataBase64: 'data:application/pdf;base64,' + Buffer.from('dummy').toString('base64'),
  }, overrides || {}));
  return res.item;
}

async function stageExtractedFile(ctx, extractedText, overrides) {
  const item = await stageOneFile(ctx, overrides);
  const res = await ctx.HondaPdfImport.update(item.id, { extractedText: extractedText, status: 'extracted' });
  return res.item;
}

// ------------------------------------------------------------------------
// parseText() — orkestrasi utama
// ------------------------------------------------------------------------
test('parseText() — sukses: simpan parsedRows + status "parsed" ke record', async () => {
  const rows = [{ partName: 'KAMPAS REM', oemCode: '06450-KVB-901', barcode: '', price: 55000, raw: 'KAMPAS REM 06450-KVB-901 Rp55.000' }];
  const { ctx, parseCalls } = makeCtx({ parseResult: rows });
  const item = await stageExtractedFile(ctx, 'KAMPAS REM 06450-KVB-901 Rp55.000');
  const res = await ctx.HondaPdfImportParse.parseText(item.id);
  assert.equal(res.success, true);
  assert.deepEqual(res.rows, rows);
  assert.equal(res.item.status, 'parsed');
  assert.deepEqual(res.item.parsedRows, rows);
  assert.equal(parseCalls.length, 1);
  assert.equal(parseCalls[0], 'KAMPAS REM 06450-KVB-901 Rp55.000');
  const stored = await ctx.HondaPdfImport.get(item.id);
  assert.equal(stored.status, 'parsed');
});

test('parseText() — id tidak ditemukan -> success:false, tidak memanggil parseCatalogRows', async () => {
  const { ctx, parseCalls } = makeCtx();
  const res = await ctx.HondaPdfImportParse.parseText('tidak-ada');
  assert.equal(res.success, false);
  assert.ok(res.errors.some((e) => e.includes('tidak ditemukan')));
  assert.equal(parseCalls.length, 0);
});

test('parseText() — parseCatalogRows() throw -> record ditandai status "failed" + parseError', async () => {
  const { ctx } = makeCtx({ parseShouldThrow: new Error('gagal parse baris') });
  const item = await stageExtractedFile(ctx, 'teks');
  const res = await ctx.HondaPdfImportParse.parseText(item.id);
  assert.equal(res.success, false);
  assert.ok(res.errors.some((e) => e.includes('gagal parse baris')));
  const stored = await ctx.HondaPdfImport.get(item.id);
  assert.equal(stored.status, 'failed');
  assert.equal(stored.parseError, 'gagal parse baris');
});

test('parseText() — VehicleCatalogImport belum dimuat -> record "failed", pesan jelas', async () => {
  const { ctx } = makeCtx({ withVehicleCatalogImport: false });
  const item = await stageExtractedFile(ctx, 'teks');
  const res = await ctx.HondaPdfImportParse.parseText(item.id);
  assert.equal(res.success, false);
  assert.ok(res.errors[0].includes('VehicleCatalogImport belum tersedia'));
  const stored = await ctx.HondaPdfImport.get(item.id);
  assert.equal(stored.status, 'failed');
});

test('parseText() — record belum punya extractedText (belum diextract) -> tetap jalan dgn string kosong', async () => {
  const { ctx, parseCalls } = makeCtx({ parseResult: [] });
  const item = await stageOneFile(ctx);
  const res = await ctx.HondaPdfImportParse.parseText(item.id);
  assert.equal(res.success, true);
  assert.deepEqual(res.rows, []);
  assert.equal(parseCalls[0], '');
});

test('parseText() — hasil parseCatalogRows() bukan array -> disimpan sbg array kosong', async () => {
  const { ctx } = makeCtx({ parseResult: null });
  const item = await stageExtractedFile(ctx, 'teks');
  const res = await ctx.HondaPdfImportParse.parseText(item.id);
  assert.equal(res.success, true);
  assert.equal(Array.isArray(res.rows), true);
  assert.equal(res.rows.length, 0);
  assert.equal(Array.isArray(res.item.parsedRows), true);
  assert.equal(res.item.parsedRows.length, 0);
});

// ------------------------------------------------------------------------
// parseAll() — batch
// ------------------------------------------------------------------------
test('parseAll() — parse semua file berstatus extracted, hitungan benar', async () => {
  const { ctx } = makeCtx({ parseResult: [{ partName: 'X', oemCode: '', barcode: '', price: null, raw: 'X' }] });
  await stageExtractedFile(ctx, 'a', { fileName: 'a.pdf' });
  await stageExtractedFile(ctx, 'b', { fileName: 'b.pdf' });
  await stageExtractedFile(ctx, 'c', { fileName: 'c.pdf' });
  const summary = await ctx.HondaPdfImportParse.parseAll();
  assert.equal(summary.parsed, 3);
  assert.equal(summary.failed, 0);
  assert.equal(summary.items.length, 3);
});

test('parseAll() — file berstatus "pending" (belum diextract) TIDAK diproses', async () => {
  const { ctx } = makeCtx({ parseResult: [] });
  await stageOneFile(ctx, { fileName: 'a.pdf' });
  const summary = await ctx.HondaPdfImportParse.parseAll();
  assert.equal(summary.parsed, 0);
  assert.equal(summary.failed, 0);
});

test('parseAll() — file yang sudah "parsed" sebelumnya TIDAK diproses ulang', async () => {
  const { ctx } = makeCtx({ parseResult: [] });
  const item = await stageExtractedFile(ctx, 'teks');
  await ctx.HondaPdfImportParse.parseText(item.id); // jadi 'parsed'
  const summary = await ctx.HondaPdfImportParse.parseAll();
  assert.equal(summary.parsed, 0);
  assert.equal(summary.failed, 0);
});

test('parseAll() — campuran sukses & gagal, satu gagal tidak menghentikan yang lain', async () => {
  let call = 0;
  const { ctx } = makeCtx({
    parseResult: () => {
      call++;
      if (call === 2) throw new Error('rusak');
      return [{ partName: 'P' + call, oemCode: '', barcode: '', price: null, raw: 'P' + call }];
    },
  });
  await stageExtractedFile(ctx, 'a', { fileName: 'a.pdf' });
  await stageExtractedFile(ctx, 'b', { fileName: 'b.pdf' });
  await stageExtractedFile(ctx, 'c', { fileName: 'c.pdf' });
  const summary = await ctx.HondaPdfImportParse.parseAll();
  assert.equal(summary.parsed, 2);
  assert.equal(summary.failed, 1);
  assert.ok(summary.errors.length >= 1);
});

test('parseAll() — tidak ada file extracted -> parsed:0/failed:0, tidak error', async () => {
  const { ctx } = makeCtx();
  const summary = await ctx.HondaPdfImportParse.parseAll();
  assert.equal(summary.parsed, 0);
  assert.equal(summary.failed, 0);
  assert.equal(summary.items.length, 0);
});

// ------------------------------------------------------------------------
// parseAndPreview() — orkestrasi + toast
// ------------------------------------------------------------------------
test('parseAndPreview() — sukses dgn kandidat -> toast sukses berisi jumlah, return hasil parseText()', async () => {
  const { ctx, toasts } = makeCtx({ parseResult: [{ partName: 'A', oemCode: '', barcode: '', price: null, raw: 'A' }, { partName: 'B', oemCode: '', barcode: '', price: null, raw: 'B' }] });
  const item = await stageExtractedFile(ctx, 'teks');
  const res = await ctx.HondaPdfImportParse.parseAndPreview(item.id);
  assert.equal(res.success, true);
  assert.ok(toasts.some((t) => t.includes('2 kandidat part ditemukan')));
});

test('parseAndPreview() — sukses tapi tidak ada kandidat -> toast peringatan', async () => {
  const { ctx, toasts } = makeCtx({ parseResult: [] });
  const item = await stageExtractedFile(ctx, 'teks');
  await ctx.HondaPdfImportParse.parseAndPreview(item.id);
  assert.ok(toasts.some((t) => t.includes('Tidak ada kandidat part terdeteksi')));
});

test('parseAndPreview() — gagal -> toast error berisi pesan errors[0]', async () => {
  const { ctx, toasts } = makeCtx({ parseShouldThrow: new Error('format rusak') });
  const item = await stageExtractedFile(ctx, 'teks');
  await ctx.HondaPdfImportParse.parseAndPreview(item.id);
  assert.ok(toasts.some((t) => t.includes('format rusak')));
});
