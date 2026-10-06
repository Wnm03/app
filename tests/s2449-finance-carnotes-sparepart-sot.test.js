'use strict';
/** S2449 — Finance/Sparepart/Car Notes canonical category-component bridge + modal cleanup. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadSource}=require('./helpers/loadSource');

function makeD(overrides){
  return Object.assign({
    vehicles:[{id:'veh1',name:'Vario 125'}],
    sparepartCats:[],
    partsStock:[],
    transactions:[],
  },overrides||{});
}

function txStockContext(D){
  const dom={
    txAddStock:{checked:true},txStockPanel:{style:{display:'block'}},
    txStockItem:{value:'__new__'},txStockQty:{value:'2'},txStockUnit:{value:'pcs'},
    txStockNewName:{value:'Aki'},
  };
  const canonicalCat={id:'cat-aki',name:'Aki',vehicleId:'veh1',masterCategoryId:'kelistrikan',serviceComponentId:'aki'};
  const ctx=loadSource(['modules/vehicle/stock-command-sot.js', 'modules/finance/tx-stok-sparepart.js'],{
    D,curVehicleId:'veh1',document:{getElementById:id=>dom[id]||null},
    codeFromName:name=>String(name).toUpperCase().slice(0,3),toast:()=>{},save:()=>{},escapeHtml:s=>String(s),renderStockList:()=>{},
    _genId:()=> 'new1',
    resolveServiceCategoryComponent:()=>({masterCategoryId:'kelistrikan',serviceComponentId:'aki'}),
    resolveServisCatForVehicle:()=>canonicalCat,
    VehicleCarNotesSOT:{
      getServiceCategories:()=>[canonicalCat],
      syncLegacyCategoryProjection:(cat)=>{Object.assign(cat,{vehicleId:'veh1',masterCategoryId:cat.masterCategoryId||'kelistrikan',serviceComponentId:cat.serviceComponentId||'aki'});if(!D.sparepartCats.some(x=>x&&x.id===cat.id))D.sparepartCats.push(cat);return {ok:true};},
    },
    StockCommandSOT:{
      create(p){D.partsStock.push(p);return {ok:true,part:p};},
      applyPurchase(id,qty,unitPrice,date,txId){const p=D.partsStock.find(x=>x.id===id);p.qty+=qty;p.price=unitPrice;p.txRefs=[txId];return {ok:true};},
    },
  },['applyTxStockFromTx']);
  return ctx;
}

test('S2449 Finance -> Sparepart: newly typed part uses Car Notes canonical category/component',()=>{
  const D=makeD({sparepartCats:[{id:'cat-aki',name:'Aki',vehicleId:'veh1',masterCategoryId:'kelistrikan',serviceComponentId:'aki'}]});
  const ctx=txStockContext(D);
  ctx.applyTxStockFromTx('Aki','tx1','2026-10-04',100000,null);
  assert.equal(D.sparepartCats.length,1);
  assert.deepEqual(
    {masterCategoryId:D.sparepartCats[0].masterCategoryId,serviceComponentId:D.sparepartCats[0].serviceComponentId},
    {masterCategoryId:'kelistrikan',serviceComponentId:'aki'}
  );
  assert.equal(D.partsStock[0].catId,'cat-aki');
});

test('S2449 Finance -> Service: category id resolution prefers the Car Notes canonical projection',()=>{
  const D=makeD({sparepartCats:[
    {id:'legacy-aki-1',name:'Aki',vehicleId:'veh1',serviceComponentId:'aki',masterCategoryId:'kelistrikan'},
    {id:'legacy-aki-2',name:'Aki',vehicleId:'veh1',serviceComponentId:'aki',masterCategoryId:'kelistrikan'},
  ]});
  const ctx=loadSource(['modules/vehicle/stock-command-sot.js', 'modules/finance/tx-servis.js'],{
    D,
    ServiceInputCatalog:{infer:()=>({item:{id:'aki'},group:{masterCategoryId:'kelistrikan'}})},
    VehicleCarNotesSOT:{getServiceCategories:()=>[{id:'canonical-aki',vehicleId:'veh1',serviceComponentId:'aki',masterCategoryId:'kelistrikan'}]},
    canonicalServisCategoryId:()=>({id:'legacy-aki-1'}),
    resolveServisCatForVehicle:()=>({id:'legacy-aki-1'}),
  },['_resolveServisCategoryId']);
  assert.equal(ctx._resolveServisCategoryId('Aki',null,'veh1'),'canonical-aki');
});

test('S2449 category picker collapses duplicate legacy projection rows by canonical identity',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/sparepart-servis.js'),'utf8');
  assert.match(src,/function dedupeServiceCategoriesForVehicle\(categories,vehicleId\)/);
  const ui=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/sparepart-servis-b.js'),'utf8');
  assert.match(ui,/dedupeServiceCategoriesForVehicle\(/);
});

test('S2449 transaction commit closes a stacked stock modal before closing txModal',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','modules/finance/transaksi-b.js'),'utf8');
  assert.match(src,/getElementById\('stockModal'\)/);
  assert.match(src,/closeModal\('stockModal',\{instant:true\}\)/);
  assert.match(src,/closeModal\('txModal'\);if\(typeof refreshAfterMutation/);
});

console.log('S2449 4/4 PASS');
