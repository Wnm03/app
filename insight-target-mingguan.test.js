'use strict';
// tests/insight-target-mingguan.test.js — cakupan modules/business/
// insight-target-mingguan.js (S132, Insight Target Mingguan kirim uang ke
// istri). Fokus ke compute()/isAktif() (logic murni, tidak sentuh DOM).
// getWeekRange() di-load dari sumber ASLI-nya (reset-gaji-mingguan.js)
// supaya definisi minggu (Minggu–Sabtu) sama persis dengan yang dipakai
// Payroll — bukan di-mock ulang di sini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function fmtFullMock(n) {
  const neg = n < 0;
  return (neg ? '-Rp ' : 'Rp ') + Math.abs(Math.round(n)).toString();
}

function makeCtx(D) {
  return loadSource(
    ['modules/business/reset-gaji-mingguan.js', 'modules/business/insight-target-mingguan.js'],
    { D, fmtFull: fmtFullMock, escapeHtml: (s) => s },
    ['InsightTargetMingguan'],
  );
}

// Rabu, 22 Juli 2026 — dipakai sebagai "now" tetap supaya test deterministik.
// getWeekRange() Minggu–Sabtu: minggu berjalan = Minggu 19 Juli s/d Sabtu 25 Juli 2026.
const NOW = new Date('2026-07-22T10:00:00');

test('compute() — status belum_diatur kalau target (D.profile.kiriman) 0/kosong', () => {
  const ctx = makeCtx({ profile: { kiriman: 0 }, workDays: [] });
  const r = ctx.InsightTargetMingguan.compute(NOW);
  assert.equal(r.status, 'belum_diatur');
  assert.equal(r.target, 0);
  assert.match(r.pesan, /Atur dulu/);
});

test('compute() — status kurang kalau total gaji minggu ini < target', () => {
  const D = {
    profile: { kiriman: 500000 },
    workDays: [
      { date: '2026-07-20', total: 100000 },
      { date: '2026-07-21', total: 100000 },
    ],
  };
  const ctx = makeCtx(D);
  const r = ctx.InsightTargetMingguan.compute(NOW);
  assert.equal(r.status, 'kurang');
  assert.equal(r.totalGaji, 200000);
  assert.equal(r.selisih, -300000);
  assert.equal(r.progress, 40);
  assert.match(r.pesan, /kurang/);
});

test('compute() — status tercapai (pas) kalau total gaji minggu ini == target', () => {
  const D = {
    profile: { kiriman: 300000 },
    workDays: [{ date: '2026-07-21', total: 300000 }],
  };
  const ctx = makeCtx(D);
  const r = ctx.InsightTargetMingguan.compute(NOW);
  assert.equal(r.status, 'tercapai');
  assert.equal(r.selisih, 0);
  assert.match(r.pesan, /Pas banget/);
});

test('compute() — status tercapai (surplus) kalau total gaji minggu ini > target', () => {
  const D = {
    profile: { kiriman: 300000 },
    workDays: [{ date: '2026-07-21', total: 450000 }],
  };
  const ctx = makeCtx(D);
  const r = ctx.InsightTargetMingguan.compute(NOW);
  assert.equal(r.status, 'tercapai');
  assert.equal(r.selisih, 150000);
  assert.match(r.pesan, /surplus/);
});

test('compute() — hanya menjumlah D.workDays yang jatuh di periode Minggu–Sabtu berjalan, mengabaikan minggu lain', () => {
  const D = {
    profile: { kiriman: 100000 },
    workDays: [
      { date: '2026-07-19', total: 50000 }, // Minggu (masuk minggu ini)
      { date: '2026-07-25', total: 50000 }, // Sabtu (masuk minggu ini)
      { date: '2026-07-18', total: 999999 }, // Sabtu minggu SEBELUMNYA — dikecualikan
      { date: '2026-07-26', total: 999999 }, // Minggu minggu BERIKUTNYA — dikecualikan
    ],
  };
  const ctx = makeCtx(D);
  const r = ctx.InsightTargetMingguan.compute(NOW);
  assert.equal(r.totalGaji, 100000);
  assert.equal(r.hariCount, 2);
  assert.equal(r.status, 'tercapai');
});

test('isAktif() — default true kalau D.profile.insightMingguanAktif belum pernah diisi', () => {
  const ctx = makeCtx({ profile: {}, workDays: [] });
  assert.equal(ctx.InsightTargetMingguan.isAktif(), true);
});

test('isAktif() — false kalau D.profile.insightMingguanAktif eksplisit di-nonaktifkan', () => {
  const ctx = makeCtx({ profile: { insightMingguanAktif: false }, workDays: [] });
  assert.equal(ctx.InsightTargetMingguan.isAktif(), false);
});
