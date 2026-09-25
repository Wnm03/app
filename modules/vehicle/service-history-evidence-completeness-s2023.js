/* S2023 — Evidence Completeness & Consistency Audit
 * Read-only projection over persisted service-history evidence.
 * Detects missing/inconsistent evidence without changing history, stock, photos,
 * costs, or finance links. Session-level evidence is never silently attributed
 * to a component.
 */
(function(g){'use strict';
  if(g.__SERVICE_HISTORY_EVIDENCE_COMPLETENESS_S2023__)return;
  g.__SERVICE_HISTORY_EVIDENCE_COMPLETENESS_S2023__=true;
  const VERSION='SERVICE-HISTORY-EVIDENCE-COMPLETENESS-S2023';
  const str=v=>v==null?'':String(v).trim();
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
  const has=v=>v!==null&&v!==undefined&&str(v)!=='';
  const arr=v=>Array.isArray(v)?v:[];
  const esc=v=>typeof g.escapeHtml==='function'?g.escapeHtml(v):String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const multi=()=>g.ServiceHistoryMultiChecklistS2019||null;
  const components=log=>multi()&&typeof multi().componentsOf==='function'?(multi().componentsOf(log)||[]):[];
  const sessionRows=log=>multi()&&typeof multi().sessionRows==='function'?(multi().sessionRows(log)||[log]):[log];
  const cidOf=c=>str(c&&(c.serviceComponentId||c.checklistItemId||c.key));
  function rawFor(log,c){
    const target=cidOf(c);
    const rows=sessionRows(log);
    for(const row of rows){
      for(const raw of arr(row&&row.checklist)){
        const ids=[raw&&raw.serviceComponentId,raw&&raw.itemId,raw&&raw.checklistItemId].map(str).filter(Boolean);
        if(ids.includes(target))return {row,raw};
      }
    }
    return {row:null,raw:null};
  }
  function identity(log,c){
    return g.ServiceHistoryEvidenceS2021&&typeof g.ServiceHistoryEvidenceS2021.identity==='function' ? g.ServiceHistoryEvidenceS2021.identity(log,c) : null;
  }
  function push(list,severity,code,message,meta){list.push(Object.assign({severity,code,message},meta||{}));}
  function completeness(log,cid){
    const c=components(log).find(x=>cidOf(x)===str(cid));
    if(!log||!c)return {ok:false,status:'ERROR',component:null,checks:[],issues:[{severity:'ERROR',code:'component-not-found',message:'Komponen tidak ditemukan.'}],summary:{error:1,warning:0,info:0}};
    const {row,raw}=rawFor(log,c);
    const checks=[]; const issues=[];
    const e=identity(log,c);
    const source=raw||c;
    const componentId=str(c.serviceComponentId||c.checklistItemId);
    const action=str(source.actionType||c.actionType);
    const conditionResult=source.conditionResult;
    const conditionNote=str(source.conditionNote);
    const notApplicable=!!source.notApplicable;
    const photos=arr(source.photos).length?arr(source.photos):arr(source.foto);
    const refs=arr(source.catalogPartRefs).filter(Boolean);
    const usedPartId=str(source.usedPartId);
    const usedPartQty=num(source.usedPartQty);
    const cb=source.costBreakdown&&typeof source.costBreakdown==='object'?source.costBreakdown:null;
    const costTotal=cb?num(cb.total):null;
    const breakdownFields=['labor','parts','consumables','other'].map(k=>num(cb&&cb[k]));
    const allBreakdownNumeric=breakdownFields.every(v=>v!==null);
    const breakdownSum=allBreakdownNumeric?breakdownFields.reduce((a,b)=>a+b,0):null;
    const rowCost=num(source.cost);

    checks.push({code:'identity',status:e&&e.evidenceId?'ok':'warning'});
    if(!componentId)push(issues,'ERROR','missing-service-component','serviceComponentId/checklistItemId tidak tersedia.');
    if(!str(log.id))push(issues,'ERROR','missing-history-id','History ID tidak tersedia.');
    if(!str(log.vehicleId))push(issues,'ERROR','missing-vehicle','Vehicle ID tidak tersedia.');
    if(!row&&!raw)push(issues,'WARNING','component-evidence-snapshot-unresolved','Checklist snapshot komponen tidak ditemukan pada session row; audit hanya memakai context identity.');

    if(!notApplicable&&!action)push(issues,'WARNING','missing-action-type','Action type pekerjaan tidak tercatat pada komponen.');
    if(has(conditionNote)&&!has(conditionResult))push(issues,'WARNING','condition-note-without-result','Catatan kondisi ada tetapi hasil kondisi kosong.');
    if(has(conditionResult)&&!has(conditionNote))push(issues,'INFO','condition-result-without-note','Hasil kondisi ada tanpa catatan tambahan.');
    if(notApplicable&&has(conditionResult))push(issues,'INFO','not-applicable-has-condition','Komponen ditandai tidak berlaku tetapi memiliki hasil kondisi; perlu verifikasi konteks.');

    if(photos.length===0)push(issues,'INFO','no-component-photo','Tidak ada foto yang tersimpan pada snapshot komponen.');
    else if(photos.some(x=>x==null||str(x)===''))push(issues,'WARNING','invalid-photo-entry','Ada entri foto kosong/tidak valid.');

    if(cb){
      if(cb.source!=='component')push(issues,'WARNING','cost-breakdown-source-not-component','costBreakdown ada tetapi source bukan component.');
      if(costTotal===null)push(issues,'WARNING','cost-total-missing','costBreakdown.total tidak numerik.');
      if(allBreakdownNumeric&&costTotal!==breakdownSum)push(issues,'ERROR','cost-breakdown-mismatch',`Total biaya ${costTotal} tidak sama dengan rincian ${breakdownSum}.`,{expected:breakdownSum,actual:costTotal});
      if(rowCost!==null&&costTotal!==null&&Math.abs(rowCost-costTotal)>0)push(issues,'WARNING','row-cost-vs-breakdown-mismatch',`cost row (${rowCost}) berbeda dari total breakdown (${costTotal}).`,{rowCost,breakdownTotal:costTotal});
    }else if(rowCost!==null&&rowCost>0){
      push(issues,'INFO','cost-is-row-level','Biaya tersimpan pada level row; belum ada breakdown komponen yang dapat diverifikasi.');
    }

    refs.forEach((r,i)=>{
      const id=str(r&&r.catalogId); const q=num(r&&r.qty);
      if(!id)push(issues,'WARNING','part-ref-missing-catalog-id',`Referensi part #${i+1} tidak memiliki catalogId.`);
      if(q===null||q<=0)push(issues,'WARNING','part-ref-invalid-qty',`Referensi part #${i+1} memiliki qty tidak valid.`);
    });
    if(usedPartId&&(usedPartQty===null||usedPartQty<=0))push(issues,'WARNING','used-part-invalid-qty','usedPartId ada tetapi usedPartQty tidak valid.');
    if(!refs.length&&!usedPartId&&rowCost!==null&&rowCost>0)push(issues,'INFO','cost-without-part-reference','Biaya ada tetapi tidak ada referensi part pada komponen; bisa valid untuk jasa/labor.');

    const serviceEvidence=source.serviceEvidence&&typeof source.serviceEvidence==='object'?source.serviceEvidence:null;
    if(serviceEvidence){
      const txBaseline=str(source.txLinkId||((row&&row.txLinkId)||''));
      if(has(serviceEvidence.transactionId) && str(serviceEvidence.transactionId)!==txBaseline && str(serviceEvidence.transactionId)!==str(log.txLinkId||''))push(issues,'WARNING','service-evidence-transaction-mismatch','serviceEvidence.transactionId berbeda dari txLinkId yang tersedia pada row/history.');
      if(Array.isArray(serviceEvidence.photos)&&serviceEvidence.photos.length&&photos.length&&JSON.stringify(serviceEvidence.photos)!==JSON.stringify(photos))push(issues,'WARNING','service-evidence-photo-mismatch','Foto serviceEvidence berbeda dari foto snapshot komponen.');
    }

    const allRows=sessionRows(log);
    const sessionComponentCount=multi()&&typeof multi().sessionComponents==='function'?multi().sessionComponents(log).length:components(log).length;
    if(sessionComponentCount>1){
      if(!photos.length&&Array.isArray(row&&row.foto)&&row.foto.length)push(issues,'INFO','photo-is-history-row-scoped','Foto ditemukan di row history; tidak diasumsikan milik komponen ini.');
      const sessionLevelCost=num(log&&log.cost);
      if(!cb&&sessionLevelCost!==null&&sessionLevelCost>0)push(issues,'INFO','cost-is-history-row-scoped','Biaya history/session tidak dialokasikan otomatis ke komponen ini.');
      else if(!cb&&rowCost!==null&&rowCost>0)push(issues,'INFO','cost-is-history-row-scoped','Biaya row history tidak dialokasikan otomatis ke komponen ini.');
    }
    if(str(log.txLinkId)&&rowCost!==null&&rowCost<=0)push(issues,'INFO','finance-link-without-row-cost','txLinkId ada pada row dengan cost 0; dapat terjadi pada row non-first dalam multi-component session.');

    const summary={error:issues.filter(x=>x.severity==='ERROR').length,warning:issues.filter(x=>x.severity==='WARNING').length,info:issues.filter(x=>x.severity==='INFO').length};
    const status=summary.error?'ERROR':summary.warning?'WARNING':'OK';
    return {ok:summary.error===0,status,component:c,sourceRow:row,evidenceSource:raw?'checklist-snapshot':'context-only',identity:e,checks,issues,summary,derived:{photoCount:photos.length,costBreakdownTotal:costTotal,breakdownSum,rowCost,partRefCount:refs.length,usedPartId:usedPartId||null,sessionComponentCount,sessionRowCount:allRows.length}};
  }
  function sessionCompleteness(log){
    const comps=components(log); const rows=comps.map(c=>completeness(log,cidOf(c)));
    const totalCost=rows.reduce((sum,r)=>sum+(r.derived&&r.derived.costBreakdownTotal!=null?r.derived.costBreakdownTotal:0),0);
    const historyCost=num(log&&log.cost);
    const issues=[];
    if(rows.length>1&&historyCost!==null&&totalCost>0&&historyCost!==totalCost)push(issues,'WARNING','session-cost-vs-component-total-mismatch',`History cost ${historyCost} berbeda dari jumlah component breakdown ${totalCost}.`,{historyCost,totalCost});
    if(rows.length>1&&historyCost!==null&&historyCost>0&&totalCost===0)push(issues,'INFO','session-cost-without-component-breakdown','History memiliki biaya tetapi belum ada breakdown component yang dapat dijumlahkan.');
    const summary={error:rows.reduce((n,r)=>n+r.summary.error,0)+issues.filter(x=>x.severity==='ERROR').length,warning:rows.reduce((n,r)=>n+r.summary.warning,0)+issues.filter(x=>x.severity==='WARNING').length,info:rows.reduce((n,r)=>n+r.summary.info,0)+issues.filter(x=>x.severity==='INFO').length};
    return {ok:summary.error===0,status:summary.error?'ERROR':summary.warning?'WARNING':'OK',historyId:str(log&&log.id)||null,sessionId:str(log&&(log.sessionId||log.serviceJobId))||null,componentCount:rows.length,rows,issues,summary,derived:{historyCost,componentCostTotal:totalCost}};
  }
  function consistency(log,cid){
    const r=completeness(log,cid); if(!r.component)return r;
    const extra=[]; const d=r.derived||{};
    if(d.costBreakdownTotal!==null&&d.breakdownSum!==null&&d.costBreakdownTotal!==d.breakdownSum)push(extra,'ERROR','cost-breakdown-mismatch','Rincian biaya tidak menjumlah ke total.');
    if(d.partRefCount>0&&d.usedPartId&&d.usedPartQty===0)push(extra,'WARNING','mixed-part-evidence','Ada catalogPartRefs sekaligus usedPartId tetapi qty used part nol.');
    return Object.assign({},r,{consistencyIssues:extra,ok:r.ok&&extra.every(x=>x.severity!=='ERROR')});
  }
  function render(log,cid){
    const r=completeness(log,cid); if(!r.component)return '';
    const badge=s=>s==='OK'?'✅':s==='WARNING'?'⚠️':'❌';
    const rows=r.issues.map(x=>`<div style="margin-top:4px">${x.severity==='ERROR'?'❌':x.severity==='WARNING'?'⚠️':'ℹ️'} ${esc(x.message)}</div>`).join('');
    return `<div id="s2023EvidenceCompleteness" style="background:var(--surface3);border:1px solid var(--border2);border-radius:12px;padding:10px 12px;margin:0 0 12px;font-size:11px"><b>🧪 Evidence completeness & consistency</b><div style="margin-top:5px">🎯 <b>${esc(r.component.componentName||'Komponen')}</b> · ${esc(cidOf(r.component)||'legacy')}</div><div style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:5px"><div>Status: <b>${badge(r.status)} ${r.status}</b></div><div>Source: ${esc(r.evidenceSource)}</div><div>📷 Foto: ${r.derived.photoCount}</div><div>💰 Breakdown: ${r.derived.costBreakdownTotal==null?'—':'Rp '+Number(r.derived.costBreakdownTotal).toLocaleString('id-ID')}</div><div>📦 Ref part: ${r.derived.partRefCount}</div><div>🧩 Komponen sesi: ${r.derived.sessionComponentCount}</div></div>${rows?`<div style="margin-top:7px">${rows}</div>`:'<div style="margin-top:7px;color:var(--success,#067647)">Tidak ditemukan inkonsistensi pada pemeriksaan ini.</div>'}<div style="margin-top:7px;color:var(--text2)">Read-only audit · tidak mengubah history, stok, foto, biaya, atau transaksi.</div></div>`;
  }
  function install(){
    if(!g.Servis)return;
    if(typeof g.Servis.renderEditAuditTab==='function'&&!g.Servis.__s2023EvidenceCompletenessWrapped){
      const original=g.Servis.renderEditAuditTab;g.Servis.__s2023EvidenceCompletenessWrapped=true;
      g.Servis.renderEditAuditTab=function(){
        original.apply(this,arguments);
        const logs=g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[];
        const log=logs.find(x=>x&&String(x.id)===String(this.editId));
        const cid=str(this._s2019ComponentFocusId); if(!log||!cid)return;
        const panel=document.getElementById('servisAuditPanel'); if(!panel)return;
        const old=panel.querySelector('#s2023EvidenceCompleteness');if(old)old.remove();
        const html=render(log,cid);if(!html)return;
        const box=document.createElement('div');box.innerHTML=html;if(box.firstElementChild)panel.insertBefore(box.firstElementChild,panel.firstChild);
      };
    }
    const api={VERSION,completeness,sessionCompleteness,consistency,render,install};
    g.Servis.serviceHistoryEvidenceCompletenessS2023=api;
    g.ServiceHistoryEvidenceCompletenessS2023=api;
  }
  if(g.Servis)install();else if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',install,{once:true});
})(typeof globalThis!=='undefined'?globalThis:window);
