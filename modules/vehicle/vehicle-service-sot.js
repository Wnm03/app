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

function vehicleServiceSotApplyLegacyRuleToCatalog(item,cat){
  if(!item||!cat)return false;
  let changed=false;
  const km=Number(cat.intervalKm);
  const months=Number(cat.intervalBulan);
  if(item.serviceIntervalKm===undefined && Number.isFinite(km) && km>0){item.serviceIntervalKm=km;changed=true;}
  if(item.serviceIntervalMonths===undefined && Number.isFinite(months) && months>0){item.serviceIntervalMonths=months;changed=true;}
  if(item.serviceShowInReminder===undefined){item.serviceShowInReminder=cat.showInReminder!==false;changed=true;}
  return changed;
}

async function vehicleServiceSotEnsureReady(){
  if(_vehicleServiceSotReady)return {ok:true,changed:0};
  if(_vehicleServiceSotLoading)return _vehicleServiceSotLoading;
  _vehicleServiceSotLoading=(async()=>{
    let changed=0;
    const dirtyCatalogIds=new Set();
    if(typeof VehicleCatalog==='undefined'||!VehicleCatalog||typeof VehicleCatalog.getAll!=='function')return{ok:false,changed:0,reason:'VehicleCatalog belum tersedia'};
    const items=await VehicleCatalog.getAll();
    if(!Array.isArray(D.sparepartCats))D.sparepartCats=[];
    for(const cat of D.sparepartCats){
      const item=vehicleServiceSotFindCatalogForCat(cat,cat.vehicleId||VEHICLE_SERVICE_SOT_DEFAULT_VEHICLE_ID);
      if(!item)continue;
      if(String(cat.catalogPartId||'')!==String(item.id)){cat.catalogPartId=item.id;changed++;}
      if(cat.catalogCategory===undefined||cat.catalogCategory!==item.category){cat.catalogCategory=item.category||'';changed++;}
      if(cat.catalogSubcategory===undefined||cat.catalogSubcategory!==(item.subcategory||null)){cat.catalogSubcategory=item.subcategory||null;changed++;}
      if(vehicleServiceSotApplyLegacyRuleToCatalog(item,cat)){changed++;dirtyCatalogIds.add(String(item.id));}
    }
    // Persist only catalog metadata; D remains owned by the normal save cycle.
    if(dirtyCatalogIds.size&&typeof VehicleCatalog.update==='function'){
      for(const item of items){
        if(item&&dirtyCatalogIds.has(String(item.id))){
          await VehicleCatalog.update(item.id,{serviceIntervalKm:item.serviceIntervalKm,serviceIntervalMonths:item.serviceIntervalMonths,serviceShowInReminder:item.serviceShowInReminder});
        }
      }
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
async function vehicleServiceSotSyncCategoryRule(cat,vehicleId){
  if(!cat||typeof VehicleCatalog==='undefined'||!VehicleCatalog||typeof VehicleCatalog.getAll!=='function'||typeof VehicleCatalog.update!=='function')return {ok:false,reason:'catalog-unavailable'};
  try{
    const items=await VehicleCatalog.getAll();
    const item=vehicleServiceSotFindCatalogForCat(cat,vehicleId);
    if(!item)return {ok:false,reason:'unlinked'};
    const patch={serviceIntervalKm:(Number.isFinite(Number(cat.intervalKm))&&Number(cat.intervalKm)>0)?Number(cat.intervalKm):0,serviceIntervalMonths:(Number.isFinite(Number(cat.intervalBulan))&&Number(cat.intervalBulan)>0)?Number(cat.intervalBulan):0,serviceShowInReminder:cat.showInReminder!==false};
    await VehicleCatalog.update(item.id,patch);
    cat.catalogPartId=item.id;
    cat.catalogCategory=item.category||'';
    cat.catalogSubcategory=item.subcategory||null;
    return {ok:true,item,patch};
  }catch(e){return {ok:false,reason:'update-failed',error:e};}
}

/** Sync projection used by reminder/prediction consumers. The identity remains
 * the legacy category id for historical compatibility; catalogPartId and all
 * category labels/intervals are sourced from VehicleCatalog when linked. */
function vehicleServiceSotResolveReminderRule(cat,vehicleId){
  const category=cat&&typeof cat==='object'?cat:{};
  const item=vehicleServiceSotFindCatalogForCat(category,vehicleId);
  const num=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:null;};
  // VehicleCatalog is the canonical owner of component/part service metadata
  // once a category has an unambiguous catalog link. D.sparepartCats remains
  // the compatibility index and is only the fallback for legacy/unlinked rows.
  let intervalKm=item?num(item.serviceIntervalKm):null;
  let intervalBulan=item?num(item.serviceIntervalMonths):null;
  if(intervalKm===null)intervalKm=num(category.intervalKm);
  if(intervalBulan===null)intervalBulan=num(category.intervalBulan);
  // Per-vehicle KM override is an explicit user exception to the canonical
  // catalog rule. There is intentionally no reuse of the KM override as a
  // month interval; intervalBulan remains the category/catalog SOT.
  const vehicle=(typeof D!=='undefined'&&Array.isArray(D.vehicles))?D.vehicles.find(v=>String(v&&v.id)===String(vehicleId)):null;
  const override=num(vehicle&&vehicle.intervalOverrides&&vehicle.intervalOverrides[category.id]);
  if(override!==null)intervalKm=override;
  const componentId=(item&&item.serviceComponentId)||category.serviceComponentId||category.componentId||null;
  const masterCategoryId=(category.masterCategoryId)||(item&&item.masterCategoryId)||null;
  return {
    categoryId:category.id||null,
    catalogPartId:item&&item.id||category.catalogPartId||null,
    serviceComponentId:componentId||null,
    masterCategoryId:masterCategoryId||null,
    categoryName:category.name||item&&item.partName||null,
    componentName:item&&item.partName||category.name||null,
    intervalKm,
    intervalBulan,
    intervalOverridden:override!==null,
    source:item?'catalog':'category',
    catalog:item||null
  };
}

function getReminderCategoriesForVehicle(vehicleId){
  const vehicle=(typeof D!=='undefined'&&Array.isArray(D.vehicles))?D.vehicles.find(v=>String(v&&v.id)===String(vehicleId)):null;
  const legacyCats=(D.sparepartCats||[]).filter(c=>typeof catVisibleForVehicle==='function'?catVisibleForVehicle(c,vehicleId):true);
  const provisioned=(vehicle&&vehicle.sot&&Array.isArray(vehicle.sot.serviceSchedules))?vehicle.sot.serviceSchedules:[];
  const cats=provisioned.length?provisioned.map(r=>({id:'sot:'+r.catalogPartId,name:r.partName,code:r.oemCode,vehicleId:vehicleId,catalogPartId:r.catalogPartId,catalogCategory:r.category,catalogSubcategory:r.subcategory,intervalKm:r.intervalKm,intervalBulan:r.intervalBulan,showInReminder:r.showInReminder,serviceComponentId:r.serviceComponentId||null,masterCategoryId:r.masterCategoryId||null})):legacyCats;
  const items=vehicleServiceSotVehicleItems(vehicleId);
  return cats.map(cat=>{
    const item=cat.catalogPartId?items.find(x=>String(x.id)===String(cat.catalogPartId)):vehicleServiceSotFindCatalogForCat(cat,vehicleId);
    const out=Object.assign({},cat);
    if(item){
      out.catalogPartId=item.id;
      out.catalogCategory=item.category||'';
      out.catalogSubcategory=item.subcategory||null;
      out.catalogPartName=item.partName||'';
      out.catalogPartCode=item.oemCode||'';
      if(item.serviceShowInReminder!==undefined)out.showInReminder=item.serviceShowInReminder!==false;
    }
    const rule=vehicleServiceSotResolveReminderRule(out,vehicleId);
    if(rule.serviceComponentId&&!out.serviceComponentId)out.serviceComponentId=rule.serviceComponentId;
    if(rule.masterCategoryId&&!out.masterCategoryId)out.masterCategoryId=rule.masterCategoryId;
    if(rule.intervalKm!==null)out.intervalKm=rule.intervalKm;
    if(rule.intervalBulan!==null)out.intervalBulan=rule.intervalBulan;
    out._serviceIntervalSource=rule.source;
    out._serviceIntervalOverridden=rule.intervalOverridden;
    return out;
  });
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
};
if(typeof window!=='undefined')window.VehicleServiceSOT=VehicleServiceSOT;

