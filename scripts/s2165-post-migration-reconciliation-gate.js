'use strict';
const fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
function load(rel){return require(path.join(root,rel));}
const master=load('modules/vehicle/service-master-data.generated.js');
global.SERVICE_CHECKLIST_GROUPS=master.SERVICE_CHECKLIST_GROUPS;
const tax=load('modules/vehicle/service-taxonomy-sot.js');
const audit=load('modules/vehicle/service-post-migration-reconciliation-s2165.js');
global.ServiceTaxonomySOT=tax;
function fixture(){return {vehicles:[{id:'v1',name:'Vario 125'},{id:'v2',name:'Scoopy'}],servisLogs:[
{id:'s1',vehicleId:'v1',masterCategoryId:'servis-cvt',serviceComponentId:'slide-piece-cvt'},
{id:'s2',vehicleId:'v1',masterCategoryId:'servis-cvt',serviceComponentId:'pelumasan-cvt-grease'},
{id:'s3',vehicleId:'v2',masterCategoryId:'servis-cvt',serviceComponentId:'slide-piece-cvt'}],serviceReminderPackages:[
{id:'r1',vehicleId:'v1',status:'ACTIVE',targets:[{masterCategoryId:'servis-cvt',serviceComponentId:'slide-piece-cvt'}]},
{id:'r2',vehicleId:'v2',status:'ACTIVE',targets:[{masterCategoryId:'servis-cvt',serviceComponentId:'slide-piece-cvt'}]}]};}
const good=fixture(); const a=audit.audit(good,{activeVehicleId:'v1'});
if(!a.pass) throw new Error('expected clean fixture to pass: '+JSON.stringify(a));
const dup=fixture(); dup.servisLogs.push({id:'s4',vehicleId:'v1',masterCategoryId:'servis-cvt',serviceComponentId:'slide-piece-cvt'});
if(audit.audit(dup,{activeVehicleId:'v1'}).checks.duplicateIdentity!==false) throw new Error('duplicate identity not detected');
const leak=fixture(); leak.serviceReminderPackages[1].targets[0].vehicleId='v1';
if(audit.audit(leak,{activeVehicleId:'v1'}).reminders.crossVehicle.length!==1) throw new Error('cross-vehicle reminder target not detected');
const mismatch=fixture(); mismatch.servisLogs[0].serviceComponentId='coolant';
if(audit.audit(mismatch,{activeVehicleId:'v1'}).checks.canonicalIdentity!==false) throw new Error('canonical mismatch not detected');
console.log(JSON.stringify({version:a.version,pass:true,checks:Object.keys(a.checks).length,cleanSummary:a.summary,negativeCases:'3/3 detected'},null,2));
