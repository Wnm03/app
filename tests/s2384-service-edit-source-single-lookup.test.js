'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../modules/vehicle/servis.js'), 'utf8');

test('S2384: edit preflight resolves service row once and reuses it', () => {
  const start = source.indexOf('// S2384: resolve the edited service row once');
  const end = source.indexOf('const _editSessionKeyBefore=', start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  assert.match(block, /_editSessionSourceBefore=.*D\.servisLogs\.find\(y=>y&&y\.id===Servis\.editId\)/);
  assert.match(block, /const existingService=Servis\.editId \? _editSessionSourceBefore : null/);
  assert.equal((block.match(/D\.servisLogs\.find/g)||[]).length, 1, 'one service-log scan only');
});

test('S2384: fallback category compatibility reuses the same original row', () => {
  const start = source.indexOf('if(Servis.editId!==null&&!matched){');
  const end = source.indexOf('const _preSaveChecklistPayload=', start);
  const block = source.slice(start, end);
  assert.match(block, /const existing=_editSessionSourceBefore/);
  assert.doesNotMatch(block, /D\.servisLogs\.find/);
});

test('S2384: lookup keeps first non-null row with strict ID equality', () => {
  const rows = [null, {id:'edit', item:'first'}, {id:'edit', item:'second'}];
  const legacy = rows.find(y => y && y.id === 'edit');
  const indexedOnce = rows.find(y => y && y.id === 'edit');
  assert.equal(indexedOnce, legacy);
  assert.equal(indexedOnce.item, 'first');
});
