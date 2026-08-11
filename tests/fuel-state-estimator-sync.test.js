'use strict';
// tests/fuel-state-estimator-sync.test.js — cakupan SESI 415b
// (FUEL-AUTOSYNC-05, Sesi 2 asli rencana "Fuel Estimation Auto-Update"):
// syncFuelStateFromEstimator() (modules/finance/tx-bbm.js), dipanggil dari
// recordBbmLog() utk log BBM PARSIAL. Load bareng file ASLI FuelTankProfile/
// FuelGaugeEngine/FuelStorage/FuelStateEstimator (BUKAN mock) supaya rumus
// akumulasi/konsumsi yang dipakai teruji lewat kode produksi yang sama,
// pola sama persis tests/fuel-state-autosync.test.js (full-tank).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ D, getVehicleKmImpl, fuelEfficiencyImpl } = {}) {
  return loadSource(
    [
      'modules/vehicle/fuel-storage.js',
      'modules/vehicle/fuel-tank-profile.js',
      'modules/vehicle/fuel-gauge-engine.js',
      'modules/vehicle/fuel-state-estimator.js',
      'modules/finance/tx-bbm.js',
    ],
    {
      D,
      uid: (() => { let n = 6000; return () => (n += 1); })(),
      getVehicleKm: getVehicleKmImpl || (() => null),
      fuelEfficiency: fuelEfficiencyImpl || (() => ({ ok: false })),
    },
  );
}

function baseVehicle(overrides) {
  return Object.assign({
    id: 'veh1',
    name: 'Vario 125',
    fuelTankProfile: { tankCapacityLiter: 4.2, fuelBarCount: 8, reserveLiter: 0.5, tankShape: 'linear' },
  }, overrides || {});
}

test('recordBbmLog() — fullTank:false, ada titik acuan & km diketahui -> fuelState ditulis auto-bbm-log', () => {
  const veh = baseVehicle({
    fuelState: { currentFuelLiter: 3, referenceKm: 12000, estimatedSource: 'manual-bar-correction', confidenceScore: 100 },
  });
  const D = { bbmLogs: [], vehicles: [veh] };
  const ctx = makeCtx({ D, getVehicleKmImpl: () => 12100 });

  ctx.recordBbmLog({
    vehicleId: 'veh1', date: '2026-08-06', km: 12100, liter: 1.5, cost: 22500,
    fullTank: false, spbu: '', note: '', accountId: 'acc1', txId: 'tx1',
  });

  assert.ok(veh.fuelState);
  assert.equal(veh.fuelState.estimatedSource, 'auto-bbm-log');
  assert.equal(veh.fuelState.confidenceScore, 70);
  // baseLiter 3 + partial fill 1.5 (kmPerLiter tidak diketahui -> 0 konsumsi) = 4.5, clamp ke kapasitas 4.2.
  assert.equal(veh.fuelState.currentFuelLiter, 4.2);
  assert.equal(veh.fuelState.referenceKm, 12100);
  assert.ok(typeof veh.fuelState.correctedAt === 'string' && veh.fuelState.correctedAt.length > 0);
});

test('recordBbmLog() — fullTank:false, referenceKm baru JADI titik acuan (tidak dobel-hitung di panggilan berikutnya)', () => {
  const veh = baseVehicle({
    fuelState: { currentFuelLiter: 2, referenceKm: 12000, estimatedSource: 'manual-bar-correction', confidenceScore: 100 },
  });
  const D = { bbmLogs: [], vehicles: [veh] };
  const ctx = makeCtx({ D, getVehicleKmImpl: () => 12050 });

  ctx.recordBbmLog({
    vehicleId: 'veh1', date: '2026-08-06', km: 12050, liter: 1, cost: 15000,
    fullTank: false, spbu: '', note: '', accountId: 'acc1', txId: 'tx1',
  });
  assert.equal(veh.fuelState.currentFuelLiter, 3);
  assert.equal(veh.fuelState.referenceKm, 12050);

  // Panggilan kedua: kalau referenceKm TIDAK diperbarui, log parsial pertama
  // (liter:1) akan ikut kehitung LAGI di sini -- assert memastikan itu TIDAK
  // terjadi (cuma log kedua yang baru, liter:0.8, yang ditambahkan).
  const ctx2 = makeCtx({ D, getVehicleKmImpl: () => 12080 });
  ctx2.recordBbmLog({
    vehicleId: 'veh1', date: '2026-08-06', km: 12080, liter: 0.8, cost: 12000,
    fullTank: false, spbu: '', note: '', accountId: 'acc1', txId: 'tx2',
  });
  assert.equal(veh.fuelState.currentFuelLiter, 3.8);
  assert.equal(veh.fuelState.referenceKm, 12080);
});

