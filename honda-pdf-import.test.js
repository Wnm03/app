'use strict';
// tests/honda-pdf-import.test.js — cakupan modules/vehicle/honda-pdf-import.js
// (Tahap 7D-1, Fondasi Import PDF Honda). Mock IDBStore in-memory (bukan
// indexedDB browser asli) supaya test bisa jalan murni di Node — pola
// SAMA PERSIS tests/vehicle-catalog.test.js. Picker (`pickFiles()`) &
// orkestrasi (`pickAndStage()`) di-stub lewat `document` tiruan (pola
// sama tests/sparepart-ocr.test.js men-stub SparepartScanner).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

let _uidCounter = 0;
function makeIdbStoreMock(initial) {
  const db = Object.assign({}, initial || {});
  return {
    _db: db,
    calls: { get: 0, set: 0 },
    async get(key) {
      this.calls.get++;
      return db[key];
    },
    async set(key, value) {
      this.calls.set++;
      db[key] = value;
      return true;
    },
  };
}

function makeCtx(opts) {
  opts = opts || {};
  _uidCounter = 0;
  const toasts = [];
  const idb = makeIdbStoreMock(opts.initialStore ? { 'honda-pdf-import:store': opts.initialStore } : {});
  const extraGlobals = {
    uid: () => 'uid-' + (++_uidCounter),
    sameId: (a, b) => String(a) === String(b),
    IDBStore: idb,
    toast: (msg) => toasts.push(msg),
  };
  if (opts.document !== undefined) extraGlobals.document = opts.document;
  const ctx = loadSource(
    ['modules/vehicle/honda-pdf-import.js'],
    extraGlobals,
    ['HondaPdfImport', 'HONDA_PDF_IMPORT_STORE_KEY']
  );
  return { ctx, idb, toasts };
}

// ------------------------------------------------------------------------
// Storage key & konstanta
// ------------------------------------------------------------------------
test('HONDA_PDF_IMPORT_STORE_KEY — tepat "honda-pdf-import:store"', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.HONDA_PDF_IMPORT_STORE_KEY, 'honda-pdf-import:store');
});

test('MAX_FILES terekspos di namespace publik', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.HondaPdfImport.MAX_FILES, 20);
});

