'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {loadSource}=require('./helpers/loadSource');

test('S2690: invalid odometer values are ignored and cannot poison maximum',()=>{
  const D={
    bbmLogs:[{vehicleId:'v1',km:'bad'},{vehicleId:'v1',km:''},{vehicleId:'v1',km:'21500'}],
    servisLogs:[{vehicleId:'v1',km:null},{vehicleId:'v1',km:-1}],
    kmLogs:[{vehicleId:'v1',km:22000},{vehicleId:'v2',km:99999}]
  };
  const c=loadSource(['modules/vehicle/vehicle-core.js'],{D},['getVehicleKm','getVehicleKmSource']);
  assert.equal(c.getVehicleKm('v1'),22000);
  assert.deepEqual(JSON.parse(JSON.stringify(c.getVehicleKmSource('v1'))),{km:22000,source:'manual'});
  assert.equal(c.getVehicleKm('v2'),99999);
});

test('S2690: empty odometer keeps legacy numeric fallback without treating invalid values as max',()=>{
  const D={bbmLogs:[{vehicleId:'v1',km:'NaN'}],servisLogs:[{vehicleId:'v1',km:undefined}],kmLogs:[]};
  const c=loadSource(['modules/vehicle/vehicle-core.js'],{D},['getVehicleKm','getVehicleKmSource']);
  assert.equal(c.getVehicleKm('v1'),0);
  assert.deepEqual(JSON.parse(JSON.stringify(c.getVehicleKmSource('v1'))),{km:0,source:null});
});

test('S2690: reminder mutation wraps every prompt in a guard-clearing finally',()=>{
  const s=fs.readFileSync('modules/vehicle/servis.js','utf8');
  const start=s.indexOf('async markServiced(catId,actionType,opts)');
  const end=s.indexOf('async markServicedBatch(items)',start);
  assert.ok(start>=0&&end>start);
  const body=s.slice(start,end);
  assert.match(body,/try\{\s*const _kmEvidence=typeof getVehicleKmSource/);
  assert.match(body,/\}finally\{\s*_clearMarkGuard\(\);\s*\}/);
});

test('S2690: reminder stock mutation is inside rollback boundary and rejected save fails closed',()=>{
  const s=fs.readFileSync('modules/vehicle/servis.js','utf8');
  const start=s.indexOf('async markServiced(catId,actionType,opts)');
  const end=s.indexOf('async markServicedBatch(items)',start);
  const body=s.slice(start,end);
  const stock=body.indexOf('StockCommandSOT.consume(');
  const guarded=body.lastIndexOf('try{',stock);
  const catchAt=body.indexOf('catch(_markSaveErr)',stock);
  assert.ok(stock>guarded&&catchAt>stock,'stock consume must be inside the mutation try/catch');
  assert.match(body,/if\(_saveAccepted===false\)throw new Error\('SERVICE_REMINDER_SAVE_REJECTED'\)/);
  assert.match(s,/if\(_batchSaveAccepted===false\)throw new Error\('SERVICE_BATCH_SAVE_REJECTED'\)/);
});

test('S2690: unknown odometer is stored as unknown and cannot create a false 0-km due baseline',()=>{
  const D={vehicles:[{id:'v1',name:'Motor',currentOdometer:null}],sparepartCats:[{id:'c1',name:'Filter',serviceComponentId:'filter',intervalKm:4000,intervalBulan:0,showInReminder:true}],servisLogs:[]};
  const c=loadSource(['modules/vehicle/servis-checklist.js','car-notes.js','modules/vehicle/service-input-catalog.js','modules/vehicle/servis.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'],{D},['buildServiceNextDueSnapshot']);
  const snap=c.buildServiceNextDueSnapshot({vehicleId:'v1',cat:D.sparepartCats[0],serviceKm:null,serviceDate:'2026-10-19',actionType:'ganti'});
  assert.equal(snap.nextDueKm,null);
  assert.equal(snap.nextDueAxis,'none');
});

test('S2690: reminder records unknown odometer explicitly instead of using getVehicleKm() zero fallback',()=>{
  const s=fs.readFileSync('modules/vehicle/servis.js','utf8');
  const start=s.indexOf('async markServiced(catId,actionType,opts)');
  const end=s.indexOf('async markServicedBatch(items)',start);
  const body=s.slice(start,end);
  assert.match(body,/const _kmEvidence=typeof getVehicleKmSource==='function'\?getVehicleKmSource\(curVehicleId\):null/);
  assert.match(body,/const curKm=_kmEvidence\?\(_kmEvidence\.source\?_kmEvidence\.km:null\):getVehicleKm\(curVehicleId\)/);
  assert.match(body,/odometer belum tercatat/);
});

