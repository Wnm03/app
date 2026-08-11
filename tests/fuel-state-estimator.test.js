'use strict';
// tests/fuel-state-estimator.test.js — cakupan modules/vehicle/fuel-state-
// estimator.js (Sesi 1 asli rencana "Fuel Estimation Auto-Update",
// FUEL-AUTOSYNC-04). FuelTankProfile (TASK-142) & FuelStorage (TASK-141)
// dimuat ASLI (bukan mock) supaya konversi & filter log BBM ikut teruji
// end-to-end lewat modul yang sesungguhnya (pola sama persis
// tests/fuel-prediction-engine.test.js). fuelEfficiency() & getVehicleKm()
// (dependency vehicle-core.js) di-mock lewat extraGlobals -- test ini
// fokus ke logic estimator sendiri, bukan ikut nge-test ulang formula
// km/L/pencarian km terjauh di dependency-nya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, fuelEfficiencyImpl, getVehicleKmImpl) {
  return loadSource(
    ['modules/vehicle/fuel-storage.js', 'modules/vehicle/fuel-tank-profile.js', 'modules/vehicle/fuel-state-estimator.js'],
    { D, fuelEfficiency: fuelEfficiencyImpl, getVehicleKm: getVehicleKmImpl },
    ['FuelStorage', 'FuelTankProfile', 'FuelStateEstimator'],
  );
}

const PROFILE = { tankCapacityLiter: 10, fuelBarCount: 8, reserveLiter: 1, tankShape: 'linear' };
const EFF_OK = () => ({ ok: true, kmPerLiter: 40, rpPerKm: 250, avgHarga: 10000, kmPerDay: 10, estMonthlyKm: 300, estMonthlyLiter: 7.5, estMonthlyCost: 75000 });

test('estimateCurrentLiter() -- kendaraan tidak ditemukan -> ok:false', () => {
  const D = { vehicles: [] };
  const ctx = makeCtx(D, EFF_OK, () => 100);
  const res = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Kendaraan tidak ditemukan');
});

test('estimateCurrentLiter() -- belum ada fuelState sama sekali -> ok:false, pesan sama dgn engine lain', () => {
  const D = { vehicles: [{ id: 'v1', fuelTankProfile: PROFILE }] };
  const ctx = makeCtx(D, EFF_OK, () => 100);
  const res = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Data BBM saat ini belum ada (lakukan Koreksi BBM dulu)');
});

test('estimateCurrentLiter() -- fuelState tanpa referenceKm (data lama) -> estimationLimited:true, liter = baseLiter apa adanya', () => {
  const D = {
    vehicles: [{ id: 'v1', fuelTankProfile: PROFILE, fuelState: { currentFuelLiter: 5, estimatedSource: 'manual-bar-correction', confidenceScore: 100 } }],
    bbmLogs: [],
  };
  const ctx = makeCtx(D, EFF_OK, () => 200);
  const res = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(res.ok, true);
  assert.equal(res.liter, 5);
  assert.equal(res.baseLiter, 5);
  assert.equal(res.referenceKm, null);
  assert.equal(res.deltaKm, null);
  assert.equal(res.estimationLimited, true);
  assert.equal(res.partialFillsCounted, 0);
  assert.equal(res.estimatedSource, 'manual-bar-correction');
  assert.equal(res.confidenceScore, 100);
});

test('estimateCurrentLiter() -- referenceKm ada, TANPA log parsial baru -> konsumsi dihitung dari deltaKm/kmPerLiter', () => {
  const D = {
    vehicles: [{ id: 'v1', fuelTankProfile: PROFILE, fuelState: { currentFuelLiter: 8, referenceKm: 1000, estimatedSource: 'auto-bbm-log-full', confidenceScore: 90 } }],
    bbmLogs: [],
  };
  // 40 km/L, tempuh 400 km -> konsumsi 10 L, tapi baseLiter cuma 8 -> clamp ke 0.
  const ctx = makeCtx(D, EFF_OK, () => 1400);
  const res = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(res.ok, true);
  assert.equal(res.deltaKm, 400);
  assert.equal(res.kmPerLiter, 40);
  assert.equal(res.consumedLiter, 10);
  assert.equal(res.liter, 0);
  assert.equal(res.clamped, true);
  assert.equal(res.estimationLimited, false);
});

