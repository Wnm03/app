#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const NODE_SCRIPTS = [
  'scripts/build-atomic.js',
  'scripts/release-final-gate.js',
  'scripts/release-firewall.js',
  'scripts/verify-reproducible-build.js',
  'scripts/verify-bundle-freshness.js',
  'scripts/verify-version-integrity.js',
];
const SHELL_SCRIPTS = ['scripts/release.sh'];

const failures = [];
for (const rel of NODE_SCRIPTS) {
  const file = path.join(ROOT, rel);
  const src = fs.readFileSync(file, 'utf8');
  if (!/(?:path\.resolve|path\.join)\(__dirname,\s*['"]\.\.['"]\)/.test(src)) {
    failures.push(`${rel}: missing __dirname-based repository root`);
  }
  if (/process\.cwd\(\)/.test(src)) {
    failures.push(`${rel}: process.cwd() is used for project-root resolution`);
  }
}
for (const rel of SHELL_SCRIPTS) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (!/cd\s+"\$\(dirname\s+"\$0"\)\/\.\."/.test(src)) {
    failures.push(`${rel}: missing self-rooting cd contract`);
  }
}

if (failures.length) {
  console.error('RELEASE ARTIFACT PATH CONTRACT: FAIL');
  failures.forEach(x => console.error(`- ${x}`));
  process.exit(1);
}
console.log(`RELEASE ARTIFACT PATH CONTRACT: PASS — ${NODE_SCRIPTS.length} Node release/build scripts + ${SHELL_SCRIPTS.length} shell release script are root-anchored.`);
