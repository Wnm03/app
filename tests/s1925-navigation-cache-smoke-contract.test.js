'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const html = read('index.html');
const nav = read('modules/shared/modal-navigasi.js');
const sw = read('sw.js');

const PRIMARY = ['dashboard-hub', 'keuangan', 'shop', 'aset', 'carnotes', 'pajak', 'settings'];

test('S1925: every primary page has a concrete DOM destination and a render route', () => {
  for (const page of PRIMARY) {
    assert.match(html, new RegExp(`id="page-${page}"`), `missing page-${page}`);
  }
  assert.match(nav, /function showPage\(name,el,opts\)/);
  assert.match(html, /data-action="showPage"/);
});

test('S1925: already-active navigation is a true no-render path after cleanup', () => {
  const detect = nav.indexOf('const _sameActiveNav=');
  const detectPageActive = nav.indexOf("pageEl.classList.contains('active')", detect);
  const cleanupScan = nav.indexOf("document.querySelectorAll('.page').forEach(p=>");
  const cleanup = nav.indexOf("p.classList.remove('active')", cleanupScan);
  const guard = nav.indexOf('if(_sameActiveNav){', cleanup);
  const render = nav.indexOf('renderPageContent(name)', guard);
  assert.ok(detect >= 0 && detectPageActive > detect && cleanupScan > detect && cleanup > cleanupScan, 'guard must be captured before active cleanup');
  assert.ok(guard > cleanup, 'guard must restore active state after cleanup');
  assert.ok(render < 0 || render > guard + 100, 'already-active branch must return before render');
});

test('S1925: navigation 4xx/5xx can fall back to cached SPA shell', () => {
  assert.match(sw, /if \(response\.status >= 400\)/);
  assert.match(sw, /const shell = await caches\.match\('\.\/index\.html'\);/);
  assert.match(sw, /if \(shell\) return shell;/);
});

test('S1925: navigation error handling retains offline cached-shell fallback', () => {
  assert.match(sw, /\.catch\(async \(\) => \{/);
  assert.match(sw, /const cached = await caches\.match\(event\.request\);/);
  assert.match(sw, /status: 503/);
});
