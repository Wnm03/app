'use strict';
// Fase 3C (S2765) — Mobil maks. 2 baris tab (periode jadi dropdown) + satu pintu pencarian.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('S2765: dropdown periode meneruskan klik ke chip asli (chip tetap sumber kebenaran)', () => {
  const src = read('modules/shared/pwa-ux-performance.js');
  assert.match(src, /cnPeriodeSelect/);
  assert.match(src, /b\.click\(\)/);
  assert.match(src, /cn-periode-chips-folded/);
  const html = read('index.html');
  assert.match(html, /id="cnPeriodeChips"/);
  assert.match(html, /data-action="setCnPeriode"/);
});

test('S2765: shortcut "/" dan Ctrl/Cmd+K membuka openGlobalSearch, tidak aktif saat mengetik', () => {
  const src = read('modules/shared/pwa-ux-performance.js');
  assert.match(src, /openGlobalSearch\(\)/);
  assert.match(src, /tag==='input'\|\|tag==='textarea'\|\|tag==='select'/);
  assert.match(src, /__kwSearchShortcut/);
});

test('S2765: tile "Cari Fitur" ganda disembunyikan lewat CSS; markup & handler tidak dihapus', () => {
  const css = read('tokens.css');
  assert.match(css, /FASE 3C \(S2765\)/);
  assert.match(css, /\.dashhub-qa-btn\[aria-label="Cari Fitur"\]\{display:none\}/);
  assert.match(read('index.html'), /data-action="dashHubQaFocusSearch"/);
  assert.match(read('modules/shared/action-wrappers.js'), /function dashHubQaFocusSearch/);
  assert.doesNotMatch(css, /!important/);
});

test('S2765: bundle hasil build memuat perubahan', () => {
  for (const f of ['app-bundle-a.min.js', 'app-bundle-b.min.js']) {
    if (read(f).includes('cnPeriodeSelect')) return;
  }
  assert.fail('cnPeriodeSelect tidak ada di bundle');
});
