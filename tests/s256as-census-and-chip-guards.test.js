'use strict';
// S256AS: penjaga statis untuk sesi yang sebelumnya tanpa tes (S256AB CSS, S256AL/AM skrip census) + kontrak gagal census AL.
// Skrip Python/Chromium tidak ikut `node --test`; tes ini hanya mencegah drift kontrak.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const css = rd('modern-ui-layer.css');

test('S256AB: blok hero domain ringkas mobile menyembunyikan paragraf intro + status pill, hanya dalam @media <=768px', () => {
  const i = css.indexOf('S256AB: compact domain hero');
  assert.ok(i > 0, 'blok S256AB hero hilang');
  const media = css.indexOf('@media (max-width:768px){', i);
  assert.ok(media > i && media - i < 400, 'aturan hero harus berada di @media (max-width:768px)');
  const end = css.indexOf('\n}\n', media);
  const block = css.slice(media, end);
  assert.ok(/\.pwa-domain-hero-main>p/.test(block) && /\.pwa-domain-status-row/.test(block) && /display:none/.test(block));
  assert.ok(/\.pwa-domain-car \.pwa-domain-hero-actions \.pwa-action-card:not\(:first-child\)\{display:none\}/.test(block), 'aksi kedua+ di halaman mobil tersembunyi');
  assert.ok(/\.pwa-action-card\{min-height:44px\}/.test(block), 'target sentuh 44px tombol aksi hero');
});

test('S256AB: .chip kanonik didefinisikan (token yang sama dengan .chip-btn) dan punya state active', () => {
  assert.ok(/\n\.chip\{display:inline-flex;align-items:center;/.test(css), '.chip dasar hilang');
  const base = css.slice(css.indexOf('\n.chip{'), css.indexOf('\n.chip.active'));
  ['var(--r-pill)', 'var(--border2)', 'var(--surface2)'].forEach((t) => assert.ok(base.includes(t), 'token hilang di .chip: ' + t));
  assert.ok(/\.chip\.active\{background:var\(--accent\)/.test(css), '.chip.active hilang');
  assert.ok(/html body\[data-theme\] \.chip\{min-height:44px\}/.test(css), 'lantai 44px mobile untuk .chip (S256AC) hilang');
});

test('S256AL: census utama gagal (exit 1) pada temuan, bukan hanya mencetak', () => {
  const py = rd('scripts/a11y-runtime-census.py');
  assert.ok(/sys\.exit\(1 if res\['findings'\] else 0\)/.test(py), 'census AL harus exit 1 saat ada temuan');
  ['pageErrors', 'worthItError', 'nativeMismatch', 'divMismatch', 'segmentedRootsUnprocessed', 'focusedAfterArrow', 'expander'].forEach((k) => {
    assert.ok(py.includes("f.append('" + k + "')") || py.includes("'tab:' + key") || py.includes(k), 'kondisi temuan hilang: ' + k);
  });
  ['worthItOpen', 'worthItAfterArrowRight', 'afterEnd', 'afterHome'].forEach((k) => assert.ok(py.includes("'" + k + "'"), 'urutan tab tidak lagi diperiksa: ' + k));
});

test('S256AM: census halaman memeriksa 8 halaman yang semuanya ada di HTML, dan gagal pada temuan', () => {
  const py = rd('scripts/a11y-runtime-census-pages.py');
  const m = py.match(/PAGES = \[([^\]]+)\]/);
  assert.ok(m, 'daftar PAGES hilang');
  const pages = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  assert.ok(pages.length >= 8, 'daftar halaman menyusut: ' + pages.length);
  const html = rd('app_production.html');
  const missing = pages.filter((p) => !new RegExp('id="page-' + p + '"').test(html));
  assert.deepStrictEqual(missing, [], 'halaman tidak ada di HTML: ' + missing.join(','));
  assert.ok(/sys\.exit\(1 if fail else 0\)/.test(py));
  assert.ok(/click\(/.test(py), 'harus mengklik grup sungguhan, bukan hanya membaca atribut');
});
