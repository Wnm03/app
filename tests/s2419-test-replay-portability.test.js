'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('S2419 test/replay portability contract passes from repository root', () => {
  const result = spawnSync(process.execPath, ['scripts/audit-test-replay-portability.js'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /TEST REPLAY PORTABILITY: PASS/);
});
