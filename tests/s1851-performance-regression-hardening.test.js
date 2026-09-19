'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const tx=fs.readFileSync('modules/finance/tx-list-cashflow.js','utf8');
const fl=fs.readFileSync('modules/finance/filter-laporan.js','utf8');

test('S1851 tx renderer keeps standalone callers safe when perf indexes/cache are absent',()=>{
  assert.match(tx,/function _txPerfDateMs\(t\)\{return typeof getCachedTxDateMs==='function'\?getCachedTxDateMs\(t\):new Date\(t&&t\.date\)\.getTime\(\);\}/);
  assert.match(tx,/const catsByName=renderCtx&&renderCtx\.catsByName\?renderCtx\.catsByName:/);
  assert.match(tx,/const catsByName=renderCtx&&renderCtx\.catsByName\?renderCtx\.catsByName:/);
});

test('S1851 filter report keeps isolated loadSource tests safe without getAllCats()',()=>{
  assert.match(fl,/const _ftxCats=typeof getAllCats==='function'\?getAllCats\(\):\[\];/);
});

test('S1851 persistence race contract accounts for save, flush, and recovery mirror writes',()=>{
  assert.equal((fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8').match(/IDBStore\.set\('kw_v4_mirror'/g)||[]).length,3);
});
