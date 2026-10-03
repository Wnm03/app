'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../modules/vehicle/servis.js'), 'utf8');

test('S2382: batch preflight caches auto-stock candidate resolution per category ID', () => {
  const start = source.indexOf('async markServicedBatch(items)');
  const end = source.indexOf('\nasync ', start + 1);
  assert.ok(start >= 0, 'batch service method exists');
  const method = source.slice(start, end > start ? end : undefined);
  assert.match(method, /const _batchAutoStockByCatId=new Map\(\);/);
  assert.match(method, /if\(_batchAutoStockByCatId\.has\(_stockCacheKey\)\)st=_batchAutoStockByCatId\.get\(_stockCacheKey\);/);
  assert.match(method, /else\{st=Servis\._findAutoGantiStock\(c,curVehicleId\);_batchAutoStockByCatId\.set\(_stockCacheKey,st\);\}/);
  assert.match(method, /if\(st&&st\.id\)_batchStockIds\.add\(st\.id\);/);
});

test('S2382: cached stock candidate preserves first match, strict IDs, null results, and one scan per category', () => {
  const categories = [{ id: 'oil' }, { id: 'oil', duplicate: true }, { id: 7 }, { id: undefined }];
  const candidates = new Map([['oil', { id: 'stock-oil' }], [7, null], [undefined, { id: 'stock-undefined' }]]);
  const categoryCache = new Map();
  const stockCache = new Map();
  let categoryScans = 0;
  let stockScans = 0;
  const getCategory = id => {
    if (categoryCache.has(id)) return categoryCache.get(id);
    categoryScans++;
    const c = categories.find(x => x && x.id === id);
    categoryCache.set(id, c);
    return c;
  };
  const getCandidate = id => {
    const c = getCategory(id);
    if (!c) return null;
    if (stockCache.has(c.id)) return stockCache.get(c.id);
    stockScans++;
    const st = candidates.has(c.id) ? candidates.get(c.id) : null;
    stockCache.set(c.id, st);
    return st;
  };
  assert.equal(getCandidate('oil').id, 'stock-oil');
  assert.equal(getCandidate('oil').id, 'stock-oil');
  assert.equal(getCandidate('7'), null);
  assert.equal(getCandidate(7), null);
  assert.equal(getCandidate(7), null);
  assert.equal(getCandidate(undefined).id, 'stock-undefined');
  assert.equal(getCandidate(undefined).id, 'stock-undefined');
  assert.equal(categoryScans, 4);
  assert.equal(stockScans, 3);
});
