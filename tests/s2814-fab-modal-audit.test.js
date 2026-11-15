'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('S2814 #1: menu aksi cepat "+" berada di LUAR <nav> (nav punya backdrop-filter + overflow:hidden)', () => {
  const html = read('index.html');
  const navStart = html.indexOf('<nav class="nav');
  const navEnd = html.indexOf('</nav>', navStart);
  const menu = html.indexOf('id="navFabFallbackMenu"');
  assert.ok(navStart > -1 && navEnd > navStart && menu > -1);
  assert.ok(menu > navEnd, 'navFabFallbackMenu harus setelah </nav>');
  assert.match(html, /id="navFabMain"[^>]*data-action="navFabToggle"/, 'tombol + tetap di dalam nav');
  const block = html.slice(menu, html.indexOf('</div>', menu));
  for (const a of ['navQuickOpenIncome', 'navQuickOpenExpense', 'navQuickOpenBbm', 'navQuickOpenServis']) {
    assert.ok(block.includes(a), 'item menu ' + a + ' harus tetap ada');
  }
});

test('S2814 #2: lipatan modal Produk/Kendaraan memakai .modal di dalam overlay sebagai owner', () => {
  const src = read('modules/shared/pwa-ux-performance.js');
  assert.match(src, /const vehicleOwner=vehicleModal&&\(vehicleModal\.querySelector\(':scope > \.modal'\)\|\|vehicleModal\)/);
  assert.match(src, /const productOwner=productModal&&\(productModal\.querySelector\(':scope > \.modal'\)\|\|productModal\)/);
  assert.match(src, /groupDirectFields\(productOwner,'productIdentityFold'/);
  assert.match(src, /groupDirectFields\(vehicleOwner,'vehicleIdentityFold'/);
  assert.doesNotMatch(src, /groupDirectFields\(productModal,/);
  assert.doesNotMatch(src, /groupDirectFields\(vehicleModal,/);
});

test('S2814 #3/#4: toggle Nonaktif tidak menyusut; font ringkasan Car Notes >= 11px', () => {
  const ui = read('modern-ui-layer.css');
  assert.match(ui, /#productModal #pStockKoreksiBtn\s*\{[^}]*flex:\s*0 0 auto[^}]*min-width:\s*max-content/);
  assert.match(ui, /#productModal \.u-grid2\s*\{[^}]*align-items:\s*end/);
  const css = read('styles.css');
  assert.match(css, /\.cn-summary-metric-label\{font-size:11px/);
  assert.match(css, /\.cn-summary-action\{[^}]*font:700 11px/);
  assert.match(css, /\.cn-summary-action \{ min-width: 54px; min-height: 54px; font-size: 11px; \}/);
  assert.doesNotMatch(css, /\.cn-summary-action \{[^}]*font-size: 9px/);
});
