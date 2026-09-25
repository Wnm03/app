'use strict';
/**
 * S2015 (cumulative S2009-S2014) — Reminder vehicle scope + canonical
 * component projection + compatibility-safe dedupe.
 *
 * Persisted authority remains D.sparepartCats / VehicleCatalog. This file is
 * an additive projection/hardening layer: it centralizes catalog compatibility
 * (vehicle OR model), prevents ambiguous catalog-linked rows from being
 * persistently hidden, and keeps the existing history IDs intact.
 */
(function(global){
  const root=global||globalThis;
  const norm=v=>String(v==null?'':v).trim().toLowerCase();
  const compact=v=>norm(v).replace(/[\s\-_/.()]+/g,'');
  const same=(a,b)=>String(a)==String(b);

  const ALIAS_TO_COMPONENT=Object.freeze({
    'saringan udara':'filter-udara',
    'filter udara':'filter-udara',
    'drive belt (v-belt cvt)':'v-belt-cvt',
    'drive belt v-belt cvt':'v-belt-cvt',
    'v-belt cvt':'v-belt-cvt',
    'v belt cvt':'v-belt-cvt',
    'v-belt (cvt)':'v-belt-cvt',
    'cairan pendingin radiator (coolant)':'coolant',
    'cairan pendingin radiator':'coolant',
    'coolant':'coolant',
    'oli gardan/transmisi':'oli-gardan',
    'oli gardan/final drive':'oli-gardan',
    'oli gardan / final drive':'oli-gardan',
    'oli gardan':'oli-gardan',
    'filter oli':'filter-oli',
    'roller cvt':'roller-cvt',
    'slide piece cvt':'slide-piece-cvt',
    'boss pulley & drive face':'boss-pulley-drive-face',
    'kampas kopling ganda':'kampas-kopling-ganda'
  });

  function activeVehicle(vehicleId){
    const vehicles=root.D&&Array.isArray(root.D.vehicles)?root.D.vehicles:[];
    return vehicles.find(v=>v&&same(v.id,vehicleId))||null;
  }

  /**
   * S2015 single compatibility resolver.
   * - no compatibility lists = universal
   * - compatibleVehicleIds match OR compatibleModelIds match
   * - explicit lists with no match = foreign/incompatible
   * - model compatibility cannot be proven when the vehicle has no modelId,
   *   so an explicit model-only item is hidden rather than leaked.
   */
  function isCatalogItemCompatibleWithVehicle(item,vehicleId){
    if(!item||!vehicleId)return true;
    const vids=Array.isArray(item.compatibleVehicleIds)?item.compatibleVehicleIds.map(String).filter(Boolean):[];
    const mids=Array.isArray(item.compatibleModelIds)?item.compatibleModelIds.map(String).filter(Boolean):[];
    if(!vids.length&&!mids.length)return true;
    const vid=String(vehicleId);
    if(vids.some(id=>id===vid))return true;
    if(mids.length){
      const v=activeVehicle(vehicleId);
      const mid=v&&v.modelId!=null?String(v.modelId):'';
      if(mid&&mids.some(id=>id===mid))return true;
    }
    return false;
  }

  function catalogItemsAll(){
    if(!root.VehicleCatalog||typeof root.VehicleCatalog.getStore!=='function')return [];
    const store=root.VehicleCatalog.getStore();
    return store&&Array.isArray(store.items)?store.items:[];
  }

  function catalogItemsForVehicle(vehicleId){
    return catalogItemsAll().filter(it=>isCatalogItemCompatibleWithVehicle(it,vehicleId));
  }

  function catalogIdentityByName(name,preferred){
    if(preferred&&root.ServiceInputCatalog&&typeof root.ServiceInputCatalog.itemById==='function'){
      const hit=root.ServiceInputCatalog.itemById(preferred);
      if(hit&&hit.item)return {id:String(hit.item.id),item:hit.item,group:hit.group||null,confidence:'id'};
    }
    const q=norm(name);
    if(!q)return null;
    const alias=ALIAS_TO_COMPONENT[q]||null;
    if(alias&&root.ServiceInputCatalog&&typeof root.ServiceInputCatalog.itemById==='function'){
      const hit=root.ServiceInputCatalog.itemById(alias);
      if(hit&&hit.item)return {id:String(hit.item.id),item:hit.item,group:hit.group||null,confidence:'alias'};
    }
    if(root.ServiceInputCatalog&&typeof root.ServiceInputCatalog.infer==='function'){
      const hit=root.ServiceInputCatalog.infer(name);
      if(hit&&hit.item)return {id:String(hit.item.id),item:hit.item,group:hit.group||null,confidence:'infer'};
    }
    return null;
  }

  function componentId(cat){
    if(!cat)return null;
    const direct=cat.serviceComponentId||cat.componentId||cat.maintenanceRuleId;
    const hit=catalogIdentityByName(cat.name,direct);
    return hit?hit.id:(direct?String(direct):null);
  }

  function findCatalogForCategory(cat,vehicleId){
    if(!cat)return null;
    const items=catalogItemsForVehicle(vehicleId);
    const all=catalogItemsAll();
    if(cat.catalogPartId){
      const direct=items.find(it=>same(it.id,cat.catalogPartId));
      if(direct)return direct;
      // Explicitly foreign catalog links never leak into another vehicle.
      if(all.some(it=>same(it.id,cat.catalogPartId)))return null;
    }
    const code=compact(cat.code);
    if(code){
      const hits=items.filter(it=>compact(it.oemCode)===code&&code);
      if(hits.length===1)return hits[0];
    }
    const name=norm(cat.name);
    if(name){
      const hits=items.filter(it=>norm(it.partName)===name);
      if(hits.length===1)return hits[0];
    }
    return null;
  }

  function explicitCatalogVehicleMismatch(cat,vehicleId){
    if(!cat||!vehicleId||!cat.catalogPartId)return false;
    const item=catalogItemsAll().find(it=>same(it.id,cat.catalogPartId));
    return !!item&&!isCatalogItemCompatibleWithVehicle(item,vehicleId);
  }

  function categoryScopeKey(cat,cid){
    return cid+'|'+(cat&&cat.vehicleId?String(cat.vehicleId):'__universal__');
  }

  function canonicalNameScore(cat,meta){
    const n=norm(cat&&cat.name), cn=norm(meta&&meta.item&&meta.item.name);
    let s=0;
    if(cat&&cat.serviceComponentId===meta?.id)s+=100;
    if(n&&cn&&n===cn)s+=50;
    if(cat&&cat.catalogPartId)s+=10;
    if(cat&&cat.intervalKm>0)s+=3;
    if(cat&&cat.showInReminder!==false)s+=2;
    return s;
  }

  function persistedEquivalent(a,b){
    if(!a||!b)return false;
    if(componentId(a)!==componentId(b))return false;
    const as=a.vehicleId?String(a.vehicleId):'__universal__';
    const bs=b.vehicleId?String(b.vehicleId):'__universal__';
    if(as!==bs)return false;
    // Safe persisted dedupe only when there is no catalog link on either row,
    // or both rows point to the exact same catalog part. Different catalog
    // links may carry different vehicle/model compatibility and must remain
    // persisted independently; projection can still collapse them per vehicle.
    if(!a.catalogPartId&&!b.catalogPartId)return true;
    return !!a.catalogPartId&&!!b.catalogPartId&&same(a.catalogPartId,b.catalogPartId);
  }

  function projectCategories(categories,vehicleId){
    const list=Array.isArray(categories)?categories:[];
    const visible=[];
    for(const cat of list){
      if(!cat)continue;
      if(cat.vehicleId&&!same(cat.vehicleId,vehicleId))continue;
      if(explicitCatalogVehicleMismatch(cat,vehicleId))continue;
      const meta=catalogIdentityByName(cat.name,cat.serviceComponentId||cat.maintenanceRuleId||null);
      const cid=meta?meta.id:componentId(cat);
      const linked=findCatalogForCategory(cat,vehicleId);
      if(cat.vehicleId==null&&cat.catalogPartId&&!linked)continue;
      const out=Object.assign({},cat);
      if(cid&&!out.serviceComponentId)out.serviceComponentId=cid;
      if(meta&&meta.group&&!out.masterCategoryId)out.masterCategoryId=meta.group.masterCategoryId;
      out._s2015ComponentId=cid||null;
      out._s2014ComponentId=cid||null;
      out._s2015CatalogPart=linked||null;
      out._s2014CatalogPart=linked||null;
      visible.push(out);
    }

    // Vehicle-specific component wins over the universal representation for
    // this vehicle. This is projection-only; no persisted row is deleted.
    const scoped=new Set(visible.filter(c=>c.vehicleId).map(c=>c._s2015ComponentId).filter(Boolean));
    const narrowed=visible.filter(c=>!(c.vehicleId==null&&c._s2015ComponentId&&scoped.has(c._s2015ComponentId)));

    const winners=new Map();
    for(const c of narrowed){
      const cid=c._s2015ComponentId||('legacy:'+compact(c.id||c.name));
      const key=categoryScopeKey(c,cid);
      const meta=catalogIdentityByName(c.name,c.serviceComponentId||null);
      const score=(c.vehicleId?1000:0)+canonicalNameScore(c,meta)+(c._s2015CatalogPart?5:0);
      const prev=winners.get(key);
      if(!prev||score>prev._s2015Score)winners.set(key,Object.assign(c,{_s2015Score:score}));
    }
    return Array.from(winners.values()).map(c=>{
      const o=Object.assign({},c);delete o._s2015Score;return o;
    });
  }

  function cleanupPersistedDuplicates(){
    if(!root.D||!Array.isArray(root.D.sparepartCats))return {changed:0,hidden:0,restored:0};
    let changed=0,hidden=0,restored=0;
    const cats=root.D.sparepartCats;

    // Canonical backfill is safe and idempotent.
    for(const cat of cats){
      if(!cat)continue;
      const cid=componentId(cat);
      if(!cid)continue;
      const meta=catalogIdentityByName(cat.name,cat.serviceComponentId||cat.maintenanceRuleId||null);
      if(meta&&cat.serviceComponentId!==meta.id){cat.serviceComponentId=meta.id;changed++;}
      if(meta&&meta.group&&cat.masterCategoryId!==meta.group.masterCategoryId){cat.masterCategoryId=meta.group.masterCategoryId;changed++;}
    }

    const groups=new Map();
    for(const cat of cats){
      if(!cat)continue;
      const cid=componentId(cat);
      if(!cid)continue;
      const key=categoryScopeKey(cat,cid);
      const arr=groups.get(key)||[];arr.push(cat);groups.set(key,arr);
    }

    for(const arr of groups.values()){
      arr.sort((a,b)=>{
        const ma=catalogIdentityByName(a.name,a.serviceComponentId||null);
        const mb=catalogIdentityByName(b.name,b.serviceComponentId||null);
        const sa=(a.vehicleId?1000:0)+canonicalNameScore(a,ma)+(a.catalogPartId?5:0);
        const sb=(b.vehicleId?1000:0)+canonicalNameScore(b,mb)+(b.catalogPartId?5:0);
        return sb-sa;
      });
      const winner=arr[0];
      for(let i=1;i<arr.length;i++){
        const loser=arr[i];
        const safe=persistedEquivalent(winner,loser);
        if(safe){
          if(loser.showInReminder!==false||loser._s2014DuplicateOf!==componentId(loser)){
            loser.showInReminder=false;
            loser._s2014DuplicateOf=componentId(winner);
            loser._s2015DuplicateSafe=true;
            changed++;hidden++;
          }
        }else if(loser._s2014DuplicateOf){
          // S2014 could not know catalog compatibility. If equivalence is no
          // longer provable, undo only the marker/mutation that S2014 itself
          // introduced so a valid universal/foreign-compatible row can return.
          delete loser._s2014DuplicateOf;
          delete loser._s2015DuplicateSafe;
          if(loser.showInReminder===false){loser.showInReminder=true;changed++;restored++;}
        }
      }
    }
    return {changed,hidden,restored};
  }

  function catVisibleForVehicleS2015(cat,vehicleId){
    if(!cat)return false;
    if(cat._s2014DuplicateOf)return false;
    if(cat.vehicleId&&!same(cat.vehicleId,vehicleId))return false;
    if(explicitCatalogVehicleMismatch(cat,vehicleId))return false;
    if(cat.vehicleId==null&&cat.catalogPartId&&!findCatalogForCategory(cat,vehicleId))return false;
    return true;
  }

  function getReminderCategoriesForVehicleS2015(vehicleId){
    const cats=projectCategories(root.D&&root.D.sparepartCats,vehicleId);
    const projections=typeof root.getMaintenanceReminderProjection==='function'?root.getMaintenanceReminderProjection(vehicleId):[];
    const combined=cats.slice();
    for(const p of projections){
      const cid=componentId(p);
      if(cid&&combined.some(c=>componentId(c)===cid))continue;
      combined.push(p);
    }
    return combined;
  }

  function dedupeServiceCategoriesForVehicleS2015(categories,vehicleId){
    return projectCategories(categories,vehicleId);
  }

  function installVehicleCatalogRecommendation(){
    const vc=root.VehicleCatalog;
    if(!vc||typeof vc.recommend!=='function'||vc.recommend.__s2015Compatibility)return;
    const original=vc.recommend;
    const wrapped=async function(opts){
      opts=opts||{};
      const vehicleId=(opts.vehicleId!==undefined&&opts.vehicleId!==null&&opts.vehicleId!=='')?String(opts.vehicleId):'';
      const itemQuery=String(opts.item||'').trim().toLowerCase();
      const limit=(Number.isFinite(opts.limit)&&opts.limit>0)?opts.limit:5;
      if(!vehicleId&&!itemQuery)return [];
      const all=typeof vc.getAll==='function'?await vc.getAll():catalogItemsAll();
      return (Array.isArray(all)?all:[]).filter(it=>!it.isDraft&&isCatalogItemCompatibleWithVehicle(it,vehicleId)).map(it=>{
        let score=0;
        if(vehicleId){
          const vids=Array.isArray(it.compatibleVehicleIds)?it.compatibleVehicleIds.map(String):[];
          const v=activeVehicle(vehicleId);
          const mids=Array.isArray(it.compatibleModelIds)?it.compatibleModelIds.map(String):[];
          if(vids.includes(String(vehicleId)))score+=2;
          else if(v&&v.modelId!=null&&mids.includes(String(v.modelId)))score+=2;
        }
        if(itemQuery){
          const inName=String(it.partName||'').toLowerCase().includes(itemQuery);
          const inCat=String(it.category||'').toLowerCase().includes(itemQuery);
          if(inName||inCat)score+=1;
        }
        return {item:it,score};
      }).filter(row=>row.score>0).sort((a,b)=>b.score-a.score||String(a.item.partName||'').localeCompare(String(b.item.partName||''))).slice(0,limit).map(row=>row.item);
    };
    wrapped.__s2015Compatibility=true;
    wrapped.__s2015Original=original;
    vc.recommend=wrapped;
  }

  function installVehicleCatalogCompatibility(){
    const vc=root.VehicleCatalog;
    if(!vc)return;
    if(typeof vc.filterForVehicle==='function'&&!vc.filterForVehicle.__s2015Compatibility){
      const original=vc.filterForVehicle;
      const wrapped=function(items,vehicleId){
        const list=Array.isArray(items)?items:[];
        if(!vehicleId)return list.slice();
        return list.filter(it=>isCatalogItemCompatibleWithVehicle(it,vehicleId));
      };
      wrapped.__s2015Compatibility=true;
      wrapped.__s2015Original=original;
      vc.filterForVehicle=wrapped;
    }else if(typeof vc.filterForVehicle!=='function'){
      const wrapped=function(items,vehicleId){
        const list=Array.isArray(items)?items:[];
        if(!vehicleId)return list.slice();
        return list.filter(it=>isCatalogItemCompatibleWithVehicle(it,vehicleId));
      };
      wrapped.__s2015Compatibility=true;
      vc.filterForVehicle=wrapped;
    }
  }

  function installServiceCategoryResolver(){
    if(typeof root.resolveServisCatForVehicle!=='function'||root.resolveServisCatForVehicle.__s2015Canonical)return;
    const original=root.resolveServisCatForVehicle;
    const wrapped=function(name,vehicleId){
      const cats=root.D&&Array.isArray(root.D.sparepartCats)?root.D.sparepartCats:[];
      const cid=componentId({name});
      if(cid){
        const scoped=cats.find(c=>c&&componentId(c)===cid&&c.vehicleId&&same(c.vehicleId,vehicleId));
        if(scoped)return scoped;
        const universal=cats.find(c=>c&&componentId(c)===cid&&!c.vehicleId);
        if(universal)return universal;
      }
      return original(name,vehicleId);
    };
    wrapped.__s2015Canonical=true;
    wrapped.__s2015Original=original;
    root.resolveServisCatForVehicle=wrapped;
  }

  function installSparepartCompatibility(){
    const sp=root.Sparepart;
    if(!sp||typeof sp.isPartForVehicle!=='function'||sp.isPartForVehicle.__s2015Compatibility)return;
    const original=sp.isPartForVehicle;
    const wrapped=function(part,vehicleId){
      if(!vehicleId||!part)return true;
      if(part.vehicleId)return same(part.vehicleId,vehicleId);
      if(!part.catalogId)return true;
      if(root.VehicleCatalog&&typeof root.VehicleCatalog.isLoaded==='function'&&!root.VehicleCatalog.isLoaded())return original(part,vehicleId);
      const item=catalogItemsAll().find(it=>same(it.id,part.catalogId));
      if(!item)return true;
      return isCatalogItemCompatibleWithVehicle(item,vehicleId);
    };
    wrapped.__s2015Compatibility=true;
    wrapped.__s2015Original=original;
    sp.isPartForVehicle=wrapped;
  }

  function install(){
    installVehicleCatalogCompatibility();
    installVehicleCatalogRecommendation();
    installServiceCategoryResolver();
    installSparepartCompatibility();
    root.catVisibleForVehicle=catVisibleForVehicleS2015;
    root.serviceComponentIdForCategory=function(cat){return componentId(cat);};
    root.dedupeServiceCategoriesForVehicle=dedupeServiceCategoriesForVehicleS2015;
    // S2015 is compatibility-only: the current VehicleServiceSOT owns the
    // canonical reminder projection. Never overwrite its resolver.
    if(root.VehicleServiceSOT&&typeof root.VehicleServiceSOT.getReminderCategoriesForVehicle==='function'){
      root.getReminderCategoriesForVehicle=function(vehicleId){return root.VehicleServiceSOT.getReminderCategoriesForVehicle(vehicleId);};
    }else{
      root.getReminderCategoriesForVehicle=getReminderCategoriesForVehicleS2015;
    }
    root.ServiceReminderVehicleScopeS2014={
      version:'S2015-V1',
      resolveComponentId:componentId,
      isCatalogItemCompatibleWithVehicle,
      projectCategories,
      cleanupPersistedDuplicates,
      isVisible:catVisibleForVehicleS2015,
      getReminderCategoriesForVehicle:getReminderCategoriesForVehicleS2015,
      persistedEquivalent
    };
    root.ServiceReminderVehicleScopeS2015=root.ServiceReminderVehicleScopeS2014;
    const cleanup=cleanupPersistedDuplicates();
    if(cleanup.changed&&typeof root.save==='function')root.save();
    if(typeof root.Servis!=='undefined'&&root.Servis&&typeof root.Servis.renderReminder==='function'){
      try{root.Servis.renderReminder();}catch(e){console.error('[S2015] reminder refresh failed',e);}
    }
    if(typeof root.renderDashboardServisReminder==='function'){
      try{root.renderDashboardServisReminder();}catch(e){console.error('[S2015] dashboard reminder refresh failed',e);}
    }
    return cleanup;
  }

  root.installServiceReminderVehicleScopeS2014=install;
  root.installServiceReminderVehicleScopeS2015=install;
  if(typeof module!=='undefined'&&module.exports)module.exports={projectCategories,componentId,cleanupPersistedDuplicates,catVisibleForVehicleS2015,isCatalogItemCompatibleWithVehicle,persistedEquivalent};

  let tries=0;
  const boot=()=>{
    const vc=root.VehicleCatalog;
    const catalogReady=!vc||typeof vc.isLoaded!=='function'||vc.isLoaded();
    if(root.D&&Array.isArray(root.D.sparepartCats)&&root.ServiceInputCatalog&&catalogReady){install();return;}
    if(tries++<60)setTimeout(boot,50);
  };
  if(typeof document!=='undefined')boot();
  else if(root.D)install();
})(typeof window!=='undefined'?window:globalThis);
