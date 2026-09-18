// vehicle-catalog-write-sot.js — canonical write gate for part identity.
// SOT-3C: all feature write paths that create a part should resolve/create
// through VehicleCatalog first. Legacy D.partsStock/D.sparepartCats remain
// compatibility projections/ledgers; they are never the canonical part ID.
const VEHICLE_CATALOG_WRITE_SOT_VERSION='SOT-CATALOG-WRITE-V1';
const _vcwsInflight=new Map();
function vcwsNorm(v){return String(v==null?'':v).trim().toLowerCase().replace(/[\s\-_/.]+/g,'');}
function vcwsValidVehicle(vehicleId){
  return !!(vehicleId&&typeof D!=='undefined'&&D&&Array.isArray(D.vehicles)&&D.vehicles.some(v=>String(v.id)===String(vehicleId)));
}
function vcwsCompatible(item,vehicleId){
  if(!vehicleId)return true;
  const ids=Array.isArray(item&&item.compatibleVehicleIds)?item.compatibleVehicleIds:[];
  return !ids.length||ids.some(id=>String(id)===String(vehicleId));
}
async function vcwsFind(input={},vehicleId=null){
  if(typeof VehicleCatalog==='undefined'||!VehicleCatalog)return null;
  const all=typeof VehicleCatalog.getAll==='function'?await VehicleCatalog.getAll():[];
  const list=(all||[]).filter(it=>it&&!it.isDraft&&vcwsCompatible(it,vehicleId));
  const direct=String(input.catalogPartId||input.catalogId||'').trim();
  if(direct){const hit=list.find(it=>String(it.id)===direct);if(hit)return hit;}
  const oem=vcwsNorm(input.oemCode), barcode=vcwsNorm(input.barcode), aftermarket=vcwsNorm(input.aftermarketCode);
  if(oem){const hits=list.filter(it=>vcwsNorm(it.oemCode)===oem);if(hits.length===1)return hits[0];}
  if(barcode){const hits=list.filter(it=>vcwsNorm(it.barcode)===barcode);if(hits.length===1)return hits[0];}
  if(aftermarket){const hits=list.filter(it=>vcwsNorm(it.aftermarketCode)===aftermarket);if(hits.length===1)return hits[0];}
  const name=vcwsNorm(input.partName||input.name);
  if(name){
    const cat=vcwsNorm(input.category);
    const hits=list.filter(it=>vcwsNorm(it.partName)===name&&(!cat||vcwsNorm(it.category)===cat));
    if(hits.length===1)return hits[0];
  }
  return null;
}
async function vcwsEnsurePart(input={},vehicleId=null){
  if(typeof VehicleCatalog==='undefined'||!VehicleCatalog)return null;
  if(typeof VehicleCatalog.getAll!=='function'||typeof VehicleCatalog.create!=='function')return null;
  const vid=vcwsValidVehicle(vehicleId)?String(vehicleId):null;
  const existing=await vcwsFind(input,vid);
  if(existing)return existing;
  const key=[vid||'',vcwsNorm(input.oemCode),vcwsNorm(input.barcode),vcwsNorm(input.aftermarketCode),vcwsNorm(input.partName||input.name),vcwsNorm(input.category)].join('|');
  if(_vcwsInflight.has(key))return _vcwsInflight.get(key);
  const promise=(async()=>{
    const again=await vcwsFind(input,vid);
    if(again)return again;
    const data={
      partName:String(input.partName||input.name||'').trim(),
      oemCode:String(input.oemCode||'').trim(),
      barcode:String(input.barcode||'').trim(),
      aftermarketCode:String(input.aftermarketCode||'').trim(),
      category:String(input.category||'Umum').trim()||'Umum',
      subcategory:input.subcategory==null||input.subcategory===''?null:String(input.subcategory).trim(),
      price:(input.price!==undefined&&input.price!==null&&input.price!=='')?Number(input.price):undefined,
      compatibleVehicleIds:vid?[vid]:[],
      notes:input.notes||''
    };
    if(!data.partName)return null;
    const res=await VehicleCatalog.create(data);
    return res&&res.success?res.item:null;
  })();
  _vcwsInflight.set(key,promise);
  try{return await promise;}finally{_vcwsInflight.delete(key);}
}
const VehicleCatalogWriteSOT={version:VEHICLE_CATALOG_WRITE_SOT_VERSION,norm:vcwsNorm,find:vcwsFind,ensurePart:vcwsEnsurePart,compatible:vcwsCompatible};
if(typeof window!=='undefined')window.VehicleCatalogWriteSOT=VehicleCatalogWriteSOT;
