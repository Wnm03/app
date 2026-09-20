'use strict';
// S1868 — Dynamic Vehicle Onboarding & Maintenance Template Engine.
// Builds a read-only/draft maintenance template from existing SOTs without
// creating a second maintenance-history store or inventing service intervals.
const VEHICLE_MAINTENANCE_TEMPLATE_ENGINE_VERSION='S1868-V1';
const VMTE_GENERIC_NAMES={
  motor:['Oli Mesin','Filter Oli','Oli Gardan','Busi','Filter Udara','Kampas Rem Depan','Kampas Rem Belakang','V-Belt CVT','Roller CVT','Minyak Rem','Aki','Ban Depan'],
  mobil:['Oli Mesin','Filter Oli','Oli Transmisi','Busi','Filter Udara','Filter AC','Kampas Rem Depan','Kampas Rem Belakang','Minyak Rem','Aki','Coolant','Timing Belt','Ban Depan'],
  listrik:['Kampas Rem Depan','Kampas Rem Belakang','Minyak Rem','Aki','Ban Depan']
};
function vmteNorm(v){return String(v==null?'':v).trim().toLowerCase().replace(/[()[\],./_-]+/g,' ').replace(/\s+/g,' ').trim();}
function vmteClone(v){return JSON.parse(JSON.stringify(v));}
function vmteGenericNames(type){
  const key=String(type||'motor').toLowerCase();
  if(typeof DatabaseAPI!=='undefined'&&DatabaseAPI.master&&typeof DatabaseAPI.master.getGenericRecommendNames==='function'){
    const all=DatabaseAPI.master.getGenericRecommendNames()||{};
    if(Array.isArray(all[key]))return all[key].slice();
  }
  return (VMTE_GENERIC_NAMES[key]||VMTE_GENERIC_NAMES.motor).slice();
}
function vmteMatchComponent(name,components){
  const n=vmteNorm(name); if(!n)return null;
  const exact=components.find(c=>vmteNorm(c.componentName)===n);
  if(exact)return {component:exact,confidence:'HIGH'};
  const hits=components.filter(c=>{const x=vmteNorm(c.componentName);return x&&(n.includes(x)||x.includes(n));});
  if(hits.length===1)return {component:hits[0],confidence:'MEDIUM'};
  return null;
}
function vmteCategoriesById(categories){const m=new Map();(categories||[]).forEach(c=>m.set(String(c.masterCategoryId),c));return m;}
async function vmteBuild(input={}){
  const type=String(input.vehicleType||input.jenis||'motor').toLowerCase();
  let components=[],categories=[];
  if(typeof ServiceMasterDB!=='undefined'){
    try{categories=await ServiceMasterDB.getAllCategories();components=await ServiceMasterDB.getAllComponents();}catch(e){components=[];categories=[];}
  }
  const catMap=vmteCategoriesById(categories);
  const rows=new Map();
  const add=(component,meta)=>{
    if(!component||!component.componentId)return;
    const id=String(component.componentId); const old=rows.get(id);
    const row=Object.assign({componentId:id,componentName:component.componentName,masterCategoryId:component.masterCategoryId,masterCategory:component.masterCategory,source:'service-master',confidence:'HIGH',intervalKm:component.intervalKm??null,intervalTimeMonths:component.intervalTimeMonths??null,intervalLabel:component.intervalLabel||'',needsReview:!!component.needsReview,selected:true},meta||{});
    if(old){
      old.source=old.source==='generic-type'&&row.source!=='generic-type'?row.source:old.source;
      old.confidence=old.confidence==='HIGH'?old.confidence:row.confidence;
      old.catalogRefs=Array.from(new Set((old.catalogRefs||[]).concat(row.catalogRefs||[])));
      old.partNumbers=Array.from(new Set((old.partNumbers||[]).concat(row.partNumbers||[])));
    } else rows.set(id,row);
  };
  vmteGenericNames(type).forEach(name=>{const hit=vmteMatchComponent(name,components);if(hit)add(hit.component,{source:'generic-type',confidence:hit.confidence});});

  let resolved=null;
  if(typeof VehicleModelResolverSOT!=='undefined'&&typeof VehicleModelResolverSOT.resolve==='function'){
    try{resolved=VehicleModelResolverSOT.resolve({modelId:input.modelId,name:input.modelName||input.name,year:input.year,variant:input.variant,cc:input.engineCc});}catch(e){resolved=null;}
  }
  if(resolved&&resolved.model&&typeof VehicleModelRegistrySOT!=='undefined'&&typeof VehicleModelRegistrySOT.taxonomy==='function'){
    const taxonomy=VehicleModelRegistrySOT.taxonomy(resolved.model)||[];
    taxonomy.forEach(cat=>{(cat.components||[]).forEach(name=>{const hit=vmteMatchComponent(name,components);if(hit)add(hit.component,{source:'model-taxonomy',confidence:hit.confidence});});});
  }

  let catalog=null;
  if(typeof PartsCatalogDB!=='undefined'){
    try{
      if(input.catalogId&&typeof PartsCatalogDB.getCatalog==='function')catalog=await PartsCatalogDB.getCatalog(input.catalogId);
      else if(input.vehicleId&&typeof PartsCatalogDB.getCatalogByVehicle==='function')catalog=await PartsCatalogDB.getCatalogByVehicle(input.vehicleId);
    }catch(e){catalog=null;}
  }
  if(catalog&&Array.isArray(catalog.parts)){
    catalog.parts.forEach(part=>{
      (Array.isArray(part.componentIds)?part.componentIds:[]).forEach(cid=>{
        const c=components.find(x=>String(x.componentId)===String(cid));
        if(c)add(c,{source:'catalog',confidence:'HIGH',catalogRefs:[catalog.catalogCode||catalog.catalogId||input.catalogId],partNumbers:[part.partNumber||'']});
      });
    });
  }
  const rowsArr=Array.from(rows.values());
  const categoryRows=new Map();
  rowsArr.forEach(r=>{
    const cid=String(r.masterCategoryId||'uncategorized');
    if(!categoryRows.has(cid)){
      const c=catMap.get(cid);categoryRows.set(cid,{masterCategoryId:cid,masterCategory:r.masterCategory||c&&c.masterCategory||'Lainnya',icon:c&&c.icon||'🧰',components:[]});
    }
    categoryRows.get(cid).components.push(r);
  });
  const sourceFlags=Array.from(new Set(rowsArr.map(r=>r.source)));
  const template={
    schemaVersion:1,
    engineVersion:VEHICLE_MAINTENANCE_TEMPLATE_ENGINE_VERSION,
    templateId:'vehicle-maintenance:'+vmteNorm(input.modelId||input.name||type).replace(/ /g,'-'),
    vehicleType:type,
    modelId:resolved&&resolved.model?resolved.model.id:(input.modelId||null),
    modelName:resolved&&resolved.profile?resolved.profile.name:(input.modelName||input.name||null),
    catalogId:catalog?(catalog.catalogId||input.catalogId||null):(input.catalogId||null),
    catalogCode:catalog?(catalog.catalogCode||null):null,
    identificationStatus:resolved?resolved.status:'unknown',
    categories:Array.from(categoryRows.values()).sort((a,b)=>a.masterCategory.localeCompare(b.masterCategory)),
    components:rowsArr.sort((a,b)=>String(a.masterCategory).localeCompare(String(b.masterCategory))||String(a.componentName).localeCompare(String(b.componentName))),
    componentCount:rowsArr.length,
    selectedComponentIds:rowsArr.filter(r=>r.selected!==false).map(r=>r.componentId),
    sources:sourceFlags,
    generatedAt:new Date().toISOString(),
    customizable:true,
    intervalPolicy:'ONLY_FROM_SERVICE_MASTER_OR_EXPLICIT_CATALOG_EVIDENCE'
  };
  return template;
}
function vmteApplySelection(template,selectedIds){
  const t=vmteClone(template||{}); const set=new Set((selectedIds||[]).map(String));
  t.components=(t.components||[]).map(c=>Object.assign({},c,{selected:set.has(String(c.componentId))}));
  t.selectedComponentIds=t.components.filter(c=>c.selected).map(c=>c.componentId);
  t.componentCount=t.components.length; t.selectedCount=t.selectedComponentIds.length; t.customized=true;
  t.categories=(t.categories||[]).map(cat=>Object.assign({},cat,{components:(cat.components||[]).map(c=>Object.assign({},c,{selected:set.has(String(c.componentId))}))}));
  return t;
}
function vmteForVehicle(vehicle){return vehicle&&vehicle.maintenanceTemplate?vmteClone(vehicle.maintenanceTemplate):null;}
const VehicleMaintenanceTemplateEngine={version:VEHICLE_MAINTENANCE_TEMPLATE_ENGINE_VERSION,normalize:vmteNorm,build:vmteBuild,applySelection:vmteApplySelection,forVehicle:vmteForVehicle,genericNames:vmteGenericNames};
if(typeof window!=='undefined')window.VehicleMaintenanceTemplateEngine=VehicleMaintenanceTemplateEngine;
if(typeof globalThis!=='undefined')globalThis.VehicleMaintenanceTemplateEngine=VehicleMaintenanceTemplateEngine;
if(typeof module!=='undefined')module.exports=VehicleMaintenanceTemplateEngine;
