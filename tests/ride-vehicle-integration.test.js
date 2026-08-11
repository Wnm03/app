'use strict';
// tests/ride-vehicle-integration.test.js — cakupan modules/vehicle/
// ride-vehicle-integration.js (S528, "Vehicle/Fuel/Maintenance
// Integration"). Semua dependency (RideHistory/D.vehicles/
// FuelCostAnalytics/predictService) di-mock lewat extraGlobals — test ini
// fokus ke logic orkestrasi RideVehicleIntegration sendiri, BUKAN ikut
// nge-test ulang formula jarak/durasi (ride-activity-metrics.test.js),
// listing/summary ride (ride-history.test.js), rate BBM
// (fuel-cost-analytics.test.js), atau prediksi servis (masing-masing
// sudah ada test sendiri).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, mocks = {}) {
  return loadSource(
    ['modules/vehicle/ride-vehicle-integration.js'],
    {
      D,
      RideHistory: mocks.RideHistory,
      FuelCostAnalytics: mocks.FuelCostAnalytics,
      predictService: mocks.predictService,
    },
    ['RideVehicleIntegration'],
  );
}

const VEH = { id: 'v1', name: 'Vario 125' };

const RIDE = { rideId: 'ride-1', status: 'STOPPED', startedAt: 1000, endedAt: 5000, updatedAt: 5000 };
const SUMMARY = { distanceKm: 10, durationSec: 600, movingTimeSec: 500, pointCount: 12 };

function rideHistoryOk(ride = RIDE, summary = SUMMARY) {
  return { getRideSummary: async (rideId) => (rideId === ride.rideId ? { ride, summary } : null) };
}

const COST_OK = () => ({ ok: true, costPerKm: 250, kmPerLiter: 40, averageFuelPrice: 10000 });
const SVC_OK = (items) => () => ({ ok: true, vehicleId: 'v1', curKm: 5000, kmPerDay: 12, items });
const ITEM = (categoryName, status, sisaKm) => ({ categoryId: 'c_' + categoryName, categoryName, lastKm: 1000, intervalKm: 4000, overridden: false, sisaKm, estDateISO: null, status });

// --- ride -> vehicle association (vehicleId caller-supplied, lihat GAP) ---

test('getRideVehicleContext() — ride + vehicleId valid -> vehicle terisi dari D.vehicles', async () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, { RideHistory: rideHistoryOk(), FuelCostAnalytics: { costPerKm: COST_OK }, predictService: SVC_OK([]) });
  const res = await ctx.RideVehicleIntegration.getRideVehicleContext({ rideId: 'ride-1', vehicleId: 'v1' });
  assert.equal(res.ok, true);
  assert.equal(res.vehicle.id, 'v1');
  assert.equal(res.vehicle.name, 'Vario 125');
});

test('getRideVehicleContext() — vehicleId tidak diberikan -> ok:true, vehicle/fuel/maintenance:null + note GAP', async () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, { RideHistory: rideHistoryOk() });
  const res = await ctx.RideVehicleIntegration.getRideVehicleContext({ rideId: 'ride-1' });
  assert.equal(res.ok, true);
  assert.equal(res.vehicle, null);
  assert.equal(res.fuel, null);
  assert.equal(res.maintenance, null);
  assert.match(res.note, /RideStorage/);
  assert.equal(res.summary.distanceKm, SUMMARY.distanceKm);
  assert.equal(res.summary.durationSec, SUMMARY.durationSec);
});

// --- ride distance -> existing vehicle/fuel logic -------------------------

test('getRideVehicleContext() — fuel: rpPerKm/kmPerLiter dari FuelCostAnalytics diterapkan ke distanceKm ride (0 recompute)', async () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, { RideHistory: rideHistoryOk(), FuelCostAnalytics: { costPerKm: COST_OK }, predictService: SVC_OK([]) });
  const res = await ctx.RideVehicleIntegration.getRideVehicleContext({ rideId: 'ride-1', vehicleId: 'v1' });
  assert.equal(res.ok, true);
  assert.equal(res.fuel.kmPerLiter, 40);
  assert.equal(res.fuel.rpPerKm, 250);
  assert.equal(res.fuel.estimatedLiter, 10 / 40);
  assert.equal(res.fuel.estimatedCost, 10 * 250); // distanceKm(10) * rpPerKm(250), bukan rumus baru
});

