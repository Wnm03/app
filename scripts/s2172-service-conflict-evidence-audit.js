'use strict';
/* S2172: evidence-only triage for unresolved service-history conflicts. Read-only. */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const master=require(path.join(ROOT,'modules/vehicle/service-master-data.generated.js'));
global.SERVICE_CHECKLIST_GROUPS=master.SERVICE_CHECKLIST_GROUPS;
global.__SERVICE_CHECKLIST_GROUPS__=master.SERVICE_CHECKLIST_GROUPS;
global.ServiceTaxonomySOT=require(path.join(ROOT,'modules/vehicle/service-taxonomy-sot.js'));
const SOT=require(path.join(ROOT,'modules/vehicle/service-data-reconciliation-s2161.js'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const arr=v=>Array.isArray(v)?v:[];
const str=v=>v==null?'':String(v).trim();
function audit(data,sourceName='input.json',sourceHash=null){
 const logs=arr(data&&data.servisLogs), cats=arr(data&&data.sparepartCats), vehicles=arr(data&&data.vehicles);
 const catById=new Map(); for(const c of cats){const id=str(c&&c.id);if(id){const a=catById.get(id)||[];a.push(c);catById.set(id,a);}}
 const sot=SOT.audit(data||{}), byLog=new Map(logs.map((r,i)=>[str(r&&r.id),{r,i}]));
 const unresolved=sot.rows.filter(x=>x.status==='unresolved').map(p=>{const hit=byLog.get(str(p.id));const r=hit&&hit.r||{};const checks=arr(r.checklist);const item=str(r.item||r.name||r.componentName);const cid=str(r.categoryId);const catMatches=cid?(catById.get(cid)||[]):[];const sameVehicleCats=catMatches.filter(c=>str(c&&c.vehicleId)===str(r.vehicleId));const foreignCats=catMatches.filter(c=>str(c&&c.vehicleId)&&str(c.vehicleId)!==str(r.vehicleId));const checklistComponents=[...new Set(checks.map(c=>str(c&&c.serviceComponentId)).filter(Boolean))];const checklistMasters=[...new Set(checks.map(c=>str(c&&c.masterCategoryId)).filter(Boolean))];const checklistActions=[...new Set(checks.map(c=>str(c&&c.actionType).toLowerCase()).filter(Boolean))];let disposition='MANUAL_REVIEW';let candidate=null;let reason='No unique evidence chain from row identity to canonical component.';
   if(catMatches.length>1){reason='categoryId is duplicated; category reference cannot be trusted without canonical match.';}
   else if(foreignCats.length){reason='categoryId resolves to a category owned by another vehicle.';}
   else if(checklistComponents.length===1&&checklistMasters.length===1){candidate={masterCategoryId:checklistMasters[0],serviceComponentId:checklistComponents[0]};disposition='CANDIDATE_CHECKLIST_EVIDENCE';reason='Exactly one canonical component/master pair appears in this history row checklist; verify it represents this row rather than a multi-component session.';}
   else if(checklistComponents.length>1){reason='Checklist contains multiple components; root row cannot be assigned to a single component.';}
   return {path:p.path,id:p.id,vehicleId:str(r.vehicleId)||null,date:r.date||null,item:item||null,categoryId:cid||null,current:{masterCategoryId:r.masterCategoryId||null,serviceComponentId:r.serviceComponentId||null,actionType:r.actionType||null},sotReason:p.reason,categoryEvidence:{matches:catMatches.length,sameVehicleMatches:sameVehicleCats.length,foreignVehicleIds:[...new Set(foreignCats.map(c=>str(c.vehicleId)).filter(Boolean))]},checklistEvidence:{rows:checks.length,components:checklistComponents,masterCategories:checklistMasters,actions:checklistActions},disposition,candidate,reason};
 });
 const conflicts=[];
 logs.forEach((r,i)=>{if(!r)return;const checks=arr(r.checklist);const rootAction=str(r.actionType).toLowerCase();const actions=[...new Set(checks.map(c=>str(c&&c.actionType).toLowerCase()).filter(Boolean))];if(rootAction&&actions.length&&(!actions.includes(rootAction)||actions.length>1)){const components=[...new Set(checks.map(c=>str(c&&c.serviceComponentId)).filter(Boolean))];conflicts.push({path:`servisLogs[${i}]`,id:str(r.id),vehicleId:str(r.vehicleId),item:str(r.item),rootAction,checklistActions:actions,checklistRows:checks.length,componentIds:components,disposition:checks.length===1&&actions.length===1?'ROOT_ACTION_MAY_BE_STALE_SINGLE_CHECKLIST_ROW':'MANUAL_REVIEW_MULTI_ACTION_OR_ROWS',autoFix:false});}});
 const duplicateCategoryIds=[...catById.entries()].filter(([,a])=>a.length>1).map(([id,a])=>({categoryId:id,count:a.length,vehicleIds:[...new Set(a.map(c=>str(c&&c.vehicleId)).filter(Boolean))],canonicalPairs:[...new Set(a.map(c=>`${str(c&&c.masterCategoryId)}|${str(c&&c.serviceComponentId)}`).filter(x=>x!=='|'))]}));
 return {version:'S2172-SERVICE-CONFLICT-EVIDENCE-AUDIT',readOnly:true,input:{basename:sourceName,sha256:sourceHash},summary:{vehicles:vehicles.length,historyRows:logs.length,unresolvedRows:unresolved.length,actionConflicts:conflicts.length,duplicateCategoryIds:duplicateCategoryIds.length,autoFixes:0},unresolved,actionConflicts:conflicts,duplicateCategoryIds,policy:{sourceMutated:false,applyChanges:false,identityCandidatesAreNotAuthorizations:true,rootActionNeverOverridesPerComponentChecklist:true}};
}
function main(argv){const input=argv[2];if(!input){console.error('Usage: node scripts/s2172-service-conflict-evidence-audit.js <backup.json> [report.json]');process.exit(2);}const p=path.resolve(input),raw=fs.readFileSync(p);const result=audit(JSON.parse(raw.toString('utf8')),path.basename(p),sha(raw));const output=argv[3];if(output)fs.writeFileSync(path.resolve(output),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(sha(fs.readFileSync(p))!==result.input.sha256)process.exitCode=3;}
if(require.main===module)main(process.argv);
module.exports={audit,sha};
