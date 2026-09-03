'use strict';
// tests/cash-projection-calibration.test.js — Sesi audit-kartu-proyeksi-kas-insight
// (item besar-effort #10, carry-forward S721/S722): kalibrasi proyeksi vs realisasi.
// Cakupan:
// 1) recordCashProjectionSnapshot() — simpan snapshot proyeksiKas bulan target ke
//    D.cashProjSnapshots, idempoten per month/year kecuali force:true.
// 2) getCashProjectionCalibration() — bandingkan snapshot thd realisasi kas riil
//    (D.transactions bulan itu, hitungKas!==false).
// 3) getCashProjectionCalibrationSummary() — agregat beberapa bulan lampau, skip
//    bulan berjalan/masa depan.
// 4) _renderCashProjectionCard() — auto-snapshot saat render + blok kalibrasi tampil
//    di Detail kalau ada data.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSource } = require('./helpers/loadSource');

const SRC_RENDER = fs.readFileSync(path.join(__dirname, '..', 'modules', 'shared', 'modules-render.js'), 'utf8');
const SRC_BILL = fs.readFileSync(path.join(__dirname, '..', 'modules', 'finance', 'tagihan-kalender.js'), 'utf8');
const SRC_PROJ = fs.readFileSync(path.join(__dirname, '..', 'modules', 'finance', 'cash-projection.js'), 'utf8');

function makeD(overrides) {
  return Object.assign({
    transactions: [],
    workDays: [],
    bills: [],
    debts: [],
    profile: {},
    cashProjSnapshots: [],
  }, overrides);
}

function makeProjCtx(D) {
  return loadSource(
    ['modules/business/reset-gaji-mingguan.js', 'modules/finance/tagihan-kalender.js', 'modules/finance/cash-projection.js'],
    { D }
  );
}

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

function makeEl(id) {
  return { id, innerHTML: '' };
}

function loadCardSandbox(D) {
  const byId = Object.create(null);
  const context = {
    console,
    D,
    document: { getElementById: (id) => byId[id] || null },
    window: {},
    fmtFull: (n) => 'Rp ' + Math.round(Math.abs(Number(n) || 0)).toLocaleString('id-ID'),
    fmtFullSigned: (n) => {
      n = Number(n) || 0;
      return (n < 0 ? '-' : '') + 'Rp ' + Math.round(Math.abs(n)).toLocaleString('id-ID');
    },
  };
  vm.createContext(context);
  vm.runInContext(SRC_BILL, context, { filename: 'tagihan-kalender.js' });
  vm.runInContext(SRC_PROJ, context, { filename: 'cash-projection.js' });
  const snippet = `${extractFnSource('_dashCashProjSettingsToggle')}\n${extractFnSource('_renderPolaAbsenBlock')}\n${extractFnSource('_dashCashProjMoMHtml')}\n${extractFnSource('_dashCashProjInsightHtml')}\n${extractFnSource('_dashCashProjSparklineHtml')}\n${extractFnSource('_dashCashProjCalibrationHtml')}\n${extractFnSource('_dashCashProjForecastHtml')}\n${extractFnSource('_renderCashProjectionCard')}\nthis._renderCashProjectionCard = _renderCashProjectionCard;`;
  vm.runInContext(snippet, context, { filename: '_renderCashProjectionCard-extract.js' });
  return { context, byId };
}

// --- recordCashProjectionSnapshot() ---

test('recordCashProjectionSnapshot() — simpan snapshot baru ke D.cashProjSnapshots', () => {
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji toko', amount: 1000000, date: '2026-07-05' }],
  });
  const ctx = makeProjCtx(D);
  const entry = ctx.recordCashProjectionSnapshot(6, 2026, {});
  assert.equal(D.cashProjSnapshots.length, 1);
  assert.equal(entry.month, 6);
  assert.equal(entry.year, 2026);
  assert.equal(entry.proyeksiKas, 1000000);
});

test('recordCashProjectionSnapshot() — idempoten: panggil kedua kali TIDAK menimpa snapshot lama walau data berubah', () => {
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji toko', amount: 1000000, date: '2026-07-05' }],
  });
  const ctx = makeProjCtx(D);
  ctx.recordCashProjectionSnapshot(6, 2026, {});
  D.transactions.push({ type: 'income', category: 'Gaji toko', amount: 5000000, date: '2026-07-10' });
  const entry2 = ctx.recordCashProjectionSnapshot(6, 2026, {});
  assert.equal(D.cashProjSnapshots.length, 1);
  assert.equal(entry2.proyeksiKas, 1000000); // TIDAK berubah walau ada transaksi baru
});

