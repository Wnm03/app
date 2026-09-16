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
const linkedCat=(s.categoryId&&D.sparepartCats.find(c=>c.id===s.categoryId))||(typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(s.item,vehicleId):D.sparepartCats.find(c=>c.name.toLowerCase()===(s.item||'').toLowerCase()));
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
const items=mid&&mid!==UNCATEGORIZED_FILTER_ID?ServisChecklist.itemsForMasterCategory(mid):(!mid?SERVICE_CHECKLIST_GROUPS.reduce((a,g)=>a.concat(g.items),[]):[]);
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
renderServiceChecklist(){
const box=document.getElementById('servisChecklistPanel');
if(!box||typeof ServisChecklist==='undefined')return;
const ids=Array.isArray(Servis._serviceChecklistMasterCategoryIds)?Servis._serviceChecklistMasterCategoryIds.slice():[];
const groups=ids.map(id=>ServisChecklist.findGroupByMasterCategoryId(id)).filter(Boolean);
if(!groups.length){box.innerHTML=`<div style="background:var(--surface3);border:1px dashed var(--border2);border-radius:12px;padding:12px;margin-bottom:12px;color:var(--text2);font-size:11px;line-height:1.6">☑️ Checklist Komponen Servis akan muncul setelah memilih kategori di atas. <b>Jenis Servis/Item</b> tetap tersedia untuk item non-standar.</div>`;return;}
const cards=groups.map(found=>{
const group=found.group,gi=found.groupIdx;
const rows=group.items.map((it,ii)=>{
  const checked=ServisChecklist._checked[it.id]!==undefined;
  const action=ServisChecklist._checked[it.id];
  const valid=ServisChecklist._validActionTypesFor(it);
  const actionButtons=checked&&valid.length>1?valid.map(v=>`<button type="button" class="btn btn-ghost btn-sm ${action===v?'active':''}" data-action="Servis.setServiceChecklistAction" data-args="${escapeHtml(JSON.stringify([gi,ii,v]))}">${v==='periksa'?'🔍 Periksa':v==='bersih'?'🧹 Bersih':'🔧 Ganti'}</button>`).join(''):'';
  const linkedCat=it.linkCat===true;
  const resolvedCat=linkedCat&&typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(it.name,ServisChecklist._vehicleId||curVehicleId):null;
  const missingCatBadge=linkedCat&&!resolvedCat?`<span class="sc-cat-warning" title="Kategori sparepart belum tersedia untuk kendaraan ini">⚠️ kategori belum ada</span>`:'';
  return `<div style="display:flex;gap:8px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--border2)"><button type="button" class="btn ${checked?'btn-primary':'btn-ghost'} btn-sm" style="min-width:72px" data-action="Servis.toggleServiceChecklistItem" data-args="${escapeHtml(JSON.stringify([gi,ii]))}">${checked?'✓ Selesai':'○ Cek'}</button><div style="flex:1;min-width:0"><div class="u-fw700 u-fs12">${escapeHtml(it.name)} ${missingCatBadge}</div><div class="u-fs11 u-t2">${escapeHtml(it.intervalLabel||'Tanpa interval rutin')}</div>${checked&&action?`<div class="u-fs11 u-cacc">Tindakan: ${escapeHtml(action)}</div>`:''}${actionButtons?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${actionButtons}</div>`:''}</div></div>`;
}).join('');
return `<details class="sc-group" open style="background:var(--surface3);border:1px solid var(--border2);border-radius:12px;padding:0 12px;margin-bottom:10px"><summary style="cursor:pointer;padding:12px 0;font-weight:700;display:flex;justify-content:space-between;gap:8px"><span>${escapeHtml(group.group)}</span><span class="chip active">${ServisChecklist.checkedCount(gi)}/${group.items.length}</span></summary><div style="padding-bottom:4px"><div style="font-size:11px;color:var(--text2);margin-bottom:6px">Centang hanya komponen yang benar-benar dikerjakan.</div>${rows}</div></details>`;
}).join('');
box.innerHTML=`<div style="margin-bottom:8px"><div class="u-fw700 u-fs12">☑️ Checklist Komponen Servis</div><div class="u-fs11 u-t2">${groups.length} kategori aktif · satu item dapat memilih tindakan <b>Ganti/Bersih/Periksa</b> sesuai aturan komponennya.</div></div>${cards}`;
},
_serviceActionTypesForCurrentComponent(){
const compId=document.getElementById('servisComponent')?.value||'';
const hit=typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.itemById==='function'?ServiceInputCatalog.itemById(compId):null;
return hit&&hit.item&&hit.item.actionMode==='periksa-conditional'?['periksa','bersih','ganti']:['ganti'];
},
syncServiceActionType(selected){
const wrap=document.getElementById('servisActionTypeWrap');
const sel=document.getElementById('servisActionType');
const hint=document.getElementById('servisActionTypeHint');
if(!wrap||!sel)return;
const types=Servis._serviceActionTypesForCurrentComponent();
const wanted=selected||sel.value||'ganti';
sel.innerHTML=types.map(t=>`<option value="${t}">${t==='periksa'?'🔍 Cek/Periksa':t==='bersih'?'🧹 Bersih':'🔧 Ganti'}</option>`).join('');
sel.value=types.includes(wanted)?wanted:types[0];
wrap.style.display='block';
if(hint)hint.textContent=types.length>1?'Pilih tindakan aktual. Untuk komponen kondisional, hanya Ganti yang mereset interval.':'Tindakan default: Ganti.';
},
onServiceActionTypeChange(){},
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
const names=(typeof Sparepart!=='undefined'&&Sparepart.getItemSuggestions)?Sparepart.getItemSuggestions():[];
const matches=(q?names.filter(n=>n.toLowerCase().includes(q)):names).slice(0,8);
if(!matches.length){box.style.display='none';box.innerHTML='';return;}
box.innerHTML=matches.map(n=>`<div class="suggest-item" onmousedown="event.preventDefault();Servis.selectItemSuggestion('${jsAttrEscape(n)}')">${escapeHtml(n)}</div>`).join('');
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
const servisAccEl=document.getElementById('servisAcc');
if(servisAccEl) servisAccEl.innerHTML=D.accounts.map(a=>`<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
const intervalEl=document.getElementById('servisInterval');
if(intervalEl)intervalEl.dataset.manual='0';
Servis.dismissPartialCatalogMatch();
if(isEdit){
const s=D.servisLogs.find(x=>x.id===Servis.editId);
if(!s)return;
if(typeof ServisChecklist!=='undefined'){ ServisChecklist.open(s.vehicleId||curVehicleId); ServisChecklist.loadFromLog(s); Servis._serviceChecklistGroupIdx=ServisChecklist.firstCheckedGroup(); const legacyIds=s.masterCategoryId?[s.masterCategoryId]:[]; const payloadIds=(s.checklist||[]).map(r=>r&&r.masterCategoryId).filter(Boolean); Servis._serviceChecklistMasterCategoryIds=[...new Set(legacyIds.concat(payloadIds))].filter(id=>ServisChecklist.findGroupByMasterCategoryId(id)); Servis._serviceChecklistGroupIdx=Servis._serviceChecklistMasterCategoryIds.length?ServisChecklist.findGroupByMasterCategoryId(Servis._serviceChecklistMasterCategoryIds[0]).groupIdx:null; }
document.getElementById('servisDate').value=s.date;
document.getElementById('servisItem').value=s.item;
Servis.renderServiceInputSelectors(s.masterCategoryId||'',s.serviceComponentId||'',s.actionType||'ganti');
document.getElementById('servisKm').value=s.km||'';
document.getElementById('servisCost').value=s.cost;
document.getElementById('servisNote').value=s.note||'';
if(servisAccEl&&s.accountId)servisAccEl.value=s.accountId;
Servis.populatePartSelect(s.usedPartId);
document.getElementById('servisPartQty').value=s.usedPartQty||1;
const catalogRefs=(typeof VehicleCatalogServisLink!=='undefined'&&VehicleCatalogServisLink&&typeof VehicleCatalogServisLink.getServisRefs==='function')?VehicleCatalogServisLink.getServisRefs(s.id):[];
const firstCatalogRef=catalogRefs&&catalogRefs[0];
Servis.populateCatalogPartSelect(firstCatalogRef?firstCatalogRef.catalogId:'');
document.getElementById('servisCatalogPartQty').value=firstCatalogRef?firstCatalogRef.qty:1;
Servis.renderCatalogRecommendations();

const linkedCat=(s.categoryId&&D.sparepartCats.find(c=>c.id===s.categoryId))||(typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(s.item,s.vehicleId||curVehicleId):D.sparepartCats.find(c=>c.name.toLowerCase()===s.item.toLowerCase()));
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
const matchStock=D.partsStock.find(p=>p.name.toLowerCase()===prefillItem.toLowerCase()||p.name.toLowerCase().includes(prefillItem.toLowerCase())||prefillItem.toLowerCase().includes(p.name.toLowerCase()));
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

findMatchingStockByCatalogId(catalogId){
if(!catalogId)return null;
return D.partsStock.find(p=>p.catalogId===catalogId)||null;
},

findMatchingStockByName(name){
const n=(name||'').trim().toLowerCase();
if(!n)return null;
return D.partsStock.find(p=>p.name.trim().toLowerCase()===n)||null;
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
wrap.innerHTML=Servis._photoDraft.map((src,i)=>`<div style="position:relative;width:64px;height:64px"><img src="${escapeHtml(src)}" style="width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--border2)"><button type="button" data-action="Servis.removePhoto" data-args='[${i}]' aria-label="Hapus foto" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;border:none;background:var(--accent2);color:#fff;font-size:11px;line-height:20px;text-align:center;padding:0;cursor:pointer">✕</button></div>`).join('');
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
  const snapshot={
    servisLogs:Array.isArray(D.servisLogs)?JSON.stringify(D.servisLogs):null,
    transactions:Array.isArray(D.transactions)?JSON.stringify(D.transactions):null,
    partsStock:Array.isArray(D.partsStock)?JSON.stringify(D.partsStock):null,
    sparepartCats:Array.isArray(D.sparepartCats)?JSON.stringify(D.sparepartCats):null
  };
  const restore=()=>{
    try{
      if(snapshot.servisLogs!==null)D.servisLogs=JSON.parse(snapshot.servisLogs);
      if(snapshot.transactions!==null)D.transactions=JSON.parse(snapshot.transactions);
      if(snapshot.partsStock!==null)D.partsStock=JSON.parse(snapshot.partsStock);
      if(snapshot.sparepartCats!==null)D.sparepartCats=JSON.parse(snapshot.sparepartCats);
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

const catalogStockMatch=catalogPartId?(Servis.findMatchingStockByCatalogId(catalogPartId)||Servis.findMatchingStockByName(catalogPartName)):null;
const catalogLinkedStockId=catalogStockMatch?catalogStockMatch.id:null;
const itemIsVehicleName=!!matchingVehicleName(item);

let catIdForLog=matched?matched.id:null;
if(Servis.editId!==null&&!matched){
  const existing=D.servisLogs.find(x=>x.id===Servis.editId);
  const oldCat=existing&&existing.categoryId?D.sparepartCats.find(c=>c.id===existing.categoryId):null;
  const sameItem=existing&&String(existing.item||'').trim().toLowerCase()===item.toLowerCase();
  if(oldCat&&sameItem)catIdForLog=oldCat.id;
}

const _preSaveChecklistPayload=(typeof ServisChecklist!=='undefined'&&typeof ServisChecklist.toLogPayload==='function')?ServisChecklist.toLogPayload():[];
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
const linkedCat=D.sparepartCats.find(c=>c.id===s.categoryId);
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

  save();
}catch(err){
  restore();

  try{save();}catch(_rollbackErr){console.error('P18: persisted edit rollback failed',_rollbackErr);}
  throw err;
}
closeModal('servisModal');renderCnTab();renderDashboard();renderKeuangan();Sparepart.renderStockList();Sparepart.renderCatList();refreshServiceReminderState();
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
  D.servisLogs.push({id:_rowIdx===0?servisId:uid(),sessionId:_serviceSessionId,vehicleId:curVehicleId,date,item:_rowItem,categoryId:_rowCategoryId,masterCategoryId:_rowMasterCategoryId,serviceComponentId:_row.serviceComponentId||null,actionType:_rowActionType,km,cost:_rowIdx===0?cost:0,note,accountId:accId,txLinkId:_rowIdx===0?txId:null,intervalKmAtService:_rowIv,intervalBulanAtService:_rowIb,nextDueKm:_rowNext.nextDueKm,nextDueDate:_rowNext.nextDueDate,nextDueAxis:_rowNext.nextDueAxis,usedPartId:_rowIdx===0?(usedPartId||null):null,usedPartQty:_rowIdx===0?(usedPartId?usedPartQty:0):0,catalogPartId:_rowIdx===0?(catalogPartId||null):null,catalogPartQty:_rowIdx===0?(catalogPartId?catalogPartQty:0):0,catalogPartOemCode:_rowIdx===0?(catalogPartId?catalogPartOemCode:''):'',catalogPartLinkedStockId:_rowIdx===0?(catalogLinkedStockId||null):null,foto:_rowIdx===0?Servis._photoDraft.slice():[],checklist:[_row]});
});

save();
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
closeModal('servisModal');renderCnTab();renderDashboard();renderKeuangan();Sparepart.renderStockList();Sparepart.renderCatList();refreshServiceReminderState();
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
save();Sparepart.renderCatList();Servis.renderList();toast('✅ Kategori pengingat ditambahkan');
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
  const before={
    servisLogs:Array.isArray(D.servisLogs)?JSON.stringify(D.servisLogs):null,
    transactions:Array.isArray(D.transactions)?JSON.stringify(D.transactions):null,
    partsStock:Array.isArray(D.partsStock)?JSON.stringify(D.partsStock):null
  };
  try{
    if(txIds.size)D.transactions=D.transactions.filter(tx=>!txIds.has(tx.id));
    logs.forEach(s=>{
      if(s.usedPartId)Servis.revertStockUsage(s.usedPartId,s.usedPartQty);
      if(s.catalogPartLinkedStockId)Servis.revertStockUsage(s.catalogPartLinkedStockId,s.catalogPartQty);
      if(s.autoGantiStockId)Servis.revertStockUsage(s.autoGantiStockId,1);
    });
    D.servisLogs=D.servisLogs.filter(x=>!x||x.sessionId!==sessionId);
    save();
    logs.forEach(s=>{
      if(typeof ServiceEventLifecycle!=='undefined'&&typeof ServiceEventLifecycle.remove==='function'){
        try{ServiceEventLifecycle.remove(s,{deletedTxId:s.txLinkId||null,categoryId:s.categoryId||null,vehicleId:s.vehicleId||null});}
        catch(err){console.error('V25: session service delete lifecycle failed; queued for reconciliation',err);if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'service.remove',payload:s,options:{deletedTxId:s.txLinkId||null,categoryId:s.categoryId||null,vehicleId:s.vehicleId||null}});}
      }
    });
  }catch(err){
    try{
      if(before.servisLogs!==null)D.servisLogs=JSON.parse(before.servisLogs);
      if(before.transactions!==null)D.transactions=JSON.parse(before.transactions);
      if(before.partsStock!==null)D.partsStock=JSON.parse(before.partsStock);
    }catch(restoreErr){console.error('P17: session service delete rollback failed',restoreErr);}
    console.error('P17: session service delete failed',err);
    toast('⚠️ Penghapusan sesi servis dibatalkan karena proses gagal');
    return;
  }
  renderCnTab();renderDashboard();renderKeuangan();Sparepart.renderStockList();refreshServiceReminderState();
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
const before={
  servisLogs:Array.isArray(D.servisLogs)?JSON.stringify(D.servisLogs):null,
  transactions:Array.isArray(D.transactions)?JSON.stringify(D.transactions):null,
  partsStock:Array.isArray(D.partsStock)?JSON.stringify(D.partsStock):null
};
try{
  if(deletedTxId)D.transactions=D.transactions.filter(tx=>tx.id!==deletedTxId);
  if(s.usedPartId)Servis.revertStockUsage(s.usedPartId,s.usedPartQty);
  if(s.catalogPartLinkedStockId)Servis.revertStockUsage(s.catalogPartLinkedStockId,s.catalogPartQty);

  if(s.autoGantiStockId)Servis.revertStockUsage(s.autoGantiStockId,1);

  D.servisLogs=D.servisLogs.filter(x=>x.id!==id);
  save();

  if(typeof ServiceEventLifecycle!=='undefined'&&typeof ServiceEventLifecycle.remove==='function'){
    try{ServiceEventLifecycle.remove(s,{deletedTxId,categoryId:s.categoryId||null,vehicleId:s.vehicleId||null});}
    catch(_lifecycleDeleteErr){console.error('V25: post-commit service delete lifecycle failed; queued for reconciliation',_lifecycleDeleteErr);if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'service.remove',payload:s,options:{deletedTxId,categoryId:s.categoryId||null,vehicleId:s.vehicleId||null}});}
  }
}catch(err){

  try{
    if(before.servisLogs!==null)D.servisLogs=JSON.parse(before.servisLogs);
    if(before.transactions!==null)D.transactions=JSON.parse(before.transactions);
    if(before.partsStock!==null)D.partsStock=JSON.parse(before.partsStock);
  }catch(restoreErr){console.error('P17: service delete rollback failed',restoreErr);}
  console.error('P17: service delete failed',err);
  toast('⚠️ Penghapusan servis dibatalkan karena proses gagal');
  return;
}
renderCnTab();renderDashboard();renderKeuangan();Sparepart.renderStockList();refreshServiceReminderState();
if(deletedTxId&&typeof AIBus!=='undefined'){try{AIBus.emit('finance.updated',{txId:deletedTxId,kind:'servis',action:'delete',deletedId:deletedTxId});}catch(_deleteFinanceEventErr){console.error('V32: finance delete event failed after commit; queued for reconciliation',_deleteFinanceEventErr);if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'finance.updated',payload:{txId:deletedTxId,kind:'servis',action:'delete',deletedId:deletedTxId}});}}
toast('🗑 Catatan servis dihapus');
};
if(typeof withServiceMutationLock==='function')return withServiceMutationLock(_runDelete);
return _runDelete();
},