test('estimateCurrentLiter() -- akumulasi log BBM parsial sesudah titik acuan ikut ditambahkan', () => {
  const D = {
    vehicles: [{ id: 'v1', fuelTankProfile: PROFILE, fuelState: { currentFuelLiter: 3, referenceKm: 1000, estimatedSource: 'manual-bar-correction', confidenceScore: 100 } }],
    bbmLogs: [
      { vehicleId: 'v1', km: 1050, liter: 2, fullTank: false, date: '2026-08-01' },
      { vehicleId: 'v1', km: 1100, liter: 1.5, fullTank: false, date: '2026-08-02' },
      // km <= referenceKm -- log LAMA sebelum titik acuan, TIDAK ikut kehitung.
      { vehicleId: 'v1', km: 900, liter: 5, fullTank: false, date: '2026-07-01' },
      // kendaraan lain -- TIDAK ikut kehitung.
      { vehicleId: 'v2', km: 1080, liter: 9, fullTank: false, date: '2026-08-01' },
    ],
  };
  // kmPerLiter sengaja dibuat sangat besar (0 konsumsi berarti dlm rentang ini) supaya assert fokus ke akumulasi partial fill saja.
  const ctx = makeCtx(D, () => ({ ok: true, kmPerLiter: 100000 }), () => 1100);
  const res = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(res.ok, true);
  assert.equal(res.partialFillsCounted, 2);
  assert.equal(res.addedLiter, 3.5);
  assert.equal(res.liter, 6.5);
  assert.equal(res.estimationLimited, false);
});

// --- SESI 422: guard akumulasi error fill-parsial berturut-turut --------

test('estimateCurrentLiter() -- partialFillsCounted < PARTIAL_FILL_DRIFT_THRESHOLD -> partialFillDriftRisk:false', () => {
  const D = {
    vehicles: [{ id: 'v1', fuelTankProfile: PROFILE, fuelState: { currentFuelLiter: 3, referenceKm: 1000, estimatedSource: 'manual-bar-correction', confidenceScore: 100 } }],
    bbmLogs: [
      { vehicleId: 'v1', km: 1050, liter: 2, fullTank: false, date: '2026-08-01' },
      { vehicleId: 'v1', km: 1100, liter: 1.5, fullTank: false, date: '2026-08-02' },
    ],
  };
  const ctx = makeCtx(D, () => ({ ok: true, kmPerLiter: 100000 }), () => 1100);
  const res = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(res.partialFillsCounted, 2);
  assert.equal(res.partialFillDriftRisk, false);
});

test('estimateCurrentLiter() -- partialFillsCounted >= PARTIAL_FILL_DRIFT_THRESHOLD (3) -> partialFillDriftRisk:true', () => {
  const D = {
    vehicles: [{ id: 'v1', fuelTankProfile: PROFILE, fuelState: { currentFuelLiter: 3, referenceKm: 1000, estimatedSource: 'manual-bar-correction', confidenceScore: 100 } }],
    bbmLogs: [
      { vehicleId: 'v1', km: 1050, liter: 2, fullTank: false, date: '2026-08-01' },
      { vehicleId: 'v1', km: 1100, liter: 1.5, fullTank: false, date: '2026-08-02' },
      { vehicleId: 'v1', km: 1150, liter: 1, fullTank: false, date: '2026-08-03' },
    ],
  };
  const ctx = makeCtx(D, () => ({ ok: true, kmPerLiter: 100000 }), () => 1150);
  const res = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(res.partialFillsCounted, 3);
  assert.equal(res.partialFillDriftRisk, true);
});

