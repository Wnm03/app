'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {run}=require('../scripts/s2282-lazy-stale-invocation');
test('S2282 lazy stale invocation / cancellation boundary matrix',async()=>{
 const r=await run();
 assert.equal(r.pass,r.total,`failed checks: ${r.checks.filter(x=>!x[1]).map(x=>x[0]).join(', ')}`);
 assert.equal(r.total,8);
});
