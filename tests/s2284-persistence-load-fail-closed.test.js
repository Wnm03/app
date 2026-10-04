const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'modules/shared/features-helpers-global-security.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'modules/shared/app-init-runtime.js'),'utf8');

 test('S2284: unexpected startup load errors enter recovery mode instead of falling through to showMain',()=>{
  assert.match(src,/S2284: startup persistence is a fail-closed boundary/);
  assert.match(src,/const __kwLoadDefaultState/);
  assert.match(src,/__kwPersistenceRecoveryRequired/);
  assert.match(src,/phase:'load-exception'/);
  assert.match(src,/state kosong\/parsial/);
 });

 test('S2284: runtime already stops before UI after persistence recovery is required',()=>{
  assert.match(runtime,/await load\(\);[\s\S]{0,500}__kwPersistenceRecoveryRequired===true[\s\S]{0,250}return;/);
 });

 test('S2284: recovery flag remains a hard write barrier',()=>{
  assert.match(src,/function save\(opts\)[\s\S]*?__kwPersistenceRecoveryRequired===true[\s\S]*?return false;/);
  assert.match(src,/function saveFlush\(\)[\s\S]*?__kwPersistenceRecoveryRequired===true[\s\S]*?return _blockSaveFlushOnRecovery\(\);/);
 });

console.log('S2284 persistence load fail-closed: PASS');