_findAutoGantiStock(cat,vehicleId){
if(!cat||!Array.isArray(D.partsStock))return null;
const candidates=D.partsStock.filter(p=>p.catId===cat.id&&(typeof Sparepart!=='undefined'&&typeof Sparepart.isPartForVehicle==='function'?Sparepart.isPartForVehicle(p,vehicleId):true));
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

const _markDomainSnapshot={
  servisLogs:Array.isArray(D.servisLogs)?JSON.stringify(D.servisLogs):null,
  transactions:Array.isArray(D.transactions)?JSON.stringify(D.transactions):null,
  partsStock:Array.isArray(D.partsStock)?JSON.stringify(D.partsStock):null,
  sparepartCats:Array.isArray(D.sparepartCats)?JSON.stringify(D.sparepartCats):null
};
const _restoreMarkDomain=()=>{
  try{
    if(_markDomainSnapshot.servisLogs!==null)D.servisLogs=JSON.parse(_markDomainSnapshot.servisLogs);
    if(_markDomainSnapshot.transactions!==null)D.transactions=JSON.parse(_markDomainSnapshot.transactions);
    if(_markDomainSnapshot.partsStock!==null)D.partsStock=JSON.parse(_markDomainSnapshot.partsStock);
    if(_markDomainSnapshot.sparepartCats!==null)D.sparepartCats=JSON.parse(_markDomainSnapshot.sparepartCats);
  }catch(_markRollbackErr){console.error('V25: markServiced rollback failed',_markRollbackErr);}
};
const _runMarkMutation=async()=>{
const veh=D.vehicles.find(v=>v.id===curVehicleId);
const servisId=uid();
const _serviceSnapshot=(typeof buildServiceNextDueSnapshot==='function')?buildServiceNextDueSnapshot({vehicleId:curVehicleId,cat,serviceKm:curKm,serviceDate:date,actionType:actionType||null}):{nextDueKm:null,nextDueDate:null,nextDueAxis:null,intervalKmAtService:null,intervalBulanAtService:null};
const entry={id:servisId,vehicleId:curVehicleId,date,item:cat.name,categoryId:cat.id,masterCategoryId:cat.masterCategoryId||null,serviceComponentId:cat.serviceComponentId||null,km:curKm,cost,note:'Ditandai selesai dari Pengingat Servis',accountId:accId,txLinkId:null,actionType:actionType||null,batchId:opts.batchId||null,idempotencyKey:opts.idempotencyKey||(`reminder:${curVehicleId||''}:${cat.id}:${actionType||'default'}:${opts.batchId||servisId}`),intervalKmAtService:_serviceSnapshot.intervalKmAtService,intervalBulanAtService:_serviceSnapshot.intervalBulanAtService,nextDueKm:_serviceSnapshot.nextDueKm,nextDueDate:_serviceSnapshot.nextDueDate,nextDueAxis:_serviceSnapshot.nextDueAxis};
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
if(!opts._batchDeferSave){save();renderCnTab();renderDashboard();renderKeuangan();}

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
  _restoreMarkDomain();
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

const batchSnapshot={
  servisLogs:Array.isArray(D.servisLogs)?JSON.stringify(D.servisLogs):null,
  transactions:Array.isArray(D.transactions)?JSON.stringify(D.transactions):null,
  partsStock:Array.isArray(D.partsStock)?JSON.stringify(D.partsStock):null,
  sparepartCats:Array.isArray(D.sparepartCats)?JSON.stringify(D.sparepartCats):null
};
const restoreBatch=()=>{
  try{
    if(batchSnapshot.servisLogs!==null)D.servisLogs=JSON.parse(batchSnapshot.servisLogs);
    if(batchSnapshot.transactions!==null)D.transactions=JSON.parse(batchSnapshot.transactions);
    if(batchSnapshot.partsStock!==null)D.partsStock=JSON.parse(batchSnapshot.partsStock);
    if(batchSnapshot.sparepartCats!==null)D.sparepartCats=JSON.parse(batchSnapshot.sparepartCats);
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

    save();
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
const idx=D.sparepartCats.findIndex(c=>c.id===catId);
if(idx<0){toast('⚠️ Kategori sparepart tidak ditemukan');return;}
Sparepart.openCatModal(idx);
},
activeReminderMasterCategoryFilter:null,
activeReminderComponentFilter:'',

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
const curKm=getVehicleKm(curVehicleId);
const kmPerDay=estimateKmPerDay(curVehicleId);

const reminderCategoryPool=(typeof getReminderCategoriesForVehicle==='function')?getReminderCategoriesForVehicle(curVehicleId):D.sparepartCats;
const remindableCats=reminderCategoryPool.filter(c=>c.showInReminder!==false&&catVisibleForVehicle(c,curVehicleId)&&((c.intervalKm>0)||((typeof hasMaintenanceReminderSchedule==='function')&&hasMaintenanceReminderSchedule(curVehicleId,c))));
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
const nextAction=u&&u.nextAction&&u.nextAction!=='event_based'?u.nextAction:null;
const condition=u&&u.condition?u.condition:null;
const actionText=nextAction?((nextAction==='periksa'?'Periksa':'Ganti')+(condition?' — '+condition:'')):action;
const scheduleLabel=(u&&u.intervalHari&&u.limitingAxis==='hari')?`Setiap ${u.intervalHari} hari`:((effectiveIntervalKm!=null&&effectiveIntervalKm>0)?`Interval ${effectiveIntervalKm.toLocaleString('id-ID')} km`:'Berbasis kondisi/event');
const nextDueKm=u&&u.nextDueKm!=null?u.nextDueKm:null;
const nextDueDate=u&&u.nextDueDate?u.nextDueDate:null;
const dueLabel=nextDueKm!==null&&nextDueDate?`Berikutnya: ${nextDueKm.toLocaleString('id-ID')} km / ${fmtDateID(nextDueDate)}`:nextDueKm!==null?`Berikutnya: ${nextDueKm.toLocaleString('id-ID')} km`:nextDueDate?`Berikutnya: ${fmtDateID(nextDueDate)}`:'';

const historyLogsForSummary=Array.isArray(D.servisLogs)?D.servisLogs.filter(s=>s&&s.vehicleId===curVehicleId&&servisLogMatchesCat(s,cat)):[];
const historySummary=historyLogsForSummary.length?`${historyLogsForSummary.length} riwayat tercatat`:'Belum ada riwayat tercatat';
return{cat,lastKm:effectiveLastKm,intervalKm:effectiveIntervalKm,overridden,sisa,pct,col,msg,estLabel,action:actionText,nextAction,condition,historySummary,scheduleLabel,nextDueKm,nextDueDate,dueLabel,status};
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
          <span class="u-fw700">${escapeHtml(r.cat.name)} <span class="u-fs11 u-t2">✏️</span></span>
          <span class="${r.col} u-fw700">${r.msg}${r.estLabel}</span>
        </div>
        <div class="prog-bar"><div class="prog-fill ${r.col}" style="width:${r.pct}%"></div></div>
        ${r.action?`<div class="u-fs11 u-fw700 u-cacc" style="margin-top:2px">👉 ${escapeHtml(r.action)}</div>`:''}
        ${r.dueLabel?`<div class="u-fs11 u-t2" style="margin-top:2px">📅 ${escapeHtml(r.dueLabel)}</div>`:''}
        <div class="u-fs11 u-t2" style="margin-top:2px">🧾 ${escapeHtml(r.historySummary)}</div>
        <div class="u-flex u-jcb u-aic" style="margin-top:3px">
          <div class="u-fs12t2">${r.lastKm===null?'Belum pernah dicatat':'Terakhir di '+r.lastKm.toLocaleString('id-ID')+' km'} · ${r.cat._maintenanceProjection?`<span title="Aturan maintenance canonical">${escapeHtml(r.scheduleLabel)}</span>`:`<span data-action="editVehicleIntervalOverride" data-args="${escapeHtml(JSON.stringify([r.cat.id]))}" title="Set interval khusus kendaraan ini" class="u-pointer">${escapeHtml(r.scheduleLabel)}${r.overridden?' <span class="u-cacc u-fw700">(khusus)</span>':''} 🔧</span>`}</div>
          <div class="u-flex" style="gap:6px;flex-wrap:wrap;justify-content:flex-end">
          <button class="btn btn-ghost btn-sm u-fs12" style="padding:3px 10px" data-stop="1" data-action="Servis.openHistoryFromReminder" data-args="${escapeHtml(JSON.stringify([r.cat.id,r.cat.serviceComponentId||null]))}">🧾 Riwayat</button>
          <button class="btn btn-ghost btn-sm u-fs12" style="padding:3px 10px" data-stop="1" data-action="markSparepartServiced" data-args="${escapeHtml(JSON.stringify([r.cat.id]))}">✅ Sudah Servis</button>
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
Servis.activeActionTypeFilter=type||null;
Servis.listPage=1;
Servis.renderList();
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
renderList(){
Servis.renderReminder();

Servis._loadMasterCategoryFilterPrefsOnce();
const {from,to}=getCnRange();

const filterSig=curVehicleId+'|'+(+from)+'|'+(+to)+'|'+Servis.activeActionTypeFilter+'|'+Servis.activeMasterCategoryFilter+'|'+Servis.activeServiceComponentFilter;
if(filterSig!==Servis.lastFilterSig){Servis.listPage=1;Servis.lastFilterSig=filterSig;}

const isUncategorizedFilter=typeof UNCATEGORIZED_FILTER_ID!=='undefined'&&Servis.activeMasterCategoryFilter===UNCATEGORIZED_FILTER_ID;
const logs=D.servisLogs.filter(s=>{const ds=typeof parseServiceDateOnly==='function'?parseServiceDateOnly(s.date):null;const fromDay=new Date(from.getFullYear(),from.getMonth(),from.getDate());const toDay=new Date(to.getFullYear(),to.getMonth(),to.getDate());return s.vehicleId===curVehicleId&&ds&&ds>=fromDay&&ds<=toDay&&(!Servis.activeActionTypeFilter||(s.actionType||'ganti')===Servis.activeActionTypeFilter)&&(!Servis.activeMasterCategoryFilter||(isUncategorizedFilter?Servis.resolveLogMasterCategoryId(s)==null:Servis.resolveLogMasterCategoryId(s)===Servis.activeMasterCategoryFilter))&&(!Servis.activeServiceComponentFilter||Servis.resolveLogServiceComponentId(s)===Servis.activeServiceComponentFilter);}).sort(typeof compareServiceHistoryRecency==='function'?compareServiceHistoryRecency:(a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.km)-Number(a.km));
const totalCost=logs.reduce((s,x)=>s+(x.cost||0),0);
const lastKm=logs.reduce((m,x)=>x.km&&x.km>m?x.km:m,0);
document.getElementById('servisCount').textContent=logs.length;
document.getElementById('servisTotalCost').textContent=fmt(totalCost);
document.getElementById('servisLastKm').textContent=lastKm?lastKm.toLocaleString('id-ID')+' km':'-';
const el=document.getElementById('servisList');
Servis.renderOdometerIntegrityBadge(el);
Servis.renderActionTypeChips(el);

Servis.renderMasterCategoryChips(el);
Servis.renderServiceComponentFilter(el);
if(!logs.length){

const emptyText=Servis.activeMasterCategoryFilter?'Tidak ada catatan servis utk kategori master ini':'Belum ada catatan servis';
el.innerHTML=`<div class="empty"><div class="empty-icon">🔧</div><div class="empty-text">${escapeHtml(emptyText)}</div></div>`;
return;
}
const visibleCount=Math.min(logs.length,Servis.listPage*TX_PAGE_SIZE);
const visible=logs.slice(0,visibleCount);

const historyGroups=[]; const historyGroupMap=new Map();
visible.forEach(s=>{
  const key=s.sessionId?`session:${s.sessionId}`:`single:${s.id}`;
  let g=historyGroupMap.get(key);
  if(!g){g={key,sessionId:s.sessionId||null,logs:[]};historyGroupMap.set(key,g);historyGroups.push(g);}
  g.logs.push(s);
});
const renderHistoryItem=s=>{
const part=s.usedPartId?D.partsStock.find(p=>p.id===s.usedPartId):null;
const partInfo=part?` · 📦 ${s.usedPartQty}${part.unit?' '+escapeHtml(part.unit):''} ${escapeHtml(part.name)}`:'';
const checklistSummary=(typeof ServisChecklist!=='undefined'&&typeof ServisChecklist.summaryFromLog==='function')?ServisChecklist.summaryFromLog(s):null;
const checklistInfo=checklistSummary&&checklistSummary.checked?`<span class="servis-history-badge servis-history-check">☑️ ${checklistSummary.checked}/${checklistSummary.total}</span>${(checklistSummary.replaced||checklistSummary.inspected)?`<span class="servis-history-badge servis-history-replaced">🔧 ${checklistSummary.replaced} diganti</span><span class="servis-history-badge servis-history-inspected">🔍 ${checklistSummary.inspected} diperiksa</span>`:''}`:'';
const fotoInfo=s.foto&&s.foto.length?`<span class="servis-history-badge servis-history-photo">📷 ${s.foto.length}</span>`:'';
const linkedCat=(s.categoryId&&D.sparepartCats.find(c=>c&&c.id===s.categoryId&&(!c.vehicleId||c.vehicleId===curVehicleId)))||(typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(s.item,curVehicleId):null);
const linkedIntervalKm=linkedCat&&typeof getEffectiveIntervalKm==='function'?getEffectiveIntervalKm(curVehicleId,linkedCat):(linkedCat&&linkedCat.intervalKm>0?linkedCat.intervalKm:null);
const linkedIntervalBulan=linkedCat&&typeof getEffectiveIntervalBulan==='function'?getEffectiveIntervalBulan(linkedCat,curVehicleId):(linkedCat&&linkedCat.intervalBulan>0?linkedCat.intervalBulan:null);
const linkedReminderInfo=linkedCat&&linkedIntervalKm>0?`<span class="servis-history-badge servis-history-reminder" title="Terhubung ke Pengingat Servis: kategori dan interval dibaca dari sumber yang sama">🔔 ${escapeHtml(linkedCat.name)} · ${linkedIntervalKm.toLocaleString('id-ID')} km${linkedIntervalBulan?` / ${linkedIntervalBulan.toLocaleString('id-ID')} bln`:''}</span>`:(s.categoryId?`<span class="servis-history-badge servis-history-reminder-missing" title="Kategori servis ada, tetapi interval Pengingat belum aktif untuk kendaraan ini">⚠️ Pengingat belum aktif</span>`:'');
const fotoThumb=s.foto&&s.foto.length?`<button type="button" class="servis-history-photo-thumb" data-stop="1" data-action="Servis.openHistoryPhoto" data-args="${escapeHtml(JSON.stringify([s.id,0]))}" aria-label="Buka foto servis"><img src="${s.foto[0]}" alt="" loading="lazy" decoding="async" width="38" height="38" style="width:38px;height:38px;object-fit:cover;border-radius:var(--r-lg);border:1px solid var(--border2);flex-shrink:0"></button>`:'';
const fotoOrIcon=fotoThumb||`<div class="tx-icon u-bgaccsoft">🔧</div>`;
return `<div class="tx-item servis-history-item ${s.sessionId?'servis-history-session-item':''} u-pointer" data-action="openServisModal" data-args="${escapeHtml(JSON.stringify([s.id]))}">${fotoOrIcon}<div class="tx-info servis-history-info"><div class="tx-name servis-history-title">${escapeHtml(s.item)}</div><div class="tx-meta servis-history-primary">${s.date}${s.km?' · '+s.km.toLocaleString('id-ID')+' km':''}</div>${s.note?`<div class="servis-history-note">${escapeHtml(s.note)}</div>`:''}<div class="servis-history-badges">${partInfo?`<span class="servis-history-badge servis-history-part">${partInfo.replace(/^ · /,'')}</span>`:''}${s.batchId?`<span class="servis-history-badge servis-history-batch">🔗 batch</span>`:''}${linkedReminderInfo}${checklistInfo}${fotoInfo}</div></div><div class="tx-amount red servis-history-amount">${fmt(s.cost)}</div><button class="tx-del servis-history-delete" data-stop="1" data-action="delServis" data-args="${escapeHtml(JSON.stringify([s.id]))}" aria-label="Hapus">🗑</button></div>`;
};
el.innerHTML=historyGroups.map(g=>{
  if(g.logs.length===1)return renderHistoryItem(g.logs[0]);
  const first=g.logs[0], total=g.logs.reduce((n,x)=>n+(x.cost||0),0);
  const names=g.logs.map(x=>x.item).filter(Boolean);
  const summary=names.slice(0,3).join(', ')+(names.length>3?` +${names.length-3}`:'');
  const groupId=`servis-session-${escapeHtml(String(g.sessionId).replace(/[^a-zA-Z0-9_-]/g,'_'))}`;
  return `<details class="servis-history-session" id="${groupId}"><summary class="tx-item servis-history-session-summary"><div class="tx-icon u-bgaccsoft">🔧</div><div class="tx-info servis-history-info"><div class="tx-name servis-history-title">Servis ${escapeHtml(first.date||'')} — ${g.logs.length} komponen</div><div class="tx-meta servis-history-primary">${escapeHtml(summary)}</div><div class="servis-history-badges"><span class="servis-history-badge servis-history-batch">🔗 sesi ${escapeHtml(String(g.sessionId).slice(-8))}</span></div></div><div class="tx-amount red servis-history-amount">${fmt(total)}</div><button type="button" class="tx-del servis-history-delete" data-stop="1" data-action="Servis.delSession" data-args="${escapeHtml(JSON.stringify([g.sessionId]))}" aria-label="Hapus seluruh sesi servis">🗑</button></summary><div class="servis-history-session-body">${g.logs.map(renderHistoryItem).join('')}</div></details>`;
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
};

if (typeof Servis !== 'undefined') window.Servis = Servis;