// ------------------------------------------------------------------------
// Validation
// ------------------------------------------------------------------------
test('validate() — data lengkap & valid -> valid:true, tanpa errors', () => {
  const { ctx } = makeCtx();
  const result = ctx.HondaPdfImport.validate({
    fileName: 'Katalog Honda Vario 125.pdf',
    fileSize: 102400,
    mimeType: 'application/pdf',
    dataBase64: 'data:application/pdf;base64,AAAA',
  });
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('validate() — fileName kosong -> error', () => {
  const { ctx } = makeCtx();
  const result = ctx.HondaPdfImport.validate({
    mimeType: 'application/pdf',
    dataBase64: 'data:application/pdf;base64,AAAA',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('Nama file')));
});

test('validate() — fileName terlalu panjang (>200) -> error', () => {
  const { ctx } = makeCtx();
  const result = ctx.HondaPdfImport.validate({
    fileName: 'a'.repeat(201),
    mimeType: 'application/pdf',
    dataBase64: 'x',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('maksimal 200')));
});

test('validate() — mimeType bukan application/pdf -> error', () => {
  const { ctx } = makeCtx();
  const result = ctx.HondaPdfImport.validate({
    fileName: 'foto.jpg',
    mimeType: 'image/jpeg',
    dataBase64: 'x',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('format PDF')));
});

test('validate() — dataBase64 kosong -> error', () => {
  const { ctx } = makeCtx();
  const result = ctx.HondaPdfImport.validate({
    fileName: 'a.pdf',
    mimeType: 'application/pdf',
    dataBase64: '',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('base64')));
});

test('validate() — fileSize negatif -> error', () => {
  const { ctx } = makeCtx();
  const result = ctx.HondaPdfImport.validate({
    fileName: 'a.pdf',
    mimeType: 'application/pdf',
    dataBase64: 'x',
    fileSize: -5,
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('Ukuran file')));
});

// ------------------------------------------------------------------------
// add() / addMany()
// ------------------------------------------------------------------------
test('add() — sukses menyimpan 1 file, status selalu "pending"', async () => {
  const { ctx, idb } = makeCtx();
  const res = await ctx.HondaPdfImport.add({
    fileName: 'Katalog Part Honda 2026.pdf',
    fileSize: 20480,
    mimeType: 'application/pdf',
    dataBase64: 'data:application/pdf;base64,AAAA',
  });
  assert.equal(res.success, true);
  assert.equal(res.item.status, 'pending');
  assert.equal(res.item.fileName, 'Katalog Part Honda 2026.pdf');
  assert.ok(res.item.id);
  assert.ok(res.item.addedAt);
  assert.equal(idb.calls.set, 1);
  const stored = idb._db['honda-pdf-import:store'];
  assert.equal(stored.files.length, 1);
});

test('add() — gagal validasi TIDAK menulis ke store', async () => {
  const { ctx, idb } = makeCtx();
  const res = await ctx.HondaPdfImport.add({ fileName: '', mimeType: 'application/pdf', dataBase64: 'x' });
  assert.equal(res.success, false);
  assert.ok(res.errors.length > 0);
  assert.equal(idb.calls.set, 0);
});

test('add() — menolak kalau sudah mencapai MAX_FILES', async () => {
  const existing = { files: [] };
  for (let i = 0; i < 20; i++) {
    existing.files.push({ id: 'f' + i, fileName: 'x' + i + '.pdf', fileSize: 0, mimeType: 'application/pdf', dataBase64: 'x', status: 'pending', addedAt: '2026-01-01' });
  }
  const { ctx } = makeCtx({ initialStore: existing });
  const res = await ctx.HondaPdfImport.add({ fileName: 'baru.pdf', mimeType: 'application/pdf', dataBase64: 'x' });
  assert.equal(res.success, false);
  assert.ok(res.errors.some((e) => e.includes('maksimal')));
});

test('addMany() — beberapa file valid semua tersimpan, hitungan added benar', async () => {
  const { ctx } = makeCtx();
  const summary = await ctx.HondaPdfImport.addMany([
    { fileName: 'a.pdf', mimeType: 'application/pdf', dataBase64: 'x1' },
    { fileName: 'b.pdf', mimeType: 'application/pdf', dataBase64: 'x2' },
    { fileName: 'c.pdf', mimeType: 'application/pdf', dataBase64: 'x3' },
  ]);
  assert.equal(summary.added, 3);
  assert.equal(summary.skipped, 0);
  assert.equal(summary.items.length, 3);
  const list = await ctx.HondaPdfImport.list();
  assert.equal(list.length, 3);
});

test('addMany() — campuran valid & invalid, satu gagal tidak menghentikan yang lain', async () => {
  const { ctx } = makeCtx();
  const summary = await ctx.HondaPdfImport.addMany([
    { fileName: 'a.pdf', mimeType: 'application/pdf', dataBase64: 'x1' },
    { fileName: 'gambar.png', mimeType: 'image/png', dataBase64: 'x2' },
    { fileName: 'c.pdf', mimeType: 'application/pdf', dataBase64: 'x3' },
  ]);
  assert.equal(summary.added, 2);
  assert.equal(summary.skipped, 1);
  assert.ok(summary.errors.length >= 1);
});

test('addMany() — list bukan array -> aman, added:0/skipped:0', async () => {
  const { ctx } = makeCtx();
  const summary = await ctx.HondaPdfImport.addMany(null);
  assert.equal(summary.added, 0);
  assert.equal(summary.skipped, 0);
  assert.equal(summary.items.length, 0);
});

// ------------------------------------------------------------------------
// list() / get() / remove() / clear()
// ------------------------------------------------------------------------
test('list() — mengembalikan salinan array (mutasi hasil tidak mengubah store asli)', async () => {
  const { ctx } = makeCtx();
  await ctx.HondaPdfImport.add({ fileName: 'a.pdf', mimeType: 'application/pdf', dataBase64: 'x' });
  const list1 = await ctx.HondaPdfImport.list();
  list1.push({ id: 'palsu' });
  const list2 = await ctx.HondaPdfImport.list();
  assert.equal(list2.length, 1);
});

test('get(id) — ketemu -> object; tidak ketemu -> null', async () => {
  const { ctx } = makeCtx();
  const res = await ctx.HondaPdfImport.add({ fileName: 'a.pdf', mimeType: 'application/pdf', dataBase64: 'x' });
  const found = await ctx.HondaPdfImport.get(res.item.id);
  assert.equal(found.fileName, 'a.pdf');
  const notFound = await ctx.HondaPdfImport.get('tidak-ada');
  assert.equal(notFound, null);
});

test('remove(id) — sukses hapus -> true & file hilang dari list', async () => {
  const { ctx } = makeCtx();
  const res = await ctx.HondaPdfImport.add({ fileName: 'a.pdf', mimeType: 'application/pdf', dataBase64: 'x' });
  const removed = await ctx.HondaPdfImport.remove(res.item.id);
  assert.equal(removed, true);
  const list = await ctx.HondaPdfImport.list();
  assert.equal(list.length, 0);
});

test('remove(id) — id tidak ditemukan -> false, tidak menulis ulang store', async () => {
  const { ctx, idb } = makeCtx();
  await ctx.HondaPdfImport.add({ fileName: 'a.pdf', mimeType: 'application/pdf', dataBase64: 'x' });
  const setCallsBefore = idb.calls.set;
  const removed = await ctx.HondaPdfImport.remove('tidak-ada');
  assert.equal(removed, false);
  assert.equal(idb.calls.set, setCallsBefore);
});

test('clear() — mengosongkan semua file tersimpan', async () => {
  const { ctx } = makeCtx();
  await ctx.HondaPdfImport.addMany([
    { fileName: 'a.pdf', mimeType: 'application/pdf', dataBase64: 'x1' },
    { fileName: 'b.pdf', mimeType: 'application/pdf', dataBase64: 'x2' },
  ]);
  await ctx.HondaPdfImport.clear();
  const list = await ctx.HondaPdfImport.list();
  assert.equal(list.length, 0);
});

// ------------------------------------------------------------------------
// ensureLoaded() — load sekali per sesi, invalidateCache() reset
// ------------------------------------------------------------------------
test('ensureLoaded() — hanya panggil IDBStore.get() sekali walau dipanggil berulang', async () => {
  const { ctx, idb } = makeCtx();
  await ctx.HondaPdfImport.ensureLoaded();
  await ctx.HondaPdfImport.ensureLoaded();
  await ctx.HondaPdfImport.list();
  assert.equal(idb.calls.get, 1);
});

test('invalidateCache() — memaksa load ulang dari IDBStore pada pemanggilan berikutnya', async () => {
  const { ctx, idb } = makeCtx();
  await ctx.HondaPdfImport.ensureLoaded();
  ctx.HondaPdfImport.invalidateCache();
  await ctx.HondaPdfImport.ensureLoaded();
  assert.equal(idb.calls.get, 2);
});

test('getStore() — mengembalikan referensi store in-memory saat ini', async () => {
  const { ctx } = makeCtx();
  await ctx.HondaPdfImport.add({ fileName: 'a.pdf', mimeType: 'application/pdf', dataBase64: 'x' });
  const store = ctx.HondaPdfImport.getStore();
  assert.equal(store.files.length, 1);
});

// ------------------------------------------------------------------------
// pickFiles() / pickAndStage() — orkestrasi, document di-stub
// ------------------------------------------------------------------------
function makeFakeDocument(files) {
  return {
    createElement: () => {
      const inp = { type: '', accept: '', multiple: false, onchange: null };
      inp.click = () => {
        inp.onchange({ target: { files } });
      };
      return inp;
    },
  };
}

test('pickFiles() — resolve array file yang dipilih user (input multiple)', async () => {
  const fakeFiles = [{ name: 'a.pdf', size: 100, type: 'application/pdf' }, { name: 'b.pdf', size: 200, type: 'application/pdf' }];
  const { ctx } = makeCtx({ document: makeFakeDocument(fakeFiles) });
  const files = await ctx.HondaPdfImport.pickFiles();
  assert.equal(files.length, 2);
  assert.equal(files[0].name, 'a.pdf');
});

test('pickFiles() — tidak ada file dipilih -> resolve array kosong', async () => {
  const { ctx } = makeCtx({ document: makeFakeDocument([]) });
  const files = await ctx.HondaPdfImport.pickFiles();
  assert.deepEqual(files, []);
});

function makeFileWithReader(name, size, type, dataUrl) {
  return { name, size, type };
}

test('pickAndStage() — sukses: pilih 2 PDF, konversi + simpan sementara, toast ringkasan', async () => {
  const fakeFiles = [
    makeFileWithReader('katalog-a.pdf', 111, 'application/pdf'),
    makeFileWithReader('katalog-b.pdf', 222, 'application/pdf'),
  ];
  function FakeFileReader() {
    this.onload = null;
    this.onerror = null;
  }
  FakeFileReader.prototype.readAsDataURL = function (file) {
    this.result = 'data:application/pdf;base64,FAKE-' + file.name;
    setTimeout(() => this.onload(), 0);
  };
  const { ctx, toasts } = makeCtx({ document: makeFakeDocument(fakeFiles) });
  ctx.FileReader = FakeFileReader;
  const summary = await ctx.HondaPdfImport.pickAndStage();
  assert.equal(summary.added, 2);
  assert.equal(summary.skipped, 0);
  const list = await ctx.HondaPdfImport.list();
  assert.equal(list.length, 2);
  assert.ok(list[0].dataBase64.startsWith('data:application/pdf;base64,FAKE-'));
  assert.ok(toasts.some((t) => t.includes('tersimpan sementara')));
});

test('pickAndStage() — user batal pilih file -> null, toast peringatan, tidak menyimpan apa pun', async () => {
  const { ctx, idb, toasts } = makeCtx({ document: makeFakeDocument([]) });
  const summary = await ctx.HondaPdfImport.pickAndStage();
  assert.equal(summary, null);
  assert.equal(idb.calls.set, 0);
  assert.ok(toasts.some((t) => t.includes('Tidak ada file PDF dipilih')));
});

// ------------------------------------------------------------------------
// errorMessage() — fallback tanpa scanErrorMessage
// ------------------------------------------------------------------------
test('errorMessage() — fallback ke err.message kalau scanErrorMessage tidak tersedia', () => {
  const { ctx } = makeCtx();
  const msg = ctx.HondaPdfImport.errorMessage(new Error('gagal baca file'));
  assert.equal(msg, 'gagal baca file');
});

test('errorMessage() — reuse scanErrorMessage() kalau tersedia', () => {
  const ctx = loadSource(
    ['modules/vehicle/honda-pdf-import.js'],
    {
      uid: () => 'uid-1',
      sameId: (a, b) => String(a) === String(b),
      IDBStore: makeIdbStoreMock(),
      toast: () => {},
      scanErrorMessage: (err) => 'DIBUNGKUS: ' + ((err && err.message) || err),
    },
    ['HondaPdfImport']
  );
  const msg = ctx.HondaPdfImport.errorMessage(new Error('timeout'));
  assert.equal(msg, 'DIBUNGKUS: timeout');
});

test('errorMessage() — error tanpa message & tanpa scanErrorMessage -> pesan default', () => {
  const { ctx } = makeCtx();
  const msg = ctx.HondaPdfImport.errorMessage(undefined);
  assert.equal(msg, 'error tidak diketahui — cek koneksi internet, lalu coba lagi');
});
