'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'modules/vehicle/service-history-lifecycle-s2027-s2030-app-main.js'),'utf8');
const logs=[
 {id:'h1',vehicleId:'v1',sessionId:'s1',serviceComponentId:'belt',checklist:[{itemId:'belt',itemName:'V-Belt CVT',serviceComponentId:'belt'}],date:'2026-09-01'},
 {id:'h2',vehicleId:'v1',sessionId:'s1',serviceComponentId:'roller',checklist:[{itemId:'roller',itemName:'Roller CVT',serviceComponentId:'roller'}],date:'2026-09-01'},
 {id:'other',vehicleId:'v2',sessionId:'s2',serviceComponentId:'belt',checklist:[{itemId:'belt',itemName:'V-Belt CVT',serviceComponentId:'belt'}],date:'2026-09-01'}
];
const context={console,D:{servisLogs:logs,transactions:[]},curVehicleId:'v1',ServiceHistoryReminderReconciliationSOT:{match(log,target){return String(log.vehicleId)===String(target.vehicleId)&&String(log.serviceComponentId)===String(target.serviceComponentId)?{ok:true}:{ok:false};}},ServiceHistorySOTNormalizer:{normalizeOne(log){return {...log};}},ServiceEventSOT:{audit(vehicleId){return {issues:[],vehicleId};}},ServiceHistoryAuditPackage:{listByVehicle(){return[];}}};
context.globalThis=context;vm.createContext(context);vm.runInContext(source,context,{filename:'service-history-lifecycle-s2027-s2030-app-main.js'});
const api=context.ServiceHistoryLifecycleS2027S2030AppMain;assert.ok(api);
const before=JSON.stringify(logs);
const r=api.audit({historyId:'h1',componentId:'belt',vehicleId:'v1'});
assert.equal(r.status,'PASS');assert.equal(r.historyUnchanged,true);assert.equal(r.componentId,'belt');assert.equal(r.sessionCount,2);assert.ok(r.stages.every(s=>s.ok));assert.equal(JSON.stringify(logs),before);
const wrongVehicle=api.audit({historyId:'h1',componentId:'belt',vehicleId:'v2'});assert.equal(wrongVehicle.status,'ERROR');assert.equal(JSON.stringify(logs),before);
const wrongComponent=api.audit({historyId:'h1',componentId:'missing',vehicleId:'v1'});assert.equal(wrongComponent.status,'ERROR');assert.equal(JSON.stringify(logs),before);
console.log('S2027-S2030 APP MAIN native compatibility lifecycle audit: PASS');