test('estimateCurrentLiter() -- referenceKm null (data lama) -> partialFillsCounted 0, partialFillDriftRisk:false', () => {
  const D = {
    vehicles: [{ id: 'v1', fuelTankProfile: PROFILE, fuelState: { currentFuelLiter: 5, estimatedSource: 'manual-bar-correction', confidenceScore: 100 } }],
    bbmLogs: [],
  };
  const ctx = makeCtx(D, EFF_OK, () => 200);
  const res = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(res.partialFillsCounted, 0);
  assert.equal(res.partialFillDriftRisk, false);
});

test('estimateCurrentLiter() -- delta km negatif (odometer reset/salah input) di-clamp ke 0, kmClamped:true', () => {
  const D = {
    vehicles: [{ id: 'v1', fuelTankProfile: PROFILE, fuelState: { currentFuelLiter: 5, referenceKm: 5000, estimatedSource: 'manual-bar-correction', confidenceScore: 100 } }],
    bbmLogs: [],
  };
  const ctx = makeCtx(D, EFF_OK, () => 100);
  const res = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(res.ok, true);
  assert.equal(res.deltaKm, 0);
  assert.equal(res.kmClamped, true);
  assert.equal(res.consumedLiter, 0);
  assert.equal(res.liter, 5);
});

test('estimateCurrentLiter() -- fuelEfficiency() data belum cukup (ok:false) -> estimationLimited:true, tetap sukses tanpa pengurangan konsumsi', () => {
  const D = {
    vehicles: [{ id: 'v1', fuelTankProfile: PROFILE, fuelState: { currentFuelLiter: 4, referenceKm: 1000, estimatedSource: 'auto-bbm-log-full', confidenceScore: 90 } }],
    bbmLogs: [],
  };
  const ctx = makeCtx(D, () => ({ ok: false, reason: 'Data BBM kurang' }), () => 1200);
  const res = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(res.ok, true);
  assert.equal(res.kmPerLiter, null);
  assert.equal(res.consumedLiter, 0);
  assert.equal(res.liter, 4);
  assert.equal(res.estimationLimited, true);
});

test('estimateCurrentLiter() -- hasil > kapasitas tangki di-clamp, clamped:true', () => {
  const D = {
    vehicles: [{ id: 'v1', fuelTankProfile: PROFILE, fuelState: { currentFuelLiter: 9, referenceKm: 1000, estimatedSource: 'manual-bar-correction', confidenceScore: 100 } }],
    bbmLogs: [
      { vehicleId: 'v1', km: 1050, liter: 5, fullTank: false, date: '2026-08-01' },
    ],
  };
  const ctx = makeCtx(D, () => ({ ok: false }), () => 1050);
  const res = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(res.ok, true);
  assert.equal(res.liter, 10);
  assert.equal(res.clamped, true);
});

test('estimateCurrentLiter() -- getVehicleKm/fuelEfficiency belum dimuat (typeof guard) -> tidak crash, estimationLimited:true', () => {
  const D = {
    vehicles: [{ id: 'v1', fuelTankProfile: PROFILE, fuelState: { currentFuelLiter: 6, referenceKm: 1000, estimatedSource: 'manual-bar-correction', confidenceScore: 100 } }],
    bbmLogs: [],
  };
  const ctx = loadSource(
    ['modules/vehicle/fuel-storage.js', 'modules/vehicle/fuel-tank-profile.js', 'modules/vehicle/fuel-state-estimator.js'],
    { D },
    ['FuelStateEstimator'],
  );
  const res = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(res.ok, true);
  assert.equal(res.currentKm, null);
  assert.equal(res.deltaKm, null);
  assert.equal(res.kmPerLiter, null);
  assert.equal(res.liter, 6);
  assert.equal(res.estimationLimited, true);
});

