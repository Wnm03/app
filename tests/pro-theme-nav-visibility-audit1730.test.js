const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'pro-ui-layer.css'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const prod = fs.readFileSync(path.join(ROOT, 'app_production.html'), 'utf8');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

test('1730: Pro theme does not globally hide the app main navigation', () => {
  assert.match(css, /\[data-theme="pro"\]\s*#mainNav\s*\{\s*display:flex!important;\s*\}/);
  assert.doesNotMatch(css, /\[data-theme="pro"\]\s*#mainNav\s*\{\s*display:none!important;\s*\}/);
});

test('1730: only active Car Notes Pro may suppress the global nav', () => {
  assert.match(css, /body\[data-theme="pro"\]:has\(#page-carnotes\.active\)\s*#mainNav\s*\{\s*display:none!important;\s*\}/);
  assert.match(css, /@supports selector\(body:has\(#page-carnotes\.active\)\)/);
});

test('1730: both HTML entry points use fresh asset version', () => {
  assert.match(index, /pro-ui-layer\.css\?v=1730/);
  assert.match(prod, /pro-ui-layer\.css\?v=1730/);
  assert.doesNotMatch(index, /\?v=1728/);
  assert.doesNotMatch(prod, /\?v=1728/);
});

test('1730: service worker cache is bumped', () => {
  assert.match(sw, /kw-cache-v1730/);
});
