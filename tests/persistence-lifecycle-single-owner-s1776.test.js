const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const runtime = fs.readFileSync('modules/shared/app-init-runtime.js','utf8');
const persistence = fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');

test('S1776: persistence lifecycle has a single global owner', () => {
  assert.equal((runtime.match(/addEventListener\(/g)||[]).length, 0,
    'app bootstrap runtime must not install duplicate global lifecycle listeners');
  assert.match(persistence, /document\.addEventListener\('freeze',flush\)/);
  assert.match(persistence, /document\.addEventListener\('visibilitychange',[\s\S]*?flush\(\)/);
  assert.match(persistence, /window\.addEventListener\('pagehide',flush\)/);
  assert.match(persistence, /window\.addEventListener\('beforeunload',flush\)/);
  assert.match(persistence, /if\(_lifecycleFlushInstalled\|\|/);
});
