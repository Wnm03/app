'use strict';
// tests/finance-engine-ssot-s269.test.js — cakupan Sesi 269 (Finance Engine
// Validation). Audit lintas Cashflow/Budget/Health Score/Goal/Retirement/
// Forecast/Risk Dashboard/Budget Recommendation: SEMUA planner/presenter
// sudah 100% delegasi ke engine (0 rumus baru), KECUALI 1 gap ditemukan:
//
//  `FinanceIntelligence.healthScore()` komponen "debt" pakai
//  `totalDebtValue()` SAJA sbg "total utang" — TIDAK menyertakan sisa
//  cicilan/paylater (`totalCicilanOutstanding()`), beda dari SSOT resmi
//  "total utang" project ini (`FI.totalDebt()`, dipakai
//  `Kekayaan.currentNetWorth()` sejak S268 & `DebtOptimizerAPI.dsr()`).
//  Akibatnya Skor Kesehatan Finansial (& Financial Risk Dashboard yang
//  reuse-nya) bisa meremehkan beban utang kalau user punya cicilan aktif.
//  Fix: reuse `FI.totalDebt()` (0 rumus baru).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, extraGlobals) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/finance/akun.js',
      'modules/asset/aset.js',
      'modules/finance/piutang-utang.js',
      'pajak-aset-ui-wrappers.js',
      'modules/shared/modules-calc.js',
      'modules/finance/tx-list-cashflow.js',
      'modules/finance/finance-intelligence.js',
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
      curMonth: new Date().getMonth(),
      curYear: new Date().getFullYear(),
      getBillStats: () => ({
        outstanding: (D.bills || []).filter((b) => b.kind === 'cicilan' && !b.lunas)
          .reduce((s, b) => s + (b.outstanding || 0), 0),
      }),
    }, extraGlobals || {}),
    ['OwnershipEngine', 'Kekayaan', 'FI', 'FinanceIntelligence', 'totalCicilanOutstanding', 'totalDebtValue'],
  );
}

function makeD() {
  return {
    accounts: [{ id: 'acc1', name: 'Kas', baseBalance: 1000000, includeInBalance: true }],
    assets: [],
    investments: [],
    investmentTx: [],
    transactions: [],
    debts: [{ id: 'd1', name: 'Utang Bank', nilai: 100000, cicilanBulanan: 0, lunas: false }],
    piutang: [],
    products: [],
    budgets: [],
    bills: [{ id: 'b1', kind: 'cicilan', name: 'Cicilan Motor', outstanding: 300000, lunas: false }],
    pajakZakat: {},
  };
}

test('S269 — FinanceIntelligence.healthScore() komponen "debt" SEKARANG ikut sisa cicilan (FI.totalDebt(), bug fix, dulu TIDAK)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const hs = ctx.FinanceIntelligence.healthScore();
  const debtPart = hs.parts.find((p) => p.key === 'debt');
  // saldo=1000000, debt=FI.totalDebt()=100000(utang)+300000(cicilan)=400000
  // debtRatio = 400000/1000000 = 0.4 -> score = (1-0.4)*25 = 15
  assert.ok(debtPart, 'komponen debt harus ada (FI/totalSaldoAkun sudah dimuat)');
  assert.equal(debtPart.score, 15);
});

test('S269 — komponen "debt" healthScore() KONSISTEN dgn FI.totalDebt() dipakai Kekayaan.currentNetWorth() (SSOT sama)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const debtViaHealthScore = 1000000 * (1 - ctx.FinanceIntelligence.healthScore().parts.find((p) => p.key === 'debt').score / 25);
  assert.equal(Math.round(debtViaHealthScore), ctx.FI.totalDebt());
});

test('S269 — healthScore() tanpa cicilan sama sekali tetap benar (regresi lama tetap jalan)', () => {
  const D = makeD();
  D.bills = [];
  const ctx = makeCtx(D);
  const debtPart = ctx.FinanceIntelligence.healthScore().parts.find((p) => p.key === 'debt');
  // debt = 100000 saja, ratio 0.1 -> score (1-0.1)*25 = 22.5
  assert.equal(debtPart.score, 22.5);
});

test('S269 — healthScore() komponen "debt" TIDAK muncul kalau FI belum dimuat (guard typeof, tidak throw)', () => {
  const D = makeD();
  const ctx = loadSource(
    ['modules/finance/akun.js', 'modules/finance/tx-list-cashflow.js', 'modules/finance/finance-intelligence.js'],
    { D, curMonth: new Date().getMonth(), curYear: new Date().getFullYear() },
    ['FinanceIntelligence'],
  );
  assert.doesNotThrow(() => ctx.FinanceIntelligence.healthScore());
  const debtPart = ctx.FinanceIntelligence.healthScore().parts.find((p) => p.key === 'debt');
  assert.equal(debtPart, undefined);
});
