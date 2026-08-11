#!/usr/bin/env node
'use strict';
/**
 * generate-file-map.js — generate `FILE-MAP.md` di root project: peta "file
 * mana isinya apa" + "fungsi/var global X ada di file mana", di-generate
 * OTOMATIS dari source (bukan ditulis manual) supaya TIDAK PERNAH basi.
 *
 * Kenapa ini dibuat (2026-07-11): `PEMISAHAN-FILE-ROADMAP.md` (dokumen
 * prosa manual, ditulis sekali lalu tidak pernah diupdate) jadi menyesatkan
 * setelah beberapa sesi split file berikutnya jalan tanpa balik update
 * dokumen itu — sampai nyebut nama file yang sudah tidak ada. Peta yang
 * di-generate dari source tidak bisa basi kayak gitu: kalau source berubah,
 * tinggal jalankan ulang script ini (atau `node build.js` yang otomatis
 * memanggilnya di akhir).
 *
 * Reuse logic dari collect-app-globals.js (daftar file dari GROUP_A/GROUP_B
 * di build.js sebagai satu-satunya sumber urutan-load yang benar, & parser
 * top-level declaration yang sudah ada) supaya tidak ada dua implementasi
 * parsing yang bisa beda hasil.
 *
 * Jalankan manual: `node scripts/generate-file-map.js`
 * Jalankan otomatis: setiap `node build.js` sukses (lihat pemanggilan di
 * akhir build.js).
 */
const fs = require('fs');
const path = require('path');
const { getAllSourceFiles, collectFromFile } = require('./collect-app-globals');

const ROOT = path.join(__dirname, '..');
const OUT_FILE = path.join(ROOT, 'docs', 'FILE-MAP.md');

// Ambil blok komentar `//` di baris paling atas file sebagai deskripsi
// singkat 1 file (konvensi yang sudah dipakai konsisten di codebase ini:
// "// nama-file.js — deskripsi ..."). Dipotong ke ~220 karakter biar tabel
// tetap enak dibaca, bukan diputus di tengah kata.
function extractDescription(src) {
  const lines = src.split('\n');
  const commentLines = [];
  for (const line of lines) {
    if (/^\/\/.*/.test(line)) commentLines.push(line.replace(/^\/\/\s?/, ''));
    else break;
  }
  if (!commentLines.length) return '_(tidak ada komentar header)_';
  let text = commentLines.join(' ').replace(/\s+/g, ' ').trim();
  // Buang prefix "nama-file.js — " kalau ada (sudah jelas dari nama kolom file di tabel)
  text = text.replace(/^[\w.-]+\.js\s*—\s*/, '');
  if (text.length > 220) {
    const cut = text.slice(0, 220);
    text = cut.slice(0, cut.lastIndexOf(' ')) + ' …';
  }
  return text || '_(tidak ada komentar header)_';
}

function buildFileEntries() {
  const files = getAllSourceFiles();
  const entries = [];
  for (const file of files) {
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) {
      entries.push({ file, missing: true });
      continue;
    }
    const src = fs.readFileSync(fullPath, 'utf8');
    const lineCount = src.split('\n').length;
    const names = Array.from(collectFromFile(file)).sort((a, b) => a.localeCompare(b));
    entries.push({ file, lineCount, desc: extractDescription(src), names });
  }
  return entries;
}

function buildFunctionIndex(entries) {
  const index = [];
  for (const e of entries) {
    if (e.missing) continue;
    for (const name of e.names) index.push({ name, file: e.file });
  }
  index.sort((a, b) => a.name.localeCompare(b.name));
  return index;
}

function renderMarkdown(entries, index) {
  const now = new Date().toISOString();
  const lines = [];
  lines.push('# FILE-MAP.md — peta file & fungsi global (AUTO-GENERATED, JANGAN EDIT MANUAL)');
  lines.push('');
  lines.push(`> Di-generate otomatis oleh \`node scripts/generate-file-map.js\` — dipanggil`);
  lines.push('> juga otomatis di akhir setiap `node build.js` yang sukses, jadi peta ini');
  lines.push('> SELALU sinkron dengan source terbaru. Kalau kamu (manusia atau Claude sesi');
  lines.push('> lain) mau tahu "fungsi X ada di file mana" atau "file Y isinya apa", cek di');
  lines.push('> sini dulu SEBELUM grep manual ke puluhan file — jauh lebih cepat & akurat');
  lines.push('> daripada dokumen prosa manual (yang gampang basi, lihat `archive/`).');
  lines.push('>');
  lines.push('> Kalau file ini kelihatan tidak sinkron dengan source (mis. abis rename/split');
  lines.push('> file tapi lupa `node build.js`), jalankan ulang generatornya, JANGAN diedit');
  lines.push('> tangan — editan manual bakal ketimpa lagi di build berikutnya.');
  lines.push('');
  lines.push(`Terakhir digenerate: ${now}`);
  lines.push(`Total file source: ${entries.length} · Total identifier global: ${index.length}`);
  lines.push('');
  lines.push('## 1. Urutan load & ringkasan tiap file');
  lines.push('');
  lines.push('Urutan sesuai `GROUP_A`+`GROUP_B` di `build.js` (urutan ini yang dipakai');
  lines.push('bundler menggabungkan semua file jadi `app-bundle-a.min.js`/`app-bundle-b.min.js`).');
  lines.push('');
  lines.push('| # | File | Baris | Ringkasan |');
  lines.push('|---|------|------:|-----------|');
  entries.forEach((e, i) => {
    if (e.missing) {
      lines.push(`| ${i + 1} | \`${e.file}\` | ⚠️ | **HILANG** — terdaftar di build.js tapi file tidak ditemukan di disk! |`);
      return;
    }
    lines.push(`| ${i + 1} | \`${e.file}\` | ${e.lineCount} | ${e.desc} |`);
  });
  lines.push('');
  lines.push('## 2. Index fungsi/variabel global → file (urut abjad)');
  lines.push('');
  lines.push('Semua identifier top-level (`function`, `const`, `let`, `var`) yang');
  lines.push('dideklarasikan langsung di level file (bukan di dalam fungsi lain) — ini yang');
  lines.push('bisa dipanggil sebagai "global" dari file manapun lewat bundel gabungan.');
  lines.push('');
  lines.push('| Nama | File |');
  lines.push('|------|------|');
  for (const { name, file } of index) {
    lines.push(`| \`${name}\` | \`${file}\` |`);
  }
  lines.push('');
  return lines.join('\n');
}

function main() {
  const entries = buildFileEntries();
  const index = buildFunctionIndex(entries);
  const missing = entries.filter((e) => e.missing);
  const md = renderMarkdown(entries, index);
  fs.writeFileSync(OUT_FILE, md, 'utf8');
  console.log(`✓ FILE-MAP.md ditulis (${entries.length} file, ${index.length} identifier global).`);
  if (missing.length) {
    console.log(`⚠️  ${missing.length} file terdaftar di build.js tapi tidak ditemukan di disk: ${missing.map((e) => e.file).join(', ')}`);
  }
  return { entries, index, missing };
}

module.exports = { main, buildFileEntries, buildFunctionIndex, extractDescription };

if (require.main === module) {
  main();
}