test('recordCashProjectionSnapshot() — force:true MENIMPA snapshot lama', () => {
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji toko', amount: 1000000, date: '2026-07-05' }],
  });
  const ctx = makeProjCtx(D);
  ctx.recordCashProjectionSnapshot(6, 2026, {});
  D.transactions.push({ type: 'income', category: 'Gaji toko', amount: 5000000, date: '2026-07-10' });
  const entry2 = ctx.recordCashProjectionSnapshot(6, 2026, {}, true);
  assert.equal(D.cashProjSnapshots.length, 1);
  assert.equal(entry2.proyeksiKas, 6000000);
});

test('recordCashProjectionSnapshot() — D.cashProjSnapshots belum ada -> dibuat otomatis (backward-compat)', () => {
  const D = { transactions: [], bills: [], workDays: [], profile: {} }; // TANPA cashProjSnapshots
  const ctx = makeProjCtx(D);
  assert.doesNotThrow(() => ctx.recordCashProjectionSnapshot(6, 2026, {}));
  assert.ok(Array.isArray(D.cashProjSnapshots));
  assert.equal(D.cashProjSnapshots.length, 1);
});

// --- getCashProjectionCalibration() ---

test('getCashProjectionCalibration() — belum ada snapshot bulan itu -> available:false', () => {
  const D = makeD({});
  const ctx = makeProjCtx(D);
  const c = ctx.getCashProjectionCalibration(6, 2026);
  assert.equal(c.available, false);
});

test('getCashProjectionCalibration() — realisasi LEBIH RENDAH dari proyeksi -> verdict optimis', () => {
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji toko', amount: 2000000, date: '2026-07-05' }],
  });
  const ctx = makeProjCtx(D);
  ctx.recordCashProjectionSnapshot(6, 2026, {}); // snapshot proyeksiKas = 2jt
  // realisasi TURUN (mis. transaksi gaji itu di-void/dihapus, expense muncul)
  D.transactions.length = 0;
  D.transactions.push({ type: 'income', category: 'Gaji toko', amount: 2000000, date: '2026-07-05' });
  D.transactions.push({ type: 'expense', category: 'Lain', amount: 1500000, date: '2026-07-10' });
  const c = ctx.getCashProjectionCalibration(6, 2026);
  assert.equal(c.available, true);
  assert.equal(c.realisasiKas, 500000);
  assert.equal(c.proyeksiKas, 2000000);
  assert.equal(c.selisih, -1500000);
  assert.equal(c.verdict, 'optimis');
});

test('getCashProjectionCalibration() — realisasi LEBIH TINGGI dari proyeksi -> verdict pesimis', () => {
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji toko', amount: 1000000, date: '2026-07-05' }],
  });
  const ctx = makeProjCtx(D);
  ctx.recordCashProjectionSnapshot(6, 2026, {}); // snapshot proyeksiKas = 1jt
  D.transactions.push({ type: 'income', category: 'Gaji toko', amount: 2000000, date: '2026-07-15' });
  const c = ctx.getCashProjectionCalibration(6, 2026);
  assert.equal(c.realisasiKas, 3000000);
  assert.equal(c.selisih, 2000000);
  assert.equal(c.verdict, 'pesimis');
});

test('getCashProjectionCalibration() — transaksi hitungKas:false TIDAK ikut realisasi', () => {
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji toko', amount: 1000000, date: '2026-07-05' }],
  });
  const ctx = makeProjCtx(D);
  ctx.recordCashProjectionSnapshot(6, 2026, {});
  D.transactions.push({ type: 'income', category: 'Gaji toko', amount: 9000000, date: '2026-07-06', hitungKas: false });
  const c = ctx.getCashProjectionCalibration(6, 2026);
  assert.equal(c.realisasiKas, 1000000); // transaksi hitungKas:false diabaikan
});

