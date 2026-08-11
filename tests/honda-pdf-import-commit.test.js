'use strict';
// tests/honda-pdf-import-commit.test.js — cakupan
// modules/vehicle/honda-pdf-import-commit.js (Tahap 7D-4, JSON -> Vehicle
// Catalog). VehicleCatalogImport.commitRows() DI-STUB (pola sama
// tests/honda-pdf-import-parse.test.js) supaya test ini murni menguji
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
  const commitCalls = [];
  const extraGlobals = {
    uid: () => 'uid-' + (++_uidCounter),
    sameId: (a, b) => String(a) === String(b),
    IDBStore: idb,
    toast: (msg) => toasts.push(msg),
  };
  if (opts.withVehicleCatalogImport !== false) {
    extraGlobals.VehicleCatalogImport = Object.assign(
      {
        commitRows: async (rows) => {
          commitCalls.push(rows);
          if (opts.commitShouldThrow) throw opts.commitShouldThrow;
          if (typeof opts.commitResult === 'function') return opts.commitResult(rows);
          return opts.commitResult !== undefined ? opts.commitResult : { imported: rows.length, skipped: 0, errors: [] };
        },
      },
      opts.vehicleCatalogImportOverrides || {}
    );
  }
  const ctx = loadSource(
    ['modules/vehicle/honda-pdf-import.js', 'modules/vehicle/honda-pdf-import-commit.js'],
    extraGlobals,
    ['HondaPdfImport', 'HondaPdfImportCommit']
  );
  return { ctx, idb, toasts, commitCalls };
}

async function stageOneFile(ctx, overrides) {
  const res = await ctx.HondaPdfImport.add(Object.assign({
    fileName: 'katalog.pdf',
    mimeType: 'application/pdf',
    dataBase64: 'data:application/pdf;base64,' + Buffer.from('dummy').toString('base64'),
  }, overrides || {}));
  return res.item;
}

async function stageParsedFile(ctx, parsedRows, overrides) {
  const item = await stageOneFile(ctx, overrides);
  const res = await ctx.HondaPdfImport.update(item.id, { parsedRows: parsedRows, status: 'parsed' });
  return res.item;
}

// ------------------------------------------------------------------------
// commitRows() — orkestrasi utama
// ------------------------------------------------------------------------
test('commitRows() — sukses: pakai record.parsedRows kalau rows tidak dikirim, simpan status "committed"', async () => {
  const rows = [{ partName: 'KAMPAS REM', oemCode: '06450-KVB-901', barcode: '', price: 55000, raw: 'x' }];
  const { ctx, commitCalls } = makeCtx({ commitResult: { imported: 1, skipped: 0, errors: [] } });
  const item = await stageParsedFile(ctx, rows);
  const res = await ctx.HondaPdfImportCommit.commitRows(item.id);
  assert.equal(res.success, true);
  assert.equal(res.imported, 1);
  assert.equal(res.skipped, 0);
  assert.equal(res.item.status, 'committed');
  assert.deepEqual(res.item.commitResult, { imported: 1, skipped: 0, errors: [] });
  assert.equal(commitCalls.length, 1);
  assert.deepEqual(commitCalls[0], rows);
  const stored = await ctx.HondaPdfImport.get(item.id);
  assert.equal(stored.status, 'committed');
});

test('commitRows() — rows dikirim eksplisit (subset dipilih user) dipakai, bukan record.parsedRows', async () => {
  const { ctx, commitCalls } = makeCtx({ commitResult: { imported: 1, skipped: 0, errors: [] } });
  const item = await stageParsedFile(ctx, [{ partName: 'A' }, { partName: 'B' }]);
  const chosen = [{ partName: 'A' }];
  await ctx.HondaPdfImportCommit.commitRows(item.id, chosen);
  assert.deepEqual(commitCalls[0], chosen);
});

test('commitRows() — id tidak ditemukan -> success:false, tidak memanggil commitRows()', async () => {
  const { ctx, commitCalls } = makeCtx();
  const res = await ctx.HondaPdfImportCommit.commitRows('tidak-ada');
  assert.equal(res.success, false);
  assert.ok(res.errors.some((e) => e.includes('tidak ditemukan')));
  assert.equal(commitCalls.length, 0);
});

test('commitRows() — VehicleCatalogImport.commitRows() throw -> record ditandai status "failed" + commitError', async () => {
  const { ctx } = makeCtx({ commitShouldThrow: new Error('gagal simpan katalog') });
  const item = await stageParsedFile(ctx, [{ partName: 'A' }]);
  const res = await ctx.HondaPdfImportCommit.commitRows(item.id);
  assert.equal(res.success, false);
  assert.ok(res.errors.some((e) => e.includes('gagal simpan katalog')));
  const stored = await ctx.HondaPdfImport.get(item.id);
  assert.equal(stored.status, 'failed');
  assert.equal(stored.commitError, 'gagal simpan katalog');
});

test('commitRows() — VehicleCatalogImport belum dimuat -> record "failed", pesan jelas', async () => {
  const { ctx } = makeCtx({ withVehicleCatalogImport: false });
  const item = await stageParsedFile(ctx, [{ partName: 'A' }]);
  const res = await ctx.HondaPdfImportCommit.commitRows(item.id);
  assert.equal(res.success, false);
  assert.ok(res.errors[0].includes('VehicleCatalogImport belum tersedia'));
  const stored = await ctx.HondaPdfImport.get(item.id);
  assert.equal(stored.status, 'failed');
});

test('commitRows() — record belum punya parsedRows -> commitRows() dipanggil dgn array kosong', async () => {
  const { ctx, commitCalls } = makeCtx({ commitResult: { imported: 0, skipped: 0, errors: [] } });
  const item = await stageOneFile(ctx);
  const res = await ctx.HondaPdfImportCommit.commitRows(item.id);
  assert.equal(res.success, true);
  assert.equal(commitCalls[0].length, 0);
});

// ------------------------------------------------------------------------
// commitAndPreview() — orkestrasi + toast
// ------------------------------------------------------------------------
test('commitAndPreview() — sukses dgn imported -> toast sukses berisi jumlah', async () => {
  const { ctx, toasts } = makeCtx({ commitResult: { imported: 2, skipped: 1, errors: [] } });
  const item = await stageParsedFile(ctx, [{ partName: 'A' }, { partName: 'B' }, { partName: '' }]);
  const res = await ctx.HondaPdfImportCommit.commitAndPreview(item.id);
  assert.equal(res.success, true);
  assert.ok(toasts.some((t) => t.includes('2 part tersimpan ke Vehicle Catalog') && t.includes('1 dilewati')));
});

test('commitAndPreview() — sukses tapi tidak ada yang tersimpan -> toast peringatan', async () => {
  const { ctx, toasts } = makeCtx({ commitResult: { imported: 0, skipped: 1, errors: [] } });
  const item = await stageParsedFile(ctx, [{ partName: '' }]);
  await ctx.HondaPdfImportCommit.commitAndPreview(item.id);
  assert.ok(toasts.some((t) => t.includes('Tidak ada part yang berhasil disimpan')));
});

test('commitAndPreview() — gagal -> toast error berisi pesan errors[0]', async () => {
  const { ctx, toasts } = makeCtx({ commitShouldThrow: new Error('koneksi terputus') });
  const item = await stageParsedFile(ctx, [{ partName: 'A' }]);
  await ctx.HondaPdfImportCommit.commitAndPreview(item.id);
  assert.ok(toasts.some((t) => t.includes('koneksi terputus')));
});
