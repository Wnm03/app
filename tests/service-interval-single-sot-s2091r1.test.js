'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function load(){
  const ctx={console,Date,Math,Number,String,Array,Object,Map,Set,JSON,RegExp,Promise,parseFloat,parseInt,isFinite,Infinity,NaN};
  ctx.window=ctx;ctx.globalThis=ctx;
  ctx.D={vehicles:[{id:'veh_1',name:'Vario 125',modelId:'vario-125',intervalOverrides:{}}],sparepartCats:[{id:'sp_oli',name:'Oli Mesin',serviceComponentId:'oli-mesin',masterCategoryId:'servis-mesin',intervalKm:1500,showInReminder:true,vehicleId:'veh_1'}],servisLogs:[{id:'svc-1',vehicleId:'veh_1',item:'Oli Mesin',categoryId:'sp_oli',serviceComponentId:'oli-mesin',actionType:'ganti',km:18554,date:'2026-08-13'}]};
  vm.createContext(ctx);
  for(const f of ['modules/vehicle/service-master-data.generated.js','modules/vehicle/servis-checklist.js','modules/vehicle/service-input-catalog.js','modules/vehicle/vehicle-car-notes-sot-s2071.js','modules/vehicle/vehicle-service-sot.js','car-notes.js','modules/vehicle/sparepart-servis.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
  return ctx;
}

test('S2091-r1: interval aktif hanya satu SOT dan pedoman 4.000 menang atas legacy 1.500 saat inisialisasi',()=>{
  const c=load(),cat=c.D.sparepartCats[0];
  const rule=c.VehicleServiceSOT.resolveReminderRule(cat,'veh_1');
  assert.equal(rule.intervalKm,4000);
  assert.equal(rule.source,'pedoman');
  const sot=c.VehicleCarNotesSOT.getServiceInterval('veh_1',cat);
  assert.equal(sot.intervalKm,4000);
  assert.equal(sot.source,'pedoman');
  assert.equal(c.D.vehicles[0].sot.serviceIntervals['oli-mesin'].intervalKm,4000);
});

test('S2091-r1: AI rekomendasi menjadi nilai aktif hanya setelah dipilih',()=>{
  const c=load(),cat=c.D.sparepartCats[0];
  c.VehicleCarNotesSOT.setServiceInterval('veh_1',cat,{intervalKm:3500,source:'ai-rekomendasi'});
  const rule=c.VehicleServiceSOT.resolveReminderRule(cat,'veh_1');
  assert.equal(rule.intervalKm,3500);
  assert.equal(rule.source,'ai-rekomendasi');
});

test('S2091-r1: edit manual menjadi SOT dan legacy intervalOverrides tidak lagi menjadi sumber',()=>{
  const c=load(),cat=c.D.sparepartCats[0];
  c.D.vehicles[0].intervalOverrides.sp_oli=3000;
  let rule=c.VehicleServiceSOT.resolveReminderRule(cat,'veh_1');
  assert.equal(rule.intervalKm,4000);
  assert.equal(rule.source,'pedoman');
  c.VehicleCarNotesSOT.setServiceInterval('veh_1',cat,{intervalKm:4500,source:'manual'});
  delete c.D.vehicles[0].intervalOverrides.sp_oli;
  rule=c.VehicleServiceSOT.resolveReminderRule(cat,'veh_1');
  assert.equal(rule.intervalKm,4500);
  assert.equal(rule.source,'manual');
});

test('S2091-r1: histori ganti 18.554 km dan KM 20.237 menghasilkan jatuh tempo 22.554, bukan overdue',()=>{
  const c=load(),cat=c.D.sparepartCats[0];
  c.getVehicleKm=()=>20237;c.estimateKmPerDay=()=>20;c.getLastServiceKmForCat=()=>18554;c.getLatestServiceLogForCat=()=>c.D.servisLogs[0];
  const u=c.computeServiceUrgency({vehicleId:'veh_1',cat,curKm:20237,kmPerDay:20});
  assert.equal(u.intervalKm,4000);
  assert.equal(u.nextDueKm,22554);
  assert.equal(u.sisaKm,2317);
  assert.notEqual(u.status,'terlewat');
  assert.notEqual(u.status,'jatuh_tempo');
});
