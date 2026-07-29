'use strict';
// tests/fuel-tank-profile.test.js — cakupan modules/vehicle/
// fuel-tank-profile.js (TASK-142, Fuel Tank Profile). Field baru OPSIONAL
// di D.vehicles[i].fuelTankProfile — fokus test: default merge (get()),
// validasi per-field + kombinasi (validate()), dan partial update + guard
// tidak menulis apa pun kalau invalid (save()).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, extra) {
  return loadSource(['modules/vehicle/fuel-tank-profile.js'], Object.assign({ D }, extra), ['FuelTankProfile']);
}

// --- get() ---------------------------------------------------------------

test('get() — kendaraan tidak ditemukan -> null', () => {
  const ctx = makeCtx({ vehicles: [] });
  assert.equal(ctx.FuelTankProfile.get('v1'), null);
});

test('get() — kendaraan tanpa fuelTankProfile -> DEFAULTS penuh (backward compatible)', () => {
  const ctx = makeCtx({ vehicles: [{ id: 'v1', name: 'Vario' }] });
  const profile = ctx.FuelTankProfile.get('v1');
  assert.deepEqual(profile, ctx.FuelTankProfile.DEFAULTS);
});

test('get() — field yang sudah diisi dipertahankan, field lain tetap default', () => {
  const ctx = makeCtx({ vehicles: [{ id: 'v1', fuelTankProfile: { tankCapacityLiter: 12 } }] });
  const profile = ctx.FuelTankProfile.get('v1');
  assert.equal(profile.tankCapacityLiter, 12);
  assert.equal(profile.fuelBarCount, 8); // default
  assert.equal(profile.tankShape, 'linear'); // default
});

// --- validate() ------------------------------------------------------------

test('validate() — objek kosong {} valid (semua field opsional)', () => {
  const ctx = makeCtx({});
  assert.equal(ctx.FuelTankProfile.validate({}).valid, true);
});

test('validate() — bukan objek -> invalid', () => {
  const ctx = makeCtx({});
  assert.equal(ctx.FuelTankProfile.validate(null).valid, false);
  assert.equal(ctx.FuelTankProfile.validate('x').valid, false);
  assert.equal(ctx.FuelTankProfile.validate([1, 2]).valid, false);
});

test('validate() — tankCapacityLiter harus angka > 0', () => {
  const ctx = makeCtx({});
  assert.equal(ctx.FuelTankProfile.validate({ tankCapacityLiter: 0 }).valid, false);
  assert.equal(ctx.FuelTankProfile.validate({ tankCapacityLiter: -5 }).valid, false);
  assert.equal(ctx.FuelTankProfile.validate({ tankCapacityLiter: 'banyak' }).valid, false);
  assert.equal(ctx.FuelTankProfile.validate({ tankCapacityLiter: 12.5 }).valid, true);
});

test('validate() — fuelBarCount harus bilangan bulat >= 1', () => {
  const ctx = makeCtx({});
  assert.equal(ctx.FuelTankProfile.validate({ fuelBarCount: 0 }).valid, false);
  assert.equal(ctx.FuelTankProfile.validate({ fuelBarCount: 4.5 }).valid, false);
  assert.equal(ctx.FuelTankProfile.validate({ fuelBarCount: 6 }).valid, true);
});

test('validate() — reserveLiter harus angka >= 0', () => {
  const ctx = makeCtx({});
  assert.equal(ctx.FuelTankProfile.validate({ reserveLiter: -1 }).valid, false);
  assert.equal(ctx.FuelTankProfile.validate({ reserveLiter: 0 }).valid, true);
  assert.equal(ctx.FuelTankProfile.validate({ reserveLiter: 2 }).valid, true);
});

test('validate() — reserveLiter tidak boleh > tankCapacityLiter', () => {
  const ctx = makeCtx({});
  const res = ctx.FuelTankProfile.validate({ tankCapacityLiter: 5, reserveLiter: 10 });
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes('Cadangan')));
});

test('validate() — tankShape harus "linear"/"nonLinear"', () => {
  const ctx = makeCtx({});
  assert.equal(ctx.FuelTankProfile.validate({ tankShape: 'kotak' }).valid, false);
  assert.equal(ctx.FuelTankProfile.validate({ tankShape: 'linear' }).valid, true);
  assert.equal(ctx.FuelTankProfile.validate({ tankShape: 'nonLinear', calibrationCurve: [{ liter: 1, percent: 10 }] }).valid, true);
});

