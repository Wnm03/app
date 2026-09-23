'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');

test('reminder package delegates lifecycle and blocks terminal reopen',()=>{
  global.D={serviceReminderPackages:[{id:'r1',vehicleId:'v1',status:'COMPLETED',targets:[{serviceComponentId:'c1'}],checklist:[]}]};
  global.ReminderLifecycle=require(path.join(ROOT,'modules/vehicle/reminder-lifecycle.js'));
  delete require.cache[require.resolve(path.join(ROOT,'modules/vehicle/service-reminder-package-sot.js'))];
  global.ServiceReminderPackageSOT=require(path.join(ROOT,'modules/vehicle/service-reminder-package-sot.js'));
  const r=global.ServiceReminderPackageSOT.transition('r1','ACTIVE');
  assert.equal(r.ok,false); assert.equal(r.code,'completed_cannot_reopen');
});

test('reminder package cannot complete from unrelated same-vehicle history',()=>{
  global.D={serviceReminderPackages:[{id:'r1',vehicleId:'v1',status:'ACTIVE',targets:[{serviceComponentId:'c1'}],checklist:[]}] ,servisLogs:[{id:'s1',vehicleId:'v1',checklist:[{serviceComponentId:'c2'}]}]};
  global.ServiceReminderPackageSOT=require(path.join(ROOT,'modules/vehicle/service-reminder-package-sot.js'));
  const r=global.ServiceReminderPackageSOT.completeFromHistory('r1',['s1']);
  assert.equal(r.ok,false); assert.equal(r.code,'history_target_mismatch');
  assert.equal(global.D.serviceReminderPackages[0].status,'ACTIVE');
});

test('reminder package completes only when every target is covered',()=>{
  global.D={serviceReminderPackages:[{id:'r1',vehicleId:'v1',status:'ACTIVE',targets:[{serviceComponentId:'c1'},{serviceComponentId:'c2'}],checklist:[]}],servisLogs:[{id:'s1',vehicleId:'v1',checklist:[{serviceComponentId:'c1'},{serviceComponentId:'c2'}]}]};
  global.ServiceReminderPackageSOT=require(path.join(ROOT,'modules/vehicle/service-reminder-package-sot.js'));
  const r=global.ServiceReminderPackageSOT.completeFromHistory('r1',['s1']);
  assert.equal(r.ok,true); assert.equal(global.D.serviceReminderPackages[0].status,'COMPLETED');
});

test('ServiceEventLifecycle persists normalized unified event after committed mutation',()=>{
  let saves=0;
  global.save=()=>{saves++};
  global.ServiceEventSOT={normalize:(s)=>{s.serviceEventSotVersion='TEST';return{ok:true,changed:true,record:s}}};
  global.AIBus={emit(){}}; global.window=global;
  delete require.cache[require.resolve(path.join(ROOT,'modules/vehicle/service-event-lifecycle.js'))];
  require(path.join(ROOT,'modules/vehicle/service-event-lifecycle.js'));
  const s={id:'s1',vehicleId:'v1'}; global.ServiceEventLifecycle.create(s);
  assert.equal(s.serviceEventSotVersion,'TEST'); assert.equal(saves,1);
});

test('maintenanceHealth marks KM-due component as JATUH_TEMPO',()=>{
  global.D={servisLogs:[{id:'s1',vehicleId:'v1',date:'2026-01-01',km:1000,nextDueKm:2000,checklist:[{serviceComponentId:'c1',itemName:'Oli',conditionResult:'baik'}]}]};
  global.getVehicleKm=()=>2500;
  global.ServiceMasterDB={getComponentSync:()=>null};
  delete require.cache[require.resolve(path.join(ROOT,'modules/vehicle/service-event-sot.js'))];
  const sot=require(path.join(ROOT,'modules/vehicle/service-event-sot.js'));
  const r=sot.maintenanceHealth('v1');
  assert.equal(r.components[0].status,'JATUH_TEMPO');
});

test('legacy service contracts remain present after cumulative recovery',()=>{
  const servis=require('fs').readFileSync(path.join(ROOT,'modules/vehicle/servis.js'),'utf8');
  const checklist=require('fs').readFileSync(path.join(ROOT,'modules/vehicle/servis-checklist.js'),'utf8');
  for(const name of ['syncServiceFormFromChecklist','syncChecklistFromServiceForm','onServiceConditionNoteChange','renderEditHistoryTab','resolveServiceSOT','validateServiceSOTIntegrity']) assert.match(servis,new RegExp('(?:^|\\n)'+name+'\\('));
  for(const name of ['setActionTypeByItemId','setConditionResultByItemId','setConditionNoteByItemId','findCheckedItemForService']) assert.match(checklist,new RegExp(name+'\\('));
});
