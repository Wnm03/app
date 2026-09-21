const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const vm=require('vm');
const hardening=fs.readFileSync('modules/shared/pwa-production-hardening.js','utf8');

function loadHardening(extra={}){
  const context={console,URL,TextEncoder,crypto, ...extra};
  context.globalThis=context;
  vm.runInNewContext(hardening,context,{filename:'pwa-production-hardening.js'});
  return context.PWAProductionHardening;
}

test('S1901 backup integrity seals and verifies without mutating payload',async()=>{
  const api=loadHardening();
  const payload={schemaVersion:1,transactions:[{id:'t1',amount:1000}],profile:{nama:'W'}};
  const sealed=await api.sealBackupPayload(payload);
  assert.equal(payload._integrity,undefined);
  assert.equal(sealed._integrity.algorithm,'SHA-256');
  assert.match(sealed._integrity.payloadHash,/^[0-9a-f]{64}$/);
  assert.equal((await api.verifyBackupPayload(sealed)).ok,true);
  const tampered={...sealed,transactions:[{id:'t1',amount:2000}]};
  assert.equal((await api.verifyBackupPayload(tampered)).ok,false);
});

test('S1901 legacy backups without integrity metadata remain import-compatible',async()=>{
  const api=loadHardening();
  const result=await api.verifyBackupPayload({schemaVersion:1,transactions:[]});
  assert.equal(result.ok,true);
  assert.equal(result.legacy,true);
});

test('S1901 error message sanitizer removes local/resource paths',()=>{
  const api=loadHardening();
  const safe=api.sanitizeErrorMessage(new Error('open C:\\Users\\Cob\\secret\\backup.json https://example.test/private?id=1'));
  assert.doesNotMatch(safe,/C:\\Users/);
  assert.doesNotMatch(safe,/https:\/\/example\.test/);
  assert.match(safe,/\[path\]|\[resource\]/);
});
