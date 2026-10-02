'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

test('S2273: static lazy-boundary audit passes with zero known unguarded consumers', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'audit-lazy-boundaries.js')], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, `${r.stdout || ''}${r.stderr || ''}`);
  assert.match(r.stdout, /No known unguarded eager→lazy consumer boundary found/);
});
