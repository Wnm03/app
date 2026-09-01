'use strict';
// tests/s696-full-period-range-hari-minggu-tahun.test.js — Sesi S696 (audit
// lanjutan dari catatan S695: "Kartu 'Semua Transaksi' ... masih terpotong
// di 'hari ini' untuk chip lain — belum dicek apakah punya bug serupa Fix
// 2.").
//
// Audit menemukan: BENAR ada bug serupa Fix 2 (S695), di DUA tempat
// sekaligus (bukan cuma kartu "Semua Transaksi"), untuk chip hari/minggu/
// tahun (chip "bulan" sudah dibereskan lebih dulu -- getTxListRange() sejak
// awal, getRange() di S695):
//
//   1. getTxListRange() (modules/finance/tx-list-cashflow.js, kartu "Semua
//      Transaksi" tab Kelola) — chip hari/minggu/tahun selalu to=now
//      (terpotong "hari ini"/jam berjalan).
//   2. getRange() (file sama, panel filter Laporan) — bug IDENTIK, chip
//      hari/minggu/tahun juga to=now.
//
// Fix — kedua fungsi disamakan: tiap chip (hari/minggu/tahun) sekarang
// mengembalikan rentang PENUH periodenya (awal s/d akhir hari/minggu/tahun),
// bukan terpotong di waktu render. Pola & rasional SAMA PERSIS dgn Fix 2
// (chip "bulan"): supaya transaksi bertanggal ke depan dalam periode yang
// sama (mis. tagihan dicatat akhir minggu/akhir tahun) tetap kelihatan.
// Chip "selamanya" dan "custom" TIDAK disentuh (sudah rentang eksplisit).
//
// Semua test menjalankan SOURCE ASLI lewat loadSource (0 re-implementasi
// logic di sini), pola sama tests/s695-laporan-month-slide.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

function makeEl() {
  return { classList: { toggle() {}, add() {}, remove() {}, contains: () => false }, style: {} };
}

// NOTE: `filterPeriode`/`txListPeriode` dideklarasikan sebagai `let` DI DALAM
// source (tx-list-cashflow.js) sendiri, jadi nilai yang di-inject lewat
// extraGlobals ke context akan TERTIMPA oleh deklarasi source itu saat file
// di-load (pola sama kenapa tests/s695-*.test.js pakai setPeriode('bulan',
// el) buat mengubah filterPeriode, bukan inject nilai awal). Di sini kita
// pakai setter resminya (setPeriode/setTxListPeriode) supaya benar2 mengubah
// variabel yang dibaca getRange()/getTxListRange().
function makeCtx() {
  const fakeDoc = {
    getElementById: () => ({ value: '', classList: { toggle() {}, add() {}, remove() {}, contains: () => false }, style: {} }),
    querySelectorAll: () => [],
  };
  const ctx = loadSource(
    ['modules/finance/tx-list-cashflow.js'],
    {
      document: fakeDoc,
      D: { transactions: [] },
      lapMonthOffset: 0,
      curMonth: new Date().getMonth(),
      curYear: new Date().getFullYear(),
      renderLaporan: () => {},
      renderKeuangan: () => {},
      closeModal: () => {},
      resetTxPageAndRender: () => {},
    },
    [],
  );
  return ctx;
}

// Selisih hari kalender bulat (bukan ms/86400000 mentah -- itu bisa
// menghasilkan 6.99999... lalu dibulatkan ke 7 gara2 sisa 23:59:59.999ms
// pada `to`). Bandingkan lewat komponen tanggal, bukan epoch ms mentah.
function calendarDaysBetween(from, to) {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}

// ---- getRange() (panel filter Laporan) ----

test('getRange() filterPeriode==="hari" -> rentang PENUH hari ini (00:00 s/d 23:59:59.999), bukan terpotong jam render', () => {
  const ctx = makeCtx();
  ctx.setPeriode('hari', makeEl());
  const { from, to } = ctx.getRange();
  const now = new Date();
  assert.equal(from.getHours(), 0);
  assert.equal(from.getMinutes(), 0);
  assert.equal(to.getFullYear(), now.getFullYear());
  assert.equal(to.getMonth(), now.getMonth());
  assert.equal(to.getDate(), now.getDate());
  assert.equal(to.getHours(), 23);
  assert.equal(to.getMinutes(), 59);
});

