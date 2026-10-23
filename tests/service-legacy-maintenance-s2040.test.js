'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function load(){
 const ctx={console,Date,Math,Number,String,Object,Array,JSON,Set};ctx.window=ctx;ctx.globalThis=ctx;
 ctx.D={vehicles:[{id:'old-1',currentOdometer:20237,serviceMaintenanceProfile:{mode:'legacy'}}],servisLogs:[
  {id:'svc-oli',vehicleId:'old-1',serviceComponentId:'oli-mesin',actionType:'ganti',km:18554,date:'2026-08-13'},
  {id:'svc-busi',vehicleId:'old-1',serviceComponentId:'busi',actionType:'periksa',km:16000,date:'2026-06-01'}
 ],kmLogs:[]};
 ctx.SERVICE_MAINTENANCE_RULES={
  'oli-mesin':{replaceKm:4000,replaceAction:'ganti',maintenanceType:'periodic'},
  'busi':{inspectKm:4000,inspectAction:'periksa',replaceKm:8000,replaceAction:'ganti',maintenanceType:'periodic'}
 };
 ctx.getMaintenanceActionPlan=function(r){const o=[];if(r.inspectKm)o.push({axis:'inspect',action:r.inspectAction,intervalKm:r.inspectKm});if(r.replaceKm)o.push({axis:'replace',action:r.replaceAction,intervalKm:r.replaceKm});return o;};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('modules/vehicle/service-legacy-maintenance.js','utf8'),ctx,{filename:'service-legacy-maintenance.js'});return ctx;
}
test('S2040 legacy profile uses actual last service, not KPB milestone',()=>{
 const c=load();const r=c.ServiceLegacyMaintenance.evaluateComponent('old-1','oli-mesin');
 assert.equal(r.status,'NOT_DUE');assert.equal(r.states[0].nextDueKm,22554);assert.equal(r.states[0].remainingKm,2317);
 assert.equal(Object.prototype.hasOwnProperty.call(r,'kpb'),false);
});
test('S2040 missing action history requires baseline instead of inventing due date',()=>{
 const c=load();const r=c.ServiceLegacyMaintenance.evaluateComponent('old-1','busi');
 assert.equal(r.status,'DUE');
 assert.equal(r.states[0].action,'periksa');
 assert.equal(r.states[0].status,'DUE');
 assert.equal(r.states[1].status,'BASELINE_REQUIRED');
});
test('S2040 profile activation is explicit and additive',()=>{
 const c=load();delete c.D.vehicles[0].serviceMaintenanceProfile;
 assert.equal(c.ServiceLegacyMaintenance.isLegacy('old-1'),false);
 const r=c.ServiceLegacyMaintenance.activate('old-1',{source:'existing-motor'});
 assert.equal(r.ok,true);assert.equal(r.profile.mode,'legacy');assert.equal(r.profile.kpbManagedExternally,true);
});
test('S2040 no history produces baseline-required, never fake interval',()=>{
 const c=load();c.D.vehicles[0].id='old-2';c.D.vehicles[0].serviceMaintenanceProfile={mode:'legacy'};c.D.servisLogs=[];
 const r=c.ServiceLegacyMaintenance.evaluateComponent('old-2','oli-mesin');
 assert.equal(r.status,'BASELINE_REQUIRED');assert.equal(r.states[0].nextDueKm,null);
});
test('S2716 checklist component identity/action overrides generic session root',()=>{
 const c=load();
 c.D.servisLogs=[{id:'session-1',vehicleId:'old-1',actionType:'catat',km:20000,date:'2026-10-18',checklist:[
  {serviceComponentId:'oli-mesin',itemId:'oli-mesin',actionType:'ganti'},
  {serviceComponentId:'busi',itemId:'busi',actionType:'periksa'}
 ]}];
 const greaseLike=c.ServiceLegacyMaintenance.history('old-1','oli-mesin');
 assert.equal(greaseLike.length,1,'komponen harus ditemukan lewat checklist walau root tidak punya serviceComponentId');
 assert.equal(c.ServiceLegacyMaintenance.latestByAction('old-1','oli-mesin','ganti').id,'session-1','aksi komponen ganti harus mengalahkan aksi root catat');
 assert.equal(c.ServiceLegacyMaintenance.latestByAction('old-1','busi','periksa').id,'session-1','aksi komponen periksa harus dicocokkan terpisah');
});

test('S2717 missing action is unknown and cannot reset replacement baseline',()=>{
 const c=load();
 c.D.servisLogs=[{id:'unknown-action',vehicleId:'old-1',serviceComponentId:'oli-mesin',km:20000,date:'2026-10-18'}];
 assert.equal(c.ServiceLegacyMaintenance.latestByAction('old-1','oli-mesin','ganti'),null,'unknown action must not be assumed to be ganti');
 const r=c.ServiceLegacyMaintenance.evaluateComponent('old-1','oli-mesin');
 assert.equal(r.states[0].status,'BASELINE_REQUIRED');
 assert.equal(r.states[0].nextDueKm,null);
});
