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

test('S1925/S1931: already-active navigation stays a true no-render path and normal navigation uses atomic pending state', () => {
  const detect = nav.indexOf('const _sameActiveNav=');
  const detectPageActive = nav.indexOf("pageEl.classList.contains('active')", detect);
  const guard = nav.indexOf('if(_sameActiveNav){', detect);
  const pending = nav.indexOf("pageEl.classList.add('nav-transition-pending')", guard);
  const render = nav.indexOf('renderPageContent(name)', guard);
  assert.ok(detect >= 0 && detectPageActive > detect && guard > detect, 'same-active guard must be captured before transition mutation');
  assert.ok(pending > guard, 'normal navigation must enter pending visual state after the no-op guard');
  assert.ok(render > pending, 'destination must be prepared before its renderer runs');
  assert.ok(render > guard, 'already-active branch must return before render');
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
