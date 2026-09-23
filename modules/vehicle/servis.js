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
resolveServiceSOT(log,opts){
  const row=log||{};
  const selection=Servis.resolveCanonicalServiceSelection(row);
  const vehicleId=(opts&&opts.vehicleId)||row.vehicleId||(typeof curVehicleId!=='undefined'?curVehicleId:null);
  const result={
    vehicleId:vehicleId||null,
    masterCategoryId:selection.masterCategoryId||null,
    categoryName:selection.group&&selection.group.group?selection.group.group:null,
    serviceComponentId:selection.serviceComponentId||null,
    componentName:selection.component&&selection.component.name?selection.component.name:null,
    catalogPartId:row.catalogPartId||null,
    part:null,
    partCandidates:[],
    partResolution:'none'
  };
  // Part identity is ID-first. Never infer a catalog part from a similar name.
  if(result.catalogPartId&&typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.getAll==='function'){
    const finish=(items)=>{
      const all=Array.isArray(items)?items:[];
      const hit=all.find(it=>it&&String(it.id)===String(result.catalogPartId));
      if(!hit){result.catalogPartId=null;result.partResolution='invalid';return result;}
      const compatible=typeof VehicleCatalog.filterForVehicle==='function'
        ?VehicleCatalog.filterForVehicle([hit],vehicleId)
        :[hit];
      if(!compatible.length){result.catalogPartId=null;result.partResolution='invalid-scope';return result;}
      result.part=hit;result.partResolution='linked';return result;
    };
    const all=VehicleCatalog.getAll();
    if(all&&typeof all.then==='function')return all.then(finish);
    return finish(all);
  }
  return result;
},
resolveServiceSOTPartCandidates(items,vehicleId,serviceComponentId){
  const list=Array.isArray(items)?items:[];
  const cid=String(serviceComponentId||'');
  if(!cid)return [];
  const scoped=typeof VehicleCatalog!=='undefined'&&typeof VehicleCatalog.filterForVehicle==='function'
    ?VehicleCatalog.filterForVehicle(list,vehicleId):list;
  return scoped.filter(it=>{
    const ids=Array.isArray(it&&it.serviceComponentIds)?it.serviceComponentIds:(Array.isArray(it&&it.componentIds)?it.componentIds:[]);
    return ids.some(id=>String(id)===cid)||String(it&&it.serviceComponentId||'')===cid;
  });
},
validateServiceSOTIntegrity(log,opts){
  const row=log||{};
  const selection=Servis.resolveCanonicalServiceSelection(row);
  const issues=[];
  if(row.serviceComponentId&&selection.serviceComponentId!==String(row.serviceComponentId))issues.push('service-component-invalid');
  if(row.masterCategoryId&&selection.masterCategoryId&&String(row.masterCategoryId)!==String(selection.masterCategoryId))issues.push('master-category-component-mismatch');
  if(row.catalogPartId&&typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.getAll==='function'){
    const vehicleId=(opts&&opts.vehicleId)||row.vehicleId||(typeof curVehicleId!=='undefined'?curVehicleId:null);
    const check=(items)=>{
      const hit=(Array.isArray(items)?items:[]).find(it=>it&&String(it.id)===String(row.catalogPartId));
      if(!hit)issues.push('catalog-part-missing');
      else if(typeof VehicleCatalog.filterForVehicle==='function'&&!VehicleCatalog.filterForVehicle([hit],vehicleId).length)issues.push('catalog-part-out-of-scope');
      return {ok:issues.length===0,issues};
    };
    const items=VehicleCatalog.getAll();
    if(items&&typeof items.then==='function')return items.then(check);
    return check(items);
  }
  return {ok:issues.length===0,issues};
},
resolveCanonicalServiceSelection(s){
const log=s||{};
let master=log.masterCategoryId||'';
let component=log.serviceComponentId||'';
let hit=null;
if(component&&typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.itemById==='function'){
  hit=ServiceInputCatalog.itemById(component);
  if(hit&&hit.group)master=hit.group.masterCategoryId;
}
if((!master||!component)&&typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.infer==='function'){
  const inf=ServiceInputCatalog.infer(log.item||'');
  if(inf){if(!master&&inf.group)master=inf.group.masterCategoryId;if(!component&&inf.item)component=inf.item.id;if(!hit&&inf.item)hit=inf;}
}
return {masterCategoryId:master||'',serviceComponentId:component||'',component:hit&&hit.item?hit.item:null,group:hit&&hit.group?hit.group:null};
},
setEditCanonicalSelection(masterCategoryId,componentId){
const master=String(masterCategoryId||'');
const component=String(componentId||'');
Servis._editSotMasterCategoryId=master;
Servis._editSotServiceComponentId=component;
},
syncVisibleServiceSotSelectors(){
if(typeof ServiceInputCatalog==='undefined')return;
const hiddenCat=document.getElementById('servisCategory');
const hiddenComp=document.getElementById('servisComponent');
const cat=document.getElementById('servisCategorySot');
const comp=document.getElementById('servisComponentSot');
if(!cat||!comp)return;
ServiceInputCatalog.populateCategorySelect(cat,hiddenCat?.value||'');
ServiceInputCatalog.populateComponentSelect(comp,hiddenCat?.value||'',hiddenComp?.value||'');
},
onServiceCategorySotChange(){
const visible=document.getElementById('servisCategorySot');
const hidden=document.getElementById('servisCategory');
if(hidden)hidden.value=visible?.value||'';
Servis.onServiceCategoryChange();
},
onServiceComponentSotChange(){
const visible=document.getElementById('servisComponentSot');
const hidden=document.getElementById('servisComponent');
if(hidden)hidden.value=visible?.value||'';
Servis.onServiceComponentChange();
},
renderEditCanonicalSelectors(panel,selection,opts){
if(!panel||typeof ServiceInputCatalog==='undefined')return '';
opts=opts||{};
const sel=selection||{};
const master=String(sel.masterCategoryId||'');
const component=String(sel.serviceComponentId||'');
const groups=ServiceInputCatalog.groups()||[];
const g=master?ServiceInputCatalog.groupById(master):null;
const comps=g?(g.items||[]):[];
const disabled=opts.disabled===true;
const prefix=opts.prefix||'servisEditSot';
return `<div class="fg" id="${prefix}Wrap"><label class="fl">Kategori Servis <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text3)">(SOT)</span></label><select class="fs" id="${prefix}Category" ${disabled?'disabled':''}><option value="">— Pilih kategori servis —</option>${groups.map(x=>`<option value="${escapeHtml(x.masterCategoryId)}"${x.masterCategoryId===master?' selected':''}>${escapeHtml(x.group)}</option>`).join('')}</select><label class="fl" style="margin-top:8px">Komponen Servis <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text3)">(SOT)</span></label><select class="fs" id="${prefix}Component" ${disabled?'disabled':''}><option value="">${master?'— Pilih komponen servis —':'Pilih kategori dulu'}</option>${comps.map(x=>`<option value="${escapeHtml(x.id)}"${x.id===component?' selected':''}>${escapeHtml(x.name)}</option>`).join('')}</select></div>`;
},
_applyDetailSotSelection(masterCategoryId,componentId){
const catEl=document.getElementById('servisCategory');
const compEl=document.getElementById('servisComponent');
const itemEl=document.getElementById('servisItem');
if(typeof ServiceInputCatalog==='undefined')return;
const master=String(masterCategoryId||'');
const component=String(componentId||'');
ServiceInputCatalog.populateCategorySelect(catEl,master);
ServiceInputCatalog.populateComponentSelect(compEl,master,component);
if(component)ServiceInputCatalog.onComponentChange(compEl,catEl,itemEl);
else if(itemEl&&master&&!component)itemEl.value='';
Servis._serviceChecklistMasterCategoryIds=master?[master]:[];
const first=master&&typeof ServisChecklist!=='undefined'?ServisChecklist.findGroupByMasterCategoryId(master):null;
Servis._serviceChecklistGroupIdx=first?first.groupIdx:null;
Servis.setEditCanonicalSelection(master,component);
Servis.renderServiceMasterCategoryChips();
Servis.renderServiceChecklist();
Servis.syncServiceActionType(document.getElementById('servisActionType')?.value||'');
Servis.onItemAutofillInterval();
},
_currentCheckedChecklistItem(){
if(typeof ServisChecklist==='undefined'||typeof ServisChecklist.findCheckedItemForService!=='function')return null;
const compId=document.getElementById('servisComponent')?.value||'';
const item=document.getElementById('servisItem')?.value||'';
return ServisChecklist.findCheckedItemForService(compId,item);
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
  const vehicleId=curVehicleId;
  const logs=Array.isArray(D.servisLogs)?D.servisLogs:[];
  const linkedCat=(D.sparepartCats||[]).find(c=>c&&c.id===categoryId)||null;
  const group=linkedCat&&typeof resolveCatGroup==='function'?resolveCatGroup(linkedCat,vehicleId):null;
  const masterId=group&&group.masterCategoryId?group.masterCategoryId:(linkedCat&&linkedCat.masterCategoryId?linkedCat.masterCategoryId:null);
  componentId=componentId||linkedCat&&linkedCat.serviceComponentId||null;
  const resolveLogComponent=log=>log&&log.serviceComponentId||(typeof Servis.resolveLogServiceComponentId==='function'?Servis.resolveLogServiceComponentId(log):null);
  const sameTarget=log=>{
    if(!log||String(log.vehicleId)!==String(vehicleId))return false;
    const logComponent=resolveLogComponent(log);
    if(componentId&&logComponent)return String(componentId)===String(logComponent);
    if(categoryId&&log&&log.categoryId)return String(categoryId)===String(log.categoryId);
    return linkedCat&&typeof servisLogMatchesCat==='function'?servisLogMatchesCat(log,linkedCat):String(log&&log.item||'').trim().toLowerCase()===String(linkedCat&&linkedCat.name||'').trim().toLowerCase();
  };
  const history=logs.filter(sameTarget).slice().sort((a,b)=>typeof compareServiceHistoryRecency==='function'?compareServiceHistoryRecency(a,b):String(b.date||'').localeCompare(String(a.date||''))||Number(b.km||0)-Number(a.km||0)||String(b.id||'').localeCompare(String(a.id||'')));
  const resetFilter=linkedCat&&typeof resolveResetActionTypeFilter==='function'?resolveResetActionTypeFilter(linkedCat):null;
  const matchesReset=log=>typeof Servis._matchesActionTypeForReset==='function'?Servis._matchesActionTypeForReset(log,linkedCat,resetFilter,true):(!resetFilter||(log.actionType||'ganti')===resetFilter);
  const target=history.find(matchesReset)||history[0]||null;
  const _periodeBerubah=cnPeriode!=='selamanya';
  if(typeof cnPeriode!=='undefined')cnPeriode='selamanya';
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
  Servis.activeActionTypeFilter=null;
  Servis.activeMasterCategoryFilter=masterId||null;
  Servis.activeServiceComponentFilter=componentId||null;
  Servis.listPage=1;
  if(!target){
    if(typeof toast==='function')toast('ℹ️ Belum ada riwayat servis untuk komponen ini.');
    Servis._saveMasterCategoryFilterPrefs();
    Servis.renderList();
    const anchor=document.getElementById('servisHistoryCard')||document.getElementById('servisList');
    if(anchor&&typeof anchor.scrollIntoView==='function')anchor.scrollIntoView({behavior:'smooth',block:'start'});
    return null;
  }
  // SOT navigation: Pengingat hanya memilih service-log sumber yang canonical.
  // Presenter/editor tetap satu: Edit Catatan Servis → tab Riwayat.
  Servis.openModal(target.id);
  Servis.setEditTab('history');
  return target.id;
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
VehicleCatalog.getAll().then(async items=>{
const filtered=VehicleCatalog.filterForVehicle(items,typeof curVehicleId!=='undefined'?curVehicleId:null);
const list=(filtered||[]).some(it=>it.id===selectedCatalogId)||!selectedCatalogId?filtered:filtered.concat((items||[]).filter(it=>it.id===selectedCatalogId));
const opts=(list||[]).map(it=>`<option value="${escapeHtml(it.id)}" data-oem="${escapeHtml(it.oemCode||'')}" data-name="${escapeHtml(it.partName||'')}">${escapeHtml(it.partName||'(Tanpa nama)')}${it.oemCode?' — '+escapeHtml(it.oemCode):''}</option>`).join('');
sel.innerHTML='<option value="">Tidak pakai part katalog</option>'+opts;
sel.value=selectedCatalogId||'';
if(typeof VehiclePartSOT!=='undefined'&&VehiclePartSOT&&typeof VehiclePartSOT.enhanceServiceCatalogSelect==='function'){
  try{await VehiclePartSOT.enhanceServiceCatalogSelect();}catch(_e){console.warn('VehiclePartSOT service picker enhancement skipped',_e);}
  if(selectedCatalogId&&Array.from(sel.options||[]).some(o=>String(o.value)===String(selectedCatalogId)))sel.value=selectedCatalogId;
}
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

openServiceChecklistIdentityEditor(groupIdx,itemIdx){
if(typeof ServisChecklist==='undefined')return;
const found=ServisChecklist._item(Number(groupIdx),Number(itemIdx));
if(!found)return;
const identity=ServisChecklist.getItemIdentity(found.id)||{};
const groups=typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.groups==='function'?ServiceInputCatalog.groups():[];
const box=document.getElementById('serviceChecklistIdentityEditor');if(box)box.remove();
const catOptions=groups.map(g=>`<option value="${escapeHtml(String(g.masterCategoryId))}"${String(g.masterCategoryId)===String(identity.masterCategoryId||'')?' selected':''}>${escapeHtml(g.group||g.masterCategoryId)}</option>`).join('');
const comps=typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.groupById==='function'&&identity.masterCategoryId?(ServiceInputCatalog.groupById(identity.masterCategoryId)?.items||[]):[];
const compOptions=()=>`<option value="">— Pilih komponen servis —</option>${comps.map(c=>`<option value="${escapeHtml(String(c.id))}"${String(c.id)===String(identity.serviceComponentId||'')?' selected':''}>${escapeHtml(c.name||c.label||c.id)}</option>`).join('')}`;
const render=()=>{const cat=document.getElementById('serviceChecklistIdentityCategory');const comp=document.getElementById('serviceChecklistIdentityComponent');const g=cat&&typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.groupById==='function'?ServiceInputCatalog.groupById(cat.value):null;const items=g&&Array.isArray(g.items)?g.items:[];if(comp){const prev=comp.value;comp.innerHTML='<option value="">— Pilih komponen servis —</option>'+items.map(c=>`<option value="${escapeHtml(String(c.id))}">${escapeHtml(c.name||c.label||c.id)}</option>`).join('');if(prev&&items.some(c=>String(c.id)===prev))comp.value=prev;} };
box=document.createElement('div');box.id='serviceChecklistIdentityEditor';box.className='overlay open';box.style.cssText='z-index:460;position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;';
box.innerHTML=`<div class="modal" style="width:100%;max-width:520px;box-sizing:border-box;margin:0 auto;max-height:100dvh;overflow-y:auto"><div class="modal-title"><span>✏️ Edit Identitas Checklist</span><button class="modal-close" data-action="Servis.closeServiceChecklistIdentityEditor">✕</button></div><div class="u-fs11 u-t2" style="margin-bottom:10px">${escapeHtml(found.name||found.item?.name||'Item')} — ubah identitas SOT tanpa mengubah nama item master.</div><div class="fg"><label class="fl">Kategori Servis (SOT)</label><select class="fs" id="serviceChecklistIdentityCategory" data-onchange="Servis.syncServiceChecklistIdentityComponent">${catOptions}</select></div><div class="fg"><label class="fl">Komponen Servis (SOT)</label><select class="fs" id="serviceChecklistIdentityComponent">${compOptions()}</select></div><div class="u-fs11 u-t2" style="line-height:1.5;margin:8px 0 12px">Identitas ini disimpan di snapshot checklist riwayat. Tidak membuat taxonomy baru.</div><div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn btn-ghost" data-action="Servis.closeServiceChecklistIdentityEditor">Batal</button><button type="button" class="btn btn-primary" data-action="Servis.commitServiceChecklistIdentityEditor" data-args="${escapeHtml(JSON.stringify([found.id]))}">Simpan</button></div></div>`;
document.body.appendChild(box);},
syncServiceChecklistIdentityComponent(){
const cat=document.getElementById('serviceChecklistIdentityCategory');const comp=document.getElementById('serviceChecklistIdentityComponent');if(!cat||!comp||typeof ServiceInputCatalog==='undefined'||typeof ServiceInputCatalog.groupById!=='function')return;const g=ServiceInputCatalog.groupById(cat.value||'');const items=g&&Array.isArray(g.items)?g.items:[];comp.innerHTML='<option value="">— Pilih komponen servis —</option>'+items.map(c=>`<option value="${escapeHtml(String(c.id))}">${escapeHtml(c.name||c.label||c.id)}</option>`).join('');},
commitServiceChecklistIdentityEditor(itemId){
const cat=document.getElementById('serviceChecklistIdentityCategory')?.value||'';const comp=document.getElementById('serviceChecklistIdentityComponent')?.value||'';const r=ServisChecklist.setItemIdentity(itemId,cat,comp);if(!r.ok){toast('⚠️ '+r.reason);return;}Servis.closeServiceChecklistIdentityEditor();Servis.renderServiceChecklist();toast('✅ Identitas checklist diperbarui; simpan catatan untuk menerapkan ke riwayat.');},
closeServiceChecklistIdentityEditor(){const box=document.getElementById('serviceChecklistIdentityEditor');if(box)box.remove();},
openServiceChecklistJobTypeEditor(){
const current=document.getElementById('servisJobType')?.value||'';Servis.ensureServiceJobTypeUI(current);const sel=document.getElementById('servisJobType');if(sel){sel.scrollIntoView({behavior:'smooth',block:'center'});sel.focus();}toast('🔧 Pilih Jenis Pekerjaan pada form Detail, lalu simpan.');},
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
    const identity=typeof ServisChecklist.getItemIdentity==='function'?ServisChecklist.getItemIdentity(it.id):null;
    const identityLabel=identity&&identity.serviceComponentId&&typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.itemById==='function'?(ServiceInputCatalog.itemById(identity.serviceComponentId)?.item?.name||identity.serviceComponentId):'';
    const identityButton=checked?`<button type="button" class="btn btn-ghost btn-sm" data-action="Servis.openServiceChecklistIdentityEditor" data-args="${escapeHtml(JSON.stringify([gi,ii]))}">✏️ Identitas</button>`:'';
    const linkedCat=it.linkCat===true;
    const resolvedCat=linkedCat&&typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(it.name,ServisChecklist._vehicleId||curVehicleId):null;
    const missingCatBadge=linkedCat&&!resolvedCat?`<span class="sc-cat-warning" title="Kategori sparepart belum tersedia untuk kendaraan ini">⚠️ kategori belum ada</span>`:'';
    return `<div style="display:flex;gap:8px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--border2);opacity:${notApplicable?'.55':'1'}"><button type="button" class="btn ${checked?'btn-primary':'btn-ghost'} btn-sm" style="min-width:72px" data-action="Servis.toggleServiceChecklistItem" data-args="${escapeHtml(JSON.stringify([gi,ii]))}" ${notApplicable?'disabled':''}>${checked?'✓ Selesai':notApplicable?'⊘ Tidak berlaku':'○ Cek'}</button><div style="flex:1;min-width:0"><div class="u-fw700 u-fs12">${escapeHtml(it.name)} ${missingCatBadge}</div><div class="u-fs11 u-t2">${escapeHtml(it.intervalLabel||'Tanpa interval rutin')}</div>${recommendationHtml}${checked&&action?`<div class="u-fs11 u-cacc">Tindakan: ${escapeHtml(action)}</div>`:''}${resultHtml}${conditionNote}${checked&&reason?`<div class="u-fs10 u-t2" style="margin-top:3px">💡 ${escapeHtml(reason)}</div>`:''}${identityLabel?`<div class="u-fs10 u-t2" style="margin-top:4px">SOT: ${escapeHtml(identityLabel)}</div>`:''}${actionButtons?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${actionButtons}</div>`:''}<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${naButton}${identityButton}</div></div></div>`;
  }).join('');
  return `<details class="sc-group" open style="background:var(--surface3);border:1px solid var(--border2);border-radius:12px;padding:0 12px;margin-bottom:10px"><summary style="cursor:pointer;padding:12px 0;font-weight:700;display:flex;justify-content:space-between;gap:8px"><span>${escapeHtml(group.group)}</span><span class="chip active">${ServisChecklist.checkedCount(gi)}/${groupItems.length}</span></summary><div style="padding-bottom:4px"><div style="font-size:11px;color:var(--text2);margin-bottom:6px">Centang yang benar-benar dikerjakan. Rekomendasi hanya saran; tindakan dan hasil tetap dapat diubah manual.</div>${rows}</div></details>`;
}).join('');
const checked=Object.keys(ServisChecklist._checked||{}).length;
const na=Object.keys(ServisChecklist._notApplicable||{}).length;
const total=groups.reduce((n,g)=>n+ServisChecklist.itemsOfGroup(g.group).length,0);
box.innerHTML=`<div style="margin-bottom:8px"><div class="u-fw700 u-fs12">☑️ Checklist Komponen Servis</div><div class="u-fs11 u-t2">${groups.length} kategori aktif · ${checked}/${total} dikerjakan${na?` · ${na} tidak berlaku`:''}. Manual override tersedia.</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px"><button type="button" class="btn btn-ghost btn-sm" data-action="Servis.openServiceChecklistJobTypeEditor">🔧 Jenis Pekerjaan</button><span class="u-fs10 u-t2" style="align-self:center">Jenis pekerjaan berlaku pada catatan servis; identitas komponen diatur per item.</span></div></div>${cards}`;
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
syncServiceFormFromChecklist(itemId,opts){
const found=typeof ServisChecklist!=='undefined'&&typeof ServisChecklist.findItemById==='function'?ServisChecklist.findItemById(itemId):null;
if(!found||!ServisChecklist._checked||ServisChecklist._checked[itemId]===undefined)return false;
const result=ServisChecklist._results&&ServisChecklist._results[itemId]||'';
const note=ServisChecklist._conditionNotes&&ServisChecklist._conditionNotes[itemId]||'';
const condEl=document.getElementById('servisConditionResult');
const noteEl=document.getElementById('servisConditionNote');
if(!opts||!opts.noteOnly){
  if(condEl)condEl.value=result;
  Servis.syncServiceActionType(ServisChecklist._checked[itemId]||'');
}
if(noteEl)noteEl.value=note;
return true;
},
syncChecklistFromServiceForm(kind){
const found=Servis._currentCheckedChecklistItem();
if(!found||typeof ServisChecklist==='undefined')return false;
const itemId=found.item.id;
let changed=false;
if(kind==='action'||!kind){
  const action=document.getElementById('servisActionType')?.value||'';
  if(action&&ServisChecklist._checked[itemId]!==action){
    const r=ServisChecklist.setActionTypeByItemId(itemId,action);
    changed=changed||(!!(r&&r.ok));
  }
}
if(kind==='condition'||!kind){
  const result=document.getElementById('servisConditionResult')?.value||'';
  const r=ServisChecklist.setConditionResultByItemId(itemId,result);
  changed=changed||(!!(r&&r.ok));
}
if(kind==='note'||!kind){
  const note=document.getElementById('servisConditionNote')?.value||'';
  const r=ServisChecklist.setConditionNoteByItemId(itemId,note);
  changed=changed||(!!(r&&r.ok));
}
if(changed&&kind!=='note')Servis.renderServiceChecklist();
return changed;
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
onServiceActionTypeChange(){
const selected=document.getElementById('servisActionType')?.value||'';
Servis.syncChecklistFromServiceForm('action');
Servis.syncServiceActionType(selected);
const el=document.getElementById('servisActionType'); if(el&&selected)el.value=selected;
},
onServiceConditionResultChange(){
Servis.syncChecklistFromServiceForm('condition');
Servis.syncServiceActionType(document.getElementById('servisActionType')?.value||'');
},
onServiceConditionNoteChange(){
Servis.syncChecklistFromServiceForm('note');
},
onServiceCategoryChange(){
if(typeof ServiceInputCatalog==='undefined')return;
const catEl=document.getElementById('servisCategory');
const compEl=document.getElementById('servisComponent');
const itemEl=document.getElementById('servisItem');
ServiceInputCatalog.onCategoryChange(catEl,compEl,itemEl);
const master=catEl?.value||'';
Servis._serviceChecklistMasterCategoryIds=master?[master]:[];
const first=master&&typeof ServisChecklist!=='undefined'?ServisChecklist.findGroupByMasterCategoryId(master):null;
Servis._serviceChecklistGroupIdx=first?first.groupIdx:null;
Servis.setEditCanonicalSelection(master,'');
Servis.renderServiceMasterCategoryChips();
Servis.renderServiceChecklist();
Servis.populateCatalogPartSelect('');
Servis.syncServiceActionType();
Servis.onItemAutofillInterval();
if(typeof Servis.syncVisibleServiceSotSelectors==='function')Servis.syncVisibleServiceSotSelectors();
},
onServiceComponentChange(){
if(typeof ServiceInputCatalog==='undefined')return;
const compEl=document.getElementById('servisComponent');
const catEl=document.getElementById('servisCategory');
const itemEl=document.getElementById('servisItem');
const hit=ServiceInputCatalog.onComponentChange(compEl,catEl,itemEl);
const master=catEl?.value||hit?.group?.masterCategoryId||'';
const component=compEl?.value||hit?.item?.id||'';
Servis._serviceChecklistMasterCategoryIds=master?[master]:[];
const first=master&&typeof ServisChecklist!=='undefined'?ServisChecklist.findGroupByMasterCategoryId(master):null;
Servis._serviceChecklistGroupIdx=first?first.groupIdx:null;
Servis.setEditCanonicalSelection(master,component);
Servis.renderServiceMasterCategoryChips();
Servis.renderServiceChecklist();
Servis.syncServiceActionType();
Servis.onItemAutofillInterval();
Servis.populateCatalogPartSelect('');
if(typeof Servis.syncVisibleServiceSotSelectors==='function')Servis.syncVisibleServiceSotSelectors();
},
ensureServiceJobTypeUI(selectedJobType){
  if(typeof document==='undefined')return;
  const catEl=document.getElementById('servisCategory');
  if(!catEl||!catEl.parentElement)return;
  let wrap=document.getElementById('servisJobTypeWrap');
  if(!wrap){
    wrap=document.createElement('div'); wrap.id='servisJobTypeWrap'; wrap.className='fg';
    wrap.innerHTML='<label class="fl">Jenis Pekerjaan</label><select class="fs" id="servisJobType" data-onchange="Servis.onServiceJobTypeChange"></select><div style="font-size:11px;color:var(--text2);margin-top:4px;line-height:1.5">Overhaul/Turun Mesin adalah jenis pekerjaan di bawah Servis Mesin, bukan komponen. Checklist hanya mencatat komponen yang benar-benar dikerjakan.</div>';
    catEl.parentElement.insertAdjacentElement('beforebegin',wrap);
  }
  const sel=document.getElementById('servisJobType');
  const jobs=(typeof ServiceSessionSOT!=='undefined'&&Array.isArray(ServiceSessionSOT.JOB_TYPES))?ServiceSessionSOT.JOB_TYPES:[];
  if(sel){sel.innerHTML='<option value="">— Pilih bila relevan —</option>'+jobs.map(j=>`<option value="${escapeHtml(j.id)}">${escapeHtml(j.label)}</option>`).join('');sel.value=selectedJobType||'';}
},
onServiceJobTypeChange(){
  const sel=document.getElementById('servisJobType'); const id=sel?sel.value:'';
  if(!id)return;
  const job=typeof ServiceSessionSOT!=='undefined'?ServiceSessionSOT.jobType(id):null;
  if(job&&job.masterCategoryId){
    const cat=document.getElementById('servisCategory');
    if(cat){cat.value=job.masterCategoryId; Servis._serviceChecklistMasterCategoryIds=[job.masterCategoryId]; Servis._serviceChecklistGroupIdx=typeof ServisChecklist!=='undefined'&&ServisChecklist.findGroupByMasterCategoryId(job.masterCategoryId)?ServisChecklist.findGroupByMasterCategoryId(job.masterCategoryId).groupIdx:null;}
    const comp=document.getElementById('servisComponent'); if(comp)comp.value='';
    if(typeof Servis.renderServiceMasterCategoryChips==='function')Servis.renderServiceMasterCategoryChips();
    if(typeof Servis.renderServiceChecklist==='function')Servis.renderServiceChecklist();
    if(typeof Servis.syncVisibleServiceSotSelectors==='function')Servis.syncVisibleServiceSotSelectors();
  }
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
if(typeof Servis.syncVisibleServiceSotSelectors==='function')Servis.syncVisibleServiceSotSelectors();
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
if(typeof ServiceHistorySOTReview!=='undefined'&&ServiceHistorySOTReview&&s.serviceSotStatus==='LEGACY_UNMAPPED')ServiceHistorySOTReview.render(document.getElementById('servisList'),s.vehicleId||curVehicleId);
if(typeof ServiceHistorySOTReview!=='undefined'&&ServiceHistorySOTReview&&typeof ServiceHistorySOTReview.renderEditNotice==='function')ServiceHistorySOTReview.renderEditNotice(document.getElementById('servisDetailPanel'),s);
Servis.renderServiceInputSelectors(s.masterCategoryId||'',s.serviceComponentId||'',s.actionType||'ganti');
Servis.ensureServiceJobTypeUI(s.serviceJobType||'');
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
Servis.ensureServiceJobTypeUI('');
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
const history=document.getElementById('servisHistoryPanel');
const audit=document.getElementById('servisAuditPanel');
if(detail)detail.style.display='';
if(reminder){reminder.style.display='none';reminder.innerHTML='';}
if(history){history.style.display='none';history.innerHTML='';}
if(audit){audit.style.display='none';audit.innerHTML='';}
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
const n=Number(km);if(!Number.isFinite(n)||n<0)return{ok:false,code:'invalid_km',message:'KM servis harus berupa angka 0 atau lebih.'};
const d=String(date||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||Number.isNaN(Date.parse(d+'T00:00:00')))return{ok:false,code:'invalid_date',message:'Tanggal servis tidak valid.'};
const logs=Array.isArray(D.servisLogs)?D.servisLogs.filter(s=>s&&s.vehicleId===vehicleId&&s.id!==excludeId&&Number.isFinite(Number(s.km))&&Number(s.km)>=0):[];
const current=typeof getVehicleKm==='function'?Number(getVehicleKm(vehicleId)):NaN;
if(Number.isFinite(current)&&current>=0&&n>current)return{ok:false,code:'above_current_odometer',message:`KM servis (${n.toLocaleString('id-ID')}) melebihi odometer kendaraan saat ini (${current.toLocaleString('id-ID')}).`};
const target={id:excludeId||'__service_validation_target__',vehicleId,km:n,date:d};
const ordered=logs.slice().sort((a,b)=>typeof compareServiceHistoryRecency==='function'?-compareServiceHistoryRecency(a,b):String(a.date||'').localeCompare(String(b.date||''))||Number(a.km||0)-Number(b.km||0));
let prev=null,next=null;
for(const row of ordered){if(typeof compareServiceHistoryRecency==='function'){const rel=compareServiceHistoryRecency(row,target);if(rel>0){next=row;break;}if(rel<0)prev=row;}else{const rd=String(row.date||'');if(rd<d||(rd===d&&Number(row.km||0)<=n))prev=row;else if(rd>d||(rd===d&&Number(row.km||0)>n)){next=row;break;}}}
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
const serviceJobTypeId=document.getElementById('servisJobType')?.value||null;
const serviceJob=serviceJobTypeId&&typeof ServiceSessionSOT!=='undefined'?ServiceSessionSOT.jobType(serviceJobTypeId):null;
if(serviceJob&&serviceJob.masterCategoryId){masterCategoryId=serviceJob.masterCategoryId;}
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
const _editAuditFieldLabels={categoryId:'Kategori',masterCategoryId:'Kategori Servis (SOT)',serviceComponentId:'Komponen Servis (SOT)',serviceJobType:'Jenis Pekerjaan',actionType:'Tindakan',item:'Item',note:'Catatan',foto:'Foto',checklist:'Checklist',cost:'Biaya',accountId:'Akun',usedPartId:'Part Stok',usedPartQty:'Qty Part Stok',catalogPartId:'Part Katalog',catalogPartQty:'Qty Part Katalog',catalogPartOemCode:'Kode OEM Katalog',catalogPartLinkedStockId:'Stok Part Katalog',conditionResult:'Hasil Pemeriksaan',conditionNote:'Catatan Pemeriksaan'};
const _editAuditFields=Object.keys(_editAuditFieldLabels);
const _editAuditBefore={};
if(_metadataOnlyEdit){_editAuditFields.forEach(k=>{_editAuditBefore[k]=s[k];});}
Object.assign(s,{date,item,categoryId:catIdForLog||s.categoryId,masterCategoryId:masterCategoryId||s.masterCategoryId||null,serviceComponentId:serviceComponentId||s.serviceComponentId||null,serviceJobType:serviceJobTypeId||s.serviceJobType||null,serviceJobLabel:serviceJob?serviceJob.label:(s.serviceJobLabel||null),serviceJobEvidence:serviceJobTypeId?'manual':(s.serviceJobEvidence||null),actionType,km,cost,note,accountId:accId,intervalKmAtService:_preserveHistoricalSnapshot?s.intervalKmAtService:_ivSnapshot,intervalBulanAtService:_preserveHistoricalSnapshot?s.intervalBulanAtService:_ibSnapshot,nextDueKm:_preserveHistoricalSnapshot?s.nextDueKm:_nextSnapshotEdit.nextDueKm,nextDueDate:_preserveHistoricalSnapshot?s.nextDueDate:_nextSnapshotEdit.nextDueDate,nextDueAxis:_preserveHistoricalSnapshot?s.nextDueAxis:_nextSnapshotEdit.nextDueAxis,usedPartId:usedPartId||null,usedPartQty:usedPartId?usedPartQty:0,catalogPartId:catalogPartId||null,catalogPartQty:catalogPartId?catalogPartQty:0,catalogPartOemCode:catalogPartId?catalogPartOemCode:'',catalogPartLinkedStockId:catalogLinkedStockId||null,foto:Servis._photoDraft.slice(),checklist:checklistPayload});
s.checklistNotApplicable=checklistNotApplicable; s.conditionResult=conditionResult; s.conditionNote=conditionNote;
if(_metadataOnlyEdit){
  const _sameAuditValue=(a,b)=>{try{return JSON.stringify(a)===JSON.stringify(b);}catch(_e){return a===b;}};
  const _changedAuditFields=_editAuditFields.filter(k=>!_sameAuditValue(_editAuditBefore[k],s[k]));
  const _changes=_changedAuditFields.map(field=>({field,label:_editAuditFieldLabels[field]||field,from:_editAuditBefore[field]??null,to:s[field]??null}));
  if(_changes.length){
    if(!Array.isArray(s.editHistory))s.editHistory=[];
    s.editHistory.push({changedAt:new Date().toISOString(),changedBy:'self',fields:_changedAuditFields,changes:_changes});
    if(s.editHistory.length>50)s.editHistory=s.editHistory.slice(-50);
  }
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
  D.servisLogs.push({id:_rowIdx===0?servisId:uid(),sessionId:_serviceSessionId,vehicleId:curVehicleId,date,item:_rowItem,categoryId:_rowCategoryId,masterCategoryId:_rowMasterCategoryId,serviceComponentId:_row.serviceComponentId||null,serviceJobType:serviceJobTypeId||null,serviceJobLabel:serviceJob?serviceJob.label:null,serviceJobEvidence:serviceJobTypeId?'manual':null,actionType:_rowActionType,km,cost:_rowIdx===0?cost:0,note,accountId:accId,txLinkId:_rowIdx===0?txId:null,intervalKmAtService:_rowIv,intervalBulanAtService:_rowIb,nextDueKm:_rowNext.nextDueKm,nextDueDate:_rowNext.nextDueDate,nextDueAxis:_rowNext.nextDueAxis,usedPartId:_rowIdx===0?(usedPartId||null):null,usedPartQty:_rowIdx===0?(usedPartId?usedPartQty:0):0,catalogPartId:_rowIdx===0?(catalogPartId||null):null,catalogPartQty:_rowIdx===0?(catalogPartId?catalogPartQty:0):0,catalogPartOemCode:_rowIdx===0?(catalogPartId?catalogPartOemCode:''):'',catalogPartLinkedStockId:_rowIdx===0?(catalogLinkedStockId||null):null,foto:_rowIdx===0?Servis._photoDraft.slice():[],checklist:[_row],checklistNotApplicable,conditionResult:_rowIdx===0?conditionResult:null,conditionNote:_rowIdx===0?conditionNote:'',costBreakdown:{total:_rowIdx===0?cost:0,labor:null,parts:null,consumables:null,other:null,source:'service_entry'},serviceEvidence:{vehicleId:curVehicleId,transactionId:_rowIdx===0?txId:null,sessionId:_serviceSessionId,reminderPackageId:null,odometer:km,date,photos:_rowIdx===0?Servis._photoDraft.slice():[]}});
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
_syncEditTabButtonState(next){
const buttons=[
  ['servisEditTabDetail','detail'],
  ['servisEditTabReminder','reminder'],
  ['servisEditTabHistory','history'],
  ['servisEditTabAudit','audit'],
];
buttons.forEach(([id,key])=>{
  const btn=document.getElementById(id);
  if(!btn)return;
  const active=key===next;
  if(btn.classList&&typeof btn.classList.toggle==='function')btn.classList.toggle('active',active);
  // The tab buttons have legacy inline styles in modals.js. classList alone
  // cannot override those inline declarations, which caused the Pengingat
  // panel to render while "Detail" stayed visually active.
  if(btn.style){
    btn.style.background=active?'var(--accent)':'transparent';
    btn.style.color=active?'#fff':'var(--text2)';
  }
},);
},
_normalizeEditModalGeometry(){
const overlay=document.getElementById('servisModal');
if(!overlay)return;
if(typeof PWAUX!=='undefined'&&PWAUX&&typeof PWAUX.resetOverlayGeometry==='function')PWAUX.resetOverlayGeometry(overlay);
const modal=overlay.querySelector?overlay.querySelector('.modal'):null;
if(modal&&modal.style){
  modal.style.width='100%';
  modal.style.maxWidth='100vw';
  modal.style.minWidth='0';
  modal.style.height='100dvh';
  modal.style.maxHeight='100dvh';
  modal.style.margin='0';
  modal.style.boxSizing='border-box';
  modal.style.overflowX='hidden';
  modal.style.overflowY='hidden';
  modal.style.display='flex';
  modal.style.flexDirection='column';
  modal.style.transform='';
  modal.style.transition='';
}
if(overlay.style){
  overlay.style.position='fixed';
  overlay.style.inset='0';
  overlay.style.width='100vw';
  overlay.style.maxWidth='100vw';
  overlay.style.height='100dvh';
  overlay.style.left='0';
  overlay.style.right='0';
  overlay.style.bottom='0';
  overlay.style.top='0';
  overlay.style.padding='0';
  overlay.style.boxSizing='border-box';
}
},
setEditTab(tab){
const isEdit=Servis.editId!==null;
if(!isEdit)return;
const next=tab==='reminder'?'reminder':tab==='history'?'history':tab==='audit'?'audit':'detail';
const detail=document.getElementById('servisDetailPanel');
const reminder=document.getElementById('servisReminderPanel');
const history=document.getElementById('servisHistoryPanel');
const audit=document.getElementById('servisAuditPanel');
if(detail){detail.style.display=next==='detail'?'':'none';detail.style.flex='1 1 auto';detail.style.minHeight='0';detail.style.overflowY='auto';detail.style.overflowX='hidden';}
if(reminder){reminder.style.display=next==='reminder'?'':'none';reminder.style.flex='1 1 auto';reminder.style.minHeight='0';reminder.style.overflowY='auto';reminder.style.overflowX='hidden';}
if(history){history.style.display=next==='history'?'':'none';history.style.flex='1 1 auto';history.style.minHeight='0';history.style.overflowY='auto';history.style.overflowX='hidden';}
if(audit){audit.style.display=next==='audit'?'':'none';audit.style.flex='1 1 auto';audit.style.minHeight='0';audit.style.overflowY='auto';audit.style.overflowX='hidden';}
Servis._syncEditTabButtonState(next);
Servis._normalizeEditModalGeometry();
if(next==='reminder')Servis.renderEditReminderTab();
if(next==='history')Servis.renderEditHistoryTab();
if(next==='audit')Servis.renderEditAuditTab();
Servis._editTab=next;
const modal=document.getElementById('servisModal');
const sheet=modal&&modal.querySelector?modal.querySelector('.modal'):null;
if(sheet&&typeof sheet.scrollTop==='number')sheet.scrollTop=0;
},
// S1904 contract: renderEditCanonicalSelectors(panel,reminderSelection,{disabled:true,prefix:'servisReminderSot'})
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
const componentHtml=usedPart?`<div class="fg"><label class="fl">📦 Komponen/Stok yang dipakai</label><div style="background:var(--surface3);border-radius:12px;padding:10px 12px"><div class="u-fw700 u-fs12">${escapeHtml(usedPart.name)}</div><div class="u-fs11 u-t2">${partCat?'🔗 '+escapeHtml(partCat.name)+' · '+(partCanonical.intervalKm?partCanonical.intervalKm.toLocaleString('id-ID')+' km':'tanpa interval')+(partCanonical.intervalBulan?' / '+partCanonical.intervalBulan.toLocaleString('id-ID')+' bln':''):'Tidak ada kategori reminder aktif untuk komponen ini.'}</div></div></div>`:'<div class="fg"><label class="fl">📦 Komponen/Stok</label><div class="u-fs12t2">Tidak ada stok sparepart yang ditautkan ke riwayat ini.</div></div>';
panel.innerHTML=`<div style="background:var(--accent-soft);border:1px solid var(--accent);border-radius:12px;padding:12px;margin-bottom:12px"><div class="u-fw700 u-fs13">🔔 Pengingat tersinkron</div><div class="u-fs11 u-t2" style="margin-top:4px">Tab ini hanya membaca SoT kategori/komponen yang sudah ada. Tidak menyimpan interval atau reminder kedua di riwayat servis.</div></div>
<div class="fg"><label class="fl">Kendaraan</label><div class="u-fs12">${vehicle?escapeHtml(vehicle.name):'Kendaraan tidak ditemukan'}</div></div>
<div class="fg"><label class="fl">Kategori Pengingat</label>${linkedCat?`<div style="background:var(--surface3);border-radius:12px;padding:10px 12px"><div class="u-flex u-jcb u-aic"><div><div class="u-fw700 u-fs12">${escapeHtml(linkedCat.name)}</div><div class="u-fs11 u-t2">${statusLabel} · ${escapeHtml(intervalLabel)} · sumber: ${overrideLabel}</div></div><button type="button" class="btn btn-ghost btn-sm" data-action="editSparepartFromReminder" data-args="${escapeHtml(JSON.stringify([linkedCat.id]))}">✏️ Kelola</button></div>${urgency?`<div class="u-fs11 u-t2" style="margin-top:6px">${urgency.sisaKm!=null?'Sisa '+urgency.sisaKm.toLocaleString('id-ID')+' km':''}${urgency.sisaBulan!=null?' · sisa '+Math.round(urgency.sisaBulan)+' bln':''}</div>`:''}</div>`:'<div class="u-fs12t2">⚪ Riwayat ini belum terhubung ke kategori pengingat kendaraan. Jangan membuat kategori otomatis dari tab ini.</div>'}</div>
${componentHtml}
${Servis._renderEditHistoryHtml(s)}
<div class="u-fs11 u-t2" style="line-height:1.5;padding:8px 0">SoT: <b>kategori/komponen → interval efektif → reminder → riwayat</b>. Mengubah interval dilakukan melalui pengaturan kategori/override kendaraan, bukan membuat field interval baru di riwayat.</div>`;
},
renderEditHistoryTab(){
const panel=document.getElementById('servisHistoryPanel');
if(!panel||Servis.editId===null)return;
const current=(D.servisLogs||[]).find(x=>x&&x.id===Servis.editId);
if(!current){panel.innerHTML='<div class="empty"><div class="empty-text">Data riwayat servis tidak ditemukan.</div></div>';return;}
const vehicleId=current.vehicleId||curVehicleId;
const vehicle=(D.vehicles||[]).find(v=>v&&v.id===vehicleId);
const resolveCat=(log)=>{
  const preferred=log&&log.categoryId?(D.sparepartCats||[]).find(c=>c&&c.id===log.categoryId&&(!c.vehicleId||c.vehicleId===vehicleId)):null;
  return preferred||(typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(log&&log.item||'',vehicleId):null);
};
const currentCat=resolveCat(current);
const currentComponentId=current.serviceComponentId||(typeof Servis.resolveLogServiceComponentId==='function'?Servis.resolveLogServiceComponentId(current):null);
const sameComponent=(log)=>{
  if(!log||log.vehicleId!==vehicleId)return false;
  const logComponent=log.serviceComponentId||(typeof Servis.resolveLogServiceComponentId==='function'?Servis.resolveLogServiceComponentId(log):null);
  if(currentComponentId&&logComponent)return String(currentComponentId)===String(logComponent);
  if(current.categoryId&&log.categoryId)return String(current.categoryId)===String(log.categoryId);
  return currentCat&&typeof servisLogMatchesCat==='function'?servisLogMatchesCat(log,currentCat):String(log.item||'').trim().toLowerCase()===String(current.item||'').trim().toLowerCase();
};
const history=(D.servisLogs||[]).filter(sameComponent).slice().sort((a,b)=>typeof compareServiceHistoryRecency==='function'?compareServiceHistoryRecency(a,b):String(b.date||'').localeCompare(String(a.date||''))||Number(b.km||0)-Number(a.km||0)||String(b.id||'').localeCompare(String(a.id||'')));
const activeLog=null;
const dueHtml='';
const summary=history.length?`${history.length} riwayat tercatat`:'Belum ada riwayat tercatat';
const latestLabel=history[0]&&history[0].date?`${history[0].date}${history[0].km?' · '+Number(history[0].km).toLocaleString('id-ID')+' km':''}`:'-';
const componentLabel=currentComponentId&&typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.itemById==='function'?(ServiceInputCatalog.itemById(currentComponentId)||{}).item?.name:null;
const title=componentLabel||current.item||currentCat&&currentCat.name||'Komponen servis';
const condition=(log)=>log&&log.conditionResult&&typeof serviceConditionLabel==='function'?`<div class="u-fs11" style="margin-top:5px">${typeof serviceConditionIcon==='function'?serviceConditionIcon(log.conditionResult):'🩺'} ${escapeHtml(serviceConditionLabel(log.conditionResult))}</div>`:'';
const note=(log)=>log&&log.conditionNote?`<div class="u-fs11 u-t2" style="margin-top:4px">🩺 ${escapeHtml(log.conditionNote)}</div>`:(log&&log.note?`<div class="u-fs11 u-t2" style="margin-top:4px">${escapeHtml(log.note)}</div>`:'');
const action=(log)=>log&&log.actionType?`<div class="u-fs12 u-fw700" style="margin-top:6px">${log.actionType==='ganti'?'🔧 Ganti':log.actionType==='bersih'?'🧹 Bersihkan':log.actionType==='periksa'?'🔍 Periksa':'📝 '+escapeHtml(log.actionType)}</div>`:'';
const checklistInfo=(log)=>{
  if(typeof ServisChecklist!=='undefined'&&typeof ServisChecklist.summaryFromLog==='function'){
    const q=ServisChecklist.summaryFromLog(log);
    if(q&&q.checked){
      const actions=[];
      if(q.replaced)actions.push('🔧 '+q.replaced+' diganti');
      if(q.cleaned)actions.push('🧹 '+q.cleaned+' dibersihkan');
      if(q.inspected)actions.push('🔍 '+q.inspected+' diperiksa');
      return `<div class="u-fs11 u-t2" style="margin-top:5px">☑️ Checklist ${q.checked}/${q.total||q.checked}${actions.length?' · '+actions.join(' · '):''}</div>`;
    }
  }
  const n=Array.isArray(log&&log.checklist)?log.checklist.length:0;
  return n?`<div class="u-fs11 u-t2" style="margin-top:5px">☑️ ${n} komponen checklist tercatat</div>`:'';
};
const rows=history.map((log,idx)=>{
  const badge=`<span style="padding:4px 8px;border-radius:999px;background:var(--surface3);color:var(--text2);font-size:10px;font-weight:700">${idx===0?'Terbaru':'Riwayat'}</span>`;
  const job=log.serviceJobLabel||log.serviceJobType||'';
  const identity=Servis.resolveCanonicalServiceSelection(log);
  const identityText=[identity.group&&identity.group.group,identity.component&&identity.component.name].filter(Boolean).join(' → ');
  return `<div style="background:var(--surface3);border-radius:14px;padding:12px;margin-bottom:8px;border:1px solid var(--border)"><div class="u-flex u-jcb u-aic" style="gap:8px"><div class="u-fw700 u-fs12">📅 ${escapeHtml(log.date||'-')}${log.km?' · '+Number(log.km).toLocaleString('id-ID')+' km':''}</div>${badge}</div>${job?`<div class="u-fs11" style="margin-top:5px">🔧 Jenis pekerjaan: <b>${escapeHtml(job)}</b></div>`:''}${identityText?`<div class="u-fs11 u-t2" style="margin-top:4px">SOT: ${escapeHtml(identityText)}</div>`:''}${action(log)}${checklistInfo(log)}${condition(log)}${note(log)}</div>`;
}).join('');

const currentCatalogId=current.catalogPartId||'';
const catalogInfo=currentCatalogId?`<div class="fg"><label class="fl">Part Katalog (SOT)</label><div id="servisHistoryCatalogPart" data-catalog-part-id="${escapeHtml(currentCatalogId)}" style="background:var(--surface3);border-radius:12px;padding:10px 12px">Memuat part katalog…</div></div>`:'';
panel.innerHTML=`<div style="background:var(--accent-soft);border:1px solid var(--accent);border-radius:12px;padding:12px;margin-bottom:12px"><div class="u-fw700 u-fs13">📋 Riwayat Servis</div><div class="u-fs11 u-t2" style="margin-top:4px">${escapeHtml(summary)} · terakhir ${escapeHtml(latestLabel)}</div><div class="u-fs11 u-t2" style="margin-top:4px">Halaman ini hanya menampilkan bukti riwayat. Pengingat dan Audit/Paket berada di tab masing-masing.</div></div>${catalogInfo}<div class="fg"><label class="fl">Riwayat Servis</label>${rows||'<div class="u-fs12t2">Belum ada riwayat untuk komponen ini.</div>'}</div><div class="u-fs11 u-t2" style="line-height:1.5;padding:8px 0">Checklist yang tersimpan ditampilkan sebagai bukti read-only. Perubahan identitas checklist dilakukan dari tab Detail.</div>`;
if(currentCatalogId&&typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.getById==='function'){
  VehicleCatalog.getById(currentCatalogId).then(it=>{const el=document.getElementById('servisHistoryCatalogPart');if(!el)return;el.textContent=it?(it.partName||'(Tanpa nama)')+(it.oemCode?' — '+it.oemCode:''):'Part katalog tidak ditemukan';}).catch(()=>{const el=document.getElementById('servisHistoryCatalogPart');if(el)el.textContent='Part katalog tidak dapat dimuat';});
}
},
updateHistoryAuditSelection(){const panel=document.getElementById('servisAuditPanel')||document.getElementById('servisHistoryPanel');if(!panel)return;const n=panel.querySelectorAll('input[data-service-audit-id]:checked').length;const el=document.getElementById('serviceAuditSelectionCount');if(el)el.textContent=n+' dipilih';const bulk=document.getElementById('serviceBulkHistoryEditBtn');if(bulk)bulk.disabled=n<1;const job=document.getElementById('serviceBulkHistoryJobTypeBtn');if(job)job.disabled=n<1;},
selectAllHistoryAudit(){const panel=document.getElementById('servisAuditPanel')||document.getElementById('servisHistoryPanel');if(!panel)return;const rows=Array.from(panel.querySelectorAll('input[data-service-audit-id]'));rows.forEach((x,i)=>{x.checked=i<100;});Servis.updateHistoryAuditSelection();if(rows.length>100)toast('ℹ️ Pilih Semua dibatasi 100 riwayat agar operasi bulk tetap aman.');},
clearHistoryAuditSelection(){const panel=document.getElementById('servisAuditPanel')||document.getElementById('servisHistoryPanel');if(!panel)return;panel.querySelectorAll('input[data-service-audit-id]').forEach(x=>{x.checked=false;});Servis.updateHistoryAuditSelection();},
applyHistoryAuditCandidate(ids){const panel=document.getElementById('servisAuditPanel')||document.getElementById('servisHistoryPanel');if(!panel||!Array.isArray(ids))return;const set=new Set(ids.map(String));panel.querySelectorAll('input[data-service-audit-id]').forEach(x=>{x.checked=set.has(String(x.getAttribute('data-service-audit-id')));});Servis.updateHistoryAuditSelection();},
async editHistoryAuditPackage(packageId){const api=typeof ServiceHistoryAuditPackage!=='undefined'?ServiceHistoryAuditPackage:null,p=api&&api.byId(packageId);if(!p)return;const title=await showPromptModal({title:'Nama Paket',message:'Nama paket pekerjaan:',icon:'📦',inputType:'text',defaultValue:p.title});if(title===null||title===undefined)return;const r=api.update(packageId,{title:String(title).trim()||p.title});if(!r.ok){toast('⚠️ Paket tidak diubah: '+r.code);return;}toast('✅ Paket diperbarui');Servis.renderEditAuditTab();},
async removeHistoryAuditPackage(packageId){const api=typeof ServiceHistoryAuditPackage!=='undefined'?ServiceHistoryAuditPackage:null,p=api&&api.byId(packageId);if(!p)return;if(typeof askConfirm==='function'&&!await askConfirm('Hapus paket audit ini? Riwayat servis sumber TIDAK akan dihapus.'))return;const r=api.remove(packageId);if(r.ok){toast('✅ Paket dihapus; riwayat sumber tetap utuh');Servis.renderEditAuditTab();}},
openHistoryAuditPackage(packageId){const api=typeof ServiceHistoryAuditPackage!=='undefined'?ServiceHistoryAuditPackage:null,p=api&&api.byId(packageId);if(!p)return;const a=api.audit(packageId),sum=a.summary||{},rows=a.sourceRows||[],integ=a.integrity||{};let box=document.getElementById('serviceHistoryAuditDetail');if(box)box.remove();box=document.createElement('div');box.id='serviceHistoryAuditDetail';box.className='overlay open';box.style.zIndex='430';const warn=integ.ok?'':'<div style="padding:8px;margin-bottom:8px">⚠️ Sebagian sumber tidak ditemukan. Data yang hilang tidak dibuat-buat.</div>';box.innerHTML=`<div class="modal"><div class="modal-title"><span>📦 ${escapeHtml(p.title)}</span><button class="modal-close" data-action="Servis.closeHistoryAuditPackage">✕</button></div>${warn}<div class="fg"><label class="fl">JASA</label><div class="u-fs11 u-t2">${rows.length?escapeHtml(rows.map(x=>x.serviceJobType||x.item||'Pekerjaan').join(' · ')):'-'}</div></div><div class="fg"><label class="fl">KOMPONEN</label><div class="u-fs11 u-t2">${sum.components&&sum.components.length?escapeHtml(sum.components.map(x=>x.name).join(', ')):'-'}</div></div><div class="fg"><label class="fl">PEMERIKSAAN</label><div class="u-fs11 u-t2">${Number(sum.inspections||0)} riwayat pemeriksaan</div></div><div class="fg"><label class="fl">PART</label><div class="u-fs11 u-t2">${sum.parts&&sum.parts.length?escapeHtml(sum.parts.map(x=>x.name).join(', ')):'-'}</div></div><div class="fg"><label class="fl">BIAYA</label><div class="u-fs11 u-t2">Rp ${Number(sum.totalCost||0).toLocaleString('id-ID')}</div></div><div class="fg"><label class="fl">SUMBER</label><div>${rows.map(x=>`<div style="padding:6px 0;border-top:1px solid var(--border2)">${escapeHtml(x.item||'Tanpa nama')} <button type="button" class="btn btn-ghost btn-sm" data-action="Servis.openHistorySourceFromAudit" data-args="${escapeHtml(JSON.stringify([x.id]))}">Buka Sumber</button></div>`).join('')}</div></div></div>`;document.body.appendChild(box);},
openHistorySourceFromAudit(serviceId){const box=document.getElementById('serviceHistoryAuditDetail');if(box)box.remove();if(typeof Servis.openModal==='function')Servis.openModal(serviceId);},
closeHistoryAuditPackage(){const box=document.getElementById('serviceHistoryAuditDetail');if(box)box.remove();},
createHistoryAuditPackage(){const api=typeof ServiceHistoryAuditPackage!=='undefined'?ServiceHistoryAuditPackage:null;if(!api)return;const panel=document.getElementById('servisAuditPanel')||document.getElementById('servisHistoryPanel');if(!panel)return;const ids=[...panel.querySelectorAll('input[data-service-audit-id]:checked')].map(x=>x.getAttribute('data-service-audit-id')).filter(Boolean);if(ids.length<2){toast('⚠️ Pilih minimal 2 riwayat yang benar-benar satu pekerjaan');return;}const current=(D.servisLogs||[]).find(x=>x&&x.id===Servis.editId)||{};const typeId=document.getElementById('serviceAuditPackageType')?.value||'other';const title=(document.getElementById('serviceAuditPackageTitle')?.value||'').trim()||(typeId==='overhaul_turun_mesin'?'Overhaul / Turun Mesin':'Paket Pekerjaan');const result=api.create({vehicleId:current.vehicleId||curVehicleId,title,typeId,sourceServiceIds:ids});if(!result.ok){toast('⚠️ Paket tidak dibuat: '+result.code);return;}toast('✅ Paket pekerjaan dibuat tanpa mengubah riwayat sumber');Servis.renderEditAuditTab();},
_renderEditHistoryHtml(s){
const hist=Array.isArray(s&&s.editHistory)?s.editHistory:[];
if(!hist.length)return'';
const rows=hist.slice(-5).reverse().map(h=>{
const when=h&&h.changedAt?new Date(h.changedAt):null;
const whenLabel=when&&!isNaN(when)?when.toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'}):'(waktu tidak tercatat)';
const fields=Array.isArray(h&&h.fields)&&h.fields.length?h.fields.join(', '):'-';
const changes=Array.isArray(h&&h.changes)?h.changes:[];
const detail=changes.length?changes.map(ch=>{const from=ch&&ch.from!=null?String(ch.from):'—';const to=ch&&ch.to!=null?String(ch.to):'—';return `<div style="margin-top:4px"><b>${escapeHtml(ch.label||ch.field||'Field')}</b>: ${escapeHtml(from)} → ${escapeHtml(to)}</div>`;}).join(''):`Diubah: ${escapeHtml(fields)}`;
return `<div style="padding:6px 0;border-top:1px dashed var(--border)"><div class="u-fs11 u-fw700">${escapeHtml(whenLabel)}</div><div class="u-fs11 u-t2">${detail}</div></div>`;
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
