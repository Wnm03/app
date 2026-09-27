'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function load(){
  const ctx={console,Date,Math,Number,String,Array,Object,Map,Set,JSON,RegExp,Promise,parseFloat,parseInt,isFinite,Infinity,NaN};
  ctx.window=ctx;ctx.globalThis=ctx;
  ctx.D={vehicles:[{id:'veh_1',name:'Vario 125',modelId:'vario-125',intervalOverrides:{}}],sparepartCats:[{id:'sp_oli',name:'Oli Mesin',serviceComponentId:'oli-mesin',masterCategoryId:'servis-mesin',intervalKm:1500,showInReminder:true,vehicleId:'veh_1'}],servisLogs:[{id:'svc-20k',vehicleId:'veh_1',item:'Oli Mesin',categoryId:'sp_oli',serviceComponentId:'oli-mesin',actionType:'ganti',km:18554,date:'2026-08-13'}]};
  vm.createContext(ctx);
  for(const f of ['modules/vehicle/service-master-data.generated.js','modules/vehicle/servis-checklist.js','modules/vehicle/service-input-catalog.js','modules/vehicle/vehicle-car-notes-sot-s2071.js','modules/vehicle/vehicle-service-sot.js','car-notes.js','modules/vehicle/sparepart-servis.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
  return ctx;
}

test('S2091 corrected: Oli Mesin memakai satu active interval SOT dengan pedoman 4.000 km, bukan legacy 1.500 km',()=>{
  const c=load(); const cat=c.D.sparepartCats[0];
  const rule=c.VehicleServiceSOT.resolveReminderRule(cat,'veh_1');
  assert.equal(rule.intervalKm,4000);
  assert.equal(rule.source,'pedoman');
  assert.equal(c.VehicleCarNotesSOT.getServiceInterval('veh_1',cat).intervalKm,4000);
});

test('S2091 corrected: AI/manual hanya mengubah active SOT setelah dipilih/disimpan',()=>{
  const c=load(); const cat=c.D.sparepartCats[0];
  c.VehicleCarNotesSOT.setServiceInterval('veh_1',cat,{intervalKm:3500,source:'ai-rekomendasi'});
  let rule=c.VehicleServiceSOT.resolveReminderRule(cat,'veh_1');
  assert.equal(rule.intervalKm,3500); assert.equal(rule.source,'ai-rekomendasi');
  c.VehicleCarNotesSOT.setServiceInterval('veh_1',cat,{intervalKm:4500,source:'manual'});
  rule=c.VehicleServiceSOT.resolveReminderRule(cat,'veh_1');
  assert.equal(rule.intervalKm,4500); assert.equal(rule.source,'manual');
});
