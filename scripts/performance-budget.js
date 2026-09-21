#!/usr/bin/env node
'use strict';
/**
 * Release guard: prevents the cumulative app from getting heavier while
 * architectural lazy-loading work is rolled out incrementally.
 * This script is intentionally read-only: it never edits runtime files.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const bytes = (p) => fs.statSync(path.join(ROOT, p)).size;
const budgets = {
  'index.html': 320_000,
  'app_production.html': 320_000,
  'styles.css': 180_000,
  'modern-ui-layer.css': 35_000,
  'minimal-ui-theme.css': 8_000,
  'pwa-ui-layer.css': 15_000,
  'app-bundle-a.min.js': 1_600_000,
  'app-bundle-b.min.js': 5_000_000,
};
let failed = false;
for (const [file, max] of Object.entries(budgets)) {
  if (!fs.existsSync(path.join(ROOT, file))) {
    console.error(`✗ PERF BUDGET missing: ${file}`);
    failed = true;
    continue;
  }
  const actual = bytes(file);
  const pct = (actual / max * 100).toFixed(1);
  if (actual > max) {
    console.error(`✗ PERF BUDGET ${file}: ${actual} > ${max} bytes (${pct}% budget)`);
    failed = true;
  } else {
    console.log(`✓ PERF BUDGET ${file}: ${actual} / ${max} bytes (${pct}% budget)`);
  }
}
if (failed) process.exit(1);
console.log('✓ Performance budget gate PASS');
