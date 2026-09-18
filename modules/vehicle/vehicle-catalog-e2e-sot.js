/* SOT-3G — end-to-end VehicleCatalog identity integrity.
 * Read-only by default: audit references across stock, transactions, services,
 * and Car Notes. Never merges/deletes/repairs records automatically.
 */
const VEHICLE_CATALOG_E2E_SOT_VERSION='SOT-CATALOG-E2E-V1';
function vcE2eArr(v){return Array.isArray(v)?v:[];}
function vcE2eId(v){return v==null?'':String(v).trim();}
function vcE2eNorm(v){return String(v==null?'':v).trim().toLowerCase().replace(/[\s\-_/.]+/g,'');}
function vcE2eCatalogMap(items){return new Map(vcE2eArr(items).filter(x=>x&&x.id!=null).map(x=>[vcE2eId(x.id),x]));}
function vcE2eRefs(row){
 const out=[];
 if(row&&row.catalogPartId!=null&&vcE2eId(row.catalogPartId))out.push({id:vcE2eId(row.catalogPartId),source:'catalogPartId'});
 if(row&&row.catalogId!=null&&vcE2eId(row.catalogId))out.push({id:vcE2eId(row.catalogId),source:'catalogId'});
 vcE2eArr(row&&row.catalogPartRefs).forEach((r,i)=>{if(r&&r.catalogId!=null&&vcE2eId(r.catalogId))out.push({id:vcE2eId(r.catalogId),source:'catalogPartRefs',index:i});});
 return out;
}
function vcE2eAuditDomain(rows,domain,catalogMap){
 const issues=[],refs=[];
 vcE2eArr(rows).forEach((row,index)=>{
  if(!row)return;
  vcE2eRefs(row).forEach(ref=>{
   const item=catalogMap.get(ref.id); refs.push({domain,index,id:ref.id,source:ref.source});
   if(!item)issues.push({code:'CATALOG_REF_MISSING',domain,index,catalogPartId:ref.id,source:ref.source});
   if(ref.source==='catalogPartId'&&row.catalogId!=null&&vcE2eId(row.catalogId)&&vcE2eId(row.catalogId)!==ref.id)
     issues.push({code:'CATALOG_ID_MISMATCH',domain,index,catalogPartId:ref.id,catalogId:vcE2eId(row.catalogId)});
  });
 });
 return {domain,total:vcE2eArr(rows).length,refs,issues};
}
function vcE2eAuditSnapshot(rows,domain,catalogMap){
 const issues=[];
 vcE2eArr(rows).forEach((row,index)=>{
  if(!row)return; const id=vcE2eId(row.catalogPartId||row.catalogId); if(!id)return;
  const item=catalogMap.get(id); if(!item)return;
  if(row.catalogPartOemCode&&item.oemCode&&vcE2eNorm(row.catalogPartOemCode)!==vcE2eNorm(item.oemCode))
    issues.push({code:'CATALOG_SNAPSHOT_OEM_DRIFT',domain,index,catalogPartId:id,snapshot:row.catalogPartOemCode,live:item.oemCode});
  if(row.catalogPartName&&item.partName&&String(row.catalogPartName).trim()!==String(item.partName).trim())
    issues.push({code:'CATALOG_SNAPSHOT_NAME_DRIFT',domain,index,catalogPartId:id,snapshot:row.catalogPartName,live:item.partName});
 });
 return issues;
}
function vcE2eAudit(input){
 input=input||{}; const catalog=vcE2eArr(input.catalogItems),map=vcE2eCatalogMap(catalog);
 const domains=[['stock',input.partsStock],['transactions',input.transactions],['services',input.servisLogs||input.services],['carNotes',input.carNotes||input.carNotesComponents]];
 const reports=domains.map(([domain,rows])=>vcE2eAuditDomain(rows,domain,map));
 const issues=reports.flatMap(r=>r.issues);
 ['stock','transactions','services','carNotes'].forEach(domain=>{
   const rows=input[domain==='stock'?'partsStock':domain==='transactions'?'transactions':domain==='services'?'servisLogs':'carNotes'];
   issues.push(...vcE2eAuditSnapshot(rows,domain,map));
 });
 const referenced=new Set(reports.flatMap(r=>r.refs.map(x=>x.id)));
 const unreferenced=catalog.filter(x=>x&&x.id!=null&&!referenced.has(vcE2eId(x.id))).map(x=>x.id);
 return {version:VEHICLE_CATALOG_E2E_SOT_VERSION,ok:issues.length===0,catalogCount:catalog.length,referencedCatalogPartIds:[...referenced],unreferencedCatalogPartIds:unreferenced,reports,issues,rules:{catalogPartIdPrimary:true,catalogIdCompatibility:true,snapshotIsHistoricalNotIdentity:true,missingReferenceIsError:true,autoRepair:false}};
}
const VehicleCatalogE2ESOT={version:VEHICLE_CATALOG_E2E_SOT_VERSION,audit:vcE2eAudit,refs:vcE2eRefs,norm:vcE2eNorm};
if(typeof window!=='undefined')window.VehicleCatalogE2ESOT=VehicleCatalogE2ESOT;
if(typeof globalThis!=='undefined')globalThis.VehicleCatalogE2ESOT=VehicleCatalogE2ESOT;
if(typeof module!=='undefined')module.exports=VehicleCatalogE2ESOT;
