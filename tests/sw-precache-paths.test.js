'use strict';
// tests/sw-precache-paths.test.js — regresi utk bug ditemukan sesi Performance
// Test (S284): sw.js precache './smoke-test.js' padahal file aslinya di
// 'modules/shared/smoke-test.js' -> 404 saat install -> cache.addAll() GAGAL
// TOTAL (atomik, 1 URL gagal = semua gagal), jadi offline-cache PWA diam-diam
// tidak pernah aktif sama sekali. Test ini generik: baca PRECACHE_URLS dari
// sw.js, pastikan SETIAP entri nyata ada di disk relatif ke root repo --
// jadi kalau ada path salah lain (sekarang atau nanti), test ini gagal
// duluan sebelum sempat kekirim ke user. Bukan smoke-test/DOM, cuma baca
// file teks + fs.existsSync, konsisten dgn pola tests lain di repo ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

function extractPrecacheUrls(src) {
  const m = src.match(/PRECACHE_URLS\s*=\s*\[([\s\S]*?)\]/);
  assert.ok(m, 'PRECACHE_URLS tidak ditemukan di sw.js');
  return [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
}

test('sw.js: PRECACHE_URLS tidak kosong', () => {
  const urls = extractPrecacheUrls(swSrc);
  assert.ok(urls.length > 0);
});

test('sw.js: setiap path di PRECACHE_URLS benar-benar ada di disk (cegah cache.addAll gagal total)', () => {
  const urls = extractPrecacheUrls(swSrc);
  const missing = urls.filter((u) => !fs.existsSync(path.join(ROOT, u)));
  assert.deepEqual(missing, [], `Path precache tidak ditemukan di disk: ${missing.join(', ')}`);
});

test('sw.js: smoke-test.js dirujuk dengan path lengkap modules/shared/ (regresi S284)', () => {
  const urls = extractPrecacheUrls(swSrc);
  assert.ok(urls.includes('./modules/shared/smoke-test.js'));
  assert.ok(!urls.includes('./smoke-test.js'));
});
