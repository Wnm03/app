// S1812 split: lower-level service history/reminder methods extracted from servis.js.
// Loaded immediately after servis.js; public API remains Servis.* unchanged.

if (typeof Servis === "undefined") throw new Error("Servis must load before servis-b.js");
Object.assign(Servis, {
/* S1993 cumulative hardening: a multi-component service is one editable
 * financial session. Opening any component row loads the whole session;
 * saving keeps one Finance transaction and one canonical session cost. */
_buildServiceSessionEditContext(editId){
  if(!editId||!globalThis.D||!Array.isArray(D.servisLogs))return null;
  const selected=D.servisLogs.find(x=>x&&x.id===editId);
  if(!selected||!selected.sessionId)return null;
  const rows=D.servisLogs.filter(x=>x&&String(x.sessionId)===String(selected.sessionId)&&String(x.vehicleId||'')===String(selected.vehicleId||''));
  if(rows.length<2)return null;
  const first=rows.find(x=>x.txLinkId)||rows[0];
  const clone=v=>{try{return JSON.parse(JSON.stringify(v));}catch(_){return Object.assign({},v);}};
  const merged=[];const seen=new Set();
  rows.forEach(r=>Array.isArray(r.checklist)&&r.checklist.forEach(c=>{if(!c)return;const key=String(c.itemId||c.serviceComponentId||c.itemName||'');if(key&&!seen.has(key)){seen.add(key);merged.push(clone(c));}}));
  return {editId,sessionId:selected.sessionId,vehicleId:selected.vehicleId,selected,rows,first,originalRows:rows.map(clone),mergedChecklist:merged,legacyCost:Number.isFinite(Number(first.cost))?Number(first.cost):0,txId:first.txLinkId||null};
},
_resolveServiceEditCost(ctx,hasChecklistCostRows,summary,legacyCost){
  if(ctx&&ctx.sessionId&&!ctx.originalRows.some(r=>Array.isArray(r.checklist)&&r.checklist.some(c=>c&&c.costBreakdown&&c.costBreakdown.source==='component')))return ctx.legacyCost;
  return hasChecklistCostRows?Number(summary&&summary.total||0):legacyCost;
},
_restoreServiceSessionAfterEdit(ctx,edited){
  if(!ctx||!ctx.sessionId||!Array.isArray(ctx.rows)||!edited)return false;
  const rows=ctx.rows,clone=v=>{try{return JSON.parse(JSON.stringify(v));}catch(_){return Object.assign({},v);}};
  const merged=Array.isArray(edited.checklist)?edited.checklist:[];
  const byKey=new Map(merged.map(c=>[String(c&&(c.itemId||c.serviceComponentId||c.itemName)||''),c]));
  rows.forEach((r,i)=>{
    const orig=ctx.originalRows[i]||{};const isSelected=r===ctx.selected;
    if(!isSelected)Object.keys(orig).forEach(k=>{r[k]=clone(orig[k]);});
    const origKeys=(Array.isArray(orig.checklist)?orig.checklist:[]).map(c=>String(c&&(c.itemId||c.serviceComponentId||c.itemName)||'')).filter(Boolean);
    r.checklist=origKeys.map(k=>clone(byKey.get(k)||((Array.isArray(orig.checklist)?orig.checklist:[]).find(c=>String(c&&(c.itemId||c.serviceComponentId||c.itemName)||'')===k)))).filter(Boolean);
  });
  const first=rows.find(r=>r.id===ctx.first.id)||rows[0];
  const costRows=rows.flatMap(r=>Array.isArray(r.checklist)?r.checklist:[]).filter(c=>c&&c.costBreakdown&&c.costBreakdown.source==='component');
  const totals=costRows.reduce((a,c)=>{const b=c.costBreakdown||{};['labor','parts','consumables','other'].forEach(k=>a[k]+=Number(b[k])||0);return a;},{labor:0,parts:0,consumables:0,other:0});
  const total=totals.labor+totals.parts+totals.consumables+totals.other;
  if(costRows.length){
    const components=costRows.map(c=>({itemId:c.itemId||null,itemName:c.itemName||'',serviceComponentId:c.serviceComponentId||c.itemId||null,costBreakdown:clone(c.costBreakdown)}));
    first.cost=total;first.costBreakdown={...totals,total,source:'component',reconciled:true};first.serviceCost={...totals,total,source:'component',components};
  }else{
    first.cost=ctx.legacyCost;
    const origFirst=ctx.originalRows.find(r=>r.id===ctx.first.id)||ctx.originalRows[0]||{};
    first.costBreakdown=origFirst.costBreakdown===undefined?first.costBreakdown:clone(origFirst.costBreakdown);
    first.serviceCost=clone(origFirst.serviceCost||null);
  }
  rows.forEach(r=>{if(r!==first){r.cost=0;r.txLinkId=null;r.serviceCost=null;r.costBreakdown=(r.checklist||[]).find(c=>c&&c.costBreakdown&&c.costBreakdown.source==='component')?.costBreakdown||{total:0,labor:null,parts:null,consumables:null,other:null,source:'service_entry'};}});
  if(first.txLinkId&&Array.isArray(D.transactions)){const tx=D.transactions.find(t=>t&&t.id===first.txLinkId);if(tx)tx.amount=first.cost;else first.txLinkId=null;}
  if(typeof save==='function')save({domain:'servis',financeMutation:false});
  return {ok:true,total:first.cost,transactionId:first.txLinkId||null,hasComponent:costRows.length>0};
},
// S1992: sisa jarak/waktu pengingat. Nilai negatif = terlewat (bukan "Sisa -10.637 km").
_formatReminderRemaining(urgency){
  if(!urgency)return '';
  const fmtNum=(v)=>Math.abs(Math.round(v)).toLocaleString('id-ID');
  const part=(v,unit,over,left)=>{
    if(v==null||v===''||!Number.isFinite(Number(v)))return null;
    return Math.round(Number(v))<0?over+' '+fmtNum(Number(v))+' '+unit:left+' '+fmtNum(Number(v))+' '+unit;
  };
  return [part(urgency.sisaKm,'km','Terlewat','Sisa'),part(urgency.sisaBulan,'bln','terlewat','sisa')].filter(Boolean).join(' · ');
},
openPhotoLightbox(src,alt='Foto servis'){
if(typeof document==='undefined'||!src)return false;
Servis._closePhotoLightbox();
const box=document.createElement('div');
box.id='servisPhotoLightbox';
box.setAttribute('role','dialog');
box.setAttribute('aria-modal','true');
box.setAttribute('aria-label',alt||'Foto servis');
box.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.86);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;cursor:zoom-out';
const img=document.createElement('img');
img.src=src;
img.alt=alt||'Foto servis';
img.decoding='async';
img.style.cssText='max-width:96vw;max-height:88vh;width:auto;height:auto;object-fit:contain;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.45);cursor:default';
const close=document.createElement('button');
close.type='button';
close.textContent='✕';
close.setAttribute('aria-label','Tutup foto');
close.style.cssText='position:absolute;top:12px;right:12px;width:42px;height:42px;border:0;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;font-size:22px;cursor:pointer';
box.appendChild(img);box.appendChild(close);
box.addEventListener('click',(e)=>{if(e.target===box||e.target===close)Servis._closePhotoLightbox();});
document.body.appendChild(box);
Servis._photoLightboxKeyHandler=(e)=>{if(e.key==='Escape')Servis._closePhotoLightbox();};
document.addEventListener('keydown',Servis._photoLightboxKeyHandler);
close.focus();
return true;
},
// S1990 split: canonical service-cost/context helpers moved out of servis.js (source-size cap 1800).
_parseLegacyServiceCost(costRaw){
  const cost=costRaw===''?0:Number(costRaw);
  return cost;
},
getCanonicalServiceCost(){
  if(typeof ServisChecklist==='undefined'||typeof ServisChecklist.costSummary!=='function')return {labor:0,parts:0,consumables:0,other:0,total:0,source:'service_entry',byComponent:[]};
  const summary=ServisChecklist.costSummary()||{};
  const rows=typeof ServisChecklist.toLogPayload==='function'?ServisChecklist.toLogPayload():[];
  const byComponent=rows.map(r=>({itemId:r.itemId||null,itemName:r.itemName||'',serviceComponentId:r.serviceComponentId||null,costBreakdown:r.costBreakdown||{labor:0,parts:0,consumables:0,other:0,total:0}}));
  return {labor:Number(summary.labor)||0,parts:Number(summary.parts)||0,consumables:Number(summary.consumables)||0,other:Number(summary.other)||0,total:Number(summary.total)||0,source:'component',byComponent};
},
validateCanonicalServiceCost(summary){
  const s=summary||Servis.getCanonicalServiceCost();
  const sum=['labor','parts','consumables','other'].reduce((n,k)=>n+(Number(s[k])||0),0);
  const componentSum=Array.isArray(s.byComponent)?s.byComponent.reduce((n,row)=>{const b=row&&row.costBreakdown||{};return n+['labor','parts','consumables','other'].reduce((m,k)=>m+(Number(b[k])||0),0);},0):sum;
  const total=Number(s.total)||0;
  const fieldsOk=['labor','parts','consumables','other','total'].every(k=>Number.isFinite(Number(s[k]))&&Number(s[k])>=0);
  const ok=fieldsOk&&Math.abs(sum-total)<0.005&&Math.abs(componentSum-total)<0.005;
  return {ok,total,componentsSum:componentSum,difference:total-componentSum,code:ok?'OK':'SERVICE_COST_TOTAL_MISMATCH'};
},
syncServiceContextFromChecklist(){
if(typeof ServisChecklist==='undefined'||!ServisChecklist._checked)return false;
const ids=Object.keys(ServisChecklist._checked);
const firstId=ids[0];
const found=firstId&&typeof ServisChecklist.findItemById==='function'?ServisChecklist.findItemById(firstId):null;
if(!found)return false;
const item=found.item||found;
const itemName=String(item.name||item.label||'').trim();
const identity=typeof ServisChecklist.getItemIdentity==='function'?ServisChecklist.getItemIdentity(firstId)||{}:{};
const masterCategoryId=identity.masterCategoryId||found.group?.masterCategoryId||(typeof ServisChecklist.resolveCategoryForItem==='function'?(ServisChecklist.resolveCategoryForItem(item,ServisChecklist._vehicleId||curVehicleId)||{}).masterCategoryId||'':'');
const serviceComponentId=identity.serviceComponentId||item.id||'';
const itemEl=document.getElementById('servisItem');if(itemEl&&itemName)itemEl.value=itemName;
const catEl=document.getElementById('servisCategory');if(catEl&&masterCategoryId)catEl.value=masterCategoryId;
const compEl=document.getElementById('servisComponent');if(compEl&&serviceComponentId)compEl.value=serviceComponentId;
const catSot=document.getElementById('servisCategorySot');if(catSot&&masterCategoryId)catSot.value=masterCategoryId;
const compSot=document.getElementById('servisComponentSot');if(compSot&&serviceComponentId)compSot.value=serviceComponentId;
const action=ServisChecklist._checked[firstId]||'';
const actionEl=document.getElementById('servisActionType');if(actionEl&&action)actionEl.value=action;
const resultEl=document.getElementById('servisConditionResult');if(resultEl)resultEl.value=(ServisChecklist._results&&ServisChecklist._results[firstId])||'';
const noteEl=document.getElementById('servisConditionNote');if(noteEl)noteEl.value=(ServisChecklist._conditionNotes&&ServisChecklist._conditionNotes[firstId])||'';
if(masterCategoryId)Servis.setEditCanonicalSelection(masterCategoryId,serviceComponentId);
if(typeof Servis.syncVisibleServiceSotSelectors==='function')Servis.syncVisibleServiceSotSelectors();
return true;
},
onReceiptScanCostInput(value){const n=Number(value);if(!Number.isFinite(n)||n<0)return;const ids=typeof ServisChecklist!=='undefined'?Object.keys(ServisChecklist._checked||{}):[];if(ids.length===1&&ServisChecklist.setItemCost){ServisChecklist.setItemCost(ids[0],{other:n});const info=document.getElementById('servisReceiptScanInfo');if(info)info.textContent=`Nominal scan Rp ${n.toLocaleString('id-ID')} dialokasikan ke biaya komponen yang aktif.`;if(Servis.renderServiceChecklist)Servis.renderServiceChecklist();}else if(ids.length>1){const info=document.getElementById('servisReceiptScanInfo');if(info)info.textContent=`Nominal scan Rp ${n.toLocaleString('id-ID')} terdeteksi. Alokasikan manual pada biaya tiap komponen.`;}},
setManualServiceItemVisible(visible,focus=false){
const wrap=document.getElementById('servisManualItemWrap');if(wrap)wrap.style.display=visible?'':'none';
const btn=document.getElementById('servisManualItemBtn');if(btn)btn.textContent=visible?'↩️ Sembunyikan item manual':'＋ Item manual/non-standar';
if(visible&&focus){const el=document.getElementById('servisItem');if(el){el.focus();el.scrollIntoView({behavior:'smooth',block:'center'});}}
},
toggleManualServiceItem(){const wrap=document.getElementById('servisManualItemWrap');Servis.setManualServiceItemVisible(!wrap||wrap.style.display==='none',true);},
// S1987 split: save-rollback snapshot & create-modal geometry reset moved out of servis.js (source-size cap 1800).
_captureSaveRollback(){
  const _originalService=Servis.editId&&Array.isArray(D.servisLogs)?D.servisLogs.find(x=>x&&x.id===Servis.editId):null;
  const _clone=(v)=>{
    if(v==null)return v;
    try{if(typeof structuredClone==='function')return structuredClone(v);}catch(_e){/* structuredClone tidak tersedia/gagal; fallback JSON di bawah. */}
    try{return JSON.parse(JSON.stringify(v));}catch(_e){return v;}
  };
  const _originalTx=_originalService&&_originalService.txLinkId&&Array.isArray(D.transactions)?D.transactions.find(t=>t&&t.id===_originalService.txLinkId):null;
  const _sessionKey=_originalService&&(_originalService.sessionId||_originalService.serviceJobId||_originalService.id);
  const _sessionRows=_sessionKey?(D.servisLogs||[]).filter(x=>x&&x.vehicleId===_originalService.vehicleId&&String(x.sessionId||x.serviceJobId||x.id)===String(_sessionKey)):[_originalService].filter(Boolean);
  const _stockIds=new Set();_sessionRows.forEach(r=>{[r.usedPartId,r.catalogPartLinkedStockId,r.autoGantiStockId].filter(Boolean).forEach(id=>_stockIds.add(id));});
  const _stockBefore=new Map();for(const id of _stockIds){const row=Array.isArray(D.partsStock)?D.partsStock.find(x=>x&&x.id===id):null;if(row)_stockBefore.set(id,Number(row.qty)||0);}
  const _catBefore=_originalService&&_originalService.categoryId&&Array.isArray(D.sparepartCats)?D.sparepartCats.find(c=>c&&c.id===_originalService.categoryId):null;
  const snapshot={service:_clone(_originalService),sessionRows:_clone(_sessionRows),tx:_clone(_originalTx),stock:_stockBefore,cat:_clone(_catBefore)};
  const restore=()=>{
    try{
      if(Array.isArray(snapshot.sessionRows)&&snapshot.sessionRows.length){const ids=new Set(snapshot.sessionRows.map(x=>String(x.id)));D.servisLogs=(D.servisLogs||[]).filter(x=>!ids.has(String(x.id)));snapshot.sessionRows.forEach(row=>D.servisLogs.push(_clone(row)));}else if(snapshot.service){const cur=(D.servisLogs||[]).find(x=>x&&x.id===snapshot.service.id);if(cur)Object.assign(cur,_clone(snapshot.service));else D.servisLogs.push(_clone(snapshot.service));}
      if(snapshot.tx){
        const cur=(D.transactions||[]).find(x=>x&&x.id===snapshot.tx.id);
        if(cur)Object.assign(cur,_clone(snapshot.tx));else D.transactions.push(_clone(snapshot.tx));
      }else if(Array.isArray(snapshot.sessionRows)&&snapshot.sessionRows.length){const ids=new Set(snapshot.sessionRows.map(x=>String(x.id)));D.transactions=(D.transactions||[]).filter(t=>!(t&&ids.has(String(t.servisLinkId))));}else if(snapshot.service&&snapshot.service.id){D.transactions=(D.transactions||[]).filter(t=>!(t&&t.servisLinkId===snapshot.service.id));}
      for(const [id,qty] of snapshot.stock){const row=(D.partsStock||[]).find(x=>x&&x.id===id);if(row)row.qty=qty;}
      if(snapshot.cat){const cur=(D.sparepartCats||[]).find(x=>x&&x.id===snapshot.cat.id);if(cur)Object.assign(cur,_clone(snapshot.cat));}
      return true;
    }catch(e){console.error('P16: service rollback failed',e);return false;}
  };
  return restore;
},
_restoreCreateModalGeometryFallback(overlay){
// S1986 fallback: keep the reset local for isolated tests/older runtime shells
// that expose resetOverlayGeometry but not the S1987 reusable-modal helper.
if(typeof PWAUX!=='undefined'&&PWAUX&&typeof PWAUX.resetOverlayGeometry==='function')PWAUX.resetOverlayGeometry(overlay);
const modal=overlay.querySelector?overlay.querySelector('.modal'):null;
if(modal&&modal.style){
  ['width','maxWidth','minWidth','height','maxHeight','margin','boxSizing','overflowX','overflowY','display','flexDirection'].forEach(k=>{modal.style[k]='';});
  modal.style.transform='';
  modal.style.transition='';
}
if(overlay.style){
  ['position','inset','width','maxWidth','height','left','right','bottom','top','padding','boxSizing'].forEach(k=>{overlay.style[k]='';});
}
['servisDetailPanel','servisReminderPanel','servisHistoryPanel','servisAuditPanel'].forEach(id=>{
  const panel=document.getElementById(id);
  if(!panel||!panel.style)return;
  ['flex','minHeight','overflowY','overflowX'].forEach(k=>{panel.style[k]='';});
});
},
getServiceOdometerIntegrity(vehicleId){
  const allLogs=Array.isArray(D.servisLogs)?D.servisLogs.filter(s=>s&&s.vehicleId===vehicleId):[];
  const incomplete=allLogs.filter(s=>s.km==null||s.km==='').map(s=>({type:'missing_km',id:s.id||null,date:s.date||null}));
  const invalidKm=allLogs.filter(s=>s.km!=null&&s.km!==''&&(!Number.isFinite(Number(s.km))||Number(s.km)<0)).map(s=>({type:'invalid_km',id:s.id||null,km:s.km}));
  const logs=allLogs.filter(s=>Number.isFinite(Number(s.km))&&Number(s.km)>=0);
  const violations=[];
  const sorted=logs.slice().sort((a,b)=>{const cmp=typeof compareServiceHistoryRecency==='function'?compareServiceHistoryRecency(b,a):String(a.date||'').localeCompare(String(b.date||''))||Number(a.km)-Number(b.km)||String(a.id||'').localeCompare(String(b.id||''));return -cmp;});
  for(let i=1;i<sorted.length;i++){const a=sorted[i-1],b=sorted[i];if(String(a.date||'')<String(b.date||'')&&Number(a.km)>Number(b.km))violations.push({type:'km_regression',previousId:a.id,currentId:b.id,previousKm:Number(a.km),currentKm:Number(b.km),previousDate:a.date,currentDate:b.date});}
  const current=typeof getVehicleKm==='function'?Number(getVehicleKm(vehicleId)):NaN;
  const issues=violations.concat(incomplete,invalidKm);
  return{vehicleId,currentKm:Number.isFinite(current)?current:null,maxHistoricalKm:logs.length?Math.max(...logs.map(s=>Number(s.km))):null,violations,issues,incomplete,invalidKm,ok:issues.length===0};
},

getServiceFinanceOwnershipIntegrity(vehicleId){
  const logs=(Array.isArray(D.servisLogs)?D.servisLogs:[]).filter(s=>s&&(!vehicleId||s.vehicleId===vehicleId));
  const txs=Array.isArray(D.transactions)?D.transactions:[];
  const owners=new Map();
  txs.forEach(t=>{if(t&&t.servisLinkId){if(!owners.has(t.servisLinkId))owners.set(t.servisLinkId,[]);owners.get(t.servisLinkId).push(t);}});
  const issues=[];
  logs.forEach(s=>{const list=owners.get(s.id)||[];if(list.length>1)issues.push({type:'multiple_finance_owners',servisId:s.id,transactionIds:list.map(t=>t.id)});});
  txs.forEach(t=>{if(!t||!t.servisLinkId)return;const s=logs.find(x=>x.id===t.servisLinkId);if(!s)issues.push({type:'orphan_finance_service_link',transactionId:t.id,servisId:t.servisLinkId});else if(s.vehicleId&&t.vehicleId&&s.vehicleId!==t.vehicleId)issues.push({type:'finance_service_vehicle_mismatch',transactionId:t.id,servisId:s.id,serviceVehicleId:s.vehicleId,transactionVehicleId:t.vehicleId});});
  return{vehicleId:vehicleId||null,issues,ok:issues.length===0};
},

getLastServiceKmForCat(vehicleId,cat,actionTypeFilter,forReminder){
const logs=D.servisLogs.filter(s=>s.vehicleId===vehicleId&&s.km&&servisLogMatchesCat(s,cat)&&Servis._matchesActionTypeForReset(s,cat,actionTypeFilter,forReminder));
logs.sort(typeof compareServiceHistoryRecency==='function'?compareServiceHistoryRecency:(a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.km||0)-Number(a.km||0)||String(b.id||'').localeCompare(String(a.id||'')));
return logs.length?logs[0].km:null;
},

_matchesActionTypeForReset(log,cat,actionTypeFilter,forReminder){
const effType=log.actionType||'ganti';
if(forReminder&&cat&&cat.actionMode==='periksa-conditional'&&cat.gantiResetsInterval===false&&effType==='ganti')return false;
if(!actionTypeFilter)return true;
return effType===actionTypeFilter;
},
editSparepartFromReminder(catId){
const exists=(D.sparepartCats||[]).some(c=>c&&String(c.id)===String(catId));
if(!exists){toast('⚠️ Kategori sparepart tidak ditemukan');return;}
// S1965: Pengingat adalah entry point ke editor kategori canonical yang sama.
// Tutup editor riwayat servis terlebih dahulu agar tidak membuat stacked editor.
if(document.getElementById('servisModal')?.classList.contains('open')&&typeof closeModal==='function'){
  closeModal('servisModal',{instant:true});
}
if(typeof Sparepart.openCatModalById==='function')return Sparepart.openCatModalById(catId);
return Sparepart.openCatModal(D.sparepartCats.findIndex(c=>c&&String(c.id)===String(catId)));
},
activeReminderMasterCategoryFilter:null,
activeReminderComponentFilter:'',

// S1906 — transient selection only; never persisted and never creates a new service record.
_selectedHistoryIds:new Set(),
_selectedHistoryVehicleId:null,
_historyAuditVisible:false,
_historySelectionVehicleId(){
  const editId=Servis.editId;
  const editRow=editId!==null&&editId!==undefined?(Array.isArray(D.servisLogs)?D.servisLogs.find(x=>x&&String(x.id)===String(editId)):null):null;
  return String(editRow&&editRow.vehicleId||curVehicleId||'');
},
_historyAuditLogs:[],
_ensureHistorySelectionScope(vehicleId){
  const scope=String(vehicleId||Servis._historySelectionVehicleId()||'');
  if(Servis._selectedHistoryVehicleId!==scope){
    Servis._selectedHistoryIds.clear();
    Servis._selectedHistoryVehicleId=scope;
  }
  return scope;
},
setHistorySelection(id,checked){
  const key=String(id||'');
  if(!key)return;
  Servis._ensureHistorySelectionScope(Servis._historySelectionVehicleId());
  if(checked===undefined)checked=!Servis._selectedHistoryIds.has(key);
  if(checked){
    if(Servis._selectedHistoryIds.size>=100&&!Servis._selectedHistoryIds.has(key)){toast('ℹ️ Maksimal 100 riwayat per operasi.');return;}
    Servis._selectedHistoryIds.add(key);
  }else Servis._selectedHistoryIds.delete(key);
  Servis._historyAuditVisible=false;
  Servis.renderList({skipReminder:true});
},
setHistoryAuditSelection(id,checked,vehicleId){
  const key=String(id||'');
  if(!key)return;
  const scope=Servis._ensureHistorySelectionScope(vehicleId||Servis._historySelectionVehicleId());
  const row=(D.servisLogs||[]).find(x=>x&&String(x.id)===key&&String(x.vehicleId||'')===scope);
  if(!row)return;
  if(checked===undefined)checked=!Servis._selectedHistoryIds.has(key);
  if(checked){
    if(Servis._selectedHistoryIds.size>=100&&!Servis._selectedHistoryIds.has(key)){
      toast('ℹ️ Maksimal 100 riwayat per operasi.');
      return false;
    }
    Servis._selectedHistoryIds.add(key);
  }else Servis._selectedHistoryIds.delete(key);
  Servis._historyAuditVisible=false;
  return true;
},
getHistoryAuditSelectionIds(vehicleId){
  const scope=Servis._ensureHistorySelectionScope(vehicleId||Servis._historySelectionVehicleId());
  const valid=new Set((D.servisLogs||[]).filter(x=>x&&String(x.vehicleId||'')===scope).map(x=>String(x.id)));
  const ids=[...Servis._selectedHistoryIds].filter(id=>valid.has(String(id))).slice(0,100);
  if(Servis._selectedHistoryIds.size>ids.length){
    Servis._selectedHistoryIds.clear();
    ids.forEach(id=>Servis._selectedHistoryIds.add(id));
  }
  return ids;
},
toggleHistorySelection(id){return Servis.setHistorySelection(id);},
clearHistorySelection(){Servis._selectedHistoryIds.clear();Servis._historyAuditVisible=false;Servis.renderList({skipReminder:true});},
selectAllVisibleHistory(ids){
  const list=Array.isArray(ids)?ids.map(String).filter(Boolean):[];
  Servis._ensureHistorySelectionScope(Servis._historySelectionVehicleId());
  const allSelected=list.length>0&&list.every(id=>Servis._selectedHistoryIds.has(id));
  if(allSelected){
    list.forEach(id=>Servis._selectedHistoryIds.delete(id));
  }else{
    let capacity=Math.max(0,100-Servis._selectedHistoryIds.size);
    list.forEach(id=>{
      if(Servis._selectedHistoryIds.has(id))return;
      if(capacity>0){Servis._selectedHistoryIds.add(id);capacity--; }
    });
    if(list.some(id=>!Servis._selectedHistoryIds.has(id)))toast('ℹ️ Pilih semua dibatasi 100 riwayat agar operasi bulk tetap aman.');
  }
  Servis._historyAuditVisible=false;
  Servis.renderList({skipReminder:true});
},
_renderHistoryAuditValue(v){
  if(v==null||v==='')return '—';
  if(Array.isArray(v))return v.map(x=>x&&typeof x==='object'?(x.itemName||x.name||x.itemId||JSON.stringify(x)):String(x)).join(', ');
  if(typeof v==='object')return v.name||v.label||v.id||JSON.stringify(v);
  return String(v);
},
_getSelectedHistoryLogs(logs){
  const scope=Servis._historySelectionVehicleId();
  const byId=new Map((Array.isArray(D.servisLogs)?D.servisLogs:[]).filter(s=>s&&String(s.vehicleId||'')===scope).map(s=>[String(s.id),s]));
  const source=Array.isArray(logs)?logs:[];
  return [...Servis._selectedHistoryIds].map(id=>byId.get(String(id))).filter(Boolean).filter(s=>source.length?source.some(x=>String(x.id)===String(s.id)):true);
},
renderSelectedHistoryAudit(logs){
  const box=document.getElementById('servisHistoryAuditSelection');
  if(!box)return;
  const selected=Servis._getSelectedHistoryLogs(logs);
  Servis._historyAuditLogs=selected.slice();
  if(!Servis._historyAuditVisible||!selected.length){box.style.display='none';box.innerHTML='';return;}
  const esc=v=>typeof escapeHtml==='function'?escapeHtml(Servis._renderHistoryAuditValue(v)):Servis._renderHistoryAuditValue(v);
  const rows=selected.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.km||0)-Number(a.km||0)).map((s,i)=>{
    const history=Array.isArray(s.editHistory)?s.editHistory:[];
    const audit=history.slice(-5).reverse().map(h=>{
      const changes=Array.isArray(h&&h.changes)?h.changes:[];
      const fields=changes.length?changes.map(ch=>`${esc(ch.label||ch.field)}: ${esc(ch.from)} → ${esc(ch.to)}`).join(' · '):(Array.isArray(h&&h.fields)?h.fields.join(', '):'perubahan tercatat');
      const when=h&&h.changedAt?new Date(h.changedAt):null;
      const whenText=when&&!isNaN(when)?when.toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'}):'waktu tidak tercatat';
      return `<div style="padding:6px 0;border-top:1px dashed var(--border)"><b>${esc(whenText)}</b><div class="u-fs11 u-t2">${fields}</div></div>`;
    }).join('');
    const checklist=Array.isArray(s.checklist)?s.checklist:[];
    return `<div style="padding:10px 0;border-top:${i?'1px solid var(--border)':'0'}"><div class="u-fw700 u-fs12">${esc(s.item||'Riwayat servis')}</div><div class="u-fs11 u-t2">${esc(s.date||'—')}${s.km!=null&&s.km!==''?' · '+esc(Number(s.km).toLocaleString('id-ID'))+' km':''}${s.cost!=null?' · '+esc(fmt(s.cost)):''}</div><div class="u-fs11" style="margin-top:5px">Kategori: ${esc(s.masterCategoryId||s.categoryId||'—')} · Komponen: ${esc(s.serviceComponentId||'—')} · Tindakan: ${esc(s.actionType||'—')}</div>${checklist.length?`<div class="u-fs11 u-t2" style="margin-top:4px">Checklist: ${esc(checklist.length)} item</div>`:''}${audit?`<div style="margin-top:5px"><div class="u-fs11 u-fw700">Edit history</div>${audit}</div>`:'<div class="u-fs11 u-t2" style="margin-top:5px">Belum ada perubahan tercatat.</div>'}</div>`;
  }).join('');
  box.innerHTML=`<div style="background:var(--surface3);border:1px solid var(--border2);border-radius:12px;padding:12px;margin-top:10px"><div class="u-flex u-jcb u-aic"><div class="u-fw700 u-fs13">📋 Audit Riwayat Servis — ${selected.length} dipilih</div><button type="button" class="btn btn-ghost btn-sm" data-stop="1" data-action="Servis.hideHistoryAudit">Tutup</button></div><div class="u-fs11 u-t2" style="margin-top:4px">Snapshot read-only dari riwayat yang dicentang. Tidak membuat record servis, reminder, interval, atau transaksi baru.</div>${rows}</div>`;
  box.style.display='block';
},
hideHistoryAudit(){Servis._historyAuditVisible=false;Servis.renderList({skipReminder:true});},
openHistoryAudit(logs){
  const selected=Servis._getSelectedHistoryLogs(logs);
  if(!selected.length){toast('⚠️ Centang minimal satu riwayat servis untuk diaudit');return;}
  // S1976 cumulative: Audit is the full workflow surface. The checklist remains
  // evidence in Riwayat; Audit owns SOT, job-type and package operations.
  // Keep the shared transient selection intact and open the selected record's
  // editor directly on Audit so no intermediate read-only screen can swallow
  // the selection context.
  Servis._historyAuditVisible=false;
  try{
    if(typeof Servis.openModal==='function'&&typeof Servis.setEditTab==='function'){
      Servis.openModal(selected[0].id);
      if(Servis.editId!==null)Servis.setEditTab('audit');
      return;
    }
  }catch(err){
    console.error('[S1976] openHistoryAudit failed',err);
    if(typeof toast==='function')toast('⚠️ Audit tidak dapat dibuka. Pilihan riwayat tetap aman.',5000);
  }
  Servis.renderList({skipReminder:true});
},
activeReminderSeverityFilter:null,
setReminderMasterCategoryFilter(id){Servis.activeReminderMasterCategoryFilter=String(id||'');Servis.activeReminderComponentFilter='';Servis.renderReminder();},
setReminderComponentFilter(id){Servis.activeReminderComponentFilter=String(id||'');Servis.renderReminder();},
setReminderSeverityFilter(v){Servis.activeReminderSeverityFilter=v||null;Servis._saveReminderSeverityFilterPrefs();Servis.renderReminder();},

