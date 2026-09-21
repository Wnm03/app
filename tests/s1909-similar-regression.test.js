'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSource } = require('./helpers/loadSource');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('S1909: semua Blob-download helper yang diaudit membersihkan anchor & me-revoke object URL', () => {
  const files = [
    'modules/business/shop-data-io-api.js',
    'modules/vehicle/fuel-compare.js',
    'modules/vehicle/fuel-dashboard.js',
    'modules/vehicle/sparepart-servis.js',
    'modules/shared/data-archive.js',
  ];
  for (const file of files) {
    const src = read(file);
    assert.match(src, /typeof a\.remove==='function'|typeof a\.remove === 'function'/, `${file}: cleanup anchor missing`);
    assert.match(src, /URL\.revokeObjectURL\(url\)/, `${file}: object URL revoke missing`);
  }
});

test('S1909: closeQS() aman bila target DOM tidak ada pada shared + asset modal implementation', () => {
  for (const file of ['modules/shared/modal-navigasi.js', 'modules/asset/modal-navigasi.js']) {
    const src = read(file);
    assert.match(src, /function closeQS\(id\)\{const el=document\.getElementById\(id\);if\(!el\|\|!el\.classList\)return false;/, `${file}: closeQS guard missing`);
    assert.match(src, /if\(document\.body&&document\.body\.classList\)document\.body\.classList\.toggle\('has-open-modal'/, `${file}: body guard missing`);
  }
});

test('S1909: ScannerSession tidak throw bila body belum tersedia', () => {
  const src = read('modules/shared/scanner-session.js');
  assert.match(src, /if\(document\.body&&document\.body\.classList\)document\.body\.classList\.add\('scanner-session-active'\)/);
  assert.match(src, /if\(document\.body&&document\.body\.classList\)document\.body\.classList\.remove\('scanner-session-active'\)/);
});

test('S1909: Honda PDF menolak non-PDF sebelum FileReader dipanggil', async () => {
  let readerCalls = 0;
  function FakeFileReader() { this.onload = null; this.onerror = null; }
  FakeFileReader.prototype.readAsDataURL = function () { readerCalls++; };
  const ctx = loadSource(['modules/vehicle/honda-pdf-import.js'], {
    FileReader: FakeFileReader,
    IDBStore: { get: async () => null, set: async () => true },
    uid: () => 'x',
    toast: () => {},
  }, ['HondaPdfImport']);
  await assert.rejects(() => ctx.HondaPdfImport.fileToDataUrl({ name: 'x.txt', size: 1, type: 'text/plain' }), /harus berformat PDF/);
  assert.equal(readerCalls, 0);
});

test('S1909: release identity sinkron ke 1903', () => {
  const joined = [
    read('modules/shared/modules-render.js'),
    read('modules/shared/modals.js'),
    read('modules/shared/modules-calc.js'),
    read('chat-action-handlers.js'),
    read('modules/shared/features-helpers-global-security.js'),
  ].join('\n');
  assert.match(joined, /s1908-cumulative-regression-hardening-1903/);
  assert.match(read('sw.js'), /kw-cache-v1903/);
  assert.match(read('index.html'), /\?v=1903/);
  assert.match(read('app_production.html'), /\?v=1903/);
});
