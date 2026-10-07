'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '..', 'modern-ui-layer.css'), 'utf8');

test('S256AC: mobile touch-target block exists and covers Settings offenders', () => {
  assert.ok(css.includes('S256AC: touch targets'));
  assert.ok(/body\[data-theme\] \.chip-btn\{[^}]*min-height:44px/.test(css));
  assert.ok(/body\[data-theme\] \.header-badge\{[^}]*min-width:44px;min-height:44px/.test(css));
  assert.ok(/body\[data-theme\] \.card-collapse-head\{min-height:44px/.test(css));
  assert.ok(/\.setting-item>\.u-flex>\.btn-sm\{min-width:44px\}/.test(css));
});

test('S256AC: kasir compact toggle keeps its intentional compact size', () => {
  assert.ok(/\.kasir-view-toggle \.chip-btn\{min-height:0\}/.test(css));
});

test('S256AC: block is mobile-scoped (<=768px) so desktop is untouched', () => {
  const i = css.indexOf('S256AC: touch targets');
  assert.ok(css.slice(i).includes('@media (max-width:768px){'));
});
