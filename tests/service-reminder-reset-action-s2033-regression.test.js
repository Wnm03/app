'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function resetMatcherContext(){
  return loadSource(['modules/vehicle/servis-checklist.js','car-notes.js','modules/vehicle/service-input-catalog.js','modules/vehicle/servis.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'],{D:{vehicles:[],sparepartCats:[],servisLogs:[]}},['matchesActionTypeForReset','normalizeServiceActionType','isServiceIntervalResetAction']);
}
test('S2033 P1: periksa-conditional honors explicit periksa filter',()=>{
  const c=resetMatcherContext();
  const cat={actionMode:'periksa-conditional',gantiResetsInterval:false};
  for(const actionType of ['bersih','pasang','overhaul','setel']) assert.equal(c.matchesActionTypeForReset({actionType},cat,'periksa',true),false,actionType);
  assert.equal(c.matchesActionTypeForReset({actionType:'periksa'},cat,'periksa',true),true);
});
test('S2033 P1: conditional mode excludes ganti but does not suppress reset aliases when explicitly requested',()=>{
  const c=resetMatcherContext();
  const cat={actionMode:'periksa-conditional',gantiResetsInterval:false};
  assert.equal(c.matchesActionTypeForReset({actionType:'ganti'},cat,'ganti',true),false);
  assert.equal(c.matchesActionTypeForReset({actionType:'pasang'},cat,'ganti',true),true);
  assert.equal(c.matchesActionTypeForReset({actionType:'overhaul'},cat,'ganti',true),true);
});
test('S2033 legacy: aliases normalize and only replacement-family actions reset replacement age',()=>{
  global.D={vehicles:[{id:'v1',currentOdometer:30000,serviceMaintenanceProfile:{mode:'legacy'}}],servisLogs:[
    {id:'inspect',vehicleId:'v1',serviceComponentId:'filter-udara',actionType:'periksa',date:'2026-10-01',km:29000},
    {id:'install',vehicleId:'v1',serviceComponentId:'filter-udara',actionType:'pasang baru',date:'2026-09-01',km:28000}
  ]};
  delete require.cache[require.resolve('../modules/vehicle/service-legacy-maintenance.js')];
  const legacy=require('../modules/vehicle/service-legacy-maintenance.js');
  assert.equal(legacy.latestByAction('v1','filter-udara','ganti').id,'install');
  assert.equal(legacy.latestByAction('v1','filter-udara','periksa').id,'inspect');
  assert.equal(legacy.latestByAction('v1','filter-udara','bersih'),null);
  delete global.D;
});
