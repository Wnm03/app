'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadSource}=require('./helpers/loadSource');

function makeCtx(){
  const D={
    vehicles:[{id:'v1',name:'Vario 125'}],
    sparepartCats:[{
      id:'c-throttle',name:'Throttle Body (bersihkan)',
      masterCategoryId:'sistem-injeksi-pgmfi',serviceComponentId:'throttle-body',
      intervalKm:8000,intervalBulan:0,showInReminder:true
    }],
    servisLogs:[
      {id:'old',vehicleId:'v1',date:'2026-02-14',km:11644,categoryId:'c-throttle',masterCategoryId:'sistem-injeksi-pgmfi',serviceComponentId:'throttle-body',actionType:'bersih'},
      {id:'latest',vehicleId:'v1',date:'2026-09-24',km:20237,categoryId:'c-throttle',masterCategoryId:'sistem-injeksi-pgmfi',serviceComponentId:'throttle-body',actionType:'bersih',sessionId:'sess-latest'}
    ],
    partsStock:[],transactions:[],accounts:[]
  };
  return loadSource([
    'modules/vehicle/service-input-catalog.js',
    'modules/vehicle/service-history-reminder-reconciliation-sot.js',
    'modules/vehicle/sparepart-servis.js',
    'modules/vehicle/sparepart-servis-b.js'
  ],{
    D,curVehicleId:'v1',
    MY_WRENCH:{minLbft:10,maxLbft:10},
    findTorsiDb:()=>({id:'vario-125'}),
    SERVICE_MAINTENANCE_RULES:{
      'throttle-body':{inspectKm:12000,inspectAction:'bersih',maintenanceType:'periodic'}
    },
    Servis:{
      getLastServiceKmForCat(vehicleId,cat,filter){
        const rows=(D.servisLogs||[]).filter(s=>s.vehicleId===vehicleId&&s.categoryId===cat.id&&(!filter||(s.actionType||'ganti')===filter));
        rows.sort((a,b)=>new Date(b.date)-new Date(a.date)||Number(b.km||0)-Number(a.km||0));
        return rows[0]?.km??null;
      }
    },
    estimateServiceDateISO:()=>null
  });
}

test('S2012 regression: clean-only component interval resets from latest bersih, not a phantom ganti axis',()=>{
  const ctx=makeCtx();
  const cat=ctx.D.sparepartCats[0];
  const schedule=ctx.getMaintenanceSchedule('v1',cat);
  assert.equal(schedule.inspectKm,8000);
  assert.equal(schedule.inspectAction,'bersih');
  assert.equal(schedule.replaceKm,null);
  const u=ctx.computeServiceUrgency({vehicleId:'v1',cat,curKm:20237,kmPerDay:34.5});
  assert.equal(u.lastKm,20237);
  assert.equal(u.nextDueKm,28237);
  assert.equal(u.sisaKm,8000);
  assert.equal(u.status,'aman');
  assert.equal(u.nextAction,'bersih');
});

test('S2012 regression: component-scoped reminder navigation carries session + component identity into History',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../modules/vehicle/servis.js'),'utf8');
  const start=src.indexOf('openHistoryFromReminder(categoryId,componentId){');
  const end=src.indexOf('\nrenderServiceComponentFilter(beforeEl){',start);
  assert.ok(start>=0&&end>start);
  const fn=src.slice(start,end);
  assert.match(fn,/Servis\.serviceHistorySessionFilter='';/);
  assert.match(fn,/Servis\.serviceHistoryComponentFilter=String\(componentId\|\|''\);/);
  assert.match(fn,/Servis\.openModal\(target\.id\);/);
  assert.match(fn,/Servis\.setEditTab\('history'\);/);
});

test('S2012 regression: History presenter filters the displayed rows by the selected component identity',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../modules/vehicle/servis.js'),'utf8');
  const start=src.indexOf('renderEditHistoryTab(){');
  const end=src.indexOf('\ncreateHistoryAuditPackage(){',start);
  assert.ok(start>=0&&end>start);
  const fn=src.slice(start,end);
  assert.match(fn,/effectiveComponentFilter/);
  assert.match(fn,/Servis\.resolveLogServiceComponentId\(log\)/);
});

test('S2012 bundle parity: production bundle contains both component-reminder and history-focus fixes',()=>{
  const bundle=fs.readFileSync(path.join(__dirname,'../app-bundle-b.min.js'),'utf8');
  assert.match(bundle,/inspectAction=schedule\.inspectAction\|\|'periksa'/);
  assert.match(bundle,/serviceHistorySessionFilter=''/);
  assert.match(bundle,/serviceHistoryComponentFilter=String\(componentId\|\|''\)/);
});

test('S2013 regression: vehicle interval override stays on inspect axis for clean-only registry components',()=>{
  const ctx=makeCtx();
  ctx.D.vehicles[0].intervalOverrides={"c-throttle":5000};
  const cat=ctx.D.sparepartCats[0];
  const schedule=ctx.getMaintenanceSchedule('v1',cat);
  assert.equal(schedule.inspectKm,5000);
  assert.equal(schedule.replaceKm,null);
  const u=ctx.computeServiceUrgency({vehicleId:'v1',cat,curKm:20237,kmPerDay:34.5});
  assert.equal(u.lastKm,20237);
  assert.equal(u.nextDueKm,25237);
  assert.equal(u.nextAction,'bersih');
});

test('S2013 regression: service next-due snapshot follows clean-only action axis and vehicle override',()=>{
  const ctx=makeCtx();
  ctx.D.vehicles[0].intervalOverrides={"c-throttle":5000};
  const cat=ctx.D.sparepartCats[0];
  const snap=ctx.buildServiceNextDueSnapshot({vehicleId:'v1',cat,serviceKm:20237,serviceDate:'2026-09-24',actionType:'bersih'});
  assert.equal(snap.nextDueKm,25237);
  assert.equal(snap.intervalKmAtService,5000);
  assert.equal(snap.nextDueAxis,'km');
});
