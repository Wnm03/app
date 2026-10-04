'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('S2424: Bundle-B fixed release budget matches authoritative performance budget', () => {
  const config = JSON.parse(read('config/release-budgets.json'));
  const performance = read('scripts/performance-budget.js');
  const m = performance.match(/['"]app-bundle-b\.min\.js['"]\s*:\s*(\d[\d_]*)/);
  assert.ok(m, 'performance-budget.js must declare Bundle-B budget');
  const authoritative = Number(m[1].replace(/_/g, ''));
  assert.equal(config.bundle_budget_bytes['app-bundle-b.min.js'], authoritative,
    'fixed release-hardening budget must match the authoritative performance budget');
  assert.equal(authoritative, 5_000_000,
    'authoritative Bundle-B budget is 5,000,000 bytes');
});
