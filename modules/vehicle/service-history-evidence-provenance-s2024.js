/* S2024 — Evidence Traceability & Provenance
 * Read-only provenance map for persisted service-history evidence.
 * Explains exactly where each evidence item comes from without creating a new
 * source of truth, relinking finance, moving photos, or mutating history.
 */
(function(g){'use strict';
  if(g.__SERVICE_HISTORY_EVIDENCE_PROVENANCE_S2024__)return;
  g.__SERVICE_HISTORY_EVIDENCE_PROVENANCE_S2024__=true;
  const VERSION='SERVICE-HISTORY-EVIDENCE-PROVENANCE-S2024';
  const str=v=>v==null?'':String(v).trim();
  const arr=v=>Array.isArray(v)?v:[];
  const multi=()=>g.ServiceHistoryMultiChecklistS2019||null;
  const evidence=()=>g.ServiceHistoryEvidenceS2021||null;
  function components(log){return multi()&&typeof multi().componentsOf==='function'?(multi().componentsOf(log)||[]):[];}
  function cidOf(c){return str(c&&(c.serviceComponentId||c.checklistItemId||c.key));}
  function rawChecklist(log,cid){
    const target=str(cid); const list=arr(log&&log.checklist);
    return list.find((x,i)=>{const ids=[x&&x.serviceComponentId,x&&x.itemId,x&&x.checklistItemId,x&&x.key].map(str);return ids.includes(target);})||null;
  }
  function checklistIndex(log,raw){const list=arr(log&&log.checklist);return raw?list.indexOf(raw):-1;}
  function componentRow(log,cid){
    const comps=components(log); const c=comps.find(x=>cidOf(x)===str(cid))||null;
    const raw=rawChecklist(log,cid); const idx=checklistIndex(log,raw);
    return {component:c,raw,index:idx};
  }
  function identity(log,c){
    const id=evidence();
    if(id&&typeof id.identity==='function'){
      const r=id.identity(log,c)||{};
      return {evidenceId:str(r.evidenceId)||null,historyId:str(log&&log.id)||null,sessionId:str(log&&(log.sessionId||log.serviceJobId))||null,vehicleId:str(log&&log.vehicleId)||null,serviceComponentId:cidOf(c)||null,checklistItemId:str(c&&c.checklistItemId)||str(c&&c.itemId)||null};
    }
    return {evidenceId:null,historyId:str(log&&log.id)||null,sessionId:str(log&&(log.sessionId||log.serviceJobId))||null,vehicleId:str(log&&log.vehicleId)||null,serviceComponentId:cidOf(c)||null,checklistItemId:str(c&&c.checklistItemId)||str(c&&c.itemId)||null};
  }
  function ref(kind,scope,field,value,detail){return {kind,scope,field,value:value==null?null:value,detail:detail||null};}
  function provenance(log,cid){
    const cr=componentRow(log,cid), c=cr.component, raw=cr.raw;
    if(!log||!c)return {ok:false,status:'ERROR',issues:['component-not-found'],identity:null,source:null,items:[]};
    const id=identity(log,c); const items=[]; const issues=[]; const source={historyId:str(log.id)||null,historyPath:'D.servisLogs',checklistPath:cr.index>=0?`D.servisLogs[].checklist[${cr.index}]`:null,checklistIndex:cr.index};
    if(!id.historyId)issues.push('missing-history-id');
    if(!id.serviceComponentId)issues.push('missing-service-component-id');
    if(!raw)issues.push('component-checklist-snapshot-not-found');
    const add=(kind,scope,field,value,detail)=>items.push(ref(kind,scope,field,value,detail));
    add('identity','history','id',id.historyId,'history record identity');
    add('identity','history','sessionId',id.sessionId,'parent session context');
    add('identity','history','vehicleId',id.vehicleId,'vehicle scope');
    add('identity','component','serviceComponentId',id.serviceComponentId,'canonical component identity');
    add('identity','component','checklistItemId',id.checklistItemId,'checklist navigation identity');
    add('identity','derived','evidenceId',id.evidenceId,'S2021 evidence identity');
    if(raw){
      add('condition','component','conditionResult',raw.conditionResult??null,`checklist[${cr.index}]`);
      add('condition','component','conditionNote',raw.conditionNote??null,`checklist[${cr.index}]`);
      if(Array.isArray(raw.photos))add('photo','component','photos',raw.photos.length,`checklist[${cr.index}].photos`);
      else if(Array.isArray(raw.foto))add('photo','component','foto',raw.foto.length,`checklist[${cr.index}].foto`);
      if(raw.costBreakdown&&typeof raw.costBreakdown==='object')add('cost','component','costBreakdown',raw.costBreakdown.total??null,`checklist[${cr.index}].costBreakdown`);
      else if(raw.cost!=null)add('cost','component','cost',raw.cost,`checklist[${cr.index}].cost`);
      if(Array.isArray(raw.catalogPartRefs))add('part','component','catalogPartRefs',raw.catalogPartRefs.length,`checklist[${cr.index}].catalogPartRefs`);
      if(raw.usedPartId)add('part','component','usedPartId',raw.usedPartId,`checklist[${cr.index}].usedPartId`);
      if(raw.serviceEvidence&&typeof raw.serviceEvidence==='object'){
        if(raw.serviceEvidence.transactionId!=null)add('finance','component-evidence','serviceEvidence.transactionId',raw.serviceEvidence.transactionId,`checklist[${cr.index}].serviceEvidence`);
        if(Array.isArray(raw.serviceEvidence.photos))add('photo','component-evidence','serviceEvidence.photos',raw.serviceEvidence.photos.length,`checklist[${cr.index}].serviceEvidence`);
      }
    }
    if(log.note!=null)add('note','history','note',log.note,'history-level source; not assigned to component');
    if(Array.isArray(log.foto)&&log.foto.length)add('photo','history','foto',log.foto.length,'history-level source; not assigned to component');
    if(log.cost!=null)add('cost','history','cost',log.cost,'history-level/row-level source; not silently allocated');
    if(log.accountId!=null)add('finance','history','accountId',log.accountId,'history-level finance context');
    if(log.txLinkId!=null)add('finance','history','txLinkId',log.txLinkId,'history-level transaction linkage');
    if(raw&&raw.txLinkId!=null)add('finance','component-row','txLinkId',raw.txLinkId,`checklist[${cr.index}] row linkage`);
    const hasHistoryEvidence=items.some(x=>x.scope==='history'&&['photo','cost','note'].includes(x.kind));
    const status=issues.length?'ERROR':(hasHistoryEvidence&&components(log).length>1?'WARNING':'OK');
    return {ok:issues.length===0,status,identity:id,source,component:c,items,issues,derived:{componentCount:components(log).length,historyLevelEvidence:items.filter(x=>x.scope==='history').length,componentEvidence:items.filter(x=>x.scope==='component').length}};
  }
  function sessionProvenance(log){
    const rows=components(log).map(c=>provenance(log,cidOf(c))); const history=[];
    if(log&&log.id!=null)history.push(ref('identity','history','id',log.id,'D.servisLogs history record'));
    if(log&&log.sessionId!=null)history.push(ref('identity','history','sessionId',log.sessionId,'session parent'));
    if(log&&log.vehicleId!=null)history.push(ref('identity','history','vehicleId',log.vehicleId,'vehicle scope'));
    if(log&&log.cost!=null)history.push(ref('cost','history','cost',log.cost,'history-level cost'));
    if(log&&log.txLinkId!=null)history.push(ref('finance','history','txLinkId',log.txLinkId,'history-level finance linkage'));
    if(log&&Array.isArray(log.foto)&&log.foto.length)history.push(ref('photo','history','foto',log.foto.length,'history-level photos'));
    return {ok:rows.every(r=>r.ok),status:rows.some(r=>r.status==='ERROR')?'ERROR':rows.some(r=>r.status==='WARNING')?'WARNING':'OK',history,rows,componentCount:rows.length};
  }
  function find(log,cid,kind){
    const p=provenance(log,cid); if(!kind)return p;
    return p.items.filter(x=>x.kind===kind||x.field===kind||x.field.endsWith('.'+kind));
  }
  function render(log,cid){
    const p=provenance(log,cid); if(!p.component)return '';
    const icon=s=>s==='OK'?'✅':s==='WARNING'?'⚠️':'❌';
    const items=p.items.map(x=>`<div style="margin-top:3px">${icon(x.scope==='history'&&p.derived.componentCount>1?'WARNING':'OK')} <b>${esc(x.kind)}</b> · ${esc(x.field)} · ${esc(x.scope)}${x.detail?` · <span style="color:var(--text2)">${esc(x.detail)}</span>`:''}</div>`).join('');
    return `<div id="s2024EvidenceProvenance" style="background:var(--surface3);border:1px solid var(--border2);border-radius:12px;padding:10px 12px;margin:0 0 12px;font-size:11px"><b>🧭 Evidence provenance & traceability</b><div style="margin-top:5px">🎯 <b>${esc(p.component.componentName||p.component.itemName||'Komponen')}</b> · ${esc(p.identity.serviceComponentId||'legacy')}</div><div style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:5px"><div>Status: <b>${icon(p.status)} ${p.status}</b></div><div>Evidence ID: ${esc(p.identity.evidenceId||'—')}</div><div>History: ${esc(p.identity.historyId||'—')}</div><div>Checklist index: ${p.source.checklistIndex>=0?p.source.checklistIndex:'—'}</div><div>Component evidence: ${p.derived.componentEvidence}</div><div>History-level evidence: ${p.derived.historyLevelEvidence}</div></div><div style="margin-top:7px">${items}</div><div style="margin-top:7px;color:var(--text2)">Read-only provenance · hanya menunjukkan sumber evidence; tidak memindahkan, mengalokasikan, atau mengubah data.</div></div>`;
  }
  const esc=v=>typeof g.escapeHtml==='function'?g.escapeHtml(v):String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function install(){
    if(!g.Servis)return;
    if(typeof g.Servis.renderEditAuditTab==='function'&&!g.Servis.__s2024EvidenceProvenanceWrapped){
      const original=g.Servis.renderEditAuditTab;g.Servis.__s2024EvidenceProvenanceWrapped=true;
      g.Servis.renderEditAuditTab=function(){
        original.apply(this,arguments);
        const logs=g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[];
        const log=logs.find(x=>x&&String(x.id)===String(this.editId)); const cid=str(this._s2019ComponentFocusId); if(!log||!cid)return;
        const panel=document.getElementById('servisAuditPanel'); if(!panel)return;
        const old=panel.querySelector('#s2024EvidenceProvenance');if(old)old.remove(); const html=render(log,cid);if(!html)return;
        const box=document.createElement('div');box.innerHTML=html;if(box.firstElementChild)panel.insertBefore(box.firstElementChild,panel.firstChild);
      };
    }
    const api={VERSION,provenance,sessionProvenance,find,render,install};
    g.Servis.serviceHistoryEvidenceProvenanceS2024=api;g.ServiceHistoryEvidenceProvenanceS2024=api;
  }
  if(g.Servis)install();else if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',install,{once:true});
})(typeof globalThis!=='undefined'?globalThis:window);
