/* S2037 — Multi-category checklist History + Reminder session projection
 * One checklist session may contain components from several master categories.
 * The edit modal must keep the session as one unit while projecting every
 * component/category into History and Reminder. Read-only UI adapter: it does
 * not create a second persistence store and never overwrites service history.
 */
(function(g){'use strict';
  if(g.__SERVICE_HISTORY_MULTICATEGORY_SYNC_S2037__)return;
  g.__SERVICE_HISTORY_MULTICATEGORY_SYNC_S2037__=true;
  const VERSION='SERVICE-HISTORY-MULTICATEGORY-SYNC-S2037';
  const str=v=>v==null?'':String(v).trim();
  const esc=v=>typeof g.escapeHtml==='function'?g.escapeHtml(v):String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const logs=()=>g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[];
  const byId=id=>logs().find(x=>x&&str(x.id)===str(id))||null;
  const sessionIdOf=log=>str(log&&(log.sessionId||log.serviceJobId));
  const vehicleIdOf=log=>str(log&&log.vehicleId||g.curVehicleId);

  function canonical(raw,log){
    const x=raw||{}; let cid=str(x.serviceComponentId||x.itemId||x.checklistItemId); let mid=str(x.masterCategoryId); let name=str(x.itemName||x.componentName||x.name||x.item);
    if(cid&&g.ServiceInputCatalog&&typeof g.ServiceInputCatalog.itemById==='function'){
      const hit=g.ServiceInputCatalog.itemById(cid);
      if(hit&&hit.item){name=str(hit.item.name)||name;mid=str(hit.group&&hit.group.masterCategoryId||hit.item.masterCategoryId)||mid;}
    }
    if((!cid||!mid)&&g.ServiceTaxonomySOT&&typeof g.ServiceTaxonomySOT.resolve==='function'){
      const hit=g.ServiceTaxonomySOT.resolve({serviceComponentId:cid,masterCategoryId:mid,name});
      if(hit){cid=str(hit.serviceComponentId)||cid;mid=str(hit.masterCategoryId)||mid;name=str(hit.component&&hit.component.name)||name;}
    }
    return {serviceComponentId:cid||null,masterCategoryId:mid||str(log&&log.masterCategoryId)||null,name:name||str(log&&log.item)||'Komponen servis'};
  }

  function sessionRows(log){
    if(!log)return [];
    const sid=sessionIdOf(log),vid=vehicleIdOf(log);
    if(!sid)return [log];
    return logs().filter(x=>x&&vehicleIdOf(x)===vid&&sessionIdOf(x)===sid);
  }

  function components(log){
    const rows=sessionRows(log),out=[],seen=new Set();
    rows.forEach(row=>{
      const payload=Array.isArray(row.checklist)&&row.checklist.length?row.checklist:[row];
      payload.forEach(raw=>{
        const c=canonical(raw,row),cid=str(c.serviceComponentId||raw&&raw.itemId||raw&&raw.checklistItemId||c.name);
        const rowKey=str(row.id||row.checklistItemId||row.serviceComponentId||row.item||'row');
        const identityKey=rowKey+'::'+cid;
        if(!cid||seen.has(identityKey))return;
        seen.add(identityKey);
        out.push({serviceComponentId:c.serviceComponentId||cid,masterCategoryId:c.masterCategoryId||null,name:c.name,actionType:raw&&raw.actionType||row.actionType||null,categoryId:raw&&raw.categoryId||row.categoryId||null,historyId:row.id,sessionId:sessionIdOf(row),vehicleId:vehicleIdOf(row),intervalKmAtService:Number(raw&&raw.intervalKmAtService||row.intervalKmAtService)||null,intervalBulanAtService:Number(raw&&raw.intervalBulanAtService||row.intervalBulanAtService)||null,nextDueKm:raw&&raw.nextDueKm!=null?raw.nextDueKm:row.nextDueKm,nextDueDate:raw&&raw.nextDueDate||row.nextDueDate||null});
      });
    });
    return out;
  }

  function categoryGroups(log){
    const map=new Map();
    components(log).forEach(c=>{
      const key=str(c.masterCategoryId)||'uncategorized';
      if(!map.has(key))map.set(key,{masterCategoryId:c.masterCategoryId||null,name:null,components:[]});
      const group=map.get(key); if(!group.name){
        if(g.ServiceTaxonomySOT&&typeof g.ServiceTaxonomySOT.resolve==='function'){
          const hit=g.ServiceTaxonomySOT.resolve({masterCategoryId:c.masterCategoryId,serviceComponentId:c.serviceComponentId,name:c.name});
          group.name=str(hit&&hit.group&&hit.group.group)||'';
        }
        if(!group.name&&g.ServiceInputCatalog&&typeof g.ServiceInputCatalog.itemById==='function'){
          const hit=g.ServiceInputCatalog.itemById(c.serviceComponentId); group.name=str(hit&&hit.group&&hit.group.group)||'';
        }
      }
      group.name=group.name||c.masterCategoryId||'Kategori belum dipetakan'; group.components.push(c);
    });
    return [...map.values()];
  }

  function reminderState(component){
    const vid=str(component&&component.vehicleId); const cid=str(component&&component.serviceComponentId); const cats=g.D&&Array.isArray(g.D.sparepartCats)?g.D.sparepartCats:[];
    let cat=cats.find(c=>c&&str(c.serviceComponentId)===cid&&(!c.vehicleId||str(c.vehicleId)===vid));
    if(!cat&&component&&component.categoryId)cat=cats.find(c=>c&&str(c.id)===str(component.categoryId)&&(!c.vehicleId||str(c.vehicleId)===vid));
    if(!cat&&typeof g.resolveServisCatForVehicle==='function')cat=g.resolveServisCatForVehicle(component&&component.name||'',vid)||null;
    if(!cat)return {active:false,category:null,intervalKm:null,intervalBulan:null};
    const vehicle=(g.D&&Array.isArray(g.D.vehicles)?g.D.vehicles.find(v=>v&&str(v.id)===vid):null);
    const override=vehicle&&vehicle.intervalOverrides&&cat?Number(vehicle.intervalOverrides[cat.id])||null:null;
    const canonicalInterval=typeof g.getCanonicalServiceInterval==='function'?g.getCanonicalServiceInterval(cat,{intervalKm:override,vehicleId:vid}):{intervalKm:override||Number(cat.intervalKm)||null,intervalBulan:Number(cat.intervalBulan)||null};
    return {active:cat.showInReminder!==false&&!!(canonicalInterval.intervalKm||canonicalInterval.intervalBulan),category:cat,intervalKm:canonicalInterval.intervalKm||null,intervalBulan:canonicalInterval.intervalBulan||null};
  }

  function sessionProjection(log){
    return categoryGroups(log).map(group=>({...group,components:group.components.map(c=>({...c,reminder:reminderState(c)}))}));
  }

  function contextHtml(log,mode){
    const groups=sessionProjection(log); if(!groups.length)return '';
    const count=groups.reduce((n,gp)=>n+gp.components.length,0);
    const body=groups.map(gp=>{
      const items=gp.components.map(c=>{const r=c.reminder;const interval=r.intervalKm?Number(r.intervalKm).toLocaleString('id-ID')+' km':(r.intervalBulan?Number(r.intervalBulan).toLocaleString('id-ID')+' bln':'tanpa interval');return `<div style="padding:7px 0;border-top:1px solid var(--border2);display:flex;justify-content:space-between;gap:8px"><div><b>${esc(c.name)}</b><div class="u-fs10 u-t2">${esc(c.serviceComponentId||'legacy')} · ${esc(interval)}</div></div><div class="u-fs10" style="text-align:right">${r.active?'🔔 Pengingat aktif':'⚪ Pengingat tidak aktif'}</div></div>`;}).join('');
      return `<details open style="margin-top:7px"><summary style="cursor:pointer;font-weight:700">${esc(gp.name)} · ${gp.components.length} komponen</summary>${items}</details>`;
    }).join('');
    return `<div id="s2037MultiCategoryContext" style="background:var(--accent-soft);border:1px solid var(--accent);border-radius:12px;padding:12px;margin-bottom:12px"><div class="u-fw700 u-fs13">🧭 ${mode==='reminder'?'Pengingat':'Riwayat'} · ${groups.length} kategori · ${count} komponen</div><div class="u-fs10 u-t2" style="margin-top:4px">Satu session tetap satu pekerjaan; setiap kategori/komponen diproyeksikan terpisah ke History dan Reminder.</div>${body}</div>`;
  }

  function install(){
    const s=g.Servis;if(!s)return;
    if(typeof s.renderEditHistoryTab==='function'&&!s.__s2037HistoryWrapped){
      const original=s.renderEditHistoryTab;s.__s2037HistoryWrapped=true;
      s.renderEditHistoryTab=function(){
        const log=byId(this.editId);const sid=sessionIdOf(log);const oldSession=this.serviceHistorySessionFilter;const oldComponent=this.serviceHistoryComponentFilter;
        if(log&&sid){this.serviceHistorySessionFilter=sid;this.serviceHistoryComponentFilter='';}
        try{original.apply(this,arguments);}finally{this.serviceHistorySessionFilter=oldSession;this.serviceHistoryComponentFilter=oldComponent;}
        const panel=document.getElementById('servisHistoryPanel');if(!panel||!log)return;const old=panel.querySelector('#s2037MultiCategoryContext');if(old)old.remove();const html=contextHtml(log,'history');if(html){const box=document.createElement('div');box.innerHTML=html;if(box.firstElementChild)panel.insertBefore(box.firstElementChild,panel.firstChild);}
      };
    }
    if(typeof s.renderEditReminderTab==='function'&&!s.__s2037ReminderWrapped){
      const original=s.renderEditReminderTab;s.__s2037ReminderWrapped=true;
      s.renderEditReminderTab=function(){
        const log=byId(this.editId);const htmlLog=log;
        const hadFocus=this._s2019ComponentFocusId;const hadFocusLog=this._s2019ComponentFocusLogId;
        this._s2019ComponentFocusId='';this._s2019ComponentFocusLogId='';
        try{original.apply(this,arguments);}finally{this._s2019ComponentFocusId=hadFocus;this._s2019ComponentFocusLogId=hadFocusLog;}
        const panel=document.getElementById('servisReminderPanel');if(!panel||!htmlLog)return;const old=panel.querySelector('#s2037MultiCategoryContext');if(old)old.remove();const html=contextHtml(htmlLog,'reminder');if(html){const box=document.createElement('div');box.innerHTML=html;if(box.firstElementChild)panel.insertBefore(box.firstElementChild,panel.firstChild);}
      };
    }
    const api={VERSION,sessionRows,components,categoryGroups,reminderState,sessionProjection,contextHtml,install};
    s.serviceHistoryMultiCategorySyncS2037=api;g.ServiceHistoryMultiCategorySyncS2037=api;
  }
  if(g.Servis)install();else if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',install,{once:true});
})(typeof globalThis!=='undefined'?globalThis:window);
