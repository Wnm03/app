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
  // S2710: tolerate legacy/imported category labels without fuzzy substring matching.
  // Parenthetical notes and common brand/spec suffixes are presentation metadata.
  function componentAlias(v){
    let q=norm(v).replace(/[（(][^）)]*[）)]/g,' ').replace(/[\s_-]+/g,' ').trim();
    q=q.replace(/\b(ngk|denso|iridium|10w\s*[- ]?\s*30|10w\s*[- ]?\s*40|5w\s*[- ]?\s*30|5w\s*[- ]?\s*40)\b.*$/i,'').replace(/\s+/g,' ').trim();
    // S2712: compact spaces for alias identity (e.g. "Slidepiece CVT" vs "Slide Piece CVT").
    return q.replace(/\s+/g,'');
  }
  const num=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:null;};

  // S2702 (perf, TANPA ubah kontrak): sebelumnya setiap catalogById()/
  // exactNameCandidates() membangun ulang seluruh katalog (flatMap + salinan
  // Object.assign per item). Satu render tab Insight memanggilnya ±3.000x
  // (~350 ms). Kini snapshot + indeks id/nama dibangun SEKALI per "bentuk"
  // katalog dan dipakai ulang; tiap pemanggil tetap menerima SALINAN BARU
  // (mutasi hasil tidak bocor), urutan pencarian (pertama-cocok / urutan
  // katalog) dan perilaku error (-> []) identik dengan implementasi lama.
  // Invalidasi otomatis: signature = referensi array groups(), jumlah grup,
  // serta referensi + panjang items tiap grup (13 langkah, murah).
  function buildCatalogItems(gs){
    return gs.flatMap(g=>(g&&g.items)||[]).map(it=>Object.assign({},it,{masterCategoryId:it.masterCategoryId||(it.group&&it.group.masterCategoryId)||null}));
  }
  let _snap=null;
  function catalogSnapshot(){
    const S=global.ServiceInputCatalog;
    if(!(S&&typeof S.groups==='function'))return null;
    let gs;
    try{ gs=S.groups()||[]; }catch{ return {items:[],byId:new Map(),byName:new Map(),uncached:true}; }
    if(!Array.isArray(gs)){
      try{ const items=buildCatalogItems(gs); return {items,byId:null,byName:null,uncached:true}; }catch{ return {items:[],byId:new Map(),byName:new Map(),uncached:true}; }
    }
    const refs=new Array(gs.length), lens=new Array(gs.length); let simple=true;
    for(let i=0;i<gs.length;i++){
      const g=gs[i], arr=(g&&g.items)||[];
      if(!Array.isArray(arr)){simple=false;break;}
      refs[i]=arr; lens[i]=arr.length;
    }
    if(!simple){
      try{ return {items:buildCatalogItems(gs),byId:null,byName:null,uncached:true}; }catch{ return {items:[],byId:new Map(),byName:new Map(),uncached:true}; }
    }
    const c=_snap;
    if(c&&c.gs===gs&&c.n===gs.length){
      let same=true;
      for(let i=0;i<gs.length;i++){ if(c.refs[i]!==refs[i]||c.lens[i]!==lens[i]){same=false;break;} }
      if(same)return c;
    }
    let items;
    try{ items=buildCatalogItems(gs); }catch{ _snap=null; return {items:[],byId:new Map(),byName:new Map(),uncached:true}; }
    const byId=new Map(), byName=new Map();
    items.forEach(it=>{
      const k=str(it.id); if(!byId.has(k))byId.set(k,it);
      const q=norm(it.name); const a=byName.get(q); if(a)a.push(it); else byName.set(q,[it]);
    });
    _snap={gs,n:gs.length,refs,lens,items,byId,byName};
    return _snap;
  }
  const copyItem=it=>Object.assign({},it);
  function catalogItems(){
    const sn=catalogSnapshot();
    return sn?sn.items.map(copyItem):[];
  }
  function catalogById(id){
    const sn=catalogSnapshot(); if(!sn)return null;
    if(sn.byId){ const it=sn.byId.get(str(id)); return it?copyItem(it):null; }
    const f=sn.items.find(it=>str(it.id)===str(id)); return f?copyItem(f):null;
  }
  function exactNameCandidates(name){
    const q=norm(name); if(!q)return [];
    const sn=catalogSnapshot(); if(!sn)return [];
    if(sn.byName){ const a=sn.byName.get(q); return a?a.map(copyItem):[]; }
    return sn.items.filter(it=>norm(it.name)===q).map(copyItem);
  }

  function categoryIdentity(cat){
    const c=cat||{};
    const explicit=str(c.serviceComponentId);
    const item=explicit?catalogById(explicit):null;
    if(item)return {componentId:str(item.id),masterCategoryId:str(item.masterCategoryId),item,evidence:'explicit'};
    let exact=exactNameCandidates(c.name);
    let evidence='exact-name';
    if(!exact.length){
      const alias=componentAlias(c.name);
      if(alias){
        const sn=catalogSnapshot();
        const candidates=(sn?sn.items:[]).filter(it=>componentAlias(it.name)===alias);
        const unique=new Map(candidates.map(it=>[str(it.id),it]));
        exact=Array.from(unique.values()); evidence='normalized-alias';
      }
    }
    if(exact.length===1)return {componentId:str(exact[0].id),masterCategoryId:str(exact[0].masterCategoryId),item:exact[0],evidence};
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
      const info=classifyCategory(c); const alias=componentAlias(c.name||''); const key=info.componentId||(alias?'legacy:'+str(c.vehicleId||vehicleId)+'::'+alias:'legacy:'+str(c.id));
      if(seen.has(key))return; seen.add(key); out.push(c);
    });
    return out;
  }

  const api={version:VERSION,STATUS,catalogItems,catalogById,exactNameCandidates,categoryIdentity,classifyCategory,chooseCanonicalCategory,auditCategories,auditAll,canonicalReminderProjection};
  global.ServiceCategorySOTReconciliationS2007=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
