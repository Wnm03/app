#!/usr/bin/env node
'use strict';
/**
 * Read-only production performance profile.
 *
 * This deliberately does not inject runtime instrumentation into the app.
 * It combines release artifact size/budget measurements with the existing
 * hot-path regression contracts so profiling cannot change application timing.
 * Real browser/device timing (startup, IndexedDB, large DOM lists, outbox
 * replay) should be collected separately with DevTools on a production build.
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');

const ROOT = path.resolve(__dirname, '..');
const artifacts = [
  'index.html', 'app_production.html', 'styles.css',
  'app-bundle-a.min.js', 'app-bundle-b.min.js', 'sw.js'
];
const contractTests = [
  'tests/s1842-performance-pipeline.test.js',
  'tests/s1843-performance-deep-optimization.test.js',
  'tests/s1844-performance-hotpaths.test.js',
  'tests/s1851-performance-regression-hardening.test.js',
  'tests/s1891-pwa-performance-contract.test.js',
  'tests/s1900-performance-memory.test.js',
  'tests/pwa-ui-performance-budget-contract.test.js'
];

function bytes(rel) { return fs.statSync(path.join(ROOT, rel)).size; }
function pct(actual, budget) { return `${(actual / budget * 100).toFixed(1)}%`; }

const budgets = {
  'index.html': 320000,
  'app_production.html': 320000,
  'styles.css': 180000,
  'app-bundle-a.min.js': 1600000,
  'app-bundle-b.min.js': 5000000,
};

console.log('PRODUCTION PERFORMANCE PROFILE S2246');
console.log(`timestamp=${new Date().toISOString()}`);
console.log('artifact-bytes:');
for (const rel of artifacts) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { console.log(`  ${rel}: MISSING`); continue; }
  const size = bytes(rel);
  console.log(`  ${rel}: ${size}${budgets[rel] ? ` / ${budgets[rel]} (${pct(size, budgets[rel])})` : ''}`);
}

console.log('performance-contract-tests:');
let failed = false;
for (const rel of contractTests) {
  const started = performance.now();
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', rel], {
    cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  });
  const elapsed = performance.now() - started;
  const output = `${r.stdout || ''}\n${r.stderr || ''}`;
  const tests = Number((output.match(/# tests (\d+)/) || [])[1] || 0);
  const pass = Number((output.match(/# pass (\d+)/) || [])[1] || 0);
  const fail = Number((output.match(/# fail (\d+)/) || [])[1] || 0);
  console.log(`  ${rel}: ${tests} tests, ${pass} pass, ${fail} fail, ${elapsed.toFixed(1)}ms`);
  if (r.status !== 0 || fail !== 0) failed = true;
}

console.log('profile-scope=read-only');
console.log('browser-device-profiling-required=startup,idb-large-read-write,large-list-render,outbox-replay');
if (failed) process.exit(1);
