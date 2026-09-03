'use strict';
// tests/cash-projection-forecast.test.js — Sesi S724 (carry-forward S723): proyeksi
// multi-bulan ke depan + notifikasi proaktif defisit.
// Cakupan:
// 1) getCashProjectionForecast() — bulan pertama pakai proyeksiGaji aktual, bulan
//    ke-2 dst pakai pattern absen (gajiSource), proyeksiSaldoKumulatif running,
//    firstDeficitMonth/firstNegativeSaldoMonth.
// 2) getCashProjectionDeficitAlert() — prioritas saldo kumulatif minus > delta bulan
//    minus, alertMonthsAhead membatasi jendela pindai, available:false kalau aman.
// 3) DeficitNotifBridge.items() (modules/finance/deficit-notif-bridge.js) — translator
//    murni ke {fireKey,title,body}, respect firedIds, guard typeof.
// 4) _dashCashProjForecastHtml() (modules/shared/modules-render.js) — presenter,
//    integrasi ke _renderCashProjectionCard().

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSource } = require('./helpers/loadSource');

const SRC_RENDER = fs.readFileSync(path.join(__dirname, '..', 'modules', 'shared', 'modules-render.js'), 'utf8');
const SRC_BILL = fs.readFileSync(path.join(__dirname, '..', 'modules', 'finance', 'tagihan-kalender.js'), 'utf8');
const SRC_PROJ = fs.readFileSync(path.join(__dirname, '..', 'modules', 'finance', 'cash-projection.js'), 'utf8');
const SRC_BRIDGE = fs.readFileSync(path.join(__dirname, '..', 'modules', 'finance', 'deficit-notif-bridge.js'), 'utf8');

function makeD(overrides) {
  return Object.assign({
    transactions: [],
    workDays: [],
    bills: [],
    debts: [],
    profile: {},
    gajiMingguanHistory: [],
    cashProjSnapshots: [],
  }, overrides);
}

function makeProjCtx(D, extraGlobals) {
  return loadSource(
    ['modules/business/reset-gaji-mingguan.js', 'modules/finance/tagihan-kalender.js', 'modules/finance/cash-projection.js'],
    Object.assign({ D }, extraGlobals || {})
  );
}

// Fixture: 4 minggu riwayat gaji (dipakai getAttendancePatternStats -> hasEnoughData:true).
// 5 hari kerja/minggu, avgGajiPerHari = 100rb -> avgHariKerjaPerMinggu=5, dailyWorkRate=5/7.
function historyFixture() {
  return [
    { weekStart: '2026-06-01', weekEnd: '2026-06-06', total: 500000, count: 5 },
    { weekStart: '2026-06-08', weekEnd: '2026-06-13', total: 500000, count: 5 },
    { weekStart: '2026-06-15', weekEnd: '2026-06-20', total: 500000, count: 5 },
    { weekStart: '2026-06-22', weekEnd: '2026-06-27', total: 500000, count: 5 },
  ];
}

// helper: tanggal di bulan berjalan SEKARANG (bukan hardcode) — getCashProjectionForecast()
// SELALU mulai dari `new Date()` sungguhan (bulan-0 = bulan berjalan), jadi fixture transaksi/
// tagihan bulan-0 harus ikut bulan berjalan, bukan tanggal tetap.
function curMonthDateStr(day) {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// --- getCashProjectionForecast() ---

test('getCashProjectionForecast() — bulan pertama pakai proyeksiGaji AKTUAL (gajiSource:"aktual")', () => {
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji toko', amount: 3000000, date: curMonthDateStr(5) }],
    gajiMingguanHistory: historyFixture(),
  });
  const ctx = makeProjCtx(D);
  const f = ctx.getCashProjectionForecast(3, {});
  assert.equal(f.available, true);
  assert.equal(f.months.length, 3);
  assert.equal(f.months[0].gajiSource, 'aktual');
  assert.equal(f.months[0].proyeksiGaji, 3000000);
});

