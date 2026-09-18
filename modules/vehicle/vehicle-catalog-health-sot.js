// vehicle-catalog-health-sot.js — SOT-3D read-only duplicate/identity audit.
// Tidak melakukan merge/delete/update otomatis. Tujuan: mendeteksi kandidat
// konflik identitas sebelum rekonsiliasi manual/terkonfirmasi.
const VEHICLE_CATALOG_HEALTH_SOT_VERSION='SOT-CATALOG-HEALTH-V1';
function vcHealthNorm(v){return String(v==null?'':v).trim().toLowerCase().replace(/[\s\-_/.]+/g,'');}
function vcHealthText(v){return String(v==null?'':v).trim().toLowerCase().replace(/\s+/g,' ');}
function vcHealthVehicles(it){return Array.isArray(it&&it.compatibleVehicleIds)?it.compatibleVehicleIds.map(String).filter(Boolean).sort():[];}
function vcHealthSameVehicle(a,b){
 const av=vcHealthVehicles(a),bv=vcHealthVehicles(b);
 if(!av.length||!bv.length)return !av.length&&!bv.length;
 return av.some(x=>bv.includes(x));
}
function vcHealthGroup(items,keyFn){
 const map=new Map();(Array.isArray(items)?items:[]).forEach(it=>{const k=keyFn(it);if(!k)return;if(!map.has(k))map.set(k,[]);map.get(k).push(it);});
 return [...map.entries()].filter(([,rows])=>rows.length>1).map(([key,rows])=>({key,items:rows}));
}
function vcHealthIdentityGroups(items,field){
 const keyFn=field==='oemCode'?it=>vcHealthNorm(it.oemCode):field==='barcode'?it=>vcHealthNorm(it.barcode):field==='aftermarketCode'?it=>vcHealthNorm(it.aftermarketCode):it=>vcHealthText(it.partName)+'|'+vcHealthText(it.category);
 return vcHealthGroup(items,keyFn);
}
function vcHealthPackageKind(it){const n=vcHealthText(it&&it.partName);return /\b(assy|assembly|set|paket|pack|kit|isi|pcs|buah)\b/.test(n)?'package':'individual';}
function vcHealthPairReason(a,b){
 const reasons=[];
 if(vcHealthNorm(a.oemCode)&&vcHealthNorm(a.oemCode)===vcHealthNorm(b.oemCode))reasons.push('same_oem');
 if(vcHealthNorm(a.barcode)&&vcHealthNorm(a.barcode)===vcHealthNorm(b.barcode))reasons.push('same_barcode');
 if(vcHealthNorm(a.aftermarketCode)&&vcHealthNorm(a.aftermarketCode)===vcHealthNorm(b.aftermarketCode))reasons.push('same_aftermarket_code');
 if(vcHealthText(a.partName)===vcHealthText(b.partName)&&vcHealthText(a.category)===vcHealthText(b.category))reasons.push('same_name_category');
 if(!vcHealthSameVehicle(a,b))reasons.push('different_vehicle_scope');
 if(vcHealthText(a.partName)===vcHealthText(b.partName)&&vcHealthNorm(a.oemCode)!==vcHealthNorm(b.oemCode))reasons.push('different_oem_never_merge');
 if(vcHealthPackageKind(a)!==vcHealthPackageKind(b))reasons.push('package_vs_individual_never_merge');
 return reasons;
}
function vcHealthAuditCatalog(items){
 const list=Array.isArray(items)?items:[], candidates=[];
 const seen=new Set();
 for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
  const a=list[i],b=list[j];
  const reasons=vcHealthPairReason(a,b);
  const strong=reasons.some(x=>x==='same_oem'||x==='same_barcode'||x==='same_aftermarket_code');
  const nameConflict=reasons.includes('different_oem_never_merge')||reasons.includes('package_vs_individual_never_merge');
  if(!strong&&!nameConflict)continue;
  const key=[String(a.id),String(b.id)].sort().join('|'); if(seen.has(key))continue;seen.add(key);
  candidates.push({ids:[a.id,b.id],reason:reasons,reviewRequired:true,autoMerge:false});
 }
 return {
  version:VEHICLE_CATALOG_HEALTH_SOT_VERSION,total:list.length,
  duplicateOem:vcHealthIdentityGroups(list,'oemCode'),
  duplicateBarcode:vcHealthIdentityGroups(list,'barcode'),
  duplicateAftermarketCode:vcHealthIdentityGroups(list,'aftermarketCode'),
  duplicateNameCategory:vcHealthIdentityGroups(list,'nameCategory'),
  candidates,
  rules:{sameNameOnlyNeverMerge:true,differentOemNeverMerge:true,packageVsIndividualNeverMerge:true,autoMerge:false}
 };
}
function vcHealthAuditStock(stockRows,catalogItems){
 const stock=Array.isArray(stockRows)?stockRows:[],catalog=Array.isArray(catalogItems)?catalogItems:[];
 const byId=new Map(catalog.map(it=>[String(it.id),it]));
 const linked=new Map(), invalid=[], unlinked=[];
 stock.forEach((row,index)=>{
  const id=row&& (row.catalogPartId||row.catalogId);
  if(id){const it=byId.get(String(id));if(!it){invalid.push({index,id});return;}const k=String(id);if(!linked.has(k))linked.set(k,[]);linked.get(k).push(row);}
  else unlinked.push({index,row});
 });
 return {total:stock.length,linkedToCatalog:[...linked.entries()].filter(([,rows])=>rows.length>1).map(([catalogPartId,rows])=>({catalogPartId,count:rows.length,rows})),invalidLinks:invalid,unlinked};
}
function vcHealthAudit(items,stockRows){
 const catalog=vcHealthAuditCatalog(items),stock=vcHealthAuditStock(stockRows,Array.isArray(items)?items:[]);
 return {version:VEHICLE_CATALOG_HEALTH_SOT_VERSION,catalog,stock,ok:catalog.candidates.length===0&&stock.invalidLinks.length===0};
}
const VehicleCatalogHealthSOT={version:VEHICLE_CATALOG_HEALTH_SOT_VERSION,norm:vcHealthNorm,auditCatalog:vcHealthAuditCatalog,auditStock:vcHealthAuditStock,audit:vcHealthAudit};
if(typeof window!=='undefined')window.VehicleCatalogHealthSOT=VehicleCatalogHealthSOT;
