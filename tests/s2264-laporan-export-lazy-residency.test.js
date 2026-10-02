'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

test('S2264: laporan-export is removed from eager GROUP_B and preserved as a demand loader', () => {
  const build = fs.readFileSync(path.join(root, 'scripts/build.js'), 'utf8');
  const loader = fs.readFileSync(path.join(root, 'modules/shared/feature-lazy-loader.js'), 'utf8');
  assert.doesNotMatch(build, /['"]laporan-export\.js['"]/);
  assert.match(loader, /LAPORAN_EXPORT_FEATURE_SCRIPTS\s*=\s*\[\s*['"]laporan-export\.js['"]\s*,?\s*\]/s);
  assert.match(loader, /function ensureLaporanExportScripts\s*\(/);
  assert.match(loader, /_laporanExportFeatureLoadPromise\s*=\s*null/);
});

test('S2264: report export actions retry through the lazy dispatcher', () => {
  const src = fs.readFileSync(path.join(root, 'modules/shared/features-helpers-global-security.js'), 'utf8');
  assert.match(src, /exportLaporanPDF:\s*typeof ensureLaporanExportScripts/);
  assert.match(src, /exportLaporanImage:\s*typeof ensureLaporanExportScripts/);
});

test('S2264: laporan FAB wrapper loads the module before invoking PDF export', () => {
  const src = fs.readFileSync(path.join(root, 'modules/shared/action-wrappers.js'), 'utf8');
  assert.match(src, /function laporanFabExportPDF\(\).*ensureLaporanExportScripts\(\).*exportLaporanPDF/s);
});

test('S2264: eager Bundle-B no longer embeds laporan-export source marker', () => {
  const bundle = fs.readFileSync(path.join(root, 'app-bundle-b.min.js'), 'utf8');
  assert.doesNotMatch(bundle, /\/\/ laporan-export\.js —/);
});
