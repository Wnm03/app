'use strict';
// tests/csp-script-src-attr-sa9.test.js — SA9 (v1568): mengunci PERMANEN 2 hal
// supaya tidak ada sesi mendatang yang tanpa sadar meregresi:
//   1. CSP meta tag index.html/app_production.html punya `script-src-attr
//      'none'` -- pengerasan yang baru diaktifkan sesi ini setelah migrasi
//      atribut event 100% tuntas.
//   2. 0 atribut event inline (onclick=/onchange=/oninput=/onblur=/
//      onkeydown=/dst -- SEMUA jenis, bukan cuma 3 yang diaudit SA1) di
//      index.html. Ini gate yang direkomendasikan di
//      SESSION-NOTE-SA1-REKONSTRUKSI-BASELINE.md supaya kalau ada sesi
//      depan menambah SATU SAJA atribut onX= baru, langsung ketahuan di
//      sini -- bukan cuma nanti waktu script-src-attr 'none' mematikannya
//      diam-diam di browser produksi.
//
// Regex sengaja permisif (semua `on[a-z]+=`, bukan daftar nama tertutup)
// supaya menangkap atribut event APAPUN yang mungkin ditambahkan di masa
// depan (onpaste, ondrop, dst), bukan cuma yang sudah dikenal hari ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const INDEX_HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const PROD_HTML = fs.readFileSync(path.join(__dirname, '..', 'app_production.html'), 'utf8');

const INLINE_ATTR_REGEX = /(?<!data-)\bon[a-z]+="[^"]*"/g;

function stripHtmlComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

test('CSP: meta tag index.html memuat script-src-attr \'none\'', () => {
  const match = INDEX_HTML.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/);
  assert.ok(match, 'meta tag Content-Security-Policy harus ada di index.html');
  assert.match(match[1], /script-src-attr\s+'none'/, 'script-src-attr \'none\' harus ada di CSP');
});

test('CSP: script-src UTAMA tetap ada (fallback utk browser tanpa dukungan script-src-attr)', () => {
  const match = INDEX_HTML.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/);
  assert.match(match[1], /script-src\s+'self'/, 'script-src utama harus tetap ada supaya browser lama tidak fallback ke default-src yang lebih ketat');
});

test('CSP: index.html & app_production.html sinkron (meta tag identik)', () => {
  const idx = INDEX_HTML.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/)[1];
  const prod = PROD_HTML.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/)[1];
  assert.equal(idx, prod);
});

test('gate permanen — 0 atribut event inline APAPUN di index.html (di luar komentar HTML)', () => {
  const stripped = stripHtmlComments(INDEX_HTML);
  const hits = stripped.match(INLINE_ATTR_REGEX) || [];
  assert.deepEqual(hits, [], `ditemukan atribut event inline yang belum dimigrasi ke data-*: ${JSON.stringify(hits)}`);
});

test('gate permanen — 0 atribut event inline APAPUN di app_production.html (di luar komentar HTML)', () => {
  const stripped = stripHtmlComments(PROD_HTML);
  const hits = stripped.match(INLINE_ATTR_REGEX) || [];
  assert.deepEqual(hits, [], `ditemukan atribut event inline yang belum dimigrasi ke data-*: ${JSON.stringify(hits)}`);
});

test('sanity — regex INLINE_ATTR_REGEX tetap mendeteksi kasus onX= sungguhan (tidak silently broken)', () => {
  const dummy = '<button onclick="doSomething()">x</button>';
  const hits = dummy.match(INLINE_ATTR_REGEX) || [];
  assert.equal(hits.length, 1);
});

test('sanity — regex INLINE_ATTR_REGEX TIDAK salah tangkap data-onclick=/data-onchange=', () => {
  const dummy = '<button data-onclick="doSomething" data-onchange="doOther">x</button>';
  const hits = dummy.match(INLINE_ATTR_REGEX) || [];
  assert.deepEqual(hits, []);
});
