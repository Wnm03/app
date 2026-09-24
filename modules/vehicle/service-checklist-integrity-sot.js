'use strict';
/* S2003 — read-only checklist/master/catalog integrity audit.
 * Exact IDs only. No fuzzy mapping and no automatic fabrication of parts.
 */
(function(root){
 const arr=v=>Array.isArray(v)?v:[]; const s=v=>String(v==null?'':v).trim();
 function masters(){return arr(root&&root.__SERVICE_MASTER_DATA__);}
 function masterById(id){for(const g of masters())for(const c of arr(g.items))if(c&&s(c.id)===s(id))return c;return null;}
 function checklistRows(){const groups=arr(root&&root.__SERVICE_CHECKLIST_GROUPS__);const out=[];groups.forEach(g=>arr(g&&g.items).forEach(i=>out.push(i)));return out;}
 function auditMaster(){
   const rows=checklistRows(), issues=[];
   rows.forEach((r,i)=>{const id=s(r&&r.itemId||r&&r.id);const c=masterById(id);if(!id)issues.push({code:'CHECKLIST_ID_MISSING',index:i});else if(!c)issues.push({code:'CHECKLIST_MASTER_MISSING',index:i,itemId:id});else if(!c.masterCategoryId)issues.push({code:'MASTER_CATEGORY_MISSING',index:i,itemId:id});});
   return {ok:issues.length===0,total:rows.length,issues,readOnly:true};
 }
 function auditLogs(vehicleId){
   const logs=arr(root&&root.D&&root.D.servisLogs).filter(x=>x&&(!vehicleId||s(x.vehicleId)===s(vehicleId))),issues=[];
   logs.forEach((log,i)=>{
     if(log.checklistItemId&&!masterById(log.checklistItemId))issues.push({code:'LOG_CHECKLIST_MASTER_MISSING',index:i,id:log.id,checklistItemId:log.checklistItemId});
     if(log.serviceComponentId&&!masterById(log.serviceComponentId))issues.push({code:'LOG_COMPONENT_MASTER_MISSING',index:i,id:log.id,serviceComponentId:log.serviceComponentId});
     if(log.serviceComponentId&&masterById(log.serviceComponentId)){const c=masterById(log.serviceComponentId);if(c.intervalKm!=null&&log.intervalKmAtService==null&&c.intervalTimeMonths==null)issues.push({code:'LOG_INTERVAL_SNAPSHOT_MISSING',index:i,id:log.id});}
     arr(log.catalogPartRefs).forEach(ref=>{if(!s(ref&&ref.catalogId))issues.push({code:'CATALOG_REF_ID_MISSING',index:i,id:log.id});else if(root&&root.VehicleCatalog&&typeof root.VehicleCatalog.isLoaded==='function'&&root.VehicleCatalog.isLoaded()&&typeof root.VehicleCatalog.getStore==='function'){const items=arr(root.VehicleCatalog.getStore().items);const hit=items.find(p=>p&&s(p.id)===s(ref.catalogId));if(!hit)issues.push({code:'CATALOG_PART_MISSING',index:i,id:log.id,catalogId:String(ref.catalogId)});else if(Array.isArray(hit.compatibleVehicleIds)&&hit.compatibleVehicleIds.length&&log.vehicleId&&!hit.compatibleVehicleIds.some(v=>s(v)===s(log.vehicleId)))issues.push({code:'CATALOG_PART_VEHICLE_MISMATCH',index:i,id:log.id,catalogId:String(ref.catalogId)});}});
     const sid=s(log.sessionId||log.serviceJobId);if(log.checklistItemId&&!sid)issues.push({code:'CHECKLIST_SESSION_MISSING',index:i,id:log.id});
   });
   return {ok:issues.length===0,total:logs.length,issues,readOnly:true};
 }
 function auditAll(opts){return {version:'S2003-V1',master:auditMaster(),logs:auditLogs(opts&&opts.vehicleId||null),readOnly:true};}
 const api={VERSION:'S2003-V1',masterById,auditMaster,auditLogs,auditAll};
 if(root)root.ServiceChecklistIntegritySOT=api;if(typeof globalThis!=='undefined')globalThis.ServiceChecklistIntegritySOT=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
