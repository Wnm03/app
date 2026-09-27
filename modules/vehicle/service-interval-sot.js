/**
 * S2092 — GLOBAL SINGLE INTERVAL SOT.
 *
 * One active interval per vehicle + service component lives in
 * VehicleCarNotesSOT.serviceIntervals. Pedoman and AI are inputs; manual
 * selection is explicit. Historical intervalKmAtService remains a snapshot.
 * Legacy vehicle fields/category overrides are migration inputs only.
 */
(function(root){
  const VERSION='SERVICE-INTERVAL-SOT-S2092';
  const str=v=>String(v==null?'':v).trim();
  const num=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:null;};
  function vehicle(id){
    const d=typeof D!=='undefined'?D:root.D;
    return d&&Array.isArray(d.vehicles)?d.vehicles.find(v=>v&&str(v.id)===str(id))||null:null;
  }
  function inferComponent(category){
    if(!category)return null;
    if(typeof ServiceInputCatalog!=='undefined'&&ServiceInputCatalog){
      const cid=category.serviceComponentId||category.componentId;
      if(cid&&typeof ServiceInputCatalog.itemById==='function'){
        const h=ServiceInputCatalog.itemById(cid); if(h&&h.item)return h;
      }
      if(category.name&&typeof ServiceInputCatalog.infer==='function'){
        const h=ServiceInputCatalog.infer(category.name); if(h&&h.item)return h;
      }
    }
    return null;
  }
  function refFor(category,vehicleId){
    const c=category||{}, hit=inferComponent(c), item=hit&&hit.item, group=hit&&hit.group;
    return Object.assign({},c,{
      vehicleId:vehicleId||c.vehicleId||null,
      serviceComponentId:c.serviceComponentId||c.componentId||(item&&item.id)||null,
      masterCategoryId:c.masterCategoryId||(item&&item.masterCategoryId)||(group&&group.masterCategoryId)||null,
      name:c.name||(item&&item.name)||''
    });
  }
  function canonical(category,vehicleId,options){
    const c=refFor(category,vehicleId), vid=vehicleId||c.vehicleId;
    if(typeof VehicleServiceSOT!=='undefined'&&VehicleServiceSOT&&typeof VehicleServiceSOT.resolveReminderRule==='function'){
      const rule=VehicleServiceSOT.resolveReminderRule(c,vid,options||{});
      if(rule)return Object.assign({source:'pedoman'},rule,{vehicleId:vid||null});
    }
    // Isolated unit-test fallback only; production has VehicleServiceSOT.
    const o=options||{};
    const km=num(o.intervalKm)||num(c.intervalKm), mo=num(o.intervalBulan)||num(c.intervalBulan);
    return {vehicleId:vid||null,serviceComponentId:c.serviceComponentId||null,masterCategoryId:c.masterCategoryId||null,intervalKm:km,intervalBulan:mo,source:o.source||c.intervalSource||'pedoman'};
  }
  function resolveCanonicalIntervalDetailed(category,vehicleOverride){
    const o=vehicleOverride||{}, vid=o.vehicleId||category&&category.vehicleId||null;
    return canonical(category,vid,o);
  }
  function resolveCanonicalInterval(category,vehicleOverride){
    const r=resolveCanonicalIntervalDetailed(category,vehicleOverride);
    return {intervalKm:r&&r.intervalKm!=null?r.intervalKm:null,intervalBulan:r&&r.intervalBulan!=null?r.intervalBulan:null};
  }
  function active(category,vehicleId){return canonical(category,vehicleId,{});}
  function setManual(category,vehicleId,intervalKm,intervalBulan){
    const c=refFor(category,vehicleId), vid=vehicleId||c.vehicleId;
    if(!vid||typeof VehicleCarNotesSOT==='undefined'||!VehicleCarNotesSOT||typeof VehicleCarNotesSOT.setServiceInterval!=='function')return {ok:false,code:'vehicle-sot-unavailable'};
    return VehicleCarNotesSOT.setServiceInterval(vid,c,{intervalKm,intervalBulan,source:'manual'});
  }
  function setAiRecommendation(category,vehicleId,intervalKm,intervalBulan,meta){
    const c=refFor(category,vehicleId), vid=vehicleId||c.vehicleId;
    if(!vid||typeof VehicleCarNotesSOT==='undefined'||!VehicleCarNotesSOT||typeof VehicleCarNotesSOT.setServiceInterval!=='function')return {ok:false,code:'vehicle-sot-unavailable'};
    return VehicleCarNotesSOT.setServiceInterval(vid,c,{intervalKm,intervalBulan,source:'ai-rekomendasi',recommendation:meta||null});
  }
  function setGuideline(category,vehicleId,intervalKm,intervalBulan,meta){
    const c=refFor(category,vehicleId), vid=vehicleId||c.vehicleId;
    if(!vid||typeof VehicleCarNotesSOT==='undefined'||!VehicleCarNotesSOT||typeof VehicleCarNotesSOT.setServiceInterval!=='function')return {ok:false,code:'vehicle-sot-unavailable'};
    return VehicleCarNotesSOT.setServiceInterval(vid,c,{intervalKm,intervalBulan,source:'pedoman',guideline:meta||null});
  }
  function migrateVehicle(vehicleId,options){
    const v=vehicle(vehicleId), report={vehicleId:vehicleId||null,created:0,manual:0,guideline:0,removedLegacy:0,conflicts:[],skipped:0};
    if(!v||typeof VehicleCarNotesSOT==='undefined'||!VehicleCarNotesSOT)return report;
    const cats=(typeof D!=='undefined'&&Array.isArray(D.sparepartCats)?D.sparepartCats:[]).filter(c=>c&&(!c.vehicleId||str(c.vehicleId)===str(v.id)));
    const seen=new Set();
    const migrate=(cat,km,mo,source,meta)=>{
      const c=refFor(cat,v.id), key=c.serviceComponentId||c.id;
      if(!key||(!num(km)&&!num(mo)))return;
      if(seen.has(key))return;
      const currentStore=(VehicleCarNotesSOT.read(v.id)||{}).serviceIntervals||{};
      const cur=currentStore[key]||null;
      if(cur){seen.add(key); if(source==='manual')report.manual++; else report.skipped++; return;}
      const r=VehicleCarNotesSOT.setServiceInterval(v.id,c,{intervalKm:km,intervalBulan:mo,source, migration:'S2092', migrationMeta:meta||null});
      if(r&&r.ok){seen.add(key);report.created++;if(source==='manual')report.manual++;if(source==='pedoman')report.guideline++;}
    };
    // Existing explicit per-vehicle category overrides are the strongest legacy
    // user intent and therefore migrate as manual active SOT.
    const overrides=v.intervalOverrides&&typeof v.intervalOverrides==='object'?v.intervalOverrides:{};
    cats.forEach(c=>{const ov=num(overrides[c.id]);if(ov)migrate(c,ov,null,'manual',{from:'vehicle.intervalOverrides',categoryId:c.id});});
    // Vehicle-level fields are explicit legacy UI settings. Migrate them as
    // manual only when a more-specific per-category override has not already
    // created the component SOT. This preserves explicit user intent.
    if(num(v.serviceIntervalKm)){
      const hit=inferComponent({serviceComponentId:'oli-mesin',name:'Oli Mesin'});
      migrate(hit&&hit.item?hit.item:{serviceComponentId:'oli-mesin',name:'Oli Mesin'},num(v.serviceIntervalKm),null,'manual',{from:'vehicle.serviceIntervalKm'});
    }
    if(num(v.oliTransmisiIntervalKm)){
      const hit=inferComponent({name:'Oli Transmisi'});
      migrate(hit&&hit.item?hit.item:{name:'Oli Transmisi'},num(v.oliTransmisiIntervalKm),null,'manual',{from:'vehicle.oliTransmisiIntervalKm'});
    }
    // Category intervals are legacy defaults. Canonical ServiceInputCatalog
    // values are imported as Pedoman; legacy category values are used only
    // when no canonical guideline exists.
    cats.forEach(c=>{
      const hit=inferComponent(c), item=hit&&hit.item, masterKm=num(item&&item.intervalKm), masterMo=num(item&&item.intervalTimeMonths);
      const legacyKm=num(c.intervalKm),legacyMo=num(c.intervalBulan);
      if(masterKm||masterMo)migrate(c,masterKm||legacyKm,masterMo||legacyMo,'pedoman',{from:'ServiceInputCatalog',legacyCategoryId:c.id});
      else if(legacyKm||legacyMo)migrate(c,legacyKm,legacyMo,'pedoman',{from:'legacy-category',legacyCategoryId:c.id});
    });
    // Legacy containers are deleted only after their values have been migrated
    // into the new SOT. They are not runtime authorities anymore.
    if(options&&options.purgeLegacy){
      const store=(VehicleCarNotesSOT.read(v.id)||{}).serviceIntervals||{};
      const hasComponent=(ref)=>{
 const c=refFor(ref,v.id),k=c.serviceComponentId||c.id;
 if(k&&store[k])return true;
 const target=str(c.serviceComponentId||'').toLowerCase();
 const name=str(c.name||ref&&ref.name||'').toLowerCase();
 return Object.values(store).some(r=>{
   const x=r||{};
   return (target&&str(x.serviceComponentId).toLowerCase()===target) ||
     (name&&str(x.name||'').toLowerCase()===name);
 });
};
      // Never delete a legacy field unless its value has a canonical SOT target.
      if(Object.prototype.hasOwnProperty.call(v,'intervalOverrides')){
        const keys=Object.keys(v.intervalOverrides||{});
        const safe=keys.every(k=>hasComponent({id:k,serviceComponentId:k})||Object.keys(store).some(sk=>String(sk)===String(k)));
        if(safe){delete v.intervalOverrides;report.removedLegacy++;}
      }
      if(Object.prototype.hasOwnProperty.call(v,'serviceIntervalKm')&&hasComponent({serviceComponentId:'oli-mesin',name:'Oli Mesin'})){
        delete v.serviceIntervalKm;report.removedLegacy++;
      }
      if(Object.prototype.hasOwnProperty.call(v,'oliTransmisiIntervalKm')&&hasComponent({name:'Oli Transmisi'})){
        delete v.oliTransmisiIntervalKm;report.removedLegacy++;
      }
    }
    return report;
  }
  function _migrationCheckpoint(){
    // One-time, non-destructive safety checkpoint before SOT migration mutates
    // legacy fields. Prefer IndexedDB so large datasets are not constrained by
    // localStorage quota. Never overwrite an existing checkpoint.
    try{
      const idb=typeof IDBStore!=='undefined'&&IDBStore&&typeof IDBStore.get==='function'&&typeof IDBStore.set==='function'?IDBStore:null;
      const d=typeof D!=='undefined'?D:root.D;
      if(!idb||!d)return;
      const key='kw_v4_pre_sot_migration';
      idb.get(key).then(existing=>{
        if(existing)return;
        let snap;
        if(d.profile&&Object.prototype.hasOwnProperty.call(d.profile,'apiKey')){const pr={...d.profile};delete pr.apiKey;snap={...d,profile:pr};}
        else snap=d;
        return idb.set(key,JSON.stringify(snap));
      }).catch(()=>{});
    }catch(_e){}
  }
  function migrateAll(options){
    const d=typeof D!=='undefined'?D:root.D, out=[];
    _migrationCheckpoint();
    (d&&Array.isArray(d.vehicles)?d.vehicles:[]).forEach(v=>out.push(migrateVehicle(v.id,options||{})));
    const changed=out.reduce((n,r)=>n+Number(r&&r.created||0)+Number(r&&r.removedLegacy||0),0);
    return {version:VERSION,ok:true,changed,vehicles:out};
  }
  function auditActiveSot(vehicleId){
    if(typeof VehicleCarNotesSOT==='undefined'||!VehicleCarNotesSOT||typeof VehicleCarNotesSOT.auditServiceIntervals!=='function')return {ok:false,vehicleId:vehicleId||null,issues:[{code:'vehicle-sot-unavailable'}]};
    return VehicleCarNotesSOT.auditServiceIntervals(vehicleId);
  }
  function repairActiveSot(vehicleId){
    if(typeof VehicleCarNotesSOT==='undefined'||!VehicleCarNotesSOT||typeof VehicleCarNotesSOT.repairServiceIntervals!=='function')return {ok:false,vehicleId:vehicleId||null,changed:0,issues:[{code:'vehicle-sot-unavailable'}]};
    return VehicleCarNotesSOT.repairServiceIntervals(vehicleId);
  }
  function auditAllSot(){
    const d=typeof D!=='undefined'?D:root.D, vs=d&&Array.isArray(d.vehicles)?d.vehicles:[];
    return {version:VERSION,vehicles:vs.map(v=>auditActiveSot(v.id)),legacy:auditLegacy()};
  }
  function repairAllSot(){
    const d=typeof D!=='undefined'?D:root.D, vs=d&&Array.isArray(d.vehicles)?d.vehicles:[];
    return {version:VERSION,vehicles:vs.map(v=>repairActiveSot(v.id))};
  }
  function auditLegacy(){
    const d=typeof D!=='undefined'?D:root.D, out=[];
    (d&&Array.isArray(d.vehicles)?d.vehicles:[]).forEach(v=>{
      const legacy=[];
      if(v&&v.intervalOverrides&&Object.keys(v.intervalOverrides).length)legacy.push({field:'intervalOverrides',count:Object.keys(v.intervalOverrides).length});
      if(num(v&&v.serviceIntervalKm))legacy.push({field:'serviceIntervalKm',value:v.serviceIntervalKm});
      if(num(v&&v.oliTransmisiIntervalKm))legacy.push({field:'oliTransmisiIntervalKm',value:v.oliTransmisiIntervalKm});
      out.push({vehicleId:v&&v.id||null,legacy,serviceIntervals:typeof VehicleCarNotesSOT!=='undefined'&&VehicleCarNotesSOT?Object.keys((VehicleCarNotesSOT.read(v.id)||{}).serviceIntervals||{}):[]});
    });
    return {version:VERSION,vehicles:out,legacyCount:out.reduce((n,x)=>n+x.legacy.length,0)};
  }
  // Boot migration: convert legacy interval stores into the new SOT without
  // changing historical service snapshots. Legacy fields remain only when a
  // conflict/unmapped component prevents a safe conversion.
  try{
    if(typeof D!=='undefined'&&Array.isArray(D.vehicles)){
      const migration=migrateAll({purgeLegacy:true});
      const repair=repairAllSot();
      const repaired=Array.isArray(repair&&repair.vehicles)?repair.vehicles.reduce((n,r)=>n+Number(r&&r.changed||0),0):0;
      // Persist only when migration/repair actually changed the in-memory state.
      // This makes SOT boot migration durable without creating a needless startup write.
      if((migration&&migration.changed)||repaired){
        if(typeof save==='function')save({domain:'servis',financeMutation:false});
      }
    }
  }catch(_e){/* boot migration/repair is fail-safe; next load retries */}
  const api={version:VERSION,resolveCanonicalInterval,resolveCanonicalIntervalDetailed,active,setManual,setAiRecommendation,setGuideline,migrateVehicle,migrateAll,auditLegacy,auditActiveSot,repairActiveSot,auditAllSot,repairAllSot,refFor};
  root.ServiceIntervalSOT=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
