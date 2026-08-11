'use strict';
// tests/fuel-gauge-engine.test.js — cakupan modules/vehicle/
// fuel-gauge-engine.js (TASK-143, Fuel Gauge Engine). FuelTankProfile
// (TASK-142) dimuat ASLI (bukan mock) supaya kalibrasi profil ikut teruji
// end-to-end; fuelEfficiency() (dependency vehicle-core.js) di-mock lewat
// extraGlobals (pola sama persis tests/fuel-intelligence-engine.test.js)
// supaya test fokus ke logic gauge-nya sendiri, bukan ikut nge-test ulang
// formula km/L di dependency-nya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, fuelEfficiencyImpl) {
  return loadSource(
    ['modules/vehicle/fuel-tank-profile.js', 'modules/vehicle/fuel-gauge-engine.js'],
    { D, fuelEfficiency: fuelEfficiencyImpl },
    ['FuelTankProfile', 'FuelGaugeEngine'],
  );
}

const LINEAR_VEH = { id: 'v1', fuelTankProfile: { tankCapacityLiter: 10, fuelBarCount: 8, reserveLiter: 1, tankShape: 'linear' } };
const NONLINEAR_VEH = {
  id: 'v2',
  fuelTankProfile: {
    tankCapacityLiter: 10,
    fuelBarCount: 8,
    reserveLiter: 1,
    tankShape: 'nonLinear',
    calibrationCurve: [{ liter: 2, percent: 30 }, { liter: 5, percent: 60 }],
  },
};

// --- Full tank / Empty tank -------------------------------------------------

test('full tank — persen 100, bar penuh', () => {
  const ctx = makeCtx({ vehicles: [LINEAR_VEH] });
  const percent = ctx.FuelGaugeEngine.calculateFuelPercent('v1', 10);
  assert.equal(percent.ok, true);
  assert.equal(percent.percent, 100);
  const bar = ctx.FuelGaugeEngine.calculateFuelBar('v1', 10);
  assert.equal(bar.bar, 8);
});

test('empty tank — persen 0, bar 0, liter 0', () => {
  const ctx = makeCtx({ vehicles: [LINEAR_VEH] });
  assert.equal(ctx.FuelGaugeEngine.calculateFuelPercent('v1', 0).percent, 0);
  assert.equal(ctx.FuelGaugeEngine.calculateFuelBar('v1', 0).bar, 0);
  assert.equal(ctx.FuelGaugeEngine.calculateFuelLiter('v1', 0).liter, 0);
});

// --- Percentage calculation (linear) ----------------------------------------

test('calculateFuelPercent() — nilai tengah linear', () => {
  const ctx = makeCtx({ vehicles: [LINEAR_VEH] });
  const res = ctx.FuelGaugeEngine.calculateFuelPercent('v1', 5);
  assert.equal(res.ok, true);
  assert.equal(res.percent, 50);
});

test('calculateFuelLiter()/calculateFuelBar() — konsisten round-trip linear', () => {
  const ctx = makeCtx({ vehicles: [LINEAR_VEH] });
  const bar = ctx.FuelGaugeEngine.calculateFuelBar('v1', 5).bar; // 50% dari 8 bar
  assert.equal(bar, 4);
  const liter = ctx.FuelGaugeEngine.calculateFuelLiter('v1', bar).liter;
  assert.equal(liter, 5);
});

// --- Non-linear calibration --------------------------------------------------

test('non-linear — titik kalibrasi persis dipakai', () => {
  const ctx = makeCtx({ vehicles: [NONLINEAR_VEH] });
  assert.equal(ctx.FuelGaugeEngine.calculateFuelPercent('v2', 2).percent, 30);
  assert.equal(ctx.FuelGaugeEngine.calculateFuelPercent('v2', 5).percent, 60);
});

test('non-linear — interpolasi di antara 2 titik kalibrasi', () => {
  const ctx = makeCtx({ vehicles: [NONLINEAR_VEH] });
  const res = ctx.FuelGaugeEngine.calculateFuelPercent('v2', 3.5); // tengah antara (2,30) & (5,60)
  assert.equal(res.percent, 45);
});

test('non-linear — jangkar fisik tetap berlaku (0L=0%, kapasitas=100%)', () => {
  const ctx = makeCtx({ vehicles: [NONLINEAR_VEH] });
  assert.equal(ctx.FuelGaugeEngine.calculateFuelPercent('v2', 0).percent, 0);
  assert.equal(ctx.FuelGaugeEngine.calculateFuelPercent('v2', 10).percent, 100);
});

test('non-linear — calculateFuelLiter() konsisten kebalikan calculateFuelPercent()', () => {
  const ctx = makeCtx({ vehicles: [NONLINEAR_VEH] });
  const bar = ctx.FuelGaugeEngine.calculateFuelBar('v2', 3.5).bar;
  const liter = ctx.FuelGaugeEngine.calculateFuelLiter('v2', bar).liter;
  assert.equal(liter, 3.5);
});

// --- Reserve -----------------------------------------------------------------

