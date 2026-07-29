'use strict';
// tests/data-archive.test.js — cakupan pertama untuk modules/shared/data-archive.js
// (Storage usage estimate & Archive: export lalu hapus data lama per tahun).
// Sebelumnya NOL test sama sekali walau archiveDeleteStep() menghapus data
// user secara PERMANEN dari D + localStorage (lihat CHECKPOINT/analisa gap
// test sesi ini) -- fungsi paling berisiko di file ini kalau ada bug filter
// tahun yang salah (bisa menghapus data tahun yang TIDAK dipilih user).
//
// byteSize()/archiveExportStep() butuh Blob/URL.createObjectURL/document
// (browser API) -- di luar cakupan harness loadSource ini (lihat catatan di
// helpers/loadSource.js: "Jangan pakai harness ini buat nge-test fungsi yang
// baca/tulis DOM"). byteSize diuji lewat extraGlobals.Blob (tersedia native
// di Node >=18) supaya tidak jatuh ke fallback catch(e){return 0}.
// openArchiveModal/toggleArchiveYear/updateArchivePreview/archiveExportStep
// (DOM-heavy, getElementById/Blob/URL/anchor.click) SENGAJA belum dites di
// sini -- kandidat lanjutan pakai pola fakeDom seperti tests/tx-transfer.test.js
// kalau dibutuhkan.

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { loadSource } = require('./helpers/loadSource');

// archiveExportedYears dideklarasikan sbg `let` di top-level data-archive.js
// (state normal-nya diisi lewat archiveExportStep(), fungsi DOM-heavy yang di
// luar cakupan test ini -- lihat catatan header). Node vm TIDAK menempelkan
// binding let/const ke objek context, jadi `ctx.archiveExportedYears = X` dari
// host TIDAK terlihat oleh archiveDeleteStep() di dalam sandbox (assignment itu
// cuma bikin property baru di objek context, terpisah dari lexical binding
// let-nya). Utk simulasi "sudah export tahun X" sebelum test archiveDeleteStep,
// suntikkan lewat vm.Script yang dijalankan DI DALAM context yang sama (jadi
// assignment `archiveExportedYears = ...` di dalamnya menulis ke binding let
// yang benar), sama prinsipnya dgn mekanisme `expose` di loadSource.js.
function setArchiveExportedYears(ctx, yearsArray) {
  ctx.__injectYears = yearsArray;
  new vm.Script('archiveExportedYears = new Set(this.__injectYears); delete this.__injectYears;', {
    filename: 'inject-archiveExportedYears',
  }).runInContext(ctx);
}

function makeArchive(D, stubs = {}) {
  const calls = { save: 0, renderStorageUsage: 0, closeModal: [] };
  const toasts = [];
  const ctx = loadSource(
    ['modules/shared/data-archive.js'],
    {
      D,
      Blob,
      SCHEMA_VERSION: D.schemaVersion || 1,
      save: stubs.save || (() => { calls.save++; }),
      toast: stubs.toast || ((msg) => toasts.push(msg)),
      askConfirm: stubs.askConfirm || (async () => true),
      renderStorageUsage: stubs.renderStorageUsage || (() => { calls.renderStorageUsage++; }),
      closeModal: stubs.closeModal || ((id) => { calls.closeModal.push(id); }),
    },
    ['STORAGE_QUOTA_ESTIMATE', 'STORAGE_BIG_MODULES', 'ARCHIVE_MODULES'],
  );
  return { ctx, calls, toasts };
}

function baseD(overrides = {}) {
  return {
    transactions: [],
    cobek: [],
    bbmLogs: [],
    servisLogs: [],
    kmLogs: [],
    jalanLogs: [],
    ...overrides,
  };
}

// ================= byteSize() =================

test('byteSize() menghitung ukuran byte JSON dari sebuah value (pakai Blob native Node)', () => {
  const { ctx } = makeArchive(baseD());
  const size = ctx.byteSize({ a: 1, b: 'halo' });
  assert.ok(size > 0, 'byteSize harus > 0 untuk object non-kosong');
  assert.equal(size, Buffer.byteLength(JSON.stringify({ a: 1, b: 'halo' })));
});

