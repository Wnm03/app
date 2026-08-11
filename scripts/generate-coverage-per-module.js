#!/usr/bin/env node
'use strict';
/**
 * generate-coverage-per-module.js — S331, tindak lanjut poin #3 (TERAKHIR)
 * dari daftar saran maintainability user pasca-audit S324 ("coverage per
 * modul"). Menghasilkan `docs/COVERAGE-PER-MODULE.md` (AUTO-GENERATED,
 * sama pola dgn FILE-MAP.md — bukan baseline manual yang bisa basi).
 *
 * Kenapa auto-generate, bukan tabel manual (spt "Coverage Baseline" di
 * AUDIT_MATRIX.md yang butuh lint drift terpisah supaya tidak basi): angka
 * per-modul di sini berubah tiap ada test baru — auto-generate dari source
 * SETIAP build berarti TIDAK PERNAH ada drift utk dijaga, jadi tidak perlu
 * lint baru/baseline yang harus disinkronkan manual (pola sama dgn
 * `docs/FILE-MAP.md`, bukan pola "Coverage Baseline" yg drift-checked).
 *
 * Metode (sengaja sederhana & murni struktural, BUKAN parse AST/coverage
 * instrumentation — pelajaran dari S327: percobaan dependency-graph
 * otomatis yg lebih canggih malah 718 false-positive, di-revert ke tabel
 * manual):
 *   1. "Source" per family: walk seluruh repo (skip node_modules/.git/
 *      backups/tests/scripts/lifeos-plugins-contoh dst yg bukan source
 *      app), kelompokkan tiap file .js (bukan .min.js) ke family
 *      berdasarkan folder tingkat pertama (`modules/<x>` -> family
 *      `modules/<x>`, `economic-intelligence/`/`lifeos/` -> family itu
 *      sendiri, file .js langsung di root -> family `root`).
 *   2. "Test" per family: scan seluruh `tests/*.test.js`, ambil semua
 *      string literal yg berbentuk path file .js (baik lewat
 *      `loadSource([...])` maupun literal lain), map ke family yg sama,
 *      lalu hitung berapa FILE test (bukan jumlah require, satu test file
 *      dihitung sekali per family biar tidak bias krn 1 file loadSource
 *      banyak dependency) yg MENYENTUH minimal 1 file di family itu.
 *   3. Family dgn 0 test file yg menyentuhnya ditandai ⚠️ — bukan berarti
 *      family itu 100% tidak diuji (test lain mungkin menguji lewat modul
 *      lain yg memanggilnya secara tidak langsung, cakupan ini sengaja
 *      konservatif/structural, bukan code-coverage instrumented), tapi
 *      minimal jadi sinyal awal "belum ada test yg SECARA LANGSUNG
 *      me-load file di family ini" utk ditinjau.
 *
 * Jalankan manual: `node scripts/generate-coverage-per-module.js`
 * Jalankan otomatis: setiap `node build.js` sukses (lihat pemanggilan di
 * akhir build.js, sebelah generate-file-map.js).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_FILE = path.join(ROOT, 'docs', 'COVERAGE-PER-MODULE.md');

const SKIP_DIRS = new Set(['node_modules', '.git', 'backups', 'tests', 'scripts', 'docs']);

// Family utk tiap folder tingkat pertama di bawah modules/ (auto-discover,
// bukan hardcode nama — supaya family baru yg ditambah sesi lain otomatis
// ikut tanpa perlu edit script ini).
function familyOf(relPath) {
  const segs = relPath.split('/');
  if (segs[0] === 'modules' && segs.length > 1) return `modules/${segs[1]}`;
  if (segs[0] === 'economic-intelligence') return 'economic-intelligence';
  if (segs[0] === 'lifeos') return 'lifeos';
  if (segs.length === 1 && segs[0].endsWith('.js')) return 'root';
  return null; // di luar cakupan (mis. tests/helpers, scripts/*)
}

function walkSourceFiles() {
  const files = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      if (SKIP_DIRS.has(name)) continue;
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) { walk(full); continue; }
      if (!name.endsWith('.js') || name.endsWith('.min.js')) continue;
      files.push(path.relative(ROOT, full).split(path.sep).join('/'));
    }
  };
  walk(ROOT);
  return files;
}

// Ambil semua string literal berbentuk "path/file.js" dari 1 test file
// (dipakai baik di loadSource([...]) maupun require/literal lain).
const JS_PATH_LITERAL_RE = /['"]([a-zA-Z0-9_.\-]+(?:\/[a-zA-Z0-9_.\-]+)*\.js)['"]/g;

function familiesReferencedByTestFile(content) {
  const found = new Set();
  let m;
  JS_PATH_LITERAL_RE.lastIndex = 0;
  while ((m = JS_PATH_LITERAL_RE.exec(content))) {
    const fam = familyOf(m[1]);
    if (fam) found.add(fam);
  }
  return found;
}

function buildCoverage() {
  const sourceFiles = walkSourceFiles();
  const sourceCountByFamily = {};
  for (const f of sourceFiles) {
    const fam = familyOf(f);
    if (!fam) continue;
    sourceCountByFamily[fam] = (sourceCountByFamily[fam] || 0) + 1;
  }

  const testCountByFamily = {};
  const testsDir = path.join(ROOT, 'tests');
  const testFiles = fs.existsSync(testsDir)
    ? fs.readdirSync(testsDir).filter((f) => f.endsWith('.test.js'))
    : [];
  for (const tf of testFiles) {
    const content = fs.readFileSync(path.join(testsDir, tf), 'utf8');
    for (const fam of familiesReferencedByTestFile(content)) {
      testCountByFamily[fam] = (testCountByFamily[fam] || 0) + 1;
    }
  }

  const families = Object.keys(sourceCountByFamily).sort((a, b) => {
    const ta = testCountByFamily[a] || 0;
    const tb = testCountByFamily[b] || 0;
    if (ta !== tb) return ta - tb; // family paling minim test duluan
    return a.localeCompare(b);
  });

  return families.map((fam) => ({
    family: fam,
    sourceFiles: sourceCountByFamily[fam],
    testFiles: testCountByFamily[fam] || 0,
  }));
}

function renderMarkdown(rows) {
  const now = new Date().toISOString();
  const totalTestFiles = fs.existsSync(path.join(ROOT, 'tests'))
    ? fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length
    : 0;
  const zeroCoverage = rows.filter((r) => r.testFiles === 0);

  const lines = [];
  lines.push('# COVERAGE-PER-MODULE.md — test coverage per module family (AUTO-GENERATED, JANGAN EDIT MANUAL)');
  lines.push('');
  lines.push('> Di-generate otomatis oleh `node scripts/generate-coverage-per-module.js` —');
  lines.push('> dipanggil juga otomatis di akhir setiap `node build.js` yang sukses. S331,');
  lines.push('> tindak lanjut poin #3 (TERAKHIR) dari daftar saran maintainability user');
  lines.push('> pasca-audit S324 ("coverage per modul") — lihat komentar header');
  lines.push('> `scripts/generate-coverage-per-module.js` untuk metodologi lengkap & batasannya.');
  lines.push('>');
  lines.push('> **Batasan penting**: ini cakupan STRUKTURAL (berapa file test yang secara');
  lines.push('> LANGSUNG me-load minimal 1 file di family itu lewat `loadSource([...])`/');
  lines.push('> literal path lain), BUKAN code-coverage ter-instrumentasi (mis. istanbul/c8).');
  lines.push('> Family dgn "0 test file" belum tentu 0% teruji sungguhan (bisa saja diuji');
  lines.push('> tidak langsung lewat modul lain yang memanggilnya) — anggap sbg sinyal awal');
  lines.push('> utk ditinjau, bukan vonis akhir. Kalau file ini kelihatan tidak sinkron,');
  lines.push('> jalankan ulang generatornya, JANGAN diedit tangan.');
  lines.push('');
  lines.push(`Terakhir digenerate: ${now}`);
  lines.push(`Total file test (\`tests/*.test.js\`): ${totalTestFiles} · Total module family: ${rows.length}`);
  lines.push('');
  lines.push('| Module family | File source (.js) | File test yang menyentuh | Status |');
  lines.push('|---|---:|---:|---|');
  for (const r of rows) {
    const status = r.testFiles === 0 ? '⚠️ 0 test file' : '';
    lines.push(`| \`${r.family}\` | ${r.sourceFiles} | ${r.testFiles} | ${status} |`);
  }
  lines.push('');
  if (zeroCoverage.length) {
    lines.push(`## Family tanpa test file yang menyentuhnya langsung (${zeroCoverage.length})`);
    lines.push('');
    lines.push('Kandidat prioritas kalau mau menambah test baru — urutan lain sama validnya,');
    lines.push('ini murni titik awal, bukan urutan wajib:');
    lines.push('');
    zeroCoverage.forEach((r) => lines.push(`- \`${r.family}\` (${r.sourceFiles} file source)`));
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  const rows = buildCoverage();
  const md = renderMarkdown(rows);
  fs.writeFileSync(OUT_FILE, md, 'utf8');
  const zero = rows.filter((r) => r.testFiles === 0).length;
  console.log(`✓ COVERAGE-PER-MODULE.md ditulis (${rows.length} family, ${zero} tanpa test file langsung).`);
  return { rows };
}

module.exports = { main, buildCoverage, familyOf };

if (require.main === module) {
  main();
}
