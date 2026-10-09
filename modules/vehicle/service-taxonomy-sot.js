/* S2017 — Canonical Service Taxonomy SOT
 * One identity facade for service masterCategoryId/serviceComponentId.
 * Source remains the existing SERVICE_CHECKLIST_GROUPS (13 categories / 102 components).
 * This is a facade/projection, not a second database. Legacy D.sparepartCats and
 * maintenance packages must reference these IDs; they do not create taxonomy IDs.
 */
(function(g){'use strict';
  function rawGroups(){
    if(Array.isArray(g.SERVICE_CHECKLIST_GROUPS)) return g.SERVICE_CHECKLIST_GROUPS;
    if(Array.isArray(g.__SERVICE_CHECKLIST_GROUPS__)) return g.__SERVICE_CHECKLIST_GROUPS__;
    return [];
  }
  function str(v){return v==null?'':String(v).trim();}
  function groups(){return rawGroups().slice();}
  // S2288 PERF: categories()/components()/componentById()/categoryById() dulu membangun ulang
  // seluruh daftar (clone Object.assign per item) di SETIAP panggilan -- dipanggil per log servis
  // x per kategori x per kendaraan saat render Car Notes/Dashboard (hotspot #1, lihat
  // AUDIT-S2288-PERFORMA-BOOT-NAV-DASHBOARD-CARNOTES.md). Sekarang di-cache dan divalidasi lewat
  // identitas array sumber + jumlah grup/item; invalidate() tersedia utk tes/mutasi eksplisit.
  // Hasil cache dibagi-pakai (READ-ONLY) -- semua pemanggil existing hanya membaca (map/find/forEach).
  let _src=null,_sig=-1,_cats=null,_catMap=null,_comps=null,_compMap=null;
  function _signature(r){let n=r.length;for(let i=0;i<r.length;i++){const g=r[i];n+=(g&&Array.isArray(g.items)?g.items.length:0)*31+(g&&g.masterCategoryId?String(g.masterCategoryId).length:0);}return n;}
  function _fresh(){
    const r=rawGroups();const sig=_signature(r);
    if(r!==_src||sig!==_sig){_src=r;_sig=sig;_cats=null;_catMap=null;_comps=null;_compMap=null;}
  }
  function invalidate(){_src=null;_sig=-1;_cats=null;_catMap=null;_comps=null;_compMap=null;}
  function categories(){
    _fresh();
    if(_cats)return _cats;
    _cats=groups().map(x=>({
      id:str(x&&x.masterCategoryId),
      name:str(x&&x.group),
      icon:x&&x.icon||'🔧',
      source:x&&x.source||'SERVICE_CHECKLIST_GROUPS'
    })).filter(x=>x.id);
    _catMap=new Map();_cats.forEach(c=>{if(!_catMap.has(c.id))_catMap.set(c.id,c);});
    return _cats;
  }
  function categoryById(id){const k=str(id);categories();return _catMap.get(k)||null;}
  function components(){
    _fresh();
    if(_comps)return _comps;
    const out=[];
    groups().forEach(gp=>(Array.isArray(gp&&gp.items)?gp.items:[]).forEach(it=>{
      if(!it||!it.id)return;
      out.push(Object.assign({},it,{id:str(it.id),masterCategoryId:str(gp.masterCategoryId),masterCategoryName:str(gp.group),masterCategoryIcon:gp.icon||'🔧'}));
    }));
    _comps=out;
    _compMap=new Map();out.forEach(c=>{if(!_compMap.has(c.id))_compMap.set(c.id,c);});
    return _comps;
  }
  function componentById(id){const k=str(id);components();return _compMap.get(k)||null;}
  const ALIASES=Object.freeze({
    'saringan udara':'filter-udara',
    'drive belt (v-belt cvt)':'v-belt-cvt',
    'drive belt v-belt cvt':'v-belt-cvt',
    'v-belt (cvt)':'v-belt-cvt',
    'v belt (cvt)':'v-belt-cvt',
    'v-belt cvt':'v-belt-cvt',
    'aki (cek/ganti)':'aki',
    'aki cek/ganti':'aki',
    'cairan pendingin radiator (coolant)':'coolant',
    'oli gardan/transmisi':'oli-gardan',
    'oli gardan / transmisi':'oli-gardan'
  });
  function resolve(input){
    if(!input)return null;
    const preferred=str(input.serviceComponentId||input.componentId||input.itemId);
    if(preferred){const hit=componentById(preferred);if(hit)return {masterCategoryId:hit.masterCategoryId,serviceComponentId:hit.id,category:categoryById(hit.masterCategoryId),component:hit};}
    const master=str(input.masterCategoryId||'');
    const name=str(input.name||input.item||input.componentName);
    if(name){
      const n=name.toLowerCase();
      const aliasId=ALIASES[n];
      const alias=aliasId&&componentById(aliasId);
      if(alias&&(!master||alias.masterCategoryId===master))return {masterCategoryId:alias.masterCategoryId,serviceComponentId:alias.id,category:categoryById(alias.masterCategoryId),component:alias,alias:true};
      const exact=components().find(x=>str(x.name).toLowerCase()===n && (!master||x.masterCategoryId===master));
      if(exact)return {masterCategoryId:exact.masterCategoryId,serviceComponentId:exact.id,category:categoryById(exact.masterCategoryId),component:exact};
    }
    if(master){const c=categoryById(master);if(c)return {masterCategoryId:c.id,serviceComponentId:'',category:c,component:null};}
    return null;
  }
  function categoriesForComponents(ids){
    const set=new Set((Array.isArray(ids)?ids:[ids]).map(str).filter(Boolean));
    const seen=new Set(),out=[];
    components().forEach(c=>{if(set.has(c.id)&&!seen.has(c.masterCategoryId)){seen.add(c.masterCategoryId);const cat=categoryById(c.masterCategoryId);if(cat)out.push(cat);}});
    return out;
  }
  function canonicalTarget(input){
    const r=resolve(input||{});
    if(!r)return null;
    return {
      masterCategoryId:str(r.masterCategoryId)||null,
      serviceComponentId:str(r.serviceComponentId)||null,
      categoryName:r.category&&str(r.category.name)||null,
      componentName:r.component&&str(r.component.name)||null,
      canonical:true,
      alias:!!r.alias
    };
  }
  function targetKey(input){
    const r=canonicalTarget(input)||{};
    return [str(r.masterCategoryId),str(r.serviceComponentId)].join('|');
  }
  function assertCanonical(input){
    const r=canonicalTarget(input);
    return {ok:!!r&&!!r.serviceComponentId,reason:r?'canonical':'unresolved',target:r};
  }

// Historical S2017 bundle contract markers retained for regression/audit compatibility.
// function groups(){return typeof ServiceTaxonomySOT ...}
// SERVICE-TAXONOMY-SOT-2017
// S2017: ServiceTaxonomySOT is the single canonical identity
// const canonicalTargets=st.targets.map
// ServiceTaxonomySOT.resolve({masterCategoryId:t.masterCategoryId,serviceComponentId:t.serviceComponentId
// const hasSot=typeof ServiceTaxonomySOT
  const api={VERSION:'SERVICE-TAXONOMY-SOT-2017',ALIASES,invalidate,groups,categories,categoryById,components,componentById,resolve,canonicalTarget,targetKey,assertCanonical,categoriesForComponents};
  g.ServiceTaxonomySOT=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
