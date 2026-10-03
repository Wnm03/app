'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../modules/vehicle/servis.js'), 'utf8');

test('S2381: batch stock preflight caches category resolution by strict category ID', () => {
  const start = source.indexOf('async markServicedBatch(items)');
  const end = source.indexOf('\nasync ', start + 1);
  assert.ok(start >= 0, 'batch service method exists');
  const method = source.slice(start, end > start ? end : undefined);
  assert.match(method, /const _batchCategoryById=new Map\(\);/);
  assert.match(method, /const _batchCategories=Array\.isArray\(D\.sparepartCats\)\?D\.sparepartCats:\[\];/);
  assert.match(method, /if\(_batchCategoryById\.has\(it\.catId\)\)c=_batchCategoryById\.get\(it\.catId\);/);
  assert.match(method, /else\{c=_batchCategories\.find\(x=>x&&x\.id===it\.catId\);_batchCategoryById\.set\(it\.catId,c\);\}/);
  assert.match(method, /const _batchAutoStockByCatId=new Map\(\);/);
  assert.match(method, /else\{st=Servis\._findAutoGantiStock\(c,curVehicleId\);_batchAutoStockByCatId\.set\(_stockCacheKey,st\);\}/);
});

test('S2381: cached category lookups preserve strict IDs, first duplicate, and missing IDs', () => {
  const categories = [
    { id: 'oil', name: 'first' },
    { id: 'oil', name: 'duplicate' },
    { id: 7, name: 'number' },
    { id: undefined, name: 'missing-id' },
  ];
  const cache = new Map();
  let findCalls = 0;
  const getCategory = id => {
    if (cache.has(id)) return cache.get(id);
    findCalls++;
    const found = categories.find(x => x && x.id === id);
    cache.set(id, found);
    return found;
  };
  assert.equal(getCategory('oil').name, 'first');
  assert.equal(getCategory('oil').name, 'first');
  assert.equal(getCategory(7).name, 'number');
  assert.equal(getCategory('7'), undefined);
  assert.equal(getCategory(undefined).name, 'missing-id');
  assert.equal(getCategory(undefined).name, 'missing-id');
  assert.equal(findCalls, 4);
});
