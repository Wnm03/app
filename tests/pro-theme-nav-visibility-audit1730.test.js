const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'pro-ui-layer.css'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const prod = fs.readFileSync(path.join(ROOT, 'app_production.html'), 'utf8');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

test('1731: Pro theme does not globally hide the app main navigation', () => {
  assert.match(css, /\[data-theme="pro"\]\s*#mainNav\s*\{\s*display:flex!important;\s*\}/);
  assert.doesNotMatch(css, /\[data-theme="pro"\]\s*#mainNav\s*\{\s*display:none!important;\s*\}/);
});

test('1731: only active Car Notes Pro may suppress the global nav', () => {
  assert.match(css, /body\[data-theme="pro"\]:has\(#page-carnotes\.active\)\s*#mainNav\s*\{\s*display:none!important;\s*\}/);
  assert.match(css, /@supports selector\(body:has\(#page-carnotes\.active\)\)/);
});

test('1731: both HTML entry points use the current explicit build version', () => {
  const indexVersion = (index.match(/pro-ui-layer\.css\?v=(\d+)/) || [])[1];
  const prodVersion = (prod.match(/pro-ui-layer\.css\?v=(\d+)/) || [])[1];
  assert.ok(indexVersion, 'index.html harus memiliki versi asset pro-ui-layer');
  assert.ok(prodVersion, 'app_production.html harus memiliki versi asset pro-ui-layer');
  assert.equal(indexVersion, prodVersion);
  assert.match(index, new RegExp('pro-ui-layer\\.css\\?v=' + indexVersion));
  assert.match(prod, new RegExp('pro-ui-layer\\.css\\?v=' + indexVersion));
});

test('1731: service worker cache memakai versi build yang sama dengan HTML', () => {
  const indexVersion = (index.match(/pro-ui-layer\.css\?v=(\d+)/) || [])[1];
  const swVersion = (sw.match(/kw-cache-v(\d+)/) || [])[1];
  assert.ok(indexVersion);
  assert.equal(swVersion, indexVersion);
});