_reminderSeverityFilterPrefsLoaded:false,
_reminderSeverityFilterStorageKey:'servisReminderSeverityFilterPrefs',
_loadReminderSeverityFilterPrefsOnce(){
if(Servis._reminderSeverityFilterPrefsLoaded)return;
Servis._reminderSeverityFilterPrefsLoaded=true;
if(typeof localStorage==='undefined')return;
try{
const raw=localStorage.getItem(Servis._reminderSeverityFilterStorageKey);
if(!raw)return;
const parsed=JSON.parse(raw);
const v=parsed&&parsed.activeReminderSeverityFilter;
if(v===null||v===undefined)return;
const validValues=['lewat','segera','mendekati','aman'];
if(validValues.indexOf(v)!==-1)Servis.activeReminderSeverityFilter=v;
}catch(err){
// Reminder filter persistence is best-effort; read failures must not break rendering.
}
},
_saveReminderSeverityFilterPrefs(){
if(typeof localStorage==='undefined')return;
try{
localStorage.setItem(Servis._reminderSeverityFilterStorageKey,JSON.stringify({activeReminderSeverityFilter:Servis.activeReminderSeverityFilter}));
}catch(err){
// Reminder filter persistence is best-effort; storage write failures are safe to ignore.
}
},

reminderSeverityChipsHtml(counts){
  const cur=Servis.activeReminderSeverityFilter;
  const opts=[{v:null,label:'🔍 Semua'},{v:'lewat',label:'🔴 Terlewat'},{v:'segera',label:'🟠 Segera'},{v:'mendekati',label:'🔵 Mendekati'},{v:'aman',label:'🟢 Aman'}];
  return `<div class="u-flex u-fs12 u-mb10" style="gap:6px;flex-wrap:wrap">`+opts.map(o=>{const n=o.v===null?counts.total:counts[o.v];return `<div class="chip ${o.v===cur?'active':''}" data-action="Servis.setReminderSeverityFilter" data-args="${escapeHtml(JSON.stringify([o.v]))}">${o.label} (${n})</div>`;}).join('')+`</div>`;
},
renderReminderFilters(card){
  if(!card)return;
  let wrap=document.getElementById('servisReminderFilterWrap');
  if(!wrap){wrap=document.createElement('div');wrap.id='servisReminderFilterWrap';wrap.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 10px';const title=card.querySelector('.card-title');if(title)title.insertAdjacentElement('afterend',wrap);else card.prepend(wrap);}
  if(typeof ServiceInputCatalog==='undefined'){wrap.innerHTML='';return;}
  const groups=ServiceInputCatalog.groups()||[]; const mid=Servis.activeReminderMasterCategoryFilter||''; const comps=mid?((ServiceInputCatalog.groupById(mid)||{}).items||[]):[];
  wrap.innerHTML=`<select class="fs" style="width:auto;min-width:180px;padding:7px 9px" data-onchange="Servis.setReminderMasterCategoryFilter" data-onchange-args='["$value"]'><option value="">Semua kategori servis</option>${groups.map(g=>`<option value="${escapeHtml(g.masterCategoryId)}"${g.masterCategoryId===mid?' selected':''}>${escapeHtml(g.group)}</option>`).join('')}</select><select class="fs" style="width:auto;min-width:190px;padding:7px 9px" data-onchange="Servis.setReminderComponentFilter" data-onchange-args='["$value"]'><option value="">${mid?'Semua komponen':'Pilih kategori dulu'}</option>${comps.map(it=>`<option value="${escapeHtml(it.id)}"${it.id===Servis.activeReminderComponentFilter?' selected':''}>${escapeHtml(it.name)}</option>`).join('')}</select>`;
},
renderReminder(){
const card=document.getElementById('servisReminderCard');
if(!card)return;
Servis._loadReminderSeverityFilterPrefsOnce();
const _legacyServiceMigrationChanged=typeof normalizeLegacyServiceLogs==='function'?normalizeLegacyServiceLogs():0;
if(_legacyServiceMigrationChanged&&typeof save==='function')save();
if(typeof ServiceHistorySOTNormalizer!=='undefined'&&ServiceHistorySOTNormalizer&&typeof ServiceHistorySOTNormalizer.apply==='function')ServiceHistorySOTNormalizer.apply();
if(typeof ServiceHistorySOTReview!=='undefined'&&ServiceHistorySOTReview&&typeof ServiceHistorySOTReview.render==='function')ServiceHistorySOTReview.render(document.getElementById('servisList'),curVehicleId);
const curKm=getVehicleKm(curVehicleId);
const kmPerDay=estimateKmPerDay(curVehicleId);

const reminderCategoryPool=(typeof getReminderCategoriesForVehicle==='function')?getReminderCategoriesForVehicle(curVehicleId):D.sparepartCats;
const remindableCats=typeof dedupeServiceCategoriesForVehicle==='function'?dedupeServiceCategoriesForVehicle(reminderCategoryPool.filter(c=>c.showInReminder!==false&&catVisibleForVehicle(c,curVehicleId)&&!(typeof isServiceComponentNotApplicable==='function'&&isServiceComponentNotApplicable(curVehicleId,c.serviceComponentId||(typeof serviceComponentIdForCategory==='function'?serviceComponentIdForCategory(c):null)))&&((c.intervalKm>0)||(c.intervalBulan>0)||((typeof hasMaintenanceReminderSchedule==='function')&&hasMaintenanceReminderSchedule(curVehicleId,c)))),curVehicleId):reminderCategoryPool.filter(c=>c.showInReminder!==false&&catVisibleForVehicle(c,curVehicleId)&&!(typeof isServiceComponentNotApplicable==='function'&&isServiceComponentNotApplicable(curVehicleId,c.serviceComponentId||(typeof serviceComponentIdForCategory==='function'?serviceComponentIdForCategory(c):null)))&&((c.intervalKm>0)||(c.intervalBulan>0)||((typeof hasMaintenanceReminderSchedule==='function')&&hasMaintenanceReminderSchedule(curVehicleId,c))));
const rfMaster=Servis.activeReminderMasterCategoryFilter;
const rfComp=Servis.activeReminderComponentFilter;
const filteredRemindableCats=remindableCats.filter(c=>{
  if(!rfMaster&&!rfComp)return true;
  const r=(typeof resolveCatGroup==='function')?resolveCatGroup(c,curVehicleId):null;
  const mid=r?r.masterCategoryId:null;
  if(rfComp){const hit=typeof ServiceInputCatalog!=='undefined'?ServiceInputCatalog.itemById(rfComp):null;if(!hit||mid!==hit.group.masterCategoryId)return false;const cid=c.serviceComponentId||(typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.infer==='function'&&ServiceInputCatalog.infer(c.name)?.item?.id)||null;return cid===rfComp;}
  return mid===rfMaster;
});

const conditionCats=(typeof getMaintenanceConditionProjection==='function')?getMaintenanceConditionProjection(curVehicleId):[];
const filteredConditionCats=conditionCats.filter(c=>{
  if(!rfMaster&&!rfComp)return true;
  const r=(typeof resolveCatGroup==='function')?resolveCatGroup(c,curVehicleId):null;
  const mid=r?r.masterCategoryId:null;
  if(rfComp){const hit=typeof ServiceInputCatalog!=='undefined'?ServiceInputCatalog.itemById(rfComp):null;return !!hit&&mid===hit.group.masterCategoryId;}
  return mid===rfMaster;
});
if(!filteredRemindableCats.length&&!filteredConditionCats.length){
const hiddenCount=reminderCategoryPool.length-remindableCats.length;
card.innerHTML='<div class="card-title">🔔 Pengingat Servis</div><div class="empty"><div class="empty-text">'+(hiddenCount?'Belum ada kategori dgn interval servis aktif. '+hiddenCount+' kategori lain disembunyikan/belum diatur intervalnya — atur di 🔧 Kelola Kategori Sparepart.':'Belum ada kategori sparepart. Atur di Pengaturan.')+'</div></div>';
Servis.renderReminderFilters(card);
return;
}
const rows=filteredRemindableCats.map(cat=>{

const resetFilter=(typeof resolveResetActionTypeFilter==='function')?resolveResetActionTypeFilter(cat):null;
const lastKm=Servis.getLastServiceKmForCat(curVehicleId,cat,resetFilter,true);
const intervalKm=getEffectiveIntervalKm(curVehicleId,cat);
const overridden=hasIntervalOverride(curVehicleId,cat);
const jarakTempuh=lastKm===null?curKm:curKm-lastKm;

const u=(typeof computeServiceUrgency==='function')?computeServiceUrgency({vehicleId:curVehicleId,cat,curKm,kmPerDay}):null;
const history=typeof summarizeServiceHistory==='function'?summarizeServiceHistory(curVehicleId,cat):{lastInspected:null,lastReplaced:null,lastCleaned:null,count:0};
const latestInspectionResult=history.lastInspected&&(history.lastInspected.conditionResult||history.lastInspected.conditionStatus)||null;
const effectiveIntervalKm=u&&u.intervalKm>0?u.intervalKm:intervalKm;
const effectiveLastKm=u&&u.lastKm!==undefined?u.lastKm:lastKm;
const sisa=u&&u.sisaKm!=null?u.sisaKm:(effectiveIntervalKm>0?(effectiveIntervalKm-(effectiveLastKm===null?curKm:curKm-effectiveLastKm)):null);
const pct=effectiveIntervalKm>0&&sisa!=null?Math.min(100,Math.max(0,Math.round(((effectiveIntervalKm-sisa)/effectiveIntervalKm)*100))):0;
const status=u?u.status:(sisa==null?'aman':(typeof resolveServiceStatusMeta==='function'?resolveServiceStatusMeta(effectiveIntervalKm>0?sisa/effectiveIntervalKm:1).code:(sisa<=0?'jatuh_tempo':(sisa<=effectiveIntervalKm*0.15?'segera':'aman'))));
const monthLimited=!!(u&&u.intervalBulan&&u.limitingAxis==='bulan'&&u.sisaBulan!=null);
const dayLimited=!!(u&&u.intervalHari&&u.limitingAxis==='hari'&&u.sisaHari!=null);
let col='green',msg=dayLimited?`Sisa ${Math.max(0,Math.round(u.sisaHari))} hari`:monthLimited?`Sisa ~${Math.max(0,Math.round(u.sisaBulan))} bln`:`Sisa ${sisa.toLocaleString('id-ID')} km`,severity=null;
if(status==='terlewat'){
col='red';severity='overdue';
msg=dayLimited?`⚠️ Terlewat ${Math.abs(Math.round(u.sisaHari))} hari`:monthLimited?`⚠️ Terlewat ${Math.abs(Math.round(u.sisaBulan))} bln`:`⚠️ Terlewat ${Math.abs(sisa).toLocaleString('id-ID')} km`;
}else if(status==='jatuh_tempo'){
col='red';severity='overdue';
msg=dayLimited?'🔴 Jatuh tempo hari ini':monthLimited?'🔴 Jatuh tempo bulan ini':'🔴 Jatuh tempo servis';
}else if(status==='segera'){
col='orange';severity='due-soon';
msg=dayLimited?`🔔 Sisa ${Math.max(0,Math.round(u.sisaHari))} hari`:monthLimited?`🔔 Sisa ~${Math.max(0,Math.round(u.sisaBulan))} bln`:`🔔 Sisa ${sisa.toLocaleString('id-ID')} km`;
}else if(status==='mendekati'){
col='orange';severity='watch';
msg=dayLimited?`🔵 Mendekati · ${Math.max(0,Math.round(u.sisaHari))} hari`:monthLimited?`🔵 Mendekati · ~${Math.max(0,Math.round(u.sisaBulan))} bln`:`🔵 Mendekati · ${sisa.toLocaleString('id-ID')} km`;
}

const estDateISO=monthLimited?null:(u&&u.estDateISO!==undefined?u.estDateISO:estimateServiceDateISO(sisa,kmPerDay));
const estLabel=estDateISO?` · ~${fmtDateID(estDateISO)}`:'';

const action=(severity&&typeof VehicleActionRecommendation!=='undefined')?VehicleActionRecommendation.actionFor({type:'service',severity}).label:null;
const nextAction=u&&u.status!=='aman'&&u.nextAction&&u.nextAction!=='event_based'?u.nextAction:null;
const condition=u&&u.condition?u.condition:null;
const componentMeta=(typeof ServiceInputCatalog!=='undefined'&&cat.serviceComponentId&&typeof ServiceInputCatalog.itemById==='function')?ServiceInputCatalog.itemById(cat.serviceComponentId):null;
const canonicalComponentName=componentMeta&&componentMeta.item?componentMeta.item.name:(cat.componentName||cat.name||'');
const canonicalCategoryName=componentMeta&&componentMeta.group?componentMeta.group.group:(cat.group||cat.categoryName||'');
const canonicalMasterCategoryId=componentMeta&&componentMeta.group?componentMeta.group.masterCategoryId:(cat.masterCategoryId||null);
const rec=typeof recommendServiceAction==='function'&&((u&&u.status!=='aman')||latestInspectionResult)?recommendServiceAction({item:componentMeta&&componentMeta.item,cat,urgency:u,conditionResult:latestInspectionResult}):null;
const recommendedAction=rec&&rec.action?rec.action:nextAction;
const recommendationReason=rec&&rec.reason?rec.reason:'';
const actionText=recommendedAction?((recommendedAction==='periksa'?'Periksa':recommendedAction==='bersih'?'Bersihkan':'Ganti')+(condition?' — '+condition:'')):action;
const scheduleLabel=(u&&u.intervalHari&&u.limitingAxis==='hari')?`Setiap ${u.intervalHari} hari`:((effectiveIntervalKm!=null&&effectiveIntervalKm>0)?`Interval ${effectiveIntervalKm.toLocaleString('id-ID')} km`:'Berbasis kondisi/event');
const nextDueKm=u&&u.nextDueKm!=null?u.nextDueKm:null;
const nextDueDate=u&&u.nextDueDate?u.nextDueDate:null;
const dueLabel=nextDueKm!==null&&nextDueDate?`Berikutnya: ${nextDueKm.toLocaleString('id-ID')} km / ${fmtDateID(nextDueDate)}`:nextDueKm!==null?`Berikutnya: ${nextDueKm.toLocaleString('id-ID')} km`:nextDueDate?`Berikutnya: ${fmtDateID(nextDueDate)}`:'';

const historyLogsForSummary=Array.isArray(D.servisLogs)?D.servisLogs.filter(s=>s&&s.vehicleId===curVehicleId&&servisLogMatchesCat(s,cat)):[];
// S2008: distinguish "history exists" from "history eligible to reset the
// reminder". The old UI said "Belum pernah dicatat" whenever lastKm was null,
// even when one or more canonical history rows existed but the current reset
// policy intentionally excluded their action type. That made the card look
// unsynchronized. No data is changed; only the wording follows the same SOT.
const historySummary=historyLogsForSummary.length?`${historyLogsForSummary.length} riwayat tercatat`:'Belum ada riwayat tercatat';
const hasHistoryButNoResetBaseline=historyLogsForSummary.length>0&&effectiveLastKm===null;
const historyBaselineLabel=hasHistoryButNoResetBaseline?'Belum ada riwayat yang mereset interval':(effectiveLastKm===null?'Belum pernah dicatat':`Terakhir di ${effectiveLastKm.toLocaleString('id-ID')} km`);
const legacyReminderFields={nextDueKm,nextDueDate,dueLabel,status};
return{cat,lastKm:effectiveLastKm,intervalKm:effectiveIntervalKm,overridden,sisa,pct,col,msg,estLabel,action:actionText,nextAction:recommendedAction,condition,historySummary,historyBaselineLabel,scheduleLabel,...legacyReminderFields,recommendationReason,history,latestInspectionResult,canonicalComponentName,canonicalCategoryName,canonicalMasterCategoryId};
}).sort((a,b)=>{const av=Number.isFinite(a.sisa)?a.sisa:Number.POSITIVE_INFINITY;const bv=Number.isFinite(b.sisa)?b.sisa:Number.POSITIVE_INFINITY;return av-bv;});
const reminderSeverityCounts={total:rows.length,lewat:rows.filter(r=>r.status==='terlewat'||r.status==='jatuh_tempo').length,segera:rows.filter(r=>r.status==='segera').length,mendekati:rows.filter(r=>r.status==='mendekati').length,aman:rows.filter(r=>r.status==='aman').length};
const rfSeverity=Servis.activeReminderSeverityFilter;
const displayRows=!rfSeverity?rows:rows.filter(r=>rfSeverity==='lewat'?(r.status==='terlewat'||r.status==='jatuh_tempo'):r.status===rfSeverity);
const reminderBadgeParts=[];
if(reminderSeverityCounts.lewat)reminderBadgeParts.push(`${reminderSeverityCounts.lewat} Terlewat`);
if(reminderSeverityCounts.segera)reminderBadgeParts.push(`${reminderSeverityCounts.segera} Segera`);
const reminderBadgeHtml=reminderBadgeParts.length?` <span class="red u-fw700 u-fs11" title="Jumlah part berstatus Terlewat/Jatuh tempo & Segera">(${reminderBadgeParts.join(' · ')})</span>`:'';
card.innerHTML=`<div class="card-title">🔔 Pengingat Servis per Part${reminderBadgeHtml} <span class="card-collapse-toggle" id="servisReminderCard-chev" data-action="toggleCardCollapse" data-args='["servisReminderCard","$event"]' aria-label="Buka/tutup bagian">▾</span></div><div class="card-collapse-body" id="servisReminderCard-cbody">`+(kmPerDay?`<div class="u-fs11 u-t2 u-mb10">📊 Estimasi tanggal dihitung dari rata-rata pemakaian ~${kmPerDay.toFixed(1)} km/hari (histori Catatan KM & BBM).</div>`:'')+(rows.length?Servis.reminderSeverityChipsHtml(reminderSeverityCounts):'')+(rfSeverity&&!displayRows.length&&rows.length?`<div class="u-fs12 u-t2" style="padding:8px 0">Tidak ada part dengan status ini pada kategori yang dipilih.</div>`:'')+`<div class="servis-reminder-list">`+displayRows.map(r=>`
      <div class="u-mb12">
        <div class="u-flex u-jcb u-aic u-fs12 u-mb4 u-pointer" data-action="editSparepartFromReminder" data-args="${escapeHtml(JSON.stringify([r.cat.id]))}" title="Tap untuk edit kategori (berlaku semua kendaraan)">
          <span class="u-fw700">${escapeHtml(r.canonicalCategoryName||'Kategori Servis')} · ${escapeHtml(r.canonicalComponentName||r.cat.name)} <span class="u-fs11 u-t2">✏️</span></span>
          <span class="${r.col} u-fw700">${r.msg}${r.estLabel}</span>
        </div>
        <div class="prog-bar"><div class="prog-fill ${r.col}" style="width:${r.pct}%"></div></div>
        ${r.action?`<div class="u-fs11 u-fw700 u-cacc" style="margin-top:2px">👉 ${escapeHtml(r.action)}</div>`:''}${r.recommendationReason?`<div class="u-fs10 u-t2" style="margin-top:2px">💡 ${escapeHtml(r.recommendationReason)}</div>`:''}${r.history&&r.history.lastInspected?`<div class="u-fs10 u-t2" style="margin-top:2px">🔍 Terakhir diperiksa: ${escapeHtml(serviceHistorySnapshotText(r.history.lastInspected))}${r.latestInspectionResult?` · ${escapeHtml(serviceConditionLabel(r.latestInspectionResult))}`:''}</div>`:''}${r.history&&r.history.lastReplaced?`<div class="u-fs10 u-t2" style="margin-top:2px">🔧 Terakhir diganti: ${escapeHtml(serviceHistorySnapshotText(r.history.lastReplaced))}</div>`:''}
        ${r.dueLabel?`<div class="u-fs11 u-t2" style="margin-top:2px">📅 ${escapeHtml(r.dueLabel)}</div>`:''}
        <div class="u-fs11 u-t2" style="margin-top:2px">🧾 ${escapeHtml(r.historySummary)}</div>
        <div class="u-flex u-jcb u-aic" style="margin-top:3px">
          <div class="u-fs12t2">${r.historyBaselineLabel||((r.lastKm===null)?'Belum pernah dicatat':'Terakhir di '+r.lastKm.toLocaleString('id-ID')+' km')} · ${r.cat._maintenanceProjection?`<span title="Aturan maintenance canonical">${escapeHtml(r.scheduleLabel)}</span>`:`<span data-action="editVehicleIntervalOverride" data-args="${escapeHtml(JSON.stringify([r.cat.id]))}" title="Set interval khusus kendaraan ini" class="u-pointer">${escapeHtml(r.scheduleLabel)}${r.overridden?' <span class="u-cacc u-fw700">(khusus)</span>':''} 🔧</span>`}</div>
          <div class="u-flex" style="gap:6px;flex-wrap:wrap;justify-content:flex-end">
          <button class="btn btn-ghost btn-sm u-fs12" style="padding:3px 10px" data-stop="1" data-action="Servis.openHistoryFromReminder" data-args="${escapeHtml(JSON.stringify([r.cat.id,r.cat.serviceComponentId||null]))}">🧾 Riwayat</button>
          <button class="btn btn-ghost btn-sm u-fs12" style="padding:3px 10px" data-stop="1" data-action="Servis.chooseReminderAction" data-args="${escapeHtml(JSON.stringify([r.cat.id]))}">✅ ${r.nextAction&&r.nextAction!=='event_based'?`Pilih tindakan · ${r.nextAction==='periksa'?'Periksa':r.nextAction==='bersih'?'Bersihkan':'Ganti'}`:'Pilih tindakan'}</button>
          ${r.nextAction==='periksa'&&r.cat.serviceComponentId&&typeof ServiceInputCatalog!=='undefined'&&typeof ServisChecklist!=='undefined'&&ServisChecklist._validActionTypesFor((ServiceInputCatalog.itemById(r.cat.serviceComponentId)||{}).item||{}).includes('ganti')?`<button class="btn btn-ghost btn-sm u-fs12" style="padding:3px 10px" data-stop="1" data-action="markSparepartServiced" data-args="${escapeHtml(JSON.stringify([r.cat.id,'ganti']))}">🔧 Tandai Ganti</button>`:''}
        </div>
        </div>
      </div>`).join('')+`</div>`+`</div>`+(filteredConditionCats.length?`<div class="u-mt12 u-pt10" style="border-top:1px solid var(--border,#ddd)">
      <div class="u-fs12 u-fw700 u-mb8">🩺 Perawatan berbasis kondisi${rfSeverity?' <span class="u-fs10 u-t2 u-fw400">(selalu tampil, di luar filter status)</span>':''}</div>
      ${filteredConditionCats.map(c=>`<div class="u-mb10">
        <div class="u-fs12 u-fw700">${escapeHtml(c.name)}</div>
        <div class="u-fs11 u-t2" style="margin-top:2px">Kondisi: ${escapeHtml(c.condition||'Periksa sesuai gejala')}</div>
        <div class="u-fs11 u-cacc u-fw700" style="margin-top:2px">👉 ${escapeHtml((c.maintenanceActionPlan&&c.maintenanceActionPlan[0]&&c.maintenanceActionPlan[0].action)||'periksa')}</div>
      </div>`).join('')}
    </div>`:'')+`</div>`;
Servis.renderReminderFilters(card);
applyOneCardCollapsePref('servisReminderCard');
},
loadMore(){Servis.listPage++;Servis.renderList();},

setActionTypeFilter(type){
const next=Servis.normalizeActionTypeFilter(type);
Servis.activeActionTypeFilter=next;
Servis.listPage=1;
Servis.renderList();
},
normalizeActionTypeFilter(type){
const v=String(type||'').trim().toLowerCase();
return ['periksa','bersih','ganti'].includes(v)?v:null;
},
effectiveHistoryActionType(log){
const v=String(log&&log.actionType||'').trim().toLowerCase();
// Canonical actionType is explicit. Legacy/unknown rows stay visible in
// the "Diganti" bucket rather than disappearing from every action filter.
return ['periksa','bersih','ganti'].includes(v)?v:'ganti';
},

renderOdometerIntegrityBadge(beforeEl){
let box=document.getElementById('servisOdometerIntegrityBadge');
if(typeof Servis.getServiceOdometerIntegrity!=='function'){if(box)box.style.display='none';return;}
const report=Servis.getServiceOdometerIntegrity(curVehicleId);
if(!report||report.ok){if(box)box.style.display='none';return;}
if(!box){
box=document.createElement('div');
box.id='servisOdometerIntegrityBadge';
box.style.cssText='font-size:11px;color:var(--accent2);background:var(--accent2-soft,rgba(255,0,0,0.06));border:1px solid var(--accent2);border-radius:10px;padding:8px 10px;margin-bottom:10px;line-height:1.5';
beforeEl.insertAdjacentElement('beforebegin',box);
}
const n=(report.issues||[]).length;
box.style.display='block';
box.textContent=`⚠️ ${n} data KM riwayat servis kendaraan ini perlu dicek (KM mundur/kosong/tidak valid) — tap satu per satu di daftar bawah untuk cek & perbaiki.`;
},

renderActionTypeChips(beforeEl){
let row=document.getElementById('servisActionTypeChipRow');
if(!row){
row=document.createElement('div');
row.id='servisActionTypeChipRow';
row.className='u-flex u-fs12 u-mb10';
row.style.cssText='gap:6px;flex-wrap:wrap';
beforeEl.insertAdjacentElement('beforebegin',row);
}
const options=[{v:null,label:'🔍 Semua'},{v:'periksa',label:'🔍 Diperiksa'},{v:'bersih',label:'🧽 Dibersihkan'},{v:'ganti',label:'🔧 Diganti'}];
row.innerHTML=options.map(o=>`<div class="chip ${o.v===Servis.activeActionTypeFilter?'active':''}" data-action="Servis.setActionTypeFilter" data-args="${escapeHtml(JSON.stringify([o.v]))}">${o.label}</div>`).join('');
},
renderList(opts){
const _opts=opts||{};
if(typeof ServiceHistorySOTNormalizer!=='undefined'&&ServiceHistorySOTNormalizer&&typeof ServiceHistorySOTNormalizer.apply==='function')ServiceHistorySOTNormalizer.apply();
if(!_opts.skipReminder)Servis.renderReminder();

Servis._loadMasterCategoryFilterPrefsOnce();
const {from,to}=getCnRange();

const filterSig=curVehicleId+'|'+(+from)+'|'+(+to)+'|'+Servis.activeActionTypeFilter+'|'+Servis.activeMasterCategoryFilter+'|'+Servis.activeServiceComponentFilter;
if(filterSig!==Servis.lastFilterSig){Servis.listPage=1;Servis.lastFilterSig=filterSig;}

const isUncategorizedFilter=typeof UNCATEGORIZED_FILTER_ID!=='undefined'&&Servis.activeMasterCategoryFilter===UNCATEGORIZED_FILTER_ID;
const _perfRev=typeof CarNotesPerformance!=='undefined'&&typeof CarNotesPerformance.revision==='function'?CarNotesPerformance.revision():null;
const _cacheKey=_perfRev===null?null:filterSig+'|r'+_perfRev;
let logs=null;
if(_cacheKey&&Servis._renderListCache&&Servis._renderListCache.key===_cacheKey)logs=Servis._renderListCache.logs;
if(!logs){
  const fromDay=new Date(from.getFullYear(),from.getMonth(),from.getDate());
  const toDay=new Date(to.getFullYear(),to.getMonth(),to.getDate());
  logs=D.servisLogs.filter(s=>{const ds=typeof parseServiceDateOnly==='function'?parseServiceDateOnly(s.date):null;return s.vehicleId===curVehicleId&&ds&&ds>=fromDay&&ds<=toDay&&(!Servis.activeActionTypeFilter||Servis.effectiveHistoryActionType(s)===Servis.activeActionTypeFilter)&&(!Servis.activeMasterCategoryFilter||(isUncategorizedFilter?Servis.resolveLogMasterCategoryId(s)==null:Servis.resolveLogMasterCategoryId(s)===Servis.activeMasterCategoryFilter))&&(!Servis.activeServiceComponentFilter||Servis.resolveLogServiceComponentId(s)===Servis.activeServiceComponentFilter);}).sort(typeof compareServiceHistoryRecency==='function'?compareServiceHistoryRecency:(a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.km)-Number(a.km));
  if(_cacheKey)Servis._renderListCache={key:_cacheKey,logs};
}
const totalCost=logs.reduce((s,x)=>s+(x.cost||0),0);
const lastKm=logs.reduce((m,x)=>x.km&&x.km>m?x.km:m,0);
document.getElementById('servisCount').textContent=logs.length;
document.getElementById('servisTotalCost').textContent=fmt(totalCost);
document.getElementById('servisLastKm').textContent=lastKm?lastKm.toLocaleString('id-ID')+' km':'-';
const el=document.getElementById('servisList');
Servis.renderOdometerIntegrityBadge(el);
Servis.renderActionTypeChips(el);
if(typeof Servis.renderHistoryViewModeChips==='function')Servis.renderHistoryViewModeChips(el);

Servis.renderMasterCategoryChips(el);
Servis.renderServiceComponentFilter(el);
if(!logs.length){
const oldToolbar=document.getElementById('servisHistoryAuditToolbar');if(oldToolbar)oldToolbar.style.display='none';
const oldAudit=document.getElementById('servisHistoryAuditSelection');if(oldAudit){oldAudit.style.display='none';oldAudit.innerHTML='';}
const emptyText=Servis.activeMasterCategoryFilter?'Tidak ada catatan servis utk kategori master ini':'Belum ada catatan servis';
el.innerHTML=`<div class="empty"><div class="empty-icon">🔧</div><div class="empty-text">${escapeHtml(emptyText)}</div></div>`;
return;
}
if(Servis.activeHistoryViewMode==='component'&&typeof Servis.renderComponentExplorer==='function'){Servis.renderComponentExplorer(logs,el);const auditToolbar=document.getElementById('servisHistoryAuditToolbar');if(auditToolbar)auditToolbar.style.display='none';return;}
const visibleCount=Math.min(logs.length,Servis.listPage*TX_PAGE_SIZE);
const visible=logs.slice(0,visibleCount);
const selectionScope=Servis._historySelectionVehicleId();
if(Servis._selectedHistoryVehicleId!==selectionScope){Servis._selectedHistoryIds.clear();Servis._selectedHistoryVehicleId=selectionScope;Servis._historyAuditVisible=false;}
const visibleCandidateIds=logs.map(s=>String(s.id));
// S1980: selection is operation state, not filter state. Never drop valid IDs merely because a filter hides them.
let auditToolbar=document.getElementById('servisHistoryAuditToolbar')||Servis._historyAuditToolbar;
if(!auditToolbar){auditToolbar=document.createElement('div');auditToolbar.id='servisHistoryAuditToolbar';Servis._historyAuditToolbar=auditToolbar;el.insertAdjacentElement('beforebegin',auditToolbar);}
const visibleIds=visible.map(s=>String(s.id));
const selectedCount=Servis._selectedHistoryIds.size;
const allVisibleSelected=visibleIds.length>0&&visibleIds.every(id=>Servis._selectedHistoryIds.has(id));
auditToolbar.style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:0 0 10px';
auditToolbar.innerHTML=`<button type="button" class="btn btn-ghost btn-sm" data-action="Servis.selectAllVisibleHistory" data-args="${escapeHtml(JSON.stringify([visibleIds]))}">${allVisibleSelected?'☐ Batalkan pilih semua':'☑️ Pilih semua tampil'}</button><span class="u-fs11 u-t2">${selectedCount} dipilih</span>${selectedCount?`<button type="button" class="btn btn-ghost btn-sm" data-action="Servis.openHistoryAudit">📋 Audit Riwayat Terpilih</button><button type="button" class="btn btn-ghost btn-sm" data-action="Servis.clearHistorySelection">Bersihkan</button>`:''}`;
let auditBox=document.getElementById('servisHistoryAuditSelection')||Servis._historyAuditSelection;
if(!auditBox){auditBox=document.createElement('div');auditBox.id='servisHistoryAuditSelection';Servis._historyAuditSelection=auditBox;el.insertAdjacentElement('afterend',auditBox);}
Servis.renderSelectedHistoryAudit(logs);

const historyGroups=[]; const historyGroupMap=new Map();
visible.forEach(s=>{
  const key=s.sessionId?`session:${s.sessionId}`:`single:${s.id}`;
  let g=historyGroupMap.get(key);
  if(!g){g={key,sessionId:s.sessionId||null,logs:[]};historyGroupMap.set(key,g);historyGroups.push(g);}
  g.logs.push(s);
});
const _partsById=(_cacheKey&&Servis._renderListPartsCache&&Servis._renderListPartsCache.key===_perfRev)?Servis._renderListPartsCache.map:null;
const partsById=_partsById||new Map((Array.isArray(D.partsStock)?D.partsStock:[]).filter(Boolean).map(p=>[p.id,p]));
if(_cacheKey&&!_partsById)Servis._renderListPartsCache={key:_perfRev,map:partsById};
const _catsById=(_cacheKey&&Servis._renderListCatsCache&&Servis._renderListCatsCache.key===_perfRev)?Servis._renderListCatsCache.map:null;
const catsById=_catsById||new Map((Array.isArray(D.sparepartCats)?D.sparepartCats:[]).filter(Boolean).map(c=>[c.id,c]));
if(_cacheKey&&!_catsById)Servis._renderListCatsCache={key:_perfRev,map:catsById};
const renderHistoryItem=s=>{
const part=s.usedPartId?partsById.get(s.usedPartId):null;
const partInfo=part?` · 📦 ${s.usedPartQty}${part.unit?' '+escapeHtml(part.unit):''} ${escapeHtml(part.name)}`:'';
const checklistSummary=(typeof ServisChecklist!=='undefined'&&typeof ServisChecklist.summaryFromLog==='function')?ServisChecklist.summaryFromLog(s):null;
const checklistInfo=checklistSummary&&checklistSummary.checked?`<span class="servis-history-badge servis-history-check">☑️ ${checklistSummary.checked}/${checklistSummary.total}</span>${(checklistSummary.replaced||checklistSummary.inspected)?`<span class="servis-history-badge servis-history-replaced">🔧 ${checklistSummary.replaced} diganti</span><span class="servis-history-badge servis-history-inspected">🔍 ${checklistSummary.inspected} diperiksa</span>`:''}`:'';
const actionBadge=s.actionType?`<span class="servis-history-badge">${s.actionType==='ganti'?'🔧 Ganti':s.actionType==='bersih'?'🧹 Bersihkan':s.actionType==='periksa'?'🔍 Periksa':'📝 '+escapeHtml(s.actionType)}</span>`:'';
const jobBadge=s.serviceJobLabel?`<span class="servis-history-badge" title="Jenis pekerjaan, bukan komponen katalog">🧰 ${escapeHtml(s.serviceJobLabel)}</span>`:'';
const legacyMappingBadge=(!s.serviceComponentId&&['Kampas Rem','Pembersihan Rem','Servis Rem','Ganti Kampas','Cek Rem'].includes(String(s.item||'').trim()))?`<span class="servis-history-badge servis-history-reminder-missing" title="Riwayat lama belum dipetakan ke komponen canonical. Buka Edit untuk memilih komponen.">⚠️ Perlu pemetaan komponen</span>`:'';
const conditionBadge=s.conditionResult&&typeof serviceConditionLabel==='function'?`<span class="servis-history-badge">${typeof serviceConditionIcon==='function'?serviceConditionIcon(s.conditionResult):'🩺'} ${escapeHtml(serviceConditionLabel(s.conditionResult))}</span>`:'';
const conditionNoteHtml=s.conditionNote?`<div class="servis-history-note">🩺 ${escapeHtml(s.conditionNote)}</div>`:'';
const _historyCost=s.serviceCost||null;
const costBreakdownInfo=_historyCost&&_historyCost.source==='component'?`<div class="servis-history-note" title="Rincian berasal dari biaya per komponen pada Service Event canonical">💰 Jasa ${fmt(_historyCost.labor||0)} · Part ${fmt(_historyCost.parts||0)} · Bahan ${fmt(_historyCost.consumables||0)} · Lain ${fmt(_historyCost.other||0)}</div>`:'';
const fotoInfo=s.foto&&s.foto.length?`<span class="servis-history-badge servis-history-photo">📷 ${s.foto.length}</span>`:'';
const linkedCat=(s.categoryId&&catsById.get(s.categoryId)&&(!catsById.get(s.categoryId).vehicleId||catsById.get(s.categoryId).vehicleId===curVehicleId)?catsById.get(s.categoryId):null)||(typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(s.item,curVehicleId):null);
const linkedIntervalKm=linkedCat&&typeof getEffectiveIntervalKm==='function'?getEffectiveIntervalKm(curVehicleId,linkedCat):(linkedCat&&linkedCat.intervalKm>0?linkedCat.intervalKm:null);
const linkedIntervalBulan=linkedCat&&typeof getEffectiveIntervalBulan==='function'?getEffectiveIntervalBulan(linkedCat,curVehicleId):(linkedCat&&linkedCat.intervalBulan>0?linkedCat.intervalBulan:null);
const linkedReminderInfo=linkedCat&&linkedIntervalKm>0?`<span class="servis-history-badge servis-history-reminder" title="Terhubung ke Pengingat Servis: kategori dan interval dibaca dari sumber yang sama">🔔 ${escapeHtml(linkedCat.name)} · ${linkedIntervalKm.toLocaleString('id-ID')} km${linkedIntervalBulan?` / ${linkedIntervalBulan.toLocaleString('id-ID')} bln`:''}</span>`:(s.categoryId?`<span class="servis-history-badge servis-history-reminder-missing" title="Kategori servis ada, tetapi interval Pengingat belum aktif untuk kendaraan ini">⚠️ Pengingat belum aktif</span>`:'');
const fotoThumb=s.foto&&s.foto.length?`<button type="button" class="servis-history-photo-thumb" data-stop="1" data-action="Servis.openHistoryPhoto" data-args="${escapeHtml(JSON.stringify([s.id,0]))}" aria-label="Buka foto servis"><img src="${s.foto[0]}" alt="" loading="lazy" decoding="async" width="38" height="38" style="width:38px;height:38px;object-fit:cover;border-radius:var(--r-lg);border:1px solid var(--border2);flex-shrink:0"></button>`:'';
const fotoOrIcon=fotoThumb||`<div class="tx-icon u-bgaccsoft">🔧</div>`;
const _selected=Servis._selectedHistoryIds.has(String(s.id));
return `<div class="tx-item servis-history-item ${s.sessionId?'servis-history-session-item':''} u-pointer" data-action="openServisModal" data-args="${escapeHtml(JSON.stringify([s.id]))}"><label data-stop="1" class="u-flexc8" style="align-self:flex-start;padding-top:3px;flex-shrink:0" title="Pilih riwayat untuk audit"><input type="checkbox" ${_selected?'checked':''} data-action="Servis.toggleHistorySelection" data-args="${escapeHtml(JSON.stringify([s.id]))}" aria-label="Pilih riwayat ${escapeHtml(s.item||'servis')} untuk audit"></label>${fotoOrIcon}<div class="tx-info servis-history-info"><div class="tx-name servis-history-title">${escapeHtml(s.item)}</div><div class="tx-meta servis-history-primary">${s.date}${s.km?' · '+s.km.toLocaleString('id-ID')+' km':''}</div>${s.note?`<div class="servis-history-note">${escapeHtml(s.note)}</div>`:''}${conditionNoteHtml}${costBreakdownInfo}<div class="servis-history-badges">${partInfo?`<span class="servis-history-badge servis-history-part">${partInfo.replace(/^ · /,'')}</span>`:''}${s.batchId?`<span class="servis-history-badge servis-history-batch">🔗 batch</span>`:''}${linkedReminderInfo}${jobBadge}${actionBadge}${conditionBadge}${legacyMappingBadge}${checklistInfo}${fotoInfo}</div></div><div class="tx-amount red servis-history-amount">${fmt(s.cost)}</div><button type="button" class="btn btn-ghost btn-sm servis-history-edit" data-stop="1" data-action="openServisModal" data-args="${escapeHtml(JSON.stringify([s.id]))}" aria-label="Edit Checklist Sesi Servis" title="Edit Checklist Sesi Servis">✏️ Edit Checklist</button><button class="tx-del servis-history-delete" data-stop="1" data-action="delServis" data-args="${escapeHtml(JSON.stringify([s.id]))}" aria-label="Hapus">🗑</button></div>`;
};
if(typeof ServiceSessionSOT!=='undefined'&&typeof ServiceSessionSOT.renderReview==='function')ServiceSessionSOT.renderReview(el,curVehicleId);
el.innerHTML=historyGroups.map(g=>{
  if(g.logs.length===1)return renderHistoryItem(g.logs[0]);
  const first=g.logs[0], sessionCost=(first&&first.serviceCost)||(typeof ServiceEventSOT!=='undefined'&&typeof ServiceEventSOT.costForSession==='function'?ServiceEventSOT.costForSession(g.sessionId,curVehicleId):null), total=sessionCost&&Number.isFinite(Number(sessionCost.total))?Number(sessionCost.total):g.logs.reduce((n,x)=>n+(x.cost||0),0);
  const names=g.logs.map(x=>x.item).filter(Boolean);
  const summary=names.slice(0,3).join(', ')+(names.length>3?` +${names.length-3}`:'');
  const groupId=`servis-session-${escapeHtml(String(g.sessionId).replace(/[^a-zA-Z0-9_-]/g,'_'))}`;
  return `<details class="servis-history-session" id="${groupId}"><summary class="tx-item servis-history-session-summary"><div class="tx-icon u-bgaccsoft">🔧</div><div class="tx-info servis-history-info"><div class="tx-name servis-history-title">Servis ${escapeHtml(first.date||'')} — ${g.logs.length} komponen${first.serviceJobLabel?' · '+escapeHtml(first.serviceJobLabel):''}</div><div class="tx-meta servis-history-primary">${escapeHtml(summary)}</div><div class="servis-history-badges"><span class="servis-history-badge servis-history-batch">🔗 sesi ${escapeHtml(String(g.sessionId).slice(-8))}</span>${sessionCost&&sessionCost.source==='component'?`<span class="servis-history-badge">💰 Jasa ${fmt(sessionCost.labor||0)} · Part ${fmt(sessionCost.parts||0)}</span>`:''}</div></div><div class="tx-amount red servis-history-amount">${fmt(total)}</div><button type="button" class="btn btn-ghost btn-sm servis-history-edit-session" data-stop="1" data-action="Servis.openHistorySessionEditor" data-args="${escapeHtml(JSON.stringify([g.sessionId]))}" aria-label="Edit Sesi" title="Edit Sesi">✏️ Edit Sesi</button><button type="button" class="btn btn-ghost btn-sm servis-history-add-session" data-stop="1" data-action="Servis.addHistorySessionComponent" data-args="${escapeHtml(JSON.stringify([g.sessionId]))}" aria-label="Tambah Komponen">➕ Tambah</button><button type="button" class="tx-del servis-history-delete" data-stop="1" data-action="Servis.delSession" data-args="${escapeHtml(JSON.stringify([g.sessionId]))}" aria-label="Hapus seluruh sesi servis">🗑</button></summary><div class="servis-history-session-body">${g.logs.map(renderHistoryItem).join('')}</div></details>`;
}).join('');
let servisMoreWrap=document.getElementById('servisListLoadMoreWrap');
if(!servisMoreWrap){
servisMoreWrap=document.createElement('div');
servisMoreWrap.id='servisListLoadMoreWrap';
servisMoreWrap.style.cssText='text-align:center;margin-top:10px';
servisMoreWrap.innerHTML='<button class="btn btn-ghost btn-sm" data-action="loadMoreServisList" aria-label="Tampilkan lebih banyak riwayat servis"></button>';
el.insertAdjacentElement('afterend',servisMoreWrap);
}
if(visibleCount<logs.length){
servisMoreWrap.style.display='block';
servisMoreWrap.querySelector('button').textContent=`⬇️ Tampilkan lebih banyak (${logs.length-visibleCount} lagi)`;
} else servisMoreWrap.style.display='none';
}


});
/* Loaded after servis.js: install the session-edit bridge without a second SOT. */
(function installServiceSessionEditHardening(){
  const originalOpen=Servis.openModal;
  if(typeof originalOpen==='function'&&!Servis._s1993OpenWrapped){
    Servis.openModal=function(editId,prefillItem){
      const ctx=Servis._buildServiceSessionEditContext(editId);Servis._s1993EditContext=ctx;
      if(ctx){const selected=ctx.selected,original=selected.checklist;selected.checklist=ctx.mergedChecklist;try{return originalOpen.call(this,editId,prefillItem);}finally{selected.checklist=original;}}
      return originalOpen.call(this,editId,prefillItem);
    };Servis._s1993OpenWrapped=true;
  }
  const originalSave=Servis._saveInner;
  if(typeof originalSave==='function'&&!Servis._s1993SaveWrapped){
    Servis._saveInner=async function(){
      const ctx=Servis._s1993EditContext;
      if(ctx&&Servis.editId===ctx.editId){
        const hasComponent=ctx.originalRows.some(r=>Array.isArray(r.checklist)&&r.checklist.some(c=>c&&c.costBreakdown&&c.costBreakdown.source==='component'));
        const costEl=typeof document!=='undefined'?document.getElementById('servisCost'):null;if(costEl&&!hasComponent)costEl.value=String(ctx.legacyCost);
        if(ctx.txId&&!ctx.selected.txLinkId)ctx.selected.txLinkId=ctx.txId;
        try{const result=await originalSave.call(this);Servis._restoreServiceSessionAfterEdit(ctx,ctx.selected);return result;}finally{Servis._s1993EditContext=null;}
      }
      return originalSave.call(this);
    };Servis._s1993SaveWrapped=true;
  }
})();


// S2052/S2053 cumulative session UI contract: openHistorySessionEditor, addHistorySessionComponent, removeHistorySessionComponent, Edit Sesi, Tambah Komponen, Hapus.
