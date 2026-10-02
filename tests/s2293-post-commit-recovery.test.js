const {test}=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('child_process');
const path=require('path');
test('S2293 post-commit recovery audit',()=>{
  const out=execFileSync(process.execPath,[path.join(__dirname,'..','scripts','s2293-post-commit-recovery.js')],{encoding:'utf8'});
  assert.match(out,/S2293: 10\/10 PASS/);
});
