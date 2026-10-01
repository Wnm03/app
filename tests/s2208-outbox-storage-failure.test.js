const fs=require('fs');const vm=require('vm');const assert=require('assert');
function load(opts={}){const ctx={console,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},setTimeout:()=>{},...opts};vm.createContext(ctx);vm.runInContext(fs.readFileSync('modules/finance/finance-event-outbox.js','utf8'),ctx);return ctx;}
(async()=>{
 let pass=0,total=0;
 async function t(name,fn){total++;try{await fn();pass++;console.log('PASS',name)}catch(e){console.error('FAIL',name,e);process.exitCode=1;}}
 await t('durable read failure is not treated as empty journal',async()=>{const x=load({IDBStore:{get:async()=>{throw new Error('idb down')},set:async()=>true}});assert.strictEqual(await x.FinanceEventOutbox.prepareAtomicPersistence().then(()=>true,()=>false),false);});
 await t('staged atomic event remains staged when durable journal cannot be read',async()=>{const x=load({IDBStore:{get:async()=>{throw new Error('idb down')},set:async()=>true}});assert.strictEqual(x.FinanceEventOutbox.stageBatch([['finance.updated',{id:1}]]),true);assert.strictEqual(await x.FinanceEventOutbox.replay(),false);assert.strictEqual(x.FinanceEventOutbox.hasStaged(),true);});
 await t('durable journal is never replaced with empty queue after read failure',async()=>{let writes=[];const x=load({IDBStore:{get:async()=>{throw new Error('idb down')},set:async(k,v)=>{writes.push([k,v]);return true}}});x.FinanceEventOutbox.stageBatch([['finance.updated',{id:2}]]);let failed=false;try{await x.FinanceEventOutbox.prepareAtomicPersistence()}catch(_){failed=true}assert.strictEqual(failed,true);assert.strictEqual(writes.length,0);});
 await t('normal durable read remains compatible',async()=>{const x=load({IDBStore:{get:async()=>[],set:async()=>true}});assert.strictEqual((await x.FinanceEventOutbox.prepareAtomicPersistence()).queue.length,0);});
 console.log(`${pass}/${total} PASS`);if(pass!==total)process.exitCode=1;
})();
