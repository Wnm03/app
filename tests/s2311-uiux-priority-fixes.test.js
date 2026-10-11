'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('S2311 #2: nav plus has useful fallback actions instead of a dead-end toast', () => {
  const html = read('index.html');
  const actions = read('modules/shared/action-wrappers.js');
  assert.match(html, /id="navFabFallbackMenu"[\s\S]*?navQuickOpenIncome[\s\S]*?navQuickOpenExpense[\s\S]*?navQuickOpenBbm[\s\S]*?navQuickOpenServis/);
  assert.match(actions, /function navFabToggle\(el\)[\s\S]*?navFabFallbackMenu/);
  assert.match(actions, /function navQuickOpenIncome\(\)[\s\S]*?openTxModal\('income'\)/);
  assert.match(actions, /function navQuickOpenBbm\(\)[\s\S]*?openBbmModal\(\)/);
  assert.match(actions, /function closeAllKeuFabs\(\)[\s\S]*?navFabFallbackMenu[\s\S]*?fallback\.hidden=true/);
  assert.doesNotMatch(actions, /Tidak ada aksi cepat di halaman ini/);
});

test('S2311 #2: quick action menu is high-contrast, touch-sized and anchored above bottom nav', () => {
  const css = read('styles.css');
  assert.match(css, /\.nav-fab-icon\s*\{[^}]*background:\s*var\(--accent,\s*#4f46e5\)/);
  assert.match(css, /\.nav-fab-menu\s*\{[^}]*position:\s*fixed/);
  assert.match(css, /\.nav-fab-menu\s*\{[^}]*bottom:\s*calc\(76px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(css, /\.nav-fab-menu button\s*\{[^}]*min-height:\s*44px/);
});

test('S2311 #1: Finance primary tabs stay in one horizontally scrollable row and duplicate breadcrumb is hidden', () => {
  const css = read('styles.css');
  assert.match(css, /#page-keuangan > \.cn-tabs\s*\{[^}]*flex-wrap:\s*nowrap[^}]*overflow-x:\s*auto/);
  assert.match(css, /#page-keuangan > \.page-breadcrumb\s*\{\s*display:\s*none/);
});

test('S2311 #3: Fuel Intelligence body does not duplicate its card header or empty dash rows', () => {
  const fuel = read('modules/vehicle/fuel-card.js');
  assert.match(fuel, /data-fuel-active-vehicle="1"/);
  assert.match(fuel, /if \(!rows\.length && !insight\.title && !insight\.description && !insight\.recommendation\) return ''/);
  assert.match(fuel, /Gunakan tombol Atur Tangki di bawah/);
  assert.doesNotMatch(fuel, /Fuel Health \$\{s\.healthScore != null \? s\.healthScore \+ '\/100' : '—'\}/);
});
