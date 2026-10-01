'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const vm=require('vm');
const path=require('path');

function load(file,ctx){
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx,{filename:file});
  return ctx;
}

test('S2154 taxonomy exposes canonical target identity',()=>{
  const ctx=load('modules/vehicle/service-taxonomy-sot.js',{SERVICE_CHECKLIST_GROUPS:[{masterCategoryId:'engine',group:'Mesin',items:[{id:'oil',name:'Oli Mesin'}]}],console});
  const r=ctx.ServiceTaxonomySOT.canonicalTarget({name:'Oli Mesin'});
  assert.equal(r.serviceComponentId,'oil');
  assert.equal(r.masterCategoryId,'engine');
  assert.equal(ctx.ServiceTaxonomySOT.targetKey({serviceComponentId:'oil'}),'engine|oil');
});

test('S2155 vehicle context refuses omitted vehicle reminder scope',()=>{
  const ctx={D:{vehicles:[{id:'A',name:'A'}],sparepartCats:[{id:'a',name:'Oli',vehicleId:'A',serviceComponentId:'oil'}]},curVehicleId:'A',console};
  load('modules/vehicle/vehicle-active-sot-s2061.js',ctx);
  assert.equal(ctx.VehicleScopedSOT.currentId(),'A');
  assert.equal(ctx.VehicleScopedSOT.scopeRows([{id:1,vehicleId:'A'},{id:2,vehicleId:'B'}]).length,1);
});

test('S2156/S2157 reminder package uses taxonomy SOT and dedupes canonical targets',()=>{
  const ctx={D:{servisLogs:[],serviceReminderPackages:[]},console};
  load('modules/vehicle/service-taxonomy-sot.js',Object.assign(ctx,{SERVICE_CHECKLIST_GROUPS:[{masterCategoryId:'engine',group:'Mesin',items:[{id:'oil',name:'Oli Mesin'}]}]}));
  load('modules/vehicle/service-reminder-package-sot.js',ctx);
  const r=ctx.ServiceReminderPackageSOT.create({vehicleId:'A',targets:[{name:'Oli Mesin'},{serviceComponentId:'oil'}]});
  assert.equal(r.ok,true);
  assert.equal(r.package.targets.length,1);
  assert.equal(r.package.targets[0].serviceComponentId,'oil');
});

test('S2158/S2159 legacy category resolver is still compatibility-safe',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/service-reminder-vehicle-scope-s2015.js'),'utf8');
  assert.match(src,/ServiceInputCatalog/);
  assert.match(src,/persistedEquivalent/);
  assert.match(src,/cleanupPersistedDuplicates/);
  const sot=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/service-taxonomy-sot.js'),'utf8');
  assert.match(sot,/canonicalTarget/);
  assert.match(fs.readFileSync(path.join(__dirname,'..','modules/vehicle/vehicle-service-sot.js'),'utf8'),/VehicleScopedSOT/);
});

console.log('S2154-S2159 SOT consolidation regression: 4/4 PASS');
