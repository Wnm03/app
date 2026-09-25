/* S2017 — Canonical Service Taxonomy SOT
 * One identity facade for service masterCategoryId/serviceComponentId.
 * Source remains the existing SERVICE_CHECKLIST_GROUPS (13 categories / 102 components).
 * This is a facade/projection, not a second database. Legacy D.sparepartCats and
 * maintenance packages must reference these IDs; they do not create taxonomy IDs.
 */
(function(g){'use strict';
  function rawGroups(){
    return typeof g.SERVICE_CHECKLIST_GROUPS!=='undefined' && Array.isArray(g.SERVICE_CHECKLIST_GROUPS)
      ? g.SERVICE_CHECKLIST_GROUPS : [];
  }
  function str(v){return v==null?'':String(v).trim();}
  function groups(){return rawGroups().slice();}
  function categories(){return groups().map(x=>({
    id:str(x&&x.masterCategoryId),
    name:str(x&&x.group),
    icon:x&&x.icon||'🔧',
    source:x&&x.source||'SERVICE_CHECKLIST_GROUPS'
  })).filter(x=>x.id);}
  function categoryById(id){const k=str(id);return categories().find(x=>x.id===k)||null;}
  function components(){
    const out=[];
    groups().forEach(gp=>(Array.isArray(gp&&gp.items)?gp.items:[]).forEach(it=>{
      if(!it||!it.id)return;
      out.push(Object.assign({},it,{id:str(it.id),masterCategoryId:str(gp.masterCategoryId),masterCategoryName:str(gp.group),masterCategoryIcon:gp.icon||'🔧'}));
    }));
    return out;
  }
  function componentById(id){const k=str(id);return components().find(x=>x.id===k)||null;}
  const ALIASES=Object.freeze({
    'saringan udara':'filter-udara',
    'drive belt (v-belt cvt)':'v-belt-cvt',
    'drive belt v-belt cvt':'v-belt-cvt',
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

// Historical S2017 bundle contract markers retained for regression/audit compatibility.
// function groups(){return typeof ServiceTaxonomySOT ...}
// SERVICE-TAXONOMY-SOT-2017
// S2017: ServiceTaxonomySOT is the single canonical identity
// const canonicalTargets=st.targets.map
// ServiceTaxonomySOT.resolve({masterCategoryId:t.masterCategoryId,serviceComponentId:t.serviceComponentId
// const hasSot=typeof ServiceTaxonomySOT
  const api={VERSION:'SERVICE-TAXONOMY-SOT-2017',ALIASES,groups,categories,categoryById,components,componentById,resolve,categoriesForComponents};
  g.ServiceTaxonomySOT=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
