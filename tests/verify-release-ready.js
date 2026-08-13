#!/usr/bin/env node
'use strict';
/**
 * verify-release-ready.js — Sesi 424
 * =============================================================
 * Gate WAJIB sebelum bikin ZIP rilis (lihat docs/ZIP_RULES.md, langkah
 * baru "Release Gate" yang disisipkan antara Build dan ZIP).
 *
 * Kenapa perlu ini secara terpisah dari `npm run check`/`scripts/build.js`:
 * project ini TIDAK memakai `scripts/release.sh` (butuh git repo persisten)
 * -- alur kerja nyata project ini adalah ZIP per sesi (lihat
 * docs/ZIP_RULES.md: "ZIP adalah cara SATU-SATUNYA user menerima hasil
 * kerja"), seringkali dari sandbox/environment TANPA akses jaringan (jadi
 * `npm install` esbuild/eslint bisa gagal). Sebelum sesi ini, kalau itu
 * terjadi, ZIP tetap dibuat & FIX-*.md cuma mencatat "lint tidak bisa
 * dijalankan" -- catatan prosa yang gampang jadi template kosong, tidak
 * ada yang benar2 MEMBLOKIR ZIP dibuat kalau statusnya sebenarnya "lint
 * ERROR beneran ditemukan" (bukan cuma "tidak tersedia").
 *
 * Skrip ini membedakan 2 gate independen, masing2 dengan aturan sendiri:
 *
 *   GATE 1 — LINT
 *     - 'passed'      : `eslint .` jalan & 0 error -> lolos, tidak perlu apa2.
 *     - 'failed'      : `eslint .` jalan & ADA error -> BLOCK, TIDAK ADA
 *                        override apapun (ini bug beneran, bukan masalah
 *                        environment -- harus diperbaiki, bukan dikonfirmasi).
 *     - 'unavailable' : `eslint` tidak ketemu / gagal jalan sama sekali
 *                        (mis. tidak terpasang, tidak ada akses jaringan
 *                        utk install) -> BLOCK by default, TAPI boleh
 *                        di-override manual (lihat di bawah).
 *
 *   GATE 2 — MINIFIKASI (esbuild)
 *     - Bundle ADA & mengandung marker "DIBUAT OTOMATIS oleh build.js"
 *       -> berarti TIDAK diminify (fallback) -> BLOCK by default, boleh
 *       di-override manual.
 *     - Bundle ADA & TIDAK mengandung marker itu -> diminify -> lolos.
 *     - Bundle TIDAK ADA sama sekali -> BLOCK, TIDAK ADA override (build
 *       belum pernah dijalankan sukses -- jalankan `npm run build` dulu).
 *
 * OVERRIDE (HANYA utk 'unavailable'/unminified, BUKAN utk 'failed'):
 *   Set env var berikut dengan ALASAN NYATA (bukan string kosong/dummy):
 *     CONFIRM_LINT_UNAVAILABLE_REASON="..."
 *     CONFIRM_UNMINIFIED_REASON="..."
 *   Override HANYA berlaku kalau isinya bukan string kosong. Tiap override
 *   dicatat PERMANEN (append-only) ke docs/RELEASE-GATE-LOG.md dengan
 *   timestamp + versi + alasan -- supaya ada jejak audit, BUKAN cuma baris
 *   di console yang hilang begitu terminal ditutup (poin utama task
 *   "jangan cuma dicatat di komentar").
 *
 * Exit code: 0 = boleh lanjut bikin ZIP. 1 = BLOCK, ZIP JANGAN dibuat
 * dulu sebelum ini lolos (atau overridden dengan alasan valid).
 *
 * Pemakaian:
 *   node scripts/verify-release-ready.js
 *   CONFIRM_UNMINIFIED_REASON="sandbox tanpa akses jaringan, esbuild tdk
 *     bisa diinstall (npm error 403)" node scripts/verify-release-ready.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const UNMINIFIED_MARKER = 'DIBUAT OTOMATIS oleh build.js';
const BUNDLE_FILES = ['app-bundle-a.min.js', 'app-bundle-b.min.js'];
const LOG_FILE = path.join(ROOT, 'docs', 'RELEASE-GATE-LOG.md');

// Sinyal "eslint tidak tersedia di environment ini" (bukan lint error
// sungguhan): command tidak ketemu (127/ENOENT), npx tidak bisa
// resolve/install paketnya (403/404 registry, tidak ada akses jaringan).
const UNAVAILABLE_SIGNAL_RE = /not found|command not found|could not determine executable|ENOENT|npm error (403|404)|ENOTFOUND|network/i;

function checkLint() {
  // Jalankan persis command yg dipakai "npm run lint" (package.json:
  // "lint": "eslint .") -- node_modules/.bin ditambahkan ke PATH manual
  // supaya perilakunya identik dgn dijalankan lewat npm run, tanpa
  // dependensi ke npx (yg di beberapa environment tetap mencoba fetch
  // dari registry walau --no-install, bikin sinyal "unavailable" vs
  // "gagal krn network" jadi rancu).
  const binDir = path.join(ROOT, 'node_modules', '.bin');
  const env = Object.assign({}, process.env, {
    PATH: `${binDir}${path.delimiter}${process.env.PATH || ''}`,
  });
  try {
    execSync('eslint .', { cwd: ROOT, stdio: 'pipe', env });
    return { status: 'passed', detail: '0 error/warning.' };
  } catch (e) {
    const out = `${e.stdout || ''}${e.stderr || ''}`;
    const unavailable = e.status === 127 || UNAVAILABLE_SIGNAL_RE.test(out);
    if (unavailable) {
      return {
        status: 'unavailable',
        detail: out.trim().slice(0, 500) || `eslint tidak bisa dijalankan (exit ${e.status}).`,
      };
    }
    return { status: 'failed', detail: out.trim().slice(0, 2000) || `eslint keluar dgn exit ${e.status}.` };
  }
}

function checkMinified() {
  const results = {};
  for (const file of BUNDLE_FILES) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) {
      results[file] = { status: 'missing' };
      continue;
    }
    const head = fs.readFileSync(full, 'utf8').slice(0, 2000);
    results[file] = { status: head.includes(UNMINIFIED_MARKER) ? 'unminified' : 'minified' };
  }
  return results;
}

// Sesi 425: index.html adalah satu-satunya sumber kebenaran; app_production.html
// harus persis index.html + komentar AUTO-GENERATED yang disisipkan build.js
// tepat setelah <head>. Cocok dgn logic penyisipan di build.js — kalau string
// marker itu berubah di satu tempat, ubah juga di tempat lain.
const AUTOGEN_MARKER =
  '<!-- AUTO-GENERATED oleh scripts/build.js dari index.html — JANGAN edit file ini langsung.\n' +
  '     Edit index.html, lalu jalankan "node scripts/build.js" (file ini disalin ulang otomatis). -->\n';

function checkHtmlSync() {
  const idxPath = path.join(ROOT, 'index.html');
  const prodPath = path.join(ROOT, 'app_production.html');
  if (!fs.existsSync(idxPath) || !fs.existsSync(prodPath)) {
    return { status: 'missing' };
  }
  const idx = fs.readFileSync(idxPath, 'utf8');
  const prod = fs.readFileSync(prodPath, 'utf8');
  const expected = idx.replace('<head>', '<head>\n' + AUTOGEN_MARKER);
  return { status: prod === expected ? 'synced' : 'drifted' };
}

// Sesi 575 (cache-bump gate): mencegah pola bug "fix sudah benar di source,
// tapi browser/Service Worker masih serve app-bundle-a/b.min.js versi LAMA"
// -- terjadi karena ?v=N di index.html/app_production.html dan CACHE_NAME di
// sw.js lupa dinaikkan bareng saat bundle berubah (kejadian nyata: semua
// masih ?v=1314 padahal source sudah difix, lihat PATCH-README-v1316-cache-
// bump.md). scripts/bump-version.sh SUDAH menaikkan ketiganya sekaligus
// dengan benar -- gate ini murni jaring pengaman terakhir kalau versi
// di-bump manual (lupa satu tempat) sebelum ZIP dibuat.
function checkVersionSync() {
  const idxPath = path.join(ROOT, 'index.html');
  const swPath = path.join(ROOT, 'sw.js');
  if (!fs.existsSync(idxPath) || !fs.existsSync(swPath)) {
    return { status: 'missing' };
  }
  const idx = fs.readFileSync(idxPath, 'utf8');
  const sw = fs.readFileSync(swPath, 'utf8');

  const htmlVersions = [...idx.matchAll(/\?v=(\d+)/g)].map((m) => m[1]);
  if (htmlVersions.length === 0) {
    return { status: 'no-version-found' };
  }
  const uniqueHtmlVersions = [...new Set(htmlVersions)];

  const swMatch = sw.match(/CACHE_NAME\s*=\s*'kw-cache-v(\d+)'/);
  if (!swMatch) {
    return { status: 'no-version-found' };
  }
  const swVersion = swMatch[1];

  if (uniqueHtmlVersions.length > 1) {
    return { status: 'html-inconsistent', htmlVersions: uniqueHtmlVersions, swVersion };
  }
  if (uniqueHtmlVersions[0] !== swVersion) {
    return { status: 'mismatch', htmlVersions: uniqueHtmlVersions, swVersion };
  }
  return { status: 'synced', version: swVersion };
}

function readAppVersion() {
  const candidates = [
    path.join(ROOT, 'modules/shared/features-helpers-global-security.js'),
    path.join(ROOT, 'features-helpers-global-security.js'),
  ];
  for (const full of candidates) {
    if (!fs.existsSync(full)) continue;
    const src = fs.readFileSync(full, 'utf8');
    const m = src.match(/APP_BUILD_VERSION\s*=\s*'([^']+)'/);
    if (m) return m[1];
  }
  return 'unknown';
}

function appendAuditLog(entries) {
  const ts = new Date().toISOString();
  const version = readAppVersion();
  let block = `\n## ${ts} — versi ${version}\n\n`;
  for (const e of entries) block += `- **${e.gate}**: override dipakai. Alasan: ${e.reason}\n`;
  if (!fs.existsSync(LOG_FILE)) {
    const header =
      '# RELEASE-GATE-LOG.md — audit log override gate rilis (Sesi 424)\n\n' +
      '> Append-only. Setiap kali `scripts/verify-release-ready.js` di-override manual\n' +
      '> (lint tidak tersedia / bundle belum diminify), entri baru ditambahkan di sini\n' +
      '> OTOMATIS oleh skrip itu sendiri -- JANGAN diedit tangan, JANGAN dihapus entri\n' +
      '> lama. Ini jejak audit permanen: kalau ada rilis yang ternyata bermasalah,\n' +
      '> file ini menunjukkan persis kapan & kenapa gate itu dilewati.\n';
    fs.writeFileSync(LOG_FILE, header + block);
  } else {
    fs.appendFileSync(LOG_FILE, block);
  }
}

function main() {
  console.log('Release Gate — mengecek kesiapan rilis sebelum ZIP dibuat (Sesi 424)...\n');

  const lint = checkLint();
  const minify = checkMinified();

  const blocking = [];
  const overridden = [];

  // --- Gate 1: lint ---
  if (lint.status === 'passed') {
    console.log('✓ GATE lint: lolos (0 error).');
  } else if (lint.status === 'failed') {
    console.error('✗ GATE lint: GAGAL — ada error lint sungguhan (TIDAK BISA di-override):');
    console.error(lint.detail.split('\n').map((l) => '    ' + l).join('\n'));
    blocking.push('lint (error sungguhan, wajib diperbaiki)');
  } else {
    const reason = process.env.CONFIRM_LINT_UNAVAILABLE_REASON;
    if (reason && reason.trim()) {
      console.log(`⚠️  GATE lint: eslint TIDAK TERSEDIA di environment ini -- DI-OVERRIDE manual.`);
      console.log(`    Alasan: ${reason.trim()}`);
      overridden.push({ gate: 'lint-unavailable', reason: reason.trim() });
    } else {
      console.error('✗ GATE lint: eslint TIDAK TERSEDIA/tidak bisa dijalankan di environment ini.');
      console.error(`    Detail: ${lint.detail}`);
      console.error(
        '    Kalau ini memang batasan environment (mis. sandbox tanpa akses jaringan) DAN\n' +
        '    kamu sudah verifikasi manual bahwa perubahan kode tidak melanggar style lint\n' +
        '    yang biasa dicek, override dengan:\n' +
        '      CONFIRM_LINT_UNAVAILABLE_REASON="alasan nyata di sini" node scripts/verify-release-ready.js'
      );
      blocking.push('lint (tidak tersedia, belum di-override)');
    }
  }

  // --- Gate 2: minify ---
  const missing = BUNDLE_FILES.filter((f) => minify[f].status === 'missing');
  const unminified = BUNDLE_FILES.filter((f) => minify[f].status === 'unminified');
  if (missing.length) {
    console.error(`✗ GATE minify: bundle belum ada sama sekali (${missing.join(', ')}) -- jalankan "npm run build" dulu. TIDAK BISA di-override.`);
    blocking.push('minify (bundle belum ada)');
  } else if (unminified.length === 0) {
    console.log('✓ GATE minify: kedua bundle sudah diminify (esbuild terdeteksi jalan).');
  } else {
    const reason = process.env.CONFIRM_UNMINIFIED_REASON;
    if (reason && reason.trim()) {
      console.log(`⚠️  GATE minify: bundle TANPA minifikasi (esbuild tidak jalan) -- DI-OVERRIDE manual.`);
      console.log(`    File: ${unminified.join(', ')}`);
      console.log(`    Alasan: ${reason.trim()}`);
      overridden.push({ gate: 'unminified-bundle', reason: reason.trim() });
    } else {
      console.error(`✗ GATE minify: bundle TANPA minifikasi (${unminified.join(', ')}) -- esbuild tidak terpasang/tidak jalan.`);
      console.error(
        '    Kalau ini memang batasan environment (esbuild tidak bisa diinstall, mis. tidak\n' +
        '    ada akses jaringan) DAN ukuran bundle besar sudah bisa diterima utk rilis ini,\n' +
        '    override dengan:\n' +
        '      CONFIRM_UNMINIFIED_REASON="alasan nyata di sini" node scripts/verify-release-ready.js'
      );
      blocking.push('minify (unminified, belum di-override)');
    }
  }

  // --- Gate 3: sinkronisasi index.html <-> app_production.html (Sesi 425) ---
  const htmlSync = checkHtmlSync();
  if (htmlSync.status === 'synced') {
    console.log('✓ GATE html-sync: app_production.html sinkron dgn index.html.');
  } else if (htmlSync.status === 'missing') {
    console.error('✗ GATE html-sync: index.html atau app_production.html tidak ditemukan. TIDAK BISA di-override.');
    blocking.push('html-sync (file hilang)');
  } else {
    console.error('✗ GATE html-sync: app_production.html BEDA dari index.html — kemungkinan lupa jalankan build setelah edit HTML, atau app_production.html diedit langsung. TIDAK BISA di-override.');
    console.error('    Perbaikan: jalankan "node scripts/build.js" lagi (itu menulis ulang app_production.html dari index.html), lalu jalankan gate ini ulang.');
    blocking.push('html-sync (app_production.html menyimpang dari index.html)');
  }

  // --- Gate 4: sinkronisasi versi ?v= (index.html) <-> CACHE_NAME (sw.js) ---
  const versionSync = checkVersionSync();
  if (versionSync.status === 'synced') {
    console.log(`✓ GATE version-sync: index.html (?v=${versionSync.version}) & sw.js (CACHE_NAME) sinkron.`);
  } else if (versionSync.status === 'missing') {
    console.error('✗ GATE version-sync: index.html atau sw.js tidak ditemukan. TIDAK BISA di-override.');
    blocking.push('version-sync (file hilang)');
  } else if (versionSync.status === 'no-version-found') {
    console.error('✗ GATE version-sync: tidak menemukan pola ?v=N di index.html atau CACHE_NAME di sw.js. TIDAK BISA di-override.');
    blocking.push('version-sync (pola versi tidak ditemukan)');
  } else if (versionSync.status === 'html-inconsistent') {
    console.error(`✗ GATE version-sync: index.html sendiri punya ?v= yang TIDAK seragam (${versionSync.htmlVersions.join(', ')}). TIDAK BISA di-override.`);
    console.error('    Perbaikan: jalankan "./scripts/bump-version.sh" untuk menyamakan semua ?v= sekaligus.');
    blocking.push('version-sync (?v= tidak seragam di index.html)');
  } else {
    console.error(`✗ GATE version-sync: index.html pakai ?v=${versionSync.htmlVersions[0]} tapi sw.js pakai CACHE_NAME kw-cache-v${versionSync.swVersion} -- TIDAK SINKRON. TIDAK BISA di-override.`);
    console.error('    Ini persis pola bug lama: browser/Service Worker bisa tetap serve bundle LAMA walau source sudah difix.');
    console.error('    Perbaikan: jalankan "./scripts/bump-version.sh" (menyamakan ?v= di HTML & CACHE_NAME di sw.js sekaligus).');
    blocking.push('version-sync (?v= HTML vs CACHE_NAME sw.js tidak sinkron)');
  }

  if (overridden.length) appendAuditLog(overridden);

  console.log('');
  if (blocking.length) {
    console.error(`❌ RELEASE GATE GAGAL — ${blocking.length} hal memblokir ZIP: ${blocking.join('; ')}`);
    console.error('   ZIP rilis JANGAN dibuat sampai ini beres (perbaiki, atau override yg valid).');
    process.exit(1);
  }

  console.log('✅ RELEASE GATE LOLOS — aman untuk lanjut bikin ZIP.');
  if (overridden.length) {
    console.log(`   (${overridden.length} gate di-override manual, dicatat di docs/RELEASE-GATE-LOG.md)`);
  }
}

module.exports = { checkLint, checkMinified, checkHtmlSync, checkVersionSync, readAppVersion };

if (require.main === module) main();
