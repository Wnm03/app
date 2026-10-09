'use strict';
// S2041.7: renderStockList builds ONE partId->logs index instead of filtering D.servisLogs per row. Results must be identical.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'modules/vehicle/sparepart-servis-ui.js'), 'utf8');

function load(D) {
  const a = src.indexOf('_buildPartUsageIndex(){');
  const b = src.indexOf('openPartHistoryEntry(', a);
  assert.ok(a > 0 && b > a, 'functions present');
  const body = src.slice(a, b).replace(/,\s*$/, '');
  const compareServiceHistoryRecency = (x, y) => String(y.date || '').localeCompare(String(x.date || '')) || Number(y.km || 0) - Number(x.km || 0);
  return new Function('D', 'compareServiceHistoryRecency', 'return {' + body + '};')(D, compareServiceHistoryRecency);
}
const D = {
  vehicles: [{ id: 'v1', name: 'Vario' }, { id: 'v2', name: 'Avanza' }],
  servisLogs: [
    { id: 's1', vehicleId: 'v1', usedPartId: 'p1', usedPartQty: 2, date: '2026-01-01', item: 'Oli', km: 100 },
    { id: 's2', vehicleId: 'v2', catalogPartLinkedStockId: 'p1', catalogPartQty: 1, date: '2026-03-01', item: 'Busi', km: 300 },
    { id: 's3', vehicleId: 'v1', usedPartId: 'p2', catalogPartLinkedStockId: 'p1', usedPartQty: 1, catalogPartQty: 4, date: '2026-02-01', item: 'Filter', km: 200 },
    { id: 's4', vehicleId: 'v1', usedPartId: 'p1', catalogPartLinkedStockId: 'p1', usedPartQty: 3, date: '2026-02-01', item: 'Dobel', km: 250 }, // same id in both fields -> once
    null,
    { id: 's5', vehicleId: 'v9', usedPartId: 'p3', date: '2026-04-01', item: 'X' },
  ].filter(x => x !== null),
};

test('S2041.7: indexed usage history equals the per-row filter for every part id (incl. both-fields and unknown vehicle)', () => {
  const api = load(D);
  const idx = api._buildPartUsageIndex();
  for (const id of ['p1', 'p2', 'p3', 'nope', '', null]) {
    assert.deepStrictEqual(api.getPartUsageHistory(id, idx), api.getPartUsageHistory(id), 'part ' + id);
  }
  assert.strictEqual(api.getPartUsageHistory('p1', idx).filter(h => h.servisId === 's4').length, 1);
  assert.strictEqual(api.getPartUsageHistory('p3', idx)[0].vehicleName, '-');
});

test('S2041.7: renderStockList builds the index once, outside the row map', () => {
  const i = src.indexOf('const _usageIdx=Sparepart._buildPartUsageIndex();');
  const j = src.indexOf('el.innerHTML=list.map((p)=>{', i);
  assert.ok(i > 0 && j > i && j - i < 80);
  assert.strictEqual((src.match(/_buildPartUsageIndex\(\)/g) || []).length, 2); // definition + 1 call
  assert.ok(src.includes('getPartUsageHistory(p.id,_usageIdx)'));
});
