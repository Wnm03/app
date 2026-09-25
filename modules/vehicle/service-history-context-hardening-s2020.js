/* S2020 — Focus Integrity / Context Hardening
 * Closes the remaining multi-checklist UI gaps:
 * 1) manual History component-filter changes must move/clear focus;
 * 2) History SOT labels must describe the focused checklist component;
 * 3) Audit integrity must describe the focused component, not checklist[0];
 * 4) duplicate S2018 context/integrity blocks are removed when S2019 context is active.
 * Read-only projection: no service-history mutation.
 */
(function(g){'use strict';
  if(g.__SERVICE_HISTORY_CONTEXT_HARDENING_S2020__)return;
  g.__SERVICE_HISTORY_CONTEXT_HARDENING_S2020__=true;
  const VERSION='SERVICE-HISTORY-CONTEXT-HARDENING-S2020';
  const str=v=>v==null?'':String(v).trim();
  const esc=v=>typeof g.escapeHtml==='function'?g.escapeHtml(v):String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const logs=()=>g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[];
  const byId=id=>logs().find(x=>x&&String(x.id)===String(id))||null;
  const api=()=>g.ServiceHistoryMultiChecklistS2019||null;
  function focused(log){
    const a=api(); const s=g.Servis; if(!a||!s||!log)return null;
    const cid=str(s._s2019ComponentFocusId); if(!cid)return null;
    const list=a.componentsOf(log)||[];
    return list.find(c=>String(c.serviceComponentId||c.checklistItemId||c.key)===cid)||null;
  }
  function focusedSelection(log,comp){
    if(!log||!comp)return null;
    const cid=str(comp.serviceComponentId||comp.checklistItemId||'');
    let hit=null;
    if(cid&&g.ServiceInputCatalog&&typeof g.ServiceInputCatalog.itemById==='function')hit=g.ServiceInputCatalog.itemById(cid)||null;
    if(!hit&&g.ServiceTaxonomySOT&&typeof g.ServiceTaxonomySOT.resolve==='function'){
      const r=g.ServiceTaxonomySOT.resolve({serviceComponentId:cid,masterCategoryId:comp.masterCategoryId,name:comp.componentName});
      if(r)hit={item:r.component||null,group:r.group||null};
    }
    const item=hit&&hit.item?hit.item:null;
    const group=hit&&hit.group?hit.group:null;
    return {
      vehicleId:log.vehicleId||null,
      masterCategoryId:group&&group.masterCategoryId||comp.masterCategoryId||null,
      serviceComponentId:cid||null,
      component:item||{id:cid,name:comp.componentName||log.item||''},
      group:group||null
    };
  }
  function setFocusFromFilter(cid){
    const s=g.Servis; if(!s)return;
    const current=byId(s.editId);
    const target=str(cid);
    if(!target){s._s2019ComponentFocusId='';s._s2019ComponentFocusLogId='';return;}
    if(current&&api()&&typeof api().componentMatch==='function'&&api().componentMatch(current,target)){
      s._s2019ComponentFocusId=target;
      s._s2019ComponentFocusLogId=String(current.id);
    }else{
      s._s2019ComponentFocusId='';s._s2019ComponentFocusLogId='';
    }
  }
  function focusedAudit(log,comp){
    const c=comp||focused(log); if(!log||!c)return null;
    const selection=focusedSelection(log,c)||{};
    const reminder=api()&&typeof api().reminderState==='function'?api().reminderState(log,c):{active:false,serviceComponentId:c.serviceComponentId||null};
    const session=api()&&typeof api().sessionRows==='function'?api().sessionRows(log):[log];
    const components=api()&&typeof api().sessionComponents==='function'?api().sessionComponents(log):[c];
    const issues=[];
    if(!selection.serviceComponentId)issues.push('missing-service-component');
    if(c.masterCategoryId&&selection.masterCategoryId&&String(c.masterCategoryId)!==String(selection.masterCategoryId))issues.push('master-category-mismatch');
    if(log.vehicleId==null)issues.push('missing-vehicle');
    return {version:VERSION,vehicleId:log.vehicleId||null,historyId:log.id||null,sessionId:log.sessionId||log.serviceJobId||null,component:{masterCategoryId:selection.masterCategoryId||c.masterCategoryId||null,serviceComponentId:selection.serviceComponentId||c.serviceComponentId||c.checklistItemId||null,componentName:selection.component&&selection.component.name||c.componentName||null},sessionComponentCount:components.length,sessionComponents:components,reminder,issues,ok:issues.length===0,sessionRows:session};
  }
  function cleanupLegacyBlocks(panel){
    if(!panel)return;
    ['s2018HistoryContext','s2018AuditContext','s2018AuditIntegrity'].forEach(id=>{const el=panel.querySelector('#'+id);if(el)el.remove();});
  }
  function install(){
    const s=g.Servis; if(!s)return;
    if(typeof s.setServiceHistoryComponentFilter==='function'&&!s.__s2020ComponentFilterWrapped){
      const original=s.setServiceHistoryComponentFilter; s.__s2020ComponentFilterWrapped=true;
      s.setServiceHistoryComponentFilter=function(componentId){setFocusFromFilter(componentId);return original.apply(this,arguments);};
    }
    if(typeof s.setServiceHistorySessionFilter==='function'&&!s.__s2020SessionFilterWrapped){
      const original=s.setServiceHistorySessionFilter; s.__s2020SessionFilterWrapped=true;
      s.setServiceHistorySessionFilter=function(sessionId){
        const target=str(this.serviceHistoryComponentFilter);
        const result=original.apply(this,arguments);
        if(target){const current=byId(this.editId);if(!current||!api()||!api().componentMatch(current,target)){this._s2019ComponentFocusId='';this._s2019ComponentFocusLogId='';}}
        return result;
      };
    }
    if(typeof s.renderEditHistoryTab==='function'&&!s.__s2020HistoryWrapped){
      const original=s.renderEditHistoryTab; s.__s2020HistoryWrapped=true;
      s.renderEditHistoryTab=function(){
        const log=byId(this.editId); const comp=focused(log);
        const originalSelection=s.resolveCanonicalServiceSelection;
        if(comp&&typeof originalSelection==='function'){
          s.resolveCanonicalServiceSelection=function(row){
            if(row&&String(row.id)===String(log.id))return focusedSelection(log,comp)||originalSelection.call(this,row);
            if(api()&&api().componentMatch&&api().componentMatch(row,comp.serviceComponentId||comp.checklistItemId||'')){
              const c=(api().componentsOf(row)||[]).find(x=>String(x.serviceComponentId||x.checklistItemId||x.key)===String(comp.serviceComponentId||comp.checklistItemId||''));
              return focusedSelection(row,c)||originalSelection.call(this,row);
            }
            return originalSelection.call(this,row);
          };
        }
        try{original.apply(this,arguments);}finally{if(originalSelection)s.resolveCanonicalServiceSelection=originalSelection;}
        const panel=document.getElementById('servisHistoryPanel'); if(panel)cleanupLegacyBlocks(panel);
      };
    }
    if(typeof s.renderEditAuditTab==='function'&&!s.__s2020AuditWrapped){
      const original=s.renderEditAuditTab; s.__s2020AuditWrapped=true;
      s.renderEditAuditTab=function(){
        original.apply(this,arguments);
        const panel=document.getElementById('servisAuditPanel'); if(!panel)return;
        cleanupLegacyBlocks(panel);
        const log=byId(this.editId), comp=focused(log); if(!log||!comp)return;
        const a=focusedAudit(log,comp); if(!a)return;
        const box=document.createElement('div'); box.id='s2020AuditIntegrity'; box.style.cssText='margin:0 0 12px;padding:10px 12px;border-radius:12px;border:1px solid var(--border2);background:var(--surface3);font-size:11px';
        box.innerHTML=`<b>🔎 Identity & Reminder Integrity · Komponen fokus</b><div style="margin-top:5px">${a.ok?'✅ Canonical identity konsisten':'⚠️ '+a.issues.map(esc).join(', ')}</div><div style="margin-top:4px">🎯 <b>${esc(a.component.componentName||'-')}</b> · ID <b>${esc(a.component.serviceComponentId||'-')}</b></div><div style="margin-top:4px">Pengingat: <b>${a.reminder.active?'aktif':'tidak aktif'}</b>${a.reminder.intervalKm?' · '+Number(a.reminder.intervalKm).toLocaleString('id-ID')+' km':''}${a.reminder.intervalBulan?' · '+Number(a.reminder.intervalBulan).toLocaleString('id-ID')+' bln':''}</div><div style="margin-top:4px">Sesi: <b>${esc(a.sessionId||'tunggal')}</b> · ${a.sessionComponentCount} komponen</div>`;
        panel.insertBefore(box,panel.firstChild);
      };
    }
    s.serviceHistoryContextHardeningS2020={VERSION,focused,focusedAudit,setFocusFromFilter};
    g.ServiceHistoryContextHardeningS2020={VERSION,focused,focusedAudit,setFocusFromFilter,install};
  }
  if(g.Servis)install(); else if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',install,{once:true});
})(typeof globalThis!=='undefined'?globalThis:window);
