'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync('modules/vehicle/service-event-adapter.js','utf8');
function makeCtx(){
  let store={};
  const localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
  const window={};
  const ctx={console,Date,Math,JSON,Number,String,Boolean,Array,Object,RegExp,Map,Set,queueMicrotask:()=>{},localStorage,window,module:{exports:{}}};
  vm.createContext(ctx); vm.runInContext(src,ctx); return {ctx,localStorage};
}
const {ctx}=makeCtx();
const out=ctx.module.exports.ServiceEventOutbox;
out.clear();
assert.strictEqual(out.enqueue({type:'vehicle.updated',payload:{id:'v1',vehicleId:'v1',action:'update',kind:'vehicle'}}),true);
assert.strictEqual(out.enqueue({type:'vehicle.updated',payload:{id:'v1',vehicleId:'v1',action:'delete',kind:'vehicle'}}),true,'different vehicle actions must not dedupe');
assert.strictEqual(out.pending().length,2);
assert.strictEqual(out.enqueue({type:'vehicle.updated',payload:{id:'v1',vehicleId:'v1',action:'delete',kind:'vehicle'}}),false,'exact duplicate should still dedupe');
assert.strictEqual(out.pending().length,2);
console.log('SA19 outbox vehicle action-aware dedupe: 3/3 PASS');
