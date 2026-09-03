'use strict';
// tests/cash-projection-pola-absen.test.js — Sesi "Proyeksi Pola Absen" (2 keputusan W:
// basis proyeksi = pola dari D.gajiMingguanHistory [rata-rata hari kerja/minggu & gaji/
// hari dari 10 minggu terakhir yang tercatat]; muncul di kartu Proyeksi Kas Bulan Ini di
// Beranda, jawab target Kiriman Mingguan tercapai/kurang & proyeksi kas akhir bulan
// plus/minus kalau sisa hari minggu/bulan ini pola absen berlanjut). Cakupan:
// getAttendancePatternStats() + getPolaAbsenProjection() (modules/finance/cash-
// projection.js), murni — 0 baca DOM.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides) {
  return Object.assign({
    transactions: [],
    workDays: [],
    bills: [],
    gajiMingguanHistory: [],
    profile: {},
  }, overrides);
}

// makeFixedDate(iso) — SAMA PERSIS pola tests/cash-projection-s667b-siklus.test.js:
// subclass Date yang balikin `iso` kalau dipanggil tanpa argumen (new Date() =
// acuan "sekarang"), tapi transparan kalau dipanggil dgn argumen (new Date(x), dipakai
// _cpLocalDate() utk parse tanggal lain).
function makeFixedDate(iso) {
  const RealDate = Date;
  function FixedDate(...args) {
    if (args.length === 0) return new RealDate(iso);
    return new RealDate(...args);
  }
  FixedDate.prototype = RealDate.prototype;
  FixedDate.now = () => new RealDate(iso).getTime();
  return FixedDate;
}

function makeCtx(D, now) {
  return loadSource(
    ['modules/business/reset-gaji-mingguan.js', 'modules/finance/tagihan-kalender.js', 'modules/finance/cash-projection.js'],
    { D, ...(now ? { Date: makeFixedDate(now) } : {}) }
  );
}

function histWeek(count, total) {
  return { id: 'h', weekStart: '2026-01-01', weekEnd: '2026-01-07', total, count, resetDate: '2026-01-08', incomeSaved: true };
}

// --- getAttendancePatternStats() ---

test('getAttendancePatternStats() — riwayat kosong -> hasEnoughData:false, semua 0', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const s = ctx.getAttendancePatternStats();
  assert.equal(s.weeksUsed, 0);
  assert.equal(s.avgHariKerjaPerMinggu, 0);
  assert.equal(s.avgGajiPerHari, 0);
  assert.equal(s.hasEnoughData, false);
});

test('getAttendancePatternStats() — hanya ambil (default) 10 ENTRI TERAKHIR dari riwayat (bukan seluruh riwayat)', () => {
  // 12 minggu riwayat, 6 hari kerja/minggu tiap minggu, tapi 2 entri PERTAMA nilainya beda
  // ekstrim (hari kerja 0) supaya kentara kalau ikut kehitung.
  const D = makeD({
    gajiMingguanHistory: [
      histWeek(0, 0), histWeek(0, 0), // 2 entri terlama, seharusnya TIDAK dipakai (limit 10)
      ...Array.from({ length: 10 }, () => histWeek(6, 300000)),
    ],
  });
  const ctx = makeCtx(D);
  const s = ctx.getAttendancePatternStats();
  assert.equal(s.weeksUsed, 10);
  assert.equal(s.totalHariKerja, 60);
  assert.equal(s.avgHariKerjaPerMinggu, 6);
  assert.equal(s.avgGajiPerHari, 50000);
  assert.equal(s.hasEnoughData, true);
});

test('getAttendancePatternStats() — avgGajiPerHari WEIGHTED (total gaji/total hari kerja), bukan average-of-averages', () => {
  const D = makeD({
    gajiMingguanHistory: [
      histWeek(1, 100000), // Rp100rb/hari minggu ini
      histWeek(9, 900000), // Rp100rb/hari juga, tapi 9x lebih banyak hari
    ],
  });
  const ctx = makeCtx(D);
  const s = ctx.getAttendancePatternStats();
  // weighted: (100000+900000)/(1+9) = 100000 (sama krn rate konsisten di contoh ini)
  assert.equal(s.avgGajiPerHari, 100000);
  assert.equal(s.avgHariKerjaPerMinggu, 5); // (1+9)/2 minggu
});

test('getAttendancePatternStats() — minggu dgn count:0 IKUT dihitung ke avgHariKerjaPerMinggu (bukan di-exclude), tapi tidak bikin div-by-zero', () => {
  const D = makeD({
    gajiMingguanHistory: [histWeek(6, 300000), histWeek(0, 0)],
  });
  const ctx = makeCtx(D);
  const s = ctx.getAttendancePatternStats();
  assert.equal(s.weeksUsed, 2);
  assert.equal(s.avgHariKerjaPerMinggu, 3); // (6+0)/2
  assert.equal(s.avgGajiPerHari, 50000); // 300000/6, denominator totalHariKerja bukan weeksUsed
  assert.equal(s.hasEnoughData, true);
});