test('getCashProjectionForecast() — bulan ke-2 dst pakai pattern absen (gajiSource:"pola")', () => {
  const D = makeD({ gajiMingguanHistory: historyFixture() });
  const ctx = makeProjCtx(D);
  const f = ctx.getCashProjectionForecast(3, {});
  assert.equal(f.months[1].gajiSource, 'pola');
  assert.equal(f.months[2].gajiSource, 'pola');
  assert.equal(f.hasEnoughData, true);
  assert.ok(f.months[1].proyeksiGaji > 0);
});

test('getCashProjectionForecast() — riwayat KOSONG -> hasEnoughData:false, proyeksiGaji bulan ke-2 dst = 0 (bukan disembunyikan)', () => {
  const D = makeD({});
  const ctx = makeProjCtx(D);
  const f = ctx.getCashProjectionForecast(3, {});
  assert.equal(f.hasEnoughData, false);
  assert.equal(f.months[1].proyeksiGaji, 0);
  assert.equal(f.months[2].proyeksiGaji, 0);
});

test('getCashProjectionForecast() — proyeksiSaldoKumulatif running (akumulasi, bukan per-bulan berdiri sendiri)', () => {
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji toko', amount: 1000000, date: curMonthDateStr(5) }],
    gajiMingguanHistory: [],
  });
  const ctx = makeProjCtx(D, { totalSaldoAkun: () => 2000000 });
  const f = ctx.getCashProjectionForecast(3, {});
  // bulan-0: proyeksiKas = 1jt gaji - 0 kewajiban - 0 kiriman = 1jt -> saldo kumulatif 2jt+1jt=3jt
  assert.equal(f.months[0].proyeksiSaldoKumulatif, 3000000);
  // bulan-1/2: gaji pola = 0 (riwayat kosong) -> proyeksiKas = 0 -> saldo kumulatif tetap 3jt
  assert.equal(f.months[1].proyeksiSaldoKumulatif, 3000000);
  assert.equal(f.months[2].proyeksiSaldoKumulatif, 3000000);
});

test('getCashProjectionForecast() — totalSaldoAkun() belum ada -> proyeksiSaldoKumulatif null (guard)', () => {
  const D = makeD({});
  const ctx = makeProjCtx(D);
  const f = ctx.getCashProjectionForecast(3, {});
  assert.equal(f.months[0].proyeksiSaldoKumulatif, null);
});

test('getCashProjectionForecast() — firstDeficitMonth/firstNegativeSaldoMonth terdeteksi', () => {
  const D = makeD({
    bills: [{ id: 'b1', name: 'Sewa', amount: 5000000, nextDue: curMonthDateStr(28), freq: 'monthly' }],
    gajiMingguanHistory: [],
  });
  const ctx = makeProjCtx(D, { totalSaldoAkun: () => 1000000 });
  const f = ctx.getCashProjectionForecast(3, {});
  assert.ok(f.firstDeficitMonth);
  assert.equal(f.firstDeficitMonth.month, f.months[0].month);
  assert.ok(f.firstNegativeSaldoMonth);
});

test('getCashProjectionForecast() — monthsAhead<=0 fallback ke default 3', () => {
  const D = makeD({});
  const ctx = makeProjCtx(D);
  const f = ctx.getCashProjectionForecast(0, {});
  assert.equal(f.months.length, 3);
});

// --- Sesi S725: confidence & additionalWorkDaysNeeded ---

test('getCashProjectionForecast() — confidence: bulan-0 "tinggi", bulan-1 "sedang", bulan-2+ "rendah"', () => {
  const D = makeD({ gajiMingguanHistory: historyFixture() });
  const ctx = makeProjCtx(D);
  const f = ctx.getCashProjectionForecast(3, {});
  assert.equal(f.months[0].confidence, 'tinggi');
  assert.equal(f.months[1].confidence, 'sedang');
  assert.equal(f.months[2].confidence, 'rendah');
});

test('getCashProjectionForecast() — additionalWorkDaysNeeded null kalau bulan itu tidak defisit', () => {
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji toko', amount: 3000000, date: curMonthDateStr(5) }],
    gajiMingguanHistory: historyFixture(),
  });
  const ctx = makeProjCtx(D);
  const f = ctx.getCashProjectionForecast(3, {});
  assert.equal(f.months[0].proyeksiKas >= 0, true);
  assert.equal(f.months[0].additionalWorkDaysNeeded, null);
});

