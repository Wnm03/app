'use strict';
// S2833 — modal yang dibuka bertumpuk harus tampil DI ATAS modal terbuka lain (Tambah Pemilik dari Renovasi).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'modules/shared/modal-navigasi.js'), 'utf8');
const aset = fs.readFileSync(path.join(__dirname, '..', 'modules/asset/aset-owners.js'), 'utf8');

test('openModal menaikkan z-index modal bertumpuk & melepasnya saat reset/tutup', () => {
  const m = src.match(/if\(_stacked\)\{[\s\S]*?\n\}else if\(el\.style\)\{\nel\.style\.zIndex='';\n\}/);
  assert.ok(m, 'blok z-index bertumpuk harus ada di openModal');
  assert.match(src, /if\(el\.style\)el\.style\.zIndex='';\n_syncNavVisibilityForModals\(\);/, 'z-index inline dilepas di closeModal.finish');
  const run = new Function('document', 'getComputedStyle', 'el', '_stacked', m[0]);
  const other = { style: { zIndex: '200' } };
  const el = { style: { zIndex: '' } };
  const doc = { querySelectorAll: () => ({ forEach: (f) => { f(other); f(el); } }) };
  run(doc, (o) => ({ zIndex: o.style.zIndex }), el, true);
  assert.strictEqual(el.style.zIndex, '201');
  const solo = { style: { zIndex: '201' } };
  run(doc, null, solo, false);
  assert.strictEqual(solo.style.zIndex, '');
});

test('tombol Tambah Pemilik Aset dinonaktifkan untuk aset belum tersimpan', () => {
  assert.match(aset, /addBtn\.disabled=!Aset\._ownersModalAsset/);
});
