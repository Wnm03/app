const VEHICLE_SERVICE_SOT_VERSION='SOT-SERVICE-V1';
const VEHICLE_SERVICE_SOT_DEFAULT_VEHICLE_ID='veh_1';
let _vehicleServiceSotReady=false;
let _vehicleServiceSotLoading=null;

function vehicleServiceSotVehicleItems(vehicleId){
  if(typeof VehicleCatalog==='undefined'||!VehicleCatalog||typeof VehicleCatalog.getStore!=='function')return[];
  const items=VehicleCatalog.getStore().items;
  if(!Array.isArray(items))return[];
  return items.filter(it=>{
    if(!vehicleId)return true;
    const ids=Array.isArray(it.compatibleVehicleIds)?it.compatibleVehicleIds:[];
    if(ids.some(id=>String(id)===String(vehicleId)))return true;
    // Model-level SOT: one catalog part can serve every unit sharing the
    // same registered model. Resolve the unit's modelId from D only here;
    // VehicleCatalog remains a pure catalog store.
    const vehicle=(typeof D!=='undefined'&&Array.isArray(D.vehicles))?D.vehicles.find(v=>String(v&&v.id)===String(vehicleId)):null;
    const mid=vehicle&&vehicle.modelId?String(vehicle.modelId):'';
    const mids=Array.isArray(it.compatibleModelIds)?it.compatibleModelIds:[];
    return !!mid&&mids.some(id=>String(id)===mid);
  });
}

function vehicleServiceSotNormalizeCode(v){return String(v||'').replace(/[\s-]/g,'').toUpperCase();}
function vehicleServiceSotFindCatalogForCat(cat,vehicleId){
  const items=vehicleServiceSotVehicleItems(vehicleId);
  if(!cat)return null;
  if(cat.catalogPartId){
    const direct=items.find(it=>String(it.id)===String(cat.catalogPartId));
    if(direct)return direct;
  }
  const code=vehicleServiceSotNormalizeCode(cat.code);
  if(code){
    const byCode=items.find(it=>vehicleServiceSotNormalizeCode(it.oemCode)===code);
    if(byCode)return byCode;
  }
  const name=String(cat.name||'').trim().toLowerCase();
  if(name){
    const exact=items.filter(it=>String(it.partName||'').trim().toLowerCase()===name);
    if(exact.length===1)return exact[0];
  }
  return null;
}

function vehicleServiceSotFindServiceMasterForCategory(cat){
  if(typeof ServiceInputCatalog==='undefined'||!ServiceInputCatalog)return null;
  const cid=cat&& (cat.serviceComponentId||cat.componentId||cat.maintenanceRuleId);
  if(cid&&typeof ServiceInputCatalog.itemById==='function'){
    const hit=ServiceInputCatalog.itemById(cid);
    if(hit&&hit.item)return hit;
  }
  if(cat&&cat.name&&typeof ServiceInputCatalog.infer==='function'){
    const hit=ServiceInputCatalog.infer(cat.name);
    if(hit&&hit.item)return hit;
  }
  return null;
}
function vehicleServiceSotApplyLegacyRuleToCatalog(item,cat){ return false; }

async function vehicleServiceSotEnsureReady(){
  if(_vehicleServiceSotReady)return {ok:true,changed:0};
  if(_vehicleServiceSotLoading)return _vehicleServiceSotLoading;
  _vehicleServiceSotLoading=(async()=>{
    let changed=0;
    if(typeof VehicleCatalog==='undefined'||!VehicleCatalog||typeof VehicleCatalog.getAll!=='function')return{ok:false,changed:0,reason:'VehicleCatalog belum tersedia'};
    const items=await VehicleCatalog.getAll();
    if(!Array.isArray(D.sparepartCats))D.sparepartCats=[];
    for(const cat of D.sparepartCats){
      const item=vehicleServiceSotFindCatalogForCat(cat,cat.vehicleId||VEHICLE_SERVICE_SOT_DEFAULT_VEHICLE_ID);
      if(!item)continue;
      if(String(cat.catalogPartId||'')!==String(item.id)){cat.catalogPartId=item.id;changed++;}
      if(cat.catalogCategory===undefined||cat.catalogCategory!==item.category){cat.catalogCategory=item.category||'';changed++;}
      if(cat.catalogSubcategory===undefined||cat.catalogSubcategory!==(item.subcategory||null)){cat.catalogSubcategory=item.subcategory||null;changed++;}
      // Interval values are no longer written into VehicleCatalog: the active
      // interval belongs exclusively to VehicleCarNotesSOT.
    }
    _vehicleServiceSotReady=true;
    return{ok:true,changed};
  })().finally(()=>{_vehicleServiceSotLoading=null;});
  return _vehicleServiceSotLoading;
}

