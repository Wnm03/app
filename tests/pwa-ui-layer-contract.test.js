'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('PWA UI layer is structural, dependency-free, and loaded by both runtime HTML files', () => {
  const css = read('pwa-ui-layer.css');
  const index = read('index.html');
  const prod = read('app_production.html');
  assert.match(css, /body\[data-theme\]/);
  assert.match(css, /@media\s*\(min-width:\s*900px\)/);
  assert.match(css, /flex-direction:\s*column/);
  assert.match(css, /grid-template-columns:\s*repeat\(4/);
  assert.doesNotMatch(css, /@import\s+url\(/i);
  assert.doesNotMatch(css, /https?:\/\//i);
  assert.match(index, /pwa-ui-layer\.css\?v=/);
  assert.match(prod, /pwa-ui-layer\.css\?v=/);
});

test('PWA UI layer preserves the existing navigation/action hooks', () => {
  const index = read('index.html');
  for (const id of ['mainNav','navFabMain']) assert.match(index, new RegExp(`id="${id}"`));
  for (const page of ['dashboard-hub','keuangan','shop','aset','carnotes','pajak']) {
    assert.match(index, new RegExp(`showPage.*${page}`));
  }
});

test('Retired Pro UI artifact is physically absent', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'pro-ui-layer.css')), false);
});


test('PWA UI layer is included in offline precache and standalone preview tooling', () => {
  const sw = read('sw.js');
  const preview = read('scripts/build-preview.js');
  const budget = read('scripts/performance-budget.js');
  assert.match(sw, /['"]\.\/pwa-ui-layer\.css['"]/);
  assert.match(preview, /pwa-ui-layer\.css/);
  assert.match(budget, /['"]pwa-ui-layer\.css['"]:\s*15_000/);
});
