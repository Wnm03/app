'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('S2815 #1: utilitas u-* yang dipakai markup punya definisi CSS (di modern-ui-layer.css; styles.css dibatasi 180000 byte)', () => {
  const css = read('modern-ui-layer.css');
  const need = {
    'u-ml10': /\.u-ml10\s*\{[^}]*margin-left:\s*10px/,
    'u-flex-between': /\.u-flex-between\s*\{[^}]*justify-content:\s*space-between/,
    'u-jcsb': /\.u-jcsb\s*\{[^}]*justify-content:\s*space-between/,
    'u-grid': /\.u-grid\s*\{[^}]*display:\s*grid/,
    'u-grid3': /\.u-grid3\s*\{[^}]*repeat\(3/,
    'u-t3': /\.u-t3\s*\{[^}]*color:\s*var\(--text3\)/,
    'u-pt10': /\.u-pt10\s*\{[^}]*padding-top:\s*10px/,
    'u-mt14': /\.u-mt14\s*\{[^}]*margin-top:\s*14px/,
    'u-py4': /\.u-py4\s*\{[^}]*padding-top:\s*4px/,
    'u-my12': /\.u-my12\s*\{[^}]*margin-top:\s*12px/,
    'u-flex-1': /\.u-flex-1\s*\{[^}]*flex:\s*1/,
    'u-fs20': /\.u-fs20\s*\{[^}]*font-size:\s*20px/,
  };
  for (const [k, re] of Object.entries(need)) assert.match(css, re, k + ' harus terdefinisi');
});

test('S2815 #2: u-fs9 tidak lebih kecil dari 11px (lantai keterbacaan)', () => {
  const css = read('modern-ui-layer.css');
  assert.match(css, /\.u-fs9\s*\{\s*font-size:\s*var\(--fs-caption\)/);
});

test('S2815 #3: link eksternal petunjuk API key punya area sentuh 44px (::after) dan rel aman', () => {
  const js = read('modules/shared/profil-pengaturan.js');
  assert.equal((js.match(/hint-ext-link/g) || []).length, 2);
  assert.doesNotMatch(js, /target="_blank">/, 'target=_blank harus disertai rel');
  const css = read('modern-ui-layer.css');
  assert.match(css, /\.hint-ext-link::after\s*\{[^}]*height:\s*44px/);
});
