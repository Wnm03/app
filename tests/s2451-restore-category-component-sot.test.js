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
console.log('S2451 4/4 PASS');
