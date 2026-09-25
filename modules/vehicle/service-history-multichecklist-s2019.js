/* S2019 — Service Session -> Component Context Navigation
 * One service session may contain many checklist components in ONE history row
 * or across several rows. This layer keeps session as parent context and makes
 * every component the navigation identity for History / Reminder / Audit.
 * Read-only projection: never rewrites or deletes service history.
 */
(function(g){'use strict';
  if(g.__SERVICE_HISTORY_MULTICHECKLIST_S2019__)return;
  g.__SERVICE_HISTORY_MULTICHECKLIST_S2019__=true;
  const VERSION='SERVICE-HISTORY-MULTICHECKLIST-S2019';
  const str=v=>v==null?'':String(v).trim();
  const esc=v=>typeof g.escapeHtml==='function'?g.escapeHtml(v):String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const logs=()=>g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[];
  const byId=id=>logs().find(x=>x&&String(x.id)===String(id))||null;
  const vehicleIdOf=log=>str(log&&log.vehicleId||g.curVehicleId);
  const sessionIdOf=log=>str(log&&((log.sessionId||log.serviceJobId)||''));
  function canonical(raw,log){
    const x=raw||{}; let cid=str(x.serviceComponentId||x.itemId||''); let master=str(x.masterCategoryId||''); let name=str(x.itemName||x.name||x.componentName||'');
    if(cid&&g.ServiceInputCatalog&&typeof g.ServiceInputCatalog.itemById==='function'){
      const hit=g.ServiceInputCatalog.itemById(cid);
      if(hit&&hit.item){name=str(hit.item.name)||name; if(hit.group)master=str(hit.group.masterCategoryId)||master;}
    }
    if((!cid||!master)&&g.ServiceTaxonomySOT&&typeof g.ServiceTaxonomySOT.resolve==='function'){
      const hit=g.ServiceTaxonomySOT.resolve({serviceComponentId:cid,masterCategoryId:master,name:name});
      if(hit){cid=str(hit.serviceComponentId)||cid;master=str(hit.masterCategoryId)||master;name=str(hit.component&&hit.component.name)||name;}
    }
    if((!cid||!master)&&g.Servis&&typeof g.Servis.resolveCanonicalServiceSelection==='function'){
      const hit=g.Servis.resolveCanonicalServiceSelection({serviceComponentId:cid,masterCategoryId:master,item:name});
      cid=str(hit&&hit.serviceComponentId)||cid;master=str(hit&&hit.masterCategoryId)||master;name=str(hit&&hit.component&&hit.component.name)||name;
    }
    return {serviceComponentId:cid||null,masterCategoryId:master||((log&&log.masterCategoryId)||null),componentName:name||((log&&log.item)||'Komponen tidak teridentifikasi')};
  }
  function componentsOf(log){
    if(!log)return [];
    const out=[]; const seen=new Set();
    const push=(raw,kind)=>{
      const c=canonical(raw,log); const fallback=str(raw&&raw.itemId||raw&&raw.serviceComponentId||raw&&raw.itemName||raw&&raw.name||'');
      const key=c.serviceComponentId||('legacy:'+fallback.toLowerCase()); if(!key||seen.has(key))return; seen.add(key);
      out.push({
        ...c, key, source:'checklist', checklistItemId:str(raw&&raw.itemId)||null,
        actionType:raw&&raw.actionType||log.actionType||null,
        conditionResult:raw&&raw.conditionResult||null, conditionNote:raw&&raw.conditionNote||'',
        notApplicable:!!(raw&&raw.notApplicable), categoryId:raw&&raw.categoryId||null,
        historyId:log.id, sessionId:sessionIdOf(log), vehicleId:vehicleIdOf(log), kind:kind||'checklist'
      });
    };
    if(Array.isArray(log.checklist)&&log.checklist.length)log.checklist.forEach(x=>push(x,'checklist'));
    if(!out.length && (log.serviceComponentId||log.item||log.serviceComponentNameSnapshot))push({serviceComponentId:log.serviceComponentId,masterCategoryId:log.masterCategoryId,itemName:log.serviceComponentNameSnapshot||log.item,categoryId:log.categoryId},'history');
    return out;
  }
  function sessionRows(log){
    if(!log)return [];
    const sid=sessionIdOf(log),vid=vehicleIdOf(log);
    if(!sid)return [log];
    return logs().filter(x=>x&&vehicleIdOf(x)===vid&&sessionIdOf(x)===sid);
  }
  function sessionComponents(log){
    const out=[]; const seen=new Set();
    sessionRows(log).forEach(row=>componentsOf(row).forEach(c=>{if(!seen.has(c.key)){seen.add(c.key);out.push(c);}}));
    return out;
  }
  function componentMatch(log,cid){
    const target=str(cid); if(!target||!log)return false;
    return componentsOf(log).some(c=>String(c.serviceComponentId||'')===target||String(c.checklistItemId||'')===target||String(c.key)===target);
  }
  function focus(){return g.Servis?{logId:g.Servis._s2019ComponentFocusLogId||null,componentId:g.Servis._s2019ComponentFocusId||null}:{};}
  function setFocus(logId,cid){if(!g.Servis)return;g.Servis._s2019ComponentFocusLogId=String(logId);g.Servis._s2019ComponentFocusId=String(cid||'');}
  function focusedComponent(log){const f=focus(); if(!f.componentId)return null; return componentsOf(log).find(c=>String(c.serviceComponentId||c.checklistItemId||c.key)===String(f.componentId))||null;}
  function focusAwareResolver(original){
    return function(log){
      const f=focus();
      if(f.componentId&&componentMatch(log,f.componentId))return f.componentId;
      return original.call(this,log);
    };
  }
  function reminderProxy(log,comp){
    if(!log||!comp)return log;
    return Object.assign({},log,{serviceComponentId:comp.serviceComponentId||comp.checklistItemId||null,masterCategoryId:comp.masterCategoryId||log.masterCategoryId,item:comp.componentName||log.item,categoryId:comp.categoryId||log.categoryId,actionType:comp.actionType||log.actionType});
  }
  function reminderState(log,comp){
    const row=reminderProxy(log,comp); const vid=vehicleIdOf(row); const cats=g.D&&Array.isArray(g.D.sparepartCats)?g.D.sparepartCats:[]; const cid=str(comp&&comp.serviceComponentId||row.serviceComponentId);
    let cat=cats.find(c=>c&&String(c.serviceComponentId||'')===cid&&(!c.vehicleId||String(c.vehicleId)===vid));
    if(!cat&&row.categoryId)cat=cats.find(c=>c&&String(c.id)===String(row.categoryId)&&(!c.vehicleId||String(c.vehicleId)===vid));
    if(!cat&&typeof g.resolveServisCatForVehicle==='function')cat=g.resolveServisCatForVehicle(row.item||'',vid)||null;
    return {active:!!(cat&&(Number(cat.intervalKm)>0||Number(cat.intervalBulan)>0)),categoryId:cat&&cat.id||null,categoryName:cat&&cat.name||null,serviceComponentId:cid||null,intervalKm:cat&&Number(cat.intervalKm)>0?Number(cat.intervalKm):null,intervalBulan:cat&&Number(cat.intervalBulan)>0?Number(cat.intervalBulan):null};
  }
  function openComponent(logId,cid,tab){
    const log=byId(logId); if(!log||!g.Servis)return null; const comp=componentsOf(log).find(c=>String(c.serviceComponentId||c.checklistItemId||c.key)===String(cid)); if(!comp)return null;
    setFocus(log.id,comp.serviceComponentId||comp.checklistItemId||comp.key);
    if(typeof g.Servis.openModal==='function')g.Servis.openModal(log.id);
    g.Servis.serviceHistorySessionFilter='';
    g.Servis.serviceHistoryComponentFilter=String(comp.serviceComponentId||comp.checklistItemId||comp.key);
    if(typeof g.Servis.setEditTab==='function')g.Servis.setEditTab(tab||'history');
    return {historyId:log.id,serviceComponentId:comp.serviceComponentId||null,tab:tab||'history'};
  }
  function contextHtml(log,mode){
    const comps=sessionComponents(log); const f=focus(); const vehicle=(g.D&&Array.isArray(g.D.vehicles)?g.D.vehicles.find(v=>String(v.id)===vehicleIdOf(log)):null);
    const rows=comps.map((c,i)=>{
      const cid=c.serviceComponentId||c.checklistItemId||c.key; const active=String(cid)===String(f.componentId); const rs=reminderState(log,c);
      return `<div style="padding:10px 0;border-top:1px solid var(--border2);display:flex;gap:8px;align-items:flex-start"><div style="min-width:22px;font-weight:800">${active?'🎯':(i+1)+'.'}</div><div style="flex:1"><div class="u-fw700 u-fs11">${esc(c.componentName)}</div><div class="u-fs10 u-t2">${esc(c.masterCategoryId||'Kategori belum dipetakan')} · ID ${esc(c.serviceComponentId||c.checklistItemId||'legacy')}</div><div class="u-fs10 u-t2">${c.actionType?('🛠 '+esc(c.actionType)+' · '):''}${c.notApplicable?'⚪ Tidak berlaku · ':''}${rs.active?'🔔 Pengingat aktif':'⚪ Pengingat tidak aktif'}</div></div><div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end"><button type="button" class="btn btn-ghost btn-sm" data-action="Servis.openServiceComponentHistoryS2019" data-args="${esc(JSON.stringify([log.id,cid]))}">📋 Riwayat</button><button type="button" class="btn btn-ghost btn-sm" data-action="Servis.openServiceComponentReminderS2019" data-args="${esc(JSON.stringify([log.id,cid]))}">🔔 Pengingat</button><button type="button" class="btn btn-ghost btn-sm" data-action="Servis.openServiceComponentAuditS2019" data-args="${esc(JSON.stringify([log.id,cid]))}">🔎 Audit</button></div></div>`;
    }).join('');
    return `<div id="s2019ComponentContext" style="background:var(--accent-soft);border:1px solid var(--accent);border-radius:12px;padding:12px;margin-bottom:12px"><div class="u-fw700 u-fs13">🧭 Konteks ${mode==='audit'?'Audit':mode==='reminder'?'Pengingat':'Riwayat'} · ${comps.length} komponen</div><div class="u-fs11 u-t2" style="margin-top:4px">${esc(vehicle&&vehicle.name||'Kendaraan')} · ${sessionIdOf(log)?'Sesi '+esc(sessionIdOf(log).slice(-8)):'Sesi tunggal'}${f.componentId?' · 🎯 komponen fokus':''}</div><div style="margin-top:6px">${rows||'<div class="u-fs11 u-t2">Tidak ada komponen checklist yang dapat dipetakan.</div>'}</div></div>`;
  }
  function evidenceHtml(log,comp){
    if(!comp)return '';
    return `<div id="s2019ComponentEvidence" style="background:var(--surface3);border:1px solid var(--border2);border-radius:12px;padding:12px;margin-bottom:12px"><div class="u-fw700 u-fs12">🎯 Komponen fokus</div><div class="u-fw700" style="margin-top:5px">${esc(comp.componentName)}</div><div class="u-fs11 u-t2" style="margin-top:4px">Kategori: ${esc(comp.masterCategoryId||'—')} · serviceComponentId: ${esc(comp.serviceComponentId||comp.checklistItemId||'legacy')}</div>${comp.actionType?`<div class="u-fs11 u-t2" style="margin-top:4px">Pekerjaan: ${esc(comp.actionType)}</div>`:''}${comp.conditionResult?`<div class="u-fs11 u-t2" style="margin-top:4px">Kondisi: ${esc(comp.conditionResult)}${comp.conditionNote?' · '+esc(comp.conditionNote):''}</div>`:''}</div>`;
  }
  function install(){
    if(!g.Servis)return;
    if(typeof g.Servis.resolveLogServiceComponentId==='function'&&!g.Servis.__s2019ResolverWrapped){
      const original=g.Servis.resolveLogServiceComponentId; g.Servis.__s2019ResolverWrapped=true; g.Servis.resolveLogServiceComponentId=focusAwareResolver(original);
    }
    if(typeof g.Servis.renderEditHistoryTab==='function'&&!g.Servis.__s2019HistoryWrapped){
      const original=g.Servis.renderEditHistoryTab; g.Servis.__s2019HistoryWrapped=true;
      g.Servis.renderEditHistoryTab=function(){ original.apply(this,arguments); const panel=document.getElementById('servisHistoryPanel'); if(!panel||this.editId===null)return; const log=byId(this.editId); const comp=focusedComponent(log); const old=document.getElementById('s2019ComponentContext'); if(old)old.remove(); const box=document.createElement('div');box.innerHTML=contextHtml(log,'history');panel.insertBefore(box.firstElementChild,panel.firstChild); if(comp){const evidence=document.createElement('div');evidence.innerHTML=evidenceHtml(log,comp);const ctx=document.getElementById('s2019ComponentContext');if(ctx)ctx.insertAdjacentElement('afterend',evidence.firstElementChild);} };
    }
    if(typeof g.Servis.renderEditReminderTab==='function'&&!g.Servis.__s2019ReminderWrapped){
      const original=g.Servis.renderEditReminderTab; g.Servis.__s2019ReminderWrapped=true;
      g.Servis.renderEditReminderTab=function(){ const log=byId(this.editId); const comp=focusedComponent(log); if(comp){ const oldId=this.editId; const proxy=reminderProxy(log,comp); const arr=g.D.servisLogs; const idx=arr.indexOf(log); if(idx>=0)arr[idx]=proxy; try{original.apply(this,arguments);}finally{arr[idx]=log;} const panel=document.getElementById('servisReminderPanel');if(panel){const old=panel.querySelector('#s2019ComponentContext');if(old)old.remove();const box=document.createElement('div');box.innerHTML=contextHtml(log,'reminder');panel.insertBefore(box.firstElementChild,panel.firstChild);}}else original.apply(this,arguments); };
    }
    if(typeof g.Servis.renderEditAuditTab==='function'&&!g.Servis.__s2019AuditWrapped){
      const original=g.Servis.renderEditAuditTab; g.Servis.__s2019AuditWrapped=true;
      g.Servis.renderEditAuditTab=function(){ original.apply(this,arguments); const panel=document.getElementById('servisAuditPanel'); if(!panel||this.editId===null)return; const log=byId(this.editId); if(!log)return; const comp=focusedComponent(log); const old=panel.querySelector('#s2019ComponentContext');if(old)old.remove();const box=document.createElement('div');box.innerHTML=contextHtml(log,'audit');panel.insertBefore(box.firstElementChild,panel.firstChild); if(comp){const ev=document.createElement('div');ev.innerHTML=evidenceHtml(log,comp);const ctx=document.getElementById('s2019ComponentContext');if(ctx)ctx.insertAdjacentElement('afterend',ev.firstElementChild);} };
    }
    if(typeof g.Servis.openHistoryFromReminder==='function'&&!g.Servis.__s2019ReminderHistoryWrapped){
      const originalReminderHistory=g.Servis.openHistoryFromReminder;
      g.Servis.__s2019ReminderHistoryWrapped=true;
      g.Servis.openHistoryFromReminder=function(categoryId,componentId){
        const cid=str(componentId||''); const vid=str(g.curVehicleId);
        if(!cid)return originalReminderHistory.apply(this,arguments);
        const candidates=logs().filter(row=>row&&vehicleIdOf(row)===vid&&componentMatch(row,cid)).slice().sort((a,b)=>{
          const ad=String(a.date||''),bd=String(b.date||'');
          return bd.localeCompare(ad)||Number(b.km||0)-Number(a.km||0)||String(b.id||'').localeCompare(String(a.id||''));
        });
        const target=candidates[0]||null;
        if(!target){
          if(typeof g.toast==='function')g.toast('ℹ️ Belum ada riwayat servis untuk komponen ini.');
          return null;
        }
        return openComponent(target.id,cid,'history').historyId;
      };
    }
    g.Servis.openServiceComponentHistoryS2019=(id,cid)=>openComponent(id,cid,'history');
    g.Servis.openServiceComponentReminderS2019=(id,cid)=>openComponent(id,cid,'reminder');
    g.Servis.openServiceComponentAuditS2019=(id,cid)=>openComponent(id,cid,'audit');
    g.Servis.serviceHistoryMultiChecklistS2019={VERSION,componentsOf,sessionRows,sessionComponents,componentMatch,openComponent,reminderState,reminderProjection:reminderProxy,evidenceHtml};
    g.ServiceHistoryMultiChecklistS2019={VERSION,componentsOf,sessionRows,sessionComponents,componentMatch,openComponent,reminderState,reminderProjection:reminderProxy,evidenceHtml,install};
  }
  if(g.Servis)install(); else if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',install,{once:true});
})(typeof globalThis!=='undefined'?globalThis:window);
