const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const path=require('node:path');
test('production hardening gate passes on clean patched tree',()=>{
  const p=path.join(process.cwd(),'scripts','production-hardening-gate.js');
  assert.ok(fs.existsSync(p));
  cp.execFileSync(process.execPath,[p],{stdio:'pipe'});
});
