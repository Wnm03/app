'use strict';
// tests/fuel-cost-analytics.test.js — cakupan modules/vehicle/
// fuel-cost-analytics.js (TASK-147, Fuel Cost Analytics Engine).
// FuelStorage (TASK-141) dimuat ASLI (bukan mock) supaya akses
// D.bbmLogs ikut teruji end-to-end lewat lapisan data yang sesungguhnya
// (pola sama persis tests/fuel-prediction-engine.test.js). fuelEfficiency()
// (vehicle-core.js) & FuelPredictionEngine (TASK-146) di-mock lewat
// extraGlobals — test ini fokus ke logic analytics-nya sendiri, bukan
// ikut nge-test ulang formula km/L/Rp-per-km/proyeksi di dependency-nya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, { fuelEfficiencyImpl, predictionEngine } = {}) {
  return loadSource(
    ['modules/vehicle/fuel-storage.js', 'modules/vehicle/fuel-cost-analytics.js'],
    {
      D,
      fuelEfficiency: fuelEfficiencyImpl,
      FuelPredictionEngine: predictionEngine,
    },
    ['FuelStorage', 'FuelCostAnalytics'],
  );
}

// current month/year (real clock, sama persis cara module menghitungnya)
// dipakai supaya test tidak hardcode bulan/tahun yang bisa basi.
const NOW = new Date();
const CUR_MONTH = NOW.getFullYear() + '-' + String(NOW.getMonth() + 1).padStart(2, '0');
const CUR_YEAR = String(NOW.getFullYear());
const OTHER_YEAR = String(NOW.getFullYear() - 3);

function bbm(vehicleId, date, liter, cost) {
  return { id: date + '-' + liter, vehicleId, date, liter, cost, harga: Math.round(cost / liter), fullTank: true };
}

const VEH = { id: 'v1' };

// --- monthlyCost() -----------------------------------------------------

test('monthlyCost() — SUM liter/cost transaksi bulan berjalan, averagePrice = totalCost/totalLiter', () => {
  const D = { vehicles: [VEH], bbmLogs: [
    bbm('v1', CUR_MONTH + '-05', 4, 40000),
    bbm('v1', CUR_MONTH + '-15', 6, 60000),
    bbm('v1', OTHER_YEAR + '-01-01', 100, 1000000), // di luar bulan berjalan, tidak dihitung
  ] };
  const ctx = makeCtx(D);
  const res = ctx.FuelCostAnalytics.monthlyCost('v1');
  assert.equal(res.ok, true);
  assert.equal(res.month, CUR_MONTH);
  assert.equal(res.totalLiter, 10);
  assert.equal(res.totalCost, 100000);
  assert.equal(res.averagePrice, 10000);
});

test('monthlyCost() — {ok:false} kalau belum ada transaksi bulan ini', () => {
  const D = { vehicles: [VEH], bbmLogs: [bbm('v1', OTHER_YEAR + '-01-01', 5, 50000)] };
  const ctx = makeCtx(D);
  const res = ctx.FuelCostAnalytics.monthlyCost('v1');
  assert.equal(res.ok, false);
  assert.ok(res.reason);
});

// --- yearlyCost() --------------------------------------------------------

test('yearlyCost() — SUM liter/cost transaksi tahun berjalan', () => {
  const D = { vehicles: [VEH], bbmLogs: [
    bbm('v1', CUR_YEAR + '-01-10', 5, 50000),
    bbm('v1', CUR_YEAR + '-06-10', 5, 55000),
    bbm('v1', OTHER_YEAR + '-01-01', 50, 500000),
  ] };
  const ctx = makeCtx(D);
  const res = ctx.FuelCostAnalytics.yearlyCost('v1');
  assert.equal(res.ok, true);
  assert.equal(res.year, CUR_YEAR);
  assert.equal(res.totalLiter, 10);
  assert.equal(res.totalCost, 105000);
  assert.equal(res.averagePrice, 10500);
});

test('yearlyCost() — {ok:false} kalau belum ada transaksi tahun ini', () => {
  const D = { vehicles: [VEH], bbmLogs: [bbm('v1', OTHER_YEAR + '-01-01', 5, 50000)] };
  const ctx = makeCtx(D);
  const res = ctx.FuelCostAnalytics.yearlyCost('v1');
  assert.equal(res.ok, false);
  assert.ok(res.reason);
});

