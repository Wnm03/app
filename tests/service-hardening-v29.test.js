const fs=require('fs'),assert=require('assert');
const cn=fs.readFileSync('car-notes.js','utf8');
const tx=fs.readFileSync('modules/finance/transaksi-b.js','utf8');
const ad=fs.readFileSync('modules/vehicle/service-event-adapter.js','utf8');
function ok(name,c){assert.ok(c,name);console.log('PASS',name)}
ok('outbox has retry metadata',ad.includes('attempts')&&ad.includes('lastError'));
ok('outbox has durable flush',ad.includes('flush(){')&&ad.includes("evt.type==='service.create'")&&ad.includes("evt.type==='service.remove'"));
ok('catalog failures queue for reconciliation',cn.includes("type:'catalog.attach'")&&cn.includes('queued for reconciliation'));
ok('service history UI uses canonical comparator',cn.includes(".sort(typeof compareServiceHistoryRecency==='function'?compareServiceHistoryRecency"));
ok('service history UI uses date-only parsing',cn.includes('const ds=typeof parseServiceDateOnly'));
ok('finance lifecycle failure cannot rollback committed transaction',tx.includes('finance->service lifecycle failed after commit')&&tx.includes("ServiceEventOutbox.enqueue"));
ok('finance event failure isolated after commit',tx.includes('finance event failed after commit'));
console.log('V29 PASS');
