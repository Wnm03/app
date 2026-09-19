const fs=require('fs');
const {readCarNotesSource}=require('./helpers/carNotesSource');
const fs2=require('fs'), assert=require('assert');
const cn=readCarNotesSource();
const br=fs.readFileSync('modules/shared/backup-restore.js','utf8');
const ad=fs.readFileSync('modules/vehicle/service-event-adapter.js','utf8');
function ok(name,cond){assert.ok(cond,name);console.log('PASS',name)}
ok('batch defers post-commit events', cn.includes('_batchDeferEvents') && cn.includes('for(const entry of results)'));
// S1857: batch rollback moved from a whole-array JSON snapshot (batchSnapshot) to a
// targeted restore filtered by batchId (see PATCH-README-S1857 point 5).
ok('batch failure restores domain snapshot', cn.includes('restoreBatch();') && cn.includes('batchIds') && cn.includes('x.batchId===batchId'));
ok('failed lifecycle uses outbox', cn.includes('ServiceEventOutbox.enqueue'));
ok('service CSV exports canonical fields', br.includes('Service ID') && br.includes('Idempotency Key') && br.includes('Next Due Date'));
ok('outbox available from service adapter', ad.includes('const ServiceEventOutbox') && ad.includes('pending()') && ad.includes('drain(handler)'));
console.log('V27 PASS');
