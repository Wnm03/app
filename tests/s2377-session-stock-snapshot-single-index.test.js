'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../modules/vehicle/servis.js'), 'utf8');

test('S2377: session delete snapshots stock through one first-match index', () => {
  const start = source.indexOf('async delSession(sessionId)');
  const end = source.indexOf('async del(id)', start);
  assert.ok(start >= 0 && end > start, 'session delete method exists');
  const method = source.slice(start, end);
  assert.match(method, /const _sessionStockRows=Array\.isArray\(D\.partsStock\)\?D\.partsStock:\[\]/);
  assert.match(method, /const _sessionStockById=new Map\(\)/);
  assert.match(method, /_sessionStockRows\.forEach\(x=>\{if\(x&&x\.id===x\.id&&!_sessionStockById\.has\(x\.id\)\)_sessionStockById\.set\(x\.id,x\);\}\)/);
  assert.match(method, /for\(const sid of _sessionStockIds\)\{const row=_sessionStockById\.get\(sid\);if\(row\)beforeStock\.set\(sid,Number\(row\.qty\)\|\|0\);\}/);
  assert.doesNotMatch(method, /\(D\.partsStock\|\|\[\]\)\.find\(/, 'no per-stock-ID full-array scan remains');
});

test('S2377: stock index preserves first strict-ID match and ignores NaN IDs', () => {
  const rows = [{id:'p1',qty:2,marker:'first'},{id:'p1',qty:9,marker:'duplicate'},{id:NaN,qty:8}];
  const index = new Map();
  rows.forEach(x => { if (x && x.id === x.id && !index.has(x.id)) index.set(x.id, x); });
  assert.equal(index.get('p1').marker, 'first');
  assert.equal(index.get('p1').qty, 2);
  assert.equal(index.has(NaN), false);
  assert.equal(index.get('missing'), undefined);
});
