'use strict';
// tests/s640-modern-theme-registration-audit.test.js — cakupan Sesi s640
// (RENCANA-MODERNISASI-UI.md): "Audit lintas modul, full run test suite,
// putuskan apakah modern jadi opsi tema tambahan atau default baru."
//
// Keputusan (lihat LAPORAN-AUDIT-S640-TEMA-MODERN.md): daftarkan "modern"
// sbg OPSI TAMBAHAN (bukan default) ke pemilihan tema di Pengaturan — 9
// tema lama + "auto" TIDAK dipindah/diubah urutan/atributnya sama sekali.
// Keputusan default BARU (mengganti "dark") ditunda, belum diambil sesi
// ini (butuh feedback penggunaan nyata dulu, sesuai catatan risiko
// rencana "dipertimbangkan default setelah s640 kalau hasilnya sesuai
// ekspektasi" — bukan otomatis jadi default begitu diaudit).
//
// Cakupan test: (1) theme-card "modern" ADA di index.html dgn atribut
// data-action/data-args/data-t yang benar (pola sama persis 9 tema lama).
// (2) 9 theme-card lama + "auto" 0 berubah (regresi). (3) app_production.html
// sinkron dgn index.html (gate html-sync). (4) default tema TIDAK berubah
// (`data-theme="fresh"` di <body> index.html/app_production.html apa
// adanya, applyEffectiveTheme() fallback 'dark' apa adanya) -- keputusan
// go/no-go: opsi tambahan, BUKAN default baru.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const prodHtml = fs.readFileSync(path.join(ROOT, 'app_production.html'), 'utf8');
const formatTemaSrc = fs.readFileSync(path.join(ROOT, 'modules/shared/format-tema.js'), 'utf8');

const OLD_THEMES = ['dark', 'ocean', 'light', 'stone', 'slate', 'mono', 'sand', 'ink', 'sage', 'auto'];

test('index.html — theme-card "modern" terdaftar dgn data-action=setTheme & data-t="modern"', () => {
  assert.match(
    indexHtml,
    /<div class="theme-card" data-action="setTheme" data-args='\["modern"\]' data-t="modern"/,
  );
});

for (const t of OLD_THEMES) {
  test(`index.html — theme-card "${t}" (lama) masih ada apa adanya (0 regresi dari pendaftaran modern)`, () => {
    const re = new RegExp(
      `<div class="theme-card" data-action="setTheme" data-args='\\["${t}"\\]' data-t="${t}"`,
    );
    assert.match(indexHtml, re);
  });
}

test('index.html — total theme-card = 11 (10 lama termasuk auto + 1 baru "modern")', () => {
  const matches = indexHtml.match(/class="theme-card"/g) || [];
  assert.equal(matches.length, 11);
});

test('index.html — urutan 9 tema lama + auto tetap di atas "modern" (modern ditambah di akhir, bukan disisipkan)', () => {
  const idxAuto = indexHtml.indexOf('data-t="auto"');
  const idxModern = indexHtml.indexOf('data-t="modern"');
  assert.ok(idxAuto > -1 && idxModern > -1 && idxAuto < idxModern);
});

test('app_production.html — sinkron dgn index.html (gate html-sync), termasuk theme-card modern', () => {
  const marker =
    '<!-- AUTO-GENERATED oleh scripts/build.js dari index.html — JANGAN edit file ini langsung.\n' +
    '     Edit index.html, lalu jalankan "node scripts/build.js" (file ini disalin ulang otomatis). -->\n\n';
  const expected = indexHtml.replace('<head>\n', '<head>\n' + marker);
  assert.equal(prodHtml, expected);
});

test('app_production.html — theme-card "modern" ikut ter-sinkron', () => {
  assert.match(
    prodHtml,
    /<div class="theme-card" data-action="setTheme" data-args='\["modern"\]' data-t="modern"/,
  );
});

// --- Keputusan go/no-go: opsi tambahan, BUKAN default baru -----------------

test('index.html — default <body data-theme="fresh"> TIDAK diubah jadi "modern" (bukan default baru)', () => {
  assert.match(indexHtml, /<body data-theme="fresh">/);
  assert.doesNotMatch(indexHtml, /<body data-theme="modern">/);
});

test('format-tema.js — applyEffectiveTheme() fallback "dark" TIDAK diubah jadi "modern" (bukan default baru)', () => {
  assert.match(formatTemaSrc, /let t=D\.profile\.theme\|\|'dark';/);
});

// --- Audit lintas modul (s635-s639) — gating tetap konsisten ---------------

test('audit — s636 ticker Beranda tetap gated via CSS (display:none default, flex khusus modern)', () => {
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  assert.match(css, /\.dashhub-ticker\s*\{\s*display:\s*none;?\s*\}/);
  assert.match(css, /\[data-theme="modern"\]\s*\.dashhub-ticker\s*\{\s*display:\s*flex;?\s*\}/);
});

test('audit — s637 tabel Uang tetap gated via D.profile.theme==="modern" di renderKeuangan()', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/shared/modules-render-b.js'), 'utf8');
  assert.match(src, /D\.profile&&D\.profile\.theme==='modern'&&typeof txTableHTML==='function'/);
});

test('audit — s639 tabel Aset tetap gated via D.profile.theme==="modern" di Aset.renderList()', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/asset/aset.js'), 'utf8');
  assert.match(src, /D\.profile&&D\.profile\.theme==='modern'&&typeof assetTableHTML==='function'/);
});

test('audit — s638 class .money Dana Titipan reuse aturan font-mono s635 (0 CSS baru sejak s638)', () => {
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  assert.match(
    css,
    /\[data-theme="modern"\] \.stat-val, \[data-theme="modern"\] \.tx-amount, \[data-theme="modern"\] \.shop-price-final, \[data-theme="modern"\] \.shop-price-strike, \[data-theme="modern"\] \.ldr-days, \[data-theme="modern"\] \.money, \[data-theme="modern"\] \.card-val \{ font-family: var\(--font-mono\); \}/,
  );
});
