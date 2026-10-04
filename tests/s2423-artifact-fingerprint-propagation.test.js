const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const script = path.join(ROOT, 'scripts', 'audit-artifact-fingerprint-propagation.js');

test('S2423 propagation audit is read-only and covers the full artifact chain', () => {
  const src = fs.readFileSync(script, 'utf8');
  assert.match(src, /READ ONLY/);
  assert.match(src, /APP_BUILD_VERSION/);
  assert.match(src, /index\.html/);
  assert.match(src, /app_production\.html/);
  assert.match(src, /CACHE_NAME/);
  assert.match(src, /app-bundle-a\.min\.js/);
  assert.match(src, /app-bundle-b\.min\.js/);
  assert.doesNotMatch(src, /writeFileSync/);
  assert.doesNotMatch(src, /child_process.*build\.js/);
});

test('S2423 audit executes from an external CWD without depending on process.cwd()', () => {
  const r = spawnSync(process.execPath, [script], { cwd: '/tmp', encoding: 'utf8' });
  assert.notEqual(r.status, 0, 'known stale Bundle-B should keep the current release state blocked');
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  assert.match(out, /canonical=s2041-1-part-sot-hardening-2225/);
  assert.match(out, /app-bundle-b\.min\.js/);
  assert.match(out, /embedded=221da3874ea0ea76/);
  assert.match(out, /current=5b56fd2ba8a8d1ce/);
  assert.match(out, /S2423 ARTIFACT PROPAGATION: BLOCKED/);
});
