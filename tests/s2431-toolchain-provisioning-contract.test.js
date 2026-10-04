const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

test('S2431 pins npm package manager and engine exactly', () => {
  assert.equal(pkg.packageManager, 'npm@10.9.2');
  assert.equal(pkg.engines?.npm, '10.9.2');
});

test('S2431 keeps direct release tools exact-pinned', () => {
  assert.equal(pkg.devDependencies?.eslint, '9.19.0');
  assert.equal(pkg.devDependencies?.esbuild, '0.24.0');
});

test('S2431 does not treat package-manager pin as a lockfile substitute', () => {
  const hasLock = fs.existsSync(path.join(ROOT, 'package-lock.json')) ||
    fs.existsSync(path.join(ROOT, 'npm-shrinkwrap.json'));
  assert.equal(hasLock, false, 'fixture should remain explicit about missing lockfile');
});
