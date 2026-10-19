const test=require('node:test');
const assert=require('node:assert/strict');

test('S2169: stale root action cannot reset a component whose multi-component checklist action is missing',()=>{
  const {loadSource}=require('./helpers/loadSource');
  const cat={id:'cat-busi',name:'Busi',serviceComponentId:'busi',intervalKm:8000,showInReminder:true};
  const data={vehicles:[{id:'veh-1'}],sparepartCats:[cat],servisLogs:[]};
  const c=loadSource(['modules/vehicle/servis-checklist.js','car-notes.js','modules/vehicle/service-input-catalog.js','modules/vehicle/servis.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'],{D:data},['matchesActionTypeForReset']);
  const log={id:'ambiguous-checklist-action',vehicleId:'veh-1',categoryId:'cat-busi',serviceComponentId:'busi',actionType:'ganti',checklist:[
    {itemId:'busi',serviceComponentId:'busi',categoryId:'cat-busi'},
    {itemId:'filter-udara',serviceComponentId:'filter-udara',actionType:'periksa'}
  ]};
  assert.equal(c.matchesActionTypeForReset(log,cat,'ganti',true),false);
  assert.equal(c.matchesActionTypeForReset(log,cat,'periksa',true),false);
});

test('S2169: conflicting duplicate checklist actions are treated as ambiguous, not first-row-wins',()=>{
  const {loadSource}=require('./helpers/loadSource');
  const cat={id:'cat-busi',name:'Busi',serviceComponentId:'busi',intervalKm:8000,showInReminder:true};
  const data={vehicles:[{id:'veh-1'}],sparepartCats:[cat],servisLogs:[]};
  const c=loadSource(['modules/vehicle/servis-checklist.js','car-notes.js','modules/vehicle/service-input-catalog.js','modules/vehicle/servis.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'],{D:data},['matchesActionTypeForReset']);
  const log={id:'conflicting-checklist-actions',vehicleId:'veh-1',categoryId:'cat-busi',serviceComponentId:'busi',actionType:'ganti',checklist:[
    {itemId:'busi',serviceComponentId:'busi',categoryId:'cat-busi',actionType:'ganti'},
    {itemId:'busi',serviceComponentId:'busi',categoryId:'cat-busi',actionType:'periksa'}
  ]};
  assert.equal(c.matchesActionTypeForReset(log,cat,'ganti',true),false);
  assert.equal(c.matchesActionTypeForReset(log,cat,'periksa',true),false);
});
