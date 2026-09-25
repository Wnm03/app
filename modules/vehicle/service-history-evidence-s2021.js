/* S2021 — Checklist Evidence Identity
 * Read-only projection for one history session containing multiple checklist components.
 * Evidence identity is deterministic: historyId + checklistItemId when available,
 * otherwise historyId + canonical serviceComponentId. No history mutation.
 */
(function(g){'use strict';
  if(g.__SERVICE_HISTORY_EVIDENCE_S2021__)return;
  g.__SERVICE_HISTORY_EVIDENCE_S2021__=true;
  const VERSION='SERVICE-HISTORY-EVIDENCE-S2021';
  const str=v=>v==null?'':String(v).trim();
  const esc=v=>typeof g.escapeHtml==='function'?g.escapeHtml(v):String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const api=()=>g.ServiceHistoryMultiChecklistS2019||null;
  function components(log){return api()&&typeof api().componentsOf==='function'?(api().componentsOf(log)||[]):[];}
  function identity(log,comp){
    if(!log||!comp)return null;
    const historyId=str(log.id); const checklistItemId=str(comp.checklistItemId); const serviceComponentId=str(comp.serviceComponentId||comp.key);
    const evidencePart=checklistItemId||serviceComponentId||'legacy';
    return {
      version:VERSION,
      historyId:historyId||null,
      checklistItemId:checklistItemId||null,
      serviceComponentId:serviceComponentId||null,
      evidenceId:historyId?('evidence:'+historyId+':'+evidencePart):null,
      vehicleId:str(log.vehicleId)||null,
      sessionId:str(log.sessionId||log.serviceJobId)||null,
      masterCategoryId:str(comp.masterCategoryId)||null,
      componentName:str(comp.componentName)||null
    };
  }
  function find(log,cid){const target=str(cid);return components(log).find(c=>str(c.serviceComponentId||c.checklistItemId||c.key)===target)||null;}
  function evidenceFor(log,cid){const c=find(log,cid);return c?identity(log,c):null;}
  function sessionEvidence(log){return components(log).map(c=>identity(log,c)).filter(Boolean);}
  function uniqueSessionEvidence(log){const seen=new Set();return sessionEvidence(log).filter(e=>e&&e.evidenceId&&!seen.has(e.evidenceId)&&(seen.add(e.evidenceId),true));}
  function auditEvidence(log,cid){
    const e=evidenceFor(log,cid); if(!e)return {ok:false,issues:['component-not-found'],evidence:null};
    const issues=[];
    if(!e.historyId)issues.push('missing-history-id');
    if(!e.serviceComponentId)issues.push('missing-service-component');
    if(!e.vehicleId)issues.push('missing-vehicle');
    return {ok:issues.length===0,issues,evidence:e};
  }
  function render(log,cid){
    const a=auditEvidence(log,cid); if(!a.evidence)return '';
    const e=a.evidence;
    return `<div id="s2021EvidenceIdentity" style="background:var(--surface3);border:1px solid var(--border2);border-radius:12px;padding:10px 12px;margin:0 0 12px;font-size:11px"><b>🧾 Evidence komponen</b><div style="margin-top:5px">🎯 <b>${esc(e.componentName||'Komponen')}</b> · ${esc(e.serviceComponentId||'legacy')}</div><div style="margin-top:4px">Evidence ID: <b>${esc(e.evidenceId||'—')}</b></div><div style="margin-top:4px">History: ${esc(e.historyId||'—')} · Checklist: ${esc(e.checklistItemId||'—')}</div><div style="margin-top:4px">${a.ok?'✅ Identity bukti konsisten':'⚠️ '+a.issues.map(esc).join(', ')}</div></div>`;
  }
  function install(){
    if(!g.Servis)return;
    if(typeof g.Servis.renderEditAuditTab==='function'&&!g.Servis.__s2021EvidenceWrapped){
      const original=g.Servis.renderEditAuditTab; g.Servis.__s2021EvidenceWrapped=true;
      g.Servis.renderEditAuditTab=function(){
        original.apply(this,arguments);
        const log=(g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[]).find(x=>x&&String(x.id)===String(this.editId));
        const cid=str(this._s2019ComponentFocusId); if(!log||!cid)return;
        const panel=document.getElementById('servisAuditPanel'); if(!panel)return;
        const old=panel.querySelector('#s2021EvidenceIdentity'); if(old)old.remove();
        const html=render(log,cid); if(!html)return;
        const box=document.createElement('div'); box.innerHTML=html;
        if(box.firstElementChild)panel.insertBefore(box.firstElementChild,panel.firstChild);
      };
    }
    g.Servis.serviceHistoryEvidenceS2021={VERSION,identity,find,evidenceFor,sessionEvidence,uniqueSessionEvidence,auditEvidence,render};
    g.ServiceHistoryEvidenceS2021={VERSION,identity,find,evidenceFor,sessionEvidence,uniqueSessionEvidence,auditEvidence,render,install};
  }
  if(g.Servis)install(); else if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',install,{once:true});
})(typeof globalThis!=='undefined'?globalThis:window);
