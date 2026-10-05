const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','modules/shared/backup-restore.js'),'utf8');

test('S2516 restore failure diagnostic persists for mobile/PWA reporting',()=>{
  assert.match(src,/window\.__S2013_RESTORE_DIAGNOSTIC=detail/);
  assert.match(src,/safeSetItem\('kw_restore_diagnostic_s2013',JSON\.stringify\(detail\)\)/);
});

test('S2516 new restore attempt clears stale diagnostic first',()=>{
  const start=src.indexOf('async function applyRestoredData(imp){');
  const diag=src.indexOf('const __s2013Diag',start);
  const clear=src.indexOf("localStorage.removeItem('kw_restore_diagnostic_s2013')",start);
  assert.ok(start>=0&&clear>start&&clear<diag,'stale diagnostic must be cleared before a new restore stage is recorded');
});