// --- costPerKm() — 100% reuse fuelEfficiency() --------------------------

test('costPerKm() — reuse fuelEfficiency() apa adanya (0 recompute)', () => {
  const D = { vehicles: [VEH], bbmLogs: [] };
  const ctx = makeCtx(D, { fuelEfficiencyImpl: () => ({ ok: true, kmPerLiter: 40, rpPerKm: 250, avgHarga: 10000 }) });
  const res = ctx.FuelCostAnalytics.costPerKm('v1');
  assert.equal(res.ok, true);
  assert.equal(res.costPerKm, 250);
  assert.equal(res.kmPerLiter, 40);
  assert.equal(res.averageFuelPrice, 10000);
});

test('costPerKm() — {ok:false} kalau fuelEfficiency() gagal (data BBM kurang)', () => {
  const D = { vehicles: [VEH], bbmLogs: [] };
  const ctx = makeCtx(D, { fuelEfficiencyImpl: () => ({ ok: false, reason: 'Data BBM kurang' }) });
  const res = ctx.FuelCostAnalytics.costPerKm('v1');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Data BBM kurang');
});

// --- averageFuelPrice() --------------------------------------------------

test('averageFuelPrice() — rata-rata tertimbang dari SELURUH histori transaksi valid', () => {
  const D = { vehicles: [VEH], bbmLogs: [
    bbm('v1', '2026-01-01', 4, 36000),
    bbm('v1', '2026-02-01', 6, 66000),
  ] };
  const ctx = makeCtx(D);
  const res = ctx.FuelCostAnalytics.averageFuelPrice('v1');
  assert.equal(res.ok, true);
  assert.equal(res.totalLiter, 10);
  assert.equal(res.transactionCount, 2);
  assert.equal(res.averagePrice, 10200); // (36000+66000)/10
});

test('averageFuelPrice() — {ok:false} kalau belum ada transaksi', () => {
  const D = { vehicles: [VEH], bbmLogs: [] };
  const ctx = makeCtx(D);
  const res = ctx.FuelCostAnalytics.averageFuelPrice('v1');
  assert.equal(res.ok, false);
  assert.ok(res.reason);
});

// --- projectedMonthlyCost()/projectedYearlyCost() — 100% reuse FuelPredictionEngine ---

test('projectedMonthlyCost() — reuse FuelPredictionEngine.predictMonthlyFuelUsage(), + confidenceScore dari fuelState', () => {
  const D = { vehicles: [{ id: 'v1', fuelState: { confidenceScore: 75 } }] };
  const ctx = makeCtx(D, {
    predictionEngine: { predictMonthlyFuelUsage: () => ({ ok: true, estimatedLiter: 7.5, estimatedCost: 75000 }) },
  });
  const res = ctx.FuelCostAnalytics.projectedMonthlyCost('v1');
  assert.equal(res.ok, true);
  assert.equal(res.estimatedLiter, 7.5);
  assert.equal(res.estimatedCost, 75000);
  assert.equal(res.confidenceScore, 75);
});

test('projectedMonthlyCost() — confidenceScore null kalau fuelState belum pernah diisi', () => {
  const D = { vehicles: [{ id: 'v1' }] };
  const ctx = makeCtx(D, {
    predictionEngine: { predictMonthlyFuelUsage: () => ({ ok: true, estimatedLiter: 7.5, estimatedCost: 75000 }) },
  });
  const res = ctx.FuelCostAnalytics.projectedMonthlyCost('v1');
  assert.equal(res.ok, true);
  assert.equal(res.confidenceScore, null);
});

test('projectedMonthlyCost() — {ok:false} diteruskan apa adanya dari FuelPredictionEngine', () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, {
    predictionEngine: { predictMonthlyFuelUsage: () => ({ ok: false, reason: 'Pola berkendara harian belum cukup' }) },
  });
  const res = ctx.FuelCostAnalytics.projectedMonthlyCost('v1');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Pola berkendara harian belum cukup');
});

test('projectedYearlyCost() — reuse FuelPredictionEngine.predictYearlyFuelUsage(), + confidenceScore', () => {
  const D = { vehicles: [{ id: 'v1', fuelState: { confidenceScore: 60 } }] };
  const ctx = makeCtx(D, {
    predictionEngine: { predictYearlyFuelUsage: () => ({ ok: true, estimatedLiter: 90, estimatedCost: 900000 }) },
  });
  const res = ctx.FuelCostAnalytics.projectedYearlyCost('v1');
  assert.equal(res.ok, true);
  assert.equal(res.estimatedLiter, 90);
  assert.equal(res.estimatedCost, 900000);
  assert.equal(res.confidenceScore, 60);
});

