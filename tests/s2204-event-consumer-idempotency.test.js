'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadBus(){
  return loadSource(['modules/ai/ai-core.js'], { IDBStore:{get:async()=>null,set:async()=>{}}, computeCashflowForecast:()=>({}) }, ['AIBus']);
}

test('AIBus.emitAsync waits for async consumer and propagates rejection', async()=>{
  const x=loadBus(); let done=false;
  x.AIBus.on('x', async()=>{await new Promise(r=>setTimeout(r,5));done=true;});
  await x.AIBus.emitAsync('x',{a:1},{eventId:'e1'});
  assert.equal(done,true);
  x.AIBus.on('bad', async()=>{throw new Error('consumer failed');});
  await assert.rejects(()=>x.AIBus.emitAsync('bad',{}, {eventId:'e2'}),/consumer failed/);
});

test('FinanceEventOutbox keeps event when async consumer rejects', async()=>{
  const localStorage={_d:{},getItem(k){return this._d[k]??null;},setItem(k,v){this._d[k]=v;},removeItem(k){delete this._d[k];}};
  const x=loadSource(['modules/finance/finance-event-outbox.js'], {localStorage,AIBus:{emit:()=>{},emitAsync:async()=>{throw new Error('async fail');}},IDBStore:{get:async()=>null,set:async()=>{}}}, ['FinanceEventOutbox']);
  x.FinanceEventOutbox.enqueue('finance.updated',{id:7});
  assert.equal(await x.FinanceEventOutbox.replay(),false);
  assert.equal(x.FinanceEventOutbox.pending().length,1);
});

test('AIService returns the decision promise and forwards event metadata', async()=>{
  const calls=[];
  const AIBus={_h:{},on(e,h){(this._h[e]??=[]).push(h);return()=>{};},emit(e,p,m){return Promise.all((this._h[e]||[]).map(h=>h(p,m)));}};
  const AIDecision={decide:async ctx=>{calls.push(ctx);await new Promise(r=>setTimeout(r,2));return {decisions:[]};}};
  const x=loadSource(['modules/ai/ai-service.js'],{AIBus,AIDecision},['AIService']);
  x.AIService.wireEvents();
  const meta={eventId:'evt-22',source:'finance-event-outbox'};
  await AIBus.emit('finance.updated',{kind:'test'},meta);
  assert.equal(calls.length,1); assert.equal(calls[0].eventMeta.eventId,'evt-22');
});

test('AIDecision deduplicates the same durable eventId after persistence', async()=>{
  let store={decisionLog:[],recommendations:[],learningData:{},ruleCooldowns:{},processedEventIds:[]}; let saves=0;
  const AIBus={emit(){}};
  const x=loadSource(['modules/ai/ai-decision-engine.js'],{
    aiEnsureLoaded:async()=>{}, aiGetStore:()=>store, aiSave:async()=>{saves++;}, AIBus
  },['AIDecision']);
  x.AIDecision.rules.register({id:'r2204',category:'test',condition:()=>true,action:()=>({message:'m'}),severity:'info',weight:5,cooldownHours:0});
  const a=await x.AIDecision.decide({event:'finance.updated',payload:{},eventMeta:{eventId:'evt-dup'}});
  const b=await x.AIDecision.decide({event:'finance.updated',payload:{},eventMeta:{eventId:'evt-dup'}});
  assert.equal(a.decisions.length,1); assert.equal(b.duplicate,true); assert.equal(b.decisions.length,1); assert.equal(store.decisionLog.length,1); assert.equal(saves,1);
});
