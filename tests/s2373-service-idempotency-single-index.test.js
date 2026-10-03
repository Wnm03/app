'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../modules/vehicle/servis.js'), 'utf8');

test('S2373: checklist idempotency checks index existing logs once rather than scanning per row', () => {
  const start = source.indexOf("if(typeof ServiceEventIdempotencySOT!=='undefined'&&ServiceEventIdempotencySOT&&typeof ServiceEventIdempotencySOT.find==='function'){");
  const end = source.indexOf('\n_rowsToPersist.forEach', start);
  assert.ok(start >= 0 && end > start, 'idempotency guard block exists');
  const block = source.slice(start, end);
  assert.match(block, /const _existingIdempotencyKeys=new Set\(\)/);
  assert.match(block, /for\(const _existingRow of \(D\.servisLogs\|\|\[\]\)\)/);
  assert.match(block, /_keysToCheck\.some\(_key=>_existingIdempotencyKeys\.has/);
  assert.equal((block.match(/ServiceEventIdempotencySOT\.find\(/g) || []).length, 0,
    'no full-log SOT find should run once per checklist row');
});

test('S2373: indexed membership matches SOT.find semantics for vehicle scoping and trimmed keys', () => {
  const rows = [
    { idempotencyKey: ' key-A ', vehicleId: 'v1' },
    { idempotencyKey: 'key-A', vehicleId: 'v2' },
    { idempotencyKey: 'key-B', vehicleId: ' v1 ' },
    { vehicleId: 'v1' },
  ];
  const s = v => String(v == null ? '' : v).trim();
  const find = (k, vehicleId) => rows.find(r => r && s(r.idempotencyKey) === s(k) && (!vehicleId || s(r.vehicleId) === s(vehicleId))) || null;
  function indexedHas(k, vehicleId) {
    const keys = new Set();
    for (const r of rows) {
      if (!r) continue;
      const rk = s(r.idempotencyKey), rv = s(r.vehicleId);
      keys.add(vehicleId ? rk + '\u0000' + rv : rk);
    }
    return keys.has(s(k) + (vehicleId ? '\u0000' + s(vehicleId) : ''));
  }
  for (const vehicle of ['v1', 'v2', null]) {
    for (const key of ['key-A', 'key-B', 'missing']) assert.equal(indexedHas(key, vehicle), !!find(key, vehicle), `${key} / ${vehicle}`);
  }
});
