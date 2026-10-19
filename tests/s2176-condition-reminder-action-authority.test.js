'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function evaluate(log) {
  const cat = { id: 'cat-brake', vehicleId: 'v1', name: 'Rem', serviceComponentId: 'brake-pad', conditionBased: true, reminderMode: 'condition' };
  const data = {
    vehicles: [{ id: 'v1', name: 'Honda Beat' }],
    sparepartCats: [cat],
    servisLogs: [log]
  };
  const ctx = loadSource([
    'modules/vehicle/servis-checklist.js',
    'car-notes.js',
    'modules/vehicle/service-input-catalog.js',
    'modules/vehicle/servis.js',
    'modules/vehicle/sparepart-servis.js',
    'modules/vehicle/sparepart-servis-b.js'
  ], { D: data }, ['computeServiceUrgency']);
  return ctx.computeServiceUrgency({ vehicleId: 'v1', cat, curKm: 10000, kmPerDay: 10, nowISO: '2026-10-19' });
}

function multiChecklistLog(checklist) {
  return {
    id: 'history-condition-1', vehicleId: 'v1', categoryId: 'cat-brake', item: 'Rem',
    date: '2026-10-10', km: 9500, actionType: 'ganti', conditionResult: 'rusak', checklist
  };
}

test('S2176: stale root ganti cannot suppress damaged condition without a matching checklist row', () => {
  const result = evaluate(multiChecklistLog([
    { serviceComponentId: 'slide-piece-cvt', categoryId: 'cat-cvt', actionType: 'ganti' },
    { serviceComponentId: 'roller-cvt', categoryId: 'cat-roller', actionType: 'periksa' }
  ]));
  assert.equal(result.maintenanceType, 'condition');
  assert.equal(result.status, 'rusak');
  assert.equal(result.sourceHistoryId, 'history-condition-1');
});

test('S2176: explicit matching replacement checklist row suppresses damaged condition', () => {
  const result = evaluate(multiChecklistLog([
    { serviceComponentId: 'brake-pad', categoryId: 'cat-brake', actionType: 'ganti' },
    { serviceComponentId: 'roller-cvt', categoryId: 'cat-roller', actionType: 'periksa' }
  ]));
  assert.equal(result.maintenanceType, 'condition');
  assert.equal(result.status, 'normal');
});

test('S2176: matching inspection action cannot be upgraded to replacement by stale root action', () => {
  const result = evaluate(multiChecklistLog([
    { serviceComponentId: 'brake-pad', categoryId: 'cat-brake', actionType: 'periksa' },
    { serviceComponentId: 'roller-cvt', categoryId: 'cat-roller', actionType: 'ganti' }
  ]));
  assert.equal(result.status, 'rusak');
});
