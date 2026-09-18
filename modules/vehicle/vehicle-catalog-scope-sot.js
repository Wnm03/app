/* SOT-3E: vehicle-scoped catalog import/seed guard. Read-only audit + safe helpers. */
const VEHICLE_CATALOG_SCOPE_SOT_VERSION='SOT-CATALOG-SCOPE-V1';
function vcssId(v){return v==null?'':String(v);}
function vcssUniqueIds(a){return Array.from(new Set((Array.isArray(a)?a:[]).filter(v=>v!==null&&v!==undefined&&v!=='').map(v=>String(v))));}
function vcssCompatible(item,vehicleId){
  if(!vehicleId)return true;
  const ids=vcssUniqueIds(item&&item.compatibleVehicleIds);
  return ids.includes(String(vehicleId));
}
function vcssCurrentVehicleId(){return typeof curVehicleId!=='undefined'&&curVehicleId!=null&&curVehicleId!==''?String(curVehicleId):'';}
function vcssVehicleExists(vehicleId){
  if(!vehicleId||typeof D==='undefined'||!Array.isArray(D.vehicles))return false;
  return D.vehicles.some(v=>v&&String(v.id)===String(vehicleId));
}
function vcssScopeReport(items,vehicleId){
  const list=Array.isArray(items)?items:[]; const vid=vehicleId==null?'':String(vehicleId);
  let total=0,scoped=0,unscoped=0,foreign=0,invalidIds=0;
  const invalid=[];
  for(const it of list){if(!it)continue;total++;const ids=vcssUniqueIds(it.compatibleVehicleIds);if(!ids.length){unscoped++;continue;}if(vid&&ids.includes(vid))scoped++;if(vid&&!ids.includes(vid))foreign++;const bad=ids.filter(id=>!vcssVehicleExists(id));if(bad.length){invalidIds+=bad.length;invalid.push({id:it.id,partName:it.partName,vehicleIds:bad});}}
  return {version:VEHICLE_CATALOG_SCOPE_SOT_VERSION,vehicleId:vid,total,scoped,unscoped,foreign,invalidIds,invalid};
}
async function vcssAudit(vehicleId){
  const items=typeof VehicleCatalog!=='undefined'&&VehicleCatalog.getAll?await VehicleCatalog.getAll():[];
  return vcssScopeReport(items,vehicleId||vcssCurrentVehicleId());
}
async function vcssEnsureSeedScope(vehicleId){
  const vid=vehicleId||vcssCurrentVehicleId();
  if(!vid||!vcssVehicleExists(vid)||typeof VehiclePartSOT==='undefined'||!VehiclePartSOT.seed||typeof VehicleCatalog==='undefined')return {success:false,reason:'vehicle-or-sot-unavailable',vehicleId:vid};
  let added=0,updated=0,skipped=0; await VehicleCatalog.ensureLoaded();
  const all=await VehicleCatalog.getAll();
  for(const seed of VehiclePartSOT.seed){
    if(!seed)continue;
    const code=String(seed.oemCode||'').trim().toLowerCase().replace(/[\s-]/g,'');
    const candidates=all.filter(it=>code&&String(it.oemCode||'').trim().toLowerCase().replace(/[\s-]/g,'')===code);
    if(candidates.length!==1){skipped++;continue;}
    const it=candidates[0]; const ids=vcssUniqueIds(it.compatibleVehicleIds); if(ids.includes(vid))continue;
    const next=ids.concat([vid]); const r=await VehicleCatalog.update(it.id,{compatibleVehicleIds:next}); if(r&&r.success)updated++;
  }
  return {success:true,vehicleId:vid,added,updated,skipped};
}
const VehicleCatalogScopeSOT={version:VEHICLE_CATALOG_SCOPE_SOT_VERSION,audit:vcssAudit,scopeReport:vcssScopeReport,ensureSeedScope:vcssEnsureSeedScope,isCompatible:vcssCompatible};
if(typeof window!=='undefined')window.VehicleCatalogScopeSOT=VehicleCatalogScopeSOT;