test('getCashProjectionCalibration() — proyeksiKas persis 0 -> pctError null (guard div-by-zero)', () => {
  const D = makeD({});
  const ctx = makeProjCtx(D);
  ctx.recordCashProjectionSnapshot(6, 2026, {}); // proyeksiKas 0 (0 data)
  const c = ctx.getCashProjectionCalibration(6, 2026);
  assert.equal(c.proyeksiKas, 0);
  assert.equal(c.pctError, null);
  assert.equal(c.verdict, 'akurat'); // selisih juga 0
});

// --- getCashProjectionCalibrationSummary() ---

test('getCashProjectionCalibrationSummary() — 0 snapshot tersimpan -> available:false', () => {
  const D = makeD({});
  const ctx = makeProjCtx(D);
  const s = ctx.getCashProjectionCalibrationSummary(6);
  assert.equal(s.available, false);
  assert.equal(s.history.length, 0);
});

test('getCashProjectionCalibrationSummary() — agregat rata-rata pctError dari beberapa bulan lampau, skip bulan berjalan/masa depan', () => {
  const D = makeD({ transactions: [] });
  const ctx = makeProjCtx(D);
  const now = new Date();
  let pastMonth = now.getMonth() - 1, pastYear = now.getFullYear();
  if (pastMonth < 0) { pastMonth += 12; pastYear -= 1; }
  // Snapshot bulan lampau (1 bulan sebelum sekarang) — proyeksiKas 1jt.
  D.cashProjSnapshots.push({ month: pastMonth, year: pastYear, proyeksiKas: 1000000, proyeksiSaldoAkhirBulan: null, saldoKasSekarang: null, recordedAt: now.toISOString() });
  D.transactions.push({ type: 'income', category: 'Gaji toko', amount: 1200000, date: `${pastYear}-${String(pastMonth + 1).padStart(2, '0')}-10` }); // realisasi 1.2jt -> selisih +200rb -> pesimis
  // Snapshot bulan BERJALAN (sekarang) — SENGAJA tidak boleh ikut ke summary.
  ctx.recordCashProjectionSnapshot(now.getMonth(), now.getFullYear(), {});
  const s = ctx.getCashProjectionCalibrationSummary(6);
  assert.equal(s.available, true);
  assert.equal(s.history.length, 1); // hanya bulan lampau, bulan berjalan di-skip
  assert.equal(s.history[0].month, pastMonth);
  assert.ok(s.avgPctError > 0); // realisasi > proyeksi -> pctError positif
  assert.equal(s.biasVerdict, 'pesimis');
});

// Sesi S726: avgAbsPctError — NILAI ABSOLUT, jadi 2 bulan dgn error berlawanan arah
// (satu pesimis, satu optimis, magnitude sama) TIDAK saling meniadakan jadi ~0
// (beda dari avgPctError yang BISA saling meniadakan).
test('getCashProjectionCalibrationSummary() — avgAbsPctError TIDAK saling meniadakan arah berlawanan (beda dari avgPctError)', () => {
  const D = makeD({ transactions: [] });
  const ctx = makeProjCtx(D);
  const now = new Date();
  let m1 = now.getMonth() - 1, y1 = now.getFullYear();
  if (m1 < 0) { m1 += 12; y1 -= 1; }
  let m2 = now.getMonth() - 2, y2 = now.getFullYear();
  if (m2 < 0) { m2 += 12; y2 -= 1; }
  const recAt = now.toISOString();
  // Bulan-1: proyeksi 1jt, realisasi 1.2jt -> pctError +0.2 (pesimis/under-estimate)
  D.cashProjSnapshots.push({ month: m1, year: y1, proyeksiKas: 1000000, recordedAt: recAt });
  D.transactions.push({ type: 'income', category: 'Gaji toko', amount: 1200000, date: `${y1}-${String(m1 + 1).padStart(2, '0')}-10` });
  // Bulan-2: proyeksi 1jt, realisasi 0.8jt -> pctError -0.2 (optimis/over-estimate)
  D.cashProjSnapshots.push({ month: m2, year: y2, proyeksiKas: 1000000, recordedAt: recAt });
  D.transactions.push({ type: 'income', category: 'Gaji toko', amount: 800000, date: `${y2}-${String(m2 + 1).padStart(2, '0')}-10` });
  const s = ctx.getCashProjectionCalibrationSummary(6);
  assert.equal(s.available, true);
  assert.equal(s.history.length, 2);
  // avgPctError saling meniadakan (+0.2 & -0.2 -> rata-rata ~0)
  assert.ok(Math.abs(s.avgPctError) < 1e-9);
  // avgAbsPctError TIDAK saling meniadakan (|0.2| & |-0.2| -> rata-rata 0.2)
  assert.ok(Math.abs(s.avgAbsPctError - 0.2) < 1e-9);
});

