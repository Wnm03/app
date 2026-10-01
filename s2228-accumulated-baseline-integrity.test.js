'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, 'ACCUMULATION-MANIFEST-S2180-S2227.md');

function readManifestEntries() {
  const text = fs.readFileSync(MANIFEST, 'utf8');
  return [...text.matchAll(/^([0-9a-f]{64})\s+\.\/(.+)$/gm)].map((m) => ({
    expected: m[1],
    relativePath: m[2],
  }));
}

test('S2228 — uploaded baseline exactly matches cumulative S2180–S2227 manifest', () => {
  const entries = readManifestEntries();
  assert.equal(entries.length, 157, 'unexpected cumulative manifest entry count');

  const mismatches = [];
  for (const entry of entries) {
    const file = path.join(ROOT, entry.relativePath);
    if (!fs.existsSync(file)) {
      mismatches.push(`${entry.relativePath}: MISSING`);
      continue;
    }
    const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (actual !== entry.expected) mismatches.push(`${entry.relativePath}: HASH_MISMATCH`);
  }

  assert.deepEqual(mismatches, [], mismatches.join('\n'));
});

test('S2228 — S2226/S2227 production and regression anchors are present', () => {
  const required = [
    'modules/finance/finance-event-outbox.js',
    'modules/finance/finance-cross-entity-atomic.js',
    'modules/finance/titipan-expense-flow.js',
    'modules/finance/tagihan-kalender.js',
    'modules/finance/tx-list-cashflow.js',
    'modules/shared/backup-restore.js',
    'tests/s2226-commit-after-save-failure-rollback.test.js',
    'tests/s2227-finance-sot-production-wiring.test.js',
    'AUDIT-S2226-FULLTEST-REGRESSION-ATOMIC-RESTORE.md',
    'AUDIT-S2227-FINANCE-SOT-PRODUCTION-WIRING.md',
  ];
  for (const relativePath of required) {
    assert.equal(fs.existsSync(path.join(ROOT, relativePath)), true, relativePath);
  }
});
