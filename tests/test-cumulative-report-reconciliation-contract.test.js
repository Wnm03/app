'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','scripts','test-cumulative.js'),'utf8');

test('cumulative report merekonsiliasi jumlah file terhadap manifest chunk',()=>{
  assert.ok(src.includes('const reportChunkFiles = results.reduce((n, c) => n + c.files.length, 0)') || src.includes('const reportChunkFiles=results.reduce((n, c) => n + c.files.length, 0)'));
  assert.match(src,/reportChunkFiles !== chunks\.slice\(ranStart - 1, ranEnd\)\.reduce/);
});
test('cumulative report merekonsiliasi seluruh metrik TAP',()=>{
  for(const metric of ['Tests','Pass','Fail','Cancelled','Skipped','Todo']){
    assert.match(src,new RegExp(`reportChunk${metric} !== total${metric}`));
  }
});
test('full-range PASS wajib mencakup seluruh inventory test',()=>{
  assert.match(src,/ranStart === 1 && ranEnd === chunks\.length && reportChunkFiles !== files\.length/);
});