test('getReserveStatus() — di bawah ambang reserve -> inReserve true', () => {
  const ctx = makeCtx({ vehicles: [LINEAR_VEH] });
  const res = ctx.FuelGaugeEngine.getReserveStatus('v1', 0.5);
  assert.equal(res.ok, true);
  assert.equal(res.inReserve, true);
  assert.equal(res.reserveLiter, 1);
  assert.equal(res.literAboveReserve, 0);
});

test('getReserveStatus() — di atas ambang reserve -> inReserve false, literAboveReserve dihitung', () => {
  const ctx = makeCtx({ vehicles: [LINEAR_VEH] });
  const res = ctx.FuelGaugeEngine.getReserveStatus('v1', 3);
  assert.equal(res.inReserve, false);
  assert.equal(res.literAboveReserve, 2);
});

test('getReserveStatus() — tepat di ambang reserve -> inReserve true (<=)', () => {
  const ctx = makeCtx({ vehicles: [LINEAR_VEH] });
  const res = ctx.FuelGaugeEngine.getReserveStatus('v1', 1);
  assert.equal(res.inReserve, true);
});

// --- Remaining distance estimation -------------------------------------------

test('estimateRemainingDistance() — reuse fuelEfficiency() apa adanya', () => {
  const ctx = makeCtx({ vehicles: [LINEAR_VEH] }, (vid) => {
    assert.equal(vid, 'v1');
    return { ok: true, kmPerLiter: 40 };
  });
  const res = ctx.FuelGaugeEngine.estimateRemainingDistance('v1', 5);
  assert.equal(res.ok, true);
  assert.equal(res.km, 200);
  assert.equal(res.kmPerLiter, 40);
});

test('estimateRemainingDistance() — {ok:false} kalau fuelEfficiency() belum dimuat', () => {
  const ctx = makeCtx({ vehicles: [LINEAR_VEH] });
  const res = ctx.FuelGaugeEngine.estimateRemainingDistance('v1', 5);
  assert.equal(res.ok, false);
});

test('estimateRemainingDistance() — {ok:false} kalau data efisiensi BBM belum cukup', () => {
  const ctx = makeCtx({ vehicles: [LINEAR_VEH] }, () => ({ ok: false, reason: 'Data BBM kurang' }));
  const res = ctx.FuelGaugeEngine.estimateRemainingDistance('v1', 5);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Data BBM kurang');
});

// --- Invalid values / clamping ------------------------------------------------

test('kendaraan tidak ditemukan -> {ok:false} di semua method', () => {
  const ctx = makeCtx({ vehicles: [] });
  assert.equal(ctx.FuelGaugeEngine.calculateFuelPercent('v1', 5).ok, false);
  assert.equal(ctx.FuelGaugeEngine.calculateFuelBar('v1', 5).ok, false);
  assert.equal(ctx.FuelGaugeEngine.calculateFuelLiter('v1', 5).ok, false);
  assert.equal(ctx.FuelGaugeEngine.getReserveStatus('v1', 5).ok, false);
});

test('tankCapacityLiter belum diatur -> {ok:false}', () => {
  const ctx = makeCtx({ vehicles: [{ id: 'v3' }] });
  const res = ctx.FuelGaugeEngine.calculateFuelPercent('v3', 5);
  assert.equal(res.ok, false);
});

test('input bukan angka valid (NaN/Infinity/string) -> {ok:false}, tidak throw', () => {
  const ctx = makeCtx({ vehicles: [LINEAR_VEH] });
  assert.equal(ctx.FuelGaugeEngine.calculateFuelPercent('v1', NaN).ok, false);
  assert.equal(ctx.FuelGaugeEngine.calculateFuelPercent('v1', Infinity).ok, false);
  assert.equal(ctx.FuelGaugeEngine.calculateFuelPercent('v1', 'lima').ok, false);
  assert.equal(ctx.FuelGaugeEngine.calculateFuelBar('v1', undefined).ok, false);
});

test('clamp liter di luar rentang tangki -> dibatasi, clamped:true', () => {
  const ctx = makeCtx({ vehicles: [LINEAR_VEH] });
  const over = ctx.FuelGaugeEngine.calculateFuelPercent('v1', 999);
  assert.equal(over.percent, 100);
  assert.equal(over.clamped, true);
  const under = ctx.FuelGaugeEngine.calculateFuelPercent('v1', -5);
  assert.equal(under.percent, 0);
  assert.equal(under.clamped, true);
});

test('clamp fuelBar di luar rentang fuelBarCount -> dibatasi, clamped:true', () => {
  const ctx = makeCtx({ vehicles: [LINEAR_VEH] });
  const over = ctx.FuelGaugeEngine.calculateFuelLiter('v1', 999);
  assert.equal(over.liter, 10);
  assert.equal(over.clamped, true);
});

// --- Determinism --------------------------------------------------------------

test('deterministik — profil & input sama selalu balikin output sama', () => {
  const ctx = makeCtx({ vehicles: [NONLINEAR_VEH] });
  const a = ctx.FuelGaugeEngine.calculateFuelPercent('v2', 3.5);
  const b = ctx.FuelGaugeEngine.calculateFuelPercent('v2', 3.5);
  assert.deepEqual(a, b);
});
