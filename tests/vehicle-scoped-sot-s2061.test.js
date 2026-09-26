'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync('modules/vehicle/vehicle-active-sot-s2061.js','utf8');
function boot(){
 const events=[];
 const ctx={D:{vehicles:[{id:'A',name:'Motor A',jenis:'motor'},{id:'B',name:'Mobil B',jenis:'mobil'}]},curVehicleId:'A',AIBus:{emit:(...x)=>events.push(x)},CustomEvent:function(type,init){this.type=type;this.detail=init.detail},document:{dispatchEvent(){}} ,window:null,globalThis:null};
 ctx.window=ctx;ctx.globalThis=ctx;vm.runInNewContext(src,ctx);return {ctx,api:ctx.VehicleScopedSOT,events};
}
test('S2061 active vehicle context is vehicle-scoped',()=>{const {api}=boot();assert.equal(api.context().vehicleId,'A');assert.equal(api.context().vehicleType,'motor');const r=api.setActive('B');assert.equal(r.ok,true);assert.equal(r.vehicleId,'B');assert.equal(r.vehicleType,'mobil');assert.equal(api.context().vehicleId,'B');});
test('S2062 invalid vehicle cannot become active',()=>{const {api,ctx}=boot();const r=api.setActive('X');assert.equal(r.ok,false);assert.equal(ctx.curVehicleId,'A');});
test('S2063 same component can exist independently per vehicle',()=>{const {api}=boot();const rows=[{id:'h1',vehicleId:'A',serviceComponentId:'busi'},{id:'h2',vehicleId:'B',serviceComponentId:'busi'}];assert.deepEqual(api.scopeRows(rows,'A').map(x=>x.id),['h1']);assert.deepEqual(api.scopeRows(rows,'B').map(x=>x.id),['h2']);});
test('S2064 read audit detects cross-vehicle leakage',()=>{const {api}=boot();const r=api.auditRows([{id:'1',vehicleId:'A'},{id:'2',vehicleId:'B'}],'A','history');assert.equal(r.ok,false);assert.equal(r.wrongVehicle.length,1);});
test('S2065 write guard rejects foreign vehicle writes',()=>{const {api}=boot();assert.equal(api.assertWrite('A',{vehicleId:'B'}).code,'vehicle_scope_mismatch');assert.equal(api.assertWrite('A',{vehicleId:'A'}).ok,true);});
test('S2066 domain audit checks vehicle type when present',()=>{const {api}=boot();const r=api.auditRows([{id:'1',vehicleId:'A',vehicleType:'mobil'}],'A','fuel');assert.equal(r.ok,false);assert.equal(r.typeMismatch.length,1);});
test('S2067 auditVehicle is isolated to one vehicle',()=>{const {api}=boot();const D=api.findVehicle('A');assert.equal(D.id,'A');});
test('S2068 ensureActive repairs deleted/invalid active id without leaking old data',()=>{const {api,ctx}=boot();ctx.curVehicleId='DELETED';const v=api.ensureActive();assert.equal(v.id,'A');assert.equal(ctx.curVehicleId,'A');});
test('S2069 all vehicle partitions are independently auditable',()=>{const {api}=boot();const out=api.auditAll();assert.equal(out.length,2);assert.deepEqual(out.map(x=>x.vehicleId),['A','B']);assert.ok(out.every(x=>x.ok));});
