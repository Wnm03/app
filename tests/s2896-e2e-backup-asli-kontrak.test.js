'use strict';
// S2896: kontrak e2e permanen backup asli (tanpa browser/data pribadi): skrip ada, terdaftar di package.json, dan skip bersih bila BACKUP tidak diberikan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'e2e', 's2896-backup-asli.js');

test('skrip e2e backup asli ada dan terdaftar sebagai npm run test:e2e:backup', () => {
  assert.ok(fs.existsSync(SCRIPT));
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:e2e:backup'], 'node e2e/s2896-backup-asli.js');
});

test('tanpa BACKUP: exit 3 (dilewati); dengan E2E_SKIP_OK=1: exit 0', () => {
  const env = { ...process.env }; delete env.BACKUP; delete env.E2E_BACKUP;
  const a = cp.spawnSync(process.execPath, [SCRIPT], { env: { ...env, E2E_SKIP_OK: '' }, encoding: 'utf8' });
  assert.equal(a.status, 3);
  assert.match(a.stdout, /E2E-BACKUP SKIP/);
  const b = cp.spawnSync(process.execPath, [SCRIPT], { env: { ...env, E2E_SKIP_OK: '1' }, encoding: 'utf8' });
  assert.equal(b.status, 0);
});

test('skrip tidak menulis/menyalin data backup ke repo dan tidak menyimpan angka pribadi selain angka emas bersyarat SHA-256', () => {
  const src = fs.readFileSync(SCRIPT, 'utf8');
  assert.ok(!/writeFileSync|copyFileSync|appendFileSync/.test(src), 'e2e tidak boleh menulis file');
  assert.match(src, /GOLDEN_SHA/);
  assert.match(src, /if \(GOLDEN\) ck\(/);
});
