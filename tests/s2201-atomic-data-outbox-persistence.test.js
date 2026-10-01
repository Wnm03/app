'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
function load(files,extra={}){
  const ctx={console,Date,Math,JSON,setTimeout:(fn)=>{fn();return 1;},clearTimeout(){},...extra};
  ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f}));
  return ctx;
}
let pass=0,total=0;
function t(name,fn){total++;try{fn();console.log('PASS',name);pass++;}catch(e){console.error('FAIL',name,e);}}

// IDBStore.setMany must submit all keys through one readwrite transaction.
t('setMany uses one readwrite transaction for mirror + outbox',async()=>{
  const calls=[]; let completed=0;
  const db={transaction:(store,mode)=>{calls.push({store,mode});const os={put(){}};const tx={objectStore:()=>os,oncomplete:null,onerror:null,onabort:null};setTimeout(()=>{completed++;if(tx.oncomplete)tx.oncomplete();},0);return tx;}};
  const fake={_open:async()=>db,_withRetry:async(fn)=>fn(),STORE:'kv'};
  const ctx=load(['modules/asset/aset-misc.js'],{indexedDB:{open(){throw new Error('unused');}},ALOKASI_PRESETS:{},AlokasiAset:{},AssetInsight:{},Aset:{},Penyusutan:{},PajakAset:{},LaporanAset:{},PORTFOLIO_LABELS:{},TimelineW:{}});
  // Avoid opening real IndexedDB; replace only the internal methods while preserving setMany implementation.
  ctx.IDBStore._dbPromise=Promise.resolve(db);
  const ok=await ctx.IDBStore.setMany([['kw_v4_mirror','snapshot'],['kw_finance_event_outbox_v1',[{id:'e1',type:'finance.updated'}]]]);
  assert.strictEqual(ok,true);assert.strictEqual(calls.length,1);assert.strictEqual(calls[0].mode,'readwrite');assert.strictEqual(completed,1);
});

t('atomic outbox staging is not durable before persistence',()=>{
  const idb={get:async()=>[],set:async()=>true,setMany:async()=>true};
  const ctx=load(['modules/finance/finance-event-outbox.js'],{IDBStore:idb});
  ctx.FinanceEventOutbox.stageBatch([['finance.updated',{id:10}]]);
  assert.strictEqual(ctx.FinanceEventOutbox.hasStaged(),true);
  assert.strictEqual(idb._written,undefined);
});

t('successful atomic persistence clears staged events only after batch succeeds',async()=>{
  let stored;
  const idb={get:async()=>[],set:async()=>true,setMany:async(entries)=>{stored=entries;return true;}};
  const ctx=load(['modules/finance/finance-event-outbox.js'],{IDBStore:idb});
  ctx.FinanceEventOutbox.stageBatch([['finance.updated',{id:11}]]);
  const prepared=await ctx.FinanceEventOutbox.prepareAtomicPersistence();
  assert.strictEqual(prepared.stagedCount,1);
  assert.strictEqual(ctx.FinanceEventOutbox.hasStaged(),true);
  assert(stored===undefined);
  const ok=await idb.setMany([['kw_v4_mirror','snap'],[ctx.FinanceEventOutbox.key,prepared.queue]]);
  assert.strictEqual(ok,true);
  ctx.FinanceEventOutbox.markAtomicPersisted(prepared.queue,prepared.stagedCount);
  assert.strictEqual(ctx.FinanceEventOutbox.hasStaged(),false);
  assert.strictEqual(prepared.queue.length,1);
});

t('failed batch leaves staged event pending for retry',async()=>{
  const idb={get:async()=>[],set:async()=>true,setMany:async()=>{throw new Error('abort');}};
  const ctx=load(['modules/finance/finance-event-outbox.js'],{IDBStore:idb});
  ctx.FinanceEventOutbox.stageBatch([['finance.updated',{id:12}]]);
  const prepared=await ctx.FinanceEventOutbox.prepareAtomicPersistence();
  let failed=false;try{await idb.setMany([['kw_v4_mirror','snap'],[ctx.FinanceEventOutbox.key,prepared.queue]]);}catch(e){failed=true;}
  assert.strictEqual(failed,true);assert.strictEqual(ctx.FinanceEventOutbox.hasStaged(),true);assert.strictEqual(ctx.FinanceEventOutbox.pending().length,1);
});

Promise.resolve().then(()=>{console.log(`${pass}/${total} PASS`);if(pass!==total)process.exit(1);});
