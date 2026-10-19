'use strict';
/* S2174: read-only trace of legacy service rows against exact same-vehicle reminder categories. */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const arr=v=>Array.isArray(v)?v:[];
const s=v=>v==null?'':String(v).trim();
const norm=v=>s(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('id-ID').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
function audit(data,sourceName='input.json',sourceHash=null){
 const logs=arr(data&&data.servisLogs),cats=arr(data&&data.sparepartCats),vehicles=arr(data&&data.vehicles);
 const byId=new Map(); for(const c of cats){const id=s(c&&c.id);if(id){const list=byId.get(id)||[];list.push(c);byId.set(id,list);}}
 const rows=logs.map((r,index)=>{
  const item=s(r&&r.item),vehicleId=s(r&&r.vehicleId),categoryId=s(r&&r.categoryId),matches=categoryId?(byId.get(categoryId)||[]):[];
  const exactLabel=matches.filter(c=>norm(c.name)===norm(item));
  const sameVehicleAll=matches.filter(c=>s(c.vehicleId)===vehicleId);
  const sameVehicle=exactLabel.filter(c=>s(c.vehicleId)===vehicleId);
  const active=sameVehicle.filter(c=>c.showInReminder===true&&(Number(c.intervalKm)>0||Number(c.intervalBulan)>0));
  const intervalAligned=active.filter(c=>{
   const km=Number(r&&r.km),iv=Number(c.intervalKm),snapshot=Number(r&&r.intervalKmAtService),due=Number(r&&r.nextDueKm);
   return Number.isFinite(km)&&iv>0&&snapshot===iv&&due===km+iv;
  });
  let status='NO_DETERMINISTIC_CATEGORY_EVIDENCE';
  if(categoryId&&matches.length!==1)status='BLOCK_DUPLICATE_OR_MISSING_CATEGORY_ID';
  else if(matches.length===1&&sameVehicle.length===1&&exactLabel.length===1&&active.length===1&&intervalAligned.length===1)status='CATEGORY_AND_INTERVAL_SNAPSHOT_CONFIRMED';
  else if(matches.length===1&&sameVehicle.length===1&&exactLabel.length===1&&active.length===1)status='CATEGORY_IDENTITY_CONFIRMED_SNAPSHOT_NEEDS_REVIEW';
  else if(matches.length===1&&sameVehicleAll.length===1)status='CATEGORY_ID_MATCH_BUT_LABEL_NOT_EXACT';
  return {path:`servisLogs[${index}]`,id:r&&r.id,vehicleId:vehicleId||null,date:r&&r.date||null,km:(r&&r.km)??null,item:item||null,identity:{masterCategoryId:r&&r.masterCategoryId||null,serviceComponentId:r&&r.serviceComponentId||null,categoryId:categoryId||null,actionType:r&&r.actionType||null},categoryEvidence:{idMatchCount:matches.length,exactLabelMatchCount:exactLabel.length,sameVehicleExactLabelCount:sameVehicle.length,reminderActiveCount:active.length,candidates:matches.map(c=>({id:c.id,name:c.name,vehicleId:c.vehicleId||null,intervalKm:c.intervalKm??null,intervalBulan:c.intervalBulan??null,showInReminder:c.showInReminder===true,serviceComponentId:c.serviceComponentId||null,masterCategoryId:c.masterCategoryId||null}))},snapshotEvidence:{intervalKmAtService:(r&&r.intervalKmAtService)!=null?r.intervalKmAtService:null,nextDueKm:(r&&r.nextDueKm)!=null?r.nextDueKm:null,expectedNextDueKm:active.length===1&&Number(active[0].intervalKm)>0&&Number.isFinite(Number(r&&r.km))?Number(r.km)+Number(active[0].intervalKm):null,aligned:intervalAligned.length===1},status,autoApply:false};
 });
 const unresolved=rows.filter(r=>!r.identity.serviceComponentId||!r.identity.masterCategoryId);
 const counts={}; for(const r of unresolved)counts[r.status]=(counts[r.status]||0)+1;
 return {version:'S2174-SERVICE-CATEGORY-RECOVERY-AUDIT',readOnly:true,input:{basename:sourceName,sha256:sourceHash},summary:{vehicles:vehicles.length,historyRows:logs.length,unresolvedIdentityRows:unresolved.length,categoryAndSnapshotConfirmed:unresolved.filter(r=>r.status==='CATEGORY_AND_INTERVAL_SNAPSHOT_CONFIRMED').length,categoryIdentityConfirmedSnapshotReview:unresolved.filter(r=>r.status==='CATEGORY_IDENTITY_CONFIRMED_SNAPSHOT_NEEDS_REVIEW').length,ambiguousOrMissingCategory:unresolved.filter(r=>r.status==='BLOCK_DUPLICATE_OR_MISSING_CATEGORY_ID').length,noDeterministicCategoryEvidence:unresolved.filter(r=>r.status==='NO_DETERMINISTIC_CATEGORY_EVIDENCE').length,statusCounts:counts,autoChanges:0},unresolved,policy:{sourceMutated:false,applyChanges:false,categoryIdIsNotCanonicalServiceComponentId:true,exactSameVehicleCategoryMaySupportCategoryReminderOnly:true,intervalResetRequiresConfirmedActionAndMatchingIdentity:true,rootActionDoesNotOverrideChecklist:true}};
}
function main(argv){const input=argv[2];if(!input){console.error('Usage: node scripts/s2174-service-category-recovery-audit.js <backup.json> [report.json]');process.exit(2);}const p=path.resolve(input),raw=fs.readFileSync(p),r=audit(JSON.parse(raw.toString('utf8')),path.basename(p),sha(raw));if(argv[3])fs.writeFileSync(path.resolve(argv[3]),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r,null,2));if(sha(fs.readFileSync(p))!==r.input.sha256)process.exitCode=3;}
if(require.main===module)main(process.argv);
module.exports={audit,sha,norm};
