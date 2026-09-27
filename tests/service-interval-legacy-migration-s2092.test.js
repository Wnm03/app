'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function load(){
  const D={
    vehicles:[
      {id:'v1',name:'Vario 125',serviceIntervalKm:1500,intervalOverrides:{catOil:1200},oliTransmisiIntervalKm:20000},
      {id:'v2',name:'Vario 110',serviceIntervalKm:3000,intervalOverrides:{}}
    ],
    sparepartCats:[
      {id:'catOil',name:'Oli Mesin',serviceComponentId:'oli-mesin',masterCategoryId:'servis-mesin',intervalKm:1500,vehicleId:'v1'},
      {id:'catBusi',name:'Busi',serviceComponentId:'busi',masterCategoryId:'servis-mesin',intervalKm:8000,vehicleId:'v2'}
    ],servisLogs:[
      {id:'h1',vehicleId:'v1',serviceComponentId:'oli-mesin',km:18554,intervalKmAtService:1500,nextDueKm:20054}
    ]
  };
  const ctx={console,Date,Math,Number,String,Array,Object,Map,Set,JSON,RegExp,Promise,parseFloat,parseInt,isFinite,Infinity,NaN,D};
  ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
  for(const f of ['modules/vehicle/service-master-data.generated.js','modules/vehicle/servis-checklist.js','modules/vehicle/service-input-catalog.js','modules/vehicle/vehicle-car-notes-sot-s2071.js','modules/vehicle/vehicle-service-sot.js','modules/vehicle/service-interval-sot.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
  return ctx;
}

test('S2092 migrates legacy vehicle/category interval stores into one active SOT',()=>{
  const c=load();
  const v1=c.D.vehicles[0],v2=c.D.vehicles[1];
  const oil=v1.sot.serviceIntervals['oli-mesin'];
  const oil2=v2.sot.serviceIntervals['oli-mesin'];
  assert.equal(oil.intervalKm,1200);
  assert.equal(oil.source,'manual');
  assert.equal(oil2.intervalKm,3000);
  assert.equal(oil2.source,'manual');
  assert.equal(v1.serviceIntervalKm,undefined);
  assert.equal(v1.intervalOverrides,undefined);
  assert.equal(v1.oliTransmisiIntervalKm,undefined);
});

test('S2092 migration does not rewrite historical interval snapshots',()=>{
  const c=load();
  const h=c.D.servisLogs[0];
  assert.equal(h.intervalKmAtService,1500);
  assert.equal(h.nextDueKm,20054);
});

test('S2092 audit reports zero legacy runtime interval stores after migration',()=>{
  const c=load();
  const a=c.ServiceIntervalSOT.auditLegacy();
  assert.equal(a.legacyCount,0);
});
