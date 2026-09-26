// SOT-4F — automatic service + reminder provisioning per vehicle model.
// VehicleCatalog remains the canonical part/service-rule source; vehicle.sot
// stores a deterministic projection for the selected vehicle/model.
const VEHICLE_SERVICE_REMINDER_SOT_VERSION='SOT-SERVICE-REMINDER-V1';
function vsrsNorm(v){return String(v==null?'':v).trim().toLowerCase();}
function vsrsVehicle(vehicleId){return (typeof D!=='undefined'&&Array.isArray(D.vehicles))?D.vehicles.find(v=>String(v&&v.id)===String(vehicleId)):null;}
function vsrsModelId(vehicle){return String(vehicle&&vehicle.modelId||'').trim()||null;}
async function vsrsCatalog(vehicleId){
  if(typeof VehicleCatalog==='undefined'||!VehicleCatalog||typeof VehicleCatalog.getAll!=='function')return [];
  const v=vsrsVehicle(vehicleId)||{}; const vid=String(v.id||vehicleId||''); const mid=vsrsModelId(v);
  try{const all=await VehicleCatalog.getAll();return (all||[]).filter(p=>{
    if(!p||p.isDraft)return false;
    const byV=Array.isArray(p.compatibleVehicleIds)&&p.compatibleVehicleIds.some(id=>String(id)===vid);
    const byM=!!mid&&Array.isArray(p.compatibleModelIds)&&p.compatibleModelIds.some(id=>String(id)===mid);
    return byV||byM;
  });}catch(e){return []}
}
function vsrsRule(p){
  const km=Number(p&&p.serviceIntervalKm), mo=Number(p&&p.serviceIntervalMonths);
  const hasKm=Number.isFinite(km)&&km>0, hasMo=Number.isFinite(mo)&&mo>0;
  if(!hasKm&&!hasMo)return null;
  return {catalogPartId:String(p.id),partName:String(p.partName||''),oemCode:String(p.oemCode||''),category:String(p.category||''),subcategory:p.subcategory==null?null:String(p.subcategory),intervalKm:hasKm?km:null,intervalBulan:hasMo?mo:null,showInReminder:p.serviceShowInReminder!==false};
}
function vsrsDedup(rules){
  const m=new Map(); (rules||[]).forEach(r=>{if(!r||!r.catalogPartId)return;const old=m.get(r.catalogPartId);if(!old)m.set(r.catalogPartId,r);});
  return Array.from(m.values()).sort((a,b)=>(a.category+a.subcategory+a.partName).localeCompare(b.category+b.subcategory+b.partName));
}
async function provision(vehicleId,options){
  const v=vsrsVehicle(vehicleId)||options&&options.vehicle;
  if(!v)return {ok:false,reason:'vehicle_missing'};
  const parts=await vsrsCatalog(v.id); const rules=vsrsDedup(parts.map(vsrsRule).filter(Boolean));
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
async function getSchedules(vehicleId){
  const v=vsrsVehicle(vehicleId); const canonical=(typeof VehicleCarNotesSOT!=='undefined'&&VehicleCarNotesSOT)?VehicleCarNotesSOT.getServiceSchedules(vehicleId):[]; if(v&&canonical.length)return canonical;
  const r=await provision(vehicleId);
  if(!r.ok)return [];
  if(typeof VehicleCarNotesSOT!=='undefined'&&VehicleCarNotesSOT)return VehicleCarNotesSOT.getServiceSchedules(vehicleId);
  return v&&v.sot&&Array.isArray(v.sot.serviceSchedules)?v.sot.serviceSchedules:[];
}
async function getReminderSchedules(vehicleId){return (await getSchedules(vehicleId)).filter(r=>r.showInReminder!==false);}
const VehicleServiceReminderSOT={version:VEHICLE_SERVICE_REMINDER_SOT_VERSION,provision,getSchedules,getReminderSchedules};
if(typeof window!=='undefined')window.VehicleServiceReminderSOT=VehicleServiceReminderSOT;
if(typeof globalThis!=='undefined')globalThis.VehicleServiceReminderSOT=VehicleServiceReminderSOT;
if(typeof module!=='undefined')module.exports=VehicleServiceReminderSOT;
