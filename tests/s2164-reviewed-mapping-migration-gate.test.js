'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
test('S2164 controlled reviewed-mapping migration gate',()=>{
 const out=execFileSync(process.execPath,[path.join(__dirname,'../scripts/s2164-reviewed-mapping-migration-gate.js')],{encoding:'utf8'});
 assert.match(out,/PASS 10\/10/); assert.match(out,/"secondPassChanged":0/);
});
