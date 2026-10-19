'use strict';
/* S2170: read-only, row-level preview for service-data reconciliation.
 * Never mutates the supplied backup. Ambiguous records are review-only.
 */
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const master=require(path.join(ROOT,'modules/vehicle/service-master-data.generated.js'));
global.SERVICE_CHECKLIST_GROUPS=master.SERVICE_CHECKLIST_GROUPS;
global.__SERVICE_CHECKLIST_GROUPS__=master.SERVICE_CHECKLIST_GROUPS;
global.ServiceTaxonomySOT=require(path.join(ROOT,'modules/vehicle/service-taxonomy-sot.js'));
const Reconcile=require(path.join(ROOT,'modules/vehicle/service-data-reconciliation-s2161.js'));
const input=process.argv[2];
const output=process.argv[3];
if(!input){console.error('Usage: node scripts/s2170-service-backup-reconciliation-preview.js <backup.json> [report.json]');process.exit(2);}
const raw=fs.readFileSync(path.resolve(input),'utf8');
const data=JSON.parse(raw);
const beforeHash=require('node:crypto').createHash('sha256').update(raw).digest('hex');
const audit=Reconcile.audit(data);
const vehicles=new Map((Array.isArray(data.vehicles)?data.vehicles:[]).map(v=>[String(v&&v.id||''),v]));
const cats=Array.isArray(data.sparepartCats)?data.sparepartCats:[];
const categoryById=new Map(); for(const c of cats){const id=String(c&&c.id||'');if(!id)continue;const xs=categoryById.get(id)||[];xs.push(c);categoryById.set(id,xs);}
const logs=Array.isArray(data.servisLogs)?data.servisLogs:[];
const findings=[];
const add=(kind,severity,log,index,details,recommendation)=>findings.push({kind,severity,path:`servisLogs[${index}]`,id:String(log&&log.id||''),vehicleId:String(log&&log.vehicleId||''),date:log&&log.date||null,item:String(log&&log.item||''),details,recommendation});
logs.forEach((log,i)=>{
  if(!log)return;
  if(!String(log.vehicleId||'')||!vehicles.has(String(log.vehicleId))) add('vehicle-reference','BLOCK',log,i,{vehicleId:log.vehicleId||null,knownVehicle:vehicles.has(String(log.vehicleId||''))},'Jangan migrasikan otomatis; pastikan kendaraan pemilik riwayat terlebih dahulu.');
  const cid=String(log.categoryId||'');
  if(cid){const matches=categoryById.get(cid)||[];const foreign=matches.filter(c=>c&&c.vehicleId&&log.vehicleId&&String(c.vehicleId)!==String(log.vehicleId));if(foreign.length)add('cross-vehicle-category','BLOCK',log,i,{categoryId:cid,categoryVehicleIds:[...new Set(foreign.map(c=>String(c.vehicleId)))],historyVehicleId:String(log.vehicleId),categoryIdAmbiguous:matches.length>1},'Resolve ke kategori lokal kendaraan yang sama hanya jika identitas komponen kanonis dapat dibuktikan.');if(matches.length>1)add('duplicate-category-id','BLOCK',log,i,{categoryId:cid,matchCount:matches.length,categoryVehicleIds:[...new Set(matches.map(c=>String(c&&c.vehicleId||'')))]},'Selesaikan duplikasi ID kategori sebelum memperbaiki referensi.');}
  const km=Number(log.km), ik=Number(log.intervalKmAtService), due=Number(log.nextDueKm);
  if(log.nextDueKm!=null&&Number.isFinite(km)&&Number.isFinite(due)&&due<km)add('odometer-deadline','BLOCK',log,i,{serviceKm:km,nextDueKm:due},'Jangan mengubah otomatis; periksa odometer dan interval yang tersimpan.');
  if(log.intervalKmAtService!=null&&(!Number.isFinite(ik)||ik<0))add('invalid-interval-snapshot','BLOCK',log,i,{intervalKmAtService:log.intervalKmAtService},'Ambil interval dari sumber kanonis hanya setelah komponen dan aksi tervalidasi; pertahankan snapshot lama di audit trail.');
  if(log.nextDueAxis==='km'&&log.nextDueKm==null)add('missing-km-deadline','REVIEW',log,i,{nextDueAxis:log.nextDueAxis,intervalKmAtService:log.intervalKmAtService??null},'Hitung ulang hanya bila baseline servis dan interval kanonis dapat ditentukan.');
  if(log.nextDueAxis==='date'&&log.nextDueDate==null)add('missing-date-deadline','REVIEW',log,i,{nextDueAxis:log.nextDueAxis,intervalBulanAtService:log.intervalBulanAtService??null},'Hitung ulang hanya bila tanggal servis dan interval bulan kanonis dapat ditentukan.');
  const root=String(log.actionType||'').trim().toLowerCase();
  const rows=Array.isArray(log.checklist)?log.checklist:[];
  const actions=[...new Set(rows.map(x=>String(x&&x.actionType||'').trim().toLowerCase()).filter(Boolean))];
  if(root&&actions.length&&(!actions.includes(root)||actions.length>1))add('action-authority-conflict','REVIEW',log,i,{rootAction:root,checklistActions:actions,checklistRows:rows.length},'Gunakan aksi pada baris komponen yang cocok; jika tidak tunggal dan jelas, minta koreksi pengguna.');
});
const identityIssues=audit.rows.filter(x=>x.status!=='clean').map(x=>({path:x.path,id:x.id,status:x.status,reason:x.reason,before:x.before,after:x.after,source:x.source}));
const checklistIssues=audit.checklist.filter(x=>x.status!=='clean').map(x=>({path:x.path,id:x.id,status:x.status,reason:x.reason,before:x.before,after:x.after,source:x.source}));
const report={version:'SERVICE-BACKUP-RECONCILIATION-PREVIEW-S2170',readOnly:true,input:{basename:path.basename(input),sha256Before:beforeHash,sha256After:require('node:crypto').createHash('sha256').update(fs.readFileSync(path.resolve(input))).digest('hex')},summary:{vehicles:vehicles.size,historyRows:logs.length,categoryRows:cats.length,identityIssues:identityIssues.length,checklistIdentityIssues:checklistIssues.length,findings:findings.length,bySeverity:{BLOCK:findings.filter(x=>x.severity==='BLOCK').length,REVIEW:findings.filter(x=>x.severity==='REVIEW').length},byKind:findings.reduce((o,x)=>(o[x.kind]=(o[x.kind]||0)+1,o),{})},identityIssues,checklistIssues,findings,policy:{mutatedInput:false,automaticWrites:0,ambiguousRowsAreReviewOnly:true}};
const json=JSON.stringify(report,null,2);
if(output)fs.writeFileSync(path.resolve(output),json+'\n');
console.log(json);
if(report.input.sha256Before!==report.input.sha256After)process.exitCode=3;
