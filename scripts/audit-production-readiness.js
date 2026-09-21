#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const errors=[];
const checks=[];
function ok(name,cond,msg){checks.push([name,!!cond]);if(!cond)errors.push(msg||name);}
const pkg=JSON.parse(read('package.json'));
ok('release-final-gate-script',pkg.scripts&&pkg.scripts['release:final-gate'],'release:final-gate script missing');
ok('production-hardening-source',fs.existsSync(path.join(root,'modules/shared/pwa-production-hardening.js')),'production hardening helper missing');
ok('import-size-guard',/MAX_IMPORT_BYTES=25\*1024\*1024/.test(read('modules/shared/pwa-production-hardening.js')),'import size guard missing');
ok('restore-shape-validation',/_validateRestoreShape\(imp\)/.test(read('modules/shared/backup-restore.js')),'restore shape validation missing');
ok('blob-revoke',/revokeObjectURL/.test(read('modules/shared/backup-restore.js')),'backup download must revoke object URLs');
ok('backup-integrity-seal',/sealBackupPayload/.test(read('modules/shared/backup-restore.js')),'backup integrity sealing missing');
ok('backup-integrity-verify',/verifyBackupPayload/.test(read('modules/shared/backup-restore.js')),'backup integrity verification missing');
ok('error-sanitizer',/sanitizeErrorMessage/.test(read('modules/shared/error-handler.js')),'error message sanitizer missing');
ok('sw-skip-waiting',/self\.skipWaiting\(\)/.test(read('sw.js')),'SW skipWaiting missing');
ok('sw-client-claim',/self\.clients\.claim\(\)/.test(read('sw.js')),'SW clients.claim missing');
ok('no-active-backdrop-filter',!/backdrop-filter\s*:(?!none)/.test(read('pwa-ui-layer.css')),'active backdrop-filter would hurt WebView performance');
ok('safe-area',/safe-area-inset-bottom/.test(read('pwa-ui-layer.css')),'safe-area support missing');
ok('large-list-threshold',/n>=limit/.test(read('modules/shared/pwa-ux-performance.js')),'large-list threshold missing');
const risky=[];
for(const f of ['pwa-setup.js','modules/shared/pwa-production-hardening.js']){
  if(/\beval\s*\(/.test(read(f)))risky.push(f);
}
ok('no-eval-in-pwa-bootstrap',risky.length===0,'eval() detected in PWA bootstrap: '+risky.join(', '));
console.log(`PRODUCTION READINESS: ${checks.filter(x=>x[1]).length}/${checks.length} PASS`);
if(errors.length){errors.forEach(e=>console.error(' - '+e));process.exit(1);}
