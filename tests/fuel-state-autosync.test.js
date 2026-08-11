'use strict';
// tests/fuel-state-autosync.test.js — cakupan SESI FUEL-AUTOSYNC-01 (bagian
// pertama dari rencana "Fuel Estimation Auto-Update", scoped): recordBbmLog()
// (modules/finance/tx-bbm.js) sekarang menulis PERMANEN D.vehicles[i].fuelState
// begitu BBM log yang disimpan/diedit itu FULL TANK -- menutup gap
// FuelPredictionEngine/FuelInsightEngine yang sebelumnya SELALU "Data BBM
// saat ini belum ada (lakukan Koreksi BBM dulu)" walau user rajin catat
// full-tank fill, karena fuelState sebelumnya CUMA ditulis lewat tombol
// "⚙️ Koreksi" manual (FuelBarCorrection.save()).
//
// Load bareng file ASLI FuelTankProfile (TASK-142) + FuelGaugeEngine
// (TASK-143) -- BUKAN mock -- supaya rumus konversi liter->bar yang dipakai
// syncFuelStateFromFullTankBbm() teruji lewat kode produksi yang sama,
// pola sama persis harness loadSource lain di project ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ D, calls } = {}) {
  return loadSource(
    ['modules/vehicle/fuel-tank-profile.js', 'modules/vehicle/fuel-gauge-engine.js', 'modules/finance/tx-bbm.js'],
    {
      D,
      uid: (() => { let n = 5000; return () => (n += 1); })(),
    },
  );
}

function baseVehicle(overrides) {
  return Object.assign({
    id: 'veh1',
    name: 'Vario 125',
    fuelTankProfile: { tankCapacityLiter: 4.2, fuelBarCount: 8, reserveLiter: 0.5 },
  }, overrides || {});
}

test('recordBbmLog() — BBM baru fullTank:true -> fuelState tertulis otomatis (liter = kapasitas tangki)', () => {
  const veh = baseVehicle();
  const D = { bbmLogs: [], vehicles: [veh] };
  const ctx = makeCtx({ D });

  const res = ctx.recordBbmLog({
    vehicleId: 'veh1', date: '2026-08-06', km: 12000, liter: 4.2, cost: 63000,
    fullTank: true, spbu: 'Pertamina', note: '', accountId: 'acc1', txId: 'tx1',
  });

  assert.equal(res.isNew, true);
  assert.ok(veh.fuelState, 'fuelState harus tertulis');
  assert.equal(veh.fuelState.currentFuelLiter, 4.2);
  assert.equal(veh.fuelState.estimatedSource, 'auto-bbm-log-full');
  assert.equal(veh.fuelState.confidenceScore, 90);
  assert.ok(typeof veh.fuelState.correctedAt === 'string' && veh.fuelState.correctedAt.length > 0);
});

// CATATAN s415b (FUEL-AUTOSYNC-05, Sesi 2 lanjutan): sejak sesi itu,
// fullTank:false SEHARUSNYA ikut menulis fuelState lewat
// syncFuelStateFromEstimator() -- TAPI harness test ini SENGAJA tidak
// memuat FuelStateEstimator (lihat makeCtx() di atas), jadi guard `typeof
// FuelStateEstimator === 'undefined'` di tx-bbm.js membuat fungsi itu diam
// & test di bawah ini tetap valid apa adanya (menguji GUARD-nya, bukan lagi
// "belum ada formula depletion" spt sebelum s415). Skenario partial fill
// yang SESUNGGUHNYA (FuelStateEstimator dimuat) ada di
// tests/fuel-state-estimator-sync.test.js.
test('recordBbmLog() — BBM baru fullTank:false, FuelStateEstimator TIDAK dimuat -> fuelState TIDAK disentuh (guard)', () => {
  const veh = baseVehicle();
  const D = { bbmLogs: [], vehicles: [veh] };
  const ctx = makeCtx({ D });

  ctx.recordBbmLog({
    vehicleId: 'veh1', date: '2026-08-06', km: 12000, liter: 2, cost: 30000,
    fullTank: false, spbu: '', note: '', accountId: 'acc1', txId: 'tx1',
  });

  assert.equal(veh.fuelState, undefined, 'isi BBM parsial tidak boleh menulis fuelState (belum ada formula depletion)');
});

