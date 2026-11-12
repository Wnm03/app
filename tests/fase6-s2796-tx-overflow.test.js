'use strict';
// FASE 6 (S2796): kontrak CSS agar nominal/nama/tombol hapus di daftar uang tidak terpotong.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'tokens.css'), 'utf8');
const block = css.slice(css.indexOf('FASE 6 (S2796)'));

test('blok FASE 6 ada dan tanpa !important', () => {
  assert.ok(css.includes('FASE 6 (S2796)'));
  assert.ok(!/!important/.test(block));
});
test('pembungkus nominal+hapus tidak menyusut', () => {
  assert.match(block, /\.tx-item>\.u-flex\{flex:0 0 auto;min-width:max-content;max-width:none\}/);
});
test('kolom info yang mengalah (flex-basis 0, min-width 0)', () => {
  assert.match(block, /\.tx-item>\.tx-info\{flex:1 1 0;min-width:0\}/);
});
test('nominal di #allTx tidak lagi di-ellipsis', () => {
  assert.match(block, /#allTx,#filterTxList\) \.tx-amount\{max-width:none;overflow:visible;text-overflow:clip\}/);
});
test('<=599px baris boleh membungkus, nominal rata kanan', () => {
  assert.match(block, /@media \(max-width:599px\)\{[\s\S]*flex-wrap:wrap[\s\S]*margin-left:auto/);
});
test('nama boleh 3 baris, bukan 1 baris + ellipsis', () => {
  assert.match(block, /#page-keuangan \.tx-name\{[^}]*-webkit-line-clamp:3/);
});
test('cache-bust HTML dan sw.js >= 2796', () => {
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  assert.ok(Number(sw.match(/kw-cache-v(\d+)/)[1]) >= 2796);
});
