'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'modules/vehicle/service-history-evidence-lifecycle-s2022.js'),'utf8');
const logs=[
 {id:'h1',vehicleId:'v1',sessionId:'s1',cost:450000,accountId:'cash',txLinkId:'tx1',note:'Servis gabungan',foto:['history-photo'],checklist:[
  {itemId:'v-belt-cvt',itemName:'V-Belt CVT',masterCategoryId:'servis-cvt',conditionResult:'baik',conditionNote:'normal',photos:['belt-photo'],costBreakdown:{labor:100000,parts:120000,consumables:0,other:0,total:220000,source:'component'},catalogPartRefs:[{catalogId:'belt-part',qty:1}]},
  {itemId:'roller-cvt',itemName:'Roller CVT',masterCategoryId:'servis-cvt',conditionResult:'aus',conditionNote:'perlu ganti',photos:['roller-photo'],costBreakdown:{labor:50000,parts:180000,consumables:0,other:0,total:230000,source:'component'},usedPartId:'stock-roller',usedPartQty:1}
 ]}
];
const context={console,D:{servisLogs:logs},Servis:{_s2019ComponentFocusId:'v-belt-cvt',editId:'h1'},ServiceHistoryMultiChecklistS2019:{componentsOf(log){return (log.checklist||[]).map(x=>({...x,serviceComponentId:x.itemId,checklistItemId:x.itemId,componentName:x.itemName,key:x.itemId}));}},ServiceHistoryEvidenceS2021:{identity(log,c){return {evidenceId:`evidence:${log.id}:${c.itemId}`};}},escapeHtml:x=>String(x==null?'':x)};
context.window=context;vm.createContext(context);vm.runInContext(source,context,{filename:'service-history-evidence-lifecycle-s2022.js'});
const a=context.ServiceHistoryEvidenceLifecycleS2022;
const before=JSON.stringify(logs);
const belt=a.componentEvidence(logs[0],'v-belt-cvt');
assert.equal(belt.ok,true);
assert.equal(belt.evidence.photos.status,'component-owned');
assert.equal(belt.evidence.photos.count,1);
assert.equal(belt.evidence.cost.status,'component-owned');
assert.equal(belt.evidence.cost.amount,220000);
assert.equal(belt.evidence.parts.status,'component-owned');
assert.equal(belt.evidence.parts.refs[0].catalogId,'belt-part');
assert.equal(belt.evidence.finance.status,'history-linked');
assert.ok(belt.warnings.includes('finance-link-remains-history-level'));
const roller=a.componentEvidence(logs[0],'roller-cvt');
assert.equal(roller.evidence.cost.amount,230000);
assert.equal(roller.evidence.parts.usedPartId,'stock-roller');
const session=a.sessionAudit(logs[0]);
assert.equal(session.length,2);
assert.equal(a.leakage(logs[0]).ok,true);
const ambiguous={id:'h2',vehicleId:'v1',sessionId:'s2',cost:300000,foto:['session-photo'],checklist:[{itemId:'a',itemName:'A',masterCategoryId:'m'},{itemId:'b',itemName:'B',masterCategoryId:'m'}]};
assert.equal(a.leakage(ambiguous).ok,false);
assert.equal(a.leakage(ambiguous).issues.some(x=>x.type==='photo-history-level'),true);
assert.equal(a.leakage(ambiguous).issues.some(x=>x.type==='cost-history-level'),true);
assert.equal(a.leakage(logs[0]).issues.some(x=>x.type==='finance-history-linked'),false);
assert.equal(JSON.stringify(logs),before,'read-only projection must not mutate history');
const html=a.render(logs[0],'v-belt-cvt');
assert.match(html,/Evidence lifecycle/);assert.match(html,/V-Belt CVT/);assert.match(html,/220\.000/);assert.match(html,/Read-only audit/);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const prod=fs.readFileSync(path.join(root,'app_production.html'),'utf8');
assert.match(index,/service-history-evidence-lifecycle-s2022\.js\?v=2022/);
assert.match(prod,/service-history-evidence-lifecycle-s2022\.js\?v=2022/);
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert.match(sw,/kw-cache-v2030/);assert.match(sw,/service-history-evidence-lifecycle-s2022\.js/);
console.log('S2022 evidence lifecycle + component isolation: PASS');
