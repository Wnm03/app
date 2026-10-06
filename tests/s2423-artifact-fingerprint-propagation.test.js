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
  assert.ok(r.status===0||r.status===1, 'audit harus selesai normal atau memblokir release; bukan crash/path error');
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  assert.match(out, /canonical=s2041-1-part-sot-hardening-\d+/);
  assert.match(out, /app-bundle-b\.min\.js/);
  assert.match(out, /S2423 ARTIFACT PROPAGATION: (PASS|BLOCKED)/);
});
