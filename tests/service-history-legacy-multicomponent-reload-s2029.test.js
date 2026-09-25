'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'modules/vehicle/service-history-legacy-multicomponent-reload-s2029.js'),'utf8');
const logs=[
 {id:'h1',vehicleId:'v1',sessionId:'s1',date:'2026-01-01',checklist:[{itemId:'belt',itemName:'V-Belt CVT',serviceComponentId:'belt'},{itemId:'roller',itemName:'Roller CVT',serviceComponentId:'roller'}]},
 {id:'h2',vehicleId:'v1',sessionId:'s1',date:'2026-01-01',checklist:[{itemId:'oil',itemName:'Oli Gardan',serviceComponentId:'oli-gardan'}]},
 {id:'legacy',vehicleId:'v1',date:'2024-01-01',item:'V-Belt',serviceComponentId:'belt'},
 {id:'other',vehicleId:'v2',sessionId:'s2',checklist:[{itemId:'belt',itemName:'V-Belt CVT',serviceComponentId:'belt'}]}
];
const context={console,D:{servisLogs:logs},curVehicleId:'v1',Servis:{_s2019ComponentFocusLogId:'h1',_s2019ComponentFocusId:'belt'},ServiceHistoryMultiChecklistS2019:{componentsOf(log){if(Array.isArray(log.checklist))return log.checklist.map(x=>({...x,componentName:x.itemName,checklistItemId:x.itemId,key:x.itemId}));if(log.serviceComponentId)return [{serviceComponentId:log.serviceComponentId,itemName:log.item,componentName:log.item,checklistItemId:null,key:log.serviceComponentId}];return [];},sessionRows(log){const sid=log.sessionId||log.serviceJobId;return sid?logs.filter(x=>String(x.vehicleId||'')===String(log.vehicleId||'')&&String(x.sessionId||x.serviceJobId||'')===String(sid)): [log];},sessionComponents(log){const out=[];const seen=new Set();this.sessionRows(log).forEach(r=>this.componentsOf(r).forEach(c=>{const id=c.serviceComponentId||c.checklistItemId||c.key;if(id&&!seen.has(id)){seen.add(id);out.push(c);}}));return out;}} ,window:null,document:{addEventListener(){}}};
context.window=context;vm.createContext(context);vm.runInContext(source,context,{filename:'service-history-legacy-multicomponent-reload-s2029.js'});
const api=context.ServiceHistoryLegacyMultiComponentReloadS2029;assert.ok(api);
const target=api.resolve('h1','belt','v1');assert.equal(target.rowType,'multi-component');assert.equal(target.componentId,'belt');assert.equal(target.componentCount,2);assert.equal(target.sessionRowCount,2);assert.equal(target.sessionComponentCount,3);
const before=JSON.stringify(logs);const ok=api.roundTrip('h1','belt','v1',e=>e);assert.equal(ok.status,'OK');assert.equal(ok.historyUnchanged,true);assert.equal(JSON.stringify(logs),before);
const reload=api.audit('h1','belt','v1',{historyId:'h1',vehicleId:'v1',componentId:'belt'});assert.equal(reload.status,'OK');
const missingFocus=api.audit('h1','belt','v1',{historyId:'h1',vehicleId:'v1'});assert.equal(missingFocus.status,'WARNING');assert.ok(missingFocus.issues.some(x=>x.code==='component-focus-not-restored'));
const wrong=api.audit('h1','belt','v1',{historyId:'other',vehicleId:'v2',componentId:'belt'});assert.equal(wrong.status,'ERROR');assert.ok(wrong.issues.some(x=>x.code==='history-context-changed'));assert.ok(wrong.issues.some(x=>x.code==='vehicle-context-changed'));
const legacy=api.resolve('legacy','belt','v1');assert.equal(legacy.legacy,true);assert.equal(legacy.rowType,'legacy-history');const legacyAudit=api.audit('legacy','belt','v1',{historyId:'legacy',vehicleId:'v1',componentId:'belt'});assert.equal(legacyAudit.status,'OK');assert.ok(legacyAudit.issues.some(x=>x.code==='legacy-history-projection'));
const noComponent=api.audit('legacy','roller','v1',null);assert.equal(noComponent.status,'ERROR');assert.ok(noComponent.issues.some(x=>x.code==='component-not-found'));
context.D.servisLogs=[{id:'unscoped',vehicleId:'v1',date:'2020-01-01'}];const un=api.resolve('unscoped','belt','v1');assert.equal(un.rowType,'unscoped');const ua=api.audit('unscoped','belt','v1',{historyId:'unscoped',vehicleId:'v1'});assert.equal(ua.status,'WARNING');assert.ok(ua.issues.some(x=>x.code==='unscoped-history'));
const s2019=fs.readFileSync(path.join(root,'modules/vehicle/service-history-multichecklist-s2019.js'),'utf8');assert.match(s2019,/componentMatch/);assert.match(s2019,/sessionComponents/);assert.match(s2019,/openServiceComponentHistoryS2019/);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');const prod=fs.readFileSync(path.join(root,'app_production.html'),'utf8');const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');assert.match(index,/service-history-legacy-multicomponent-reload-s2029\.js\?v=2029/);assert.match(prod,/service-history-legacy-multicomponent-reload-s2029\.js\?v=2029/);assert.match(sw,/kw-cache-v2030/);assert.match(sw,/service-history-legacy-multicomponent-reload-s2029\.js/);
console.log('S2029 Legacy + Multi-Component + Reload integrity regression: PASS');
