/* S2027-S2030 APP MAIN compatibility projection.
 * Read-only audit adapter over the native APP MAIN Service SOT.
 * It deliberately does NOT load or replace the historical S2019-S2030 runtime modules.
 */
(function(g){'use strict';
  if(g.ServiceHistoryLifecycleS2027S2030AppMain)return;
  const VERSION='SERVICE-HISTORY-LIFECYCLE-S2027-S2030-APP-MAIN-1';
  const str=v=>v==null?'':String(v).trim();
  const arr=v=>Array.isArray(v)?v:[];
  const logs=()=>g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[];
  const byId=id=>logs().find(x=>x&&str(x.id)===str(id))||null;
  function components(log){return arr(log&&log.checklist).map((r,i)=>({
    index:i, itemId:r&&r.itemId||null, itemName:r&&r.itemName||r&&r.name||null,
    serviceComponentId:r&&r.serviceComponentId||r&&r.itemId||null,
    masterCategoryId:r&&r.masterCategoryId||null,
    actionType:r&&r.actionType||null
  })).filter(x=>x.serviceComponentId||x.itemId||x.itemName);}
  function audit(input){
    const x=input||{}, before=JSON.stringify(logs()), log=byId(x.historyId), cs=components(log);
    const requested=str(x.componentId);
    const target=cs.find(c=>str(c.serviceComponentId)===requested||str(c.itemId)===requested)||null;
    const vehicleId=str(x.vehicleId||log&&log.vehicleId);
    const sessionId=str(log&&(log.sessionId||log.serviceJobId));
    const sameSession=sessionId?logs().filter(r=>r&&str(r.vehicleId)===vehicleId&&str(r.sessionId||r.serviceJobId)===sessionId):[];
    const reconciliation=g.ServiceHistoryReminderReconciliationSOT;
    const reconciliationResult=log&&reconciliation&&typeof reconciliation.match==='function'
      ?reconciliation.match(log,{vehicleId,serviceComponentId:requested},{vehicleId}) : null;
    const normalizer=g.ServiceHistorySOTNormalizer;
    const normalized=log&&normalizer&&typeof normalizer.normalizeOne==='function'
      ?normalizer.normalizeOne(log,{}) : null;
    const event=g.ServiceEventSOT;
    const eventAudit=event&&typeof event.audit==='function'?event.audit(vehicleId):null;
    const packageApi=g.ServiceHistoryAuditPackage;
    const packageChecks=[];
    if(packageApi&&typeof packageApi.listByVehicle==='function'){
      const packs=packageApi.listByVehicle(vehicleId)||[];
      packs.forEach(p=>{
        if(arr(p.sourceServiceIds).map(str).includes(str(x.historyId))&&typeof packageApi.sourceIdentityAudit==='function'){
          packageChecks.push(packageApi.sourceIdentityAudit(p.sourceServiceIds,vehicleId));
        }
      });
    }
    const stages=[
      {stage:'history',ok:!!log,code:log?null:'history-not-found'},
      {stage:'vehicle-scope',ok:!!vehicleId&&(!log||str(log.vehicleId)===vehicleId),code:vehicleId?null:'vehicle-scope-missing'},
      {stage:'component-context',ok:!!target,code:target?null:'component-not-found'},
      {stage:'session-context',ok:!sessionId||sameSession.length>0,code:sessionId&&sameSession.length?'':'session-not-found'},
      {stage:'reminder-history-reconciliation',ok:!reconciliationResult||reconciliationResult.ok===true,code:reconciliationResult&&!reconciliationResult.ok?'reconciliation-failed':null},
      {stage:'reload-normalization',ok:!normalized||str(normalized.vehicleId)===vehicleId,code:normalized&&str(normalized.vehicleId)!==vehicleId?'normalization-vehicle-mismatch':null},
      {stage:'event-sot-integrity',ok:!eventAudit||eventAudit.issues.length===0,code:eventAudit&&eventAudit.issues.length?'event-sot-issues':null},
      {stage:'audit-package-integrity',ok:packageChecks.every(r=>r&&r.ok!==false),code:packageChecks.some(r=>r&&r.ok===false)?'audit-package-issues':null}
    ];
    const after=JSON.stringify(logs());
    stages.push({stage:'immutability',ok:before===after,code:before===after?null:'history-mutated'});
    const errors=stages.filter(s=>!s.ok);
    return {VERSION,status:errors.length?'ERROR':'PASS',ok:!errors.length,historyId:log?str(log.id):null,vehicleId,sessionId,componentId:target?str(target.serviceComponentId||target.itemId):requested,componentCount:cs.length,sessionCount:sameSession.length,stages,readOnly:true,historyUnchanged:before===after};
  }
  const api=Object.freeze({VERSION,components,audit});
  g.ServiceHistoryLifecycleS2027S2030AppMain=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
