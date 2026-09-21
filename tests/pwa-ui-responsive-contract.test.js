'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('PWA UI layer is structural, responsive, and dependency-free', () => {
  const css = read('pwa-ui-layer.css');
  assert.match(css, /@media\s*\(max-width:\s*899px\)/);
  assert.match(css, /@media\s*\(min-width:\s*900px\)/);
  assert.match(css, /#scrollRoot\s*\{/);
  assert.match(css, /\.nav\s*\{/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.doesNotMatch(css, /@import\s+url\(/);
});

test('PWA UI layer is linked by both runtime HTML shells and precached by SW', () => {
  const index = read('index.html');
  const prod = read('app_production.html');
  const sw = read('sw.js');
  assert.match(index, /href="pwa-ui-layer\.css\?v=1880"/);
  assert.match(prod, /href="pwa-ui-layer\.css\?v=1880"/);
  assert.match(sw, /['"]\.\/pwa-ui-layer\.css['"]/);
});

test('PWA UI shell preserves existing navigation hooks and avoids retired Pro UI layer', () => {
  const index = read('index.html');
  const prod = read('app_production.html');
  assert.match(index, /class="nav(?:\s|")/);
  assert.match(prod, /class="nav(?:\s|")/);
  assert.match(index, /data-action=/);
  assert.match(prod, /data-action=/);
  assert.doesNotMatch(index, /pro-ui-layer\.css/);
  assert.doesNotMatch(prod, /pro-ui-layer\.css/);
});

test('PWA UI desktop/mobile layout has explicit overflow safeguards', () => {
  const css = read('pwa-ui-layer.css');
  assert.match(css, /overflow-y:\s*auto/);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /-webkit-overflow-scrolling:\s*touch/);
  assert.match(css, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
});
