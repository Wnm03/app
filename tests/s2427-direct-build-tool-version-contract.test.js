'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

test('S2427 build tools are exact-pinned direct dependencies', () => {
  assert.equal(pkg.devDependencies?.eslint, '9.19.0');
  assert.equal(pkg.devDependencies?.esbuild, '0.24.0');
  assert.doesNotMatch(pkg.devDependencies?.eslint ?? '', /^[~^]/);
  assert.doesNotMatch(pkg.devDependencies?.esbuild ?? '', /^[~^]/);
});

test('S2427 does not pretend direct pins replace the required lockfile', () => {
  const hasLock = fs.existsSync(path.join(ROOT, 'package-lock.json')) ||
    fs.existsSync(path.join(ROOT, 'npm-shrinkwrap.json'));
  assert.equal(hasLock, false, 'fixture must reflect the current no-lockfile baseline');
});
