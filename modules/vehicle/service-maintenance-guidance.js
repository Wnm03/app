'use strict';
/**
 * S1811 — Service maintenance guidance layer.
 * Rule-first, user-overridable. No AI decision is made here.
 * Canonical identity remains SERVICE_CHECKLIST_GROUPS/serviceComponentId.
 */
const SERVICE_CONDITION_RESULTS = Object.freeze([
  { id:'baik', label:'Baik', icon:'🟢' },
  { id:'mulai-aus', label:'Mulai aus', icon:'🟡' },
  { id:'aus', label:'Aus', icon:'🟠' },
  { id:'rusak', label:'Rusak', icon:'🔴' }
]);

function serviceConditionLabel(id){
  const hit=SERVICE_CONDITION_RESULTS.find(x=>x.id===id);
  return hit?hit.label:String(id||'');
}
function serviceConditionIcon(id){
  const hit=SERVICE_CONDITION_RESULTS.find(x=>x.id===id);
  return hit?hit.icon:'';
}
function validServiceCondition(id){return SERVICE_CONDITION_RESULTS.some(x=>x.id===id);}

function getServiceComponentMeta(id){
  if(!id||typeof ServiceInputCatalog==='undefined'||typeof ServiceInputCatalog.itemById!=='function')return null;
  const hit=ServiceInputCatalog.itemById(id);
  return hit&&hit.item?{item:hit.item,group:hit.group}:null;
}

function getServiceActionOptions(item){
  if(!item)return ['periksa','bersih','ganti'];
  if(typeof ServisChecklist!=='undefined'&&typeof ServisChecklist._validActionTypesFor==='function'){
    const v=ServisChecklist._validActionTypesFor(item);
    if(v&&v.length)return v.slice();
  }
  if(item.actionMode==='periksa-conditional'||item.actionMode==='alternate')return ['periksa','ganti'];
  if(item.actionMode==='none')return ['catat'];
  return [item.actionMode||'periksa'];
}

function recommendServiceAction({item,cat,urgency,conditionResult}={}){
  const valid=getServiceActionOptions(item);
  if(conditionResult==='aus'||conditionResult==='rusak'){
    if(valid.includes('ganti'))return {action:'ganti',reason:`Hasil pemeriksaan: ${serviceConditionLabel(conditionResult)}.`};
    if(valid.includes('bersih'))return {action:'bersih',reason:`Hasil pemeriksaan: ${serviceConditionLabel(conditionResult)}; tindakan bersihkan tersedia.`};
  }
  if(conditionResult==='mulai-aus'&&valid.includes('periksa'))return {action:'periksa',reason:'Hasil pemeriksaan menunjukkan komponen mulai aus; pantau dan periksa kembali.'};
  if(urgency&&urgency.nextAction&&valid.includes(urgency.nextAction)){
    const status=urgency.statusLabel||urgency.status||'jadwal servis';
    const axis=urgency.limitingAxis==='bulan'?'waktu':urgency.limitingAxis==='hari'?'tanggal':'odometer';
    return {action:urgency.nextAction,reason:`${status} berdasarkan ${axis}${urgency.condition?` · ${urgency.condition}`:''}.`};
  }
  return {action:valid[0]||'periksa',reason:'Tindakan default aman; keputusan akhir tetap manual.'};
}

function formatServiceRecommendationReason({recommendation,urgency}={}){
  if(!recommendation)return '';
  let s=recommendation.reason||'';
  if(urgency){
    if(urgency.nextDueKm!=null)s+=` Berikutnya ${Number(urgency.nextDueKm).toLocaleString('id-ID')} km.`;
    if(urgency.nextDueDate&&typeof fmtDateID==='function')s+=` / ${fmtDateID(urgency.nextDueDate)}.`;
  }
  return s.trim();
}

function summarizeServiceHistory(vehicleId,cat){
  const logs=Array.isArray(D.servisLogs)?D.servisLogs.filter(s=>s&&s.vehicleId===vehicleId&&(!cat||typeof servisLogMatchesCat!=='function'||servisLogMatchesCat(s,cat))):[];
  const by=(type)=>{
    const xs=logs.filter(s=>String(s.actionType||'ganti')===type);
    xs.sort((a,b)=>typeof compareServiceHistoryRecency==='function'?compareServiceHistoryRecency(a,b):String(b.date||'').localeCompare(String(a.date||''))||Number(b.km||0)-Number(a.km||0));
    return xs[0]||null;
  };
  return {lastInspected:by('periksa'),lastReplaced:by('ganti'),lastCleaned:by('bersih'),count:logs.length};
}

function serviceHistorySnapshotText(row){
  if(!row)return 'Belum pernah dicatat';
  const parts=[];
  if(row.date)parts.push(typeof fmtDateID==='function'?fmtDateID(row.date):row.date);
  if(Number.isFinite(Number(row.km)))parts.push(`${Number(row.km).toLocaleString('id-ID')} km`);
  return parts.join(' · ')||'Tercatat';
}