test('getCashProjectionForecast() — additionalWorkDaysNeeded dihitung dari gap/avgGajiPerHari saat defisit', () => {
  const D = makeD({
    bills: [{ id: 'b1', name: 'Sewa', amount: 5000000, nextDue: curMonthDateStr(28), freq: 'monthly' }],
    gajiMingguanHistory: historyFixture(), // avgGajiPerHari = 100rb
  });
  const ctx = makeProjCtx(D, { totalSaldoAkun: () => 1000000 });
  const f = ctx.getCashProjectionForecast(3, {});
  const m0 = f.months[0];
  assert.ok(m0.proyeksiKas < 0);
  assert.equal(m0.additionalWorkDaysNeeded, Math.ceil((-m0.proyeksiKas) / 100000));
});

test('getCashProjectionForecast() — additionalWorkDaysNeeded null kalau defisit TAPI avgGajiPerHari<=0 (riwayat kosong, guard div-by-zero)', () => {
  const D = makeD({
    bills: [{ id: 'b1', name: 'Sewa', amount: 5000000, nextDue: curMonthDateStr(28), freq: 'monthly' }],
    gajiMingguanHistory: [],
  });
  const ctx = makeProjCtx(D, { totalSaldoAkun: () => 1000000 });
  const f = ctx.getCashProjectionForecast(3, {});
  assert.ok(f.months[0].proyeksiKas < 0);
  assert.equal(f.months[0].additionalWorkDaysNeeded, null);
});

// --- Sesi S726: rangeLow/rangeHigh (band simetris dari avgAbsPctError kalibrasi) ---

test('getCashProjectionForecast() — rangeLow/rangeHigh null kalau kalibrasi belum tersedia (0 snapshot lampau)', () => {
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji toko', amount: 2000000, date: curMonthDateStr(5) }],
    gajiMingguanHistory: historyFixture(),
  });
  const ctx = makeProjCtx(D);
  const f = ctx.getCashProjectionForecast(3, {});
  assert.equal(f.months[0].rangeLow, null);
  assert.equal(f.months[0].rangeHigh, null);
});

test('getCashProjectionForecast() — rangeLow/rangeHigh = proyeksiKas ± |proyeksiKas*avgAbsPctError| (band simetris)', () => {
  const now = new Date();
  let pastMonth = now.getMonth() - 1, pastYear = now.getFullYear();
  if (pastMonth < 0) { pastMonth += 12; pastYear -= 1; }
  const D = makeD({
    transactions: [
      { type: 'income', category: 'Gaji toko', amount: 2000000, date: curMonthDateStr(5) },
      { type: 'income', category: 'Gaji toko', amount: 1300000, date: `${pastYear}-${String(pastMonth + 1).padStart(2, '0')}-10` },
    ],
    gajiMingguanHistory: historyFixture(),
    cashProjSnapshots: [{ month: pastMonth, year: pastYear, proyeksiKas: 1000000, recordedAt: now.toISOString() }],
  });
  const ctx = makeProjCtx(D);
  const f = ctx.getCashProjectionForecast(3, {});
  const m0 = f.months[0];
  assert.equal(m0.proyeksiKas, 2000000);
  // pctError bulan lampau = (1.3jt-1jt)/1jt = 0.3 -> avgAbsPctError = 0.3
  assert.ok(Math.abs(m0.rangeLow - (2000000 - Math.abs(2000000 * 0.3))) < 1e-6);
  assert.ok(Math.abs(m0.rangeHigh - (2000000 + Math.abs(2000000 * 0.3))) < 1e-6);
});

// --- getCashProjectionDeficitAlert() ---

test('getCashProjectionDeficitAlert() — semua bulan aman -> available:false', () => {
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji toko', amount: 5000000, date: curMonthDateStr(5) }],
    gajiMingguanHistory: historyFixture(),
  });
  const ctx = makeProjCtx(D, { totalSaldoAkun: () => 10000000 });
  const alert = ctx.getCashProjectionDeficitAlert({});
  assert.equal(alert.available, false);
});

