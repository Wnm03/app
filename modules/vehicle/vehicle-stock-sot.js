const VEHICLE_STOCK_SOT_VERSION='SOT-STOCK-V1';
function vehicleStockSotNorm(v){return String(v==null?'':v).trim().toLowerCase().replace(/[\s\-_/.]+/g,'');}
function vehicleStockSotValidVehicle(id){return !!(id&&typeof D!=='undefined'&&Array.isArray(D.vehicles)&&D.vehicles.some(v=>String(v.id)===String(id)));}
function vehicleStockSotItems(){
 const s=typeof VehicleCatalog!=='undefined'&&VehicleCatalog.getStore?VehicleCatalog.getStore():null;
 return s&&Array.isArray(s.items)?s.items:[];
}
function vehicleStockSotVehicleMatch(it,vehicleId){
 if(!vehicleId)return true;
 const ids=it&&it.compatibleVehicleIds;
 return !Array.isArray(ids)||!ids.length||ids.some(id=>String(id)===String(vehicleId));
}
function vehicleStockSotFind(stock,vehicleId,items){
 if(!stock)return null;
 const list=Array.isArray(items)?items:vehicleStockSotItems();
 const direct=stock.catalogPartId||stock.catalogId;
 if(direct){const hit=list.find(it=>String(it.id)===String(direct));if(hit&&vehicleStockSotVehicleMatch(hit,vehicleId))return hit;}
 const code=vehicleStockSotNorm(stock.oemCode||stock.barcode||stock.code);
 if(code){const hits=list.filter(it=>vehicleStockSotVehicleMatch(it,vehicleId)&&[it.oemCode,it.barcode].some(v=>vehicleStockSotNorm(v)===code));if(hits.length===1)return hits[0];}
 const name=String(stock.name||'').trim().toLowerCase();
 if(name){const hits=list.filter(it=>vehicleStockSotVehicleMatch(it,vehicleId)&&String(it.partName||'').trim().toLowerCase()===name);if(hits.length===1)return hits[0];}
 return null;
}
function vehicleStockSotApply(stock,item){
 if(!stock||!item)return false;
 let changed=false;
 if(String(stock.catalogPartId||'')!==String(item.id)){stock.catalogPartId=item.id;changed=true;}
 // Legacy alias is intentionally preserved for old readers and migrations.
 if(String(stock.catalogId||'')!==String(item.id)){stock.catalogId=item.id;changed=true;}
 const fields={catalogPartName:item.partName||'',catalogPartOemCode:item.oemCode||'',catalogCategory:item.category||'',catalogSubcategory:item.subcategory||null};
 Object.keys(fields).forEach(k=>{if(stock[k]!==fields[k]){stock[k]=fields[k];changed=true;}});
 return changed;
}
async function vehicleStockSotEnsureReady(vehicleId){
 if(typeof VehicleCatalog==='undefined'||!VehicleCatalog||typeof VehicleCatalog.ensureLoaded!=='function'||typeof D==='undefined'||!Array.isArray(D.partsStock))return {ok:true,changed:0,linked:0,ambiguous:0,invalid:0};
 await VehicleCatalog.ensureLoaded();
 const items=vehicleStockSotItems(); let changed=0,linked=0,ambiguous=0,invalid=0;
 D.partsStock.forEach(p=>{
   if(!p)return;
   const direct=p.catalogPartId||p.catalogId;
   if(direct){
     const hit=items.find(it=>String(it.id)===String(direct));
     if(hit){if(vehicleStockSotApply(p,hit))changed++;linked++;}else invalid++;
     return;
   }
   const hit=vehicleStockSotFind(p,vehicleId,items);
   if(hit){if(vehicleStockSotApply(p,hit))changed++;linked++;}
   else if((p.oemCode||p.barcode||p.code||p.name))ambiguous++;
 });
 if(changed&&typeof save==='function')save();
 return {ok:true,changed,linked,ambiguous,invalid};
}
function vehicleStockSotCatalogFor(stock,vehicleId){return vehicleStockSotFind(stock,vehicleId,vehicleStockSotItems());}
function vehicleStockSotCategory(stock,vehicleId){
 const it=vehicleStockSotCatalogFor(stock,vehicleId); if(it)return it.category||'';
 return '';
}
function vehicleStockSotSubcategory(stock,vehicleId){
 const it=vehicleStockSotCatalogFor(stock,vehicleId); return it?it.subcategory||'':'';
}
const VehicleStockSOT={version:VEHICLE_STOCK_SOT_VERSION,ensureReady:vehicleStockSotEnsureReady,findCatalog:vehicleStockSotCatalogFor,category:vehicleStockSotCategory,subcategory:vehicleStockSotSubcategory,apply:vehicleStockSotApply,norm:vehicleStockSotNorm};

// honda-oem-catalog-master.js — canonical READ-ONLY adapter for Honda parts-catalog text.
