'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function urgency(componentId, logs, curKm) {
  const cat = { id: 'cat-x', vehicleId: 'v1', name: componentId, serviceComponentId: componentId, intervalKm: 12000 };
  const data = { vehicles: [{ id: 'v1', name: 'Honda Vario 125' }], sparepartCats: [cat], servisLogs: logs };
  const ctx = loadSource([
    'modules/vehicle/servis-checklist.js', 'car-notes.js', 'modules/vehicle/service-input-catalog.js',
    'modules/vehicle/servis.js', 'modules/vehicle/sparepart-servis.js', 'modules/vehicle/sparepart-servis-b.js'
  ], { D: data }, ['computeServiceUrgency']);
  return ctx.computeServiceUrgency({ vehicleId: 'v1', cat, curKm, kmPerDay: 35, nowISO: '2026-10-19' });
}
const log = (id, date, km, actionType, componentId) => ({ id, vehicleId: 'v1', categoryId: 'cat-x', serviceComponentId: componentId, item: componentId, date, km, actionType });

test('S2230: Roller CVT replaced at current odometer is not overdue', () => {
  const u = urgency('roller-cvt', [log('r1', '2026-10-18', 21311, 'ganti', 'roller-cvt')], 21311);
  assert.notEqual(u.status, 'terlewat');
  assert.equal(u.lastKm, 21311);
  assert.ok(u.sisaKm > 0);
});

test('S2230: replacement newer than last inspection becomes the baseline', () => {
  const u = urgency('busi', [
    log('b1', '2026-01-01', 5600, 'periksa', 'busi'),
    log('b2', '2026-07-18', 17686, 'ganti', 'busi')
  ], 21311);
  assert.ok(u.lastKm >= 17686);
  assert.notEqual(u.status, 'terlewat');
});

test('S2230: a genuinely overdue part with no history still shows overdue', () => {
  const u = urgency('roller-cvt', [], 30000);
  assert.equal(u.status, 'terlewat');
});

test('S2231: predictService exposes the same baseline as the urgency engine', () => {
  const cat = { id: 'cat-x', vehicleId: 'v1', name: 'roller-cvt', serviceComponentId: 'roller-cvt', showInReminder: true, intervalKm: 12000 };
  const data = { vehicles: [{ id: 'v1', name: 'Honda Vario 125', currentOdometer: 21311 }], sparepartCats: [cat], kmLogs: [{ vehicleId: 'v1', km: 21311, date: '2026-10-19' }],
    servisLogs: [log('r1', '2026-10-18', 21311, 'ganti', 'roller-cvt')] };
  const ctx = loadSource([
    'modules/vehicle/servis-checklist.js', 'car-notes.js', 'modules/vehicle/service-input-catalog.js',
    'modules/vehicle/servis.js', 'modules/vehicle/sparepart-servis.js', 'modules/vehicle/sparepart-servis-b.js'
  ], { D: data, getVehicleKm: () => 21311, estimateKmPerDay: () => 35 }, ['predictService']);
  const r = ctx.predictService({ vehicleId: 'v1', categoryId: 'cat-x' });
  assert.equal(r.ok, true);
  assert.notEqual(r.status, 'terlewat');
  assert.equal(r.lastKm, 21311);
});

test('S2231: legacy profile — replacement baselines the inspect axis', () => {
  const { loadSource: ls } = require('./helpers/loadSource');
  const ctx = ls(['modules/vehicle/service-legacy-maintenance.js'], {
    D: { vehicles: [{ id: 'v1', currentOdometer: 21311, serviceMaintenanceProfile: { mode: 'legacy' } }],
         servisLogs: [log('r1', '2026-10-18', 21311, 'ganti', 'roller-cvt')], kmLogs: [] }
  }, ['ServiceLegacyMaintenance']);
  const r = ctx.ServiceLegacyMaintenance.evaluateComponent('v1', 'roller-cvt', {}, { now: '2026-10-19',
    vehicle: { id: 'v1', currentOdometer: 21311 } });
  const ins = (r.states || []).filter(x => x.action === 'periksa');
  ins.forEach(x => { assert.notEqual(x.status, 'BASELINE_REQUIRED'); assert.notEqual(x.status, 'DUE'); });
});

test('S2232: history summary is component-scoped in multi-component sessions', () => {
  const cat = { id: 'cat-busi', vehicleId: 'v1', name: 'Busi', serviceComponentId: 'busi' };
  const session = { id: 's9', vehicleId: 'v1', categoryId: 'cat-busi', serviceComponentId: 'busi', item: 'Busi', date: '2026-07-18', km: 17686, actionType: 'ganti',
    checklist: [ { serviceComponentId: 'busi', categoryId: 'cat-busi', actionType: 'periksa' }, { serviceComponentId: 'oli-mesin', categoryId: 'cat-oli', actionType: 'ganti' } ] };
  const data = { vehicles: [{ id: 'v1', name: 'Honda Vario 125' }], sparepartCats: [cat], servisLogs: [session] };
  const ctx = loadSource([
    'modules/vehicle/servis-checklist.js', 'car-notes.js', 'modules/vehicle/service-input-catalog.js',
    'modules/vehicle/servis.js', 'modules/vehicle/sparepart-servis.js', 'modules/vehicle/sparepart-servis-b.js',
    'modules/vehicle/service-maintenance-guidance.js'
  ], { D: data }, ['summarizeServiceHistory']);
  const h = ctx.summarizeServiceHistory('v1', cat);
  assert.equal(h.lastReplaced, null, 'Busi was only inspected in this session; oil was replaced');
  assert.equal(h.lastInspected && h.lastInspected.id, 's9');
});
