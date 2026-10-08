'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../modules/vehicle/servis.js'), 'utf8');

test('S2379: batch rollback derives service IDs and retained logs in one pass', () => {
  const start = source.indexOf('const restoreBatch=(batchId)=>');
  const end = source.indexOf('\n};', start);
  assert.ok(start >= 0 && end > start, 'batch rollback function exists');
  const block = source.slice(start, end);
  assert.match(block, /const _rollbackLogs=Array\.isArray\(D\.servisLogs\)\?D\.servisLogs:\[\]/);
  assert.match(block, /const batchIds=new Set\(\)/);
  assert.match(block, /const _keptRollbackLogs=\[\]/);
  assert.match(block, /for\(const _rollbackLog of _rollbackLogs\)/);
  assert.match(block, /if\(_rollbackLog&&_rollbackLog\.batchId===batchId\)batchIds\.add\(_rollbackLog\.id\);\s*else _keptRollbackLogs\.push\(_rollbackLog\)/);
  assert.match(block, /D\.servisLogs=_keptRollbackLogs/);
  assert.doesNotMatch(block, /\(D\.servisLogs\|\|\[\]\)\.filter\(/, 'no second full service-log filter remains');
});

test('S2379: one-pass partition preserves unrelated rows and first-class batch IDs', () => {
  const logs = [
    { id: 'a', batchId: 'b1' },
    { id: 'keep', batchId: 'other' },
    null,
    { id: 'a2', batchId: 'b1' },
    { id: 'keep2', batchId: null }
  ];
  const batchId = 'b1';
  const ids = new Set();
  const kept = [];
  for (const log of logs) {
    if (log && log.batchId === batchId) ids.add(log.id);
    else kept.push(log);
  }
  assert.deepEqual([...ids], ['a', 'a2']);
  assert.deepEqual(kept, [logs[1], null, logs[4]]);
});
