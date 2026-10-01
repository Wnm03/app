/* S2166 — Runtime Projection SOT
 * Read-only facade: Servis, Komponen Pengingat and Riwayat must consume the
 * same canonical, vehicle-scoped projection. This is NOT a storage owner.
 */
(function(g){'use strict';
  const VERSION='SERVICE-RUNTIME-PROJECTION-SOT-S2166';
  const str=v=>v==null?'':String(v).trim();
  const arr=v=>Array.isArray(v)?v:[];
  function taxonomy(){return g.ServiceTaxonomySOT||null;}
  function activeId(explicit){
    if(str(explicit)) return str(explicit);
    const s=g.VehicleScopedSOT;
    if(s&&typeof s.currentId==='function') return str(s.currentId());
    return str(g.curVehicleId);
  }
  function canonical(row){
    const t=taxonomy();
    return t&&typeof t.canonicalTarget==='function'?t.canonicalTarget(row||{}):null;
  }
  function normalize(row, vehicleId){
    const r=Object.assign({},row||{});
    const c=canonical(r);
    if(c){r.masterCategoryId=c.masterCategoryId||null;r.serviceComponentId=c.serviceComponentId||null;r.componentName=c.componentName||r.componentName||null;r.categoryName=c.categoryName||r.categoryName||null;}
    r.vehicleId=str(r.vehicleId||vehicleId)||null;
    return r;
  }
  function inVehicle(row,vehicleId){return !!vehicleId&&str(row&&row.vehicleId)===str(vehicleId);}
  function uniqueByTarget(rows){
    const seen=new Set(), out=[];
    for(const r of arr(rows)){
      const c=canonical(r); const k=[str(r&&r.vehicleId),str(c&&c.masterCategoryId),str(c&&c.serviceComponentId)].join('|');
      if(!c||!c.serviceComponentId||seen.has(k)) continue;
      seen.add(k); out.push(normalize(r));
    }
    return out;
  }
  function serviceRows(data,vehicleId){
    const vid=activeId(vehicleId);
    return arr(data&&data.servisLogs).filter(r=>inVehicle(r,vid)).map(r=>normalize(r,vid));
  }
  function reminderCatalog(data,vehicleId){
    const vid=activeId(vehicleId), seen=new Set(), out=[];
    const source=typeof g.getReminderCategoriesForVehicle==='function'
      ? g.getReminderCategoriesForVehicle(vid)
      : arr(data&&data.sparepartCats).filter(c=>inVehicle(c,vid));
    for(const raw of arr(source)){
      if(!raw||!inVehicle(raw,vid)) continue;
      const c=canonical(raw);
      if(!c||!c.serviceComponentId) continue;
      const key=[vid,c.masterCategoryId,c.serviceComponentId].join('|');
      if(seen.has(key)) continue;
      seen.add(key);
      out.push(normalize(Object.assign({},raw,c),vid));
    }
    return out;
  }

  function reminderRows(data,vehicleId){
    const vid=activeId(vehicleId), seen=new Set(), out=[];
    arr(data&&data.serviceReminderPackages).filter(p=>inVehicle(p,vid)).forEach(p=>{
      const targets=[];
      arr(p.targets).forEach(t=>{const c=canonical(t); if(!c||!c.serviceComponentId)return; const k=[vid,c.masterCategoryId,c.serviceComponentId].join('|'); if(seen.has(k))return; seen.add(k); targets.push(normalize(Object.assign({},t,c),vid));});
      if(targets.length) out.push(Object.assign({},p,{vehicleId:vid,targets}));
    });
    return out;
  }
  function historyRows(data,vehicleId){
    const vid=activeId(vehicleId);
    return arr(data&&data.servisLogs).filter(r=>inVehicle(r,vid)).map(r=>normalize(r,vid));
  }
  function componentIndex(data,vehicleId){
    const map=new Map();
    serviceRows(data,vehicleId).concat(historyRows(data,vehicleId)).forEach(r=>{const c=canonical(r);if(c&&c.serviceComponentId)map.set(c.serviceComponentId,{masterCategoryId:c.masterCategoryId,serviceComponentId:c.serviceComponentId,componentName:c.componentName,categoryName:c.categoryName});});
    reminderRows(data,vehicleId).forEach(p=>p.targets.forEach(r=>{const c=canonical(r);if(c&&c.serviceComponentId)map.set(c.serviceComponentId,{masterCategoryId:c.masterCategoryId,serviceComponentId:c.serviceComponentId,componentName:c.componentName,categoryName:c.categoryName});}));
    return [...map.values()];
  }
  function snapshot(data,vehicleId){
    const vid=activeId(vehicleId);
    return {version:VERSION,vehicleId:vid||null,servis:serviceRows(data,vid),pengingat:reminderRows(data,vid),riwayat:historyRows(data,vid),components:componentIndex(data,vid)};
  }
  function audit(data,vehicleId){
    const s=snapshot(data,vehicleId), vid=s.vehicleId;
    const expected=[...new Set(arr(data&&data.servisLogs).filter(r=>inVehicle(r,vid)).map(r=>{const c=canonical(r);return c&&c.serviceComponentId?c.serviceComponentId:null}).filter(Boolean))];
    const actual=new Set(s.components.map(x=>x.serviceComponentId));
    const foreign=[...s.pengingat].filter(p=>str(p.vehicleId)!==vid);
    const invalidComponents=s.components.filter(c=>!c.serviceComponentId||!c.masterCategoryId);
    return {version:VERSION,vehicleId:vid||null,checks:{activeVehicleRequired:!!vid,reminderVehicleScoped:foreign.length===0,canonicalComponents:invalidComponents.length===0,serviceHistorySharedIdentity:expected.every(id=>actual.has(id))},counts:{servis:s.servis.length,pengingat:s.pengingat.length,riwayat:s.riwayat.length,components:s.components.length,expectedServiceComponents:expected.length},foreign,invalidComponents,pass:!!vid&&foreign.length===0&&invalidComponents.length===0&&expected.every(id=>actual.has(id))};
  }
  const api={VERSION,activeId,canonical,serviceRows,reminderCatalog,reminderRows,historyRows,componentIndex,snapshot,audit};
  g.ServiceRuntimeProjectionSOT=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
