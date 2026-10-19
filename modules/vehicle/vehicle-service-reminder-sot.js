// SOT-4F — automatic service + reminder provisioning per vehicle model.
// VehicleCatalog remains the canonical part/service-rule source; vehicle.sot
// stores a deterministic projection for the selected vehicle/model.
const VEHICLE_SERVICE_REMINDER_SOT_VERSION='SOT-SERVICE-REMINDER-V1';
function vsrsNorm(v){return String(v==null?'':v).trim().toLowerCase();}
function vsrsVehicle(vehicleId){return (typeof D!=='undefined'&&Array.isArray(D.vehicles))?D.vehicles.find(v=>String(v&&v.id)===String(vehicleId)):null;}
function vsrsModelId(vehicle){return String(vehicle&&vehicle.modelId||'').trim()||null;}
async function vsrsCatalog(vehicleId,options){
  if(typeof VehicleCatalog==='undefined'||!VehicleCatalog||typeof VehicleCatalog.getAll!=='function')return [];
  const v=vsrsVehicle(vehicleId)||{}; const vid=String(v.id||vehicleId||''); const mid=vsrsModelId(v);
  const cache=options&&options._catalogCache&&typeof options._catalogCache==='object'?options._catalogCache:null;
  try{
    if(cache&&cache.index){
      const byVehicle=cache.index.byVehicle&&cache.index.byVehicle.get(vid)||[];
      const byModel=mid&&cache.index.byModel&&cache.index.byModel.get(mid)||[];
      const seen=new Set(); const merged=[];
      for(const p of byVehicle.concat(byModel)){if(!p||p.isDraft||seen.has(String(p.id)))continue;seen.add(String(p.id));merged.push(p);}
      return merged;
    }
    const all=await VehicleCatalog.getAll();return (all||[]).filter(p=>{
    if(!p||p.isDraft)return false;
    const byV=Array.isArray(p.compatibleVehicleIds)&&p.compatibleVehicleIds.some(id=>String(id)===vid);
    const byM=!!mid&&Array.isArray(p.compatibleModelIds)&&p.compatibleModelIds.some(id=>String(id)===mid);
    return byV||byM;
    });
  }catch(e){return []}
}
function vsrsRule(p,vehicleId,categories){
  if(!p||!p.id)return null;
  const rows=Array.isArray(categories)?categories:[];
  const category=rows.find(c=>c&&String(c.catalogPartId||'')===String(p.id))||
    rows.find(c=>c&&p.serviceComponentId&&String(c.serviceComponentId||c.componentId||'')===String(p.serviceComponentId))||null;
  let km=Number(category&&category.intervalKm), mo=Number(category&&category.intervalBulan);
  // Canonical vehicle/category projection wins over deprecated catalog intervals.
  if((!Number.isFinite(km)||km<=0)&&(!Number.isFinite(mo)||mo<=0)&&
     typeof VehicleServiceSOT!=='undefined'&&VehicleServiceSOT&&typeof VehicleServiceSOT.resolveReminderRule==='function'){
    try{
      const ref=category||{id:String(p.id),name:String(p.partName||''),catalogPartId:String(p.id),
        serviceComponentId:p.serviceComponentId||null,masterCategoryId:p.masterCategoryId||null,vehicleId};
      const active=VehicleServiceSOT.resolveReminderRule(ref,vehicleId);
      if(active){km=Number(active.intervalKm);mo=Number(active.intervalBulan);}
    }catch(_e){/* Keep compatibility fallback; provisioning must not crash. */}
  }
  // Legacy catalog fields are a fallback only if no canonical interval exists.
  if((!Number.isFinite(km)||km<=0)&&(!Number.isFinite(mo)||mo<=0)){
    km=Number(p.serviceIntervalKm);mo=Number(p.serviceIntervalMonths);
  }
  const hasKm=Number.isFinite(km)&&km>0, hasMo=Number.isFinite(mo)&&mo>0;
  if(!hasKm&&!hasMo)return null;
  return {catalogPartId:String(p.id),categoryId:category&&category.id||null,serviceComponentId:category&&category.serviceComponentId||p.serviceComponentId||null,masterCategoryId:category&&category.masterCategoryId||p.masterCategoryId||null,partName:String(p.partName||category&&category.name||''),oemCode:String(p.oemCode||category&&category.code||''),category:String(p.category||category&&category.group||''),subcategory:p.subcategory==null?(category&&category.subcategory!=null?String(category.subcategory):null):String(p.subcategory),intervalKm:hasKm?km:null,intervalBulan:hasMo?mo:null,showInReminder:category&&category.showInReminder!=null?category.showInReminder!==false:p.serviceShowInReminder!==false};
}
function vsrsCategoryRule(category,vehicleId){
  if(!category||category.vehicleId&&String(category.vehicleId)!==String(vehicleId))return null;
  let km=Number(category.intervalKm),mo=Number(category.intervalBulan);
  if((!Number.isFinite(km)||km<=0)&&(!Number.isFinite(mo)||mo<=0)&&typeof VehicleServiceSOT!=='undefined'&&VehicleServiceSOT&&typeof VehicleServiceSOT.resolveReminderRule==='function'){
    try{const active=VehicleServiceSOT.resolveReminderRule(category,vehicleId);if(active){km=Number(active.intervalKm);mo=Number(active.intervalBulan);}}catch(_e){/* A missing optional interval resolver must not block other canonical categories. */}
  }
  const hasKm=Number.isFinite(km)&&km>0,hasMo=Number.isFinite(mo)&&mo>0;
  if(!hasKm&&!hasMo)return null;
  const componentId=String(category.serviceComponentId||category.componentId||'').trim()||null;
  const categoryId=String(category.id||category.categoryId||'').trim()||null;
  if(!componentId&&!categoryId&&!category.catalogPartId)return null;
  return {catalogPartId:category.catalogPartId?String(category.catalogPartId):null,categoryId,serviceComponentId:componentId,masterCategoryId:category.masterCategoryId||null,partName:String(category.name||category.partName||componentId||'Servis'),oemCode:String(category.code||category.oemCode||''),category:String(category.group||category.categoryName||''),subcategory:category.subcategory==null?null:String(category.subcategory),intervalKm:hasKm?km:null,intervalBulan:hasMo?mo:null,showInReminder:category.showInReminder!==false};
}
function vsrsDedup(rules){
  const m=new Map(); (rules||[]).forEach(r=>{if(!r)return;const key=String(r.serviceComponentId||r.catalogPartId||r.categoryId||'').trim();if(!key)return;const old=m.get(key);if(!old)m.set(key,r);else if(!old.catalogPartId&&r.catalogPartId)m.set(key,r);});
  return Array.from(m.values()).sort((a,b)=>(a.category+a.subcategory+a.partName).localeCompare(b.category+b.subcategory+b.partName));
}
async function provision(vehicleId,options){
  const v=vsrsVehicle(vehicleId)||options&&options.vehicle;
  if(!v)return {ok:false,reason:'vehicle_missing'};
  const parts=await vsrsCatalog(v.id,options);
  let categories=[];
  if(typeof VehicleServiceSOT!=='undefined'&&VehicleServiceSOT&&typeof VehicleServiceSOT.getReminderCategoriesForVehicle==='function'){
    try{categories=VehicleServiceSOT.getReminderCategoriesForVehicle(v.id)||[];}catch(_e){categories=[];}
  }
  const catalogRules=parts.map(p=>vsrsRule(p,v.id,categories)).filter(Boolean);
  const represented=new Set();
  catalogRules.forEach(r=>{if(r.categoryId)represented.add('cat:'+String(r.categoryId));if(r.serviceComponentId)represented.add('component:'+String(r.serviceComponentId));});
  // Legacy/vehicle SOT categories may be valid reminder rules without a linked
  // VehicleCatalog part. Keep these canonical category rows instead of silently
  // provisioning an empty schedule when the catalog has no component links.
  const categoryRules=categories.filter(c=>c&&(!c.vehicleId||String(c.vehicleId)===String(v.id))).map(c=>{
    if((c.id&&represented.has('cat:'+String(c.id)))||(c.serviceComponentId&&represented.has('component:'+String(c.serviceComponentId))))return null;
    return vsrsCategoryRule(c,v.id);
  }).filter(Boolean);
  const rules=vsrsDedup(catalogRules.concat(categoryRules));
  const old=(typeof VehicleCarNotesSOT!=='undefined'&&VehicleCarNotesSOT)?VehicleCarNotesSOT.getServiceSchedules(v.id):[];
  let wr=(typeof VehicleCarNotesSOT!=='undefined'&&VehicleCarNotesSOT)?VehicleCarNotesSOT.setServiceSchedules(v.id,rules,{version:VEHICLE_SERVICE_REMINDER_SOT_VERSION}):null;
  if(!wr||!wr.ok){
    // Isolated preview/test harness only: canonical SOT module is intentionally absent.
    let s=v.sot;
    if(!s||typeof s!=='object'||Array.isArray(s)){s={};Object.defineProperty(v,'sot',{value:s,writable:true,configurable:true,enumerable:true});}
    s.serviceSchedules=JSON.parse(JSON.stringify(rules));
    wr={ok:true,transient:true};
  }
  return {ok:true,vehicle:v,changed:JSON.stringify(old)!==JSON.stringify(rules),summary:{catalogPartCount:parts.length,serviceRuleCount:rules.length,reminderRuleCount:rules.filter(r=>r.showInReminder).length}};
}
async function getSchedules(vehicleId,options){
  const v=vsrsVehicle(vehicleId); const canonical=(typeof VehicleCarNotesSOT!=='undefined'&&VehicleCarNotesSOT)?VehicleCarNotesSOT.getServiceSchedules(vehicleId):[]; if(v&&canonical.length)return canonical;
  const r=await provision(vehicleId,options);
  if(!r.ok)return [];
  if(typeof VehicleCarNotesSOT!=='undefined'&&VehicleCarNotesSOT)return VehicleCarNotesSOT.getServiceSchedules(vehicleId);
  return v&&v.sot&&Array.isArray(v.sot.serviceSchedules)?v.sot.serviceSchedules:[];
}
async function getReminderSchedules(vehicleId,options){return (await getSchedules(vehicleId,options)).filter(r=>r.showInReminder!==false);}
const VehicleServiceReminderSOT={version:VEHICLE_SERVICE_REMINDER_SOT_VERSION,provision,getSchedules,getReminderSchedules};
if(typeof window!=='undefined')window.VehicleServiceReminderSOT=VehicleServiceReminderSOT;
if(typeof globalThis!=='undefined')globalThis.VehicleServiceReminderSOT=VehicleServiceReminderSOT;
if(typeof module!=='undefined')module.exports=VehicleServiceReminderSOT;
