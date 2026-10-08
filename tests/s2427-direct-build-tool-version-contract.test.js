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

test('S2427 requires the reproducibility lockfile alongside direct pins', () => {
  const lockPath = path.join(ROOT, 'package-lock.json');
  assert.equal(fs.existsSync(lockPath), true, 'package-lock.json is required for reproducible npm ci');
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  assert.equal(lock.lockfileVersion, 3);
  assert.equal(lock.packages?.['']?.devDependencies?.eslint, '9.19.0');
  assert.equal(lock.packages?.['']?.devDependencies?.esbuild, '0.24.0');
  assert.equal(lock.packages?.['']?.optionalDependencies?.['@esbuild/linux-x64'], '0.24.0');
  const native = lock.packages?.['node_modules/@esbuild/linux-x64'];
  assert.equal(native?.version, '0.24.0');
  assert.equal(native?.optional, true);
  assert.deepEqual(native?.cpu, ['x64']);
  assert.deepEqual(native?.os, ['linux']);
});
