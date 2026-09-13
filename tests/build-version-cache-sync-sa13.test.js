'use strict';
// SA13 — release-version integrity: source APP_BUILD_VERSION, HTML ?v=N,
// and service-worker CACHE_NAME must use the SAME numeric release version.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'modules/shared/features-helpers-global-security.js'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const prod = fs.readFileSync(path.join(ROOT, 'app_production.html'), 'utf8');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

function sourceReleaseNumber() {
  const m = src.match(/APP_BUILD_VERSION\s*=\s*'[^']*?(\d+)'/);
  assert.ok(m, 'APP_BUILD_VERSION harus memiliki nomor release di akhir');
  return Number(m[1]);
}

function htmlVersions(html) {
  return [...html.matchAll(/\?v=(\d+)/g)].map((m) => Number(m[1]));
}

test('SA13: APP_BUILD_VERSION, semua ?v= di HTML, dan CACHE_NAME sw.js sinkron', () => {
  const n = sourceReleaseNumber();
  const idx = htmlVersions(index);
  const prodVersions = htmlVersions(prod);
  assert.ok(idx.length > 0, 'index.html harus memiliki cache-busting ?v=N');
  assert.deepEqual(new Set(idx), new Set([n]), 'semua ?v= index.html harus sama dengan APP_BUILD_VERSION');
  assert.deepEqual(new Set(prodVersions), new Set([n]), 'semua ?v= app_production.html harus sama dengan APP_BUILD_VERSION');
  const swMatch = sw.match(/CACHE_NAME\s*=\s*['"]kw-cache-v(\d+)['"]/);
  assert.ok(swMatch, 'sw.js harus memiliki CACHE_NAME kw-cache-vN');
  assert.equal(Number(swMatch[1]), n, 'CACHE_NAME sw.js harus sama dengan APP_BUILD_VERSION');
});

test('SA13: app_production.html tetap identik secara semantik dengan index.html setelah marker AUTO-GENERATED dilepas', () => {
  const marker = /<head>\n<!-- AUTO-GENERATED oleh scripts\/build\.js dari index\.html — JANGAN edit file ini langsung\.\n     Edit index\.html, lalu jalankan "node scripts\/build\.js" \(file ini disalin ulang otomatis\)\. -->\n/;
  assert.equal(prod.replace(marker, '<head>\n').replace('<head>\n\n', '<head>\n'), index);
});
