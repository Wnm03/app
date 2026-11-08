'use strict';
// S2753 — propagasi log kanonis ke tren biaya BBM & pengingat isi BBM.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const PROFILE = { tankCapacityLiter: 5.5, fuelBarCount: 9, reserveLiter: 0, tankShape: 'linear' };
const mkLogs = () => {
  const month = new Date().toISOString().slice(0, 7);
  const base = { vehicleId: 'v1', date: month + '-05', km: 1000, liter: 4, cost: 40000, fullTank: true, txLinkId: null };
  return [
    { ...base, id: 1 },
    { ...base, id: 2, note: 'impor ulang' },                       // duplikat lintas batch
    { ...base, id: 3, km: 1200, liter: 40, cost: 400000 },        // salah ketik 40 L
    { ...base, id: 4, vehicleId: 'v2', km: 500 },                 // kendaraan lain, sah
  ];
};
function trend(withCanon) {
  const D = { vehicles: [{ id: 'v1', fuelTankProfile: PROFILE }, { id: 'v2', fuelTankProfile: PROFILE }], bbmLogs: mkLogs(), servisLogs: [], kmLogs: [] };
  const ctx = loadSource(
    ['modules/vehicle/fuel-storage.js', 'modules/vehicle/fuel-tank-profile.js', 'modules/vehicle/vehicle-core.js', 'modules/vehicle/vehicle-trend-api.js'],
    withCanon ? { D, document: { getElementById: () => null, querySelectorAll: () => [] }, window: {} }
              : { D, document: { getElementById: () => null, querySelectorAll: () => [] }, window: {}, getFuelCanonicalLogs: undefined },
    ['VehicleTrendAPI', 'getFuelCanonicalLogs']);
  return { ctx, D };
}

test('tren biaya BBM per kendaraan tidak menjumlah duplikat maupun log 40 L', () => {
  const { ctx, D } = trend(true);
  const r = ctx.VehicleTrendAPI.monthlyCostTrend({ vehicleId: 'v1', type: 'fuel', months: 1 });
  assert.equal(r.total, 40000);
  assert.equal(D.bbmLogs.length, 4, 'data asli tidak diubah');
});

test('tren biaya BBM seluruh armada: kanonis per kendaraan (v1 40.000 + v2 40.000)', () => {
  const { ctx } = trend(true);
  assert.equal(ctx.VehicleTrendAPI.monthlyCostTrend({ type: 'fuel', months: 1 }).total, 80000);
});

test('pengingat isi BBM memakai sumber kanonis (kode)', () => {
  const src = require('node:fs').readFileSync('modules/vehicle/vehicle-reminder.js', 'utf8');
  assert.match(src, /getFuelCanonicalLogs\(v\.id\)\.canonical/);
});
