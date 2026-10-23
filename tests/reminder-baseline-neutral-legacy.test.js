'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const FILES = [
  'modules/vehicle/servis-checklist.js', 'car-notes.js', 'modules/vehicle/service-input-catalog.js',
  'modules/vehicle/service-legacy-maintenance.js',
  'modules/vehicle/servis.js', 'modules/vehicle/sparepart-servis.js', 'modules/vehicle/sparepart-servis-b.js'
];
const log = (id, date, km, componentId, extra) => Object.assign({ id, vehicleId: 'v1', date, km, item: componentId, serviceComponentId: componentId, actionType: 'ganti' }, extra || {});
function setup(logs, curKm) {
  const cat = { id: 'cat-x', vehicleId: 'v1', name: 'x', serviceComponentId: 'busi', intervalKm: 4000 };
  const data = { vehicles: [{ id: 'v1', name: 'Vario', currentOdometer: curKm, serviceMaintenanceProfile: { mode: 'legacy' } }], sparepartCats: [cat], servisLogs: logs, kmLogs: [] };
  const ctx = loadSource(FILES, { D: data }, ['computeServiceUrgency', 'ServiceLegacyMaintenance']);
  return { cat, ctx };
}
const urg = (s, km) => s.ctx.computeServiceUrgency({ vehicleId: 'v1', cat: s.cat, curKm: km, kmPerDay: 30, nowISO: '2026-10-20' });

test('legacy: no history is neutral unknown, not overdue and not mendekati', () => {
  const u = urg(setup([], 237975), 237975);
  assert.equal(u.status, 'unknown');
  assert.equal(u.sisaKm, null);
  assert.equal(u.baselineRequired, true);
});

test('legacy: log with null/empty/missing km is not a 0-km baseline', () => {
  for (const k of [null, '', undefined]) {
    const l = log('s1', '2026-10-18', k, 'busi');
    if (k === undefined) delete l.km;
    const u = urg(setup([l], 21311), 21311);
    assert.notEqual(u.status, 'terlewat', 'km=' + String(k));
    assert.equal(u.status, 'unknown');
  }
});

test('legacy: replaced at current odometer is not overdue (0-month interval ignored)', () => {
  const u = urg(setup([log('s1', '2026-10-18', 21311, 'busi')], 21311), 21311);
  assert.notEqual(u.status, 'terlewat');
  assert.notEqual(u.status, 'jatuh_tempo');
  assert.equal(u.lastKm, 21311);
  assert.ok(u.sisaKm > 0);
});

test('legacy: genuinely overdue part with valid km stays overdue', () => {
  const u = urg(setup([log('s1', '2026-01-01', 1000, 'busi')], 21311), 21311);
  assert.equal(u.status, 'terlewat');
});

test('legacy: num()/history use taxonomy-resolved component id from projection rows', () => {
  const s = setup([{ id: 's1', vehicleId: 'v1', date: '2026-10-18', km: 21000, item: 'Busi', actionType: 'ganti' }], 21311);
  const u = urg(s, 21311);
  assert.notEqual(u.status, 'terlewat');
});