test('recordBbmLog() — fullTank:false, belum ada titik acuan sama sekali -> fuelState TIDAK ditulis (estimator ok:false)', () => {
  const veh = baseVehicle();
  const D = { bbmLogs: [], vehicles: [veh] };
  const ctx = makeCtx({ D, getVehicleKmImpl: () => 12000 });

  ctx.recordBbmLog({
    vehicleId: 'veh1', date: '2026-08-06', km: 12000, liter: 2, cost: 30000,
    fullTank: false, spbu: '', note: '', accountId: 'acc1', txId: 'tx1',
  });

  assert.equal(veh.fuelState, undefined);
});

test('recordBbmLog() — fullTank:false, currentKm tidak diketahui (getVehicleKm belum dimuat) -> fuelState TIDAK ditulis', () => {
  const veh = baseVehicle({
    fuelState: { currentFuelLiter: 3, referenceKm: 12000, estimatedSource: 'manual-bar-correction', confidenceScore: 100 },
  });
  const D = { bbmLogs: [], vehicles: [veh] };
  const ctx = makeCtx({ D, getVehicleKmImpl: () => null });

  ctx.recordBbmLog({
    vehicleId: 'veh1', date: '2026-08-06', km: 12100, liter: 1.5, cost: 22500,
    fullTank: false, spbu: '', note: '', accountId: 'acc1', txId: 'tx1',
  });

  assert.equal(veh.fuelState.currentFuelLiter, 3, 'fuelState lama tidak boleh berubah kalau currentKm tidak diketahui');
  assert.equal(veh.fuelState.referenceKm, 12000);
});

test('recordBbmLog() — FuelStateEstimator tidak dimuat -> tidak throw, fuelState tidak berubah', () => {
  const veh = baseVehicle({
    fuelState: { currentFuelLiter: 3, referenceKm: 12000, estimatedSource: 'manual-bar-correction', confidenceScore: 100 },
  });
  const D = { bbmLogs: [], vehicles: [veh] };
  const ctx = loadSource(
    ['modules/finance/tx-bbm.js'],
    { D, uid: () => 'x1' },
  );

  assert.doesNotThrow(() => {
    ctx.recordBbmLog({
      vehicleId: 'veh1', date: '2026-08-06', km: 12100, liter: 1.5, cost: 22500,
      fullTank: false, spbu: '', note: '', accountId: 'acc1', txId: 'tx1',
    });
  });
  assert.equal(veh.fuelState.currentFuelLiter, 3);
});

test('recordBbmLog() — edit log existing jadi fullTank:false -> estimator dipanggil (bukan syncFuelStateFromFullTankBbm)', () => {
  const veh = baseVehicle({
    fuelState: { currentFuelLiter: 2, referenceKm: 11700, estimatedSource: 'manual-bar-correction', confidenceScore: 100 },
  });
  const existing = { id: 'bbm1', vehicleId: 'veh1', date: '2026-08-01', km: 11800, liter: 2, harga: 15000, cost: 30000, fullTank: true, spbu: '', note: '', accountId: 'acc1', txLinkId: 'tx1' };
  const D = { bbmLogs: [existing], vehicles: [veh] };
  const ctx = makeCtx({ D, getVehicleKmImpl: () => 11800 });

  const res = ctx.recordBbmLog({
    vehicleId: 'veh1', date: '2026-08-01', km: 11800, liter: 2, cost: 30000,
    fullTank: false, spbu: '', note: '', accountId: 'acc1', existingBbmId: 'bbm1',
  });

  assert.equal(res.isNew, false);
  assert.equal(veh.fuelState.estimatedSource, 'auto-bbm-log');
  assert.equal(veh.fuelState.confidenceScore, 70);
});
