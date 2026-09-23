'use strict';
/**
 * Service History SOT Review Queue
 *
 * Audit-only/manual workflow for legacy service records that have no proven
 * canonical category/component. It never guesses a category or part.
 */
(function(global){
  const UNMAPPED='LEGACY_UNMAPPED';
  const VERSION='SOT-REVIEW-1';
  const str=v=>v==null?'':String(v).trim();

  function rows(){
    return global.D&&Array.isArray(global.D.servisLogs)?global.D.servisLogs:[];
  }
  function currentVehicleId(){return str(global.curVehicleId||'');}
  function queue(vehicleId){
    const vid=str(vehicleId||currentVehicleId());
    return rows().filter(s=>s&&(!vid||String(s.vehicleId)===vid)&&s.serviceSotStatus===UNMAPPED);
  }
  function stats(vehicleId){
    const q=queue(vehicleId);
    const labor=q.filter(s=>s.serviceType==='LABOR');
    return {total:q.length,labor:labor.length,vehicleId:str(vehicleId||currentVehicleId())};
  }
  function manualMap(id,selection){
    const log=rows().find(s=>s&&String(s.id)===String(id));
    if(!log)return {ok:false,code:'not_found'};
    const componentId=str(selection&&selection.serviceComponentId);
    const masterId=str(selection&&selection.masterCategoryId);
    let component=null;
    if(componentId&&global.ServiceInputCatalog&&typeof global.ServiceInputCatalog.itemById==='function'){
      try{const hit=global.ServiceInputCatalog.itemById(componentId);if(hit&&hit.item)component=hit.item;}catch(_e){/* catalog adapter unavailable; manual mapping remains blocked */}
    }
    if(componentId&&!component)return {ok:false,code:'invalid_component',message:'Komponen harus dipilih dari katalog komponen canonical.'};
    if(component){
      const componentMaster=str(component.masterCategoryId||(component.group&&component.group.masterCategoryId));
      if(componentMaster&&masterId&&componentMaster!==masterId)return {ok:false,code:'category_component_mismatch',message:'Kategori dan komponen tidak cocok.'};
      log.serviceComponentId=componentId;
      log.masterCategoryId=componentMaster||masterId||null;
      log.item=str(component.name||component.componentName)||log.item;
    }else if(masterId){
      const group=global.ServiceInputCatalog&&typeof global.ServiceInputCatalog.groupById==='function'?global.ServiceInputCatalog.groupById(masterId):null;
      if(!group)return {ok:false,code:'invalid_category',message:'Kategori harus dipilih dari master kategori canonical.'};
      log.masterCategoryId=masterId;
      log.serviceComponentId=null;
    }else{
      // Explicitly allow keeping an old record unmapped.
      log.masterCategoryId=null;
      log.serviceComponentId=null;
    }
    log.serviceSotStatus=(log.serviceComponentId||log.masterCategoryId)?'CANONICAL':UNMAPPED;
    log.serviceSotEvidence='manual';
    if(log.serviceSotStatus===UNMAPPED)log.serviceSotReason='Belum ada pemetaan manual; sistem tidak menebak kategori/komponen';
    else delete log.serviceSotReason;
    log.serviceSotReviewVersion=VERSION;
    log.serviceSotReviewedAt=new Date().toISOString();
    if(typeof global.save==='function')global.save({domain:'vehicle'});
    return {ok:true,status:log.serviceSotStatus,log};
  }
  function renderEditNotice(container,log){
    if(!container||typeof document==='undefined')return;
    let box=document.getElementById('servisLegacySotEditNotice');
    if(!box){box=document.createElement('div');box.id='servisLegacySotEditNotice';box.style.cssText='margin:0 0 10px;padding:10px 12px;border-radius:10px;border:1px solid var(--border2);background:var(--surface3);font-size:11px;line-height:1.55';container.insertBefore(box,container.firstChild);}
    const unmapped=log&&log.serviceSotStatus===UNMAPPED;
    box.style.display=unmapped?'block':'none';
    if(!unmapped)return;
    box.innerHTML='<b>⚠️ Riwayat legacy belum dipetakan</b><br>Jangan menebak kategori/komponen. Jika Anda mengetahui pemetaannya, pilih dari kategori/komponen canonical di bawah lalu simpan. Jika tidak tahu, biarkan kosong — riwayat tetap valid. Part katalog dan harga part tidak wajib.';
  }
  function openReview(id){
    if(global.Servis&&typeof global.Servis.openModal==='function')return global.Servis.openModal(id);
    if(typeof global.openServisModal==='function')return global.openServisModal(id);
    return false;
  }
  function render(container,vehicleId){
    if(!container||typeof document==='undefined')return;
    const q=queue(vehicleId);
    let box=document.getElementById('servisLegacySotReviewCard');
    if(!box){box=document.createElement('div');box.id='servisLegacySotReviewCard';container.insertAdjacentElement('beforebegin',box);}
    if(!q.length){box.innerHTML='';box.style.display='none';return;}
    const s=stats(vehicleId);
    const laborText=s.labor?` · ${s.labor} jasa/tenaga kerja`:'';
    box.style.cssText='display:block;margin:0 0 10px;padding:12px;border:1px solid var(--border2);border-radius:12px;background:var(--surface3)';
    box.innerHTML=`<div style="font-weight:800;font-size:13px">🧾 ${s.total} riwayat lama belum dipetakan</div><div style="font-size:11px;color:var(--text2);line-height:1.5;margin-top:4px">Data tanpa bukti kategori/komponen tetap sah sebagai riwayat. Sistem tidak menebak dan tidak mewajibkan part katalog atau harga.${laborText}</div><div style="font-size:11px;color:var(--text2);line-height:1.5;margin-top:4px"><b>Jasa Overhoul/Turun Mesin:</b> tetap di <b>Belum dipetakan</b> sampai Anda sendiri memilih kategori/komponen.</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${q.slice(0,5).map(s=>`<button type="button" class="btn btn-ghost btn-sm" data-action="ServiceHistorySOTReview.openReview" data-args="${typeof global.escapeHtml==='function'?global.escapeHtml(JSON.stringify([s.id])):JSON.stringify([s.id])}">Tinjau: ${typeof global.escapeHtml==='function'?global.escapeHtml(s.item||'Tanpa nama'):(s.item||'Tanpa nama')}</button>`).join('')}</div>${q.length>5?`<div style="font-size:10px;color:var(--text3);margin-top:6px">Menampilkan 5 pertama. Riwayat lain tetap dapat diedit dari daftar.</div>`:''}`;
  }
  const api={version:VERSION,UNMAPPED,queue,stats,manualMap,openReview,render,renderEditNotice};
  global.ServiceHistorySOTReview=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
