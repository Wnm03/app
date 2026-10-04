#!/usr/bin/env node
'use strict';

/**
 * S2423 — End-to-end artifact fingerprint/version propagation contract.
 * Read-only: never builds, bumps versions, or rewrites artifacts.
 *
 * Contract:
 *   canonical APP_BUILD_VERSION
 *     -> runtime version constants
 *     -> index.html ?v=N
 *     -> app_production.html ?v=N + exact generated-shell parity
 *     -> sw.js CACHE_NAME kw-cache-vN
 *     -> Bundle-B source hash marker (Bundle-B contains the canonical version source)
 *   and both bundle source-hash markers must match their current source groups.
 */
const fs = require('node:fs');
const path = require('node:path');
const { computeGroupHash, extractEmbeddedHash } = require('./bundle-hash');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function extractGroup(buildSrc, name) {
  const m = buildSrc.match(new RegExp(`const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
  if (!m) throw new Error(`GROUP ${name} tidak ditemukan di scripts/build.js`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

function uniqueVersions(html) {
  return [...new Set([...html.matchAll(/[?&]v=(\d+)/g)].map((m) => m[1]))];
}

function normalizeProductionShell(html) {
  const marker = /<head>\n<!-- AUTO-GENERATED oleh scripts\/build\.js dari index\.html — JANGAN edit file ini langsung\.\n     Edit index\.html, lalu jalankan "node scripts\/build\.js" \(file ini disalin ulang otomatis\)\. -->\n/;
  return html.replace(marker, '<head>\n').replace('<head>\n\n', '<head>\n');
}

function audit() {
  const issues = [];
  const canonical = read('modules/shared/features-helpers-global-security.js');
  const appMatch = canonical.match(/APP_BUILD_VERSION\s*=\s*'([^']+)'/);
  if (!appMatch) issues.push('APP_BUILD_VERSION canonical hilang');
  const appVersion = appMatch ? appMatch[1] : '';
  const tail = (appVersion.match(/(\d+)$/) || [])[1];
  if (!tail) issues.push(`APP_BUILD_VERSION tidak memiliki numeric release suffix: ${appVersion || '<missing>'}`);

  const runtimeConstants = [
    ['modules/shared/modules-render.js', 'MODULE_RENDER_VERSION'],
    ['modules/shared/modals.js', 'MODAL_VERSION'],
    ['modules/shared/modules-calc.js', 'MODULE_CALC_VERSION'],
    ['chat-action-handlers.js', 'MODULE_FEATURES_VERSION'],
    ['modules/shared/features-helpers-global-security.js', 'PRODUCTION_BUILD_SYNCED_VERSION'],
  ];
  for (const [file, name] of runtimeConstants) {
    const m = read(file).match(new RegExp(name + "\\s*=\\s*'([^']+)'"));
    if (!m) issues.push(`${name} hilang di ${file}`);
    else if (m[1] !== appVersion) issues.push(`${name}=${m[1]} != APP_BUILD_VERSION=${appVersion}`);
  }

  const index = read('index.html');
  const production = read('app_production.html');
  const indexVersions = uniqueVersions(index);
  const productionVersions = uniqueVersions(production);
  if (indexVersions.length !== 1 || indexVersions[0] !== tail) {
    issues.push(`index.html ?v tidak sinkron: ${indexVersions.join(',') || '<missing>'} vs ${tail || '<missing>'}`);
  }
  if (productionVersions.length !== 1 || productionVersions[0] !== tail) {
    issues.push(`app_production.html ?v tidak sinkron: ${productionVersions.join(',') || '<missing>'} vs ${tail || '<missing>'}`);
  }
  if (normalizeProductionShell(production) !== index) issues.push('app_production.html menyimpang dari index.html');

  const sw = read('sw.js');
  const swMatch = sw.match(/CACHE_NAME\s*=\s*['"]kw-cache-v(\d+)['"]/);
  if (!swMatch || swMatch[1] !== tail) issues.push(`sw.js CACHE_NAME=${swMatch ? swMatch[1] : '<missing>'} vs ${tail || '<missing>'}`);

  const buildSrc = read('scripts/build.js');
  const groups = {
    A: extractGroup(buildSrc, 'GROUP_A'),
    B: extractGroup(buildSrc, 'GROUP_B'),
  };
  if (!groups.B.includes('modules/shared/features-helpers-global-security.js')) {
    issues.push('GROUP_B tidak memasukkan canonical APP_BUILD_VERSION source; version bump tidak akan mengubah fingerprint Bundle-B');
  }

  const bundles = [
    ['app-bundle-a.min.js', groups.A],
    ['app-bundle-b.min.js', groups.B],
  ];
  const bundleResults = [];
  for (const [file, group] of bundles) {
    const content = read(file);
    const embedded = extractEmbeddedHash(content);
    const current = computeGroupHash(group, read);
    const status = embedded === current ? 'fresh' : (embedded === null ? 'no-marker' : 'stale');
    bundleResults.push({ file, embedded, current, status });
    if (status !== 'fresh') issues.push(`${file} ${status}: embedded=${embedded || '<missing>'} current=${current}`);
  }

  return {
    ok: issues.length === 0,
    appVersion,
    releaseNumber: tail || null,
    indexVersions,
    productionVersions,
    swVersion: swMatch && swMatch[1],
    bundleResults,
    issues,
  };
}

function main() {
  const r = audit();
  console.log('S2423 ARTIFACT FINGERPRINT/VERSION PROPAGATION — READ ONLY');
  console.log('=========================================================');
  console.log(`canonical=${r.appVersion || '<missing>'} html=${r.indexVersions.join(',') || '<missing>'} production=${r.productionVersions.join(',') || '<missing>'} sw=${r.swVersion || '<missing>'}`);
  for (const b of r.bundleResults) console.log(`${b.status.toUpperCase().padEnd(8)} ${b.file}: embedded=${b.embedded || '<missing>'} current=${b.current}`);
  if (r.issues.length) {
    console.log('---------------------------------------------------------');
    for (const issue of r.issues) console.error(`BLOCK: ${issue}`);
    console.error(`S2423 ARTIFACT PROPAGATION: BLOCKED (${r.issues.length} finding(s))`);
    process.exitCode = 1;
    return;
  }
  console.log('S2423 ARTIFACT PROPAGATION: PASS — canonical version, HTML, SW, generated shell, and bundle fingerprints are synchronized.');
}

module.exports = { audit, extractGroup, normalizeProductionShell };
if (require.main === module) main();
