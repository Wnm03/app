/* S1946-S1953 — Unified Service Event SOT.
 * Storage remains D.servisLogs. This module is a canonical projection/validator,
 * not a second service database. It unifies session, reminder, checklist,
 * completion, component/part evidence, cost breakdown and vehicle health.
 */
(function(g){'use strict';
  const VERSION='SERVICE-EVENT-SOT-2';
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
    const total=Number.isFinite(Number(log&&log.cost))?Number(log.cost):0;
    const b=log&&log.costBreakdown&&typeof log.costBreakdown==='object'?Object.assign({},log.costBreakdown):{};
    const out={labor:b.labor==null?null:Number(b.labor),parts:b.parts==null?null:Number(b.parts),consumables:b.consumables==null?null:Number(b.consumables),other:b.other==null?null:Number(b.other),total,source:b.source||'historical_total'};
    const nums=['labor','parts','consumables','other'];
    nums.forEach(k=>{if(out[k]!=null&&!Number.isFinite(out[k]))out[k]=null;});
    const known=nums.reduce((s,k)=>s+(out[k]==null?0:out[k]),0);
    if(nums.every(k=>out[k]!=null)&&Math.abs(known-total)>0.005) return Object.assign(out,{reconciled:false});
    return Object.assign(out,{reconciled:nums.every(k=>out[k]!=null)?Math.abs(known-total)<=0.005:false});
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
    log.serviceEventSotVersion=VERSION;
    log.costBreakdown=normalizeCost(log);
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
  const api={VERSION,STATES,HEALTH,checklistState,normalizeChecklist,normalizeCost,evidence,nextDue,normalize,createSession,completeReminder,maintenanceHealth,audit};
  g.ServiceEventSOT=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