test('validate() — tankShape nonLinear TANPA calibrationCurve -> invalid', () => {
  const ctx = makeCtx({});
  const res = ctx.FuelTankProfile.validate({ tankShape: 'nonLinear' });
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes('nonLinear')));
});

test('validate() — calibrationCurve harus array titik {liter,percent} yang valid', () => {
  const ctx = makeCtx({});
  assert.equal(ctx.FuelTankProfile.validate({ calibrationCurve: 'bukan-array' }).valid, false);
  assert.equal(ctx.FuelTankProfile.validate({ calibrationCurve: [{ liter: 1, percent: 200 }] }).valid, false);
  assert.equal(ctx.FuelTankProfile.validate({ calibrationCurve: [{ liter: -1, percent: 50 }] }).valid, false);
  assert.equal(ctx.FuelTankProfile.validate({ calibrationCurve: [{ liter: 0, percent: 0 }, { liter: 5, percent: 100 }] }).valid, true);
});

test('validate() — defaultFuelType harus teks tidak kosong', () => {
  const ctx = makeCtx({});
  assert.equal(ctx.FuelTankProfile.validate({ defaultFuelType: '' }).valid, false);
  assert.equal(ctx.FuelTankProfile.validate({ defaultFuelType: '   ' }).valid, false);
  assert.equal(ctx.FuelTankProfile.validate({ defaultFuelType: 123 }).valid, false);
  assert.equal(ctx.FuelTankProfile.validate({ defaultFuelType: 'Pertalite' }).valid, true);
});

// --- save() ----------------------------------------------------------------

test('save() — kendaraan tidak ditemukan -> {ok:false}, tidak menulis apa pun', () => {
  const D = { vehicles: [] };
  const ctx = makeCtx(D);
  const res = ctx.FuelTankProfile.save('v1', { tankCapacityLiter: 10 });
  assert.equal(res.ok, false);
});

test('save() — sukses: merge & tulis ke D.vehicles[i].fuelTankProfile, panggil save()', () => {
  const veh = { id: 'v1', name: 'Vario' };
  const D = { vehicles: [veh] };
  let saveCalled = 0;
  const ctx = makeCtx(D, { save: () => { saveCalled++; } });
  const res = ctx.FuelTankProfile.save('v1', { tankCapacityLiter: 4.2, fuelBarCount: 5 });
  assert.equal(res.ok, true);
  assert.equal(res.profile.tankCapacityLiter, 4.2);
  assert.equal(res.profile.fuelBarCount, 5);
  assert.equal(veh.fuelTankProfile.tankCapacityLiter, 4.2);
  assert.equal(saveCalled, 1);
});

test('save() — partial update: field lama dipertahankan, hanya field baru yang berubah', () => {
  const veh = { id: 'v1', fuelTankProfile: { tankCapacityLiter: 4.2, defaultFuelType: 'Pertalite' } };
  const D = { vehicles: [veh] };
  const ctx = makeCtx(D, { save: () => {} });
  const res = ctx.FuelTankProfile.save('v1', { fuelBarCount: 6 });
  assert.equal(res.ok, true);
  assert.equal(veh.fuelTankProfile.tankCapacityLiter, 4.2); // dipertahankan
  assert.equal(veh.fuelTankProfile.defaultFuelType, 'Pertalite'); // dipertahankan
  assert.equal(veh.fuelTankProfile.fuelBarCount, 6); // baru
});

test('save() — data invalid -> {ok:false, errors}, TIDAK menulis ke D', () => {
  const veh = { id: 'v1' };
  const D = { vehicles: [veh] };
  let saveCalled = 0;
  const ctx = makeCtx(D, { save: () => { saveCalled++; } });
  const res = ctx.FuelTankProfile.save('v1', { tankCapacityLiter: -5 });
  assert.equal(res.ok, false);
  assert.ok(res.errors.length > 0);
  assert.equal(veh.fuelTankProfile, undefined);
  assert.equal(saveCalled, 0);
});

test('save() — invalid krn kombinasi merge (reserveLiter lama > tankCapacityLiter baru)', () => {
  const veh = { id: 'v1', fuelTankProfile: { reserveLiter: 8 } };
  const D = { vehicles: [veh] };
  const ctx = makeCtx(D, { save: () => {} });
  const res = ctx.FuelTankProfile.save('v1', { tankCapacityLiter: 5 });
  assert.equal(res.ok, false);
  assert.equal(veh.fuelTankProfile.tankCapacityLiter, undefined); // tidak ketulis
});
