const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

test('S2124 — page and domain containers are width-contained', () => {
  assert.match(css, /\.page,\s*\.pwa-domain-page,\s*\.page > \*,\s*\.pwa-domain-page > \*/);
  assert.match(css, /max-inline-size:\s*100%;/);
  assert.match(css, /box-sizing:\s*border-box;/);
});

test('S2124 — common header/action children cannot force overflow', () => {
  assert.match(css, /\.section-head > \*,\s*\.page-settings-btn > \*,\s*\.card-header > \*,\s*\.card-head > \*/);
  assert.match(css, /\.form-row > \*,\s*\.form-actions > \*/);
  assert.match(css, /min-width:\s*0;/);
});

test('S2124 — cross-module cards preserve long-content wrapping', () => {
  assert.match(css, /\.card,\s*\.tx-item,\s*\.shop-product-card,[\s\S]*?overflow-wrap:\s*anywhere;/);
});

test('S2124 — module images remain contained', () => {
  assert.match(css, /\.card img,[\s\S]*?\.cn-vehicle-summary img[\s\S]*?max-inline-size:\s*100%;/);
  assert.match(css, /height:\s*auto;/);
});

test('S2124 — narrow screens tighten shared header/action rhythm', () => {
  assert.match(css, /@media \(max-width:\s*599px\)[\s\S]*?\.section-head,[\s\S]*?max-inline-size:\s*100%;/);
  assert.match(css, /@media \(max-width:\s*359px\)[\s\S]*?\.form-actions[\s\S]*?gap:\s*6px;/);
});
