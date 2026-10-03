'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../modules/vehicle/servis.js'), 'utf8');

test('S2371: service edit resolves the session source once before filtering logs', () => {
  const start = source.indexOf('const _editSessionSourceBefore=');
  const end = source.indexOf('const _isChecklistSessionEdit=', start);
  assert.ok(start >= 0 && end > start, 'edit-session setup block exists');
  const block = source.slice(start, end);
  assert.match(block, /const _editSessionSourceBefore=.*?\.find\(y=>y&&y\.id===Servis\.editId\)/s);
  assert.match(block, /const _editSessionKeyBefore=String\(/);
  assert.match(block, /filter\(x=>x&&.*?_editSessionKeyBefore\)/s);
  assert.equal((block.match(/D\.servisLogs\.find\(/g) || []).length, 1,
    'only one full-log lookup is allowed in the edit-session setup');
  assert.doesNotMatch(block.slice(block.indexOf('const _editSessionRowsBefore=')), /D\.servisLogs\.find\(/,
    'the per-row filter predicate must not scan the full log array');
});

test('S2371: precomputed session key preserves session/service-job/id fallback and string matching', () => {
  const logs = [
    { id: 1, vehicleId: 'v1', sessionId: 'session-A', checklist: [{ id: 'a' }] },
    { id: 2, vehicleId: 'v1', serviceJobId: 'session-A', checklist: [{ id: 'b' }] },
    { id: 3, vehicleId: 'v2', sessionId: 'session-A', checklist: [{ id: 'wrong-vehicle' }] },
    { id: 4, vehicleId: 'v1', idFallback: true, checklist: [] },
  ];
  const editId = 1;
  const sourceRow = logs.find(y => y && y.id === editId);
  const sessionKey = String(sourceRow?.sessionId || sourceRow?.serviceJobId || editId);
  const result = logs.filter(x => x && String(x.vehicleId || 'v1') === 'v1' &&
    String(x.sessionId || x.serviceJobId || x.id) === sessionKey);
  assert.deepEqual(result.map(x => x.id), [1, 2]);
  const missingSourceKey = String((undefined?.sessionId) || (undefined?.serviceJobId) || 999);
  assert.equal(missingSourceKey, '999');
});
