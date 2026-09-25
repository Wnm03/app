'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'); const path=require('node:path'); const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'modules/vehicle/service-history-evidence-provenance-s2024.js'),'utf8');
const logs=[{id:'h1',vehicleId:'v1',sessionId:'s1',cost:450000,txLinkId:'tx1',note:'Servis gabungan',foto:['history.jpg'],checklist:[
 {itemId:'belt',itemName:'V-Belt CVT',serviceComponentId:'belt',conditionResult:'aus',conditionNote:'retak',photos:['belt.jpg'],cost:220000,costBreakdown:{labor:100000,parts:120000,consumables:0,other:0,total:220000,source:'component'},catalogPartRefs:[{catalogId:'belt-part',qty:1}],serviceEvidence:{transactionId:'tx1',photos:['belt.jpg']}},
 {itemId:'roller',itemName:'Roller CVT',serviceComponentId:'roller',conditionResult:'baik',conditionNote:'normal',photos:['roller.jpg'],cost:230000,costBreakdown:{labor:50000,parts:180000,consumables:0,other:0,total:230000,source:'component'},usedPartId:'stock-roller',usedPartQty:1}
]}];
const context={console,D:{servisLogs:logs},Servis:{_s2019ComponentFocusId:'belt',editId:'h1'},ServiceHistoryMultiChecklistS2019:{componentsOf(log){return (log.checklist||[]).map(x=>({...x,serviceComponentId:x.serviceComponentId||x.itemId,checklistItemId:x.itemId,componentName:x.itemName,key:x.itemId}));}},ServiceHistoryEvidenceS2021:{identity(log,c){return {evidenceId:`evidence:${log.id}:${c.itemId}`};}},escapeHtml:x=>String(x==null?'':x)};
context.window=context;vm.createContext(context);vm.runInContext(source,context,{filename:'service-history-evidence-provenance-s2024.js'});
const a=context.ServiceHistoryEvidenceProvenanceS2024; const before=JSON.stringify(logs);
const p=a.provenance(logs[0],'belt');
assert.equal(p.status,'WARNING'); assert.equal(p.source.checklistIndex,0); assert.equal(p.identity.evidenceId,'evidence:h1:belt');
assert.ok(p.items.some(x=>x.field==='costBreakdown'&&x.scope==='component')); assert.ok(p.items.some(x=>x.field==='photos'&&x.scope==='component'));
assert.ok(p.items.some(x=>x.field==='txLinkId'&&x.scope==='history'));
assert.ok(p.items.some(x=>x.field==='foto'&&x.scope==='history'));
assert.equal(a.find(logs[0],'belt','cost')[0].field,'costBreakdown');
const s=a.sessionProvenance(logs[0]); assert.equal(s.componentCount,2); assert.equal(s.rows.length,2); assert.equal(s.history.some(x=>x.field==='txLinkId'),true);
assert.equal(JSON.stringify(logs),before,'S2024 must remain read-only');
const missing=JSON.parse(JSON.stringify(logs)); missing[0].checklist.splice(0,1); const m=a.provenance(missing[0],'belt'); assert.equal(m.status,'ERROR'); assert.ok(m.issues.includes('component-not-found'));
const html=a.render(logs[0],'belt'); assert.match(html,/Evidence provenance/); assert.match(html,/evidence:h1:belt/); assert.match(html,/Checklist index/); assert.match(html,/Read-only provenance/);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8'); const prod=fs.readFileSync(path.join(root,'app_production.html'),'utf8');
assert.match(index,/service-history-evidence-provenance-s2024\.js\?v=2024/); assert.match(prod,/service-history-evidence-provenance-s2024\.js\?v=2024/);
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'); assert.match(sw,/kw-cache-v2030/); assert.match(sw,/service-history-evidence-provenance-s2024\.js/);
console.log('S2024 evidence provenance + traceability: PASS');
