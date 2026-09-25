'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'modules/vehicle/service-history-evidence-s2021.js'),'utf8');
const logs=[{id:'h1',vehicleId:'v1',sessionId:'s1',checklist:[
 {itemId:'busi',itemName:'Busi',masterCategoryId:'servis-mesin'},
 {itemId:'v-belt-cvt',itemName:'V-Belt CVT',masterCategoryId:'servis-cvt'},
 {itemId:'filter-udara',itemName:'Filter Udara',masterCategoryId:'filter-udara'}
]}];
const context={console,D:{servisLogs:logs},Servis:{},ServiceHistoryMultiChecklistS2019:{componentsOf(log){return (log.checklist||[]).map(x=>({serviceComponentId:x.itemId,checklistItemId:x.itemId,masterCategoryId:x.masterCategoryId,componentName:x.itemName,key:x.itemId}));}},escapeHtml:x=>String(x==null?'':x)};
context.window=context;vm.createContext(context);vm.runInContext(source,context,{filename:'service-history-evidence-s2021.js'});
const a=context.ServiceHistoryEvidenceS2021;
const e=a.evidenceFor(logs[0],'v-belt-cvt');
assert.equal(e.componentName,'V-Belt CVT');
assert.equal(e.serviceComponentId,'v-belt-cvt');
assert.equal(e.checklistItemId,'v-belt-cvt');
assert.equal(e.evidenceId,'evidence:h1:v-belt-cvt');
assert.equal(a.evidenceFor(logs[0],'filter-udara').evidenceId,'evidence:h1:filter-udara');
assert.equal(a.uniqueSessionEvidence(logs[0]).length,3);
assert.equal(a.auditEvidence(logs[0],'v-belt-cvt').ok,true);
assert.equal(a.auditEvidence(logs[0],'unknown').ok,false);
const html=a.render(logs[0],'v-belt-cvt');
assert.match(html,/V-Belt CVT/); assert.match(html,/evidence:h1:v-belt-cvt/);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const prod=fs.readFileSync(path.join(root,'app_production.html'),'utf8');
assert.match(index,/service-history-evidence-s2021\.js\?v=2021/);
assert.match(prod,/service-history-evidence-s2021\.js\?v=2021/);
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert.match(sw,/kw-cache-v2030/); assert.match(sw,/service-history-evidence-s2021\.js/);
console.log('S2021 evidence identity regression: PASS');
