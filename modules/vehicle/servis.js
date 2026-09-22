// P10 FIX: transaksi Finance tertaut bisa hilang lebih dulu
const Servis={
editId:null,
listPage:1,
lastFilterSig:null,
_serviceChecklistGroupIdx:null,
_serviceChecklistMasterCategoryIds:[],
_photoDraft:[],
activeActionTypeFilter:null,
activeMasterCategoryFilter:null,
activeServiceComponentFilter:null,
_masterCategoryFilterPrefsLoaded:false,
_masterCategoryFilterStorageKey:'servisMasterCategoryFilterPrefs',
_loadMasterCategoryFilterPrefsOnce(){
if(Servis._masterCategoryFilterPrefsLoaded)return;
Servis._masterCategoryFilterPrefsLoaded=true;
if(typeof localStorage==='undefined')return;
try{
const raw=localStorage.getItem(Servis._masterCategoryFilterStorageKey);
if(!raw)return;
const parsed=JSON.parse(raw);
const id=parsed&&parsed.activeMasterCategoryFilter;
if(id===null)return;
if(typeof id!=='string')return;
const hasApi=typeof DatabaseAPI!=='undefined'&&DatabaseAPI.masterCategory&&typeof DatabaseAPI.masterCategory.getAll==='function';
const validIds=hasApi?(DatabaseAPI.masterCategory.getAll()||[]).map(c=>c.id):[];
if((typeof UNCATEGORIZED_FILTER_ID!=='undefined'&&id===UNCATEGORIZED_FILTER_ID)||validIds.indexOf(id)!==-1){
Servis.activeMasterCategoryFilter=id;
}
}catch(err){
// Preferences are optional; malformed/unavailable storage must not block Servis startup.
}
},
_saveMasterCategoryFilterPrefs(){
if(typeof localStorage==='undefined')return;
try{
localStorage.setItem(Servis._masterCategoryFilterStorageKey,JSON.stringify({activeMasterCategoryFilter:Servis.activeMasterCategoryFilter}));
}catch(err){
// Preferences are optional; storage write failures are intentionally ignored.
}
},
resolveLogMasterCategoryId(s){
if(typeof resolveCatGroup!=='function')return null;
const vehicleId=s.vehicleId||curVehicleId;
const linkedCat=(()=>{const preferred=s.categoryId&&D.sparepartCats.find(c=>c&&c.id===s.categoryId&&(!c.vehicleId||c.vehicleId===vehicleId));return preferred||(typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(s.item,vehicleId):D.sparepartCats.find(c=>!c.vehicleId&&c.name.toLowerCase()===(s.item||'').toLowerCase()));})();
if(!linkedCat)return null;
const r=resolveCatGroup(linkedCat,vehicleId);
return r?r.masterCategoryId:null;
},
resolveLogServiceComponentId(s){
if(!s)return null;
if(s.serviceComponentId)return s.serviceComponentId;
if(Array.isArray(s.checklist)){
  const row=s.checklist.find(r=>r&&r.itemId);
  if(row&&row.itemId)return row.itemId;
}
if(typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.infer==='function'){
  const hit=ServiceInputCatalog.infer(s.item||'');
  if(hit&&hit.item&&hit.item.id)return hit.item.id;
}
return null;
},
setMasterCategoryFilter(id){
Servis.activeMasterCategoryFilter=id||null;
Servis.activeServiceComponentFilter=null;
Servis._saveMasterCategoryFilterPrefs();
Servis.listPage=1;
Servis.renderList();
},
setServiceComponentFilter(id){
Servis.activeServiceComponentFilter=id||null;
Servis.listPage=1;
Servis.renderList();
},
openHistoryFromReminder(categoryId,componentId){
  const linkedCat=(D.sparepartCats||[]).find(c=>c&&c.id===categoryId)||null;
  const group=linkedCat&&typeof resolveCatGroup==='function'?resolveCatGroup(linkedCat,curVehicleId):null;
  const masterId=group&&group.masterCategoryId?group.masterCategoryId:(linkedCat&&linkedCat.masterCategoryId?linkedCat.masterCategoryId:categoryId||null);
  Servis.activeActionTypeFilter=null;
  Servis.activeMasterCategoryFilter=masterId;
  Servis.activeServiceComponentFilter=componentId||null;
  const _periodeBerubah=cnPeriode!=='selamanya';
  cnPeriode='selamanya';
  if(typeof cnPeriodeByTab==='object'&&cnPeriodeByTab)cnPeriodeByTab.servis='selamanya';
  const periodeChips=document.getElementById('cnPeriodeChips');
  if(periodeChips){
    periodeChips.querySelectorAll('.chip-btn').forEach(b=>b.classList.remove('active'));
    const foreverChip=periodeChips.querySelector('[data-args*="selamanya"]');
    if(foreverChip)foreverChip.classList.add('active');
  }
  const customRange=document.getElementById('cnCustomRange');
  if(customRange)customRange.classList.add('u-dnone');
  if(_periodeBerubah&&typeof toast==='function')toast('Menampilkan seluruh riwayat (periode direset ke Selamanya)');
  Servis.listPage=1;
  Servis._saveMasterCategoryFilterPrefs();
  Servis.renderList();
  const anchor=document.getElementById('servisHistoryCard')||document.getElementById('servisList');
  if(anchor&&typeof anchor.scrollIntoView==='function')anchor.scrollIntoView({behavior:'smooth',block:'start'});
},
renderServiceComponentFilter(beforeEl){
let wrap=document.getElementById('servisComponentFilterWrap');
if(!wrap){wrap=document.createElement('div');wrap.id='servisComponentFilterWrap';wrap.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0 10px';beforeEl.insertAdjacentElement('beforebegin',wrap);}
if(typeof ServisChecklist==='undefined'||typeof ServisChecklist.itemsForMasterCategory!=='function'){wrap.innerHTML='';return;}
const mid=Servis.activeMasterCategoryFilter;
const items=mid&&mid!==UNCATEGORIZED_FILTER_ID?ServisChecklist.itemsForMasterCategory(mid):(!mid?SERVICE_CHECKLIST_GROUPS.reduce((a,g)=>a.concat(ServisChecklist.itemsOfGroup(g)),[]):[]);
const uniq=[];const seen=new Set();(items||[]).forEach(it=>{if(it&&it.id&&!seen.has(it.id)){seen.add(it.id);uniq.push(it);}});
const selected=uniq.some(it=>it.id===Servis.activeServiceComponentFilter)?Servis.activeServiceComponentFilter:null;
Servis.activeServiceComponentFilter=selected;
const disabled=mid===UNCATEGORIZED_FILTER_ID;
wrap.innerHTML=`<label style="font-size:11px;color:var(--text2);font-weight:700;white-space:nowrap">🧩 Komponen</label><select class="fs" style="flex:1;min-width:220px;max-width:420px;padding:8px 10px" ${disabled?'disabled':''} data-onchange="Servis.setServiceComponentFilter" data-onchange-args='["$value"]'><option value="">${disabled?'Tidak tersedia untuk data belum dikategorikan':mid?'Semua komponen pada kategori ini':'Pilih kategori dulu'}</option>${uniq.map(it=>`<option value="${escapeHtml(it.id)}"${it.id===selected?' selected':''}>${escapeHtml(it.name)}</option>`).join('')}</select>`;
},
renderMasterCategoryChips(beforeEl){
const hasApi=typeof DatabaseAPI!=='undefined'&&DatabaseAPI.masterCategory&&typeof DatabaseAPI.masterCategory.getAll==='function';
if(!hasApi)return;
let row=document.getElementById('servisMasterCatChipRow');
if(!row){
row=document.createElement('div');
row.id='servisMasterCatChipRow';
row.className='u-flex u-fs12 u-mb10';
row.style.cssText='gap:8px;align-items:center;flex-wrap:wrap';
beforeEl.insertAdjacentElement('beforebegin',row);
}
const cats=DatabaseAPI.masterCategory.getAll()||[];
const selected=Servis.activeMasterCategoryFilter||'';
const options=[{id:'',label:'Semua kategori servis'}].concat(cats.map(c=>({id:c.id,label:(c.icon||'🔧')+' '+c.name}))).concat([{id:UNCATEGORIZED_FILTER_ID,label:'❔ Belum dikategorikan'}]);
row.innerHTML=`<label style="font-size:11px;color:var(--text2);font-weight:700;white-space:nowrap">Kategori</label><select class="fs" style="flex:1;min-width:220px;max-width:420px;padding:8px 10px" data-onchange="Servis.setMasterCategoryFilter" data-onchange-args='["$value"]'>${options.map(o=>`<option value="${escapeHtml(o.id)}"${String(o.id)===String(selected)?' selected':''}>${escapeHtml(o.label)}</option>`).join('')}</select>`;
},
populatePartSelect(selectedPartId){
const sel=document.getElementById('servisPartId');
if(!sel)return;
const list=D.partsStock.filter(p=>p.id===selectedPartId||Sparepart.isPartForVehicle(p,typeof curVehicleId!=='undefined'?curVehicleId:null));
const opts=list.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} (sisa ${p.qty}${p.unit?' '+p.unit:''})</option>`).join('');
sel.innerHTML='<option value="">Tidak pakai stok</option>'+opts;
sel.value=selectedPartId||'';
Servis.onPartChange();
},
onPartChange(){
const sel=document.getElementById('servisPartId');
const wrap=document.getElementById('servisPartQtyWrap');
if(!sel||!wrap)return;
wrap.style.display=sel.value?'block':'none';
},
populateCatalogPartSelect(selectedCatalogId){
const sel=document.getElementById('servisCatalogPartId');
if(!sel)return;
const hasCatalog=typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.getAll==='function';
if(!hasCatalog){
sel.innerHTML='<option value="">Tidak pakai part katalog</option>';
sel.value='';
Servis.onCatalogPartChange();
return;
}
VehicleCatalog.getAll().then(items=>{
const filtered=VehicleCatalog.filterForVehicle(items,typeof curVehicleId!=='undefined'?curVehicleId:null);
const list=(filtered||[]).some(it=>it.id===selectedCatalogId)||!selectedCatalogId?filtered:filtered.concat((items||[]).filter(it=>it.id===selectedCatalogId));
const opts=(list||[]).map(it=>`<option value="${escapeHtml(it.id)}" data-oem="${escapeHtml(it.oemCode||'')}" data-name="${escapeHtml(it.partName||'')}">${escapeHtml(it.partName||'(Tanpa nama)')}${it.oemCode?' — '+escapeHtml(it.oemCode):''}</option>`).join('');
sel.innerHTML='<option value="">Tidak pakai part katalog</option>'+opts;
sel.value=selectedCatalogId||'';
Servis.onCatalogPartChange();
}).catch(()=>{
sel.innerHTML='<option value="">Tidak pakai part katalog</option>';
sel.value='';
Servis.onCatalogPartChange();
});
},
onCatalogPartChange(){
const sel=document.getElementById('servisCatalogPartId');
const wrap=document.getElementById('servisCatalogPartQtyWrap');
if(!sel||!wrap)return;
wrap.style.display=sel.value?'block':'none';
},
renderCatalogRecommendations(){
const wrap=document.getElementById('servisCatalogRecoWrap');
const list=document.getElementById('servisCatalogRecoList');
if(!wrap||!list)return;
wrap.style.display='none';
list.innerHTML='';
const hasCatalog=typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.recommend==='function';
if(!hasCatalog)return;
const itemEl=document.getElementById('servisItem');
const item=itemEl?itemEl.value.trim():'';
VehicleCatalog.recommend({vehicleId:curVehicleId,item}).then(items=>{
if(!items||!items.length)return;
list.innerHTML=items.map(it=>`<button type="button" class="chip-btn" style="font-size:11px" data-action="Servis.selectCatalogRecommendation" data-args="${escapeHtml(JSON.stringify([it.id]))}">${escapeHtml(it.partName||'(Tanpa nama)')}${it.oemCode?' · '+escapeHtml(it.oemCode):''}</button>`).join('');
wrap.style.display='block';
}).catch(()=>{});
},
selectCatalogRecommendation(catalogId){
const sel=document.getElementById('servisCatalogPartId');
if(!sel)return;
const hasOption=Array.from(sel.options||[]).some(o=>o.value===String(catalogId));
if(!hasOption)return;
sel.value=String(catalogId);
Servis.onCatalogPartChange();
},
syncServiceChecklist(){
const box=document.getElementById('servisChecklistPanel');
if(!box||typeof ServisChecklist==='undefined')return;
const hasMultiState=Array.isArray(Servis._serviceChecklistMasterCategoryIds);
let ids=hasMultiState?Servis._serviceChecklistMasterCategoryIds.slice():[];
ids=ids.filter(id=>typeof id==='string'&&typeof ServisChecklist.findGroupByMasterCategoryId==='function'&&ServisChecklist.findGroupByMasterCategoryId(id));
if(!hasMultiState&&!ids.length){
  const selectedMasterId=(document.getElementById('servisCategory')?.value||'').trim();
  const item=(document.getElementById('servisItem')?.value||'').trim();
  const match=selectedMasterId&&typeof ServisChecklist.findGroupByMasterCategoryId==='function'?ServisChecklist.findGroupByMasterCategoryId(selectedMasterId):null;
  const fallback=match||(!selectedMasterId&&item&&ServisChecklist.findGroupForItem(item));
  if(fallback&&fallback.group&&fallback.group.masterCategoryId)ids=[fallback.group.masterCategoryId];
}
Servis._serviceChecklistMasterCategoryIds=ids;
const first=ids[0]&&ServisChecklist.findGroupByMasterCategoryId(ids[0]);
Servis._serviceChecklistGroupIdx=first?first.groupIdx:null;
Servis.renderServiceMasterCategoryChips();
Servis.renderServiceChecklist();
},
renderServiceMasterCategoryChips(){
const row=document.getElementById('servisMasterCategoryChips');
if(!row||typeof ServisChecklist==='undefined')return;
const hasApi=typeof DatabaseAPI!=='undefined'&&DatabaseAPI.masterCategory&&typeof DatabaseAPI.masterCategory.getAll==='function';
if(!hasApi){row.innerHTML='';return;}
const cats=(DatabaseAPI.masterCategory.getAll()||[]).filter(c=>c&&c.id&&ServisChecklist.findGroupByMasterCategoryId(c.id));
const selected=new Set(Servis._serviceChecklistMasterCategoryIds||[]);
row.innerHTML=`<div style="font-size:11px;color:var(--text2);font-weight:700;margin-bottom:7px">Kategori Servis <span style="font-weight:400">(pilih satu atau beberapa)</span></div><div style="display:flex;gap:6px;flex-wrap:wrap">${cats.map(c=>`<button type="button" class="chip ${selected.has(c.id)?'active':''}" data-action="Servis.toggleServiceChecklistMasterCategory" data-args="${escapeHtml(JSON.stringify([c.id]))}">${escapeHtml((c.icon||'🔧')+' '+c.name)}</button>`).join('')}</div><div style="font-size:11px;color:var(--text2);margin-top:7px">${selected.size?selected.size+' kategori aktif — checklist di bawah menampilkan semuanya.':'Belum ada kategori dipilih — pilih kategori untuk membuka checklist.'}</div>`;
},
toggleServiceChecklistMasterCategory(masterCategoryId){
if(typeof ServisChecklist==='undefined'||typeof ServisChecklist.findGroupByMasterCategoryId!=='function')return;
const id=String(masterCategoryId||'');
if(!id||!ServisChecklist.findGroupByMasterCategoryId(id))return;
const ids=Array.isArray(Servis._serviceChecklistMasterCategoryIds)?Servis._serviceChecklistMasterCategoryIds.slice():[];
const idx=ids.indexOf(id);
if(idx>=0)ids.splice(idx,1);else ids.push(id);
Servis._serviceChecklistMasterCategoryIds=ids;
const first=ids[0]&&ServisChecklist.findGroupByMasterCategoryId(ids[0]);
Servis._serviceChecklistGroupIdx=first?first.groupIdx:null;
const catEl=document.getElementById('servisCategory');
if(catEl)catEl.value=ids[0]||'';
const compEl=document.getElementById('servisComponent');
if(compEl)compEl.value='';
const actionEl=document.getElementById('servisActionType');
if(actionEl)actionEl.value='';
Servis.renderServiceMasterCategoryChips();
Servis.renderServiceChecklist();
},
setServiceChecklistGroup(groupIdx){
if(typeof ServisChecklist==='undefined')return;
const n=Number(groupIdx);
if(!Number.isInteger(n)||!ServisChecklist.group(n))return;
Servis._serviceChecklistGroupIdx=n;
Servis.renderServiceChecklist();
},
toggleServiceChecklistItem(groupIdx,itemIdx){
if(typeof ServisChecklist==='undefined')return;
ServisChecklist.toggleItem(Number(groupIdx),Number(itemIdx));
Servis.renderServiceChecklist();
},
setServiceChecklistAction(groupIdx,itemIdx,type){
if(typeof ServisChecklist==='undefined')return;
ServisChecklist.setActionType(Number(groupIdx),Number(itemIdx),type);
Servis.renderServiceChecklist();
},
setServiceChecklistCondition(groupIdx,itemIdx,result){
if(typeof ServisChecklist==='undefined')return;
ServisChecklist.setConditionResult(Number(groupIdx),Number(itemIdx),String(result||''));
Servis.renderServiceChecklist();
},
setServiceChecklistConditionNote(groupIdx,itemIdx,note){if(typeof ServisChecklist==='undefined')return;ServisChecklist.setConditionNote(Number(groupIdx),Number(itemIdx),String(note||''));},
setServiceChecklistNotApplicable(groupIdx,itemIdx,value){
if(typeof ServisChecklist==='undefined')return;
ServisChecklist.setNotApplicable(Number(groupIdx),Number(itemIdx),!!value);
Servis.renderServiceChecklist();
},
renderServiceChecklist(){
const box=document.getElementById('servisChecklistPanel');
if(!box||typeof ServisChecklist==='undefined')return;
const ids=Array.isArray(Servis._serviceChecklistMasterCategoryIds)?Servis._serviceChecklistMasterCategoryIds.slice():[];
const groups=ids.map(id=>ServisChecklist.findGroupByMasterCategoryId(id)).filter(Boolean);
if(!groups.length){box.innerHTML=`<div style="background:var(--surface3);border:1px dashed var(--border2);border-radius:12px;padding:12px;margin-bottom:12px;color:var(--text2);font-size:11px;line-height:1.6">☑️ Checklist Komponen Servis akan muncul setelah memilih kategori di atas. <b>Jenis Servis/Item</b> tetap tersedia untuk item non-standar.</div>`;return;}
const vehicleId=ServisChecklist._vehicleId||curVehicleId;
const cards=groups.map(found=>{
  const group=found.group,gi=found.groupIdx;
  const groupItems=ServisChecklist.itemsOfGroup(group);
  const rows=groupItems.map((it,ii)=>{
    const checked=ServisChecklist._checked[it.id]!==undefined;
    const notApplicable=ServisChecklist._notApplicable&&ServisChecklist._notApplicable[it.id]===true;
    const action=ServisChecklist._checked[it.id];
    const result=ServisChecklist._results&&ServisChecklist._results[it.id]||null;
    const valid=ServisChecklist._validActionTypesFor(it);
    let urgency=null,recommended=null,reason='';
    try{
      const cat=typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(it.name,vehicleId):null;
      if(cat&&typeof computeServiceUrgency==='function')urgency=computeServiceUrgency({vehicleId,cat});
      const rec=typeof recommendServiceAction==='function'?recommendServiceAction({item:it,cat,urgency,conditionResult:result}):null;
      if(rec&&valid.includes(rec.action)){recommended=rec.action;reason=typeof formatServiceRecommendationReason==='function'?formatServiceRecommendationReason({recommendation:rec,urgency}):rec.reason;}
    }catch(_e){console.warn('Service checklist recommendation render failed',_e);}
    const recommendationHtml=recommended&&!checked?`<div class="u-fs11 u-cacc" style="margin-top:4px">💡 Rekomendasi: <b>${recommended==='periksa'?'Periksa':recommended==='bersih'?'Bersihkan':'Ganti'}</b>${reason?`<div class="u-fs10 u-t2" style="margin-top:2px">${escapeHtml(reason)}</div>`:''}</div>`:'';
    const actionButtons=checked&&valid.length>1?valid.map(v=>`<button type="button" class="btn btn-ghost btn-sm ${action===v?'active':''}" data-action="Servis.setServiceChecklistAction" data-args="${escapeHtml(JSON.stringify([gi,ii,v]))}">${v==='periksa'?'🔍 Periksa':v==='bersih'?'🧹 Bersih':'🔧 Ganti'}</button>`).join(''):'';
    const resultHtml=checked?`<div style="margin-top:6px"><div class="u-fs10 u-t2" style="margin-bottom:4px">Hasil pemeriksaan (opsional)</div><div style="display:flex;gap:5px;flex-wrap:wrap">${(typeof SERVICE_CONDITION_RESULTS!=='undefined'?SERVICE_CONDITION_RESULTS:[]).map(r=>`<button type="button" class="btn btn-ghost btn-sm ${result===r.id?'active':''}" data-action="Servis.setServiceChecklistCondition" data-args="${escapeHtml(JSON.stringify([gi,ii,r.id]))}">${r.icon} ${escapeHtml(r.label)}</button>`).join('')}</div></div>`:'';
    const conditionNote=checked?`<input type="text" class="fi" style="margin-top:6px;font-size:11px" value="${escapeHtml(ServisChecklist._conditionNotes&&ServisChecklist._conditionNotes[it.id]||'')}" placeholder="Catatan kondisi komponen (opsional)" data-oninput="Servis.setServiceChecklistConditionNote" data-oninput-args="${escapeHtml(JSON.stringify([gi,ii]))}">`:'';
    const naButton=`<button type="button" class="btn btn-ghost btn-sm" data-action="Servis.setServiceChecklistNotApplicable" data-args="${escapeHtml(JSON.stringify([gi,ii,!notApplicable]))}">${notApplicable?'↩️ Berlaku':'⊘ Tidak berlaku'}</button>`;
    const linkedCat=it.linkCat===true;
    const resolvedCat=linkedCat&&typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(it.name,ServisChecklist._vehicleId||curVehicleId):null;
    const missingCatBadge=linkedCat&&!resolvedCat?`<span class="sc-cat-warning" title="Kategori sparepart belum tersedia untuk kendaraan ini">⚠️ kategori belum ada</span>`:'';
    return `<div style="display:flex;gap:8px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--border2);opacity:${notApplicable?'.55':'1'}"><button type="button" class="btn ${checked?'btn-primary':'btn-ghost'} btn-sm" style="min-width:72px" data-action="Servis.toggleServiceChecklistItem" data-args="${escapeHtml(JSON.stringify([gi,ii]))}" ${notApplicable?'disabled':''}>${checked?'✓ Selesai':notApplicable?'⊘ Tidak berlaku':'○ Cek'}</button><div style="flex:1;min-width:0"><div class="u-fw700 u-fs12">${escapeHtml(it.name)} ${missingCatBadge}</div><div class="u-fs11 u-t2">${escapeHtml(it.intervalLabel||'Tanpa interval rutin')}</div>${recommendationHtml}${checked&&action?`<div class="u-fs11 u-cacc">Tindakan: ${escapeHtml(action)}</div>`:''}${resultHtml}${conditionNote}${checked&&reason?`<div class="u-fs10 u-t2" style="margin-top:3px">💡 ${escapeHtml(reason)}</div>`:''}${actionButtons?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${actionButtons}</div>`:''}<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${naButton}</div></div></div>`;
  }).join('');
  return `<details class="sc-group" open style="background:var(--surface3);border:1px solid var(--border2);border-radius:12px;padding:0 12px;margin-bottom:10px"><summary style="cursor:pointer;padding:12px 0;font-weight:700;display:flex;justify-content:space-between;gap:8px"><span>${escapeHtml(group.group)}</span><span class="chip active">${ServisChecklist.checkedCount(gi)}/${groupItems.length}</span></summary><div style="padding-bottom:4px"><div style="font-size:11px;color:var(--text2);margin-bottom:6px">Centang yang benar-benar dikerjakan. Rekomendasi hanya saran; tindakan dan hasil tetap dapat diubah manual.</div>${rows}</div></details>`;
}).join('');
const checked=Object.keys(ServisChecklist._checked||{}).length;
const na=Object.keys(ServisChecklist._notApplicable||{}).length;
const total=groups.reduce((n,g)=>n+ServisChecklist.itemsOfGroup(g.group).length,0);
box.innerHTML=`<div style="margin-bottom:8px"><div class="u-fw700 u-fs12">☑️ Checklist Komponen Servis</div><div class="u-fs11 u-t2">${groups.length} kategori aktif · ${checked}/${total} dikerjakan${na?` · ${na} tidak berlaku`:''}. Manual override tersedia.</div></div>${cards}`;
},
_serviceActionTypesForCurrentComponent(){
const compId=document.getElementById('servisComponent')?.value||'';
const hit=typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.itemById==='function'?ServiceInputCatalog.itemById(compId):null;
if(hit&&hit.item&&typeof ServisChecklist!=='undefined'&&typeof ServisChecklist._validActionTypesFor==='function'){
  return ServisChecklist._validActionTypesFor(hit.item);
}
// Free-text/non-standard service items remain fully manual.
return ['periksa','bersih','ganti'];
},
syncServiceActionType(selected){
const wrap=document.getElementById('servisActionTypeWrap');
const sel=document.getElementById('servisActionType');
const hint=document.getElementById('servisActionTypeHint');
if(!wrap||!sel)return;
const types=Servis._serviceActionTypesForCurrentComponent();
let recommended=null;
try{
  const compId=document.getElementById('servisComponent')?.value||'';
  const hit=typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.itemById==='function'?ServiceInputCatalog.itemById(compId):null;
  const cat=hit&&hit.item&&typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(hit.item.name,curVehicleId):null;
  if(cat&&typeof computeServiceUrgency==='function'){
    const u=computeServiceUrgency({vehicleId:curVehicleId,cat});
    const cond=document.getElementById('servisConditionResult')?.value||null;
    const rec=typeof recommendServiceAction==='function'?recommendServiceAction({item:hit.item,cat,urgency:u,conditionResult:cond}):null;
    if(rec&&types.includes(rec.action))recommended=rec.action; else if(u&&types.includes(u.nextAction))recommended=u.nextAction;
  }
}catch(_e){console.warn('Service action recommendation lookup failed',_e);}
const wanted=selected||sel.value||recommended||types[0];
sel.innerHTML=types.map(t=>`<option value="${t}">${t==='periksa'?'🔍 Cek/Periksa':t==='bersih'?'🧹 Bersih':'🔧 Ganti'}</option>`).join('');
sel.value=types.includes(wanted)?wanted:types[0];
wrap.style.display='block';
if(hint){ const cond=document.getElementById('servisConditionResult')?.value||null; hint.textContent=recommended ? `💡 Rekomendasi: ${recommended==='periksa'?'Periksa':recommended==='bersih'?'Bersihkan':'Ganti'} — Anda tetap bisa mengganti tindakan secara manual.${cond&&typeof serviceConditionLabel==='function'?` Hasil terakhir: ${serviceConditionLabel(cond)}.`:''}` : 'Pilih tindakan aktual secara manual.'; }
},
onServiceActionTypeChange(){},
onServiceConditionResultChange(){Servis.syncServiceActionType(document.getElementById('servisActionType')?.value||'');},
onServiceCategoryChange(){
if(typeof ServiceInputCatalog==='undefined')return;
ServiceInputCatalog.onCategoryChange(document.getElementById('servisCategory'),document.getElementById('servisComponent'),document.getElementById('servisItem'));
Servis.syncServiceActionType();
Servis.onItemAutofillInterval();
},
onServiceComponentChange(){
if(typeof ServiceInputCatalog==='undefined')return;
ServiceInputCatalog.onComponentChange(document.getElementById('servisComponent'),document.getElementById('servisCategory'),document.getElementById('servisItem'));
Servis.syncServiceActionType();
Servis.onItemAutofillInterval();
},
renderServiceInputSelectors(selectedMasterId,selectedComponentId,selectedActionType){
if(typeof ServiceInputCatalog==='undefined')return;
const catEl=document.getElementById('servisCategory');
const compEl=document.getElementById('servisComponent');
const itemEl=document.getElementById('servisItem');
if(catEl)catEl.value='';
if(compEl)compEl.value='';
ServiceInputCatalog.populateCategorySelect(catEl,selectedMasterId||'');
const master=selectedMasterId||catEl&&catEl.value||'';
ServiceInputCatalog.populateComponentSelect(compEl,master,selectedComponentId||'');
if(itemEl&&itemEl.value)ServiceInputCatalog.sync(catEl,compEl,itemEl);
Servis.syncServiceActionType(selectedActionType||'ganti');
},
onItemAutofillInterval(){
const item=document.getElementById('servisItem').value.trim();
const intervalEl=document.getElementById('servisInterval');
if(intervalEl&&intervalEl.dataset.manual!=='1'){
const matched=item?(typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(item,curVehicleId):D.sparepartCats.find(c=>c.name.toLowerCase()===item.toLowerCase())):null;
intervalEl.value=matched?matched.intervalKm:'';
}
Servis.tryAutoLinkCatalogPart(item);
Servis.renderCatalogRecommendations();
Servis.syncServiceChecklist();
},
onItemInputSuggest(){
const el=document.getElementById('servisItem');
const box=document.getElementById('servisItemSuggestBox');
if(!el||!box)return;
const q=el.value.trim().toLowerCase();
const namesRaw=(typeof Sparepart!=='undefined'&&Sparepart.getItemSuggestions)?Sparepart.getItemSuggestions():[];
const names=Array.isArray(namesRaw)?namesRaw:[];
const matches=(q?names.filter(n=>String(n).toLowerCase().includes(q)):names).slice(0,8);
if(!matches.length){box.style.display='none';box.innerHTML='';return;}
box.innerHTML=matches.map((n,i)=>`<div class="suggest-item" data-suggest-index="${i}">${escapeHtml(n)}</div>`).join('');
Array.from(box.querySelectorAll('[data-suggest-index]')).forEach(node=>{
  node.addEventListener('mousedown',event=>{
    event.preventDefault();
    const index=Number(node.dataset.suggestIndex);
    if(Number.isInteger(index)&&index>=0&&index<matches.length)Servis.selectItemSuggestion(matches[index]);
  });
});
box.style.display='block';
},
selectItemSuggestion(name){
const el=document.getElementById('servisItem');
if(el)el.value=name;
if(typeof hideSuggestBox==='function')hideSuggestBox('servisItemSuggestBox');
Servis.onItemAutofillInterval();
},
tryAutoLinkCatalogPart(item){
const sel=document.getElementById('servisCatalogPartId');
Servis.dismissPartialCatalogMatch();
if(!sel||!item)return;
if(sel.value)return;
const target=item.toLowerCase();
const opts=Array.from(sel.options||[]).filter(o=>o.value);
const exact=opts.filter(o=>(o.dataset.name||'').toLowerCase()===target);
if(exact.length===1){
sel.value=exact[0].value;
Servis.onCatalogPartChange();
return;
}
if(exact.length>1)return;
const partial=opts.filter(o=>{
const name=(o.dataset.name||'').toLowerCase();
if(!name)return false;
return name.includes(target)||target.includes(name);
});
if(partial.length)Servis.renderPartialCatalogMatch(partial);
},
renderPartialCatalogMatch(matches){
const wrap=document.getElementById('servisCatalogPartialWrap');
const list=document.getElementById('servisCatalogPartialList');
if(!wrap||!list)return;
list.innerHTML=matches.map(o=>`<button type="button" class="chip-btn" style="font-size:11px" data-action="Servis.confirmPartialCatalogMatch" data-args="${escapeHtml(JSON.stringify([o.value]))}">${escapeHtml(o.dataset.name||'(Tanpa nama)')}${o.dataset.oem?' · '+escapeHtml(o.dataset.oem):''}</button>`).join('');
wrap.classList.remove('u-dnone');
wrap.style.display='block';
},

