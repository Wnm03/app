const fs=require('fs'),vm=require('vm'),assert=require('assert');
function load(opts={}){const ctx={console,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},setTimeout:()=>{},...opts};vm.createContext(ctx);vm.runInContext(fs.readFileSync('modules/finance/finance-event-outbox.js','utf8'),ctx);return ctx;}
(async()=>{
 let pass=0,total=0;
 async function t(name,fn){total++;try{await fn();pass++;console.log('PASS',name)}catch(e){console.error('FAIL',name,e);process.exitCode=1;}}
 await t('replay and persistence share one durable critical section',async()=>{
   const writes=[]; let releaseReplay;
   const gate=new Promise(r=>releaseReplay=r);
   const x=load({IDBStore:{get:async()=>[{id:'e1',eventId:'e1',type:'finance.updated',payload:{id:1},seq:1,createdAt:1}],set:async(k,v)=>{writes.push(JSON.parse(JSON.stringify(v)));return true}},AIBus:{emit:()=>{},emitAsync:async()=>gate}});
   const replay=x.FinanceEventOutbox.replay();
   await Promise.resolve(); await Promise.resolve();
   let persistRan=false;
   const persist=x.FinanceEventOutbox.withPersistenceLock(async()=>{persistRan=true;await x.IDBStore.set('kw_finance_event_outbox_v1',[{id:'e2',eventId:'e2',type:'finance.updated',payload:{id:2},seq:2,createdAt:2}]);});
   await new Promise(r=>setTimeout(r,0));
   assert.strictEqual(persistRan,false);
   releaseReplay();
   assert.strictEqual(await replay,true);
   await persist;
   assert.strictEqual(persistRan,true);
   assert.deepStrictEqual(writes[writes.length-1].map(x=>x.id),['e2']);
 });
 await t('a persistence critical section blocks replay until its IDB write finishes',async()=>{
   let releasePersist;const gate=new Promise(r=>releasePersist=r);let replayEmit=0;
   const x=load({IDBStore:{get:async()=>[],set:async()=>{await gate;return true}},AIBus:{emit:()=>{},emitAsync:async()=>{replayEmit++}}});
   const persist=x.FinanceEventOutbox.withPersistenceLock(async()=>{await x.IDBStore.set('kw_finance_event_outbox_v1',[]);});
   const replay=x.FinanceEventOutbox.replay();
   await Promise.resolve(); await Promise.resolve();
   assert.strictEqual(replayEmit,0);
   releasePersist();
   await persist; await replay;
   assert.strictEqual(replayEmit,0);
 });
 await t('stable event order remains FIFO after serialized replay/persistence operations',async()=>{
   const seen=[];let store=[1,2,3].map((id,i)=>({id:'e'+id,eventId:'e'+id,type:'finance.updated',payload:{id},seq:i+1,createdAt:i+1}));
   const x=load({IDBStore:{get:async()=>store,set:async(k,v)=>{store=JSON.parse(JSON.stringify(v));return true}},AIBus:{emit:()=>{},emitAsync:async(t,p)=>seen.push(p.id)}});
   store=[1,2,3].map((id,i)=>({id:'e'+id,eventId:'e'+id,type:'finance.updated',payload:{id},seq:i+1,createdAt:i+1}));
   assert.strictEqual(await x.FinanceEventOutbox.replay(),true);
   assert.deepStrictEqual(seen,[1,2,3]);assert.deepStrictEqual(store,[]);
 });
 console.log(`${pass}/${total} PASS`);if(pass!==total)process.exitCode=1;
})();
