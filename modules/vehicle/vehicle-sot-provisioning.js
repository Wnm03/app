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
function vspsComponentSummary(model,vehicle){
  const cats=vspsCategoriesForModel(model,vehicle);
  let torqueItems=0;
  if(model&&model.torsi&&Array.isArray(model.torsi.cats))model.torsi.cats.forEach(c=>{torqueItems+=(Array.isArray(c&&c.items)?c.items.length:0);});
  return {categoryCount:cats.length,categoryNames:cats.map(c=>c.name),vehicleDatabaseItems:torqueItems};
}
function vspsFindCatalogPartsForVehicle(vehicle,model){
  if(typeof VehicleCatalog==='undefined'||!VehicleCatalog)return Promise.resolve([]);
  return VehicleCatalog.getAll().then(all=>{
    const vid=String(vehicle&&vehicle.id||'');
    let list=(all||[]).filter(it=>it&&!it.isDraft&&Array.isArray(it.compatibleVehicleIds)&&it.compatibleVehicleIds.some(id=>String(id)===vid));
    // Model-level SOT is the canonical projection for every unit of the same
    // model. Do not duplicate catalog parts per vehicle; read the shared model
    // compatibility instead. Vehicle-level compatibility remains a valid
    // explicit override/backward-compatible projection.
    const mid=model&&model.id?String(model.id):String(vehicle&&vehicle.modelId||'');
    if(mid){
      const modelList=(all||[]).filter(it=>it&&!it.isDraft&&Array.isArray(it.compatibleModelIds)&&it.compatibleModelIds.some(id=>String(id)===mid));
      const byId=new Map(list.map(it=>[String(it.id),it]));
      modelList.forEach(it=>byId.set(String(it.id),it));
      list=Array.from(byId.values());
    }
    return list;
  }).catch(()=>[]);
}
async function vspsProvisionVehicle(vehicle,options){
  options=options||{};
  if(!vehicle)return {ok:false,reason:'vehicle_missing'};
  const ident=(typeof VehicleModelResolverSOT!=='undefined'&&VehicleModelResolverSOT.resolve)?VehicleModelResolverSOT.resolve({modelId:vehicle.modelId,name:vehicle.name,year:vehicle.modelYear,variant:vehicle.modelVariant,cc:vehicle.modelEngineCc}):vspsFindModel({modelId:vehicle.modelId,name:vehicle.name});
  if(ident.status==='year-conflict'){ vehicle.sot={status:'year-conflict',version:VEHICLE_SOT_PROVISIONING_VERSION,modelId:ident.model&&ident.model.id||null,year:ident.year,expectedRange:ident.profile&&ident.profile.yearRange||null}; return {ok:true,vehicle,identification:ident,summary:{categoryCount:0,vehicleDatabaseItems:0,catalogPartCount:0}}; }
  if(ident.confidence==='ambiguous'||ident.status==='ambiguous'){
    delete vehicle.modelId; delete vehicle.manufacturerId; delete vehicle.modelDisplayName;
    vehicle.sot={status:'needs-confirmation',version:VEHICLE_SOT_PROVISIONING_VERSION,candidates:ident.candidates.map(m=>m.id)};
    return {ok:true,vehicle,identification:ident,summary:{categoryCount:0,vehicleDatabaseItems:0,catalogPartCount:0}};
  }
  const model=ident.model;
  if(!model){
    const meta=(typeof VehicleModelRegistrySOT!=='undefined'&&VehicleModelRegistrySOT.inferMeta)?VehicleModelRegistrySOT.inferMeta({name:vehicle.name}):null;
    delete vehicle.modelId; delete vehicle.modelDisplayName;
    if(meta&&meta.manufacturer)vehicle.manufacturerId=meta.manufacturer.id;else delete vehicle.manufacturerId;
    if(meta&&meta.vehicleType){vehicle.vehicleType=meta.vehicleType;if(!vehicle.jenis||vehicle.jenis==='motor'&&meta.vehicleType==='mobil')vehicle.jenis=meta.vehicleType;}
    if(meta&&meta.bodyType)vehicle.bodyType=meta.bodyType;else delete vehicle.bodyType;
    vehicle.sot={status:'needs-catalog',version:VEHICLE_SOT_PROVISIONING_VERSION,autoDetected:meta||null};
    return {ok:true,vehicle,identification:Object.assign({},ident,{meta}),summary:{categoryCount:0,vehicleDatabaseItems:0,catalogPartCount:0}};
  }
  const profile=ident.profile||(typeof VehicleModelRegistrySOT!=='undefined'&&VehicleModelRegistrySOT.profile?VehicleModelRegistrySOT.profile(model):null);
  if(profile&&profile.vehicleType&&!vehicle.jenis)vehicle.jenis=profile.vehicleType;
  vehicle.manufacturerId=(profile&&profile.manufacturerId)||model.manufacturerId||'honda';
  vehicle.modelId=model.id;
  vehicle.modelDisplayName=(profile&&profile.name)||model.name||model.displayName||vehicle.name;
  if(profile){vehicle.vehicleType=profile.vehicleType||vehicle.jenis;vehicle.bodyType=profile.bodyType||undefined;if(!vehicle.bodyType)delete vehicle.bodyType;vehicle.modelGeneration=profile.generation||undefined;vehicle.modelYearRange=profile.yearRange||undefined;}
  if(typeof VehicleModelResolverSOT!=='undefined'&&VehicleModelResolverSOT.apply)VehicleModelResolverSOT.apply(vehicle,ident);
  const cats=vspsCategoriesForModel(model,vehicle);
  const taxonomy=(typeof VehicleModelRegistrySOT!=='undefined'&&VehicleModelRegistrySOT.taxonomy)?VehicleModelRegistrySOT.taxonomy(model):cats.map(c=>({name:c.name,source:c.source,subcategories:[],components:[]}));
  const dbSummary=vspsComponentSummary(model,vehicle);
  let catalogParts=[];
  if(typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.getAll==='function')catalogParts=await vspsFindCatalogPartsForVehicle(vehicle,model);
  vehicle.sot={
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
  };
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