test('projectedYearlyCost() — {ok:false} diteruskan apa adanya dari FuelPredictionEngine', () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, {
    predictionEngine: { predictYearlyFuelUsage: () => ({ ok: false, reason: 'Data BBM belum cukup' }) },
  });
  const res = ctx.FuelCostAnalytics.projectedYearlyCost('v1');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Data BBM belum cukup');
});

// --- refillFrequency() ---------------------------------------------------

test('refillFrequency() — jumlah transaksi & rata-rata interval hari antar transaksi', () => {
  const D = { vehicles: [VEH], bbmLogs: [
    bbm('v1', '2026-01-01', 5, 50000),
    bbm('v1', '2026-01-11', 5, 50000),
    bbm('v1', '2026-01-21', 5, 50000),
  ] };
  const ctx = makeCtx(D);
  const res = ctx.FuelCostAnalytics.refillFrequency('v1');
  assert.equal(res.ok, true);
  assert.equal(res.refillCount, 3);
  assert.equal(res.averageIntervalDays, 10); // (10+10)/2 hari
});

test('refillFrequency() — {ok:false} kalau transaksi kurang dari 2', () => {
  const D = { vehicles: [VEH], bbmLogs: [bbm('v1', '2026-01-01', 5, 50000)] };
  const ctx = makeCtx(D);
  const res = ctx.FuelCostAnalytics.refillFrequency('v1');
  assert.equal(res.ok, false);
  assert.ok(res.reason);
});

// --- empty history (guard bersama, semua method) -------------------------

test('empty history — semua method balikin {ok:false} kalau D.bbmLogs kosong', () => {
  const D = { vehicles: [VEH], bbmLogs: [] };
  const ctx = makeCtx(D, { fuelEfficiencyImpl: () => ({ ok: false, reason: 'Data BBM kurang' }) });
  assert.equal(ctx.FuelCostAnalytics.monthlyCost('v1').ok, false);
  assert.equal(ctx.FuelCostAnalytics.yearlyCost('v1').ok, false);
  assert.equal(ctx.FuelCostAnalytics.averageFuelPrice('v1').ok, false);
  assert.equal(ctx.FuelCostAnalytics.costPerKm('v1').ok, false);
  assert.equal(ctx.FuelCostAnalytics.refillFrequency('v1').ok, false);
});

// --- invalid vehicle (guard bersama, semua method) -----------------------

test('invalid vehicle — semua method balikin {ok:false, reason:"Kendaraan tidak ditemukan"} kalau vehicleId tidak ada', () => {
  const D = { vehicles: [VEH], bbmLogs: [bbm('v1', CUR_MONTH + '-05', 5, 50000)] };
  const ctx = makeCtx(D, { fuelEfficiencyImpl: () => ({ ok: true, kmPerLiter: 40, rpPerKm: 250, avgHarga: 10000 }) });
  for (const method of ['monthlyCost', 'yearlyCost', 'averageFuelPrice', 'costPerKm', 'refillFrequency']) {
    const res = ctx.FuelCostAnalytics[method]('v9-tidak-ada');
    assert.equal(res.ok, false);
    assert.equal(res.reason, 'Kendaraan tidak ditemukan');
  }
});

// --- missing profile (FuelPredictionEngine belum dimuat / dependency hilang) ---

test('missing profile — projectedMonthlyCost()/projectedYearlyCost() {ok:false} kalau FuelPredictionEngine belum dimuat', () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D); // FuelPredictionEngine sengaja tidak di-inject
  const monthly = ctx.FuelCostAnalytics.projectedMonthlyCost('v1');
  const yearly = ctx.FuelCostAnalytics.projectedYearlyCost('v1');
  assert.equal(monthly.ok, false);
  assert.ok(monthly.reason);
  assert.equal(yearly.ok, false);
  assert.ok(yearly.reason);
});

test('missing profile — costPerKm() {ok:false} kalau fuelEfficiency belum dimuat', () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D); // fuelEfficiency sengaja tidak di-inject
  const res = ctx.FuelCostAnalytics.costPerKm('v1');
  assert.equal(res.ok, false);
  assert.ok(res.reason);
});
