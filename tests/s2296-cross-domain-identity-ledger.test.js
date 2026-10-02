'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('child_process');
const path=require('path');
test('S2296 cross-domain identity ledger',()=>{
  const out=execFileSync(process.execPath,[path.join(__dirname,'..','scripts','s2296-cross-domain-identity-ledger.js')],{encoding:'utf8'});
  assert.match(out,/S2296: 6\/6 PASS/);
});
