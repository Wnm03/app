'use strict';
/* S2171: controlled, copy-only service backup migration.
 * Preview is default. Apply requires an exact input SHA-256 and a separate output path.
 * The source backup is never written. Ambiguous S2161 rows remain untouched.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const master=require(path.join(ROOT,'modules/vehicle/service-master-data.generated.js'));
global.SERVICE_CHECKLIST_GROUPS=master.SERVICE_CHECKLIST_GROUPS;
global.__SERVICE_CHECKLIST_GROUPS__=master.SERVICE_CHECKLIST_GROUPS;
global.ServiceTaxonomySOT=require(path.join(ROOT,'modules/vehicle/service-taxonomy-sot.js'));
const SOT=require(path.join(ROOT,'modules/vehicle/service-data-reconciliation-s2161.js'));
global.ServiceLegacyMappingS2163=require(path.join(ROOT,'modules/vehicle/service-legacy-mapping-s2163.js'));
const Reviewed=require(path.join(ROOT,'modules/vehicle/service-reviewed-mapping-migration-s2164.js'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const clone=x=>JSON.parse(JSON.stringify(x));
function prepare(data){
  const before=clone(data);
  const sotBefore=SOT.audit(data);
  const reviewedBefore=Reviewed.audit(data);
  const simulated=clone(data);
  const reviewedApply=Reviewed.apply(simulated,Reviewed.audit(simulated));
  const sotAfter=SOT.audit(simulated);
  const reviewedAfter=Reviewed.audit(simulated);
  const diff=[];
  (reviewedBefore.rows||[]).forEach(p=>{if(p.status!=='safe')return;const m=/^servisLogs\[(\d+)\]$/.exec(p.path);if(!m)return;const r=simulated.servisLogs[+m[1]];diff.push({path:p.path,id:p.id,vehicleId:p.vehicleId,legacyLabel:p.mapping&&p.mapping.legacy,from:{masterCategoryId:p.before.masterCategoryId,serviceComponentId:p.before.serviceComponentId},to:{masterCategoryId:r.masterCategoryId||null,serviceComponentId:r.serviceComponentId||null},basis:'S2163 reviewed:true + S2164 vehicle/conflict gates'});});
  return {before,simulated,report:{version:'S2171-CONTROLLED-SERVICE-BACKUP-MIGRATION',policy:{mode:'preview',sourceMutated:false,ambiguousRowsAutoFixed:false,outputMustDifferFromInput:true,applyRequiresExpectedSha256:true},summary:{historyRows:(data.servisLogs||[]).length,s2161Before:sotBefore.summary,s2164Before:reviewedBefore.summary,s2164SafeCandidates:diff.length,s2164Changed:reviewedApply.changed,s2161After:sotAfter.summary,s2164After:reviewedAfter.summary,stillUnresolvedAfter:sotAfter.rows.filter(x=>x.status==='unresolved').length},proposedChanges:diff,blocked:reviewedBefore.rows.filter(x=>['blocked','conflict'].includes(x.status)).map(x=>({path:x.path,id:x.id,status:x.status,reason:x.reason})),manualReviewRequired:sotBefore.rows.filter(x=>x.status==='unresolved').map(x=>({path:x.path,id:x.id,reason:x.reason,before:x.before})),rollback:{strategy:'source file remains unchanged; exact original bytes also saved beside output as .rollback.json on apply'}}};
}
function main(argv){
 const input=argv[2]; if(!input){console.error('Usage: node scripts/s2171-controlled-service-backup-migration.js <backup.json> [--apply --expected-sha256 <sha256> --output <new-backup.json>] [--report <report.json>]');process.exit(2);}
 const inputPath=path.resolve(input), raw=fs.readFileSync(inputPath), data=JSON.parse(raw.toString('utf8'));
 const inputHash=sha(raw), apply=argv.includes('--apply');
 const arg=(n)=>{const i=argv.indexOf(n);return i>=0?argv[i+1]:null;};
 const result=prepare(data); result.report.input={basename:path.basename(inputPath),sha256:inputHash};
 if(apply){
   const expected=arg('--expected-sha256'), output=arg('--output');
   if(!expected||expected!==inputHash){console.error(JSON.stringify({ok:false,error:'input_sha256_mismatch_or_missing',actualSha256:inputHash},null,2));process.exit(4);}
   if(!output){console.error('Apply requires --output pointing to a separate new file.');process.exit(2);}
   const outPath=path.resolve(output);
   if(outPath===inputPath){console.error('Refusing to overwrite source backup.');process.exit(5);}
   if(fs.existsSync(outPath)){console.error('Refusing to overwrite existing output: '+outPath);process.exit(6);}
   const rollbackPath=outPath+'.rollback.json';
   if(fs.existsSync(rollbackPath)){console.error('Refusing to overwrite existing rollback file: '+rollbackPath);process.exit(6);}
   fs.writeFileSync(rollbackPath,raw,{flag:'wx'});
   try {fs.writeFileSync(outPath,JSON.stringify(result.simulated,null,2)+'\n',{flag:'wx'});} catch(e){try{fs.unlinkSync(rollbackPath);}catch(cleanupError){console.error('Rollback-file cleanup failed after migration write error:',cleanupError&&cleanupError.message||cleanupError);} throw e;}
   const outRaw=fs.readFileSync(outPath), outData=JSON.parse(outRaw.toString('utf8'));
   const postSot=SOT.audit(outData), postReviewed=Reviewed.audit(outData);
   result.report.policy.mode='apply-to-copy';
   result.report.output={basename:path.basename(outPath),sha256:sha(outRaw),rollbackBasename:path.basename(rollbackPath),rollbackSha256:sha(fs.readFileSync(rollbackPath)),sourceUnchanged:sha(fs.readFileSync(inputPath))===inputHash};
   result.report.postApply={s2161:postSot.summary,s2164:postReviewed.summary,idempotenceSecondPassChanged:Reviewed.apply(clone(outData),postReviewed).changed};
   if(!result.report.output.sourceUnchanged||result.report.postApply.idempotenceSecondPassChanged!==0)process.exitCode=7;
 }
 const text=JSON.stringify(result.report,null,2); const reportPath=arg('--report'); if(reportPath)fs.writeFileSync(path.resolve(reportPath),text+'\n'); console.log(text);
}
if(require.main===module)main(process.argv);
module.exports={prepare,sha};
