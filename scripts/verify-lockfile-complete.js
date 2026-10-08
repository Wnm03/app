#!/usr/bin/env node
'use strict';
/**
 * verify-lockfile-complete.js — pastikan package-lock.json adalah lockfile
 * HASIL npm (graf dependensi lengkap), bukan ditulis/diedit tangan.
 *
 * Kenapa ada: lockfile yang hanya berisi paket top-level (eslint, esbuild)
 * tanpa dependensi turunannya (eslint-scope, espree, ajv, dst) membuat
 * `npm ci` memasang ESLint yang rusak -> "Cannot find module 'eslint-scope'"
 * (exit code 2 di langkah `npm run lint`). Skrip ini gagal lebih awal dengan
 * pesan yang jelas, sebelum `npm ci` jalan.
 *
 * Tanpa dependensi eksternal. Jalankan: node scripts/verify-lockfile-complete.js
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const problems = [];

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, name), 'utf8'));
}

function resolveInLock(packages, from, dep) {
  let base = from;
  for (;;) {
    const candidate = (base ? base + '/' : '') + 'node_modules/' + dep;
    if (packages[candidate]) return candidate;
    if (!base) return null;
    const i = base.lastIndexOf('/node_modules/');
    base = i < 0 ? '' : base.slice(0, i);
  }
}

function check() {
  const pkg = readJson('package.json');
  let lock;
  try {
    lock = readJson('package-lock.json');
  } catch (e) {
    problems.push('package-lock.json tidak ada / bukan JSON valid: ' + e.message);
    return;
  }
  const packages = lock.packages || {};
  const root = packages[''] || {};

  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    const want = pkg[field] || {};
    const have = root[field] || {};
    for (const [name, range] of Object.entries(want)) {
      if (have[name] !== range) {
        problems.push(`root lock tidak cocok dgn package.json: ${field}.${name} (${range} vs ${have[name]})`);
      }
      if (!resolveInLock(packages, '', name)) {
        problems.push(`paket top-level tidak ada di lock: ${name}`);
      }
    }
  }

  let entries = 0;
  for (const [key, meta] of Object.entries(packages)) {
    if (!key) continue;
    entries++;
    if (!meta.link && (!meta.resolved || !meta.integrity)) {
      problems.push(`entry tanpa resolved/integrity: ${key}`);
    }
    for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const dep of Object.keys(meta[field] || {})) {
        const optionalPeer = field === 'peerDependencies' &&
          meta.peerDependenciesMeta && meta.peerDependenciesMeta[dep] && meta.peerDependenciesMeta[dep].optional;
        if (optionalPeer || field === 'optionalDependencies') continue;
        if (!resolveInLock(packages, key, dep)) {
          problems.push(`dependensi hilang di lock: ${key} -> ${dep}`);
        }
      }
    }
  }
  if (entries < 20) {
    problems.push(`lockfile hanya berisi ${entries} paket — graf dependensi eslint+esbuild seharusnya puluhan/ratusan (lockfile tidak dihasilkan npm)`);
  }
}

check();

if (problems.length) {
  console.error('LOCKFILE BELUM VALID — jangan jalankan npm ci:');
  problems.slice(0, 25).forEach((p) => console.error('  - ' + p));
  if (problems.length > 25) console.error(`  ... dan ${problems.length - 25} masalah lain`);
  console.error('\nPerbaikan: jalankan workflow "Regenerate lockfile" (Actions > Regenerate lockfile > Run workflow),');
  console.error('atau di komputer: rm package-lock.json && npm install --package-lock-only --ignore-scripts');
  process.exit(1);
}
console.log('✓ package-lock.json lengkap & konsisten dengan package.json');