test('byteSize() tidak error & fallback ke 0 kalau value tidak bisa di-JSON.stringify (circular)', () => {
  const { ctx } = makeArchive(baseD());
  const circular = {};
  circular.self = circular;
  assert.equal(ctx.byteSize(circular), 0);
});

// ================= fmtBytes() =================

test('fmtBytes() < 1024 -> format "B"', () => {
  const { ctx } = makeArchive(baseD());
  assert.equal(ctx.fmtBytes(500), '500 B');
});

test('fmtBytes() >= 1024 dan < 1MB -> format "KB" 1 desimal', () => {
  const { ctx } = makeArchive(baseD());
  assert.equal(ctx.fmtBytes(2048), '2.0 KB');
});

test('fmtBytes() >= 1MB -> format "MB" 2 desimal', () => {
  const { ctx } = makeArchive(baseD());
  assert.equal(ctx.fmtBytes(1024 * 1024 * 3.5), '3.50 MB');
});

// ================= archiveGetYear() =================

test('archiveGetYear() mengembalikan tahun dari string tanggal valid', () => {
  const { ctx } = makeArchive(baseD());
  assert.equal(ctx.archiveGetYear('2023-05-10'), 2023);
});

test('archiveGetYear() mengembalikan null untuk tanggal invalid/kosong (bukan NaN/error)', () => {
  const { ctx } = makeArchive(baseD());
  assert.equal(ctx.archiveGetYear('bukan-tanggal'), null);
  assert.equal(ctx.archiveGetYear(undefined), null);
  assert.equal(ctx.archiveGetYear(''), null);
});

// ================= archiveAvailableYears() =================

test('archiveAvailableYears() mengumpulkan tahun unik dari SEMUA modul ARCHIVE_MODULES, terurut DESC', () => {
  const D = baseD({
    transactions: [{ id: 't1', date: '2022-01-01' }, { id: 't2', date: '2024-06-01' }],
    bbmLogs: [{ id: 'b1', date: '2023-03-01' }],
  });
  const { ctx } = makeArchive(D);
  assert.deepEqual(Array.from(ctx.archiveAvailableYears()), [2024, 2023, 2022]);
});

test('archiveAvailableYears() tidak dobel-hitung tahun yang sama dari modul berbeda', () => {
  const D = baseD({
    transactions: [{ id: 't1', date: '2023-01-01' }],
    cobek: [{ id: 'c1', date: '2023-05-05' }],
  });
  const { ctx } = makeArchive(D);
  assert.deepEqual(Array.from(ctx.archiveAvailableYears()), [2023]);
});

test('archiveAvailableYears() array kosong kalau tidak ada data riwayat sama sekali', () => {
  const { ctx } = makeArchive(baseD());
  assert.equal(ctx.archiveAvailableYears().length, 0);
});

test('archiveAvailableYears() mengabaikan item dengan tanggal invalid (tidak masuk daftar tahun)', () => {
  const D = baseD({ transactions: [{ id: 't1', date: 'invalid' }, { id: 't2', date: '2021-01-01' }] });
  const { ctx } = makeArchive(D);
  assert.deepEqual(Array.from(ctx.archiveAvailableYears()), [2021]);
});

// ================= archiveCollectByYears() =================

test('archiveCollectByYears() cuma mengambil item dari tahun yang diminta, per modul', () => {
  const D = baseD({
    transactions: [
      { id: 't1', date: '2022-01-01' },
      { id: 't2', date: '2023-01-01' },
      { id: 't3', date: '2023-06-01' },
    ],
  });
  const { ctx } = makeArchive(D);
  const result = ctx.archiveCollectByYears(new Set([2023]));
  assert.equal(result.transactions.length, 2);
  assert.deepEqual(Array.from(result.transactions).map((it) => it.id), ['t2', 't3']);
});

