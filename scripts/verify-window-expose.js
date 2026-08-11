#!/usr/bin/env node
'use strict';
/**
 * verify-window-expose.js — Sesi 423
 * =============================================================
 * Lint gate otomatis untuk bug class s345/s346/s347/s348: modul
 * (`const X={...}` top-level) yang dipakai lewat `data-action="X.method"`
 * di HTML/JS TAPI tidak pernah di-`window.X=X`. Dispatcher klik global
 * (features-helpers-global-security.js) selalu resolve `data-action`
 * lewat `window[X][method]` — tanpa expose ini, tombolnya gagal DIAM-DIAM
 * (tidak ada error console, tidak ada toast). Bug ini sudah kejadian 4x
 * (Sesi 345, 346, 347, 348) sebelum sesi ini, selalu ketemu lewat audit
 * MANUAL. Skrip ini menggantikan audit manual itu jadi gate otomatis yang
 * jalan tiap `npm run check`, sebelum test.
 *
 * Metode (persis pola audit Sesi 348, docs/FIX-v1012-*):
 *   1. Scan SEMUA file `.js` source (bukan test/scripts/bundle/backup)
 *      untuk deklarasi objek top-level: `const X={` / `let X={` / `var X={`.
 *      Dipisahkan top-level vs nested pakai maskNonTopLevel() dari
 *      collect-app-globals.js (sudah dipakai & terverifikasi di eslint
 *      config) — BUKAN implementasi baru, supaya tidak ada 2 sumber
 *      kebenaran utk "apa itu top-level" yang bisa beda hasil.
 *   2. Scan SEMUA file `.js`+`.html` (termasuk string HTML di dalam .js,
 *      mis. modules-render.js/modals.js) untuk `data-action="X.method"`.
 *   3. Scan SEMUA file `.js` untuk pola expose: `window.X=X`,
 *      `window['X']=X`, atau `window["X"]=X` (spasi opsional di semua
 *      titik, guard `if(typeof X!=='undefined')` di depannya diperbolehkan
 *      — cuma pola assignment-nya yang dicocokkan).
 *   4. Modul yang lolos kriteria (2) [dipakai data-action] TAPI gagal
 *      kriteria (3) [tidak pernah di-expose ke window] = FAIL. Build/check
 *      dihentikan (exit 1) kalau ada minimal 1 FAIL.
 *
 * Kenapa file scan LEBIH LUAS dari GROUP_A/GROUP_B (build.js): 2 modul
 * lazy-load (modules/business/sewakios.js, modules/home/renovasi.js)
 * SENGAJA dikeluarkan dari bundle (lihat komentar di build.js) tapi tetap
 * dimuat runtime & tetap butuh window-expose kalau dipakai data-action --
 * kalau scan cuma ikut GROUP_A/GROUP_B, 2 file itu jadi blind spot baru.
 *
 * Pemakaian:
 *   node scripts/verify-window-expose.js        -> exit 1 kalau ada FAIL
 *   node scripts/verify-window-expose.js --json  -> output JSON (utk tooling)
 *
 * Dipanggil otomatis dari `npm run check` (lihat package.json), SEBELUM
 * `npm test` -- gagal cepat, sebelum test suite yang lebih lambat jalan.
 * TIDAK dipanggil dari `npm run build` (build.js) sengaja supaya tanggung
 * jawab tetap terpisah: build.js compose bundle, check ini gate kualitas.
 */
const fs = require('fs');
const path = require('path');
const { maskNonTopLevel } = require('./collect-app-globals.js');

const ROOT = path.join(__dirname, '..');

// Direktori/file yang TIDAK ikut di-scan sama sekali (bukan source app).
const EXCLUDE_DIRS = new Set(['node_modules', 'tests', 'scripts', 'backups', '.git']);
const EXCLUDE_DIR_PREFIXES = ['RELEASE_REPORTS'];
// File infra yang bukan "modul" (tidak pernah didefinisikan lewat pola
// const X={...} yang dipanggil dari data-action) -- dikecualikan dari
// kriteria (1) supaya tidak menambah kebisingan hasil, TAPI tetap ikut
// di-scan untuk kriteria (2)/(3) (data-action & window-expose bisa saja
// muncul di file ini, mis. index.html).
const NON_MODULE_JS_BASENAMES = new Set(['eslint.config.js', 'sw.js', 'nav-scroll.js']);

function isExcludedDir(name) {
  if (EXCLUDE_DIRS.has(name)) return true;
  return EXCLUDE_DIR_PREFIXES.some((p) => name.startsWith(p));
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (isExcludedDir(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
      continue;
    }
    const name = entry.name;
    const isJs = name.endsWith('.js') && !name.includes('.min.');
    const isHtml = name.endsWith('.html');
    if (isJs || isHtml) out.push(path.join(dir, entry.name));
  }
}

