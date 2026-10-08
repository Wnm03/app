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
    const groupARe = /const GROUP_A\s*=\s*\[([\s\S]*?)\];/;
    const groupBRe = /const GROUP_B\s*=\s*\[([\s\S]*?)\];/;
    const extractNames = (m) => (m ? m[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1)) : []);
    const manifestFiles = [];
    // build.js is the canonical source/build manifest.
    const canonicalBuild = fs.readFileSync(path.join(ROOT, 'build.js'), 'utf8');
    manifestFiles.push(...extractNames(canonicalBuild.match(groupARe)), ...extractNames(canonicalBuild.match(groupBRe)));

    // scripts/build.js is the generated runtime manifest used by the deployed
    // bundle. Keep its entries as a compatibility union because this project
    // has historically accumulated SOT/lazy-loader entries there before the
    // root build manifest was updated. Only existing files are accepted below.
    const generatedBuildPath = path.join(ROOT, 'scripts', 'build.js');
    if (fs.existsSync(generatedBuildPath)) {
      const generatedBuild = fs.readFileSync(generatedBuildPath, 'utf8');
      manifestFiles.push(...extractNames(generatedBuild.match(groupARe)), ...extractNames(generatedBuild.match(groupBRe)));
    }

    if (manifestFiles.length) {
      const files = [...new Set(manifestFiles)].filter((file) => fs.existsSync(path.join(ROOT, file)));
      // Lazy-loaded classic scripts are intentionally outside GROUP_A/B, but
      // their top-level globals are still legitimate cross-file runtime globals.
      // Discover them from the canonical loader instead of maintaining a second
      // hard-coded list.
      const lazyLoaderPaths = [];
      const loaderFiles = [
        path.join(ROOT, 'modules', 'shared', 'boot-early.js'),
        path.join(ROOT, 'modules', 'shared', 'feature-lazy-loader.js'),
      ];
      for (const loaderFile of loaderFiles) {
        if (!fs.existsSync(loaderFile)) continue;
        const loaderSrc = fs.readFileSync(loaderFile, 'utf8');
        const re = /['"](modules\/[^'"]+\.js)(?:\?[^'"]*)?['"]/g;
        let lm;
        while ((lm = re.exec(loaderSrc))) lazyLoaderPaths.push(lm[1]);
      }
      return [...new Set([...files, ...lazyLoaderPaths])];
    }
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

  // Compatibility fallback for top-level function declarations that contain
  // template literals with `${...}`. The lightweight masker intentionally
  // does not parse template-expression nesting, so such a file can hide a
  // legitimate column-1 function declaration from TOPLEVEL_DECL_RE. The
  // application source convention keeps top-level declarations at column 1;
  // only column-1 function declarations are accepted here to avoid collecting
  // nested callbacks/handlers.
  const TOPLEVEL_FUNCTION_FALLBACK_RE = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  TOPLEVEL_FUNCTION_FALLBACK_RE.lastIndex = 0;
  while ((m = TOPLEVEL_FUNCTION_FALLBACK_RE.exec(src))) {
    names.add(m[1]);
  }
  // A common compact style in the legacy source closes one top-level
  // function and starts the next declaration on the same line (`}function
  // save(...)`). Accept that exact column-1 form as well; nested functions
  // normally have indentation and therefore cannot match this fallback.
  const TOPLEVEL_COMPACT_FUNCTION_RE = /^}\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  TOPLEVEL_COMPACT_FUNCTION_RE.lastIndex = 0;
  while ((m = TOPLEVEL_COMPACT_FUNCTION_RE.exec(src))) {
    names.add(m[1]);
  }

  // Compatibility fallback for top-level variable declarations. The
  // lightweight depth masker can become conservative around complex
  // template literals/object literals; the application convention keeps
  // module-level declarations at column 1. Accept only column-1 declarations
  // here so nested callbacks/blocks cannot become false globals.
  const TOPLEVEL_VAR_FALLBACK_RE = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm;
  TOPLEVEL_VAR_FALLBACK_RE.lastIndex = 0;
  while ((m = TOPLEVEL_VAR_FALLBACK_RE.exec(src))) {
    names.add(m[1]);
  }

  // Collect additional declarators in compact declarations such as
  // `let a=null, b=null, c=null;`. The primary fallback intentionally only
  // captures the first name; this pass stays anchored to a declaration and
  // therefore does not turn arbitrary top-level calls into fake globals.
  const TOPLEVEL_MULTI_VAR_RE = /^(?:const|let|var)\s+([^;\n]*)(?:;|$)/gm;
  TOPLEVEL_MULTI_VAR_RE.lastIndex = 0;
  while ((m = TOPLEVEL_MULTI_VAR_RE.exec(masked))) {
    const declaration = m[1];
    for (const part of declaration.split(',')) {
      const dm = /^\s*([A-Za-z_$][\w$]*)\s*(?:=|$)/.exec(part);
      if (dm) names.add(dm[1]);
    }
  }

  // Some canonical SOT modules intentionally avoid a top-level `const`
  // export and publish their API through the global object (for example
  // FinanceCategorySOT). Treat only column-1 direct global assignments as
  // declarations. This keeps the collector aligned with the app's classic
  // script/global runtime model without inventing globals from arbitrary
  // property writes.
  // Explicit runtime global exports are valid even when the export statement
  // lives inside an IIFE/module wrapper (the classic-global architecture uses
  // this pattern deliberately). Only recognize explicit window/globalThis/g
  // assignments; do not infer arbitrary nested identifiers.
  const GLOBAL_EXPORT_RE = /\b(?:globalThis|window|g)\.([A-Za-z_$][\w$]*)\s*=/gm;
  GLOBAL_EXPORT_RE.lastIndex = 0;
  while ((m = GLOBAL_EXPORT_RE.exec(src))) {
    names.add(m[1]);
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
