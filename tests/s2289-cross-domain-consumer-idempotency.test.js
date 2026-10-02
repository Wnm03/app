'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
test('S2289 cross-domain consumer idempotency',()=>{
 const r=spawnSync(process.execPath,['scripts/s2289-cross-domain-consumer-idempotency.js'],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr||r.stdout); assert.match(r.stdout,/S2289: 8\/8 PASS/);
});
