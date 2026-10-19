'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function evaluate(log) {
  const cat = { id: 'cat-brake', vehicleId: 'v1', name: 'Rem', serviceComponentId: 'brake-pad', conditionBased: true, reminderMode: 'condition' };
  const data = { vehicles: [{ id: 'v1', name: 'Honda Beat' }], sparepartCats: [cat], servisLogs: [log] };
  const ctx = loadSource([
    'modules/vehicle/servis-checklist.js', 'car-notes.js', 'modules/vehicle/service-input-catalog.js',
    'modules/vehicle/servis.js', 'modules/vehicle/sparepart-servis.js', 'modules/vehicle/sparepart-servis-b.js'
  ], { D: data }, ['computeServiceUrgency']);
  return ctx.computeServiceUrgency({ vehicleId: 'v1', cat, curKm: 10000, kmPerDay: 10, nowISO: '2026-10-19' });
}

test('S2177: damaged condition on a non-first checklist component is not lost when root snapshot is empty', () => {
  const result = evaluate({
    id: 'history-condition-second-row', vehicleId: 'v1', categoryId: 'cat-brake', item: 'Servis multi-komponen',
    date: '2026-10-18', km: 9900, actionType: 'periksa', conditionResult: null,
    checklist: [
      { serviceComponentId: 'slide-piece-cvt', categoryId: 'cat-cvt', actionType: 'ganti', conditionResult: 'baik' },
      { serviceComponentId: 'brake-pad', categoryId: 'cat-brake', actionType: 'periksa', conditionResult: 'rusak' }
    ]
  });
  assert.equal(result.status, 'rusak');
  assert.equal(result.condition, 'rusak');
});

test('S2177: target component condition wins over root condition projected from another checklist row', () => {
  const result = evaluate({
    id: 'history-condition-second-row-root-stale', vehicleId: 'v1', categoryId: 'cat-brake', item: 'Servis multi-komponen',
    date: '2026-10-18', km: 9900, actionType: 'periksa', conditionResult: 'baik',
    checklist: [
      { serviceComponentId: 'slide-piece-cvt', categoryId: 'cat-cvt', actionType: 'ganti', conditionResult: 'baik' },
      { serviceComponentId: 'brake-pad', categoryId: 'cat-brake', actionType: 'periksa', conditionResult: 'rusak' }
    ]
  });
  assert.equal(result.status, 'rusak');
  assert.equal(result.condition, 'rusak');
});

test('S2177: an explicit target-component replacement still clears its damaged condition', () => {
  const result = evaluate({
    id: 'history-condition-replaced-target', vehicleId: 'v1', categoryId: 'cat-brake', item: 'Servis multi-komponen',
    date: '2026-10-18', km: 9900, actionType: 'periksa', conditionResult: 'baik',
    checklist: [
      { serviceComponentId: 'slide-piece-cvt', categoryId: 'cat-cvt', actionType: 'ganti', conditionResult: 'baik' },
      { serviceComponentId: 'brake-pad', categoryId: 'cat-brake', actionType: 'ganti', conditionResult: 'rusak' }
    ]
  });
  assert.equal(result.status, 'normal');
});
