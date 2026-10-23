'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'modules/vehicle/servis-b.js'), 'utf8');

test('S2713 keeps all currently-filtered rows of a session together across pagination', () => {
  assert.match(source, /const visibleBase=logs\.slice\(0,visibleCount\)/);
  assert.match(source, /const visibleSessionIds=new Set\(visibleBase\.map\(s=>s&&s\.sessionId\)/);
  assert.match(source, /const visible=logs\.filter\(\(s,i\)=>i<visibleCount\|\|\(s&&s\.sessionId&&visibleSessionIds\.has\(String\(s\.sessionId\)\)\)\)/);
});

test('S2713 makes filtered session count transparent and warns deletion covers hidden rows', () => {
  assert.match(source, /const sessionTotal=g\.sessionId\?/);
  assert.match(source, /\$\{g\.logs\.length\} tampil · \$\{sessionTotal\} total/);
  assert.match(source, /Hapus semua komponen sesi ini, termasuk yang tersembunyi oleh filter/);
});

test('S2713 load-more count follows unique rendered rows after session expansion', () => {
  assert.match(source, /if\(visible\.length<logs\.length\)/);
  assert.match(source, /logs\.length-visible\.length/);
});
