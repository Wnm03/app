const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const car=fs.readFileSync(path.join(root,'car-notes.js'),'utf8');
const trend=fs.readFileSync(path.join(root,'modules/vehicle/vehicle-trend-api.js'),'utf8');

test('S17 Car Notes has cascading category -> component history filter',()=>{
  assert.match(car,/activeServiceComponentFilter:null/);
  assert.match(car,/setServiceComponentFilter\(id\)/);
  assert.match(car,/renderServiceComponentFilter\(beforeEl\)/);
  assert.match(car,/ServisChecklist\.itemsForMasterCategory\(mid\)/);
  assert.match(car,/Array\.isArray\(s\.checklist\)&&s\.checklist\.some\(r=>r&&r\.itemId===Servis\.activeServiceComponentFilter\)/);
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
