/* S2451 — Restore/Import Category ↔ Component ↔ Car Notes reconciliation.
 * Restore is a boundary: canonical identity must be re-established before the
 * restored state is persisted. This module is deterministic and fail-closed;
 * it never guesses a category across vehicles.
 */
(function(g){'use strict';
  const VERSION='SERVICE-CATEGORY-RESTORE-RECONCILER-S2451';
  const str=v=>v==null?'':String(v).trim();
  const arr=v=>Array.isArray(v)?v:[];
  const canon=(row)=>{
    try{
      if(g.ServiceTaxonomySOT&&typeof g.ServiceTaxonomySOT.resolve==='function'){
        const r=g.ServiceTaxonomySOT.resolve({
          masterCategoryId:row&&row.masterCategoryId||null,
          serviceComponentId:row&&row.serviceComponentId||null,
          name:row&&row.name||row&&row.item||row&&row.componentName||''
        });
        if(r&&r.serviceComponentId)return {masterCategoryId:str(r.masterCategoryId)||null,serviceComponentId:str(r.serviceComponentId)};
      }
    }catch(_){/* deterministic fallback below */}
    try{
      if(g.ServiceInputCatalog&&typeof g.ServiceInputCatalog.infer==='function'){
        const r=g.ServiceInputCatalog.infer(row&&row.name||row&&row.item||row&&row.componentName||'');
        if(r&&r.item&&r.item.id)return {masterCategoryId:str(r.group&&r.group.masterCategoryId)||null,serviceComponentId:str(r.item.id)};
      }
    }catch(_){/* unresolved */}
    return null;
  };
  function reconcile(data,opts){
    const d=data||{}; const options=opts||{}; const vehicles=arr(d.vehicles);
    const byVid=new Map(vehicles.map(v=>[str(v&&v.id),v]).filter(([id])=>id));
    const issues=[], changed=[];
    const projections=new Map();
    const canonicalByVid=new Map();
    const canonicalize=(vid)=>{
      if(canonicalByVid.has(vid))return canonicalByVid.get(vid);
      let rows=[];
      try{
        if(g.VehicleCarNotesSOT&&typeof g.VehicleCarNotesSOT.getServiceCategories==='function')rows=arr(g.VehicleCarNotesSOT.getServiceCategories(vid));
      }catch(e){issues.push({code:'CANONICAL_SOT_READ_FAILED',vehicleId:vid,message:String(e&&e.message||e)});}
      rows=rows.map(x=>Object.assign({},x,{vehicleId:vid}));
      canonicalByVid.set(vid,rows);
      try{
        if(g.VehicleCarNotesSOT&&typeof g.VehicleCarNotesSOT.reconcileLegacyCategoryProjection==='function')g.VehicleCarNotesSOT.reconcileLegacyCategoryProjection(vid);
      }catch(e){issues.push({code:'LEGACY_PROJECTION_RECONCILE_FAILED',vehicleId:vid,message:String(e&&e.message||e)});}
      return rows;
    };
    vehicles.forEach(v=>canonicalize(str(v.id)));
    const cats=arr(d.sparepartCats);
    for(const c of cats){
      if(!c||!str(c.vehicleId))continue;
      const vid=str(c.vehicleId); if(!byVid.has(vid)){issues.push({code:'CATEGORY_UNKNOWN_VEHICLE',categoryId:str(c.id),vehicleId:vid});continue;}
      const canonRows=canonicalByVid.get(vid)||[];
      let hit=canonRows.find(x=>str(x.serviceComponentId)&&str(x.serviceComponentId)===str(c.serviceComponentId));
      if(!hit&&str(c.id))hit=canonRows.find(x=>str(x.id)===str(c.id));
      if(!hit){const r=canon(c);if(r)hit=canonRows.find(x=>str(x.serviceComponentId)===r.serviceComponentId)||r;}
      if(hit&&hit.serviceComponentId){
        if(str(c.masterCategoryId)!==str(hit.masterCategoryId)||str(c.serviceComponentId)!==str(hit.serviceComponentId)){
          c.masterCategoryId=hit.masterCategoryId||null;c.serviceComponentId=hit.serviceComponentId;changed.push({domain:'sparepartCats',id:str(c.id),vehicleId:vid});
        }
      }
    }
    // S2454: restore/import must be idempotent even when the payload contains
    // duplicate legacy projections for one canonical component. Keep exactly one
    // vehicle-scoped projection per serviceComponentId (or exact category id for
    // genuinely custom categories), remap all references to the survivor, and
    // only then persist. Never dedupe across vehicles.
    const categoryAlias=new Map();
    const removeCatIds=new Set();
    for(const vid of byVid.keys()){
      const local=cats.filter(c=>c&&str(c.vehicleId)===vid);
      const groups=new Map();
      local.forEach(c=>{
        const key=str(c.serviceComponentId)||('legacy:'+str(c.id));
        if(!groups.has(key))groups.set(key,[]);
        groups.get(key).push(c);
      });
      for(const rows of groups.values()){
        if(rows.length<2)continue;
        const canonicalRows=canonicalByVid.get(vid)||[];
        const preferred=rows.find(c=>canonicalRows.some(x=>str(x.id)===str(c.id)))||rows[0];
        for(const dup of rows){
          if(dup===preferred)continue;
          if(str(dup.id))categoryAlias.set(str(dup.id),str(preferred.id));
          removeCatIds.add(str(dup.id));
          changed.push({domain:'sparepartCats',id:str(dup.id),vehicleId:vid,field:'deduplicated',toId:str(preferred.id)});
        }
      }
    }
    if(removeCatIds.size){
      d.sparepartCats=cats.filter(c=>!removeCatIds.has(str(c&&c.id)));
      // `cats` intentionally remains the pre-dedupe lookup snapshot; references
      // are resolved through categoryAlias below, while subsequent projection
      // lookup uses the deduped D array.
    }
    const projectionFor=(vid,identity)=>{
      const rows=arr(d.sparepartCats).filter(c=>c&&str(c.vehicleId)===vid);
      return rows.find(c=>str(c.serviceComponentId)===str(identity))||null;
    };
    const reconcileRef=(row,domain,index)=>{
      if(!row||!str(row.vehicleId))return;
      const vid=str(row.vehicleId);
      if(!byVid.has(vid)){issues.push({code:'RECORD_UNKNOWN_VEHICLE',domain,index,id:str(row.id),vehicleId:vid});return;}
      const rows=canonicalByVid.get(vid)||[];
      let hit=null;
      if(str(row.serviceComponentId))hit=rows.find(c=>str(c.serviceComponentId)===str(row.serviceComponentId));
      if(!hit&&str(row.catId||row.categoryId)){
        let id=str(row.catId||row.categoryId);
        if(categoryAlias.has(id))id=categoryAlias.get(id);
        const local=arr(d.sparepartCats).find(c=>c&&str(c.id)===id&&str(c.vehicleId)===vid);
        const foreign=arr(d.sparepartCats).find(c=>c&&str(c.id)===id&&str(c.vehicleId)&&str(c.vehicleId)!==vid);
        if(local)hit=rows.find(c=>str(c.serviceComponentId)===str(local.serviceComponentId))||rows.find(c=>str(c.id)===id);
        else if(foreign){
          const foreignCanon=canon(foreign);
          if(foreignCanon)hit=rows.find(c=>str(c.serviceComponentId)===foreignCanon.serviceComponentId);
          if(!hit)issues.push({code:'CROSS_VEHICLE_CATEGORY_REFERENCE_UNRESOLVED',domain,index,id:str(row.id),vehicleId:vid,categoryId:id,foreignVehicleId:str(foreign.vehicleId)});
        }
      }
      if(!hit){const r=canon(row);if(r)hit=rows.find(c=>str(c.serviceComponentId)===r.serviceComponentId);}
      if(hit&&hit.serviceComponentId){
        const p=projectionFor(vid,hit.serviceComponentId);
        if(row.masterCategoryId!==hit.masterCategoryId){row.masterCategoryId=hit.masterCategoryId;changed.push({domain,index,id:str(row.id),field:'masterCategoryId'});}
        if(row.serviceComponentId!==hit.serviceComponentId){row.serviceComponentId=hit.serviceComponentId;changed.push({domain,index,id:str(row.id),field:'serviceComponentId'});}
        if(p){
          if(row.categoryId!=null&&String(row.categoryId)!==String(p.id)){row.categoryId=p.id;changed.push({domain,index,id:str(row.id),field:'categoryId'});}
          if(row.catId!=null&&String(row.catId)!==String(p.id)){row.catId=p.id;changed.push({domain,index,id:str(row.id),field:'catId'});}
        }
      }
    };
    arr(d.partsStock).forEach((r,i)=>reconcileRef(r,'partsStock',i));
    arr(d.servisLogs).forEach((r,i)=>reconcileRef(r,'servisLogs',i));
    if(issues.some(x=>x.code==='CROSS_VEHICLE_CATEGORY_REFERENCE_UNRESOLVED'||x.code==='CATEGORY_UNKNOWN_VEHICLE'||x.code==='RECORD_UNKNOWN_VEHICLE')){
      return {ok:false,version:VERSION,changed,issues,vehicles:vehicles.length};
    }
    return {ok:true,version:VERSION,changed,issues,vehicles:vehicles.length};
  }
  const api={VERSION,reconcile};
  g.ServiceCategoryRestoreReconcilerS2451=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
