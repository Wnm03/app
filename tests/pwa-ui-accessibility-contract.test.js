'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('S1882 UI interaction hardening has visible focus, safe-area, and reduced-motion contracts', () => {
  const css = read('pwa-ui-layer.css');
  assert.match(css, /:focus-visible/);
  assert.match(css, /outline:\s*3px solid var\(--accent\)/);
  assert.match(css, /env\(safe-area-inset-top/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /forced-colors:\s*active/);
});

test('S1882 does not introduce a framework, external CSS, or new runtime dependency', () => {
  const css = read('pwa-ui-layer.css');
  assert.doesNotMatch(css, /@import\s+url\(/i);
  assert.doesNotMatch(css, /https?:\/\//i);
});