test('getAttendancePatternStats() — seluruh minggu yang dipakai count:0 -> avgGajiPerHari 0 (guarded), hasEnoughData:false', () => {
  const D = makeD({ gajiMingguanHistory: [histWeek(0, 0), histWeek(0, 0)] });
  const ctx = makeCtx(D);
  const s = ctx.getAttendancePatternStats();
  assert.equal(s.avgGajiPerHari, 0);
  assert.equal(s.hasEnoughData, false);
});

test('getAttendancePatternStats(limit) — limit custom dihormati', () => {
  const D = makeD({
    gajiMingguanHistory: [histWeek(1, 10000), histWeek(2, 20000), histWeek(3, 30000)],
  });
  const ctx = makeCtx(D);
  const s = ctx.getAttendancePatternStats(2);
  assert.equal(s.weeksUsed, 2); // 2 entri terakhir: count 2 & 3
  assert.equal(s.totalHariKerja, 5);
});

// --- getPolaAbsenProjection() ---

test('getPolaAbsenProjection() — riwayat kosong -> hasEnoughData:false (caller wajib guard, 0 angka proyeksi berdasar)', () => {
  const D = makeD();
  const ctx = makeCtx(D, '2026-08-19T10:00:00'); // Rabu
  const p = ctx.getPolaAbsenProjection(7, 2026);
  assert.equal(p.hasEnoughData, false);
});

test('getPolaAbsenProjection() — target Kiriman Mingguan TERCAPAI kalau proyeksi >= target', () => {
  // Pola: 7 hari kerja/minggu, Rp100rb/hari -> dailyWorkRate = 1 (kerja tiap hari).
  const D = makeD({
    gajiMingguanHistory: Array.from({ length: 10 }, () => histWeek(7, 700000)),
    workDays: [], // belum ada hari kerja tercatat minggu ini
    profile: { kiriman: 300000 },
  });
  // 2026-08-19 = Rabu (getDay()=3) -> sisa hari s/d Sabtu = 3.
  const ctx = makeCtx(D, '2026-08-19T10:00:00');
  const p = ctx.getPolaAbsenProjection(7, 2026);
  assert.equal(p.remainingDaysInWeek, 3);
  assert.equal(p.currentWeekGaji, 0);
  assert.equal(p.projectedAdditionalGajiMinggu, 300000); // dailyWorkRate(1) * 3 hari * 100rb
  assert.equal(p.projectedGajiMingguIni, 300000);
  assert.equal(p.weeklyVerdict, 'tercapai');
});

test('getPolaAbsenProjection() — target Kiriman Mingguan KURANG kalau proyeksi < target, dan currentWeekGaji dari D.workDays minggu berjalan ikut terhitung', () => {
  const D = makeD({
    gajiMingguanHistory: Array.from({ length: 10 }, () => histWeek(7, 700000)), // Rp100rb/hari
    workDays: [
      { date: '2026-08-17', total: 100000 }, // Senin minggu ini
      { date: '2026-08-18', total: 100000 }, // Selasa minggu ini
      { date: '2026-07-20', total: 999999 }, // minggu LAIN, harus di-exclude
    ],
    profile: { kiriman: 1000000 }, // target tinggi, sengaja bikin kurang
  });
  const ctx = makeCtx(D, '2026-08-19T10:00:00'); // Rabu, sisa 3 hari
  const p = ctx.getPolaAbsenProjection(7, 2026);
  assert.equal(p.currentWeekHariKerja, 2);
  assert.equal(p.currentWeekGaji, 200000);
  assert.equal(p.projectedAdditionalGajiMinggu, 300000); // 1/hari * 3 hari * 100rb
  assert.equal(p.projectedGajiMingguIni, 500000); // 200rb tercatat + 300rb proyeksi
  assert.equal(p.weeklyVerdict, 'kurang');
  assert.equal(p.weeklyGap, 500000 - 1000000);
});

test('getPolaAbsenProjection() — proyeksi kas akhir bulan PLUS/MINUS = baseline getMonthlyCashProjection() + proyeksi tambahan gaji sisa hari bulan', () => {
  const D = makeD({
    gajiMingguanHistory: Array.from({ length: 10 }, () => histWeek(7, 700000)), // dailyWorkRate=1, Rp100rb/hari
    transactions: [],
    workDays: [],
    bills: [],
    profile: { kiriman: 0 },
  });
  // 2026-08-19 = tanggal 19, Agustus 2026 punya 31 hari -> sisa hari bulan (setelah hari
  // ini) = 31-19 = 12.
  const ctx = makeCtx(D, '2026-08-19T10:00:00');
  const p = ctx.getPolaAbsenProjection(7, 2026);
  const baseline = ctx.getMonthlyCashProjection(7, 2026);
  assert.equal(p.remainingDaysInMonth, 12);
  assert.equal(p.projectedAdditionalGajiBulan, 1200000); // 1/hari * 12 hari * 100rb
  assert.equal(p.proyeksiKasBaseline, baseline.proyeksiKas);
  assert.equal(p.proyeksiKasPolaAbsen, baseline.proyeksiKas + 1200000);
  assert.equal(p.monthlyVerdict, p.proyeksiKasPolaAbsen >= 0 ? 'plus' : 'minus');
});

