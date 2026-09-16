'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','scripts','run-full-test.js'),'utf8');

test('S1780: child test runner never uses force-exit',()=>{
  assert.doesNotMatch(src,/--test-force-exit/);
});

test('S1780: checkpoint writes use unique atomic temp files',()=>{
  assert.match(src,/function atomicWrite\(file,data\)/);
  assert.match(src,/flag:'wx'/);
  assert.match(src,/renameSync\(tmp,file\)/);
});

test('S1780: final aggregation independently validates manifest, shard files, and hashes',()=>{
  assert.match(src,/manifestFingerprint===manifestFingerprint/);
  assert.match(src,/JSON\.stringify\(r\.files\|\|\[\]\)===JSON\.stringify\(expectedFiles\)/);
  assert.match(src,/r\.fileHashes&&r\.fileHashes\[f\]===fileHashes\[f\]/);
});

test('S1780: default shard concurrency follows available parallelism and can be overridden',()=>{
  assert.match(src,/os\.availableParallelism\(\)/);
  assert.match(src,/const concurrency=Math\.max\(1,Math\.min\(8,Number\(process\.env\.TEST_CONCURRENCY\)\|\|defaultConcurrency\)\)/);
});
