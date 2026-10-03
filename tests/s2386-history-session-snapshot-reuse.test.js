'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../modules/vehicle/servis.js'), 'utf8');

test('S2386: component entry resolver accepts a prefiltered session snapshot', () => {
  assert.match(source, /_historySessionComponentEntries\(sessionId,sourceRows\)\{[\s\S]*?const rows=Array\.isArray\(sourceRows\)\?sourceRows:Servis\._historySessionRows\(sessionId\);/);
});

test('S2386: remove-one-component reuses the exact context snapshot', () => {
  assert.match(source, /const ctx=Servis\._historySessionContext\(sessionId\);if\(!ctx\)return;\s*const entry=Servis\._historySessionComponentEntries\(sessionId,ctx\.originalRows\)/);
});

test('S2386: remove-category reuses the exact context snapshot', () => {
  assert.match(source, /const ctx=Servis\._historySessionContext\(sessionId\);if\(!ctx\)return;\s*const entries=Servis\._historySessionComponentEntries\(sessionId,ctx\.originalRows\)/);
});

test('S2386: public resolver retains its original one-argument behavior', () => {
  const calls = [];
  const resolveRows = (sessionId, sourceRows, fallback) => Array.isArray(sourceRows) ? sourceRows : fallback(sessionId);
  const provided = [{ id: 'snapshot' }];
  assert.equal(resolveRows('session-a', provided, id => { calls.push(id); return []; }), provided);
  assert.deepEqual(calls, []);
  assert.deepEqual(resolveRows('session-b', undefined, id => { calls.push(id); return [{ id }]; }), [{ id: 'session-b' }]);
  assert.deepEqual(calls, ['session-b']);
});
