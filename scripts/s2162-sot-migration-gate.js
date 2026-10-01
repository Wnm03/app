#!/usr/bin/env node
'use strict';
/* S2162 — Controlled Existing-Data Migration Gate
 * Audit-first, deterministic-only, idempotent, vehicle-bound, non-destructive.
 * This gate never auto-resolves ambiguous legacy records.
 */
const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const R=require(path.join(ROOT,'modules/vehicle/service-data-reconciliation-s2161.js'));
const master=require(path.join(ROOT,'modules/vehicle/service-master-data.generated.js'));
global.SERVICE_CHECKLIST_GROUPS=master.SERVICE_CHECKLIST_GROUPS;
global.ServiceTaxonomySOT=require(path.join(ROOT,'modules/vehicle/service-taxonomy-sot.js'));
function assert(x,msg){if(!x)throw new Error(msg)}
function fixture(){return {vehicles:[{id:'v1',name:'Vario 125'},{id:'v2',name:'Scoopy'}],sparepartCats:[{id:'legacy-oli',name:'Oli Mesin',serviceComponentId:'oli-mesin',masterCategoryId:'servis-mesin'}],servisLogs:[
 {id:'s1',vehicleId:'v1',item:'Oli Mesin',categoryId:'legacy-oli'},
 {id:'s2',vehicleId:'v1',item:'Coolant',masterCategoryId:'servis-mesin',serviceComponentId:'coolant'},
 {id:'s3',vehicleId:'v1',item:'Servis Cvt'},
 {id:'s4',vehicleId:'v2',item:'Oli Mesin',categoryId:'legacy-oli'}
]}}
function clone(x){return JSON.parse(JSON.stringify(x))}
function main(){
 const d=fixture(); const a=R.audit(d);
 assert(a.summary.safe===3,'expected exactly 3 deterministic records');
 assert(a.summary.unresolved===1,'ambiguous record must remain unresolved');
 const before=clone(d); const applied=R.applySafe(d,a); assert(applied.ok&&applied.changed===3,'safe migration count mismatch');
 const once=clone(d); const a2=R.audit(d); const applied2=R.applySafe(d,a2); assert(applied2.changed===0,'migration must be idempotent');
 assert(d.servisLogs[2].serviceComponentId==null,'ambiguous record was mutated');
 assert(d.servisLogs[1].masterCategoryId==='sistem-pendingin','canonical mismatch was not repaired');
 assert(d.servisLogs[0].vehicleId==='v1'&&d.servisLogs[3].vehicleId==='v2','vehicle boundary changed');
 assert(JSON.stringify(before.servisLogs[2])===JSON.stringify(d.servisLogs[2]),'ambiguous record changed');
 assert(d.servisLogs[0].editHistory?.some(x=>x.source==='s2161-sot-reconciliation'),'service migration audit trail missing');
 console.log('S2162 controlled migration gate: PASS 7/7');
 console.log(JSON.stringify({safe:a.summary.safe,unresolved:a.summary.unresolved,changed:applied.changed,secondPassChanged:applied2.changed,ambiguousPreserved:true,vehicleBoundary:true},{indent:2}));
}
main();
