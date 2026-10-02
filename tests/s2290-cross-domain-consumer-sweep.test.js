'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
test('S2290 cross-domain consumer sweep',()=>{
  const root=path.resolve(__dirname,'..');
  const out=execFileSync(process.execPath,[path.join(root,'scripts/s2290-cross-domain-consumer-sweep.js')],{cwd:root,encoding:'utf8'});
  assert.match(out,/S2290: 10\/10 PASS/);
});
