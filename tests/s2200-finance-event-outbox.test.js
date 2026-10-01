'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
function load(files,extra={}){
  const store={}; const timers=[];
  const ctx={console,Date,Math,JSON,setTimeout:(fn)=>{timers.push(fn);return timers.length;},clearTimeout(){},localStorage:{getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}} ,...extra};
  ctx.globalThis=ctx; ctx.window=ctx;
  vm.createContext(ctx); files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f}));
  return {ctx,store,timers};
}
function test(name,fn){try{fn();console.log('PASS',name);return true;}catch(e){console.error('FAIL',name,e);return false;}}
let pass=0,total=0;
let x=load(['modules/finance/finance-event-outbox.js']);
total++;if(test('enqueue survives reload',()=>{assert(x.ctx.FinanceEventOutbox.enqueue('finance.updated',{id:1}));assert.equal(x.ctx.FinanceEventOutbox.pending().length,1);let y=load(['modules/finance/finance-event-outbox.js'],{localStorage:x.ctx.localStorage});assert.equal(y.ctx.FinanceEventOutbox.pending().length,1);pass++;})){}

total++;if(test('replay emits and clears only successful delivery',()=>{const seen=[];x=load(['modules/finance/finance-event-outbox.js']);x.ctx.FinanceEventOutbox.enqueue('finance.updated',{id:2});x.ctx.AIBus={emit:(t,p)=>seen.push([t,p])};assert(x.ctx.FinanceEventOutbox.replay());assert.equal(seen.length,1);assert.equal(x.ctx.FinanceEventOutbox.pending().length,0);pass++;})){}

total++;if(test('failed listener remains durable',()=>{x=load(['modules/finance/finance-event-outbox.js']);x.ctx.FinanceEventOutbox.enqueue('finance.updated',{id:3});x.ctx.AIBus={emit:()=>{throw new Error('boom')}};assert.equal(x.ctx.FinanceEventOutbox.replay(),false);assert.equal(x.ctx.FinanceEventOutbox.pending().length,1);pass++;})){}

total++;if(test('atomic commit persists deferred event before delivery',()=>{x=load(['modules/finance/finance-event-outbox.js','modules/finance/finance-cross-entity-atomic.js'],{D:{transactions:[]},AIBus:{emit:()=>{throw new Error('listener failure')}}});const tx=x.ctx.FinanceCrossEntityAtomic.begin(['transactions']);tx.emit('finance.updated',{id:4});tx.commit();assert.equal(x.ctx.FinanceEventOutbox.pending().length,1);let y=load(['modules/finance/finance-event-outbox.js'],{localStorage:x.ctx.localStorage,AIBus:{emit:()=>{}}});assert(y.ctx.FinanceEventOutbox.replay());assert.equal(y.ctx.FinanceEventOutbox.pending().length,0);pass++;})){}
console.log(`${pass}/${total} PASS`);if(pass!==total)process.exit(1);
