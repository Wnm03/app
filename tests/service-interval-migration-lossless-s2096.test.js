'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function load(){
 const D={
  vehicles:[{id:'v1',name:'Unknown',serviceIntervalKm:1234,oliTransmisiIntervalKm:20000,intervalOverrides:{unknown:'x'}}],
  sparepartCats:[],servisLogs:[{id:'h1',vehicleId:'v1',intervalKmAtService:1500,nextDueKm:3000}]
 };
 const ctx={console,Date,Math,Number,String,Array,Object,Map,Set,JSON,RegExp,Promise,parseFloat,parseInt,isFinite,Infinity,NaN,D};
 ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
 for(const f of ['modules/vehicle/service-master-data.generated.js','modules/vehicle/servis-checklist.js','modules/vehicle/service-input-catalog.js','modules/vehicle/vehicle-car-notes-sot-s2071.js','modules/vehicle/vehicle-service-sot.js','modules/vehicle/service-interval-sot.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
 return ctx;
}
test('S2096 migration keeps unmapped legacy interval fields instead of deleting user data',()=>{
 const c=load(),v=c.D.vehicles[0];
 assert.equal(v.serviceIntervalKm,undefined);
 assert.equal(v.oliTransmisiIntervalKm,20000);
 assert.deepEqual(v.intervalOverrides,{unknown:'x'});
 assert.equal(v.sot.serviceIntervals['oli-mesin'].intervalKm,1234);
});
test('S2096 historical service snapshots remain unchanged',()=>{
 const c=load(),h=c.D.servisLogs[0];
 assert.equal(h.intervalKmAtService,1500);
 assert.equal(h.nextDueKm,3000);
});