test('getCashProjectionDeficitAlert() — saldo kumulatif minus -> type:"saldo" (prioritas atas delta murni)', () => {
  const D = makeD({
    bills: [{ id: 'b1', name: 'Sewa', amount: 5000000, nextDue: curMonthDateStr(28), freq: 'monthly' }],
    gajiMingguanHistory: [],
  });
  const ctx = makeProjCtx(D, { totalSaldoAkun: () => 1000000 });
  const alert = ctx.getCashProjectionDeficitAlert({});
  assert.equal(alert.available, true);
  assert.equal(alert.type, 'saldo');
  assert.ok(alert.amount < 0);
});

test('getCashProjectionDeficitAlert() — delta bulan negatif TAPI saldo masih ketutup -> type:"kas"', () => {
  const D = makeD({
    bills: [{ id: 'b1', name: 'Sewa', amount: 2000000, nextDue: curMonthDateStr(28), freq: 'monthly' }],
    gajiMingguanHistory: [],
  });
  // saldo cukup besar supaya saldo kumulatif TETAP positif walau delta bulan itu negatif
  const ctx = makeProjCtx(D, { totalSaldoAkun: () => 50000000 });
  const alert = ctx.getCashProjectionDeficitAlert({});
  assert.equal(alert.available, true);
  assert.equal(alert.type, 'kas');
});

test('getCashProjectionDeficitAlert() — alertMonthsAhead membatasi jendela pindai', () => {
  // Defisit HANYA muncul di bulan ke-3 (index 2) lewat kewajiban musiman -- disimulasikan
  // dgn bill freq yearly yang jatuh tempo 2 bulan dari sekarang (di luar window alertMonthsAhead:1).
  const now = new Date();
  const future = new Date(now.getFullYear(), now.getMonth() + 2, 15);
  const dueStr = future.toISOString().slice(0, 10);
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji toko', amount: 5000000, date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-05` }],
    bills: [{ id: 'b1', name: 'Pajak Tahunan', amount: 20000000, nextDue: dueStr, freq: 'yearly' }],
    gajiMingguanHistory: historyFixture(),
  });
  const ctx = makeProjCtx(D, { totalSaldoAkun: () => 10000000 });
  const alertNarrow = ctx.getCashProjectionDeficitAlert({ alertMonthsAhead: 1 });
  assert.equal(alertNarrow.available, false);
  const alertWide = ctx.getCashProjectionDeficitAlert({ alertMonthsAhead: 3 });
  assert.equal(alertWide.available, true);
});

// --- DeficitNotifBridge.items() ---

function loadBridgeSandbox(D, extraGlobals) {
  const context = { console, D, window: {}, document: { getElementById: () => null }, ...(extraGlobals || {}) };
  vm.createContext(context);
  vm.runInContext(SRC_BILL, context, { filename: 'tagihan-kalender.js' });
  vm.runInContext(SRC_PROJ, context, { filename: 'cash-projection.js' });
  vm.runInContext(SRC_BRIDGE, context, { filename: 'deficit-notif-bridge.js' });
  vm.runInContext('this.DeficitNotifBridge = DeficitNotifBridge;', context, { filename: 'expose-bridge.js' });
  return context;
}

test('DeficitNotifBridge.items() — tidak ada defisit -> array kosong', () => {
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji toko', amount: 5000000, date: curMonthDateStr(5) }],
    gajiMingguanHistory: historyFixture(),
  });
  const ctx = loadBridgeSandbox(D, { totalSaldoAkun: () => 10000000 });
  const items = ctx.DeficitNotifBridge.items([]);
  assert.equal(items.length, 0);
});

test('DeficitNotifBridge.items() — ada defisit -> 1 item {fireKey,title,body}', () => {
  const D = makeD({
    bills: [{ id: 'b1', name: 'Sewa', amount: 5000000, nextDue: curMonthDateStr(28), freq: 'monthly' }],
    gajiMingguanHistory: [],
  });
  const ctx = loadBridgeSandbox(D, { totalSaldoAkun: () => 1000000, fmtFullSigned: (n) => String(n) });
  const items = ctx.DeficitNotifBridge.items([]);
  assert.equal(items.length, 1);
  assert.ok(items[0].fireKey.startsWith('cashdeficit_saldo_'));
  assert.ok(items[0].title.length > 0);
  assert.ok(items[0].body.length > 0);
});

