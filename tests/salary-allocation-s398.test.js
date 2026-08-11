'use strict';
// tests/salary-allocation-s398.test.js — cakupan SalaryAllocation
// (modules/shared/modules-calc.js), ditambahkan Sesi 398. Kalkulator SARAN
// murni (tidak nulis/simpan data apa pun) buat 5 pos alokasi dari rata-rata
// Pemasukan bulanan aktual: basis "bulanan" = rata-rata transaksi
// type='income' selama window FI.effectiveMonths() (SAMA window yg dipakai
// FI.annualExpense(), supaya income vs expense apple-to-apple).
//
// Rumus yang dites:
//   - danaDaruratTarget = bulanan × 6
//   - pensiunFiTarget   = bulanan × (100/swr)  [ikut asumsi SWR FI, default 4% => 25x tahunan = 300x bulanan]
//   - biayaHarian        = bulanan × 0.5
//   - investasi           = bulanan × 0.3
//   - selfReward          = bulanan × 0.2

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, fiAssumptions) {
  return loadSource(
    ['modules/shared/modules-calc.js'],
    {
      D,
      // FI.getAssumptions() dipakai SalaryAllocation.suggest() utk swr;
      // FI asli dari file sudah punya getAssumptions(), tapi kita override D
      // supaya assumsi swr terkontrol per-test tanpa depend ke DOM (fiSwr dst).
      ...fiAssumptions,
    },
    ['SalaryAllocation', 'FI'],
  );
}

test('avgMonthlyIncome() = 0 kalau tidak ada transaksi income sama sekali', () => {
  const now = new Date();
  const ctx = makeCtx({ transactions: [], finansialFreedom: {} });
  assert.equal(ctx.SalaryAllocation.avgMonthlyIncome(), 0);
});

test('avgMonthlyIncome() rata-rata benar dari transaksi income, expense diabaikan', () => {
  const now = new Date();
  // pakai tanggal 1 (bukan 15) supaya tidak pernah jatuh di masa depan
  // relatif ke "now" asli, apa pun tanggal hari ini saat test dijalankan.
  const iso = (monthsAgo) => {
    const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    return d.toISOString().slice(0, 10);
  };
  const D = {
    transactions: [
      { type: 'income', amount: 5000000, date: iso(0) },
      { type: 'income', amount: 5000000, date: iso(1) },
      { type: 'expense', amount: 9999999, date: iso(0) }, // harus diabaikan
    ],
    finansialFreedom: { avgMonths: 6 },
  };
  const ctx = makeCtx(D);
  // effectiveMonths default avgMonths=6 (dari D.finansialFreedom), tapi
  // dibatasi monthsOfDataAvailable() juga -- window persis sama dgn FI.
  const months = ctx.FI.effectiveMonths();
  const expected = 10000000 / months;
  assert.equal(ctx.SalaryAllocation.avgMonthlyIncome(), expected);
});

test('suggest() menghasilkan 5 pos sesuai rumus, ikut asumsi SWR FI', () => {
  const now = new Date();
  const iso = (monthsAgo) => {
    const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    return d.toISOString().slice(0, 10);
  };
  const D = {
    transactions: [
      { type: 'income', amount: 6000000, date: iso(0) },
    ],
    finansialFreedom: { avgMonths: 1, swr: 4 },
  };
  const ctx = makeCtx(D);
  const s = ctx.SalaryAllocation.suggest();
  const bulanan = ctx.SalaryAllocation.avgMonthlyIncome();

  assert.equal(s.bulanan, bulanan);
  assert.equal(s.danaDaruratTarget, bulanan * 6);
  assert.equal(s.fiMultiplier, 100 / ctx.FI.getAssumptions().swr);
  assert.equal(s.pensiunFiTarget, bulanan * s.fiMultiplier);
  assert.equal(s.biayaHarian, bulanan * 0.5);
  assert.equal(s.investasi, bulanan * 0.3);
  assert.equal(s.selfReward, bulanan * 0.2);
});

test('suggest() dgn SWR default 4% => fiMultiplier 25x (=300x kalau dibandingkan basis bulanan asli, krn bulanan disini SUDAH per-bulan)', () => {
  const D = { transactions: [], finansialFreedom: {} };
  const ctx = makeCtx(D);
  const s = ctx.SalaryAllocation.suggest();
  // getAssumptions() default swr = 4 kalau tidak diset -- cek lewat FI asli
  assert.equal(ctx.FI.getAssumptions().swr, 4);
  assert.equal(s.fiMultiplier, 25);
});
