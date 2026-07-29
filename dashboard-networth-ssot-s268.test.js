'use strict';
// tests/dashboard-networth-ssot-s268.test.js — cakupan Sesi 268 (Dashboard &
// Net Worth Validation). Audit menemukan 2 titik Net Worth yang TIDAK
// konsisten dgn SSOT resmi `Kekayaan.currentNetWorth()`
// (modules/shared/modules-calc.js):
//
//  (1) `Kekayaan.currentNetWorth()` sendiri menghitung ulang "total utang"
//      manual (utangJT + totalDebtValue() SAJA) — TIDAK menyertakan
//      `totalCicilanOutstanding()` (sisa cicilan/paylater di D.bills),
//      padahal `renderBersih()` (Dashboard, modules-render.js) & rumus
//      resmi "total utang" project ini (`FI.totalDebt()`) SUDAH
//      menyertakannya. Fix: reuse `FI.totalDebt()` (0 rumus baru).
//
//  (2) `FinanceDashboard._netWorthCard()` (Finance Dashboard, kartu label
//      "Kekayaan Bersih") menghitung net worth SENDIRI lewat
//      totalSaldoAkun()-totalDebtValue() SAJA (tanpa aset/inventori/
//      piutang, tanpa utangJT/cicilan) — beda dari
//      `Kekayaan.currentNetWorth()` yang dipakai panel Kekayaan Bersih
//      lain/AssetPortfolioAPI/wealth snapshot. Fix: reuse
//      `Kekayaan.currentNetWorth()` (0 rumus baru).
//
// 0 business logic baru — murni menyambungkan 2 titik yang tadinya
// menghitung ulang formula yang sudah ada di tempat lain, supaya
// Dashboard/Report/Home semua pakai 1 sumber Net Worth yang sama (SSOT).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(extra) {
  return Object.assign({
    accounts: [{ id: 'acc1', name: 'Kas', baseBalance: 1000000, includeInBalance: true }],
    assets: [],
    investments: [],
    investmentTx: [],
    transactions: [],
    debts: [{ id: 'd1', name: 'Utang Bank', nilai: 200000, cicilanBulanan: 0, lunas: false }],
    piutang: [],
    products: [],
    bills: [{ id: 'b1', kind: 'cicilan', name: 'Cicilan Motor', outstanding: 300000, lunas: false }],
    pajakZakat: {},
  }, extra || {});
}

function makeCtx(D, extraGlobals) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/finance/akun.js',
      'modules/asset/aset.js',
      'modules/finance/piutang-utang.js',
      'pajak-aset-ui-wrappers.js',
      'modules/shared/modules-calc.js',
    ],
    Object.assign({
      D,
      Etalase: { totalModalStok: () => 0 },
      uid: () => 'x',
      save: () => {},
      todayStr: () => '2026-01-01',
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      sameId: (a, b) => a === b,
      // getBillStats() bukan bagian modul yang di-load di sini (ada di
      // modules-render.js) — stub minimal APA ADANYA, pola sama
      // totalCicilanOutstanding() yg sudah guard `typeof getBillStats`.
      getBillStats: () => ({
        outstanding: (D.bills || []).filter((b) => b.kind === 'cicilan' && !b.lunas)
          .reduce((s, b) => s + (b.outstanding || 0), 0),
      }),
    }, extraGlobals || {}),
    ['OwnershipEngine', 'Kekayaan', 'FI', 'Piutang', 'Debt', 'totalCicilanOutstanding', 'totalDebtValue'],
  );
}

test('S268 — totalCicilanOutstanding() ikut dihitung ke FI.totalDebt() (rumus resmi total utang)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  // utangJT(0) + sisaCicilan(300000) + bukuUtang(200000)
  assert.equal(ctx.FI.totalDebt(), 500000);
});

test('S268 — Kekayaan.currentNetWorth() SEKARANG ikut mengurangi sisa cicilan (bug fix, dulu TIDAK)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  // saldoAkun(1000000) + aset(0) + inventori(0) + piutang(0) - FI.totalDebt()(500000)
  assert.equal(ctx.Kekayaan.currentNetWorth(), 1000000 - 500000);
});

test('S268 — Kekayaan.currentNetWorth() tetap benar kalau tidak ada cicilan sama sekali (regresi lama tetap jalan)', () => {
  const D = makeD({ bills: [] });
  const ctx = makeCtx(D);
  assert.equal(ctx.Kekayaan.currentNetWorth(), 1000000 - 200000);
});

test('S268 — Kekayaan.currentNetWorth() tetap exclude piutang/utang non-SELF (regresi Sesi 255 tetap berlaku)', () => {
  const D = makeD({
    debts: [
      { id: 'd1', name: 'Utang Sendiri', nilai: 200000, cicilanBulanan: 0, lunas: false },
      { id: 'd2', name: 'Utang Keluarga', nilai: 900000, cicilanBulanan: 0, lunas: false, ownership: 'FAMILY' },
    ],
  });
  const ctx = makeCtx(D);
  // utang non-SELF (900000) tetap dikecualikan lewat totalDebtValue()/Debt.totalValue()
  assert.equal(ctx.Kekayaan.currentNetWorth(), 1000000 - 500000);
});

test('S268 — FinanceDashboard._netWorthCard() memakai Kekayaan.currentNetWorth() (SSOT), bukan formula sendiri', () => {
  const fs = require('fs');
  const src = fs.readFileSync('modules/finance/finance-dashboard.js', 'utf8');
  assert.match(src, /_netWorthCard\s*\([^)]*\)\s*{[\s\S]*?Kekayaan\.currentNetWorth\(\)/,
    '_netWorthCard() harus reuse Kekayaan.currentNetWorth(), bukan hitung ulang saldo-utang sendiri');
});
