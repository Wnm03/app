/* S2028 — History → Reminder → Audit Round-Trip Integrity
 * Read-only audit/projection for preserving vehicle/session/component context
 * while moving History -> Reminder -> Audit. Never mutates persisted history.
 */
(function(g){'use strict';
  if(g.__SERVICE_HISTORY_HISTORY_REMINDER_AUDIT_ROUNDTRIP_S2028__)return;
  g.__SERVICE_HISTORY_HISTORY_REMINDER_AUDIT_ROUNDTRIP_S2028__=true;
  const VERSION='SERVICE-HISTORY-HISTORY-REMINDER-AUDIT-ROUNDTRIP-S2028';
  const str=v=>v==null?'':String(v).trim();
  const logs=()=>g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[];
  const byId=id=>logs().find(x=>x&&String(x.id)===String(id))||null;
  const multi=()=>g.ServiceHistoryMultiChecklistS2019||null;
  const components=log=>multi()&&typeof multi().componentsOf==='function'?(multi().componentsOf(log)||[]):[];
  const cidOf=c=>str(c&&(c.serviceComponentId||c.checklistItemId||c.key));
  const vidOf=log=>str(log&&log.vehicleId||g.curVehicleId);
  const compOf=(log,cid)=>components(log).find(c=>cidOf(c)===str(cid))||null;
  function expected(logId,cid,vehicleId){
    const log=byId(logId), c=compOf(log,cid), vid=vehicleId==null?vidOf(log):str(vehicleId);
    return {historyId:log?str(log.id):null,sessionId:log?str(log.sessionId||log.serviceJobId):null,vehicleId:vid||null,componentId:c?cidOf(c):str(cid)||null,componentName:c?str(c.componentName):null};
  }
  function focus(){const s=g.Servis||{};return {logId:s._s2019ComponentFocusLogId||null,componentId:s._s2019ComponentFocusId||null};}
  function snapshot(){return JSON.stringify(logs());}
  function audit(logId,cid,vehicleId,actual){
    const e=expected(logId,cid,vehicleId), f=focus(), issues=[];
    if(!e.historyId)issues.push({severity:'ERROR',code:'history-not-found',message:'History context tidak ditemukan.'});
    if(!e.componentId)issues.push({severity:'ERROR',code:'component-not-found',message:'Component context tidak ditemukan.'});
    if(e.historyId&&!e.componentId)issues.push({severity:'ERROR',code:'missing-component-scope',message:'History tidak memiliki component scope yang dapat dipertahankan.'});
    if(actual){
      if(actual.historyId!=null&&String(actual.historyId)!==String(e.historyId))issues.push({severity:'ERROR',code:'history-context-lost',message:'Navigation berpindah ke history yang berbeda.'});
      if(actual.componentId!=null&&String(actual.componentId)!==String(e.componentId))issues.push({severity:'ERROR',code:'component-context-lost',message:'Navigation kehilangan atau mengganti component focus.'});
      if(actual.vehicleId!=null&&String(actual.vehicleId)!==String(e.vehicleId))issues.push({severity:'ERROR',code:'vehicle-context-lost',message:'Navigation berpindah ke vehicle scope berbeda.'});
      if(actual.sessionId!=null&&e.sessionId&&String(actual.sessionId)!==String(e.sessionId))issues.push({severity:'WARNING',code:'session-context-changed',message:'Session berubah; diperbolehkan hanya bila history target memang berbeda.'});
    }
    if(f.logId&&e.historyId&&String(f.logId)!==String(e.historyId))issues.push({severity:'ERROR',code:'focus-history-mismatch',message:'Component focus tersimpan untuk history berbeda.'});
    if(f.componentId&&e.componentId&&String(f.componentId)!==String(e.componentId))issues.push({severity:'ERROR',code:'focus-component-mismatch',message:'Component focus aktif berbeda dari context yang diaudit.'});
    return {ok:!issues.some(x=>x.severity==='ERROR'),status:issues.some(x=>x.severity==='ERROR')?'ERROR':issues.some(x=>x.severity==='WARNING')?'WARNING':'OK',expected:e,actual:actual||null,focus:f,issues,readOnly:true};
  }
  function roundTrip(logId,cid,vehicleId,adapter){
    const before=snapshot(), e=expected(logId,cid,vehicleId); let actual=null;
    if(typeof adapter==='function')actual=adapter(e);
    const a=audit(logId,cid,vehicleId,actual), after=snapshot();
    a.historyUnchanged=before===after;
    if(!a.historyUnchanged){a.ok=false;a.status='ERROR';a.issues.push({severity:'ERROR',code:'history-mutated',message:'Round-trip mengubah D.servisLogs.'});}
    return a;
  }
  function render(a){
    if(!a)return '';
    const icon=a.status==='OK'?'✅':a.status==='WARNING'?'⚠️':'❌';
    const issues=a.issues&&a.issues.length?a.issues.map(x=>`<div style="margin-top:4px">${x.severity==='ERROR'?'❌':x.severity==='WARNING'?'⚠️':'ℹ️'} <b>${x.code}</b> · ${x.message}</div>`).join(''):'<div style="margin-top:4px">History → Reminder → Audit mempertahankan context yang sama.</div>';
    return `<div id="s2028HistoryReminderAuditRoundTrip" style="background:var(--surface3);border:1px solid var(--border2);border-radius:12px;padding:10px 12px;margin:0 0 12px;font-size:11px"><b>🔁 History → Reminder → Audit</b><div style="margin-top:5px">Status: <b>${icon} ${a.status}</b> · Component: <b>${a.expected&&a.expected.componentId||'—'}</b> · Vehicle: <b>${a.expected&&a.expected.vehicleId||'—'}</b></div><div style="margin-top:5px">History: <b>${a.expected&&a.expected.historyId||'—'}</b> · Session: <b>${a.expected&&a.expected.sessionId||'—'}</b> · ${a.historyUnchanged===false?'⚠️ history berubah':'✅ history tetap'}</div><div style="margin-top:5px">${issues}</div><div style="margin-top:6px;color:var(--text2)">Read-only audit · tidak membuat history/reminder baru dan tidak mengubah finance/evidence.</div></div>`;
  }
  function install(){
    const s=g.Servis;if(!s)return;
    const api={VERSION,expected,audit,roundTrip,render,install};
    s.serviceHistoryHistoryReminderAuditRoundTripS2028=api;g.ServiceHistoryHistoryReminderAuditRoundTripS2028=api;
  }
  if(g.Servis)install();else if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',install,{once:true});
})(typeof globalThis!=='undefined'?globalThis:window);