test('getPolaAbsenProjection() — bulan target BUKAN bulan berjalan -> remainingDaysInMonth 0, proyeksiKasPolaAbsen == baseline (tidak salah proyeksi bulan lain)', () => {
  const D = makeD({
    gajiMingguanHistory: Array.from({ length: 10 }, () => histWeek(7, 700000)),
    profile: { kiriman: 0 },
  });
  const ctx = makeCtx(D, '2026-08-19T10:00:00'); // "sekarang" Agustus 2026
  const p = ctx.getPolaAbsenProjection(2, 2026); // target Maret 2026 (bulan lain)
  assert.equal(p.isCurrentMonth, false);
  assert.equal(p.remainingDaysInMonth, 0);
  assert.equal(p.projectedAdditionalGajiBulan, 0);
  const baseline = ctx.getMonthlyCashProjection(2, 2026);
  assert.equal(p.proyeksiKasPolaAbsen, baseline.proyeksiKas);
});

test('getPolaAbsenProjection() — opts (billWindowMode/dst) diteruskan apa adanya ke getMonthlyCashProjection() (0 logic baru di situ)', () => {
  const D = makeD({
    gajiMingguanHistory: Array.from({ length: 10 }, () => histWeek(7, 700000)),
    bills: [{ id: 'b1', name: 'wifi', amount: 50000, nextDue: '2026-08-05', freq: 'bulanan', category: 'Tagihan' }],
    profile: { kiriman: 0 },
  });
  const ctx = makeCtx(D, '2026-08-19T10:00:00');
  const pKalender = ctx.getPolaAbsenProjection(7, 2026, { billWindowMode: 'kalender' });
  const baselineKalender = ctx.getMonthlyCashProjection(7, 2026, { billWindowMode: 'kalender' });
  assert.equal(pKalender.proyeksiKasBaseline, baselineKalender.proyeksiKas);
});

// Sesi follow-up "UI pengaturan limit minggu" — opts.polaAbsenWeeks (REUSE
// CashflowProjSettings.polaAbsenWeeks) meneruskan limit custom ke
// getAttendancePatternStats(), 0 pengaruh ke field opts lain (billWindowMode dst
// tetap diteruskan apa adanya ke getMonthlyCashProjection()).
test('getPolaAbsenProjection(opts.polaAbsenWeeks) — override limit minggu diteruskan ke getAttendancePatternStats(), default (undefined) tetap 10', () => {
  const D = makeD({
    // 12 entri: 2 entri TERLAMA beda ekstrim (count 0), 10 entri terbaru count 6.
    gajiMingguanHistory: [
      histWeek(0, 0), histWeek(0, 0),
      ...Array.from({ length: 10 }, () => histWeek(6, 300000)),
    ],
    profile: { kiriman: 0 },
  });
  const ctx = makeCtx(D, '2026-08-19T10:00:00');
  const pDefault = ctx.getPolaAbsenProjection(7, 2026); // default limit 10 -> skip 2 entri terlama
  assert.equal(pDefault.pattern.weeksUsed, 10);
  assert.equal(pDefault.pattern.avgHariKerjaPerMinggu, 6);

  const pAll = ctx.getPolaAbsenProjection(7, 2026, { polaAbsenWeeks: 12 }); // ambil semua 12
  assert.equal(pAll.pattern.weeksUsed, 12);
  assert.equal(pAll.pattern.avgHariKerjaPerMinggu, 5); // (0+0+6*10)/12
});

test('getPolaAbsenProjection(opts.polaAbsenWeeks) — dikirim BARENG billWindowMode -> keduanya diteruskan ke fungsi masing2, tidak saling ganggu', () => {
  const D = makeD({
    gajiMingguanHistory: Array.from({ length: 5 }, () => histWeek(7, 700000)),
    bills: [{ id: 'b1', name: 'wifi', amount: 50000, nextDue: '2026-08-05', freq: 'bulanan', category: 'Tagihan' }],
    profile: { kiriman: 0 },
  });
  const ctx = makeCtx(D, '2026-08-19T10:00:00');
  const p = ctx.getPolaAbsenProjection(7, 2026, { polaAbsenWeeks: 5, billWindowMode: 'kalender' });
  const baselineKalender = ctx.getMonthlyCashProjection(7, 2026, { billWindowMode: 'kalender' });
  assert.equal(p.pattern.weeksUsed, 5);
  assert.equal(p.proyeksiKasBaseline, baselineKalender.proyeksiKas);
});

test('getPolaAbsenProjection() — D.profile.kiriman kosong -> kirimanTarget 0 (backward-safe, tidak throw)', () => {
  const D = makeD({
    gajiMingguanHistory: Array.from({ length: 10 }, () => histWeek(7, 700000)),
    profile: {},
  });
  const ctx = makeCtx(D, '2026-08-19T10:00:00');
  const p = ctx.getPolaAbsenProjection(7, 2026);
  assert.equal(p.kirimanTarget, 0);
});
