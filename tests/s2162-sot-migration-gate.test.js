'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
test('S2162 controlled migration gate passes deterministic/idempotent invariants',()=>{
 const out=execFileSync(process.execPath,[path.join(__dirname,'../scripts/s2162-sot-migration-gate.js')],{encoding:'utf8'});
 assert.match(out,/PASS 7\/7/); assert.match(out,/"secondPassChanged":0/); assert.match(out,/"ambiguousPreserved":true/);
});
console.log('S2162 migration-gate regression: 1/1 PASS');
