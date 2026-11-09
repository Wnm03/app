'use strict';
// Guard Fase 0 + Fase 1 (RENCANA-UPGRADE-FRONTEND.md).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('Fase 0: ring aktif tidak mengenai .page', () => {
  assert.match(read('styles.css'), /\.active:not\(\.page\)\)\s*\{\s*box-shadow: inset 0 0 0 1px currentColor/);
  assert.match(read('modern-ui-layer.css'), /\.page\.active\{box-shadow:none\}/);
});
test('Fase 0: blok CSS baru tanpa selector [data-action]', () => {
  const css = read('modern-ui-layer.css');
  assert.ok(!/data-action=/.test(css.slice(css.indexOf('FASE 0'))));
});
test('Fase 1: tokens.css terdaftar di kedua HTML dan precache sw.js, dimuat setelah pwa-ui-layer.css', () => {
  for (const f of ['index.html', 'app_production.html']) {
    const h = read(f);
    assert.ok(h.indexOf('tokens.css') > h.indexOf('pwa-ui-layer.css'), f);
  }
  assert.match(read('sw.js'), /'\.\/tokens\.css'/);
});
test('Fase 1: skala tipografi 12/14/16/20/28 dan token lama dipetakan', () => {
  const t = read('tokens.css');
  for (const [k, v] of [['xs', 12], ['sm', 14], ['md', 16], ['lg', 20], ['xl', 28]]) assert.match(t, new RegExp('--fs-' + k + ':' + v + 'px'));
  assert.match(t, /--fs-caption:var\(--fs-xs\)/);
  assert.match(t, /font-variant-numeric:tabular-nums/);
  assert.ok(!/data-action=/.test(t));
  assert.ok(!/!important/.test(t), 'tokens.css tidak memakai !important');
});

test('Fase 1: angka ringkasan Piutang/Inventori tidak turun di bawah 12px', () => {
  const css = read('modern-ui-layer.css');
  assert.match(css, /#kbPiutang,\s*html body\[data-theme\] #kbInventori\s*\{\s*font-size:\s*clamp\(12px,\s*3\.1vw,\s*14px\)/);
});
