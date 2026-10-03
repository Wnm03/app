'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../modules/vehicle/servis.js'), 'utf8');

test('S2380: batch post-commit finance projection caches vehicle lookup per strict ID', () => {
  const start = source.indexOf('async markServicedBatch(items)');
  const end = source.indexOf('\nasync ', start + 1);
  assert.ok(start >= 0, 'batch service method exists');
  const method = source.slice(start, end > start ? end : undefined);
  assert.match(method, /const _batchVehicleById=new Map\(\);/);
  assert.match(method, /if\(_batchVehicleById\.has\(entry\.vehicleId\)\)_batchVehicle=_batchVehicleById\.get\(entry\.vehicleId\);/);
  assert.match(method, /else\{_batchVehicle=D\.vehicles\.find\(v=>v\.id===entry\.vehicleId\);_batchVehicleById\.set\(entry\.vehicleId,_batchVehicle\);\}/);
  assert.match(method, /category:resolveVehicleTxCategory\(_batchVehicle\)/);
  assert.doesNotMatch(method, /category:resolveVehicleTxCategory\(D\.vehicles\.find\(/);
});

test('S2380: cached lookups preserve strict IDs, first duplicate, missing IDs, and one lookup per distinct ID', () => {
  const vehicles = [
    { id: 'v1', category: 'first' },
    { id: 'v1', category: 'duplicate' },
    { id: 1, category: 'numeric' },
    { id: undefined, category: 'missing-id' },
  ];
  const cache = new Map();
  let findCalls = 0;
  const getVehicle = id => {
    if (cache.has(id)) return cache.get(id);
    findCalls++;
    const found = vehicles.find(v => v.id === id);
    cache.set(id, found);
    return found;
  };
  assert.equal(getVehicle('v1').category, 'first');
  assert.equal(getVehicle('v1').category, 'first');
  assert.equal(getVehicle(1).category, 'numeric');
  assert.equal(getVehicle('1'), undefined);
  assert.equal(getVehicle(undefined).category, 'missing-id');
  assert.equal(getVehicle(undefined).category, 'missing-id');
  assert.equal(findCalls, 4);
});
