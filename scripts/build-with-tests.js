#!/usr/bin/env node
'use strict';
/**
 * build-with-tests.js — Sesi tambahan (permintaan user: "cek bug otomatis
 * sebelum build/release")
 * =============================================================
 * GATE tambahan yang dijalankan SEBELUM scripts/build.js: eksekusi seluruh
 * suite tests/*.test.js (node --test). Kalau ADA test yang gagal, build
 * DIHENTIKAN (process.exit(1)) — bundle app-bundle-a/b.min.js TIDAK akan
 * dihasilkan/diperbarui dari kode yang lagi rusak.
 *
 * Kenapa file BARU, bukan edit scripts/build.js langsung:
 *   - build.js sudah besar (2374 baris) & jadi satu sumber kebenaran untuk
 *     alur build yang sudah stabil dipakai tiap sesi — menambah langkah
 *     baru di file terpisah lebih aman (0 risiko regresi ke lint/bundling
 *     yang sudah ada di build.js).
 *   - Existing `npm run check` (lint && verify-window-expose && npm test &&
 *     npm run build) TETAP jalan seperti biasa & TIDAK diubah — script ini
 *     cuma opsi tambahan ("build:safe") untuk build sehari-hari di luar
 *     alur release, supaya bug tertangkap lebih awal tanpa perlu jalanin
 *     seluruh "check" secara manual tiap kali.
 *
 * PERUBAHAN (tambahan): sebelum tests, jalankan juga 2 gate cepat yang
 * sebelumnya cuma ada di "npm run check" (lint & verify-window-expose) --
 * dua bug class ini SERING baru ketahuan pas rilis/ZIP, padahal keduanya
 * murni statis (tidak butuh browser/data), jadi cocok digeser ke gate build
 * sehari-hari juga. Urutan: lint → verify-window-expose → test → build.js
 * (berhenti di gate pertama yang gagal, hemat waktu -- tidak perlu tunggu
 * 4200 test kalau lint-nya saja sudah error).
 *
 * Pemakaian:
 *   npm run build:safe                  → lint + verify-window-expose + tests, kalau semua lolos lanjut build.js (auto-increment versi)
 *   npm run build:safe nama-versi-baru   → sama, versi custom diteruskan ke build.js
 *   SKIP_TESTS=1 npm run build:safe      → lewati SEMUA gate (darurat/offline), langsung build.js
 *   SKIP_LINT=1 npm run build:safe       → lewati gate lint saja (mis. eslint belum terpasang, tanpa internet)
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function run(cmd, args) {
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  return res.status === null ? 1 : res.status;
}

function gate(label, cmd, args, skipEnv, hint) {
  if (process.env.SKIP_TESTS === '1') return true;
  if (skipEnv && process.env[skipEnv] === '1') {
    console.log(`⚠️  ${skipEnv}=1 — gate "${label}" dilewati.`);
    return true;
  }
  console.log(`🔎 Gate: ${label}...`);
  const status = run(cmd, args);
  if (status !== 0) {
    console.error(
      `\n❌ BUILD DIHENTIKAN — gate "${label}" gagal (lihat output di atas).\n` +
      (hint ? `   ${hint}\n` : '') +
      '   (Darurat/offline, lewati SEMUA gate: SKIP_TESTS=1 npm run build:safe)'
    );
    process.exit(1);
  }
  console.log(`✅ Gate "${label}" lolos.\n`);
  return true;
}

function main() {
  if (process.env.SKIP_TESTS === '1') {
    console.log('⚠️  SKIP_TESTS=1 — SEMUA gate dilewati, langsung build.js (pakai ini cuma kalau darurat/offline).');
  } else {
    gate('lint (eslint)', 'npm', ['run', 'lint'], 'SKIP_LINT',
      'Perbaiki error lint di atas, atau kalau eslint belum terpasang/tanpa internet: SKIP_LINT=1 npm run build:safe');
    gate('verify-window-expose', process.execPath, [path.join(ROOT, 'scripts', 'verify-window-expose.js')], null,
      'Tambahkan window.NamaModul=NamaModul; untuk modul yang ditandai di atas.');
    gate('tests (tests/*.test.js)', process.execPath, ['--test', 'tests/*.test.js'], null,
      'Perbaiki dulu test yang gagal, baru jalankan lagi "npm run build:safe".');
    console.log('✅ Semua gate lolos — lanjut ke build.js...\n');
  }

  const buildArgs = process.argv.slice(2);
  const buildStatus = run(process.execPath, [path.join(ROOT, 'scripts', 'build.js'), ...buildArgs]);
  process.exit(buildStatus);
}

main();
