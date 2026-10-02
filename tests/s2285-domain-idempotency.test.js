'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function makeCtx(){
  let store;
  let setCalls=0;
  const idb={
    async get(){await new Promise(r=>setTimeout(r,5));return store;},
    async set(key,value){setCalls++;await new Promise(r=>setTimeout(r,5));store=value;return true;}
  };
  const ctx=loadSource(['modules/vehicle/vehicle-catalog.js'],{
    uid:(()=>{let n=0;return ()=>`scan-${++n}`;})(),
    sameId:(a,b)=>String(a)===String(b),
    IDBStore:idb,
  },['VehicleCatalog','VEHICLE_CATALOG_STORE_KEY']);
  return {ctx,getSetCalls:()=>setCalls};
}

test('S2285 domain idempotency — two concurrent handleScan calls for one code create one draft',async()=>{
  const {ctx}=makeCtx();
  const [a,b]=await Promise.all([ctx.VehicleCatalog.handleScan('8990001112223'),ctx.VehicleCatalog.handleScan('8990001112223')]);
  assert.equal(a.item.id,b.item.id);
  assert.equal(a.item.barcode,'8990001112223');
  assert.equal(b.item.barcode,'8990001112223');
  const all=await ctx.VehicleCatalog.getAll();
  assert.equal(all.length,1);
  assert.equal(all[0].isDraft,true);
});

test('S2285 domain idempotency — OCR and direct scan sharing one code converge on one draft',async()=>{
  const {ctx}=makeCtx();
  const [a,b]=await Promise.all([
    ctx.VehicleCatalog.handleScan('AB-12345'),
    ctx.VehicleCatalog.handleOcrLabel('label AB-12345')
  ]);
  assert.equal(a.item.id,b.item.id);
  const all=await ctx.VehicleCatalog.getAll();
  assert.equal(all.length,1);
  assert.equal(all[0].barcode,'AB-12345');
});

test('S2285 domain idempotency — failed creation releases the key so a later call can retry',async()=>{
  let calls=0;
  const ctx=loadSource(['modules/vehicle/vehicle-catalog.js'],{
    uid:()=>`x-${++calls}`,
    sameId:(a,b)=>String(a)===String(b),
    IDBStore:{
      async get(){return undefined;},
      async set(){calls++; if(calls===2) throw new Error('simulated write failure'); return true;}
    }
  },['VehicleCatalog','VEHICLE_CATALOG_STORE_KEY']);
  await assert.rejects(()=>ctx.VehicleCatalog.handleScan('FAIL-1'));
  // The domain promise must not remain stuck after a failed write.
  const retry=await ctx.VehicleCatalog.handleScan('FAIL-1');
  assert.equal(retry.found,true);
  assert.ok(retry.item);
});
