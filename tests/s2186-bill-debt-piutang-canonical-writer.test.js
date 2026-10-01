'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(){
  const D={bills:[],billsArchive:[],debts:[],piutang:[]};
  const ctx=loadSource(['modules/finance/bill-debt-piutang-canonical-writer.js'],{D,sameId:(a,b)=>String(a)===String(b)},['BillDebtPiutangCanonicalWriter']);
  return {D,w:ctx.BillDebtPiutangCanonicalWriter};
}

test('S2186 writer: initializes all canonical collections',()=>{
  const D={}; const ctx=loadSource(['modules/finance/bill-debt-piutang-canonical-writer.js'],{D,sameId:(a,b)=>String(a)===String(b)},['BillDebtPiutangCanonicalWriter']);
  ctx.BillDebtPiutangCanonicalWriter.ensure();
  for(const k of ['bills','billsArchive','debts','piutang']) assert.ok(Array.isArray(D[k]));
});

test('S2186 writer: add rejects duplicate id and preserves row identity',()=>{
  const {D,w}=makeCtx(); const row={id:'b1',name:'x'}; assert.equal(w.add('bills',row),row); assert.throws(()=>w.add('bills',{id:'b1'}),/duplicate/); assert.equal(D.bills[0],row);
});

test('S2186 writer: update/remove by id are canonical',()=>{
  const {D,w}=makeCtx(); w.add('debts',{id:'d1',nilai:100}); assert.equal(w.updateById('debts','d1',d=>{d.nilai=40}).nilai,40); assert.equal(w.removeById('debts','d1'),1); assert.equal(D.debts.length,0);
});

test('S2186 writer: predicate replacement and archive move are atomic at collection boundary',()=>{
  const {D,w}=makeCtx(); w.add('piutang',{id:'p1',autoTxId:'t1'}); w.add('piutang',{id:'p2',autoTxId:'t2'}); assert.equal(w.removeByPredicate('piutang',p=>p.autoTxId==='t1'),1); w.add('bills',{id:'b1',name:'Bill'}); const moved=w.moveById('bills','billsArchive','b1',b=>({...b,completedAt:'2026-10-01'})); assert.equal(D.bills.length,0); assert.equal(D.billsArchive[0].completedAt,'2026-10-01'); assert.equal(moved.id,'b1');
});
