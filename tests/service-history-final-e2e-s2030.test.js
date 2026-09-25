'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'modules/vehicle/service-history-final-e2e-s2030.js'),'utf8');
const logs=[{id:'h1',vehicleId:'v1',sessionId:'s1',checklist:[{itemId:'belt',itemName:'V-Belt CVT',serviceComponentId:'belt'},{itemId:'roller',itemName:'Roller CVT',serviceComponentId:'roller'}]}];
const context={console,D:{servisLogs:logs},curVehicleId:'v1',Servis:{},ServiceHistoryMultiChecklistS2019:{componentsOf(log){return (log.checklist||[]).map(x=>({...x,componentName:x.itemName,checklistItemId:x.itemId,key:x.itemId}));}},ServiceHistoryReminderComponentS2026:{projection(h,c){return {serviceComponentId:c&&c.serviceComponentId, item:c&&c.itemName};}},ServiceHistoryReminderHistoryRoundtripS2027:{resolve(h,c,v){return {ok:true,historyId:h,componentId:c,vehicleId:v};}},ServiceHistoryHistoryReminderAuditRoundtripS2028:{audit(h,c,v){return {ok:true,historyId:h,componentId:c,vehicleId:v};}},ServiceHistoryLegacyMultiComponentReloadS2029:{resolve(h,c,v){return {reloadable:true,historyId:h,componentId:c,vehicleId:v,rowType:'multi-component'};}},document:{addEventListener(){}}};context.window=context;vm.createContext(context);vm.runInContext(source,context,{filename:'service-history-final-e2e-s2030.js'});
const api=context.ServiceHistoryFinalE2ES2030;assert.ok(api);const before=JSON.stringify(logs);const r=api.run({historyId:'h1',componentId:'belt',vehicleId:'v1'});assert.equal(r.status,'PASS');assert.equal(r.historyUnchanged,true);assert.equal(JSON.stringify(logs),before);assert.ok(r.stages.every(s=>s.ok));
const bad=api.run({historyId:'h1',componentId:'missing',vehicleId:'v1'});assert.equal(bad.status,'ERROR');assert.ok(bad.stages.some(s=>s.stage==='component-context'&&!s.ok));assert.equal(JSON.stringify(logs),before);
const missing=api.run({historyId:'missing',componentId:'belt',vehicleId:'v1'});assert.equal(missing.status,'ERROR');assert.equal(JSON.stringify(logs),before);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const prod=fs.readFileSync(path.join(root,'app_production.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert.doesNotMatch(index,new RegExp('<script[^>]+service\-history\-final\-e2e\-s2030\.js'));
assert.doesNotMatch(prod,new RegExp('<script[^>]+service\-history\-final\-e2e\-s2030\.js'));
assert.doesNotMatch(sw,new RegExp('service\-history\-final\-e2e\-s2030\.js'));

const build=fs.readFileSync(path.join(root,'scripts/build.js'),'utf8');
assert.match(build,/service-history-lifecycle-s2027-s2030-app-main\.js/);

console.log('service-history-final-e2e-s2030: PASS — historical module remains test/audit artifact, current APP MAIN runtime uses canonical SOT/compatibility layer');