// --- ride -> maintenance mileage -------------------------------------------

test('getRideVehicleContext() — maintenance: curKm/items dari predictService() apa adanya', async () => {
  const D = { vehicles: [VEH] };
  const items = [ITEM('Oli Mesin', 'lewat', -200)];
  const ctx = makeCtx(D, { RideHistory: rideHistoryOk(), FuelCostAnalytics: { costPerKm: COST_OK }, predictService: SVC_OK(items) });
  const res = await ctx.RideVehicleIntegration.getRideVehicleContext({ rideId: 'ride-1', vehicleId: 'v1' });
  assert.equal(res.ok, true);
  assert.equal(res.maintenance.curKm, 5000);
  assert.equal(res.maintenance.items.length, 1);
  assert.equal(res.maintenance.items[0].categoryName, 'Oli Mesin');
});

// --- missing vehicle --------------------------------------------------

test('getRideVehicleContext() — vehicleId tidak ada di D.vehicles -> ok:true, vehicle/fuel/maintenance:null + note', async () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, { RideHistory: rideHistoryOk(), FuelCostAnalytics: { costPerKm: COST_OK }, predictService: SVC_OK([]) });
  const res = await ctx.RideVehicleIntegration.getRideVehicleContext({ rideId: 'ride-1', vehicleId: 'v9-tidak-ada' });
  assert.equal(res.ok, true);
  assert.equal(res.vehicle, null);
  assert.equal(res.fuel, null);
  assert.equal(res.maintenance, null);
  assert.match(res.note, /tidak ditemukan/);
});

// --- missing fuel data --------------------------------------------------

test('getRideVehicleContext() — data BBM belum cukup (costPerKm ok:false) -> fuel:null, field lain tetap terisi', async () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, {
    RideHistory: rideHistoryOk(),
    FuelCostAnalytics: { costPerKm: () => ({ ok: false, reason: 'Data BBM kurang' }) },
    predictService: SVC_OK([]),
  });
  const res = await ctx.RideVehicleIntegration.getRideVehicleContext({ rideId: 'ride-1', vehicleId: 'v1' });
  assert.equal(res.ok, true);
  assert.equal(res.fuel, null);
  assert.ok(res.maintenance);
});

test('getRideVehicleContext() — FuelCostAnalytics belum dimuat -> fuel:null (tidak throw)', async () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, { RideHistory: rideHistoryOk(), predictService: SVC_OK([]) });
  const res = await ctx.RideVehicleIntegration.getRideVehicleContext({ rideId: 'ride-1', vehicleId: 'v1' });
  assert.equal(res.ok, true);
  assert.equal(res.fuel, null);
});

// --- missing maintenance data --------------------------------------------

test('getRideVehicleContext() — belum ada kategori sparepart (predictService ok:false) -> maintenance:null, field lain tetap terisi', async () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, {
    RideHistory: rideHistoryOk(),
    FuelCostAnalytics: { costPerKm: COST_OK },
    predictService: () => ({ ok: false, reason: 'Belum ada kategori sparepart terdaftar' }),
  });
  const res = await ctx.RideVehicleIntegration.getRideVehicleContext({ rideId: 'ride-1', vehicleId: 'v1' });
  assert.equal(res.ok, true);
  assert.equal(res.maintenance, null);
  assert.ok(res.fuel);
});

test('getRideVehicleContext() — predictService belum dimuat -> maintenance:null (tidak throw)', async () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, { RideHistory: rideHistoryOk(), FuelCostAnalytics: { costPerKm: COST_OK } });
  const res = await ctx.RideVehicleIntegration.getRideVehicleContext({ rideId: 'ride-1', vehicleId: 'v1' });
  assert.equal(res.ok, true);
  assert.equal(res.maintenance, null);
});

