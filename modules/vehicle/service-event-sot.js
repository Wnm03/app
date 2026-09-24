/* S1946-S1953 — Unified Service Event SOT.
 * Storage remains D.servisLogs. This module is a canonical projection/validator,
 * not a second service database. It unifies session, reminder, checklist,
 * completion, component/part evidence, cost breakdown and vehicle health.
 */
(function(g){'use strict';
  const VERSION='SERVICE-EVENT-SOT-3';
  const STATES=Object.freeze(['PENDING','INSPECTED','OK','NEEDS_REPAIR','REPLACED','DEFERRED','NOT_APPLICABLE']);
  const HEALTH=Object.freeze(['OK','PERLU_DIPERIKSA','JATUH_TEMPO','TERTUNDA','BELUM_ADA_DATA']);
  const str=v=>v==null?'':String(v).trim();
  const arr=v=>Array.isArray(v)?v:[];
  const logs=()=>g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[];
  function canonical(id){
    if(!id||!g.ServiceMasterDB)return null;
    try{return typeof g.ServiceMasterDB.getComponentSync==='function'?g.ServiceMasterDB.getComponentSync(id):null;}catch(_){return null;}
  }
  function checklistState(row){
    if(!row)return 'PENDING';
    if(row.notApplicable===true)return 'NOT_APPLICABLE';
    const r=str(row.conditionResult).toLowerCase();
    if(r==='deferred'||r==='tunda'||r==='ditunda')return 'DEFERRED';
    if(r==='needs_repair'||r==='perlu_perbaikan'||r==='rusak'||r==='perlu diperbaiki')return 'NEEDS_REPAIR';
    if(r==='ok'||r==='baik'||r==='normal')return row.actionType==='ganti'?'REPLACED':'OK';
    if(row.actionType==='ganti')return 'REPLACED';
    return row.conditionResult?'INSPECTED':'PENDING';
  }
  function normalizeChecklist(rows){
    return arr(rows).map(r=>{
      const x=Object.assign({},r||{});
      x.state=STATES.includes(x.state)?x.state:checklistState(x);
      if(!x.serviceComponentId&&x.itemId)x.serviceComponentId=x.itemId;
      return x;
    });
  }
  function normalizeCost(log){
    const rawBreakdown=log&&log.costBreakdown&&typeof log.costBreakdown==='object'?log.costBreakdown:{};
    const n=v=>v==null||v===''?null:(Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null);
    const totalRaw=rawBreakdown.source==='component'&&rawBreakdown.total!==undefined?rawBreakdown.total:(log&&log.cost);
    const total=n(totalRaw);
    const b=Object.assign({},rawBreakdown);
    const out={labor:n(b.labor),parts:n(b.parts),consumables:n(b.consumables),other:n(b.other),total:total==null?0:total,source:b.source||'historical_total'};
    const nums=['labor','parts','consumables','other'];
    const known=nums.reduce((s,k)=>s+(out[k]==null?0:out[k]),0);
    if(nums.every(k=>out[k]!=null)&&Math.abs(known-total)>0.005) return Object.assign(out,{reconciled:false});
    return Object.assign(out,{reconciled:nums.every(k=>out[k]!=null)?Math.abs(known-total)<=0.005:false});
  }
  function normalizeComponentCost(row){
    const b=row&&row.costBreakdown&&typeof row.costBreakdown==='object'?row.costBreakdown:{};
    const n=v=>v==null||v===''?null:(Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null);
    const labor=n(b.labor),parts=n(b.parts),consumables=n(b.consumables),other=n(b.other);
    const total=(labor==null?0:labor)+(parts==null?0:parts)+(consumables==null?0:consumables)+(other==null?0:other);
    return {itemId:row&&row.itemId||null,itemName:row&&row.itemName||'',serviceComponentId:row&&row.serviceComponentId||row&&row.itemId||null,labor,parts,consumables,other,total,subtotal:total,source:'component'};
  }
  function normalizeServiceCost(log){
    const existing=log&&log.serviceCost&&typeof log.serviceCost==='object'?log.serviceCost:null;
    const rows=arr(log&&log.checklist).filter(r=>r&&r.costBreakdown&&r.costBreakdown.source==='component').map(normalizeComponentCost);
    if(!existing&&!rows.length)return null;
    const components=rows.length?rows:(existing&&Array.isArray(existing.components)?existing.components.map(normalizeComponentCost):[]);
    const sums=components.reduce((a,c)=>{a.labor+=c.labor==null?0:c.labor;a.parts+=c.parts==null?0:c.parts;a.consumables+=c.consumables==null?0:c.consumables;a.other+=c.other==null?0:c.other;return a;},{labor:0,parts:0,consumables:0,other:0});
    const total=sums.labor+sums.parts+sums.consumables+sums.other;
    return {components,labor:sums.labor,parts:sums.parts,consumables:sums.consumables,other:sums.other,total,source:'component'};
  }

  function costForSession(sessionId, vehicleId){
    const rows=logs().filter(s=>s&&(!sessionId||String(s.sessionId)===String(sessionId))&&(!vehicleId||String(s.vehicleId)===String(vehicleId)));
    if(!rows.length)return null;
    const first=rows.find(s=>s.serviceCost)||rows[0];
    if(first&&first.serviceCost)return first.serviceCost;
    const components=[];
    rows.forEach(s=>arr(s.checklist).forEach(r=>{if(r&&r.costBreakdown&&r.costBreakdown.source==='component')components.push(normalizeComponentCost(r));}));
    if(!components.length)return normalizeCost(rows[0]);
    const totals=components.reduce((a,c)=>{a.labor+=c.labor||0;a.parts+=c.parts||0;a.consumables+=c.consumables||0;a.other+=c.other||0;return a;},{labor:0,parts:0,consumables:0,other:0});
    return Object.assign({components,source:'component'},totals,{total:totals.labor+totals.parts+totals.consumables+totals.other});
  }

  function evidence(log){
    if(!log)return{};
    return {vehicleId:log.vehicleId||null,transactionId:log.txLinkId||null,sessionId:log.sessionId||null,reminderPackageId:log.reminderPackageId||null,odometer:log.km==null?null:Number(log.km),date:log.date||null,photos:arr(log.foto).length,photoRefs:arr(log.foto).slice(),catalogPartId:log.catalogPartId||null,catalogPartOemCode:log.catalogPartOemCode||null,usedPartId:log.usedPartId||null};
  }
  function nextDue(log){
    if(!log)return{mode:'NONE',nextDueKm:null,nextDueDate:null};
    if(log.serviceJobType==='overhaul_turun_mesin')return{mode:'RECOMMENDED_REVIEW',nextDueKm:null,nextDueDate:null,reason:'Tidak ada interval overhaul canonical yang dipaksakan'};
    if(log.nextDueKm!=null||log.nextDueDate)return{mode:log.nextDueAxis||'SCHEDULED',nextDueKm:log.nextDueKm??null,nextDueDate:log.nextDueDate??null};
    return{mode:'NONE',nextDueKm:null,nextDueDate:null};
  }
  function normalize(log,opts){
    if(!log)return{ok:false,code:'record_required'};
    const before=JSON.stringify(log);
    log.checklist=normalizeChecklist(log.checklist);
    if(g.ServiceChecklistExecutionSOT&&typeof g.ServiceChecklistExecutionSOT.normalizeRows==='function')log.checklist=g.ServiceChecklistExecutionSOT.normalizeRows(log.checklist);
    log.serviceEventSotVersion=VERSION;
    log.costBreakdown=normalizeCost(log);
    const serviceCost=normalizeServiceCost(log);
    if(serviceCost){
      log.serviceCost=serviceCost;
      log.costBreakdown={labor:serviceCost.labor,parts:serviceCost.parts,consumables:serviceCost.consumables,other:serviceCost.other,total:serviceCost.total,source:'component',reconciled:true};
    }
    log.serviceEvidence=evidence(log);
    log.nextDueSnapshot=nextDue(log);
    if(log.reminderPackageId){
      const p=g.ServiceReminderPackageSOT&&g.ServiceReminderPackageSOT.byId?g.ServiceReminderPackageSOT.byId(log.reminderPackageId):null;
      if(p&&String(p.vehicleId)!==String(log.vehicleId))return{ok:false,code:'reminder_vehicle_mismatch'};
    }
    if(log.serviceComponentId){
      const c=canonical(log.serviceComponentId);
      if(c){log.masterCategoryId=log.masterCategoryId||c.masterCategoryId;log.serviceComponentId=c.componentId;log.serviceComponentName=log.serviceComponentName||c.componentName;}
    }
    if(!log.serviceType)log.serviceType=log.serviceJobType==='overhaul_turun_mesin'?'LABOR':'SERVICE';
    const changed=before!==JSON.stringify(log);
    if(changed&&opts&&opts.persist!==false&&typeof g.save==='function')g.save({domain:'servis',financeMutation:false});
    return{ok:true,changed,record:log};
  }
  function createSession(vehicleId,ids,jobTypeId,reminderPackageId){
    const wanted=arr(ids).map(String).filter(Boolean); const found=logs().filter(s=>s&&wanted.includes(String(s.id)));
    if(!vehicleId||found.length!==wanted.length||!wanted.length)return{ok:false,code:'invalid_records'};
    if(found.some(s=>String(s.vehicleId)!==String(vehicleId)))return{ok:false,code:'vehicle_mismatch'};
    const sid=found.find(s=>s.sessionId)?.sessionId || (typeof g.uid==='function'?g.uid():'svc_'+Date.now());
    const job=g.ServiceSessionSOT&&g.ServiceSessionSOT.jobType?g.ServiceSessionSOT.jobType(jobTypeId):null;
    found.forEach(s=>{s.sessionId=sid;if(job){s.serviceJobType=job.id;s.serviceJobLabel=job.label;s.serviceJobEvidence=reminderPackageId?'reminder_package':'session';}if(reminderPackageId)s.reminderPackageId=reminderPackageId;normalize(s,{persist:false});});
    if(typeof g.save==='function')g.save({domain:'servis',financeMutation:false});
    return{ok:true,sessionId:sid,ids:wanted};
  }
  function completeReminder(reminderId,ids,jobTypeId){
    const p=g.ServiceReminderPackageSOT&&g.ServiceReminderPackageSOT.byId?g.ServiceReminderPackageSOT.byId(reminderId):null;
    if(!p)return{ok:false,code:'reminder_not_found'};
    const result=createSession(p.vehicleId,ids,jobTypeId||p.serviceJobType,reminderId);
    if(!result.ok)return result;
    if(g.ServiceReminderPackageSOT.transition)g.ServiceReminderPackageSOT.transition(reminderId,'COMPLETED');
    return result;
  }
  function maintenanceHealth(vehicleId){
    const vid=str(vehicleId);
    const vehicleLogs=logs().filter(s=>s&&String(s.vehicleId)===vid);
    if(!vehicleLogs.length)return{vehicleId:vid,status:'BELUM_ADA_DATA',components:[],generatedAt:new Date().toISOString(),version:VERSION};
    const by=new Map();
    vehicleLogs.forEach(s=>{
      arr(s.checklist).forEach(r=>{
        const id=str(r.serviceComponentId||r.itemId);
        if(!id)return;
        if(!by.has(id))by.set(id,{componentId:id,name:r.itemName||r.itemId,status:'OK',lastService:null,nextDueKm:null,nextDueDate:null});
        const x=by.get(id);
        if(!x.lastService||String(s.date)>String(x.lastService))x.lastService=s.date;
        if(s.nextDueKm!=null)x.nextDueKm=s.nextDueKm;
        if(s.nextDueDate)x.nextDueDate=s.nextDueDate;
        const st=checklistState(r);
        if(st==='DEFERRED')x.status='TERTUNDA';
        else if(st==='NEEDS_REPAIR')x.status='PERLU_DIPERIKSA';
        else if((st==='REPLACED'||st==='OK')&&x.status!=='PERLU_DIPERIKSA'&&x.status!=='TERTUNDA')x.status='OK';
        const currentKm=typeof g.getVehicleKm==='function'?Number(g.getVehicleKm(vid)):NaN;
        const dueKm=x.nextDueKm!=null?Number(x.nextDueKm):NaN;
        const today=new Date().toISOString().slice(0,10);
        const dueDate=x.nextDueDate?String(x.nextDueDate).slice(0,10):'';
        if(x.status==='OK' && ((Number.isFinite(currentKm)&&Number.isFinite(dueKm)&&currentKm>=dueKm)||(dueDate&&today>=dueDate))) x.status='JATUH_TEMPO';
      });
    });
    return{vehicleId:vid,status:by.size?'OK':'BELUM_ADA_DATA',components:[...by.values()],generatedAt:new Date().toISOString(),version:VERSION};
  }
  function audit(vehicleId){
    const rows=logs().filter(s=>!vehicleId||String(s.vehicleId)===String(vehicleId));
    const issues=[];
    rows.forEach(s=>{if(s.reminderPackageId&&g.ServiceReminderPackageSOT&&g.ServiceReminderPackageSOT.byId){const p=g.ServiceReminderPackageSOT.byId(s.reminderPackageId);if(!p)issues.push({id:s.id,code:'ORPHAN_REMINDER_PACKAGE'});}if(s.serviceComponentId&&!canonical(s.serviceComponentId))issues.push({id:s.id,code:'UNKNOWN_COMPONENT'});if(s.txLinkId&&g.D&&Array.isArray(g.D.transactions)&&!g.D.transactions.some(t=>t&&t.id===s.txLinkId))issues.push({id:s.id,code:'ORPHAN_TRANSACTION'});});
    return{version:VERSION,total:rows.length,sessions:new Set(rows.map(s=>s.sessionId).filter(Boolean)).size,withReminder:rows.filter(s=>s.reminderPackageId).length,withEvidence:rows.filter(s=>arr(s.foto).length||s.txLinkId||s.catalogPartId||s.usedPartId).length,issues};
  }
  const api={VERSION,STATES,HEALTH,checklistState,normalizeChecklist,normalizeCost,normalizeComponentCost,normalizeServiceCost,costForSession,evidence,nextDue,normalize,createSession,completeReminder,maintenanceHealth,audit};
  g.ServiceEventSOT=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
