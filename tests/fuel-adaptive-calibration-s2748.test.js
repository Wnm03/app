'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ segments = [], historical = 40, capacity = 5.5 } = {}) {
  const vehicle = { id: 'v1' };
  const D = { vehicles: [vehicle], bbmLogs: [] };
  const ctx = loadSource(['modules/vehicle/fuel-state-estimator.js'], {
    D,
    fuelEfficiency: () => ({ ok: true, kmPerLiter: historical }),
    getFuelFullTankSegments: () => segments,
    getFuelDataQuality: () => ({ flags: [], duplicateIdCount: 0, possibleDuplicateCount: 0, odometerBackstepCount: 0, overCapacityFillCount: 0 }),
    FuelTankProfile: { get: () => ({ tankCapacityLiter: capacity }) },
  }, ['FuelAdaptiveCalibration', 'FuelStateEstimator']);
  return { ctx, D, vehicle };
}

const stableSegments = [
  { startKm: 1000, endKm: 1200, km: 200, liter: 5, kmPerLiter: 40 },
  { startKm: 1200, endKm: 1400, km: 200, liter: 5, kmPerLiter: 40 },
  { startKm: 1400, endKm: 1600, km: 200, liter: 5, kmPerLiter: 40 },
];

test('adaptive calibration waits for three valid full-to-full segments', () => {
  const { ctx } = makeCtx({ segments: stableSegments.slice(0, 2) });
  const result = ctx.FuelAdaptiveCalibration.calibrate('v1', { id: 'full-3', fullTank: true });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'insufficient-valid-samples');
});

test('adaptive calibration uses median blend and stores vehicle-scoped metadata', () => {
  const { ctx, vehicle } = makeCtx({ segments: stableSegments });
  const result = ctx.FuelAdaptiveCalibration.calibrate('v1', { id: 'full-4', fullTank: true });
  assert.equal(result.ok, true);
  assert.equal(vehicle.fuelEfficiencyCalibration.valueKmPerLiter, 40);
  assert.equal(vehicle.fuelEfficiencyCalibration.sampleCount, 3);
  assert.equal(vehicle.fuelEfficiencyCalibration.lastProcessedBbmId, 'full-4');
});

test('adaptive calibration holds changes over 20 percent for manual review', () => {
  const { ctx, vehicle } = makeCtx({ segments: stableSegments.map(s => ({ ...s, kmPerLiter: 55 })), historical: 40 });
  const result = ctx.FuelAdaptiveCalibration.calibrate('v1', { id: 'full-4', fullTank: true });
  assert.equal(result.held, true);
  assert.equal(result.reason, 'manual-review-required');
  assert.equal(vehicle.fuelEfficiencyCalibration, undefined);
  assert.ok(vehicle.fuelEfficiencyCalibrationReview);
});

test('calibration caps one-cycle change to 10 percent and is idempotent by full-tank ID', () => {
  const { ctx, vehicle } = makeCtx({ segments: stableSegments.map(s => ({ ...s, kmPerLiter: 43 })), historical: 40 });
  const first = ctx.FuelAdaptiveCalibration.calibrate('v1', { id: 'full-4', fullTank: true });
  assert.equal(first.ok, true);
  assert.ok(vehicle.fuelEfficiencyCalibration.valueKmPerLiter <= 44);
  const second = ctx.FuelAdaptiveCalibration.calibrate('v1', { id: 'full-4', fullTank: true });
  assert.equal(second.skipped, 'already-processed');
});

test('invalidating calibration preserves rollback metadata but disables active override', () => {
  const { ctx, vehicle } = makeCtx({ segments: stableSegments });
  vehicle.fuelEfficiencyCalibration = { calibrationVersion: 1, valueKmPerLiter: 42, sampleCount: 3, sampleSegmentIds: stableSegments.map((s,i)=>[''+s.startKm,'>'+s.endKm].join('')) };
  assert.equal(ctx.FuelAdaptiveCalibration.invalidate('v1', 'bbm-edited'), true);
  assert.equal(ctx.FuelAdaptiveCalibration.get('v1'), null);
  assert.equal(ctx.FuelAdaptiveCalibration.rollback('v1').ok, true);
  assert.equal(ctx.FuelAdaptiveCalibration.get('v1').valueKmPerLiter, 42);
});

