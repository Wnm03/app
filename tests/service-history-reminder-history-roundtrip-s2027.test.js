'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'modules/vehicle/service-history-reminder-history-roundtrip-s2027.js'),'utf8');
const logs=[
 {id:'h-old',vehicleId:'v1',sessionId:'s-old',date:'2025-01-01',km:10000,item:'V-Belt',checklist:[{itemId:'belt',itemName:'V-Belt CVT',serviceComponentId:'belt'}]},
 {id:'h-new',vehicleId:'v1',sessionId:'s-new',date:'2026-01-01',km:20000,item:'Servis Rutin',checklist:[{itemId:'belt',itemName:'V-Belt CVT',serviceComponentId:'belt'},{itemId:'roller',itemName:'Roller CVT',serviceComponentId:'roller'}]},
 {id:'h-other-vehicle',vehicleId:'v2',sessionId:'s-x',date:'2026-02-01',km:22000,serviceComponentId:'belt',item:'V-Belt'}
];
const context={console,D:{servisLogs:logs},curVehicleId:'v1',Servis:{},ServiceHistoryMultiChecklistS2019:{componentsOf(log){if(Array.isArray(log.checklist))return log.checklist.map(x=>({...x,componentName:x.itemName,key:x.itemId,checklistItemId:x.itemId}));if(log.serviceComponentId)return [{serviceComponentId:log.serviceComponentId,itemName:log.item,key:log.serviceComponentId,componentName:log.item,checklistItemId:null}];return []; }},window:null,document:{addEventListener(){}}};
context.window=context;vm.createContext(context);vm.runInContext(source,context,{filename:'service-history-reminder-history-roundtrip-s2027.js'});
const api=context.ServiceHistoryReminderHistoryRoundTripS2027;assert.ok(api);
assert.equal(JSON.stringify(api.expected('cat-belt','belt','v1')),JSON.stringify({historyId:'h-new',historyCount:2,categoryId:'cat-belt',componentId:'belt',vehicleId:'v1',sessionId:'s-new'}));
const before=JSON.stringify(logs);
const ok=api.roundTrip('cat-belt','belt','v1',()=>({historyId:'h-new',componentId:'belt',vehicleId:'v1'}));
assert.equal(ok.status,'OK');assert.equal(ok.historyUnchanged,true);assert.equal(JSON.stringify(logs),before);
const wrong=api.audit('cat-belt','belt','v1',{historyId:'not-in-component',componentId:'roller',vehicleId:'v2'});
assert.equal(wrong.status,'ERROR');assert.ok(wrong.issues.some(x=>x.code==='history-target-mismatch'));assert.ok(wrong.issues.some(x=>x.code==='component-target-mismatch'));assert.ok(wrong.issues.some(x=>x.code==='vehicle-target-mismatch'));
const legacy=[{id:'legacy-1',vehicleId:'v1',date:'2024-01-01',serviceComponentId:'belt',item:'V-Belt'}];
context.D.servisLogs=legacy;const legacyAudit=api.roundTrip(null,'belt','v1',()=>({historyId:'legacy-1',componentId:'belt',vehicleId:'v1'}));assert.equal(legacyAudit.status,'OK');assert.equal(legacyAudit.expected.historyCount,1);assert.equal(legacyAudit.historyUnchanged,true);
context.D.servisLogs=[{id:'none',vehicleId:'v1',date:'2026-01-01',item:'Other',checklist:[{itemId:'oil',itemName:'Oli',serviceComponentId:'oli'}]}];const none=api.expected(null,'belt','v1');assert.equal(none.historyId,null);assert.equal(none.historyCount,0);const noneAudit=api.audit(null,'belt','v1',null);assert.equal(noneAudit.status,'OK');assert.ok(noneAudit.issues.some(x=>x.code==='no-history-for-component'));
const s2019=fs.readFileSync(path.join(root,'modules/vehicle/service-history-multichecklist-s2019.js'),'utf8');assert.match(s2019,/openHistoryFromReminder/);assert.match(s2019,/componentMatch/);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');const prod=fs.readFileSync(path.join(root,'app_production.html'),'utf8');const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');assert.match(index,/service-history-reminder-history-roundtrip-s2027\.js\?v=2027/);assert.match(prod,/service-history-reminder-history-roundtrip-s2027\.js\?v=2027/);assert.match(sw,/kw-cache-v2030/);assert.match(sw,/service-history-reminder-history-roundtrip-s2027\.js/);
console.log('S2027 Reminder → History round-trip regression: PASS');