test('S2690 runtime: rejected save rolls back event and releases guard; retry survives refresh failure after accepted save',async()=>{
  const cat={id:'c1',name:'Filter',serviceComponentId:'filter',intervalKm:4000,showInReminder:true};
  const D={vehicles:[{id:'v1',name:'Motor'}],sparepartCats:[cat],servisLogs:[],accounts:[],partsStock:[],bbmLogs:[],kmLogs:[],transactions:[]};
  let saveResult=false;let id=0;
  const g={
    D,curVehicleId:'v1',resolveReminderCategory:()=>cat,
    getVehicleKmSource:()=>({km:null,source:null}),getVehicleKm:()=>0,
    formatServiceDateOnly:()=> '2026-10-19',parseServiceDateOnly:()=>new Date('2026-10-19'),todayStr:()=> '2026-10-19',
    uid:()=>`service-${++id}`,save:()=>saveResult,toast:()=>{},findServiceEventByIdempotencyKey:()=>null,
    withServiceMutationLock:async fn=>fn(),FinanceTxSOT:{removeWhere(){return[];}},
    buildServiceNextDueSnapshot:()=>({nextDueKm:null,nextDueDate:null,nextDueAxis:'none'}),
    refreshCarNotesAfterMutation:()=>{throw new Error('simulated refresh failure');}
  };
  const c=loadSource(['modules/vehicle/servis.js'],g,['Servis']);
  await assert.rejects(c.Servis.markServiced('c1','periksa',{skipConfirm:true}),/SERVICE_REMINDER_SAVE_REJECTED/);
  assert.equal(D.servisLogs.length,0,'rejected save must not leave service event in memory');
  assert.equal(c.Servis._markServicedInFlight.size,0,'failed operation must release idempotency guard');
  saveResult=undefined;
  const entry=await c.Servis.markServiced('c1','periksa',{skipConfirm:true});
  assert.ok(entry&&entry.id,'retry should succeed after save accepts the mutation');
  assert.equal(D.servisLogs.length,1,'post-commit render failure must not roll back accepted domain mutation');
  assert.equal(c.Servis._markServicedInFlight.size,0,'successful retry must release guard');
  assert.equal(D.servisLogs[0].km,null,'unknown odometer must remain unknown, not be fabricated as 0 km');
});

test('S2690 runtime: stock consume exception rolls back service + finance and still restores stock',async()=>{
  const cat={id:'c1',name:'Roller',serviceComponentId:'roller',intervalKm:12000,showInReminder:true};
  const stock={id:'p1',name:'Roller stok',qty:2};
  const D={vehicles:[{id:'v1',name:'Motor'}],sparepartCats:[cat],servisLogs:[],accounts:[{id:'a1'}],partsStock:[stock],bbmLogs:[],kmLogs:[],transactions:[]};
  const finance={
    create(tx){D.transactions.push(tx);return tx;},
    removeWhere(predicate){const removed=[];for(let i=D.transactions.length-1;i>=0;i--)if(predicate(D.transactions[i]))removed.push(...D.transactions.splice(i,1));return removed;}
  };
  const stockSot={
    consume(id,qty){stock.qty-=qty;throw new Error('simulated stock consume failure');},
    setQtyMap(map){for(const [id,qty] of map){const row=D.partsStock.find(x=>x.id===id);if(row)row.qty=qty;}return{ok:true};}
  };
  const g={D,curVehicleId:'v1',resolveReminderCategory:()=>cat,getVehicleKmSource:()=>({km:12000,source:'manual'}),getVehicleKm:()=>12000,
    formatServiceDateOnly:()=> '2026-10-19',parseServiceDateOnly:()=>new Date('2026-10-19'),todayStr:()=> '2026-10-19',uid:(()=>{let n=0;return()=>`tx-${++n}`})(),
    save:()=>undefined,toast:()=>{},findServiceEventByIdempotencyKey:()=>null,withServiceMutationLock:async fn=>fn(),FinanceTxSOT:finance,StockCommandSOT:stockSot,
    buildServiceNextDueSnapshot:()=>({nextDueKm:24000,nextDueDate:null,nextDueAxis:'km'}),resolveVehicleTxCategory:()=> 'Servis'};
  const c=loadSource(['modules/vehicle/servis.js'],g,['Servis']);
  c.Servis._findAutoGantiStock=()=>stock;
  await assert.rejects(c.Servis.markServiced('c1','ganti',{skipConfirm:true,presetCost:100}),/simulated stock consume failure/);
  assert.equal(D.servisLogs.length,0,'service event must be rolled back');
  assert.equal(D.transactions.length,0,'linked finance transaction must be rolled back');
  assert.equal(stock.qty,2,'stock restoration must still be attempted after consume throws');
  assert.equal(c.Servis._markServicedInFlight.size,0,'guard must be cleared after mutation failure');
});

