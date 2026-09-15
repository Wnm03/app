// modules/vehicle/pro-mockup-presenter.js — Car Notes Pro 8-screen presenter
// 1728: data-driven UI layer. READ-ONLY: reuses existing engines/state and
// never creates a parallel data model. Interactive writes continue through
// the existing Servis/Fuel/Vehicle actions.
(function(){
  function esc(v){ return typeof escapeHtml==='function' ? escapeHtml(String(v==null?'':v)) : String(v==null?'':v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m])); }
  function num(v){ const n=Number(v); return Number.isFinite(n)?n:null; }
  function fmtKm(v){ const n=num(v); return n===null?'—':n.toLocaleString('id-ID')+' km'; }
  function fmtRp(v){ const n=num(v); return n===null?'—':'Rp '+Math.round(n).toLocaleString('id-ID'); }
  function dateISO(){ return typeof todayStr==='function'?todayStr():new Date().toISOString().slice(0,10); }
  function dateLabel(v){
    if(!v)return '—';
    const d=new Date(String(v).length<=10?String(v)+'T00:00:00':v);
    if(Number.isNaN(d.getTime()))return String(v);
    return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
  }
  function vehicle(){
    if(typeof D==='undefined'||!Array.isArray(D.vehicles))return null;
    return D.vehicles.find(v=>v.id===curVehicleId)||D.vehicles[0]||null;
  }
  function vehicles(){ return typeof D!=='undefined'&&Array.isArray(D.vehicles)?D.vehicles:[]; }
  function componentFor(category){
    if(!category)return null;
    const cid=category.serviceComponentId||(typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.infer==='function'&&ServiceInputCatalog.infer(category.name)?.item?.id)||null;
    if(cid&&typeof ServiceInputCatalog!=='undefined')return ServiceInputCatalog.itemById(cid);
    return null;
  }
  function currentComponent(){
    const id=window.__proMockComponentId;
    if(id&&typeof ServiceInputCatalog!=='undefined'){
      const hit=ServiceInputCatalog.itemById(id); if(hit)return hit;
    }
    const cats=typeof getReminderCategoriesForVehicle==='function'?getReminderCategoriesForVehicle(curVehicleId):[];
    for(const c of cats){ const hit=componentFor(c); if(hit)return hit; }
    if(typeof ServiceInputCatalog!=='undefined'){
      const groups=ServiceInputCatalog.groups();
      for(const g of groups)if(g.items&&g.items.length)return {group:g,item:g.items[0]};
    }
    return null;
  }
  let serviceFilter='all';
  let historyFilter='all';
  function serviceRows(){
    const v=vehicle();
    if(!v||typeof predictService!=='function')return [];
    const calc=()=>{try{ const r=predictService({vehicleId:v.id}); return r&&Array.isArray(r.items)?r.items:[]; }catch(e){ return []; }};
    return typeof CarNotesPerformance!=='undefined'&&typeof CarNotesPerformance.memo==='function'?CarNotesPerformance.memo('serviceRows',v.id,calc):calc();
  }
  function serviceReminders(){
    const v=vehicle();
    if(!v||typeof VehicleReminder==='undefined'||typeof VehicleReminder.serviceReminders!=='function')return [];
    const calc=()=>{try{return VehicleReminder.serviceReminders(v.id)||[];}catch(e){return [];}};
    return typeof CarNotesPerformance!=='undefined'&&typeof CarNotesPerformance.memo==='function'?CarNotesPerformance.memo('serviceReminders',v.id,calc):calc();
  }
  function fuelSummary(){
    const v=vehicle();
    if(!v||typeof FuelInsightEngine==='undefined'||typeof FuelInsightEngine.getSummary!=='function')return null;
    const calc=()=>{try{const r=FuelInsightEngine.getSummary(v.id);return r&&r.ok?r:null;}catch(e){return null;}};
    return typeof CarNotesPerformance!=='undefined'&&typeof CarNotesPerformance.memo==='function'?CarNotesPerformance.memo('fuelSummary',v.id,calc):calc();
  }
  // Level 1 fuel status: only read the lightweight stored state/last log for the home card.
  // Full Fuel Intelligence (trend, score, distance) remains lazy on screen 7.
  function fuelLite(){
    const v=vehicle();if(!v)return null;
    const calc=()=>{
      const fs=(v.fuelState&&typeof v.fuelState==='object')?v.fuelState:{};
      const logs=typeof D!=='undefined'&&Array.isArray(D.bbmLogs)?D.bbmLogs.filter(x=>x&&x.vehicleId===v.id):[];
      const last=logs.length?logs.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.km||0)-Number(a.km||0))[0]:null;
      const liter=Number(fs.currentFuelLiter);
      return {liter:Number.isFinite(liter)?liter:null,last:last||null};
    };
    return typeof CarNotesPerformance!=='undefined'&&typeof CarNotesPerformance.memo==='function'?CarNotesPerformance.memo('fuelLite',v.id,calc):calc();
  }
  function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value;}
  function statusClass(status){return status==='terlewat'||status==='jatuh_tempo'||status==='overdue'?'red':status==='segera'||status==='due-soon'?'yellow':'green';}
  function statusLabel(status){return status==='terlewat'||status==='jatuh_tempo'||status==='overdue'?'Terlewat':status==='segera'||status==='due-soon'?'Segera':'Aman';}
  function icon(name){const p={check:'<path d="m5 12 4 4L19 6"/>',warn:'<path d="M12 4l8 16H4L12 4z"/><path d="M12 9v5M12 17h.01"/>',service:'<path d="m14 6 4 4-8 8H6v-4z"/><path d="m13 7 4 4"/>',fuel:'<path d="M7 4h8v16H7z"/><path d="M15 7h3l2 2v7a2 2 0 0 1-4 0V9"/>',history:'<circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/>'};return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p[name]||p.service}</svg>`;}

  function renderHome(){
    const v=vehicle(); if(!v)return;
    setText('proMockVehicleName',v.name||'Kendaraan aktif');
    const meta=[v.brand||v.merk||'',v.model||'',v.year||v.tahun||'',v.plate||v.nopol||v.nomorPolisi||''].filter(Boolean).join(' • ');
    const metaEl=document.querySelector('#proMockScreen1 .pro-mock-vehicle small'); if(metaEl)metaEl.textContent=meta||'Data kendaraan aktif';
    const km=typeof getVehicleKm==='function'?getVehicleKm(v.id):0;
    setText('proMockKm',fmtKm(km));
    const src=typeof getVehicleKmSource==='function'?getVehicleKmSource(v.id):null;
    setText('proMockKmSrc',src&&typeof kmSourceLabel==='function'?kmSourceLabel(src.source):'');
    const rows=serviceRows();
    const overdue=rows.filter(r=>r.status==='terlewat'||r.status==='jatuh_tempo').length;
    const soon=rows.filter(r=>r.status==='segera'||r.status==='due-soon').length;
    let health='Baik';
    if(typeof VehicleIntelligence!=='undefined'&&typeof VehicleIntelligence.summary==='function'){
      try{const vi=VehicleIntelligence.summary(v.id);if(vi&&vi.healthScore&&vi.healthScore.label)health=vi.healthScore.label;}catch(e){ /* health presenter is optional in partial-load/test DOM */ }
    }
    if(health==='Baik'&&(overdue||soon))health=overdue?'Perlu Servis':'Perlu Perhatian';
    const healthEl=document.querySelector('#proMockScreen1 .pro-mock-stat.health b'); if(healthEl)healthEl.textContent=health;
    const svcEl=document.querySelector('#proMockScreen1 .pro-mock-stat.service b'); if(svcEl)svcEl.textContent=overdue?'Terlambat':soon?'Segera':'Tepat Waktu';
    const fuel=fuelLite();
    const fuelEl=document.querySelector('#proMockScreen1 .pro-mock-stat.fuel b');
    if(fuelEl)fuelEl.textContent=fuel&&fuel.liter!=null?(fuel.liter>0?'Tersedia':'Perlu Isi'):(fuel&&fuel.last?'Ada Data':'Belum Ada Data');
    const list=document.querySelector('#proMockScreen1 .pro-mock-reminder-list');
    if(list){
      const rem=serviceReminders().slice(0,3);
      list.innerHTML=rem.length?rem.map(r=>`<button class="pro-mock-reminder ${r.severity==='overdue'?'danger':'warn'}" data-pro-goto="4"><span class="pro-rem-icon">${icon(r.severity==='overdue'?'warn':'service')}</span><span><b>${esc(r.categoryName||'Servis')}</b><small>${esc(r.message||'Perlu diperiksa')}</small></span><i>›</i></button>`).join(''):'<div class="pro-mock-empty">Belum ada pengingat servis aktif.</div>';
    }
  }

  function renderChecklist(){
    const grid=document.querySelector('#proMockScreen3 .pro-check-grid'); if(!grid)return;
    let rows=serviceRows();
    if(serviceFilter!=='all'){const km=Number(serviceFilter);rows=rows.filter(r=>Number(r.intervalKm||r.intervalKmAtService||0)===km);}
    rows=rows.slice(0,8);
    document.querySelectorAll('#proMockScreen3 .pro-chip-row button').forEach(b=>{const key=String(b.textContent||'').replace(/\./g,'').replace(/km/ig,'').trim()==='Semua'?'all':String(b.textContent||'').replace(/\./g,'').replace(/km/ig,'').trim();b.classList.toggle('active',key===serviceFilter);});
    if(!rows.length){grid.innerHTML='<div class="pro-mock-empty">Tidak ada jadwal yang cocok dengan filter ini.</div>';return;}
    grid.innerHTML=rows.map(r=>{
      const catId=r.categoryId||'';
      const hit=componentFor({name:r.categoryName,serviceComponentId:r.serviceComponentId});
      const cid=hit&&hit.item?hit.item.id:'';
      return `<button class="pro-check-card ${statusClass(r.status)}" data-pro-goto="2" data-pro-component="${esc(cid)}"><span class="component-icon">${icon('check')}</span><b>${esc(r.categoryName||'Perawatan')}</b><small>${r.sisaKm!=null?(r.sisaKm<=0?'Terlewat '+Math.abs(r.sisaKm).toLocaleString('id-ID')+' km':'Sisa '+r.sisaKm.toLocaleString('id-ID')+' km'):'Jadwal tersedia'}</small><em>${esc(r.estDateISO?dateLabel(r.estDateISO):'Jadwal belum tersedia')}</em></button>`;
    }).join('');
  }

  function renderComponent(){
    const hit=currentComponent();
    const item=hit&&hit.item; const group=hit&&hit.group;
    setText('proMockComponentName',item?item.name:(group?group.group:'Komponen Servis'));
    setText('proMockComponentGroup',group?group.group:'');
    const status=document.getElementById('proMockComponentStatus');
    const row=serviceRows().find(r=>item&&(r.serviceComponentId===item.id||String(r.categoryName||'').toLowerCase().includes(String(item.name||'').toLowerCase())));
    const category=typeof getReminderCategoriesForVehicle==='function'?getReminderCategoriesForVehicle(curVehicleId).find(c=>c.serviceComponentId===item?.id||String(c.name||'').toLowerCase()===String(item?.name||'').toLowerCase()):null;
    if(status)status.textContent=row?statusLabel(row.status):'Kondisi Normal';
    setText('proMockComponentCondition',row&&row.status!=='aman'?'Perlu perhatian pada jadwal perawatan.':'Komponen dalam kondisi baik.');
    setText('proMockComponentInterval',row&&row.intervalKm>0?row.intervalKm.toLocaleString('id-ID')+' km':(category&&category.intervalKm>0?category.intervalKm.toLocaleString('id-ID')+' km':'Mengikuti jadwal kategori'));
    const monthsEl=document.querySelector('#proMockScreen2 .pro-two-col div:nth-child(2) b');if(monthsEl)monthsEl.textContent=category&&category.intervalBulan>0?category.intervalBulan+' bulan':'—';
    setText('proMockComponentRemaining',row&&row.sisaKm!=null?fmtKm(Math.max(0,row.sisaKm)):'—');
    const pct=row&&row.intervalKm>0&&row.sisaKm!=null?Math.max(0,Math.min(100,Math.round((row.intervalKm-Math.max(0,row.sisaKm))/row.intervalKm*100))):0;
    const bar=document.getElementById('proMockComponentProgress');if(bar)bar.style.width=pct+'%';
    const btn=document.querySelector('#proMockScreen2 .pro-large-btn'); if(btn&&item)btn.setAttribute('data-pro-component',item.id);
  }

  function renderReminders(){
    const screen=document.getElementById('proMockScreen4'); if(!screen)return;
    const v=vehicle();
    const info=screen.querySelector('.pro-info-strip');
    const rows=serviceReminders();
    if(info){
      const eff=(v&&typeof fuelEfficiency==='function')?fuelEfficiency(v.id):null;
      info.textContent=eff&&eff.ok&&eff.kmPerDay?`Estimasi jarak dan tanggal mengikuti rata-rata pemakaian ${eff.kmPerDay.toFixed(1)} km/hari dari data kendaraan.`:'Estimasi tanggal mengikuti data pemakaian yang tersedia.';
    }
    const old=screen.querySelectorAll('.pro-reminder-detail'); old.forEach(e=>e.remove());
    const anchor=screen.querySelector('.pro-filter-selects');
    rows.slice(0,8).forEach(r=>{
      const div=document.createElement('div'); div.className='pro-reminder-detail';
      div.innerHTML=`<span class="r-icon ${r.severity==='overdue'?'red':'yellow'}">${icon(r.severity==='overdue'?'warn':'service')}</span><div><b>${esc(r.categoryName||'Servis')}</b><strong>${esc(r.message||statusLabel(r.severity))}</strong><small>${esc(r.estDateISO?'Perkiraan '+dateLabel(r.estDateISO):'Jadwal berdasarkan data servis')}</small><button data-pro-goto="6" data-pro-component="${esc((r.categoryName&&typeof ServiceInputCatalog!=='undefined'&&ServiceInputCatalog.infer(r.categoryName)?.item?.id)||'')}">Jadwalkan Servis</button></div><i>R</i>`;
      anchor.insertAdjacentElement('afterend',div);
    });
    if(!rows.length){const e=document.createElement('div');e.className='pro-mock-empty';e.textContent='Belum ada pengingat servis aktif.';anchor.insertAdjacentElement('afterend',e);}
  }

  function renderHistory(){
    const screen=document.getElementById('proMockScreen5'); if(!screen)return;
    const old=screen.querySelectorAll('.pro-history-entry');old.forEach(e=>e.remove());
    const services=typeof D!=='undefined'&&Array.isArray(D.servisLogs)?D.servisLogs.filter(s=>s&&s.vehicleId===curVehicleId).map(s=>({kind:'servis',id:s.id,date:s.date,km:s.km,item:s.item,note:s.note,cost:s.cost,raw:s})):[];
    const fuels=typeof D!=='undefined'&&Array.isArray(D.bbmLogs)?D.bbmLogs.filter(b=>b&&b.vehicleId===curVehicleId).map(b=>({kind:'bbm',id:b.id,date:b.date,km:b.km,item:b.spbu||'Isi BBM',note:b.note,cost:b.cost,raw:b})):[];
    let list=[...services,...fuels];
    if(historyFilter==='servis')list=services; else if(historyFilter==='bbm')list=fuels; else if(historyFilter==='penggantian')list=services.filter(x=>String(x.raw&&x.raw.actionType||'').toLowerCase()==='ganti'||/ganti|penggantian/i.test(String(x.item||'')));
    list.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.km||0)-Number(a.km||0));list=list.slice(0,8);
    const anchor=screen.querySelector('.pro-chip-row.history');
    screen.querySelectorAll('.pro-chip-row.history button').forEach(b=>{const key=String(b.textContent||'').trim().toLowerCase()==='semua'?'all':String(b.textContent||'').trim().toLowerCase();b.classList.toggle('active',key===historyFilter);});
    list.forEach(s=>{
      const tags=s.kind==='servis'&&Array.isArray(s.raw.checklist)?s.raw.checklist.filter(x=>x&&x.checked).slice(0,4).map(x=>x.name||x.item||x.itemId).filter(Boolean):[];
      const div=document.createElement('div');div.className='pro-history-entry';if(s.kind==='servis'){div.setAttribute('data-action','openServisModal');div.setAttribute('data-args',JSON.stringify([s.id]));}
      div.innerHTML=`<span class="history-icon">${icon(s.kind==='bbm'?'fuel':'history')}</span><div><div class="pro-history-title"><b>${esc(s.item||'Catatan')}</b><em>Selesai</em></div><small>${esc(dateLabel(s.date))} • ${esc(fmtKm(s.km||0))}</small>${s.note?`<small>${esc(s.note)}</small>`:''}<div class="pro-tags">${tags.map(t=>`<i>${esc(t)}</i>`).join('')}</div></div><strong>${esc(fmtRp(s.cost||0))}</strong>`;
      anchor.insertAdjacentElement('afterend',div);
    });
    if(!list.length){const e=document.createElement('div');e.className='pro-mock-empty';e.textContent='Tidak ada riwayat yang cocok.';anchor.insertAdjacentElement('afterend',e);}
  }

  function renderForm(){
    const v=vehicle();const hit=currentComponent();
    setText('proMockFormDate',dateLabel(dateISO()));
    setText('proMockFormKm',fmtKm(v&&typeof getVehicleKm==='function'?getVehicleKm(v.id):0));
    setText('proMockFormWorkshop','Belum dicatat');
    const sel=document.getElementById('proMockFormService');
    if(sel){sel.innerHTML='';const label=hit&&hit.item?hit.item.name:(hit&&hit.group?hit.group.group:'Servis');const o=document.createElement('option');o.value=label;o.textContent=label;sel.appendChild(o);}
  }

  function renderFuel(){
    const v=vehicle();const summary=fuelSummary();
    if(!v)return;
    const current=typeof fuelEfficiency==='function'?fuelEfficiency(v.id):null;
    const kmpl=current&&current.ok?current.kmPerLiter:null;
    const score=summary&&summary.healthScore!=null?summary.healthScore:null;
    const main=document.querySelector('#proMockScreen7 .pro-fuel-card');
    if(main)main.innerHTML=`<h3>Fuel Intelligence</h3><p>${summary?'Estimasi BBM dan rekomendasi kendaraan aktif dari data yang sudah ada.':'Data BBM belum cukup untuk menampilkan intelijen penuh.'}</p><div class="pro-fuel-main"><div><small>↯ Rata-rata Konsumsi</small><b>${kmpl!=null?kmpl.toFixed(1)+' km/L':'—'}</b><em>${summary&&summary.monthlyCost!=null?fmtRp(summary.monthlyCost)+'/bulan':'Biaya belum cukup dihitung'}</em></div><div class="pro-score"><span>Score ↗</span><strong>${score!=null?score:'—'}<small>/100</small></strong><b>${score==null?'Belum Ada Data':score>=80?'Sangat Baik':score>=60?'Cukup':'Perlu Cek'}</b></div></div>`;
    const gauge=document.getElementById('proFuelGauge');
    if(gauge){
      const html=typeof FuelCard!=='undefined'&&typeof FuelCard._gaugeHtml==='function'?FuelCard._gaugeHtml(v.id):'';
      gauge.innerHTML=html||'<div class="pro-mock-empty">Bar BBM belum dapat dihitung. Catat Full Tank atau atur profil tangki.</div>';
    }
    const source=document.getElementById('proFuelSource');
    if(source){
      const html=typeof FuelCard!=='undefined'&&typeof FuelCard._sourceBadgeHtml==='function'?FuelCard._sourceBadgeHtml(v.id):'';
      source.innerHTML=html||'';
    }
    const actions=document.querySelectorAll('#proMockScreen7 .pro-fuel-actions [data-action]');
    actions.forEach(btn=>btn.setAttribute('data-vehicle-id',v.id));
    const fuel=summary&&summary.fuel;
    const stats=document.querySelector('#proMockScreen7 .pro-fuel-stats');
    if(stats)stats.innerHTML=`<div><small>Estimasi Jarak</small><b>${summary.remainingDistance!=null?Math.round(summary.remainingDistance).toLocaleString('id-ID')+' km':'—'}</b><em>${fuel&&fuel.remainingLiter!=null?'dari sisa BBM '+fuel.remainingLiter+' L':'Data sisa BBM belum tersedia'}</em></div><div><small>Biaya BBM</small><b>${summary&&summary.monthlyCost!=null?fmtRp(summary.monthlyCost):'—'}</b><em>${fuel&&fuel.remainingLiter!=null?'sisa '+fuel.remainingLiter+' L':'Data biaya belum tersedia'}</em></div>`;
    const trend=typeof VehicleFuelTrendSummary!=='undefined'&&typeof VehicleFuelTrendSummary.summary==='function'?VehicleFuelTrendSummary.summary(v.id,7):null;
    const chart=document.querySelector('#proMockScreen7 .pro-fuel-history');
    if(chart&&trend&&trend.ok&&Array.isArray(trend.rows)&&trend.rows.length){
      const values=trend.rows.map(r=>Number(r.total)||0);const max=Math.max(...values,1);
      chart.innerHTML=`<h3>Tren Biaya BBM <strong>${fmtRp(trend.total)}</strong></h3><div class="pro-bars">${trend.rows.map(r=>`<i title="${esc(r.label||r.month||'Periode')}" style="height:${Math.max(8,Math.round(((Number(r.total)||0)/max)*100))}%"></i>`).join('')}</div>`;
    }else if(chart){chart.innerHTML='<h3>Tren BBM</h3><div class="pro-mock-empty">Belum cukup histori BBM untuk tren.</div>';}
    const pills=document.querySelector('#proMockScreen7 .pro-vehicle-pills');if(pills&&vehicles().length>1)pills.innerHTML=vehicles().map(x=>`<button class="${x.id===v.id?'active':''}" data-pro-vehicle="${esc(x.id)}">${esc(x.name||'Kendaraan')}⌄</button>`).join('');
    else if(pills){const b=pills.querySelector('[data-pro-vehicle]');if(b)b.setAttribute('data-pro-vehicle',v.id);}
  }

  function renderOther(){
    const screen=document.getElementById('proMockScreen8'); if(!screen)return;
    const taxBody=document.getElementById('proOtherTaxBody');
    if(taxBody){
      const vs=vehicles();
      const taxRows=vs.length?vs.map(v=>{
        const rows=(typeof VEHTAX_ITEMS!=='undefined'?Object.entries(VEHTAX_ITEMS):[]).map(([key,cfg])=>{
          const raw=v[cfg.tglKey];
          const st=typeof dateStatusBadge==='function'?dateStatusBadge(raw):{label:raw?'Tercatat':'Belum diisi',col:''};
          return `<div class="pro-other-line"><span>${esc(cfg.label)}</span><b class="${esc(st.col||'')}">${esc(st.label||'Belum diisi')}</b><button data-action="openVehTaxModal" data-args="${esc(JSON.stringify([v.id]))}" aria-label="Edit pajak ${esc(v.name||'kendaraan')}">✏️</button></div>`;
        }).join('');
        return `<div class="pro-other-vehicle"><div><b>${esc(v.emoji||'🏍️')} ${esc(v.name||'Kendaraan')}</b><button data-action="openVehTaxModal" data-args="${esc(JSON.stringify([v.id]))}" aria-label="Kelola pajak ${esc(v.name||'kendaraan')}">Kelola</button></div>${taxRows}</div>`;
      }).join(''):'<div class="pro-mock-empty">Belum ada kendaraan.</div>';
      const sims=Array.isArray(D?.simList)?D.simList:[];
      const simRows=sims.length?sims.slice(0,4).map(x=>`<div class="pro-other-line"><span>🪪 ${esc(x.nama||'SIM')}</span><b>${esc(typeof dateStatusBadge==='function'?(dateStatusBadge(x.tglAkhir).label||'Tercatat'):(x.tglAkhir||'Tercatat'))}</b><button data-action="openSimModal" data-args="${esc(JSON.stringify([x.id]))}" aria-label="Edit SIM ${esc(x.nama||'SIM')}">✏️</button></div>`).join(''):'<div class="pro-mock-empty">Belum ada data SIM.</div>';
      taxBody.innerHTML=`${taxRows}<div class="pro-other-subhead"><span>🪪 SIM</span><button data-action="openSimModal" aria-label="Tambah SIM">＋ Tambah</button></div>${simRows}`;
    }

    const auditBody=document.getElementById('proOtherAuditBody');
    if(auditBody&&!auditBody.dataset.ready){
      auditBody.innerHTML='<div class="pro-mock-empty">Audit data siap dijalankan kapan saja. Pemeriksaan hanya baca, tidak mengubah data.</div>';
    }
    const rideBody=document.getElementById('proOtherRideBody');
    if(rideBody){
      const st=typeof RideUI!=='undefined'&&typeof RideUI.getState==='function'?RideUI.getState():{status:'IDLE',summary:null};
      const label=st.status==='RECORDING'?'🔴 Merekam':st.status==='PAUSED'?'⏸ Dijeda':st.status==='STOPPED'?'✅ Selesai':'Siap merekam';
      const dist=st.summary&&Number.isFinite(Number(st.summary.distanceKm))?Number(st.summary.distanceKm).toFixed(2)+' km':'0.00 km';
      let controls='';
      if(st.status==='RECORDING')controls='<button data-action="ProMockupPresenter.pauseRide" aria-label="Jeda rekaman">⏸ Jeda</button><button data-action="ProMockupPresenter.stopRide" aria-label="Selesai dan simpan rekaman">⏹ Selesai</button>';
      else if(st.status==='PAUSED')controls='<button data-action="ProMockupPresenter.resumeRide" aria-label="Lanjutkan rekaman">▶️ Lanjut</button><button data-action="ProMockupPresenter.stopRide" aria-label="Selesai dan simpan rekaman">⏹ Selesai</button>';
      else controls='<button data-action="ProMockupPresenter.startRide" aria-label="Mulai rekam perjalanan">▶️ Mulai Rekam</button>';
      rideBody.innerHTML=`<div class="pro-other-ride-stats"><div><small>Status</small><b>${esc(label)}</b></div><div><small>Jarak sesi</small><b>${esc(dist)}</b></div></div><div class="pro-other-actions">${controls}</div>`;
    }
  }

  function runAudit(){
    const body=document.getElementById('proOtherAuditBody'); if(!body)return;
    const input={
      services:Array.isArray(D?.servisLogs)?D.servisLogs:[],
      bbmLogs:Array.isArray(D?.bbmLogs)?D.bbmLogs:[],
      taxRecords:[],
      vehicles:vehicles(),
      transactions:Array.isArray(D?.transactions)?D.transactions:[],
      partsStock:Array.isArray(D?.partsStock)?D.partsStock:[],
      reminders:Array.isArray(D?.reminders)?D.reminders:[]
    };
    let audit;
    let reports=[];
    try{
      audit=typeof CarNotesPerformance!=='undefined'&&typeof CarNotesPerformance.runIncremental==='function'
        ?CarNotesPerformance.runIncremental(input)
        :null;
      if(!audit){
        if(typeof CarNotesIntegritySuite!=='undefined'&&typeof CarNotesIntegritySuite.run==='function')reports.push(CarNotesIntegritySuite.run(input));
        if(typeof CarNotesFinalAudit!=='undefined'&&typeof CarNotesFinalAudit.reconcile==='function')reports.push(CarNotesFinalAudit.reconcile(input));
        audit={ok:reports.every(r=>r&&r.ok),issues:reports.flatMap(r=>Array.isArray(r&&r.issues)?r.issues:[]),changedDomains:[]};
      }else{
        reports=[audit];
      }
    }catch(e){audit={ok:false,issues:[{code:'AUDIT_RUNTIME_ERROR',detail:String(e&&e.message||e)}]};reports=[audit];}
    const issues=Array.isArray(audit.issues)?audit.issues:[];
    body.dataset.ready='1';
    if(!reports.length){body.innerHTML='<div class="pro-mock-empty">Mesin audit belum tersedia di build ini.</div>';return;}
    if(!issues.length){body.innerHTML='<div class="pro-audit-ok"><b>✓ Data Car Notes sehat</b><small>Tidak ditemukan gap tautan servis, BBM, pajak, stok, odometer, foto, atau reminder.</small></div>';return;}
    body.innerHTML=`<div class="pro-audit-warn"><b>⚠️ ${issues.length} gap ditemukan</b><small>Pemeriksaan bersifat read-only. Tidak ada data yang diubah otomatis.</small><div>${issues.slice(0,8).map(x=>`<span>• ${esc(x.code||'AUDIT_ISSUE')}</span>`).join('')}</div>${issues.length>8?`<small>+ ${issues.length-8} gap lainnya</small>`:''}</div>`;
  }

  function renderMap(){
    // Existing data model has no bengkel/geolocation store. Keep the visual
    // map illustrative but make the copy explicit instead of presenting
    // fabricated real-world distances/ratings as live data.
    const bubble=document.querySelector('#proMockScreen8 .map-bubble');
    if(bubble)bubble.innerHTML='<b>Peta Bengkel</b><small>Data bengkel terdekat belum tersedia di penyimpanan aplikasi.</small><small>Gunakan integrasi peta eksternal saat tersedia.</small>';
    const list=document.querySelector('#proMockScreen8 .pro-shop-list');
    if(list)list.innerHTML='<div class="pro-mock-empty">Belum ada sumber data bengkel terdekat yang tersimpan. Tampilan peta tetap dipertahankan sebagai shell UI.</div>';
  }

  function syncTodayLabels(){
    const label=dateLabel(dateISO());
    document.querySelectorAll('[data-pro-today]').forEach(el=>el.textContent=label);
  }
  function renderAll(){
    /* Performance guard (audit 1751): render only the visible Pro screen.
       Previously all 8 screens recalculated on every navigation/filter change.
       No feature is removed; each screen is refreshed when it becomes active. */
    syncTodayLabels();
    if(!document.body||document.body.dataset.theme!=='pro')return;
    const v=vehicle();if(!v)return;
    const n=Number(document.getElementById('page-carnotes')?.getAttribute('data-pro-screen'))||1;
    if(typeof CarNotesPerformance!=='undefined'&&typeof CarNotesPerformance.beginRender==='function')CarNotesPerformance.beginRender('pro-screen-'+n);
    try{
      if(n===1)renderHome();
      else if(n===2)renderComponent();
      else if(n===3)renderChecklist();
      else if(n===4)renderReminders();
      else if(n===5)renderHistory();
      else if(n===6)renderForm();
      else if(n===7)renderFuel();
      else if(n===8){renderOther();renderMap();}
    }finally{
      if(typeof CarNotesPerformance!=='undefined'&&typeof CarNotesPerformance.finishRender==='function')CarNotesPerformance.finishRender('pro-screen-'+n);
    }
  }

  function currentVehicleId(){return vehicle()&&vehicle().id||null;}
  function openFuelDetail(){const id=currentVehicleId();if(id&&typeof FuelModal!=='undefined'&&typeof FuelModal.open==='function')return FuelModal.open(id);}
  function openFuelCorrection(){const id=currentVehicleId();if(id&&typeof FuelBarCorrection!=='undefined'&&typeof FuelBarCorrection.open==='function')return FuelBarCorrection.open(id);}
  function openFuelTank(){const id=currentVehicleId();if(id&&typeof FuelTankProfileUI!=='undefined'&&typeof FuelTankProfileUI.open==='function')return FuelTankProfileUI.open(id);}
  function startRide(){if(typeof RideUI!=='undefined'&&typeof RideUI.start==='function'){const r=RideUI.start(currentVehicleId());renderAll();return r;}}
  function pauseRide(){if(typeof RideUI!=='undefined'&&typeof RideUI.pause==='function'){const r=RideUI.pause();renderAll();return r;}}
  function resumeRide(){if(typeof RideUI!=='undefined'&&typeof RideUI.resume==='function'){const r=RideUI.resume();renderAll();return r;}}
  function stopRide(){if(typeof RideUI!=='undefined'&&typeof RideUI.stop==='function'){const r=RideUI.stop();renderAll();return r;}}
  window.ProMockupPresenter={render:renderAll,runAudit,openFuelDetail,openFuelCorrection,openFuelTank,startRide,pauseRide,resumeRide,stopRide,setComponent:function(id){window.__proMockComponentId=id||null;renderAll();},setServiceFilter:function(v){serviceFilter=String(v||'all');renderAll();},setHistoryFilter:function(v){historyFilter=String(v||'all');renderAll();}};
  window.addEventListener('pro:mockup-refresh',renderAll);
  // Reuse the existing mockup router; add only component/vehicle selection.
  document.addEventListener('click',function(e){
    const c=e.target&&e.target.closest?e.target.closest('[data-pro-component]'):null;
    if(c){const id=c.getAttribute('data-pro-component');if(id)window.__proMockComponentId=id;}
    const v=e.target&&e.target.closest?e.target.closest('[data-pro-vehicle]'):null;
    if(v){e.preventDefault();const id=v.getAttribute('data-pro-vehicle');if(id&&typeof selectVehicle==='function')selectVehicle(id);else if(id&&typeof FuelDashboard!=='undefined'&&typeof FuelDashboard.switchVehicle==='function')FuelDashboard.switchVehicle(id);renderAll();}
  },true);
})();