function isServiceComponentNotApplicable(vehicleId,componentId){
  if(!vehicleId||!componentId||typeof D==='undefined'||!Array.isArray(D.servisLogs))return false;
  const logs=D.servisLogs.filter(s=>s&&s.vehicleId===vehicleId).slice().sort((a,b)=>{
    if(typeof compareServiceHistoryRecency==='function')return compareServiceHistoryRecency(a,b);
    return String(b.date||'').localeCompare(String(a.date||''))||Number(b.km||0)-Number(a.km||0);
  });
  for(const log of logs){
    const rows=Array.isArray(log.checklist)?log.checklist:[];
    const hit=rows.find(r=>r&&String(r.itemId||r.serviceComponentId||'')===String(componentId));
    const na=Array.isArray(log.checklistNotApplicable)&&log.checklistNotApplicable.some(x=>String(x)===String(componentId));
    if(hit){ return hit.notApplicable===true; }
    if(na)return true;
  }
  return false;
}

function getServiceRecommendationForLog(log){
  if(!log)return null;
  const result=log.conditionResult||log.conditionStatus||null;
  if(result&&validServiceCondition(result)){
    const meta=getServiceComponentMeta(log.serviceComponentId);
    const rec=recommendServiceAction({item:meta&&meta.item,conditionResult:result});
    return rec;
  }
  return null;
}

function auditServiceMaintenanceIntegrity({groups,sparepartCats,servisLogs}={}){
  const gs=Array.isArray(groups)?groups:[];
  const items=gs.flatMap(g=>Array.isArray(g.items)?g.items:[]);
  const out={ok:true,duplicateIds:[],duplicateNames:[],invalidActions:[],unknownHistoryComponents:[],orphanCategories:[],genericBrakeDuplicates:[],legacyActionNames:[]};
  const seenId=new Set(),seenName=new Map();
  for(const it of items){
    if(seenId.has(it.id))out.duplicateIds.push(it.id); else seenId.add(it.id);
    const key=String(it.name||'').trim().toLowerCase();
    if(key){if(seenName.has(key))out.duplicateNames.push([seenName.get(key),it.id]);else seenName.set(key,it.id);}
    const allowed=getServiceActionOptions(it);
    if(!allowed.length)out.invalidActions.push(it.id);
  }
  const ids=new Set(items.map(x=>x.id));
  for(const s of (Array.isArray(servisLogs)?servisLogs:[])){
    if(s&&s.serviceComponentId&&!ids.has(s.serviceComponentId))out.unknownHistoryComponents.push({id:s.id,serviceComponentId:s.serviceComponentId});
    if(s&&['Kampas Rem','Pembersihan Rem'].includes(String(s.item||'').trim()))out.legacyActionNames.push({id:s.id,item:s.item});
  }
  for(const c of (Array.isArray(sparepartCats)?sparepartCats:[])){
    if(!c)continue;
    const cid=c.serviceComponentId||c.maintenanceRuleId;
    if(cid&&!ids.has(cid))out.orphanCategories.push({id:c.id,serviceComponentId:cid});
    if(String(c.name||'').trim().toLowerCase()==='kampas rem')out.genericBrakeDuplicates.push(c.id||c.name);
  }
  out.ok=!Object.values(out).some(v=>Array.isArray(v)&&v.length);
  return out;
}

if(typeof window!=='undefined'){
  window.SERVICE_CONDITION_RESULTS=SERVICE_CONDITION_RESULTS;
  window.serviceConditionLabel=serviceConditionLabel;
  window.serviceConditionIcon=serviceConditionIcon;
  window.validServiceCondition=validServiceCondition;
  window.getServiceComponentMeta=getServiceComponentMeta;
  window.getServiceActionOptions=getServiceActionOptions;
  window.recommendServiceAction=recommendServiceAction;
  window.formatServiceRecommendationReason=formatServiceRecommendationReason;
  window.summarizeServiceHistory=summarizeServiceHistory;
  window.serviceHistorySnapshotText=serviceHistorySnapshotText;
  window.getServiceRecommendationForLog=getServiceRecommendationForLog;
  window.isServiceComponentNotApplicable=isServiceComponentNotApplicable;
  window.auditServiceMaintenanceIntegrity=auditServiceMaintenanceIntegrity;
}
if(typeof module!=='undefined')module.exports={SERVICE_CONDITION_RESULTS,serviceConditionLabel,serviceConditionIcon,validServiceCondition,getServiceComponentMeta,getServiceActionOptions,recommendServiceAction,formatServiceRecommendationReason,summarizeServiceHistory,serviceHistorySnapshotText,isServiceComponentNotApplicable,getServiceRecommendationForLog,auditServiceMaintenanceIntegrity};
