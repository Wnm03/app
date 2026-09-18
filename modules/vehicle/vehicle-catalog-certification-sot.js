/* SOT-3L — final certification projection. Read-only: no repair, merge, or delete. */
const VEHICLE_CATALOG_CERTIFICATION_SOT_VERSION='SOT-CATALOG-CERT-V1';
function vcCertArr(v){return Array.isArray(v)?v:[];}
async function vehicleCatalogSOTCertify(input){
 const x=input||{};
 if(typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.ensureLoaded==='function')await VehicleCatalog.ensureLoaded();
 const catalog=vcCertArr(x.catalogItems).length?vcCertArr(x.catalogItems):(typeof VehicleCatalog!=='undefined'&&VehicleCatalog.getAll?await VehicleCatalog.getAll():[]);
 const domains={partsStock:vcCertArr(x.partsStock||(typeof D!=='undefined'?D.partsStock:[])),transactions:vcCertArr(x.transactions||(typeof D!=='undefined'?D.transactions:[])),servisLogs:vcCertArr(x.servisLogs||(typeof D!=='undefined'?D.servisLogs:[])),carNotes:vcCertArr(x.carNotes||(typeof D!=='undefined'?(D.carNotes||D.carNotesComponents):[]))};
 const ids=new Set(catalog.map(r=>String(r&&r.id)).filter(Boolean));
 const issues=[];
 Object.entries(domains).forEach(([domain,rows])=>rows.forEach((row,index)=>{
  const a=row&&row.catalogPartId?String(row.catalogPartId):'';
  const b=row&&row.catalogId?String(row.catalogId):'';
  if(a&&b&&a!==b)issues.push({code:'CATALOG_ID_MISMATCH',domain,index,catalogPartId:a,catalogId:b});
  if(a&&!ids.has(a))issues.push({code:'CATALOG_REF_MISSING',domain,index,catalogPartId:a});
  if(b&&!ids.has(b))issues.push({code:'CATALOG_REF_MISSING',domain,index,catalogId:b});
  if(Array.isArray(row&&row.catalogPartRefs))row.catalogPartRefs.forEach((r,j)=>{const id=r&&r.catalogId?String(r.catalogId):'';if(id&&!ids.has(id))issues.push({code:'CATALOG_REF_MISSING',domain,index,refIndex:j,catalogId:id});});
 }));
 const health=typeof VehicleCatalogHealthSOT!=='undefined'&&VehicleCatalogHealthSOT.audit?VehicleCatalogHealthSOT.audit(catalog,domains.partsStock):null;
 const migration=typeof VehicleCatalogMigrationSOT!=='undefined'&&VehicleCatalogMigrationSOT.audit?VehicleCatalogMigrationSOT.audit({catalogItems:catalog,...domains}):null;
 const deterministic=migration?migration.summary.deterministic:0;
 const unresolved=migration?migration.summary.ambiguous+migration.summary.unlinked+migration.summary.invalid:0;
 const checks={catalogLoaded:true,domainsScanned:true,noDanglingReferences:issues.filter(i=>i.code==='CATALOG_REF_MISSING').length===0,noIdMismatch:issues.filter(i=>i.code==='CATALOG_ID_MISMATCH').length===0,duplicateIdentityReview:!!health,legacyMigrationDryRun:!!migration,readOnly:true};
 return {version:VEHICLE_CATALOG_CERTIFICATION_SOT_VERSION,ok:issues.length===0&&(!health||health.catalog.candidates.length===0),catalogCount:catalog.length,domainCounts:Object.fromEntries(Object.entries(domains).map(([k,v])=>[k,v.length])),issues,checks,health,migrationSummary:migration?{deterministic,unresolved}:null,rules:{oneCatalogIdentity:'catalogPartId',ambiguousNoGuess:true,differentOemNoMerge:true,packageVsIndividualNoMerge:true,snapshotHistorical:true,noAutoRepair:true}};
}
const VehicleCatalogCertificationSOT={version:VEHICLE_CATALOG_CERTIFICATION_SOT_VERSION,certify:vehicleCatalogSOTCertify};
if(typeof window!=='undefined')window.VehicleCatalogCertificationSOT=VehicleCatalogCertificationSOT;
if(typeof globalThis!=='undefined')globalThis.VehicleCatalogCertificationSOT=VehicleCatalogCertificationSOT;
if(typeof module!=='undefined')module.exports=VehicleCatalogCertificationSOT;
