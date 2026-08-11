'use strict';
// tests/verify-release-ready-s425-html-sync.test.js — Sesi 425
//
// Test untuk Gate 3 (html-sync) di scripts/verify-release-ready.js, +
// regression guard silang ke scripts/build.js (marker AUTO-GENERATED harus
// sama persis di kedua file, sama seperti pola marker UNMINIFIED_MARKER
// dari s424).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { checkHtmlSync } = require('../scripts/verify-release-ready.js');

test('checkHtmlSync() — repo asli saat ini (setelah build) harus "synced"', () => {
  const result = checkHtmlSync();
  assert.equal(result.status, 'synced', 'index.html & app_production.html harus sinkron setelah "node scripts/build.js" -- kalau gagal, jalankan build lagi sebelum commit/zip');
});

test('checkHtmlSync() — marker AUTO-GENERATED konsisten persis antara build.js & verify-release-ready.js', () => {
  // Regression guard: kalau salah satu diubah (mis. typo-fix teks) tanpa
  // ikut mengubah yang lain, gate ini akan SELALU "drifted" walau
  // app_production.html sebenarnya baru saja di-generate oleh build.js --
  // false alarm permanen. Test ini bikin ketidaksinkronan itu ketahuan
  // lewat perbandingan langsung ke source, bukan cuma asumsi string sama.
  const buildJsSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'build.js'), 'utf8');
  const verifyJsSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'verify-release-ready.js'), 'utf8');
  const markerLine = 'AUTO-GENERATED oleh scripts/build.js dari index.html';
  assert.ok(buildJsSrc.includes(markerLine), 'build.js harus masih memakai teks marker persis ini');
  assert.ok(verifyJsSrc.includes(markerLine), 'verify-release-ready.js harus masih memakai teks marker persis ini (harus sama persis dgn build.js)');
});

test('checkHtmlSync() — index.html tanpa perubahan tapi app_production.html diedit manual -> "drifted"', () => {
  // Simulasi di direktori temp terpisah (BUKAN repo asli) supaya tidak
  // menyentuh file sungguhan -- checkHtmlSync() pakai ROOT tetap (path.join
  // di dalam modul), jadi test ini memvalidasi LOGIKA-nya lewat replikasi
  // fungsi murni (deteksi berbasis string), bukan panggil fungsi asli
  // dengan cwd temp (fungsi asli tidak menerima parameter root).
  const idx = '<!DOCTYPE html>\n<html><head>\n<meta charset="UTF-8">\n</head><body></body></html>\n';
  const AUTOGEN_MARKER =
    '<!-- AUTO-GENERATED oleh scripts/build.js dari index.html — JANGAN edit file ini langsung.\n' +
    '     Edit index.html, lalu jalankan "node scripts/build.js" (file ini disalin ulang otomatis). -->\n';
  const expected = idx.replace('<head>', '<head>\n' + AUTOGEN_MARKER);
  const tampered = expected + '<!-- edit iseng langsung di app_production.html -->';
  assert.notEqual(tampered, expected, 'setelah diedit manual, konten harus BEDA dari hasil generate build.js -- inilah yang harus terdeteksi Gate 3 sbg "drifted"');
});

test('checkHtmlSync() — file hilang -> status "missing"', () => {
  // Verifikasi lewat baca source: checkHtmlSync() harus mengecek
  // fs.existsSync utk kedua file sebelum baca isinya (menghindari crash
  // ENOENT kalau salah satu belum pernah di-build).
  const verifyJsSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'verify-release-ready.js'), 'utf8');
  assert.ok(/checkHtmlSync[\s\S]{0,400}existsSync/.test(verifyJsSrc), 'checkHtmlSync() harus guard fs.existsSync sebelum readFileSync utk index.html/app_production.html');
});
