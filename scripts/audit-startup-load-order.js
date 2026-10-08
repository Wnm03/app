#!/usr/bin/env node
'use strict';

/**
 * Startup load-order guard.
 *
 * The app is intentionally bundled as classic <script>-style globals. A
 * top-level IIFE therefore executes immediately while later const/let/class
 * declarations are still in the TDZ. This is a different failure class from
 * ordinary "function called later" dependencies because one exception can
 * stop the remainder of the bundle from initializing.
 *
 * This audit is deliberately conservative: it only checks top-level IIFEs
 * and references in their immediately-executed statement layer. Function,
 * arrow-function and nested block bodies are excluded so ordinary lazy/runtime
 * dependencies do not become false positives.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

function groupsFromBuild() {
  const src = read('scripts/build.js');
  const out = [];
  for (const name of ['GROUP_A', 'GROUP_B']) {
    const m = src.match(new RegExp(`const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
    if (!m) throw new Error(`GROUP ${name} tidak ditemukan di scripts/build.js`);
    out.push(...[...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]));
  }
  return out;
}

function maskStringsComments(src) {
  const out = src.split('');
  let quote = null, line = false, block = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (line) { if (c === '\n') line = false; else out[i] = ' '; continue; }
    if (block) {
      if (c === '*' && n === '/') { out[i] = out[i + 1] = ' '; i++; block = false; }
      else if (c !== '\n') out[i] = ' ';
      continue;
    }
    if (quote) {
      if (c === '\\') { out[i] = out[i + 1] = ' '; i++; continue; }
      if (c === quote) quote = null;
      else if (c !== '\n') out[i] = ' ';
      continue;
    }
    if (c === '/' && n === '/') { out[i] = out[i + 1] = ' '; i++; line = true; continue; }
    if (c === '/' && n === '*') { out[i] = out[i + 1] = ' '; i++; block = true; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; out[i] = ' '; }
  }
  return out.join('');
}

function matchingBrace(src, start) {
  let depth = 0, quote = null, line = false, block = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (line) { if (c === '\n') line = false; continue; }
    if (block) { if (c === '*' && n === '/') { i++; block = false; } continue; }
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '/' && n === '/') { i++; line = true; continue; }
    if (c === '/' && n === '*') { i++; block = true; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return -1;
}

function topLevelPositions(src) {
  const pos = new Set();
  let depth = 0, quote = null, line = false, block = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (line) { if (c === '\n') line = false; continue; }
    if (block) { if (c === '*' && n === '/') { i++; block = false; } continue; }
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '/' && n === '/') { i++; line = true; continue; }
    if (c === '/' && n === '*') { i++; block = true; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (depth === 0) pos.add(i);
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') depth = Math.max(0, depth - 1);
  }
  return pos;
}

function findTopLevelIifes(src) {
  const masked = maskStringsComments(src);
  const tops = topLevelPositions(src);
  const out = [];
  const re = /\(\s*(?:async\s*)?function\b|\(\s*\([^)]*\)\s*=>\s*\{/g;
  let m;
  while ((m = re.exec(masked))) {
    const start = m.index;
    if (!tops.has(start)) continue;
    const brace = masked.indexOf('{', start);
    if (brace < 0) continue;
    const end = matchingBrace(src, brace);
    if (end < 0) continue;
    const tail = masked.slice(end + 1, end + 80);
    if (/^\s*\)\s*\(/.test(tail) || /^\s*\)\s*\.call\s*\(/.test(tail) || /^\s*\)\s*\.apply\s*\(/.test(tail)) {
      out.push({ start, end, body: src.slice(brace + 1, end) });
      re.lastIndex = end + 1;
    }
  }
  return out;
}

function maskImmediateStatementLayer(src) {
  // Keep only code at the immediate IIFE statement layer. Nested function
  // bodies, object literals and nested call expressions are intentionally
  // excluded; this gate targets direct startup execution only.
  const out = src.split('');
  let depth = 0, quote = null, line = false, block = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (line) { if (c === '\n') line = false; else out[i] = ' '; continue; }
    if (block) {
      if (c === '*' && n === '/') { out[i] = out[i + 1] = ' '; i++; block = false; }
      else if (c !== '\n') out[i] = ' ';
      continue;
    }
    if (quote) {
      if (c === '\\') { out[i] = out[i + 1] = ' '; i++; continue; }
      if (c === quote) quote = null;
      else if (c !== '\n') out[i] = ' ';
      continue;
    }
    if (c === '/' && n === '/') { out[i] = out[i + 1] = ' '; i++; line = true; continue; }
    if (c === '/' && n === '*') { out[i] = out[i + 1] = ' '; i++; block = true; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; out[i] = ' '; continue; }
    if (c === '{') { depth++; out[i] = ' '; continue; }
    if (c === '}' ) { if (depth > 0) depth--; out[i] = ' '; continue; }
    if (depth > 0) out[i] = ' ';
  }
  return out.join('');
}

function topLevelLexicalDeclarations(src) {
  // Reuse the project's established top-level declaration masker.
  const { maskNonTopLevel } = require(path.join(ROOT, 'scripts', 'collect-app-globals'));
  const masked = maskNonTopLevel(src);
  const out = [];
  const re = /\b(?:const|let|class)\s+([A-Za-z_$][\w$]*)\b/g;
  let m;
  while ((m = re.exec(masked))) out.push({ name: m[1], pos: m.index });
  return out;
}

function immediateIdentifiers(body) {
  const masked = maskImmediateStatementLayer(body);
  const locals = new Set();
  const addParams = text => {
    for (const m of String(text || '').matchAll(/\b[A-Za-z_$][\w$]*\b/g)) locals.add(m[0]);
  };
  for (const m of body.matchAll(/\bfunction\b[^\(]*\(([^)]*)\)/g)) addParams(m[1]);
  for (const m of body.matchAll(/\(([^)]*)\)\s*=>/g)) addParams(m[1]);
  for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*=>/g)) locals.add(m[1]);
  for (const m of masked.matchAll(/\b(?:const|let|class)\s+([A-Za-z_$][\w$]*)\b/g)) locals.add(m[1]);

  const ids = new Set();
  for (const m of masked.matchAll(/\b[A-Za-z_$][\w$]*\b/g)) {
    const name = m[0], i = m.index;
    const prev = masked[i - 1], next = masked[i + name.length];
    if (locals.has(name) || prev === '.' || next === ':') continue;
    ids.add(name);
  }
  return ids;
}

function auditStartupLoadOrder(options = {}) {
  const entries = options.sources
    ? options.sources.map((x, i) => ({ file: x.file || `source-${i + 1}.js`, source: x.source }))
    : (options.files || groupsFromBuild()).map(file => ({ file, source: read(file) }));
  const globalDecls = new Map();
  entries.forEach((entry, fileIndex) => {
    for (const decl of topLevelLexicalDeclarations(entry.source)) {
      if (!globalDecls.has(decl.name)) globalDecls.set(decl.name, []);
      globalDecls.get(decl.name).push({ ...decl, file: entry.file, fileIndex });
    }
  });

  const problems = [];
  entries.forEach((entry, fileIndex) => {
    const file = entry.file;
    const src = entry.source;
    for (const iife of findTopLevelIifes(src)) {
      const ids = immediateIdentifiers(iife.body);
      for (const name of ids) {
        for (const decl of globalDecls.get(name) || []) {
          if (decl.fileIndex > fileIndex || (decl.fileIndex === fileIndex && decl.pos > iife.start)) {
            const line = src.slice(0, iife.start).split('\n').length;
            problems.push(`${file}:${line} startup IIFE memakai lexical global '${name}' sebelum deklarasi di ${decl.file}`);
          }
        }
      }
    }
  });
  return [...new Set(problems)];
}

if (require.main === module) {
  const problems = auditStartupLoadOrder();
  if (problems.length) {
    console.error(`STARTUP LOAD-ORDER AUDIT FAILED — ${problems.length} potential TDZ dependency(ies):`);
    problems.forEach(p => console.error(`  - ${p}`));
    process.exit(1);
  }
  console.log(`STARTUP LOAD-ORDER AUDIT: PASS (${groupsFromBuild().length} runtime sources scanned)`);
}

module.exports = { auditStartupLoadOrder, findTopLevelIifes, topLevelLexicalDeclarations };