function vehicleServiceSotIsReady(){return _vehicleServiceSotReady;}

// Push a user-edited legacy service rule into its linked catalog part.
// D.sparepartCats remains a compatibility index; VehicleCatalog is the
// canonical owner of service metadata once a category has an unambiguous link.
async function vehicleServiceSotSyncCategoryRule(cat,vehicleId,meta){
  const vid=vehicleId||cat&&cat.vehicleId;
  if(!cat||!vid)return {ok:false,reason:'invalid-category'};
  if(typeof VehicleCarNotesSOT!=='undefined'&&VehicleCarNotesSOT&&typeof VehicleCarNotesSOT.setServiceInterval==='function'){
    const source=(meta&&meta.source)||cat._serviceIntervalSource||'manual';
    const r=VehicleCarNotesSOT.setServiceInterval(vid,cat,{intervalKm:cat.intervalKm,intervalBulan:cat.intervalBulan,source});
    if(r&&r.ok)return Object.assign({ok:true,source},r);
    return r||{ok:false,reason:'sot-write-failed'};
  }
  // Isolated legacy harness compatibility: without the canonical vehicle SOT,
  // the old catalog API remains usable for tests/early-load adapters only.
  if(typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.getAll==='function'&&typeof VehicleCatalog.update==='function'){
    try{
      const item=vehicleServiceSotFindCatalogForCat(cat,vid); if(!item)return {ok:false,reason:'unlinked'};
      const patch={serviceIntervalKm:Number(cat.intervalKm)>0?Number(cat.intervalKm):0,serviceIntervalMonths:Number(cat.intervalBulan)>0?Number(cat.intervalBulan):0,serviceShowInReminder:cat.showInReminder!==false};
      await VehicleCatalog.update(item.id,patch); return {ok:true,item,patch,projectionOnly:true};
    }catch(e){return {ok:false,reason:'update-failed',error:e};}
  }
  return {ok:false,reason:'vehicle-sot-unavailable'};
}

/** Resolve the ONE active interval SOT for a vehicle/component.
 * Pedoman/catalog/AI are inputs to the SOT; only VehicleCarNotesSOT's active
 * record is authoritative after initialization or explicit user selection. */