test('S2690 runtime: stock-render exception after accepted replacement does not roll back committed service',async()=>{
  const cat={id:'c1',name:'Roller',serviceComponentId:'roller',intervalKm:12000,showInReminder:true};
  const stock={id:'p1',name:'Roller stok',qty:2};
  const D={vehicles:[{id:'v1',name:'Motor'}],sparepartCats:[cat],servisLogs:[],accounts:[],partsStock:[stock],bbmLogs:[],kmLogs:[],transactions:[]};
  const stockSot={consume(id,qty){stock.qty-=qty;return{ok:true};},setQtyMap(map){for(const [id,qty] of map){const row=D.partsStock.find(x=>x.id===id);if(row)row.qty=qty;}return{ok:true};}};
  const g={D,curVehicleId:'v1',resolveReminderCategory:()=>cat,getVehicleKmSource:()=>({km:12000,source:'manual'}),getVehicleKm:()=>12000,
    formatServiceDateOnly:()=> '2026-10-19',parseServiceDateOnly:()=>new Date('2026-10-19'),todayStr:()=> '2026-10-19',uid:()=> 'service-committed',save:()=>undefined,toast:()=>{},
    findServiceEventByIdempotencyKey:()=>null,withServiceMutationLock:async fn=>fn(),FinanceTxSOT:{removeWhere(){return[];}},StockCommandSOT:stockSot,
    buildServiceNextDueSnapshot:()=>({nextDueKm:24000,nextDueDate:null,nextDueAxis:'km'}),Sparepart:{renderStockList(){throw new Error('simulated stock render failure');}}};
  const c=loadSource(['modules/vehicle/servis.js'],g,['Servis']);
  c.Servis._findAutoGantiStock=()=>stock;
  const entry=await c.Servis.markServiced('c1','ganti',{skipConfirm:true,presetCost:0});
  assert.equal(entry.id,'service-committed');
  assert.equal(D.servisLogs.length,1,'post-commit render failure must not roll back event');
  assert.equal(stock.qty,1,'successful replacement must retain stock consumption');
  assert.equal(c.Servis._markServicedInFlight.size,0,'guard must clear after post-commit render failure');
});

test('S2691: missing legacy action type is unknown and never inferred as replacement',()=>{
  const c=loadSource(['modules/vehicle/servis-checklist.js','car-notes.js','modules/vehicle/service-input-catalog.js','modules/vehicle/servis.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'],{D:{vehicles:[],sparepartCats:[],servisLogs:[]}},['normalizeServiceActionType','isServiceIntervalResetAction']);
  assert.equal(c.normalizeServiceActionType(null),'unknown');
  assert.equal(c.normalizeServiceActionType(undefined),'unknown');
  assert.equal(c.normalizeServiceActionType(''),'unknown');
  assert.equal(c.isServiceIntervalResetAction(null),false);
});

test('S2691: invalid or missing current odometer yields unknown reminder instead of fabricated 0-km baseline',()=>{
  const cat={id:'c1',name:'Filter',serviceComponentId:'filter',intervalKm:4000,intervalBulan:0,showInReminder:true};
  const D={vehicles:[{id:'v1',name:'Motor'}],sparepartCats:[cat],servisLogs:[{id:'inspect-1',vehicleId:'v1',categoryId:'c1',serviceComponentId:'filter',item:'Filter',km:18000,date:'2026-09-01',actionType:'periksa'}]};
  const c=loadSource(['modules/vehicle/servis-checklist.js','car-notes.js','modules/vehicle/service-input-catalog.js','modules/vehicle/servis.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'],{D},['computeServiceUrgency']);
  const result=c.computeServiceUrgency({vehicleId:'v1',cat,curKm:null,kmPerDay:null,nowISO:'2026-10-19'});
  assert.equal(result.status,'unknown');
  assert.equal(result.statusLabel,'Belum diketahui');
  assert.equal(result.sisaKm,null);
  assert.equal(result.nextDueKm,null);
});

