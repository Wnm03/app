const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const pkg=JSON.parse(read('package.json'));

test('S1900 production helper validates extension, MIME and size',()=>{
 const s=read('modules/shared/pwa-production-hardening.js');
 assert.match(s,/MAX_IMPORT_BYTES=25\*1024\*1024/);
 assert.match(s,/validateImportFile=function/);
 assert.match(s,/allowed\.includes\(ext\)/);
 assert.match(s,/file\.type/);
});

test('S1900 backup downloads revoke object URLs',()=>{
 const s=read('modules/shared/backup-restore.js');
 assert.match(s,/PWAProductionHardening\.downloadBlob/);
 assert.match(s,/URL\.revokeObjectURL/);
});

test('S1900 import flows reject oversized/unsupported files before FileReader',()=>{
 const s=read('modules/shared/backup-restore.js');
 for(const marker of ['function importData(e)','function handleImport(e)','function importCarData(e)']){
  const i=s.indexOf(marker);assert.ok(i>=0,marker+' missing');
  const part=s.slice(i,i+1600);
  assert.match(part,/validateImportFile/);
  assert.match(part,/(?:e\.target|inputEl)\.value=''/);
 }
});

test('S1900 package exposes fast full-test and production gates',()=>{
 assert.equal(pkg.scripts['audit:production-readiness'],'node scripts/audit-production-readiness.js');
 assert.equal(pkg.scripts['test:full:fast'],'TEST_SHARDS=64 TEST_CONCURRENCY=8 TEST_SHARD_TIMEOUT_MS=90000 node scripts/run-full-test.js');
});

test('S1900 release gate includes production readiness and new regression contracts',()=>{
 const s=read('scripts/release-final-gate.js');
 assert.match(s,/audit-production-readiness\.js/);
 assert.match(s,/s1900-production-readiness\.test\.js/);
 assert.match(s,/s1900-recovery-security\.test\.js/);
 assert.match(s,/s1900-device-matrix\.test\.js/);
 assert.match(s,/s1900-performance-memory\.test\.js/);
});
