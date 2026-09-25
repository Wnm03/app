'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function makeContext(){
  const catalog={
    items:[{
      id:'p-coolant',partName:'Coolant',oemCode:'COOL-1',category:'Fluida',subcategory:'Pendingin',
      compatibleVehicleIds:['v1'],serviceIntervalKm:5000,serviceIntervalMonths:12,serviceShowInReminder:true
    }],
    updates:[],
  };
  const ctx={
    console,
    D:{vehicles:[{id:'v1',name:'Vario 125',intervalOverrides:{}}],sparepartCats:[],servisLogs:[]},
    VehicleCatalog:{
      getStore:()=>catalog,
      getAll:async()=>catalog.items,
      update:async(id,patch)=>{const x=catalog.items.find(i=>i.id===id);Object.assign(x,patch);catalog.updates.push({id,patch});return x;}
    },
    resolveCanonicalInterval:(cat,o={})=>({
      intervalKm:Number.isFinite(o.intervalKm)?o.intervalKm:(Number.isFinite(cat&&cat.intervalKm)?cat.intervalKm:null),
      intervalBulan:Number.isFinite(o.intervalBulan)?o.intervalBulan:(Number.isFinite(cat&&cat.intervalBulan)?cat.intervalBulan:null)
    }),
    catVisibleForVehicle:()=>true,
  };
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('modules/vehicle/vehicle-service-sot.js','utf8'),ctx,{filename:'vehicle-service-sot.js'});
  return {ctx,catalog};
}

test('S2031: one component reminder rule uses catalog KM/month interval, with explicit vehicle KM override only',()=>{
  const {ctx}=makeContext();
  const cat={id:'cat-coolant',name:'Coolant',serviceComponentId:'coolant',intervalKm:4000,intervalBulan:24,catalogPartId:'p-coolant',showInReminder:true};
  ctx.D.sparepartCats=[cat];
  let r=ctx.VehicleServiceSOT.resolveReminderRule(cat,'v1');
  assert.deepEqual({intervalKm:r.intervalKm,intervalBulan:r.intervalBulan,source:r.source,catalogPartId:r.catalogPartId},{intervalKm:5000,intervalBulan:12,source:'catalog',catalogPartId:'p-coolant'});
  ctx.D.vehicles[0].intervalOverrides['cat-coolant']=6000;
  r=ctx.VehicleServiceSOT.resolveReminderRule(cat,'v1');
  assert.equal(r.intervalKm,6000);
  assert.equal(r.intervalBulan,12,'KM override must never become a month interval');
});

test('S2031: reminder category projection exposes the same canonical component + interval data',()=>{
  const {ctx}=makeContext();
  const cat={id:'cat-coolant',name:'Coolant',serviceComponentId:'coolant',intervalKm:4000,intervalBulan:24,catalogPartId:'p-coolant',showInReminder:true};
  ctx.D.sparepartCats=[cat];
  const rows=ctx.VehicleServiceSOT.getReminderCategoriesForVehicle('v1');
  assert.equal(rows.length,1);
  assert.equal(rows[0].catalogPartId,'p-coolant');
  assert.equal(rows[0].intervalKm,5000);
  assert.equal(rows[0].intervalBulan,12);
  assert.equal(rows[0]._serviceIntervalSource,'catalog');
});

test('S2031: editing a linked category synchronizes canonical catalog service interval',async()=>{
  const {ctx,catalog}=makeContext();
  const cat={id:'cat-coolant',name:'Coolant',serviceComponentId:'coolant',intervalKm:4000,intervalBulan:24,catalogPartId:'p-coolant',showInReminder:true};
  const r=await ctx.VehicleServiceSOT.syncCategoryRule(cat,'v1');
  assert.equal(r.ok,true);
  assert.deepEqual(catalog.items[0] && {
    serviceIntervalKm:catalog.items[0].serviceIntervalKm,
    serviceIntervalMonths:catalog.items[0].serviceIntervalMonths,
    serviceShowInReminder:catalog.items[0].serviceShowInReminder
  },{serviceIntervalKm:4000,serviceIntervalMonths:24,serviceShowInReminder:true});
});


test('S2031: KM override cannot leak into month interval resolver',()=>{
  const {ctx}=makeContext();
  ctx.D.vehicles[0].intervalOverrides['cat-coolant']=6000;
  const cat={id:'cat-coolant',name:'Coolant',intervalKm:4000,intervalBulan:24,catalogPartId:null};
  vm.runInContext(fs.readFileSync('modules/vehicle/sparepart-servis.js','utf8'),ctx,{filename:'sparepart-servis.js'});
  assert.equal(ctx.getEffectiveIntervalKm('v1',cat),6000);
  assert.equal(ctx.getEffectiveIntervalBulan(cat,'v1'),12,'catalog month interval must win and KM override must not become months');
});


test('S2031: edit/history canonical interval policy delegates to the same reminder SOT',()=>{
  const {ctx}=makeContext();
  ctx.D.sparepartCats=[{id:'cat-coolant',name:'Coolant',serviceComponentId:'coolant',intervalKm:4000,intervalBulan:24,catalogPartId:'p-coolant',showInReminder:true}];
  vm.runInContext(fs.readFileSync('modules/vehicle/service-interval-policy.js','utf8'),ctx,{filename:'service-interval-policy.js'});
  const iv=ctx.getCanonicalServiceInterval(ctx.D.sparepartCats[0],{vehicleId:'v1'});
  assert.equal(iv.intervalKm,5000);
  assert.equal(iv.intervalBulan,12);
});

console.log('S2031 reminder category/component/interval SOT tests: PASS');
