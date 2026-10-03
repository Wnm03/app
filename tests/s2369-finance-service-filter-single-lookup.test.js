'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');

function makeContext(logs) {
  let findCalls = 0;
  const trackedLogs = {
    find(fn) { findCalls++; return logs.find(fn); },
  };
  const ctx = loadSource(['modules/finance/filter-laporan.js'], { D: { servisLogs: trackedLogs } });
  return { ctx, calls: () => findCalls };
}

test('S2369 combined service category/component filters resolve linked service once', () => {
  const { ctx, calls } = makeContext([
    { id: 'svc-1', masterCategoryId: 'engine', checklist: [{ itemId: 'oil' }, { itemId: 'belt' }] },
    { id: 'svc-2', masterCategoryId: 'brake', checklist: [{ itemId: 'pad' }] },
  ]);
  assert.equal(ctx.txMatchesFilters({ id: 'tx-1', type: 'expense', servisLinkId: 'svc-1' }, {
    serviceCategory: 'engine', serviceComponent: 'belt',
  }), true);
  assert.equal(calls(), 1, 'category and component filters share one service-log lookup');
});

test('S2369 preserves mismatch and missing-link behavior for service filters', () => {
  const { ctx, calls } = makeContext([
    { id: 'svc-1', masterCategoryId: 'engine', checklist: [{ itemId: 'oil' }] },
  ]);
  assert.equal(ctx.txMatchesFilters({ type: 'expense', servisLinkId: 'svc-1' }, {
    serviceCategory: 'engine', serviceComponent: 'belt',
  }), false);
  assert.equal(calls(), 1);
  assert.equal(ctx.txMatchesFilters({ type: 'expense' }, { serviceCategory: 'engine' }), false);
  assert.equal(calls(), 1, 'missing link is rejected without scanning service logs');
});

test('S2369 leaves non-service filters independent of service-log scans', () => {
  const { ctx, calls } = makeContext([]);
  assert.equal(ctx.txMatchesFilters({ type: 'expense', category: 'food' }, { kat: 'food' }), true);
  assert.equal(calls(), 0);
  const source = fs.readFileSync(path.join(__dirname, '..', 'modules/finance/filter-laporan.js'), 'utf8');
  const start = source.indexOf('function txMatchesFilters(t,f){');
  const end = source.indexOf('\nfunction populateCatFilter()', start);
  const block = source.slice(start, end);
  assert.equal((block.match(/\(D\.servisLogs\|\|\[\]\)\.find\(/g) || []).length, 1,
    'filter block should contain a single service-log lookup site');
});
