const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

test('S2511 baseline bundle freshness gate passes after cumulative rebuild', () => {
  const out = execFileSync(process.execPath, ['scripts/verify-bundle-freshness.js'], {
    cwd: process.cwd(), encoding: 'utf8'
  });
  assert.match(out, /Semua bundle segar/);
});
