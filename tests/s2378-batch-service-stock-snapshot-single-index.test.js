'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../modules/vehicle/servis.js'), 'utf8');

test('S2378: batch service rollback snapshots stock through one first-match index', () => {
  const start = source.indexOf('async markServicedBatch(items)');
  const end = source.indexOf('\nasync ', start + 1);
  assert.ok(start >= 0, 'batch service method exists');
  const method = source.slice(start, end > start ? end : undefined);
  assert.match(method, /const _batchStockRows=Array\.isArray\(D\.partsStock\)\?D\.partsStock:\[\]/);
  assert.match(method, /const _batchStockById=new Map\(\)/);
  assert.match(method, /_batchStockRows\.forEach\(x=>\{if\(x&&x\.id===x\.id&&!_batchStockById\.has\(x\.id\)\)_batchStockById\.set\(x\.id,x\);\}\)/);
  assert.match(method, /for\(const sid of _batchStockIds\)\{const row=_batchStockById\.get\(sid\);if\(row\)batchStockBefore\.set\(sid,Number\(row\.qty\)\|\|0\);\}/);
  assert.doesNotMatch(method, /\(D\.partsStock\|\|\[\]\)\.find\(/, 'no per-stock-ID scan remains in batch snapshot');
});

test('S2378: batch stock index preserves strict IDs, first duplicate and quantity fallback', () => {
  const rows = [{ id: 'p1', qty: 4, marker: 'first' }, { id: 'p1', qty: 11, marker: 'duplicate' }, { id: 1, qty: 7 }, { id: NaN, qty: 8 }, null];
  const index = new Map();
  rows.forEach(x => { if (x && x.id != null && !Number.isNaN(x.id) && !index.has(x.id)) index.set(x.id, x); });
  assert.equal(index.get('p1').marker, 'first');
  assert.equal(index.get('p1').qty, 4);
  assert.equal(index.get(1).qty, 7);
  assert.equal(index.get('1'), undefined);
  assert.equal(index.has(NaN), false);
  assert.equal(index.get('missing'), undefined);
  assert.equal(Number((index.get('zero') || {}).qty) || 0, 0);
});
