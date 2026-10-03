'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const manifest = fs.readFileSync(path.join(root, 'PATCH-MANIFEST-S2369-S2388-CUMULATIVE.txt'), 'utf8');

test('S2388: cumulative manifest lists every session S2369 through S2387 in order', () => {
  const ids = manifest.split('\n').filter(line => line.startsWith('# S23')).map(line => Number(line.match(/^# S(\d+)/)[1])).filter(id => id >= 2369 && id <= 2387);
  assert.deepEqual(ids, Array.from({ length: 19 }, (_, i) => 2369 + i));
});

test('S2388: every session has an audit document and test referenced in manifest', () => {
  const blocks = manifest.split(/(?=^# S23\d+ —)/m).slice(0, 19);
  assert.equal(blocks.length, 19);
  for (const block of blocks) {
    const lines = block.split('\n');
    const testPath = lines.find(line => line.startsWith('A tests/s23') && line.endsWith('.test.js'))?.slice(2);
    const auditPath = lines.find(line => line.startsWith('A AUDIT-S23') && line.endsWith('.md'))?.slice(2);
    assert.ok(testPath, `missing test in ${lines[0]}`);
    assert.ok(auditPath, `missing audit in ${lines[0]}`);
    assert.ok(fs.existsSync(path.join(root, testPath)), `missing ${testPath}`);
    assert.ok(fs.existsSync(path.join(root, auditPath)), `missing ${auditPath}`);
  }
});

test('S2388: deletion manifest still preserves the historical CSS deletion', () => {
  assert.equal(fs.readFileSync(path.join(root, 'DELETE-FILES.txt'), 'utf8').trim(), 'pro-ui-layer.css');
});