test('DeficitNotifBridge.items() — fireKey sudah ada di firedIds -> tidak dikirim ulang', () => {
  const D = makeD({
    bills: [{ id: 'b1', name: 'Sewa', amount: 5000000, nextDue: curMonthDateStr(28), freq: 'monthly' }],
    gajiMingguanHistory: [],
  });
  const ctx = loadBridgeSandbox(D, { totalSaldoAkun: () => 1000000 });
  const firstBatch = ctx.DeficitNotifBridge.items([]);
  assert.equal(firstBatch.length, 1);
  const secondBatch = ctx.DeficitNotifBridge.items([firstBatch[0].fireKey]);
  assert.equal(secondBatch.length, 0);
});

test('DeficitNotifBridge.items() — getCashProjectionDeficitAlert belum dimuat -> array kosong (guard typeof)', () => {
  const context = { console };
  vm.createContext(context);
  vm.runInContext(SRC_BRIDGE, context, { filename: 'deficit-notif-bridge.js' });
  vm.runInContext('this.DeficitNotifBridge = DeficitNotifBridge;', context, { filename: 'expose-bridge.js' });
  assert.equal(context.DeficitNotifBridge.items([]).length, 0);
});

// --- _dashCashProjForecastHtml() / integrasi ke kartu ---

function extractFnSource(fnName) {
  const marker = `function ${fnName}(`;
  const start = SRC_RENDER.indexOf(marker);
  if (start === -1) throw new Error(`"${marker}" tidak ditemukan`);
  const braceOpen = SRC_RENDER.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < SRC_RENDER.length && depth > 0) {
    if (SRC_RENDER[i] === '{') depth++;
    else if (SRC_RENDER[i] === '}') depth--;
    i++;
  }
  return SRC_RENDER.slice(start, i);
}

function loadForecastSandbox(D, extraGlobals) {
  const context = {
    console,
    D,
    window: {},
    document: { getElementById: () => null },
    fmtFull: (n) => 'Rp ' + Math.round(Math.abs(Number(n) || 0)).toLocaleString('id-ID'),
    fmtFullSigned: (n) => {
      n = Number(n) || 0;
      return (n < 0 ? '-' : '') + 'Rp ' + Math.round(Math.abs(n)).toLocaleString('id-ID');
    },
    ...(extraGlobals || {}),
  };
  vm.createContext(context);
  vm.runInContext(SRC_BILL, context, { filename: 'tagihan-kalender.js' });
  vm.runInContext(SRC_PROJ, context, { filename: 'cash-projection.js' });
  const snippet = `${extractFnSource('_dashCashProjForecastHtml')}\nthis._dashCashProjForecastHtml = _dashCashProjForecastHtml;`;
  vm.runInContext(snippet, context, { filename: '_dashCashProjForecastHtml-extract.js' });
  return context;
}

test('_dashCashProjForecastHtml() — cash-projection.js tidak dimuat -> string kosong (guard typeof)', () => {
  const context = { console };
  vm.createContext(context);
  const snippet = `${extractFnSource('_dashCashProjForecastHtml')}\nthis._dashCashProjForecastHtml = _dashCashProjForecastHtml;`;
  vm.runInContext(snippet, context, { filename: 'extract.js' });
  assert.equal(context._dashCashProjForecastHtml({}, {}), '');
});

test('_dashCashProjForecastHtml() — render 2 baris bulan depan (bulan target di-skip, sudah tampil di angka utama kartu)', () => {
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji toko', amount: 3000000, date: curMonthDateStr(5) }],
    gajiMingguanHistory: historyFixture(),
  });
  const context = loadForecastSandbox(D, { totalSaldoAkun: () => 5000000 });
  const html = context._dashCashProjForecastHtml({}, {});
  assert.ok(html.includes('Proyeksi 2 bulan ke depan'));
  assert.ok(html.includes('(gaji: pola)'));
  assert.ok(!html.includes('(gaji: aktual)')); // bulan-0 sengaja tidak ikut ditampilkan di daftar ini
});

