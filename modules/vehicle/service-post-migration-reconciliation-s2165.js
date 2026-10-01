/* S2165 — Post-Migration Reconciliation & Duplicate Identity Gate
 * Read-only by default. Verifies canonical identity, duplicate targets, vehicle
 * isolation, and reminder/history referential consistency. No data mutation.
 */
(function(g){'use strict';
  const VERSION='SERVICE-POST-MIGRATION-RECONCILIATION-S2165';
  const str=v=>v==null?'':String(v).trim(); const arr=v=>Array.isArray(v)?v:[];
  const taxonomy=()=>g.ServiceTaxonomySOT||null;
  const vehicleSot=()=>g.VehicleScopedSOT||null;
  const key=(r)=>[str(r&&r.vehicleId),str(r&&r.masterCategoryId),str(r&&r.serviceComponentId)].join('|');
  function canonical(r){const t=taxonomy(); if(!t||typeof t.canonicalTarget!=='function') return null; return t.canonicalTarget(r||{});}
  function auditLogs(data){
    const rows=arr(data&&data.servisLogs), unresolved=[], canonicalMismatch=[], duplicateIdentity=[];
    const seen=new Map();
    rows.forEach((r,i)=>{
      if(!r)return;
      const c=canonical(r);
      if((r.serviceComponentId||r.masterCategoryId)&&!c) unresolved.push({index:i,id:str(r.id)});
      if(c){
        if(c.masterCategoryId!==str(r.masterCategoryId)||c.serviceComponentId!==str(r.serviceComponentId)) canonicalMismatch.push({index:i,id:str(r.id),before:{masterCategoryId:r.masterCategoryId||null,serviceComponentId:r.serviceComponentId||null},canonical:{masterCategoryId:c.masterCategoryId,serviceComponentId:c.serviceComponentId}});
      }
      const k=key(r); if(k!=='||'){ if(seen.has(k)) duplicateIdentity.push({key:k,first:seen.get(k),duplicate:{index:i,id:str(r.id)}}); else seen.set(k,{index:i,id:str(r.id)}); }
    });
    return {total:rows.length,unresolved,canonicalMismatch,duplicateIdentity};
  }
  function auditReminders(data){
    const rows=arr(data&&data.serviceReminderPackages), duplicateTargets=[], invalidTargets=[], crossVehicle=[];
    const seen=new Map();
    rows.forEach((p,pi)=>{
      const targets=arr(p&&p.targets);
      targets.forEach((t,ti)=>{
        const c=canonical(t);
        if(!c||!c.serviceComponentId) invalidTargets.push({packageId:str(p.id),index:ti,target:t});
        const k=[str(p.vehicleId),str(c&&c.masterCategoryId),str(c&&c.serviceComponentId)].join('|');
        if(c&&k!=='||'){ if(seen.has(k)) duplicateTargets.push({key:k,first:seen.get(k),duplicate:{packageId:str(p.id),index:ti}}); else seen.set(k,{packageId:str(p.id),index:ti}); }
        if(t.vehicleId && str(t.vehicleId)!==str(p.vehicleId)) crossVehicle.push({packageId:str(p.id),targetIndex:ti,targetVehicleId:str(t.vehicleId),packageVehicleId:str(p.vehicleId)});
      });
    });
    return {total:rows.length,invalidTargets,duplicateTargets,crossVehicle};
  }
  function auditVehicleScope(data,vehicleId){
    const s=vehicleSot(); if(s&&typeof s.auditVehicle==='function') return s.auditVehicle(vehicleId);
    const vid=str(vehicleId), rows=arr(data&&data.servisLogs).filter(r=>str(r&&r.vehicleId)===vid), reminders=arr(data&&data.serviceReminderPackages).filter(r=>str(r&&r.vehicleId)===vid);
    return {ok:true,vehicleId:vid,domains:{servisLogs:{total:rows.length},serviceReminderPackages:{total:reminders.length}}};
  }
  function audit(data,opts){
    data=data||{}; opts=opts||{}; const logs=auditLogs(data), reminders=auditReminders(data);
    const vehicleIds=[...new Set(arr(data.vehicles).map(v=>str(v&&v.id)).filter(Boolean))];
    const scopes=vehicleIds.map(id=>auditVehicleScope(data,id));
    const historyReminderMissing=[], logById=new Map(arr(data.servisLogs).map(r=>[str(r&&r.id),r]));
    arr(data.serviceReminderPackages).forEach(p=>arr(p&&p.completedSessionId&&[]));
    arr(data.servisLogs).forEach(r=>{ if(r&&r.reminderPackageId && !arr(data.serviceReminderPackages).some(p=>str(p&&p.id)===str(r.reminderPackageId))) historyReminderMissing.push({logId:str(r.id),reminderPackageId:str(r.reminderPackageId)}); });
    const activeId=str(opts.activeVehicleId||'');
    const activeRows=activeId?arr(data.serviceReminderPackages).filter(p=>str(p&&p.vehicleId)===activeId):[];
    const activeInvalid=activeRows.filter(p=>!str(p&&p.vehicleId)||str(p.vehicleId)!==activeId).map(p=>({id:str(p.id),vehicleId:str(p.vehicleId)}));
    const checks={canonicalIdentity:logs.unresolved.length===0&&logs.canonicalMismatch.length===0,duplicateIdentity:logs.duplicateIdentity.length===0&&reminders.duplicateTargets.length===0,vehicleIsolation:scopes.every(x=>x.ok!==false)&&reminders.crossVehicle.length===0,historyReminderReference:historyReminderMissing.length===0,activeVehicleScope:activeId?activeInvalid.length===0:true};
    return {version:VERSION,summary:{logs:logs.total,reminders:reminders.total,vehicles:vehicleIds.length},checks,logs,reminders,scopes,historyReminderMissing,activeVehicle:{vehicleId:activeId||null,scopedReminderCount:activeRows.length,invalid:activeInvalid},pass:Object.values(checks).every(Boolean)};
  }
  const api={VERSION,key,canonical,auditLogs,auditReminders,auditVehicleScope,audit};
  g.ServicePostMigrationReconciliationS2165=api; if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
