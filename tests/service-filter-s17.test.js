const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const {readCarNotesSource}=require('./helpers/carNotesSource');
const car=readCarNotesSource();
const trend=fs.readFileSync(path.join(root,'modules/vehicle/vehicle-trend-api.js'),'utf8');

test('S17 Car Notes has cascading category -> component history filter',()=>{
  assert.match(car,/activeServiceComponentFilter:null/);
  assert.match(car,/setServiceComponentFilter\(id\)/);
  assert.match(car,/renderServiceComponentFilter\(beforeEl\)/);
  assert.match(car,/ServisChecklist\.itemsForMasterCategory\(mid\)/);
  // Updated (merged from PATCH-sesi-servis-actiontype-v3): the component filter now
  // goes through Servis.resolveLogServiceComponentId(s) -- a single resolver
  // (serviceComponentId SoT -> checklist[].itemId legacy fallback -> catalog infer)
  // -- instead of reading s.checklist directly, so entries valid without a checklist
  // payload (e.g. created from the reminder/modal flow) are matched correctly too.
  assert.match(car,/Servis\.activeServiceComponentFilter\|\|Servis\.resolveLogServiceComponentId\(s\)===Servis\.activeServiceComponentFilter/);
});

test('S17 category change clears component filter to prevent cross-category result',()=>{
  const i=car.indexOf('setMasterCategoryFilter(id){');
  assert.ok(i>=0);
  const chunk=car.slice(i,i+700);
  assert.match(chunk,/Servis\.activeServiceComponentFilter=null/);
});

test('S17 VehicleTrendAPI exposes component-aware service log filtering without changing SoT',()=>{
  assert.match(trend,/Array\.isArray\(l\.checklist\).*serviceComponentId/);
  assert.match(trend,/D\.servisLogs/);
});
