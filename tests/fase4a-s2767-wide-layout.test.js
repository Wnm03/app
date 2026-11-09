'use strict';
// Fase 4A (S2767) — layar lebar: grid 2 kolom Aset/Mobil, lebar Beranda seragam, pemisah Tambah, title pencarian.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('S2767: blok FASE 4A hanya aktif di layar lebar, tanpa !important', () => {
  const css = read('tokens.css');
  const blk = css.split('FASE 4A (S2767)')[1];
  assert.ok(blk, 'blok FASE 4A ada');
  assert.match(blk, /@media \(min-width:1280px\)/);
  assert.match(blk, /:not\(\.u-dnone\)/);
  assert.doesNotMatch(css, /!important/);
});

test('S2767: grid 2 kolom hanya untuk Aset & Car Notes (bukan Keuangan Kelola)', () => {
  const blk = read('tokens.css').split('FASE 4A (S2767)')[1];
  assert.match(blk, /#asetTab-ringkasan/);
  assert.match(blk, /#cnbTab-ringkasan/);
  assert.doesNotMatch(blk, /#kelolaTab-ringkasan/);
});

test('S2767: sidebar memisahkan Tambah dan ikon pencarian punya title shortcut di kedua HTML', () => {
  assert.match(read('tokens.css'), /\.nav \.nav-fab\{margin-top:12px/);
  for (const f of ['index.html', 'app_production.html']) {
    assert.match(read(f), /aria-label="Buka pencarian" title="Cari \(Ctrl\+K atau \/\)"/);
  }
});