confirmPartialCatalogMatch(catalogId){
const sel=document.getElementById('servisCatalogPartId');
if(!sel)return;
const hasOption=Array.from(sel.options||[]).some(o=>o.value===String(catalogId));
if(!hasOption)return;
sel.value=String(catalogId);
Servis.onCatalogPartChange();
Servis.dismissPartialCatalogMatch();
},

dismissPartialCatalogMatch(){
const wrap=document.getElementById('servisCatalogPartialWrap');
const list=document.getElementById('servisCatalogPartialList');
if(list)list.innerHTML='';
if(wrap){wrap.classList.add('u-dnone');wrap.style.display='none';}
},
openModal(editId,prefillItem){
Sparepart.populateDatalist();
Servis.editId=(typeof editId!=='undefined')?editId:null;
Servis._editTab='detail';
Servis._serviceChecklistGroupIdx=null;
Servis._serviceChecklistMasterCategoryIds=[];
if(typeof ServisChecklist!=='undefined')ServisChecklist.open(curVehicleId);
const isEdit=Servis.editId!==null;
document.getElementById('servisModalTitle').textContent=isEdit?'Edit Catatan Servis':'Catat Servis/Sparepart';
document.getElementById('servisDelBtn').style.display=isEdit?'flex':'none';
const conditionResultEl=document.getElementById('servisConditionResult'); if(conditionResultEl)conditionResultEl.value=''; const conditionNoteEl=document.getElementById('servisConditionNote'); if(conditionNoteEl)conditionNoteEl.value='';
const servisAccEl=document.getElementById('servisAcc');
if(servisAccEl) servisAccEl.innerHTML=D.accounts.map(a=>`<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
const intervalEl=document.getElementById('servisInterval');
if(intervalEl)intervalEl.dataset.manual='0';
Servis.dismissPartialCatalogMatch();
if(isEdit){
const s=D.servisLogs.find(x=>x.id===Servis.editId);
if(!s)return;
if(typeof ServisChecklist!=='undefined'){ ServisChecklist.open(s.vehicleId||curVehicleId); ServisChecklist.loadFromLog(s); Servis._serviceChecklistGroupIdx=ServisChecklist.firstCheckedGroup(); const legacyIds=s.masterCategoryId?[s.masterCategoryId]:[]; const payloadIds=(s.checklist||[]).map(r=>r&&r.masterCategoryId).filter(Boolean); const componentHit=s.serviceComponentId&&typeof ServiceInputCatalog!=='undefined'?ServiceInputCatalog.itemById(s.serviceComponentId):null; const inferredGroup=componentHit&&componentHit.group?componentHit.group.masterCategoryId:null; Servis._serviceChecklistMasterCategoryIds=[...new Set(legacyIds.concat(payloadIds).concat(inferredGroup?[inferredGroup]:[]))].filter(id=>ServisChecklist.findGroupByMasterCategoryId(id)); Servis._serviceChecklistGroupIdx=Servis._serviceChecklistMasterCategoryIds.length?ServisChecklist.findGroupByMasterCategoryId(Servis._serviceChecklistMasterCategoryIds[0]).groupIdx:null; }
document.getElementById('servisDate').value=s.date;
document.getElementById('servisItem').value=s.item;
Servis.renderServiceInputSelectors(s.masterCategoryId||'',s.serviceComponentId||'',s.actionType||'ganti');
document.getElementById('servisKm').value=s.km||'';
document.getElementById('servisCost').value=s.cost;
document.getElementById('servisNote').value=s.note||'';
const _condEl=document.getElementById('servisConditionResult'); if(_condEl)_condEl.value=(s.conditionResult||''); const _condNoteEl=document.getElementById('servisConditionNote'); if(_condNoteEl)_condNoteEl.value=(s.conditionNote||'');
Servis.syncServiceActionType(s.actionType||'ganti');
if(servisAccEl&&s.accountId)servisAccEl.value=s.accountId;
Servis.populatePartSelect(s.usedPartId);
document.getElementById('servisPartQty').value=s.usedPartQty||1;
const catalogRefs=(typeof VehicleCatalogServisLink!=='undefined'&&VehicleCatalogServisLink&&typeof VehicleCatalogServisLink.getServisRefs==='function')?VehicleCatalogServisLink.getServisRefs(s.id):[];
const firstCatalogRef=catalogRefs&&catalogRefs[0];
Servis.populateCatalogPartSelect(firstCatalogRef?firstCatalogRef.catalogId:'');
document.getElementById('servisCatalogPartQty').value=firstCatalogRef?firstCatalogRef.qty:1;
Servis.renderCatalogRecommendations();

const linkedCat=(()=>{const vehicleId=s.vehicleId||curVehicleId;const preferred=s.categoryId&&D.sparepartCats.find(c=>c&&c.id===s.categoryId&&(!c.vehicleId||c.vehicleId===vehicleId));return preferred||(typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(s.item,vehicleId):D.sparepartCats.find(c=>!c.vehicleId&&c.name.toLowerCase()===s.item.toLowerCase()));})();
if(intervalEl)intervalEl.value=linkedCat?linkedCat.intervalKm:'';
Servis._photoDraft=(s.foto||[]).slice();
Servis._renderPhotoThumbs();
const editTabs=document.getElementById('servisEditTabs');
if(editTabs)editTabs.style.display='flex';
Servis.setEditTab('detail');
} else {
if(typeof ServisChecklist!=='undefined'){ ServisChecklist.open(curVehicleId); Servis._serviceChecklistMasterCategoryIds=[]; Servis._serviceChecklistGroupIdx=null; }
document.getElementById('servisDate').value=new Date().toISOString().split('T')[0];
['servisItem','servisCost','servisNote'].forEach(id=>document.getElementById(id).value='');
Servis.renderServiceInputSelectors();
document.getElementById('servisKm').value=getVehicleKm(curVehicleId)||'';
if(intervalEl)intervalEl.value='';
Servis.populatePartSelect('');
document.getElementById('servisPartQty').value=1;
Servis.populateCatalogPartSelect('');
document.getElementById('servisCatalogPartQty').value=1;
Servis._photoDraft=[];
Servis._renderPhotoThumbs();
if(prefillItem){
document.getElementById('servisItem').value=prefillItem;
Servis.onItemAutofillInterval();
const vehicleIdPrefill=curVehicleId;
const visibleStock=(D.partsStock||[]).filter(p=>{
  if(!(p&&p.name))return false;
  if(typeof Sparepart!=='undefined'&&typeof Sparepart.isPartForVehicle==='function')return Sparepart.isPartForVehicle(p,vehicleIdPrefill);
  return !p.vehicleId||String(p.vehicleId)===String(vehicleIdPrefill);
});
const matchStock=visibleStock.find(p=>p.name.toLowerCase()===prefillItem.toLowerCase()||p.name.toLowerCase().includes(prefillItem.toLowerCase())||prefillItem.toLowerCase().includes(p.name.toLowerCase()));
if(matchStock)Servis.populatePartSelect(matchStock.id);
} else {
Servis.renderCatalogRecommendations();
}
}
if(Servis.editId===null){
const editTabs=document.getElementById('servisEditTabs');
if(editTabs)editTabs.style.display='none';
const detail=document.getElementById('servisDetailPanel');
const reminder=document.getElementById('servisReminderPanel');
if(detail)detail.style.display='';
if(reminder){reminder.style.display='none';reminder.innerHTML='';}
}
Servis._renderKmEditHint(isEdit);
if(typeof ServisChecklist!=='undefined'&&typeof Servis.syncServiceChecklist==='function')Servis.syncServiceChecklist();
openModal('servisModal');
},

_renderKmEditHint(isEdit){
const kmInput=document.getElementById('servisKm');
if(!kmInput)return;
let hint=document.getElementById('servisKmEditHint');
if(!hint){
hint=document.createElement('div');
hint.id='servisKmEditHint';
hint.style.cssText='font-size:11px;color:var(--text2);margin-top:4px;line-height:1.5';
kmInput.insertAdjacentElement('afterend',hint);
}
hint.style.display=isEdit?'block':'none';
hint.textContent=isEdit?'✏️ Mode edit: KM boleh dikoreksi lebih rendah dari servis sebelumnya (tetap tidak boleh melebihi odometer kendaraan sekarang atau servis sesudahnya).':'';
},
revertStockUsage(partId,qty){
const n=Number(qty);
if(!partId||!Number.isFinite(n)||n<=0)return;
const p=D.partsStock.find(x=>x.id===partId);
if(p)p.qty=(Number(p.qty)||0)+n;
},

async applyStockUsages(entries){
const net=new Map();
(Array.isArray(entries)?entries:[]).forEach(e=>{
  const id=e&&e.partId;
  const qty=Number(e&&e.qty);
  if(!id||!Number.isFinite(qty)||qty<=0)return;
  net.set(id,(net.get(id)||0)+qty);
});

const before=new Map();
for(const [id] of net){
  const p=D.partsStock.find(x=>x.id===id);
  if(p)before.set(id,Number(p.qty)||0);
}
for(const [id,qty] of net){
  if(!await Servis.applyStockUsage(id,qty)){
    for(const [restoreId,restoreQty] of before){
      const p=D.partsStock.find(x=>x.id===restoreId);
      if(p)p.qty=restoreQty;
    }
    return false;
  }
}
return true;
},

async replaceStockUsages(oldEntries,newEntries){
const net=new Map();
const add=(entries,sign)=>{
  (Array.isArray(entries)?entries:[]).forEach(e=>{
    const id=e&&e.partId;
    const qty=Number(e&&e.qty);
    if(!id||!Number.isFinite(qty)||qty<=0)return;
    net.set(id,(net.get(id)||0)+(sign*qty));
  });
};
add(oldEntries,-1); add(newEntries,1);
const before=new Map();
for(const [id] of net){
  const p=D.partsStock.find(x=>x.id===id);
  if(p)before.set(id,Number(p.qty)||0);
}
for(const [id,delta] of net){
  if(delta>0){
    if(!await Servis.applyStockUsage(id,delta)){
      for(const [restoreId,restoreQty] of before){
        const p=D.partsStock.find(x=>x.id===restoreId);
        if(p)p.qty=restoreQty;
      }
      return false;
    }
  }else if(delta<0){
    Servis.revertStockUsage(id,-delta);
  }
}
return true;
},

findMatchingStockByCatalogId(catalogId,vehicleId){
if(!catalogId)return null;
const rows=(D.partsStock||[]).filter(p=>p&&String(p.catalogPartId||p.catalogId||'')===String(catalogId));
if(!rows.length)return null;
const scoped=rows.filter(p=>{
  if(!vehicleId)return true;
  if(typeof Sparepart!=='undefined'&&typeof Sparepart.isPartForVehicle==='function')return Sparepart.isPartForVehicle(p,vehicleId);
  return !p.vehicleId||p.vehicleId===vehicleId;
});
if(scoped.length===1)return scoped[0];
if(scoped.length>1){
  const exact=scoped.find(p=>p.vehicleId&&String(p.vehicleId)===String(vehicleId));
  return exact||null;
}
return null;
},

findMatchingStockByName(name,vehicleId){
const n=(name||'').trim().toLowerCase();
if(!n)return null;
const rows=(D.partsStock||[]).filter(p=>p&&String(p.name||'').trim().toLowerCase()===n);
if(!rows.length)return null;
const scoped=rows.filter(p=>{
  if(!vehicleId)return true;
  if(typeof Sparepart!=='undefined'&&typeof Sparepart.isPartForVehicle==='function')return Sparepart.isPartForVehicle(p,vehicleId);
  return !p.vehicleId||p.vehicleId===vehicleId;
});
if(scoped.length===1)return scoped[0];
if(scoped.length>1){
  const exact=scoped.find(p=>p.vehicleId&&String(p.vehicleId)===String(vehicleId));
  return exact||null;
}
return null;
},
async applyStockUsage(partId,qty){
if(!partId||!qty)return true;
const p=D.partsStock.find(x=>x.id===partId);
if(!p)return true;
if(p.qty<qty){
if(!await askConfirm(`⚠️ Stok "${escapeHtml(p.name)}" cuma sisa ${p.qty}${p.unit?' '+p.unit:''}, dipakai ${qty}. Tetap lanjut & stok jadi minus?`,{danger:false,okText:'Ya, Lanjut'}))return false;
}
p.qty=(p.qty||0)-qty;
return true;
},

pickPhoto(){
const el=document.getElementById('servisPhotoInput');
if(el)el.click();
},
addPhoto(event){
const files=event&&event.target&&event.target.files?Array.from(event.target.files):[];
if(event&&event.target)event.target.value='';
if(!files.length)return;
const MAX_PHOTOS=5;
const MAX_BYTES=5*1024*1024;
files.forEach(file=>{
if(!file||!file.type||!file.type.startsWith('image/')){toast('⚠️ File bukan gambar, dilewati');return;}
if(file.size>MAX_BYTES){toast(`⚠️ "${file.name}" terlalu besar (maks 5MB), dilewati`);return;}
if(Servis._photoDraft.length>=MAX_PHOTOS){toast(`⚠️ Maksimal ${MAX_PHOTOS} foto per catatan servis`);return;}
const reader=new FileReader();
reader.onload=()=>{
if(typeof reader.result==='string')Servis._photoDraft.push(reader.result);
Servis._renderPhotoThumbs();
};
reader.readAsDataURL(file);
});
},
removePhoto(idx){
Servis._photoDraft.splice(idx,1);
Servis._renderPhotoThumbs();
},
_renderPhotoThumbs(){
const wrap=document.getElementById('servisPhotoThumbs');
if(!wrap)return;
wrap.innerHTML=Servis._photoDraft.map((src,i)=>`<div style="position:relative;width:64px;height:64px"><img src="${escapeHtml(src)}" style="width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--border2)"><button type="button" class="touch-target-remove-photo" data-action="Servis.removePhoto" data-args='[${i}]' aria-label="Hapus foto" style="position:absolute;top:-6px;right:-6px">✕</button></div>`).join('');
},
_closePhotoLightbox(){
const box=document.getElementById('servisPhotoLightbox');
if(!box)return;
box.remove();
if(Servis._photoLightboxKeyHandler)document.removeEventListener('keydown',Servis._photoLightboxKeyHandler);
Servis._photoLightboxKeyHandler=null;
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
openHistoryPhoto(logId,index=0){
const log=(D.servisLogs||[]).find((s)=>String(s.id)===String(logId));
const src=log&&Array.isArray(log.foto)?log.foto[Number(index)||0]:null;
return Servis.openPhotoLightbox(typeof src==='string'?src:'','Foto servis');
},
save(){return withSaveGuardAsync('servis','servisModal',()=>{
  const _originalService=Servis.editId&&Array.isArray(D.servisLogs)?D.servisLogs.find(x=>x&&x.id===Servis.editId):null;
  const _clone=(v)=>{
    if(v==null)return v;
    try{if(typeof structuredClone==='function')return structuredClone(v);}catch(_e){/* structuredClone tidak tersedia/gagal; fallback JSON di bawah. */}
    try{return JSON.parse(JSON.stringify(v));}catch(_e){return v;}
  };
  const _originalTx=_originalService&&_originalService.txLinkId&&Array.isArray(D.transactions)?D.transactions.find(t=>t&&t.id===_originalService.txLinkId):null;
  const _stockIds=new Set();
  if(_originalService){[_originalService.usedPartId,_originalService.catalogPartLinkedStockId,_originalService.autoGantiStockId].filter(Boolean).forEach(id=>_stockIds.add(id));}
  const _stockBefore=new Map();
  for(const id of _stockIds){const row=Array.isArray(D.partsStock)?D.partsStock.find(x=>x&&x.id===id):null;if(row)_stockBefore.set(id,Number(row.qty)||0);}
  const _catBefore=_originalService&&_originalService.categoryId&&Array.isArray(D.sparepartCats)?D.sparepartCats.find(c=>c&&c.id===_originalService.categoryId):null;
  const snapshot={service:_clone(_originalService),tx:_clone(_originalTx),stock:_stockBefore,cat:_clone(_catBefore)};
  const restore=()=>{
    try{
      if(snapshot.service){
        const cur=(D.servisLogs||[]).find(x=>x&&x.id===snapshot.service.id);
        if(cur)Object.assign(cur,_clone(snapshot.service));else D.servisLogs.push(_clone(snapshot.service));
      }
      if(snapshot.tx){
        const cur=(D.transactions||[]).find(x=>x&&x.id===snapshot.tx.id);
        if(cur)Object.assign(cur,_clone(snapshot.tx));else D.transactions.push(_clone(snapshot.tx));
      }else if(snapshot.service&&snapshot.service.id){
        D.transactions=(D.transactions||[]).filter(t=>!(t&&t.servisLinkId===snapshot.service.id));
      }
      for(const [id,qty] of snapshot.stock){const row=(D.partsStock||[]).find(x=>x&&x.id===id);if(row)row.qty=qty;}
      if(snapshot.cat){const cur=(D.sparepartCats||[]).find(x=>x&&x.id===snapshot.cat.id);if(cur)Object.assign(cur,_clone(snapshot.cat));}
      return true;
    }catch(e){console.error('P16: service rollback failed',e);return false;}
  };
  const run=async()=>{
    try{return await Servis._saveInner();}
    catch(err){restore();throw err;}
  };
  return typeof withServiceMutationLock==='function'?withServiceMutationLock(run):run();
});},

validateServiceOdometer({vehicleId,km,date,excludeId}={}){
  const n=Number(km);
  if(!Number.isFinite(n)||n<0)return{ok:false,code:'invalid_km',message:'KM servis harus berupa angka 0 atau lebih.'};
  const d=String(date||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||Number.isNaN(Date.parse(d+'T00:00:00')))return{ok:false,code:'invalid_date',message:'Tanggal servis tidak valid.'};
  const logs=Array.isArray(D.servisLogs)?D.servisLogs.filter(s=>s&&s.vehicleId===vehicleId&&s.id!==excludeId&&Number.isFinite(Number(s.km))&&Number(s.km)>=0):[];
  const current=typeof getVehicleKm==='function'?Number(getVehicleKm(vehicleId)):NaN;
  if(Number.isFinite(current)&&current>=0&&n>current)return{ok:false,code:'above_current_odometer',message:`KM servis (${n.toLocaleString('id-ID')}) melebihi odometer kendaraan saat ini (${current.toLocaleString('id-ID')}).`};
  const target={id:excludeId||'__service_validation_target__',vehicleId,km:n,date:d};
  const ordered=logs.slice().sort((a,b)=>{
    if(typeof compareServiceHistoryRecency==='function')return -compareServiceHistoryRecency(a,b);
    return String(a.date||'').localeCompare(String(b.date||''))||Number(a.km||0)-Number(b.km||0);
  });
  let prev=null,next=null;
  for(const row of ordered){
    if(typeof compareServiceHistoryRecency==='function'){
      const rel=compareServiceHistoryRecency(row,target);
      if(rel>0){next=row;break;}
      if(rel<0)prev=row;
    }else{
      const rd=String(row.date||'');
      if(rd<d||(rd===d&&Number(row.km||0)<=n))prev=row;
      else if(rd>d||(rd===d&&Number(row.km||0)>n)){next=row;break;}
    }
  }

  if(prev&&n<Number(prev.km)&&!excludeId)return{ok:false,code:'below_previous_service',message:`KM servis (${n.toLocaleString('id-ID')}) lebih rendah dari servis sebelumnya (${Number(prev.km).toLocaleString('id-ID')} km pada ${prev.date}).`};
  if(next&&n>Number(next.km))return{ok:false,code:'above_next_service',message:`KM servis (${n.toLocaleString('id-ID')}) lebih tinggi dari servis sesudahnya (${Number(next.km).toLocaleString('id-ID')} km pada ${next.date}).`};
  return{ok:true,currentKm:Number.isFinite(current)?current:null,previousKm:prev?Number(prev.km):null,nextKm:next?Number(next.km):null};
},

async _saveInner(){
const item=document.getElementById('servisItem').value.trim();
const actionTypeEl=document.getElementById('servisActionType');
const actionType=actionTypeEl&&['periksa','bersih','ganti'].includes(actionTypeEl.value)?actionTypeEl.value:'ganti';
const conditionResultEl=document.getElementById('servisConditionResult'); const conditionResult=conditionResultEl&&typeof validServiceCondition==='function'&&validServiceCondition(conditionResultEl.value)?conditionResultEl.value:null; const conditionNote=String(document.getElementById('servisConditionNote')?.value||'').trim().slice(0,500);

const costRaw=document.getElementById('servisCost').value.trim();
const cost=costRaw===''?0:Number(costRaw);
if(!Number.isFinite(cost)||cost<0){toast('⚠️ Cek Biaya, harus 0 atau lebih');return;}

let matched=typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(item,curVehicleId):D.sparepartCats.find(c=>c.name.toLowerCase()===item.toLowerCase());
let masterCategoryId=document.getElementById('servisCategory')?.value||null;
let serviceComponentId=document.getElementById('servisComponent')?.value||null;
if(typeof resolveServiceCategoryComponent==='function'){const svcLink=resolveServiceCategoryComponent(masterCategoryId,serviceComponentId,item);masterCategoryId=svcLink.masterCategoryId;serviceComponentId=svcLink.serviceComponentId;}
const note=document.getElementById('servisNote').value;
const accId=document.getElementById('servisAcc')?document.getElementById('servisAcc').value:D.accounts[0]?.id;
const kmRaw=document.getElementById('servisKm').value.trim();
const km=kmRaw===''?null:Number(kmRaw);
const date=document.getElementById('servisDate').value;

const existingService=Servis.editId
  ? (Array.isArray(D.servisLogs)?D.servisLogs.find(s=>s&&s.id===Servis.editId):null)
  : null;
const originalKm=existingService&&existingService.km!==null&&existingService.km!==undefined&&existingService.km!==''
  ? Number(existingService.km) : null;
const originalDate=existingService?String(existingService.date||''):'';
const kmChanged=!existingService || originalKm!==(km===null?null:Number(km));
const dateChanged=!existingService || originalDate!==String(date||'');
const shouldValidateOdometer=!Servis.editId||kmChanged||dateChanged;
const odometerCheck=!shouldValidateOdometer||km===null
  ? {ok:true,skipped:!shouldValidateOdometer?'category-only-edit':undefined}
  : Servis.validateServiceOdometer({vehicleId:curVehicleId,km,date,excludeId:Servis.editId});
if(!odometerCheck.ok){toast('⚠️ '+odometerCheck.message);return;}
const intervalRaw=document.getElementById('servisInterval')?document.getElementById('servisInterval').value:'';
const intervalKm=intervalRaw?parseFloat(intervalRaw):null;
const veh=D.vehicles.find(v=>v.id===curVehicleId);
const noteFull=item+(veh?' - '+veh.name:'')+(note?' - '+note:'');
const usedPartId=document.getElementById('servisPartId')?document.getElementById('servisPartId').value:'';
const usedPartQty=usedPartId?(parseFloat(document.getElementById('servisPartQty').value)||0):0;
const catalogPartSelEl=document.getElementById('servisCatalogPartId');
const catalogPartId=catalogPartSelEl?catalogPartSelEl.value:'';
const catalogPartQty=catalogPartId?(parseFloat(document.getElementById('servisCatalogPartQty').value)||1):0;

const catalogPartOemCode=(catalogPartId&&catalogPartSelEl&&catalogPartSelEl.selectedOptions&&catalogPartSelEl.selectedOptions[0]&&catalogPartSelEl.selectedOptions[0].dataset)?(catalogPartSelEl.selectedOptions[0].dataset.oem||''):'';
const catalogPartName=(catalogPartId&&catalogPartSelEl&&catalogPartSelEl.selectedOptions&&catalogPartSelEl.selectedOptions[0]&&catalogPartSelEl.selectedOptions[0].dataset)?(catalogPartSelEl.selectedOptions[0].dataset.name||''):'';

const catalogStockMatch=catalogPartId?(Servis.findMatchingStockByCatalogId(catalogPartId,curVehicleId)||Servis.findMatchingStockByName(catalogPartName,curVehicleId)):null;
const catalogLinkedStockId=catalogStockMatch?catalogStockMatch.id:null;
const itemIsVehicleName=!!matchingVehicleName(item);

let catIdForLog=matched?matched.id:null;
if(Servis.editId!==null&&!matched){
  const existing=D.servisLogs.find(x=>x.id===Servis.editId);
  const oldCat=existing&&existing.categoryId?D.sparepartCats.find(c=>c&&c.id===existing.categoryId&&(!c.vehicleId||c.vehicleId===curVehicleId)):null;
  const sameItem=existing&&String(existing.item||'').trim().toLowerCase()===item.toLowerCase();
  if(oldCat&&sameItem)catIdForLog=oldCat.id;
}

const _preSaveChecklistPayload=(typeof ServisChecklist!=='undefined'&&typeof ServisChecklist.toLogPayload==='function')?ServisChecklist.toLogPayload():[];
const checklistNotApplicable=(typeof ServisChecklist!=='undefined'&&typeof ServisChecklist.toNotApplicablePayload==='function')?ServisChecklist.toNotApplicablePayload():[];
const _preSaveEffectiveItem=item||(_preSaveChecklistPayload.length>0?String(_preSaveChecklistPayload[0].itemName||'').trim():'');
if(!_preSaveEffectiveItem){toast('⚠️ Pilih minimal satu komponen checklist atau isi jenis servis');return;}
let newCatCreated=false;
if(intervalKm&&intervalKm>0){
if(matched){
matched.intervalKm=intervalKm;
} else if(item&&!itemIsVehicleName){
const newCat={id:'sp_'+Date.now(),name:item,code:codeFromName(item),intervalKm};
D.sparepartCats.push(newCat);
matched=newCat;
catIdForLog=newCat.id;
newCatCreated=true;
}
}
if(Servis.editId!==null){
const s=D.servisLogs.find(x=>x.id===Servis.editId);
const _oldTxAccountId=s&&s.txLinkId&&Array.isArray(D.transactions)?(D.transactions.find(t=>t&&t.id===s.txLinkId)||{}).accountId:null;
if(!s){

  restore();
  toast('⚠️ Data tidak ditemukan');
  return;
}

if(!await Servis.replaceStockUsages(
  [
    {partId:s.usedPartId,qty:s.usedPartQty},
    {partId:s.catalogPartLinkedStockId,qty:s.catalogPartQty}
  ],
  [
    {partId:usedPartId,qty:usedPartQty},
    {partId:catalogLinkedStockId,qty:catalogPartQty}
  ]
)){
  restore();
  return;
}
if(intervalKm&&intervalKm>0&&!matched&&s.categoryId){
const linkedCat=D.sparepartCats.find(c=>c&&c.id===s.categoryId&&(!c.vehicleId||c.vehicleId===curVehicleId));
if(linkedCat){linkedCat.intervalKm=intervalKm;catIdForLog=linkedCat.id;}
}
const checklistPayload=(typeof ServisChecklist!=='undefined'&&typeof ServisChecklist.toLogPayload==='function')?ServisChecklist.toLogPayload():[];
const _catForSnapshot=catIdForLog?(D.sparepartCats||[]).find(c=>c&&c.id===catIdForLog):null;
const _ivSnapshot=(typeof getEffectiveIntervalKm==='function'&&_catForSnapshot)?getEffectiveIntervalKm(curVehicleId,_catForSnapshot):(_catForSnapshot&&_catForSnapshot.intervalKm>0?_catForSnapshot.intervalKm:null);
const _ibSnapshot=(typeof getEffectiveIntervalBulan==='function'&&_catForSnapshot)?getEffectiveIntervalBulan(_catForSnapshot,curVehicleId):(_catForSnapshot&&_catForSnapshot.intervalBulan>0?_catForSnapshot.intervalBulan:null);
const _historicalFieldsChanged=kmChanged||dateChanged;
const _metadataOnlyEdit=!_historicalFieldsChanged;
const _nextSnapshotEdit=(typeof buildServiceNextDueSnapshot==='function'&&_catForSnapshot)?buildServiceNextDueSnapshot({vehicleId:s.vehicleId||curVehicleId,cat:_catForSnapshot,serviceKm:km,serviceDate:date,actionType:s.actionType||null}):{nextDueKm:null,nextDueDate:null,nextDueAxis:null};
const _preserveHistoricalSnapshot=_metadataOnlyEdit;
Object.assign(s,{date,item,categoryId:catIdForLog||s.categoryId,masterCategoryId:masterCategoryId||s.masterCategoryId||null,serviceComponentId:serviceComponentId||s.serviceComponentId||null,actionType,km,cost,note,accountId:accId,intervalKmAtService:_preserveHistoricalSnapshot?s.intervalKmAtService:_ivSnapshot,intervalBulanAtService:_preserveHistoricalSnapshot?s.intervalBulanAtService:_ibSnapshot,nextDueKm:_preserveHistoricalSnapshot?s.nextDueKm:_nextSnapshotEdit.nextDueKm,nextDueDate:_preserveHistoricalSnapshot?s.nextDueDate:_nextSnapshotEdit.nextDueDate,nextDueAxis:_preserveHistoricalSnapshot?s.nextDueAxis:_nextSnapshotEdit.nextDueAxis,usedPartId:usedPartId||null,usedPartQty:usedPartId?usedPartQty:0,catalogPartId:catalogPartId||null,catalogPartQty:catalogPartId?catalogPartQty:0,catalogPartOemCode:catalogPartId?catalogPartOemCode:'',catalogPartLinkedStockId:catalogLinkedStockId||null,foto:Servis._photoDraft.slice(),checklist:checklistPayload});
s.checklistNotApplicable=checklistNotApplicable; s.conditionResult=conditionResult; s.conditionNote=conditionNote;

if(_metadataOnlyEdit){
  if(!Array.isArray(s.editHistory))s.editHistory=[];
  s.editHistory.push({changedAt:new Date().toISOString(),changedBy:'self',fields:['categoryId','masterCategoryId','serviceComponentId','item','note','foto','checklist','cost','accountId']});
  if(s.editHistory.length>50)s.editHistory=s.editHistory.slice(-50);
}
let _postCommitFinanceEvent=null;
if(s.txLinkId){
const tx=D.transactions.find(t=>t.id===s.txLinkId);
if(cost===0){

D.transactions=D.transactions.filter(t=>t.id!==s.txLinkId);
s.txLinkId=null;
_postCommitFinanceEvent={txId:null,deletedId:tx.id,category:tx.category,type:'expense',amount:0,kind:'servis'};
}else if(tx){
Object.assign(tx,{amount:cost,date,accountId:accId,note:noteFull});
_postCommitFinanceEvent={txId:tx.id,category:tx.category,type:'expense',amount:cost,kind:'servis'};
}else if(cost>0){

const repairTxId=uid();
const repairTxCat=resolveVehicleTxCategory(veh);
D.transactions.push({id:repairTxId,type:'expense',amount:cost,category:repairTxCat,subcategory:'Servis & Oli',accountId:accId,payMethod:'tunai',note:noteFull,date,servisLinkId:s.id});
s.txLinkId=repairTxId;
_postCommitFinanceEvent={txId:repairTxId,category:repairTxCat,type:'expense',amount:cost,kind:'servis',action:'relink'};
}
}else if(cost>0){

const txId=uid();
const txCat=resolveVehicleTxCategory(veh);
D.transactions.push({id:txId,type:'expense',amount:cost,category:txCat,subcategory:'Servis & Oli',accountId:accId,payMethod:'tunai',note:noteFull,date,servisLinkId:s.id});
s.txLinkId=txId;
_postCommitFinanceEvent={txId,category:txCat,type:'expense',amount:cost,kind:'servis'};
}
try{
  save({domain:'servis',financeMutation:!!_postCommitFinanceEvent,accountIds:[accId,_oldTxAccountId].filter(Boolean)});
}catch(err){
  throw err;
}
closeModal('servisModal');if(typeof refreshCarNotesAfterMutation==='function')refreshCarNotesAfterMutation({stock:true});
if(typeof VehicleCatalogServisLink!=='undefined'&&VehicleCatalogServisLink&&typeof VehicleCatalogServisLink.attachToServis==='function'){
  try{VehicleCatalogServisLink.attachToServis(s.id,catalogPartId?[{catalogId:catalogPartId,qty:catalogPartQty}]:[]);}
  catch(_catalogEditErr){console.error('V24: post-commit catalog edit link failed; queued for reconciliation',_catalogEditErr);if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'catalog.attach',payload:{servisId:s.id,links:catalogPartId?[{catalogId:catalogPartId,qty:catalogPartQty}]:[]}});}
}
if(typeof ServiceEventLifecycle!=='undefined'){try{ServiceEventLifecycle.update(s,{txId:s.txLinkId||null,categoryId:s.categoryId||null});}catch(_lifecycleEditErr){console.error('V25: post-commit service edit lifecycle failed; reconciliation required',_lifecycleEditErr);if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'service.update',payload:s,options:{txId:s.txLinkId||null,categoryId:s.categoryId||null}});}}
if(_postCommitFinanceEvent&&typeof AIBus!=="undefined"){
  try{AIBus.emit('finance.updated',_postCommitFinanceEvent);}
  catch(_financeEventErr){
    console.error('V35: service edit finance event failed after commit; queued for reconciliation',_financeEventErr);
    if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'finance.updated',payload:_postCommitFinanceEvent});
  }
}
toast('✅ Catatan servis diperbarui'+(intervalKm?' & interval pengingat disinkron':''));
return;
}
if(!await Servis.applyStockUsages([
  {partId:usedPartId,qty:usedPartQty},
  {partId:catalogLinkedStockId,qty:catalogPartQty}
]))return;
const servisId=uid();
const txCat=resolveVehicleTxCategory(veh);
let txId=null;
// v13: servis Rp0 tetap menjadi Service Event/riwayat yang sah, tetapi
// tidak membuat transaksi Finance Rp0. Finance hanya merepresentasikan
// arus uang nyata.
if(cost>0){
 txId=uid();
 D.transactions.push({id:txId,type:'expense',amount:cost,category:txCat,subcategory:'Servis & Oli',accountId:accId,payMethod:'tunai',note:noteFull,date,servisLinkId:servisId});
}
const checklistPayload=_preSaveChecklistPayload;

const _serviceSessionId=uid();
const _checkedServiceRows=checklistPayload.slice();
const _hasChecklistRows=_checkedServiceRows.length>0;
const _effectiveItem=item||(_hasChecklistRows?_checkedServiceRows[0].itemName:_preSaveEffectiveItem);
if(!_effectiveItem){toast('⚠️ Pilih minimal satu komponen checklist atau isi jenis servis');return;}
const _catForSnapshot=catIdForLog?(D.sparepartCats||[]).find(c=>c&&c.id===catIdForLog):null;
const _ivSnapshot=(typeof getEffectiveIntervalKm==='function'&&_catForSnapshot)?getEffectiveIntervalKm(curVehicleId,_catForSnapshot):(_catForSnapshot&&_catForSnapshot.intervalKm>0?_catForSnapshot.intervalKm:null);
const _ibSnapshot=(typeof getEffectiveIntervalBulan==='function'&&_catForSnapshot)?getEffectiveIntervalBulan(_catForSnapshot,curVehicleId):(_catForSnapshot&&_catForSnapshot.intervalBulan>0?_catForSnapshot.intervalBulan:null);
const _nextSnapshot=(typeof buildServiceNextDueSnapshot==='function'&&_catForSnapshot)?buildServiceNextDueSnapshot({vehicleId:curVehicleId,cat:_catForSnapshot,serviceKm:km,serviceDate:date,actionType:actionType||null}):{nextDueKm:null,nextDueDate:null,nextDueAxis:null};
const _rowsToPersist=_hasChecklistRows?_checkedServiceRows:[{itemName:_effectiveItem,categoryId:catIdForLog||null,masterCategoryId:masterCategoryId||null,actionType,serviceComponentId:serviceComponentId||null}];
_rowsToPersist.forEach((_row,_rowIdx)=>{
  const _rowCategoryId=_row.categoryId||(_row.itemId&&typeof ServisChecklist!=='undefined'&&typeof ServisChecklist.findItemById==='function'&&(()=>{const f=ServisChecklist.findItemById(_row.itemId);return f&&typeof ServisChecklist.resolveCategoryForItem==='function'?(ServisChecklist.resolveCategoryForItem(f.item,curVehicleId)||{}).id||null:null;})())||null;
  const _rowMasterCategoryId=_row.masterCategoryId||masterCategoryId||null;
  const _rowActionType=_row.actionType||actionType;
  const _rowItem=String(_row.itemName||_effectiveItem).trim();
  const _rowCat=_rowCategoryId?(D.sparepartCats||[]).find(c=>c&&c.id===_rowCategoryId):null;
  const _rowIv=(typeof getEffectiveIntervalKm==='function'&&_rowCat)?getEffectiveIntervalKm(curVehicleId,_rowCat):(_rowCat&&_rowCat.intervalKm>0?_rowCat.intervalKm:null);
  const _rowIb=(typeof getEffectiveIntervalBulan==='function'&&_rowCat)?getEffectiveIntervalBulan(_rowCat,curVehicleId):(_rowCat&&_rowCat.intervalBulan>0?_rowCat.intervalBulan:null);
  const _rowNext=(typeof buildServiceNextDueSnapshot==='function'&&_rowCat)?buildServiceNextDueSnapshot({vehicleId:curVehicleId,cat:_rowCat,serviceKm:km,serviceDate:date,actionType:_rowActionType||null}):{nextDueKm:null,nextDueDate:null,nextDueAxis:null};
  D.servisLogs.push({id:_rowIdx===0?servisId:uid(),sessionId:_serviceSessionId,vehicleId:curVehicleId,date,item:_rowItem,categoryId:_rowCategoryId,masterCategoryId:_rowMasterCategoryId,serviceComponentId:_row.serviceComponentId||null,actionType:_rowActionType,km,cost:_rowIdx===0?cost:0,note,accountId:accId,txLinkId:_rowIdx===0?txId:null,intervalKmAtService:_rowIv,intervalBulanAtService:_rowIb,nextDueKm:_rowNext.nextDueKm,nextDueDate:_rowNext.nextDueDate,nextDueAxis:_rowNext.nextDueAxis,usedPartId:_rowIdx===0?(usedPartId||null):null,usedPartQty:_rowIdx===0?(usedPartId?usedPartQty:0):0,catalogPartId:_rowIdx===0?(catalogPartId||null):null,catalogPartQty:_rowIdx===0?(catalogPartId?catalogPartQty:0):0,catalogPartOemCode:_rowIdx===0?(catalogPartId?catalogPartOemCode:''):'',catalogPartLinkedStockId:_rowIdx===0?(catalogLinkedStockId||null):null,foto:_rowIdx===0?Servis._photoDraft.slice():[],checklist:[_row],checklistNotApplicable,conditionResult:_rowIdx===0?conditionResult:null,conditionNote:_rowIdx===0?conditionNote:''});
});

save({domain:'servis',financeMutation:!!txId,accountIds:txId?[accId]:[]});
const _newServisLog=D.servisLogs[D.servisLogs.length-1];
if(typeof ServiceEventLifecycle!=='undefined'){try{ServiceEventLifecycle.create(_newServisLog);}catch(_lifecycleCreateErr){console.error('V25: post-commit service create lifecycle failed; reconciliation required',_lifecycleCreateErr);if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'service.create',payload:_newServisLog});}}
if(typeof VehicleCatalogServisLink!=='undefined'&&VehicleCatalogServisLink&&typeof VehicleCatalogServisLink.attachToServis==='function'){
  try{VehicleCatalogServisLink.attachToServis(servisId,catalogPartId?[{catalogId:catalogPartId,qty:catalogPartQty}]:[]);}
  catch(_catalogErr){console.error('V24: post-commit catalog service link failed; queued for reconciliation',_catalogErr);if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'catalog.attach',payload:{servisId:servisId,links:catalogPartId?[{catalogId:catalogPartId,qty:catalogPartQty}]:[]}});}
}

if(txId&&typeof AIBus!=="undefined"){
  const _createFinanceEvent={txId,category:txCat,type:'expense',amount:cost,kind:'servis'};
  try{AIBus.emit('finance.updated',_createFinanceEvent);}
  catch(_createFinanceEventErr){
    console.error('V35: service create finance event failed after commit; queued for reconciliation',_createFinanceEventErr);
    if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'finance.updated',payload:_createFinanceEvent});
  }
}
closeModal('servisModal');if(typeof refreshCarNotesAfterMutation==='function')refreshCarNotesAfterMutation({stock:true});
if(newCatCreated){
toast(`✅ Catatan servis tersimpan, "${item}" ditambahkan ke Pengingat Servis (tiap ${intervalKm.toLocaleString('id-ID')} km)`);
} else if(matched&&intervalKm){
toast('✅ Catatan servis tersimpan & interval pengingat disinkron');
} else if(itemIsVehicleName){
toast(`✅ Catatan servis tersimpan. (Catatan: "${item}" adalah nama kendaraan, jadi tidak dibuatkan kategori pengingat — isi jenis servisnya, mis. "Ganti Oli", di kolom Jenis Servis/Item)`,4500);
} else if(!matched&&item){
setTimeout(async()=>{
if(await askConfirm(`"${item}" belum ada di daftar pengingat servis. Tambahkan sebagai kategori pengingat baru sekarang?`,{danger:false,okText:'Ya, Tambahkan',icon:'🔔'})){
const interval=await showPromptModal({title:'Interval Servis',message:'Interval servis untuk "'+item+'" (KM):',icon:'🔧',inputType:'number',defaultValue:3000});
const n=parseFloat(interval);
if(n&&n>0){
const newCat={id:'sp_'+Date.now(),name:item,code:codeFromName(item),intervalKm:n};
D.sparepartCats.push(newCat);
const s2=D.servisLogs.find(x=>x.id===servisId);
if(s2)s2.categoryId=newCat.id;
save({domain:'servis',financeMutation:false});Sparepart.renderCatList();Servis.renderList();toast('✅ Kategori pengingat ditambahkan');
}
}
},150);
} else {
toast('✅ Catatan servis tersimpan & tersinkron ke Keuangan');
}
},
setEditTab(tab){
const isEdit=Servis.editId!==null;
if(!isEdit)return;
const next=tab==='reminder'?'reminder':'detail';
const detail=document.getElementById('servisDetailPanel');
const reminder=document.getElementById('servisReminderPanel');
const detailBtn=document.getElementById('servisEditTabDetail');
const reminderBtn=document.getElementById('servisEditTabReminder');
if(detail)detail.style.display=next==='detail'?'':'none';
if(reminder)reminder.style.display=next==='reminder'?'':'none';
if(detailBtn)detailBtn.classList.toggle('active',next==='detail');
if(reminderBtn)reminderBtn.classList.toggle('active',next==='reminder');
if(next==='reminder')Servis.renderEditReminderTab();
Servis._editTab=next;
},
renderEditReminderTab(){
const panel=document.getElementById('servisReminderPanel');
if(!panel||Servis.editId===null)return;
const s=(D.servisLogs||[]).find(x=>x.id===Servis.editId);
if(!s){panel.innerHTML='<div class="empty"><div class="empty-text">Data riwayat servis tidak ditemukan.</div></div>';return;}
const vehicleId=s.vehicleId||curVehicleId;
const vehicle=(D.vehicles||[]).find(v=>v.id===vehicleId);
const resolveCat=(item,preferredId)=>{
  const preferred=preferredId?(D.sparepartCats||[]).find(c=>c&&c.id===preferredId):null;
  if(preferred&&(!preferred.vehicleId||preferred.vehicleId===vehicleId))return preferred;
  return typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(item,vehicleId):null;
};
const linkedCat=resolveCat(s.item,s.categoryId);
const vehicleOverride=vehicle&&vehicle.intervalOverrides&&linkedCat?vehicle.intervalOverrides[linkedCat.id]:null;
const canonical=typeof getCanonicalServiceInterval==='function'
  ?getCanonicalServiceInterval(linkedCat||{}, {intervalKm:vehicleOverride})
  :{intervalKm:typeof getEffectiveIntervalKm==='function'&&linkedCat?getEffectiveIntervalKm(vehicleId,linkedCat):(linkedCat&&linkedCat.intervalKm>0?linkedCat.intervalKm:null),intervalBulan:typeof getEffectiveIntervalBulan==='function'&&linkedCat?getEffectiveIntervalBulan(linkedCat,vehicleId):(linkedCat&&linkedCat.intervalBulan>0?linkedCat.intervalBulan:null)};
const urgency=linkedCat&&(canonical.intervalKm>0||canonical.intervalBulan>0||((typeof hasMaintenanceReminderSchedule==='function')&&hasMaintenanceReminderSchedule(vehicleId,linkedCat)))&&typeof computeServiceUrgency==='function'
  ?computeServiceUrgency({vehicleId,cat:linkedCat,curKm:typeof getVehicleKm==='function'?getVehicleKm(vehicleId):null,kmPerDay:typeof estimateKmPerDay==='function'?estimateKmPerDay(vehicleId):null})
  :null;
const statusLabel=urgency?(urgency.statusIcon+' '+urgency.statusLabel):'⚪ Belum aktif';
const intervalLabel=canonical.intervalKm||canonical.intervalBulan
  ?[(canonical.intervalKm?canonical.intervalKm.toLocaleString('id-ID')+' km':null),(canonical.intervalBulan?canonical.intervalBulan.toLocaleString('id-ID')+' bulan':null)].filter(Boolean).join(' atau ')
  :'Belum diatur';
const overrideLabel=vehicleOverride&&vehicleOverride>0?'Khusus kendaraan':'Kategori';
const usedPart=s.usedPartId?(D.partsStock||[]).find(p=>p.id===s.usedPartId):null;
const partCat=usedPart?resolveCat(usedPart.name,usedPart.catId):null;
const partOverride=vehicle&&vehicle.intervalOverrides&&partCat?vehicle.intervalOverrides[partCat.id]:null;
const partCanonical=partCat&&typeof getCanonicalServiceInterval==='function'
  ?getCanonicalServiceInterval(partCat,{intervalKm:partOverride})
  :{intervalKm:partCat&&partCat.intervalKm>0?partCat.intervalKm:null,intervalBulan:partCat&&partCat.intervalBulan>0?partCat.intervalBulan:null};
const checklist=Array.isArray(s.checklist)?s.checklist:[];
const checklistRows=checklist.map(row=>{
  const item=(typeof ServisChecklist!=='undefined'&&typeof ServisChecklist.findItemById==='function')?ServisChecklist.findItemById(row&&row.itemId):null;
  const name=(row&&row.itemName)||(item&&item.item&&item.item.name)||'';
  const cat=item&&typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(name,vehicleId):null;
  const iv=cat&&typeof getEffectiveIntervalKm==='function'?getEffectiveIntervalKm(vehicleId,cat):(cat&&cat.intervalKm>0?cat.intervalKm:null);
  const ib=cat&&typeof getEffectiveIntervalBulan==='function'?getEffectiveIntervalBulan(cat,vehicleId):(cat&&cat.intervalBulan>0?cat.intervalBulan:null);
  return `<div style="padding:8px 0;border-top:1px dashed var(--border)"><div class="u-fw700 u-fs12">${escapeHtml(name||'Komponen checklist')}</div><div class="u-fs11 u-t2">${cat?('🔗 '+escapeHtml(cat.name)+' · '+(iv?iv.toLocaleString('id-ID')+' km':'tanpa interval')+(ib?' / '+ib.toLocaleString('id-ID')+' bln':'')+' · '+(row.actionType||'catat')):'ℹ️ Belum terhubung ke kategori servis — tidak membuat interval baru.'}</div></div>`;
}).join('');
const componentHtml=usedPart?`<div class="fg"><label class="fl">📦 Komponen/Stok yang dipakai</label><div style="background:var(--surface3);border-radius:12px;padding:10px 12px"><div class="u-fw700 u-fs12">${escapeHtml(usedPart.name)}</div><div class="u-fs11 u-t2">${partCat?'🔗 '+escapeHtml(partCat.name)+' · '+(partCanonical.intervalKm?partCanonical.intervalKm.toLocaleString('id-ID')+' km':'tanpa interval')+(partCanonical.intervalBulan?' / '+partCanonical.intervalBulan.toLocaleString('id-ID')+' bln':''):'Tidak ada kategori reminder aktif untuk komponen ini.'}</div></div></div>`:'<div class="fg"><label class="fl">📦 Komponen/Stok</label><div class="u-fs12t2">Tidak ada stok sparepart yang ditautkan ke riwayat ini.</div></div>';
panel.innerHTML=`<div style="background:var(--accent-soft);border:1px solid var(--accent);border-radius:12px;padding:12px;margin-bottom:12px"><div class="u-fw700 u-fs13">🔔 Pengingat tersinkron</div><div class="u-fs11 u-t2" style="margin-top:4px">Tab ini hanya membaca SoT kategori/komponen yang sudah ada. Tidak menyimpan interval atau reminder kedua di riwayat servis.</div></div>
<div class="fg"><label class="fl">Kendaraan</label><div class="u-fs12">${vehicle?escapeHtml(vehicle.name):'Kendaraan tidak ditemukan'}</div></div>
<div class="fg"><label class="fl">Kategori Pengingat</label>${linkedCat?`<div style="background:var(--surface3);border-radius:12px;padding:10px 12px"><div class="u-flex u-jcb u-aic"><div><div class="u-fw700 u-fs12">${escapeHtml(linkedCat.name)}</div><div class="u-fs11 u-t2">${statusLabel} · ${escapeHtml(intervalLabel)} · sumber: ${overrideLabel}</div></div><button type="button" class="btn btn-ghost btn-sm" data-action="editSparepartFromReminder" data-args="${escapeHtml(JSON.stringify([linkedCat.id]))}">✏️ Kelola</button></div>${urgency?`<div class="u-fs11 u-t2" style="margin-top:6px">${urgency.sisaKm!=null?'Sisa '+urgency.sisaKm.toLocaleString('id-ID')+' km':''}${urgency.sisaBulan!=null?' · sisa '+Math.round(urgency.sisaBulan)+' bln':''}</div>`:''}</div>`:'<div class="u-fs12t2">⚪ Riwayat ini belum terhubung ke kategori pengingat kendaraan. Jangan membuat kategori otomatis dari tab ini.</div>'}</div>
${componentHtml}
${checklistRows?`<div class="fg"><label class="fl">☑️ Komponen Checklist</label><div style="background:var(--surface3);border-radius:12px;padding:2px 12px">${checklistRows}</div></div>`:''}
${Servis._renderEditHistoryHtml(s)}
<div class="u-fs11 u-t2" style="line-height:1.5;padding:8px 0">SoT: <b>kategori/komponen → interval efektif → reminder → riwayat</b>. Mengubah interval dilakukan melalui pengaturan kategori/override kendaraan, bukan membuat field interval baru di riwayat.</div>`;
},

_renderEditHistoryHtml(s){
const hist=Array.isArray(s&&s.editHistory)?s.editHistory:[];
if(!hist.length)return'';
const rows=hist.slice(-5).reverse().map(h=>{
const when=h&&h.changedAt?new Date(h.changedAt):null;
const whenLabel=when&&!isNaN(when)?when.toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'}):'(waktu tidak tercatat)';
const fields=Array.isArray(h&&h.fields)&&h.fields.length?h.fields.join(', '):'-';
return `<div style="padding:6px 0;border-top:1px dashed var(--border)"><div class="u-fs11 u-fw700">${escapeHtml(whenLabel)}</div><div class="u-fs11 u-t2">Diubah: ${escapeHtml(fields)}</div></div>`;
}).join('');
return `<div class="fg"><label class="fl">📝 Riwayat Perubahan (metadata)</label><div style="background:var(--surface3);border-radius:12px;padding:2px 12px">${rows}</div><div class="u-fs11 u-t2" style="margin-top:4px">Hanya mencatat edit yang tidak mengubah KM/tanggal (maks 5 terbaru ditampilkan dari ${hist.length} total).</div></div>`;
},
deleteFromModal(){if(Servis.editId===null)return;const id=Servis.editId;closeModal('servisModal');Servis.del(id);},
async delSession(sessionId){
if(!sessionId)return;
if(!await askConfirm('Hapus seluruh komponen dalam sesi servis ini? Transaksi keuangan terkait juga akan dihapus.'))return;
const _runDeleteSession=async()=>{
  const logs=(Array.isArray(D.servisLogs)?D.servisLogs:[]).filter(x=>x&&x.sessionId===sessionId);
  if(!logs.length)return;
  const txIds=new Set(logs.map(x=>x&&x.txLinkId).filter(Boolean));
  const _cloneSession=(v)=>{try{if(typeof structuredClone==='function')return structuredClone(v);}catch(_e){/* structuredClone tidak tersedia/gagal; fallback JSON di bawah. */} try{return JSON.parse(JSON.stringify(v));}catch(_e){return v;}};
  const beforeLogs=logs.map(x=>_cloneSession(x));
  const beforeTx=(Array.isArray(D.transactions)?D.transactions:[]).filter(tx=>tx&&txIds.has(tx.id)).map(x=>_cloneSession(x));
  const _sessionStockIds=new Set();
  logs.forEach(x=>{[x.usedPartId,x.catalogPartLinkedStockId,x.autoGantiStockId].filter(Boolean).forEach(id=>_sessionStockIds.add(id));});
  const beforeStock=new Map();
  for(const sid of _sessionStockIds){const row=(D.partsStock||[]).find(x=>x&&x.id===sid);if(row)beforeStock.set(sid,Number(row.qty)||0);}
  try{
    if(txIds.size)D.transactions=D.transactions.filter(tx=>!txIds.has(tx.id));
    logs.forEach(s=>{
      if(s.usedPartId)Servis.revertStockUsage(s.usedPartId,s.usedPartQty);
      if(s.catalogPartLinkedStockId)Servis.revertStockUsage(s.catalogPartLinkedStockId,s.catalogPartQty);
      if(s.autoGantiStockId)Servis.revertStockUsage(s.autoGantiStockId,1);
    });
    D.servisLogs=D.servisLogs.filter(x=>!x||x.sessionId!==sessionId);
    const _deleteSessionAccountIds=[...new Set(beforeTx.map(x=>x&&x.accountId).filter(Boolean))];
    save({domain:'servis',financeMutation:txIds.size>0,accountIds:_deleteSessionAccountIds});
    logs.forEach(s=>{
      if(typeof ServiceEventLifecycle!=='undefined'&&typeof ServiceEventLifecycle.remove==='function'){
        try{ServiceEventLifecycle.remove(s,{deletedTxId:s.txLinkId||null,categoryId:s.categoryId||null,vehicleId:s.vehicleId||null});}
        catch(err){console.error('V25: session service delete lifecycle failed; queued for reconciliation',err);if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'service.remove',payload:s,options:{deletedTxId:s.txLinkId||null,categoryId:s.categoryId||null,vehicleId:s.vehicleId||null}});}
      }
    });
  }catch(err){
    try{
      for(const row of beforeLogs){const cur=(D.servisLogs||[]).find(x=>x&&x.id===row.id);if(cur)Object.assign(cur,_cloneSession(row));else D.servisLogs.push(_cloneSession(row));}
      for(const row of beforeTx){const cur=(D.transactions||[]).find(x=>x&&x.id===row.id);if(cur)Object.assign(cur,_cloneSession(row));else D.transactions.push(_cloneSession(row));}
      for(const [sid,qty] of beforeStock){const row=(D.partsStock||[]).find(x=>x&&x.id===sid);if(row)row.qty=qty;}
    }catch(restoreErr){console.error('P17: session service delete rollback failed',restoreErr);}
    console.error('P17: session service delete failed',err);
    toast('⚠️ Penghapusan sesi servis dibatalkan karena proses gagal');
    return;
  }
  if(typeof refreshCarNotesAfterMutation==='function')refreshCarNotesAfterMutation({stock:true});
  if(typeof AIBus!=='undefined'){
    for(const txId of txIds){try{AIBus.emit('finance.updated',{txId,kind:'servis',action:'delete',sessionId});}catch(err){console.error('V32: session finance delete event failed',err);if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'finance.updated',payload:{txId,kind:'servis',action:'delete',sessionId}});}}
  }
  toast(`🗑 Sesi servis dihapus (${logs.length} komponen)`);
};
if(typeof withServiceMutationLock==='function')return withServiceMutationLock(_runDeleteSession);
return _runDeleteSession();
},
async del(id){
if(!await askConfirm('Hapus catatan ini? Catatan keuangan terkait juga akan dihapus.'))return;
const _runDelete=async()=>{
const s=D.servisLogs.find(x=>x.id===id);
if(!s)return;

const deletedTxId=s.txLinkId||null;
const _cloneDelete=(v)=>{try{if(typeof structuredClone==='function')return structuredClone(v);}catch(_e){/* structuredClone tidak tersedia/gagal; fallback JSON di bawah. */} try{return JSON.parse(JSON.stringify(v));}catch(_e){return v;}};
const beforeService=_cloneDelete(s);
const beforeTxRow=deletedTxId&&Array.isArray(D.transactions)?_cloneDelete(D.transactions.find(t=>t&&t.id===deletedTxId)):null;
const _deleteStockIds=[s.usedPartId,s.catalogPartLinkedStockId,s.autoGantiStockId].filter(Boolean);
const beforeStock=new Map();
for(const sid of _deleteStockIds){const row=(D.partsStock||[]).find(x=>x&&x.id===sid);if(row)beforeStock.set(sid,Number(row.qty)||0);}
try{
  if(deletedTxId)D.transactions=D.transactions.filter(tx=>tx.id!==deletedTxId);
  if(s.usedPartId)Servis.revertStockUsage(s.usedPartId,s.usedPartQty);
  if(s.catalogPartLinkedStockId)Servis.revertStockUsage(s.catalogPartLinkedStockId,s.catalogPartQty);

  if(s.autoGantiStockId)Servis.revertStockUsage(s.autoGantiStockId,1);

  D.servisLogs=D.servisLogs.filter(x=>x.id!==id);
  const _deletedAccountId=beforeTxRow&&beforeTxRow.accountId!=null?beforeTxRow.accountId:null;
  save({domain:'servis',financeMutation:!!deletedTxId,accountIds:_deletedAccountId?[_deletedAccountId]:[]});

  if(typeof ServiceEventLifecycle!=='undefined'&&typeof ServiceEventLifecycle.remove==='function'){
    try{ServiceEventLifecycle.remove(s,{deletedTxId,categoryId:s.categoryId||null,vehicleId:s.vehicleId||null});}
    catch(_lifecycleDeleteErr){console.error('V25: post-commit service delete lifecycle failed; queued for reconciliation',_lifecycleDeleteErr);if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'service.remove',payload:s,options:{deletedTxId,categoryId:s.categoryId||null,vehicleId:s.vehicleId||null}});}
  }
}catch(err){

  try{
    const cur=(D.servisLogs||[]).find(x=>x&&x.id===beforeService.id);if(cur)Object.assign(cur,_cloneDelete(beforeService));else D.servisLogs.push(_cloneDelete(beforeService));
    if(beforeTxRow){const tx=(D.transactions||[]).find(x=>x&&x.id===beforeTxRow.id);if(tx)Object.assign(tx,_cloneDelete(beforeTxRow));else D.transactions.push(_cloneDelete(beforeTxRow));}
    for(const [sid,qty] of beforeStock){const row=(D.partsStock||[]).find(x=>x&&x.id===sid);if(row)row.qty=qty;}
  }catch(restoreErr){console.error('P17: service delete rollback failed',restoreErr);}
  console.error('P17: service delete failed',err);
  toast('⚠️ Penghapusan servis dibatalkan karena proses gagal');
  return;
}
if(typeof refreshCarNotesAfterMutation==='function')refreshCarNotesAfterMutation({stock:true});
if(deletedTxId&&typeof AIBus!=='undefined'){try{AIBus.emit('finance.updated',{txId:deletedTxId,kind:'servis',action:'delete',deletedId:deletedTxId});}catch(_deleteFinanceEventErr){console.error('V32: finance delete event failed after commit; queued for reconciliation',_deleteFinanceEventErr);if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'finance.updated',payload:{txId:deletedTxId,kind:'servis',action:'delete',deletedId:deletedTxId}});}}
toast('🗑 Catatan servis dihapus');
};
if(typeof withServiceMutationLock==='function')return withServiceMutationLock(_runDelete);
return _runDelete();
},

_findAutoGantiStock(cat,vehicleId){
if(!cat||!Array.isArray(D.partsStock))return null;
const candidates=D.partsStock.filter(p=>p.catId===cat.id&&(typeof Sparepart!=='undefined'&&typeof Sparepart.isPartForVehicle==='function'?Sparepart.isPartForVehicle(p,vehicleId):(!p.vehicleId||String(p.vehicleId)===String(vehicleId))));
return candidates.length===1?candidates[0]:null;
},

_checkTooEarlyGanti(cat,vehicleId,curKm){
if(!cat||!cat.intervalKm||cat.intervalKm<=0)return null;
const lastKm=Servis.getLastServiceKmForCat(vehicleId,cat,'ganti');
if(lastKm===null||lastKm===undefined)return null;
const traveled=curKm-lastKm;
if(traveled<0)return null;
const thresholdKm=cat.intervalKm*0.2;
if(traveled>=thresholdKm)return null;
return{lastKm,traveled,intervalKm:cat.intervalKm,thresholdKm};
},
async chooseReminderAction(catId){
  const cat=(typeof resolveReminderCategory==='function')?resolveReminderCategory(catId,curVehicleId):D.sparepartCats.find(c=>c.id===catId);
  if(!cat)return;
  const meta=cat.serviceComponentId&&typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.itemById==='function'?ServiceInputCatalog.itemById(cat.serviceComponentId):null;
  const u=typeof computeServiceUrgency==='function'?computeServiceUrgency({vehicleId:curVehicleId,cat,curKm:getVehicleKm(curVehicleId),kmPerDay:estimateKmPerDay(curVehicleId)}):null;
  const history=typeof summarizeServiceHistory==='function'?summarizeServiceHistory(curVehicleId,cat):{};
  const cond=history.lastInspected&&(history.lastInspected.conditionResult||history.lastInspected.conditionStatus)||null;
  const rec=typeof recommendServiceAction==='function'?recommendServiceAction({item:meta&&meta.item,cat,urgency:u,conditionResult:cond}):null;
  const valid=meta&&meta.item&&typeof getServiceActionOptions==='function'?getServiceActionOptions(meta.item):['periksa','ganti'];
  const choices=valid.filter(x=>['periksa','bersih','ganti'].includes(x)).map(x=>({value:x,label:`${x==='periksa'?'🔍 Periksa':x==='bersih'?'🧹 Bersihkan':'🔧 Ganti'}${rec&&rec.action===x?'  · direkomendasikan':''}`}));
  if(!choices.length)return;
  const idx=await showChoiceModal({title:`Tindakan: ${cat.name}`,message:rec&&rec.reason?`💡 ${rec.reason}`:'Pilih tindakan yang benar-benar dikerjakan.' ,choices});
  if(idx===null||idx===undefined||!choices[idx])return;
  let conditionResult=null;
  if(choices[idx].value==='periksa'&&typeof SERVICE_CONDITION_RESULTS!=='undefined') {
    const ri=await showChoiceModal({title:'Hasil pemeriksaan (opsional)',message:'Boleh dilewati jika belum ingin mengisi hasil.',choices:[...SERVICE_CONDITION_RESULTS.map(x=>({value:x.id,label:`${x.icon} ${x.label}`})),{value:null,label:'↩️ Lewati'}]});
    if(ri!==null&&ri!==undefined&&SERVICE_CONDITION_RESULTS[ri])conditionResult=SERVICE_CONDITION_RESULTS[ri].id;
  }
  return Servis.markServiced(catId,choices[idx].value,{conditionResult});
},

async markServiced(catId,actionType,opts){
opts=opts||{};
const cat=(typeof resolveReminderCategory==='function')?resolveReminderCategory(catId,curVehicleId):D.sparepartCats.find(c=>c.id===catId);
if(!cat)return;

Servis._markServicedInFlight=Servis._markServicedInFlight instanceof Set?Servis._markServicedInFlight:new Set();
const _markGuardKey=`${curVehicleId||''}::${cat.id}::${actionType||'default'}`;
if(Servis._markServicedInFlight.has(_markGuardKey))return;
Servis._markServicedInFlight.add(_markGuardKey);
const _clearMarkGuard=()=>Servis._markServicedInFlight.delete(_markGuardKey);
const curKm=getVehicleKm(curVehicleId);
const actLabel=actionType==='periksa'?'diperiksa':(actionType==='bersih'?'dibersihkan':'diservis');

const willReset=!(cat.actionMode==='periksa-conditional'&&cat.gantiResetsInterval===false&&(actionType||'ganti')==='ganti');

if(actionType==='ganti'&&!opts.skipEarlyGuard){
const early=Servis._checkTooEarlyGanti(cat,curVehicleId,curKm);
if(early){
const earlyMsg=`⚠️ "${cat.name}" baru diganti ${early.traveled.toLocaleString('id-ID')} km lalu (interval ${early.intervalKm.toLocaleString('id-ID')} km) -- kelihatannya masih terlalu dini. Tetap tandai ganti sekarang?`;
if(!await askConfirm(earlyMsg,{danger:true,okText:'Ya, Tetap Ganti',icon:'⚠️'})){_clearMarkGuard();return;}
}
}
if(!opts.skipConfirm){
const confirmMsg=`Tandai "${cat.name}" sudah ${actLabel} hari ini di KM ${curKm.toLocaleString('id-ID')}?`+(willReset?' Pengingat akan otomatis reset ke KM ini.':' (Item ini basis jatuh-temponya dari "periksa" -- catatan "ganti" ini TIDAK mereset pengingat.)');
if(!await askConfirm(confirmMsg,{danger:false,okText:'Ya, Tandai',icon:'✅'})){_clearMarkGuard();return;}
}
let cost;
if(opts.presetCost!==undefined&&opts.presetCost!==null){
cost=parseFloat(opts.presetCost)||0;
}else if(actionType==='periksa'||actionType==='bersih'){

cost=0;
}else{
const costStr=await showPromptModal({title:'Biaya Servis',message:'Biaya servis ini (opsional, boleh dikosongkan/0):',icon:'💵',inputType:'number',defaultValue:0});
cost=parseFloat(costStr)||0;
}
const date=(typeof formatServiceDateOnly==='function'&&typeof parseServiceDateOnly==='function')?formatServiceDateOnly(parseServiceDateOnly(new Date())):new Date().toISOString().split('T')[0];
const accId=D.accounts[0]?.id;

const _markStockIds=new Set();
const _markCatStock=Servis._findAutoGantiStock(cat,curVehicleId);
if(_markCatStock&&_markCatStock.id)_markStockIds.add(_markCatStock.id);
const _markStockBefore=new Map();
for(const sid of _markStockIds){const row=(D.partsStock||[]).find(x=>x&&x.id===sid);if(row)_markStockBefore.set(sid,Number(row.qty)||0);}
const _restoreMarkDomain=(servisId)=>{
  try{
    D.servisLogs=(D.servisLogs||[]).filter(x=>!(x&&x.id===servisId));
    D.transactions=(D.transactions||[]).filter(x=>!(x&&x.servisLinkId===servisId));
    for(const [sid,qty] of _markStockBefore){const row=(D.partsStock||[]).find(x=>x&&x.id===sid);if(row)row.qty=qty;}
  }catch(_markRollbackErr){console.error('V25: markServiced rollback failed',_markRollbackErr);}
};
const _runMarkMutation=async()=>{
const veh=D.vehicles.find(v=>v.id===curVehicleId);
const servisId=uid();
const _serviceSnapshot=(typeof buildServiceNextDueSnapshot==='function')?buildServiceNextDueSnapshot({vehicleId:curVehicleId,cat,serviceKm:curKm,serviceDate:date,actionType:actionType||null}):{nextDueKm:null,nextDueDate:null,nextDueAxis:null,intervalKmAtService:null,intervalBulanAtService:null};
const entry={id:servisId,vehicleId:curVehicleId,date,item:cat.name,categoryId:cat.id,masterCategoryId:cat.masterCategoryId||null,serviceComponentId:cat.serviceComponentId||null,km:curKm,cost,note:'Ditandai selesai dari Pengingat Servis',accountId:accId,txLinkId:null,actionType:actionType||null,conditionResult:opts.conditionResult||null,batchId:opts.batchId||null,idempotencyKey:opts.idempotencyKey||(`reminder:${curVehicleId||''}:${cat.id}:${actionType||'default'}:${opts.batchId||servisId}`),intervalKmAtService:_serviceSnapshot.intervalKmAtService,intervalBulanAtService:_serviceSnapshot.intervalBulanAtService,nextDueKm:_serviceSnapshot.nextDueKm,nextDueDate:_serviceSnapshot.nextDueDate,nextDueAxis:_serviceSnapshot.nextDueAxis};
if(cost>0){
const txId=uid();
D.transactions.push({id:txId,type:'expense',amount:cost,category:resolveVehicleTxCategory(veh),subcategory:'Servis & Oli',accountId:accId,payMethod:'tunai',note:cat.name+(veh?' - '+veh.name:'')+' (tandai selesai)',date,servisLinkId:servisId});
entry.txLinkId=txId;
}
if(entry.idempotencyKey&&typeof findServiceEventByIdempotencyKey==='function'){
const _dup=findServiceEventByIdempotencyKey(D.servisLogs||[],entry.idempotencyKey,entry.vehicleId);
if(_dup){_clearMarkGuard();return _dup;}
}
D.servisLogs.push(entry);

let autoGantiStock=null;
if(actionType==='ganti'){
autoGantiStock=Servis._findAutoGantiStock(cat,curVehicleId);
if(autoGantiStock&&(autoGantiStock.qty||0)>=1){
autoGantiStock.qty=autoGantiStock.qty-1;
entry.autoGantiStockId=autoGantiStock.id;
}else{
autoGantiStock=null;
}
}
try{
if(!opts._batchDeferSave){save({domain:'servis',financeMutation:!!entry.txLinkId,accountIds:entry.txLinkId?[entry.accountId]:[]});if(typeof refreshCarNotesAfterMutation==='function')refreshCarNotesAfterMutation({stock:!!autoGantiStock});}

if(!opts._batchDeferEvents){
if(typeof ServiceEventLifecycle!=='undefined'){try{ServiceEventLifecycle.create(entry);}catch(_markLifecycleErr){console.error('V27: post-commit service lifecycle failed; queued for reconciliation',_markLifecycleErr);if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'service.create',payload:entry});}}
else if(typeof AIBus!=="undefined"){try{AIBus.emit("vehicle.updated",{kind:"servis",action:"create",vehicleId:entry.vehicleId,servisId:entry.id,txId:entry.txLinkId||null});}catch(_markVehicleEventErr){console.error('V31: vehicle event failed after commit; queued for reconciliation',_markVehicleEventErr);if(typeof ServiceEventOutbox!=="undefined")ServiceEventOutbox.enqueue({type:'vehicle.updated',payload:{kind:'servis',action:'create',vehicleId:entry.vehicleId,servisId:entry.id,txId:entry.txLinkId||null}});}}
if(entry.txLinkId&&typeof AIBus!=="undefined"){try{AIBus.emit('finance.updated',{txId:entry.txLinkId,category:resolveVehicleTxCategory(veh),type:'expense',amount:cost,kind:'servis'});}catch(_eventErr){console.error('V31: finance event failed after commit; queued for reconciliation',_eventErr);if(typeof ServiceEventOutbox!=="undefined")ServiceEventOutbox.enqueue({type:'finance.updated',payload:{txId:entry.txLinkId,category:resolveVehicleTxCategory(veh),type:'expense',amount:cost,kind:'servis'}});}}
}
if(autoGantiStock&&typeof Sparepart!=='undefined'&&typeof Sparepart.renderStockList==='function')Sparepart.renderStockList();
if(!opts.skipConfirm)toast(`✅ ${cat.name} ditandai ${actLabel}, `+(willReset?'pengingat direset ke KM sekarang':'tercatat (pengingat tidak berubah)')+(autoGantiStock?` (stok "${autoGantiStock.name}" otomatis dipotong 1)`:''));
_clearMarkGuard();
return entry;
}catch(_markSaveErr){
  _restoreMarkDomain(servisId);
  console.error('V25: markServiced failed; domain rolled back',_markSaveErr);
  throw _markSaveErr;
}finally{
  if(typeof Servis._markCommitInFlight!=='undefined')Servis._markCommitInFlight=false;
}
};
return opts._batchOwnedLock?await _runMarkMutation():(typeof withServiceMutationLock==='function'?await withServiceMutationLock(_runMarkMutation):await _runMarkMutation());
},

async markServicedBatch(items){
if(!Array.isArray(items)||!items.length)return[];

const _batchStockIds=new Set();
for(const it of items){const c=(D.sparepartCats||[]).find(x=>x&&x.id===it.catId);const st=c?Servis._findAutoGantiStock(c,curVehicleId):null;if(st&&st.id)_batchStockIds.add(st.id);}
const batchStockBefore=new Map();
for(const sid of _batchStockIds){const row=(D.partsStock||[]).find(x=>x&&x.id===sid);if(row)batchStockBefore.set(sid,Number(row.qty)||0);}
const restoreBatch=()=>{
  try{
    const batchIds=new Set((D.servisLogs||[]).filter(x=>x&&x.batchId===batchId).map(x=>x.id));
    D.servisLogs=(D.servisLogs||[]).filter(x=>!(x&&x.batchId===batchId));
    D.transactions=(D.transactions||[]).filter(x=>!(x&&x.servisLinkId&&batchIds.has(x.servisLinkId)));
    for(const [sid,qty] of batchStockBefore){const row=(D.partsStock||[]).find(x=>x&&x.id===sid);if(row)row.qty=qty;}
  }catch(e){console.error('V26: batch rollback failed',e);}
};
const runBatch=async()=>{
  const batchId=uid();
  const results=[];
  try{
    for(const it of items){
      const entry=await Servis.markServiced(it.catId,it.actionType,{skipConfirm:true,skipEarlyGuard:true,presetCost:it.cost!==undefined?it.cost:0,batchId,_batchOwnedLock:true,_batchDeferEvents:true,_batchDeferSave:true});

      if(entry)results.push(entry);
    }

    const _batchAccountIds=[...new Set(results.filter(e=>e&&e.txLinkId&&e.accountId!=null).map(e=>e.accountId))];
    save({domain:'servis',financeMutation:_batchAccountIds.length>0,accountIds:_batchAccountIds});
    for(const entry of results){
      // V36: lifecycle and finance projections are independent post-commit effects.
      // A lifecycle failure must never skip the Finance event for the same committed item.
      try{
        if(typeof ServiceEventLifecycle!=='undefined'&&typeof ServiceEventLifecycle.create==='function')ServiceEventLifecycle.create(entry);
        else if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'service.create',payload:entry});
      }catch(e){if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'service.create',payload:entry});else console.error('V36: batch service lifecycle failed',e);}
      if(entry.txLinkId&&typeof AIBus!=='undefined'){
        const _batchFinancePayload={txId:entry.txLinkId,category:resolveVehicleTxCategory(D.vehicles.find(v=>v.id===entry.vehicleId)),type:'expense',amount:entry.cost||0,kind:'servis'};
        try{AIBus.emit('finance.updated',_batchFinancePayload);}
        catch(_batchFinanceEventErr){if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'finance.updated',payload:_batchFinancePayload});else console.error('V36: batch finance event failed',_batchFinanceEventErr);}
      }
    }
    toast(`✅ ${results.length} item servis ditandai selesai`);
    return results;
  }catch(err){
    restoreBatch();
    throw err;
  }
};
return typeof withServiceMutationLock==='function'?await withServiceMutationLock(runBatch):await runBatch();
},
};

if (typeof Servis !== 'undefined') window.Servis = Servis;
