'use strict';
// S256AV — fixture tanggal test harus stabil lintas zona waktu (UTC & WIB).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { localIso } = require('./helpers/localIso');

test('S256AV: localIso() memakai komponen LOKAL (tidak mundur sehari di UTC+7)', () => {
  assert.equal(localIso(new Date(2026, 9, 7)), '2026-10-07');
  assert.equal(localIso(new Date(2026, 0, 1)), '2026-01-01');
  assert.equal(localIso(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
});

test('S256AV: file test yang diperbaiki tidak lagi memakai new Date(...).toISOString() sebagai fixture', () => {
  const files = ['ownership-sync-shop', 'shop-business-engine-integration', 's2338-financial-projection-single-pass', 'piutang-utang-reminder', 'tagihan-reminder'];
  for (const f of files) {
    const src = fs.readFileSync(path.join(__dirname, f + '.test.js'), 'utf8');
    assert.doesNotMatch(src, /\.toISOString\(\)\.(split\('T'\)\[0\]|slice\(0,\s*10\))/, f + ' kembali memakai toISOString fixture (rapuh di WIB)');
    assert.match(src, /require\('\.\/helpers\/localIso'\)/, f + ' harus memakai helper localIso');
  }
});

test('S256AV: verify-release-ready test tidak bergantung pada folder node yang memuat eslint', () => {
  const src = fs.readFileSync(path.join(__dirname, 'verify-release-ready-s424.test.js'), 'utf8');
  assert.match(src, /nodeOnlyDir/);
  assert.doesNotMatch(src, /\$\{path\.dirname\(process\.execPath\)\}\$\{path\.delimiter\}\/usr\/bin/);
});