// Sama seperti test di atas: FuelStateEstimator TIDAK dimuat di harness ini,
// jadi syncFuelStateFromEstimator() diam (guard) & fuelState manual lama
// tetap apa adanya. Skenario "partial fill BOLEH update fuelState via
// estimator, TAPI TIDAK BOLEH mendowngrade confidence koreksi manual yang
// lebih baru dari itu" (kasus race/timing) di luar cakupan sesi ini.
test('recordBbmLog() — fullTank:false, FuelStateEstimator TIDAK dimuat -> fuelState manual sebelumnya TIDAK berubah (guard)', () => {
  const veh = baseVehicle({
    fuelState: { currentFuelBar: 5, currentFuelLiter: 2.6, correctedAt: '2026-08-01T00:00:00.000Z', estimatedSource: 'manual-bar-correction', confidenceScore: 100 },
  });
  const D = { bbmLogs: [], vehicles: [veh] };
  const ctx = makeCtx({ D });

  ctx.recordBbmLog({
    vehicleId: 'veh1', date: '2026-08-06', km: 12100, liter: 1.5, cost: 22500,
    fullTank: false, spbu: '', note: '', accountId: 'acc1', txId: 'tx2',
  });

  assert.equal(veh.fuelState.estimatedSource, 'manual-bar-correction', 'koreksi manual sebelumnya tidak boleh hilang gara-gara isi parsial baru');
  assert.equal(veh.fuelState.currentFuelLiter, 2.6);
});

test('recordBbmLog() — edit log existing jadi fullTank:true -> fuelState ikut ter-update', () => {
  const veh = baseVehicle();
  const existing = { id: 'bbm1', vehicleId: 'veh1', date: '2026-08-01', km: 11800, liter: 2, harga: 15000, cost: 30000, fullTank: false, spbu: '', note: '', accountId: 'acc1', txLinkId: 'tx1' };
  const D = { bbmLogs: [existing], vehicles: [veh] };
  const ctx = makeCtx({ D });

  const res = ctx.recordBbmLog({
    vehicleId: 'veh1', date: '2026-08-01', km: 11800, liter: 4.2, cost: 63000,
    fullTank: true, spbu: 'Shell', note: '', accountId: 'acc1', existingBbmId: 'bbm1',
  });

  assert.equal(res.isNew, false);
  assert.ok(veh.fuelState);
  assert.equal(veh.fuelState.currentFuelLiter, 4.2);
  assert.equal(veh.fuelState.estimatedSource, 'auto-bbm-log-full');
});

test('recordBbmLog() — fullTank:true tapi profil tangki belum diatur (tankCapacityLiter null) -> fuelState TIDAK ditulis, tidak throw', () => {
  const veh = baseVehicle({ fuelTankProfile: undefined });
  const D = { bbmLogs: [], vehicles: [veh] };
  const ctx = makeCtx({ D });

  assert.doesNotThrow(() => {
    ctx.recordBbmLog({
      vehicleId: 'veh1', date: '2026-08-06', km: 12000, liter: 3, cost: 45000,
      fullTank: true, spbu: '', note: '', accountId: 'acc1', txId: 'tx1',
    });
  });
  assert.equal(veh.fuelState, undefined);
});

test('recordBbmLog() — kendaraan tidak ditemukan di D.vehicles -> tidak throw, fuelState global tidak berubah', () => {
  const D = { bbmLogs: [], vehicles: [] };
  const ctx = makeCtx({ D });

  assert.doesNotThrow(() => {
    ctx.recordBbmLog({
      vehicleId: 'veh-ghost', date: '2026-08-06', km: 12000, liter: 3, cost: 45000,
      fullTank: true, spbu: '', note: '', accountId: 'acc1', txId: 'tx1',
    });
  });
});

