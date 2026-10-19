'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function runtime(fixture) {
  const ctx = {
    D: fixture,
    console, Date, Map, Set, Array, Object, String, Number, Math, RegExp, JSON,
    parseInt, parseFloat, Intl
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const root = path.resolve(__dirname, '..');
  vm.runInContext(fs.readFileSync(path.join(root, 'modules/vehicle/service-history-reminder-reconciliation-sot.js'), 'utf8'), ctx, { filename: 'service-history-reminder-reconciliation-sot.js' });
  vm.runInContext(fs.readFileSync(path.join(root, 'modules/vehicle/sparepart-servis.js'), 'utf8') +
    '\n;globalThis.__testApi={servisLogMatchesCat,getLatestServiceLogForCat,matchesActionTypeForReset};', ctx,
    { filename: 'sparepart-servis.js' });
  return ctx.__testApi;
}
function baseLog(extra = {}) {
  return Object.assign({
    id: 'history-1', vehicleId: 'v1', categoryId: 'cat-cvt', item: 'Servis CVT',
    date: '2026-10-10', km: 12000, actionType: 'ganti',
    checklist: [
      { serviceComponentId: 'slide-piece-cvt', itemName: 'Slide Piece CVT', actionType: 'ganti' },
      { serviceComponentId: 'roller-cvt', itemName: 'Roller CVT', actionType: 'periksa' }
    ]
  }, extra);
}
function fixture(log) {
  return {
    vehicles: [{ id: 'v1', name: 'Honda Vario 125' }],
    sparepartCats: [{ id: 'cat-cvt', vehicleId: 'v1', name: 'Servis CVT', intervalKm: 8000 }],
    servisLogs: [log]
  };
}

test('S2175: category-only history cannot use root action to reset an unmatched component from multi-row checklist', () => {
  const log = baseLog();
  const api = runtime(fixture(log));
  const cat = fixture(log).sparepartCats[0];
  assert.equal(api.servisLogMatchesCat(log, cat), true, 'history category link may still be visible');
  assert.equal(api.matchesActionTypeForReset(log, cat, 'ganti', true), false, 'root ganti is not proof for this category when no checklist row matches it');
  assert.equal(api.getLatestServiceLogForCat('v1', cat, 'ganti', true), null, 'reminder must not select ambiguous session as a reset');
  assert.equal(api.matchesActionTypeForReset(log, cat, null, false), true, 'unfiltered history display remains compatible');
});

test('S2175: explicit matching checklist category action remains eligible for reset', () => {
  const log = baseLog({ checklist: [
    { categoryId: 'cat-cvt', itemName: 'Servis CVT', actionType: 'ganti' },
    { serviceComponentId: 'roller-cvt', itemName: 'Roller CVT', actionType: 'periksa' }
  ] });
  const api = runtime(fixture(log));
  const cat = fixture(log).sparepartCats[0];
  assert.equal(api.matchesActionTypeForReset(log, cat, 'ganti', true), true);
  assert.equal(api.getLatestServiceLogForCat('v1', cat, 'ganti', true).id, 'history-1');
});

test('S2175: single-row legacy history still uses its root action as fallback', () => {
  const log = baseLog({ checklist: [{ serviceComponentId: 'slide-piece-cvt', itemName: 'Slide Piece CVT', actionType: 'ganti' }] });
  const api = runtime(fixture(log));
  const cat = fixture(log).sparepartCats[0];
  assert.equal(api.matchesActionTypeForReset(log, cat, 'ganti', true), true);
});
