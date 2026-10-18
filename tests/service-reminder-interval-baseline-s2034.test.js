'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function setup(rows,catExtra={}){
  const cat={id:'cat-filter',name:'Filter Udara',serviceComponentId:'filter-udara',intervalKm:24000,intervalBulan:0,showInReminder:true,...catExtra};
  const logs=rows.map((row,i)=>({id:`h${i}`,vehicleId:'v1',categoryId:cat.id,serviceComponentId:cat.serviceComponentId,item:cat.name,date:`2026-0${i+1}-01`,...row}));
  const D={vehicles:[{id:'v1',name:'Motor',currentOdometer:23500}],sparepartCats:[cat],servisLogs:logs};
  const ctx=loadSource(['modules/vehicle/servis-checklist.js','car-notes.js','modules/vehicle/service-input-catalog.js','modules/vehicle/servis.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'],{D},['buildServiceNextDueSnapshot','computeServiceUrgency','getLatestServiceLogForCat']);
  return {ctx,D,cat};
}
test('S2034: replacement snapshot uses latest replacement odometer, not later cleaning',()=>{
  const {ctx,cat}=setup([{km:20000,actionType:'ganti'},{km:22000,actionType:'bersih'}]);
  const snap=ctx.buildServiceNextDueSnapshot({vehicleId:'v1',cat,serviceKm:22000,serviceDate:'2026-02-01',actionType:'bersih'});
  assert.equal(snap.nextDueKm,44000);
  assert.equal(snap.intervalKmAtService,24000);
});
test('S2034: good inspection does not reset replacement interval baseline',()=>{
  const {ctx,cat}=setup([{km:20000,actionType:'ganti'},{km:22000,actionType:'periksa',conditionResult:'baik'}]);
  const snap=ctx.buildServiceNextDueSnapshot({vehicleId:'v1',cat,serviceKm:22000,serviceDate:'2026-02-01',actionType:'periksa'});
  assert.equal(snap.nextDueKm,44000);
  const urgency=ctx.computeServiceUrgency({vehicleId:'v1',cat,curKm:23500,kmPerDay:null,nowISO:'2026-10-01'});
  assert.equal(urgency.lastKm,20000);
  assert.equal(urgency.nextDueKm,44000);
});
test('S2034: a new replacement does reset the next interval',()=>{
  const {ctx,cat}=setup([{km:20000,actionType:'ganti'},{km:22000,actionType:'ganti'}]);
  const snap=ctx.buildServiceNextDueSnapshot({vehicleId:'v1',cat,serviceKm:22000,serviceDate:'2026-02-01',actionType:'ganti'});
  assert.equal(snap.nextDueKm,46000);
});
