/* S2030 — Final Service History Lifecycle E2E Integrity
 * Read-only final gate over the cumulative service-history/reminder/evidence chain.
 * Does not create history/reminder records, mutate finance, or rewrite evidence.
 */
(function(g){'use strict';
  if(g.__SERVICE_HISTORY_FINAL_E2E_S2030__)return;
  g.__SERVICE_HISTORY_FINAL_E2E_S2030__=true;
  const VERSION='SERVICE-HISTORY-FINAL-E2E-S2030';
  const str=v=>v==null?'':String(v).trim();
  const logs=()=>g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[];
  const byId=id=>logs().find(x=>x&&String(x.id)===String(id))||null;
  const multi=()=>g.ServiceHistoryMultiChecklistS2019||null;
  const comps=log=>log&&multi()&&typeof multi().componentsOf==='function'?(multi().componentsOf(log)||[]):[];
  const cid=c=>str(c&&(c.serviceComponentId||c.checklistItemId||c.key));
  const vid=log=>str(log&&log.vehicleId||g.curVehicleId);
  const sid=log=>str(log&&(log.sessionId||log.serviceJobId));
  function component(log,id){const t=str(id);return t?comps(log).find(c=>cid(c)===t)||null:null;}
  function snapshot(){return JSON.stringify(logs());}
  function stage(name,ok,code,message,meta){return {stage:name,ok,code:code||null,message:message||'',meta:meta||{}};}
  function resolve(logId,componentId,vehicleId){
    const log=byId(logId), c=component(log,componentId), v=vehicleId==null?vid(log):str(vehicleId);
    return {historyId:log?str(log.id):null,vehicleId:v||null,sessionId:sid(log)||null,componentId:c?cid(c):str(componentId)||null,componentFound:!!c,componentCount:comps(log).length};
  }
  function run(input){
    const x=input||{}, before=snapshot(), target=resolve(x.historyId,x.componentId,x.vehicleId), stages=[];
    stages.push(stage('service-history',!!target.historyId,target.historyId?'':'history-not-found',target.historyId?'History ditemukan.':'History target tidak ditemukan.',target));
    stages.push(stage('component-context',!!target.componentFound,target.componentFound?'':'component-not-found',target.componentFound?'Component terikat pada history.':'Component tidak ditemukan pada history.',{componentId:target.componentId,componentCount:target.componentCount}));
    stages.push(stage('vehicle-scope',!!target.vehicleId,target.vehicleId?'':'vehicle-scope-missing',target.vehicleId?'Vehicle scope tersedia.':'Vehicle scope tidak tersedia.',{vehicleId:target.vehicleId}));
    const reminderApi=g.ServiceHistoryReminderComponentS2026;
    const rr=reminderApi&&typeof reminderApi.projection==='function'?reminderApi.projection(byId(target.historyId),component(byId(target.historyId),target.componentId)):null;
    stages.push(stage('reminder-scope',!rr||String(rr.serviceComponentId||rr.componentId||'')===String(target.componentId),'reminder-component-mismatch',rr?'Reminder projection tetap pada component yang sama.':'Reminder projection tidak tersedia; tidak dibuat reminder baru.',rr||{}));
    const round=g.ServiceHistoryReminderHistoryRoundtripS2027;
    const rh=round&&typeof round.expected==='function'?round.expected(null,target.componentId,target.vehicleId):null;
    stages.push(stage('reminder-history-roundtrip',!rh||rh.ok!==false,'roundtrip-failed',rh?'Reminder → History mempertahankan target.':'Round-trip adapter tidak tersedia; audit tidak memutasi history.',rh||{}));
    const audit=g.ServiceHistoryHistoryReminderAuditRoundtripS2028;
    const ar=audit&&typeof audit.audit==='function'?audit.audit(target.historyId,target.componentId,target.vehicleId,{historyId:target.historyId,componentId:target.componentId,vehicleId:target.vehicleId,sessionId:target.sessionId}):null;
    stages.push(stage('history-reminder-audit-roundtrip',!ar||ar.ok!==false,'audit-roundtrip-failed',ar?'History → Reminder → Audit mempertahankan context.':'Audit projection tidak tersedia; tidak dilakukan mutasi.',ar||{}));
    const reload=g.ServiceHistoryLegacyMultiComponentReloadS2029;
    const rec=reload&&typeof reload.resolve==='function'?reload.resolve(target.historyId,target.componentId,target.vehicleId):null;
    stages.push(stage('reload-reconstruction',!rec||rec.reloadable===true||rec.rowType==='legacy-history'||rec.rowType==='unscoped','reload-not-reconstructable',rec?'Persisted identity dapat dievaluasi setelah reload.':'Reload projection tidak tersedia; data tidak diubah.',rec||{}));
    const after=snapshot();
    const unchanged=before===after;
    stages.push(stage('immutability',unchanged,'history-mutated',unchanged?'Persisted service history tetap identik.':'Audit chain mengubah D.servisLogs.',{unchanged}));
    const errors=stages.filter(s=>!s.ok);return {VERSION,status:errors.length?'ERROR':'PASS',ok:!errors.length,historyId:target.historyId,vehicleId:target.vehicleId,componentId:target.componentId,stages,historyUnchanged:unchanged,readOnly:true};
  }
  function render(r){if(!r)return '';const icon=r.ok?'✅':'❌';const rows=r.stages.map(s=>`<div style="margin-top:4px">${s.ok?'✅':'❌'} <b>${s.stage}</b>${s.code?' · '+s.code:''}</div>`).join('');return `<div id="s2030FinalServiceHistoryE2E" style="background:var(--surface3);border:1px solid var(--border2);border-radius:12px;padding:10px 12px;margin:0 0 12px;font-size:11px"><b>🧭 Final service-history lifecycle gate</b><div style="margin-top:5px">Status: <b>${icon} ${r.status}</b> · Component: <b>${r.componentId||'—'}</b> · Vehicle: <b>${r.vehicleId||'—'}</b></div>${rows}<div style="margin-top:6px;color:var(--text2)">Read-only final audit · tidak membuat history/reminder baru dan tidak mengubah finance/evidence.</div></div>`;}
  function install(){const s=g.Servis;if(!s)return;const api={VERSION,resolve,run,render,install};s.serviceHistoryFinalE2ES2030=api;g.ServiceHistoryFinalE2ES2030=api;}
  if(g.Servis)install();else if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',install,{once:true});
})(typeof globalThis!=='undefined'?globalThis:window);
