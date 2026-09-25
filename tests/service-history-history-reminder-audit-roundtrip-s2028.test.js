'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'modules/vehicle/service-history-history-reminder-audit-roundtrip-s2028.js'),'utf8');
const logs=[
 {id:'h1',vehicleId:'v1',sessionId:'s1',date:'2026-01-01',checklist:[{itemId:'belt',itemName:'V-Belt CVT',serviceComponentId:'belt'},{itemId:'roller',itemName:'Roller CVT',serviceComponentId:'roller'}]},
 {id:'h2',vehicleId:'v1',sessionId:'s2',date:'2026-02-01',checklist:[{itemId:'belt',itemName:'V-Belt CVT',serviceComponentId:'belt'}]},
 {id:'other',vehicleId:'v2',sessionId:'s3',date:'2026-03-01',checklist:[{itemId:'belt',itemName:'V-Belt CVT',serviceComponentId:'belt'}]}
];
const context={console,D:{servisLogs:logs},curVehicleId:'v1',Servis:{_s2019ComponentFocusLogId:'h1',_s2019ComponentFocusId:'belt'},ServiceHistoryMultiChecklistS2019:{componentsOf(log){return Array.isArray(log.checklist)?log.checklist.map(x=>({...x,componentName:x.itemName,checklistItemId:x.itemId,key:x.itemId})):[];}},window:null,document:{addEventListener(){}}};
context.window=context;vm.createContext(context);vm.runInContext(source,context,{filename:'service-history-history-reminder-audit-roundtrip-s2028.js'});
const api=context.ServiceHistoryHistoryReminderAuditRoundTripS2028;assert.ok(api);
assert.equal(JSON.stringify(api.expected('h1','belt','v1')),JSON.stringify({historyId:'h1',sessionId:'s1',vehicleId:'v1',componentId:'belt',componentName:'V-Belt CVT'}));
const before=JSON.stringify(logs);const ok=api.roundTrip('h1','belt','v1',e=>e);assert.equal(ok.status,'OK');assert.equal(ok.historyUnchanged,true);assert.equal(JSON.stringify(logs),before);
const wrong=api.audit('h1','belt','v1',{historyId:'other',componentId:'roller',vehicleId:'v2'});assert.equal(wrong.status,'ERROR');assert.ok(wrong.issues.some(x=>x.code==='history-context-lost'));assert.ok(wrong.issues.some(x=>x.code==='component-context-lost'));assert.ok(wrong.issues.some(x=>x.code==='vehicle-context-lost'));
const focusWrong=(()=>{context.Servis._s2019ComponentFocusLogId='h1';context.Servis._s2019ComponentFocusId='roller';return api.audit('h1','belt','v1',{historyId:'h1',componentId:'belt',vehicleId:'v1'});})();assert.equal(focusWrong.status,'ERROR');assert.ok(focusWrong.issues.some(x=>x.code==='focus-component-mismatch'));
context.Servis._s2019ComponentFocusLogId='h1';context.Servis._s2019ComponentFocusId='belt';
const legacy=[{id:'legacy',vehicleId:'v1',serviceComponentId:'belt',item:'V-Belt',date:'2024-01-01'}];context.D.servisLogs=legacy;context.Servis._s2019ComponentFocusLogId='legacy';context.Servis._s2019ComponentFocusId='belt';const legacyAudit=api.roundTrip('legacy','belt','v1',e=>e);assert.equal(legacyAudit.status,'OK');assert.equal(legacyAudit.historyUnchanged,true);
context.D.servisLogs=[{id:'none',vehicleId:'v1',sessionId:'sx',checklist:[{itemId:'oil',itemName:'Oli',serviceComponentId:'oil'}]}];context.Servis._s2019ComponentFocusLogId='none';context.Servis._s2019ComponentFocusId='oil';const none=api.audit('none','belt','v1',null);assert.equal(none.status,'ERROR');
const s2019=fs.readFileSync(path.join(root,'modules/vehicle/service-history-multichecklist-s2019.js'),'utf8');assert.match(s2019,/openServiceComponentReminderS2019/);assert.match(s2019,/openServiceComponentAuditS2019/);assert.match(s2019,/setFocus\(log\.id/);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const prod=fs.readFileSync(path.join(root,'app_production.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert.doesNotMatch(index,new RegExp('<script[^>]+service\-history\-history\-reminder\-audit\-roundtrip\-s2028\.js'));
assert.doesNotMatch(prod,new RegExp('<script[^>]+service\-history\-history\-reminder\-audit\-roundtrip\-s2028\.js'));
assert.doesNotMatch(sw,new RegExp('service\-history\-history\-reminder\-audit\-roundtrip\-s2028\.js'));

const build=fs.readFileSync(path.join(root,'scripts/build.js'),'utf8');
assert.match(build,/service-history-lifecycle-s2027-s2030-app-main\.js/);

console.log('service-history-history-reminder-audit-roundtrip-s2028: PASS — historical module remains test/audit artifact, current APP MAIN runtime uses canonical SOT/compatibility layer');
