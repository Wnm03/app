'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('node:assert/strict');
const path=require('path');
const adapter=fs.readFileSync(path.join(__dirname,'../modules/vehicle/service-event-adapter.js'),'utf8');
const lifecycle=fs.readFileSync(path.join(__dirname,'../modules/vehicle/service-event-lifecycle.js'),'utf8');

function makeCtx(){
  const store=new Map();
  let failNextPersist=false;
  let aiDeliveries=0;
  const processed=new Set();
  const decisions=[];
  const ctx={
    console, setTimeout, clearTimeout,
    queueMicrotask:fn=>{},
    window:null,
    D:{servisLogs:[]},
    ServiceEventSOT:{normalize(s){return {ok:true,changed:false,record:s};}},
    save(){},
    localStorage:{
      getItem(k){return store.has(k)?store.get(k):null;},
      setItem(k,v){if(failNextPersist){failNextPersist=false;throw new Error('SIMULATED_CRASH_WINDOW');}store.set(k,String(v));},
      removeItem(k){store.delete(k);}
    },
    AIBus:{
      _listeners:Object.create(null),
      on(name,fn){(this._listeners[name]||(this._listeners[name]=[])).push(fn);return()=>{};},
      emit(name,payload,meta){for(const fn of (this._listeners[name]||[]).slice())fn(payload,meta);},
      async emitAsync(name,payload,meta){for(const fn of (this._listeners[name]||[]).slice())await fn(payload,meta);}
    },
    VehicleCatalogServisLink:{attachToServis(){return true;}},
      
  };
  ctx.window=ctx;
  ctx.AIBus.on('vehicle.updated',async(payload,meta)=>{
    aiDeliveries++;
    const id=meta&&meta.eventId;
    if(id&&processed.has(id)){return {duplicate:true};}
    if(id)processed.add(id);
    decisions.push({eventId:id||null,action:payload.action,kind:payload.kind});
    return true;
  });
  vm.createContext(ctx);
  vm.runInContext(lifecycle,ctx,{filename:'service-event-lifecycle.js'});
  vm.runInContext(adapter,ctx,{filename:'service-event-adapter.js'});
  return {ctx,store,setCrash:()=>{failNextPersist=true;},get aiDeliveries(){return aiDeliveries;},decisions,processed};
}

async function main(){
  let pass=0,total=0;
  const check=(name,fn)=>{total++;try{fn();console.log('PASS',name);pass++;}catch(e){console.log('FAIL',name,e.message);}};
  const checkAsync=async(name,fn)=>{total++;try{await fn();console.log('PASS',name);pass++;}catch(e){console.log('FAIL',name,e.message);}};

  const a=makeCtx();
  const evt={type:'service.create',eventId:'svc-crash-001',payload:{id:'svc-1',vehicleId:'veh-1',txLinkId:'tx-1',action:'create'}};
  check('stable event identity survives enqueue',()=>{assert.equal(a.ctx.ServiceEventOutbox.enqueue(evt),true);assert.equal(a.ctx.ServiceEventOutbox.pending().length,1);assert.equal(a.ctx.ServiceEventOutbox.pending()[0].eventId,'svc-crash-001');});
  await checkAsync('crash window retains event after handler success',async()=>{a.setCrash();const n=await a.ctx.ServiceEventOutbox.flush();assert.equal(n,0);assert.equal(a.ctx.ServiceEventOutbox.pending().length,1);});
  await checkAsync('first replay delivers service→AI once with eventId',async()=>{const n=await a.ctx.ServiceEventOutbox.flush();assert.equal(n,1);assert.equal(a.aiDeliveries,2);assert.equal(a.decisions.length,1);assert.equal(a.decisions[0].eventId,'svc-crash-001');});
  check('second replay is empty and cannot duplicate domain delivery',()=>{assert.equal(a.ctx.ServiceEventOutbox.pending().length,0);assert.equal(a.aiDeliveries,2);});

  const b=makeCtx();
  b.ctx.AIBus.on('finance.updated',async(payload,meta)=>{assert.equal(meta.eventId,'fin-crash-001');return true;});
  check('finance event retains identity',()=>{assert.equal(b.ctx.ServiceEventOutbox.enqueue({type:'finance.updated',eventId:'fin-crash-001',payload:{kind:'servis',action:'create',txId:'tx-1'}}),true);});
  await checkAsync('finance replay awaits async consumer before clearing',async()=>{const n=await b.ctx.ServiceEventOutbox.flush();assert.equal(n,1);assert.equal(b.ctx.ServiceEventOutbox.pending().length,0);});

  const c=makeCtx();
  c.ctx.AIBus.on('vehicle.updated',async()=>{throw new Error('consumer failure');});
  check('consumer failure is durable retryable',()=>{assert.equal(c.ctx.ServiceEventOutbox.enqueue({type:'vehicle.updated',eventId:'veh-crash-001',payload:{kind:'servis',action:'create',vehicleId:'veh-1'}}),true);});
  await checkAsync('async consumer failure keeps head event',async()=>{const n=await c.ctx.ServiceEventOutbox.flush();assert.equal(n,0);assert.equal(c.ctx.ServiceEventOutbox.pending().length,1);assert.match(c.ctx.ServiceEventOutbox.pending()[0].lastError,/consumer failure/);});

  console.log(`S2295: ${pass}/${total} PASS`);
  if(pass!==total)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
