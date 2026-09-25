/* S2029 — Legacy + Multi-Component + Reload Integrity
 * Read-only audit/projection for reconstructing service-history context after reload
 * and across legacy/multi-component rows. Never mutates persisted service history.
 */
(function(g){'use strict';
  if(g.__SERVICE_HISTORY_LEGACY_MULTICOMPONENT_RELOAD_S2029__)return;
  g.__SERVICE_HISTORY_LEGACY_MULTICOMPONENT_RELOAD_S2029__=true;
  const VERSION='SERVICE-HISTORY-LEGACY-MULTICOMPONENT-RELOAD-S2029';
  const str=v=>v==null?'':String(v).trim();
  const logs=()=>g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[];
  const byId=id=>logs().find(x=>x&&String(x.id)===String(id))||null;
  const multi=()=>g.ServiceHistoryMultiChecklistS2019||null;
  const components=log=>multi()&&typeof multi().componentsOf==='function'?(multi().componentsOf(log)||[]):[];
  const cidOf=c=>str(c&&(c.serviceComponentId||c.checklistItemId||c.key));
  const vidOf=log=>str(log&&log.vehicleId||g.curVehicleId);
  const sidOf=log=>str(log&&(log.sessionId||log.serviceJobId));
  function component(log,cid){const target=str(cid);return target?components(log).find(c=>cidOf(c)===target)||null:null;}
  function classify(log){
    if(!log)return 'missing';
    if(Array.isArray(log.checklist)&&log.checklist.length>1)return 'multi-component';
    if(Array.isArray(log.checklist)&&log.checklist.length===1)return 'single-checklist';
    if(log.serviceComponentId||log.serviceComponentNameSnapshot||log.item)return 'legacy-history';
    return 'unscoped';
  }
  function sessionRows(log){
    if(!log)return [];
    if(multi()&&typeof multi().sessionRows==='function')return multi().sessionRows(log)||[];
    const sid=sidOf(log),vid=vidOf(log);return sid?logs().filter(x=>x&&sidOf(x)===sid&&vidOf(x)===vid):[log];
  }
  function sessionComponents(log){
    if(!log)return [];
    if(multi()&&typeof multi().sessionComponents==='function')return multi().sessionComponents(log)||[];
    const out=[],seen=new Set();sessionRows(log).forEach(r=>components(r).forEach(c=>{const id=cidOf(c);if(id&&!seen.has(id)){seen.add(id);out.push(c);}}));return out;
  }
  function resolve(logId,cid,vehicleId){
    const log=byId(logId), vid=vehicleId==null?vidOf(log):str(vehicleId), c=component(log,cid), sid=sidOf(log);
    return {historyId:log?str(log.id):null,vehicleId:vid||null,sessionId:sid||null,componentId:c?cidOf(c):str(cid)||null,componentName:c?str(c.componentName):null,rowType:classify(log),componentFound:!!c,componentCount:components(log).length,sessionComponentCount:sessionComponents(log).length,sessionRowCount:sessionRows(log).length,legacy:classify(log)==='legacy-history',reloadable:!!(log&&c&&vid)};
  }
  function compareAfterReload(target,after){
    const issues=[];const e=target||{};const a=after||{};
    if(!e.historyId)issues.push({severity:'ERROR',code:'history-not-found',message:'History target tidak ditemukan.'});
    if(!e.vehicleId)issues.push({severity:'ERROR',code:'vehicle-scope-missing',message:'Vehicle scope tidak tersedia.'});
    if(e.historyId&&!e.componentFound){ if(e.rowType==='unscoped')issues.push({severity:'WARNING',code:'component-not-found',message:'History lama tidak memiliki component identity yang dapat direkonstruksi.'}); else issues.push({severity:'ERROR',code:'component-not-found',message:'Component target tidak ditemukan pada history.'}); }
    if(e.componentId&&!a.componentId)issues.push({severity:'WARNING',code:'component-focus-not-restored',message:'Setelah reload component focus runtime belum dipulihkan; target masih dapat direkonstruksi dari historyId + componentId.'});
    if(a.historyId&&String(a.historyId)!==String(e.historyId))issues.push({severity:'ERROR',code:'history-context-changed',message:'Reload menghasilkan history yang berbeda.'});
    if(a.vehicleId&&String(a.vehicleId)!==String(e.vehicleId))issues.push({severity:'ERROR',code:'vehicle-context-changed',message:'Reload menghasilkan vehicle scope berbeda.'});
    if(a.componentId&&e.componentId&&String(a.componentId)!==String(e.componentId))issues.push({severity:'ERROR',code:'component-context-changed',message:'Reload menghasilkan component berbeda.'});
    if(e.rowType==='unscoped')issues.push({severity:'WARNING',code:'unscoped-history',message:'History lama tidak memiliki component identity yang dapat direkonstruksi.'});
    if(e.legacy)issues.push({severity:'INFO',code:'legacy-history-projection',message:'Legacy history dipertahankan melalui projection S2019; data sumber tidak dimigrasikan.'});
    if(e.componentCount>1)issues.push({severity:'INFO',code:'multi-component-session',message:'Multi-component context dipertahankan melalui serviceComponentId, bukan checklist[0].'});
    return {ok:!issues.some(x=>x.severity==='ERROR'),status:issues.some(x=>x.severity==='ERROR')?'ERROR':issues.some(x=>x.severity==='WARNING')?'WARNING':'OK',expected:e,actual:a,issues,readOnly:true};
  }
  function audit(logId,cid,vehicleId,after){return compareAfterReload(resolve(logId,cid,vehicleId),after);}
  function snapshot(){return JSON.stringify(logs());}
  function roundTrip(logId,cid,vehicleId,adapter){
    const before=snapshot(), target=resolve(logId,cid,vehicleId);let after=null;
    if(typeof adapter==='function')after=adapter(JSON.parse(JSON.stringify(target)));
    const result=audit(logId,cid,vehicleId,after);const unchanged=before===snapshot();result.historyUnchanged=unchanged;
    if(!unchanged){result.ok=false;result.status='ERROR';result.issues.push({severity:'ERROR',code:'history-mutated',message:'Reload audit mengubah D.servisLogs.'});}
    return result;
  }
  function render(a){
    if(!a)return '';
    const icon=a.status==='OK'?'✅':a.status==='WARNING'?'⚠️':'❌';
    const issues=a.issues&&a.issues.length?a.issues.map(x=>`<div style="margin-top:4px">${x.severity==='ERROR'?'❌':x.severity==='WARNING'?'⚠️':'ℹ️'} <b>${x.code}</b> · ${x.message}</div>`).join(''):'<div style="margin-top:4px">Context dapat direkonstruksi dengan vehicle + history + component identity.</div>';
    return `<div id="s2029LegacyMultiReloadIntegrity" style="background:var(--surface3);border:1px solid var(--border2);border-radius:12px;padding:10px 12px;margin:0 0 12px;font-size:11px"><b>🔄 Legacy · Multi-component · Reload integrity</b><div style="margin-top:5px">Status: <b>${icon} ${a.status}</b> · Component: <b>${a.expected&&a.expected.componentId||'—'}</b> · Vehicle: <b>${a.expected&&a.expected.vehicleId||'—'}</b></div><div style="margin-top:5px">Row: <b>${a.expected&&a.expected.rowType||'—'}</b> · Session rows: <b>${a.expected&&a.expected.sessionRowCount||0}</b> · Components: <b>${a.expected&&a.expected.sessionComponentCount||0}</b> · ${a.historyUnchanged===false?'⚠️ history berubah':'✅ history tetap'}</div><div style="margin-top:5px">${issues}</div><div style="margin-top:6px;color:var(--text2)">Read-only audit · reload tidak membuat history/reminder baru dan tidak mengubah finance/evidence.</div></div>`;
  }
  function install(){
    const s=g.Servis;if(!s)return;
    const api={VERSION,resolve,audit,compareAfterReload,roundTrip,render,classify,sessionRows,sessionComponents,install};
    s.serviceHistoryLegacyMultiComponentReloadS2029=api;g.ServiceHistoryLegacyMultiComponentReloadS2029=api;
  }
  if(g.Servis)install();else if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',install,{once:true});
})(typeof globalThis!=='undefined'?globalThis:window);
