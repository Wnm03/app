'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const master=require('../modules/vehicle/service-master-data.generated.js'); global.SERVICE_CHECKLIST_GROUPS=master.SERVICE_CHECKLIST_GROUPS; const tax=require('../modules/vehicle/service-taxonomy-sot.js'); const a=require('../modules/vehicle/service-post-migration-reconciliation-s2165.js');
global.ServiceTaxonomySOT=tax;
function data(){return {vehicles:[{id:'v1',name:'Vario 125'},{id:'v2',name:'Scoopy'}],servisLogs:[{id:'s1',vehicleId:'v1',masterCategoryId:'servis-cvt',serviceComponentId:'slide-piece-cvt'}],serviceReminderPackages:[{id:'r1',vehicleId:'v1',status:'ACTIVE',targets:[{masterCategoryId:'servis-cvt',serviceComponentId:'slide-piece-cvt'}]},{id:'r2',vehicleId:'v2',status:'ACTIVE',targets:[{masterCategoryId:'servis-cvt',serviceComponentId:'slide-piece-cvt'}]}]};}
test('S2165 clean canonical data passes',()=>assert.equal(a.audit(data(),{activeVehicleId:'v1'}).pass,true));
test('S2165 detects duplicate canonical identity',()=>{const d=data();d.servisLogs.push({id:'s2',vehicleId:'v1',masterCategoryId:'servis-cvt',serviceComponentId:'slide-piece-cvt'});assert.equal(a.audit(d).checks.duplicateIdentity,false);});
test('S2165 detects canonical mismatch',()=>{const d=data();d.servisLogs[0].serviceComponentId='coolant';assert.equal(a.audit(d).checks.canonicalIdentity,false);});
test('S2165 detects duplicate reminder target',()=>{const d=data();d.serviceReminderPackages[0].targets.push({masterCategoryId:'servis-cvt',serviceComponentId:'slide-piece-cvt'});assert.equal(a.audit(d).checks.duplicateIdentity,false);});
test('S2165 active vehicle scope is isolated',()=>{const r=a.audit(data(),{activeVehicleId:'v1'});assert.equal(r.checks.activeVehicleScope,true);assert.equal(r.activeVehicle.scopedReminderCount,1);});
