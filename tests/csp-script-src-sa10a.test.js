'use strict';
// tests/csp-script-src-sa10a.test.js — SA10a (v1568): mengunci PERMANEN
// hasil eksternalisasi 105 blok <script> inline (101 document.write(MODAL_
// HTML[N]) + 4 blok boot-time), supaya:
//   1. Tidak ada sesi mendatang yang tanpa sadar menambah kembali sebuah
//      blok <script>...</script> inline (tanpa atribut src) di index.html/
//      app_production.html -- begitu itu terjadi, `unsafe-inline` akan
//      dibutuhkan lagi di script-src dan pengerasan CSP sesi ini regresi.
//   2. `script-src` UTAMA di meta CSP TIDAK memuat 'unsafe-inline' lagi,
//      TAPI TETAP memuat 'unsafe-eval' (sengaja dipertahankan -- lihat
//      SESSION-NOTE-SA10a-eksternalisasi-script-block.md: 3 pemakaian nyata
//      `new Function(` ditemukan di app-bundle-b.min.js saat audit sesi
//      ini, jadi mencabutnya tanpa migrasi terpisah akan mematahkan fitur).
//   3. modal-write.js & boot-early.js benar-benar dirujuk, dan jumlah tag
//      modal-write.js (101, index 0..100 tanpa lubang) tidak diam-diam
//      berubah kalau ada modal baru ditambah/dihapus tanpa update index-nya.
//
// Regex deteksi blok <script> inline sengaja permisif (menangkap SEMUA
// <script> tanpa src=, bukan cuma pola document.write yang dimigrasi sesi
// ini) supaya menangkap jenis blok inline APAPUN yang mungkin ditambahkan
// di masa depan, bukan cuma yang sudah dikenal hari ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INDEX_HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const PROD_HTML = fs.readFileSync(path.join(ROOT, 'app_production.html'), 'utf8');

function stripHtmlComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));
}

// <script ...> tanpa atribut src=, isinya apa pun (termasuk kosong).
const INLINE_SCRIPT_REGEX = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;

function findInlineScripts(html) {
  const stripped = stripHtmlComments(html);
  const hits = [];
  let m;
  INLINE_SCRIPT_REGEX.lastIndex = 0;
  while ((m = INLINE_SCRIPT_REGEX.exec(stripped)) !== null) {
    hits.push(m[0].slice(0, 80));
  }
  return hits;
}

test('gate permanen — 0 blok <script> inline (tanpa src) tersisa di index.html', () => {
  const hits = findInlineScripts(INDEX_HTML);
  assert.deepEqual(hits, [], `ditemukan blok <script> inline yang belum dieksternalisasi: ${JSON.stringify(hits)}`);
});

test('gate permanen — 0 blok <script> inline (tanpa src) tersisa di app_production.html', () => {
  const hits = findInlineScripts(PROD_HTML);
  assert.deepEqual(hits, [], `ditemukan blok <script> inline yang belum dieksternalisasi: ${JSON.stringify(hits)}`);
});

test('sanity — INLINE_SCRIPT_REGEX tetap mendeteksi blok inline sungguhan', () => {
  const dummy = '<script>alert(1)</script>';
  assert.equal(findInlineScripts(dummy).length, 1);
});

test('sanity — INLINE_SCRIPT_REGEX TIDAK salah tangkap <script src="...">', () => {
  const dummy = '<script src="foo.js?v=1"></script>';
  assert.equal(findInlineScripts(dummy).length, 0);
});

test('modal-write.js dirujuk persis 101 kali (index 0..100, tanpa lubang/duplikat) di index.html', () => {
  const matches = [...INDEX_HTML.matchAll(/data-modal-index="(\d+)"/g)].map((m) => Number(m[1]));
  assert.equal(matches.length, 101, `jumlah tag modal-write.js harus 101, ditemukan ${matches.length}`);
  const sorted = [...matches].sort((a, b) => a - b);
  const expected = Array.from({ length: 101 }, (_, i) => i);
  assert.deepEqual(sorted, expected, 'index modal-write.js harus 0..100 tanpa lubang/duplikat');
});

test('index.html & app_production.html sinkron soal jumlah & isi tag modal-write.js/boot-early.js', () => {
  const idxModal = [...INDEX_HTML.matchAll(/data-modal-index="(\d+)"/g)].map((m) => m[1]);
  const prodModal = [...PROD_HTML.matchAll(/data-modal-index="(\d+)"/g)].map((m) => m[1]);
  assert.deepEqual(idxModal, prodModal);

  const BOOT_TAG_REGEX = /<script src="modules\/shared\/boot-early\.js\?v=\d+"><\/script>/g;
  const idxBoot = (INDEX_HTML.match(BOOT_TAG_REGEX) || []).length;
  const prodBoot = (PROD_HTML.match(BOOT_TAG_REGEX) || []).length;
  assert.equal(idxBoot, 1, 'boot-early.js harus dirujuk tepat 1 kali di index.html');
  assert.equal(prodBoot, 1, 'boot-early.js harus dirujuk tepat 1 kali di app_production.html');
});

test('CSP: script-src UTAMA sudah TANPA \'unsafe-inline\' (index.html)', () => {
  const match = INDEX_HTML.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/);
  assert.ok(match, 'meta tag Content-Security-Policy harus ada');
  const scriptSrc = match[1].match(/script-src\s+([^;]*);/)[1];
  assert.doesNotMatch(scriptSrc, /'unsafe-inline'/, "script-src utama seharusnya tidak lagi butuh 'unsafe-inline' setelah SA10a");
});

test('CSP: script-src UTAMA tetap memuat \'unsafe-eval\' (dibutuhkan new Function() di app-bundle-b.min.js)', () => {
  const match = INDEX_HTML.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/);
  const scriptSrc = match[1].match(/script-src\s+([^;]*);/)[1];
  assert.match(scriptSrc, /'unsafe-eval'/, "script-src utama harus tetap punya 'unsafe-eval' -- lihat SESSION-NOTE-SA10a untuk audit new Function()");
});

test('CSP: script-src-attr \'none\' (dari SA9) tidak ikut terhapus oleh perubahan SA10a', () => {
  const match = INDEX_HTML.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/);
  assert.match(match[1], /script-src-attr\s+'none'/);
});

test('CSP: index.html & app_production.html sinkron (meta tag identik)', () => {
  const idx = INDEX_HTML.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/)[1];
  const prod = PROD_HTML.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/)[1];
  assert.equal(idx, prod);
});
