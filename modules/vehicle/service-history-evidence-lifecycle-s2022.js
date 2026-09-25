/* S2022 — Evidence Lifecycle & Component Isolation Audit
 * Read-only projection over persisted service-history evidence.
 * Never mutates servisLogs, never reallocates cost, never relinks finance.
 * Component-owned evidence is accepted only when the persisted checklist
 * snapshot carries the evidence for that component. History/session-level
 * fields remain explicitly scoped instead of being copied to every component.
 */
(function(g){'use strict';
  if(g.__SERVICE_HISTORY_EVIDENCE_LIFECYCLE_S2022__)return;
  g.__SERVICE_HISTORY_EVIDENCE_LIFECYCLE_S2022__=true;
  const VERSION='SERVICE-HISTORY-EVIDENCE-LIFECYCLE-S2022';
  const str=v=>v==null?'':String(v).trim();
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
  const esc=v=>typeof g.escapeHtml==='function'?g.escapeHtml(v):String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const multi=()=>g.ServiceHistoryMultiChecklistS2019||null;
  function components(log){return multi()&&typeof multi().componentsOf==='function'?(multi().componentsOf(log)||[]):[];}
  function cidOf(c){return str(c&& (c.serviceComponentId||c.checklistItemId||c.key));}
  function find(log,cid){
    const target=str(cid);
    const c=components(log).find(c=>cidOf(c)===target)||null;
    if(!c||!log)return c;
    // S2019 intentionally exposes navigation identity only. Rehydrate persisted
    // evidence fields from the checklist snapshot without mutating the source.
    const raw=Array.isArray(log.checklist)?log.checklist.find(x=>{
      const a=str(x&&((x.serviceComponentId)||(x.itemId)||(x.checklistItemId)));
      return a===target || a===str(c.serviceComponentId) || a===str(c.checklistItemId);
    }):null;
    if(raw)return Object.assign({},c,raw,{serviceComponentId:c.serviceComponentId||raw.serviceComponentId||raw.itemId,checklistItemId:c.checklistItemId||raw.itemId});
    return c;
  }
  function lifecycle(log,cid){
    const c=find(log,cid);
    if(!log||!c)return {ok:false,component:null,evidence:null,issues:['component-not-found']};
    const issues=[];
    const warnings=[];
    const evidence={
      version:VERSION,
      evidenceId:g.ServiceHistoryEvidenceS2021&&typeof g.ServiceHistoryEvidenceS2021.identity==='function'?g.ServiceHistoryEvidenceS2021.identity(log,c)?.evidenceId:null,
      historyId:str(log.id)||null,
      sessionId:str(log.sessionId||log.serviceJobId)||null,
      vehicleId:str(log.vehicleId)||null,
      serviceComponentId:str(c.serviceComponentId||c.checklistItemId)||null,
      checklistItemId:str(c.checklistItemId)||null,
      componentName:str(c.componentName||c.itemName||c.name)||null,
      condition:{status:c.conditionResult!=null||str(c.conditionNote)!=='','scope':'component',result:c.conditionResult??null,note:str(c.conditionNote)},
      photos:{count:0,scope:'none',status:'none'},
      cost:{amount:0,scope:'none',status:'none',breakdown:null},
      parts:{count:0,scope:'none',status:'none',refs:[]},
      note:{value:'',scope:'history',status:'history-level'},
      finance:{accountId:str(log.accountId)||null,txLinkId:str(log.txLinkId)||null,scope:'history',status:log.txLinkId?'history-linked':'none'}
    };
    const photos=Array.isArray(c.photos)?c.photos:(Array.isArray(c.foto)?c.foto:null);
    if(photos){
      evidence.photos.count=photos.length;
      evidence.photos.scope='component';
      evidence.photos.status='component-owned';
    }else if(Array.isArray(log.foto)&&log.foto.length){
      evidence.photos.count=log.foto.length;
      evidence.photos.scope='history';
      evidence.photos.status='history-level';
    }
    const cb=c.costBreakdown&&typeof c.costBreakdown==='object'?c.costBreakdown:null;
    if(cb&&cb.source==='component'){
      const total=num(cb.total)??0;
      evidence.cost={amount:total,scope:'component',status:'component-owned',breakdown:{labor:num(cb.labor),parts:num(cb.parts),consumables:num(cb.consumables),other:num(cb.other),total}};
    }else if(c.cost!=null&&num(c.cost)!=null&&num(c.cost)>0&&components(log).length===1){
      evidence.cost={amount:num(c.cost),scope:'component',status:'attributable-single-component',breakdown:null};
    }else if(num(log.cost)!=null&&num(log.cost)>0){
      evidence.cost={amount:num(log.cost),scope:'history',status:'history-level',breakdown:null};
    }
    const refs=Array.isArray(c.catalogPartRefs)?c.catalogPartRefs.filter(Boolean).map(r=>({catalogId:str(r.catalogId)||null,qty:num(r.qty)??1})):[];
    if(refs.length||c.usedPartId){
      evidence.parts={count:refs.length+(c.usedPartId?1:0),scope:'component',status:'component-owned',refs,usedPartId:str(c.usedPartId)||null,usedPartQty:num(c.usedPartQty)??0};
    }else if(log.usedPartId||Array.isArray(log.catalogPartRefs)&&log.catalogPartRefs.length){
      evidence.parts={count:1,scope:'history',status:'history-level',refs:Array.isArray(log.catalogPartRefs)?log.catalogPartRefs.slice():[]};
    }
    if(str(log.note))evidence.note={value:str(log.note),scope:'history',status:'history-level'};
    if(!evidence.serviceComponentId)issues.push('missing-service-component');
    if(!evidence.historyId)issues.push('missing-history-id');
    if(!evidence.vehicleId)issues.push('missing-vehicle');
    if(evidence.finance.txLinkId&&evidence.cost.status==='component-owned')warnings.push('finance-link-remains-history-level');
    return {ok:issues.length===0,component:c,evidence,issues,warnings};
  }
  function componentEvidence(log,cid){return lifecycle(log,cid);}
  function sessionAudit(log){return components(log).map(c=>lifecycle(log,cidOf(c)));}
  function leakage(log){
    const rows=sessionAudit(log); const issues=[];
    rows.forEach(r=>{
      if(!r.evidence)return;
      if(r.evidence.photos.status==='history-level'&&rows.length>1)issues.push({type:'photo-history-level',componentId:r.evidence.serviceComponentId});
      if(r.evidence.cost.status==='history-level'&&rows.length>1)issues.push({type:'cost-history-level',componentId:r.evidence.serviceComponentId});
      if(r.warnings&&r.warnings.includes('finance-link-remains-history-level')){}
    });
    return {ok:issues.length===0,issues,rows};
  }
  function render(log,cid){
    const a=lifecycle(log,cid); if(!a.evidence)return '';
    const e=a.evidence, badge=(s)=>s==='component-owned'||s==='attributable-single-component'?'✅ component':s==='history-level'?'⚠️ history':'—';
    const issueHtml=a.issues.length?`<div style="margin-top:7px;color:var(--danger,#b42318)">⚠️ ${a.issues.map(esc).join(', ')}</div>`:'';
    const warningHtml=a.warnings&&a.warnings.length?`<div style="margin-top:7px">ℹ️ ${a.warnings.map(esc).join(', ')}</div>`:'';
    return `<div id="s2022EvidenceLifecycle" style="background:var(--surface3);border:1px solid var(--border2);border-radius:12px;padding:10px 12px;margin:0 0 12px;font-size:11px"><b>🔬 Evidence lifecycle</b><div style="margin-top:5px">🎯 <b>${esc(e.componentName||'Komponen')}</b> · ${esc(e.serviceComponentId||'legacy')}</div><div style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:5px"><div>☑️ Checklist: ${e.checklistItemId?'teridentifikasi':'tidak teridentifikasi'}</div><div>🩺 Kondisi: ${e.condition.status?'component':'—'}</div><div>📷 Foto: ${e.photos.count} · ${badge(e.photos.status)}</div><div>💰 Biaya: Rp ${Number(e.cost.amount||0).toLocaleString('id-ID')} · ${badge(e.cost.status)}</div><div>📦 Part: ${e.parts.count} · ${badge(e.parts.status)}</div><div>📝 Catatan: ${e.note.status==='history-level'?'history-level':'—'}</div></div><div style="margin-top:7px">💳 Finance: ${e.finance.txLinkId?`TX ${esc(e.finance.txLinkId)} · history-linked`:'tidak terhubung'}</div>${issueHtml}${warningHtml}<div style="margin-top:6px;color:var(--text2)">Read-only audit · tidak memindahkan foto/biaya/part dan tidak mengubah transaksi.</div></div>`;
  }
  function install(){
    if(!g.Servis)return;
    if(typeof g.Servis.renderEditAuditTab==='function'&&!g.Servis.__s2022EvidenceLifecycleWrapped){
      const original=g.Servis.renderEditAuditTab;g.Servis.__s2022EvidenceLifecycleWrapped=true;
      g.Servis.renderEditAuditTab=function(){
        original.apply(this,arguments);
        const log=(g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[]).find(x=>x&&String(x.id)===String(this.editId));
        const cid=str(this._s2019ComponentFocusId);if(!log||!cid)return;
        const panel=document.getElementById('servisAuditPanel');if(!panel)return;
        const old=panel.querySelector('#s2022EvidenceLifecycle');if(old)old.remove();
        const html=render(log,cid);if(!html)return;
        const box=document.createElement('div');box.innerHTML=html;if(box.firstElementChild)panel.insertBefore(box.firstElementChild,panel.firstChild);
      };
    }
    g.Servis.serviceHistoryEvidenceLifecycleS2022={VERSION,find,componentEvidence,sessionAudit,leakage,render};
    g.ServiceHistoryEvidenceLifecycleS2022={VERSION,find,componentEvidence,sessionAudit,leakage,render,install};
  }
  if(g.Servis)install();else if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',install,{once:true});
})(typeof globalThis!=='undefined'?globalThis:window);
