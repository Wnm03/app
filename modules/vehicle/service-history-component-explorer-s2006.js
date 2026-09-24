/* S2006 — Service History Component / Work-Type Explorer
 * Read-only projection over D.servisLogs. No second store and no schema mutation.
 * Loaded after servis-b.js so the public Servis API already exists.
 */
(function(global){
  'use strict';
  const state={view:'session',workType:''};
  const esc=s=>typeof escapeHtml==='function'?escapeHtml(String(s??'')):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const actionLabel=a=>a==='periksa'?'🔍 Diperiksa':a==='bersih'?'🧹 Dibersihkan':a==='ganti'?'🔧 Diganti':a?('📝 '+esc(a)):'—';
  const canonicalId=log=>{
    if(!log)return '';
    const rows=Array.isArray(log.checklist)?log.checklist:[];
    const row=rows.find(x=>x&&!x.notApplicable&&(x.serviceComponentId||x.itemId));
    // S2005 canonical rule: checklist identity is stronger evidence than a
    // stale/legacy top-level identity when the checklist row exists.
    if(row)return String(row.serviceComponentId||row.itemId||'');
    if(log.serviceComponentId)return String(log.serviceComponentId);
    if(log.checklistItemId)return String(log.checklistItemId);
    return '';
  };
  function derive(logs,opts={}){
    const vehicleId=opts.vehicleId==null?'':String(opts.vehicleId);
    const sessionId=opts.sessionId==null?'':String(opts.sessionId);
    const componentId=opts.componentId==null?'':String(opts.componentId);
    const workType=opts.workType==null?'':String(opts.workType);
    return (Array.isArray(logs)?logs:[]).filter(log=>{
      if(!log)return false;
      if(vehicleId&&String(log.vehicleId||'')!==vehicleId)return false;
      const sid=String(log.sessionId||log.serviceJobId||'');
      if(sessionId&&sid!==sessionId)return false;
      const cid=canonicalId(log);
      if(componentId&&cid!==componentId)return false;
      if(workType){
        const rows=Array.isArray(log.checklist)?log.checklist:[];
        const hit=(log.actionType===workType)||rows.some(r=>r&&!r.notApplicable&&r.actionType===workType&&(componentId?String(r.serviceComponentId||r.itemId||'')===componentId:true));
        if(!hit)return false;
      }
      return true;
    }).slice().sort((a,b)=>{
      if(typeof compareServiceHistoryRecency==='function')return compareServiceHistoryRecency(b,a);
      return String(b.date||'').localeCompare(String(a.date||''))||Number(b.km||-1)-Number(a.km||-1)||String(b.id||'').localeCompare(String(a.id||''));
    });
  }
  function group(logs){
    const map=new Map();
    logs.forEach(log=>{
      const cid=canonicalId(log)||'legacy:'+String(log.item||'Tanpa komponen').trim().toLowerCase();
      let g=map.get(cid); if(!g){g={id:cid,rows:[],name:'',category:'',counts:{periksa:0,bersih:0,ganti:0}};map.set(cid,g);}
      g.rows.push(log);
      const rows=Array.isArray(log.checklist)?log.checklist:[];
      const relevant=rows.filter(r=>r&&!r.notApplicable&&(String(r.serviceComponentId||r.itemId||'')===cid));
      const acts=relevant.length?relevant.map(r=>r.actionType).filter(Boolean):[log.actionType];
      acts.forEach(a=>{if(Object.prototype.hasOwnProperty.call(g.counts,a))g.counts[a]++;});
      if(!g.name){
        const hit=typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.itemById==='function'&&!cid.startsWith('legacy:')?ServiceInputCatalog.itemById(cid):null;
        g.name=hit&&hit.item&&hit.item.name||log.item||cid;
        g.category=hit&&hit.group&&hit.group.group||log.group||log.masterCategoryId||'';
      }
    });
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'id'));
  }
  function intervalBadge(log){
    try{
      const vehicleId=log.vehicleId||curVehicleId;
      const cat=typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(log.item||'',vehicleId):null;
      if(!cat)return '';
      const ov=(D.vehicles||[]).find(v=>v&&v.id===vehicleId)?.intervalOverrides?.[cat.id];
      const iv=typeof getCanonicalServiceInterval==='function'?getCanonicalServiceInterval(cat,{intervalKm:ov}):{intervalKm:cat.intervalKm||null,intervalBulan:cat.intervalBulan||null};
      const parts=[];
      if(iv&&iv.intervalKm)parts.push(Number(iv.intervalKm).toLocaleString('id-ID')+' km');
      if(iv&&iv.intervalBulan)parts.push(Number(iv.intervalBulan).toLocaleString('id-ID')+' bulan');
      return parts.length?`<span class="chip">🔔 ${esc(parts.join(' / '))}</span>`:'';
    }catch(_e){return '';}
  }
  function renderComponentView(panel){
    const current=(D.servisLogs||[]).find(x=>x&&String(x.id)===String(Servis.editId));
    if(!current)return;
    const vehicleId=current.vehicleId||curVehicleId;
    const rows=derive(D.servisLogs,{vehicleId,sessionId:Servis.serviceHistorySessionFilter||'',componentId:Servis.serviceHistoryComponentFilter||'',workType:state.workType});
    const groups=group(rows);
    const html=groups.map(g=>`<div style="background:var(--surface3);border:1px solid var(--border);border-radius:14px;padding:12px;margin-bottom:9px"><div class="u-flex u-jcb u-aic" style="gap:8px"><div><div class="u-fw700 u-fs12">🔧 ${esc(g.name)}</div><div class="u-fs10 u-t2">${esc(g.category||'Komponen servis')}</div></div>${g.rows[0]?intervalBadge(g.rows[0]):''}</div><div class="u-fs11 u-t2" style="margin-top:7px">🔍 ${g.counts.periksa} · 🧹 ${g.counts.bersih} · 🔧 ${g.counts.ganti}</div>${g.rows.map(r=>`<button type="button" class="btn btn-ghost btn-sm" style="width:100%;text-align:left;margin-top:7px" data-action="Servis.openModal" data-args="${esc(JSON.stringify([r.id]))}"><b>${esc(r.date||'-')}</b>${r.km!=null?' · '+Number(r.km).toLocaleString('id-ID')+' km':''} · ${actionLabel(r.actionType)}</button>`).join('')}</div>`).join('');
    let box=document.getElementById('serviceHistoryComponentExplorerS2006');
    if(!box){box=document.createElement('div');box.id='serviceHistoryComponentExplorerS2006';const marker=[...panel.querySelectorAll('.fg')].find(x=>x.querySelector('.fl')&&String(x.querySelector('.fl').textContent||'').trim()==='Riwayat Servis');if(marker&&marker.parentNode)marker.parentNode.insertBefore(box,marker);else panel.appendChild(box);}
    box.innerHTML=`<div style="margin:8px 0"><div class="u-fw700 u-fs12">🧩 Per komponen</div><div class="u-fs10 u-t2" style="margin-top:3px">${groups.length} komponen · ${rows.length} riwayat</div></div>${html||'<div class="u-fs11 u-t2">Tidak ada riwayat yang cocok dengan filter.</div>'}`;
    const marker=[...panel.querySelectorAll('.fg')].find(x=>x.querySelector('.fl')&&String(x.querySelector('.fl').textContent||'').trim()==='Riwayat Servis');
    if(marker)marker.style.display='none';
  }
  function renderToolbar(panel){
    let bar=document.getElementById('serviceHistoryExplorerToolbarS2006');
    if(!bar){
      bar=document.createElement('div');bar.id='serviceHistoryExplorerToolbarS2006';bar.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 10px';
      bar.innerHTML=`<button type="button" class="btn btn-ghost btn-sm" data-action="ServiceHistoryComponentExplorerS2006.setView" data-args='["session"]'>🗂️ Sesi</button><button type="button" class="btn btn-ghost btn-sm" data-action="ServiceHistoryComponentExplorerS2006.setView" data-args='["component"]'>🧩 Per komponen</button><button type="button" class="btn btn-ghost btn-sm" data-action="ServiceHistoryComponentExplorerS2006.setWorkType" data-args='[""]'>🔎 Semua</button><button type="button" class="btn btn-ghost btn-sm" data-action="ServiceHistoryComponentExplorerS2006.setWorkType" data-args='["periksa"]'>🔍 Diperiksa</button><button type="button" class="btn btn-ghost btn-sm" data-action="ServiceHistoryComponentExplorerS2006.setWorkType" data-args='["bersih"]'>🧹 Dibersihkan</button><button type="button" class="btn btn-ghost btn-sm" data-action="ServiceHistoryComponentExplorerS2006.setWorkType" data-args='["ganti"]'>🔧 Diganti</button>`;
      const head=panel.firstElementChild;if(head)head.insertAdjacentElement('afterend',bar);else panel.prepend(bar);
    }
    [...bar.querySelectorAll('button')].forEach(b=>{const a=b.getAttribute('data-args')||'';b.classList.toggle('active',(state.view==='component'&&a.includes('component'))||(state.view==='session'&&a.includes('session'))||(state.workType===''&&a.includes('[""]'))||(state.workType&&a.includes('"'+state.workType+'"')));});
  }
  function refresh(){if(typeof Servis==='undefined')return;const panel=document.getElementById('servisHistoryPanel');if(!panel)return;renderToolbar(panel);const marker=[...panel.querySelectorAll('.fg')].find(x=>x.querySelector('.fl')&&String(x.querySelector('.fl').textContent||'').trim()==='Riwayat Servis');if(state.view==='component')renderComponentView(panel);else{const box=document.getElementById('serviceHistoryComponentExplorerS2006');if(box)box.remove();if(marker)marker.style.display='';}renderToolbar(panel);}
  function setView(view){state.view=view==='component'?'component':'session';refresh();return state.view;}
  function setWorkType(type){state.workType=['periksa','bersih','ganti'].includes(type)?type:'';refresh();return state.workType;}
  function install(){if(typeof Servis==='undefined'||typeof Servis.renderEditHistoryTab!=='function'||Servis.__s2006ExplorerInstalled)return false;const original=Servis.renderEditHistoryTab;Servis.renderEditHistoryTab=function(){const r=original.apply(this,arguments);try{refresh();}catch(e){console.error('[S2006] history explorer render failed',e);}return r;};Servis.__s2006ExplorerInstalled=true;return true;}
  const api={derive,group,setView,setWorkType,refresh,install,state};
  global.ServiceHistoryComponentExplorerS2006=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof Servis!=='undefined')install();
})(typeof window!=='undefined'?window:globalThis);
