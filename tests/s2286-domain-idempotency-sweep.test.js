'use strict';
const test=require('node:test');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
test('S2286 domain idempotency sweep',()=>{
  const out=execFileSync(process.execPath,[path.join(__dirname,'../scripts/s2286-domain-idempotency-sweep.js')],{encoding:'utf8'});
  if(!/S2286: 12\/12 PASS/.test(out)) throw new Error(out);
});
