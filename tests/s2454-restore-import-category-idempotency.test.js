'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

function loadReconciler(data){
  return loadSource(['modules/vehicle/service-category-restore-reconciler-s2451.js'],{
    D:data,
    VehicleCarNotesSOT:{
      getServiceCategories:(vid)=>((data.vehicles.find(v=>v.id===vid)||{}).sot||{}).serviceCategories||[],
      reconcileLegacyCategoryProjection:()=>({ok:true})
    },
    ServiceTaxonomySOT:{resolve:({serviceComponentId,name})=>serviceComponentId?{masterCategoryId:'elektrikal',serviceComponentId}:null},
    ServiceInputCatalog:{infer:()=>null}
  },['ServiceCategoryRestoreReconcilerS2451']);
}

test('S2454 restore deduplicates same-vehicle legacy projections and remaps stock/service references',()=>{
  const D={vehicles:[
    {id:'v1',sot:{serviceCategories:[{id:'canon-aki',name:'Aki',vehicleId:'v1',masterCategoryId:'elektrikal',serviceComponentId:'aki'}]}},
    {id:'v2',sot:{serviceCategories:[{id:'v2-aki',name:'Aki',vehicleId:'v2',masterCategoryId:'elektrikal',serviceComponentId:'aki'}]}}
  ],sparepartCats:[
    {id:'canon-aki',name:'Aki',vehicleId:'v1',masterCategoryId:'elektrikal',serviceComponentId:'aki'},
    {id:'dup-aki',name:'Aki',vehicleId:'v1',masterCategoryId:'elektrikal',serviceComponentId:'aki'},
    {id:'v2-aki',name:'Aki',vehicleId:'v2',masterCategoryId:'elektrikal',serviceComponentId:'aki'}
  ],partsStock:[{id:'p1',vehicleId:'v1',catId:'dup-aki'}],servisLogs:[{id:'s1',vehicleId:'v1',categoryId:'dup-aki'}]};
  const ctx=loadReconciler(D);
  const r=ctx.ServiceCategoryRestoreReconcilerS2451.reconcile(D);
  assert.equal(r.ok,true);
  assert.deepEqual(D.sparepartCats.filter(c=>c.vehicleId==='v1').map(c=>c.id),['canon-aki']);
  assert.equal(D.partsStock[0].catId,'canon-aki');
  assert.equal(D.servisLogs[0].categoryId,'canon-aki');
  assert.equal(D.sparepartCats.some(c=>c.vehicleId==='v2'&&c.id==='v2-aki'),true,'other vehicle projection must remain');
});

test('S2454 unresolved cross-vehicle reference remains fail-closed',()=>{
  const D={vehicles:[{id:'v1',sot:{serviceCategories:[{id:'v1-aki',name:'Aki',vehicleId:'v1',serviceComponentId:'aki'}]}},{id:'v2',sot:{serviceCategories:[]}}],sparepartCats:[{id:'v2-rantai',name:'Rantai',vehicleId:'v2',serviceComponentId:'rantai'}],partsStock:[{id:'p1',vehicleId:'v1',catId:'v2-rantai'}]};
  const ctx=loadReconciler(D);
  const r=ctx.ServiceCategoryRestoreReconcilerS2451.reconcile(D);
  assert.equal(r.ok,false);
  assert.equal(r.issues.some(x=>x.code==='CROSS_VEHICLE_CATEGORY_REFERENCE_UNRESOLVED'),true);
});

console.log('S2454 restore/import category idempotency gate: 2/2 PASS');
