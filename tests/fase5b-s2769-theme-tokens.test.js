'use strict';
// Fase 5B (S2769) — tema = kumpulan token: --density, --card-pad, --card-radius, --font-num tersambung per tema; kontras --text2.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = read('tokens.css');
const block = css.slice(css.indexOf('FASE 5B (S2769)'));

test('S2769: blok FASE 5B ada dan tanpa !important', () => {
  assert.ok(css.includes('FASE 5B (S2769)'));
  assert.doesNotMatch(block, /!important/);
  assert.doesNotMatch(css, /!important/);
});

test('S2769: token per tema (Dark/Light lega, Graphite/Modern padat)', () => {
  assert.match(block, /body\[data-theme="dark"\],html body\[data-theme="light"\]\{--density:1;--card-pad:14px;--card-radius:14px;--font-num:"Space Grotesk",sans-serif\}/);
  assert.match(block, /body\[data-theme="graphite"\]\{--density:\.8;--card-pad:10px;--card-radius:10px;--font-num:ui-monospace,/);
  assert.match(block, /body\[data-theme="modern"\]\{--density:\.8;--card-pad:10px;--card-radius:10px;--font-num:var\(--font-mono\)\}/);
});

test('S2769: kartu dan angka membaca token; desktop >=900px menambah pad/radius', () => {
  assert.match(block, /\.card\{padding:calc\(var\(--card-pad\) \+ var\(--card-pad-up\)\);border-radius:calc\(var\(--card-radius\) \+ var\(--card-radius-up\)\)\}/);
  assert.match(block, /margin-bottom:calc\(var\(--space-3\) \* var\(--density\)\)/);
  assert.match(block, /font-family:var\(--font-num\)/);
  assert.match(block, /@media \(min-width:900px\)\{:root\{--card-pad-up:6px;--card-radius-up:4px\}\}/);
});

test('S2769: --density desktop .86 lama (tidak terpakai) sudah diganti token tema', () => {
  assert.doesNotMatch(css, /@media \(min-width:1100px\)\{:root\{--density:\.86\}\}/);
});

test('S2769: --text2 Modern >=4.5:1 di atas surface2 dan surface3', () => {
  const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const m = block.match(/body\[data-theme="modern"\]\{--text2:(#[0-9a-f]{6})\}/);
  assert.ok(m, 'override --text2 Modern ada');
  assert.ok(cr(m[1], '#e8e8e8') >= 4.5);
  assert.ok(cr(m[1], '#f2f2f2') >= 4.5);
});
