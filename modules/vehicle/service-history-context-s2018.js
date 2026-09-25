/* S2018 — Service History Context / Multi-Checklist Explainability
 * One service session may contain multiple checklist components. History and Audit
 * must keep the session as the parent context while every component remains its own
 * canonical identity. Reminder navigation stays component-scoped.
 * Additive/read-only UI projection: no history rows are rewritten or deleted.
 */
(function(g){'use strict';
  if(g.__SERVICE_HISTORY_CONTEXT_S2018__)return;
  g.__SERVICE_HISTORY_CONTEXT_S2018__=true;
  const VERSION='SERVICE-HISTORY-CONTEXT-S2018';
  const str=v=>v==null?'':String(v).trim();
  const esc=v=>typeof g.escapeHtml==='function'?g.escapeHtml(v):String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function records(){return g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[];}
  function componentId(log){
    if(!log)return '';
    if(log.serviceComponentId)return str(log.serviceComponentId);
    if(log.checklistItemId)return str(log.checklistItemId);
    if(Array.isArray(log.checklist)){
      const row=log.checklist.find(x=>x&&(x.itemId||x.serviceComponentId));
      if(row)return str(row.serviceComponentId||row.itemId);
    }
    if(g.ServiceTaxonomySOT&&typeof g.ServiceTaxonomySOT.resolve==='function'){
      const hit=g.ServiceTaxonomySOT.resolve({masterCategoryId:log.masterCategoryId,name:log.item});
      if(hit&&hit.serviceComponentId)return str(hit.serviceComponentId);
    }
    if(g.ServiceInputCatalog&&typeof g.ServiceInputCatalog.infer==='function'){
      const hit=g.ServiceInputCatalog.infer(log.item||'');
      if(hit&&hit.item&&hit.item.id)return str(hit.item.id);
    }
    return '';
  }
  function identity(log){
    const cid=componentId(log);
    if(g.ServiceTaxonomySOT&&typeof g.ServiceTaxonomySOT.resolve==='function'){
      const hit=g.ServiceTaxonomySOT.resolve({masterCategoryId:log&&log.masterCategoryId,serviceComponentId:cid,name:log&&log.item});
      if(hit)return hit;
    }
    if(g.Servis&&typeof g.Servis.resolveCanonicalServiceSelection==='function')return g.Servis.resolveCanonicalServiceSelection(log)||null;
    return null;
  }
  function sessionId(log){return str(log&&((log.sessionId||log.serviceJobId)||''));}
  function sessionRows(log){
    const sid=sessionId(log); const vid=str(log&&log.vehicleId);
    if(!sid)return log?[log]:[];
    return records().filter(x=>x&&str(x.vehicleId)===vid&&sessionId(x)===sid);
  }
  function componentsForSession(log){
    const seen=new Set(),out=[];
    sessionRows(log).forEach(row=>{
      const cid=componentId(row); const hit=identity(row);
      const key=cid||('legacy:'+str(row.item).toLowerCase());
      if(seen.has(key))return; seen.add(key);
      out.push({
        serviceComponentId:cid||null,
        masterCategoryId:hit&&hit.masterCategoryId||row.masterCategoryId||null,
        categoryName:hit&&hit.category&&hit.category.name||null,
        componentName:hit&&hit.component&&hit.component.name||row.serviceComponentNameSnapshot||row.item||'Komponen tidak teridentifikasi',
        logId:row.id,
        item:row.item||''
      });
    });
    return out;
  }
  function reminderForComponent(log){
    const cid=componentId(log); const vid=str(log&&log.vehicleId||g.curVehicleId);
    const cats=g.D&&Array.isArray(g.D.sparepartCats)?g.D.sparepartCats:[];
    let linked=cats.find(c=>c&&c.serviceComponentId&&String(c.serviceComponentId)===cid&&(!c.vehicleId||String(c.vehicleId)===vid));
    if(!linked&&log&&log.masterCategoryId)linked=cats.find(c=>c&&String(c.masterCategoryId)===String(log.masterCategoryId)&&(!c.vehicleId||String(c.vehicleId)===vid));
    if(!linked&&log&&typeof g.resolveServisCatForVehicle==='function')linked=g.resolveServisCatForVehicle(log.item||'',vid)||null;
    let interval=null;
    if(linked&&typeof g.getCanonicalServiceInterval==='function')interval=g.getCanonicalServiceInterval(linked,{intervalKm:g.getEffectiveIntervalKm&&g.getEffectiveIntervalKm(vid,linked)});
    if(!interval&&linked)interval={intervalKm:linked.intervalKm>0?linked.intervalKm:null,intervalBulan:linked.intervalBulan>0?linked.intervalBulan:null};
    return {serviceComponentId:cid||null,categoryId:linked&&linked.id||null,categoryName:linked&&linked.name||null,intervalKm:interval&&interval.intervalKm||null,intervalBulan:interval&&interval.intervalBulan||null,active:!!(linked&&(interval&&((interval.intervalKm>0)||(interval.intervalBulan>0))))};
  }
  function auditForLog(log){
    const hit=identity(log)||{}; const session=sessionRows(log); const components=componentsForSession(log); const reminder=reminderForComponent(log);
    const issues=[];
    if(!componentId(log))issues.push('missing-service-component');
    if(hit.masterCategoryId&&log.masterCategoryId&&String(hit.masterCategoryId)!==String(log.masterCategoryId))issues.push('master-category-mismatch');
    return {version:VERSION,vehicleId:log&&log.vehicleId||null,historyId:log&&log.id||null,sessionId:sessionId(log)||null,component:{masterCategoryId:hit.masterCategoryId||log&&log.masterCategoryId||null,categoryName:hit.category&&hit.category.name||null,serviceComponentId:hit.serviceComponentId||componentId(log)||null,componentName:hit.component&&hit.component.name||log&&log.item||null},sessionComponentCount:components.length,sessionComponents:components,reminder,issues,ok:issues.length===0,sessionRows:session};
  }
  function openReminder(logId){
    if(!g.Servis)return null;
    const log=records().find(x=>x&&String(x.id)===String(logId)); if(!log)return null;
    if(typeof g.Servis.openModal==='function')g.Servis.openModal(log.id);
    g.Servis._serviceHistoryAuditFocusId=log.id;
    if(typeof g.Servis.setEditTab==='function')g.Servis.setEditTab('reminder');
    return log.id;
  }
  function openAudit(logId){
    if(!g.Servis)return null;
    const log=records().find(x=>x&&String(x.id)===String(logId)); if(!log)return null;
    if(typeof g.Servis.openModal==='function')g.Servis.openModal(log.id);
    g.Servis._serviceHistoryAuditFocusId=log.id;
    if(typeof g.Servis.setEditTab==='function')g.Servis.setEditTab('audit');
    return log.id;
  }
  function contextHtml(log,mode){
    const a=auditForLog(log); const comps=a.sessionComponents||[];
    const currentCid=a.component.serviceComponentId;
    const componentRows=comps.map((c,i)=>{
      const active=currentCid&&c.serviceComponentId===currentCid;
      const rr=a.sessionRows.find(x=>String(x.id)===String(c.logId));
      const rem=rr?reminderForComponent(rr):{active:false};
      return `<div style="padding:8px 0;border-top:1px solid var(--border2);display:flex;gap:8px;align-items:flex-start"><div style="min-width:24px;font-weight:800">${i+1}.</div><div style="flex:1"><div class="u-fw700 u-fs11">${active?'🎯 ':''}${esc(c.componentName)}</div><div class="u-fs10 u-t2">${esc(c.categoryName||c.masterCategoryId||'Kategori tidak dipetakan')} · ID ${esc(c.serviceComponentId||'legacy')}</div><div class="u-fs10 u-t2">${rem.active?'🔔 Pengingat aktif'+(rem.intervalKm?' · '+Number(rem.intervalKm).toLocaleString('id-ID')+' km':''):'⚪ Pengingat tidak aktif'}</div></div>${rr&&g.Servis&&typeof g.Servis.openReminderForLog==='function'?`<button type="button" class="btn btn-ghost btn-sm" data-action="Servis.openReminderForLog" data-args="${esc(JSON.stringify([rr.id]))}">🔔 Pengingat</button>`:''}${rr&&g.Servis&&typeof g.Servis.openHistoryAuditForLog==='function'?`<button type="button" class="btn btn-ghost btn-sm" data-action="Servis.openHistoryAuditForLog" data-args="${esc(JSON.stringify([rr.id]))}">🔎 Audit</button>`:''}</div>`;
    }).join('');
    return `<div style="background:var(--accent-soft);border:1px solid var(--accent);border-radius:12px;padding:12px;margin-bottom:12px"><div class="u-fw700 u-fs13">🧭 Konteks ${mode==='audit'?'Audit':'Riwayat'}</div><div class="u-fs11 u-t2" style="margin-top:4px">${esc((g.D&&Array.isArray(g.D.vehicles)?g.D.vehicles.find(v=>String(v.id)===String(a.vehicleId))?.name:'')||'Kendaraan')} · ${a.sessionId?'Sesi '+esc(String(a.sessionId).slice(-8)):'Riwayat tunggal'} · <b>${a.sessionComponentCount} komponen</b></div><div style="margin-top:8px">${componentRows||'<div class="u-fs11 u-t2">Tidak ada komponen sesi yang dapat dipetakan.</div>'}</div></div>`;
  }
  function install(){
    if(!g.Servis)return;
    const originalHistory=g.Servis.renderEditHistoryTab;
    if(typeof originalHistory==='function'&&!g.Servis.__s2018HistoryWrapped){
      g.Servis.__s2018HistoryWrapped=true;
      g.Servis.renderEditHistoryTab=function(){
        originalHistory.apply(this,arguments);
        const panel=document.getElementById('servisHistoryPanel'); if(!panel||this.editId===null)return;
        const current=records().find(x=>x&&String(x.id)===String(this.editId)); if(!current)return;
        const old=document.getElementById('s2018HistoryContext'); if(old)old.remove();
        const box=document.createElement('div'); box.id='s2018HistoryContext'; box.innerHTML=contextHtml(current,'history');
        panel.insertBefore(box,panel.firstChild);
      };
    }
    const originalAudit=g.Servis.renderEditAuditTab;
    if(typeof originalAudit==='function'&&!g.Servis.__s2018AuditWrapped){
      g.Servis.__s2018AuditWrapped=true;
      g.Servis.renderEditAuditTab=function(){
        originalAudit.apply(this,arguments);
        const panel=document.getElementById('servisAuditPanel'); if(!panel||this.editId===null)return;
        const current=records().find(x=>x&&String(x.id)===String(this._serviceHistoryAuditFocusId||this.editId)); if(!current)return;
        const old=document.getElementById('s2018AuditContext'); if(old)old.remove();
        const box=document.createElement('div'); box.id='s2018AuditContext'; box.innerHTML=contextHtml(current,'audit');
        panel.insertBefore(box,panel.firstChild);
        const a=auditForLog(current); const issues=document.createElement('div'); issues.id='s2018AuditIntegrity'; issues.style.cssText='margin:0 0 12px;padding:10px 12px;border-radius:12px;border:1px solid var(--border2);background:var(--surface3);font-size:11px';
        issues.innerHTML=`<b>🔎 Identity & Reminder Integrity</b><div style="margin-top:5px">${a.ok?'✅ Canonical identity konsisten':'⚠️ '+a.issues.map(esc).join(', ')}</div><div style="margin-top:4px">Komponen fokus: <b>${esc(a.component.componentName||'-')}</b> · Pengingat: <b>${a.reminder.active?'aktif':'tidak aktif'}</b></div>`;
        panel.insertBefore(issues,box.nextSibling);
      };
    }
    g.Servis.openReminderForLog=openReminder;
    g.Servis.openHistoryAuditForLog=openAudit;
    g.Servis.serviceHistoryContextS2018={VERSION,componentId,identity,sessionRows,componentsForSession,reminderForComponent,auditForLog,openReminder,openAudit};
  }
  if(g.Servis)install();
  else if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',install,{once:true});
  g.ServiceHistoryContextS2018={VERSION,componentId,identity,sessionRows,componentsForSession,reminderForComponent,auditForLog,openReminder,openAudit,install};
})(typeof globalThis!=='undefined'?globalThis:window);
