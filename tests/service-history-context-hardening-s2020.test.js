'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'modules/vehicle/service-history-context-hardening-s2020.js'),'utf8');
const logs=[
 {id:'h1',vehicleId:'v1',sessionId:'s1',item:'Servis Rutin',serviceComponentId:'busi',masterCategoryId:'servis-mesin',checklist:[
   {itemId:'busi',itemName:'Busi',masterCategoryId:'servis-mesin',actionType:'periksa'},
   {itemId:'v-belt-cvt',itemName:'V-Belt CVT',masterCategoryId:'servis-cvt',actionType:'ganti'}
 ]},
 {id:'h2',vehicleId:'v1',sessionId:'s2',serviceComponentId:'v-belt-cvt',item:'V-Belt CVT',masterCategoryId:'servis-cvt'}
];
const context={console,D:{servisLogs:logs,sparepartCats:[{id:'belt',name:'V-Belt CVT',serviceComponentId:'v-belt-cvt',vehicleId:'v1',intervalKm:32000}],vehicles:[{id:'v1',name:'Vario 125'}]},curVehicleId:'v1',Servis:{editId:'h1',_s2019ComponentFocusId:'v-belt-cvt',_s2019ComponentFocusLogId:'h1'},ServiceInputCatalog:{itemById(id){const m={busi:{item:{id:'busi',name:'Busi'},group:{masterCategoryId:'servis-mesin',group:'Servis Mesin'}},'v-belt-cvt':{item:{id:'v-belt-cvt',name:'V-Belt CVT'},group:{masterCategoryId:'servis-cvt',group:'Servis CVT'}}};return m[id]||null;}},ServiceHistoryMultiChecklistS2019:null,escapeHtml:x=>String(x==null?'':x),document:{addEventListener(){},getElementById(){return null;}}};
context.ServiceHistoryMultiChecklistS2019={componentsOf(log){return (log.checklist||[]).map(x=>({serviceComponentId:x.itemId,checklistItemId:x.itemId,masterCategoryId:x.masterCategoryId,componentName:x.itemName,actionType:x.actionType,key:x.itemId}));},componentMatch(log,cid){return this.componentsOf(log).some(x=>x.serviceComponentId===cid);},sessionRows(log){return logs.filter(x=>x.vehicleId===log.vehicleId&&x.sessionId===log.sessionId);},sessionComponents(log){return this.sessionRows(log).flatMap(x=>this.componentsOf(x));},reminderState(log,c){return {active:c.serviceComponentId==='v-belt-cvt',serviceComponentId:c.serviceComponentId,intervalKm:c.serviceComponentId==='v-belt-cvt'?32000:null};}};
context.window=context;vm.createContext(context);vm.runInContext(source,context,{filename:'service-history-context-hardening-s2020.js'});
const a=context.ServiceHistoryContextHardeningS2020;
assert.equal(a.focused(logs[0]).componentName,'V-Belt CVT');
assert.equal(a.focusedAudit(logs[0]).component.componentName,'V-Belt CVT');
assert.equal(a.focusedAudit(logs[0]).reminder.active,true);
context.Servis.setServiceHistoryComponentFilter=function(cid){this.serviceHistoryComponentFilter=cid;return cid;};
// install is idempotent and wraps the setter; changing away from focused component must clear stale focus.
a.install();
context.Servis.setServiceHistoryComponentFilter('busi');
assert.equal(context.Servis._s2019ComponentFocusId,'busi','manual component filter must move focus to the selected checklist component');
// Clearing the component filter must clear stale component focus.
context.Servis.setServiceHistoryComponentFilter('');
assert.equal(context.Servis._s2019ComponentFocusId,'');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.match(html,/service-history-context-hardening-s2020\.js\?v=2020/);
const prod=fs.readFileSync(path.join(root,'app_production.html'),'utf8');
assert.match(prod,/service-history-context-hardening-s2020\.js\?v=2020/);
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert.match(sw,/kw-cache-v2030/); assert.match(sw,/service-history-context-hardening-s2020\.js/);
console.log('S2020 focus integrity regression: PASS');
