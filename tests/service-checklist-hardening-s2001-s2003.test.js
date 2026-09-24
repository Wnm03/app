'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const vm=require('vm');

test('S2001 source: history stores catalog snapshots separately from live refs',()=>{
 const s=fs.readFileSync('modules/vehicle/servis.js','utf8');
 assert.match(s,/catalogPartSnapshots/);assert.match(s,/await VehicleCatalog\.getById\(_ref\.catalogId\)/);assert.match(s,/intervalKmAtService/);
});
test('S2002 source: create path derives deterministic per-component idempotency keys and blocks duplicates',()=>{
 const s=fs.readFileSync('modules/vehicle/servis.js','utf8');
 assert.match(s,/_rowIdempotencyKeys/);assert.match(s,/ServiceEventIdempotencySOT\.find\(D\.servisLogs/);assert.match(s,/idempotencyKey=_rowIdempotencyKeys/);
});
test('S2002 idempotency SOT supports multi-component identity',()=>{
 const S=require('../modules/vehicle/service-event-idempotency-sot.js');
 const a=S.key({vehicleId:'v1',componentIds:['b','a'],date:'2026-09-24',km:1000,actionType:'ganti'});
 const b=S.key({vehicleId:'v1',componentIds:['a','b'],date:'2026-09-24',km:1000,actionType:'ganti'});
 assert.equal(a,b);assert.equal(S.find([{id:'x',vehicleId:'v1',idempotencyKey:a}],a,'v1').id,'x');
});
test('S2003 integrity audit flags unknown canonical component without inventing mapping',()=>{
 const code=fs.readFileSync('modules/vehicle/service-checklist-integrity-sot.js','utf8');
 const ctx={__SERVICE_MASTER_DATA__:[{items:[{id:'known',masterCategoryId:'cat',intervalKm:1000}]}],__SERVICE_CHECKLIST_GROUPS__:[{items:[{id:'known'},{id:'missing'}]}],D:{servisLogs:[]}};
 vm.runInNewContext(code,ctx);const r=ctx.ServiceChecklistIntegritySOT.auditMaster();assert.equal(r.total,2);assert.equal(r.ok,false);assert.ok(r.issues.some(x=>x.code==='CHECKLIST_MASTER_MISSING'));assert.equal(r.readOnly,true);
});
test('S2003 integrity audit validates existing log component/session and catalog ref shape',()=>{
 const code=fs.readFileSync('modules/vehicle/service-checklist-integrity-sot.js','utf8');
 const ctx={__SERVICE_MASTER_DATA__:[{items:[{id:'known',masterCategoryId:'cat',intervalKm:1000}]}],__SERVICE_CHECKLIST_GROUPS__:[{items:[{id:'known'}]}],D:{servisLogs:[{id:'s1',vehicleId:'v1',checklistItemId:'known',serviceComponentId:'known',intervalKmAtService:1000,sessionId:'sess',catalogPartRefs:[{catalogId:'p1',qty:1}]}]}};
 vm.runInNewContext(code,ctx);const r=ctx.ServiceChecklistIntegritySOT.auditLogs('v1');assert.equal(r.ok,true);assert.equal(r.issues.length,0);
});
