'use strict';
/**
 * S2071 — Car Notes canonical Vehicle SOT.
 *
 * One authoritative SOT per vehicle: D.vehicles[].sot.
 * Other SOT-named modules are adapters/auditors only; they must not own a
 * second persisted vehicle state. Global catalogs/taxonomy are reference
 * masters, not per-vehicle SOT.
 */
(function(root){
  const VERSION='CAR-NOTES-VEHICLE-SOT-V1';
  const str=v=>String(v==null?'':v).trim();
  const data=()=>typeof D!=='undefined'?D:root.D;
  const vehicles=()=>{const d=data();return d&&Array.isArray(d.vehicles)?d.vehicles:[];};
  const vehicle=id=>vehicles().find(v=>v&&str(v.id)===str(id))||null;
  const activeId=()=>{try{if(typeof curVehicleId!=='undefined')return str(curVehicleId);}catch(e){/* browser global may be unavailable in isolated evaluation. */} return str(root.curVehicleId||'');};
  function ensure(id){
    const v=vehicle(id||activeId());
    if(!v)return null;
    if(!v.sot||typeof v.sot!=='object'||Array.isArray(v.sot))v.sot={};
    v.sot.owner='VehicleCarNotesSOT';
    v.sot.version=VERSION;
    v.sot.vehicleId=String(v.id);
    v.sot.vehicleType=str(v.vehicleType||v.jenis||v.type)||null;
    v.sot.modelId=v.modelId||null;
    if(!Array.isArray(v.sot.serviceCategories)){
      const cats=(data()&&Array.isArray(data().sparepartCats))?data().sparepartCats:[];
      v.sot.serviceCategories=cats.filter(c=>c&&str(c.vehicleId)===String(v.id)).map(c=>normalizeCategory(c,v.id));
      v.sot.serviceCategoriesMigratedAt=new Date().toISOString();
    }
    return v.sot;
  }
  function read(id){const s=ensure(id);return s?JSON.parse(JSON.stringify(s)):null;}
  function mutate(id,mutator){
    const v=vehicle(id||activeId());
    if(!v)return {ok:false,code:'vehicle_not_found',vehicleId:str(id)||null};
    const s=ensure(v.id);
    const before=JSON.stringify(s);
    if(typeof mutator==='function')mutator(s,v);
    s.owner='VehicleCarNotesSOT';s.version=VERSION;s.vehicleId=String(v.id);s.vehicleType=str(v.vehicleType||v.jenis||v.type)||null;s.modelId=v.modelId||null;
    return {ok:true,changed:before!==JSON.stringify(s),vehicle:v,sot:s};
  }
  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(_){return v;}}
  function normalizeCategory(cat,vehicleId){
    const c=clone(cat||{}),vid=str(vehicleId||c.vehicleId||activeId());
    if(vid)c.vehicleId=vid;
    if(c.intervalKm!=null)c.intervalKm=Number(c.intervalKm)||0;
    if(c.intervalBulan!=null)c.intervalBulan=Number(c.intervalBulan)||0;
    if(c.showInReminder==null)c.showInReminder=!!(c.intervalKm||c.intervalBulan);
    return c;
  }
  function categoryKey(cat){return str(cat&&cat.serviceComponentId)||str(cat&&cat.id)||[str(cat&&cat.name).toLowerCase()].filter(Boolean).join('::');}
  function getServiceCategories(id){
    const s=ensure(id);
    if(!s)return [];
    if(!Array.isArray(s.serviceCategories))s.serviceCategories=[];
    return clone(s.serviceCategories);
  }
  function upsertServiceCategory(id,cat){
    const vid=str(id||cat&&cat.vehicleId||activeId());
    if(!vid||!vehicle(vid))return {ok:false,code:'vehicle_not_found',vehicleId:vid||null};
    const c=normalizeCategory(cat,vid); if(!categoryKey(c))return {ok:false,code:'category_identity_missing'};
    return mutate(vid,s=>{
      if(!Array.isArray(s.serviceCategories))s.serviceCategories=[];
      const key=categoryKey(c),i=s.serviceCategories.findIndex(x=>categoryKey(x)===key);
      if(i>=0)s.serviceCategories[i]=Object.assign({},s.serviceCategories[i],c,{vehicleId:vid});
      else s.serviceCategories.push(Object.assign({},c,{vehicleId:vid}));
    });
  }
  function removeServiceCategory(id,categoryId){
    const vid=str(id||activeId()); if(!vid||!vehicle(vid))return {ok:false,code:'vehicle_not_found',vehicleId:vid||null};
    return mutate(vid,s=>{if(!Array.isArray(s.serviceCategories))s.serviceCategories=[];s.serviceCategories=s.serviceCategories.filter(c=>str(c&&c.id)!==str(categoryId));});
  }
  function syncLegacyCategoryProjection(cat,op){
    const c=normalizeCategory(cat); const vid=str(c.vehicleId);
    if(!vid||!vehicle(vid))return {ok:false,code:'vehicle_not_found'};
    const r=upsertServiceCategory(vid,c);
    return Object.assign({projectionOnly:true,operation:op||'upsert'},r);
  }
  function removeLegacyCategoryProjection(categoryId,vehicleId){return removeServiceCategory(vehicleId,categoryId);}
  function setServiceSchedules(id,rules,meta){return mutate(id,(s)=>{s.serviceSchedules=Array.isArray(rules)?clone(rules):[];s.serviceScheduleCount=s.serviceSchedules.length;s.serviceProvisionedAt=meta&&meta.at||new Date().toISOString();s.serviceProvisioningStatus=s.serviceSchedules.length?'ready':'no-rules';s.serviceReminderVersion=meta&&meta.version||s.serviceReminderVersion||null;});}
  function getServiceSchedules(id){const s=ensure(id);return s&&Array.isArray(s.serviceSchedules)?clone(s.serviceSchedules):[];}
  function setMaintenanceState(id,state){return mutate(id,s=>{s.maintenanceState=state?JSON.parse(JSON.stringify(state)):null;});}
  function getMaintenanceState(id){const s=ensure(id);return s&&s.maintenanceState?JSON.parse(JSON.stringify(s.maintenanceState)):null;}
  function setProvisioning(id,payload){return mutate(id,s=>{const keep=['status','version','profileId','identificationConfidence','identificationSource','categoryCount','categoryNames','taxonomy','componentCount','catalogPartCount','catalogPartIds','catalogModelId','vehicleDatabaseItems','provisionedAt','candidates','autoDetected','expectedRange'];keep.forEach(k=>{if(payload&&Object.prototype.hasOwnProperty.call(payload,k))s[k]=JSON.parse(JSON.stringify(payload[k]));});});}
  function audit(id){
    const v=vehicle(id||activeId()); if(!v)return {ok:false,code:'vehicle_not_found'};
    const s=(v.sot&&typeof v.sot==='object'&&!Array.isArray(v.sot))?v.sot:{}, issues=[];
    if(s.vehicleId!==String(v.id))issues.push({code:'SOT_VEHICLE_ID_MISMATCH'});
    const vt=str(v.vehicleType||v.jenis||v.type).toLowerCase(), st=str(s.vehicleType).toLowerCase();
    if(vt&&st&&vt!==st)issues.push({code:'SOT_VEHICLE_TYPE_MISMATCH',expected:vt,actual:st});
    if(s.serviceSchedules!=null&&!Array.isArray(s.serviceSchedules))issues.push({code:'SERVICE_SCHEDULES_NOT_ARRAY'});
    const seen=new Set();for(const r of Array.isArray(s.serviceSchedules)?s.serviceSchedules:[]){const key=str(r&&r.catalogPartId||r&&r.serviceComponentId||r&&r.id);if(key&&seen.has(key))issues.push({code:'DUPLICATE_SERVICE_RULE',id:key});if(key)seen.add(key);}
    return {ok:issues.length===0,version:VERSION,vehicleId:String(v.id),vehicleType:vt||null,issues};
  }
  function auditAll(){return vehicles().map(v=>audit(v.id));}
  function assertRecord(record,vehicleId){const vid=str(vehicleId||activeId());return !!(record&&vid&&str(record.vehicleId)===vid);}
  function auditFinanceHistoryReminder(id){
    const vid=str(id||activeId()), v=vehicle(vid), issues=[];
    if(!v)return {ok:false,vehicleId:vid||null,issues:[{code:'VEHICLE_NOT_FOUND'}]};
    const txs=(data()&&Array.isArray(data().transactions))?data().transactions:[];
    const logs=(data()&&Array.isArray(data().servisLogs))?data().servisLogs:[];
    const vehicleLogs=logs.filter(x=>x&&str(x.vehicleId)===vid);
    const vehicleTxs=txs.filter(x=>x&&str(x.vehicleId)===vid);
    const byLog=new Map(vehicleLogs.map(x=>[String(x.id),x]));
    const byTx=new Map(txs.filter(Boolean).map(x=>[String(x.id),x]));
    vehicleLogs.forEach(s=>{
      if(!s.txLinkId)return;
      const t=byTx.get(String(s.txLinkId));
      if(!t)issues.push({code:'SERVICE_MISSING_FINANCE',serviceId:s.id,transactionId:s.txLinkId});
      else{
        if(String(t.vehicleId||'')!==vid)issues.push({code:'SERVICE_FINANCE_CROSS_VEHICLE',serviceId:s.id,transactionId:t.id});
        if(String(t.servisLinkId||'')!==String(s.id))issues.push({code:'SERVICE_FINANCE_BACKLINK_MISMATCH',serviceId:s.id,transactionId:t.id});
      }
    });
    vehicleTxs.forEach(t=>{
      if(!t.servisLinkId)return;
      const s=byLog.get(String(t.servisLinkId));
      if(!s)issues.push({code:'FINANCE_MISSING_SERVICE',transactionId:t.id,serviceId:t.servisLinkId});
      else if(String(s.vehicleId||'')!==vid)issues.push({code:'FINANCE_SERVICE_CROSS_VEHICLE',transactionId:t.id,serviceId:s.id});
    });
    const reminderCats=typeof getReminderCategoriesForVehicle==='function'?getReminderCategoriesForVehicle(vid):[];
    reminderCats.forEach(c=>{
      if(c&&c.vehicleId!=null&&String(c.vehicleId)!==vid)issues.push({code:'REMINDER_CROSS_VEHICLE',categoryId:c.id,vehicleId:c.vehicleId});
      if(c&&c.serviceComponentId&&typeof ServiceInputCatalog!=='undefined'&&ServiceInputCatalog&&typeof ServiceInputCatalog.itemById==='function'&&!ServiceInputCatalog.itemById(c.serviceComponentId))issues.push({code:'REMINDER_COMPONENT_NOT_CANONICAL',categoryId:c.id,serviceComponentId:c.serviceComponentId});
    });
    return {ok:issues.length===0,vehicleId:vid,serviceCount:vehicleLogs.length,financeServiceCount:vehicleTxs.filter(x=>x.servisLinkId).length,reminderCount:reminderCats.length,issues};
  }
  function auditFullFlow(id){
    const vid=str(id||activeId()), v=vehicle(vid), issues=[];
    if(!v)return {ok:false,vehicleId:vid||null,issues:[{code:'VEHICLE_NOT_FOUND'}]};
    const d=data()||{}, txs=Array.isArray(d.transactions)?d.transactions:[], logs=Array.isArray(d.servisLogs)?d.servisLogs:[];
    const scopedLogs=logs.filter(x=>x&&str(x.vehicleId)===vid), scopedTx=txs.filter(x=>x&&x.servisLinkId);
    const txById=new Map(txs.filter(x=>x&&x.id).map(x=>[String(x.id),x]));
    const logById=new Map(logs.filter(x=>x&&x.id).map(x=>[String(x.id),x]));
    const seenSessions=new Map(), seenComponents=new Map(), seenReminder=new Set();
    scopedLogs.forEach(s=>{
      const sid=str(s.sessionId||s.serviceJobId||s.id), cid=str(s.serviceComponentId||(Array.isArray(s.checklist)&&s.checklist[0]&&s.checklist[0].serviceComponentId)||'');
      if(!str(s.vehicleId))issues.push({code:'SERVICE_WITHOUT_VEHICLE',serviceId:s.id});
      if(s.txLinkId){const t=txById.get(str(s.txLinkId));if(!t)issues.push({code:'SERVICE_MISSING_FINANCE',serviceId:s.id,transactionId:s.txLinkId});else if(str(t.vehicleId)!==vid)issues.push({code:'SERVICE_FINANCE_CROSS_VEHICLE',serviceId:s.id,transactionId:t.id});else if(str(t.servisLinkId)!==str(s.id))issues.push({code:'SERVICE_FINANCE_BACKLINK_MISMATCH',serviceId:s.id,transactionId:t.id});}
      if(cid){const key=vid+'::'+sid+'::'+cid;if(seenComponents.has(key))issues.push({code:'DUPLICATE_SESSION_COMPONENT',key});seenComponents.set(key,s.id);}
      if(s.intervalKmAtService!=null||s.nextDueKm!=null||s.nextDueDate!=null){if(s.intervalKmAtService!=null&&Number(s.intervalKmAtService)<0)issues.push({code:'INVALID_INTERVAL_KM',serviceId:s.id});if(s.km!=null&&s.nextDueKm!=null&&Number(s.nextDueKm)<Number(s.km))issues.push({code:'NEXT_DUE_BEFORE_SERVICE_KM',serviceId:s.id});}
      if(!seenSessions.has(sid))seenSessions.set(sid,[]);seenSessions.get(sid).push(s);
    });
    txs.forEach(t=>{if(!t||!t.servisLinkId)return;if(!t.vehicleId)issues.push({code:'FINANCE_SERVICE_WITHOUT_VEHICLE',transactionId:t.id});const s=logById.get(str(t.servisLinkId));if(!s)issues.push({code:'FINANCE_MISSING_SERVICE',transactionId:t.id,serviceId:t.servisLinkId});else if(str(s.vehicleId)!==str(t.vehicleId))issues.push({code:'FINANCE_SERVICE_CROSS_VEHICLE',transactionId:t.id,serviceId:s.id});});
    const cats=getServiceCategories(vid), catByComp=new Map();
    cats.forEach(c=>{const cid=str(c&&c.serviceComponentId);if(!cid)return;if(catByComp.has(cid)&&JSON.stringify(catByComp.get(cid))!==JSON.stringify(c))issues.push({code:'CONFLICTING_INTERVAL_OWNER',serviceComponentId:cid});else catByComp.set(cid,c);});
    const reminders=typeof getReminderCategoriesForVehicle==='function'?getReminderCategoriesForVehicle(vid):[];
    reminders.forEach(r=>{const key=vid+'::'+str(r&&r.serviceComponentId||r&&r.id);if(seenReminder.has(key))issues.push({code:'DUPLICATE_REMINDER',key});seenReminder.add(key);if(r&&r.vehicleId!=null&&str(r.vehicleId)!==vid)issues.push({code:'REMINDER_CROSS_VEHICLE',categoryId:r.id,vehicleId:r.vehicleId});});
    for(const [sid,rows] of seenSessions){const components=new Set(rows.flatMap(r=>Array.isArray(r.checklist)?r.checklist.map(c=>str(c&&c.serviceComponentId||c&&c.itemId)).filter(Boolean):[]));if(rows.length>1&&components.size<rows.length)issues.push({code:'SESSION_COMPONENT_COLLISION',sessionId:sid});}
    const base=auditFinanceHistoryReminder(vid);issues.push(...(base.issues||[]));
    return {ok:issues.length===0,vehicleId:vid,sessionCount:seenSessions.size,serviceCount:scopedLogs.length,financeServiceCount:scopedTx.filter(x=>str(x.vehicleId)===vid).length,reminderCount:reminders.length,issues};
  }
  const api={version:VERSION,activeId,vehicle,ensure,read,mutate,setServiceSchedules,getServiceSchedules,getServiceCategories,upsertServiceCategory,removeServiceCategory,syncLegacyCategoryProjection,removeLegacyCategoryProjection,setMaintenanceState,getMaintenanceState,setProvisioning,audit,auditAll,assertRecord,auditFinanceHistoryReminder,auditFullFlow};
  root.VehicleCarNotesSOT=api;
  if(typeof window!=='undefined')window.VehicleCarNotesSOT=api;
  try{for(const v of vehicles())ensure(v.id);}catch(e){/* provisioning must remain fail-safe during bootstrap. */}
})(typeof globalThis!=='undefined'?globalThis:window);
