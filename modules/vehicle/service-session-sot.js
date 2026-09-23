'use strict';
/**
 * S1943 Service Session / Job Type SOT.
 * Overhaul/Turun Mesin is a job type under Servis Mesin, never a component.
 * Legacy records are only linked when evidence is explicit or user confirms.
 */
(function(global){
  const VERSION='SERVICE-SESSION-SOT-1';
  const JOB_TYPES=Object.freeze([
    {id:'routine',label:'Servis Rutin',masterCategoryId:null},
    {id:'inspection',label:'Pemeriksaan',masterCategoryId:null},
    {id:'repair',label:'Perbaikan',masterCategoryId:null},
    {id:'overhaul_turun_mesin',label:'Overhaul / Turun Mesin',masterCategoryId:'servis-mesin'},
    {id:'other',label:'Pekerjaan Lainnya',masterCategoryId:null}
  ]);
  const str=v=>v==null?'':String(v).trim();
  function jobType(id){return JOB_TYPES.find(x=>x.id===str(id))||null;}
  function normalize(id,opts){
    const hit=jobType(id);
    if(hit)return {id:hit.id,label:hit.label,masterCategoryId:hit.masterCategoryId||null,evidence:opts&&opts.evidence||'explicit'};
    return {id:null,label:'',masterCategoryId:null,evidence:null};
  }
  function records(){return global.D&&Array.isArray(global.D.servisLogs)?global.D.servisLogs:[];}
  function candidateGroups(vehicleId){
    const vid=str(vehicleId||global.curVehicleId||'');
    const logs=records().filter(s=>s&&(!vid||str(s.vehicleId)===vid));
    const byEvidence=new Map();
    logs.forEach(s=>{
      if(s.sessionId)return;
      let key=null,reason=null;
      if(s.txLinkId){key=`tx:${s.txLinkId}`;reason='transaksi servis yang sama';}
      else if(s.batchId){key=`batch:${s.batchId}`;reason='batch yang sama';}
      else if(s.date && s.km!==null && s.km!==undefined && s.km!==''){key=`datekm:${s.date}:${s.km}`;reason='tanggal + KM sama (kandidat, bukan bukti pasti)';}
      if(!key)return;
      if(!byEvidence.has(key))byEvidence.set(key,{key,reason,vehicleId:s.vehicleId||vid,ids:[],logs:[]});
      const g=byEvidence.get(key);g.ids.push(s.id);g.logs.push(s);
    });
    return [...byEvidence.values()].filter(g=>g.logs.length>1);
  }
  function sessionGroups(vehicleId){
    const vid=str(vehicleId||global.curVehicleId||''); const m=new Map();
    records().filter(s=>s&&(!vid||str(s.vehicleId)===vid)).forEach(s=>{
      if(!s.sessionId)return; if(!m.has(s.sessionId))m.set(s.sessionId,[]);m.get(s.sessionId).push(s);
    });
    return [...m.entries()].map(([sessionId,logs])=>({sessionId,logs,jobType:logs.find(x=>x.serviceJobType)?.serviceJobType||null}));
  }
  function linkManual(ids,jobTypeId){
    const wanted=Array.isArray(ids)?ids.map(String).filter(Boolean):[];
    if(wanted.length<2)return {ok:false,code:'need_two_records'};
    const type=jobType(jobTypeId); if(!type)return {ok:false,code:'invalid_job_type'};
    const found=records().filter(s=>s&&wanted.includes(String(s.id)));
    if(found.length!==wanted.length)return {ok:false,code:'record_not_found'};
    const vehicles=new Set(found.map(s=>str(s.vehicleId)).filter(Boolean));
    if(vehicles.size>1)return {ok:false,code:'vehicle_mismatch'};
    if(found.some(s=>s.sessionId))return {ok:false,code:'already_sessionized'};
    const sid='svc_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
    found.forEach(s=>{s.sessionId=sid;s.serviceJobType=type.id;s.serviceJobLabel=type.label;s.serviceJobEvidence='manual';s.serviceSessionSotVersion=VERSION;});
    if(typeof global.save==='function')global.save({domain:'vehicle'});
    return {ok:true,sessionId:sid,ids:wanted,jobType:type};
  }
  function setJobType(log,jobTypeId,evidence){
    if(!log)return {ok:false,code:'record_not_found'};
    const type=jobType(jobTypeId); if(!type)return {ok:false,code:'invalid_job_type'};
    if(type.id==='overhaul_turun_mesin' && type.masterCategoryId && log.masterCategoryId && log.masterCategoryId!==type.masterCategoryId){
      return {ok:false,code:'category_mismatch'};
    }
    log.serviceJobType=type.id; log.serviceJobLabel=type.label; log.serviceJobEvidence=evidence||'manual'; log.serviceSessionSotVersion=VERSION;
    if(type.masterCategoryId&&!log.masterCategoryId)log.masterCategoryId=type.masterCategoryId;
    return {ok:true,jobType:type};
  }
  function renderReview(container,vehicleId){
    if(!container||typeof document==='undefined')return;
    const groups=candidateGroups(vehicleId); let box=document.getElementById('servisSessionSotReviewCard');
    if(!box){box=document.createElement('div');box.id='servisSessionSotReviewCard';container.insertAdjacentElement('beforebegin',box);}
    if(!groups.length){box.style.display='none';box.innerHTML='';return;}
    box.style.cssText='display:block;margin:0 0 10px;padding:12px;border:1px solid var(--border2);border-radius:12px;background:var(--surface3)';
    box.innerHTML=`<div style="font-weight:800;font-size:13px">🔗 ${groups.length} kandidat sesi servis</div><div style="font-size:11px;color:var(--text2);line-height:1.5;margin-top:4px">Hanya kandidat dengan bukti transaksi/batch yang sama. Sistem tidak menggabungkan hanya karena tanggal sama. Penggabungan tetap memerlukan konfirmasi.</div>`+groups.slice(0,4).map((g,i)=>{const args=escapeHtml(JSON.stringify([g.ids]));const names=g.logs.map(x=>x.item).filter(Boolean).slice(0,4).join(', ');return `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border2);font-size:11px"><b>${escapeHtml(g.reason)}</b> · ${g.logs.length} riwayat<br><span style="color:var(--text2)">${escapeHtml(names)}</span><div style="margin-top:6px"><button type="button" class="btn btn-ghost btn-sm" data-action="ServiceSessionSOT.openMerge" data-args="${args}">Tinjau & Gabungkan</button></div></div>`;}).join('');
  }
  function confirmSelectedMerge(type){
    const ids=[...document.querySelectorAll('#servisSessionSotMergeModal input[data-sot-session-id]:checked')].map(x=>x.getAttribute('data-sot-session-id')).filter(Boolean);
    if(ids.length<2){if(typeof global.toast==='function')global.toast('⚠️ Pilih minimal 2 riwayat');return {ok:false,code:'need_two_records'};}
    const result=linkManual(ids,type);
    const box=document.getElementById('servisSessionSotMergeModal'); if(box)box.remove();
    if(result.ok&&typeof global.toast==='function')global.toast('✅ Riwayat digabung menjadi satu sesi servis');
    else if(typeof global.toast==='function')global.toast('⚠️ Sesi tidak digabung: '+result.code);
    return result;
  }
  function openMerge(ids){
    if(typeof document==='undefined')return null;
    let box=document.getElementById('servisSessionSotMergeModal'); if(box)box.remove();
    box=document.createElement('div'); box.id='servisSessionSotMergeModal'; box.className='overlay open'; box.style.zIndex='420';
    const jobs=JOB_TYPES.filter(j=>j.id!=='other');
    const rows=records().filter(s=>s&&ids.map(String).includes(String(s.id)));
    box.innerHTML='<div class="modal"><div class="modal-handle"></div><div class="modal-title"><span>🔗 Gabungkan Riwayat Menjadi Sesi</span><button class="modal-close" data-action="ServiceSessionSOT.closeMerge">✕</button></div><div style="font-size:11px;color:var(--text2);line-height:1.55;margin-bottom:10px">Kandidat ditemukan dari bukti tanggal+KM/transaksi/batch. Centang hanya riwayat yang benar-benar satu pekerjaan. ID lama tetap dipertahankan.</div><div style="max-height:240px;overflow:auto;border:1px solid var(--border2);border-radius:10px;padding:8px">'+rows.map(s=>`<label style="display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--border2);font-size:11px"><input type="checkbox" data-sot-session-id="${escapeHtml(String(s.id))}" checked><span><b>${escapeHtml(s.item||'Tanpa nama')}</b><br><span style="color:var(--text2)">${escapeHtml(s.date||'')} · ${s.km==null?'':escapeHtml(String(s.km))+' km'} · ${Number(s.cost||0).toLocaleString('id-ID')} </span></span></label>`).join('')+'</div><div style="font-size:11px;font-weight:700;margin:10px 0 7px">Jenis pekerjaan</div><div style="display:flex;gap:7px;flex-wrap:wrap">'+jobs.map(j=>`<button type="button" class="btn btn-ghost btn-sm" data-action="ServiceSessionSOT.confirmSelectedMerge" data-args="${escapeHtml(JSON.stringify([j.id]))}">${escapeHtml(j.label)}</button>`).join('')+'</div><button type="button" class="btn btn-ghost btn-full" style="margin-top:10px" data-action="ServiceSessionSOT.closeMerge">Batal</button></div>';
    document.body.appendChild(box); return box;
  }
  function closeMerge(){const box=document.getElementById('servisSessionSotMergeModal');if(box)box.remove();}

  const api={VERSION,JOB_TYPES,jobType,normalize,records,candidateGroups,sessionGroups,linkManual,setJobType,renderReview,openMerge,confirmSelectedMerge,closeMerge};
  global.ServiceSessionSOT=api; if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
