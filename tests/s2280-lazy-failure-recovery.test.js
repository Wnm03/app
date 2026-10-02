'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {run}=require('../scripts/s2280-lazy-failure-recovery');
test('S2280 lazy failure-recovery / partial-load matrix',async()=>{
 const r=await run();
 assert.equal(r.pass,r.total,`failed checks: ${r.checks.filter(x=>!x[1]).map(x=>x[0]).join(', ')}`);
 assert.equal(r.total,46);
});