test('getCashProjectionCalibrationSummary() — snapshot HANYA di masa depan -> available:false (bulan berjalan/masa depan di-skip semua)', () => {
  const D = makeD({ transactions: [] });
  const ctx = makeProjCtx(D);
  const future = new Date();
  const futureMonth = future.getMonth();
  const futureYear = future.getFullYear() + 5;
  ctx.recordCashProjectionSnapshot(futureMonth, futureYear, {});
  const s = ctx.getCashProjectionCalibrationSummary(6);
  assert.equal(s.available, false); // snapshot masa depan TIDAK ikut historical summary
});

// --- integrasi ke _renderCashProjectionCard() ---

test('_renderCashProjectionCard() — merender kartu MEMBUAT snapshot bulan berjalan otomatis (D.cashProjSnapshots bertambah)', () => {
  const D = { transactions: [], bills: [], workDays: [], cashProjSnapshots: [] };
  const { context, byId } = loadCardSandbox(D);
  const el = makeEl('dashCashProjBody');
  byId[el.id] = el;
  context._renderCashProjectionCard({ m: 6, y: 2026 });
  assert.equal(D.cashProjSnapshots.length, 1);
  assert.equal(D.cashProjSnapshots[0].month, 6);
  assert.equal(D.cashProjSnapshots[0].year, 2026);
});

test('_renderCashProjectionCard() — render kedua kali di bulan sama TIDAK menambah snapshot baru (idempoten)', () => {
  const D = { transactions: [], bills: [], workDays: [], cashProjSnapshots: [] };
  const { context, byId } = loadCardSandbox(D);
  const el = makeEl('dashCashProjBody');
  byId[el.id] = el;
  context._renderCashProjectionCard({ m: 6, y: 2026 });
  context._renderCashProjectionCard({ m: 6, y: 2026 });
  assert.equal(D.cashProjSnapshots.length, 1);
});

test('_renderCashProjectionCard() — cashProjSnapshots kosong di D awal (backward-compat) TIDAK throw', () => {
  const D = { transactions: [], bills: [], workDays: [] }; // TANPA cashProjSnapshots
  const { context, byId } = loadCardSandbox(D);
  const el = makeEl('dashCashProjBody');
  byId[el.id] = el;
  assert.doesNotThrow(() => context._renderCashProjectionCard({ m: 6, y: 2026 }));
  assert.ok(Array.isArray(D.cashProjSnapshots));
});

test('_renderCashProjectionCard() — blok Kalibrasi tampil di Detail kalau ada riwayat bulan lampau', () => {
  const D = { transactions: [], bills: [], workDays: [], cashProjSnapshots: [] };
  const { context, byId } = loadCardSandbox(D);
  // getCashProjectionCalibrationSummary() pakai Date.now() RIIL (bukan ctx.m/y yang
  // dipakai render), jadi snapshot "bulan lampau" di sini WAJIB dalam jendela 6 bulan
  // dari tanggal sistem sungguhan supaya masuk hitungan summary.
  const now = new Date();
  let pastMonth = now.getMonth() - 1, pastYear = now.getFullYear();
  if (pastMonth < 0) { pastMonth += 12; pastYear -= 1; }
  context.D.cashProjSnapshots.push({ month: pastMonth, year: pastYear, proyeksiKas: 1000000, proyeksiSaldoAkhirBulan: null, saldoKasSekarang: null, recordedAt: now.toISOString() });
  context.D.transactions.push({ type: 'income', category: 'Gaji toko', amount: 800000, date: `${pastYear}-${String(pastMonth + 1).padStart(2, '0')}-10` });
  const el = makeEl('dashCashProjBody');
  byId[el.id] = el;
  context._renderCashProjectionCard({ m: now.getMonth(), y: now.getFullYear() });
  assert.match(el.innerHTML, /Kalibrasi/);
});
