const {test}=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
test('S2295 multi-domain crash replay',()=>{
  const out=execFileSync(process.execPath,[path.join(__dirname,'..','scripts','s2295-multi-domain-crash-replay.js')],{encoding:'utf8'});
  assert.match(out,/S2295: 8\/8 PASS/);
});
