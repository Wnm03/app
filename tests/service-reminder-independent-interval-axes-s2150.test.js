'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

function context(){
  const D={vehicles:[{id:'v-kzr',name:'Honda Vario 125 KZR 2012',modelId:'kzr',currentOdometer:24000}],sparepartCats:[],servisLogs:[],partsStock:[],transactions:[],accounts:[]};
  const cat={id:'cat-vbelt',name:'V-Belt CVT',serviceComponentId:'v-belt-cvt',masterCategoryId:'servis-cvt',intervalKm:32000,intervalBulan:0,showInReminder:true,vehicleId:'v-kzr'};
  D.sparepartCats.push(cat);
  const c=loadSource([
    'modules/vehicle/service-master-data.generated.js',
    'modules/vehicle/servis-checklist.js',
    'car-notes.js',
    'modules/vehicle/service-input-catalog.js',
    'modules/vehicle/vehicle-car-notes-sot-s2071.js',
    'modules/vehicle/vehicle-service-sot.js',
    'modules/vehicle/service-interval-sot.js',
    'modules/vehicle/sparepart-servis.js',
    'modules/vehicle/sparepart-servis-b.js'
  ],{D,curVehicleId:'v-kzr',findTorsiDb:()=>({id:'vario-125'})},[
    'SERVICE_CHECKLIST_GROUPS','SERVICE_MAINTENANCE_RULES','getMaintenanceSchedule','buildServiceNextDueSnapshot'
  ]);
  return {c,D,cat};
}

test('S2150: V-Belt keeps inspection cadence separate from the active SOT replacement interval',()=>{
  const {c,cat}=context();
  const schedule=c.getMaintenanceSchedule('v-kzr',cat);
  assert.equal(schedule.inspectKm,8000);
  assert.equal(schedule.replaceKm,24000);
  assert.equal(schedule.intervalSotSource,'pedoman');
  assert.equal(c.buildServiceNextDueSnapshot({vehicleId:'v-kzr',cat,serviceKm:24000,serviceDate:'2026-10-01',actionType:'periksa'}).nextDueKm,32000);
  assert.equal(c.buildServiceNextDueSnapshot({vehicleId:'v-kzr',cat,serviceKm:24000,serviceDate:'2026-10-01',actionType:'ganti'}).nextDueKm,48000);
});

test('S2150: manual V-Belt replacement interval stays authoritative without disabling inspections',()=>{
  const {c,cat}=context();
  const result=c.VehicleCarNotesSOT.setServiceInterval('v-kzr',cat,{intervalKm:28000,source:'manual'});
  assert.equal(result.ok,true);
  const schedule=c.getMaintenanceSchedule('v-kzr',cat);
  assert.equal(schedule.inspectKm,8000);
  assert.equal(schedule.replaceKm,28000);
  assert.equal(schedule.intervalSotSource,'manual');
  assert.equal(c.buildServiceNextDueSnapshot({vehicleId:'v-kzr',cat,serviceKm:24000,serviceDate:'2026-10-01',actionType:'periksa'}).nextDueKm,32000);
  assert.equal(c.buildServiceNextDueSnapshot({vehicleId:'v-kzr',cat,serviceKm:24000,serviceDate:'2026-10-01',actionType:'ganti'}).nextDueKm,52000);
  assert.equal(c.VehicleCarNotesSOT.getServiceInterval('v-kzr',cat).intervalKm,28000);
});
