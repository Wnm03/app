'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
test('S2163 explicit legacy mapping gate',()=>{
 const out=execFileSync(process.execPath,[path.join(__dirname,'../scripts/s2163-legacy-mapping-gate.js')],{encoding:'utf8'});
 assert.match(out,/PASS 8\/8/); assert.match(out,/"duplicateNormalized": \[\]/);
});
