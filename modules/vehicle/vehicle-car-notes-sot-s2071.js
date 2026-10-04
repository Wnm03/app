'use strict';
/**
 * S2071 — Car Notes canonical Vehicle SOT.
 *
 * One authoritative SOT per vehicle: D.vehicles[].sot.
 * Other SOT-named modules are adapters/auditors only; they must not own a
 * second persisted vehicle state. Global catalogs/taxonomy are reference
 * masters, not per-vehicle SOT.
 */
(function(root){
  const VERSION='CAR-NOTES-VEHICLE-SOT-V1';
  const str=v=>String(v==null?'':v).trim();
  const data=()=>typeof D!=='undefined'?D:root.D;
  const vehicles=()=>{const d=data();return d&&Array.isArray(d.vehicles)?d.vehicles:[];};
  const vehicle=id=>vehicles().find(v=>v&&str(v.id)===str(id))||null;
  const activeId=()=>{try{if(typeof curVehicleId!=='undefined')return str(curVehicleId);}catch(e){/* browser global may be unavailable in isolated evaluation. */} return str(root.curVehicleId||'');};
  function ensure(id){
    const v=vehicle(id||activeId());
    if(!v)return null;
    if(!v.sot||typeof v.sot!=='object'||Array.isArray(v.sot))v.sot={};
    v.sot.owner='VehicleCarNotesSOT';
    v.sot.version=VERSION;
    v.sot.vehicleId=String(v.id);
    v.sot.vehicleType=str(v.vehicleType||v.jenis||v.type)||null;
    v.sot.modelId=v.modelId||null;
    if(!Array.isArray(v.sot.serviceCategories)){
      const cats=(data()&&Array.isArray(data().sparepartCats))?data().sparepartCats:[];
      v.sot.serviceCategories=cats.filter(c=>c&&str(c.vehicleId)===String(v.id)).map(c=>normalizeCategory(c,v.id));
      v.sot.serviceCategoriesMigratedAt=new Date().toISOString();
    }
    return v.sot;
  }
  function read(id){const s=ensure(id);return s?JSON.parse(JSON.stringify(s)):null;}
  function mutate(id,mutator){
    const v=vehicle(id||activeId());
    if(!v)return {ok:false,code:'vehicle_not_found',vehicleId:str(id)||null};
    const s=ensure(v.id);
    const before=JSON.stringify(s);
    if(typeof mutator==='function')mutator(s,v);
    s.owner='VehicleCarNotesSOT';s.version=VERSION;s.vehicleId=String(v.id);s.vehicleType=str(v.vehicleType||v.jenis||v.type)||null;s.modelId=v.modelId||null;
    return {ok:true,changed:before!==JSON.stringify(s),vehicle:v,sot:s};
  }
  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(_){return v;}}
  // S2450: category/component identity is canonicalized at the Car Notes SOT
  // boundary. Older callers create D.sparepartCats from Finance, Service,
  // catalog sync and CSV paths; requiring every caller to remember the same
  // resolver had already produced observable drift. This enrichment is
  // additive: genuinely custom/unknown categories remain legacy-only.
  function canonicalizeCategoryIdentity(c){
    const out=c||{};
    let resolved=null;
    try{
      if(root.ServiceTaxonomySOT&&typeof root.ServiceTaxonomySOT.resolve==='function'){
        resolved=root.ServiceTaxonomySOT.resolve({
          masterCategoryId:out.masterCategoryId||null,
          serviceComponentId:out.serviceComponentId||null,
          name:out.name||out.item||out.componentName||''
        });
      }
    }catch(_){resolved=null;}
    if(!resolved){
      try{
        if(root.ServiceInputCatalog&&typeof root.ServiceInputCatalog.itemById==='function'&&out.serviceComponentId){
          const hit=root.ServiceInputCatalog.itemById(out.serviceComponentId);
          if(hit&&hit.item)resolved={masterCategoryId:hit.group&&hit.group.masterCategoryId||out.masterCategoryId||null,serviceComponentId:hit.item.id};
        }
        if(!resolved&&root.ServiceInputCatalog&&typeof root.ServiceInputCatalog.infer==='function'&&(out.name||out.item)){
          const hit=root.ServiceInputCatalog.infer(out.name||out.item);
          if(hit&&hit.item)resolved={masterCategoryId:hit.group&&hit.group.masterCategoryId||null,serviceComponentId:hit.item.id};
        }
      }catch(_){resolved=null;}
    }
    if(resolved&&resolved.serviceComponentId){
      out.masterCategoryId=String(resolved.masterCategoryId||out.masterCategoryId||'')||null;
      out.serviceComponentId=String(resolved.serviceComponentId);
    }else if(out.masterCategoryId){
      out.masterCategoryId=String(out.masterCategoryId);
    }
    return out;
  }
  function normalizeCategory(cat,vehicleId){
    const c=canonicalizeCategoryIdentity(clone(cat||{})),vid=str(vehicleId||c.vehicleId||activeId());
    if(vid)c.vehicleId=vid;
    if(c.intervalKm!=null)c.intervalKm=Number(c.intervalKm)||0;
    if(c.intervalBulan!=null)c.intervalBulan=Number(c.intervalBulan)||0;
    if(c.showInReminder==null)c.showInReminder=!!(c.intervalKm||c.intervalBulan);
    return c;
  }

  // S2091-r1: one authoritative service-interval SOT per vehicle/component.
  // The active interval may originate from a documented guideline (pedoman),
  // an explicitly accepted AI recommendation, or a manual edit. Recommendations
  // are inputs only; they never compete with the active interval once selected.
  function intervalKey(ref){
    const r=ref||{};
    return str(r.serviceComponentId||r.componentId)||str(r.id)||[str(r.masterCategoryId),str(r.name).toLowerCase()].filter(Boolean).join('::');
  }
  function normalizeInterval(rec,ref){
    const r=clone(rec||{}), k=intervalKey(ref);
    const km=Number(r.intervalKm), mo=Number(r.intervalBulan);
    const validSource=['pedoman','ai-rekomendasi','manual'];
    r.intervalKm=Number.isFinite(km)&&km>0?km:0;
    r.intervalBulan=Number.isFinite(mo)&&mo>0?mo:0;
    r.source=validSource.includes(str(r.source))?str(r.source):'manual';
    r.serviceComponentId=str(r.serviceComponentId||ref&&ref.serviceComponentId)||null;
    r.masterCategoryId=str(r.masterCategoryId||ref&&ref.masterCategoryId)||null;
    r.categoryId=str(r.categoryId||ref&&ref.id)||null;
    r.updatedAt=r.updatedAt||new Date().toISOString();
    return Object.assign({key:k},r);
  }
  function getServiceInterval(id,ref){
    const vid=str(id||activeId()), s=ensure(vid);
    if(!s)return null;
    if(!s.serviceIntervals||typeof s.serviceIntervals!=='object'||Array.isArray(s.serviceIntervals))s.serviceIntervals={};
    const key=intervalKey(ref); if(!key)return null;
    let rec=s.serviceIntervals[key];
    // S2092: legacy vehicle.intervalOverrides is migration-only and is never
    // consulted here. If no active record exists, seed exactly one record from
    // the canonical resolver inputs supplied by the caller (normally Pedoman).
    if(!rec){
      const km=Number(ref&&ref.intervalKm), mo=Number(ref&&ref.intervalBulan);
      if((Number.isFinite(km)&&km>0)||(Number.isFinite(mo)&&mo>0)){
        rec=normalizeInterval({intervalKm:km,intervalBulan:mo,source:(ref&&ref.intervalSource)||'pedoman'},ref);
      }
      if(rec)s.serviceIntervals[key]=rec;
    }
    return rec?clone(rec):null;
  }
  function setServiceInterval(id,ref,payload){
    const vid=str(id||ref&&ref.vehicleId||activeId()); if(!vid||!vehicle(vid))return {ok:false,code:'vehicle_not_found'};
    const rec=normalizeInterval(payload,ref), key=rec.key;
    if(!key||(rec.intervalKm<=0&&rec.intervalBulan<=0))return {ok:false,code:'interval_missing'};
    return mutate(vid,s=>{
      if(!s.serviceIntervals||typeof s.serviceIntervals!=='object'||Array.isArray(s.serviceIntervals))s.serviceIntervals={};
      const targetComponent=str(rec.serviceComponentId)||null;
      const targetIdentity=targetComponent||((str(rec.masterCategoryId)||'')+'::'+str(ref&&ref.name||'').toLowerCase())||key;
      Object.keys(s.serviceIntervals).forEach(existingKey=>{
        if(existingKey===key)return;
        const existing=normalizeInterval(s.serviceIntervals[existingKey],s.serviceIntervals[existingKey]||{});
        const existingIdentity=str(existing.serviceComponentId)||((str(existing.masterCategoryId)||'')+'::'+str(existing.name||'').toLowerCase())||existingKey;
        if(existingIdentity===targetIdentity)delete s.serviceIntervals[existingKey];
      });
      s.serviceIntervals[key]=rec;
    });
  }
  function setServiceIntervalSource(id,ref,source){
    const cur=getServiceInterval(id,ref); if(!cur)return {ok:false,code:'interval_not_found'};
    return setServiceInterval(id,ref,Object.assign({},cur,{source}));
  }

  function auditServiceIntervals(id){
    const vid=str(id||activeId()), s=ensure(vid), rows=[], byComponent=new Map(), issues=[];
    if(!s)return {ok:false,vehicleId:vid||null,issues:[{code:'VEHICLE_NOT_FOUND'}],rows:[]};
    const store=s.serviceIntervals&&typeof s.serviceIntervals==='object'&&!Array.isArray(s.serviceIntervals)?s.serviceIntervals:{};
    Object.keys(store).forEach(key=>{
      const r=normalizeInterval(store[key],store[key]||{}), component=str(r.serviceComponentId), identity=component||str(r.masterCategoryId)+'::'+str(r.name).toLowerCase()||key;
      const row={key,componentId:component||null,identity,intervalKm:r.intervalKm,intervalBulan:r.intervalBulan,source:r.source,updatedAt:r.updatedAt||null};
      rows.push(row);
      const arr=byComponent.get(identity)||[]; arr.push(row); byComponent.set(identity,arr);
    });
    byComponent.forEach((arr,identity)=>{
      if(arr.length<2)return;
      const values=new Set(arr.map(r=>`${r.intervalKm}|${r.intervalBulan}`));
      issues.push({code:'DUPLICATE_ACTIVE_INTERVAL',identity,count:arr.length,conflict:values.size>1,keys:arr.map(r=>r.key)});
    });
    return {ok:issues.length===0,vehicleId:vid,intervalCount:rows.length,duplicateCount:issues.length,issues,rows};
  }
  function repairServiceIntervals(id){
    const vid=str(id||activeId()), s=ensure(vid);
    if(!s)return {ok:false,vehicleId:vid||null,changed:0,issues:[{code:'VEHICLE_NOT_FOUND'}]};
    if(!s.serviceIntervals||typeof s.serviceIntervals!=='object'||Array.isArray(s.serviceIntervals))s.serviceIntervals={};
    const groups=new Map(), removed=[];
    Object.keys(s.serviceIntervals).forEach(key=>{
      const raw=s.serviceIntervals[key]||{}, r=normalizeInterval(raw,raw), identity=str(r.serviceComponentId)||((str(r.masterCategoryId)||'')+'::'+str(raw.name||'').toLowerCase())||key;
      const arr=groups.get(identity)||[]; arr.push({key,raw:r}); groups.set(identity,arr);
    });
    let changed=0;
    const rank={pedoman:1,'ai-rekomendasi':2,manual:3};
    groups.forEach((arr,identity)=>{
      if(arr.length===1){
        const only=arr[0], canonicalKey=only.raw.serviceComponentId||only.key;
        if(canonicalKey!==only.key){s.serviceIntervals[canonicalKey]=only.raw;delete s.serviceIntervals[only.key];changed++;}
        return;
      }
      arr.sort((a,b)=>{
        const pr=(rank[b.raw.source]||0)-(rank[a.raw.source]||0); if(pr)return pr;
        return String(b.raw.updatedAt||'').localeCompare(String(a.raw.updatedAt||''));
      });
      const winner=arr[0], canonicalKey=winner.raw.serviceComponentId||winner.key;
      s.serviceIntervals[canonicalKey]=winner.raw;
      arr.slice(1).forEach(x=>{if(x.key!==canonicalKey){delete s.serviceIntervals[x.key];removed.push(x.key);changed++;}});
      if(winner.key!==canonicalKey){delete s.serviceIntervals[winner.key];changed++;}
    });
    if(changed){s.intervalSotRevision=Number(s.intervalSotRevision||0)+1;s.intervalSotRepairedAt=new Date().toISOString();}
    return {ok:true,vehicleId:vid,changed,removedKeys:removed,intervalCount:Object.keys(s.serviceIntervals).length};
  }
  function auditServiceIntervals(id){
    const vid=str(id||activeId()), s=ensure(vid), rows=[], byComponent=new Map(), issues=[];
    if(!s)return {ok:false,vehicleId:vid||null,issues:[{code:'VEHICLE_NOT_FOUND'}],rows:[]};
    const store=s.serviceIntervals&&typeof s.serviceIntervals==='object'&&!Array.isArray(s.serviceIntervals)?s.serviceIntervals:{};
    Object.keys(store).forEach(key=>{const r=normalizeInterval(store[key],store[key]||{}), component=str(r.serviceComponentId), identity=component||(str(r.masterCategoryId)+'::'+str(r.name||'').toLowerCase())||key;const row={key,componentId:component||null,identity,intervalKm:r.intervalKm,intervalBulan:r.intervalBulan,source:r.source,updatedAt:r.updatedAt||null};rows.push(row);const arr=byComponent.get(identity)||[];arr.push(row);byComponent.set(identity,arr);});
    byComponent.forEach((arr,identity)=>{if(arr.length<2)return;const values=new Set(arr.map(r=>`${r.intervalKm}|${r.intervalBulan}`));issues.push({code:'DUPLICATE_ACTIVE_INTERVAL',identity,count:arr.length,conflict:values.size>1,keys:arr.map(r=>r.key)});});
    return {ok:issues.length===0,vehicleId:vid,intervalCount:rows.length,duplicateCount:issues.length,issues,rows};
  }
  function repairServiceIntervals(id){
    const vid=str(id||activeId()), s=ensure(vid); if(!s)return {ok:false,vehicleId:vid||null,changed:0,issues:[{code:'VEHICLE_NOT_FOUND'}]};
    if(!s.serviceIntervals||typeof s.serviceIntervals!=='object'||Array.isArray(s.serviceIntervals))s.serviceIntervals={};
    const groups=new Map(),removed=[];Object.keys(s.serviceIntervals).forEach(key=>{const raw=s.serviceIntervals[key]||{},r=normalizeInterval(raw,raw),identity=str(r.serviceComponentId)||((str(r.masterCategoryId)||'')+'::'+str(raw.name||'').toLowerCase())||key;const arr=groups.get(identity)||[];arr.push({key,raw:r});groups.set(identity,arr);});
    let changed=0;const rank={pedoman:1,'ai-rekomendasi':2,manual:3};
    groups.forEach(arr=>{arr.sort((a,b)=>{const pr=(rank[b.raw.source]||0)-(rank[a.raw.source]||0);if(pr)return pr;return String(b.raw.updatedAt||'').localeCompare(String(a.raw.updatedAt||''));});const winner=arr[0],canonicalKey=winner.raw.serviceComponentId||winner.key;s.serviceIntervals[canonicalKey]=winner.raw;arr.forEach(x=>{if(x.key!==canonicalKey){delete s.serviceIntervals[x.key];removed.push(x.key);changed++;}});});
    if(changed){s.intervalSotRevision=Number(s.intervalSotRevision||0)+1;s.intervalSotRepairedAt=new Date().toISOString();}
    return {ok:true,vehicleId:vid,changed,removedKeys:removed,intervalCount:Object.keys(s.serviceIntervals).length};
  }
  function removeServiceInterval(id,ref){
    const vid=str(id||activeId()), key=intervalKey(ref);
    if(!vid||!key||!vehicle(vid))return {ok:false,code:'vehicle_not_found'};
    return mutate(vid,s=>{if(s.serviceIntervals&&typeof s.serviceIntervals==='object')delete s.serviceIntervals[key];});
  }
  function categoryKey(cat){return str(cat&&cat.serviceComponentId)||str(cat&&cat.id)||[str(cat&&cat.name).toLowerCase()].filter(Boolean).join('::');}
  function getServiceCategories(id){
    const s=ensure(id);
    if(!s)return [];
    if(!Array.isArray(s.serviceCategories))s.serviceCategories=[];
    // S2450: the taxonomy module is loaded after this SOT during the bundle
    // bootstrap. Re-normalize existing persisted categories on read so rows
    // migrated before the canonical taxonomy was available cannot remain a
    // second, non-canonical identity indefinitely.
    const normalized=s.serviceCategories.map(c=>normalizeCategory(c,id));
    if(JSON.stringify(normalized)!==JSON.stringify(s.serviceCategories))s.serviceCategories=normalized;
    return clone(s.serviceCategories);
  }
  function upsertServiceCategory(id,cat){
    const vid=str(id||cat&&cat.vehicleId||activeId());
    if(!vid||!vehicle(vid))return {ok:false,code:'vehicle_not_found',vehicleId:vid||null};
    const c=normalizeCategory(cat,vid); if(!categoryKey(c))return {ok:false,code:'category_identity_missing'};
    return mutate(vid,s=>{
      if(!Array.isArray(s.serviceCategories))s.serviceCategories=[];
      const key=categoryKey(c),i=s.serviceCategories.findIndex(x=>categoryKey(x)===key);
      if(i>=0){const survivorId=s.serviceCategories[i].id; s.serviceCategories[i]=Object.assign({},s.serviceCategories[i],c,{id:survivorId,vehicleId:vid}); if(cat&&typeof cat==='object')cat.id=survivorId;}
      else s.serviceCategories.push(Object.assign({},c,{vehicleId:vid}));
    });
  }
  function removeServiceCategory(id,categoryId){
    const vid=str(id||activeId()); if(!vid||!vehicle(vid))return {ok:false,code:'vehicle_not_found',vehicleId:vid||null};
    const sid=str(categoryId);
    if(!sid)return {ok:false,code:'category_id_missing',vehicleId:vid};
    const current=(getServiceCategories(vid)||[]).find(c=>str(c&&c.id)===sid)||null;
    const result=mutate(vid,s=>{
      if(!Array.isArray(s.serviceCategories))s.serviceCategories=[];
      s.serviceCategories=s.serviceCategories.filter(c=>str(c&&c.id)!==sid);
    });
    if(!result.ok)return result;
    // S2453: deletion is a canonical mutation, so its compatibility projection
    // must disappear in the same command. Otherwise a later read/reconcile can
    // resurrect a deleted category as a ghost Sparepart/Reminder row. Match the
    // canonical id first, then the canonical component identity to clean legacy
    // duplicate projections without touching another vehicle.
    const d=data(); let projectionRemoved=0;
    if(d&&Array.isArray(d.sparepartCats)){
      const componentId=str(current&&current.serviceComponentId);
      const before=d.sparepartCats.length;
      d.sparepartCats=d.sparepartCats.filter(c=>{
        if(!c||str(c.vehicleId)!==vid)return true;
        if(str(c.id)===sid)return false;
        if(componentId&&str(c.serviceComponentId)===componentId)return false;
        return true;
      });
      projectionRemoved=before-d.sparepartCats.length;
    }
    return Object.assign(result,{projectionRemoved});
  }
  // S2452: all category edits must mutate canonical Car Notes SOT first.
  // Legacy D.sparepartCats is refreshed only as a compatibility projection.
  function updateServiceCategory(id,categoryId,patch){
    const vid=str(id||activeId()); if(!vid||!vehicle(vid))return {ok:false,code:'vehicle_not_found',vehicleId:vid||null};
    const current=(getServiceCategories(vid)||[]).find(c=>str(c&&c.id)===str(categoryId));
    if(!current)return {ok:false,code:'category_not_found',vehicleId:vid,categoryId:str(categoryId)};
    const next=normalizeCategory(Object.assign({},current,patch||{}, {id:current.id,vehicleId:vid}),vid);
    const result=upsertServiceCategory(vid,next);
    if(result.ok)reconcileLegacyCategoryProjection(vid);
    return result;
  }
  // S2170: explicit, idempotent compatibility projection. Canonical service
  // categories live in VehicleCarNotesSOT; D.sparepartCats is only a legacy
  // projection needed by older UI/stock consumers. This function is the only
  // place in the reminder/category read path allowed to materialize that
  // projection. It never invents canonical facts and never copies another
  // vehicle's row.
  function reconcileLegacyCategoryProjection(id){
    const vid=str(id||activeId());
    if(!vid||!vehicle(vid))return {ok:false,code:'vehicle_not_found',vehicleId:vid||null,changed:0};
    const d=data(); if(!d)return {ok:false,code:'data_unavailable',vehicleId:vid,changed:0};
    if(!Array.isArray(d.sparepartCats))d.sparepartCats=[];
    const s=ensure(vid);
    const canonical=Array.isArray(s&&s.serviceCategories)?s.serviceCategories:[];
    let changed=0;
    canonical.forEach(raw=>{
      const c=normalizeCategory(raw,vid);
      const key=categoryKey(c);
      if(!key)return;
      const idx=d.sparepartCats.findIndex(x=>x&&String(x.vehicleId||'')===vid&&categoryKey(x)===key);
      if(idx<0){d.sparepartCats.push(c);changed++;}
      else {
        const current=d.sparepartCats[idx];
        const merged=Object.assign({},current,c,{vehicleId:vid});
        if(JSON.stringify(current)!==JSON.stringify(merged)){d.sparepartCats[idx]=merged;changed++;}
      }
    });
    return {ok:true,vehicleId:vid,changed,count:canonical.length};
  }
  function syncLegacyCategoryProjection(cat,op){
    const c=normalizeCategory(cat); const vid=str(c.vehicleId);
    if(!vid||!vehicle(vid))return {ok:false,code:'vehicle_not_found'};
    // S2459: collapse pre-existing same-vehicle canonical duplicates before
    // accepting a new category projection. Component identity is the stable key.
    const _v=vehicle(vid), _s=ensure(vid);
    if(_s&&Array.isArray(_s.serviceCategories)){
      const seen=new Map(), remap=new Map(), deduped=[];
      _s.serviceCategories.forEach(raw=>{
        const n=normalizeCategory(raw,vid), key=categoryKey(n);
        if(!key){deduped.push(n);return;}
        const prior=seen.get(key);
        if(!prior){seen.set(key,n);deduped.push(n);}
        else if(str(prior.id)!==str(n.id)){remap.set(str(n.id),str(prior.id));}
      });
      if(remap.size){
        _s.serviceCategories=deduped;
        const d=data();
        const rewrite=row=>{if(!row||!row.categoryId)return;const to=remap.get(str(row.categoryId));if(to)row.categoryId=to;};
        if(d){(Array.isArray(d.partsStock)?d.partsStock:[]).forEach(row=>{if(row&&row.catId){const to=remap.get(str(row.catId));if(to)row.catId=to;}});(Array.isArray(d.servisLogs)?d.servisLogs:[]).forEach(rewrite);}
      }
    }
    // Propagate the canonicalized identity back to the caller object before it
    // writes D.sparepartCats. This closes the subtle split where Car Notes SOT
    // was canonical but the legacy projection still lacked component IDs.
    if(cat&&typeof cat==='object')Object.assign(cat,c);
    const r=upsertServiceCategory(vid,c);
    if(!r.ok)return Object.assign({projectionOnly:true,operation:op||'upsert'},r);
    // S2459: successful canonical write must materialize/update the legacy
    // projection; callers deliberately do not push a second row on success.
    const projection=reconcileLegacyCategoryProjection(vid);
    if(cat&&projection&&projection.ok){
      const rows=getServiceCategories(vid)||[], survivor=rows.find(x=>categoryKey(x)===categoryKey(c));
      if(survivor)Object.assign(cat,survivor);
    }
    return Object.assign({projectionOnly:true,operation:op||'upsert'},r,{projection});
  }
  function removeLegacyCategoryProjection(categoryId,vehicleId){return removeServiceCategory(vehicleId,categoryId);}
  function setServiceSchedules(id,rules,meta){return mutate(id,(s)=>{s.serviceSchedules=Array.isArray(rules)?clone(rules):[];s.serviceScheduleCount=s.serviceSchedules.length;s.serviceProvisionedAt=meta&&meta.at||new Date().toISOString();s.serviceProvisioningStatus=s.serviceSchedules.length?'ready':'no-rules';s.serviceReminderVersion=meta&&meta.version||s.serviceReminderVersion||null;});}
  function getServiceSchedules(id){const s=ensure(id);return s&&Array.isArray(s.serviceSchedules)?clone(s.serviceSchedules):[];}
  function setMaintenanceState(id,state){return mutate(id,s=>{s.maintenanceState=state?JSON.parse(JSON.stringify(state)):null;});}
  function getMaintenanceState(id){const s=ensure(id);return s&&s.maintenanceState?JSON.parse(JSON.stringify(s.maintenanceState)):null;}
  function setProvisioning(id,payload){return mutate(id,s=>{const keep=['status','version','profileId','identificationConfidence','identificationSource','categoryCount','categoryNames','taxonomy','componentCount','catalogPartCount','catalogPartIds','catalogModelId','vehicleDatabaseItems','provisionedAt','candidates','autoDetected','expectedRange'];keep.forEach(k=>{if(payload&&Object.prototype.hasOwnProperty.call(payload,k))s[k]=JSON.parse(JSON.stringify(payload[k]));});});}
  function audit(id){
    const v=vehicle(id||activeId()); if(!v)return {ok:false,code:'vehicle_not_found'};
    const s=(v.sot&&typeof v.sot==='object'&&!Array.isArray(v.sot))?v.sot:{}, issues=[];
    if(s.vehicleId!==String(v.id))issues.push({code:'SOT_VEHICLE_ID_MISMATCH'});
    const vt=str(v.vehicleType||v.jenis||v.type).toLowerCase(), st=str(s.vehicleType).toLowerCase();
    if(vt&&st&&vt!==st)issues.push({code:'SOT_VEHICLE_TYPE_MISMATCH',expected:vt,actual:st});
    if(s.serviceSchedules!=null&&!Array.isArray(s.serviceSchedules))issues.push({code:'SERVICE_SCHEDULES_NOT_ARRAY'});
    const seen=new Set();for(const r of Array.isArray(s.serviceSchedules)?s.serviceSchedules:[]){const key=str(r&&r.catalogPartId||r&&r.serviceComponentId||r&&r.id);if(key&&seen.has(key))issues.push({code:'DUPLICATE_SERVICE_RULE',id:key});if(key)seen.add(key);}
    return {ok:issues.length===0,version:VERSION,vehicleId:String(v.id),vehicleType:vt||null,issues};
  }
  function auditAll(){return vehicles().map(v=>audit(v.id));}
  function assertRecord(record,vehicleId){const vid=str(vehicleId||activeId());return !!(record&&vid&&str(record.vehicleId)===vid);}
  function auditFinanceHistoryReminder(id){
    const vid=str(id||activeId()), v=vehicle(vid), issues=[];
    if(!v)return {ok:false,vehicleId:vid||null,issues:[{code:'VEHICLE_NOT_FOUND'}]};
    const txs=(data()&&Array.isArray(data().transactions))?data().transactions:[];
    const logs=(data()&&Array.isArray(data().servisLogs))?data().servisLogs:[];
    const vehicleLogs=logs.filter(x=>x&&str(x.vehicleId)===vid);
    const vehicleTxs=txs.filter(x=>x&&str(x.vehicleId)===vid);
    const byLog=new Map(vehicleLogs.map(x=>[String(x.id),x]));
    const byTx=new Map(txs.filter(Boolean).map(x=>[String(x.id),x]));
    vehicleLogs.forEach(s=>{
      if(!s.txLinkId)return;
      const t=byTx.get(String(s.txLinkId));
      if(!t)issues.push({code:'SERVICE_MISSING_FINANCE',serviceId:s.id,transactionId:s.txLinkId});
      else{
        if(String(t.vehicleId||'')!==vid)issues.push({code:'SERVICE_FINANCE_CROSS_VEHICLE',serviceId:s.id,transactionId:t.id});
        if(String(t.servisLinkId||'')!==String(s.id))issues.push({code:'SERVICE_FINANCE_BACKLINK_MISMATCH',serviceId:s.id,transactionId:t.id});
      }
    });
    vehicleTxs.forEach(t=>{
      if(!t.servisLinkId)return;
      const s=byLog.get(String(t.servisLinkId));
      if(!s)issues.push({code:'FINANCE_MISSING_SERVICE',transactionId:t.id,serviceId:t.servisLinkId});
      else if(String(s.vehicleId||'')!==vid)issues.push({code:'FINANCE_SERVICE_CROSS_VEHICLE',transactionId:t.id,serviceId:s.id});
    });
    const reminderCats=typeof getReminderCategoriesForVehicle==='function'?getReminderCategoriesForVehicle(vid):[];
    reminderCats.forEach(c=>{
      if(c&&c.vehicleId!=null&&String(c.vehicleId)!==vid)issues.push({code:'REMINDER_CROSS_VEHICLE',categoryId:c.id,vehicleId:c.vehicleId});
      if(c&&c.serviceComponentId&&typeof ServiceInputCatalog!=='undefined'&&ServiceInputCatalog&&typeof ServiceInputCatalog.itemById==='function'&&!ServiceInputCatalog.itemById(c.serviceComponentId))issues.push({code:'REMINDER_COMPONENT_NOT_CANONICAL',categoryId:c.id,serviceComponentId:c.serviceComponentId});
    });
    return {ok:issues.length===0,vehicleId:vid,serviceCount:vehicleLogs.length,financeServiceCount:vehicleTxs.filter(x=>x.servisLinkId).length,reminderCount:reminderCats.length,issues};
  }
  function auditFullFlow(id){
    const vid=str(id||activeId()), v=vehicle(vid), issues=[];
    if(!v)return {ok:false,vehicleId:vid||null,issues:[{code:'VEHICLE_NOT_FOUND'}]};
    const d=data()||{}, txs=Array.isArray(d.transactions)?d.transactions:[], logs=Array.isArray(d.servisLogs)?d.servisLogs:[];
    const scopedLogs=logs.filter(x=>x&&str(x.vehicleId)===vid), scopedTx=txs.filter(x=>x&&x.servisLinkId);
    const txById=new Map(txs.filter(x=>x&&x.id).map(x=>[String(x.id),x]));
    const logById=new Map(logs.filter(x=>x&&x.id).map(x=>[String(x.id),x]));
    const seenSessions=new Map(), seenComponents=new Map(), seenReminder=new Set();
    scopedLogs.forEach(s=>{
      const sid=str(s.sessionId||s.serviceJobId||s.id), cid=str(s.serviceComponentId||(Array.isArray(s.checklist)&&s.checklist[0]&&s.checklist[0].serviceComponentId)||'');
      if(!str(s.vehicleId))issues.push({code:'SERVICE_WITHOUT_VEHICLE',serviceId:s.id});
      if(s.txLinkId){const t=txById.get(str(s.txLinkId));if(!t)issues.push({code:'SERVICE_MISSING_FINANCE',serviceId:s.id,transactionId:s.txLinkId});else if(str(t.vehicleId)!==vid)issues.push({code:'SERVICE_FINANCE_CROSS_VEHICLE',serviceId:s.id,transactionId:t.id});else if(str(t.servisLinkId)!==str(s.id))issues.push({code:'SERVICE_FINANCE_BACKLINK_MISMATCH',serviceId:s.id,transactionId:t.id});}
      if(cid){const key=vid+'::'+sid+'::'+cid;if(seenComponents.has(key))issues.push({code:'DUPLICATE_SESSION_COMPONENT',key});seenComponents.set(key,s.id);}
      if(s.intervalKmAtService!=null||s.nextDueKm!=null||s.nextDueDate!=null){if(s.intervalKmAtService!=null&&Number(s.intervalKmAtService)<0)issues.push({code:'INVALID_INTERVAL_KM',serviceId:s.id});if(s.km!=null&&s.nextDueKm!=null&&Number(s.nextDueKm)<Number(s.km))issues.push({code:'NEXT_DUE_BEFORE_SERVICE_KM',serviceId:s.id});}
      if(!seenSessions.has(sid))seenSessions.set(sid,[]);seenSessions.get(sid).push(s);
    });
    txs.forEach(t=>{if(!t||!t.servisLinkId)return;if(!t.vehicleId)issues.push({code:'FINANCE_SERVICE_WITHOUT_VEHICLE',transactionId:t.id});const s=logById.get(str(t.servisLinkId));if(!s)issues.push({code:'FINANCE_MISSING_SERVICE',transactionId:t.id,serviceId:t.servisLinkId});else if(str(s.vehicleId)!==str(t.vehicleId))issues.push({code:'FINANCE_SERVICE_CROSS_VEHICLE',transactionId:t.id,serviceId:s.id});});
    const cats=getServiceCategories(vid), catByComp=new Map();
    cats.forEach(c=>{const cid=str(c&&c.serviceComponentId);if(!cid)return;if(catByComp.has(cid)&&JSON.stringify(catByComp.get(cid))!==JSON.stringify(c))issues.push({code:'CONFLICTING_INTERVAL_OWNER',serviceComponentId:cid});else catByComp.set(cid,c);});
    const reminders=typeof getReminderCategoriesForVehicle==='function'?getReminderCategoriesForVehicle(vid):[];
    reminders.forEach(r=>{const key=vid+'::'+str(r&&r.serviceComponentId||r&&r.id);if(seenReminder.has(key))issues.push({code:'DUPLICATE_REMINDER',key});seenReminder.add(key);if(r&&r.vehicleId!=null&&str(r.vehicleId)!==vid)issues.push({code:'REMINDER_CROSS_VEHICLE',categoryId:r.id,vehicleId:r.vehicleId});});
    for(const [sid,rows] of seenSessions){const components=new Set(rows.flatMap(r=>Array.isArray(r.checklist)?r.checklist.map(c=>str(c&&c.serviceComponentId||c&&c.itemId)).filter(Boolean):[]));if(rows.length>1&&components.size<rows.length)issues.push({code:'SESSION_COMPONENT_COLLISION',sessionId:sid});}
    const base=auditFinanceHistoryReminder(vid);issues.push(...(base.issues||[]));
    return {ok:issues.length===0,vehicleId:vid,sessionCount:seenSessions.size,serviceCount:scopedLogs.length,financeServiceCount:scopedTx.filter(x=>str(x.vehicleId)===vid).length,reminderCount:reminders.length,issues};
  }
  const api={version:VERSION,activeId,vehicle,ensure,read,mutate,setServiceSchedules,getServiceSchedules,getServiceCategories,upsertServiceCategory,removeServiceCategory,updateServiceCategory,reconcileLegacyCategoryProjection,syncLegacyCategoryProjection,removeLegacyCategoryProjection,setMaintenanceState,getMaintenanceState,setProvisioning,getServiceInterval,setServiceInterval,setServiceIntervalSource,removeServiceInterval,auditServiceIntervals,repairServiceIntervals,audit,auditAll,assertRecord,auditFinanceHistoryReminder,auditFullFlow};
  root.VehicleCarNotesSOT=api;
  if(typeof window!=='undefined')window.VehicleCarNotesSOT=api;
  try{for(const v of vehicles())ensure(v.id);}catch(e){/* provisioning must remain fail-safe during bootstrap. */}
})(typeof globalThis!=='undefined'?globalThis:window);
