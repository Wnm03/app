/* S2026 — Component-Scoped Reminder UX
 * Makes the component scope of Reminder explicit and auditable.
 * Read-only projection: no reminder is persisted and no history/finance data is mutated.
 */
(function(g){'use strict';
  if(g.__SERVICE_HISTORY_REMINDER_COMPONENT_S2026__)return;
  g.__SERVICE_HISTORY_REMINDER_COMPONENT_S2026__=true;
  const VERSION='SERVICE-HISTORY-REMINDER-COMPONENT-S2026';
  const str=v=>v==null?'':String(v).trim();
  const esc=v=>typeof g.escapeHtml==='function'?g.escapeHtml(v):String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const logs=()=>g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[];
  const byId=id=>logs().find(x=>x&&String(x.id)===String(id))||null;
  const multi=()=>g.ServiceHistoryMultiChecklistS2019||null;
  const components=log=>multi()&&typeof multi().componentsOf==='function'?(multi().componentsOf(log)||[]):[];
  const cidOf=c=>str(c&&(c.serviceComponentId||c.checklistItemId||c.key));
  function component(log,cid){const target=str(cid);return target?components(log).find(c=>cidOf(c)===target)||null:null;}
  function projection(log,comp){
    if(!log||!comp)return null;
    return Object.assign({},log,{serviceComponentId:comp.serviceComponentId||comp.checklistItemId||null,masterCategoryId:comp.masterCategoryId||log.masterCategoryId,item:comp.componentName||log.item,categoryId:comp.categoryId||log.categoryId,actionType:comp.actionType||log.actionType});
  }
  function audit(log,cid){
    const s=g.Servis||{}; const c=component(log,cid||s._s2019ComponentFocusId); const issues=[]; const info=[];
    if(!log)issues.push({severity:'ERROR',code:'history-not-found',message:'History aktif tidak ditemukan.'});
    if(log&&!c)issues.push({severity:'ERROR',code:'component-not-found',message:'Component focus tidak ditemukan pada history aktif.'});
    if(log&&c){
      const projected=projection(log,c);
      if(!projected||str(projected.item)!==str(c.componentName||c.itemName))issues.push({severity:'ERROR',code:'projection-context-mismatch',message:'Projection Reminder tidak menggunakan component focus sebagai item context.'});
      if(str(s._s2019ComponentFocusLogId)&&String(s._s2019ComponentFocusLogId)!==String(log.id))issues.push({severity:'WARNING',code:'focus-log-mismatch',message:'Focus component tersimpan untuk history berbeda.'});
      if(String(s._s2019ComponentFocusId||'')&&String(s._s2019ComponentFocusId)!==cidOf(c))issues.push({severity:'WARNING',code:'focus-component-mismatch',message:'Component focus aktif berbeda dari component yang diaudit.'});
      info.push({code:'component-scoped-projection',message:'Reminder menggunakan projection component-scoped dan tetap read-only.'});
    }
    const summary={error:issues.filter(x=>x.severity==='ERROR').length,warning:issues.filter(x=>x.severity==='WARNING').length,info:info.length};
    return {ok:summary.error===0,status:summary.error?'ERROR':summary.warning?'WARNING':'OK',historyId:log?str(log.id):null,componentId:c?cidOf(c):str(cid)||null,component:c,issues,info,summary,readOnly:true};
  }
  function current(){const s=g.Servis||{};return audit(byId(s.editId),str(s._s2019ComponentFocusId));}
  function render(log,cid){
    const a=audit(log,cid); if(!a.historyId)return '';
    const icon=a.status==='OK'?'✅':a.status==='WARNING'?'⚠️':'❌';
    const issueHtml=a.issues.length?a.issues.map(x=>`<div style="margin-top:4px">${x.severity==='ERROR'?'❌':'⚠️'} <b>${esc(x.code)}</b> · ${esc(x.message)}</div>`).join(''):'<div style="margin-top:4px">Reminder terikat ke component focus aktif.</div>';
    return `<div id="s2026ReminderComponentScope" style="background:var(--surface3);border:1px solid var(--border2);border-radius:12px;padding:10px 12px;margin:0 0 12px;font-size:11px"><b>🔔 Reminder · component scope</b><div style="margin-top:5px">Status: <b>${icon} ${a.status}</b> · Komponen: <b>${esc(a.component&&a.component.componentName||a.componentId||'—')}</b> · ID <b>${esc(a.componentId||'—')}</b></div><div style="margin-top:6px">Projection: <b>component-scoped</b> · SOT interval tetap kategori/override kendaraan.</div><div style="margin-top:5px">${issueHtml}</div><div style="margin-top:6px;color:var(--text2)">Read-only · tidak membuat reminder kedua dan tidak mengubah history/finance.</div></div>`;
  }
  function install(){
    const s=g.Servis;if(!s)return;
    if(typeof s.renderEditReminderTab==='function'&&!s.__s2026ReminderComponentWrapped){
      const original=s.renderEditReminderTab;s.__s2026ReminderComponentWrapped=true;
      s.renderEditReminderTab=function(){
        original.apply(this,arguments);
        const log=byId(this.editId);const cid=str(this._s2019ComponentFocusId);if(!log||!cid)return;
        const panel=document.getElementById('servisReminderPanel');if(!panel)return;
        const old=panel.querySelector('#s2026ReminderComponentScope');if(old)old.remove();
        const html=render(log,cid);if(!html)return;const box=document.createElement('div');box.innerHTML=html;if(box.firstElementChild)panel.insertBefore(box.firstElementChild,panel.firstChild);
      };
    }
    const api={VERSION,projection,audit,current,render,install};
    s.serviceHistoryReminderComponentS2026=api;g.ServiceHistoryReminderComponentS2026=api;
  }
  if(g.Servis)install();else if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',install,{once:true});
})(typeof globalThis!=='undefined'?globalThis:window);
