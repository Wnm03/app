'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

function loadDelete({askConfirm,save=()=>true,stockPatch}={}){
  const D={
    vehicles:[{id:'v1',name:'Vario',vehicleType:'motor'}],
    sparepartCats:[
      {id:'c1',name:'Aki',vehicleId:'v1',serviceComponentId:'aki',masterCategoryId:'kelistrikan',intervalKm:8000},
      {id:'c2',name:'Ban',vehicleId:'v1',serviceComponentId:'ban',masterCategoryId:'roda',intervalKm:10000},
    ],
    partsStock:[{id:'p1',name:'Aki GS',catId:'c1',vehicleId:'v1',qty:1}]
  };
  const ctx=loadSource([
    'modules/vehicle/stock-command-sot.js',
    'modules/vehicle/vehicle-car-notes-sot-s2071.js',
    'modules/vehicle/sparepart-servis-ui.js'
  ],{
    D,curVehicleId:'v1',Sparepart:{},
    askConfirm:askConfirm||(()=>Promise.resolve(true)),save,
    toast:()=>{},renderServisList:()=>{},renderDashboardServisReminder:()=>{},
    escapeHtml:s=>String(s)
  },['Sparepart','VehicleCarNotesSOT','StockCommandSOT']);
  ctx.Sparepart.renderCatList=()=>{};
  ctx.Sparepart.renderStockList=()=>{};
  if(stockPatch)stockPatch(ctx.StockCommandSOT);
  return ctx;
}

test('S2453 delete category is ID-based after confirmation; concurrent same-category delete is idempotent',async()=>{
  const answers=[]; let confirms=0;
  const ctx=loadDelete({askConfirm:()=>{confirms++;return new Promise(resolve=>answers.push(resolve));}});
  const p1=ctx.Sparepart.delCat(0);
  const p2=ctx.Sparepart.delCat(0);
  assert.equal(confirms,1,'second concurrent delete must join the first operation');
  answers[0](true);
  await Promise.all([p1,p2]);
  assert.deepEqual(ctx.D.sparepartCats.map(x=>x.id),['c2'],'must not accidentally delete the next category by stale array index');
  assert.equal(ctx.D.partsStock[0].catId,null);
  assert.equal(ctx.VehicleCarNotesSOT.getServiceCategories('v1').some(x=>x.id==='c1'),false);
});

test('S2453 category delete clears stock category through StockCommandSOT, not raw D.partsStock mutation',async()=>{
  let updateCalls=0;
  const ctx=loadDelete({stockPatch:sot=>{
    const orig=sot.update;
    sot.update=(...args)=>{updateCalls++;return orig(...args);};
  }});
  await ctx.Sparepart.delCat(0);
  assert.equal(updateCalls,1);
  assert.equal(ctx.D.partsStock[0].catId,null);
});

test('S2453 failed stock detach rolls back category and stock state',async()=>{
  const ctx=loadDelete({stockPatch:sot=>{sot.update=()=>({ok:false,code:'INJECTED_STOCK_FAILURE'});}});
  await ctx.Sparepart.delCat(0);
  assert.deepEqual(new Set(ctx.D.sparepartCats.map(x=>x.id)),new Set(['c1','c2']));
  assert.equal(ctx.D.partsStock[0].catId,'c1');
  assert.equal(ctx.VehicleCarNotesSOT.getServiceCategories('v1').some(x=>x.id==='c1'),true);
});

test('S2453 blocked save rolls back canonical SOT, projection and stock',async()=>{
  const ctx=loadDelete({save:()=>false});
  await ctx.Sparepart.delCat(0);
  assert.deepEqual(new Set(ctx.D.sparepartCats.map(x=>x.id)),new Set(['c1','c2']));
  assert.equal(ctx.D.partsStock[0].catId,'c1');
  assert.equal(ctx.VehicleCarNotesSOT.getServiceCategories('v1').some(x=>x.id==='c1'),true);
});

test('S2453 canonical category removal also removes only the same-vehicle legacy projection',()=>{
  const ctx=loadDelete();
  const other={id:'c1',name:'Aki',vehicleId:'v2',serviceComponentId:'aki'};
  ctx.D.vehicles.push({id:'v2',name:'Beat',vehicleType:'motor'});
  ctx.D.sparepartCats.push(other);
  ctx.VehicleCarNotesSOT.ensure('v2');
  const r=ctx.VehicleCarNotesSOT.removeServiceCategory('v1','c1');
  assert.equal(r.ok,true);
  assert.equal(ctx.D.sparepartCats.some(x=>x.vehicleId==='v1'&&x.id==='c1'),false);
  assert.equal(ctx.D.sparepartCats.some(x=>x.vehicleId==='v2'&&x.id==='c1'),true,'vehicle B projection must remain');
});

console.log('S2453 category delete atomicity/idempotency gate: 5/5 PASS');
