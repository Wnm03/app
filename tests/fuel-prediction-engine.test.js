'use strict';
// tests/fuel-prediction-engine.test.js — cakupan modules/vehicle/
// fuel-prediction-engine.js (TASK-146, Fuel Consumption Prediction
// Engine). FuelTankProfile (TASK-142) + FuelGaugeEngine (TASK-143)
// dimuat ASLI (bukan mock) supaya konversi liter->km ikut teruji
// end-to-end lewat engine yang sesungguhnya (pola sama persis
// tests/fuel-gauge-engine.test.js). fuelEfficiency() (dependency
// vehicle-core.js) & dateToISO() (dependency helper-teks.js) di-mock
// lewat extraGlobals — test ini fokus ke logic prediction engine
// sendiri, bukan ikut nge-test ulang formula km/L atau formatting
// tanggal di dependency-nya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// dateToISO — copy PERSIS formula dari modules/shared/helper-teks.js
// (fungsi murni, aman dipakai sbg mock deterministik di test ini; kalau
// implementasi aslinya berubah, tests/helper-teks belum ada test khusus
// jadi tidak ada risiko drift ganda).
function dateToISO(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function addDaysISO(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return dateToISO(d);
}

const LINEAR_VEH = (fuelState) => ({
  id: 'v1',
  fuelTankProfile: { tankCapacityLiter: 10, fuelBarCount: 8, reserveLiter: 1, tankShape: 'linear' },
  fuelState,
});

const NO_PROFILE_VEH = (fuelState) => ({ id: 'v2', fuelState });

function makeCtx(D, fuelEfficiencyImpl) {
  return loadSource(
    ['modules/vehicle/fuel-tank-profile.js', 'modules/vehicle/fuel-gauge-engine.js', 'modules/vehicle/fuel-prediction-engine.js'],
    { D, fuelEfficiency: fuelEfficiencyImpl, dateToISO },
    ['FuelTankProfile', 'FuelGaugeEngine', 'FuelPredictionEngine'],
  );
}

const EFF_OK = () => ({
  ok: true,
  kmPerLiter: 40,
  rpPerKm: 250,
  avgHarga: 10000,
  kmPerDay: 10,
  estMonthlyKm: 300,
  estMonthlyLiter: 7.5,
  estMonthlyCost: 75000,
});

// --- predictRemainingDistance() ---------------------------------------------

test('predictRemainingDistance() — dihitung dari currentFuelLiter x kmPerLiter (100% reuse FuelGaugeEngine)', () => {
  const D = { vehicles: [LINEAR_VEH({ currentFuelLiter: 5, currentFuelBar: 4, confidenceScore: 80 })] };
  const ctx = makeCtx(D, EFF_OK);
  const res = ctx.FuelPredictionEngine.predictRemainingDistance('v1');
  assert.equal(res.ok, true);
  assert.equal(res.remainingKm, 200); // 5L * 40 km/L
  assert.equal(res.currentFuelLiter, 5);
  assert.equal(res.kmPerLiter, 40);
  assert.equal(res.confidenceScore, 80);
});

test('predictRemainingDistance() — confidenceScore null kalau belum pernah diisi', () => {
  const D = { vehicles: [LINEAR_VEH({ currentFuelLiter: 5 })] };
  const ctx = makeCtx(D, EFF_OK);
  const res = ctx.FuelPredictionEngine.predictRemainingDistance('v1');
  assert.equal(res.ok, true);
  assert.equal(res.confidenceScore, null);
});

// --- predictNextRefuel() -----------------------------------------------------

test('predictNextRefuel() — km/hari dari kmPerDay, tanggal dari literAboveReserve', () => {
  const D = { vehicles: [LINEAR_VEH({ currentFuelLiter: 5, confidenceScore: 80 })] };
  const ctx = makeCtx(D, EFF_OK);
  const res = ctx.FuelPredictionEngine.predictNextRefuel('v1');
  assert.equal(res.ok, true);
  // literAboveReserve = 5 - 1(reserve) = 4L -> 4*40km/L = 160km
  assert.equal(res.estimatedRemainingKm, 160);
  // 160km / 10km-per-day = 16 hari (ceil)
  assert.equal(res.estimatedRemainingDays, 16);
  assert.equal(res.estimatedDate, addDaysISO(16));
});

test('predictNextRefuel() — {ok:false} kalau kmPerDay belum cukup data', () => {
  const D = { vehicles: [LINEAR_VEH({ currentFuelLiter: 5 })] };
  const ctx = makeCtx(D, () => ({ ...EFF_OK(), kmPerDay: null }));
  const res = ctx.FuelPredictionEngine.predictNextRefuel('v1');
  assert.equal(res.ok, false);
  assert.ok(res.reason);
});

// --- predictMonthlyFuelUsage() ----------------------------------------------

test('predictMonthlyFuelUsage() — 100% reuse estMonthlyLiter/estMonthlyCost fuelEfficiency() (0 recompute)', () => {
  const D = { vehicles: [LINEAR_VEH({ currentFuelLiter: 5 })] };
  const ctx = makeCtx(D, EFF_OK);
  const res = ctx.FuelPredictionEngine.predictMonthlyFuelUsage('v1');
  assert.equal(res.ok, true);
  assert.equal(res.estimatedLiter, 7.5);
  assert.equal(res.estimatedCost, 75000);
});

test('predictMonthlyFuelUsage() — {ok:false} kalau data BBM kurang', () => {
  const D = { vehicles: [LINEAR_VEH({ currentFuelLiter: 5 })] };
  const ctx = makeCtx(D, () => ({ ok: false, reason: 'Data BBM kurang (butuh min. 2 log "Isi Full Tank" dgn km naik)' }));
  const res = ctx.FuelPredictionEngine.predictMonthlyFuelUsage('v1');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Data BBM kurang (butuh min. 2 log "Isi Full Tank" dgn km naik)');
});

test('predictMonthlyFuelUsage() — {ok:false} kalau estMonthlyLiter/estMonthlyCost masih null (pola harian belum cukup)', () => {
  const D = { vehicles: [LINEAR_VEH({ currentFuelLiter: 5 })] };
  const ctx = makeCtx(D, () => ({ ...EFF_OK(), kmPerDay: null, estMonthlyKm: null, estMonthlyLiter: null, estMonthlyCost: null }));
  const res = ctx.FuelPredictionEngine.predictMonthlyFuelUsage('v1');
  assert.equal(res.ok, false);
});

// --- predictYearlyFuelUsage() ------------------------------------------------

test('predictYearlyFuelUsage() — diturunkan dari predictMonthlyFuelUsage() x12 (konsisten, 0 formula independen)', () => {
  const D = { vehicles: [LINEAR_VEH({ currentFuelLiter: 5 })] };
  const ctx = makeCtx(D, EFF_OK);
  const monthly = ctx.FuelPredictionEngine.predictMonthlyFuelUsage('v1');
  const res = ctx.FuelPredictionEngine.predictYearlyFuelUsage('v1');
  assert.equal(res.ok, true);
  assert.equal(res.estimatedLiter, monthly.estimatedLiter * 12);
  assert.equal(res.estimatedCost, monthly.estimatedCost * 12);
  assert.equal(res.estimatedLiter, 90);
  assert.equal(res.estimatedCost, 900000);
});

test('predictYearlyFuelUsage() — reason diteruskan apa adanya kalau monthly gagal', () => {
  const D = { vehicles: [LINEAR_VEH({ currentFuelLiter: 5 })] };
  const ctx = makeCtx(D, () => ({ ok: false, reason: 'Data BBM kurang' }));
  const res = ctx.FuelPredictionEngine.predictYearlyFuelUsage('v1');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Data BBM kurang');
});

// --- Invalid vehicle ----------------------------------------------------------

test('invalid vehicle — semua 4 method balikin {ok:false, reason} tanpa throw', () => {
  const D = { vehicles: [LINEAR_VEH({ currentFuelLiter: 5 })] };
  const ctx = makeCtx(D, EFF_OK);
  for (const fn of ['predictRemainingDistance', 'predictNextRefuel', 'predictMonthlyFuelUsage', 'predictYearlyFuelUsage']) {
    const res = ctx.FuelPredictionEngine[fn]('vehicle-tidak-ada');
    assert.equal(res.ok, false);
    assert.equal(res.reason, 'Kendaraan tidak ditemukan');
  }
});

test('invalid vehicle — D.vehicles kosong/D belum ada tidak throw', () => {
  const ctx = makeCtx({ vehicles: [] }, EFF_OK);
  assert.equal(ctx.FuelPredictionEngine.predictRemainingDistance('v1').ok, false);
  const ctx2 = makeCtx(undefined, EFF_OK);
  assert.equal(ctx2.FuelPredictionEngine.predictRemainingDistance('v1').ok, false);
});

// --- Missing fuel profile (FuelTankProfile belum diatur) ---------------------

test('missing fuel profile — predictRemainingDistance() {ok:false} kalau tankCapacityLiter belum diatur', () => {
  const D = { vehicles: [NO_PROFILE_VEH({ currentFuelLiter: 5 })] };
  const ctx = makeCtx(D, EFF_OK);
  const res = ctx.FuelPredictionEngine.predictRemainingDistance('v2');
  assert.equal(res.ok, false);
  assert.match(res.reason, /[Kk]apasitas tangki/);
});

test('missing fuel profile — predictNextRefuel() {ok:false} kalau tankCapacityLiter belum diatur', () => {
  const D = { vehicles: [NO_PROFILE_VEH({ currentFuelLiter: 5 })] };
  const ctx = makeCtx(D, EFF_OK);
  const res = ctx.FuelPredictionEngine.predictNextRefuel('v2');
  assert.equal(res.ok, false);
});

test('missing fuel state — {ok:false} kalau belum pernah dikoreksi lewat FuelBarCorrection (fuelState kosong)', () => {
  const D = { vehicles: [{ id: 'v3', fuelTankProfile: { tankCapacityLiter: 10 } }] };
  const ctx = makeCtx(D, EFF_OK);
  assert.equal(ctx.FuelPredictionEngine.predictRemainingDistance('v3').ok, false);
  assert.equal(ctx.FuelPredictionEngine.predictNextRefuel('v3').ok, false);
});

// --- Zero fuel ----------------------------------------------------------------

test('zero fuel — predictRemainingDistance() balikin remainingKm 0 (ok:true, bukan error)', () => {
  const D = { vehicles: [LINEAR_VEH({ currentFuelLiter: 0, confidenceScore: 80 })] };
  const ctx = makeCtx(D, EFF_OK);
  const res = ctx.FuelPredictionEngine.predictRemainingDistance('v1');
  assert.equal(res.ok, true);
  assert.equal(res.remainingKm, 0);
  assert.equal(res.currentFuelLiter, 0);
});

test('zero fuel — predictNextRefuel() balikin estimatedRemainingDays 0 (sudah di bawah/di ambang reserve)', () => {
  const D = { vehicles: [LINEAR_VEH({ currentFuelLiter: 0 })] };
  const ctx = makeCtx(D, EFF_OK);
  const res = ctx.FuelPredictionEngine.predictNextRefuel('v1');
  assert.equal(res.ok, true);
  assert.equal(res.estimatedRemainingKm, 0);
  assert.equal(res.estimatedRemainingDays, 0);
  assert.equal(res.estimatedDate, addDaysISO(0));
});

// --- Read-only guarantee ------------------------------------------------------

test('read-only — tidak ada method yang menulis/mengubah D.vehicles/fuelState/fuelTankProfile', () => {
  const veh = LINEAR_VEH({ currentFuelLiter: 5, currentFuelBar: 4, confidenceScore: 80 });
  const D = { vehicles: [veh] };
  const before = JSON.stringify(D);
  const ctx = makeCtx(D, EFF_OK);
  ctx.FuelPredictionEngine.predictRemainingDistance('v1');
  ctx.FuelPredictionEngine.predictNextRefuel('v1');
  ctx.FuelPredictionEngine.predictMonthlyFuelUsage('v1');
  ctx.FuelPredictionEngine.predictYearlyFuelUsage('v1');
  assert.equal(JSON.stringify(D), before);
});
