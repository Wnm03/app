'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function ctx(){
  const D={bills:[],billsArchive:[],debts:[],piutang:[]};
  const c=loadSource(['modules/finance/bill-debt-piutang-canonical-writer.js'],{D,sameId:(a,b)=>String(a)===String(b)},['BillDebtPiutangCanonicalWriter']);
  return {D,w:c.BillDebtPiutangCanonicalWriter};
}
test('S2195 repeated delete is idempotent',()=>{
  const {D,w}=ctx(); w.add('bills',{id:'b1'}); assert.equal(w.removeById('bills','b1'),1); assert.equal(w.removeById('bills','b1'),0); assert.deepEqual(D.bills,[]);
});
test('S2195 duplicate retry cannot create second canonical row',()=>{
  const {D,w}=ctx(); const row={id:'p1',autoTxId:'t1'}; w.add('piutang',row); assert.throws(()=>w.add('piutang',{id:'p1',autoTxId:'t1'}),/duplicate/); assert.equal(D.piutang.length,1); assert.equal(D.piutang[0],row);
});
test('S2195 archive collision is atomic: source remains when destination id already exists',()=>{
  const {D,w}=ctx(); w.add('bills',{id:'b1',amount:100}); w.add('billsArchive',{id:'b1',amount:50}); assert.throws(()=>w.moveById('bills','billsArchive','b1'),/duplicate/); assert.equal(D.bills.length,1); assert.equal(D.bills[0].amount,100); assert.equal(D.billsArchive.length,1);
});
test('S2195 transformed archive collision is atomic',()=>{
  const {D,w}=ctx(); w.add('bills',{id:'b1',amount:100}); w.add('billsArchive',{id:'b2',amount:50}); assert.throws(()=>w.moveById('bills','billsArchive','b1',()=>({id:'b2',amount:101})),/duplicate/); assert.equal(D.bills.length,1); assert.equal(D.bills[0].amount,100); assert.equal(D.billsArchive.length,1); assert.equal(D.billsArchive[0].id,'b2');
});
test('S2195 retry after failed archive collision succeeds once collision is removed',()=>{
  const {D,w}=ctx(); w.add('bills',{id:'b1',amount:100}); w.add('billsArchive',{id:'b1',amount:50}); assert.throws(()=>w.moveById('bills','billsArchive','b1'),/duplicate/); w.removeById('billsArchive','b1'); const moved=w.moveById('bills','billsArchive','b1'); assert.equal(moved.id,'b1'); assert.equal(D.bills.length,0); assert.equal(D.billsArchive.length,1);
});
