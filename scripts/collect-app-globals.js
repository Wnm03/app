#!/usr/bin/env node
'use strict';
/**
 * collect-app-globals.js — kumpulkan semua identifier top-level (function,
 * const, let) dari SEMUA file source app (GROUP_A + GROUP_B di build.js,
 * plus data-default.js), supaya eslint.config.js tahu daftar "global lintas
 * file" itu tanpa perlu daftar manual yang gampang basi.
 *
 * Kenapa perlu ini: app ini sengaja ditulis sebagai kumpulan <script> global
 * (bukan ES module) yang digabung build.js jadi 1 bundle — pola ini
 * didokumentasikan di banyak file source (mis. "dipanggil dari file lain
 * sbg variabel global saat runtime"). Jadi function/const di modules-render.js
 * dipakai bebas dari modals.js, transaksi.js, dst. Kalau ESLint tidak tahu
 * daftar ini, no-undef akan salah-tuduh ratusan pemakaian yang sah sebagai
 * error.
 *
 * Hanya dipakai lewat eslint.config.js — bukan bagian dari build produksi.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Sumber daftar file: build.js sendiri (GROUP_A/GROUP_B), supaya tidak ada
// dua sumber kebenaran yang bisa beda. Kalau build.js belum ke-load (mis.
// dipanggil dari luar folder ini), fallback ke daftar manual di bawah.
function getAllSourceFiles() {
  try {
    // eslint-disable-next-line global-require
    const buildJs = fs.readFileSync(path.join(ROOT, 'scripts', 'build.js'), 'utf8');
    const groupARe = /const GROUP_A\s*=\s*\[([\s\S]*?)\];/;
    const groupBRe = /const GROUP_B\s*=\s*\[([\s\S]*?)\];/;
    const extractNames = (m) => (m ? m[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1)) : []);
    const groupA = extractNames(buildJs.match(groupARe));
    const groupB = extractNames(buildJs.match(groupBRe));
    if (groupA.length && groupB.length) return [...groupA, ...groupB];
  } catch (e) {
    // fallthrough ke fallback
  }
  return fs.readdirSync(ROOT).filter((f) => f.endsWith('.js') && !f.includes('.min.'));
}

// Regex identifier top-level, dijalankan di atas teks yang sudah di-mask
// (lihat maskNonTopLevel) supaya isi function body / blok bersarang tidak
// ikut ketangkep — codebase ini nyaris tanpa indentasi di level fungsi,
// jadi heuristik berbasis indentasi TIDAK bisa dipakai; harus lacak
// kedalaman kurung/kurawal/kurung-siku beneran (sama gaya dgn lint custom
// yang sudah ada di build.js, mis. scanConcatExpr()).
const TOPLEVEL_DECL_RE = /^(?:async\s+function|function)\s+([A-Za-z_$][\w$]*)\s*\(|^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm;

// Ganti semua karakter yang berada di dalam kedalaman ()/[]/{} > 0, atau di
// dalam string/template literal/komentar, jadi spasi (baris & posisi kolom
// tetap sama persis, cuma isinya "dikosongkan") — supaya declaration yang
// benar-benar top-level (depth 0) satu-satunya yang tersisa utuh utk di-regex.
function maskNonTopLevel(src) {
  let depth = 0;
  let quote = null; // ' " `
  let lineComment = false;
  let blockComment = false;
  const out = new Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const c2 = src[i + 1];
    if (lineComment) {
      out[i] = c === '\n' ? '\n' : ' ';
      if (c === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      out[i] = c === '\n' ? '\n' : ' ';
      if (c === '*' && c2 === '/') { out[i + 1] = ' '; blockComment = false; i++; }
      continue;
    }
    if (quote) {
      out[i] = c === '\n' ? '\n' : ' ';
      if (c === '\\') { out[i + 1] = ' '; i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && c2 === '/') { lineComment = true; out[i] = ' '; continue; }
    if (c === '/' && c2 === '*') { blockComment = true; out[i] = ' '; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; out[i] = depth === 0 ? c : ' '; continue; }
    if (c === '{' || c === '(' || c === '[') { out[i] = depth === 0 ? c : ' '; depth++; continue; }
    if (c === '}' || c === ')' || c === ']') { depth = Math.max(0, depth - 1); out[i] = depth === 0 ? c : ' '; continue; }
    out[i] = depth === 0 ? c : ' ';
  }
  return out.join('');
}

function collectFromFile(file) {
  const names = new Set();
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) return names;
  const src = fs.readFileSync(fullPath, 'utf8');
  const masked = maskNonTopLevel(src);
  let m;
  TOPLEVEL_DECL_RE.lastIndex = 0;
  while ((m = TOPLEVEL_DECL_RE.exec(masked))) {
    names.add(m[1] || m[2]);
  }
  return names;
}

function collectAppGlobals() {
  const files = getAllSourceFiles();
  const all = new Set();
  for (const f of files) {
    collectFromFile(f).forEach((n) => all.add(n));
  }
  // Objek globals ala ESLint flat config: writable ('writable') karena
  // beberapa modul mengubah state module lain (mis. D di
  // features-helpers-global-security.js).
  const globals = {};
  for (const name of all) globals[name] = 'writable';
  return globals;
}

module.exports = { collectAppGlobals, getAllSourceFiles, collectFromFile, maskNonTopLevel };

if (require.main === module) {
  console.log(JSON.stringify(collectAppGlobals(), null, 2));
}
