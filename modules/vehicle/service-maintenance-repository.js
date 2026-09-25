'use strict';
/*
 * SERVICE-MAINTENANCE-REPOSITORY — canonical read adapter
 *
 * SOT contract:
 *   D.servisLogs is the single service-history SoT.
 *   Service UI/session writer in servis.js is the ONLY mutation entry point.
 *
 * This module intentionally does NOT write D.servisLogs. The previous legacy
 * add/update/delete implementation was a second mutation path and could create
 * records without sessionId/serviceJobId/lifecycle events. That violated:
 *   1 SOT = 1 session = 1 history card = 1 edit form.
 *
 * Callers that need to create/edit/delete service history must go through the
 * canonical Servis form/session flow. This adapter remains available for
 * read-only consumers and for compatibility while migration completes.
 */
function smrArr(){return typeof D!=='undefined'&&Array.isArray(D.servisLogs)?D.servisLogs:[];}
function smrMutationBlocked(name){
  throw new Error(`ServiceMaintenanceRepository.${name} dinonaktifkan: gunakan alur Servis canonical (1 SOT/session → 1 tampilan → 1 formulir).`);
}
async function addMaintenance(){return smrMutationBlocked('addMaintenance');}
async function updateMaintenance(){return smrMutationBlocked('updateMaintenance');}
async function deleteMaintenance(){return smrMutationBlocked('deleteMaintenance');}
async function getMaintenanceHistory(vehicleId,componentId){
  return smrArr()
    .filter(x=>x&&String(x.vehicleId)===String(vehicleId)&&(!componentId||String(x.serviceComponentId||'')===String(componentId)))
    .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))
    .map(x=>Object.assign({},x));
}
async function getLatestMaintenance(vehicleId,componentId){
  const rows=await getMaintenanceHistory(vehicleId,componentId);
  return rows[0]||null;
}
const ServiceMaintenanceRepository={addMaintenance,updateMaintenance,deleteMaintenance,getMaintenanceHistory,getLatestMaintenance};
if(typeof globalThis!=='undefined')globalThis.ServiceMaintenanceRepository=ServiceMaintenanceRepository;
if(typeof module!=='undefined')module.exports=ServiceMaintenanceRepository;
