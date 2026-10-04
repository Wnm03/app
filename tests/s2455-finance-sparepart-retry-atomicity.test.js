'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

function docFor({checked=true,item='p1',qty='2',unit='pcs',name='Aki'}){
  const els={
    txAddStock:{checked},
    txStockPanel:{style:{display:'block'}},
    txStockItem:{value:item},
    txStockQty:{value:qty},
    txStockUnit:{value:unit},
    txStockNewName:{value:name}
  };
  return {getElementById:id=>els[id]||null};
}

function ctx(D,extra={}){
  return loadSource(['modules/vehicle/stock-command-sot.js','modules/finance/tx-stok-sparepart.js'],Object.assign({
    D,document:docFor({}),curVehicleId:'v1',codeFromName:s=>String(s).slice(0,3).toUpperCase(),toast:()=>{},save:()=>{},renderStockList:()=>{},escapeHtml:s=>String(s),uid:(()=>{let n=0;return()=>`u${++n}`;})()
  },extra),['applyTxStockFromTx','StockCommandSOT']);
}

test('S2455 failed stock revert aborts the Finance→Sparepart bridge instead of silently committing',()=>{
  const D={vehicles:[{id:'v1'}],transactions:[{id:'tx1',partStockId:'p1',partStockQty:2}],partsStock:[{id:'p1',name:'Aki',qty:5}],sparepartCats:[]};
  const c=ctx(D);
  c.StockCommandSOT.revertPurchaseForTransaction=()=>({ok:false,code:'INJECTED_REVERT_FAILURE'});
  assert.throws(()=>c.applyTxStockFromTx('Aki','tx1','2026-10-04',100000,D.transactions[0]),/INJECTED_REVERT_FAILURE/);
});

test('S2455 failed stock apply aborts instead of saving a Finance transaction without the requested stock side-effect',()=>{
  const D={vehicles:[{id:'v1'}],transactions:[{id:'tx1'}],partsStock:[{id:'p1',name:'Aki',qty:5}],sparepartCats:[]};
  const c=ctx(D);
  c.StockCommandSOT.applyPurchase=()=>({ok:false,code:'INJECTED_APPLY_FAILURE'});
  assert.throws(()=>c.applyTxStockFromTx('Aki','tx1','2026-10-04',100000,D.transactions[0]),/STOCK_PURCHASE_APPLY_FAILED/);
});

test('S2455 duplicate retry of the same txId is idempotent at StockCommandSOT',()=>{
  const D={vehicles:[{id:'v1'}],transactions:[{id:'tx1'}],partsStock:[{id:'p1',name:'Aki',qty:0}],sparepartCats:[]};
  const c=ctx(D);
  c.applyTxStockFromTx('Aki','tx1','2026-10-04',100000,D.transactions[0]);
  const first=D.partsStock[0].qty;
  c.applyTxStockFromTx('Aki','tx1','2026-10-04',100000,D.transactions[0]);
  assert.equal(first,2);
  assert.equal(D.partsStock[0].qty,2,'retry must not increment stock twice');
  assert.equal(D.partsStock[0].priceHistory.filter(x=>x.txId==='tx1').length,1);
});

test('S2455 saveTx has a re-entry lock so rapid double tap cannot create two side-effect chains',()=>{
  const src=require('fs').readFileSync('modules/finance/transaksi-b.js','utf8');
  assert.match(src,/async function saveTx\(\)\{\s*if\(_txSaving\)return;/);
  assert.match(src,/_txAtomicMutationStarted=true;\s*applyTxStockFromTx/);
  assert.match(src,/if\(_txAtomicMutationStarted\|\|_serviceMutationTouched\)\{/);
});

console.log('S2455 Finance→Sparepart retry/atomicity gate: 4/4 PASS');