function vehicleServiceSotResolveReminderRule(cat,vehicleId){
  const category=cat&&typeof cat==='object'?cat:{};
  const item=vehicleServiceSotFindCatalogForCat(category,vehicleId);
  const num=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:null;};
  const master=vehicleServiceSotFindServiceMasterForCategory(category);
  const masterKm=num(master&&master.item&&master.item.intervalKm);
  const masterMonths=num(master&&master.item&&master.item.intervalTimeMonths);
  const catalogKm=num(item&&item.serviceIntervalKm);
  const catalogMonths=num(item&&item.serviceIntervalMonths);
  const seedKm=masterKm!==null?masterKm:(catalogKm!==null?catalogKm:num(category.intervalKm));
  const seedMonths=masterMonths!==null?masterMonths:(catalogMonths!==null?catalogMonths:num(category.intervalBulan));
  const seedSource=masterKm!==null||masterMonths!==null?'pedoman':(category.intervalSource||'pedoman');
  const ref=Object.assign({},category,{intervalKm:seedKm||0,intervalBulan:seedMonths||0,intervalSource:seedSource});
  let active=null;
  const hasCanonicalSot=typeof VehicleCarNotesSOT!=='undefined'&&VehicleCarNotesSOT&&typeof VehicleCarNotesSOT.getServiceInterval==='function';
  if(hasCanonicalSot)active=VehicleCarNotesSOT.getServiceInterval(vehicleId,ref);
  // Legacy isolated harness only: catalog remains a compatibility source when
  // the canonical VehicleCarNotesSOT module is genuinely absent.
  const legacyCatalogKm=!hasCanonicalSot?catalogKm:null;
  const legacyCatalogMonths=!hasCanonicalSot?catalogMonths:null;
  const vehicle=(typeof D!=='undefined'&&Array.isArray(D.vehicles))?D.vehicles.find(v=>String(v&&v.id)===String(vehicleId)):null;
  const intervalKm=hasCanonicalSot?(num(active&&active.intervalKm)??seedKm):(legacyCatalogKm??seedKm);
  const intervalBulan=hasCanonicalSot?(num(active&&active.intervalBulan)??seedMonths):(legacyCatalogMonths??seedMonths);
  const componentId=(item&&item.serviceComponentId)||category.serviceComponentId||category.componentId||null;
  const masterCategoryId=(category.masterCategoryId)||(item&&item.masterCategoryId)||null;
  return {
    categoryId:category.id||null,
    catalogPartId:item&&item.id||category.catalogPartId||null,
    serviceComponentId:(active&&active.serviceComponentId)||componentId||null,
    masterCategoryId:(active&&active.masterCategoryId)||masterCategoryId||null,
    categoryName:category.name||item&&item.partName||null,
    componentName:item&&item.partName||category.name||null,
    intervalKm,
    intervalBulan,
    intervalOverridden:hasCanonicalSot?!!(active&&active.source==='manual'):false,
    source:hasCanonicalSot?(active&&active.source||seedSource):(legacyCatalogKm!==null?'catalog':seedSource),
    intervalSot:active||null,
    catalog:item||null,
    serviceMaster:master&&master.item?master.item:null
  };
}

