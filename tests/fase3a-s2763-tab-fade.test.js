'use strict';
// Guard Fase 3A S2763: indikator scroll (fade kiri/kanan scroll-driven) pada baris tab/chip horizontal.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const t = fs.readFileSync(path.join(__dirname, '..', 'tokens.css'), 'utf8');
const b = t.slice(t.indexOf('FASE 3A'));

test('Fase 3A: properti kustom terdaftar + keyframes fade kiri/kanan', () => {
  assert.match(b, /@property --kw-fade-l\{syntax:'<length>'/);
  assert.match(b, /@property --kw-fade-r\{syntax:'<length>'/);
  assert.match(b, /@keyframes kw-fade-l/);
  assert.match(b, /@keyframes kw-fade-r/);
});

test('Fase 3A: peningkatan progresif (@supports animation-timeline) dan mencakup tab bar utama', () => {
  assert.match(b, /@supports \(animation-timeline:scroll\(self inline\)\)/);
  for (const s of ['.cn-tabs', '.segmented-control', '.ai-suggest', '#page-keuangan', '#page-aset', '#page-settings']) {
    assert.ok(b.includes(s), s);
  }
  assert.match(b, /animation-timeline:scroll\(self inline\),scroll\(self inline\)/);
});

test('Fase 3A: tokens.css tetap tanpa !important dan menghormati reduced-motion', () => {
  assert.ok(!/!important/.test(t));
  assert.match(b, /prefers-reduced-motion:reduce/);
});
