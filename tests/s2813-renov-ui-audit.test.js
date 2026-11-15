'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('S2813: modal Renov memakai kelas form yang punya CSS (.fg/.fl/.fi), bukan .field-label/.input', () => {
  const src = read('modules/home/renovasi.js');
  assert.ok(!/field-label/.test(src), 'field-label tidak punya CSS');
  assert.ok(!/class="input"/.test(src), 'class="input" tidak punya CSS');
  for (const id of ['renovDpAmount', 'renovPayAmount', 'renovProjClient', 'renovProjRab']) {
    assert.match(src, new RegExp('for="' + id + '"'), 'label harus terhubung ke ' + id);
  }
});

test('S2813: baris kartu proyek punya kelas renov-card-row + override CSS', () => {
  assert.match(read('modules/home/renovasi.js'), /renov-card-row/);
  assert.match(read('modern-ui-layer.css'), /#renovList \.tx-item>\.renov-card-row\{[^}]*min-width:0/);
});

test('S2813: menu ⋯ kartu tidak membuka detail (data-stop)', () => {
  const src = read('modules/shared/pwa-ux-performance.js');
  assert.match(src, /menu\.setAttribute\('data-action','stopPropOnly'\);menu\.setAttribute\('data-stop','1'\)/);
});

test('S2813: nominal miliaran ringkas di kartu statistik dengan title penuh', () => {
  const src = read('modules/home/renovasi.js');
  assert.match(src, /function _renovStatMoney/);
  assert.match(src, /_renovSetStat\('renovDetTotal'/);
  const m = src.match(/function _renovStatMoney[^\n]*/)[0];
  const fn = new Function('fmtFull', m + '; return _renovStatMoney;')((n) => 'Rp ' + n);
  assert.equal(fn(1250525000), 'Rp 1,25 M');
  assert.equal(fn(3000000000), 'Rp 3 M');
  assert.equal(fn(999999999), 'Rp 999999999');
});
