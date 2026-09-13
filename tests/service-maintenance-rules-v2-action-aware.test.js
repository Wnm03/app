'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function ctxWith(data, extra={}) {
  return loadSource([
    'modules/vehicle/servis-checklist.js',
    'car-notes.js',
    'modules/vehicle/sparepart-servis.js',
    'modules/vehicle/sparepart-servis-b.js'
  ], Object.assign({ D:data }, extra), [
    'SERVICE_MAINTENANCE_RULES','resolveMaintenanceRule','getMaintenanceSchedule',
    'hasMaintenanceReminderSchedule','computeServiceUrgency'
  ]);
}

test('maintenance rule v2: Vario 125 category resolves to KZR rule and exposes separate inspect/replace schedules', () => {
  const data = {
    vehicles:[{id:'v1',name:'Honda Vario 125',modelId:''}],
    sparepartCats:[{id:'c1',name:'V-Belt CVT',intervalKm:0,showInReminder:true}],
    servisLogs:[]
  };
  const ctx=ctxWith(data);
  const rule=ctx.resolveMaintenanceRule('v1',data.sparepartCats[0]);
  assert.ok(rule);
  assert.equal(rule.inspectKm,8000);
  assert.equal(rule.replaceKm,24000);
  assert.equal(ctx.hasMaintenanceReminderSchedule('v1',data.sparepartCats[0]),true);
});

test('maintenance rule v2: inspection is the first due action, replacement remains independent', () => {
  const data = {
    vehicles:[{id:'v1',name:'Honda Vario 125',modelId:''}],
    sparepartCats:[{id:'c1',name:'V-Belt CVT',intervalKm:0,showInReminder:true}],
    servisLogs:[]
  };
  const ctx=ctxWith(data, { getVehicleKm:()=>9000 });
  const u=ctx.computeServiceUrgency({vehicleId:'v1',cat:data.sparepartCats[0],curKm:9000,kmPerDay:null});
  assert.equal(u.nextAction,'periksa');
  assert.equal(u.intervalKm,8000);
  assert.equal(u.sisaKm,-1000);
  assert.equal(u.status,'lewat');
});

test('maintenance rule v2: after inspection at 8k, next inspection is 16k while replacement remains 24k', () => {
  const data = {
    vehicles:[{id:'v1',name:'Honda Vario 125',modelId:''}],
    sparepartCats:[{id:'c1',name:'V-Belt CVT',intervalKm:0,showInReminder:true}],
    servisLogs:[{id:'s1',vehicleId:'v1',date:'2026-01-01',item:'V-Belt CVT',categoryId:'c1',km:8000,actionType:'periksa'}]
  };
  const ctx=ctxWith(data);
  const u=ctx.computeServiceUrgency({vehicleId:'v1',cat:data.sparepartCats[0],curKm:16000,kmPerDay:null,nowISO:'2026-01-02'});
  assert.equal(u.nextAction,'periksa');
  assert.equal(u.intervalKm,8000);
  assert.equal(u.sisaKm,0);
});

test('maintenance rule v2: after replacement at 24k, inspection schedule can become the next actionable schedule', () => {
  const data = {
    vehicles:[{id:'v1',name:'Honda Vario 125',modelId:''}],
    sparepartCats:[{id:'c1',name:'V-Belt CVT',intervalKm:0,showInReminder:true}],
    servisLogs:[
      {id:'s1',vehicleId:'v1',date:'2026-01-01',item:'V-Belt CVT',categoryId:'c1',km:8000,actionType:'periksa'},
      {id:'s2',vehicleId:'v1',date:'2026-02-01',item:'V-Belt CVT',categoryId:'c1',km:24000,actionType:'ganti'}
    ]
  };
  const ctx=ctxWith(data);
  const u=ctx.computeServiceUrgency({vehicleId:'v1',cat:data.sparepartCats[0],curKm:16000,kmPerDay:null,nowISO:'2026-03-01'});
  assert.equal(u.nextAction,'periksa');
  assert.equal(u.intervalKm,8000);
  assert.equal(u.sisaKm,0);
});
