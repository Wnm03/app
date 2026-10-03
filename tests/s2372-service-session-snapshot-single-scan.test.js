'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../modules/vehicle/servis.js'), 'utf8');

test('S2372: snapshot rows are filtered once and indexed without filter/indexOf in the loop', () => {
  const start = source.indexOf('const _sessionRowsToSnapshot=');
  const end = source.indexOf('\nsave({domain:\'servis\'', start);
  assert.ok(start >= 0 && end > start, 'new-session snapshot block exists');
  const block = source.slice(start, end);
  assert.equal((block.match(/D\.servisLogs\.slice\(_newSessionLogStartIndex\)\.filter\(/g) || []).length, 1,
    'new-session rows are filtered once from the append boundary');
  assert.match(block, /for\(let _rowIndex=0;_rowIndex<_sessionRowsToSnapshot\.length;_rowIndex\+\+\)/);
  assert.match(block, /_savedRow=_sessionRowsToSnapshot\[_rowIndex\]/);
  assert.match(block, /if\(_rowIndex<_rowIdempotencyKeys\.length\)_savedRow\.idempotencyKey=_rowIdempotencyKeys\[_rowIndex\]/);
  assert.doesNotMatch(block, /D\.servisLogs\.filter\([^\n]*\)\.indexOf\(/,
    'idempotency index must not trigger a second filter');
});

test('S2372: row-to-idempotency mapping follows session row order and ignores other sessions', () => {
  const logs = [
    { id: 'other', sessionId: 'other' },
    { id: 'a', sessionId: 'current' },
    { id: 'b', sessionId: 'current' },
    { id: 'c', sessionId: 'current' },
  ];
  const keys = ['key-a', 'key-b'];
  const rows = logs.filter(x => x && x.sessionId === 'current');
  rows.forEach((row, index) => { if (index < keys.length) row.idempotencyKey = keys[index]; });
  assert.deepEqual(rows.map(x => [x.id, x.idempotencyKey || null]), [
    ['a', 'key-a'], ['b', 'key-b'], ['c', null],
  ]);
  assert.equal(logs[0].idempotencyKey, undefined);
});
