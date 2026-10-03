'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../modules/vehicle/servis.js'), 'utf8');

test('S2375: package creation builds one service-log ID index and reuses it', () => {
  const start = source.indexOf('createHistoryAuditPackage(){');
  const end = source.indexOf('},\n_renderEditHistoryHtml', start);
  assert.ok(start >= 0 && end > start, 'package-creation method exists');
  const method = source.slice(start, end);
  assert.match(method, /const _serviceLogs=Array\.isArray\(D\.servisLogs\)\?D\.servisLogs:\[\]/);
  assert.match(method, /const _serviceLogById=new Map\(\)/);
  assert.match(method, /_serviceLogs\.forEach\(x=>\{if\(!x\)return;const key=String\(x\.id\);if\(!_serviceLogById\.has\(key\)\)_serviceLogById\.set\(key,x\);\}\)/,
    'index retains the first row for duplicate IDs, matching Array.find');
  assert.match(method, /const logs=ids\.map\(id=>_serviceLogById\.get\(String\(id\)\)\)\.filter\(Boolean\)/);
  assert.match(method, /const current=_serviceLogById\.get\(String\(Servis\.editId\)\)\|\|logs\[0\]\|\|\{\}/);
  assert.doesNotMatch(method, /\(D\.servisLogs\|\|\[\]\)\.find\(/,
    'no repeated full-array find remains in package creation');
});

test('S2375: indexed lookup preserves selected order, first duplicate, and missing-ID detection', () => {
  const rows = [
    { id: 'a', vehicleId: 'v1', marker: 'first-a' },
    { id: 'b', vehicleId: 'v1', marker: 'b' },
    { id: 'a', vehicleId: 'v2', marker: 'duplicate-a' },
  ];
  const index = new Map();
  rows.forEach(x => { if (x && !index.has(String(x.id))) index.set(String(x.id), x); });
  const selected = ['b', 'a'].map(id => index.get(String(id))).filter(Boolean);
  assert.deepEqual(selected.map(x => x.marker), ['b', 'first-a']);
  assert.equal(['a', 'missing'].map(id => index.get(String(id))).filter(Boolean).length, 1);
});