function getReminderCategoriesForVehicle(vehicleId){
  // VehicleScopedSOT is the single context boundary. Never interpret an
  // omitted vehicleId as "all vehicles" for a vehicle-scoped reminder view.
  const activeId=(typeof VehicleScopedSOT!=='undefined'&&VehicleScopedSOT&&typeof VehicleScopedSOT.currentId==='function')
    ?VehicleScopedSOT.currentId():((typeof curVehicleId!=='undefined'&&curVehicleId!=null)?String(curVehicleId):'');
  const vid=String(vehicleId||activeId||'').trim();
  if(!vid)return [];
  // S2080 contract: SOT reads/migrations are keyed by `vehicleId`; normalize it to the
  // scoped id so getServiceCategories(vehicleId)/upsertServiceCategory(vehicleId,c) stay valid.
  vehicleId=vid;
  const vehicle=(typeof D!=='undefined'&&Array.isArray(D.vehicles))?D.vehicles.find(v=>String(v&&v.id)===vid):null;
  if(!vehicle)return [];
  const canonical=(typeof VehicleCarNotesSOT!=='undefined'&&VehicleCarNotesSOT&&typeof VehicleCarNotesSOT.getServiceCategories==='function')
    ?VehicleCarNotesSOT.getServiceCategories(vehicleId):[];
  // S2170: this is a read/projection function. Never silently mutate the
  // canonical SOT while rendering a reminder. If canonical rows are not
  // available yet, use only vehicle-scoped legacy rows as a compatibility
  // projection; explicit reconciliation is performed by the UI/migration
  // boundary, not by this read.
  let cats=canonical.slice();
  if(!cats.length){
    cats=(D.sparepartCats||[]).filter(c=>c&&(!c.vehicleId||String(c.vehicleId)===vid));
  }
  const provisioned=(typeof VehicleCarNotesSOT!=='undefined'&&VehicleCarNotesSOT)?VehicleCarNotesSOT.getServiceSchedules(vid):[];
  if(!cats.length&&provisioned.length)cats=provisioned.map(r=>({id:'sot:'+r.catalogPartId,name:r.partName,code:r.oemCode,vehicleId:vid,catalogPartId:r.catalogPartId,catalogCategory:r.category,catalogSubcategory:r.subcategory,intervalKm:r.intervalKm,intervalBulan:r.intervalBulan,showInReminder:r.showInReminder,serviceComponentId:r.serviceComponentId||null,masterCategoryId:r.masterCategoryId||null}));
  const items=vehicleServiceSotVehicleItems(vid);
  const seen=new Map();
  cats.map(cat=>{
    const out=Object.assign({},cat);
    if(out.vehicleId&&String(out.vehicleId)!==vid)return null;
    out.vehicleId=vid;
    const item=out.catalogPartId?items.find(x=>String(x.id)===String(out.catalogPartId)):vehicleServiceSotFindCatalogForCat(out,vid);
    if(item){
      out.catalogPartId=item.id; out.catalogCategory=item.category||''; out.catalogSubcategory=item.subcategory||null; out.catalogPartName=item.partName||''; out.catalogPartCode=item.oemCode||'';
      if(item.serviceShowInReminder!==undefined)out.showInReminder=item.serviceShowInReminder!==false;
    }
    if(typeof ServiceTaxonomySOT!=='undefined'&&ServiceTaxonomySOT&&typeof ServiceTaxonomySOT.canonicalTarget==='function'){
      const target=ServiceTaxonomySOT.canonicalTarget(out);
      if(target){
        out.serviceComponentId=target.serviceComponentId||out.serviceComponentId||null;
        out.masterCategoryId=target.masterCategoryId||out.masterCategoryId||null;
        out.name=target.componentName||out.name;
        out.canonicalTaxonomy=true;
      }
    }
    const rule=vehicleServiceSotResolveReminderRule(out,vid);
    if(rule.serviceComponentId&&!out.serviceComponentId)out.serviceComponentId=rule.serviceComponentId;
    if(rule.masterCategoryId&&!out.masterCategoryId)out.masterCategoryId=rule.masterCategoryId;
    if(rule.intervalKm!==null)out.intervalKm=rule.intervalKm;
    if(rule.intervalBulan!==null)out.intervalBulan=rule.intervalBulan;
    out._serviceIntervalSource=rule.source; out._serviceIntervalOverridden=rule.intervalOverridden;
    const key=(out.serviceComponentId?String(out.serviceComponentId):'legacy:'+String(out.id||out.name||'').trim().toLowerCase())+'|'+vid;
    const prev=seen.get(key);
    if(!prev||((out.vehicleId?100:0)+(out.catalogPartId?10:0)+(out.showInReminder!==false?2:0))>((prev.vehicleId?100:0)+(prev.catalogPartId?10:0)+(prev.showInReminder!==false?2:0)))seen.set(key,out);
    return out;
  }).filter(Boolean);
  return Array.from(seen.values());
}

// Compatibility writer: legacy callers may still address VehicleServiceSOT,
// but the write is delegated to the single active-interval SOT. No interval
// state is owned here.
function vehicleServiceSotSetServiceInterval(vehicleId,cat,payload){
  if(typeof VehicleCarNotesSOT!=='undefined'&&VehicleCarNotesSOT&&typeof VehicleCarNotesSOT.setServiceInterval==='function'){
    return VehicleCarNotesSOT.setServiceInterval(vehicleId,cat,payload||{});
  }
  return {ok:false,reason:'vehicle-sot-unavailable'};
}

function vehicleServiceSotResolvePart(catOrId,vehicleId){
  const cat=typeof catOrId==='object'?catOrId:(D.sparepartCats||[]).find(c=>String(c.id)===String(catOrId));
  const item=vehicleServiceSotFindCatalogForCat(cat,vehicleId);
  return item?{ok:true,item,category:cat||null}: {ok:false,item:null,category:cat||null};
}

const VehicleServiceSOT={
  version:VEHICLE_SERVICE_SOT_VERSION,
  ensureReady:vehicleServiceSotEnsureReady,
  isReady:vehicleServiceSotIsReady,
  getReminderCategoriesForVehicle,
  resolvePart:vehicleServiceSotResolvePart,
  resolveReminderRule:vehicleServiceSotResolveReminderRule,
  syncCategoryRule:vehicleServiceSotSyncCategoryRule,
  setServiceInterval:vehicleServiceSotSetServiceInterval,
};
if(typeof window!=='undefined')window.VehicleServiceSOT=VehicleServiceSOT;

