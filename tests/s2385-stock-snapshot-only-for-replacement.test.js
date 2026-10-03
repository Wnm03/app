'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../modules/vehicle/servis.js'), 'utf8');

test('S2385: single-service rollback stock lookup is gated to replacement action', () => {
  const start = source.indexOf('async markServiced(catId,actionType,opts){');
  const end = source.indexOf('\nasync markServicedBatch(items){', start);
  assert.ok(start >= 0 && end > start, 'service marking methods exist');
  const method = source.slice(start, end);
  assert.match(method, /const _markCatStock=actionType==='ganti'\?Servis\._findAutoGantiStock\(cat,curVehicleId\):null;/);
  assert.match(method, /if\(_markCatStock&&_markCatStock\.id\)_markStockIds\.add\(_markCatStock\.id\);/);
  assert.match(method, /if\(actionType==='ganti'\)\{\s*autoGantiStock=Servis\._findAutoGantiStock\(cat,curVehicleId\);/);
});

test('S2385: batch preflight resolves and snapshots auto-stock only for replacement items', () => {
  const start = source.indexOf('async markServicedBatch(items){');
  const end = source.indexOf('\nasync ', start + 1);
  assert.ok(start >= 0, 'batch method exists');
  const method = source.slice(start, end > start ? end : undefined);
  assert.match(method, /if\(c&&it\.actionType==='ganti'\)\{/);
  assert.match(method, /if\(_batchAutoStockByCatId\.has\(_stockCacheKey\)\)st=_batchAutoStockByCatId\.get\(_stockCacheKey\);/);
  assert.match(method, /if\(st&&st\.id\)_batchStockIds\.add\(st\.id\);/);
});

test('S2385: non-replacement actions do not enter the stock-candidate resolver', () => {
  const resolve = (actionType, lookup) => actionType === 'ganti' ? lookup() : null;
  let calls = 0;
  assert.equal(resolve('periksa', () => { calls++; return { id: 'stock-1' }; }), null);
  assert.equal(resolve('bersih', () => { calls++; return { id: 'stock-1' }; }), null);
  assert.equal(calls, 0);
  assert.equal(resolve('ganti', () => { calls++; return { id: 'stock-1' }; }).id, 'stock-1');
  assert.equal(calls, 1);
});
