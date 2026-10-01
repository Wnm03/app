/* S2041 — Part CRUD + canonical PartPicker layer
 * Scope: existing/legacy motorcycles only. No KPB/new-bike logic.
 * Safety principles:
 *  - additive compatibility layer; existing service/purchase ledgers remain authoritative
 *  - one PartPicker reads D.partsStock + canonical component links
 *  - delete with references => archive; history is never destroyed
 *  - manual qty changes are ledgered as adjustments
 */
(function(){
'use strict';
// S2041.1: idempotent load guard (file is bundled AND may still be loaded standalone by old HTML).
if(window.PartCrudS2041&&window.PartCrudS2041.__loaded)return;
const api={version:'S2041.1',__loaded:true};
let pendingContext=null;   // set by picker, consumed once by openStockModal
let activeContext=null;    // context of the stock modal currently open (S2041.1: no stale leak)
function d(id){return document.getElementById(id)}
function vehicleId(){return typeof curVehicleId!=='undefined'?curVehicleId:null}
function partsStockRead(){return (typeof CarNotesSOT!=='undefined'&&CarNotesSOT&&typeof CarNotesSOT.partsStock==='function')?CarNotesSOT.partsStock():(D.partsStock||[])}
function esc(v){return typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function currentComponent(){
  return d('servisChecklistIdentityComponent')?.value || d('serviceChecklistIdentityComponent')?.value || d('stockServiceComponentId')?.value || '';
}
function currentCategory(){
  return d('stockCatId')?.value || d('serviceChecklistIdentityCategory')?.value || d('serviceHistoryBulkCategory')?.value || '';
}
function txCategory(){ return d('txStockCategoryFilter')?.value || ''; }
function txComponent(){ return d('txStockComponentFilter')?.value || ''; }
function partRows(context={}){
  const vid=context.vehicleId||vehicleId();
  const componentId=context.componentId||'';
  const categoryId=context.categoryId||'';
  const onlyAvailable=!!context.onlyAvailable;
  const includeUnclassified=!!context.includeUnclassified;
  const vehicleMatch=(p)=>{
    if(!vid)return true;
    if(Array.isArray(p.vehicleIds)&&p.vehicleIds.length)return p.vehicleIds.includes(vid);
    if(typeof Sparepart!=='undefined'&&Sparepart&&typeof Sparepart.isPartForVehicle==='function')return Sparepart.isPartForVehicle(p,vid);
    return !p.vehicleId||p.vehicleId===vid;
  };
  return partsStockRead().filter(p=>p&&!p.isArchived)
    .filter(vehicleMatch)
    .filter(p=>!categoryId||(p.catId===categoryId)||(includeUnclassified&&!p.catId))
    .filter(p=>!componentId||(p.serviceComponentId===componentId)||(includeUnclassified&&!p.serviceComponentId))
    .filter(p=>!onlyAvailable||(Number(p.qty)||0)>0);
}
function pickerDefaults(selectId){
  return {onlyAvailable:selectId==='servisPartId',strict:true,includeUnclassified:false};
}
function pickerContext(selectId,context={}){
  const base={...contextFor(selectId),...context};
  if(selectId==='txStockItem'){ base.categoryId=txCategory(); base.componentId=txComponent(); }
  const filter=d(selectId+'_availableOnly');
  const defaults=pickerDefaults(selectId);
  return {...defaults,...base,onlyAvailable:filter?filter.checked:defaults.onlyAvailable};
}
function partLabel(p){
  const code=p.oemCode||p.catalogOemCode||p.code||'';
  const qty=Number(p.qty)||0;
  return `${p.name||p.partName||'Part'}${code?' · '+code:''}${Number.isFinite(qty)?' · stok '+qty:''}`;
}
function partById(id){return partsStockRead().find(p=>p&&p.id===id)||null}
function refreshSelect(selectId,context={}){
  const sel=d(selectId); if(!sel)return false;
  const selected=sel.value||'';
  const rows=partRows({...pickerDefaults(selectId),...context});
  const oldOpts=Array.from(sel.options||[]);
  // S2041.1 (C2): keep app sentinel options such as "__new__" (➕ Sparepart Baru) exactly as the app built them.
  const sentinels=oldOpts.filter(o=>String(o.value).startsWith('__'));
  const first=oldOpts[0];
  const hasEmptyFirst=!!(first&&!first.value);
  const opts=[];
  sentinels.forEach(o=>opts.push('<option value="'+esc(o.value)+'">'+esc(o.textContent)+'</option>'));
  if(hasEmptyFirst||!sentinels.length)opts.push('<option value="">'+esc(hasEmptyFirst?first.textContent:'— Pilih Part —')+'</option>');
  rows.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'id')).forEach(p=>opts.push(`<option value="${esc(p.id)}">${esc(partLabel(p))}</option>`));
  // S2041.1 (C1): the currently selected part must survive filters (qty 0 / archived / other filter) so editing
  // an old service or purchase never drops its part reference.
  let keep=false;
  if(selected&&!selected.startsWith('__')&&!rows.some(p=>p.id===selected)){
    const cur=partById(selected);
    if(cur){opts.push(`<option value="${esc(cur.id)}">${esc(partLabel(cur)+(cur.isArchived?' · arsip':(Number(cur.qty)||0)<=0?' · habis':''))}</option>`);keep=true;}
    else{const o=oldOpts.find(x=>x.value===selected);if(o){opts.push('<option value="'+esc(o.value)+'">'+esc(o.textContent)+'</option>');keep=true;}}
  }
  const nextHtml=opts.join('');
  const currentHtml=oldOpts.map(o=>`<option value="${esc(o.value)}">${esc(o.textContent)}</option>`).join('');
  const canKeep=keep||sentinels.some(o=>o.value===selected)||rows.some(p=>p.id===selected);
  if(nextHtml!==currentHtml){
    sel.innerHTML=nextHtml;
    if(selected&&canKeep)sel.value=selected;
  } else if(selected&&canKeep&&sel.value!==selected){ sel.value=selected; }
  sel.dataset.partPickerSot='S2041';
  return true;
}
function addButtonAfter(el,id,label,fn){
  if(!el||d(id))return;
  const b=document.createElement('button'); b.type='button'; b.id=id; b.className='btn btn-ghost btn-sm u-mt6'; b.textContent=label; b.addEventListener('click',fn); el.insertAdjacentElement('afterend',b);
}
function contextFor(selectId){
  const componentId=currentComponent();
  const categoryId=currentCategory();
  return {selectId,componentId,categoryId,vehicleId:vehicleId()};
}
function injectPicker(selectId,context){
  const sel=d(selectId); if(!sel)return;
  sel.dataset.partPickerSot='S2041';
  const filterId=selectId+'_availableOnly';
  if(!d(filterId)){
    const wrap=document.createElement('label'); wrap.id=filterId+'_wrap'; wrap.className='u-mt6';
    wrap.style.cssText='display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;';
    wrap.innerHTML=`<input type="checkbox" id="${filterId}"> <span>Hanya tampilkan stok tersedia</span>`;
    sel.insertAdjacentElement('afterend',wrap);
    d(filterId).checked=pickerDefaults(selectId).onlyAvailable;
    d(filterId).addEventListener('change',()=>refreshSelect(selectId,pickerContext(selectId,context)));
  }
  refreshSelect(selectId,pickerContext(selectId,context));
  addButtonAfter(sel,selectId+'_addPart','➕ Tambah Part Manual',()=>{
    pendingContext={...pickerContext(selectId,context)};
    if(typeof Sparepart!=='undefined'&&Sparepart.openStockModal)Sparepart.openStockModal(null);
  });
  addButtonAfter(d(selectId+'_addPart'),selectId+'_editPart','✏️ Edit Part',()=>{
    const id=sel.value; if(!id||typeof Sparepart==='undefined'||!Sparepart.openStockModal)return;
    const i=partsStockRead().findIndex(p=>p&&p.id===id); if(i>=0)Sparepart.openStockModal(i);
  });
  if(selectId==='txStockItem') injectTxFilters();
}
function injectTxFilters(){
  const sel=d('txStockItem'); if(!sel)return;
  const anchor=d('txStockItem_editPart')||d('txStockItem_addPart')||sel;
  let wrap=d('txStockFiltersWrap');
  if(!wrap){
    wrap=document.createElement('div'); wrap.id='txStockFiltersWrap'; wrap.className='u-grid2 u-mt6';
    wrap.innerHTML='<div class="fg u-mb0"><label class="fl">Filter Kategori</label><select class="fs" id="txStockCategoryFilter"><option value="">Semua kategori</option></select></div><div class="fg u-mb0"><label class="fl">Filter Komponen</label><select class="fs" id="txStockComponentFilter"><option value="">Semua komponen</option></select></div>';
    anchor.insertAdjacentElement('afterend',wrap);
    d('txStockCategoryFilter').addEventListener('change',()=>{syncTxFilterOptions();refreshSelect('txStockItem',pickerContext('txStockItem'));});
    d('txStockComponentFilter').addEventListener('change',()=>refreshSelect('txStockItem',pickerContext('txStockItem')));
  }
  const catSel=d('txStockCategoryFilter'); const compSel=d('txStockComponentFilter');
  const oldCat=catSel.value, oldComp=compSel.value;
  const cats=(D.sparepartCats||[]).filter(c=>c&&!c.isArchived).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'id'));
  const catHtml='<option value="">Semua kategori</option>'+cats.map(c=>`<option value="${esc(c.id)}">${esc(c.name||'Kategori')}</option>`).join('');
  const catCurrent=Array.from(catSel.options||[]).map(o=>`<option value="${esc(o.value)}">${esc(o.textContent)}</option>`).join('');
  if(catHtml!==catCurrent)catSel.innerHTML=catHtml;
  if(cats.some(c=>c.id===oldCat))catSel.value=oldCat;
  syncTxFilterOptions(oldComp);
}
function syncTxFilterOptions(preferred){
  const cat=d('txStockCategoryFilter'), comp=d('txStockComponentFilter'); if(!cat||!comp)return;
  const old=preferred!==undefined?preferred:comp.value;
  const c=(D.sparepartCats||[]).find(x=>x&&x.id===cat.value);
  const mid=c?.masterCategoryId||null;
  const group=mid&&typeof ServiceInputCatalog!=='undefined'&&ServiceInputCatalog.groupById?ServiceInputCatalog.groupById(mid):null;
  const items=group?(group.items||[]):[];
  const compHtml='<option value="">Semua komponen</option>'+items.map(it=>`<option value="${esc(it.id)}">${esc(it.name)}</option>`).join('');
  const compCurrent=Array.from(comp.options||[]).map(o=>`<option value="${esc(o.value)}">${esc(o.textContent)}</option>`).join('');
  if(compHtml!==compCurrent)comp.innerHTML=compHtml;
  if(items.some(it=>it.id===old))comp.value=old;
}
function injectPartIdentityFields(){
  const cat=d('stockCatId'); if(!cat)return;
  let comp=d('stockServiceComponentId');
  if(!comp){
    const wrap=document.createElement('div'); wrap.className='fg';
    wrap.innerHTML='<label class="fl">Komponen Servis (SOT)</label><select class="fs" id="stockServiceComponentId"><option value="">— Tanpa komponen spesifik —</option></select><div style="font-size:11px;color:var(--text2);margin-top:4px;line-height:1.5">Kategori → Komponen → Part memakai identity canonical yang sama.</div>';
    cat.closest('.fg')?.insertAdjacentElement('afterend',wrap); comp=d('stockServiceComponentId');
  }
  if(!d('stockOemCode')){
    const code=d('stockCode'); const wrap=document.createElement('div'); wrap.className='fg';
    wrap.innerHTML='<label class="fl">Kode OEM / Referensi Katalog (opsional)</label><input type="text" class="fi" id="stockOemCode" placeholder="mis. 15410-K1Z-J01" autocomplete="off">';
    code?.closest('.fg')?.insertAdjacentElement('afterend',wrap);
  }
  syncComponent();
}
function syncComponent(){
  const sel=d('stockServiceComponentId'); if(!sel||typeof ServiceInputCatalog==='undefined')return;
  const cat=d('stockCatId'); const c=cat&&D.sparepartCats.find(x=>x&&x.id===cat.value); const mid=c?.masterCategoryId||null;
  const group=mid&&ServiceInputCatalog.groupById?ServiceInputCatalog.groupById(mid):null; const current=sel.value||c?.serviceComponentId||activeContext?.componentId||'';
  sel.innerHTML='<option value="">— Tanpa komponen spesifik —</option>'+(group?(group.items||[]).map(it=>`<option value="${esc(it.id)}">${esc(it.name)}</option>`).join(''):'');
  if(current&&Array.from(sel.options).some(o=>o.value===current))sel.value=current;
}
let refreshQueued=false;
api.refreshAll=()=>{
  if(refreshQueued)return; refreshQueued=true;
  setTimeout(()=>{
    refreshQueued=false;
    injectPicker('servisPartId',contextFor('servisPartId'));
    injectPicker('txStockItem',contextFor('txStockItem'));
    syncTxFilterOptions();
  // Generic future selectors can opt in without bespoke code.
    document.querySelectorAll('select[data-part-picker]').forEach(sel=>injectPicker(sel.id,{vehicleId:vehicleId()}));
  },0);
};
api.PartPicker={
  version:'S2041',
  list:partRows,
  refresh:(selectId,context)=>refreshSelect(selectId,pickerContext(selectId,context||{})),
  available:(context={})=>partRows({...context,onlyAvailable:true}),
  context:()=>({vehicleId:vehicleId(),categoryId:currentCategory(),componentId:currentComponent(),strict:true,includeUnclassified:false}),
  openAdd:(context={})=>{pendingContext={...api.PartPicker.context(),...context};if(typeof Sparepart!=='undefined'&&Sparepart.openStockModal)Sparepart.openStockModal(null)},
  openEdit:(partId)=>{const i=partsStockRead().findIndex(p=>p&&p.id===partId);if(i>=0&&typeof Sparepart!=='undefined'&&Sparepart.openStockModal)Sparepart.openStockModal(i)},
  audit:()=>({source:'D.partsStock',sotVersion:'S2041',archivedExcluded:true,relations:'category→component→part→vehicleCompatibility→stockStatus→purchase/usage',serviceAvailableDefault:true,purchaseAvailableDefault:false,strictFilters:true})
};
api.auditState=(partId)=>{const p=partsStockRead().find(x=>x&&x.id===partId);if(!p)return{ok:false,code:'PART_NOT_FOUND'};const usage=(D.servisLogs||[]).filter(s=>s&&(s.usedPartId===partId||s.catalogPartLinkedStockId===partId||s.autoGantiStockId===partId));return{ok:true,partId,qty:Number(p.qty)||0,purchaseCount:Array.isArray(p.priceHistory)?p.priceHistory.length:0,usageCount:usage.length,adjustmentCount:Array.isArray(p.adjustmentHistory)?p.adjustmentHistory.length:0,archived:!!p.isArchived,catalogLinked:!!(p.catalogPartId||p.catalogId)};};
function isReferenced(p){
  return !!((Array.isArray(p.priceHistory)&&p.priceHistory.length)||(Array.isArray(p.txRefs)&&p.txRefs.length)||(Array.isArray(p.adjustmentHistory)&&p.adjustmentHistory.length)||p.catalogPartId||p.catalogId||(Array.isArray(D.servisLogs)&&D.servisLogs.some(s=>s&&(s.usedPartId===p.id||s.catalogPartLinkedStockId===p.id||s.autoGantiStockId===p.id)))||(Array.isArray(D.transactions)&&D.transactions.some(t=>t&&t.partStockId===p.id)));
}
function journal(p,entry){
  if(!Array.isArray(p.adjustmentHistory))p.adjustmentHistory=[];
  const qb=Number(entry.qtyBefore)||0,qa=Number(entry.qtyAfter)||0;
  p.adjustmentHistory.push({id:'adj_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),date:new Date().toISOString().slice(0,10),at:new Date().toISOString(),qtyBefore:qb,qtyAfter:qa,delta:qa-qb,reason:entry.reason,source:entry.source||'part-crud-s2041'});
}
function archivePart(p,reason){
  if(!p||p.isArchived)return false;
  if(typeof StockCommandSOT==='undefined'||!StockCommandSOT||typeof StockCommandSOT.archive!=='function')throw new Error('StockCommandSOT wajib tersedia untuk archive stok');
  const r=StockCommandSOT.archive(p.id,reason||'manual-delete-with-history',{saveNow:false});
  return !!r.ok;
}
function restorePart(id){
  const p=partById(id); if(!p||!p.isArchived)return false;
  if(typeof StockCommandSOT==='undefined'||!StockCommandSOT||typeof StockCommandSOT.restore!=='function'||typeof StockCommandSOT.setQty!=='function')throw new Error('StockCommandSOT wajib tersedia untuk restore stok');
  const qty=Number(p.qty)||0;
  const r=StockCommandSOT.restore(id,{saveNow:false});
  if(!r.ok)throw new Error(r.code||'STOCK_RESTORE_FAILED');
  const jr=StockCommandSOT.setQty(id,qty,{reason:'restore',source:'part-crud-s2041',journal:true,saveNow:false});
  if(!jr.ok)throw new Error(jr.code||'STOCK_RESTORE_JOURNAL_FAILED');
  if(typeof save==='function')save();
  if(typeof Sparepart!=='undefined'&&typeof Sparepart.renderStockList==='function')Sparepart.renderStockList();
  api.refreshAll();
  return true;
}
api.archivePart=archivePart;api.restorePart=restorePart;api.isReferenced=isReferenced;
let showArchived=false,renderingList=false;
function decorateArchived(){
  try{
    const list=d('stockList'); if(!list||typeof list.querySelectorAll!=='function')return;
    if(!d('stockShowArchived')&&list.parentNode&&typeof list.insertAdjacentElement==='function'){
      const w=document.createElement('label'); w.id='stockShowArchived_wrap'; w.className='u-mt6';
      w.style.cssText='display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;';
      w.innerHTML='<input type="checkbox" id="stockShowArchived"> <span>Tampilkan part arsip</span>';
      list.insertAdjacentElement('beforebegin',w);
      const cb=d('stockShowArchived'); if(cb){cb.checked=showArchived;cb.addEventListener('change',()=>{showArchived=!!cb.checked;if(typeof Sparepart!=='undefined')Sparepart.renderStockList();});}
    }
    list.querySelectorAll('[data-action="openStockModal"]').forEach(btn=>{
      let i=-1; try{i=JSON.parse(btn.getAttribute('data-args')||'[]')[0];}catch(_e){void _e;}
      const p=(typeof i==='number')?D.partsStock[i]:null; if(!p||!p.isArchived)return;
      const item=btn.closest?btn.closest('.tx-item'):null; if(!item||item.querySelector('[data-part-archived]'))return;
      const badge=document.createElement('span'); badge.setAttribute('data-part-archived','1'); badge.className='u-fs12 u-fw700 u-r6 u-ml4';
      badge.style.cssText='padding:1px 6px;background:rgba(150,150,150,.2)'; badge.textContent='📦 Arsip';
      const nm=item.querySelector('.tx-name'); if(nm)nm.appendChild(badge);
      const rb=document.createElement('button'); rb.type='button'; rb.className='tx-del u-bgaccsoft u-cacc'; rb.setAttribute('aria-label','Pulihkan'); rb.textContent='♻️'; rb.style.marginRight='6px';
      rb.addEventListener('click',()=>restorePart(p.id)); btn.insertAdjacentElement('beforebegin',rb);
    });
  }catch(_e){void _e;}
}
api.decorateArchived=decorateArchived;
api.injectContext=api.refreshAll;
api.install=()=>{
 if(typeof Sparepart==='undefined')return false;
 if(Sparepart.__s2041Installed)return true; Sparepart.__s2041Installed=true;
 const origOpen=Sparepart.openStockModal;
 Sparepart.openStockModal=function(idx){
  activeContext=pendingContext; pendingContext=null; // consume once; never leaks to a later plain Add
  const r=origOpen.apply(this,arguments);
  setTimeout(()=>{injectPartIdentityFields();const p=(typeof idx==='number'&&D.partsStock[idx])?D.partsStock[idx]:null;if(d('stockOemCode'))d('stockOemCode').value=p?.oemCode||p?.catalogOemCode||'';syncComponent();if(d('stockServiceComponentId')&&!p?.serviceComponentId&&activeContext?.componentId)d('stockServiceComponentId').value=activeContext.componentId;},0);
  return r;
 };
 const origSave=Sparepart.saveStock;
 Sparepart.saveStock=function(){
   const idx=this.stockEditIdx; const isEdit=idx!==null&&idx!==undefined&&!!D.partsStock[idx];
   const before=isEdit?JSON.parse(JSON.stringify(D.partsStock[idx])):null;
   const knownIds=new Set((D.partsStock||[]).map(x=>x&&x.id));
   const nameOk=!!(d('stockName')&&String(d('stockName').value||'').trim());
   const r=origSave.apply(this,arguments);
   if(!nameOk)return r; // original rejected the save (validation); touch nothing
   const p=isEdit?D.partsStock[idx]:(D.partsStock||[]).find(x=>x&&!knownIds.has(x.id));
   if(p){
     if(typeof StockCommandSOT==='undefined'||!StockCommandSOT||typeof StockCommandSOT.update!=='function'||typeof StockCommandSOT.setQty!=='function')throw new Error('StockCommandSOT wajib tersedia untuk finalisasi edit stok');
     const oem=(d('stockOemCode')?.value||'').trim().toUpperCase();
     const componentId=d('stockServiceComponentId')?.value||activeContext?.componentId||p.serviceComponentId||'';
     const patch={};
     if(oem)patch.oemCode=oem;
     if(componentId)patch.serviceComponentId=componentId;
     if(before&&Array.isArray(before.priceHistory)&&before.priceHistory.length){
       patch.price=before.price;patch.avgPrice=before.avgPrice;patch.lastPrice=before.lastPrice;patch.lastPurchaseDate=before.lastPurchaseDate;
       patch.manualPriceNote='Harga dikendalikan oleh riwayat pembelian; ubah melalui transaksi pembelian.';
     }
     if(Object.keys(patch).length)StockCommandSOT.update(p.id,patch);
     if(before&&Number(before.qty)!==Number(p.qty)){
       const qr=StockCommandSOT.setQty(p.id,Number(p.qty)||0,{reason:'manual-edit',source:'stock-modal',journal:true,journalBeforeQty:Number(before.qty)||0,saveNow:false});
       if(!qr.ok)throw new Error(qr.code||'STOCK_QTY_JOURNAL_FAILED');
     }
     // New parts are already sent to the catalog by the original saveStock; only edits need a re-link here (no duplicate ensurePart).
     if(isEdit&&typeof VehicleCatalogWriteSOT!=='undefined'&&VehicleCatalogWriteSOT.ensurePart){const cat=(D.sparepartCats||[]).find(c=>c&&c.id===p.catId);VehicleCatalogWriteSOT.ensurePart({partName:p.name,oemCode:oem||p.code,category:cat?.name||'Umum'},p.vehicleId||vehicleId()).then(ci=>{if(ci){const r=StockCommandSOT.update(p.id,{catalogPartId:ci.id,catalogId:ci.id});if(r.ok&&typeof save==='function')save();api.refreshAll();}}).catch(()=>{});}
     if(typeof save==='function')save();
   }
   activeContext=null; pendingContext=null; api.refreshAll();
   return r;
 };
 const origDelete=Sparepart.delStock;
 Sparepart.delStock=async function(i){
   const p=D.partsStock[i];if(!p)return;
   if(!isReferenced(p))return origDelete.apply(this,arguments);
   if(typeof askConfirm==='function'&&!await askConfirm(`Part "${p.name}" sudah memiliki history. Arsipkan agar purchase/service history tetap utuh?`,{title:'Arsipkan Part',icon:'📦',danger:true,okText:'Ya, Arsipkan'}))return;
   archivePart(p,'manual-delete-with-history');
   if(typeof save==='function')save();if(typeof Sparepart.renderStockList==='function')Sparepart.renderStockList();
   if(typeof toast==='function')toast('📦 Part diarsipkan; history pembelian & servis tetap utuh');api.refreshAll();
 };
 // S2041.1 (C3): "Hapus Semua" must not hard-delete parts that carry history -> re-add them as archived.
 const origRemoveAll=Sparepart.removeAllStockConfirm;
 if(typeof origRemoveAll==='function')Sparepart.removeAllStockConfirm=async function(){
   const snapshot=(D.partsStock||[]).map((p,i)=>({p,i})).filter(x=>x.p&&isReferenced(x.p));
   const r=await origRemoveAll.apply(this,arguments);
   let kept=0;
   snapshot.forEach(x=>{if(!(D.partsStock||[]).includes(x.p)&&!(D.partsStock||[]).some(y=>y&&y.id===x.p.id)){if(typeof StockCommandSOT==='undefined'||!StockCommandSOT||typeof StockCommandSOT.restoreRows!=='function')throw new Error('StockCommandSOT wajib tersedia untuk restore stok ber-history');const rr=StockCommandSOT.restoreRows([x.p]);if(!rr.ok)throw new Error(rr.code||'STOCK_HISTORY_RESTORE_FAILED');const restored=partById(x.p.id);archivePart(restored||x.p,'bulk-delete-with-history');kept++;}});
   if(kept){if(typeof save==='function')save();if(typeof Sparepart.renderStockList==='function')Sparepart.renderStockList();if(typeof toast==='function')toast('📦 '+kept+' part berhistory diarsipkan, tidak dihapus');api.refreshAll();}
   return r;
 };
 // S2041.1 (R2): archived parts leave normal pickers/matching/dashboard; visible in Stock Master only via toggle.
 const origForVeh=Sparepart.isPartForVehicle;
 if(typeof origForVeh==='function')Sparepart.isPartForVehicle=function(part){ if(part&&part.isArchived&&!(showArchived&&renderingList))return false; return origForVeh.apply(this,arguments); };
 const origStats=Sparepart.calcDashboardStats;
 if(typeof origStats==='function')Sparepart.calcDashboardStats=function(parts){const a=Array.prototype.slice.call(arguments);a[0]=(parts||[]).filter(x=>x&&!x.isArchived);return origStats.apply(this,a);};
 const origRender=Sparepart.renderStockList;
 if(typeof origRender==='function')Sparepart.renderStockList=function(){renderingList=true;let r;try{r=origRender.apply(this,arguments);}finally{renderingList=false;}decorateArchived();return r;};
 const origPopulateService=Servis?.populatePartSelect;if(typeof origPopulateService==='function')Servis.populatePartSelect=function(){const r=origPopulateService.apply(this,arguments);setTimeout(api.refreshAll,0);return r;};
 const origPopulateTx=typeof populateTxStockSelect==='function'?populateTxStockSelect:null;if(origPopulateTx){window.populateTxStockSelect=function(){const r=origPopulateTx.apply(this,arguments);setTimeout(api.refreshAll,0);return r;};}
 return true;
};
function boot(){api.install();api.refreshAll();const obs=new MutationObserver(()=>{api.refreshAll()});obs.observe(document.body,{childList:true,subtree:true});window.setTimeout(()=>obs.disconnect(),120000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));else setTimeout(boot,0);
window.PartCrudS2041=api;
window.PartPickerS2041=api.PartPicker;
})();
