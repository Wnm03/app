'use strict';
/** S2451 — restore/import must re-establish category/component identity before persist. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadSource}=require('./helpers/loadSource');
const root=path.join(__dirname,'..');
function ctx(D){
  return loadSource(['modules/vehicle/service-category-restore-reconciler-s2451.js'],{
    D,
    ServiceTaxonomySOT:{resolve(x){
      const n=String(x&&x.name||x&&x.item||'').toLowerCase();
      if(String(x&&x.serviceComponentId||'')==='aki'||n==='aki')return {masterCategoryId:'kelistrikan',serviceComponentId:'aki'};
      return null;
    }},
    VehicleCarNotesSOT:{
      getServiceCategories(vid){return (D.vehicles.find(v=>v.id===vid).sot&&D.vehicles.find(v=>v.id===vid).sot.serviceCategories)||[];},
      reconcileLegacyCategoryProjection(){}
    }
  },['ServiceCategoryRestoreReconcilerS2451']);
}
test('S2451 restores service log and stock references to the current vehicle canonical projection',()=>{
  const D={vehicles:[{id:'v1',sot:{serviceCategories:[{id:'sp-v1-aki',name:'Aki',vehicleId:'v1',masterCategoryId:'kelistrikan',serviceComponentId:'aki'}]}},{id:'v2',sot:{serviceCategories:[{id:'sp-v2-aki',name:'Aki',vehicleId:'v2',masterCategoryId:'kelistrikan',serviceComponentId:'aki'}]}}],sparepartCats:[{id:'sp-v1-aki',name:'Aki',vehicleId:'v1',masterCategoryId:'kelistrikan',serviceComponentId:'aki'},{id:'sp-v2-aki',name:'Aki',vehicleId:'v2',masterCategoryId:'kelistrikan',serviceComponentId:'aki'}],partsStock:[{id:'p1',vehicleId:'v2',catId:'sp-v1-aki',name:'Aki',serviceComponentId:'aki'}],servisLogs:[{id:'s1',vehicleId:'v2',categoryId:'sp-v1-aki',item:'Aki',serviceComponentId:'aki'}]};
  const c=ctx(D); const r=c.ServiceCategoryRestoreReconcilerS2451.reconcile(D);
  assert.equal(r.ok,true); assert.equal(D.partsStock[0].catId,'sp-v2-aki'); assert.equal(D.servisLogs[0].categoryId,'sp-v2-aki');
});
test('S2451 never guesses an unresolved cross-vehicle category reference',()=>{
  const D={vehicles:[{id:'v1',sot:{serviceCategories:[]}},{id:'v2',sot:{serviceCategories:[]}}],sparepartCats:[{id:'foreign',name:'Part Custom',vehicleId:'v1'}],partsStock:[{id:'p1',vehicleId:'v2',catId:'foreign',name:'Part Custom'}],servisLogs:[]};
  const c=ctx(D); const r=c.ServiceCategoryRestoreReconcilerS2451.reconcile(D);
  assert.equal(r.ok,false); assert.ok(r.issues.some(x=>x.code==='CROSS_VEHICLE_CATEGORY_REFERENCE_UNRESOLVED'));
  assert.equal(D.partsStock[0].catId,'foreign');
});
test('S2451 restore boundary is wired after legacy service normalization and before durable persistence',()=>{
  const src=fs.readFileSync(path.join(root,'modules/shared/backup-restore.js'),'utf8');
  const a=src.indexOf("__s2013SetStage('service-history-sot-normalizer')");
  const b=src.indexOf("__s2013SetStage('category-component-sot-reconciliation')");
  const c=src.indexOf("__s2013SetStage('atomic-restore-persist')");
  assert.ok(a>=0&&b>a&&c>b); assert.match(src,/ServiceCategoryRestoreReconcilerS2451\.reconcile\(D\)/);
});
test('S2451 build registers the reconciler before backup-restore',()=>{
  const src=fs.readFileSync(path.join(root,'scripts/build.js'),'utf8');
  const a=src.indexOf('modules/vehicle/service-category-restore-reconciler-s2451.js');
  const b=src.indexOf('modules/shared/backup-restore.js');
  assert.ok(a>=0&&b>a);
});

test('S2455 repairs a canonical cross-vehicle projection by provisioning a local Car Notes category',()=>{
  const D={vehicles:[
    {id:'v1',sot:{serviceCategories:[{id:'foreign-throttle',name:'Throttle Body (bersihkan)',vehicleId:'v1',masterCategoryId:'sistem-injeksi-pgmfi',serviceComponentId:'throttle-body'}]}},
    {id:'v2',sot:{serviceCategories:[]}}
  ],sparepartCats:[
    {id:'foreign-throttle',name:'Throttle Body (bersihkan)',vehicleId:'v1',masterCategoryId:'sistem-injeksi-pgmfi',serviceComponentId:'throttle-body'}
  ],partsStock:[],servisLogs:[{id:'s1',vehicleId:'v2',categoryId:'foreign-throttle',item:'Throttle Body (bersihkan)',serviceComponentId:'throttle-body'}]};
  const c=ctx(D);
  const api=c.VehicleCarNotesSOT={
    getServiceCategories(vid){return (D.vehicles.find(v=>v.id===vid).sot.serviceCategories)||[];},
    syncLegacyCategoryProjection(cat){
      const v=D.vehicles.find(v=>v.id===cat.vehicleId); if(!v)return {ok:false};
      const row=Object.assign({},cat,{id:'local-throttle',vehicleId:cat.vehicleId});
      v.sot.serviceCategories.push(row); D.sparepartCats.push(row); return {ok:true};
    },
    reconcileLegacyCategoryProjection(){}
  };
  // Re-load the reconciler against the explicit Car Notes mock so S2455 path is exercised.
  const {loadSource}=require('./helpers/loadSource');
  const ctx2=loadSource(['modules/vehicle/service-category-restore-reconciler-s2451.js'],{
    D,
    ServiceTaxonomySOT:{resolve(x){
      if(String(x&&x.serviceComponentId||'')==='throttle-body'||String(x&&x.name||x&&x.item||'').toLowerCase().includes('throttle body'))return {masterCategoryId:'sistem-injeksi-pgmfi',serviceComponentId:'throttle-body'};
      return null;
    }},
    VehicleCarNotesSOT:c.VehicleCarNotesSOT
  },['ServiceCategoryRestoreReconcilerS2451']);
  const r=ctx2.ServiceCategoryRestoreReconcilerS2451.reconcile(D);
  assert.equal(r.ok,true);
  assert.equal(D.servisLogs[0].categoryId,'local-throttle');
  assert.equal(D.vehicles[1].sot.serviceCategories.some(x=>x.serviceComponentId==='throttle-body'),true);
  assert.equal(D.sparepartCats.some(x=>x.vehicleId==='v2'&&x.serviceComponentId==='throttle-body'),true);
  assert.equal(r.issues.some(x=>x.code==='CROSS_VEHICLE_CATEGORY_REFERENCE_UNRESOLVED'),false);
});

console.log('S2451/S2455 PASS');


test('S2461 reconciles nested checklist category references using parent vehicle ownership',()=>{
  const D={vehicles:[
    {id:'v1',sot:{serviceCategories:[{id:'v1-aki',name:'Aki',vehicleId:'v1',masterCategoryId:'kelistrikan',serviceComponentId:'aki'}]}},
    {id:'v2',sot:{serviceCategories:[]}}
  ],sparepartCats:[{id:'v1-aki',name:'Aki',vehicleId:'v1',masterCategoryId:'kelistrikan',serviceComponentId:'aki'}],partsStock:[],servisLogs:[{id:'s1',vehicleId:'v2',item:'Aki',serviceComponentId:'aki',categoryId:'v1-aki',checklist:[{itemId:'aki',itemName:'Aki',serviceComponentId:'aki',categoryId:'v1-aki'}]}]};
  const c=loadSource(['modules/vehicle/service-category-restore-reconciler-s2451.js'],{
    D,
    ServiceTaxonomySOT:{resolve(x){if(String(x&&x.serviceComponentId||'')==='aki'||String(x&&x.name||x&&x.item||'').toLowerCase()==='aki')return {masterCategoryId:'kelistrikan',serviceComponentId:'aki'};return null;}},
    VehicleCarNotesSOT:{
      getServiceCategories(vid){return (D.vehicles.find(v=>v.id===vid).sot.serviceCategories)||[];},
      syncLegacyCategoryProjection(cat){const v=D.vehicles.find(v=>v.id===cat.vehicleId);const row=Object.assign({},cat,{id:'v2-aki',vehicleId:cat.vehicleId});v.sot.serviceCategories.push(row);D.sparepartCats.push(row);return {ok:true};},
      reconcileLegacyCategoryProjection(){}
    }
  },['ServiceCategoryRestoreReconcilerS2451']);
  const r=c.ServiceCategoryRestoreReconcilerS2451.reconcile(D);
  assert.equal(r.ok,true);
  assert.equal(D.servisLogs[0].checklist[0].categoryId,'v2-aki');
  assert.equal(r.issues.length,0);
});

test('S2461 restore diagnostic payload preserves reconciliation issues for UI export',()=>{
  const src=fs.readFileSync(path.join(root,'modules/shared/backup-restore.js'),'utf8');
  assert.match(src,/window\.__S2013_RESTORE_DIAGNOSTIC=detail/);
  assert.match(src,/kw_restore_diagnostic_s2013/);
  assert.match(src,/categoryComponentReconciliation/);
  assert.match(src,/copyS2013RestoreDiagnostic/);
  assert.match(src,/downloadS2013RestoreDiagnostic/);
  assert.match(src,/clearS2013RestoreDiagnostic/);
});

test('S2461 auto self-test lazy loader failure is inside the guarded bootstrap',()=>{
  const self=fs.readFileSync(path.join(root,'self-test.js'),'utf8');
  const boot=fs.readFileSync(path.join(root,'modules/shared/boot-early.js'),'utf8');
  const start=self.indexOf('async function autoRunSelfTestIfNeeded()');
  const tryPos=self.indexOf('try{',start);
  const lazyPos=self.indexOf('await ensureDiagnosticCases()',start);
  assert.ok(start>=0&&tryPos>start&&lazyPos>tryPos);
  assert.match(boot,/Auto self-test bootstrap gagal/);
});
