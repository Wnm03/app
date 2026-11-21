'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const cp = require('child_process');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const S = path.join(ROOT, 'e2e', 's2897-konsistensi-pemilik.js');
const { periksa } = require(S);
test('terdaftar di package.json; tanpa BACKUP exit 3, dengan E2E_SKIP_OK=1 exit 0', () => {
  assert.equal(require('../package.json').scripts['test:e2e:pemilik'], 'node e2e/s2897-konsistensi-pemilik.js');
  const env = { ...process.env }; delete env.BACKUP; delete env.E2E_BACKUP;
  assert.equal(cp.spawnSync(process.execPath, [S], { env: { ...env, E2E_SKIP_OK: '' } }).status, 3);
  assert.equal(cp.spawnSync(process.execPath, [S], { env: { ...env, E2E_SKIP_OK: '1' } }).status, 0);
});
test('periksa: tipe FAMILY/SELF diabaikan; nama basi, ID hilang, ID utang beda, nama ganda terdeteksi', () => {
  const ok = { ownerRegistry: [{ id: 'o1', name: 'A' }], debts: [{ name: 'Keluarga', linkedOwnerId: 'FAMILY' }], assets: [{ id: 1, owners: [{ ownerId: 'o1', ownerName: 'A' }] }] };
  assert.deepEqual(periksa(ok), []);
  const bad = { ownerRegistry: [{ id: 'o1', name: 'A' }, { id: 'o2', name: 'a' }], assets: [{ id: 1, owners: [{ ownerId: 'o1', ownerName: 'Lama' }, { ownerId: 'zz', ownerName: 'X' }] }],
    debts: [{ name: 'A', renovBagiProjectId: 'p', linkedOwnerId: 'o1', renovBagiOwnerId: 'o2' }] };
  assert.equal(periksa(bad).length, 4);
});
