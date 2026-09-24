'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadSource}=require('./helpers/loadSource');
const ROOT=path.join(__dirname,'..');

test('S2005 SOT: canonical component wins over stale top-level identity when checklist row matches',()=>{
  const S=require('../modules/vehicle/service-history-reminder-reconciliation-sot.js');
  global.ServiceInputCatalog={itemById:id=>id==='throttle-body'?{item:{id:'throttle-body',masterCategoryId:'sistem-injeksi-pgmfi'},group:{masterCategoryId:'sistem-injeksi-pgmfi'}}:null,infer:()=>null};
  const cat={id:'cat-tb',name:'Throttle Body (bersihkan)',masterCategoryId:'sistem-injeksi-pgmfi',serviceComponentId:'throttle-body'};
  const log={id:'new',vehicleId:'v1',serviceComponentId:'legacy-throttle',masterCategoryId:'legacy',item:'Servis sesi',checklist:[{itemId:'throttle-body',serviceComponentId:'throttle-body',masterCategoryId:'sistem-injeksi-pgmfi',itemName:'Throttle Body (bersihkan)'}]};
  const r=S.match(log,cat,{vehicleId:'v1'});
  assert.equal(r.ok,true); assert.equal(r.code,S.CODES.CHECKLIST_MATCH); assert.equal(r.sourceHistoryId,'new');
  delete global.ServiceInputCatalog;
});

test('S2005 SOT: canonical mismatch is not rescued by fuzzy text',()=>{
  const S=require('../modules/vehicle/service-history-reminder-reconciliation-sot.js');
  global.ServiceInputCatalog={itemById:id=>({item:{id,masterCategoryId:'m1'},group:{masterCategoryId:'m1'}}),infer:()=>null};
  const r=S.match({id:'x',vehicleId:'v1',serviceComponentId:'injector',item:'Throttle Body (bersihkan)'},{id:'cat',name:'Throttle Body (bersihkan)',masterCategoryId:'m1',serviceComponentId:'throttle-body'},{vehicleId:'v1'});
  assert.equal(r.ok,false); assert.equal(r.code,S.CODES.COMPONENT_MISMATCH);
  delete global.ServiceInputCatalog;
});

test('S2005 SOT: vehicle isolation is enforced',()=>{
  const S=require('../modules/vehicle/service-history-reminder-reconciliation-sot.js');
  const r=S.match({id:'x',vehicleId:'v2',serviceComponentId:'throttle-body'},{vehicleId:'v1',serviceComponentId:'throttle-body'},{vehicleId:'v2'});
  assert.equal(r.ok,false); assert.equal(r.code,S.CODES.VEHICLE_MISMATCH);
});

test('S2005 SOT: latest uses one deterministic recency rule',()=>{
  const S=require('../modules/vehicle/service-history-reminder-reconciliation-sot.js');
  const logs=[
    {id:'old',vehicleId:'v1',serviceComponentId:'throttle-body',date:'2026-02-14',km:11644},
    {id:'new',vehicleId:'v1',serviceComponentId:'throttle-body',date:'2026-09-24',km:20237}
  ];
  const r=S.latest(logs,{vehicleId:'v1',serviceComponentId:'throttle-body'},{vehicleId:'v1'});
  assert.equal(r.id,'new');
});

test('S2005 integration: exact screenshot pattern resets Throttle Body at 20.237 km',()=>{
  const data={
    vehicles:[{id:'v1',name:'Motor Umum',modelId:''}],
    sparepartCats:[{id:'cat-tb',name:'Throttle Body (bersihkan)',masterCategoryId:'sistem-injeksi-pgmfi',serviceComponentId:'throttle-body',intervalKm:8000,showInReminder:true,actionMode:'bersih',resetType:'km'}],
    servisLogs:[
      {id:'old',vehicleId:'v1',date:'2026-02-14',item:'Throttle Body (bersihkan)',categoryId:'cat-tb',masterCategoryId:'sistem-injeksi-pgmfi',serviceComponentId:'throttle-body',km:11644,actionType:'bersih'},
      {id:'new',vehicleId:'v1',date:'2026-09-24',item:'Sesi servis',categoryId:null,masterCategoryId:'legacy',serviceComponentId:'legacy-throttle',km:20237,actionType:'bersih',checklist:[{itemId:'throttle-body',serviceComponentId:'throttle-body',masterCategoryId:'sistem-injeksi-pgmfi',itemName:'Throttle Body (bersihkan)',actionType:'bersih'}]}
    ]
  };
  const c=loadSource([
    'modules/vehicle/service-history-reminder-reconciliation-sot.js',
    'modules/vehicle/service-input-catalog.js',
    'modules/vehicle/servis-checklist.js',
    'car-notes.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'
  ],{D:data},['computeServiceUrgency','servisLogMatchesCat']);
  const u=c.computeServiceUrgency({vehicleId:'v1',cat:data.sparepartCats[0],curKm:20237,kmPerDay:null,nowISO:'2026-09-24'});
  assert.equal(u.lastKm,20237);
  assert.equal(u.nextDueKm,28237);
  assert.equal(u.sisaKm,8000);
  assert.equal(u.status,'aman');
  assert.equal(u.sourceHistoryId,'new');
  assert.equal(u.reconciliationCode,'CHECKLIST_CANONICAL_MATCH');
});

test('S2005 source wiring: reminder matcher delegates to reconciliation SOT with legacy fallback retained',()=>{
  const src=fs.readFileSync(path.join(ROOT,'modules/vehicle/sparepart-servis.js'),'utf8');
  assert.match(src,/ServiceHistoryReminderReconciliationSOT\.match\(s,cat/);
  assert.match(src,/function servisLogMatchesCat\(s,cat\)/);
  assert.match(src,/if\(typeof ServiceHistoryReminderReconciliationSOT!=='undefined'/);
});

test('S2005 source wiring: maintenance engine uses the same latest-history SOT',()=>{
  const src=fs.readFileSync(path.join(ROOT,'modules/vehicle/service-maintenance-engine.js'),'utf8');
  assert.match(src,/ServiceHistoryReminderReconciliationSOT\.latest/);
});

test('S2005 build manifest loads reconciliation SOT before reminder consumer',()=>{
  const src=fs.readFileSync(path.join(ROOT,'scripts/build.js'),'utf8');
  const a=src.indexOf("'modules/vehicle/service-history-reminder-reconciliation-sot.js'");
  const b=src.indexOf("'modules/vehicle/sparepart-servis.js'");
  assert.ok(a>=0&&b>a);
});
