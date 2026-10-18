'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function resetMatcherContext(){
  return loadSource(['modules/vehicle/servis-checklist.js','car-notes.js','modules/vehicle/service-input-catalog.js','modules/vehicle/servis.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'],{D:{vehicles:[],sparepartCats:[],servisLogs:[]}},['matchesActionTypeForReset','normalizeServiceActionType','isServiceIntervalResetAction','resolveResetActionTypeFilter']);
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

test('S2040 root fix: canonical component master overrides stale category action policy',()=>{
  const c=resetMatcherContext();
  const oli={serviceComponentId:'oli-mesin',actionMode:'periksa-conditional',gantiResetsInterval:false};
  assert.equal(c.getEffectiveActionMode(oli),'periksa-conditional');
  assert.equal(c.getEffectiveGantiResetsInterval(oli),true,'master explicitly says replacing oil resets its interval');
  assert.equal(c.resolveResetActionTypeFilter(oli),'ganti','stale category false must not pin reminder to inspection history');
  assert.equal(c.matchesActionTypeForReset({actionType:'ganti'},oli,'ganti',true),true);

  const brake={serviceComponentId:'kampas-rem-depan',actionMode:'periksa-conditional',gantiResetsInterval:true};
  assert.equal(c.getEffectiveGantiResetsInterval(brake),false,'master explicitly says brake pad age is condition-based');
  assert.equal(c.resolveResetActionTypeFilter(brake),'periksa','stale category true must not turn inspection into replacement reset');
});

test('S2039: conditional category follows explicit replacement-reset policy',()=>{
  const c=resetMatcherContext();
  assert.equal(c.resolveResetActionTypeFilter({actionMode:'periksa-conditional',gantiResetsInterval:true}),'ganti');
  assert.equal(c.resolveResetActionTypeFilter({actionMode:'periksa-conditional',gantiResetsInterval:false}),'periksa');
  assert.equal(c.resolveResetActionTypeFilter({actionMode:'periksa-conditional'}),'periksa');
});

test('S2039: replacement baseline ignores clean and inspection condition outcomes when replacement reset is enabled',()=>{
  const c=resetMatcherContext();
  const cat={actionMode:'periksa-conditional',gantiResetsInterval:true};
  const filter=c.resolveResetActionTypeFilter(cat);
  assert.equal(filter,'ganti');
  assert.equal(c.matchesActionTypeForReset({actionType:'ganti',conditionResult:'baik'},cat,filter,true),true);
  for(const row of [
    {actionType:'bersih'},
    {actionType:'periksa',conditionResult:'baik'},
    {actionType:'periksa',conditionResult:'mulai-aus'},
    {actionType:'periksa',conditionResult:'aus'}
  ]) assert.equal(c.matchesActionTypeForReset(row,cat,filter,true),false,JSON.stringify(row));
});
