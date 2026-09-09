'use strict';
// tests/emergency-fund-suggest.test.js — Sesi A1 (LANGKAH-SESI-IMPLEMENTASI.md
// Kelompok A): cakupan suggestEmergencyFundTarget({months}) di
// modules/finance/tx-list-cashflow.js. Fungsi ini MURNI (0 tulis ke D),
// 100% reuse computeCashflowForecast() yang sudah ada -- jadi dites lewat
// loadSource() 1 sandbox nyata (pola sama persis
// tests/cashflow-projection-settings.test.js), bukan mock terpisah, supaya
// kalau computeCashflowForecast() berubah, test ini ikut kebaca.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD() {
  return {
    // 3 bulan histori (Mei-Jul 2026), expense total 1.200.000 -> expAvg=400.000/bulan
    // (pola rentang sama seperti test computeCashflowForecast lain: from=2 bulan
    // sebelum "now", months=3 default BudgetReko.effectiveMonths()).
    transactions: [
      { type: 'income', amount: 5000000, date: '2026-07-10', accountId: 'a1' },
      { type: 'expense', amount: 500000, date: '2026-05-15', accountId: 'a1' },
      { type: 'expense', amount: 400000, date: '2026-06-15', accountId: 'a1' },
      { type: 'expense', amount: 300000, date: '2026-07-15', accountId: 'a1' },
    ],
    bills: [],
    accounts: [{ id: 'a1' }],
    profile: {},
  };
}

function makeCtx({ D, now } = {}) {
  const d = D || baseD();
  const budgetReko = {
    monthsAvailable: () => 3,
    effectiveMonths: () => 3,
    rangeFrom: () => new Date(2026, 4, 1), // 1 Mei 2026
  };
  const extra = {
    D: d,
    BudgetReko: budgetReko,
    totalSaldoAkun: () => 10000000,
    recalcAccBalance: () => 10000000,
    save: () => {},
  };
  if (now) extra.Date = makeFixedDate(now);
  return loadSource(['modules/finance/tx-list-cashflow.js'], extra);
}

// makeFixedDate(iso) — pola sama persis tests/cash-projection-s667b-siklus.test.js:
// new Date() (tanpa argumen) selalu balik `iso`, new Date(x) tetap transparan.
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

test('suggestEmergencyFundTarget() -> {ok:false} kalau computeCashflowForecast belum dimuat', () => {
  // Load file asli lewat sandbox biasa, lalu "copot" computeCashflowForecast
  // dari sandbox SEBELUM dipanggil -- guard typeof di baris pertama
  // suggestEmergencyFundTarget() yang harus menangkapnya (pola ini dipilih
  // ketimbang extractFunction() krn signature fungsi ini pakai default
  // destructuring `{months=6}={}` yang bikin brace-counting extractFunction
  // salah hitung kurung kurawal parameter vs badan fungsi).
  const ctx = makeCtx();
  ctx.computeCashflowForecast = undefined;
  const r = ctx.suggestEmergencyFundTarget();
  assert.equal(r.ok, false);
  assert.match(r.reason, /belum dimuat/);
});

test('suggestEmergencyFundTarget() -> {ok:false} kalau data pengeluaran historis kosong/nol', () => {
  const D = { transactions: [], bills: [], accounts: [], profile: {} };
  const { suggestEmergencyFundTarget } = makeCtx({ D });
  const r = suggestEmergencyFundTarget();
  assert.equal(r.ok, false);
  assert.match(r.reason, /belum cukup/);
});

test('suggestEmergencyFundTarget() -> default multiplier 6x rata-rata pengeluaran bulanan (expAvg dari computeCashflowForecast)', () => {
  const { suggestEmergencyFundTarget, computeCashflowForecast } = makeCtx();
  const cf = computeCashflowForecast();
  const r = suggestEmergencyFundTarget();
  assert.equal(r.ok, true);
  assert.equal(r.monthlyExpenseAvg, cf.expAvg);
  assert.equal(r.multiplier, 6);
  assert.equal(r.targetAmount, Math.round(cf.expAvg * 6));
  assert.equal(r.basedOnMonths, cf.months);
});

test('suggestEmergencyFundTarget({months}) -> multiplier custom dipakai apa adanya', () => {
  const { suggestEmergencyFundTarget, computeCashflowForecast } = makeCtx();
  const cf = computeCashflowForecast();
  const r = suggestEmergencyFundTarget({ months: 3 });
  assert.equal(r.multiplier, 3);
  assert.equal(r.targetAmount, Math.round(cf.expAvg * 3));
});

test('suggestEmergencyFundTarget({months}) -> nilai tidak valid (<=0, string, dst) fallback ke default 6', () => {
  const { suggestEmergencyFundTarget, computeCashflowForecast } = makeCtx();
  const cf = computeCashflowForecast();
  for (const bad of [0, -3, 'abc', null, undefined]) {
    const r = suggestEmergencyFundTarget({ months: bad });
    assert.equal(r.multiplier, 6, `months=${JSON.stringify(bad)} harus fallback ke 6`);
    assert.equal(r.targetAmount, Math.round(cf.expAvg * 6));
  }
});

test('suggestEmergencyFundTarget() -> TIDAK mengubah/menulis apa pun ke D (fungsi murni)', () => {
  const D = baseD();
  const snapshot = JSON.parse(JSON.stringify(D));
  const { suggestEmergencyFundTarget } = makeCtx({ D });
  suggestEmergencyFundTarget();
  suggestEmergencyFundTarget({ months: 12 });
  assert.deepEqual(D.transactions, snapshot.transactions);
  assert.deepEqual(D.bills, snapshot.bills);
  assert.equal(D.targets, undefined, 'A1 tidak boleh menulis D.targets sama sekali (itu ranah A2/A3)');
});

test('suggestEmergencyFundTarget() -> TIDAK mengubah hasil/perilaku computeCashflowForecast()/predictExpense() yang sudah ada (additive murni)', () => {
  const { computeCashflowForecast, predictExpense, suggestEmergencyFundTarget } = makeCtx();
  const cfBefore = computeCashflowForecast();
  const peBefore = predictExpense();
  suggestEmergencyFundTarget();
  const cfAfter = computeCashflowForecast();
  const peAfter = predictExpense();
  assert.deepEqual(cfBefore, cfAfter);
  assert.deepEqual(peBefore, peAfter);
});
