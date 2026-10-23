'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');

test('S2715 inventory walker excludes local resumable test checkpoints', () => {
  const source = fs.readFileSync(path.join(ROOT, 'scripts/build-lints.js'), 'utf8');
  assert.match(source, /name\s*===\s*'\.test-checkpoints'/,
    'local checkpoint JSON must not contaminate source inventory counts');
});

test('S2715 first coverage baseline matches the canonical inventory labels', () => {
  const doc = fs.readFileSync(path.join(ROOT, 'docs/AUDIT_MATRIX.md'), 'utf8');
  const counts = { 'Total files': 3789, JavaScript: 2095, Markdown: 1407, HTML: 7, JSON: 31, CSS: 4 };
  for (const [label, expected] of Object.entries(counts)) {
    const re = new RegExp('\\|\\s*' + label + '\\s*\\|\\s*(\\d+)\\s*\\|');
    const m = doc.match(re);
    assert.ok(m, `missing first baseline row: ${label}`);
    assert.equal(Number(m[1]), expected, `first baseline row drift: ${label}`);
  }
});
