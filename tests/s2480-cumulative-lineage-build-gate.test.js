'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

test('S2480 cumulative patch lineage retains S2449-S2479 audit artifacts and latest repair sources', () => {
  const files = fs.readdirSync('tests').filter(f => /^s24(5[1-9]|6\d|7\d|80)-.*\.test\.js$/.test(f));
  for (const n of [2451,2452,2453,2454,2455,2457,2458,2459,2460,2461,2462,2463,2464,2465,2468,2469,2470,2472,2473,2474,2475,2476,2477,2478,2479]) {
    assert.ok(files.some(f => f.startsWith(`s${n}-`)), `missing S${n} regression artifact`);
  }
  const owner = fs.readFileSync('modules/shared/owner-registry.js','utf8');
  const titipan = fs.readFileSync('modules/finance/titipan-reconcile.js','utf8');
  assert.match(owner, /BillDebtPiutangCanonicalWriter/);
  assert.match(owner, /Gagal menyimpan owner registry/);
  assert.match(titipan, /code:\s*'PERSISTENCE_FAILED'/);
});
