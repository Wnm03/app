'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'modules/vehicle/service-history-evidence-ux-s2025.js'),'utf8');
const logs=[{id:'h1',vehicleId:'v1',sessionId:'s1',item:'V-Belt CVT',checklist:[
 {itemId:'belt',itemName:'V-Belt CVT',serviceComponentId:'belt',conditionResult:'aus',conditionNote:'retak'},
 {itemId:'roller',itemName:'Roller CVT',serviceComponentId:'roller',conditionResult:'baik'}
]}];
const context={console,logs};
context.D={servisLogs:logs};
context.Servis={editId:'h1',_s2019ComponentFocusId:'belt',_s2019ComponentFocusLogId:'h1',serviceHistoryComponentFilter:'belt',renderEditReminderTab(){},renderEditHistoryTab(){},renderEditAuditTab(){}};
context.ServiceHistoryMultiChecklistS2019={componentsOf(log){return (log.checklist||[]).map(x=>({...x,serviceComponentId:x.serviceComponentId||x.itemId,checklistItemId:x.itemId,componentName:x.itemName,key:x.itemId}));}};
context.ServiceHistoryEvidenceS2021={identity(log,c){return {evidenceId:`evidence:${log.id}:${c.itemId}`};}};
context.ServiceHistoryEvidenceProvenanceS2024={provenance(){return {status:'OK'}}};
context.ServiceHistoryEvidenceCompletenessS2023={completeness(){return {status:'OK'}}};
context.ServiceHistoryEvidenceLifecycleS2022={componentEvidence(){return {ok:true}}};
context.escapeHtml=x=>String(x==null?'':x); context.window=context;
vm.createContext(context); vm.runInContext(source,context,{filename:'service-history-evidence-ux-s2025.js'});
const a=context.ServiceHistoryEvidenceUXS2025;
const before=JSON.stringify(logs);
const r=a.audit(logs[0],'belt');
assert.equal(r.status,'OK');
assert.equal(r.componentId,'belt');
assert.equal(r.componentCount,2);
assert.equal(r.contracts.reminder,true);assert.equal(r.contracts.history,true);assert.equal(r.contracts.audit,true);
assert.equal(JSON.stringify(logs),before,'S2025 must remain read-only');
const mismatch=a.audit(logs[0],'roller');
assert.equal(mismatch.status,'WARNING');
assert.ok(mismatch.issues.some(x=>x.code==='history-filter-focus-mismatch'));
const noFocus={...logs[0]};
context.Servis._s2019ComponentFocusId='';
const nf=a.audit(noFocus,'');
assert.equal(nf.status,'ERROR');assert.ok(nf.issues.some(x=>x.code==='missing-component-focus'));
context.Servis._s2019ComponentFocusId='belt';
const html=a.render(logs[0],'belt');
assert.match(html,/Evidence UX integrity/);assert.match(html,/V-Belt CVT/);assert.match(html,/Read-only UX audit/);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const prod=fs.readFileSync(path.join(root,'app_production.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert.doesNotMatch(index,new RegExp('<script[^>]+service\-history\-evidence\-ux\-s2025\.js'));
assert.doesNotMatch(prod,new RegExp('<script[^>]+service\-history\-evidence\-ux\-s2025\.js'));
assert.doesNotMatch(sw,new RegExp('service\-history\-evidence\-ux\-s2025\.js'));

console.log('service-history-evidence-ux-s2025: PASS — historical module remains test/audit artifact, current APP MAIN runtime uses canonical SOT/compatibility layer');
