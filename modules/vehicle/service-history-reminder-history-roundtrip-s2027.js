/* S2027 — Reminder → History Round-Trip Integrity
 * Read-only audit/projection for navigation from a component-scoped Reminder
 * back to the same vehicle/component History across sessions and legacy rows.
 * Never creates, edits, deletes, relinks, or mutates persisted service history.
 */
(function(g){'use strict';
  if(g.__SERVICE_HISTORY_REMINDER_HISTORY_ROUNDTRIP_S2027__)return;
  g.__SERVICE_HISTORY_REMINDER_HISTORY_ROUNDTRIP_S2027__=true;
  const VERSION='SERVICE-HISTORY-REMINDER-HISTORY-ROUNDTRIP-S2027';
  const str=v=>v==null?'':String(v).trim();
  const logs=()=>g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[];
  const multi=()=>g.ServiceHistoryMultiChecklistS2019||null;
  const components=log=>multi()&&typeof multi().componentsOf==='function'?(multi().componentsOf(log)||[]):[];
  const cidOf=c=>str(c&&(c.serviceComponentId||c.checklistItemId||c.key));
  const vidOf=log=>str(log&&log.vehicleId||g.curVehicleId);
  const componentInLog=(log,cid)=>components(log).find(c=>cidOf(c)===str(cid))||null;
  const matches=(log,cid,vehicleId)=>!!(log&&vidOf(log)===str(vehicleId)&&componentInLog(log,cid));
  function candidates(cid,vehicleId){
    return logs().filter(x=>matches(x,cid,vehicleId)).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.km||0)-Number(a.km||0)||String(b.id||'').localeCompare(String(a.id||'')));
  }
  function expected(categoryId,cid,vehicleId){
    const rows=candidates(cid,vehicleId);
    return {historyId:rows[0]?str(rows[0].id):null,historyCount:rows.length,categoryId:categoryId==null?null:str(categoryId),componentId:str(cid)||null,vehicleId:str(vehicleId)||null,sessionId:rows[0]?str(rows[0].sessionId||rows[0].serviceJobId):null};
  }
  function snapshot(){return JSON.stringify(logs());}
  function audit(categoryId,cid,vehicleId,actual){
    const e=expected(categoryId,cid,vehicleId==null?g.curVehicleId:vehicleId); const issues=[];
    if(!e.componentId)issues.push({severity:'ERROR',code:'missing-component-id',message:'Reminder tidak membawa component identity.'});
    if(!e.vehicleId)issues.push({severity:'ERROR',code:'missing-vehicle-scope',message:'Vehicle scope tidak tersedia.'});
    if(actual&&actual.historyId){const allowed=candidates(cid,vehicleId==null?g.curVehicleId:vehicleId).some(x=>String(x.id)===String(actual.historyId));if(!allowed)issues.push({severity:'ERROR',code:'history-target-mismatch',message:'Reminder kembali ke history component/vehicle yang berbeda.'});}
    if(actual&&actual.componentId&&String(actual.componentId)!==String(e.componentId))issues.push({severity:'ERROR',code:'component-target-mismatch',message:'History target memiliki component berbeda dari Reminder.'});
    if(actual&&actual.vehicleId&&String(actual.vehicleId)!==String(e.vehicleId))issues.push({severity:'ERROR',code:'vehicle-target-mismatch',message:'History target berada pada vehicle scope berbeda.'});
    if(e.historyCount===0)issues.push({severity:'INFO',code:'no-history-for-component',message:'Belum ada history untuk component ini; navigation boleh tetap tanpa membuat history baru.'});
    return {ok:!issues.some(x=>x.severity==='ERROR'),status:issues.some(x=>x.severity==='ERROR')?'ERROR':issues.some(x=>x.severity==='WARNING')?'WARNING':'OK',expected:e,actual:actual||null,issues,readOnly:true};
  }
  function roundTrip(categoryId,cid,vehicleId,adapter){
    const before=snapshot(); const e=expected(categoryId,cid,vehicleId==null?g.curVehicleId:vehicleId); let actual=null;
    if(typeof adapter==='function')actual=adapter(categoryId,cid,vehicleId==null?g.curVehicleId:vehicleId);
    const after=snapshot(); const a=audit(categoryId,cid,vehicleId,actual);
    if(before!==after)a.issues.push({severity:'ERROR',code:'history-mutated',message:'Round-trip mengubah D.servisLogs.'}),a.ok=false,a.status='ERROR';
    return Object.assign(a,{beforeHash:before.length,afterHash:after.length,historyUnchanged:before===after});
  }
  function render(a){
    if(!a)return '';
    const icon=a.status==='OK'?'✅':a.status==='WARNING'?'⚠️':'❌';
    const issues=a.issues&&a.issues.length?a.issues.map(x=>`<div style="margin-top:4px">${x.severity==='ERROR'?'❌':x.severity==='WARNING'?'⚠️':'ℹ️'} <b>${x.code}</b> · ${x.message}</div>`).join(''):'<div style="margin-top:4px">Reminder → History kembali ke component dan vehicle scope yang sama.</div>';
    return `<div id="s2027ReminderHistoryRoundTrip" style="background:var(--surface3);border:1px solid var(--border2);border-radius:12px;padding:10px 12px;margin:0 0 12px;font-size:11px"><b>↩️ Reminder → History round-trip</b><div style="margin-top:5px">Status: <b>${icon} ${a.status}</b> · Component: <b>${a.expected&&a.expected.componentId||'—'}</b> · Vehicle: <b>${a.expected&&a.expected.vehicleId||'—'}</b></div><div style="margin-top:5px">Target history: <b>${a.expected&&a.expected.historyId||'—'}</b> · ${a.historyUnchanged===false?'⚠️ history berubah':'✅ history tetap'}</div><div style="margin-top:5px">${issues}</div><div style="margin-top:6px;color:var(--text2)">Read-only audit · tidak membuat history baru, tidak menduplikasi row, dan tidak mengubah finance/evidence.</div></div>`;
  }
  function install(){
    const s=g.Servis;if(!s)return;
    const api={VERSION,expected,audit,roundTrip,render,candidates,install};
    s.serviceHistoryReminderHistoryRoundTripS2027=api;g.ServiceHistoryReminderHistoryRoundTripS2027=api;
  }
  if(g.Servis)install();else if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',install,{once:true});
})(typeof globalThis!=='undefined'?globalThis:window);
