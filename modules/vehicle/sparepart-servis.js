function catVisibleForVehicle(cat,vehicleId){
if(!cat)return false;
if(!cat.vehicleId)return true;
if(!vehicleId)return true;
return cat.vehicleId===vehicleId;
}
function resolveCanonicalServiceComponent(name,preferredId){
  if(typeof ServiceInputCatalog==='undefined')return preferredId||null;
  if(preferredId&&typeof ServiceInputCatalog.itemById==='function'){
    const direct=ServiceInputCatalog.itemById(preferredId);
    if(direct&&direct.item)return direct.item.id;
  }
  const q=String(name||'').trim().toLowerCase();
  if(!q)return null;
  const exact=[];
  for(const g of ServiceInputCatalog.groups()||[]){
    for(const it of g.items||[]){
      if(String(it.name||'').trim().toLowerCase()===q)exact.push(it.id);
    }
  }
  return exact.length===1?exact[0]:null;
}
function serviceComponentIdForCategory(cat){
  if(!cat)return null;
  return resolveCanonicalServiceComponent(cat.name,cat.serviceComponentId||null);
}
function getVehicleServiceCategorySOT(cat,vehicleId){
  if(!cat||vehicleId==null||String(cat.vehicleId)!==String(vehicleId))return null;
  let item=null,group=null;
  if(typeof ServiceInputCatalog!=='undefined'&&ServiceInputCatalog){
    if(cat.serviceComponentId&&typeof ServiceInputCatalog.itemById==='function'){
      const hit=ServiceInputCatalog.itemById(cat.serviceComponentId);
      if(hit&&hit.item){item=hit.item;group=hit.group||null;}
    }
    if(!item&&typeof ServiceInputCatalog.infer==='function'){
      const hit=ServiceInputCatalog.infer(cat.name||'');
      if(hit&&hit.item){item=hit.item;group=hit.group||null;}
    }
  }
  if(!item)return null;
  if(!group&&typeof ServiceInputCatalog.groupById==='function')group=ServiceInputCatalog.groupById(item.masterCategoryId||cat.masterCategoryId)||null;
  const rule=(typeof VehicleServiceSOT!=='undefined'&&VehicleServiceSOT&&typeof VehicleServiceSOT.resolveReminderRule==='function')
    ?VehicleServiceSOT.resolveReminderRule(cat,vehicleId):null;
  const intervalKm=rule&&rule.intervalKm!=null?Number(rule.intervalKm):((typeof getEffectiveIntervalKm==='function')?getEffectiveIntervalKm(vehicleId,cat):Number(cat.intervalKm)||null);
  const intervalBulan=rule&&rule.intervalBulan!=null?Number(rule.intervalBulan):((typeof getEffectiveIntervalBulan==='function')?getEffectiveIntervalBulan(cat,vehicleId):Number(cat.intervalBulan)||null);
  return {
    categoryId:cat.id,
    vehicleId,
    masterCategoryId:(group&&group.masterCategoryId)||item.masterCategoryId||cat.masterCategoryId||null,
    categoryName:(group&&group.group)||null,
    serviceComponentId:item.id,
    componentName:item.name,
    intervalKm:Number.isFinite(intervalKm)&&intervalKm>0?intervalKm:null,
    intervalBulan:Number.isFinite(intervalBulan)&&intervalBulan>0?intervalBulan:null,
    showInReminder:cat.showInReminder!==false,
    code:cat.code||codeFromName(item.name),
    source:'ServiceInputCatalog + VehicleServiceSOT'
  };
}
function getCanonicalVehicleReminderCategories(vehicleId){
  const vid=String(vehicleId||'');
  if(!vid||typeof VehicleCarNotesSOT==='undefined'||!VehicleCarNotesSOT)return [];
  let cats=typeof VehicleCarNotesSOT.getServiceCategories==='function'?VehicleCarNotesSOT.getServiceCategories(vid):[];
  if(!cats.length&&typeof VehicleCarNotesSOT.upsertServiceCategory==='function'){
    (D.sparepartCats||[]).filter(c=>c&&String(c.vehicleId||'')===vid).forEach(c=>{try{VehicleCarNotesSOT.upsertServiceCategory(vid,c);}catch(_e){/* legacy projection failure is isolated; canonical SOT remains authoritative. */}});
    cats=VehicleCarNotesSOT.getServiceCategories(vid);
  }
  return cats;
}
function dedupeServiceCategoriesForVehicle(categories,vehicleId){
  if(typeof ServiceCategorySOTReconciliationS2007!=='undefined'&&ServiceCategorySOTReconciliationS2007&&typeof ServiceCategorySOTReconciliationS2007.canonicalReminderProjection==='function'){
    return ServiceCategorySOTReconciliationS2007.canonicalReminderProjection(categories,vehicleId);
  }
  const out=[],seen=new Set();
  const list=(categories||[]).slice().sort((a,b)=>{
    const av=a&&a.vehicleId===vehicleId?0:1, bv=b&&b.vehicleId===vehicleId?0:1;
    return av-bv;
  });
  list.forEach(c=>{
    if(!c)return;
    const cid=serviceComponentIdForCategory(c);
    const key=cid||('legacy:'+String(c.id||c.name||'').toLowerCase());
    if(seen.has(key))return;
    seen.add(key); out.push(c);
  });
  return out;
}
function resolveServisCatForVehicle(name,vehicleId){
const n=(name||'').trim().toLowerCase();
if(!n)return null;
const cats=(D.sparepartCats||[]).filter(c=>c&&c.name&&c.name.toLowerCase()===n);
if(!cats.length)return null;
return cats.find(c=>c.vehicleId&&c.vehicleId===vehicleId)||cats.find(c=>!c.vehicleId)||null;
}
function canonicalServisCategoryId(item,vehicleId,preferredId){
const cats=D.sparepartCats||[];
if(preferredId){
const preferred=cats.find(c=>c&&c.id===preferredId);
if(preferred&&(!preferred.vehicleId||preferred.vehicleId===vehicleId))return preferred.id;
}
const matched=resolveServisCatForVehicle(item,vehicleId);
return matched?matched.id:null;
}
function normalizeLegacyServiceLogs(){
const logs=Array.isArray(D.servisLogs)?D.servisLogs:[];
let changed=0;
logs.forEach(s=>{
  if(!s||!s.id)return;
  const vehicleId=s.vehicleId||s.vehicle||null;
  const item=s.item||s.name||null;
  if(s.vehicleId==null&&vehicleId!=null){s.vehicleId=vehicleId;changed++;}
  if(s.item==null&&item!=null){s.item=item;changed++;}
  const catId=canonicalServisCategoryId(s.item||'',vehicleId,s.categoryId||s.catId||null);
  const cat=catId?(D.sparepartCats||[]).find(c=>c&&c.id===catId):null;
  if(s.categoryId==null&&catId){s.categoryId=catId;changed++;}
  if(s.masterCategoryId==null&&(s.categoryId&&cat?.masterCategoryId)){s.masterCategoryId=cat.masterCategoryId;changed++;}
  if(s.serviceComponentId==null&&(cat?.serviceComponentId||cat?.maintenanceRuleId)){
    s.serviceComponentId=cat.serviceComponentId||cat.maintenanceRuleId;changed++;
  }
  if(s.actionType===undefined){s.actionType=null;changed++;}
  const hasSnapshot=s.nextDueAxis!=null || s.nextDueKm!=null || s.nextDueDate!=null || s.intervalKmAtService!=null || s.intervalBulanAtService!=null;
  if(!hasSnapshot&&cat&&typeof buildServiceNextDueSnapshot==='function'){
    const snap=buildServiceNextDueSnapshot({vehicleId,cat,serviceKm:s.km,serviceDate:s.date||s.tanggal,actionType:s.actionType||null});
    s.intervalKmAtService=snap.intervalKmAtService??null;
    s.intervalBulanAtService=snap.intervalBulanAtService??null;
    s.nextDueKm=snap.nextDueKm??null;
    s.nextDueDate=snap.nextDueDate??null;
    s.nextDueAxis=snap.nextDueAxis||'none';
    changed++;
  } else {
    if(s.intervalKmAtService===undefined)s.intervalKmAtService=null,changed++;
    if(s.intervalBulanAtService===undefined)s.intervalBulanAtService=null,changed++;
    if(s.nextDueKm===undefined)s.nextDueKm=null,changed++;
    if(s.nextDueDate===undefined)s.nextDueDate=null,changed++;
    if(s.nextDueAxis===undefined)s.nextDueAxis='none',changed++;
  }
  if(s.idempotencyKey==null){
    s.idempotencyKey=s.txLinkId?`tx:${s.txLinkId}`:`legacy-service:${s.id}`;
    changed++;
  }
});
return changed;
}
const GENERIC_RECOMMEND_NAMES={
motor:['Oli Mesin','Filter Oli','Oli Gardan','Busi','Filter Udara','Kampas Rem Depan','Kampas Rem Belakang','V-Belt CVT','Roller CVT','Minyak Rem','Aki','Ban Depan'],
mobil:['Oli Mesin','Filter Oli','Oli Transmisi','Busi','Filter Udara','Filter AC','Kampas Rem Depan','Kampas Rem Belakang','Minyak Rem','Aki','Coolant','Timing Belt','Ban Depan'],
listrik:['Kampas Rem Depan','Kampas Rem Belakang','Minyak Rem','Aki','Ban Depan'],
};
function _genericGroupByName(){
if(typeof DatabaseAPI!=='undefined'&&DatabaseAPI.master&&typeof DatabaseAPI.master.getGenericGroupByName==='function'){
return DatabaseAPI.master.getGenericGroupByName();
}
return GENERIC_GROUP_BY_NAME;
}
function _genericRecommendNames(){
if(typeof DatabaseAPI!=='undefined'&&DatabaseAPI.master&&typeof DatabaseAPI.master.getGenericRecommendNames==='function'){
return DatabaseAPI.master.getGenericRecommendNames();
}
return GENERIC_RECOMMEND_NAMES;
}
const GENERIC_GROUP_BY_NAME={
'oli mesin':{group:'Perawatan Berkala',icon:'🛠️'},
'filter oli':{group:'Perawatan Berkala',icon:'🛠️'},
'oli gardan':{group:'Perawatan Berkala',icon:'🛠️'},
'oli transmisi':{group:'Perawatan Berkala',icon:'🛠️'},
'busi':{group:'Perawatan Berkala',icon:'🛠️'},
'filter udara':{group:'Perawatan Berkala',icon:'🛠️'},
'filter ac':{group:'Perawatan Berkala',icon:'🛠️'},
'v-belt cvt':{group:'Perawatan Berkala',icon:'🛠️'},
'minyak rem':{group:'Perawatan Berkala',icon:'🛠️'},
'coolant':{group:'Perawatan Berkala',icon:'🛠️'},
'roller cvt':{group:'Mesin — Kopling/Pulley/Final Drive',icon:'🔗'},
'timing belt':{group:'Mesin — Cylinder Head/Valve',icon:'⚙️'},
'kampas rem':{group:'Sistem Rem',icon:'🛑'},
'kampas rem depan':{group:'Sistem Pengereman',icon:'🛑'},
'kampas rem belakang':{group:'Sistem Pengereman',icon:'🛑'},
'cakram rem depan':{group:'Sistem Pengereman',icon:'🛑'},
'kaliper rem depan':{group:'Sistem Pengereman',icon:'🛑'},
'master rem & reservoir':{group:'Sistem Pengereman',icon:'🛑'},
'tromol rem belakang':{group:'Sistem Pengereman',icon:'🛑'},
'aki':{group:'Kelistrikan & Panel',icon:'🔌'},
'ban depan':{group:'Roda Depan/Suspensi/Kemudi',icon:'🛞'},
};
function _withMasterCategory(result,cat){
let mc=null;
if(typeof ServiceTaxonomySOT!=='undefined'&&ServiceTaxonomySOT&&typeof ServiceTaxonomySOT.resolve==='function'){
  const hit=ServiceTaxonomySOT.resolve({
    masterCategoryId:cat&&cat.masterCategoryId,
    serviceComponentId:cat&&cat.serviceComponentId,
    name:cat&&cat.name
  });
  if(hit&&hit.category)mc={id:hit.category.id,name:hit.category.name,icon:hit.category.icon};
}
if(!mc&&typeof DatabaseAPI!=='undefined'&&DatabaseAPI.masterCategory){
  if(cat&&cat.masterCategoryId&&typeof DatabaseAPI.masterCategory.getAll==='function'){
    mc=DatabaseAPI.masterCategory.getAll().find(c=>c&&c.id===cat.masterCategoryId)||null;
  }
  if(!mc&&typeof DatabaseAPI.masterCategory.classifyItemName==='function'){
    mc=DatabaseAPI.masterCategory.classifyItemName(cat&&cat.name);
  }
}
result.masterCategoryId=mc?mc.id:null;
result.masterCategoryName=mc?mc.name:null;
result.masterCategoryIcon=mc?mc.icon:null;
return result;
}
const UNCATEGORIZED_FILTER_ID='__uncategorized__';
function resolveCatGroup(cat,vehicleId){
if(!cat)return _withMasterCategory({group:'Lainnya',icon:'📦'},cat);
if(typeof ServiceTaxonomySOT!=='undefined'&&ServiceTaxonomySOT&&typeof ServiceTaxonomySOT.resolve==='function'){
  const canonical=ServiceTaxonomySOT.resolve({masterCategoryId:cat.masterCategoryId,serviceComponentId:cat.serviceComponentId,name:cat.name});
  if(canonical&&canonical.category){
    return _withMasterCategory({group:canonical.category.name,icon:canonical.category.icon||'📦',canonical:true,serviceComponentId:canonical.serviceComponentId||null},cat);
  }
}
if(cat.group)return _withMasterCategory({group:cat.group,icon:cat.groupIcon||'📦'},cat);
const n=(cat.name||'').trim().toLowerCase();
if(n&&vehicleId&&typeof findTorsiDb==='function'&&typeof D!=='undefined'&&D.vehicles){
const veh=D.vehicles.find(v=>v.id===vehicleId);
const db=veh?findTorsiDb(veh.name,veh.modelId):null;
if(db&&Array.isArray(db.cats)){
for(const catGroup of db.cats){
const hit=(catGroup.items||[]).some(it=>{
const itn=(it.name||'').trim().toLowerCase();
if(!itn)return false;
return itn===n||itn.includes(n)||(n.includes(itn)&&itn.length>=4);
});
if(hit)return _withMasterCategory({group:catGroup.cat,icon:catGroup.icon||'📦'},cat);
}
}
}
const gmap=_genericGroupByName();
if(n&&gmap[n])return _withMasterCategory(Object.assign({},gmap[n]),cat);
return _withMasterCategory({group:'Lainnya',icon:'📦'},cat);
}
function collectKnownGroups(){
const map=new Map();
const add=(id,name,icon)=>{
  const key=String(id||name||'').trim();
  const label=String(name||'').trim();
  if(!key||!label||map.has(key))return;
  map.set(key,{group:label,icon:icon||'📦'});
};
if(typeof ServiceTaxonomySOT!=='undefined'&&ServiceTaxonomySOT&&typeof ServiceTaxonomySOT.categories==='function'){
  (ServiceTaxonomySOT.categories()||[]).forEach(c=>{if(c)add(c.id,c.name,c.icon);});
}
if(!map.size&&typeof ServiceInputCatalog!=='undefined'&&ServiceInputCatalog){
  const groupsApi=ServiceInputCatalog['groups'];
  if(typeof groupsApi==='function')(groupsApi()||[]).forEach(g=>{if(g)add(g.masterCategoryId,g.group,g.icon);});
}
return Array.from(map.values());
}
function iconForGroupName(name){
if(!name)return'📦';
const hit=collectKnownGroups().find(g=>g.group===name);
return hit?hit.icon:'📦';
}
function servisLogMatchesCat(s,cat){
  if(typeof ServiceHistoryReminderReconciliationSOT!=='undefined'&&ServiceHistoryReminderReconciliationSOT&&typeof ServiceHistoryReminderReconciliationSOT.match==='function'){
    return ServiceHistoryReminderReconciliationSOT.match(s,cat,{vehicleId:s&&s.vehicleId}).ok;
  }
  const catComponent=serviceComponentIdForCategory(cat);
  if(catComponent&&s&&s.serviceComponentId&&String(s.serviceComponentId)===String(catComponent)) return true;
  if(s.categoryId){
    const linked=D.sparepartCats.find(c=>c&&c.id===s.categoryId);
    if(!linked)return false;
    if(linked.vehicleId&&linked.vehicleId!==s.vehicleId)return false;
    const linkedComponent=serviceComponentIdForCategory(linked);
    if(catComponent&&linkedComponent) return linkedComponent===catComponent;
    return s.categoryId===cat.id;
  }
  const cn=cat.name.toLowerCase();
  const item=(s.item||'').toLowerCase().trim();
  if(!item)return false;
  if(item===cn) return true;
  if(item.includes(cn)) return true;
  if(cn.includes(item)&&item.length>=4){
    const ambiguous=D.sparepartCats.some(c=>c.id!==cat.id&&c.name.toLowerCase().includes(item));
    if(!ambiguous) return true;
  }
  return false;
}
function normalizeMaintenanceRuleKey(v){
return String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function vehicleMatchesMaintenanceRuleSet(vehicleId){
const veh=(D.vehicles||[]).find(v=>v&&v.id===vehicleId);
if(!veh)return false;
if(typeof findTorsiDb==='function'){
const db=findTorsiDb(veh.name,veh.modelId);
if(db&&db.id==='vario-125')return true;
}
const hay=(String(veh.name||'')+' '+String(veh.modelId||'')).toLowerCase();
return /vario\s*125|kzr/.test(hay);
}
function overlayPersistedMaintenanceIntervals(base,cat,componentId,componentName){
 const r=Object.assign({},base||{}),km=Number.isFinite(Number(cat&&cat.intervalKm))&&Number(cat.intervalKm)>0?Number(cat.intervalKm):null,mo=Number.isFinite(Number(cat&&cat.intervalBulan))&&Number(cat.intervalBulan)>0?Number(cat.intervalBulan):null,rep=Number(r.replaceKm)>0||Number(r.replaceMonths)>0||Number(r.replaceDays)>0,ins=Number(r.inspectKm)>0||Number(r.inspectMonths)>0||Number(r.inspectDays)>0;
 if(rep){if(km!==null)r.replaceKm=km;if(mo!==null)r.replaceMonths=mo;}else if(ins){if(km!==null)r.inspectKm=km;if(mo!==null)r.inspectMonths=mo;}else{if(km!==null)r.replaceKm=km;if(mo!==null)r.replaceMonths=mo;}
 r.serviceComponentId=cat&&cat.serviceComponentId||componentId||r.serviceComponentId||null;r.componentName=cat&&cat.name||componentName||r.componentName||null;return r;
}
function resolveMaintenanceRule(vehicleId,cat){
if(!vehicleMatchesMaintenanceRuleSet(vehicleId)||typeof SERVICE_MAINTENANCE_RULES==='undefined')return null;
if(!cat)return null;
const direct=normalizeMaintenanceRuleKey(cat.serviceComponentId||cat.maintenanceRuleId);
if(direct&&SERVICE_MAINTENANCE_RULES[direct])return overlayPersistedMaintenanceIntervals(SERVICE_MAINTENANCE_RULES[direct],cat,direct,cat.name);
const n=normalizeMaintenanceRuleKey(cat.name);
if(n&&SERVICE_MAINTENANCE_RULES[n])return overlayPersistedMaintenanceIntervals(SERVICE_MAINTENANCE_RULES[n],cat,n,cat.name);
if(typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog['groups']==='function'){
for(const g of ServiceInputCatalog.groups()||[]){
for(const it of g.items||[]){
if(normalizeMaintenanceRuleKey(it.id)===n||normalizeMaintenanceRuleKey(it.name)===n){
const r=SERVICE_MAINTENANCE_RULES[it.id];
if(r)return overlayPersistedMaintenanceIntervals(r,cat,it.id,it.name);
}
}
}
}
const persistedKm=Number.isFinite(Number(cat.intervalKm))&&Number(cat.intervalKm)>0?Number(cat.intervalKm):null;
const persistedMonths=Number.isFinite(Number(cat.intervalBulan))&&Number(cat.intervalBulan)>0?Number(cat.intervalBulan):null;
if(persistedKm!==null||persistedMonths!==null)return overlayPersistedMaintenanceIntervals({},cat,cat.serviceComponentId||cat.id||null,cat.name||null);
return null;
}
function getMaintenanceSchedule(vehicleId,cat){
const rule=resolveMaintenanceRule(vehicleId,cat);
if(!rule)return null;
const schedule={rule:Object.assign({},rule),inspectKm:Number.isFinite(rule.inspectKm)&&rule.inspectKm>0?rule.inspectKm:null,replaceKm:Number.isFinite(rule.replaceKm)&&rule.replaceKm>0?rule.replaceKm:null,inspectMonths:Number.isFinite(rule.inspectMonths)&&rule.inspectMonths>0?rule.inspectMonths:null,replaceMonths:Number.isFinite(rule.replaceMonths)&&rule.replaceMonths>0?rule.replaceMonths:null,inspectDays:Number.isFinite(rule.inspectDays)&&rule.inspectDays>0?rule.inspectDays:null,replaceDays:Number.isFinite(rule.replaceDays)&&rule.replaceDays>0?rule.replaceDays:null,inspectAction:rule.inspectAction||'periksa',replaceAction:rule.replaceAction||'ganti',maintenanceType:rule.maintenanceType||'periodic',condition:rule.condition||null};
const ov=(D.vehicles||[]).find(v=>v&&v.id===vehicleId)?.intervalOverrides?.[cat&&cat.id],n=Number(ov);
if(Number.isFinite(n)&&n>0){const rep=!!(schedule.replaceKm||schedule.replaceMonths||schedule.replaceDays),ins=!!(schedule.inspectKm||schedule.inspectMonths||schedule.inspectDays);if(rep){schedule.replaceKm=n;schedule.rule.replaceKm=n;schedule.intervalOverrideAxis='replace';}else if(ins){schedule.inspectKm=n;schedule.rule.inspectKm=n;schedule.intervalOverrideAxis='inspect';}else{schedule.replaceKm=n;schedule.rule.replaceKm=n;schedule.intervalOverrideAxis='replace';}schedule.vehicleIntervalOverride=n;}
return schedule;
}
function hasMaintenanceReminderSchedule(vehicleId,cat){
const s=getMaintenanceSchedule(vehicleId,cat);
if(!s)return false;
if(s.maintenanceType==='event_based')return false;
return !!(s.inspectKm||s.replaceKm||s.inspectMonths||s.replaceMonths||s.inspectDays||s.replaceDays);
}
function resolveServiceCategoryComponent(masterCategoryId,serviceComponentId,name){
  let group=null,item=null;
  if(typeof ServiceInputCatalog!=='undefined'){
    if(serviceComponentId&&typeof ServiceInputCatalog.itemById==='function'){
      const hit=ServiceInputCatalog.itemById(serviceComponentId);
      if(hit&&hit.item){item=hit.item;group=hit.group||null;}
    }
    if(!item&&name&&typeof ServiceInputCatalog.infer==='function'){
      const inf=ServiceInputCatalog.infer(name);
      if(inf&&inf.item){item=inf.item;group=inf.group||null;}
    }
    if(!group&&masterCategoryId&&typeof ServiceInputCatalog.groupById==='function'){
      group=ServiceInputCatalog.groupById(masterCategoryId)||null;
    }
  }
  const finalMaster=group&&group.masterCategoryId?group.masterCategoryId:(masterCategoryId||null);
  const finalComponent=item&&item.id?item.id:(serviceComponentId||null);
  return {masterCategoryId:finalMaster,serviceComponentId:finalComponent,componentName:item?item.name:null,masterCategoryName:group?group.group:null};
}
function getServiceLinkage(catOrPart,vehicleId){
  const x=catOrPart||{};
  const linkedCat=x.catId?(D.sparepartCats||[]).find(c=>c&&c.id===x.catId):null;
  const inferred=(typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.infer==='function')
    ?ServiceInputCatalog.infer([x.name,x.code].filter(Boolean).join(' ')):null;
  const resolved=resolveServiceCategoryComponent(
    x.masterCategoryId||linkedCat?.masterCategoryId||inferred?.group?.masterCategoryId||null,
    x.serviceComponentId||linkedCat?.serviceComponentId||inferred?.item?.id||null,
    x.name||linkedCat?.name||''
  );
  if(!resolved.masterCategoryId&&typeof resolveCatGroup==='function'&&(linkedCat||x.name)){
    const rg=resolveCatGroup(linkedCat||x,vehicleId);
    if(rg&&rg.masterCategoryId)resolved.masterCategoryId=rg.masterCategoryId;
  }
  return resolved;
}
function getEffectiveIntervalKm(vehicleId,cat){
if(typeof VehicleServiceSOT!=='undefined'&&VehicleServiceSOT&&typeof VehicleServiceSOT.resolveReminderRule==='function'){
  const rule=VehicleServiceSOT.resolveReminderRule(cat,vehicleId);
  if(rule&&rule.intervalKm!==null)return rule.intervalKm;
}
const veh=(D.vehicles||[]).find(v=>v.id===vehicleId);
const ov=veh&&veh.intervalOverrides&&veh.intervalOverrides[cat.id];
if(typeof resolveCanonicalInterval==='function'){
  return resolveCanonicalInterval(cat,{intervalKm:ov}).intervalKm;
}
return(ov!=null&&ov>0)?ov:(cat&&cat.intervalKm>0?cat.intervalKm:null);
}
function hasIntervalOverride(vehicleId,cat){
const veh=D.vehicles.find(v=>v.id===vehicleId);
return!!(veh&&veh.intervalOverrides&&veh.intervalOverrides[cat.id]>0);
}
function getEffectiveIntervalBulan(cat,vehicleId){
if(typeof VehicleServiceSOT!=='undefined'&&VehicleServiceSOT&&typeof VehicleServiceSOT.resolveReminderRule==='function'){
  const rule=VehicleServiceSOT.resolveReminderRule(cat,vehicleId);
  if(rule&&rule.intervalBulan!==null)return rule.intervalBulan;
}
if(typeof resolveCanonicalInterval==='function'){
  return resolveCanonicalInterval(cat,{}).intervalBulan;
}
return(cat&&cat.intervalBulan>0)?cat.intervalBulan:null;
}
// P24 canonical part-history contract: getPartUsageHistory, getPartPriceHistoryHtml, compareServiceHistoryRecency.
function compareServiceHistoryRecencyLocal(a,b){
  if(typeof window!=='undefined'&&typeof window.compareServiceHistoryRecency==='function'&&window.compareServiceHistoryRecency!==compareServiceHistoryRecencyLocal)return window.compareServiceHistoryRecency(a,b);
  const da=parseServiceDateOnly(a&&a.date), db=parseServiceDateOnly(b&&b.date);
  const av=!!da,bv=!!db;
  if(av!==bv)return av?-1:1;
  if(av){
    const d=db.getTime()-da.getTime();
    if(d)return d;
  }
  const ak=Number(a&&a.km),bk=Number(b&&b.km);
  const akv=Number.isFinite(ak),bkv=Number.isFinite(bk);
  if(akv!==bkv)return akv?-1:1;
  if(akv&&bk!==ak)return bk-ak;
  const at=Date.parse(a&& (a.updatedAt||a.createdAt||a.timestamp));
  const bt=Date.parse(b&& (b.updatedAt||b.createdAt||b.timestamp));
  if(Number.isFinite(at)||Number.isFinite(bt)){
    const avT=Number.isFinite(at)?at:-Infinity,bvT=Number.isFinite(bt)?bt:-Infinity;
    if(bvT!==avT)return bvT-avT;
  }
  return String(b&&b.id||'').localeCompare(String(a&&a.id||''));
}
if(typeof window!=='undefined'&&typeof window.compareServiceHistoryRecency!=='function')window.compareServiceHistoryRecency=compareServiceHistoryRecencyLocal;
function getLatestServiceLogForCat(vehicleId,cat,actionTypeFilter,forReminder){
  const logs=(D.servisLogs||[]).filter(s=>s.vehicleId===vehicleId&&servisLogMatchesCat(s,cat)&&matchesActionTypeForReset(s,cat,actionTypeFilter,forReminder));
  logs.sort(compareServiceHistoryRecencyLocal);
  return logs.length?logs[0]:null;
}
function getLastServiceDateForCat(vehicleId,cat,actionTypeFilter,forReminder){
const log=getLatestServiceLogForCat(vehicleId,cat,actionTypeFilter,forReminder);
return log&&parseServiceDateOnly(log.date)?log.date:null;
}
function getEffectiveActionMode(cat){return(cat&&cat.actionMode)||'ganti';}
function getEffectiveResetType(cat){return(cat&&cat.resetType)||'km';}
function resolveResetActionTypeFilter(cat){
if(getEffectiveActionMode(cat)==='periksa-conditional')return'periksa';
const resetType=getEffectiveResetType(cat);
if(resetType==='both'||resetType==='time')return'ganti';
return null;
}
function matchesActionTypeForReset(log,cat,actionTypeFilter,forReminder){
const effType=log.actionType||'ganti';
if(forReminder&&cat&&cat.actionMode==='periksa-conditional'&&cat.gantiResetsInterval===false&&effType==='ganti')return false;
if(!actionTypeFilter)return true;
return effType===actionTypeFilter;
}
function suggestNextBusiAction(vehicleId,cat){
const logs=(D.servisLogs||[]).filter(s=>s.vehicleId===vehicleId&&servisLogMatchesCat(s,cat));
return(logs.length%2===0)?'periksa':'ganti';
}
function parseServiceDateOnly(value){
  if(value instanceof Date)return isNaN(value)?null:new Date(value.getTime());
  const m=String(value??'').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m){
    const y=Number(m[1]),mo=Number(m[2])-1,d=Number(m[3]);
    const out=new Date(y,mo,d);
    if(out.getFullYear()===y&&out.getMonth()===mo&&out.getDate()===d)return out;
    return null;
  }
  const out=new Date(value);
  return isNaN(out)?null:out;
}
function formatServiceDateOnly(date){
  const d=parseServiceDateOnly(date);
  if(!d)return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function addServiceMonthsClamped(date,months){
  const d=parseServiceDateOnly(date);
  const n=Number(months);
  if(!d||!Number.isFinite(n))return null;
  const whole=Math.trunc(n);
  const targetMonth=d.getMonth()+whole;
  const out=new Date(d.getFullYear(),targetMonth,1);
  const lastDay=new Date(out.getFullYear(),out.getMonth()+1,0).getDate();
  out.setDate(Math.min(d.getDate(),lastDay));
  return out;
}
function diffServiceDays(dateA,dateB){
  const a=parseServiceDateOnly(dateA),b=parseServiceDateOnly(dateB);
  if(!a||!b)return null;
  const utcA=Date.UTC(a.getFullYear(),a.getMonth(),a.getDate());
  const utcB=Date.UTC(b.getFullYear(),b.getMonth(),b.getDate());
  return (utcB-utcA)/86400000;
}
function monthsSinceISO(dateISO,nowISO){
if(!dateISO)return null;
const days=diffServiceDays(dateISO,nowISO?nowISO:new Date());
return days==null?null:days/30.4368;
}
function buildServiceNextDueSnapshot({vehicleId,cat,serviceKm,serviceDate,actionType}={}){
  if(!cat)return{nextDueKm:null,nextDueDate:null,nextDueAxis:null};
  const schedule=getMaintenanceSchedule(vehicleId,cat);
  let intervalKm=null,intervalBulan=null;
  if(schedule){const act=String(actionType||'').trim().toLowerCase(),im=act&&act===String(schedule.inspectAction||'periksa').toLowerCase(),rm=act&&act===String(schedule.replaceAction||'ganti').toLowerCase();intervalKm=im&&schedule.inspectKm?schedule.inspectKm:rm&&schedule.replaceKm?schedule.replaceKm:schedule.replaceKm||schedule.inspectKm||null;intervalBulan=im&&schedule.inspectMonths?schedule.inspectMonths:rm&&schedule.replaceMonths?schedule.replaceMonths:schedule.replaceMonths||schedule.inspectMonths||null;}
  else{intervalKm=typeof getEffectiveIntervalKm==='function'?getEffectiveIntervalKm(vehicleId,cat):(cat.intervalKm>0?cat.intervalKm:null);intervalBulan=typeof getEffectiveIntervalBulan==='function'?getEffectiveIntervalBulan(cat,vehicleId):(cat.intervalBulan>0?cat.intervalBulan:null);}
  const km=Number(serviceKm);
  const baseDate=parseServiceDateOnly(serviceDate||new Date());
  const nextDueKm=intervalKm>0&&Number.isFinite(km)?km+intervalKm:null;
  let nextDueDate=null;
  if(intervalBulan>0&&!isNaN(baseDate)){
    const d=addServiceMonthsClamped(baseDate,intervalBulan); nextDueDate=formatServiceDateOnly(d);
  }
  let nextDueAxis='none';
  if(nextDueKm!==null&&nextDueDate)nextDueAxis='km_or_date';
  else if(nextDueKm!==null)nextDueAxis='km';
  else if(nextDueDate)nextDueAxis='date';
  return{nextDueKm,nextDueDate,nextDueAxis,intervalKmAtService:intervalKm||null,intervalBulanAtService:intervalBulan||null};
}
function resolveServiceStatusMeta(score){
  const n=Number(score);
  if(!Number.isFinite(n))return{code:'aman',label:'Aman',icon:'🟢',severity:0};
  if(n< -0.10)return{code:'terlewat',label:'Terlewat',icon:'⚫',severity:4};
  if(n<=0)return{code:'jatuh_tempo',label:'Jatuh tempo',icon:'🔴',severity:3};
  if(n<=0.15)return{code:'segera',label:'Segera',icon:'🟡',severity:2};
  if(n<=0.30)return{code:'mendekati',label:'Mendekati',icon:'🔵',severity:1};
  return{code:'aman',label:'Aman',icon:'🟢',severity:0};
}
function computeServiceUrgency({vehicleId,cat,curKm,kmPerDay,nowISO}={}){
const schedule=getMaintenanceSchedule(vehicleId,cat);
const resetFilter=resolveResetActionTypeFilter(cat);
const currentKm=Number.isFinite(curKm)?curKm:0;
const kmPerDaySafe=Number.isFinite(kmPerDay)&&kmPerDay>0?kmPerDay:null;
const candidates=[];
const addCandidate=(action,intervalKm,lastFilter,intervalMonths,intervalDays)=>{
  const hasKm=intervalKm>0, hasMonths=intervalMonths>0, hasDays=intervalDays>0;
  if(!hasKm&&!hasMonths&&!hasDays)return;
  let lastKm=null,lastDate=null,latestHistory=null;
  let remainingKm=null,fracKm=null,remainingMonths=null,fracMonths=null,remainingDays=null,fracDays=null;
  if(hasKm||hasMonths||hasDays){
    if(typeof getLatestServiceLogForCat==='function') latestHistory=getLatestServiceLogForCat(vehicleId,cat,lastFilter,true);
  }
  if(hasKm){
    lastKm=latestHistory&&Number.isFinite(Number(latestHistory.km))?Number(latestHistory.km):getLastServiceKmForCat(vehicleId,cat,lastFilter,true);
    const traveled=lastKm===null?currentKm:currentKm-lastKm;
    remainingKm=intervalKm-traveled; fracKm=remainingKm/intervalKm;
  }
  if(hasMonths||hasDays){
    lastDate=latestHistory&&parseServiceDateOnly(latestHistory.date)?latestHistory.date:getLastServiceDateForCat(vehicleId,cat,lastFilter,true);
    const elapsedDays=lastDate?diffServiceDays(lastDate,nowISO||new Date()):0;
    if(hasMonths){remainingMonths=intervalMonths-(elapsedDays/30.4368);fracMonths=remainingMonths/intervalMonths;}
    if(hasDays){remainingDays=intervalDays-elapsedDays;fracDays=remainingDays/intervalDays;}
  }
  let limitingAxis='km',score=fracKm;
  if(score==null){limitingAxis=hasMonths?'bulan':'hari';score=hasMonths?fracMonths:fracDays;}
  if(fracMonths!=null&&fracMonths<score){limitingAxis='bulan';score=fracMonths;}
  if(fracDays!=null&&fracDays<score){limitingAxis='hari';score=fracDays;}
  candidates.push({action,intervalKm:hasKm?intervalKm:null,lastKm,sisaKm:remainingKm,fracRemainKm:fracKm,intervalBulan:hasMonths?intervalMonths:null,sisaBulan:remainingMonths,fracRemainBulan:fracMonths,intervalHari:hasDays?intervalDays:null,sisaHari:remainingDays,fracRemainHari:fracDays,limitingAxis,score,lastDate,sourceHistoryId:latestHistory&&latestHistory.id||null,reconciliationCode:latestHistory&&typeof ServiceHistoryReminderReconciliationSOT!=='undefined'&&ServiceHistoryReminderReconciliationSOT&&typeof ServiceHistoryReminderReconciliationSOT.match==='function'?ServiceHistoryReminderReconciliationSOT.match(latestHistory,cat,{vehicleId}).code:null});
};
if(schedule){
  const type=schedule.maintenanceType;
  const inspectKm=schedule.inspectKm;
  const replaceKm=schedule.replaceKm;
  if((inspectKm||schedule.inspectMonths||schedule.inspectDays) && (type==='periodic'||type==='periodic_or_condition')) {
    const inspectAction=schedule.inspectAction||'periksa';
    addCandidate(inspectAction,inspectKm,inspectAction,schedule.inspectMonths,schedule.inspectDays);
  }
  if(type!=='event_based' && (replaceKm||schedule.replaceMonths||schedule.replaceDays)) {
    const replaceAction=schedule.replaceAction||'ganti';
    addCandidate(replaceAction,replaceKm,replaceAction,schedule.replaceMonths,schedule.replaceDays);
  }
} else {
  const intervalKm=getEffectiveIntervalKm(vehicleId,cat);
  const intervalBulan=getEffectiveIntervalBulan(cat,vehicleId);
  addCandidate('ganti',intervalKm,resetFilter,intervalBulan,null);
}
if(!candidates.length){
  return{sisaKm:null,intervalKm:null,sisaBulan:null,intervalBulan:null,sisaHari:null,intervalHari:null,limitingAxis:'none',status:'aman',estDateISO:null,nextAction:schedule&&schedule.maintenanceType==='event_based'?'event_based':null,maintenanceType:schedule&&schedule.maintenanceType||null,condition:schedule&&schedule.condition||null};
}
const c=candidates.sort((a,b)=>a.score-b.score)[0];
const statusMeta=resolveServiceStatusMeta(c.score);
const status=statusMeta.code;
let estDateISO=null;
let nextDueKm=null,nextDueDate=null,nextDueAxis='none';
if(c.lastKm!=null&&c.intervalKm>0)nextDueKm=c.lastKm+c.intervalKm;
if(c.lastDate){
  if(c.intervalBulan>0){const d=addServiceMonthsClamped(c.lastDate,c.intervalBulan);if(d)nextDueDate=formatServiceDateOnly(d);}
  if(c.intervalHari>0&&!nextDueDate){const d=parseServiceDateOnly(c.lastDate);if(d){d.setDate(d.getDate()+c.intervalHari);nextDueDate=formatServiceDateOnly(d);}}
}
if(nextDueKm!==null&&nextDueDate)nextDueAxis='km_or_date';
else if(nextDueKm!==null)nextDueAxis='km';
else if(nextDueDate)nextDueAxis='date';
if(c.limitingAxis==='bulan'||c.limitingAxis==='hari')estDateISO=nextDueDate;
else if(typeof estimateServiceDateISO==='function')estDateISO=estimateServiceDateISO(c.sisaKm,kmPerDaySafe);
return Object.assign({},c,{status,statusLabel:statusMeta.label,statusIcon:statusMeta.icon,statusSeverity:statusMeta.severity,estDateISO,nextDueKm,nextDueDate,nextDueAxis,nextAction:c.action,maintenanceType:schedule&&schedule.maintenanceType||null,condition:schedule&&schedule.condition||null});
}
function recommendIntervalKm(vehicleId,cat){
const logs=(D.servisLogs||[]).filter(s=>s.vehicleId===vehicleId&&s.km>0&&servisLogMatchesCat(s,cat)).sort((a,b)=>a.km-b.km);
if(logs.length<2)return{ok:false,reason:'Belum cukup histori servis (min. 2 catatan dgn KM terisi)',count:logs.length};
const deltas=[];
for(let i=1;i<logs.length;i++){
const d=logs[i].km-logs[i-1].km;
if(d>0)deltas.push(d);
}
if(!deltas.length)return{ok:false,reason:'Data KM histori tidak berurutan naik, tidak bisa dihitung',count:logs.length};
const avg=Math.round(deltas.reduce((s,d)=>s+d,0)/deltas.length/100)*100;
return{ok:true,avgKm:avg,count:logs.length,sampleCount:deltas.length};
}
function historyMatchesName(log,nameLower){
const item=(log.item||'').toLowerCase().trim();
if(!item||!nameLower)return false;
if(item===nameLower)return true;
if(item.includes(nameLower))return true;
if(nameLower.includes(item)&&item.length>=4)return true;
return false;
}
function historyStatsForName(vehicleId,name){
const nameLower=(name||'').trim().toLowerCase();
if(!nameLower)return{count:0,avgKm:null};
const logs=(D.servisLogs||[]).filter(s=>s.vehicleId===vehicleId&&historyMatchesName(s,nameLower));
const withKm=logs.filter(s=>s.km>0).sort((a,b)=>a.km-b.km);
let avgKm=null;
if(withKm.length>=2){
const deltas=[];
for(let i=1;i<withKm.length;i++){
const d=withKm[i].km-withKm[i-1].km;
if(d>0)deltas.push(d);
}
if(deltas.length)avgKm=Math.round(deltas.reduce((s,d)=>s+d,0)/deltas.length/100)*100;
}
return{count:logs.length,avgKm};
}
async function editVehicleIntervalOverride(catId){
const cat=D.sparepartCats.find(c=>c.id===catId);
if(!cat){toast('⚠️ Kategori sparepart tidak ditemukan');return;}
const veh=D.vehicles.find(v=>v.id===curVehicleId);
if(!veh){toast('⚠️ Pilih kendaraan dulu');return;}
const current=getEffectiveIntervalKm(curVehicleId,cat);
const reko=recommendIntervalKm(curVehicleId,cat);
const rekoLine=(reko.ok&&Math.abs(reko.avgKm-current)>=100)?`\n\n💡 Dari ${reko.sampleCount} jeda servis terakhir (${reko.count} catatan), rata-rata kamu servis tiap ~${reko.avgKm.toLocaleString('id-ID')} km -- beda dari interval saat ini (${current.toLocaleString('id-ID')} km). Ini cuma saran, isi angka manapun yang kamu mau.`:'';
const val=await showPromptModal({title:'Interval Khusus '+veh.name,message:`Interval "${cat.name}" khusus untuk ${veh.emoji||'🏍️'} ${veh.name} (KM). Kosongkan/0 untuk pakai default global (${cat.intervalKm.toLocaleString('id-ID')} km, dipakai semua kendaraan lain).${rekoLine}`,icon:'🔧',inputType:'number',defaultValue:current});
if(val===null)return;
if(!veh.intervalOverrides)veh.intervalOverrides={};
const num=parseFloat(val);
if(val===''||isNaN(num)||num<=0){
delete veh.intervalOverrides[catId];
save();Servis.renderReminder();renderDashboardServisReminder();
toast('✅ Kembali pakai default global ('+cat.intervalKm.toLocaleString('id-ID')+' km)');
} else {
veh.intervalOverrides[catId]=num;
save();Servis.renderReminder();renderDashboardServisReminder();
toast('✅ Interval khusus '+veh.name+' disimpan: '+num.toLocaleString('id-ID')+' km');
}
}
function getLastServiceKm(vehicleId){
const logs=D.servisLogs.filter(s=>s.vehicleId===vehicleId&&Number.isFinite(Number(s.km)));
logs.sort(typeof compareServiceHistoryRecency==='function'?compareServiceHistoryRecency:(a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.km)-Number(a.km));
return logs.length?Number(logs[0].km):0;
}
function matchingVehicleName(name){
if(!name)return null;
const n=name.trim().toLowerCase();
return D.vehicles.find(v=>v.name.trim().toLowerCase()===n)||null;
}
function codeFromName(name){
if(!name)return '';
const words=name.replace(/[\/\(\)]/g,' ').trim().split(/\s+/).filter(Boolean);
let code;
if(words.length>1) code=words.map(w=>w[0]).join('').slice(0,4);
else code=words[0].slice(0,3);
return code.toUpperCase();
}
function _renderSuggestBox(name){
const boxEl=document.getElementById('sparepartAiSuggestBox');
if(!boxEl)return;
const reko=(typeof suggestServiceIntervalKm==='function')?suggestServiceIntervalKm(name,curVehicleId):null;
boxEl.classList.remove('u-dnone');
if(!reko){
boxEl.innerHTML=`<div class="u-fs12 u-t2">🤖 Belum ada rekomendasi pasti utk "${escapeHtml(name)}" di data buku panduan yang tersimpan. Isi manual sesuai buku servis kendaraanmu ya.</div>`;
return;
}
boxEl.innerHTML=`<div class="u-fs12" style="line-height:1.5"><b>🤖 Rekomendasi: setiap ${reko.km.toLocaleString('id-ID')} km</b><br><span class="u-t2">Sumber: ${escapeHtml(reko.source)}</span></div><button type="button" class="btn btn-primary btn-sm u-mt6" data-action="applySparepartIntervalSuggestion" data-args="${escapeHtml(JSON.stringify([reko.km]))}">✅ Pakai Angka Ini</button>`;
}
const Sparepart={
catEditIdx:null,
catEditId:null,
stockEditIdx:null,
_catalogNameCache:[],
activeMasterCategoryFilter:null,
_masterCategoryFilterPrefsLoaded:false,
_masterCategoryFilterStorageKey:'sparepartMasterCategoryFilterPrefs',
_loadMasterCategoryFilterPrefsOnce(){
if(Sparepart._masterCategoryFilterPrefsLoaded)return;
Sparepart._masterCategoryFilterPrefsLoaded=true;
if(typeof localStorage==='undefined')return;
try{
const raw=localStorage.getItem(Sparepart._masterCategoryFilterStorageKey);
if(!raw)return;
const parsed=JSON.parse(raw);
const id=parsed&&parsed.activeMasterCategoryFilter;
if(id===null)return;
if(typeof id!=='string')return;
const hasSot=typeof ServiceTaxonomySOT!=='undefined'&&ServiceTaxonomySOT&&typeof ServiceTaxonomySOT.categories==='function';
const hasDb=typeof DatabaseAPI!=='undefined'&&DatabaseAPI&&DatabaseAPI.masterCategory&&typeof DatabaseAPI.masterCategory.getAll==='function';
const validIds=hasSot?(ServiceTaxonomySOT.categories()||[]).map(c=>c.id):(hasDb?(DatabaseAPI.masterCategory.getAll()||[]).map(c=>c&&c.id).filter(Boolean):[]);
if(id===UNCATEGORIZED_FILTER_ID||validIds.indexOf(id)!==-1){
Sparepart.activeMasterCategoryFilter=id;
}
}catch(err){
// Invalid filter preference is non-fatal; retain the live default.
}
},
_saveMasterCategoryFilterPrefs(){
if(typeof localStorage==='undefined')return;
try{
localStorage.setItem(Sparepart._masterCategoryFilterStorageKey,JSON.stringify({activeMasterCategoryFilter:Sparepart.activeMasterCategoryFilter}));
}catch(err){
// Preference persistence is best-effort; storage failures must not block UI.
}
},
dashReminderMasterCatBadgeHTML(cat,vehicleId){
const r=(typeof resolveCatGroup==='function')?resolveCatGroup(cat,vehicleId):null;
if(!r||!r.masterCategoryName)return'';
return` <span class="u-fs11 u-t2" style="opacity:.75">· ${r.masterCategoryIcon||'🔧'} ${escapeHtml(r.masterCategoryName)}</span>`;
},
updateMasterCatBadge(name,vehicleId){
const wrapEl=document.getElementById('sparepartMasterCatBadgeWrap');
if(!wrapEl)return;
if(!name){wrapEl.classList.add('u-dnone');wrapEl.innerHTML='';return;}
const r=(typeof resolveCatGroup==='function')?resolveCatGroup({name},vehicleId):null;
if(!r||!r.masterCategoryName){wrapEl.classList.add('u-dnone');wrapEl.innerHTML='';return;}
wrapEl.classList.remove('u-dnone');
wrapEl.innerHTML=`${r.masterCategoryIcon||'🔧'} Kategori master: ${escapeHtml(r.masterCategoryName)}`;
},
updateMasterCatBadgeLive(){
const nameEl=document.getElementById('sparepartName');
const vehEl=document.getElementById('sparepartVehicleId');
const name=nameEl?nameEl.value:'';
const vehicleId=(vehEl&&vehEl.value)?vehEl.value:null;
Sparepart.updateMasterCatBadge(name,vehicleId);
},
setMasterCategoryFilter(id){
Sparepart.activeMasterCategoryFilter=id||null;
Sparepart._saveMasterCategoryFilterPrefs();
Sparepart.renderCatList();
},
renderMasterCategoryChips(beforeEl){
const hasSot=typeof ServiceTaxonomySOT!=='undefined'&&ServiceTaxonomySOT&&typeof ServiceTaxonomySOT.categories==='function';
const hasDb=typeof DatabaseAPI!=='undefined'&&DatabaseAPI&&DatabaseAPI.masterCategory&&typeof DatabaseAPI.masterCategory.getAll==='function';
if(!hasSot&&!hasDb)return;
let row=document.getElementById('sparepartMasterCatChipRow');
if(!row){
row=document.createElement('div');
row.id='sparepartMasterCatChipRow';
row.className='u-flex u-fs12 u-mb10';
row.style.cssText='gap:6px;flex-wrap:wrap';
beforeEl.insertAdjacentElement('beforebegin',row);
}
const cats=hasSot?(ServiceTaxonomySOT.categories()||[]):(DatabaseAPI.masterCategory.getAll()||[]);
const options=[{id:null,label:'🔍 Semua'}].concat(cats.map(c=>({id:c.id,label:(c.icon||'🔧')+' '+c.name}))).concat([{id:UNCATEGORIZED_FILTER_ID,label:'❔ Belum Terklasifikasi'}]);
row.innerHTML=options.map(o=>`<div class="chip ${o.id===Sparepart.activeMasterCategoryFilter?'active':''}" data-action="Sparepart.setMasterCategoryFilter" data-args="${escapeHtml(JSON.stringify([o.id]))}">${o.label}</div>`).join('');
},
isPartForVehicle(part,vehicleId){
if(!vehicleId||!part)return true;
if(part.vehicleId)return part.vehicleId===vehicleId;
if(!part.catalogId)return true;
if(typeof VehicleCatalog==='undefined'||typeof VehicleCatalog.isLoaded!=='function'||!VehicleCatalog.isLoaded())return true;
const store=VehicleCatalog.getStore();
const catItem=(store&&Array.isArray(store.items))?store.items.find(it=>it.id===part.catalogId):null;
if(!catItem)return true;
if(!Array.isArray(catItem.compatibleVehicleIds)||!catItem.compatibleVehicleIds.length)return true;
return catItem.compatibleVehicleIds.some(id=>String(id)===String(vehicleId));
},
autoFillCatCode(){
const codeEl=document.getElementById('sparepartCode');
if(!codeEl||codeEl.dataset.manual==='1')return;
codeEl.value=codeFromName(document.getElementById('sparepartName').value);
},
populateDatalist(){
const hasCatalog=typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.getAll==='function';
if(!hasCatalog)return;
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
VehicleCatalog.getAll().then(items=>{
const filtered=(typeof VehicleCatalog.filterForVehicle==='function')?VehicleCatalog.filterForVehicle(items,vid):(items||[]);
Sparepart._catalogNameCache=(filtered||[]).map(it=>it.partName).filter(Boolean);
}).catch(()=>{});
},
getItemSuggestions(){
const names=new Map();
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
D.sparepartCats.forEach(c=>{ if(c.name&&catVisibleForVehicle(c,vid)) names.set(c.name.toLowerCase(),c.name); });
D.partsStock.forEach(p=>{ if(p.name&&p.qty>0&&Sparepart.isPartForVehicle(p,vid)&&!names.has(p.name.toLowerCase())) names.set(p.name.toLowerCase(),p.name); });
(Sparepart._catalogNameCache||[]).forEach(n=>{ if(n&&!names.has(n.toLowerCase()))names.set(n.toLowerCase(),n); });
return Array.from(names.values());
},
ensureCanonicalSparepartComponentCategories(){
  if(typeof SERVICE_CHECKLIST_GROUPS==='undefined'||!Array.isArray(SERVICE_CHECKLIST_GROUPS)||!Array.isArray(D.sparepartCats))return {ok:false,added:0,linked:0};
  const stockIds=new Set([
    'oli-mesin','filter-oli','busi','rantai-keteng-tensioner','filter-kawat-oli-mesin','paking-knalpot',
    'v-belt-cvt','slide-piece-cvt','boss-pulley-drive-face','roller-cvt','kampas-kopling-ganda','mangkok-kopling-ganda','seal-driven-face','per-sentri','per-cvt','bearing-bak-cvt','busa-filter-cvt',
    'throttle-body','isc','injector','filter-fuel-pump','selang-tutup-tangki','coolant','radiator-water-pump','thermostat',
    'kampas-rem-depan','minyak-rem','kampas-rem-belakang','cakram-rem-depan','kaliper-rem-depan','master-rem-reservoir','tromol-rem-belakang','selang-rem',
    'oli-shockbreaker','engine-mounting-bushing-arm','aki','saklar-sistem-penerangan','relay-sekring',
    'ban-depan','ban-belakang','bearing-roda','filter-udara','oli-gardan','kabel-gas-standar-kunci'
  ]);
  const aliases={
    'oli-gardan':'Oli Gardan/Transmisi',
    'v-belt-cvt':'V-Belt (CVT)',
    'kampas-rem-depan':'Kampas Rem Depan',
    'kampas-rem-belakang':'Kampas Rem Belakang',
    'minyak-rem':'Minyak Rem',
    'filter-udara':'Filter Udara',
    'aki':'Aki (cek/ganti)'
  };
  let added=0,linked=0;
  SERVICE_CHECKLIST_GROUPS.forEach(g=>(g.items||[]).forEach(it=>{
    if(!it||!stockIds.has(it.id))return;
    let cat=(D.sparepartCats||[]).find(c=>c&&c.serviceComponentId===it.id);
    if(!cat){
      const targetName=aliases[it.id]||it.name;
      const exact=(D.sparepartCats||[]).find(c=>c&&String(c.name||'').trim().toLowerCase()===targetName.trim().toLowerCase());
      cat=exact||null;
    }
    if(cat){
      let changed=false;
      if(cat.serviceComponentId!==it.id){cat.serviceComponentId=it.id;changed=true;}
      if(cat.masterCategoryId!==g.masterCategoryId){cat.masterCategoryId=g.masterCategoryId;changed=true;}
      if(!cat.group)cat.group=g.group;
      if(!cat.groupIcon){const mc=(typeof DatabaseAPI!=='undefined'&&DatabaseAPI.masterCategory&&typeof DatabaseAPI.masterCategory.getAll==='function')?(DatabaseAPI.masterCategory.getAll()||[]).find(x=>x.id===g.masterCategoryId):null;if(mc&&mc.icon)cat.groupIcon=mc.icon;}
      if(changed)linked++;
      return;
    }
    const base='sp_component_'+it.id;
    const idTaken=(D.sparepartCats||[]).some(c=>c&&c.id===base);
    const mc=(typeof DatabaseAPI!=='undefined'&&DatabaseAPI.masterCategory&&typeof DatabaseAPI.masterCategory.getAll==='function')?(DatabaseAPI.masterCategory.getAll()||[]).find(x=>x.id===g.masterCategoryId):null;
    const _sotCat={id:idTaken?base+'_'+Date.now():base,name:it.name,code:codeFromName(it.name),intervalKm:it.intervalKm||0,intervalBulan:it.intervalTimeMonths||0,masterCategoryId:g.masterCategoryId,serviceComponentId:it.id,showInReminder:(it.intervalKm>0||it.intervalTimeMonths>0),group:g.group,groupIcon:mc&&mc.icon?mc.icon:'',vehicleId:(typeof curVehicleId!=='undefined'?curVehicleId:null)}; if(typeof VehicleCarNotesSOT!=='undefined'&&VehicleCarNotesSOT&&_sotCat.vehicleId&&typeof VehicleCarNotesSOT.syncLegacyCategoryProjection==='function')VehicleCarNotesSOT.syncLegacyCategoryProjection(_sotCat,'checklist-category-provision'); D.sparepartCats.push(_sotCat);
    added++;
  }));
  if(added||linked)save();
  return {ok:true,added,linked};
},
// Sparepart UI layer: activeStockMasterCategoryFilter:null, activeStockComponentFilter:null, renderStockFilters(beforeEl).
renderCatList(){
Sparepart.ensureCanonicalSparepartComponentCategories();
const el=document.getElementById('sparepartCatList');
if(!el)return;
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
Sparepart._loadMasterCategoryFilterPrefsOnce();
Sparepart.renderMasterCategoryChips(el);
// S1964 legacy renderer contract: ServiceInputCatalog.itemById(c.serviceComponentId)
// const compLabel=compRef&&compRef.item?(' • '+compRef.item.name):'';
const hasCanonicalVehicleSOT=typeof VehicleCarNotesSOT!=='undefined'&&VehicleCarNotesSOT&&typeof VehicleCarNotesSOT.getServiceCategories==='function';
let projected;
if(hasCanonicalVehicleSOT){
  projected=(D.sparepartCats||[]).filter(c=>c&&vid!=null&&String(c.vehicleId)===String(vid)).map(c=>({cat:c,sot:getVehicleServiceCategorySOT(c,vid)})).filter(x=>x.sot);
}else{
  // Legacy UI harness/early-load compatibility only. Production with VehicleCarNotesSOT always takes the strict vehicle-scoped branch above.
  projected=(D.sparepartCats||[]).map(c=>{
    const g=typeof resolveCatGroup==='function'?resolveCatGroup(c,vid):null;
    const comp=(c&&c.serviceComponentId&&typeof ServiceInputCatalog!=='undefined'&&ServiceInputCatalog&&typeof ServiceInputCatalog.itemById==='function')?ServiceInputCatalog.itemById(c.serviceComponentId):null;
    return {cat:c,sot:{vehicleId:vid,masterCategoryId:c.masterCategoryId||(g&&g.masterCategoryId)||null,categoryName:(g&&(g.masterCategoryName||g.group))||null,serviceComponentId:c.serviceComponentId||null,componentName:(comp&&comp.item&&comp.item.name)||c.name||'',code:c.code||codeFromName(c.name||''),intervalKm:Number(c.intervalKm)||0,intervalBulan:Number(c.intervalBulan)||0,showInReminder:c.showInReminder!==false}};
  });
}
let visible=projected;
if(Sparepart.activeMasterCategoryFilter){
  const isUncategorizedFilter=Sparepart.activeMasterCategoryFilter===UNCATEGORIZED_FILTER_ID;
  visible=visible.filter(x=>isUncategorizedFilter
    ?x.sot.masterCategoryId==null
    :x.sot.masterCategoryId===Sparepart.activeMasterCategoryFilter);
}
if(!visible.length){
  el.innerHTML='<div class="empty"><div class="empty-text">'+(Sparepart.activeMasterCategoryFilter?'Tidak ada kategori sparepart utk kategori master ini':'Belum ada komponen SOT utk kendaraan aktif')+'</div></div>';
  Sparepart.populateDatalist();
  Sparepart.populateStockCatSelect();
  return;
}
el.innerHTML=visible.map(({cat:c,sot})=>{
  const i=D.sparepartCats.indexOf(c);
  const noInterval=!(sot.intervalKm>0)&&!(sot.intervalBulan>0);
  const hidden=sot.showInReminder===false;
  const inactive=noInterval||hidden;
  const intervalText=sot.intervalKm>0
    ?'Setiap '+sot.intervalKm.toLocaleString('id-ID')+' km'+(sot.intervalBulan>0?' atau '+sot.intervalBulan.toLocaleString('id-ID')+' bln':'')
    :(sot.intervalBulan>0?'Setiap '+sot.intervalBulan.toLocaleString('id-ID')+' bln':'Interval tidak ditetapkan');
  const statusBadge=noInterval
    ?`<span class="u-fs11 u-fw700 u-r6" style="padding:2px 7px;background:var(--accent2-soft,rgba(230,80,80,.12));color:var(--accent2,#e65050)">⚠️ Tanpa interval</span>`
    :(hidden
      ?`<span class="u-fs11 u-fw700 u-r6 u-pointer" data-action="toggleSparepartShowInReminder" data-args="${escapeHtml(JSON.stringify([c.id]))}" style="padding:2px 7px;background:var(--surface3);color:var(--text2)" title="Tap utk tampilkan lagi di Pengingat Servis">🙈 Disembunyikan dari Pengingat</span>`
      :`<span class="u-fs11 u-fw700 u-r6 u-pointer" data-action="toggleSparepartShowInReminder" data-args="${escapeHtml(JSON.stringify([c.id]))}" style="padding:2px 7px;background:var(--accent3-soft,rgba(80,180,120,.12));color:var(--accent3,#3fa66f)">🔔 Tampil di Pengingat</span>`);
  const veh=(D.vehicles||[]).find(v=>v&&String(v.id)===String(vid));
  const vehBadge=`<span class="u-fs11 u-fw700 u-r6 u-ml4" style="padding:2px 7px;background:var(--accent-soft);color:var(--accent)" title="SOT kendaraan aktif">${veh?(veh.emoji||'🏍️')+' '+escapeHtml(veh.name||'Kendaraan aktif'):'🏍️ Kendaraan aktif'}</span>`;
  const categoryBadge=sot.categoryName?`<span class="u-fs11 u-fw700 u-r6 u-ml4" style="padding:2px 7px;background:var(--surface3);color:var(--text2)" title="Kategori master SOT">${escapeHtml(sot.categoryName)}</span>`:'';
  return `<div class="tx-item"><div class="tx-icon u-bgaccsoft">🔩</div><div class="tx-info"><div class="tx-name">${escapeHtml(sot.componentName)} <span class="u-fs12 u-fw700 u-cacc u-bgaccsoft u-r6 u-ml4" style="padding:1px 6px">${escapeHtml(sot.code)}</span></div><div class="tx-meta"${inactive?' style="color:var(--text3)"':''}>${escapeHtml(intervalText)}${categoryBadge}</div><div class="u-mt4">${statusBadge}${vehBadge}</div></div><button class="tx-del u-bgaccsoft u-cacc" style="margin-right:6px" data-action="openSparepartModalById" data-args="${escapeHtml(JSON.stringify([c.id]))}" aria-label="Edit/Buka">✏️</button><button class="tx-del" data-action="delSparepart" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Hapus">🗑</button></div>`;
}).join('');
Sparepart.populateDatalist();
Sparepart.populateStockCatSelect();
},
// openRecommendBox — S2070 projection helper follows strict vehicle-scoped renderCatList.
openRecommendBox(){
const box=document.getElementById('sparepartRecommendBox');
if(!box)return;
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
if(!vid){toast('⚠️ Pilih kendaraan dulu di atas');return;}
const reko=Sparepart.recommendCategories(vid);
box.classList.remove('u-dnone');
if(!reko.ok){box.innerHTML='<div class="u-fs12 u-t2">'+escapeHtml(reko.reason)+'</div>';return;}
if(!reko.all.length){box.innerHTML='<div class="u-fs12 u-t2">🤖 Semua kategori rekomendasi utk "'+escapeHtml(reko.vehicleName)+'" sudah ada di daftar kategori kendaraan ini.</div>';return;}
const rows=reko.all.map((r,i)=>{
const badge=r.tier==='manual'
?'<span class="u-fs11 u-fw700 u-r6" style="padding:2px 7px;background:var(--accent3-soft,rgba(80,180,120,.12));color:var(--accent3,#3fa66f)">📖 Buku manual</span>'
:r.tier==='history'
?'<span class="u-fs11 u-fw700 u-r6" style="padding:2px 7px;background:var(--accent-soft);color:var(--accent)">📝 Riwayat servis</span>'
:'<span class="u-fs11 u-fw700 u-r6" style="padding:2px 7px;background:var(--surface3);color:var(--text2)">🤖 Estimasi umum</span>';
const histNote=(r.tier!=='history'&&r.history&&r.history.count>0)
?`<div style="font-size:11px;color:var(--accent3,#3fa66f);margin-top:2px">📝 Sudah dicatat ${r.history.count}x di riwayat servis kendaraan ini`+((r.history.avgKm&&Math.abs(r.history.avgKm-r.intervalKm)>=100)?` — rata-rata polamu tiap ~${r.history.avgKm.toLocaleString('id-ID')} km`:'')+`</div>`
:'';
return `<label style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">`
+`<input type="checkbox" class="sparepartRecoChk" data-idx="${i}" checked style="width:16px;height:16px;margin-top:2px;accent-color:var(--accent)">`
+`<span style="flex:1"><div style="font-size:13px;font-weight:600">${escapeHtml(r.name)} ${badge}</div>`
+`<div style="font-size:11px;color:var(--text2);margin-top:2px;line-height:1.5">Setiap ${r.intervalKm.toLocaleString('id-ID')} km — ${escapeHtml(r.source||'')}</div>${histNote}</span>`
+`</label>`;
}).join('');
box.innerHTML=`<div class="u-fs12 u-t2 u-mb8">💡 Rekomendasi kategori servis rutin utk <b>${escapeHtml(reko.vehicleName)}</b>. Kategori dgn badge 📖 diambil dari buku manual pabrikan yg sudah tersimpan; badge 📝 berarti sudah sering dicatat manual di riwayat servis kendaraan ini (interval dihitung dari pola KM aslimu); badge 🤖 adalah estimasi umum (bukan data pabrikan spesifik) — sesuaikan lagi kalau ada data resminya. Uncheck yg tidak perlu, lalu tambahkan.</div>`
+`<div id="sparepartRecoList">${rows}</div>`
+`<button type="button" class="btn btn-primary btn-full btn-sm u-mt10" data-action="Sparepart.commitRecommend">✅ Tambahkan yang Dicentang</button>`
+`<button type="button" class="btn btn-ghost btn-full btn-sm u-mt8" data-action="Sparepart.closeRecommendBox">✕ Tutup</button>`;
Sparepart._recoCache=reko.all;
},
closeRecommendBox(){
const box=document.getElementById('sparepartRecommendBox');
if(!box)return;
box.classList.add('u-dnone');
box.innerHTML='';
Sparepart._recoCache=null;
},
commitRecommend(){
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
if(!vid||!Array.isArray(Sparepart._recoCache)){toast('⚠️ Rekomendasi sudah tidak tersedia, buka ulang');return;}
const checks=Array.from(document.querySelectorAll('.sparepartRecoChk'));
const chosen=checks.filter(c=>c.checked).map(c=>Sparepart._recoCache[parseInt(c.dataset.idx,10)]).filter(Boolean);
if(!chosen.length){toast('⚠️ Belum ada yang dicentang');return;}
let added=0;
chosen.forEach((r,idx)=>{
const already=D.sparepartCats.some(c=>catVisibleForVehicle(c,vid)&&c.name.trim().toLowerCase()===r.name.trim().toLowerCase());
if(already)return;
const compId=resolveCanonicalServiceComponent(r.name,null);
const compRef=compId&&typeof ServiceInputCatalog!=='undefined'?ServiceInputCatalog.itemById(compId):null;
const _sotRecoCat={id:'sp_'+Date.now()+'_reko_'+idx,name:r.name,code:codeFromName(r.name),intervalKm:r.intervalKm,showInReminder:true,vehicleId:vid,group:r.group,groupIcon:r.groupIcon,masterCategoryId:compRef&&compRef.group?compRef.group.masterCategoryId:null,serviceComponentId:compId||null}; if(typeof VehicleCarNotesSOT!=='undefined'&&VehicleCarNotesSOT&&typeof VehicleCarNotesSOT.syncLegacyCategoryProjection==='function')VehicleCarNotesSOT.syncLegacyCategoryProjection(_sotRecoCat,'recommendation-create'); D.sparepartCats.push(_sotRecoCat);
added++;
});
save();
Sparepart.closeRecommendBox();
Sparepart.renderCatList();
if(typeof renderServisList==='function')renderServisList();
if(typeof renderDashboardServisReminder==='function')renderDashboardServisReminder();
toast('✅ '+added+' kategori rekomendasi ditambahkan');
},
toggleShowInReminder(catId){
const cat=D.sparepartCats.find(c=>c.id===catId);
if(!cat)return;
if(!(cat.intervalKm>0)){
toast('⚠️ Isi dulu Interval Servis (KM) kategori ini sebelum ditampilkan di Pengingat');
Sparepart.openCatModalById(catId);
return;
}
cat.showInReminder=cat.showInReminder===false?true:false;
if(typeof VehicleCarNotesSOT!=='undefined'&&VehicleCarNotesSOT&&typeof VehicleCarNotesSOT.syncLegacyCategoryProjection==='function')VehicleCarNotesSOT.syncLegacyCategoryProjection(cat,'reminder-toggle');
save();Sparepart.renderCatList();renderServisList();renderDashboardServisReminder();
toast(cat.showInReminder===false?'🙈 "'+cat.name+'" disembunyikan dari Pengingat Servis':'🔔 "'+cat.name+'" ditampilkan lagi di Pengingat Servis');
},
populateVehicleSelect(elId,currentValue,isEdit){
const sel=document.getElementById(elId);
if(!sel)return;
sel.innerHTML='<option value="">🌐 Semua kendaraan</option>'+D.vehicles.map(v=>`<option value="${v.id}">${v.emoji||'🏍️'} ${escapeHtml(v.name)}</option>`).join('');
const hintId=elId==='sparepartVehicleId'?'sparepartVehicleHint':'stockVehicleHint';
const hintEl=document.getElementById(hintId);
if(isEdit){
const curValid=currentValue&&D.vehicles.some(v=>v.id===currentValue);
sel.value=curValid?currentValue:'';
sel.disabled=false;
if(hintEl){
const veh=curValid?D.vehicles.find(v=>v.id===currentValue):null;
hintEl.textContent=veh?`✏️ Khusus kendaraan: ${veh.emoji||'🏍️'} ${veh.name} — bisa dipindah manual`:'✏️ Berlaku "🌐 Semua kendaraan" — bisa dipindah manual ke kendaraan tertentu';
}
return;
}
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:'';
const vidValid=vid&&D.vehicles.some(v=>v.id===vid);
sel.value=vidValid?vid:'';
sel.disabled=true;
if(hintEl){
const veh=vidValid?D.vehicles.find(v=>v.id===vid):null;
hintEl.textContent=veh?`🔒 Otomatis khusus kendaraan tab aktif: ${veh.emoji||'🏍️'} ${veh.name}`:'🔒 Otomatis "🌐 Semua kendaraan" (tidak ada kendaraan aktif dipilih di tab atas)';
}
},
ensureIntervalBulanField(){
let el=document.getElementById('sparepartIntervalBulan');
if(el)return el;
const anchor=document.getElementById('sparepartInterval');
if(!anchor||!anchor.parentNode)return null;
const wrap=document.createElement('div');
wrap.className='u-mt8';
wrap.innerHTML='<label class="u-fs12 u-t2 u-mb4" style="display:block">Interval Waktu (Bulan, opsional)</label>'
+'<input type="number" id="sparepartIntervalBulan" class="input" placeholder="mis. 6 (Minyak Rem, Aki, dll)" min="0">';
const host=anchor.closest('.u-mt8')||anchor.parentNode;
host.parentNode.insertBefore(wrap,host.nextSibling);
return document.getElementById('sparepartIntervalBulan');
},
populateGroupSelect(currentGroup,currentIcon){
const sel=document.getElementById('sparepartGroupId');
if(!sel)return;
const known=collectKnownGroups();
if(currentGroup&&!known.some(g=>g.group===currentGroup)){
known.push({group:currentGroup,icon:currentIcon||iconForGroupName(currentGroup)});
}
sel.innerHTML='<option value="">🤖 Otomatis</option>'
+known.map(g=>`<option value="${escapeHtml(g.group)}">${g.icon} ${escapeHtml(g.group)}</option>`).join('');
sel.value=currentGroup||'';
const clearTransient=()=>{if(typeof hideSuggestBox==='function'){hideSuggestBox('sparepartNameBox');hideSuggestBox('sparepartCodeBox');}};
sel.onfocus=clearTransient;
sel.onpointerdown=clearTransient;
},
openCatModal(idx){
if(typeof idx==='number'&&idx>=0&&idx<D.sparepartCats.length){
  return Sparepart.openCatModalById(D.sparepartCats[idx].id);
}
return Sparepart.openCatModalById(null);
},
openCatModalById(catId){
const staleSuggestIds=['sparepartNameBox','sparepartCodeBox','sparepartAiSuggestBox'];
staleSuggestIds.forEach(id=>{const el=document.getElementById(id);if(el){el.innerHTML='';if(id==='sparepartAiSuggestBox')el.classList.add('u-dnone');}});
if(typeof hideSuggestBox==='function'){hideSuggestBox('sparepartNameBox');hideSuggestBox('sparepartCodeBox');}
const normalizedId=catId===null||catId===undefined||catId===''?null:String(catId);
const idx=normalizedId===null?null:D.sparepartCats.findIndex(c=>c&&String(c.id)===normalizedId);
if(normalizedId!==null&&idx<0){toast('⚠️ Kategori sparepart tidak ditemukan');return false;}
Sparepart.catEditId=normalizedId;
Sparepart.catEditIdx=idx;
const isEdit=normalizedId!==null;
document.getElementById('sparepartModalTitle').textContent=isEdit?'Edit Kategori Sparepart':'Tambah Kategori Sparepart';
document.getElementById('sparepartName').value=isEdit?D.sparepartCats[Sparepart.catEditIdx].name:'';
const codeEl=document.getElementById('sparepartCode');
codeEl.value=isEdit?(D.sparepartCats[Sparepart.catEditIdx].code||codeFromName(D.sparepartCats[Sparepart.catEditIdx].name)):'';
codeEl.dataset.manual=isEdit?'1':'0';
codeEl.oninput=()=>{codeEl.dataset.manual='1';};
const curCat=isEdit?D.sparepartCats[Sparepart.catEditIdx]:null;
document.getElementById('sparepartInterval').value=(curCat&&curCat.intervalKm>0)?curCat.intervalKm:'';
const bulanEl=Sparepart.ensureIntervalBulanField();
if(bulanEl)bulanEl.value=(curCat&&curCat.intervalBulan>0)?curCat.intervalBulan:'';
Sparepart.populateVehicleSelect('sparepartVehicleId',curCat?curCat.vehicleId:null,isEdit);
Sparepart.populateGroupSelect(curCat?curCat.group:null,curCat?curCat.groupIcon:null);
const catMasterEl=document.getElementById('sparepartMasterCategoryId');
const catCompEl=document.getElementById('sparepartServiceComponentId');
if(catMasterEl&&typeof ServiceInputCatalog!=='undefined'){const groups=ServiceInputCatalog.groups()||[];catMasterEl.innerHTML='<option value="">— Pilih kategori servis —</option>'+groups.map(g=>`<option value="${escapeHtml(g.masterCategoryId)}">${escapeHtml(g.group)}</option>`).join('');}
const catInferred=(typeof ServiceInputCatalog!=='undefined'&&curCat)?ServiceInputCatalog.infer(curCat.name):null;
const catMaster=curCat?.masterCategoryId||(catInferred&&catInferred.group&&catInferred.group.masterCategoryId)||'';
if(catMasterEl)catMasterEl.value=catMaster;
Sparepart.populateServiceComponentSelect('sparepartServiceComponentId',catMaster,curCat?.serviceComponentId||(catInferred&&catInferred.item&&catInferred.item.id)||'');
Sparepart.updateMasterCatBadge(curCat?curCat.name:'',curCat?curCat.vehicleId:(typeof curVehicleId!=='undefined'?curVehicleId:null));
const showRemEl=document.getElementById('sparepartShowInReminder');
if(showRemEl)showRemEl.checked=curCat?curCat.showInReminder!==false:true;
if(isEdit){
Sparepart.autoSuggestInterval();
} else {
const aiBoxEl=document.getElementById('sparepartAiSuggestBox');
if(aiBoxEl){aiBoxEl.classList.add('u-dnone');aiBoxEl.innerHTML='';}
}
const sparepartDelBtnEl=document.getElementById('sparepartDelBtn'); if(sparepartDelBtnEl) sparepartDelBtnEl.style.display=isEdit?'':'none';
openModal('sparepartModal');
},
exportCategoryCSV(){
const header='nama,kode,interval_km,interval_bulan,tampil_reminder';
const esc=(v)=>{
const s=String(v==null?'':v);
return /[",\n]/.test(s)?('"'+s.replace(/"/g,'""')+'"'):s;
};
const lines=[header].concat(D.sparepartCats.map(c=>[
esc(c.name),
esc(c.code||''),
esc(c.intervalKm>0?c.intervalKm:''),
esc(c.intervalBulan>0?c.intervalBulan:''),
esc(c.showInReminder===false?'tidak':'ya'),
].join(',')));
const blob=new Blob([lines.join('\n')],{type:'text/csv'});
const url=URL.createObjectURL(blob);
const a=document.createElement('a');
a.href=url;
a.download='kategori-sparepart-'+new Date().toISOString().split('T')[0]+'.csv';
a.click();
if(typeof a.remove==='function')a.remove();else if(a.parentNode&&typeof a.parentNode.removeChild==='function')a.parentNode.removeChild(a);
if(typeof URL.revokeObjectURL==='function')setTimeout(()=>URL.revokeObjectURL(url),0);
return lines.length-1;
}
};
if (typeof normalizeLegacyServiceLogs === 'function') window.normalizeLegacyServiceLogs = normalizeLegacyServiceLogs;
if (typeof Sparepart !== 'undefined') window.Sparepart = Sparepart;
