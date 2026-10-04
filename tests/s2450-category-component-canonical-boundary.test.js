'use strict';
/** S2450 — category/component canonical identity at Car Notes SOT boundary. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadSource}=require('./helpers/loadSource');

function makeD(){return {vehicles:[{id:'veh1',name:'Vario 125'},{id:'veh2',name:'BeAT'}],sparepartCats:[],partsStock:[],transactions:[],servisLogs:[]};}

function loadSot(D){
  return loadSource(['modules/vehicle/vehicle-car-notes-sot-s2071.js'],{
    D,curVehicleId:'veh1',
    ServiceTaxonomySOT:{resolve(input){
      if(String(input.name||'').toLowerCase()==='aki'||input.serviceComponentId==='aki')return {masterCategoryId:'kelistrikan',serviceComponentId:'aki'};
      return null;
    }}
  },['VehicleCarNotesSOT']);
}

test('S2450 canonical boundary enriches legacy category and writes the same identity to Car Notes SOT',()=>{
  const D=makeD(); const ctx=loadSot(D);
  const cat={id:'sp1',name:'Aki',vehicleId:'veh1',intervalKm:5000};
  const r=ctx.VehicleCarNotesSOT.syncLegacyCategoryProjection(cat,'test');
  assert.equal(r.ok,true);
  assert.equal(cat.masterCategoryId,'kelistrikan');
  assert.equal(cat.serviceComponentId,'aki');
  const canonical=ctx.VehicleCarNotesSOT.getServiceCategories('veh1');
  assert.equal(canonical.length,1);
  assert.equal(canonical[0].serviceComponentId,'aki');
  assert.equal(canonical[0].masterCategoryId,'kelistrikan');
});

test('S2450 persisted pre-taxonomy category is canonicalized when Car Notes SOT is read',()=>{
  const D=makeD(); const ctx=loadSot(D);
  const sot=D.vehicles[0].sot={owner:'VehicleCarNotesSOT',version:'legacy',vehicleId:'veh1',serviceCategories:[{id:'legacy-aki',name:'Aki',vehicleId:'veh1'}]};
  const rows=ctx.VehicleCarNotesSOT.getServiceCategories('veh1');
  assert.equal(rows[0].masterCategoryId,'kelistrikan');
  assert.equal(rows[0].serviceComponentId,'aki');
  assert.equal(sot.serviceCategories[0].serviceComponentId,'aki');
});

test('S2450 genuinely custom category remains valid without invented component identity',()=>{
  const D=makeD(); const ctx=loadSot(D);
  const cat={id:'custom1',name:'Part Khusus',vehicleId:'veh1'};
  const r=ctx.VehicleCarNotesSOT.syncLegacyCategoryProjection(cat,'test');
  assert.equal(r.ok,true);
  assert.equal(cat.serviceComponentId,undefined);
  assert.equal(ctx.VehicleCarNotesSOT.getServiceCategories('veh1')[0].id,'custom1');
});

test('S2450 Finance canonical category must not reuse an unscoped/global category for another vehicle',()=>{
  const D=makeD();
  D.sparepartCats=[{id:'global-aki',name:'Aki',code:'AKI'}];
  const dom={txAddStock:{checked:true},txStockPanel:{style:{display:'block'}},txStockItem:{value:'__new__'},txStockQty:{value:'1'},txStockUnit:{value:'pcs'},txStockNewName:{value:'Aki'}};
  const ctx=loadSource(['modules/finance/tx-stok-sparepart.js'],{
    D,curVehicleId:'veh1',document:{getElementById:id=>dom[id]||null},
    codeFromName:n=>String(n).toUpperCase().slice(0,3),toast:()=>{},save:()=>{},escapeHtml:s=>String(s),renderStockList:()=>{},
    _genId:()=> 'new2450',
    resolveServiceCategoryComponent:()=>({masterCategoryId:'kelistrikan',serviceComponentId:'aki'}),
    resolveServisCatForVehicle:()=>D.sparepartCats[0],
    VehicleCarNotesSOT:{getServiceCategories:()=>[],syncLegacyCategoryProjection(cat){cat.masterCategoryId='kelistrikan';cat.serviceComponentId='aki';D.sparepartCats.push(Object.assign({},cat));return {ok:true};}},
    StockCommandSOT:{create(p){D.partsStock.push(p);return {ok:true,part:p};},applyPurchase(){return {ok:true};}}
  },['applyTxStockFromTx']);
  ctx.applyTxStockFromTx('Aki','tx2450','2026-10-04',10000,null);
  assert.equal(D.partsStock.length,1);
  assert.equal(D.partsStock[0].vehicleId,'veh1');
  const scopedCat=D.sparepartCats.find(c=>c&&c.id===D.partsStock[0].catId);
  assert.ok(scopedCat);
  assert.equal(scopedCat.vehicleId,'veh1');
  assert.equal(scopedCat.serviceComponentId,'aki');
  assert.equal(scopedCat.masterCategoryId,'kelistrikan');
  assert.equal(D.sparepartCats.some(c=>c.id==='global-aki'&&c.vehicleId==='veh1'),false);
});

test('S2450 all category creation paths route through the canonical projection bridge',()=>{
  const files=['modules/vehicle/servis.js','modules/vehicle/sparepart-servis-ui.js','modules/vehicle/sparepart-servis.js','modules/finance/tx-stok-sparepart.js'];
  for(const f of files){
    const src=fs.readFileSync(path.join(__dirname,'..',f),'utf8');
    const pushes=[...src.matchAll(/D\.sparepartCats\.push\(([^;]+)\)/g)].map(m=>m[0]);
    assert.ok(pushes.length>0,`${f}: expected category writer`);
    for(const push of pushes){
      assert.ok(/syncLegacyCategoryProjection/.test(src),`${f}: missing canonical projection bridge`);
    }
  }
});

console.log('S2450 5/5 PASS');
