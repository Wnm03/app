#!/usr/bin/env node
/*
 * S2250 — Bundle-B residency audit.
 * Read-only: never rewrites source, bundles, versions, or runtime artifacts.
 * Purpose: distinguish a genuinely oversized production bundle from an
 * unminified build artifact, then expose the largest GROUP_B sources so a
 * later lazy-load change can be evidence-driven.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const buildPath = path.join(ROOT, 'scripts', 'build.js');
const bundlePath = path.join(ROOT, 'app-bundle-b.min.js');
const build = fs.readFileSync(buildPath, 'utf8');
const m = build.match(/const GROUP_B = \[(.*?)\n\];\nconst ALL_SOURCE/s);
if (!m) throw new Error('GROUP_B tidak ditemukan di build.js');
const entries = [...m[1].matchAll(/['"]([^'"]+\.js)['"]/g)].map(x => x[1]);
const rows = entries.map(rel => {
  const file = path.join(ROOT, rel);
  return { file: rel, bytes: fs.existsSync(file) ? fs.statSync(file).size : -1 };
});
const missing = rows.filter(x => x.bytes < 0);
const sourceBytes = rows.reduce((n, x) => n + Math.max(0, x.bytes), 0);
const bundleBytes = fs.existsSync(bundlePath) ? fs.statSync(bundlePath).size : -1;
const head = fs.existsSync(bundlePath) ? fs.readFileSync(bundlePath, 'utf8').slice(0, 1200) : '';
const unminified = head.includes('DIBUAT OTOMATIS oleh build.js');
const top = [...rows].sort((a, b) => b.bytes - a.bytes).slice(0, 30);
const excludedLazy = [
  'modules/home/renovasi.js',
  'modules/business/sewakios.js',
  'modules/shop/business-intelligence-presenter.js',
].map(file => ({ file, inGroupB: entries.includes(file) }));

const report = {
  groupBEntries: entries.length,
  missingCount: missing.length,
  sourceBytes,
  bundleBytes,
  bundleUnminified: unminified,
  excludedLazy,
  top,
};

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
  console.log(`GROUP_B entries : ${report.groupBEntries}`);
  console.log(`Missing sources : ${report.missingCount}`);
  console.log(`Source bytes    : ${report.sourceBytes}`);
  console.log(`Bundle-B bytes  : ${report.bundleBytes}`);
  console.log(`Artifact mode   : ${unminified ? 'UNMINIFIED (release-blocking until environment build)' : 'MINIFIED'}`);
  console.log('\nTop 30 source files by raw size:');
  top.forEach((x, i) => console.log(`${String(i + 1).padStart(2)} ${String(x.bytes).padStart(8)} ${x.file}`));
  console.log('\nKnown lazy exclusions:');
  excludedLazy.forEach(x => console.log(`- ${x.file}: ${x.inGroupB ? 'REGRESSED INTO GROUP_B' : 'excluded'}`));
}

if (missing.length) process.exitCode = 1;
