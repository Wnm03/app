const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const src = fs.readFileSync('modules/shared/modules-render.js','utf8');
const fnStart = src.indexOf('function _renderCashProjectionCard(ctx){');
assert.ok(fnStart >= 0);
const marker = '\nfunction ';
const fnEnd = src.indexOf(marker, fnStart + 10);
const body = src.slice(fnStart, fnEnd > 0 ? fnEnd : src.length);

test('S2361: dashboard monthly income/expense menggunakan satu pass transaksi saat ctx inc/exp belum tersedia', () => {
  assert.match(body, /const txList=D\.transactions\|\|\[\];/);
  assert.match(body, /for\(const t of txList\)/);
  assert.match(body, /if\(d\.getMonth\(\)!==m\|\|d\.getFullYear\(\)!==y\|\|t\.hitungKas===false\)continue;/);
  assert.match(body, /if\(t\.type==='income'\)inc\+=t\.amount;/);
  assert.match(body, /else if\(t\.type==='expense'\)exp\+=t\.amount;/);
  assert.doesNotMatch(body, /const txM=D\.transactions\|\|\[\]\)\.filter/);
});

test('S2361: jalur ctx inc/exp tetap dipertahankan agar tidak melakukan scan transaksi', () => {
  assert.match(body, /if\(ctx&&ctx\.inc!=null&&ctx\.exp!=null\)\{[\s\S]*?inc=ctx\.inc;exp=ctx\.exp;/);
});
