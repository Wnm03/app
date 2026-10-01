#!/usr/bin/env node
'use strict';
const R=require('../modules/vehicle/service-reviewed-mapping-migration-s2164.js');
const M=require('../modules/vehicle/service-legacy-mapping-s2163.js');
global.ServiceLegacyMappingS2163=M;
function assert(x,m){if(!x)throw new Error(m)}
function fixture(){return {vehicles:[{id:'v1',name:'Vario 125'},{id:'v2',name:'Scoopy'}],servisLogs:[
 {id:'s1',vehicleId:'v1',item:'Slidepiece'},
 {id:'s2',vehicleId:'v1',item:'Grease Cvt'},
 {id:'s3',vehicleId:'v2',item:'Grmuk cvt',masterCategoryId:'servis-cvt'},
 {id:'s4',vehicleId:'v1',item:'Slidepiece',masterCategoryId:'servis-cvt',serviceComponentId:'slide-piece-cvt'},
 {id:'s5',vehicleId:'v1',item:'Pully'},
 {id:'s6',vehicleId:'v1',item:'Slidepiece',serviceComponentId:'other-component'},
 {id:'s7',vehicleId:'v1',item:'Grease Cvt',masterCategoryId:'wrong-category'},
 {id:'s8',vehicleId:'unknown',item:'Slidepiece'}
]}}
function clone(x){return JSON.parse(JSON.stringify(x))}
function main(){
 const d=fixture(), before=clone(d), a=R.audit(d);
 assert(a.summary.reviewedMatches===7,'reviewed match count drift');
 assert(a.summary.safe===3,'safe migration count drift');
 assert(a.summary.clean===1,'already canonical count drift');
 assert(a.summary.conflict===2,'conflict count drift');
 assert(a.summary.blocked===1,'vehicle boundary gate drift');
 const applied=R.apply(d,a); assert(applied.ok&&applied.changed===3,'changed count drift');
 assert(d.servisLogs[0].serviceComponentId==='slide-piece-cvt'&&d.servisLogs[0].masterCategoryId==='servis-cvt','Slidepiece not migrated');
 assert(d.servisLogs[1].serviceComponentId==='pelumasan-cvt-grease','Grease Cvt not migrated');
 assert(d.servisLogs[2].serviceComponentId==='pelumasan-cvt-grease','Grmuk cvt not migrated');
 assert(d.servisLogs[3].editHistory===undefined,'clean record must not be mutated');
 assert(d.servisLogs[4].serviceComponentId==null,'blocked mapping leaked');
 assert(d.servisLogs[5].serviceComponentId==='other-component','conflicting component overwritten');
 assert(d.servisLogs[6].masterCategoryId==='wrong-category','conflicting category overwritten');
 assert(d.servisLogs[7].serviceComponentId==null,'unknown vehicle migrated');
 const once=clone(d), a2=R.audit(d), applied2=R.apply(d,a2);
 assert(applied2.changed===0,'migration is not idempotent');
 assert(JSON.stringify(once)===JSON.stringify(d),'second pass mutated data');
 assert(JSON.stringify(before.servisLogs[4])===JSON.stringify(d.servisLogs[4]),'blocked legacy row changed');
 assert(d.servisLogs[0].editHistory?.some(x=>x.source==='s2164-reviewed-mapping-migration'),'audit trail missing');
 console.log('S2164 reviewed-mapping migration gate: PASS 10/10');
 console.log(JSON.stringify({reviewedMatches:a.summary.reviewedMatches,safe:a.summary.safe,clean:a.summary.clean,conflict:a.summary.conflict,blocked:a.summary.blocked,changed:applied.changed,secondPassChanged:applied2.changed,vehicleBoundary:true,conflictsPreserved:true},{indent:2}));
}
main();
