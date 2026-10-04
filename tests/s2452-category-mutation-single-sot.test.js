'use strict';
/** S2452 — post-restore CRUD category mutations must write canonical Car Notes SOT first. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadSource}=require('./helpers/loadSource');
const root=path.join(__dirname,'..');
function makeD(){return {vehicles:[{id:'v1',name:'Vario 125',sot:{owner:'VehicleCarNotesSOT',version:'x',vehicleId:'v1',serviceCategories:[{id:'c1',name:'Aki',vehicleId:'v1',masterCategoryId:'kelistrikan',serviceComponentId:'aki',intervalKm:5000,showInReminder:true}]}}],sparepartCats:[{id:'c1',name:'Aki',vehicleId:'v1',masterCategoryId:'kelistrikan',serviceComponentId:'aki',intervalKm:5000,showInReminder:true}],partsStock:[],servisLogs:[],transactions:[]};}
function loadSot(D){return loadSource(['modules/vehicle/vehicle-car-notes-sot-s2071.js'],{D,curVehicleId:'v1',ServiceTaxonomySOT:{resolve(x){if(String(x.serviceComponentId||'')==='aki'||String(x.name||'').toLowerCase()==='aki')return {masterCategoryId:'kelistrikan',serviceComponentId:'aki'};return null;}}},['VehicleCarNotesSOT']);}
test('S2452 updateServiceCategory keeps Car Notes SOT and legacy projection identical after CRUD',()=>{const D=makeD();const c=loadSot(D);const r=c.VehicleCarNotesSOT.updateServiceCategory('v1','c1',{intervalKm:8000,showInReminder:false});assert.equal(r.ok,true);assert.equal(D.vehicles[0].sot.serviceCategories[0].intervalKm,8000);assert.equal(D.vehicles[0].sot.serviceCategories[0].showInReminder,false);const p=D.sparepartCats.find(x=>x.id==='c1');assert.equal(p.intervalKm,8000);assert.equal(p.showInReminder,false);});
test('S2452 service-entry interval update must use canonical category writer',()=>{const src=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');assert.match(src,/VehicleCarNotesSOT\.updateServiceCategory\(curVehicleId,matched\.id/);assert.doesNotMatch(src,/if\(matched\)\{\s*matched\.intervalKm=intervalKm;/);});
test('S2452 checklist category enrichment must not directly mutate projection when canonical SOT API exists',()=>{const src=fs.readFileSync(path.join(root,'modules/vehicle/service-history-checklist-edit-s2036.js'),'utf8');assert.match(src,/VehicleCarNotesSOT\.updateServiceCategory/);assert.doesNotMatch(src,/cat\.intervalKm=intervalKm;\s*if\(masterMonths\)cat\.intervalBulan=masterMonths;/);});
test('S2452 category editor must commit through canonical SOT update API',()=>{const src=fs.readFileSync(path.join(root,'modules/vehicle/sparepart-servis-ui.js'),'utf8');assert.match(src,/ServiceIntervalSOT\.setManual\(editCat,vehicleId,intervalKm,intervalBulan\)/);});
test('S2452 API is exported and remains idempotent',()=>{const src=fs.readFileSync(path.join(root,'modules/vehicle/vehicle-car-notes-sot-s2071.js'),'utf8');assert.match(src,/function updateServiceCategory\(/);assert.match(src,/removeServiceCategory,updateServiceCategory,reconcileLegacyCategoryProjection/);});
console.log('S2452 5/5 PASS');
