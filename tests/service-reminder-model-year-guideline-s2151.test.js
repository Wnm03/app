'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function context({name='Honda Vario 125 KZR 2012',modelId='kzr',modelYear=2012}={}){
  const D={vehicles:[{id:'v-kzr',name,modelId,modelYear,currentOdometer:24000}],sparepartCats:[],servisLogs:[],partsStock:[],transactions:[],accounts:[]};
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
    'SERVICE_CHECKLIST_GROUPS','SERVICE_MAINTENANCE_RULES','getMaintenanceSchedule','buildServiceNextDueSnapshot','vehicleServiceSotResolveReminderRule'
  ]);
  return {c,D,cat};
}
test('S2151: KZR 2012 gets scoped 24,000 km V-Belt replacement while inspection stays 8,000 km',()=>{
  const {c,cat}=context();
  const schedule=c.getMaintenanceSchedule('v-kzr',cat);
  assert.equal(schedule.inspectKm,8000);
  assert.equal(schedule.replaceKm,24000);
  assert.equal(schedule.intervalSotSource,'pedoman');
  assert.equal(c.buildServiceNextDueSnapshot({vehicleId:'v-kzr',cat,serviceKm:24000,serviceDate:'2026-10-01',actionType:'periksa'}).nextDueKm,32000);
  assert.equal(c.buildServiceNextDueSnapshot({vehicleId:'v-kzr',cat,serviceKm:24000,serviceDate:'2026-10-01',actionType:'ganti'}).nextDueKm,48000);
});
test('S2151: stale guideline SOT is migrated to scoped value, but manual SOT is preserved',()=>{
  const a=context();
  a.c.VehicleCarNotesSOT.setServiceInterval('v-kzr',a.cat,{intervalKm:32000,source:'pedoman'});
  assert.equal(a.c.getMaintenanceSchedule('v-kzr',a.cat).replaceKm,24000);
  assert.equal(a.c.VehicleCarNotesSOT.getServiceInterval('v-kzr',a.cat).intervalKm,24000);
  const b=context();
  b.c.VehicleCarNotesSOT.setServiceInterval('v-kzr',b.cat,{intervalKm:28000,source:'manual'});
  const schedule=b.c.getMaintenanceSchedule('v-kzr',b.cat);
  assert.equal(schedule.inspectKm,8000);
  assert.equal(schedule.replaceKm,28000);
  assert.equal(schedule.intervalSotSource,'manual');
  assert.equal(b.c.VehicleCarNotesSOT.getServiceInterval('v-kzr',b.cat).intervalKm,28000);
});
test('S2151: model/year scope does not change the generic 32,000 km guideline',()=>{
  const {c,cat}=context({name:'Honda Vario 125 KZR 2014',modelId:'kzr',modelYear:2014});
  const schedule=c.getMaintenanceSchedule('v-kzr',cat);
  assert.equal(schedule.inspectKm,8000);
  assert.equal(schedule.replaceKm,32000);
});

test('S2151: runtime keeps independent inspection and replacement axes for legacy conflict components',()=>{
  const {c,D}=context({name:'Honda Vario 125 KZR 2014',modelId:'kzr',modelYear:2014});
  const cases=[
    {id:'busi',km:8000,inspectKm:4000,replaceKm:8000},
    {id:'filter-fuel-pump',km:48000,inspectKm:12000,replaceKm:48000},
    {id:'minyak-rem',km:24000,inspectKm:4000,replaceKm:24000,replaceMonths:24},
    {id:'aki',km:15000,inspectKm:4000,replaceKm:15000},
    {id:'ban-depan',km:20000,inspectKm:4000,inspectDays:14,replaceKm:20000},
    {id:'ban-belakang',km:null,inspectKm:4000,inspectDays:14,replaceKm:null}
  ];
  const master=c.SERVICE_CHECKLIST_GROUPS.flatMap(g=>g.items||[]);
  for(const row of cases){
    const item=master.find(x=>x.id===row.id); assert.ok(item,`missing master item ${row.id}`);
    const cat={id:`cat-${row.id}`,name:item.name,serviceComponentId:row.id,masterCategoryId:item.masterCategoryId,intervalKm:row.km,intervalBulan:row.id==='minyak-rem'?24:0,showInReminder:true,vehicleId:'v-kzr'};
    D.sparepartCats.push(cat);
    const schedule=c.getMaintenanceSchedule('v-kzr',cat);
    assert.equal(schedule.inspectKm,row.inspectKm,`${row.id} inspection km`);
    assert.equal(schedule.inspectDays||null,row.inspectDays||null,`${row.id} inspection days`);
    assert.equal(schedule.replaceKm||null,row.replaceKm||null,`${row.id} replacement km`);
    if(row.replaceMonths)assert.equal(schedule.replaceMonths,row.replaceMonths,`${row.id} replacement months`);
  }
});
