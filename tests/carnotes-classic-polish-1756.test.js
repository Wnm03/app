const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('Car Notes classic polish: scoped presentation layer and compact vehicle summary', () => {
  const html = read('index.html');
  const css = read('styles.css');
  assert.match(html, /id="page-carnotes"/);
  assert.match(html, /class="page" id="page-carnotes"/);
  assert.match(html, /class="cn-vehicle-summary"/);
  assert.match(html, /id="cnCurKm"[^>]*data-action="startEditCurKm"/);
  assert.match(html, /data-action="openKmModal"/);
  assert.match(html, /data-action="VehicleCatalogUI\.open"/);
  assert.match(css, /#page-carnotes\s*\{/);
  assert.match(css, /#page-carnotes \.cn-vehicle-summary/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('Car Notes classic polish: accessibility and mobile touch targets', () => {
  const css = read('styles.css');
  assert.match(css, /min-height:44px/);
  assert.match(css, /focus-visible/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /max-width:380px/);
});

test('Car Notes classic polish: cache-bust mengikuti release version saat ini', () => {
  const index = read('index.html');
  const prod = read('app_production.html');
  const sw = read('sw.js');
  const version = (index.match(/styles\.css\?v=(\d+)/) || [])[1];
  assert.ok(version, 'index harus memiliki cache-bust styles.css');
  assert.match(prod, new RegExp('styles\\.css\\?v=' + version));
  assert.match(sw, new RegExp('kw-cache-v' + version + '\\b'));
});
