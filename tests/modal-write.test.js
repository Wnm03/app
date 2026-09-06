'use strict';
/**
 * modal-write.test.js — Regresi utk modules/shared/modal-write.js (SA10a,
 * v1568). File ini sebelumnya cuma diverifikasi lewat smoke test manual
 * (`node -e ...`, dicatat di SESSION-NOTE-SA10a) -- tidak ada test
 * permanen. SA10b menambahkan test ini supaya perilaku baca
 * `data-modal-index` dari `document.currentScript` & fallback gagal-senyap
 * (index di luar jangkauan) terkunci lewat automated test, bukan cuma
 * diverifikasi sekali secara manual.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'modules', 'shared', 'modal-write.js'), 'utf8');

function run({ dataModalIndex, MODAL_HTML, hasCurrentScript = true }) {
  const writes = [];
  const errors = [];
  const sandbox = {
    document: {
      currentScript: hasCurrentScript
        ? { getAttribute: (name) => (name === 'data-modal-index' ? dataModalIndex : null) }
        : null,
      write: (html) => writes.push(html),
    },
    MODAL_HTML,
    console: { error: (msg) => errors.push(msg) },
  };
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { filename: 'modal-write.js' });
  return { writes, errors };
}

test('data-modal-index valid & MODAL_HTML[idx] ada -> document.write() dipanggil persis dgn isinya', () => {
  const { writes, errors } = run({
    dataModalIndex: '2',
    MODAL_HTML: ['<div id="m0">A</div>', '<div id="m1">B</div>', '<div id="m2">C</div>'],
  });
  assert.deepEqual(writes, ['<div id="m2">C</div>']);
  assert.deepEqual(errors, []);
});

test('index "0" (falsy tapi valid) tetap ditulis, tidak ke-skip krn dikira "kosong"', () => {
  const { writes } = run({ dataModalIndex: '0', MODAL_HTML: ['<div id="m0">A</div>'] });
  assert.deepEqual(writes, ['<div id="m0">A</div>']);
});

test('document.currentScript null (mis. script dimuat via cara lain) -> tidak menulis apa pun, tidak throw', () => {
  const { writes, errors } = run({ hasCurrentScript: false, dataModalIndex: '0', MODAL_HTML: ['x'] });
  assert.deepEqual(writes, []);
  assert.deepEqual(errors, []);
});

test('data-modal-index bukan angka -> tidak menulis apa pun, tidak throw', () => {
  const { writes, errors } = run({ dataModalIndex: 'bukan-angka', MODAL_HTML: ['x'] });
  assert.deepEqual(writes, []);
  assert.deepEqual(errors, []);
});

test('MODAL_HTML[idx] di luar jangkauan array -> gagal senyap tapi log console.error, tidak throw & tidak menulis', () => {
  const { writes, errors } = run({ dataModalIndex: '99', MODAL_HTML: ['x'] });
  assert.deepEqual(writes, []);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /MODAL_HTML\[99\] tidak ditemukan/);
});

test('MODAL_HTML belum terdefinisi sama sekali (mis. bundle gagal load) -> gagal senyap, tidak throw', () => {
  const writes = [];
  const errors = [];
  const sandbox = {
    document: {
      currentScript: { getAttribute: () => '0' },
      write: (html) => writes.push(html),
    },
    console: { error: (msg) => errors.push(msg) },
  };
  vm.createContext(sandbox);
  assert.doesNotThrow(() => {
    vm.runInContext(SRC, sandbox, { filename: 'modal-write.js' });
  });
  assert.deepEqual(writes, []);
  assert.equal(errors.length, 1);
});