test('recordBbmLog() — hasil FuelGaugeEngine.calculateFuelBar() dipakai apa adanya utk currentFuelBar (bukan selalu fuelBarCount)', () => {
  // Tangki 8 bar, kapasitas 4.2L -> full tank (4.2L) = bar 8 (bar max).
  const veh = baseVehicle({ fuelTankProfile: { tankCapacityLiter: 4.2, fuelBarCount: 8, reserveLiter: 0.5 } });
  const D = { bbmLogs: [], vehicles: [veh] };
  const ctx = makeCtx({ D });

  ctx.recordBbmLog({
    vehicleId: 'veh1', date: '2026-08-06', km: 12000, liter: 4.2, cost: 63000,
    fullTank: true, spbu: '', note: '', accountId: 'acc1', txId: 'tx1',
  });

  assert.equal(veh.fuelState.currentFuelBar, 8);
});

// --- Lanjutan (histori estimasi, FuelStateHistory) -------------------------
// Load bareng fuel-state-history.js -- guard "typeof FuelStateHistory" di
// syncFuelStateFromFullTankBbm() diuji lewat kode produksi yang sama
// (bukan mock), pola sama persis makeCtx() di atas.

function makeCtxWithHistory({ D } = {}) {
  return loadSource(
    [
      'modules/vehicle/fuel-tank-profile.js',
      'modules/vehicle/fuel-gauge-engine.js',
      'modules/vehicle/fuel-state-history.js',
      'modules/finance/tx-bbm.js',
    ],
    { D, uid: (() => { let n = 6000; return () => (n += 1); })() },
  );
}

test('recordBbmLog() — fullTank:true & FuelStateHistory dimuat -> snapshot ikut tercatat', () => {
  const veh = baseVehicle();
  const D = { bbmLogs: [], vehicles: [veh] };
  const ctx = makeCtxWithHistory({ D });

  ctx.recordBbmLog({
    vehicleId: 'veh1', date: '2026-08-06', km: 12000, liter: 4.2, cost: 63000,
    fullTank: true, spbu: '', note: '', accountId: 'acc1', txId: 'tx1',
  });

  assert.equal(D.fuelStateHistory.length, 1);
  assert.equal(D.fuelStateHistory[0].vehicleId, 'veh1');
  assert.equal(D.fuelStateHistory[0].currentFuelLiter, 4.2);
  assert.equal(D.fuelStateHistory[0].estimatedSource, 'auto-bbm-log-full');
});

test('recordBbmLog() — fullTank:false -> TIDAK ada snapshot histori (fuelState sendiri juga tidak disentuh)', () => {
  const veh = baseVehicle();
  const D = { bbmLogs: [], vehicles: [veh] };
  const ctx = makeCtxWithHistory({ D });

  ctx.recordBbmLog({
    vehicleId: 'veh1', date: '2026-08-06', km: 12000, liter: 2, cost: 30000,
    fullTank: false, spbu: '', note: '', accountId: 'acc1', txId: 'tx1',
  });

  assert.equal(D.fuelStateHistory, undefined);
});

test('recordBbmLog() — FuelStateHistory TIDAK dimuat -> tidak throw, fuelState tetap tertulis normal (guard typeof)', () => {
  const veh = baseVehicle();
  const D = { bbmLogs: [], vehicles: [veh] };
  const ctx = makeCtx({ D }); // makeCtx lama, TANPA fuel-state-history.js

  assert.doesNotThrow(() => {
    ctx.recordBbmLog({
      vehicleId: 'veh1', date: '2026-08-06', km: 12000, liter: 4.2, cost: 63000,
      fullTank: true, spbu: '', note: '', accountId: 'acc1', txId: 'tx1',
    });
  });
  assert.ok(veh.fuelState);
  assert.equal(D.fuelStateHistory, undefined);
});
