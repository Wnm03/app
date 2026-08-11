'use strict';
// tests/bundle-hash.test.js — regresi utk scripts/bundle-hash.js (S365,
// tier-2 lanjutan audit ScannerSession self-heal s360-s364). Helper ini
// dipakai buildBundle() (nulis marker hash) & verify-bundle-freshness.js
// (baca & bandingkan marker, TANPA build ulang) — lihat catatan lengkap di
// scripts/verify-bundle-freshness.js soal pola bug s326->s328 yang dicegah.

const test = require('node:test');
const assert = require('node:assert/strict');
const { computeGroupHash, markerLine, extractEmbeddedHash, MARKER_PREFIX } = require('../scripts/bundle-hash');

function fakeReadFile(map) {
  return (rel) => {
    if (!(rel in map)) throw new Error(`fakeReadFile: ${rel} tidak ada di map test`);
    return map[rel];
  };
}

test('computeGroupHash() — hash sama utk isi source yang sama persis', () => {
  const readFile = fakeReadFile({ 'a.js': 'const a=1;', 'b.js': 'const b=2;' });
  const h1 = computeGroupHash(['a.js', 'b.js'], readFile);
  const h2 = computeGroupHash(['a.js', 'b.js'], readFile);
  assert.equal(h1, h2);
});

test('computeGroupHash() — hash BERUBAH kalau satu karakter saja berubah di salah satu file dalam grup', () => {
  const readFileBefore = fakeReadFile({ 'a.js': 'const a=1;', 'b.js': 'const b=2;' });
  const readFileAfter = fakeReadFile({ 'a.js': 'const a=1;', 'b.js': 'const b=3;' }); // 1 karakter beda
  const hBefore = computeGroupHash(['a.js', 'b.js'], readFileBefore);
  const hAfter = computeGroupHash(['a.js', 'b.js'], readFileAfter);
  assert.notEqual(hBefore, hAfter);
});

test('computeGroupHash() — urutan file dalam grup ikut memengaruhi hash (bukan cuma isi)', () => {
  const readFile = fakeReadFile({ 'a.js': 'const a=1;', 'b.js': 'const b=2;' });
  const hAB = computeGroupHash(['a.js', 'b.js'], readFile);
  const hBA = computeGroupHash(['b.js', 'a.js'], readFile);
  assert.notEqual(hAB, hBA, 'urutan penggabungan berbeda -> combined string berbeda -> hash harus beda');
});

test('markerLine()/extractEmbeddedHash() — round-trip: hash yang ditulis bisa dibaca balik persis', () => {
  const hash = computeGroupHash(['a.js'], fakeReadFile({ 'a.js': 'x' }));
  const bundleContent = markerLine(hash) + 'console.log(1);';
  assert.equal(extractEmbeddedHash(bundleContent), hash);
});

test('extractEmbeddedHash() — null kalau bundle tidak punya marker (bundle lama sebelum S365)', () => {
  const bundleContent = '// bundle lama tanpa marker\nconsole.log(1);';
  assert.equal(extractEmbeddedHash(bundleContent), null);
});

test('markerLine() — selalu diawali MARKER_PREFIX supaya extractEmbeddedHash() bisa mendeteksinya', () => {
  const line = markerLine('deadbeef');
  assert.ok(line.startsWith(MARKER_PREFIX));
});