test('_dashCashProjForecastHtml() — riwayat absen kosong -> muncul baris peringatan hasEnoughData', () => {
  const D = makeD({});
  const context = loadForecastSandbox(D, {});
  const html = context._dashCashProjForecastHtml({}, {});
  assert.ok(html.includes('Riwayat absensi belum cukup'));
});

// --- Sesi S725: confidence badge + breakdown + additionalWorkDaysNeeded ---

test('_dashCashProjForecastHtml() — badge confidence (●/◐/○) muncul tiap baris', () => {
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji toko', amount: 3000000, date: curMonthDateStr(5) }],
    gajiMingguanHistory: historyFixture(),
  });
  const context = loadForecastSandbox(D, { totalSaldoAkun: () => 5000000 });
  const html = context._dashCashProjForecastHtml({}, {});
  assert.ok(html.includes('◐')); // bulan-1: sedang
  assert.ok(html.includes('○')); // bulan-2: rendah
});

// kiriman mingguan (D.profile.kiriman) diterapkan RATA ke tiap bulan (bukan cuma bulan
// nextDue bill), jadi fixture ini dipakai buat pastikan bulan-1/2 (bukan cuma bulan-0
// yg tidak ditampilkan daftar ini) tetap defisit.
test('_dashCashProjForecastHtml() — bulan defisit menampilkan breakdown gaji/kewajiban/kiriman', () => {
  const D = makeD({
    profile: { kiriman: 5000000 },
    gajiMingguanHistory: historyFixture(),
  });
  const context = loadForecastSandbox(D, { totalSaldoAkun: () => 1000000 });
  const html = context._dashCashProjForecastHtml({}, {});
  assert.ok(html.includes('gaji Rp'));
  assert.ok(html.includes('− kiriman Rp'));
});

test('_dashCashProjForecastHtml() — bulan defisit menampilkan estimasi hari kerja tambahan', () => {
  const D = makeD({
    profile: { kiriman: 5000000 },
    gajiMingguanHistory: historyFixture(),
  });
  const context = loadForecastSandbox(D, { totalSaldoAkun: () => 1000000 });
  const html = context._dashCashProjForecastHtml({}, {});
  assert.ok(html.includes('hari kerja tambahan buat nutup'));
});

test('_dashCashProjForecastHtml() — bulan AMAN tidak menampilkan breakdown/hari kerja tambahan', () => {
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji toko', amount: 3000000, date: curMonthDateStr(5) }],
    gajiMingguanHistory: historyFixture(),
  });
  const context = loadForecastSandbox(D, { totalSaldoAkun: () => 50000000 });
  const html = context._dashCashProjForecastHtml({}, {});
  assert.ok(!html.includes('hari kerja tambahan buat nutup'));
});

test('_dashCashProjForecastHtml() — rentang optimis/pesimis muncul kalau kalibrasi tersedia', () => {
  const now = new Date();
  let pastMonth = now.getMonth() - 1, pastYear = now.getFullYear();
  if (pastMonth < 0) { pastMonth += 12; pastYear -= 1; }
  const D = makeD({
    transactions: [
      { type: 'income', category: 'Gaji toko', amount: 2000000, date: curMonthDateStr(5) },
      { type: 'income', category: 'Gaji toko', amount: 1300000, date: `${pastYear}-${String(pastMonth + 1).padStart(2, '0')}-10` },
    ],
    gajiMingguanHistory: historyFixture(),
    cashProjSnapshots: [{ month: pastMonth, year: pastYear, proyeksiKas: 1000000, recordedAt: now.toISOString() }],
  });
  const context = loadForecastSandbox(D, { totalSaldoAkun: () => 5000000 });
  const html = context._dashCashProjForecastHtml({}, {});
  assert.ok(html.includes('rentang:'));
});

test('_dashCashProjForecastHtml() — rentang TIDAK muncul kalau kalibrasi belum tersedia', () => {
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji toko', amount: 3000000, date: curMonthDateStr(5) }],
    gajiMingguanHistory: historyFixture(),
  });
  const context = loadForecastSandbox(D, { totalSaldoAkun: () => 5000000 });
  const html = context._dashCashProjForecastHtml({}, {});
  assert.ok(!html.includes('rentang:'));
});
