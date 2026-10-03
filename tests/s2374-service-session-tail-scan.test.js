'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../modules/vehicle/servis.js'), 'utf8');

test('S2374: new-session catalog snapshot and link passes scan only the appended log tail', () => {
  assert.equal((source.match(/const _newSessionLogStartIndex=\(Array\.isArray\(D\.servisLogs\)\?D\.servisLogs\.length:0\);/g) || []).length, 1,
    'append boundary is captured once before writing session rows');
  assert.match(source, /const _sessionRowsToSnapshot=D\.servisLogs\.slice\(_newSessionLogStartIndex\)\.filter\(x=>x&&x\.sessionId===_serviceSessionId\)/,
    'catalog snapshots use the appended tail');
  assert.match(source, /const _savedRows=D\.servisLogs\.slice\(_newSessionLogStartIndex\)\.filter\(x=>x&&x\.sessionId===_serviceSessionId&&x\.id!==servisId\)/,
    'post-save catalog links use the appended tail');
});

test('S2374: append-tail selection preserves session scoping and row order', () => {
  const logs = [
    { id: 'old', sessionId: 'old-session' },
    { id: 'new-a', sessionId: 'current' },
    { id: 'other-concurrent', sessionId: 'other' },
    { id: 'new-b', sessionId: 'current' },
  ];
  const start = 1;
  const selected = logs.slice(start).filter(x => x && x.sessionId === 'current');
  assert.deepEqual(selected.map(x => x.id), ['new-a', 'new-b']);
  assert.deepEqual(selected.filter(x => x.id !== 'new-a').map(x => x.id), ['new-b']);
});
