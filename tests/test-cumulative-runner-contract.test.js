'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const runner = fs.readFileSync(path.join(ROOT, 'scripts', 'test-cumulative.js'), 'utf8');

const testFiles = fs.readdirSync(path.join(ROOT, 'tests')).filter(name => name.endsWith('.test.js')).sort();

test('cumulative runner discovers the complete test inventory deterministically', () => {
  assert.ok(testFiles.length > 700, `unexpectedly small test inventory: ${testFiles.length}`);
  assert.match(runner, /readdirSync\(TEST_DIR\)/);
  assert.match(runner, /filter\(name => name\.endsWith\('\.test\.js'\)\)/);
  assert.match(runner, /\.sort\(\)/);
});

test('cumulative runner supports bounded resume ranges and machine-readable reports', () => {
  assert.match(runner, /TEST_START_CHUNK/);
  assert.match(runner, /TEST_END_CHUNK/);
  assert.match(runner, /TEST_CUMULATIVE_REPORT/);
  assert.match(runner, /invalid chunk range/);
  assert.match(runner, /JSON\.stringify\(report/);
  assert.match(runner, /inventoryHash/);
  assert.match(runner, /TEST_CUMULATIVE_PLAN/);
});

test('cumulative runner validates full-range inventory coverage before execution', () => {
  assert.match(runner, /duplicateFiles/);
  assert.match(runner, /missingFiles/);
  assert.match(runner, /inventory coverage mismatch/);
});
