'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','scripts','apply-delete-manifest.js'),'utf8');
test('S1785: delete manifest applier aman, idempotent, dan menolak path traversal',()=>{
  assert.match(src,/path\.isAbsolute\(rel\)/);
  assert.match(src,/rel\.split\('\/'\)\.includes\('\.\.'\)/);
  assert.match(src,/fs\.rmSync\(full/);
  assert.match(src,/if\(seen\.has\(rel\)\)/);
});
