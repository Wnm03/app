/* SOT-3H — VehicleCatalog lifecycle integrity.
 * Safe lifecycle gate: referenced catalog parts cannot be physically deleted.
 * Read-only audit helpers are exposed for diagnostics; no auto-repair/merge.
 */
const VEHICLE_CATALOG_LIFECYCLE_SOT_VERSION='SOT-CATALOG-LIFECYCLE-V1';
function vcLifeArr(v){return Array.isArray(v)?v:[];}
function vcLifeId(v){return v==null?'':String(v).trim();}
function vcLifeRefs(row){
 const out=[];
 if(row&&vcLifeId(row.catalogPartId))out.push(vcLifeId(row.catalogPartId));
 if(row&&vcLifeId(row.catalogId))out.push(vcLifeId(row.catalogId));
 vcLifeArr(row&&row.catalogPartRefs).forEach(r=>{if(r&&vcLifeId(r.catalogId))out.push(vcLifeId(r.catalogId));});
 return [...new Set(out)];
}
function vcLifeAudit(input){
 input=input||{};
 const domains=[
  ['stock',input.partsStock],['transactions',input.transactions],
  ['services',input.servisLogs||input.services],['carNotes',input.carNotes||input.carNotesComponents]
 ];
 const usage=new Map();
 domains.forEach(([domain,rows])=>vcLifeArr(rows).forEach((row,index)=>vcLifeRefs(row).forEach(id=>{
   if(!usage.has(id))usage.set(id,[]);
   usage.get(id).push({domain,index});
 })));
 const catalogIds=new Set(vcLifeArr(input.catalogItems).map(x=>vcLifeId(x&&x.id)).filter(Boolean));
 const referenced=[...usage.keys()];
 const missingReferences=referenced.filter(id=>!catalogIds.has(id));
 return {
  version:VEHICLE_CATALOG_LIFECYCLE_SOT_VERSION,
  referencedCatalogPartIds:referenced,
  usage:Object.fromEntries([...usage.entries()]),
  missingReferences,
  ok:missingReferences.length===0
 };
}
function vcLifeGuard(ids,input){
 const audit=vcLifeAudit(input||{});
 const requested=[...new Set(vcLifeArr(ids).map(vcLifeId).filter(Boolean))];
 const blocked=requested.filter(id=>audit.usage[id]);
 return {ok:blocked.length===0,requested,blocked,usage:audit.usage,errors:blocked.map(id=>'Part katalog '+id+' masih direferensikan oleh data lain.')};
}

const VehicleCatalogLifecycleSOT={
 version:VEHICLE_CATALOG_LIFECYCLE_SOT_VERSION,
 audit:vcLifeAudit,
 guard:vcLifeGuard
};
if(typeof window!=='undefined')window.VehicleCatalogLifecycleSOT=VehicleCatalogLifecycleSOT;
if(typeof globalThis!=='undefined')globalThis.VehicleCatalogLifecycleSOT=VehicleCatalogLifecycleSOT;

/* Runtime deletion gate. Uses the current D datasets at delete time so the
 * guard sees edits made after app startup. If the gate is unavailable, the
 * original delete API remains untouched rather than silently changing UX. */
(function installVehicleCatalogLifecycleDeleteGate(){
 if(typeof VehicleCatalog==='undefined' || !VehicleCatalog || VehicleCatalog.__lifecycleGateInstalled)return;
 const originalRemove=VehicleCatalog.remove;
 const originalRemoveMany=VehicleCatalog.removeMany;
 const originalRemoveAll=VehicleCatalog.removeAll;
 const snapshot=async()=>({
  catalogItems:await VehicleCatalog.getAll(),
  partsStock:(typeof D!=='undefined'&&D.partsStock)||[],
  transactions:(typeof D!=='undefined'&&D.transactions)||[],
  servisLogs:(typeof D!=='undefined'&&D.servisLogs)||[],
  carNotes:(typeof D!=='undefined'&&(D.carNotes||D.carNotesComponents))||[]
 });
 VehicleCatalog.remove=async function(id){
  const g=vcLifeGuard([id],await snapshot());
  if(!g.ok)return {success:false,blocked:true,errors:g.errors,blockedIds:g.blocked,usage:g.usage};
  return originalRemove.call(VehicleCatalog,id);
 };
 VehicleCatalog.removeMany=async function(ids){
  const g=vcLifeGuard(ids,await snapshot());
  if(!g.ok)return {success:false,blocked:true,removed:0,errors:g.errors,blockedIds:g.blocked,usage:g.usage};
  return originalRemoveMany.call(VehicleCatalog,ids);
 };
 VehicleCatalog.removeAll=async function(){
  const items=await VehicleCatalog.getAll();
  const g=vcLifeGuard(items.map(x=>x&&x.id),await snapshot());
  if(!g.ok)return {success:false,blocked:true,removed:0,errors:['Tidak dapat menghapus semua katalog: masih ada part yang direferensikan.'],blockedIds:g.blocked,usage:g.usage};
  return originalRemoveAll.call(VehicleCatalog);
 };
 Object.defineProperty(VehicleCatalog,'__lifecycleGateInstalled',{value:true,enumerable:false});
})();

if(typeof module!=='undefined')module.exports=VehicleCatalogLifecycleSOT;