test('S2691: no replacement history does not invent a 0-km baseline from inspection-only history',()=>{
  const cat={id:'c1',name:'Filter',serviceComponentId:'filter',intervalKm:4000,intervalBulan:0,showInReminder:true};
  const D={vehicles:[{id:'v1',name:'Motor'}],sparepartCats:[cat],servisLogs:[{id:'inspect-1',vehicleId:'v1',categoryId:'c1',serviceComponentId:'filter',item:'Filter',km:18000,date:'2026-09-01',actionType:'periksa'}]};
  const c=loadSource(['modules/vehicle/servis-checklist.js','car-notes.js','modules/vehicle/service-input-catalog.js','modules/vehicle/servis.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'],{D},['computeServiceUrgency']);
  const result=c.computeServiceUrgency({vehicleId:'v1',cat,curKm:18000,kmPerDay:null,nowISO:'2026-10-19'});
  assert.equal(result.status,'unknown');
  assert.equal(result.sisaKm,null);
  assert.equal(result.nextDueKm,null);
});

test('S2691: any negative remaining interval is overdue consistently; exact due boundary remains due',()=>{
  const c=loadSource(['modules/vehicle/servis-checklist.js','car-notes.js','modules/vehicle/service-input-catalog.js','modules/vehicle/servis.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'],{D:{vehicles:[],sparepartCats:[],servisLogs:[]}},['resolveServiceStatusMeta']);
  assert.equal(c.resolveServiceStatusMeta(-314/4000).code,'terlewat');
  assert.equal(c.resolveServiceStatusMeta(-1/4000).code,'terlewat');
  assert.equal(c.resolveServiceStatusMeta(0).code,'jatuh_tempo');
  assert.equal(c.resolveServiceStatusMeta(1/4000).code,'segera');
  assert.equal(c.resolveServiceStatusMeta(null).code,'unknown');
});

test('S2691: replacement above active odometer cannot become reminder baseline',()=>{
  const cat={id:'c1',name:'Roller',serviceComponentId:'roller',intervalKm:12000,intervalBulan:0,showInReminder:true};
  const D={vehicles:[{id:'v1',name:'Motor'}],sparepartCats:[cat],servisLogs:[{id:'future-replacement',vehicleId:'v1',categoryId:'c1',serviceComponentId:'roller',item:'Roller',km:17686,date:'2026-09-01',actionType:'ganti'}]};
  const c=loadSource(['modules/vehicle/servis-checklist.js','car-notes.js','modules/vehicle/service-input-catalog.js','modules/vehicle/servis.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'],{D},['computeServiceUrgency']);
  const result=c.computeServiceUrgency({vehicleId:'v1',cat,curKm:10000,kmPerDay:null,nowISO:'2026-10-19'});
  assert.equal(result.status,'unknown');
  assert.equal(result.lastKm,null);
  assert.equal(result.sisaKm,null);
  assert.equal(result.nextDueKm,null);
});

test('S2691: valid replacement interval uses exact due and overdue boundaries',()=>{
  const cat={id:'c1',name:'Filter',serviceComponentId:'filter',intervalKm:4000,intervalBulan:0,showInReminder:true};
  const D={vehicles:[{id:'v1',name:'Motor'}],sparepartCats:[cat],servisLogs:[{id:'replace-1',vehicleId:'v1',categoryId:'c1',serviceComponentId:'filter',item:'Filter',km:17686,date:'2026-09-01',actionType:'ganti'}]};
  const c=loadSource(['modules/vehicle/servis-checklist.js','car-notes.js','modules/vehicle/service-input-catalog.js','modules/vehicle/servis.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'],{D},['computeServiceUrgency']);
  const atDue=c.computeServiceUrgency({vehicleId:'v1',cat,curKm:21686,kmPerDay:null,nowISO:'2026-10-19'});
  assert.equal(atDue.nextDueKm,21686);
  assert.equal(atDue.status,'jatuh_tempo');
  const overdue=c.computeServiceUrgency({vehicleId:'v1',cat,curKm:22000,kmPerDay:null,nowISO:'2026-10-19'});
  assert.equal(overdue.nextDueKm,21686);
  assert.equal(overdue.sisaKm,-314);
  assert.equal(overdue.status,'terlewat');
});
