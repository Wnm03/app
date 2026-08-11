'use strict';
// tests/fuel-state-referencekm-selfheal-s444.test.js — cakupan audit S444+
// (temuan user: "fuel bar statis walau KM di-update"). Root cause: fuelState
// yang ditulis SEBELUM Sesi 415 (FUEL-AUTOSYNC-04) tidak punya field
// `referenceKm` (baru ada mulai sesi itu, TIDAK ADA migrasi otomatis by
// design saat itu — lihat FIX-v1121-to-v1122-s415-fuel-state-estimator.md).
// Akibatnya FuelStateEstimator.estimateCurrentLiter() PERMANEN balikin
// estimationLimited:true, liter beku, walau KM terus bertambah.
//
// healFuelStateReferenceKm() (vehicle-core.js) — self-heal: backfill
// referenceKm sekali per kendaraan yang kena gap ini, dipanggil dari
// renderCnTab(). Test ini load file ASLI (bukan mock) supaya rumus
// estimator yang teruji adalah kode produksi yang sama.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/vehicle/vehicle-core.js', 'modules/vehicle/fuel-state-estimator.js'],
    { D, save: () => {} },
    ['FuelStateEstimator'],
  );
}

test('healFuelStateReferenceKm() — fuelState lama TANPA referenceKm -> di-backfill pakai getVehicleKm() saat ini', () => {
  const veh = {
    id: 'veh1',
    fuelState: { currentFuelLiter: 5.5, estimatedSource: 'manual-bar-correction', confidenceScore: 100 },
  };
  const D = {
    vehicles: [veh],
    bbmLogs: [{ vehicleId: 'veh1', km: 12000 }],
    servisLogs: [],
    kmLogs: [{ vehicleId: 'veh1', km: 12050 }],
  };
  const ctx = makeCtx(D);

  assert.equal(veh.fuelState.referenceKm, undefined);
  ctx.healFuelStateReferenceKm();
  assert.equal(veh.fuelState.referenceKm, 12050);
});

test('healFuelStateReferenceKm() — setelah heal, estimator langsung reaktif thd KM baru (deltaKm bergerak)', () => {
  const veh = {
    id: 'veh1',
    fuelState: { currentFuelLiter: 5.5, estimatedSource: 'manual-bar-correction', confidenceScore: 100 },
  };
  const D = {
    vehicles: [veh],
    bbmLogs: [
      { vehicleId: 'veh1', km: 11900, liter: 5, harga: 10000, fullTank: true, date: '2026-07-01' },
      { vehicleId: 'veh1', km: 12000, liter: 2, harga: 10000, fullTank: true, date: '2026-07-15' },
    ],
    servisLogs: [],
    kmLogs: [],
  };
  const ctx = makeCtx(D);

  ctx.healFuelStateReferenceKm();
  const before = ctx.FuelStateEstimator.estimateCurrentLiter('veh1');
  assert.equal(before.estimationLimited, false);
  assert.equal(before.deltaKm, 0);

  // Simulasikan update KM lewat Car Notes (push kmLog baru, KM naik)
  D.kmLogs.push({ vehicleId: 'veh1', km: 12100, date: '2026-08-06' });
  const after = ctx.FuelStateEstimator.estimateCurrentLiter('veh1');
  assert.equal(after.deltaKm, 100);
  assert.ok(after.liter < before.liter, 'liter harus berkurang setelah KM naik & konsumsi dihitung');
});

test('healFuelStateReferenceKm() — fuelState SUDAH punya referenceKm -> tidak disentuh (idempotent)', () => {
  const veh = {
    id: 'veh1',
    fuelState: { currentFuelLiter: 5.5, referenceKm: 9999, estimatedSource: 'manual-bar-correction', confidenceScore: 100 },
  };
  const D = { vehicles: [veh], bbmLogs: [{ vehicleId: 'veh1', km: 12000 }], servisLogs: [], kmLogs: [] };
  const ctx = makeCtx(D);

  ctx.healFuelStateReferenceKm();
  assert.equal(veh.fuelState.referenceKm, 9999);
});

test('healFuelStateReferenceKm() — kendaraan tanpa fuelState sama sekali -> tidak error, tidak nulis apa pun', () => {
  const veh = { id: 'veh1' };
  const D = { vehicles: [veh], bbmLogs: [], servisLogs: [], kmLogs: [] };
  const ctx = makeCtx(D);

  assert.doesNotThrow(() => ctx.healFuelStateReferenceKm());
  assert.equal(veh.fuelState, undefined);
});

test('healFuelStateReferenceKm() — dipanggil 2x berturut-turut -> hasil sama, tidak nulis ulang referenceKm ke nilai berbeda', () => {
  const veh = {
    id: 'veh1',
    fuelState: { currentFuelLiter: 5.5, estimatedSource: 'manual-bar-correction', confidenceScore: 100 },
  };
  const D = { vehicles: [veh], bbmLogs: [{ vehicleId: 'veh1', km: 12000 }], servisLogs: [], kmLogs: [] };
  const ctx = makeCtx(D);

  ctx.healFuelStateReferenceKm();
  const first = veh.fuelState.referenceKm;
  D.bbmLogs.push({ vehicleId: 'veh1', km: 13000 }); // KM naik SETELAH heal pertama
  ctx.healFuelStateReferenceKm();
  assert.equal(veh.fuelState.referenceKm, first, 'heal ke-2 tidak boleh menimpa referenceKm yang sudah ada');
});

test('healFuelStateReferenceKm() — multi kendaraan, hanya yang kena gap yang di-heal', () => {
  const vehHealed = {
    id: 'veh1',
    fuelState: { currentFuelLiter: 5.5, estimatedSource: 'manual-bar-correction', confidenceScore: 100 },
  };
  const vehOk = {
    id: 'veh2',
    fuelState: { currentFuelLiter: 3, referenceKm: 500, estimatedSource: 'auto-bbm-log-full', confidenceScore: 90 },
  };
  const D = {
    vehicles: [vehHealed, vehOk],
    bbmLogs: [{ vehicleId: 'veh1', km: 7000 }],
    servisLogs: [],
    kmLogs: [],
  };
  const ctx = makeCtx(D);

  ctx.healFuelStateReferenceKm();
  assert.equal(vehHealed.fuelState.referenceKm, 7000);
  assert.equal(vehOk.fuelState.referenceKm, 500);
});
