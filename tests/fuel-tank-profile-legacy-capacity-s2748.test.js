'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

test('FuelTankProfile reads legacy root capacity when nested profile has no capacity', () => {
  const D = { vehicles: [{ id: 'v1', fuelTankCapacityLiter: 5.5, fuelTankProfile: { fuelBarCount: 8 } }] };
  const ctx = loadSource(['modules/vehicle/fuel-tank-profile.js'], { D }, ['FuelTankProfile']);
  assert.equal(ctx.FuelTankProfile.get('v1').tankCapacityLiter, 5.5);
});

test('explicit nested capacity takes precedence over legacy root capacity', () => {
  const D = { vehicles: [{ id: 'v1', fuelTankCapacityLiter: 5.5, fuelTankProfile: { tankCapacityLiter: 6.2 } }] };
  const ctx = loadSource(['modules/vehicle/fuel-tank-profile.js'], { D }, ['FuelTankProfile']);
  assert.equal(ctx.FuelTankProfile.get('v1').tankCapacityLiter, 6.2);
});

test('saving nested capacity mirrors the legacy field to prevent split-brain values', () => {
  const vehicle = { id: 'v1', fuelTankCapacityLiter: 5.5 };
  const D = { vehicles: [vehicle] };
  const ctx = loadSource(['modules/vehicle/fuel-tank-profile.js'], { D, save() {} }, ['FuelTankProfile']);
  const result = ctx.FuelTankProfile.save('v1', { tankCapacityLiter: 6.2 });
  assert.equal(result.ok, true);
  assert.equal(vehicle.fuelTankCapacityLiter, 6.2);
});

test('clearing nested capacity also clears the legacy mirror', () => {
  const vehicle = { id: 'v1', fuelTankCapacityLiter: 5.5, fuelTankProfile: { tankCapacityLiter: 5.5 } };
  const D = { vehicles: [vehicle] };
  const ctx = loadSource(['modules/vehicle/fuel-tank-profile.js'], { D, save() {} }, ['FuelTankProfile']);
  const result = ctx.FuelTankProfile.save('v1', { tankCapacityLiter: null });
  assert.equal(result.ok, true);
  assert.equal(Object.hasOwn(vehicle, 'fuelTankCapacityLiter'), false);
  assert.equal(ctx.FuelTankProfile.get('v1').tankCapacityLiter, null);
});