function getAllScanFiles() {
  const out = [];
  walk(ROOT, out);
  return out.map((f) => path.relative(ROOT, f));
}

// Kriteria (1): deklarasi objek top-level `const|let|var X = {`.
const TOPLEVEL_OBJECT_DECL_RE = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\{/gm;

function findTopLevelObjectDecls(relFile) {
  const full = path.join(ROOT, relFile);
  const src = fs.readFileSync(full, 'utf8');
  const masked = maskNonTopLevel(src);
  const names = [];
  let m;
  TOPLEVEL_OBJECT_DECL_RE.lastIndex = 0;
  while ((m = TOPLEVEL_OBJECT_DECL_RE.exec(masked))) {
    names.push(m[1]);
  }
  return names;
}

// Kriteria (2): dipakai lewat data-action="X.method" (single atau double
// quote) -- dicek di teks MENTAH (bukan masked), karena bisa muncul di
// dalam string HTML di tengah .js (mis. template modal) atau di file .html.
const DATA_ACTION_RE = /data-action=["']([A-Za-z_$][\w$]*)\.[\w$]+["']/g;

function findDataActionPrefixes(relFile) {
  const full = path.join(ROOT, relFile);
  const src = fs.readFileSync(full, 'utf8');
  const names = new Set();
  let m;
  DATA_ACTION_RE.lastIndex = 0;
  while ((m = DATA_ACTION_RE.exec(src))) names.add(m[1]);
  return names;
}

// Kriteria (3): window.X=X / window['X']=X / window["X"]=X.
function hasWindowExpose(relFile, name) {
  const full = path.join(ROOT, relFile);
  const src = fs.readFileSync(full, 'utf8');
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `window(?:\\.${esc}|\\[['"]${esc}['"]\\])\\s*=\\s*${esc}\\b`
  );
  return re.test(src);
}

function verify() {
  const files = getAllScanFiles();
  const jsFiles = files.filter((f) => f.endsWith('.js'));

  // Kumpulkan semua deklarasi top-level per nama -> file asalnya (nama
  // pertama menang; kalau ada duplikat nama di >1 file, itu isu terpisah
  // di luar scope gate ini, sudah pernah diaudit manual di s347/s348).
  const declaredIn = new Map(); // name -> relFile
  for (const f of jsFiles) {
    if (NON_MODULE_JS_BASENAMES.has(path.basename(f))) continue;
    for (const name of findTopLevelObjectDecls(f)) {
      if (!declaredIn.has(name)) declaredIn.set(name, f);
    }
  }

  // Kumpulkan semua prefix data-action yang benar-benar dipakai, di
  // seluruh file (js + html).
  const usedAsDataAction = new Set();
  for (const f of files) {
    for (const name of findDataActionPrefixes(f)) usedAsDataAction.add(name);
  }

  const checked = [];
  const failures = [];
  for (const name of usedAsDataAction) {
    const declFile = declaredIn.get(name);
    if (!declFile) continue; // bukan const X={...} top-level -> di luar scope gate ini
    checked.push(name);
    // window-expose bisa ada di file deklarasi ATAU file lain (jarang,
    // tapi tidak dilarang) -- cek di SEMUA file .js, bukan cuma declFile.
    const exposed = jsFiles.some((f) => hasWindowExpose(f, name));
    if (!exposed) failures.push({ name, declFile });
  }

  return { checked, failures, totalDeclared: declaredIn.size, totalScanned: files.length };
}

function main() {
  const asJson = process.argv.includes('--json');
  const result = verify();

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.failures.length === 0) {
    console.log(
      `✓ verify-window-expose: OK — ${result.checked.length} modul dipakai lewat data-action, ` +
        `semuanya sudah window-expose (dari ${result.totalDeclared} deklarasi objek top-level, ` +
        `${result.totalScanned} file di-scan).`
    );
  } else {
    console.error(
      `✗ verify-window-expose: ${result.failures.length} modul dipakai lewat data-action TAPI ` +
        `TIDAK pernah di-window-expose (bug class s345-s348):\n`
    );
    for (const { name, declFile } of result.failures) {
      console.error(`  - ${name} (dideklarasikan di ${declFile}) -- tambahkan: window.${name}=${name};`);
    }
    console.error(
      `\nDispatcher data-action global resolve lewat window[X][method] -- tanpa expose ini,` +
        ` tombol terkait gagal DIAM-DIAM (tidak ada error, tidak ada toast).`
    );
  }

  if (result.failures.length > 0) process.exit(1);
}

module.exports = { verify, getAllScanFiles, findTopLevelObjectDecls, findDataActionPrefixes, hasWindowExpose };

if (require.main === module) main();
