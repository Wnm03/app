'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function context(){
  const D={vehicles:[{id:'v1',name:'Honda Vario 125 KZR 2012',modelId:'kzr',modelYear:2012,currentOdometer:24000}],sparepartCats:[],servisLogs:[],partsStock:[],transactions:[],accounts:[]};
  const cat={id:'cat-roller',name:'Roller CVT',serviceComponentId:'roller-cvt',masterCategoryId:'servis-cvt',intervalKm:24000,intervalBulan:0,showInReminder:true,vehicleId:'v1'};
  D.sparepartCats.push(cat);
  const c=loadSource([
    'modules/vehicle/service-master-data.generated.js','modules/vehicle/servis-checklist.js','car-notes.js',
    'modules/vehicle/service-input-catalog.js','modules/vehicle/vehicle-car-notes-sot-s2071.js',
    'modules/vehicle/vehicle-service-sot.js','modules/vehicle/service-interval-sot.js',
    'modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'
  ],{D,curVehicleId:'v1',findTorsiDb:()=>({id:'vario-125'})},[
    'SERVICE_CHECKLIST_GROUPS','SERVICE_MAINTENANCE_RULES','getMaintenanceSchedule','buildServiceNextDueSnapshot'
  ]);
  return {c,D,cat};
}
test('S2152: Roller CVT has independent 12,000 km inspection and 24,000 km replacement axes',()=>{
 const {c,cat}=context(); const s=c.getMaintenanceSchedule('v1',cat);
 assert.equal(s.inspectKm,12000); assert.equal(s.replaceKm,24000);
 const master=c.SERVICE_CHECKLIST_GROUPS.flatMap(g=>g.items).find(x=>x.id==='roller-cvt');
 assert.equal(master.intervalAxes,'independent'); assert.equal(master.needsReview,false);
 assert.match(master.intervalLabel,/Periksa 12\.000 km.*Ganti 24\.000 km/);
});
test('S2152: manual Roller CVT replacement SOT overrides 24,000 km without changing 12,000 km inspection',()=>{
 const {c,cat}=context();
 const result=c.VehicleCarNotesSOT.setServiceInterval('v1',cat,{intervalKm:18000,source:'manual'});
 assert.equal(result.ok,true);
 const s=c.getMaintenanceSchedule('v1',cat);
 assert.equal(s.inspectKm,12000); assert.equal(s.replaceKm,18000); assert.equal(s.intervalSotSource,'manual');
 assert.equal(c.VehicleCarNotesSOT.getServiceInterval('v1',cat).intervalKm,18000);
});
test('S2152: replacement baseline is independent from inspection cadence',()=>{
 const {c,cat}=context();
 const inspect=c.buildServiceNextDueSnapshot({vehicleId:'v1',cat,serviceKm:12000,serviceDate:'2026-10-01',actionType:'periksa'});
 const replace=c.buildServiceNextDueSnapshot({vehicleId:'v1',cat,serviceKm:24000,serviceDate:'2026-10-01',actionType:'ganti'});
 assert.equal(inspect.nextDueKm,24000);
 assert.equal(replace.nextDueKm,48000);
});
