'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

function contextFor(componentId,categoryPolicy,logs){
  const D={
    vehicles:[{id:'v1',name:'Honda Vario 125',modelId:'vario-125',currentOdometer:16000}],
    sparepartCats:[{id:'cat-'+componentId,name:componentId==='kampas-rem-depan'?'Kampas Rem Depan':'Oli Mesin',serviceComponentId:componentId,masterCategoryId:componentId==='kampas-rem-depan'?'sistem-pengereman':'servis-mesin',intervalKm:4000,intervalBulan:0,showInReminder:true,...categoryPolicy}],
    servisLogs:[],partsStock:[],transactions:[],accounts:[]
  };
  D.servisLogs=logs.map((row,i)=>({id:'h'+i,vehicleId:'v1',categoryId:D.sparepartCats[0].id,serviceComponentId:componentId,masterCategoryId:D.sparepartCats[0].masterCategoryId,item:D.sparepartCats[0].name,...row}));
  const rule={inspectKm:2000,replaceKm:4000,inspectAction:'periksa',replaceAction:'ganti',maintenanceType:'periodic'};
  const ctx=loadSource([
    'modules/vehicle/service-master-data.generated.js',
    'modules/vehicle/service-input-catalog.js',
    'modules/vehicle/vehicle-car-notes-sot-s2071.js',
    'modules/vehicle/vehicle-service-sot.js',
    'modules/vehicle/service-interval-sot.js',
    'modules/vehicle/service-history-reminder-reconciliation-sot.js',
    'modules/vehicle/sparepart-servis.js',
    'modules/vehicle/sparepart-servis-b.js'
  ],{D,curVehicleId:'v1',MY_WRENCH:{minLbft:10,maxLbft:10},findTorsiDb:()=>({id:'vario-125'}),SERVICE_MAINTENANCE_RULES:{[componentId]:rule},estimateServiceDateISO:()=>null},[
    'getMaintenanceSchedule','computeServiceUrgency','resolveResetActionTypeFilter','getEffectiveActionMode','getEffectiveGantiResetsInterval'
  ]);
  ctx.VehicleCarNotesSOT.setServiceInterval('v1',D.sparepartCats[0],{intervalKm:4000,source:'manual'});
  return {ctx,D,cat:D.sparepartCats[0]};
}

test('S2040 root: canonical conditional=false removes stale replacement axis and uses inspection history',()=>{
  const {ctx,cat}=contextFor('kampas-rem-depan',{actionMode:'periksa-conditional',gantiResetsInterval:true},[
    {date:'2026-01-01',km:8000,actionType:'ganti'},
    {date:'2026-02-01',km:12000,actionType:'periksa',conditionResult:'baik'}
  ]);
  const schedule=ctx.getMaintenanceSchedule('v1',cat);
  assert.equal(ctx.getEffectiveGantiResetsInterval(cat),false,'canonical master policy overrides stale category true');
  assert.equal(schedule.inspectKm,4000);
  assert.equal(schedule.replaceKm,null,'stale registry replace axis must be removed');
  const u=ctx.computeServiceUrgency({vehicleId:'v1',cat,curKm:16000,kmPerDay:null,nowISO:'2026-10-01'});
  assert.equal(u.lastKm,12000);
  assert.equal(u.nextDueKm,16000);
  assert.equal(u.nextAction,'periksa');
});

test('S2040 root: canonical conditional=true removes stale inspection axis and uses replacement history',()=>{
  const {ctx,cat}=contextFor('oli-mesin',{actionMode:'periksa-conditional',gantiResetsInterval:false},[
    {date:'2026-01-01',km:10000,actionType:'ganti'},
    {date:'2026-02-01',km:15000,actionType:'periksa',conditionResult:'baik'}
  ]);
  const schedule=ctx.getMaintenanceSchedule('v1',cat);
  assert.equal(ctx.getEffectiveGantiResetsInterval(cat),true,'canonical master policy overrides stale category false');
  assert.equal(schedule.replaceKm,4000);
  assert.equal(schedule.inspectKm,null,'stale registry inspection axis must be removed');
  const u=ctx.computeServiceUrgency({vehicleId:'v1',cat,curKm:16000,kmPerDay:null,nowISO:'2026-10-01'});
  assert.equal(u.lastKm,10000);
  assert.equal(u.nextDueKm,14000);
  assert.equal(u.nextAction,'ganti');
});
