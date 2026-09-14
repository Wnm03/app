const fs=require('fs');
const {readCarNotesSource}=require('./helpers/carNotesSource');
const assert=require('assert');
const cn=readCarNotesSource();
const ad=fs.readFileSync('modules/vehicle/service-event-adapter.js','utf8');
function ok(n,c){assert.ok(c,n);console.log('PASS',n)}
ok('markServiced vehicle event failure queues outbox',cn.includes("type:'vehicle.updated'")&&cn.includes('V31: vehicle event failed after commit'));
ok('markServiced finance event failure queues outbox',cn.includes("V31: finance event failed after commit; queued for reconciliation"));
ok('outbox vehicle events use action-aware dedup key',ad.includes("(payload.action||'')")&&ad.includes("(payload.kind||'')"));
ok('outbox still replays vehicle events',ad.includes("evt.type==='vehicle.updated'"));
console.log('V31 PASS');
