'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const runner=fs.readFileSync(path.join(__dirname,'..','scripts','run-full-test.js'),'utf8');

test('S1777 full-test checkpoints are invalidated when test content or shard files change',()=>{
  assert.match(runner,/require\('node:crypto'\)/,'runner must use cryptographic file fingerprints');
  assert.match(runner,/function sha256\(file\)/,'runner must hash test files');
  assert.match(runner,/fileHashes/,'manifest/checkpoint must persist test-file hashes');
  assert.match(runner,/hashesOk/,'checkpoint reuse must validate hashes');
  assert.match(runner,/JSON\.stringify\(old\.files\|\|\[\]\).*JSON\.stringify\(currentFiles\)/,'checkpoint reuse must validate exact shard membership');
  assert.match(runner,/old\.schema===CHECKPOINT_SCHEMA && old\.manifestFingerprint===manifestFingerprint && old\.status==='pass' && old\.tests>0 && old\.pass===old\.tests && old\.fail===0 && old\.cancelled===0 && hashesOk/,'only fresh non-empty PASS checkpoints may be reused');
});


test('S1779 checkpoint schema and manifest fingerprint are required for reuse',()=>{
 assert.match(runner,/CHECKPOINT_SCHEMA=2/);
 assert.match(runner,/manifestFingerprint=crypto\.createHash\('sha256'\)/);
 assert.match(runner,/old\.schema===CHECKPOINT_SCHEMA/);
 assert.match(runner,/old\.manifestFingerprint===manifestFingerprint/);
 assert.match(runner,/old\.pass===old\.tests/);
});
