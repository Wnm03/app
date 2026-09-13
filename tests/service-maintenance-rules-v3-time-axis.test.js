'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function ctxWith(data){return loadSource(['modules/vehicle/servis-checklist.js','car-notes.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'],{D:data},['SERVICE_MAINTENANCE_RULES','resolveMaintenanceRule','getMaintenanceSchedule','computeServiceUrgency']);}
test('maintenance rule v3: day axis is exposed for tire-pressure inspection',()=>{
 const d={vehicles:[{id:'v1',name:'Honda Vario 125',modelId:''}],sparepartCats:[{id:'c1',name:'Ban Depan',intervalKm:0,showInReminder:true}],servisLogs:[]};
 const c=ctxWith(d); const s=c.getMaintenanceSchedule('v1',d.sparepartCats[0]);
 assert.equal(s.inspectDays,14); assert.equal(s.maintenanceType,'periodic');
});
test('maintenance rule v3: day-only reminder is actionable without fake KM interval',()=>{
 const d={vehicles:[{id:'v1',name:'Honda Vario 125',modelId:''}],sparepartCats:[{id:'c1',name:'Ban Depan',intervalKm:0,showInReminder:true}],servisLogs:[]};
 const c=ctxWith(d); const u=c.computeServiceUrgency({vehicleId:'v1',cat:d.sparepartCats[0],curKm:10000,kmPerDay:null,nowISO:'2026-09-12'});
 assert.equal(u.nextAction,'periksa'); assert.equal(u.intervalKm,null); assert.equal(u.intervalHari,14); assert.equal(u.sisaHari,14); assert.equal(u.limitingAxis,'hari'); assert.equal(u.status,'aman');
});
test('maintenance rule v3: a prior inspection advances the day baseline',()=>{
 const d={vehicles:[{id:'v1',name:'Honda Vario 125',modelId:''}],sparepartCats:[{id:'c1',name:'Ban Depan',intervalKm:0,showInReminder:true}],servisLogs:[{id:'s1',vehicleId:'v1',date:'2026-09-01',item:'Ban Depan',categoryId:'c1',km:9000,actionType:'periksa'}]};
 const c=ctxWith(d); const u=c.computeServiceUrgency({vehicleId:'v1',cat:d.sparepartCats[0],curKm:10000,kmPerDay:null,nowISO:'2026-09-12'});
 assert.equal(u.sisaHari,3); assert.equal(u.nextAction,'periksa');
});
