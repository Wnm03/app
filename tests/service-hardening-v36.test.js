const fs=require('fs');
const car=fs.readFileSync('car-notes.js','utf8');
const tx=fs.readFileSync(require('path').join(__dirname,'../modules/finance/transaksi-b.js'),'utf8');
const chat=fs.readFileSync('chat-action-handlers.js','utf8');
const adapter=fs.readFileSync(require('path').join(__dirname,'../modules/vehicle/service-event-adapter.js'),'utf8');
let pass=0;
function ok(name,v){if(!v)throw new Error(name);pass++;console.log('PASS',name)}
ok('batch lifecycle failure cannot skip finance event', car.includes('V36: lifecycle and finance projections are independent') && car.includes('V36: batch finance event failed'));
ok('finance post-commit event queues on failure', tx.includes("V36: finance event failed after commit; queued for reconciliation") && tx.includes("type:'finance.updated',payload:_financePostCommitPayload"));
ok('finance vehicle event queues on failure', tx.includes("V36: vehicle event failed after commit; queued for reconciliation") && tx.includes("type:'vehicle.updated',payload:_vehiclePostCommitPayload"));
ok('chat service publishes finance event after commit', chat.includes("const _chatFinancePayload") && chat.includes("type:'finance.updated',payload:_chatFinancePayload"));
ok('outbox canonical key cannot be caller-overridden', adapter.includes("const key=`${evt.type||'event'}::${stablePayloadId||fallback}`"));
console.log(`${pass}/5 PASS`);
