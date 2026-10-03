'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const report = fs.readFileSync(path.join(root, 'AUDIT-S2389-CUMULATIVE-REGRESSION-AUDIT.md'), 'utf8');
const manifest = fs.readFileSync(path.join(root, 'PATCH-MANIFEST-S2369-S2388-CUMULATIVE.txt'), 'utf8');
test('S2389 records the verified cumulative regression gates', () => {
  for (const gate of ['verify-patch-integrity.js', 'verify-delete-manifest.js', 'verify-version-integrity.js', 'persistence-integrity-gate.js', 'pwa-recovery-integrity-gate.js', 'feature-regression-gate.js', 'architecture-integrity-gate.js', 'release-ui-gate.js']) assert.match(report, new RegExp(gate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
test('S2389 explicitly records release blockers and unknown full-suite status', () => {
  assert.match(report, /ESLint tidak tersedia/);
  assert.match(report, /esbuild.*tidak tersedia/);
  assert.match(report, /tidak selesai dalam batas waktu 180 detik/);
  assert.match(report, /BELUM TERVERIFIKASI/);
});
test('S2389 is appended to the cumulative manifest without replacing delete history', () => {
  assert.match(manifest, /# S2388 — audit and repair cumulative-chain manifest\/readme completeness/);
  assert.match(fs.readFileSync(path.join(root, 'DELETE-FILES.txt'), 'utf8'), /pro-ui-layer\.css/);
});
