'use strict';
// tests/s748-modern-theme-light-color-fix.test.js — FIX (akumulasi v1575->1576,
// audit UI/UX): theme-card "modern" (didaftarkan s640) berlabel "Terang flat &
// ringan (Minimal)" dgn preview background #fafafa + teks aksen #2f6fed, TAPI
// blok token `[data-theme="modern"]` di styles.css (sejak s635) berisi nilai
// GELAP (--bg:#0b0b0c dst) -- lolos tanpa terdeteksi krn audit s640 cuma
// memverifikasi pendaftaran card, bukan mencocokkan literal warna terhadap
// preview-nya. Gate permanen di bawah mengunci base tema ini TETAP terang &
// aksen TETAP biru sesuai yang diiklankan ke user, supaya sesi mendatang tidak
// diam-diam menggelapkannya lagi tanpa update label/preview.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const stylesCss = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const modernUiCss = fs.readFileSync(path.join(ROOT, 'modern-ui-layer.css'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function extractModernBlock(css) {
  const m = css.match(/\[data-theme="modern"\]\s*\{([^}]*)\}/);
  assert.ok(m, 'blok [data-theme="modern"] harus ditemukan di styles.css');
  return m[1];
}

test('styles.css — [data-theme="modern"] --bg terang (#fafafa), BUKAN gelap lagi', () => {
  const block = extractModernBlock(stylesCss);
  assert.match(block, /--bg:#fafafa;/);
  assert.doesNotMatch(block, /--bg:#0b0b0c/);
});

test('styles.css — [data-theme="modern"] --accent biru (#2f6fed) sesuai preview theme-card, BUKAN abu lama', () => {
  const block = extractModernBlock(stylesCss);
  assert.match(block, /--accent:#2f6fed;/);
  assert.doesNotMatch(block, /--accent:#9b9b9f/);
});

test('styles.css — [data-theme="modern"] --text gelap (kontras di atas base terang), --surface terang', () => {
  const block = extractModernBlock(stylesCss);
  assert.match(block, /--surface:#ffffff;/);
  assert.match(block, /--text:#18181a;/);
});

test('index.html — theme-card "modern" preview & label TIDAK berubah (masih "Terang" + #fafafa) — jadi acuan gate ini tetap valid', () => {
  assert.match(
    indexHtml,
    /<div class="theme-card" data-action="setTheme" data-args='\["modern"\]' data-t="modern" title="Terang[^"]*"><div class="theme-card-preview" style="background:#fafafa;color:#2f6fed">/,
  );
});

test('modern-ui-layer.css — "modern" ikut daftar scoping fix kontras onlight (krn base-nya sekarang terang, sama spt light/stone/mono/sand/sage/fresh)', () => {
  assert.match(modernUiCss, /\[data-theme="modern"\] \.shop-stock-pill\.ok, \[data-theme="modern"\] \.trs-tag-btn\.stok-ok \{\s*color: var\(--accent3-onlight\);/);
  assert.match(modernUiCss, /\[data-theme="modern"\] \.kasir-tile\.stock-low \.kasir-tile-stock \{\s*color: var\(--accent4-onlight\);/);
  assert.match(modernUiCss, /\[data-theme="modern"\] \.shop-stock-pill\.low, \[data-theme="modern"\] \.trs-tag-btn\.stok-low,\s*\n\[data-theme="light"\] \.kasir-tile\.stock-out/);
});

test('audit — 9 tema lama + auto TIDAK ikut disentuh oleh fix ini (0 regresi warna tema lain)', () => {
  const OLD_THEMES_BG = {
    dark: '#08090c', ocean: '#050f1a', light: '#f5f5fa', stone: '#f7f5f1',
    slate: '#1c1c1e', mono: '#fafafa', sand: '#f8f6f2', ink: '#0a0a0a', sage: '#f6f7f4',
  };
  for (const [theme, bg] of Object.entries(OLD_THEMES_BG)) {
    const re = new RegExp(`\\[data-theme="${theme}"\\] \\{[^}]*--bg:${bg.replace('#', '#')}`);
    assert.match(stylesCss, re, `--bg tema "${theme}" seharusnya tetap ${bg}`);
  }
});
