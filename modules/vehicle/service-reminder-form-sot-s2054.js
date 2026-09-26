/* S2054 — Reminder → Service Form SOT.
 * One reminder target resolves to one canonical ServiceInputCatalog category + component.
 * UI/form navigation never creates a second reminder/category identity.
 */
(function(g){'use strict';
  if(g.__SERVICE_REMINDER_FORM_SOT_S2054__)return;
  g.__SERVICE_REMINDER_FORM_SOT_S2054__=true;
  const VERSION='SERVICE-REMINDER-FORM-SOT-S2054';
  const str=v=>v==null?'':String(v).trim();
  function resolve(cat,vehicleId){
    const c=cat||{}; const inputMaster=str(c.masterCategoryId); let master=inputMaster, cid=str(c.serviceComponentId), categoryName='', componentName='';
    let hit=null;
    if(cid&&g.ServiceInputCatalog&&typeof g.ServiceInputCatalog.itemById==='function'){
      try{hit=g.ServiceInputCatalog.itemById(cid)||null;}catch(_e){/* catalog lookup is optional during early boot */}
    }
    if(hit&&hit.item){
      cid=str(hit.item.id)||cid;
      master=str(hit.group&&hit.group.masterCategoryId||hit.item.masterCategoryId||master);
      componentName=str(hit.item.name||hit.item.label);
      categoryName=str(hit.group&&hit.group.group);
    }
    if((!cid||!master)&&g.ServiceInputCatalog&&typeof g.ServiceInputCatalog.infer==='function'&&c.name){
      try{
        const inf=g.ServiceInputCatalog.infer(c.name);
        if(inf&&inf.item){
          hit=hit||inf; cid=cid||str(inf.item.id); master=master||str(inf.group&&inf.group.masterCategoryId||inf.item.masterCategoryId);
          componentName=componentName||str(inf.item.name||inf.item.label); categoryName=categoryName||str(inf.group&&inf.group.group);
        }
      }catch(_e){/* catalog lookup is optional during early boot */}
    }
    if(!categoryName&&master&&g.ServiceInputCatalog&&typeof g.ServiceInputCatalog.groupById==='function'){
      try{const group=g.ServiceInputCatalog.groupById(master);if(group)categoryName=str(group.group);}catch(_e){/* catalog lookup is optional during early boot */}
    }
    if(!componentName&&cid&&g.ServiceInputCatalog&&typeof g.ServiceInputCatalog.itemById==='function'){
      try{const x=g.ServiceInputCatalog.itemById(cid);if(x&&x.item)componentName=str(x.item.name||x.item.label);}catch(_e){/* catalog lookup is optional during early boot */}
    }
    if(!componentName)componentName=str(c.name||c.componentName);
    if(!categoryName)categoryName=str(c.categoryName||'');
    return {version:VERSION,vehicleId:vehicleId||null,categoryId:c.id||null,inputMasterCategoryId:inputMaster||null,masterCategoryId:master||null,categoryName:categoryName||null,serviceComponentId:cid||null,componentName:componentName||null,source:hit?'canonical':'legacy'};
  }
  function assert(cat,vehicleId){
    const r=resolve(cat,vehicleId); const issues=[];
    if(r.inputMasterCategoryId&&r.masterCategoryId&&String(r.inputMasterCategoryId)!==String(r.masterCategoryId))issues.push('category-component-mismatch');
    if(!r.masterCategoryId)issues.push('master-category-missing');
    if(!r.serviceComponentId)issues.push('service-component-missing');
    if(r.serviceComponentId&&!r.componentName)issues.push('component-name-missing');
    if(r.masterCategoryId&&!r.categoryName)issues.push('category-name-missing');
    if(r.masterCategoryId&&r.serviceComponentId&&g.ServiceInputCatalog&&typeof g.ServiceInputCatalog.itemById==='function'){
      const hit=g.ServiceInputCatalog.itemById(r.serviceComponentId);
      const expected=hit&&hit.group&&hit.group.masterCategoryId;
      if(expected&&String(expected)!==String(r.masterCategoryId))issues.push('category-component-mismatch');
    }
    return {ok:issues.length===0,issues,resolution:r};
  }
  const api=Object.freeze({VERSION,resolve,assert});
  g.ServiceReminderFormSOT_S2054=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
