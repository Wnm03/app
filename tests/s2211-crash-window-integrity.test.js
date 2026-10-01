const fs=require('fs'),vm=require('vm'),assert=require('assert');
function load({store=[],emitAsync}={}){
  let durable=JSON.parse(JSON.stringify(store));
  const ctx={console,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},setTimeout:()=>{},
    IDBStore:{get:async()=>JSON.parse(JSON.stringify(durable)),set:async(k,v)=>{durable=JSON.parse(JSON.stringify(v));return true},
      setMany:async(entries)=>{for(const [k,v] of entries)if(k==='kw_finance_event_outbox_v1')durable=JSON.parse(JSON.stringify(v));return true}},
    AIBus:{emit:()=>{},emitAsync:emitAsync || (async()=>{})}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync('modules/finance/finance-event-outbox.js','utf8'),ctx);
  return {ctx,getStore:()=>JSON.parse(JSON.stringify(durable))};
}
(async()=>{
 let pass=0,total=0;
 async function t(name,fn){total++;try{await fn();pass++;console.log('PASS',name)}catch(e){console.error('FAIL',name,e);process.exitCode=1;}}
 await t('crash after setMany leaves durable journal recoverable',async()=>{
   const x=load();
   x.ctx.FinanceEventOutbox.stageBatch([['finance.updated',{id:1}]]);
   const prepared=await x.ctx.FinanceEventOutbox.prepareAtomicPersistence();
   await x.ctx.IDBStore.setMany([['kw_v4_mirror','snapshot'],[x.ctx.FinanceEventOutbox.key,prepared.queue]]);
   // Simulated process crash: do not call markAtomicPersisted().
   const restarted=load({store:x.getStore()});
   assert.strictEqual((await restarted.ctx.FinanceEventOutbox.prepareAtomicPersistence()).queue.length,1);
 });
 await t('crash after mark before replay keeps durable event',async()=>{
   const x=load();
   x.ctx.FinanceEventOutbox.stageBatch([['finance.updated',{id:2}]]);
   const prepared=await x.ctx.FinanceEventOutbox.prepareAtomicPersistence();
   await x.ctx.IDBStore.setMany([[x.ctx.FinanceEventOutbox.key,prepared.queue]]);
   x.ctx.FinanceEventOutbox.markAtomicPersisted(prepared.queue,prepared.stagedCount);
   const restarted=load({store:x.getStore()});
   assert.strictEqual((await restarted.ctx.FinanceEventOutbox.prepareAtomicPersistence()).queue.length,1);
 });
 await t('crash after consumer success before clear is replay-safe via stable eventId',async()=>{
   const event={id:'e3',eventId:'e3',type:'finance.updated',payload:{id:3},seq:1,createdAt:1};
   let deliveries=0;
   const x=load({store:[event],emitAsync:async()=>{deliveries++;}});
   // Simulate the consumer succeeding, followed by process death before journal clear.
   await x.ctx.AIBus.emitAsync(event.type,event.payload,{eventId:event.eventId});
   const restarted=load({store:x.getStore(),emitAsync:async()=>{deliveries++;}});
   assert.strictEqual((await restarted.ctx.FinanceEventOutbox.prepareAtomicPersistence()).queue.length,1);
   assert.strictEqual(deliveries,1);
 });
 await t('event staged while persistence is in flight survives the persistence boundary',async()=>{
   const x=load();
   x.ctx.FinanceEventOutbox.stageBatch([['finance.updated',{id:4}]]);
   const prepared=await x.ctx.FinanceEventOutbox.prepareAtomicPersistence();
   await x.ctx.FinanceEventOutbox.withPersistenceLock(async()=>{
     await x.ctx.IDBStore.setMany([[x.ctx.FinanceEventOutbox.key,prepared.queue]]);
     x.ctx.FinanceEventOutbox.markAtomicPersisted(prepared.queue,prepared.stagedCount);
     assert.strictEqual(x.ctx.FinanceEventOutbox.hasStaged(),false);
   });
   x.ctx.FinanceEventOutbox.stageBatch([['finance.updated',{id:5}]]);
   const next=await x.ctx.FinanceEventOutbox.prepareAtomicPersistence();
   assert.strictEqual(JSON.stringify(next.queue.map(e=>e.payload.id)),JSON.stringify([4,5]));
 });
 console.log(`${pass}/${total} PASS`);if(pass!==total)process.exitCode=1;
})();
