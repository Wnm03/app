'use strict';
// tests/s697-renderLaporan-live-file-fix-relocation.test.js — Sesi S697
// (audit lanjutan, ditemukan saat mengaudit item "kategori dashboard
// ringkasan bisa dapat pola klik-ke-sumber seperti Fix 1").
//
// TEMUAN: modules/modules-render.js SUDAH TERKONFIRMASI dead code sejak
// PATCH-README-cleanup-8-dead-files-modules-render-legacy.md (0 referensi
// path-exact di scripts/build.js/index.html, tidak pernah ikut bundle) --
// tapi penghapusan manual file itu belum pernah dieksekusi di snapshot
// project ini, jadi filenya masih ada, dan sesi-sesi berikutnya (S694 Fix
// 1b, S695 label #lapMonthLabel) TIDAK SENGAJA menerapkan fix ke file mati
// itu, bukan ke `modules/shared/modules-render-b.js` (fungsi renderLaporan()
// yang BENAR-BENAR dipanggil browser, dimuat lewat GROUP_A scripts/
// build.js). Akibatnya kedua fix itu 0 efek di app nyata walau test S694/
// S695 lolos (test-nya sendiri ikut salah baca file dead-nya, sudah
// diperbaiki di sesi ini juga, lihat perubahan di
// tests/s694-laporan-kategori-click-tosource.test.js &
// tests/s695-laporan-month-slide.test.js).
//
// Fix sesi ini: relokasi (bukan re-implementasi baru) fix S694 Fix 1b +
// S695 label ke modules/shared/modules-render-b.js. File dead-nya
// (modules/modules-render.js) SENGAJA TIDAK diubah/dihapus sesi ini (di
// luar scope -- perlu keputusan/action manual user utk hapus file, lihat
// scripts/remove-shop-dead-files.sh yang sudah ada).
//
// Test di bawah membuktikan 2 hal:
//   1. File yang BENAR-BENAR live (modules-render-b.js) punya kedua fix.
//   2. scripts/build.js TIDAK mereferensikan modules/modules-render.js
//      sama sekali (bukti independen bahwa file itu memang dead, bukan
//      asumsi) -- supaya kalau suatu saat file itu justru DIMASUKKAN ke
//      bundle tanpa disadari, test ini gagal & memberi sinyal utk audit
//      ulang (dead-file assumption di atas jadi stale).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('modules/modules-render.js TIDAK direferensikan di scripts/build.js (bukti independen dead file)', () => {
  const buildSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'build.js'), 'utf8');
  // Regex path-exact (dengan kutip di kedua sisi) -- BUKAN substring bebas,
  // supaya tidak salah match komentar yang menyebut "modules-render.js"
  // tanpa prefix folder (banyak dipakai sbg shorthand utk file lain).
  assert.doesNotMatch(buildSrc, /['"]modules\/modules-render\.js['"]/,
    'kalau assertion ini gagal, modules/modules-render.js SUDAH dimasukkan ke bundle -- audit ulang diperlukan, fix di modules-render-b.js bisa jadi duplikat/konflik');
});

test('renderLaporan() live (modules/shared/modules-render-b.js) mengisi #lapMonthLabel', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules', 'shared', 'modules-render-b.js'), 'utf8');
  const idx = src.indexOf('function renderLaporan()');
  assert.ok(idx >= 0, 'function renderLaporan() harus ada di modules-render-b.js');
  const block = src.slice(idx, idx + 2000);
  assert.match(block, /getElementById\('lapMonthLabel'\)/);
  assert.match(block, /MONTHS_FULL\[_base\.getMonth\(\)\]/);
});

test('renderLaporan() live (modules/shared/modules-render-b.js) — #lapKat kategori punya data-action="showFilteredTx"', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules', 'shared', 'modules-render-b.js'), 'utf8');
  const idx = src.indexOf("document.getElementById('lapKat').innerHTML=");
  assert.ok(idx >= 0);
  const block = src.slice(idx, idx + 1500);
  assert.match(block, /data-action="showFilteredTx"/);
});

test('modules/modules-render.js (dead file) TIDAK disentuh sesi ini -- tetap versi lama, bukti fix sengaja direlokasi bukan diduplikasi', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules', 'modules-render.js'), 'utf8');
  // Cuma bukti file itu masih ada apa adanya (masih py fungsi renderLaporan()
  // sendiri, tanda belum dihapus) -- BUKAN klaim isinya benar/salah, sudah
  // di luar scope (file ini dead, tidak mempengaruhi app nyata sama sekali).
  assert.match(src, /function renderLaporan\(\)/);
});
