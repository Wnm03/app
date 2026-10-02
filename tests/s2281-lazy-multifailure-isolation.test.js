'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {run}=require('../scripts/s2281-lazy-multifailure-isolation');
test('S2281 lazy multi-failure / recovery isolation matrix',async()=>{
 const r=await run();
 assert.equal(r.pass,r.total,`failed checks: ${r.checks.filter(x=>!x[1]).map(x=>x[0]).join(', ')}`);
 assert.equal(r.total,12);
});
