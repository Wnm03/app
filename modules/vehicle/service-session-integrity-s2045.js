/* S2045 — Service Session Integrity Gate / cumulative hardening S2038-S2045
 * Keeps one service session as one unit while validating every checklist
 * component against History and Reminder projections. No new persistence store.
 * Safe repair is limited to the existing D.sparepartCats compatibility index.
 */
(function(g){'use strict';
  if(g.__SERVICE_SESSION_INTEGRITY_S2045__)return;
  g.__SERVICE_SESSION_INTEGRITY_S2045__=true;
  const VERSION='SERVICE-SESSION-INTEGRITY-S2045';
  const str=v=>v==null?'':String(v).trim();
  const logs=()=>g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[];
  const cats=()=>g.D&&Array.isArray(g.D.sparepartCats)?g.D.sparepartCats:[];
  const vehicles=()=>g.D&&Array.isArray(g.D.vehicles)?g.D.vehicles:[];
  const vidOf=r=>str(r&&r.vehicleId);
  const sidOf=r=>str(r&&(r.sessionId||r.serviceJobId));
  const cidOf=r=>str(r&&(r.serviceComponentId||r.itemId||r.checklistItemId));
  const componentCatalog=cid=>{
    if(!cid||!g.ServiceInputCatalog||typeof g.ServiceInputCatalog.itemById!=='function')return null;
    return g.ServiceInputCatalog.itemById(cid)||null;
  };
  function sessionRows(log){
    if(!log)return [];
    const sid=sidOf(log),vid=vidOf(log);
    if(!sid)return [log];
    return logs().filter(r=>r&&vidOf(r)===vid&&sidOf(r)===sid);
  }
  function checklistComponents(log){
    const rows=sessionRows(log),out=[],seen=new Set();
    rows.forEach(row=>{
      const payload=Array.isArray(row.checklist)&&row.checklist.length?row.checklist:[row];
      payload.forEach((raw,i)=>{
        const cid=cidOf(raw)||cidOf(row);
        if(!cid)return;
        const key=str(row.id||i)+'::'+cid;
        if(seen.has(key))return;seen.add(key);
        const hit=componentCatalog(cid);
        const mid=str(raw.masterCategoryId||row.masterCategoryId||(hit&&hit.group&&hit.group.masterCategoryId));
        const name=str(raw.itemName||raw.componentName||raw.item||row.item||(hit&&hit.item&&hit.item.name)||cid);
        out.push({key,cid,masterCategoryId:mid||null,name,rowId:str(row.id),sessionId:sidOf(row),vehicleId:vidOf(row),row});
      });
    });
    return out;
  }
  function reminderCategory(component,{create=false}={}){
    const vid=component.vehicleId,cid=component.cid;
    let cat=cats().find(c=>c&&str(c.serviceComponentId)===cid&&(!c.vehicleId||str(c.vehicleId)===vid));
    if(!cat&&component.row&&component.row.categoryId)cat=cats().find(c=>c&&str(c.id)===str(component.row.categoryId)&&(!c.vehicleId||str(c.vehicleId)===vid));
    if(cat||!create)return cat||null;
    const hit=componentCatalog(cid), item=hit&&hit.item, group=hit&&hit.group;
    const intervalKm=Number(item&&item.intervalKm)>0?Number(item.intervalKm):Number(component.row&&component.row.intervalKmAtService)>0?Number(component.row.intervalKmAtService):0;
    const intervalBulan=Number(item&&item.intervalTimeMonths)>0?Number(item.intervalTimeMonths):Number(component.row&&component.row.intervalBulanAtService)>0?Number(component.row.intervalBulanAtService):0;
    const id='sp_component_'+cid+(vid?'_'+vid:'');
    cat=cats().find(c=>c&&str(c.id)===id)||null;
    if(!cat){
      cat={id,name:component.name||cid,code:typeof g.codeFromName==='function'?g.codeFromName(component.name||cid):cid.toUpperCase(),intervalKm,intervalBulan:intervalBulan,masterCategoryId:component.masterCategoryId||null,serviceComponentId:cid,showInReminder:!!(intervalKm||intervalBulan),group:group&&group.group||null,groupIcon:group&&group.icon||''};
      if(vid)cat.vehicleId=vid;
      cats().push(cat);
    }
    return cat;
  }
  function audit(log){
    const comps=checklistComponents(log),issues=[],reminders=[];
    const keys=new Set();
    comps.forEach(c=>{
      const k=c.cid+'|'+c.masterCategoryId;
      if(keys.has(k))issues.push({severity:'REVIEW',code:'DUPLICATE_COMPONENT_IDENTITY',componentId:c.cid,rowId:c.rowId});
      keys.add(k);
      const cat=reminderCategory(c,{create:false});
      if(!cat)issues.push({severity:'ERROR',code:'REMINDER_CATEGORY_MISSING',componentId:c.cid,rowId:c.rowId});
      const hit=componentCatalog(c.cid);
      if(hit&&hit.group&&str(hit.group.masterCategoryId)!==str(c.masterCategoryId))issues.push({severity:'ERROR',code:'MASTER_CATEGORY_DRIFT',componentId:c.cid,rowId:c.rowId});
      if(cat){
        const km=Number(cat.intervalKm)>0?Number(cat.intervalKm):null;
        const mo=Number(cat.intervalBulan)>0?Number(cat.intervalBulan):null;
        reminders.push({componentId:c.cid,masterCategoryId:c.masterCategoryId,categoryId:str(cat.id),intervalKm:km,intervalBulan:mo,showInReminder:cat.showInReminder!==false});
      }
    });
    const catsById=new Set(reminders.map(r=>r.componentId));
    if(catsById.size!==comps.length)issues.push({severity:'ERROR',code:'CHECKLIST_REMINDER_COUNT_MISMATCH',checklistCount:comps.length,reminderCount:catsById.size});
    return {version:VERSION,ok:issues.every(i=>i.severity!=='ERROR'),sessionId:sidOf(log)||null,vehicleId:vidOf(log)||null,componentCount:comps.length,categoryCount:new Set(comps.map(c=>c.masterCategoryId||'uncategorized')).size,components:comps,reminders,issues};
  }
  function repair(log,{persist=false}={}){
    const before=JSON.stringify(cats());
    const comps=checklistComponents(log),created=[];
    comps.forEach(c=>{const had=reminderCategory(c,{create:false});const cat=reminderCategory(c,{create:true});if(!had&&cat)created.push(cat);});
    let saved=false;
    if(persist&&created.length&&typeof g.save==='function')saved=g.save({domain:'servis',financeMutation:false})!==false;
    const after=JSON.stringify(cats());
    return {ok:true,created,changed:before!==after,persisted:saved,report:audit(log)};
  }
  function verifyReloadShape(log){
    const a=audit(log);return {ok:a.ok,sessionId:a.sessionId,componentCount:a.componentCount,reminderCount:a.reminders.length,categoryCount:a.categoryCount,issues:a.issues};
  }
  const api={VERSION,sessionRows,checklistComponents,reminderCategory,audit,repair,verifyReloadShape};
  g.ServiceSessionIntegrityS2045=api;
  if(g.Servis)g.Servis.serviceSessionIntegrityS2045=api;
})(typeof globalThis!=='undefined'?globalThis:window);