test('rollback refuses to reactivate calibration after source segments changed', () => {
  const { ctx, vehicle } = makeCtx({ segments: stableSegments });
  vehicle.fuelEfficiencyCalibration = { calibrationVersion: 1, valueKmPerLiter: 42, sampleCount: 3, sampleSegmentIds: stableSegments.map(s => [s.startKm, s.endKm].join('>')) };
  ctx.FuelAdaptiveCalibration.invalidate('v1', 'bbm-deleted');
  ctx.getFuelFullTankSegments = () => stableSegments.slice(1);
  assert.equal(ctx.FuelAdaptiveCalibration.rollback('v1').reason, 'source-segments-changed');
  assert.equal(ctx.FuelAdaptiveCalibration.get('v1'), null);
});

test('FuelStateEstimator consumes calibrated km/L override while leaving historical fuelEfficiency unchanged', () => {
  const vehicle = { id: 'v1', fuelState: { currentFuelLiter: 5.5, referenceKm: 1000, confidenceScore: 90 }, fuelEfficiencyCalibration: { calibrationVersion: 1, valueKmPerLiter: 50, sampleCount: 3, sampleSegmentIds: ['a','b','c'] } };
  const D = { vehicles: [vehicle], bbmLogs: [], servisLogs: [], kmLogs: [] };
  const ctx = loadSource(['modules/vehicle/fuel-state-estimator.js'], {
    D, getVehicleKm: () => 1100, fuelEfficiency: () => ({ ok: true, kmPerLiter: 40 }),
    FuelTankProfile: { get: () => ({ tankCapacityLiter: 5.5 }) },
  }, ['FuelStateEstimator']);
  const result = ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(result.kmPerLiter, 50);
  assert.equal(result.consumedLiter, 2);
  assert.equal(result.liter, 3.5);
});

test('adaptive calibration excludes a single extreme segment instead of letting it distort the median', () => {
  const samples = [
    { startKm: 1000, endKm: 1200, km: 200, liter: 5, kmPerLiter: 40 },
    { startKm: 1200, endKm: 1400, km: 200, liter: 5, kmPerLiter: 40 },
    { startKm: 1400, endKm: 1600, km: 200, liter: 5, kmPerLiter: 40 },
    { startKm: 1600, endKm: 1800, km: 200, liter: 20, kmPerLiter: 10 },
  ];
  const { ctx, vehicle } = makeCtx({ segments: samples, historical: 40 });
  const result = ctx.FuelAdaptiveCalibration.calibrate('v1', { id: 'full-5', fullTank: true });
  assert.equal(result.ok, true);
  assert.equal(vehicle.fuelEfficiencyCalibration.sampleCount, 3);
  assert.equal(vehicle.fuelEfficiencyCalibration.valueKmPerLiter, 40);
});

test('adaptive calibration refuses to learn from data-quality invalid logs', () => {
  const { ctx, vehicle } = makeCtx({ segments: stableSegments });
  ctx.getFuelDataQuality = () => ({ invalidCount: 1, flags: ['invalid-log'] });
  const result = ctx.FuelAdaptiveCalibration.calibrate('v1', { id: 'full-5', fullTank: true });
  assert.equal(result.held, true);
  assert.equal(result.reason, 'data-quality-warning');
  assert.equal(vehicle.fuelEfficiencyCalibration, undefined);
});

test('adaptive calibration reduces forward-estimator km/L error gradually without rewriting history', () => {
  const segments = stableSegments.slice();
  const { ctx, vehicle } = makeCtx({ segments, historical: 35 });
  const first = ctx.FuelAdaptiveCalibration.calibrate('v1', { id: 'full-4', fullTank: true });
  assert.equal(first.ok, true);
  const firstError = Math.abs(40 - vehicle.fuelEfficiencyCalibration.valueKmPerLiter);
  assert.ok(firstError < Math.abs(40 - 35));
  segments.push({ startKm: 1600, endKm: 1800, km: 200, liter: 5, kmPerLiter: 40 });
  const second = ctx.FuelAdaptiveCalibration.calibrate('v1', { id: 'full-5', fullTank: true });
  assert.equal(second.ok, true);
  assert.ok(Math.abs(40 - vehicle.fuelEfficiencyCalibration.valueKmPerLiter) < firstError);
  assert.equal(ctx.fuelEfficiency('v1').kmPerLiter, 35);
});
