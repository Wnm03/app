const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'modules/shared/features-helpers-global-security.js'),'utf8');

test('S2286: showMain has a final fail-closed boundary when persistence recovery is required',()=>{
  const m=src.match(/function showMain\(\)\{([\s\S]{0,1200})/);
  assert.ok(m,'showMain must exist');
  assert.match(m[1],/__kwPersistenceRecoveryRequired===true/);
  assert.match(m[1],/return false;/);
  assert.match(m[1],/data tidak tertimpa|data lama belum berhasil dipulihkan/i);
});

test('S2286: persistence protection remains layered at save, flush and UI boundaries',()=>{
  const save=src.indexOf('function save(opts)');
  const flush=src.indexOf('function saveFlush()');
  const show=src.indexOf('function showMain()');
  assert.ok(save>=0&&flush>=0&&show>=0);
  assert.ok(src.indexOf('__kwPersistenceRecoveryRequired===true',save)<src.indexOf('function ',save+1));
  assert.ok(src.indexOf('__kwPersistenceRecoveryRequired===true',flush)<show);
  assert.ok(src.indexOf('__kwPersistenceRecoveryRequired===true',show)<show+1200);
});

console.log('S2286 final recovery UI boundary: PASS');
