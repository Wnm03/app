const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function loadServiceOutbox({durable=[],legacy=[]}={}){
  let store=JSON.parse(JSON.stringify(durable));
  const sandbox={
    console, module:{exports:{}}, exports:{},
    localStorage:{
      _v:legacy.length?JSON.stringify(legacy):null,
      getItem(){return this._v;},
      setItem(_k,v){this._v=v;},
      removeItem(){this._v=null;}
    },
    IDBStore:{
      async get(){return JSON.parse(JSON.stringify(store));},
      async set(_k,v){store=JSON.parse(JSON.stringify(v));return true;}
    }
  };
  vm.runInNewContext(fs.readFileSync('modules/vehicle/service-event-adapter.js','utf8'),sandbox,{filename:'service-event-adapter.js'});
  return {outbox:sandbox.module.exports.ServiceEventOutbox,getStore:()=>store};
}

test('S2477 service outbox prepare merges durable cross-tab queue',async()=>{
  const {outbox}=loadServiceOutbox({durable:[{key:'remote-1',eventId:'remote-1',type:'vehicle.updated',payload:{vehicleId:'v1'}}],legacy:[{key:'local-1',eventId:'local-1',type:'vehicle.updated',payload:{vehicleId:'v2'}}]});
  const snap=await outbox.prepareAtomicPersistence();
  assert.deepEqual(Array.from(snap.queue).map(x=>x.key).sort(),['local-1','remote-1']);
});

test('S2477 service outbox dedupes durable/local copies',async()=>{
  const event={key:'same',eventId:'same',type:'vehicle.updated',payload:{vehicleId:'v1'}};
  const {outbox}=loadServiceOutbox({durable:[event]});
  outbox.enqueue({...event});
  const snap=await outbox.prepareAtomicPersistence();
  assert.equal(snap.queue.length,1);
});
