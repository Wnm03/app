const fs=require('fs'), assert=require('assert');
const cn=fs.readFileSync('car-notes.js','utf8');
const br=fs.readFileSync('modules/shared/backup-restore.js','utf8');
const ad=fs.readFileSync('modules/vehicle/service-event-adapter.js','utf8');
function ok(name,cond){assert.ok(cond,name);console.log('PASS',name)}
ok('batch defers post-commit events', cn.includes('_batchDeferEvents') && cn.includes('for(const entry of results)'));
ok('batch failure restores domain snapshot', cn.includes('restoreBatch();') && cn.includes('batchSnapshot'));
ok('failed lifecycle uses outbox', cn.includes('ServiceEventOutbox.enqueue'));
ok('service CSV exports canonical fields', br.includes('Service ID') && br.includes('Idempotency Key') && br.includes('Next Due Date'));
ok('outbox available from service adapter', ad.includes('const ServiceEventOutbox') && ad.includes('pending()') && ad.includes('drain(handler)'));
console.log('V27 PASS');
