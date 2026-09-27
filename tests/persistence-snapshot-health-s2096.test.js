'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const src=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');

test('S2096 persistence recovery scores both valid snapshots before merge',()=>{
 assert.match(src,/function _snapshotDataHealth\(p\)/);
 assert.match(src,/function _chooseRecoverySnapshot\(a,b\)/);
 assert.match(src,/const _chosen=_chooseRecoverySnapshot\(p,_lp\)/);
 assert.match(src,/const _best=_chooseRecoverySnapshot\(_idbP,_lsP\)/);
});
test('S2096 persistence recovery never clears localStorage or IndexedDB during source selection',()=>{
 const loadBlock=src.slice(src.indexOf('async function load(){'),src.indexOf('async function load(){')+12000);
 assert.doesNotMatch(loadBlock,/localStorage\.clear\(\)/);
 assert.doesNotMatch(loadBlock,/IDBStore\.delete\(/);
});