test('getRange() filterPeriode==="minggu" -> rentang PENUH 1 minggu (Minggu s/d Sabtu), bukan terpotong "hari ini"', () => {
  const ctx = makeCtx();
  ctx.setPeriode('minggu', makeEl());
  const { from, to } = ctx.getRange();
  assert.equal(from.getDay(), 0, 'from harus hari Minggu (awal minggu)');
  assert.equal(from.getHours(), 0);
  assert.equal(calendarDaysBetween(from, to), 6, 'to harus 6 hari kalender setelah from (Sabtu), rentang penuh 7 hari');
  assert.equal(to.getDay(), 6, 'to harus hari Sabtu (akhir minggu)');
  assert.equal(to.getHours(), 23);
});

test('getRange() filterPeriode==="tahun" -> rentang PENUH 1 tahun (1 Jan s/d 31 Des), bukan terpotong "hari ini"', () => {
  const ctx = makeCtx();
  ctx.setPeriode('tahun', makeEl());
  const { from, to } = ctx.getRange();
  const now = new Date();
  assert.equal(from.getMonth(), 0);
  assert.equal(from.getDate(), 1);
  assert.equal(to.getFullYear(), now.getFullYear());
  assert.equal(to.getMonth(), 11);
  assert.equal(to.getDate(), 31);
  assert.equal(to.getHours(), 23);
});

test('getRange() filterPeriode==="selamanya" — 0 regresi, tidak ikut disentuh fix ini', () => {
  const ctx = makeCtx();
  ctx.setPeriode('selamanya', makeEl());
  const { from, to } = ctx.getRange();
  assert.equal(+from, +new Date(0));
  assert.equal(+to, +new Date(8640000000000000));
});

// ---- getTxListRange() (kartu "Semua Transaksi") ----

test('getTxListRange() txListPeriode==="hari" -> rentang PENUH hari ini', () => {
  const ctx = makeCtx();
  ctx.setTxListPeriode('hari', makeEl());
  const { from, to } = ctx.getTxListRange();
  assert.equal(from.getHours(), 0);
  assert.equal(to.getHours(), 23);
  assert.equal(to.getMinutes(), 59);
  assert.equal(from.getDate(), to.getDate());
});

test('getTxListRange() txListPeriode==="minggu" -> rentang PENUH 1 minggu (Minggu s/d Sabtu)', () => {
  const ctx = makeCtx();
  ctx.setTxListPeriode('minggu', makeEl());
  const { from, to } = ctx.getTxListRange();
  assert.equal(from.getDay(), 0);
  assert.equal(to.getDay(), 6);
  assert.equal(calendarDaysBetween(from, to), 6);
});

test('getTxListRange() txListPeriode==="tahun" -> rentang PENUH 1 tahun (1 Jan s/d 31 Des)', () => {
  const ctx = makeCtx();
  ctx.setTxListPeriode('tahun', makeEl());
  const { from, to } = ctx.getTxListRange();
  assert.equal(from.getMonth(), 0);
  assert.equal(from.getDate(), 1);
  assert.equal(to.getMonth(), 11);
  assert.equal(to.getDate(), 31);
});

test('getTxListRange() txListPeriode==="bulan" — 0 regresi (fix lama, tetap rentang penuh bulan)', () => {
  const ctx = makeCtx();
  ctx.setTxListPeriode('bulan', makeEl());
  const { from, to } = ctx.getTxListRange();
  const now = new Date();
  assert.equal(from.getDate(), 1);
  const expectedLastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  assert.equal(to.getDate(), expectedLastDay);
});

test('getTxListRange() txListPeriode==="selamanya" — 0 regresi', () => {
  const ctx = makeCtx();
  ctx.setTxListPeriode('selamanya', makeEl());
  const { from, to } = ctx.getTxListRange();
  assert.equal(+from, +new Date(0));
  assert.equal(+to, +new Date(8640000000000000));
});

test('struktural: getRange() TIDAK ADA lagi fallback "return{from,to:now}" generik di akhir fungsi (semua cabang sudah return eksplisit)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules', 'finance', 'tx-list-cashflow.js'), 'utf8');
  const idx = src.indexOf('function getRange()');
  const endIdx = src.indexOf('\n}\n', idx);
  const block = src.slice(idx, endIdx);
  assert.doesNotMatch(block, /\nreturn\{from,to:now\};\n/, 'fallback lama harus sudah dihapus, semua cabang return penuh eksplisit');
});
