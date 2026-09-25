'use strict';
/**
 * Canonical component identity resolver for Service History / Reminder.
 *
 * Rules:
 * - explicit serviceComponentId wins when present;
 * - checklist evidence may contain multiple components and is never reduced to
 *   checklist[0];
 * - a component-scoped query matches only the requested component;
 * - without a requested component, a multi-component row is intentionally
 *   ambiguous and returns no single owner;
 * - name inference is allowed only when no canonical component evidence exists.
 */
(function(global){
  const str=v=>v==null?'':String(v).trim();
  const arr=v=>Array.isArray(v)?v:[];
  function catalog(id){
    if(!id||!global.ServiceInputCatalog||typeof global.ServiceInputCatalog.itemById!=='function')return null;
    try{const hit=global.ServiceInputCatalog.itemById(id);return hit&&hit.item?hit:null;}catch(_e){return null;}
  }
  function infer(name){
    if(!name||!global.ServiceInputCatalog||typeof global.ServiceInputCatalog.infer!=='function')return null;
    try{const hit=global.ServiceInputCatalog.infer(name);return hit&&hit.item?hit:null;}catch(_e){return null;}
  }
  function evidence(log){
    const l=log||{}, out=[], seen=new Set();
    const push=(id,master,source,name)=>{
      const cid=str(id); if(!cid||seen.has(cid))return;
      let mid=str(master); const hit=catalog(cid);
      if(hit&&hit.group&&hit.group.masterCategoryId)mid=str(hit.group.masterCategoryId);
      else if(hit&&hit.item&&hit.item.masterCategoryId)mid=str(hit.item.masterCategoryId);
      seen.add(cid); out.push({serviceComponentId:cid,masterCategoryId:mid,source,itemName:str(name||l.item)});
    };
    push(l.serviceComponentId||l.componentId,l.masterCategoryId,'history',l.item);
    push(l.checklistItemId,l.masterCategoryId,'history.checklistItemId',l.item);
    arr(l.checklist).forEach((row,i)=>push(row&&(row.serviceComponentId||row.itemId),row&&row.masterCategoryId,'checklist['+i+']',row&&(row.itemName||row.name)));
    return out;
  }
  function ids(log){return evidence(log).map(x=>x.serviceComponentId);}
  function resolve(log,opts){
    const l=log||{}, o=opts||{}, requested=str(o.componentId||o.serviceComponentId);
    const ev=evidence(l);
    if(requested){
      const hit=ev.find(x=>x.serviceComponentId===requested);
      if(hit)return {serviceComponentId:hit.serviceComponentId,masterCategoryId:hit.masterCategoryId||str(l.masterCategoryId),source:hit.source,ambiguous:false,evidence:ev};
      return {serviceComponentId:null,masterCategoryId:str(l.masterCategoryId),source:'mismatch',ambiguous:false,evidence:ev};
    }
    if(ev.length===1)return {serviceComponentId:ev[0].serviceComponentId,masterCategoryId:ev[0].masterCategoryId||str(l.masterCategoryId),source:ev[0].source,ambiguous:false,evidence:ev};
    if(ev.length>1)return {serviceComponentId:null,masterCategoryId:str(l.masterCategoryId),source:'ambiguous',ambiguous:true,evidence:ev};
    const hit=infer(l.item||'');
    if(hit&&hit.item&&hit.item.id)return {serviceComponentId:str(hit.item.id),masterCategoryId:str(hit.group&&hit.group.masterCategoryId||hit.item.masterCategoryId||l.masterCategoryId),source:'inferred-name',ambiguous:false,evidence:ev};
    return {serviceComponentId:null,masterCategoryId:str(l.masterCategoryId),source:'none',ambiguous:false,evidence:ev};
  }
  function matches(log,componentId){
    const cid=str(componentId); if(!cid)return false;
    return ids(log).includes(cid);
  }
  const api=Object.freeze({version:'S2031-COMPONENT-IDENTITY-1',evidence,ids,resolve,matches});
  global.ServiceHistoryComponentIdentitySOT=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
