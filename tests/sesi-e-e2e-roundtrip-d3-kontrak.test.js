'use strict';
// Sesi E (v2925+): kontrak e2e permanen round-trip backup + D3 via pembayaran tagihan (tanpa browser/data pribadi):
// skrip ada, terdaftar di package.json, skip bersih bila BACKUP tidak diberikan, dan tidak menulis file / tidak menyimpan angka pribadi.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'e2e', 'sesi-e-roundtrip-d3.js');

test('skrip e2e Sesi E ada dan terdaftar sebagai npm run test:e2e:sesi-e', () => {
  assert.ok(fs.existsSync(SCRIPT));
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:e2e:sesi-e'], 'node e2e/sesi-e-roundtrip-d3.js');
  assert.match(fs.readFileSync(path.join(ROOT, 'e2e', 'README.md'), 'utf8'), /test:e2e:sesi-e/);
});

test('tanpa BACKUP: exit 3 (dilewati); dengan E2E_SKIP_OK=1: exit 0', () => {
  const env = { ...process.env }; delete env.BACKUP; delete env.E2E_BACKUP;
  const a = cp.spawnSync(process.execPath, [SCRIPT], { env: { ...env, E2E_SKIP_OK: '' }, encoding: 'utf8' });
  assert.equal(a.status, 3);
  assert.match(a.stdout, /E2E-SESI-E SKIP/);
  const b = cp.spawnSync(process.execPath, [SCRIPT], { env: { ...env, E2E_SKIP_OK: '1' }, encoding: 'utf8' });
  assert.equal(b.status, 0);
});

test('skrip tidak menulis/menyalin data backup dan memuat tiga bagian (round-trip, D3 via markBillPaid, varian backup)', () => {
  const src = fs.readFileSync(SCRIPT, 'utf8');
  assert.ok(!/writeFileSync|copyFileSync|appendFileSync/.test(src), 'e2e tidak boleh menulis file');
  assert.match(src, /buildBackupPayload/);
  assert.match(src, /#restoreFileInput/);
  assert.match(src, /markBillPaid\('bill_e2e_d3'\)/);
  for (const v of ['C1.', 'C2.', 'C3.']) assert.ok(src.includes(v), 'varian ' + v + ' hilang');
  assert.ok(!/acc_homein_\d+|1104482|4976231/.test(src), 'tidak menyimpan angka/ID pribadi backup');
});
