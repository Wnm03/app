const fs=require('fs'),assert=require('assert');
const cn=fs.readFileSync('car-notes.js','utf8');
const sb=fs.readFileSync('modules/vehicle/sparepart-servis-b.js','utf8');
function ok(n,c){assert.ok(c,n);console.log('PASS',n)}
ok('create lifecycle failure queues outbox',cn.includes("post-commit service create lifecycle failed; reconciliation required")&&cn.includes("type:'service.create',payload:_newServisLog"));
ok('edit lifecycle failure queues outbox',cn.includes("post-commit service edit lifecycle failed; reconciliation required")&&cn.includes("type:'service.update',payload:s"));
ok('delete finance event failure queues outbox',cn.includes("V32: finance delete event failed after commit")&&cn.includes("type:'finance.updated',payload:{txId:deletedTxId"));
ok('saveServis has no duplicate vehicle event',!sb.includes('function saveServis(){\nconst r=Servis.save();\nif(typeof AIBus!=="undefined")AIBus.emit("vehicle.updated"'));
console.log('V32 PASS');
