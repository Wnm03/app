'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function loadGuidance(){
  const ctx={console,window:{},D:{servisLogs:[]}};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','modules/vehicle/service-maintenance-guidance.js'),'utf8')+'\nthis.api={SERVICE_CONDITION_RESULTS,recommendServiceAction,auditServiceMaintenanceIntegrity,summarizeServiceHistory,isServiceComponentNotApplicable};',ctx);
  return ctx.api;
}

test('S1811 condition results are canonical and recommendation remains manual',()=>{
  const {SERVICE_CONDITION_RESULTS,recommendServiceAction}=loadGuidance();
  assert.deepEqual(Array.from(SERVICE_CONDITION_RESULTS,x=>x.id),['baik','mulai-aus','aus','rusak']);
  const item={id:'kampas-rem-depan',actionMode:'periksa-conditional'};
  assert.equal(recommendServiceAction({item,conditionResult:'aus'}).action,'ganti');
  assert.equal(recommendServiceAction({item,conditionResult:'baik'}).action,'periksa');
});

test('S1811 history separates inspected/replaced/cleaned',()=>{
  const ctx={console,window:{},D:{servisLogs:[
    {id:'1',vehicleId:'v1',date:'2026-01-01',km:1000,serviceComponentId:'x',actionType:'ganti'},
    {id:'2',vehicleId:'v1',date:'2026-03-01',km:2000,serviceComponentId:'x',actionType:'periksa',conditionResult:'mulai-aus'},
    {id:'3',vehicleId:'v1',date:'2026-02-01',km:1500,serviceComponentId:'x',actionType:'bersih'}
  ]}};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','modules/vehicle/service-maintenance-guidance.js'),'utf8')+'\nthis.x=summarizeServiceHistory("v1",{serviceComponentId:"x"});',ctx);
  assert.equal(ctx.x.lastInspected.id,'2');
  assert.equal(ctx.x.lastReplaced.id,'1');
  assert.equal(ctx.x.lastCleaned.id,'3');
  assert.equal(ctx.x.lastInspected.conditionResult,'mulai-aus');
});

test('S1811 latest not-applicable suppresses only until a later actual service',()=>{
  const ctx={console,window:{},D:{servisLogs:[
    {id:'1',vehicleId:'v1',date:'2026-03-01',km:2000,checklistNotApplicable:['x'],checklist:[]},
  ]}};
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname,'..','modules/vehicle/service-maintenance-guidance.js'),'utf8')+'\nthis.a=isServiceComponentNotApplicable("v1","x");',ctx); assert.equal(ctx.a,true);
  ctx.D.servisLogs.push({id:'2',vehicleId:'v1',date:'2026-04-01',km:3000,serviceComponentId:'x',actionType:'periksa',checklist:[{itemId:'x',actionType:'periksa'}]});
  vm.runInContext('this.b=isServiceComponentNotApplicable("v1","x");',ctx); assert.equal(ctx.b,false);
});

test('S1811 audit catches generic brake and invalid history linkage',()=>{
  const {auditServiceMaintenanceIntegrity}=loadGuidance();
  const r=auditServiceMaintenanceIntegrity({
    groups:[{items:[{id:'kampas-rem-depan',name:'Kampas Rem Depan',actionMode:'periksa-conditional'},{id:'kampas-rem-belakang',name:'Kampas Rem Belakang',actionMode:'periksa-conditional'}]}],
    sparepartCats:[{id:'g',name:'Kampas Rem'},{id:'x',serviceComponentId:'missing'}],
    servisLogs:[{id:'h',item:'Pembersihan Rem',serviceComponentId:'missing'}]
  });
  assert.equal(r.ok,false); assert.ok(r.genericBrakeDuplicates.length); assert.ok(r.orphanCategories.length); assert.ok(r.unknownHistoryComponents.length); assert.ok(r.legacyActionNames.length);
});

test('S1811 UI contracts expose date reminder, manual picker, result and per-component notes',()=>{
  const servis=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/servis.js'),'utf8');
  const servisB=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/servis-b.js'),'utf8');
  const servisAll=servis+'\n'+servisB;
  const modal=fs.readFileSync(path.join(__dirname,'..','modules/shared/modals.js'),'utf8');
  assert.match(servisAll,/intervalBulan>0/);
  assert.match(servisAll,/Servis\.chooseReminderAction/);
  assert.match(servisAll,/serviceConditionLabel/);
  assert.match(servisAll,/Terakhir diperiksa/);
  assert.match(servisAll,/Terakhir diganti/);
  assert.match(modal,/id=\\"servisConditionResult\\"/);
  assert.match(servisAll,/conditionResult/);
  assert.match(servisAll,/conditionNote/);
  assert.match(servisAll,/checklistNotApplicable/);
});
