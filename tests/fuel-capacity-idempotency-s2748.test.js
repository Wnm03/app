'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function context({ capacity = 5.5 } = {}) {
  const D = { vehicles: [{ id: 'v1', fuelTankCapacityLiter: capacity }], bbmLogs: [] };
  const ctx = loadSource(['modules/finance/tx-bbm.js'], {
    D, uid: () => 'new-log',
    FuelGaugeEngine: { calculateFuelBar: () => ({ ok: true, bar: 8 }) },
    FuelTankProfile: { get: () => ({ tankCapacityLiter: null, fuelBarCount: 8 }) },
    FuelStateEstimator: { estimateCurrentLiter: () => ({ ok: false }) },
    FuelStateHistory: { record() {} },
    getVehicleKm: () => 1200,
  }, ['validateFuelLogInput', 'recordBbmLog']);
  return { ctx, D };
}

test('fuel input accepts fill within 10 percent capacity tolerance', () => {
  const { ctx } = context();
  assert.equal(ctx.validateFuelLogInput({ vehicleId: 'v1', km: 1200, liter: 5.9 }).ok, true);
});

test('fuel input rejects fill above 10 percent capacity tolerance', () => {
  const { ctx } = context();
  const result = ctx.validateFuelLogInput({ vehicleId: 'v1', km: 1200, liter: 6.1 });
  assert.equal(result.ok, false);
  assert.match(result.reason, /kapasitas tangki/);
});

test('transaction retry with same txId reuses existing BBM log instead of duplicating', () => {
  const { ctx, D } = context();
  D.bbmLogs.push({ id: 'existing', vehicleId: 'v1', date: '2026-11-08', km: 1200, liter: 2, cost: 20000, fullTank: false, txLinkId: 'tx-1' });
  const result = ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-11-08', km: 1200, liter: 2, cost: 20000, harga: 10000, fullTank: false, txId: 'tx-1' });
  assert.equal(result.ok, true);
  assert.equal(result.isNew, false);
  assert.equal(result.bbmId, 'existing');
  assert.equal(D.bbmLogs.length, 1);
});

test('fuel input blocks conflicting nested and legacy tank capacities over 10 percent', () => {
  const D = { vehicles: [{ id: 'v1', fuelTankCapacityLiter: 5.5, fuelTankProfile: { tankCapacityLiter: 6.2 } }], bbmLogs: [] };
  const ctx = loadSource(['modules/finance/tx-bbm.js'], {
    D, FuelTankProfile: { get: () => ({ tankCapacityLiter: 6.2 }) },
  }, ['validateFuelLogInput']);
  const result = ctx.validateFuelLogInput({ vehicleId: 'v1', km: 1200, liter: 2 });
  assert.equal(result.ok, false);
  assert.match(result.reason, /berbeda dari data kendaraan/);
});

test('shared fuel validation rejects a same-day KM lower than existing BBM reading', () => {
  const D = { vehicles: [{ id: 'v1' }], bbmLogs: [{ id: 'b1', vehicleId: 'v1', date: '2026-11-08', km: 1200 }] };
  const ctx = loadSource(['modules/finance/tx-bbm.js'], { D }, ['validateFuelLogInput']);
  const result = ctx.validateFuelLogInput({ vehicleId: 'v1', date: '2026-11-08', km: 1199, liter: 2 });
  assert.equal(result.ok, false);
  assert.match(result.reason, /lebih kecil/);
});

test('shared fuel validation checks odometer evidence from service and manual KM logs too', () => {
  const D = { vehicles: [{ id: 'v1' }], bbmLogs: [], kmLogs: [{ id: 'k1', vehicleId: 'v1', date: '2026-11-07', km: 1200 }], servisLogs: [] };
  const ctx = loadSource(['modules/finance/tx-bbm.js'], { D }, ['validateFuelLogInput']);
  const result = ctx.validateFuelLogInput({ vehicleId: 'v1', date: '2026-11-08', km: 1199, liter: 2 });
  assert.equal(result.ok, false);
});
