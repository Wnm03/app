'use strict';
// tests/s1608-modules-modals-orphan-guard.test.js
// Sesi s1608 -- tindak lanjut rekomendasi maintainability pasca-s1607
// ("family tanpa test file yang menyentuhnya langsung", lihat
// docs/COVERAGE-PER-MODULE.md). Satu-satunya family yang tersisa tanpa test
// langsung adalah `modules/modals.js` (file TOP-LEVEL di modules/, BUKAN
// modules/shared/modals.js).
//
// Investigasi: `modules/modals.js` sudah didokumentasikan sebagai file
// DEAD/ORPHAN sejak AUDIT-S572-DUPLICATE-SOURCE-STALE-STATE.md -- salinan
// lama peninggalan restrukturisasi folder (Sesi 17-18) yang TIDAK PERNAH
// direferensikan `scripts/build.js` (satu-satunya sumber modal HTML yang
// dibundel adalah `modules/shared/modals.js`, lihat `SOURCE_FILES` di
// build.js). Karena itu, menulis test FUNGSIONAL untuk isi
// `modules/modals.js` tidak ada gunanya -- kode itu tidak pernah jalan di
// app produksi.
//
// Yang justru bernilai (dan itu isi file test ini): GUARD yang mengunci
// status "orphan yang disengaja" ini secara eksplisit & otomatis, supaya:
//   1. Kalau suatu saat sesi lain (manusia/AI) tanpa sadar menambahkan
//      `modules/modals.js` (bukan `modules/shared/modals.js`) ke daftar
//      sumber build.js, test ini GAGAL -- sinyal dini sebelum ke-deploy
//      dgn modal HTML yang salah/basi.
//   2. Kalau file `modules/modals.js` dihapus di masa depan (sesuai
//      rekomendasi jangka panjang di AUDIT-S572), test ini juga akan gagal
//      dgn pesan jelas -- pengingat utk update test ini juga, bukan
//      ditinggal sbg dangling reference.
//   3. Memberi family `modules/modals.js` 1 test file yang menyentuhnya
//      scr langsung (structural coverage), menutup gap terakhir di
//      docs/COVERAGE-PER-MODULE.md TANPA berpura-pura file itu berguna.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ORPHAN_MODALS_PATH = path.join(ROOT, 'modules', 'modals.js');
const LIVE_MODALS_PATH = path.join(ROOT, 'modules', 'shared', 'modals.js');
const BUILD_SRC = fs.readFileSync(path.join(ROOT, 'scripts', 'build.js'), 'utf8');

test('s1608 guard: modules/modals.js (orphan) masih ada di disk -- dikonfirmasi eksis, bukan sudah dihapus tanpa sepengetahuan', () => {
  assert.ok(fs.existsSync(ORPHAN_MODALS_PATH), 'Kalau file ini sudah dihapus, HAPUS juga test ini (dan baris terkait di AUDIT-S572-DUPLICATE-SOURCE-STALE-STATE.md) -- jangan biarkan dangling.');
});

test('s1608 guard: modules/shared/modals.js (LIVE) tetap ada -- ini yang benar-benar dibundel', () => {
  assert.ok(fs.existsSync(LIVE_MODALS_PATH));
});

test('s1608 guard: build.js TIDAK mereferensikan modules/modals.js (path top-level) sbg sumber bundel', () => {
  // Regex batas kata longgar tapi ketat soal path persis: harus TIDAK ada
  // literal 'modules/modals.js' yang BUKAN bagian dari 'modules/shared/modals.js'
  // atau 'modules/shop/modals.js' dsb (yaitu tepat didahului tanda kutip/spasi,
  // bukan didahului '/shared' atau '/shop' dst).
  const matches = BUILD_SRC.match(/['"`](modules\/modals\.js)['"`]/g) || [];
  assert.deepEqual(matches, [], 'build.js TIDAK BOLEH mereferensikan modules/modals.js (orphan) sbg sumber bundel -- kalau test ini gagal, kemungkinan besar ada regresi yang menghidupkan kembali file dead/orphan ini ke build produksi.');
});

test('s1608 guard: build.js TETAP mereferensikan modules/shared/modals.js sbg satu-satunya sumber modal HTML', () => {
  assert.ok(BUILD_SRC.includes(`'modules/shared/modals.js'`), 'modules/shared/modals.js harus tetap jadi sumber modal HTML yang dibundel.');
});

test('s1608 guard: MODAL_VERSION di build.js version-sync list mengarah ke modules/shared/modals.js, bukan orphan-nya', () => {
  assert.ok(BUILD_SRC.includes(`{ file: 'modules/shared/modals.js', varName: 'MODAL_VERSION' }`));
});
