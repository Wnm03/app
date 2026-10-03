'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../modules/vehicle/servis.js'), 'utf8');

test('S2376: session-delete rollback indexes service rows and transactions once', () => {
  const start = source.indexOf('async delSession(sessionId)');
  const end = source.indexOf('async del(id)', start);
  assert.ok(start >= 0 && end > start, 'session delete method exists');
  const method = source.slice(start, end);
  const rollback = method.slice(method.indexOf('}catch(err){'));
  assert.match(rollback, /const _rollbackServiceRows=Array\.isArray\(D\.servisLogs\)\?D\.servisLogs:\[\]/);
  assert.match(rollback, /const _rollbackServiceById=new Map\(\)/);
  assert.match(rollback, /_rollbackServiceRows\.forEach\(x=>\{if\(x&&!_rollbackServiceById\.has\(x\.id\)\)_rollbackServiceById\.set\(x\.id,x\);\}\)/);
  assert.match(rollback, /const _rollbackTxRows=Array\.isArray\(D\.transactions\)\?D\.transactions:\[\]/);
  assert.match(rollback, /const _rollbackTxById=new Map\(\)/);
  assert.match(rollback, /_rollbackTxRows\.forEach\(x=>\{if\(x&&!_rollbackTxById\.has\(x\.id\)\)_rollbackTxById\.set\(x\.id,x\);\}\)/);
  assert.doesNotMatch(rollback, /\(D\.(?:servisLogs|transactions)\|\|\[\]\)\.find\(/,
    'rollback does not repeatedly scan the arrays for each restored row');
});

test('S2376: local first-match indexes preserve Array.find duplicate-ID behavior', () => {
  const serviceRows = [{ id: 's1', marker: 'first' }, { id: 's1', marker: 'duplicate' }];
  const serviceIndex = new Map();
  serviceRows.forEach(x => { if (x && !serviceIndex.has(x.id)) serviceIndex.set(x.id, x); });
  assert.equal(serviceIndex.get('s1').marker, 'first');
  const txRows = [{ id: 't1', marker: 'first-tx' }, { id: 't1', marker: 'duplicate-tx' }];
  const txIndex = new Map();
  txRows.forEach(x => { if (x && !txIndex.has(x.id)) txIndex.set(x.id, x); });
  assert.equal(txIndex.get('t1').marker, 'first-tx');
  assert.equal(serviceIndex.get('missing'), undefined);
});
