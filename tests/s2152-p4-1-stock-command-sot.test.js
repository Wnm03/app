'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function ctx(){const D={partsStock:[]};return loadSource(['modules/vehicle/stock-command-sot.js'],{D,save:()=>{}},['StockCommandSOT']);}
test('P4.1 command SOT uses D.partsStock as sole storage owner',()=>{const {StockCommandSOT}=ctx();assert.equal(StockCommandSOT.audit().storage,'D.partsStock');});
test('P4.1 create/update are canonical commands',()=>{const {StockCommandSOT}=ctx();let r=StockCommandSOT.create({id:'s1',name:'Busi',qty:0});assert.equal(r.ok,true);r=StockCommandSOT.update('s1',{name:'Busi Iridium',unit:'pcs'});assert.equal(r.ok,true);assert.equal(r.part.name,'Busi Iridium');});
test('P4.1 setQty journals quantity changes',()=>{const {StockCommandSOT}=ctx();StockCommandSOT.create({id:'s1',qty:2});const r=StockCommandSOT.setQty('s1',5,{reason:'manual-adjustment'});assert.equal(r.ok,true);assert.equal(r.beforeQty,2);assert.equal(r.afterQty,5);assert.equal(r.part.adjustmentHistory.length,1);});
test('P4.1 archive/restore preserve row identity',()=>{const {StockCommandSOT}=ctx();StockCommandSOT.create({id:'s1',qty:7});let r=StockCommandSOT.archive('s1','test');assert.equal(r.part.isArchived,true);assert.equal(r.part.archivedQtyBefore,7);r=StockCommandSOT.restore('s1');assert.equal(r.part.isArchived,false);assert.equal(r.part.id,'s1');});
test('P4.1 purchase command guards duplicate history by txId',()=>{const {StockCommandSOT}=ctx();StockCommandSOT.create({id:'s1',qty:2,price:100});let r=StockCommandSOT.applyPurchase('s1',3,120,'2026-09-30','tx1');assert.equal(r.ok,true);r=StockCommandSOT.applyPurchase('s1',3,120,'2026-09-30','tx1');assert.equal(r.alreadyApplied,true);assert.equal(r.duplicateHistory,true);assert.equal(r.qtyAdded,0);assert.equal(r.part.priceHistory.length,1);assert.equal(r.part.qty,5);});
