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

test('S1851 persistence race contract uses atomic batch persistence rather than fixed write counts',()=>{
  const s=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');
  assert.match(s,/IDBStore\.setMany(?:IfCurrent)?/);
  assert.match(s,/kw_v4_mirror/);
  assert.match(s,/function saveFlush\(\)\{/);
  assert.match(s,/function _saveImmediate\(snapshotJson\)/);
});
