const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

test('S2123 — target modules use width containment on primary cards', () => {
  assert.match(css, /#page-dashboard-hub \.dashhub-feature-card,[\s\S]*?#page-carnotes \.cn-vehicle-summary[\s\S]*?min-width:\s*0;[\s\S]*?max-width:\s*100%;/);
});
test('S2123 — long module card content can wrap without widening layout', () => {
  assert.match(css, /#page-dashboard-hub \.dashhub-feature-card h3,[\s\S]*?#page-carnotes \.dashhub-feature-card p[\s\S]*?overflow-wrap:\s*anywhere;/);
});
test('S2123 — asset rows and shop cards contain overflowing children', () => {
  assert.match(css, /#page-aset \.aset-item,[\s\S]*?#page-shop \.shop-product-card[\s\S]*?overflow:\s*hidden;/);
  assert.match(css, /#page-aset \.aset-item > \*,[\s\S]*?min-width:\s*0;/);
});
test('S2123 — mobile module grids share compact spacing', () => {
  assert.match(css, /@media \(max-width:\s*599px\)[\s\S]*?#page-dashboard-hub \.dashhub-feature-grid,[\s\S]*?#page-shop \.shop-product-grid[\s\S]*?gap:\s*10px;/);
  assert.match(css, /@media \(max-width:\s*359px\)[\s\S]*?#page-dashboard-hub \.dashhub-feature-grid,[\s\S]*?#page-shop \.shop-product-grid[\s\S]*?gap:\s*8px;/);
});
