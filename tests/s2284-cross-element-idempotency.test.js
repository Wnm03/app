'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {run}=require('../scripts/s2284-cross-element-idempotency');
test('S2284 cross-element lazy action idempotency boundary',async()=>{const r=await run();assert.equal(r.pass,r.total,`failed: ${r.checks.filter(x=>!x[1]).map(x=>x[0]).join(', ')}`);assert.equal(r.total,9);});
