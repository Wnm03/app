'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
test('S2420 runner pins test children to repository root CWD',()=>{
 const src=require('node:fs').readFileSync(path.join(ROOT,'scripts/run-full-test.js'),'utf8');
 assert.match(src,/spawn\(process\.execPath,\['--test',(?:'--test-reporter=tap',)?\.\.\.list\],\{cwd:ROOT/);
});
test('S2420 portability audit passes under repository root',()=>{
 const out=cp.execFileSync(process.execPath,[path.join(ROOT,'scripts/audit-cwd-relative-test-contract.js')],{cwd:ROOT,encoding:'utf8'});
 assert.match(out,/TEST RUNNER ROOT-CWD PIN: PASS/);
});