test('archiveCollectByYears() TIDAK mengambil item dari tahun yang tidak diminta (cegah over-collect)', () => {
  const D = baseD({ transactions: [{ id: 't1', date: '2022-01-01' }] });
  const { ctx } = makeArchive(D);
  const result = ctx.archiveCollectByYears(new Set([2023]));
  assert.equal(result.transactions.length, 0);
});

test('archiveCollectByYears() mengembalikan array kosong (bukan undefined) untuk modul yang datanya kosong/tidak ada di D', () => {
  const D = baseD();
  delete D.jalanLogs;
  const { ctx } = makeArchive(D);
  const result = ctx.archiveCollectByYears(new Set([2023]));
  assert.deepEqual(Array.from(result.jalanLogs), []);
});

// ================= archiveDeleteStep() — PALING BERISIKO (hapus permanen) =================

test('archiveDeleteStep() — batal (askConfirm false) -> TIDAK ada data terhapus & save() TIDAK dipanggil', async () => {
  const D = baseD({ transactions: [{ id: 't1', date: '2022-01-01' }] });
  const { ctx, calls } = makeArchive(D, { askConfirm: async () => false });
  setArchiveExportedYears(ctx, [2022]);
  await ctx.archiveDeleteStep();
  assert.equal(D.transactions.length, 1, 'data tahun 2022 harus TETAP ada kalau user batal konfirmasi');
  assert.equal(calls.save, 0);
});

test('archiveDeleteStep() — belum export dulu (archiveExportedYears kosong) -> tidak menghapus apa pun', async () => {
  const D = baseD({ transactions: [{ id: 't1', date: '2022-01-01' }] });
  const { ctx, calls, toasts } = makeArchive(D, { askConfirm: async () => true });
  // archiveExportedYears default-nya sudah null (belum pernah export) -- tidak perlu di-set apa pun.
  await ctx.archiveDeleteStep();
  assert.equal(D.transactions.length, 1);
  assert.equal(calls.save, 0);
  assert.match(toasts[0], /Export dulu/);
});

test('archiveDeleteStep() — konfirmasi -> HANYA menghapus data tahun yang di-export, tahun lain TETAP ada', async () => {
  const D = baseD({
    transactions: [
      { id: 't1', date: '2022-01-01' },
      { id: 't2', date: '2023-01-01' },
    ],
    bbmLogs: [{ id: 'b1', date: '2022-05-01' }],
  });
  const { ctx, calls } = makeArchive(D, { askConfirm: async () => true });
  setArchiveExportedYears(ctx, [2022]);
  await ctx.archiveDeleteStep();
  assert.deepEqual(Array.from(D.transactions).map((it) => it.id), ['t2'], 'transaksi 2023 harus TETAP ada');
  assert.equal(D.bbmLogs.length, 0, 'log BBM 2022 harus terhapus');
  assert.equal(calls.save, 1);
  assert.equal(calls.renderStorageUsage, 1);
  assert.deepEqual(calls.closeModal, ['archiveModal']);
});

test('archiveDeleteStep() — mencatat riwayat ke D.archiveHistory (tanggal, tahun, total item)', async () => {
  const D = baseD({ transactions: [{ id: 't1', date: '2022-01-01' }, { id: 't2', date: '2022-06-01' }] });
  const { ctx } = makeArchive(D, { askConfirm: async () => true });
  setArchiveExportedYears(ctx, [2022]);
  await ctx.archiveDeleteStep();
  assert.equal(D.archiveHistory.length, 1);
  assert.deepEqual(Array.from(D.archiveHistory[0].years), [2022]);
  assert.equal(D.archiveHistory[0].totalItems, 2);
});

test('archiveDeleteStep() — modul yang tidak ada di D (undefined) tidak menyebabkan error saat filter', async () => {
  const D = baseD({ transactions: [{ id: 't1', date: '2022-01-01' }] });
  delete D.kmLogs;
  const { ctx } = makeArchive(D, { askConfirm: async () => true });
  setArchiveExportedYears(ctx, [2022]);
  await assert.doesNotReject(ctx.archiveDeleteStep());
  assert.equal(D.transactions.length, 0);
});
