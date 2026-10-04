#!/usr/bin/env node
'use strict';

/**
 * S2417 — Read-only release-contract audit.
 *
 * Tujuan: satu entry point untuk mengklasifikasikan kesiapan release tanpa
 * membangun/menulis artifact. Gate yang sudah ada tetap menjadi source of truth;
 * skrip ini hanya mengorkestrasi statusnya dan memeriksa toolchain readiness.
 *
 * Exit 0: tidak ada BLOCK pada audit read-only.
 * Exit 1: ada BLOCK/STALE/INCOMPLETE contract.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function sha256(rel) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
}
function runNode(script, args = []) {
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args], {
    cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { code: r.status ?? 1, out: `${r.stdout || ''}${r.stderr || ''}`.trim() };
}
function resolveBin(name) {
  const local = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name);
  if (fs.existsSync(local)) return local;
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim().split(/\r?\n/)[0] : null;
}

const results = [];
function add(id, status, detail) { results.push({ id, status, detail }); }

// 1. Toolchain readiness — read-only; never installs dependencies.
add('node', 'PASS', process.version);
add('npm', resolveBin('npm') ? 'PASS' : 'BLOCK', resolveBin('npm') || 'npm tidak tersedia');
add('eslint', resolveBin('eslint') ? 'PASS' : 'BLOCK', resolveBin('eslint') || 'eslint tidak tersedia');
add('esbuild', resolveBin('esbuild') ? 'PASS' : 'BLOCK', resolveBin('esbuild') || 'esbuild tidak tersedia');

// A clean/reproducible dependency install requires a lockfile. `npm ci` is
// intentionally the documented release-install path; without a lockfile the
// dependency graph is not pinned and `npm ci` cannot execute.
const lockfile = exists('package-lock.json') || exists('npm-shrinkwrap.json');
add('dependency-lockfile', lockfile ? 'PASS' : 'BLOCK',
  lockfile ? 'package-lock.json/npm-shrinkwrap.json tersedia untuk npm ci.' :
    'Tidak ada package-lock.json atau npm-shrinkwrap.json; npm ci tidak dapat dijalankan dan dependency graph release belum dipin.');

// 2. Existing read-only release contracts.
if (exists('scripts/verify-bundle-freshness.js')) {
  const r = runNode('scripts/verify-bundle-freshness.js');
  add('bundle-freshness', r.code === 0 ? 'PASS' : 'STALE/BLOCK', r.out.split('\n').slice(-8).join('\n'));
} else add('bundle-freshness', 'BLOCK', 'verifier tidak ditemukan');

if (exists('scripts/performance-budget.js')) {
  const r = runNode('scripts/performance-budget.js');
  add('performance-budget', r.code === 0 ? 'PASS' : 'BLOCK', r.out.split('\n').slice(-8).join('\n'));
} else add('performance-budget', 'BLOCK', 'performance budget verifier tidak ditemukan');

// Version synchronization is intentionally read-only here; the authoritative
// release-ready verifier performs the same check before packaging.
const index = exists('index.html') ? fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') : '';
const sw = exists('sw.js') ? fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8') : '';
const htmlVersions = [...index.matchAll(/\?v=(\d+)/g)].map(m => m[1]);
const swMatch = sw.match(/CACHE_NAME\s*=\s*'kw-cache-v(\d+)'/);
if (!htmlVersions.length || !swMatch) add('version-sync', 'BLOCK', 'versi HTML/SW tidak dapat diverifikasi');
else add('version-sync', new Set(htmlVersions).size === 1 && htmlVersions[0] === swMatch[1] ? 'PASS' : 'BLOCK', `HTML=${[...new Set(htmlVersions)].join(',')} SW=${swMatch[1]}`);

// 3. Reproducibility is deliberately NOT executed because its implementation
// rebuilds artifacts. We expose readiness separately so a missing esbuild is
// never mistaken for a failed deterministic-build result.
add('reproducible-build', resolveBin('esbuild') ? 'READY' : 'BLOCKED',
  resolveBin('esbuild') ? 'Toolchain tersedia; jalankan verify:reproducible-build untuk build-mutating verification.' :
    'Tidak dijalankan: esbuild tidak tersedia; audit ini tidak memodifikasi artifact.');

// 4. Patch contamination is read-only and safe to run.
if (exists('scripts/verify-patch-contamination.js')) {
  const r = runNode('scripts/verify-patch-contamination.js');
  add('patch-contamination', r.code === 0 ? 'PASS' : 'BLOCK', r.out.split('\n').slice(-6).join('\n'));
}

const blocking = results.filter(x => ['BLOCK', 'STALE/BLOCK', 'BLOCKED'].includes(x.status));
console.log('S2417 RELEASE CONTRACT AUDIT — READ ONLY');
console.log('========================================');
for (const r of results) console.log(`${r.status.padEnd(12)} ${r.id}: ${r.detail}`);
console.log('----------------------------------------');
console.log(blocking.length ? `RELEASE CONTRACT: BLOCKED (${blocking.length} finding(s))` : 'RELEASE CONTRACT: READY');
process.exitCode = blocking.length ? 1 : 0;
