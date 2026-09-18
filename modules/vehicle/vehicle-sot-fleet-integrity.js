/* SOT-4G..4K — accumulated vehicle SOT hardening.
 * Read-first: VehicleCatalog remains the canonical part identity/rule source;
 * D.servisLogs/transactions/stock are historical/domain projections.
 */
const VEHICLE_SOT_FLEET_INTEGRITY_VERSION='SOT-FLEET-4G-4K-V1';
function vsfiArr(x){return Array.isArray(x)?x:[];}
function vsfiStr(x){return String(x==null?'':x).trim();}
function vsfiVehicle(id){return vsfiArr(typeof D!=='undefined'?D.vehicles:[]).find(v=>vsfiStr(v&&v.id)===vsfiStr(id))||null;}
function vsfiCurrentKm(vehicleId){
  if(typeof getVehicleKm==='function'){const n=Number(getVehicleKm(vehicleId));if(Number.isFinite(n))return n;}
  const rows=vsfiArr(typeof D!=='undefined'?D.kmLogs:[]).filter(x=>vsfiStr(x&&x.vehicleId)===vsfiStr(vehicleId)&&Number.isFinite(Number(x.km)));
  return rows.length?Math.max(...rows.map(x=>Number(x.km))):null;
}
function vsfiDate(v){const d=new Date(v);return isNaN(d)?null:d;}
function vsfiLatestService(vehicleId,partId){
  const rows=vsfiArr(typeof D!=='undefined'?D.servisLogs:[]).filter(s=>s&&vsfiStr(s.vehicleId)===vsfiStr(vehicleId)&&vsfiStr(s.catalogPartId)===vsfiStr(partId));
  rows.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.km||-1)-Number(a.km||-1));
  return rows[0]||null;
}
function vsfiDue(service,rule,now){
  if(!service)return {lastService:null,nextDueKm:null,nextDueDate:null,status:'belum_pernah',remainingKm:rule.intervalKm==null?null:(vsfiCurrentKm(rule.vehicleId)||0)-0,remainingDays:null};
  const km=Number(service.km), intervalKm=Number(rule.intervalKm);
  const nextDueKm=Number.isFinite(km)&&intervalKm>0?km+intervalKm:null;
  let nextDueDate=null;
  const months=Number(rule.intervalBulan);
  if(months>0&&service.date){const d=new Date(service.date);if(!isNaN(d)){const day=d.getDate();d.setMonth(d.getMonth()+months);if(d.getDate()!==day)d.setDate(0);nextDueDate=d.toISOString().slice(0,10);}}
  const cur=Number(vsfiCurrentKm(rule.vehicleId));
  const remainKm=nextDueKm==null||!Number.isFinite(cur)?null:nextDueKm-cur;
  const today=now||new Date(); const dueDate=nextDueDate?new Date(nextDueDate+'T23:59:59'):null;
  const remainDays=dueDate?Math.ceil((dueDate-today)/86400000):null;
  const due=(remainKm!=null&&remainKm<=0)||(remainDays!=null&&remainDays<=0);
  const soon=(remainKm!=null&&rule.intervalKm>0&&remainKm/rule.intervalKm<=.15)||(remainDays!=null&&months>0&&remainDays/(months*30.4368)<=.15);
  return {lastService:service,nextDueKm,nextDueDate,remainingKm:remainKm,remainingDays:remainDays,status:due?'jatuh_tempo':soon?'segera':'aman'};
}
async function vsfiServiceState(vehicleId,options){
  const v=vsfiVehicle(vehicleId); if(!v)return {ok:false,reason:'vehicle_missing',vehicleId};
  if(typeof VehicleServiceReminderSOT==='undefined')return {ok:false,reason:'service_sot_unavailable',vehicleId};
  const schedules=await VehicleServiceReminderSOT.getSchedules(vehicleId);
  const now=options&&options.now?new Date(options.now):new Date();
  const states=schedules.map(r=>{const rule=Object.assign({},r,{vehicleId});return Object.assign({},rule,vsfiDue(vsfiLatestService(vehicleId,r.catalogPartId),rule,now));});
  const projection={version:VEHICLE_SOT_FLEET_INTEGRITY_VERSION,currentKm:vsfiCurrentKm(vehicleId),calculatedAt:new Date().toISOString(),items:states};
  v.sot=v.sot||{};v.sot.maintenanceState=projection;return {ok:true,vehicleId,projection};
}
function vsfiServiceEvent(){try{if(typeof AIBus==='undefined'||typeof AIBus.on!=='function')return; if(window.__vsfiSub)return; window.__vsfiSub=AIBus.on('vehicle.updated',e=>{const id=e&&e.vehicleId;if(id)vsfiServiceState(id).catch(()=>{});});}catch(e){void e;}}

