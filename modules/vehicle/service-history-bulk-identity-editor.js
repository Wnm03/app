// S1973: Bulk History Identity Editor hardening — bounded selection, before/after audit, stale-identity warning, atomic guard.
// S1972 behavior remains cumulative; this extension stays outside servis.js to respect source-size guard.
(function(){
if(typeof Servis==='undefined')return;
const BulkHistoryIdentityEditor={
_selectedHistoryAuditIds(){
const panel=document.getElementById('servisHistoryPanel');
if(!panel)return[];
return Array.from(panel.querySelectorAll('input[data-service-audit-id]:checked')).map(x=>String(x.getAttribute('data-service-audit-id')||'')).filter(Boolean);
},
_renderBulkHistoryComponentOptions(master,selected){
if(typeof ServiceInputCatalog==='undefined')return '<option value="">Pilih komponen</option>';
const g=master&&typeof ServiceInputCatalog.groupById==='function'?ServiceInputCatalog.groupById(String(master)):null;
const items=g&&Array.isArray(g.items)?g.items:[];
return '<option value="">— Tidak memilih / kosongkan komponen —</option>'+items.map(x=>`<option value="${escapeHtml(String(x.id))}"${String(x.id)===String(selected||'')?' selected':''}>${escapeHtml(x.name||x.label||x.id)}</option>`).join('');
},
_bulkHistoryIdsFromEditor(){
const box=document.getElementById('serviceHistoryBulkIdentityEditor');
if(!box)return[];
return Array.from(box.querySelectorAll('[data-bulk-history-id]')).map(x=>String(x.getAttribute('data-bulk-history-id')||'')).filter(Boolean);
},
_bulkHistoryLegacyCategoryMismatch(log,targetMaster){
if(!log||!log.categoryId||!Array.isArray(D.sparepartCats))return false;
const cat=D.sparepartCats.find(c=>c&&String(c.id)===String(log.categoryId));
if(!cat)return false;
const legacyMaster=cat.masterCategoryId||null;
return !!legacyMaster&&String(legacyMaster)!==String(targetMaster||'');
},
_bulkHistoryAuditToken(){
try{if(typeof crypto!=='undefined'&&crypto.randomUUID)return crypto.randomUUID();}catch(_e){/* crypto unavailable; fallback id remains deterministic enough for this local operation */}
return 'bulk-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
},
refreshBulkHistoryIdentityPreview(){
const box=document.getElementById('serviceHistoryBulkIdentityEditor');
if(!box)return;
const ids=Servis._bulkHistoryIdsFromEditor();
const master=document.getElementById('serviceHistoryBulkCategory')?.value||'';
const component=document.getElementById('serviceHistoryBulkComponent')?.value||'';
const out=document.getElementById('serviceHistoryBulkPreview');
if(!out)return;
const groups=typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.groups==='function'?ServiceInputCatalog.groups():[];
const g=groups.find(x=>String(x.masterCategoryId)===String(master));
const comp=g&&Array.isArray(g.items)?g.items.find(x=>String(x.id)===String(component)):null;
const logs=ids.map(id=>(D.servisLogs||[]).find(x=>x&&String(x.id)===String(id))).filter(Boolean);
const changes=logs.filter(log=>{const sel=Servis.resolveCanonicalServiceSelection(log);return String(sel.masterCategoryId||'')!==String(master||'')||String(sel.serviceComponentId||'')!==String(component||'');});
const legacyMismatch=logs.filter(log=>Servis._bulkHistoryLegacyCategoryMismatch(log,master)).length;
const target=(g?g.group:'—')+' → '+(comp?(comp.name||comp.label||comp.id):'— komponen kosong');
const limitWarning=ids.length>100?'⚠️ Batas aman 100 riwayat per operasi terlampaui. Kurangi pilihan.':'';
const legacyWarning=legacyMismatch?`<div style="margin-top:5px;color:var(--accent2,#b44)">⚠️ ${legacyMismatch} riwayat masih memiliki tautan kategori Pengingat lama yang berbeda. Tautan lama <b>tidak</b> diubah otomatis.</div>`:'';
out.innerHTML=`<div class="u-fw700">Pratinjau: ${ids.length} riwayat dipilih · ${changes.length} akan berubah</div><div class="u-fs11 u-t2" style="margin-top:4px">Tujuan: <b>${escapeHtml(target)}</b></div><div class="u-fs11 u-t2" style="margin-top:4px">Tidak mengubah <b>KM, tanggal, biaya, transaksi, foto, checklist, part, atau interval reminder</b>.</div>${legacyWarning}${limitWarning?`<div class="u-fs11" style="margin-top:5px">${escapeHtml(limitWarning)}</div>`:''}`;
},
async openBulkHistoryIdentityEditor(){
const ids=Servis._selectedHistoryAuditIds();
if(!ids.length){toast('⚠️ Pilih minimal 1 riwayat terlebih dahulu');return;}
if(ids.length>100){toast('⚠️ Maksimal 100 riwayat per perubahan agar aman. Kurangi pilihan terlebih dahulu.');return;}
const current=(D.servisLogs||[]).find(x=>x&&x.id===Servis.editId)||null;
const logs=ids.map(id=>(D.servisLogs||[]).find(x=>x&&String(x.id)===String(id))).filter(Boolean);
if(!logs.length){toast('⚠️ Riwayat yang dipilih tidak ditemukan');return;}
const vehicleId=current?.vehicleId||curVehicleId;
if(logs.some(x=>String(x.vehicleId||vehicleId)!==String(vehicleId))){toast('⚠️ Pilihan harus berasal dari kendaraan yang sama');return;}
if(typeof ServiceInputCatalog==='undefined'||typeof ServiceInputCatalog.groups!=='function'){toast('⚠️ Katalog kategori/komponen SOT belum siap');return;}
const sels=logs.map(x=>Servis.resolveCanonicalServiceSelection(x));
const commonMaster=sels.length&&sels.every(x=>String(x.masterCategoryId||'')===String(sels[0].masterCategoryId||''))?String(sels[0].masterCategoryId||''):'';
const commonComponent=sels.length&&sels.every(x=>String(x.serviceComponentId||'')===String(sels[0].serviceComponentId||''))?String(sels[0].serviceComponentId||''):'';
let box=document.getElementById('serviceHistoryBulkIdentityEditor');
if(box)box.remove();
box=document.createElement('div');
box.id='serviceHistoryBulkIdentityEditor';box.className='overlay open';box.style.zIndex='435';
const groups=ServiceInputCatalog.groups()||[];
const catOptions=groups.map(x=>`<option value="${escapeHtml(String(x.masterCategoryId))}"${String(x.masterCategoryId)===commonMaster?' selected':''}>${escapeHtml(x.group||x.masterCategoryId)}</option>`).join('');
box.innerHTML=`<div class="modal"><div class="modal-title"><span>✏️ Edit Kategori/Komponen SOT</span><button class="modal-close" data-action="Servis.closeBulkHistoryIdentityEditor">✕</button></div><div class="u-fs11 u-t2" style="margin-bottom:10px">${logs.length} riwayat dipilih. Editor ini hanya memperbaiki identitas SOT. KM dan tanggal bersifat immutable di sini.</div><div class="fg"><label class="fl">Kategori Servis (SOT)</label><select class="fs" id="serviceHistoryBulkCategory" onchange="Servis.syncBulkHistoryComponentOptions()"><option value="">— Pilih kategori servis —</option>${catOptions}</select></div><div class="fg"><label class="fl">Komponen Servis (SOT)</label><select class="fs" id="serviceHistoryBulkComponent" onchange="Servis.refreshBulkHistoryIdentityPreview()">${Servis._renderBulkHistoryComponentOptions(commonMaster,commonComponent)}</select></div><div id="serviceHistoryBulkPreview" style="background:var(--surface3);border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin:10px 0"></div><div class="u-fs11 u-t2" style="line-height:1.5;margin-bottom:10px">Checklist tetap menjadi bukti pekerjaan masing-masing riwayat dan tidak ditimpa. Tautan kategori Pengingat lama (categoryId) juga tidak diubah otomatis agar tidak memindahkan reminder secara diam-diam.</div><div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button type="button" class="btn btn-ghost" data-action="Servis.closeBulkHistoryIdentityEditor">Batal</button><button type="button" class="btn btn-primary" data-action="Servis.commitBulkHistoryIdentityEdit">Simpan ${logs.length} Riwayat</button></div>${logs.map(x=>'<input type="hidden" data-bulk-history-id="'+escapeHtml(String(x.id))+'">').join('')}</div>`;
document.body.appendChild(box);Servis.refreshBulkHistoryIdentityPreview();
},
syncBulkHistoryComponentOptions(){
const cat=document.getElementById('serviceHistoryBulkCategory');
const comp=document.getElementById('serviceHistoryBulkComponent');
if(!cat||!comp)return;
const previous=comp.value||'';
comp.innerHTML=Servis._renderBulkHistoryComponentOptions(cat.value||'',previous);
if(previous&&!Array.from(comp.options).some(o=>o.value===previous))comp.value='';
Servis.refreshBulkHistoryIdentityPreview();
},
closeBulkHistoryIdentityEditor(){const box=document.getElementById('serviceHistoryBulkIdentityEditor');if(box)box.remove();},
async commitBulkHistoryIdentityEdit(){
const box=document.getElementById('serviceHistoryBulkIdentityEditor');
if(!box)return;
const ids=Array.from(box.querySelectorAll('[data-bulk-history-id]')).map(x=>String(x.getAttribute('data-bulk-history-id')||'')).filter(Boolean);
const master=String(document.getElementById('serviceHistoryBulkCategory')?.value||'');
const component=String(document.getElementById('serviceHistoryBulkComponent')?.value||'');
if(!ids.length){toast('⚠️ Tidak ada riwayat yang dipilih');return;}
if(!master){toast('⚠️ Pilih kategori servis SOT terlebih dahulu');return;}
const group=typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.groupById==='function'?ServiceInputCatalog.groupById(master):null;
if(!group){toast('⚠️ Kategori SOT tidak ditemukan');return;}
const items=Array.isArray(group.items)?group.items:[];
if(component&&!items.some(x=>String(x.id)===component)){toast('⚠️ Komponen tidak cocok dengan kategori yang dipilih');return;}
const current=(D.servisLogs||[]).find(x=>x&&x.id===Servis.editId)||null;
const vehicleId=current?.vehicleId||curVehicleId;
const logs=ids.map(id=>(D.servisLogs||[]).find(x=>x&&String(x.id)===id)).filter(Boolean);
if(logs.length!==ids.length||logs.some(x=>String(x.vehicleId||vehicleId)!==String(vehicleId))){toast('⚠️ Validasi kendaraan/riwayat gagal. Tidak ada perubahan disimpan.');return;}
const plan=logs.map(log=>{const oldSel=Servis.resolveCanonicalServiceSelection(log);const nextMaster=master;const nextComponent=component||'';const fields=[];if(String(oldSel.masterCategoryId||'')!==nextMaster)fields.push('masterCategoryId');if(String(oldSel.serviceComponentId||'')!==nextComponent)fields.push('serviceComponentId');return {log,oldSel,nextMaster,nextComponent,fields};});
const changes=plan.filter(x=>x.fields.length);
if(!changes.length){toast('ℹ️ Tidak ada perubahan identitas SOT');return;}
if(changes.length>100){toast('⚠️ Operasi dibatasi maksimal 100 riwayat. Tidak ada perubahan disimpan.');return;}
const targetLabel=`${group.group||master} → ${component?(items.find(x=>String(x.id)===component)?.name||component):'komponen kosong'}`;
const legacyMismatch=changes.filter(x=>Servis._bulkHistoryLegacyCategoryMismatch(x.log,master)).length;
const legacyNote=legacyMismatch?` Ada ${legacyMismatch} tautan kategori Pengingat lama yang berbeda; tautan tersebut tetap dipertahankan dan tidak dipindahkan otomatis.`:'';
if(typeof askConfirm==='function'&&!await askConfirm(`Simpan perubahan identitas SOT untuk ${changes.length} riwayat ke “${targetLabel}”? KM, tanggal, checklist, biaya, foto, part, dan interval reminder tidak diubah.${legacyNote}`))return;
const bulkId=Servis._bulkHistoryAuditToken();
const rollback=changes.map(x=>({log:x.log,master:x.log.masterCategoryId,component:x.log.serviceComponentId,editHistory:Array.isArray(x.log.editHistory)?x.log.editHistory.slice():x.log.editHistory}));
try{
const now=new Date().toISOString();
changes.forEach(x=>{
  const before={masterCategoryId:x.log.masterCategoryId||null,serviceComponentId:x.log.serviceComponentId||null};
  const after={masterCategoryId:x.nextMaster||null,serviceComponentId:x.nextComponent||null};
  x.log.masterCategoryId=x.nextMaster||null;
  x.log.serviceComponentId=x.nextComponent||null;
  if(!Array.isArray(x.log.editHistory))x.log.editHistory=[];
  x.log.editHistory.push({changedAt:now,changedBy:'self',source:'bulk-history-identity-editor-s1972',schemaVersion:'S1973',bulkId,fields:x.fields,before,after});
  if(x.log.editHistory.length>50)x.log.editHistory=x.log.editHistory.slice(-50);
});
const saved=save({domain:'servis',financeMutation:false});
if(saved===false)throw new Error('persistence_stale');
Servis.closeBulkHistoryIdentityEditor();
if(typeof refreshCarNotesAfterMutation==='function')refreshCarNotesAfterMutation({});
Servis.renderList();
Servis.renderEditHistoryTab();
toast(`✅ ${changes.length} riwayat diperbarui. KM/tanggal/checklist tetap; audit bulk ${bulkId.slice(-8)}.`);
}catch(e){
rollback.forEach(r=>{r.log.masterCategoryId=r.master;r.log.serviceComponentId=r.component;r.log.editHistory=r.editHistory;});
console.error('Bulk history identity edit failed:',e);toast('⚠️ Gagal menyimpan. Semua perubahan dibatalkan.');
}
}
};
Object.assign(Servis,BulkHistoryIdentityEditor);
})();
