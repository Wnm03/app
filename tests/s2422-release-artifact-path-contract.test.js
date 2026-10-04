'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');

test('S2422 release/build artifact path contract passes from repository root', () => {
  const out = execFileSync(process.execPath, ['scripts/audit-release-artifact-path-contract.js'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.match(out, /RELEASE ARTIFACT PATH CONTRACT: PASS/);
});

test('S2422 release/build artifact path contract is independent of caller CWD', () => {
  const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts/audit-release-artifact-path-contract.js')], {
    cwd: require('node:os').tmpdir(),
    encoding: 'utf8',
  });
  assert.match(out, /RELEASE ARTIFACT PATH CONTRACT: PASS/);
});