// --- empty / invalid ride --------------------------------------------------

test('getRideVehicleContext() — rideId tidak ditemukan -> ok:false RIDE_NOT_FOUND', async () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, { RideHistory: rideHistoryOk(), FuelCostAnalytics: { costPerKm: COST_OK }, predictService: SVC_OK([]) });
  const res = await ctx.RideVehicleIntegration.getRideVehicleContext({ rideId: 'ride-tidak-ada', vehicleId: 'v1' });
  assert.equal(res.ok, false);
  assert.equal(res.error.code, 'RIDE_NOT_FOUND');
});

test('getRideVehicleContext() — rideId kosong/invalid -> ok:false INVALID_INPUT', async () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, { RideHistory: rideHistoryOk() });
  for (const bad of ['', null, undefined, 42, {}]) {
    const res = await ctx.RideVehicleIntegration.getRideVehicleContext({ rideId: bad, vehicleId: 'v1' });
    assert.equal(res.ok, false);
    assert.equal(res.error.code, 'INVALID_INPUT');
  }
});

test('getRideVehicleContext() — RideHistory belum dimuat -> ok:false RIDE_NOT_FOUND (tidak throw)', async () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, {});
  const res = await ctx.RideVehicleIntegration.getRideVehicleContext({ rideId: 'ride-1', vehicleId: 'v1' });
  assert.equal(res.ok, false);
  assert.equal(res.error.code, 'RIDE_NOT_FOUND');
});

// --- immutability --------------------------------------------------------

test('getRideVehicleContext() — hasil defensive copy, mutasi hasil tidak mengubah fixture asli', async () => {
  const D = { vehicles: [VEH] };
  const items = [ITEM('Oli Mesin', 'lewat', -200)];
  const ctx = makeCtx(D, { RideHistory: rideHistoryOk(), FuelCostAnalytics: { costPerKm: COST_OK }, predictService: SVC_OK(items) });
  const res = await ctx.RideVehicleIntegration.getRideVehicleContext({ rideId: 'ride-1', vehicleId: 'v1' });
  res.ride.status = 'MUTATED';
  res.summary.distanceKm = 999;
  res.maintenance.items[0].categoryName = 'MUTATED';
  assert.equal(RIDE.status, 'STOPPED');
  assert.equal(SUMMARY.distanceKm, 10);
  assert.equal(items[0].categoryName, 'Oli Mesin');
});

// --- no duplicate writes --------------------------------------------------

test('getRideVehicleContext() — tidak pernah menulis ke D (read-only murni)', async () => {
  const D = { vehicles: [VEH] };
  const before = JSON.stringify(D);
  const ctx = makeCtx(D, { RideHistory: rideHistoryOk(), FuelCostAnalytics: { costPerKm: COST_OK }, predictService: SVC_OK([ITEM('Oli Mesin', 'lewat', -200)]) });
  await ctx.RideVehicleIntegration.getRideVehicleContext({ rideId: 'ride-1', vehicleId: 'v1' });
  assert.equal(JSON.stringify(D), before);
});

test('getRideVehicleContext() — tidak pernah memanggil save() (fungsi save tidak diinject/dipanggil)', async () => {
  const D = { vehicles: [VEH] };
  let saveCalled = false;
  const ctx = loadSource(
    ['modules/vehicle/ride-vehicle-integration.js'],
    {
      D,
      RideHistory: rideHistoryOk(),
      FuelCostAnalytics: { costPerKm: COST_OK },
      predictService: SVC_OK([]),
      save: () => { saveCalled = true; },
    },
    ['RideVehicleIntegration'],
  );
  await ctx.RideVehicleIntegration.getRideVehicleContext({ rideId: 'ride-1', vehicleId: 'v1' });
  assert.equal(saveCalled, false);
});
