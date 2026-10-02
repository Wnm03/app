'use strict';
const {test}=require('node:test');
const {execFileSync}=require('node:child_process');
test('S2287 cross-domain idempotency sweep',()=>{
  const out=execFileSync(process.execPath,['scripts/s2287-cross-domain-idempotency-sweep.js'],{encoding:'utf8'});
  if(!/S2287: 11\/11 PASS/.test(out)) throw new Error(out);
});
