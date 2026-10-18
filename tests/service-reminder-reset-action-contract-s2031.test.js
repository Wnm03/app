'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function ctxWith(data){return loadSource(['modules/vehicle/servis-checklist.js','car-notes.js','modules/vehicle/service-input-catalog.js','modules/vehicle/servis.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'],{D:data},['computeServiceUrgency','matchesActionTypeForReset','resolveResetActionTypeFilter']);}
function base(actionRows,catExtra={}){
 const cat={id:'c1',name:'Komponen Interval Uji',serviceComponentId:'komponen-interval-uji',intervalKm:24000,intervalBulan:0,showInReminder:true,...catExtra};
 const logs=actionRows.map((x,i)=>({id:'s'+i,vehicleId:'v1',categoryId:'c1',item:cat.name,date:`2026-0${i+1}-01`,...x}));
 return {vehicles:[{id:'v1',name:'Kendaraan Uji'}],sparepartCats:[cat],servisLogs:logs};
}
test('S2031: pemeriksaan tidak menggeser baseline interval dari penggantian terakhir',()=>{
 const d=base([{km:20000,actionType:'ganti'},{km:22000,actionType:'periksa',conditionResult:'baik'}]);
 const c=ctxWith(d);const u=c.computeServiceUrgency({vehicleId:'v1',cat:d.sparepartCats[0],curKm:23500,kmPerDay:null,nowISO:'2026-10-01'});
 assert.equal(u.lastKm,20000);assert.equal(u.nextDueKm,44000);assert.equal(u.sisaKm,20500);
});
test('S2031: pasang baru dan overhaul juga menjadi tindakan reset interval',()=>{
 for(const actionType of ['pasang','overhaul','perbaiki']){
  const d=base([{km:20000,actionType:'ganti'},{km:22000,actionType}]);
  const c=ctxWith(d);const u=c.computeServiceUrgency({vehicleId:'v1',cat:d.sparepartCats[0],curKm:23500,kmPerDay:null,nowISO:'2026-10-01'});
  assert.equal(u.lastKm,22000,`${actionType} should reset baseline`);assert.equal(u.nextDueKm,46000);
 }
});
test('S2031: condition-based component has no kilometre countdown and reports damaged condition',()=>{
 const d=base([{km:20000,actionType:'periksa',conditionResult:'rusak'}],{conditionBased:true});
 const c=ctxWith(d);const u=c.computeServiceUrgency({vehicleId:'v1',cat:d.sparepartCats[0],curKm:23500,kmPerDay:null});
 assert.equal(u.maintenanceType,'condition');assert.equal(u.status,'rusak');assert.equal(u.nextDueKm,null);assert.equal(u.sisaKm,null);assert.equal(u.intervalKm,null);
});
test('S2031: replacing a condition-based component returns it to normal without countdown',()=>{
 const d=base([{km:20000,actionType:'periksa',conditionResult:'rusak'},{km:22000,actionType:'ganti'}],{conditionBased:true});
 const c=ctxWith(d);const u=c.computeServiceUrgency({vehicleId:'v1',cat:d.sparepartCats[0],curKm:23500,kmPerDay:null});
 assert.equal(u.status,'normal');assert.equal(u.nextDueKm,null);assert.equal(u.sisaKm,null);
});
