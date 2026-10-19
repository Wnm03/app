'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {audit,sha}=require('../scripts/s2174-service-category-recovery-audit.js');

test('S2174 confirms category-level reminder identity only when ID, label, vehicle, and interval snapshot all agree',()=>{
 const data={vehicles:[{id:'v1'}],sparepartCats:[{id:'cat1',name:'Pulley Cover',vehicleId:'v1',intervalKm:1000,showInReminder:true}],servisLogs:[{id:'h1',vehicleId:'v1',date:'2025-01-01',km:5000,item:'Pulley Cover',categoryId:'cat1',intervalKmAtService:1000,nextDueKm:6000}]};
 const before=JSON.stringify(data);const r=audit(data,'fixture.json',sha(Buffer.from(before)));
 assert.equal(JSON.stringify(data),before);assert.equal(r.unresolved[0].status,'CATEGORY_AND_INTERVAL_SNAPSHOT_CONFIRMED');assert.equal(r.unresolved[0].autoApply,false);assert.equal(r.summary.autoChanges,0);
});

test('S2174 does not confirm category identity for a category from another vehicle',()=>{
 const data={vehicles:[{id:'v1'},{id:'v2'}],sparepartCats:[{id:'cat1',name:'Pulley Cover',vehicleId:'v2',intervalKm:1000,showInReminder:true}],servisLogs:[{id:'h1',vehicleId:'v1',date:'2025-01-01',km:5000,item:'Pulley Cover',categoryId:'cat1',intervalKmAtService:1000,nextDueKm:6000}]};
 const r=audit(data);assert.notEqual(r.unresolved[0].status,'CATEGORY_AND_INTERVAL_SNAPSHOT_CONFIRMED');assert.equal(r.summary.autoChanges,0);
});

test('S2174 rejects a category whose label conflicts with the history row',()=>{
 const data={vehicles:[{id:'v1'}],sparepartCats:[{id:'cat1',name:'Other Part',vehicleId:'v1',intervalKm:1000,showInReminder:true}],servisLogs:[{id:'h1',vehicleId:'v1',date:'2025-01-01',km:5000,item:'Pulley Cover',categoryId:'cat1',intervalKmAtService:1000,nextDueKm:6000}]};
 const r=audit(data);assert.equal(r.unresolved[0].status,'CATEGORY_ID_MATCH_BUT_LABEL_NOT_EXACT');assert.equal(r.unresolved[0].autoApply,false);
});

test('S2174 treats multiple rows under a valid category as category history, not canonical component proof',()=>{
 const data={vehicles:[{id:'v1'}],sparepartCats:[{id:'cat1',name:'CVT Service',vehicleId:'v1',intervalKm:8000,showInReminder:true}],servisLogs:[{id:'h1',vehicleId:'v1',km:1000,item:'CVT Service',categoryId:'cat1',intervalKmAtService:8000,nextDueKm:9000},{id:'h2',vehicleId:'v1',km:2000,item:'CVT Service',categoryId:'cat1',intervalKmAtService:8000,nextDueKm:10000}]};
 const r=audit(data);assert.equal(r.unresolved.length,2);assert.ok(r.unresolved.every(x=>x.status==='CATEGORY_AND_INTERVAL_SNAPSHOT_CONFIRMED'));assert.ok(r.unresolved.every(x=>!x.identity.serviceComponentId));assert.equal(r.policy.categoryIdIsNotCanonicalServiceComponentId,true);
});
