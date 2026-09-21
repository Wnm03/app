'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

test('PWA UI layer stays within the 15 KB performance budget', () => {
  const file = path.join(ROOT, 'pwa-ui-layer.css');
  const bytes = fs.statSync(file).size;
  assert.ok(bytes <= 15000, `pwa-ui-layer.css is ${bytes} bytes; budget is 15000`);
});

test('PWA UI layer remains dependency-free and loaded by both runtime shells', () => {
  const css = fs.readFileSync(path.join(ROOT, 'pwa-ui-layer.css'), 'utf8');
  assert.doesNotMatch(css, /@import\s+url\(/i);
  for (const html of ['index.html', 'app_production.html']) {
    const src = fs.readFileSync(path.join(ROOT, html), 'utf8');
    assert.match(src, /pwa-ui-layer\.css/);
  }
});
