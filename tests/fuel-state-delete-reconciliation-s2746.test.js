'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ logs = [], state = null, history = [] } = {}) {
  const vehicle = { id: 'v1', fuelState: state ? { ...state } : undefined };
  const D = { vehicles: [vehicle], bbmLogs: logs.map(x => ({ ...x })), fuelStateHistory: history.map(x => ({ ...x })) };
  const ctx = loadSource(['modules/finance/tx-bbm.js'], {
    D,
    FuelTankProfile: { get: () => ({ tankCapacityLiter: 5.5, fuelBarCount: 8 }) },
    FuelGaugeEngine: { calculateFuelBar: (_id, liter) => ({ ok: true, bar: Math.round(liter / 5.5 * 8) }) },
    FuelStateHistory: {
      list: id => D.fuelStateHistory.filter(x => x.vehicleId === id),
      record: (id, fs) => D.fuelStateHistory.push({ vehicleId: id, currentFuelBar: fs.currentFuelBar, currentFuelLiter: fs.currentFuelLiter, estimatedSource: fs.estimatedSource, confidenceScore: fs.confidenceScore, referenceKm: fs.referenceKm, recordedAt: fs.correctedAt }),
    },
    uid: () => 'new-bbm',
  }, ['reconcileFuelStateAfterBbmMutation', 'syncFuelStateFromFullTankBbm']);
  return { ctx, D, vehicle };
}

test('deleting latest full-tank baseline restores previous surviving full tank even when its date is older', () => {
  const { ctx, vehicle } = makeCtx({
    logs: [
      { id: 'b-old', vehicleId: 'v1', date: '2026-10-01', km: 1000, fullTank: true },
    ],
    state: { currentFuelLiter: 5.5, currentFuelBar: 8, correctedAt: '2026-11-01T23:59:59', estimatedSource: 'auto-bbm-log-full', confidenceScore: 90, referenceKm: 1500 },
  });
  const result = ctx.reconcileFuelStateAfterBbmMutation('v1');
  assert.equal(result.restored, 'full-tank');
  assert.equal(vehicle.fuelState.correctedAt, '2026-10-01T23:59:59');
  assert.equal(vehicle.fuelState.referenceKm, 1000);
});

test('deleting final full-tank baseline clears stale auto-derived fuelState when no valid baseline remains', () => {
  const { ctx, vehicle } = makeCtx({
    logs: [],
    state: { currentFuelLiter: 5.5, currentFuelBar: 8, correctedAt: '2026-11-01T23:59:59', estimatedSource: 'auto-bbm-log-full', confidenceScore: 90, referenceKm: 1500 },
  });
  const result = ctx.reconcileFuelStateAfterBbmMutation('v1');
  assert.equal(result.cleared, true);
  assert.equal(Object.hasOwn(vehicle, 'fuelState'), false);
});

test('manual correction is not overwritten by BBM delete reconciliation', () => {
  const { ctx, vehicle } = makeCtx({
    logs: [],
    state: { currentFuelLiter: 2.4, currentFuelBar: 4, correctedAt: '2026-11-05T10:00:00', estimatedSource: 'manual-bar-correction', confidenceScore: 100, referenceKm: 1800 },
  });
  const result = ctx.reconcileFuelStateAfterBbmMutation('v1');
  assert.equal(result.preserved, 'manual');
  assert.equal(vehicle.fuelState.currentFuelLiter, 2.4);
});

test('latest manual history is restored when auto-derived baseline is removed and no newer full tank remains', () => {
  const { ctx, vehicle } = makeCtx({
    logs: [],
    state: { currentFuelLiter: 5.5, currentFuelBar: 8, correctedAt: '2026-11-06T23:59:59', estimatedSource: 'auto-bbm-log-full', confidenceScore: 90, referenceKm: 1900 },
    history: [{ vehicleId: 'v1', currentFuelLiter: 2.8, currentFuelBar: 4, estimatedSource: 'manual-bar-correction', confidenceScore: 100, referenceKm: 1750, recordedAt: '2026-11-04T12:00:00' }],
  });
  const result = ctx.reconcileFuelStateAfterBbmMutation('v1');
  assert.equal(result.restored, 'manual-history');
  assert.equal(vehicle.fuelState.currentFuelLiter, 2.8);
  assert.equal(vehicle.fuelState.referenceKm, 1750);
});

