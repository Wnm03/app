'use strict';
// tests/cash-projection-kiriman-mingguan.test.js — Sesi kiriman-mingguan-proyeksi-kas.
// Cakupan: _cpWeeksInMonth() (jumlah hari Sabtu dlm 1 bulan), kirimanEstimate REUSE
// D.profile.kiriman (setting global yg SUDAH ADA, dipakai jg InsightTargetMingguan),
// dan proyeksiKas kini ikut mengurangi kirimanEstimate.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides) {
  return Object.assign({
    transactions: [],
    workDays: [],
    bills: [],
    profile: {},
  }, overrides);
}

function makeCtx(D) {
  return loadSource(['modules/finance/tagihan-kalender.js', 'modules/finance/cash-projection.js'], { D });
}

test('_cpWeeksInMonth() — Agustus 2026 (31 hari, dimulai Sabtu 1 Agu) punya 5 hari Sabtu', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  // 2026-08-01 adalah Sabtu -> Sabtu jatuh tgl 1,8,15,22,29 = 5
  assert.equal(ctx._cpWeeksInMonth(2026, 7), 5);
});

test('_cpWeeksInMonth() — Februari 2026 (28 hari, mulai Minggu) punya 4 hari Sabtu', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx._cpWeeksInMonth(2026, 1), 4);
});

test('getMonthlyCashProjection() — kirimanPerMinggu REUSE D.profile.kiriman apa adanya (0 field baru)', () => {
  const D = makeD({ profile: { kiriman: 500000 } });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(7, 2026);
  assert.equal(r.kirimanPerMinggu, 500000);
  assert.equal(r.weeksInMonth, 5);
  assert.equal(r.kirimanEstimate, 2500000);
});

test('getMonthlyCashProjection() — D.profile.kiriman kosong/0 -> kirimanEstimate 0, 0 pengaruh ke proyeksiKas (backward-safe)', () => {
  const D = makeD({ profile: {} });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(7, 2026);
  assert.equal(r.kirimanEstimate, 0);
  assert.equal(r.proyeksiKas, r.proyeksiGaji - r.sisaKewajiban);
});

test('getMonthlyCashProjection() — proyeksiKas = proyeksiGaji - sisaKewajiban - kirimanEstimate', () => {
  const D = makeD({
    profile: { kiriman: 100000 },
    transactions: [{ type: 'income', category: 'Gaji', date: '2026-08-05', amount: 3000000 }],
  });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(7, 2026);
  assert.equal(r.kirimanEstimate, 500000); // 100000 x 5 minggu
  assert.equal(r.proyeksiKas, r.proyeksiGaji - r.sisaKewajiban - 500000);
});

// --- Sesi pengaturan-proyeksi-kas-lengkap: opts.includeKiriman / opts.includePendingGaji ---

test('getMonthlyCashProjection({includeKiriman:false}) — kirimanEstimate TETAP dihitung & dikembalikan, tapi TIDAK dikurangkan ke proyeksiKas', () => {
  const D = makeD({
    profile: { kiriman: 100000 },
    transactions: [{ type: 'income', category: 'Gaji', date: '2026-08-05', amount: 3000000 }],
  });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(7, 2026, { includeKiriman: false });
  assert.equal(r.kirimanEstimate, 500000);
  assert.equal(r.includeKiriman, false);
  assert.equal(r.proyeksiKas, r.proyeksiGaji - r.sisaKewajiban);
});

test('getMonthlyCashProjection({includePendingGaji:false}) — pendingGajiEstimate TETAP dikembalikan, tapi TIDAK ikut proyeksiGaji', () => {
  const D = makeD({
    workDays: [{ date: '2026-08-10', total: 400000 }],
    transactions: [{ type: 'income', category: 'Gaji', date: '2026-08-05', amount: 3000000 }],
  });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(7, 2026, { includePendingGaji: false });
  assert.equal(r.pendingGajiEstimate, 400000);
  assert.equal(r.includePendingGaji, false);
  assert.equal(r.proyeksiGaji, r.recordedGaji);
});

test('getMonthlyCashProjection() tanpa opts — includeKiriman & includePendingGaji default true (backward-compatible)', () => {
  const D = makeD({
    profile: { kiriman: 100000 },
    workDays: [{ date: '2026-08-10', total: 400000 }],
  });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(7, 2026);
  assert.equal(r.includeKiriman, true);
  assert.equal(r.includePendingGaji, true);
  assert.equal(r.proyeksiGaji, r.recordedGaji + r.pendingGajiEstimate);
});
