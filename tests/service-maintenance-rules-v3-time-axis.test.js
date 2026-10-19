'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function ctxWith(data){return loadSource(['modules/vehicle/servis-checklist.js','car-notes.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'],{D:data},['SERVICE_MAINTENANCE_RULES','resolveMaintenanceRule','getMaintenanceSchedule','computeServiceUrgency']);}
test('maintenance rule v3: tire-pressure inspection keeps day and KM axes without fake values',()=>{
 const d={vehicles:[{id:'v1',name:'Honda Vario 125',modelId:''}],sparepartCats:[{id:'c1',name:'Ban Depan',intervalKm:0,showInReminder:true}],servisLogs:[]};
 const c=ctxWith(d); const s=c.getMaintenanceSchedule('v1',d.sparepartCats[0]);
 assert.equal(s.inspectDays,14); assert.equal(s.inspectKm,4000); assert.equal(s.maintenanceType,'periodic');
});
test('maintenance rule v3: combined tire reminder is actionable without requiring kmPerDay',()=>{
 const d={vehicles:[{id:'v1',name:'Honda Vario 125',modelId:''}],sparepartCats:[{id:'c1',name:'Ban Depan',intervalKm:0,showInReminder:true}],servisLogs:[]};
 const c=ctxWith(d); const u=c.computeServiceUrgency({vehicleId:'v1',cat:d.sparepartCats[0],curKm:1000,kmPerDay:null,nowISO:'2026-09-12',historyRows:d.servisLogs});
 assert.equal(u.nextAction,'periksa'); assert.equal(u.intervalKm,4000); assert.equal(u.intervalHari,14); assert.equal(u.status,'unknown'); assert.equal(u.sisaKm,null); assert.equal(u.sisaHari,null);
});
test('maintenance rule v3: a prior inspection advances the day baseline',()=>{
 const d={vehicles:[{id:'v1',name:'Honda Vario 125',modelId:''}],sparepartCats:[{id:'c1',name:'Ban Depan',intervalKm:0,showInReminder:true}],servisLogs:[{id:'s1',vehicleId:'v1',date:'2026-09-01',item:'Ban Depan',categoryId:'c1',km:9000,actionType:'periksa'}]};
 const c=ctxWith(d); const u=c.computeServiceUrgency({vehicleId:'v1',cat:d.sparepartCats[0],curKm:10000,kmPerDay:null,nowISO:'2026-09-12',historyRows:d.servisLogs});
 assert.equal(u.sisaHari,3); assert.equal(u.nextAction,'periksa');
});