test('editing the current full-tank log to partial restores the previous full-tank baseline', () => {
  const D = {
    vehicles: [{ id: 'v1', fuelState: { currentFuelLiter: 5.5, currentFuelBar: 8, correctedAt: '2026-11-01T23:59:59', estimatedSource: 'auto-bbm-log-full', confidenceScore: 90, referenceKm: 1500 } }],
    bbmLogs: [
      { id: 'b-old', vehicleId: 'v1', date: '2026-10-01', km: 1000, liter: 5.5, fullTank: true },
      { id: 'b-new', vehicleId: 'v1', date: '2026-11-01', km: 1500, liter: 5.5, fullTank: true },
    ],
    fuelStateHistory: [],
  };
  const ctx = loadSource(['modules/finance/tx-bbm.js'], {
    D,
    FuelTankProfile: { get: () => ({ tankCapacityLiter: 5.5, fuelBarCount: 8 }) },
    FuelGaugeEngine: { calculateFuelBar: () => ({ ok: true, bar: 8 }) },
    FuelStateEstimator: { estimateCurrentLiter: () => ({ ok: true, currentKm: 1500, liter: 4.2, confidenceScore: 70 }) },
    FuelStateHistory: { record() {} },
    getVehicleKm: () => 1500,
    uid: () => 'unused',
  }, ['recordBbmLog']);
  const result = ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-11-01', km: 1500, liter: 2, harga: 10000, cost: 20000, fullTank: false, existingBbmId: 'b-new' });
  assert.equal(result.ok, true);
  assert.equal(D.vehicles[0].fuelState.correctedAt, '2026-10-01T23:59:59');
  assert.equal(D.vehicles[0].fuelState.referenceKm, 1000);
});

test('finance transaction delete cascade reconciles fuelState after removing its linked BBM log', () => {
  const { D, vehicle } = makeCtx({
    logs: [{ id: 'b-old', vehicleId: 'v1', date: '2026-10-01', km: 1000, fullTank: true }],
    state: { currentFuelLiter: 5.5, currentFuelBar: 8, correctedAt: '2026-11-01T23:59:59', estimatedSource: 'auto-bbm-log-full', confidenceScore: 90, referenceKm: 1500 },
  });
  D.bbmLogs.push({ id: 'b-new', vehicleId: 'v1', date: '2026-11-01', km: 1500, fullTank: true });
  const ctx = loadSource(['modules/finance/tx-bbm.js', 'modules/finance/tx-list-cashflow.js'], {
    D,
    FuelTankProfile: { get: () => ({ tankCapacityLiter: 5.5, fuelBarCount: 8 }) },
    FuelGaugeEngine: { calculateFuelBar: () => ({ ok: true, bar: 8 }) },
    FuelStateHistory: { list: () => [], record() {} },
    toast() {}, renderStockList() {}, renderShop() {}, renderShopRecent() {},
    ProductRepository: {}, DUMMY: true,
  }, ['runTxDeleteCascades']);
  ctx.runTxDeleteCascades({ id: 'tx-new', bbmLinkId: 'b-new' });
  assert.equal(D.bbmLogs.some(b => b.id === 'b-new'), false);
  assert.equal(vehicle.fuelState.correctedAt, '2026-10-01T23:59:59');
});

test('newer surviving full tank supersedes an older manual correction during reconciliation', () => {
  const { ctx, vehicle } = makeCtx({
    logs: [{ id: 'b-newer', vehicleId: 'v1', date: '2026-11-06', km: 1800, fullTank: true }],
    state: { currentFuelLiter: 2.4, currentFuelBar: 4, correctedAt: '2026-11-04T10:00:00', estimatedSource: 'manual-bar-correction', confidenceScore: 100, referenceKm: 1750 },
  });
  const result = ctx.reconcileFuelStateAfterBbmMutation('v1');
  assert.equal(result.restored, 'full-tank');
  assert.equal(vehicle.fuelState.currentFuelLiter, 5.5);
  assert.equal(vehicle.fuelState.correctedAt, '2026-11-06T23:59:59');
});

test('manual correction on same date does not outrank a surviving full-tank fill', () => {
  const { ctx, vehicle } = makeCtx({
    logs: [{ id: 'b-same-day', vehicleId: 'v1', date: '2026-11-06', km: 1800, fullTank: true }],
    state: { currentFuelLiter: 2.4, currentFuelBar: 4, correctedAt: '2026-11-06T08:00:00', estimatedSource: 'manual-bar-correction', confidenceScore: 100, referenceKm: 1750 },
  });
  const result = ctx.reconcileFuelStateAfterBbmMutation('v1');
  assert.equal(result.restored, 'full-tank');
  assert.equal(vehicle.fuelState.currentFuelLiter, 5.5);
});