async function vsfiIsolationAudit(){
  const vehicles=vsfiArr(typeof D!=='undefined'?D.vehicles:[]); const issues=[];
  const seen=new Map();
  for(const v of vehicles){const ids=vsfiArr(v&&v.sot&&v.sot.serviceSchedules).map(x=>vsfiStr(x.catalogPartId)).filter(Boolean); for(const id of ids){const arr=seen.get(id)||[];arr.push(v.id);seen.set(id,arr);}}
  if(typeof VehicleCatalog!=='undefined'&&VehicleCatalog.getAll){
    const parts=await VehicleCatalog.getAll();
    for(const p of parts||[]){const vids=vsfiArr(p.compatibleVehicleIds).map(String);const mids=vsfiArr(p.compatibleModelIds).map(String);for(const v of vehicles){if(v.modelId&&mids.includes(String(v.modelId)))continue;if(vids.length&&vids.includes(String(v.id)))continue; if(seen.get(String(p.id))&&seen.get(String(p.id)).includes(v.id))issues.push({code:'service_projection_scope_mismatch',vehicleId:v.id,catalogPartId:p.id});}}
  }
  return {ok:issues.length===0,issues};
}
async function vsfiReferenceAudit(){
  const issues=[], refs=[]; let parts=[];
  if(typeof VehicleCatalog!=='undefined'&&VehicleCatalog.getAll)parts=await VehicleCatalog.getAll();
  const ids=new Set((parts||[]).map(p=>vsfiStr(p&&p.id)).filter(Boolean));
  const check=(domain,row,i)=>{const id=vsfiStr(row&&row.catalogPartId);if(id){refs.push({domain,id,rowId:row.id});if(!ids.has(id))issues.push({code:'missing_catalog_ref',domain,rowId:row.id,catalogPartId:id});}};
  for(const s of vsfiArr(typeof D!=='undefined'?D.servisLogs:[]))check('service',s);
  for(const t of vsfiArr(typeof D!=='undefined'?D.transactions:[]))check('transaction',t);
  for(const s of vsfiArr(typeof D!=='undefined'?D.spareparts:[]))check('stock',s);
  const notes=vsfiArr(typeof D!=='undefined'?D.carNotes:[]); for(const n of notes){for(const id of vsfiArr(n&&n.catalogPartRefs)){const cid=vsfiStr(typeof id==='object'?(id.catalogId||id.catalogPartId):id);if(cid&&!ids.has(cid))issues.push({code:'missing_catalog_ref',domain:'car-notes',rowId:n.id,catalogPartId:cid});}}
  return {ok:issues.length===0,issues,referenceCount:refs.length,catalogCount:parts.length};
}
async function vsfiFleetProvision(options){
  const results=[]; for(const v of vsfiArr(typeof D!=='undefined'?D.vehicles:[])){let p=null,s=null;try{if(typeof VehicleSOTProvisioning!=='undefined')p=await VehicleSOTProvisioning.provisionVehicle(v,options||{});}catch(e){p={ok:false,error:String(e)};}try{s=await vsfiServiceState(v.id,options||{});}catch(e){s={ok:false,error:String(e)};}results.push({vehicleId:v.id,provision:p,service:s});} return {ok:results.every(x=>x.provision!==false&&x.service!==false),results};
}
async function vsfiHealth(){
  const vehicles=vsfiArr(typeof D!=='undefined'?D.vehicles:[]); const rows=[];
  const iso=await vsfiIsolationAudit(); const refs=await vsfiReferenceAudit();
  for(const v of vehicles){const sot=v.sot||{};const parts=vsfiArr(sot.catalogParts||sot.partProjection||sot.components);const schedules=vsfiArr(sot.serviceSchedules);const state=sot.maintenanceState;let status='ready';if(!v.modelId)status='needs-model';else if(!schedules.length)status='needs-service-catalog';else if(state&&state.items&&state.items.some(x=>x.status==='jatuh_tempo'))status='service-due';rows.push({vehicleId:v.id,name:v.name||'',modelId:v.modelId||null,status,partCount:parts.length,serviceRuleCount:schedules.length,maintenanceStateCount:vsfiArr(state&&state.items).length});}
  return {version:VEHICLE_SOT_FLEET_INTEGRITY_VERSION,ok:iso.ok&&refs.ok,vehicles:rows,isolation:iso,references:refs};
}
const VehicleSOTFleetIntegrity={version:VEHICLE_SOT_FLEET_INTEGRITY_VERSION,serviceState:vsfiServiceState,isolationAudit:vsfiIsolationAudit,referenceAudit:vsfiReferenceAudit,provisionFleet:vsfiFleetProvision,health:vsfiHealth};
if(typeof window!=='undefined'){window.VehicleSOTFleetIntegrity=VehicleSOTFleetIntegrity;setTimeout(vsfiServiceEvent,0);}
if(typeof globalThis!=='undefined')globalThis.VehicleSOTFleetIntegrity=VehicleSOTFleetIntegrity;
if(typeof module!=='undefined')module.exports=VehicleSOTFleetIntegrity;
