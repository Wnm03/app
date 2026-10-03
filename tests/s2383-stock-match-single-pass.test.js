'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../modules/vehicle/servis.js'), 'utf8');

function legacyResolve(parts, matches, vehicleId, isPartForVehicle) {
  const rows = (parts || []).filter(p => p && matches(p));
  if (!rows.length) return null;
  const scoped = rows.filter(p => {
    if (!vehicleId) return true;
    if (isPartForVehicle) return isPartForVehicle(p, vehicleId);
    return !p.vehicleId || p.vehicleId === vehicleId;
  });
  if (scoped.length === 1) return scoped[0];
  if (scoped.length > 1) {
    const exact = scoped.find(p => p.vehicleId && String(p.vehicleId) === String(vehicleId));
    return exact || null;
  }
  return null;
}
function singlePassResolve(parts, matches, vehicleId, isPartForVehicle) {
  let count = 0, single = null, exact = null;
  for (const p of (parts || [])) {
    if (!p || !matches(p)) continue;
    const inScope = !vehicleId ? true : (isPartForVehicle ? isPartForVehicle(p, vehicleId) : (!p.vehicleId || p.vehicleId === vehicleId));
    if (!inScope) continue;
    count++;
    if (count === 1) single = p;
    if (!exact && p.vehicleId && String(p.vehicleId) === String(vehicleId)) exact = p;
  }
  if (count === 1) return single;
  if (count > 1) return exact || null;
  return null;
}

test('S2383: catalog and name stock matching use a single pass, not filter/filter/find chains', () => {
  const catalog = source.slice(source.indexOf('findMatchingStockByCatalogId(catalogId,vehicleId){'), source.indexOf('findMatchingStockByName(name,vehicleId){'));
  const name = source.slice(source.indexOf('findMatchingStockByName(name,vehicleId){'), source.indexOf('async applyStockUsage(partId,qty){'));
  for (const method of [catalog, name]) {
    assert.match(method, /for\(const p of _parts\)/);
    assert.match(method, /_scopedCount\+\+/);
    assert.doesNotMatch(method, /\.filter\(/);
    assert.doesNotMatch(method, /\.find\(/);
  }
});

test('S2383: single-pass resolver preserves uniqueness, exact-vehicle preference, and ambiguity behavior', () => {
  const parts = [
    { id: 'global', catalogId: 'oil', name: 'Oil', qty: 3 },
    { id: 'other', catalogId: 'oil', name: 'Oil', vehicleId: 'car-2' },
    { id: 'exact-first', catalogId: 'oil', name: 'Oil', vehicleId: 'car-1' },
    { id: 'exact-second', catalogId: 'oil', name: 'Oil', vehicleId: 'car-1' },
    { id: 'unrelated', catalogId: 'filter', name: 'Filter', vehicleId: 'car-1' },
    null
  ];
  const cases = [
    { vehicle: 'car-1', pred: p => p.catalogId === 'oil' },
    { vehicle: 'car-2', pred: p => p.catalogId === 'oil' },
    { vehicle: 'missing', pred: p => p.catalogId === 'oil' },
    { vehicle: null, pred: p => p.catalogId === 'oil' },
    { vehicle: 'car-1', pred: p => p.name.toLowerCase() === 'oil' },
    { vehicle: 'car-1', pred: p => p.catalogId === 'absent' }
  ];
  for (const c of cases) {
    const isForVehicle = (p, id) => !p.vehicleId || p.vehicleId === id;
    assert.equal(singlePassResolve(parts, c.pred, c.vehicle, isForVehicle), legacyResolve(parts, c.pred, c.vehicle, isForVehicle));
  }
  assert.equal(singlePassResolve(parts, p => p.catalogId === 'oil', 'car-1', (p,id) => !p.vehicleId || p.vehicleId === id).id, 'exact-first');
});

test('S2383: resolver evaluates matching stock rows once and returns null for ambiguous candidates without exact vehicle match', () => {
  const parts = [{ id: 'a', name: 'Oil' }, { id: 'b', name: 'Oil' }, { id: 'c', name: 'Filter' }];
  let predicateCalls = 0;
  const result = singlePassResolve(parts, p => { predicateCalls++; return p.name === 'Oil'; }, 'car-1', () => true);
  assert.equal(result, null);
  assert.equal(predicateCalls, parts.length);
});
