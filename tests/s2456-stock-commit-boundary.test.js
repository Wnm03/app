'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const {loadSource}=require('./helpers/loadSource');
const root=path.resolve(__dirname,'..');
const src=f=>fs.readFileSync(path.join(root,f),'utf8');
const srcTx=()=>src('modules/finance/transaksi-b.js');

test('S2456 transactional Finance→Sparepart mutations suppress pre-commit stock events',()=>{
  const s=src('modules/finance/tx-stok-sparepart.js');
  assert.match(s,/emitEvent:false/);
  assert.match(srcTx(),/applyTxStockFromTx\(note,savedTxId,date,amt,existingTx,\{deferEvents:true\}\)/);
});

test('S2456 direct StockCommandSOT API preserves legacy stock events',()=>{
  const D={partsStock:[{id:'p1',name:'Aki',qty:5,priceHistory:[]}],transactions:[]};
  const events=[];
  const c=loadSource(['modules/vehicle/stock-command-sot.js'],{D,AIBus:{emit:(name,payload)=>events.push({name,payload})},save:()=>{}} ,['StockCommandSOT']);
  c.StockCommandSOT.applyPurchase('p1',2,100,'2026-10-04','tx1');
  assert.equal(events.length,1);
  assert.equal(events[0].payload.action,'purchase-apply');
});

test('S2456 consumed purchase cannot be silently clamped during edit/revert',()=>{
  const D={partsStock:[{id:'p1',name:'Aki',qty:1,priceHistory:[{txId:'tx1',qty:2,price:100,qtyBefore:3,avgPriceBefore:100}]}],transactions:[{id:'tx1',partStockId:'p1',partStockQty:2}]};
  const c=loadSource(['modules/vehicle/stock-command-sot.js'],{D,AIBus:{emit:()=>{}},save:()=>{}},['StockCommandSOT']);
  const r=c.StockCommandSOT.revertPurchaseForTransaction('tx1',{saveNow:false,emitEvent:false});
  assert.equal(r.ok,false);
  assert.equal(r.code,'INSUFFICIENT_STOCK_FOR_PURCHASE_REVERT');
  assert.equal(D.partsStock[0].qty,1);
  assert.equal(D.partsStock[0].priceHistory.length,1);
});

console.log('S2456 Finance→Sparepart commit-boundary/rollback gate: 3/3 PASS');
