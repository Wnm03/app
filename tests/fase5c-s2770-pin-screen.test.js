'use strict';
// Fase 5C (S2770) — layar kunci PIN: umpan balik salah-PIN, token tema, pesan beraksesibilitas.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('S2770: checkPin memanggil _pinWrongFeedback pada PIN salah (bukan saat terkunci)', () => {
  const src = read('modules/shared/keamanan-pin.js');
  assert.match(src, /function _pinWrongFeedback\(fails\)/);
  assert.match(src, /sebelum terkunci sementara\)'\);\n_pinWrongFeedback\(fails\);/);
  assert.match(src, /classList\.add\('pin-error'\)/);
});

test('S2770: pesan PIN memakai token kontras dan aria-live, tanpa warna inline', () => {
  for (const f of ['index.html', 'app_production.html']) {
    const html = read(f);
    assert.match(html, /id="pinLockMsg" role="status" aria-live="polite"/);
    assert.doesNotMatch(html, /id="pinLockMsg"[^>]*#ef4444/);
  }
  const css = read('tokens.css');
  assert.match(css, /#pinLockMsg\{color:var\(--pin-error\)/);
  assert.doesNotMatch(css, /!important/);
});

test('S2770: --pin-error lolos 4.5:1 di atas --bg tiap tema', () => {
  const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const css = read('tokens.css');
  const val = (t) => css.match(new RegExp('body\\[data-theme="' + t + '"\\][^{]*\\{--pin-error:(#[0-9a-f]{6})'))[1];
  for (const [t, bg] of [['dark', '#08090c'], ['graphite', '#111315'], ['light', '#f5f5fa'], ['modern', '#fafafa']]) {
    assert.ok(cr(val(t), bg) >= 4.5, t);
  }
});

test('S2770: tombol PIN memakai token tema (radius, font angka, tinggi sentuh)', () => {
  const css = read('tokens.css');
  assert.match(css, /\.pin-key\{min-height:var\(--touch-min\);border-radius:calc\(var\(--card-radius\) \+ 4px\);font-family:var\(--font-num\)/);
});
