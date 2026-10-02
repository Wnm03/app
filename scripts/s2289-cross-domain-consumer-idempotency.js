#!/usr/bin/env node
'use strict';
const fs=require('fs');
const assert=require('assert');
const root=process.cwd();
const ai=fs.readFileSync(root+'/modules/ai/ai-decision-engine.js','utf8');
const outbox=fs.readFileSync(root+'/modules/finance/finance-event-outbox.js','utf8');
const aiService=fs.readFileSync(root+'/modules/ai/ai-service.js','utf8');
const checks=[];
function pass(name,fn){fn();checks.push(name);console.log('PASS '+name);}
pass('ai-decision-has-inflight-event-ledger',()=>assert(ai.includes('_eventIdInFlight: new Map()')));
pass('same-event-converges-before-persisted-ledger',()=>assert(ai.includes('const existing = this._eventIdInFlight.get(eventId);')&&ai.includes('const promise = this._decideOnce(ctx);')&&ai.includes('this._eventIdInFlight.set(eventId, promise);')));
pass('inflight-cleans-up-after-success-or-failure',()=>assert(ai.includes('finally {')&&ai.includes('this._eventIdInFlight.delete(eventId);')));
pass('persisted-event-ledger-remains-second-line-defense',()=>assert(ai.includes('store.processedEventIds.includes(eventId)')));
pass('outbox-propagates-stable-event-id',()=>assert(outbox.includes("eventId:item.eventId||item.id")));
pass('async-consumer-is-awaited-by-outbox',()=>assert(outbox.includes('AIBus.emitAsync')&&outbox.includes('await AIBus.emitAsync')));
pass('ai-service-returns-consumer-promise',()=>assert(aiService.includes('return AIDecision.decide({ event: eventName, payload, eventMeta: meta });')));
// Deterministic race model: two callers must execute one domain operation.
async function model(){
  let calls=0; const inflight=new Map();
  async function once(id){calls++; await new Promise(r=>setTimeout(r,5)); return {id};}
  async function decide(id){
    if(inflight.has(id)) return inflight.get(id);
    const p=once(id); inflight.set(id,p);
    try{return await p;}finally{if(inflight.get(id)===p)inflight.delete(id);}
  }
  const [a,b]=await Promise.all([decide('evt-1'),decide('evt-1')]);
  assert.strictEqual(calls,1); assert.strictEqual(a.id,b.id);
  const c=await decide('evt-1'); assert.strictEqual(c.id,'evt-1'); assert.strictEqual(calls,2);
}
model().then(()=>{console.log('PASS concurrent-same-event-one-domain-operation');checks.push('concurrent-same-event-one-domain-operation');console.log(`S2289: ${checks.length}/${checks.length} PASS`);}).catch(e=>{console.error(e);process.exit(1);});
