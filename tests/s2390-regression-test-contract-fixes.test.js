'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const report = fs.readFileSync(path.join(root, 'AUDIT-S2390-REGRESSION-TEST-CONTRACT-FIXES.md'), 'utf8');
const manifest = fs.readFileSync(path.join(root, 'PATCH-MANIFEST-S2369-S2390-CUMULATIVE.txt'), 'utf8');
test('S2390 records fixture and static-contract repairs without runtime changes', () => {
  for (const file of ['financial-audit-presenter.test.js', 's2287-cross-domain-idempotency-sweep.js', 's2288-cross-domain-retry-recovery.js', 'service-checklist-component-catalog-session-s2000.test.js']) assert.ok(report.includes(file), file);
  assert.match(report, /Tidak ada runtime source atau bundle yang diubah/);
});
test('S2390 keeps delete manifest and prior cumulative sessions', () => {
  assert.match(manifest, /# S2389 — cumulative regression audit/);
  assert.match(manifest, /# S2390 — regression test contract fixes/);
  assert.match(fs.readFileSync(path.join(root, 'DELETE-FILES.txt'), 'utf8'), /pro-ui-layer\.css/);
});
