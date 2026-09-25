/* S2025 — End-to-End Service History Evidence UX Integrity Audit
 * Read-only contract audit for Detail → Reminder → History → Audit.
 * Detects focus/navigation mismatches without changing persisted history.
 */
(function(g){'use strict';
  if(g.__SERVICE_HISTORY_EVIDENCE_UX_S2025__)return;
  g.__SERVICE_HISTORY_EVIDENCE_UX_S2025__=true;
  const VERSION='SERVICE-HISTORY-EVIDENCE-UX-S2025';
  const str=v=>v==null?'':String(v).trim();
  const arr=v=>Array.isArray(v)?v:[];
  const esc=v=>typeof g.escapeHtml==='function'?g.escapeHtml(v):String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const multi=()=>g.ServiceHistoryMultiChecklistS2019||null;
  const logs=()=>g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[];
  const components=log=>multi()&&typeof multi().componentsOf==='function'?(multi().componentsOf(log)||[]):[];
  const cidOf=c=>str(c&&(c.serviceComponentId||c.checklistItemId||c.key));
  const byId=id=>logs().find(x=>x&&String(x.id)===String(id))||null;
  function focus(log){
    const s=g.Servis||{}; const cid=str(s._s2019ComponentFocusId);
    if(!log||!cid)return null;
    return components(log).find(c=>cidOf(c)===cid)||null;
  }
  function audit(log,cid){
    const s=g.Servis||{}; const target=str(cid||s._s2019ComponentFocusId); const issues=[]; const info=[];
    if(!log)return {ok:false,status:'ERROR',issues:[{severity:'ERROR',code:'history-not-found',message:'History aktif tidak ditemukan.'}],component:null};
    const comps=components(log); const c=target?comps.find(x=>cidOf(x)===target):null;
    if(comps.length>1&&!target)issues.push({severity:'ERROR',code:'missing-component-focus',message:'Session memiliki beberapa komponen tetapi tidak ada component focus.'});
    if(target&&!c)issues.push({severity:'ERROR',code:'focus-component-not-found',message:'Component focus tidak ada pada history/session aktif.'});
    if(s.editId!=null&&String(s.editId)!==String(log.id))issues.push({severity:'ERROR',code:'edit-id-history-mismatch',message:'editId tidak menunjuk history yang sedang diaudit.'});
    if(target&&String(s._s2019ComponentFocusLogId||'')&&String(s._s2019ComponentFocusLogId)!==String(log.id))issues.push({severity:'WARNING',code:'focus-log-mismatch',message:'Focus component tersimpan untuk history berbeda.'});
    const hasHistory=typeof s.renderEditHistoryTab==='function';
    const hasReminder=typeof s.renderEditReminderTab==='function';
    const hasAudit=typeof s.renderEditAuditTab==='function';
    if(!hasHistory)issues.push({severity:'ERROR',code:'history-renderer-missing',message:'Renderer History tidak tersedia.'});
    if(!hasReminder)issues.push({severity:'ERROR',code:'reminder-renderer-missing',message:'Renderer Reminder tidak tersedia.'});
    if(!hasAudit)issues.push({severity:'ERROR',code:'audit-renderer-missing',message:'Renderer Audit tidak tersedia.'});
    if(c&&comps.length>1){
      const historyComponent=str(s.serviceHistoryComponentFilter);
      if(historyComponent&&historyComponent!==target)issues.push({severity:'WARNING',code:'history-filter-focus-mismatch',message:'Filter Komponen History berbeda dari component focus.'});
      const reminderItem=str(log.item);
      const componentName=str(c.componentName||c.itemName);
      if(reminderItem&&componentName&&reminderItem.toLowerCase()!==componentName.toLowerCase())
        issues.push({severity:'WARNING',code:'reminder-history-level-context',message:'Reminder renderer membaca item history-level, bukan component focus secara eksplisit.'});
      else info.push({code:'reminder-context-compatible',message:'Item history konsisten dengan nama component focus.'});
    }
    const ev=g.ServiceHistoryEvidenceS2021;
    if(c&&ev&&typeof ev.identity==='function'){
      const id=ev.identity(log,c)||{};
      if(!str(id.evidenceId))issues.push({severity:'WARNING',code:'missing-evidence-id',message:'Evidence identity tidak tersedia untuk component focus.'});
    }
    const prov=g.ServiceHistoryEvidenceProvenanceS2024;
    if(c&&prov&&typeof prov.provenance==='function'){
      const p=prov.provenance(log,target);
      if(p.status==='ERROR')issues.push({severity:'WARNING',code:'provenance-not-clean',message:'Provenance component memiliki issue.'});
    }
    const comp=g.ServiceHistoryEvidenceCompletenessS2023;
    if(c&&comp&&typeof comp.completeness==='function'){
      const r=comp.completeness(log,target);
      if(r.status==='ERROR')issues.push({severity:'WARNING',code:'evidence-completeness-error',message:'Evidence completeness memiliki error.'});
    }
    const lifecycle=g.ServiceHistoryEvidenceLifecycleS2022;
    if(c&&lifecycle&&typeof lifecycle.componentEvidence==='function'){
      const r=lifecycle.componentEvidence(log,target);
      if(r&&r.ok===false)issues.push({severity:'WARNING',code:'evidence-lifecycle-not-clean',message:'Evidence lifecycle component memiliki warning/error.'});
    }
    const summary={error:issues.filter(x=>x.severity==='ERROR').length,warning:issues.filter(x=>x.severity==='WARNING').length,info:info.length};
    return {ok:summary.error===0,status:summary.error?'ERROR':summary.warning?'WARNING':'OK',historyId:str(log.id)||null,sessionId:str(log.sessionId||log.serviceJobId)||null,vehicleId:str(log.vehicleId)||null,component:c,componentId:c?cidOf(c):target||null,componentCount:comps.length,issues,info,summary,contracts:{detail:true,reminder:hasReminder,history:hasHistory,audit:hasAudit}};
  }
  function current(){
    const s=g.Servis||{}; const log=byId(s.editId); return audit(log,str(s._s2019ComponentFocusId));
  }
  function render(log,cid){
    const a=audit(log,cid); const icon=s=>s==='OK'?'✅':s==='WARNING'?'⚠️':'❌';
    if(!a.historyId)return '';
    const issueHtml=a.issues.length?a.issues.map(x=>`<div style="margin-top:4px">${x.severity==='ERROR'?'❌':x.severity==='WARNING'?'⚠️':'ℹ️'} <b>${esc(x.code)}</b> · ${esc(x.message)}</div>`).join(''):'<div style="margin-top:5px">Tidak ditemukan gap pada kontrak navigasi yang diperiksa.</div>';
    return `<div id="s2025EvidenceUXIntegrity" style="background:var(--surface3);border:1px solid var(--border2);border-radius:12px;padding:10px 12px;margin:0 0 12px;font-size:11px"><b>🧭 Evidence UX integrity · E2E</b><div style="margin-top:5px">Status: <b>${icon(a.status)} ${a.status}</b> · ${a.componentCount} komponen · Focus: <b>${esc(a.component&& (a.component.componentName||a.component.itemName)||a.componentId||'—')}</b> · ID <b>${esc(a.componentId||'—')}</b></div><div style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:5px"><div>Detail: ${a.contracts.detail?'✅':'❌'}</div><div>Reminder: ${a.contracts.reminder?'✅':'❌'}</div><div>History: ${a.contracts.history?'✅':'❌'}</div><div>Audit: ${a.contracts.audit?'✅':'❌'}</div></div><div style="margin-top:7px">${issueHtml}</div><div style="margin-top:7px;color:var(--text2)">Read-only UX audit · tidak mengubah history, reminder, evidence, foto, biaya, atau transaksi.</div></div>`;
  }
  function install(){
    const s=g.Servis; if(!s)return;
    if(typeof s.renderEditAuditTab==='function'&&!s.__s2025EvidenceUXWrapped){
      const original=s.renderEditAuditTab; s.__s2025EvidenceUXWrapped=true;
      s.renderEditAuditTab=function(){
        original.apply(this,arguments);
        const log=byId(this.editId); const cid=str(this._s2019ComponentFocusId); if(!log)return;
        const panel=document.getElementById('servisAuditPanel'); if(!panel)return;
        const old=panel.querySelector('#s2025EvidenceUXIntegrity'); if(old)old.remove();
        const html=render(log,cid); if(!html)return; const box=document.createElement('div'); box.innerHTML=html; if(box.firstElementChild)panel.insertBefore(box.firstElementChild,panel.firstChild);
      };
    }
    const api={VERSION,audit,current,render,install};
    s.serviceHistoryEvidenceUXS2025=api; g.ServiceHistoryEvidenceUXS2025=api;
  }
  if(g.Servis)install(); else if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',install,{once:true});
})(typeof globalThis!=='undefined'?globalThis:window);
