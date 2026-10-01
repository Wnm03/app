'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
function load(extra={},files=['modules/finance/finance-event-outbox.js']){
  const ctx={console,Date,Math,JSON,setTimeout:()=>1,clearTimeout(){},...extra};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f}));return ctx;
}
let pass=0,total=0;
async function t(name,fn){total++;try{await fn();console.log('PASS',name);pass++;}catch(e){console.error('FAIL',name,e);}}
(async()=>{
  const store={}; const ls={}; const localStorage={getItem:k=>Object.prototype.hasOwnProperty.call(ls,k)?ls[k]:null,setItem:(k,v)=>{ls[k]=String(v);},removeItem:k=>{delete ls[k];}}; const idb={get:async()=>store.q||[],set:async(k,v)=>{store.q=v;return true;}};
  let ctx=load({IDBStore:idb,localStorage});
  ctx.FinanceEventOutbox.enqueue('finance.updated',{id:1});
  ctx.FinanceEventOutbox.enqueue('finance.updated',{id:2});
  await t('recovery preserves FIFO order',async()=>{
    const seen=[];ctx.AIBus={emit:(type,p)=>seen.push(p.id)};assert.strictEqual(await ctx.FinanceEventOutbox.replay(),true);assert.deepStrictEqual(seen,[1,2]);
  });
  Object.keys(ls).forEach(k=>delete ls[k]);
  store.q=[{id:'a',type:'finance.updated',payload:{id:'a'},createdAt:1,seq:1},{id:'b',type:'finance.updated',payload:{id:'b'},createdAt:2,seq:2},{id:'c',type:'finance.updated',payload:{id:'c'},createdAt:3,seq:3}];
  ctx=load({IDBStore:idb,localStorage});let seen=[];let calls=0;ctx.AIBus={emit:(type,p)=>{calls++;seen.push(p.id);if(p.id==='b')throw new Error('head failed');}};
  await t('failed head blocks later events',async()=>{assert.strictEqual(await ctx.FinanceEventOutbox.replay(),false);assert.deepStrictEqual(seen,['a','b']);assert.deepStrictEqual(ctx.FinanceEventOutbox.pending().map(x=>x.payload.id),['b','c']);});
  seen=[];
  await t('reload retry resumes at failed head',async()=>{const retry=load({IDBStore:idb,localStorage});retry.AIBus={emit:(type,p)=>seen.push(p.id)};assert.strictEqual(await retry.FinanceEventOutbox.replay(),true);assert.deepStrictEqual(seen,['b','c']);assert.strictEqual(retry.FinanceEventOutbox.pending().length,0);});
  await t('legacy and IDB queues merge without dropping events',async()=>{
    const ls={q:JSON.stringify([{id:'l1',type:'finance.updated',payload:{id:'l1'},createdAt:10,seq:10}])};
    const legacyCtx=load({IDBStore:{get:async()=>[{id:'d1',type:'finance.updated',payload:{id:'d1'},createdAt:9,seq:9}],set:async()=>true},localStorage:{getItem:()=>ls.q,setItem:(k,v)=>{ls.q=v},removeItem(){}}});
    const merged=await legacyCtx.FinanceEventOutbox.prepareAtomicPersistence(); assert.strictEqual(JSON.stringify(merged.queue.map(x=>x.id)),JSON.stringify(['d1','l1']));
  });
  await t('atomic commit stages event without pre-durable delivery',async()=>{
    const seen=[]; const c=load({D:{transactions:[]},AIBus:{emit:(type,p)=>seen.push(p.id)},IDBStore:{get:async()=>[],set:async()=>true}},['modules/finance/finance-event-outbox.js','modules/finance/finance-cross-entity-atomic.js']);
    const tx=c.FinanceCrossEntityAtomic.begin(['transactions']); tx.emit('finance.updated',{id:99}); tx.commit();
    assert.strictEqual(seen.length,0); assert.strictEqual(c.FinanceEventOutbox.hasStaged(),true);
  });
  console.log(`${pass}/${total} PASS`);if(pass!==total)process.exit(1);
})();
