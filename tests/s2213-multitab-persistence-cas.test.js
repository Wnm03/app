'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');

function loadIdb(){
  const state=new Map();
  const db={transaction:(store,mode)=>{
    assert.strictEqual(store,'kv');assert.strictEqual(mode,'readwrite');
    const tx={oncomplete:null,onerror:null,onabort:null};
    let pendingComplete=false;
    const os={
      get(key){const req={result:state.get(key),onsuccess:null,onerror:null};queueMicrotask(()=>{if(req.onsuccess)req.onsuccess();});return req;},
      put(value,key){state.set(key,value);pendingComplete=true;}
    };
    tx.objectStore=()=>os;
    setTimeout(()=>{if(tx.oncomplete)tx.oncomplete();},0);
    return tx;
  }};
  const ctx={console,Date,Math,JSON,setTimeout:(fn)=>{fn();return 1;},clearTimeout(){},indexedDB:{open(){throw new Error('unused');}},ALOKASI_PRESETS:{},AlokasiAset:{},AssetInsight:{},Aset:{},Penyusutan:{},PajakAset:{},LaporanAset:{},PORTFOLIO_LABELS:{},TimelineW:{}};
  ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('modules/asset/aset-misc.js','utf8'),ctx,{filename:'modules/asset/aset-misc.js'});
  ctx.IDBStore._dbPromise=Promise.resolve(db);
  return {ctx,state};
}

let pass=0,total=0;
async function t(name,fn){total++;try{await fn();pass++;console.log('PASS',name);}catch(e){console.error('FAIL',name,e);process.exitCode=1;}}

(async()=>{
 await t('CAS accepts first writer and rejects stale second writer',async()=>{
   const {ctx,state}=loadIdb();
   assert.strictEqual(await ctx.IDBStore.setManyIfCurrent([['kw_v4_mirror','A']], 'kw_v4_writer_guard_v1', null, 'token-A'),true);
   assert.strictEqual(state.get('kw_v4_writer_guard_v1'),'token-A');
   assert.strictEqual(await ctx.IDBStore.setManyIfCurrent([['kw_v4_mirror','B']], 'kw_v4_writer_guard_v1', null, 'token-B'),false);
   assert.strictEqual(state.get('kw_v4_mirror'),'A');
   assert.strictEqual(state.get('kw_v4_writer_guard_v1'),'token-A');
 });
 await t('CAS allows the current writer to continue after its token advances',async()=>{
   const {ctx,state}=loadIdb();
   assert.strictEqual(await ctx.IDBStore.setManyIfCurrent([['kw_v4_mirror','A']], 'kw_v4_writer_guard_v1', null, 'token-A'),true);
   assert.strictEqual(await ctx.IDBStore.setManyIfCurrent([['kw_v4_mirror','B'],['kw_finance_event_outbox_v1',[{id:'e1'}]]], 'kw_v4_writer_guard_v1', 'token-A', 'token-B'),true);
   assert.strictEqual(state.get('kw_v4_mirror'),'B');
   assert.deepStrictEqual(state.get('kw_finance_event_outbox_v1'),[{id:'e1'}]);
   assert.strictEqual(state.get('kw_v4_writer_guard_v1'),'token-B');
 });
 await t('save path uses the same CAS guard and marks a conflict stale',async()=>{
   const src=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');
   assert(src.includes("const _crossTabWriterGuardKey='kw_v4_writer_guard_v1';"));
   assert(src.includes('IDBStore.setManyIfCurrent(entries,_crossTabWriterGuardKey,_crossTabWriterToken,nextWriterToken)'));
   assert(src.includes("if(!ok){_markCrossTabStale();throw new Error('Cross-tab persistence conflict: snapshot dibuat dari writer token lama');}"));
 });

 await t('outbox replay cannot clear a journal changed by another writer',async()=>{
   const src=fs.readFileSync('modules/finance/finance-event-outbox.js','utf8');
   assert(src.includes("const WRITER_GUARD_KEY='kw_v4_writer_guard_v1';"));
   assert(src.includes('setManyIfCurrent([[KEY,[]]],WRITER_GUARD_KEY,writerToken,writerToken)'));
   assert(src.includes('setManyIfCurrent([[KEY,durableCache]],WRITER_GUARD_KEY,writerToken,writerToken)'));
 });
 await t('writer token is part of the same atomic persistence boundary',async()=>{
   const src=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');
   const start=src.indexOf("const entries=[['kw_v4_mirror',json]];");
   const end=src.indexOf("_markSavePersistMeta('idb',stamp);_announcePersistenceWrite();",start);
   const block=src.slice(start,end);
   assert(block.includes('setManyIfCurrent'));
   assert(block.includes('nextWriterToken'));
   assert(!block.includes('IDBStore.setMany(entries)'));
 });
 console.log(`${pass}/${total} PASS`);if(pass!==total)process.exit(1);
})();
