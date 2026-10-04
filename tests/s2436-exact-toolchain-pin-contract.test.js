const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

function assertExactPin(name, value) {
  assert.equal(typeof value, 'string', `${name} must be a string`);
  assert.match(value, /^\d+\.\d+\.\d+$/, `${name} must be an exact semver pin, got ${value}`);
}

test('S2436 keeps direct release tools exact-pinned without range operators', () => {
  assertExactPin('eslint', pkg.devDependencies?.eslint);
  assertExactPin('esbuild', pkg.devDependencies?.esbuild);
  assert.equal(pkg.devDependencies.eslint, '9.19.0');
  assert.equal(pkg.devDependencies.esbuild, '0.24.0');
});