test('estimateCurrentLiter() -- profil tangki belum diatur -> tetap sukses (fallback clamp min 0 tanpa cap kapasitas)', () => {
  const D = {
    vehicles: [{ id: 'v1', fuelState: { currentFuelLiter: 2, referenceKm: 1000, estimatedSource: 'manual-bar-correction', confidenceScore: 100 } }],
    bbmLogs: [],
  };
  // deltaKm besar -> consumedLiter > baseLiter -> tanpa profil tangki tetap di-clamp ke 0 (bukan negatif).
  const ctx = makeCtx(D, EFF_OK, () => 5000);
  const res = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(res.ok, true);
  assert.equal(res.liter, 0);
  assert.equal(res.clamped, true);
});

// --- SESI 5 (FUEL-AUTOSYNC-08): decayedConfidenceScore -----------------------

test('estimateCurrentLiter() -- deltaKm 0 (baru saja di titik acuan) -> decayedConfidenceScore == confidenceScore dasar (belum ada decay)', () => {
  const D = {
    vehicles: [{ id: 'v1', fuelTankProfile: PROFILE, fuelState: { currentFuelLiter: 8, referenceKm: 1000, estimatedSource: 'manual-bar-correction', confidenceScore: 100 } }],
    bbmLogs: [],
  };
  const ctx = makeCtx(D, EFF_OK, () => 1000);
  const res = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(res.ok, true);
  assert.equal(res.deltaKm, 0);
  assert.equal(res.confidenceScore, 100);
  assert.equal(res.decayedConfidenceScore, 100);
});

test('estimateCurrentLiter() -- deltaKm 150, DECAY_KM_PER_POINT 15 -> decayedConfidenceScore turun 10 poin dari dasar', () => {
  const D = {
    vehicles: [{ id: 'v1', fuelTankProfile: PROFILE, fuelState: { currentFuelLiter: 8, referenceKm: 1000, estimatedSource: 'manual-bar-correction', confidenceScore: 100 } }],
    bbmLogs: [],
  };
  const ctx = makeCtx(D, EFF_OK, () => 1150);
  const res = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(res.ok, true);
  assert.equal(res.deltaKm, 150);
  assert.equal(res.confidenceScore, 100); // field lama TIDAK ikut berubah
  assert.equal(res.decayedConfidenceScore, 90);
});

test('estimateCurrentLiter() -- deltaKm sangat besar -> decayedConfidenceScore dilantai di MIN_CONFIDENCE_SCORE (tidak pernah di bawah itu)', () => {
  const D = {
    vehicles: [{ id: 'v1', fuelTankProfile: PROFILE, fuelState: { currentFuelLiter: 8, referenceKm: 1000, estimatedSource: 'auto-bbm-log-full', confidenceScore: 90 } }],
    bbmLogs: [],
  };
  const ctx = makeCtx(D, EFF_OK, () => 1000000);
  const res = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(res.ok, true);
  assert.equal(res.decayedConfidenceScore, ctx.FuelStateEstimator.MIN_CONFIDENCE_SCORE);
});

test('estimateCurrentLiter() -- estimationLimited:true (tanpa referenceKm, deltaKm tidak diketahui) -> decayedConfidenceScore == confidenceScore dasar (0 tebakan)', () => {
  const D = {
    vehicles: [{ id: 'v1', fuelTankProfile: PROFILE, fuelState: { currentFuelLiter: 5, estimatedSource: 'manual-bar-correction', confidenceScore: 100 } }],
    bbmLogs: [],
  };
  const ctx = makeCtx(D, EFF_OK, () => 200);
  const res = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(res.ok, true);
  assert.equal(res.estimationLimited, true);
  assert.equal(res.decayedConfidenceScore, 100);
});

test('estimateCurrentLiter() -- confidenceScore dasar tidak ada (bukan angka) -> decayedConfidenceScore null, 0 tebakan', () => {
  const D = {
    vehicles: [{ id: 'v1', fuelTankProfile: PROFILE, fuelState: { currentFuelLiter: 8, referenceKm: 1000 } }],
    bbmLogs: [],
  };
  const ctx = makeCtx(D, EFF_OK, () => 1150);
  const res = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(res.ok, true);
  assert.equal(res.confidenceScore, null);
  assert.equal(res.decayedConfidenceScore, null);
});
