const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const audit = path.join(ROOT, 'scripts', 'release-contract-audit.js');

test('S2417 release-contract audit is present and read-only', () => {
  assert.equal(fs.existsSync(audit), true);
  const src = fs.readFileSync(audit, 'utf8');
  assert.match(src, /READ ONLY/i);
  assert.match(src, /verify-bundle-freshness\.js/);
  assert.match(src, /performance-budget\.js/);
  assert.match(src, /reproducible-build/);
  assert.match(src, /dependency-lockfile/);
  assert.match(src, /package-lock\.json/);
  assert.match(src, /npm-shrinkwrap\.json/);
  assert.doesNotMatch(src, /build-atomic\.js/);
  assert.doesNotMatch(src, /npm install/);
});

test('S2417 package contract exposes audit:release-contract', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['audit:release-contract'], 'node scripts/release-contract-audit.js');
});
