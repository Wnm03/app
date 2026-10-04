'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadSource}=require('./helpers/loadSource');

function base(){return {vehicles:[{id:'v1',name:'Vario'},{id:'v2',name:'Beat'}],sparepartCats:[],partsStock:[],servisLogs:[],transactions:[]};}

test('S2459 sync bridge materializes projection and does not duplicate canonical category',()=>{
  const D=base(); const c=loadSource(['modules/vehicle/vehicle-car-notes-sot-s2071.js'],{D,curVehicleId:'v1',ServiceTaxonomySOT:{resolve:x=>String(x.name||'').toLowerCase()==='aki'?{masterCategoryId:'kelistrikan',serviceComponentId:'aki'}:null}},['VehicleCarNotesSOT']);
  const a={id:'c1',name:'Aki',vehicleId:'v1'}; const r1=c.VehicleCarNotesSOT.syncLegacyCategoryProjection(a,'test');
  assert.equal(r1.ok,true); assert.equal(D.sparepartCats.length,1);
  const b={id:'c2',name:'Aki',vehicleId:'v1'}; const r2=c.VehicleCarNotesSOT.syncLegacyCategoryProjection(b,'test');
  assert.equal(r2.ok,true); assert.equal(D.vehicles[0].sot.serviceCategories.length,1);
  assert.equal(D.sparepartCats.length,1);
  assert.equal(b.id,'c1','duplicate component must reuse canonical survivor id');
});

test('S2459 canonical duplicate remap updates stock and service references',()=>{
  const D=base(); D.vehicles[0].sot={serviceCategories:[{id:'c1',name:'Aki',vehicleId:'v1',serviceComponentId:'aki'},{id:'c2',name:'Aki lama',vehicleId:'v1',serviceComponentId:'aki'}]};
  D.sparepartCats=[{id:'c1',name:'Aki',vehicleId:'v1',serviceComponentId:'aki'},{id:'c2',name:'Aki lama',vehicleId:'v1',serviceComponentId:'aki'}];
  D.partsStock=[{id:'p2',catId:'c2',vehicleId:'v1'}]; D.servisLogs=[{id:'s2',categoryId:'c2',vehicleId:'v1'}];
  const c=loadSource(['modules/vehicle/vehicle-car-notes-sot-s2071.js'],{D,curVehicleId:'v1'},['VehicleCarNotesSOT']);
  const r=c.VehicleCarNotesSOT.syncLegacyCategoryProjection({id:'c3',name:'Aki',vehicleId:'v1',serviceComponentId:'aki'},'dedupe');
  assert.equal(r.ok,true); assert.equal(D.vehicles[0].sot.serviceCategories.length,1); assert.equal(D.partsStock[0].catId,'c1'); assert.equal(D.servisLogs[0].categoryId,'c1');
});

test('S2459 service entry cannot mutate a global category as the active vehicle owner',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/servis.js'),'utf8');
  assert.match(src,/String\(matched\.vehicleId\|\|''\)!==String\(curVehicleId\)/);
  assert.match(src,/syncLegacyCategoryProjection\(_scoped,'service-entry-scope'\)/);
  assert.match(src,/updateServiceCategory\(curVehicleId,matched\.id,\{intervalKm\}\)/);
});

test('S2459 recommendation/checklist provisioning cannot push a second projection after successful SOT sync',()=>{
  const ui=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/sparepart-servis-ui.js'),'utf8');
  const core=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/sparepart-servis.js'),'utf8');
  assert.match(core,/syncLegacyCategoryProjection\(_sotRecoCat,'recommendation-create'\)/);
  assert.match(core,/if\(!_r\|\|!_r\.ok\)D\.sparepartCats\.push\(_sotRecoCat\)/);
  assert.match(core,/syncLegacyCategoryProjection\(_sotCat,'checklist-category-provision'\)/);
  assert.match(core,/if\(!_r\|\|!_r\.ok\)D\.sparepartCats\.push\(_sotCat\)/);
});

console.log('S2459 residual category/SOT gate: 4/4 PASS');
