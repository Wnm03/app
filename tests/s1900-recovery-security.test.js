const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

test('S1900 restore has preflight shape, newer-schema confirmation and compensating rollback',()=>{
 const s=read('modules/shared/backup-restore.js');
 assert.match(s,/const _shape=_validateRestoreShape\(imp\)/);
 assert.match(s,/backupVersion>SCHEMA_VERSION/);
 assert.match(s,/compensating rollback/);
 assert.match(s,/saveFlush\(\);init\(\)/);
});

test('S1900 restore validates critical array fields',()=>{
 const s=read('modules/shared/backup-restore.js');
 for(const k of ['transactions','vehicles','bbmLogs','servisLogs','products','produsen'])assert.match(s,new RegExp(`'${k}'`));
});

test('S1900 PWA bootstrap has no eval and uses secure-host detection',()=>{
 assert.doesNotMatch(read('pwa-setup.js'),/\beval\s*\(/);
 assert.match(read('modules/shared/pwa-production-hardening.js'),/https:/);
});

test('S1900 dangerous HTML sinks remain outside the new hardening surface',()=>{
 assert.doesNotMatch(read('modules/shared/pwa-production-hardening.js'),/innerHTML\s*=/);
 assert.doesNotMatch(read('pwa-setup.js'),/outerHTML\s*=/);
});
