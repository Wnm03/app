// vehicle-sot-provisioning.js — SOT-4A
// Identifikasi kendaraan + provisioning SOT berbasis model saat registrasi.
// Prinsip: auto-detect hanya dari registry/model database yang benar-benar ada;
// tidak mengarang part/category untuk model yang belum punya sumber.
const VEHICLE_SOT_PROVISIONING_VERSION='SOT-VEHICLE-PROVISIONING-V1';
function vspsNorm(v){return String(v==null?'':v).trim().toLowerCase().replace(/[()\[\],./_-]+/g,' ').replace(/\s+/g,' ');}
function vspsModels(){
  if(typeof DatabaseAPI!=='undefined'){
    if(DatabaseAPI.vehicleModel&&typeof DatabaseAPI.vehicleModel.getAll==='function')return DatabaseAPI.vehicleModel.getAll();
    if(DatabaseAPI.vehicle&&typeof DatabaseAPI.vehicle.modelGetAll==='function')return DatabaseAPI.vehicle.modelGetAll();
  }
  if(typeof dbVehicleModelGetAll==='function')return dbVehicleModelGetAll();
  return [];
}
function vspsModelIdFromVehicle(v){return String(v&&v.modelId||'').trim()||null;}
function vspsFindModel(input={}){
  if(typeof VehicleModelRegistrySOT!=='undefined'&&VehicleModelRegistrySOT){const rr=VehicleModelRegistrySOT.find(input);if(rr&&rr.model)return {model:rr.model,profile:rr.profile,confidence:rr.confidence,source:input.modelId?'modelId':'name',matched:rr.matched,candidates:rr.candidates||[rr.profile]};if(rr&&rr.confidence==='ambiguous')return {model:null,profile:null,confidence:'ambiguous',source:'name',candidates:rr.candidates||[]};}
  const models=vspsModels();
  const explicit=String(input.modelId||'').trim();
  if(explicit){const hit=models.find(m=>String(m.id)===explicit);if(hit)return {model:hit,confidence:'explicit',source:'modelId'};}
  const name=vspsNorm(input.name||input.vehicleName||'');
  if(!name)return {model:null,confidence:'none',source:null,candidates:[]};
  const scored=[];
  models.forEach(m=>{
    const aliases=[m.name].concat(Array.isArray(m.matchNames)?m.matchNames:[]).map(vspsNorm).filter(Boolean);
    let score=0,matched=null;
    aliases.forEach(a=>{
      if(name===a){if(score<100){score=100;matched=a;}}
      else if(name.includes(a)||a.includes(name)){if(score<70){score=70;matched=a;}}
    });
    if(score)scored.push({model:m,score,matched});
  });
  scored.sort((a,b)=>b.score-a.score);
  if(!scored.length)return {model:null,confidence:'none',source:null,candidates:[]};
  const top=scored[0], tied=scored.filter(x=>x.score===top.score);
  if(tied.length>1)return {model:null,confidence:'ambiguous',source:'name',candidates:tied.map(x=>x.model)};
  return {model:top.model,confidence:top.score>=100?'exact':'alias',source:'name',matched:top.matched,candidates:[top.model]};
}
function vspsCategoriesForModel(model,vehicle){
  const out=[];
  const seen=new Set();
  const add=(name,source,icon)=>{const n=String(name||'').trim();if(!n)return;const k=vspsNorm(n);if(seen.has(k))return;seen.add(k);out.push({name:n,source:source||'unknown',icon:icon||null});};
  if(model&&model.torsi&&Array.isArray(model.torsi.cats))model.torsi.cats.forEach(c=>add(c&&c.cat,'vehicle-database',c&&c.icon));
  return out;
}
function vspsComponentSummary(model,vehicle,precomputedCats){
  const rows=model&&model.torsi&&Array.isArray(model.torsi.cats)?model.torsi.cats:[];
  const cats=Array.isArray(precomputedCats)?precomputedCats:vspsCategoriesForModel(model,vehicle);
  let torqueItems=0;
  if(rows.length){
    // When the caller already has the category projection, avoid rebuilding it.
    // The item count is independent of category de-duplication and stays exact.
    for(const c of rows)torqueItems+=Array.isArray(c&&c.items)?c.items.length:0;
  }
  return {categoryCount:cats.length,categoryNames:cats.map(c=>c.name),vehicleDatabaseItems:torqueItems};
}
function vspsFindCatalogPartsForVehicle(vehicle,model,options){
  if(typeof VehicleCatalog==='undefined'||!VehicleCatalog)return Promise.resolve([]);
  const opts=options&&typeof options==='object'?options:null;
  const cache=opts&&opts._catalogCache&&typeof opts._catalogCache==='object'?opts._catalogCache:null;
  let allPromise=cache&&cache.allPromise;
  if(!allPromise){
    allPromise=VehicleCatalog.getAll();
    if(cache)cache.allPromise=allPromise;
  }
  return Promise.resolve(allPromise).then(all=>{
    let index=cache&&cache.index;
    if(!index){
      const byVehicle=new Map();
      const byModel=new Map();
      for(const it of all||[]){
        if(!it||it.isDraft)continue;
        const add=(map,key)=>{const k=String(key||'');if(!k)return;const arr=map.get(k);if(arr)arr.push(it);else map.set(k,[it]);};
        for(const id of Array.isArray(it.compatibleVehicleIds)?it.compatibleVehicleIds:[])add(byVehicle,id);
        for(const id of Array.isArray(it.compatibleModelIds)?it.compatibleModelIds:[])add(byModel,id);
      }
      index={byVehicle,byModel};
      if(cache)cache.index=index;
    }
    const vid=String(vehicle&&vehicle.id||'');
    const list=(index.byVehicle.get(vid)||[]).slice();
    // Model-level SOT is the canonical projection for every unit of the same
    // model. Do not duplicate catalog parts per vehicle; read the shared model
    // compatibility instead. Vehicle-level compatibility remains a valid
    // explicit override/backward-compatible projection. Preserve the previous
    // ordering: vehicle matches first, then model-only matches; duplicate IDs
    // retain the vehicle position while receiving the model row value.
    const mid=model&&model.id?String(model.id):String(vehicle&&vehicle.modelId||'');
    if(mid){
      const byId=new Map(list.map(it=>[String(it.id),it]));
      for(const it of index.byModel.get(mid)||[])byId.set(String(it.id),it);
      return Array.from(byId.values());
    }
    return list;
  }).catch(()=>[]);
}
function vspsTransientSOT(vehicle){
  // Unit-test/preview compatibility only: real app vehicles live in D.vehicles
  // and are always written through VehicleCarNotesSOT. This detached-object
  // fallback is not persisted and cannot create a second runtime SOT store.
  if(!vehicle||typeof vehicle!=='object')return null;
  let s=vehicle.sot;
  if(!s||typeof s!=='object'||Array.isArray(s)){
    s={};
    Object.defineProperty(vehicle,'sot',{value:s,writable:true,configurable:true,enumerable:true});
  }
  s.owner='VehicleCarNotesSOT';
  s.vehicleId=String(vehicle.id||'');
  s.vehicleType=String(vehicle.vehicleType||vehicle.jenis||vehicle.type||'')||null;
  return s;
}
function vspsSetProvisioning(vehicle,payload){
  if(typeof VehicleCarNotesSOT!=='undefined'&&VehicleCarNotesSOT&&vehicle&&vehicle.id){
    try{return VehicleCarNotesSOT.setProvisioning(vehicle.id,payload);}catch(_e){/* isolated harness may omit D.vehicles */}
  }
  const s=vspsTransientSOT(vehicle); if(!s)return {ok:false,code:'vehicle_missing'};
  Object.keys(payload||{}).forEach(k=>{if(payload[k]!==undefined)s[k]=JSON.parse(JSON.stringify(payload[k]));});
  return {ok:true,transient:true,sot:s};
}
async function vspsProvisionVehicle(vehicle,options){
  options=options||{};
  if(!vehicle)return {ok:false,reason:'vehicle_missing'};
  const identInput={modelId:vehicle.modelId,name:vehicle.name,year:vehicle.modelYear,variant:vehicle.modelVariant,cc:vehicle.modelEngineCc};
  if(options&&options._baseModelCache)identInput._baseModelCache=options._baseModelCache;
  const ident=(typeof VehicleModelResolverSOT!=='undefined'&&VehicleModelResolverSOT.resolve)?VehicleModelResolverSOT.resolve(identInput):vspsFindModel({modelId:vehicle.modelId,name:vehicle.name});
  if(ident.status==='year-conflict'){ if(typeof VehicleCarNotesSOT==='undefined'&&!vehicle)return {ok:false,reason:'car-notes-sot-unavailable'}; vspsSetProvisioning(vehicle,{status:'year-conflict',version:VEHICLE_SOT_PROVISIONING_VERSION,modelId:ident.model&&ident.model.id||null,year:ident.year,expectedRange:ident.profile&&ident.profile.yearRange||null}); return {ok:true,vehicle,identification:ident,summary:{categoryCount:0,vehicleDatabaseItems:0,catalogPartCount:0}}; }
  if(ident.confidence==='ambiguous'||ident.status==='ambiguous'){
    delete vehicle.modelId; delete vehicle.manufacturerId; delete vehicle.modelDisplayName;
    if(typeof VehicleCarNotesSOT==='undefined'&&!vehicle)return {ok:false,reason:'car-notes-sot-unavailable'}; vspsSetProvisioning(vehicle,{status:'needs-confirmation',version:VEHICLE_SOT_PROVISIONING_VERSION,candidates:ident.candidates.map(m=>m.id)});
    return {ok:true,vehicle,identification:ident,summary:{categoryCount:0,vehicleDatabaseItems:0,catalogPartCount:0}};
  }
  const model=ident.model;
  if(!model){
    const meta=(typeof VehicleModelRegistrySOT!=='undefined'&&VehicleModelRegistrySOT.inferMeta)?VehicleModelRegistrySOT.inferMeta({name:vehicle.name}):null;
    delete vehicle.modelId; delete vehicle.modelDisplayName;
    if(meta&&meta.manufacturer)vehicle.manufacturerId=meta.manufacturer.id;else delete vehicle.manufacturerId;
    if(meta&&meta.vehicleType){vehicle.vehicleType=meta.vehicleType;if(!vehicle.jenis||vehicle.jenis==='motor'&&meta.vehicleType==='mobil')vehicle.jenis=meta.vehicleType;}
    if(meta&&meta.bodyType)vehicle.bodyType=meta.bodyType;else delete vehicle.bodyType;
    if(typeof VehicleCarNotesSOT==='undefined'&&!vehicle)return {ok:false,reason:'car-notes-sot-unavailable'}; vspsSetProvisioning(vehicle,{status:'needs-catalog',version:VEHICLE_SOT_PROVISIONING_VERSION,autoDetected:meta||null});
    return {ok:true,vehicle,identification:Object.assign({},ident,{meta}),summary:{categoryCount:0,vehicleDatabaseItems:0,catalogPartCount:0}};
  }
  const profile=ident.profile||(typeof VehicleModelRegistrySOT!=='undefined'&&VehicleModelRegistrySOT.profile?VehicleModelRegistrySOT.profile(model):null);
  if(profile&&profile.vehicleType&&!vehicle.jenis)vehicle.jenis=profile.vehicleType;
  vehicle.manufacturerId=(profile&&profile.manufacturerId)||model.manufacturerId||'honda';
  vehicle.modelId=model.id;
  vehicle.modelDisplayName=(profile&&profile.name)||model.name||model.displayName||vehicle.name;
  if(profile){vehicle.vehicleType=profile.vehicleType||vehicle.jenis;vehicle.bodyType=profile.bodyType||undefined;if(!vehicle.bodyType)delete vehicle.bodyType;vehicle.modelGeneration=profile.generation||undefined;vehicle.modelYearRange=profile.yearRange||undefined;}
  if(typeof VehicleModelResolverSOT!=='undefined'&&VehicleModelResolverSOT.apply)VehicleModelResolverSOT.apply(vehicle,ident);
  const categoryCache=options&&options._categoryCache;
  let cats=null;
  const categoryKey=String(model.id||'');
  if(categoryCache&&typeof categoryCache.get==='function'&&typeof categoryCache.set==='function'){
    cats=categoryCache.get(categoryKey);
    if(!cats){cats=vspsCategoriesForModel(model,vehicle);categoryCache.set(categoryKey,cats);}
  }else cats=vspsCategoriesForModel(model,vehicle);
  const taxonomyCache=options&&options._taxonomyCache;
  let taxonomy=null;
  if(taxonomyCache&&typeof taxonomyCache.get==='function'&&typeof taxonomyCache.set==='function'){const key=String(model.id||'');taxonomy=taxonomyCache.get(key);if(!taxonomy){taxonomy=(typeof VehicleModelRegistrySOT!=='undefined'&&VehicleModelRegistrySOT.taxonomy)?VehicleModelRegistrySOT.taxonomy(model):cats.map(c=>({name:c.name,source:c.source,subcategories:[],components:[]}));taxonomyCache.set(key,taxonomy);}}else taxonomy=(typeof VehicleModelRegistrySOT!=='undefined'&&VehicleModelRegistrySOT.taxonomy)?VehicleModelRegistrySOT.taxonomy(model):cats.map(c=>({name:c.name,source:c.source,subcategories:[],components:[]}));
  const dbSummary=vspsComponentSummary(model,vehicle,cats);
  let catalogParts=[];
  if(typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.getAll==='function')catalogParts=await vspsFindCatalogPartsForVehicle(vehicle,model,options);
  if(typeof VehicleCarNotesSOT==='undefined'&&!vehicle)return {ok:false,reason:'car-notes-sot-unavailable'};
  vspsSetProvisioning(vehicle,{
    status:catalogParts.length||String(model.id)==='vario-125'?'ready':'partial',
    version:VEHICLE_SOT_PROVISIONING_VERSION,
    profileId:'vehicle-model:'+model.id,
    identificationConfidence:ident.confidence,
    identificationSource:ident.source,
    categoryCount:dbSummary.categoryCount,
    categoryNames:dbSummary.categoryNames,
    taxonomy,
    componentCount:taxonomy.reduce((n,c)=>n+(c.components||[]).length,0),
    catalogPartCount:catalogParts.length,
    catalogPartIds:catalogParts.map(it=>String(it.id)),
    catalogModelId:String(model.id),
    vehicleDatabaseItems:dbSummary.vehicleDatabaseItems,
    provisionedAt:new Date().toISOString()
  });
  return {ok:true,vehicle,identification:ident,summary:Object.assign({},dbSummary,{catalogPartCount:catalogParts.length}),catalogParts};
}
function vspsPreview(input){
  const r=(typeof VehicleModelResolverSOT!=='undefined'&&VehicleModelResolverSOT.resolve)?VehicleModelResolverSOT.resolve(input||{}):vspsFindModel(input||{});
  if(r.status==='year-conflict')return {status:'year-conflict',model:r.model,profile:r.profile,year:r.year,yearRange:r.yearRange,engineCc:r.engineCc,variant:r.variant};
  if(r.model){const s=vspsComponentSummary(r.model,null);const p=r.profile||(typeof VehicleModelRegistrySOT!=='undefined'&&VehicleModelRegistrySOT.profile?VehicleModelRegistrySOT.profile(r.model):null);const taxonomy=(typeof VehicleModelRegistrySOT!=='undefined'&&VehicleModelRegistrySOT.taxonomy)?VehicleModelRegistrySOT.taxonomy(r.model):[];return {status:'identified',model:r.model,profile:p,confidence:r.confidence,source:r.source,matched:r.matched||null,summary:Object.assign({},s,{vehicleType:(p&&p.vehicleType)||null,bodyType:(p&&p.bodyType)||null,generation:(p&&p.generation)||null,yearRange:(p&&p.yearRange)||null,componentCount:taxonomy.reduce((n,c)=>n+(c.components||[]).length,0)}),taxonomy};}
  if(r.confidence==='ambiguous')return {status:'ambiguous',candidates:r.candidates||[]};
  const meta=(typeof VehicleModelRegistrySOT!=='undefined'&&VehicleModelRegistrySOT.inferMeta)?VehicleModelRegistrySOT.inferMeta(input||{}):null;
  return {status:'unknown',candidates:[],meta};
}
const VehicleSOTProvisioning={version:VEHICLE_SOT_PROVISIONING_VERSION,normalize:vspsNorm,findModel:vspsFindModel,preview:vspsPreview,provisionVehicle:vspsProvisionVehicle,categoriesForModel:vspsCategoriesForModel,componentSummary:vspsComponentSummary};
if(typeof window!=='undefined')window.VehicleSOTProvisioning=VehicleSOTProvisioning;
