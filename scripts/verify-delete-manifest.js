#!/usr/bin/env node
'use strict';
/**
 * verify-delete-manifest.js — S1780
 *
 * DELETE-FILES.txt is an executable cleanup contract, not documentation only.
 * Every non-comment path listed there MUST be absent from the repository.
 * This prevents a patch from silently carrying retired files forward.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'DELETE-FILES.txt');

function readManifest() {
  if (!fs.existsSync(MANIFEST)) return [];
  return fs.readFileSync(MANIFEST, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('//'))
    .map((line) => line.replace(/^\.\//, ''))
    .filter(Boolean);
}

function verify() {
  const entries = readManifest();
  const violations = [];
  const seen = new Set();
  for (const rel of entries) {
    if (seen.has(rel)) {
      violations.push({ path: rel, reason: 'duplikat path dalam DELETE-FILES.txt' });
      continue;
    }
    seen.add(rel);
    if (path.isAbsolute(rel) || rel.includes('\\') || rel.split('/').includes('..') || rel.split('\\').includes('..')) {
      violations.push({ path: rel, reason: 'path manifest tidak aman' });
      continue;
    }
    const full = path.join(ROOT, rel);
    if (fs.existsSync(full)) violations.push({ path: rel, reason: 'masih ada di repository' });
  }
  return { manifest: MANIFEST, entries, violations };
}

function main() {
  const result = verify();
  if (!result.entries.length) {
    console.log('✓ DELETE-MANIFEST: tidak ada DELETE-FILES.txt atau manifest kosong.');
    return;
  }
  if (result.violations.length) {
    console.error(`❌ DELETE-MANIFEST GAGAL — ${result.violations.length} path masih melanggar kontrak:`);
    for (const item of result.violations) console.error(`  - ${item.path}: ${item.reason}`);
    process.exit(1);
  }
  console.log(`✓ DELETE-MANIFEST PASS — ${result.entries.length} path terverifikasi sudah tidak ada.`);
}

module.exports = { readManifest, verify };
if (require.main === module) main();
