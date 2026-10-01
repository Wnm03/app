'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const master=require('../modules/vehicle/service-master-data.generated.js');
global.SERVICE_CHECKLIST_GROUPS=master.SERVICE_CHECKLIST_GROUPS;
global.ServiceTaxonomySOT=require('../modules/vehicle/service-taxonomy-sot.js');
const R=require('../modules/vehicle/service-data-reconciliation-s2161.js');
const base={vehicles:[{id:'veh_1'}],sparepartCats:[{id:'legacy-oli',name:'Oli Mesin',serviceComponentId:'oli-mesin',masterCategoryId:'servis-mesin'}]};
function data(rows){return {...base,servisLogs:rows.map((r,i)=>({id:i+1,vehicleId:'veh_1',...r}))};}
test('S2161 derives canonical component from deterministic legacy category',()=>{
 const a=R.audit(data([{item:'Oli Mesin',categoryId:'legacy-oli'}]));
 assert.equal(a.summary.safe,1);assert.equal(a.rows[0].after.serviceComponentId,'oli-mesin');assert.equal(a.rows[0].after.masterCategoryId,'servis-mesin');
});
test('S2161 derives canonical pair from exact component name',()=>{
 const a=R.audit(data([{item:'Oli Mesin'}]));
 assert.equal(a.summary.safe,1);assert.equal(a.rows[0].after.serviceComponentId,'oli-mesin');
});
test('S2161 repairs canonical component/category mismatch without deleting data',()=>{
 const d=data([{item:'Coolant',masterCategoryId:'servis-mesin',serviceComponentId:'coolant'}]);
 const a=R.audit(d);assert.equal(a.summary.safe,1);assert.equal(a.rows[0].reason,'repair_master_from_canonical_component');
 const before=JSON.stringify(d.servisLogs[0]);const applied=R.applySafe(d,a);assert.equal(applied.changed,1);assert.equal(d.servisLogs[0].masterCategoryId,'sistem-pendingin');assert.equal(d.servisLogs[0].serviceComponentId,'coolant');assert.notEqual(JSON.stringify(d.servisLogs[0]),before);
});
test('S2161 refuses ambiguous legacy names',()=>{
 const a=R.audit(data([{item:'Servis Cvt'}]));
 assert.equal(a.summary.unresolved,1);assert.equal(a.rows[0].after.serviceComponentId,null);
});
test('S2161 preserves vehicle boundary and flags unknown vehicle',()=>{
 const d={...base,servisLogs:[{id:1,vehicleId:'missing',item:'Oli Mesin'}]};const a=R.audit(d);assert.equal(a.rows[0].status,'blocked');assert.equal(a.rows[0].reason,'unknown_vehicle');
});
console.log('S2161 existing-data reconciliation regression: 5/5 PASS');
