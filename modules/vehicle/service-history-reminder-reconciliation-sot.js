'use strict';
/**
 * S2005 — Canonical Service History ↔ Reminder Reconciliation SOT.
 *
 * Read-only. No second store, no migration, no persistence.
 *
 * Purpose: guarantee that the latest history row created by the checklist is
 * eligible to become the reminder baseline even when legacy/top-level identity
 * fields are incomplete. A one-row checklist payload is valid canonical evidence
 * for the history row that owns it.
 */
(function(global){
  const CODES=Object.freeze({
    MATCH:'CANONICAL_MATCH',
    CHECKLIST_MATCH:'CHECKLIST_CANONICAL_MATCH',
    CATEGORY_MATCH:'CATEGORY_MATCH',
    NAME_MATCH:'LEGACY_NAME_MATCH',
    NO_MATCH:'NO_MATCH',
    VEHICLE_MISMATCH:'VEHICLE_MISMATCH',
    COMPONENT_MISMATCH:'COMPONENT_MISMATCH',
    MASTER_CATEGORY_MISMATCH:'MASTER_CATEGORY_MISMATCH',
    CATEGORY_MISMATCH:'CATEGORY_MISMATCH'
  });
  const str=v=>v==null?'':String(v).trim();
  const same=(a,b)=>str(a)!==''&&str(a)===str(b);

  function catalogItem(id){
    if(!id||!global.ServiceInputCatalog||typeof global.ServiceInputCatalog.itemById!=='function')return null;
    try{const hit=global.ServiceInputCatalog.itemById(id);return hit&&hit.item?hit:null;}catch(_e){return null;}
  }
  function inferComponent(name){
    if(!name||!global.ServiceInputCatalog||typeof global.ServiceInputCatalog.infer!=='function')return null;
    try{const hit=global.ServiceInputCatalog.infer(name);return hit&&hit.item?hit:null;}catch(_e){return null;}
  }
  function targetIdentity(target){
    const t=target||{};
    let componentId=str(t.serviceComponentId||t.componentId);
    let masterId=str(t.masterCategoryId);
    let component=componentId?catalogItem(componentId):null;
    if(component){
      const cm=str(component.item.masterCategoryId||(component.group&&component.group.masterCategoryId));
      if(cm)masterId=cm;
    }
    if(!component&&t.name){
      const inf=inferComponent(t.name);
      if(inf){component=inf;componentId=str(inf.item.id||componentId);masterId=str(inf.group&&inf.group.masterCategoryId||masterId);}
    }
    return {vehicleId:str(t.vehicleId),categoryId:str(t.id||t.categoryId),masterCategoryId:masterId,serviceComponentId:componentId,name:str(t.name),component,category:t};
  }

  function historyIdentityEvidence(log){
    const l=log||{};
    const out=[];
    const push=(componentId,masterId,source,itemName)=>{
      const c=str(componentId),m=str(masterId);
      if(!c&&!m)return;
      out.push({serviceComponentId:c,masterCategoryId:m,source,itemName:str(itemName||l.item)});
    };
    push(l.serviceComponentId,l.masterCategoryId,'history',l.item);
    // S2005: checklist row is canonical evidence for the specific history row.
    // The save path stores exactly one owning row in checklist:[row].
    (Array.isArray(l.checklist)?l.checklist:[]).forEach((row,i)=>{
      if(!row)return;
      let componentId=str(row.serviceComponentId||row.itemId);
      let masterId=str(row.masterCategoryId||'');
      if(componentId&&!masterId){const hit=catalogItem(componentId);if(hit)masterId=str(hit.group&&hit.group.masterCategoryId||hit.item&&hit.item.masterCategoryId);}
      if(!componentId&&row.itemName){const inf=inferComponent(row.itemName);if(inf){componentId=str(inf.item.id);masterId=str(inf.group&&inf.group.masterCategoryId||masterId);}}
      push(componentId,masterId,'checklist['+i+']',row.itemName||row.name);
    });
    if(!out.length){
      const inf=inferComponent(l.item);
      if(inf)push(inf.item.id,inf.group&&inf.group.masterCategoryId,'inferred-name',l.item);
    }
    return out;
  }

  function linkedCategory(log){
    const id=str(log&&log.categoryId);
    if(!id||!global.D||!Array.isArray(global.D.sparepartCats))return null;
    const cat=global.D.sparepartCats.find(c=>c&&str(c.id)===id);
    if(cat&&cat.vehicleId&&log&&log.vehicleId&&str(cat.vehicleId)!==str(log.vehicleId))return null;
    return cat||null;
  }

  function match(log,target,opts){
    const l=log||{}, t=targetIdentity(target||{}), vehicleId=str(opts&&opts.vehicleId||l.vehicleId||t.vehicleId);
    if(t.vehicleId&&vehicleId&&t.vehicleId!==vehicleId)return {ok:false,code:CODES.VEHICLE_MISMATCH,reason:CODES.VEHICLE_MISMATCH,evidence:[]};
    const evidence=historyIdentityEvidence(l);
    const linked=linkedCategory(l);
    const targetComp=t.serviceComponentId;
    const targetMaster=t.masterCategoryId;

    // Strongest rule: if the target and a history evidence row both expose a
    // canonical component, exact component identity wins. A stale top-level
    // component must not hide a valid checklist component for the same row.
    if(targetComp){
      const checklistHit=evidence.find(e=>e.source.indexOf('checklist[')===0&&same(e.serviceComponentId,targetComp));
      if(checklistHit)return {ok:true,code:CODES.CHECKLIST_MATCH,reason:'checklist-component-match',evidence,sourceHistoryId:str(l.id),matchedSource:checklistHit.source,identityConflict:evidence.some(e=>e.serviceComponentId&&!same(e.serviceComponentId,targetComp))};
      const direct=evidence.find(e=>same(e.serviceComponentId,targetComp));
      if(direct)return {ok:true,code:CODES.MATCH,reason:'component-match',evidence,sourceHistoryId:str(l.id),matchedSource:direct.source};
      if(evidence.some(e=>e.serviceComponentId))return {ok:false,code:CODES.COMPONENT_MISMATCH,reason:CODES.COMPONENT_MISMATCH,evidence,sourceHistoryId:str(l.id)};
    }

    if(targetMaster){
      const masterHit=evidence.find(e=>same(e.masterCategoryId,targetMaster));
      if(masterHit&&(!targetComp||!evidence.some(e=>e.serviceComponentId)))return {ok:true,code:CODES.MATCH,reason:'master-category-match',evidence,sourceHistoryId:str(l.id),matchedSource:masterHit.source};
      if(evidence.some(e=>e.masterCategoryId)&&!masterHit)return {ok:false,code:CODES.MASTER_CATEGORY_MISMATCH,reason:CODES.MASTER_CATEGORY_MISMATCH,evidence,sourceHistoryId:str(l.id)};
    }

    if(linked){
      const linkedComp=str(linked.serviceComponentId);
      const linkedMaster=str(linked.masterCategoryId);
      if(targetComp&&linkedComp)return same(linkedComp,targetComp)
        ?{ok:true,code:CODES.CATEGORY_MATCH,reason:'linked-category-component-match',evidence,sourceHistoryId:str(l.id),matchedSource:'category'}
        :{ok:false,code:CODES.COMPONENT_MISMATCH,reason:CODES.COMPONENT_MISMATCH,evidence,sourceHistoryId:str(l.id)};
      if(targetMaster&&linkedMaster)return same(linkedMaster,targetMaster)
        ?{ok:true,code:CODES.CATEGORY_MATCH,reason:'linked-category-master-match',evidence,sourceHistoryId:str(l.id),matchedSource:'category'}
        :{ok:false,code:CODES.MASTER_CATEGORY_MISMATCH,reason:CODES.MASTER_CATEGORY_MISMATCH,evidence,sourceHistoryId:str(l.id)};
      if(t.categoryId&&same(l.categoryId,t.categoryId))return {ok:true,code:CODES.CATEGORY_MATCH,reason:'category-id-match',evidence,sourceHistoryId:str(l.id),matchedSource:'category'};
    }

    if(t.categoryId&&same(l.categoryId,t.categoryId))return {ok:true,code:CODES.CATEGORY_MATCH,reason:'category-id-match',evidence,sourceHistoryId:str(l.id),matchedSource:'history.categoryId'};

    const cn=str(t.name).toLowerCase(), item=str(l.item).toLowerCase();
    if(cn&&item&&(item===cn||item.includes(cn)||cn.includes(item)&&item.length>=4)){
      // Fuzzy text is permitted only when canonical identity is unavailable.
      if(!targetComp&&!targetMaster&&!evidence.some(e=>e.serviceComponentId||e.masterCategoryId))return {ok:true,code:CODES.NAME_MATCH,reason:'legacy-name-match',evidence,sourceHistoryId:str(l.id),matchedSource:'item'};
    }
    return {ok:false,code:CODES.NO_MATCH,reason:CODES.NO_MATCH,evidence,sourceHistoryId:str(l.id)};
  }

  function parseDate(v){
    const m=str(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(m){const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));return d.getFullYear()===Number(m[1])&&d.getMonth()===Number(m[2])-1&&d.getDate()===Number(m[3])?d:null;}
    const d=new Date(v);return Number.isNaN(d.getTime())?null:d;
  }
  function compareRecency(a,b){
    const da=parseDate(a&&a.date),db=parseDate(b&&b.date); const av=!!da,bv=!!db;
    if(av!==bv)return av?-1:1;
    if(av){const d=db-da;if(d)return d;}
    const ak=Number(a&&a.km),bk=Number(b&&b.km),akv=Number.isFinite(ak),bkv=Number.isFinite(bk);
    if(akv!==bkv)return akv?-1:1;
    if(akv&&bk!==ak)return bk-ak;
    const at=Date.parse(a&&(a.updatedAt||a.createdAt||a.timestamp)),bt=Date.parse(b&&(b.updatedAt||b.createdAt||b.timestamp));
    if(Number.isFinite(at)||Number.isFinite(bt)){const x=Number.isFinite(at)?at:-Infinity,y=Number.isFinite(bt)?bt:-Infinity;if(y!==x)return y-x;}
    return str(b&&b.id).localeCompare(str(a&&a.id));
  }
  function latest(logs,target,opts){
    const rows=(Array.isArray(logs)?logs:[]).filter(l=>match(l,target,opts).ok);
    rows.sort(compareRecency);
    return rows[0]||null;
  }
  function audit(logs,target,opts){
    const rows=Array.isArray(logs)?logs:[]; const result=rows.map(log=>({id:str(log&&log.id),match:match(log,target,opts)}));
    return {total:rows.length,matches:result.filter(x=>x.match.ok).length,mismatches:result.filter(x=>!x.match.ok).length,rows};
  }
  const api={version:'S2005-1',CODES,targetIdentity,historyIdentityEvidence,match,compareRecency,latest,audit};
  global.ServiceHistoryReminderReconciliationSOT=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
