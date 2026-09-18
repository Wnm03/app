// vehicle-model-resolver-sot.js — SOT-4D
// Memisahkan identitas kendaraan: manufacturer → model → generation → year → variant.
// Tidak menebak varian; field varian hanya diisi dari input eksplisit.
const VEHICLE_MODEL_RESOLVER_SOT_VERSION='SOT-VEHICLE-MODEL-RESOLVER-V1';
function vmrs4dNorm(v){return String(v==null?'':v).trim().toLowerCase().replace(/[()[\],./_-]+/g,' ').replace(/\s+/g,' ').trim();}
function vmrs4dYear(v){const m=String(v==null?'':v).match(/\b(19\d{2}|20\d{2})\b/);return m?Number(m[1]):null;}
function vmrs4dCc(v){const m=String(v==null?'':v).match(/\b(\d{3,4})\s*(?:cc|ccm)\b/i)||String(v==null?'':v).match(/\b(\d\.\d)\s*(?:l|liter)\b/i);if(!m)return null;return /\./.test(m[1])?Math.round(Number(m[1])*1000):Number(m[1]);}
function vmrs4dRange(range){const m=String(range||'').match(/(19\d{2}|20\d{2})\s*[–-]\s*(19\d{2}|20\d{2})/);return m?{from:Number(m[1]),to:Number(m[2])}:null;}
function vmrs4dModel(input){return typeof VehicleModelRegistrySOT!=='undefined'&&VehicleModelRegistrySOT.find?VehicleModelRegistrySOT.find(input):{model:null,profile:null,confidence:'none',candidates:[]};}
function vmrs4dResolve(input={}){
 const name=String(input.name||input.vehicleName||'').trim();
 const year=Number(input.year||input.modelYear||input.tahun||0)||vmrs4dYear(name)||null;
 const engineCc=Number(input.engineCc||input.cc||input.modelCc||0)||vmrs4dCc(name)||null;
 const variant=String(input.variant||input.modelVariant||'').trim()||null;
 const base=vmrs4dModel({modelId:input.modelId,name});
 if(base.confidence==='ambiguous')return {status:'ambiguous',confidence:'ambiguous',candidates:base.candidates||[],year,engineCc,variant};
 if(!base.model)return {status:'unknown',confidence:base.confidence||'none',model:null,profile:null,year,engineCc,variant};
 const p=base.profile||{};
 const range=vmrs4dRange(p.yearRange);
 if(year&&range&&(year<range.from||year>range.to))return {status:'year-conflict',confidence:base.confidence,model:base.model,profile:p,year,engineCc,variant,yearRange:range,reason:'year_outside_profile_range'};
 return {status:'resolved',confidence:base.confidence,model:base.model,profile:p,year,engineCc,variant,yearRange:range,matched:base.matched||null};
}
function vmrs4dApply(vehicle,result){
 if(!vehicle||!result)return vehicle;
 if(result.status==='resolved'){
  vehicle.modelId=result.model.id;
  vehicle.manufacturerId=result.profile&&result.profile.manufacturerId||result.model.manufacturerId||undefined;
  vehicle.modelDisplayName=result.profile&&result.profile.name||result.model.name||result.model.displayName||vehicle.name;
  if(result.profile&&result.profile.generation)vehicle.modelGeneration=result.profile.generation;
  if(result.profile&&result.profile.yearRange)vehicle.modelYearRange=result.profile.yearRange;
  if(result.year)vehicle.modelYear=result.year;else delete vehicle.modelYear;
  if(result.engineCc)vehicle.modelEngineCc=result.engineCc;else delete vehicle.modelEngineCc;
  if(result.variant)vehicle.modelVariant=result.variant;else delete vehicle.modelVariant;
 } else if(result.status==='year-conflict'){
  delete vehicle.modelId;delete vehicle.modelDisplayName;delete vehicle.modelGeneration;
  vehicle.modelYear=result.year||undefined;
  vehicle.sotIdentityStatus='year-conflict';
 } else if(result.status==='ambiguous'){
  delete vehicle.modelId;delete vehicle.modelDisplayName;delete vehicle.modelGeneration;
  vehicle.sotIdentityStatus='needs-confirmation';
 }
 return vehicle;
}
const VehicleModelResolverSOT={version:VEHICLE_MODEL_RESOLVER_SOT_VERSION,normalize:vmrs4dNorm,resolve:vmrs4dResolve,apply:vmrs4dApply,parseYear:vmrs4dYear,parseEngineCc:vmrs4dCc};
if(typeof window!=='undefined')window.VehicleModelResolverSOT=VehicleModelResolverSOT;
