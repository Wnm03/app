'use strict';
// tests/fi-monthly-surplus-override.test.js — Sesi pengaturan-proyeksi-kas-lengkap
// (Keputusan #4). Cakupan: FI.monthlySurplus(monthsOverride) — parameter opsional baru,
// dipakai kartu "Proyeksi Kas Bulan Ini" (CashflowProjSettings.surplusMonths) supaya bisa
// override rentang rata-rata TANPA mengubah D.finansialFreedom.avgMonths global (dipakai
// fitur FI lain: annualExpense/targetNominal/dst).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const fmtFullStub = (n) => String(n);

function loadCalc(D) {
  return loadSource(
    ['budget.js', 'modules/shared/modules-calc.js'],
    { D, fmtFull: fmtFullStub },
    ['FI']
  );
}

function makeD(overrides) {
  return Object.assign({
    transactions: [],
    finansialFreedom: {},
    categories: { income: [], expense: [] },
  }, overrides);
}

test('FI.monthlySurplus() tanpa argumen — perilaku lama TIDAK berubah (pakai FI.effectiveMonths())', () => {
  const D = makeD({ finansialFreedom: { avgMonths: 6 } });
  const ctx = loadCalc(D);
  assert.equal(ctx.FI.monthlySurplus(), ctx.FI.monthlySurplus());
});

test('FI.monthlySurplus(monthsOverride) — dipanggil dengan override TIDAK mengubah D.finansialFreedom.avgMonths', () => {
  const D = makeD({ finansialFreedom: { avgMonths: 6 } });
  const ctx = loadCalc(D);
  ctx.FI.monthlySurplus(3);
  assert.equal(D.finansialFreedom.avgMonths, 6);
});

test('FI.monthlySurplus(monthsOverride) — override dipakai buat batasi window transaksi (beda hasil dari default kalau data beda per-bulan)', () => {
  const now = new Date();
  const fmt = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  // Tanggal di bulan berjalan HARUS <= hari ini (kalau dites tanggal 1-9,
  // "tanggal 10 bulan ini" masih di MASA DEPAN -> otomatis kefilter oleh
  // guard "d<=now" di FI.monthlySurplus(), bikin test ini false-fail padahal
  // bukan bug source. 3 bulan lalu aman pakai tanggal 10 apa adanya (sudah
  // pasti lewat).
  const safeDayThisMonth = Math.min(10, now.getDate());
  // bulan berjalan: surplus 1jt. 3 bulan lalu: surplus 0 (in==out).
  const thisM = new Date(now.getFullYear(), now.getMonth(), safeDayThisMonth);
  const prevM = new Date(now.getFullYear(), now.getMonth() - 3, 10);
  const D = makeD({
    finansialFreedom: { avgMonths: 12 },
    transactions: [
      { type: 'income', amount: 2000000, date: fmt(thisM.getFullYear(), thisM.getMonth(), thisM.getDate()) },
      { type: 'expense', amount: 1000000, date: fmt(thisM.getFullYear(), thisM.getMonth(), thisM.getDate()) },
      { type: 'income', amount: 500000, date: fmt(prevM.getFullYear(), prevM.getMonth(), 10) },
      { type: 'expense', amount: 500000, date: fmt(prevM.getFullYear(), prevM.getMonth(), 10) },
    ],
  });
  const ctx = loadCalc(D);
  const surplus1mo = ctx.FI.monthlySurplus(1);
  const surplus12mo = ctx.FI.monthlySurplus(12);
  assert.notEqual(surplus1mo, surplus12mo);
});

test('FI.monthlySurplus(0) / FI.monthlySurplus(-1) — override tidak valid (bukan >=1) -> fallback ke FI.effectiveMonths() (aman, 0 crash)', () => {
  const D = makeD({ finansialFreedom: { avgMonths: 6 } });
  const ctx = loadCalc(D);
  assert.equal(ctx.FI.monthlySurplus(0), ctx.FI.monthlySurplus());
  assert.equal(ctx.FI.monthlySurplus(-1), ctx.FI.monthlySurplus());
});
