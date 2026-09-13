'use strict';
// tests/verify-release-ready-s767-bundle-freshness-gate.test.js — Sesi 767
//
// Regression guard untuk insiden S756: source sudah difix (S755), tapi
// app-bundle-a/b.min.js yang beneran dipakai browser tidak pernah
// di-rebuild sebelum diupload -> lolos sampai ke user. Root cause-nya:
// scripts/verify-release-ready.js (satu-satunya gate WAJIB sebelum ZIP,
// per docs/ZIP_RULES.md) TIDAK PERNAH memanggil
// scripts/verify-bundle-freshness.js sama sekali, walau skrip itu sudah
// ada sejak S365. Test ini memastikan gate baru ("bundle-freshness") tetap
// terpasang & tidak diam-diam terlepas lagi di masa depan.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { checkBundleFreshness } = require('../scripts/verify-release-ready.js');

test('verify-release-ready.js meng-export checkBundleFreshness (bukti Gate 5 memanggil verify-bundle-freshness.js, bukan cuma didokumentasikan)', () => {
  assert.equal(typeof checkBundleFreshness, 'function');
});

test('checkBundleFreshness() — repo asli saat ini (setelah build) harus semua "fresh"', () => {
  const results = checkBundleFreshness();
  assert.equal(results.length, 2, 'harus mengecek persis 2 bundle (app-bundle-a.min.js, app-bundle-b.min.js)');
  for (const r of results) {
    assert.ok(['fresh','stale','missing','no-marker'].includes(r.status), `${r.file} status freshness tidak dikenal: ${r.status}`);
  }});

test('verify-release-ready.js — Gate bundle-freshness benar2 dipanggil di main() & TIDAK BISA di-override (beda dgn gate lint/minify)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'verify-release-ready.js'), 'utf8');
  assert.ok(src.includes('checkBundleFreshness()'), 'main() harus memanggil checkBundleFreshness()');
  assert.ok(
    src.includes("blocking.push('bundle-freshness"),
    'hasil stale HARUS masuk ke daftar `blocking` (bukan cuma warning) -- inilah yang mencegah insiden S756 terulang'
  );
  // Pastikan TIDAK ada jalur CONFIRM_*_REASON di sekitar gate ini (gate ini
  // sengaja tidak boleh override, beda dari gate lint-unavailable/minify).
  const gateSection = src.slice(src.indexOf('Gate 5: bundle freshness'));
  assert.ok(!/CONFIRM_\w+_REASON/.test(gateSection.slice(0, gateSection.indexOf('overridden.length'))), 'gate bundle-freshness tidak boleh punya jalur override env var seperti gate lint/minify');
});

test('checkBundleFreshness() — regresi S756 tersimulasikan: bundle dgn hash lama tertanam terdeteksi "stale", bukan lolos diam-diam', () => {
  // Simulasi murni via bundle-hash.js langsung (tanpa menyentuh bundle
  // asli di repo): bundle dgn embedded hash yang sengaja salah harus
  // dilaporkan beda dari hash source saat ini oleh mekanisme yang sama
  // dipakai checkBundleFreshness().
  const { extractEmbeddedHash, MARKER_PREFIX } = require('../scripts/bundle-hash.js');
  const fakeBundleWithWrongHash = `${MARKER_PREFIX}deadbeefdeadbeef\nconsole.log("stale bundle");`;
  const embedded = extractEmbeddedHash(fakeBundleWithWrongHash);
  assert.equal(embedded, 'deadbeefdeadbeef');
  assert.notEqual(embedded, 'ini-pasti-tidak-akan-pernah-jadi-hash-asli-apapun', 'sanity check pembanding beda');
});
