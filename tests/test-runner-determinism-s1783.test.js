'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','scripts','run-full-test.js'),'utf8');
test('S1783: test manifest dan shard order deterministik',()=>{
 assert.match(src,/\.filter\(f=>f\.endsWith\('\.test\.js'\)\)\.sort\(\)/);
 assert.match(src,/shards\[i%shards\.length\]\.push\(f\)/);
 assert.match(src,/manifestFingerprint=crypto\.createHash\('sha256'\)\.update\(JSON\.stringify\(manifest\)\)/);
});
test('S1783: concurrency dibatasi 1..8 agar hasil tidak bergantung pada over-subscription environment',()=>assert.match(src,/Math\.min\(8,Number\(process\.env\.TEST_CONCURRENCY\)\|\|defaultConcurrency\)/));
test('S1783: checkpoint reuse dan final aggregation memakai validator yang sama',()=>assert.match(src,/function isValidCheckpoint\(r,index\)/g)&&assert.equal((src.match(/isValidCheckpoint\(/g)||[]).length,3));
