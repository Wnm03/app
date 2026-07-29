'use strict';
// tests/fuel-intelligence-engine.test.js — cakupan modules/vehicle/
// fuel-intelligence-engine.js (TASK-141, Fuel Intelligence Card).
// FuelIntelligenceEngine murni MENGGABUNGKAN VehicleFuelTrendSummary/
// VehicleReminder/FuelStorage — dependency di-mock lewat extraGlobals
// (pola sama persis tests lain di project ini yang mock dependency
// module lain), supaya test ini fokus ke logic gabungannya sendiri,
// bukan ikut nge-test ulang formula di dependency-nya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ D, VehicleFuelTrendSummary, VehicleReminder, FuelStorage, FuelTankProfile } = {}) {
  return loadSource(
    ['modules/vehicle/fuel-intelligence-engine.js'],
    { D, VehicleFuelTrendSummary, VehicleReminder, FuelStorage, FuelTankProfile },
    ['FuelIntelligenceEngine'],
  );
}

test('vehicleInsight() — {ok:false} kalau kendaraan tidak ditemukan', () => {
  const ctx = makeCtx({ D: { vehicles: [] } });
  const res = ctx.FuelIntelligenceEngine.vehicleInsight('v1');
  assert.equal(res.ok, false);
});

test('vehicleInsight() — gabungan trend + reminders + logCount apa adanya (0 recompute)', () => {
  const D = { vehicles: [{ id: 'v1', name: 'Vario', emoji: '🏍️' }] };
  const trendResult = { ok: true, current: { ok: true, kmPerLiter: 40, rpPerKm: 250 }, months: 6, rows: [{ month: '2026-07', total: 50000 }], total: 50000 };
  const reminderResult = [{ type: 'fuel', vehicleId: 'v1', severity: 'due-soon', message: 'segera isi BBM' }];
  const ctx = makeCtx({
    D,
    VehicleFuelTrendSummary: { summary: (vid) => { assert.equal(vid, 'v1'); return trendResult; } },
    VehicleReminder: { fuelReminders: (vid) => { assert.equal(vid, 'v1'); return reminderResult; } },
    FuelStorage: { count: (vid) => (vid === 'v1' ? 7 : 0) },
  });
  const res = ctx.FuelIntelligenceEngine.vehicleInsight('v1');
  assert.equal(res.ok, true);
  assert.equal(res.name, 'Vario');
  assert.equal(res.current.kmPerLiter, 40);
  assert.equal(res.trend.total, 50000);
  assert.equal(res.reminders.length, 1);
  assert.equal(res.logCount, 7);
});

test('vehicleInsight() — guard VehicleFuelTrendSummary belum dimuat -> current/trend null, tidak error', () => {
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({ D, VehicleReminder: { fuelReminders: () => [] }, FuelStorage: { count: () => 0 } });
  const res = ctx.FuelIntelligenceEngine.vehicleInsight('v1');
  assert.equal(res.ok, true);
  assert.equal(res.current, null);
  assert.equal(res.trend, null);
});

test('vehicleInsight() — tankProfile (TASK-142) diambil dari FuelTankProfile.get() apa adanya', () => {
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const profile = { tankCapacityLiter: 4.2, fuelBarCount: 5, reserveLiter: 0.3, tankShape: 'linear', calibrationCurve: [], defaultFuelType: 'Pertalite' };
  const ctx = makeCtx({
    D,
    VehicleReminder: { fuelReminders: () => [] },
    FuelStorage: { count: () => 0 },
    FuelTankProfile: { get: (vid) => { assert.equal(vid, 'v1'); return profile; } },
  });
  const res = ctx.FuelIntelligenceEngine.vehicleInsight('v1');
  assert.equal(res.ok, true);
  assert.deepEqual(res.tankProfile, profile);
});

test('vehicleInsight() — guard FuelTankProfile belum dimuat -> tankProfile null, tidak error', () => {
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({ D, VehicleReminder: { fuelReminders: () => [] }, FuelStorage: { count: () => 0 } });
  const res = ctx.FuelIntelligenceEngine.vehicleInsight('v1');
  assert.equal(res.ok, true);
  assert.equal(res.tankProfile, null);
});

test('fleetInsight() — agregasi lintas kendaraan (rata-rata km/L hanya dari yang datanya cukup)', () => {
  const D = { vehicles: [{ id: 'v1', name: 'A' }, { id: 'v2', name: 'B' }] };
  const trends = {
    v1: { ok: true, current: { ok: true, kmPerLiter: 40 }, months: 6, rows: [], total: 30000 },
    v2: { ok: true, current: { ok: false }, months: 6, rows: [], total: 20000 },
  };
  const reminders = {
    v1: [{ severity: 'overdue' }],
    v2: [{ severity: 'due-soon' }, { severity: 'info' }],
  };
  const ctx = makeCtx({
    D,
    VehicleFuelTrendSummary: { summary: (vid) => trends[vid] },
    VehicleReminder: { fuelReminders: (vid) => reminders[vid] },
    FuelStorage: { count: () => 1 },
  });
  const res = ctx.FuelIntelligenceEngine.fleetInsight();
  assert.equal(res.totalVehicles, 2);
  assert.equal(res.overdueCount, 1);
  assert.equal(res.dueSoonCount, 1);
  assert.equal(res.avgKmPerLiter, 40);
  assert.equal(res.totalFuelCost, 50000);
});

test('fleetInsight() — tanpa kendaraan -> avgKmPerLiter null, totalFuelCost 0', () => {
  const ctx = makeCtx({ D: { vehicles: [] } });
  const res = ctx.FuelIntelligenceEngine.fleetInsight();
  assert.equal(res.totalVehicles, 0);
  assert.equal(res.avgKmPerLiter, null);
  assert.equal(res.totalFuelCost, 0);
});
