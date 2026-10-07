'use strict';
// S256AR: penjaga statis untuk mode ketat opsional `firstSessionBbm` di scripts/a11y-runtime-census-modals.py.
// Skrip Python/Chromium tidak ikut `node --test`; tes ini mencegah drift kontrak:
//  - default TETAP informasional (perilaku S256AN: bug pra-eksisting tidak membuat exit 1 sebelum bundle dibangun ulang),
//  - mode ketat hanya aktif lewat flag/env eksplisit, dan flag tidak boleh menggeser argumen halaman,
//  - fix S256AO (FuelPriceRef._ensureStore) yang menjadi syarat 'ok' tetap ada di source.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const py = rd('scripts/a11y-runtime-census-modals.py');

test('S256AR: flag/env ketat didefinisikan dan argumen berawalan -- tidak dianggap nama halaman', () => {
  assert.ok(/--strict-first-session/.test(py), 'flag --strict-first-session hilang');
  assert.ok(/CENSUS_STRICT_FIRST_SESSION/.test(py), 'env CENSUS_STRICT_FIRST_SESSION hilang');
  assert.ok(/startswith\('--'\)/.test(py), 'argumen halaman harus menyaring flag berawalan --');
  assert.ok(!/page_file\s*=\s*sys\.argv\[1\]/.test(py), 'page_file tidak boleh lagi langsung sys.argv[1] (flag di posisi 1 merusak)');
});

test('S256AR: strict gagal bila firstSessionBbm bukan ok, default informasional', () => {
  assert.ok(/if STRICT_FIRST_SESSION and res\['firstSessionBbm'\] != 'ok': fail = True/.test(py), 'kondisi gagal mode ketat berubah');
  const lines = py.split('\n').filter((l) => /firstSessionBbm/.test(l) && /fail\s*=\s*True/.test(l));
  assert.ok(lines.every((l) => /STRICT_FIRST_SESSION/.test(l)), 'firstSessionBbm tidak boleh membuat gagal tanpa mode ketat: ' + lines.join('|'));
  assert.ok(/sys\.exit\(1 if fail else 0\)/.test(py));
});

test('S256AR: syarat "ok" masih ada di source (FuelPriceRef._ensureStore dipanggil di 2 writer)', () => {
  const src = rd('modules/vehicle/fuel-price-ref.js');
  assert.ok(/_ensureStore\s*\(/.test(src), 'FuelPriceRef._ensureStore hilang');
  assert.ok((src.match(/this\._ensureStore\(\)|FuelPriceRef\._ensureStore\(\)/g) || []).length >= 2, '_ensureStore harus dipanggil di onSelectChange dan blok finally cek-harga');
});
