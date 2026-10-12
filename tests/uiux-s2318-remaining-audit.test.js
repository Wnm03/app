'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'modern-ui-layer.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('S2318 U-15: Dashboard Hub landing page no longer shows misleading back-to-Settings arrow', () => {
  assert.match(html, /id="page-dashboard-hub"[\s\S]{0,500}class="page-settings-btn"/);
  assert.match(css, /#page-dashboard-hub\s*>\s*\.page-settings-btn\s*>\s*button\.qs-btn\s*\{\s*display:\s*none;/);
});

test('S2318 U-06: narrow account amounts stay on one line and dashboard analytics can shrink', () => {
  assert.match(css, /#kbPiutang[\s\S]{0,140}white-space:\s*nowrap/);
  assert.match(css, /#page-dashboard-hub \.dashhub-analytics-card,\s*html body\[data-theme\] #page-dashboard-hub \.dashhub-analytics-val\s*\{\s*min-width:\s*0/);
  assert.match(css, /\.dashhub-analytics-val\s*\{\s*font-size:\s*clamp\(/);
});

test('S2318 U-13: remaining compact controls receive 44px minimum targets', () => {
  assert.match(css, /\.card-setting-btn,\s*html body\[data-theme\] \.card-collapse-toggle\s*\{\s*min-width:\s*44px;\s*min-height:\s*44px/);
});
