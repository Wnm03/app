'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT,p),'utf8');

test('S1907 cumulative patch retains the S1904 global error-banner sanitization',()=>{
  const s=read('modules/shared/boot-early.js');
  assert.match(s,/window\.__showRuntimeErrorBanner\(msg\);/);
  assert.doesNotMatch(s,/window\.__showRuntimeErrorBanner\(msg\+loc\);/);
});

test('S1907 cumulative patch contains both production bundles and prior regression tests',()=>{
  for(const p of ['app-bundle-a.min.js','app-bundle-b.min.js','tests/s1902-pwa-runtime-error-hardening.test.js','tests/s1903-carnotes-bundle-routing-cache.test.js','tests/s1904-runtime-integrity-hardening.test.js','tests/s1905-baseline-runtime-integrity.test.js','tests/s1906-runtime-null-guard-regression.test.js']) assert.ok(fs.existsSync(path.join(ROOT,p)),p+' missing from cumulative patch');
});
