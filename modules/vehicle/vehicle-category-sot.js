/**
 * SOT-3B — Category/Component write-path bridge.
 *
 * VehicleCatalog remains the canonical owner of part identity + taxonomy.
 * D.sparepartCats is a compatibility index for historical service/stock data.
 * A legacy category is allowed to exist without a catalogPartId (for old/custom
 * grouping), but when it is explicitly linked to a catalog part, edits to its
 * name/category metadata are propagated to that catalog item.
 *
 * This module deliberately never invents a catalog part from a category name:
 * a category is taxonomy, not a part identity. Ambiguous/unlinked rows remain
 * legacy-only until an explicit catalog link exists.
 */
const VEHICLE_CATEGORY_SOT_VERSION='SOT-CATEGORY-WRITE-V1';

function vehicleCategorySotFindLinkedCatalog(cat){
  if(!cat||typeof VehicleCatalog==='undefined'||!VehicleCatalog||typeof VehicleCatalog.getStore!=='function')return null;
  const id=cat.catalogPartId||cat.catalogId||'';
  if(!id)return null;
  const items=VehicleCatalog.getStore().items;
  if(!Array.isArray(items))return null;
  return items.find(it=>it&&!it.isDraft&&String(it.id)===String(id))||null;
}

async function vehicleCategorySotSyncCategory(cat,vehicleId){
  const item=vehicleCategorySotFindLinkedCatalog(cat);
  if(!item)return {ok:true,linked:false,changed:false,reason:'unlinked'};
  if(vehicleId&&Array.isArray(item.compatibleVehicleIds)&&item.compatibleVehicleIds.length&&
     !item.compatibleVehicleIds.some(id=>String(id)===String(vehicleId))){
    return {ok:false,linked:true,changed:false,reason:'vehicle-mismatch'};
  }
  const patch={};
  const canonicalCategory=cat.catalogCategory||cat.name||'';
  if(canonicalCategory&&String(item.category||'').trim()!==String(canonicalCategory).trim())patch.category=String(canonicalCategory).trim();
  if(cat.catalogSubcategory!==undefined&&String(item.subcategory||'')!==String(cat.catalogSubcategory||''))patch.subcategory=cat.catalogSubcategory||null;
  if(!Object.keys(patch).length)return {ok:true,linked:true,changed:false,item};
  if(typeof VehicleCatalog.update!=='function')return {ok:false,linked:true,changed:false,reason:'update-unavailable'};
  const res=await VehicleCatalog.update(item.id,patch);
  return {ok:!!(res&&res.success),linked:true,changed:!!(res&&res.success),item:res&&res.item||item};
}

async function vehicleCategorySotEnsureReady(){
  if(typeof VehicleCatalog==='undefined'||!VehicleCatalog||typeof VehicleCatalog.ensureLoaded!=='function')return {ok:true,linked:0,changed:0};
  if(typeof D==='undefined'||!Array.isArray(D.sparepartCats))return {ok:true,linked:0,changed:0};
  await VehicleCatalog.ensureLoaded();
  let linked=0,changed=0;
  for(const cat of D.sparepartCats){
    const item=vehicleCategorySotFindLinkedCatalog(cat);
    if(!item)continue;
    linked++;
    const res=await vehicleCategorySotSyncCategory(cat,cat.vehicleId||null);
    if(res.changed)changed++;
  }
  return {ok:true,linked,changed};
}

const VehicleCategorySOT={
  version:VEHICLE_CATEGORY_SOT_VERSION,
  findLinkedCatalog:vehicleCategorySotFindLinkedCatalog,
  syncCategory:vehicleCategorySotSyncCategory,
  ensureReady:vehicleCategorySotEnsureReady,
};
if(typeof window!=='undefined')window.VehicleCategorySOT=VehicleCategorySOT;
