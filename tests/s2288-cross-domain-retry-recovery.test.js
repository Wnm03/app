'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs'),vm=require('vm');
const {loadSource}=require('./helpers/loadSource');

test('S2288 static cross-domain retry/recovery contract',()=>{const cp=require('child_process');const r=cp.spawnSync(process.execPath,['scripts/s2288-cross-domain-retry-recovery.js'],{encoding:'utf8'});assert.equal(r.status,0,r.stdout+'\n'+r.stderr);assert.match(r.stdout,/S2288: 10\/10 PASS/);});

test('S2288 atomic boundary restores state when staging outbox fails',()=>{
 const src=fs.readFileSync('modules/finance/finance-cross-entity-atomic.js','utf8');let d={transactions:[{id:1}],debts:[{id:'d1'}]};
 const ctx={D:d,FinanceEventOutbox:{stageBatch:()=>false},console};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(src,ctx);
 const tx=ctx.FinanceCrossEntityAtomic.begin(['transactions','debts']);d.transactions.push({id:2});tx.emit('finance.updated',{id:2});assert.throws(()=>tx.commit(),/outbox capacity exhausted/);assert.equal(JSON.stringify(d.transactions),JSON.stringify([{id:1}]));assert.equal(JSON.stringify(d.debts),JSON.stringify([{id:'d1'}]));
});

test('S2288 outbox retry preserves event identity after handler failure',async()=>{
 const localStorage={_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=v},removeItem(k){delete this._d[k]}};
 let ids=[];let first=true;const x=loadSource(['modules/finance/finance-event-outbox.js'],{localStorage,IDBStore:{get:async()=>null,set:async()=>{}},AIBus:{emit:(t,p,m)=>{ids.push(m.eventId);if(first){first=false;throw Error('after-handler')}}},setTimeout:()=>{}},['FinanceEventOutbox']);
 assert.equal(x.FinanceEventOutbox.enqueue('finance.updated',{id:9}),true);assert.equal(await x.FinanceEventOutbox.replay(),false);assert.equal(x.FinanceEventOutbox.pending().length,1);x.AIBus.emit=(t,p,m)=>ids.push(m.eventId);assert.equal(await x.FinanceEventOutbox.replay(),true);assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);
});
