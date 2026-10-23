'use strict';
/**
 * S2007/S2008 — Canonical sparepart-category reconciliation SoT.
 *
 * READ-ONLY projection by default. It does not rewrite D.sparepartCats and it
 * never invents a component from a fuzzy name. A legacy category is only
 * considered safely linkable when the canonical catalog has one exact-name
 * match and the persisted interval does not conflict with the catalog rule.
 * Interval conflicts remain REVIEW; historical facts are never rewritten.
 */
(function(global){
  const VERSION='S2007-2008-1';
  const STATUS=Object.freeze({
    CANONICAL:'CANONICAL',
    SAFE_EXACT_LINK:'SAFE_EXACT_LINK',
    DUPLICATE:'DUPLICATE',
    REVIEW_INTERVAL_CONFLICT:'REVIEW_INTERVAL_CONFLICT',
    REVIEW_AMBIGUOUS:'REVIEW_AMBIGUOUS',
    REVIEW_NO_CANONICAL:'REVIEW_NO_CANONICAL'
  });
  const str=v=>v==null?'':String(v).trim();
  const norm=v=>str(v).toLowerCase().replace(/\s+/g,' ');
  const num=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:null;};

  function catalogItems(){
    try{
      if(global.ServiceInputCatalog&&typeof global.ServiceInputCatalog.groups==='function'){
        return (global.ServiceInputCatalog.groups()||[]).flatMap(g=>(g&&g.items)||[]).map(it=>Object.assign({},it,{masterCategoryId:it.masterCategoryId||(it.group&&it.group.masterCategoryId)||null}));
      }
    }catch(_e){ return []; }
    return [];
  }
  function catalogById(id){return catalogItems().find(it=>str(it.id)===str(id))||null;}
  function exactNameCandidates(name){const q=norm(name);return q?catalogItems().filter(it=>norm(it.name)===q):[];}

  function categoryIdentity(cat){
    const c=cat||{};
    const explicit=str(c.serviceComponentId);
    const item=explicit?catalogById(explicit):null;
    if(item)return {componentId:str(item.id),masterCategoryId:str(item.masterCategoryId),item,evidence:'explicit'};
    const exact=exactNameCandidates(c.name);
    if(exact.length===1)return {componentId:str(exact[0].id),masterCategoryId:str(exact[0].masterCategoryId),item:exact[0],evidence:'exact-name'};
    if(exact.length>1)return {componentId:null,masterCategoryId:null,item:null,evidence:'ambiguous-name',candidates:exact};
    return {componentId:null,masterCategoryId:str(c.masterCategoryId),item:null,evidence:'none'};
  }

  function intervalConflict(cat,item){
    if(!item)return false;
    const ckm=num(cat&&cat.intervalKm), im=num(item&&item.intervalKm);
    const cb=num(cat&&cat.intervalBulan), ib=num(item&&item.intervalTimeMonths);
    if(ckm!==null&&im!==null&&ckm!==im)return true;
    if(cb!==null&&ib!==null&&cb!==ib)return true;
    return false;
  }

  function classifyCategory(cat){
    const id=categoryIdentity(cat);
    if(id.evidence==='explicit')return {status:STATUS.CANONICAL,category:cat,componentId:id.componentId,masterCategoryId:id.masterCategoryId,item:id.item,evidence:id.evidence,intervalConflict:intervalConflict(cat,id.item)};
    if(id.evidence==='ambiguous-name')return {status:STATUS.REVIEW_AMBIGUOUS,category:cat,componentId:null,masterCategoryId:null,item:null,evidence:id.evidence,candidates:id.candidates||[],intervalConflict:false};
    if(id.evidence==='exact-name'){
      if(intervalConflict(cat,id.item))return {status:STATUS.REVIEW_INTERVAL_CONFLICT,category:cat,componentId:id.componentId,masterCategoryId:id.masterCategoryId,item:id.item,evidence:id.evidence,intervalConflict:true};
      return {status:STATUS.SAFE_EXACT_LINK,category:cat,componentId:id.componentId,masterCategoryId:id.masterCategoryId,item:id.item,evidence:id.evidence,intervalConflict:false};
    }
    return {status:STATUS.REVIEW_NO_CANONICAL,category:cat,componentId:null,masterCategoryId:id.masterCategoryId||null,item:null,evidence:'none',intervalConflict:false};
  }

  function scoreCategory(cat,vehicleId){
    const c=classifyCategory(cat); let score=0;
    // Explicit canonical identity must always outrank an exact-name legacy
    // bridge. Name matching is a migration hint, never stronger than a stored
    // canonical component id.
    if(c.status===STATUS.CANONICAL)score+=1000;
    if(c.status===STATUS.SAFE_EXACT_LINK)score+=800;
    if(c.item&&norm(c.item.name)===norm(cat&&cat.name))score+=40;
    if(str(cat&&cat.vehicleId)===str(vehicleId))score+=20;
    if(c.item&&num(cat&&cat.intervalKm)!==null&&num(c.item.intervalKm)===num(cat.intervalKm))score+=10;
    if(c.item&&num(cat&&cat.intervalBulan)!==null&&num(c.item.intervalTimeMonths)===num(cat.intervalBulan))score+=5;
    return score;
  }

  function chooseCanonicalCategory(categories,vehicleId,componentId){
    const candidates=(categories||[]).filter(c=>c&&categoryIdentity(c).componentId===str(componentId));
    if(!candidates.length)return null;
    return candidates.slice().sort((a,b)=>scoreCategory(b,vehicleId)-scoreCategory(a,vehicleId)||str(a.id).localeCompare(str(b.id)))[0]||null;
  }

  function auditCategories(categories,vehicleId){
    const list=(categories||[]).filter(c=>c&&(!vehicleId||!c.vehicleId||str(c.vehicleId)===str(vehicleId)));
    const rows=list.map(classifyCategory);
    const byComponent=new Map();
    rows.forEach(r=>{if(r.componentId){const a=byComponent.get(r.componentId)||[];a.push(r);byComponent.set(r.componentId,a);}});
    const duplicates=[];
    byComponent.forEach((rs,cid)=>{if(rs.length>1){const survivor=chooseCanonicalCategory(rs.map(x=>x.category),vehicleId,cid);duplicates.push({serviceComponentId:cid,categoryIds:rs.map(x=>x.category.id),survivorId:survivor&&survivor.id||null});rs.forEach(r=>{if(r.category.id!==survivor.id)r.status=STATUS.DUPLICATE;});}});
    const counts={};rows.forEach(r=>{counts[r.status]=(counts[r.status]||0)+1;});
    return {version:VERSION,vehicleId:vehicleId||null,total:list.length,counts,rows,duplicates,ok:true};
  }

  function auditAll(categories,vehicles){
    const vs=Array.isArray(vehicles)&&vehicles.length?vehicles:[null];
    const perVehicle=vs.map(v=>auditCategories(categories,v&&v.id));
    return {version:VERSION,totalCategories:Array.isArray(categories)?categories.length:0,vehicles:perVehicle};
  }

  function canonicalReminderProjection(categories,vehicleId){
    const visible=(categories||[]).filter(c=>c&&(!vehicleId||!c.vehicleId||str(c.vehicleId)===str(vehicleId))&&c.showInReminder!==false);
    const out=[],seen=new Set();
    visible.slice().sort((a,b)=>scoreCategory(b,vehicleId)-scoreCategory(a,vehicleId)||str(a.id).localeCompare(str(b.id))).forEach(c=>{
      const info=classifyCategory(c); const key=info.componentId||'legacy:'+str(c.id);
      if(seen.has(key))return; seen.add(key); out.push(c);
    });
    return out;
  }

  const api={version:VERSION,STATUS,catalogItems,catalogById,exactNameCandidates,categoryIdentity,classifyCategory,chooseCanonicalCategory,auditCategories,auditAll,canonicalReminderProjection};
  global.ServiceCategorySOTReconciliationS2007=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
