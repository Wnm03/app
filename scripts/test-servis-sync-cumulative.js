#!/usr/bin/env node
/**
 * Cumulative service/reminder test runner.
 * Run from app-main root:
 *   node scripts/test-servis-sync-cumulative.js
 *
 * It executes the session-specific regression tests shipped in this patch.
 * Build itself remains the project's normal `npm run build`; this runner
 * intentionally does not mutate source or data.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const tests = [
  'tests/servis-checklist-saveall-sesi2a.test.js',
  'tests/servis-checklist-history-summary-sesi2b.test.js',
  'tests/servis-history-responsive-sesi2c.test.js',
  'tests/servis-history-interaction-sesi2d.test.js',
  'tests/servis-checklist-category-warning-sesi2a3.test.js',
  'tests/servis-category-integrity-sesi3a.test.js',
  'tests/servis-canonical-category-link-sesi3b.test.js',
  'tests/servis-unified-service-event-sesi3c.test.js',
  'tests/servis-reminder-history-sync-sesi3d.test.js',
  'tests/data-health-check-servis-reminder-sesi3e.test.js',
  'tests/servis-history-reminder-link-sesi3f.test.js',
].filter(f => fs.existsSync(path.join(root, f)));

if (!tests.length) {
  console.error('No cumulative service/reminder tests found.');
  process.exit(2);
}

console.log(`Running ${tests.length} cumulative service/reminder test files...`);
const r = spawnSync(process.execPath, ['--test', ...tests], { stdio: 'inherit' });
process.exit(r.status === null ? 1 : r.status);
