// S1973: Bulk History Identity Editor hardening — bounded selection, before/after audit, stale-identity warning, atomic guard.
// S1972 behavior remains cumulative; this extension stays outside servis.js to respect source-size guard.
(function(){
if(typeof Servis==='undefined')return;
const BulkHistoryIdentityEditor={
_selectedHistoryAuditIds(){
const panel=document.getElementById('servisAuditPanel')||document.getElementById('servisHistoryPanel');
if(typeof Servis.getHistoryAuditSelectionIds==='function')return Servis.getHistoryAuditSelectionIds(curVehicleId);
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
try{
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
}catch(err){
 console.error('[S1976] openBulkHistoryIdentityEditor failed',err);
 if(typeof toast==='function')toast('⚠️ Editor SOT tidak dapat dibuka. Pilihan riwayat tetap aman.',5000);
}
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
const saved=typeof save==='function'?await Promise.resolve(save({domain:'servis',financeMutation:false})):true;
if(saved===false)throw new Error('persistence_stale');
if(typeof saveFlush==='function'&&saveFlush()===false)throw new Error('persistence_flush_failed');
const verify=(D.servisLogs||[]);
if(changes.some(x=>{const live=verify.find(r=>r&&String(r.id)===String(x.log.id));return !live||String(live.masterCategoryId||'')!==String(x.nextMaster||'')||String(live.serviceComponentId||'')!==String(x.nextComponent||'');}))throw new Error('persistence_verify_failed');
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

// S1974+: Audit/Package surface is kept with the bulk-history extension so
// servis.js remains below the source-size guard. Riwayat stays evidence-only.
(function(){
if(typeof Servis==='undefined')return;
Servis.renderEditAuditTab=function(){
const panel=document.getElementById('servisAuditPanel');
if(!panel||Servis.editId===null)return;
const current=(D.servisLogs||[]).find(x=>x&&x.id===Servis.editId);
if(!current){panel.innerHTML='<div class="empty"><div class="empty-text">Data riwayat servis tidak ditemukan.</div></div>';return;}
const vehicleId=current.vehicleId||curVehicleId;
const history=(D.servisLogs||[]).filter(x=>x&&x.vehicleId===vehicleId).slice().sort((a,b)=>{if(typeof compareServiceHistoryRecency==='function')return compareServiceHistoryRecency(b,a);return String(b.date||'').localeCompare(String(a.date||''))||Number(b.km||0)-Number(a.km||0);});
const pkgApi=typeof ServiceHistoryAuditPackage!=='undefined'?ServiceHistoryAuditPackage:null;
const packages=pkgApi&&typeof pkgApi.listByVehicle==='function'?pkgApi.listByVehicle(vehicleId):typeof pkgApi?.forVehicle==='function'?pkgApi.forVehicle(vehicleId):[];
const packageRows=packages.length?packages.map(p=>{const title=p.title||'Paket Pekerjaan';const count=Array.isArray(p.sourceServiceIds)?p.sourceServiceIds.length:0;return `<div style="padding:8px 0;border-top:1px solid var(--border2)"><div class="u-flex u-jcb u-aic"><div><div class="u-fw700 u-fs11">📦 ${escapeHtml(title)}</div><div class="u-fs10 u-t2">${escapeHtml(p.typeLabel||p.typeId||'Pekerjaan Lainnya')} · ${count} sumber</div></div><div style="display:flex;gap:5px;flex-wrap:wrap"><button type="button" class="btn btn-ghost btn-sm" data-action="Servis.openHistoryAuditPackage" data-args="${escapeHtml(JSON.stringify([p.id]))}">Audit</button><button type="button" class="btn btn-ghost btn-sm" data-action="Servis.editHistoryAuditPackage" data-args="${escapeHtml(JSON.stringify([p.id]))}">Edit</button><button type="button" class="btn btn-ghost btn-sm" data-action="Servis.removeHistoryAuditPackage" data-args="${escapeHtml(JSON.stringify([p.id]))}">Hapus</button></div></div></div>`;}).join(''):'<div class="u-fs11 u-t2">Belum ada paket pekerjaan.</div>';
const candidates=typeof ServiceSessionSOT!=='undefined'&&typeof ServiceSessionSOT.candidateGroups==='function'?ServiceSessionSOT.candidateGroups(vehicleId):[];
const candidateRows=candidates.length?candidates.map((c,i)=>`<div style="padding:8px 0;border-top:1px dashed var(--border)"><div class="u-flex u-jcb u-aic"><div class="u-fs11"><b>Kandidat ${i+1}</b> · ${c.logs.length} riwayat · ${escapeHtml(c.reason||'')}</div><button type="button" class="btn btn-ghost btn-sm" data-action="ServiceSessionSOT.openMerge" data-args="${escapeHtml(JSON.stringify([c.ids]))}">Tinjau</button></div><div class="u-fs11 u-t2" style="margin-top:4px">${escapeHtml(c.logs.map(x=>x.item||'Tanpa nama').slice(0,4).join(', '))}</div></div>`).join(''):'<div class="u-fs11 u-t2">Tidak ada kandidat sesi otomatis.</div>';
const typeOptions=(pkgApi&&Array.isArray(pkgApi.TYPES)?pkgApi.TYPES:[]).map(t=>`<option value="${escapeHtml(t.id)}">${escapeHtml(t.label)}</option>`).join('');
const selectedIds=new Set(typeof Servis.getHistoryAuditSelectionIds==='function'?Servis.getHistoryAuditSelectionIds(vehicleId):[]);
   const selectionRows=history.map(log=>{const jt=log.serviceJobLabel||log.serviceJobType||'Belum ditetapkan';return `<label style="display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--border2);font-size:11px"><input type="checkbox" ${selectedIds.has(String(log.id))?'checked':''} data-service-audit-id="${escapeHtml(String(log.id))}"><span><b>${escapeHtml(log.item||'Tanpa nama')}</b><br><span class="u-t2">${escapeHtml(log.date||'')} · ${log.km==null?'':Number(log.km).toLocaleString('id-ID')+' km'} · Rp ${Number(log.cost||0).toLocaleString('id-ID')}</span><br><span class="u-t2">🔧 ${escapeHtml(jt)}</span></span></label>`;}).join('');
panel.innerHTML=`<div style="background:var(--surface3);border:1px solid var(--border2);border-radius:12px;padding:12px;margin-bottom:12px"><div class="u-fw700 u-fs13">📦 Audit & Paket Pekerjaan</div><div class="u-fs11 u-t2" style="margin-top:4px">Operasi audit/bulk dipisahkan dari Riwayat. Riwayat asli tetap menjadi sumber kebenaran.</div></div><div class="fg"><div class="u-flex u-jcb u-aic"><label class="fl">Riwayat kendaraan ini</label><span id="serviceAuditSelectionCount" class="u-fs11 u-t2">0 dipilih</span></div><div style="max-height:280px;overflow:auto;border:1px solid var(--border2);border-radius:10px;padding:0 10px">${selectionRows||'<div class="u-fs11 u-t2" style="padding:10px 0">Belum ada riwayat.</div>'}</div><div style="display:flex;gap:6px;margin:8px 0;flex-wrap:wrap"><button type="button" class="btn btn-ghost btn-sm" data-action="Servis.selectAllHistoryAudit">Pilih Semua</button><button type="button" class="btn btn-ghost btn-sm" data-action="Servis.clearHistoryAuditSelection">Kosongkan</button><button type="button" class="btn btn-primary btn-sm" id="serviceBulkHistoryEditBtn" data-action="Servis.openBulkHistoryIdentityEditor">✏️ Edit Kategori/Komponen SOT</button><button type="button" class="btn btn-ghost btn-sm" id="serviceBulkHistoryJobTypeBtn" data-action="Servis.openHistoryJobTypeEditor">🔧 Jenis Pekerjaan</button></div><div class="u-fs11 u-t2">Maksimal 100 riwayat per operasi. KM/tanggal/checklist/biaya/foto/part tidak ikut berubah.</div></div><div class="fg"><label class="fl">Nama paket</label><input class="fi" id="serviceAuditPackageTitle" placeholder="Contoh: Servis Besar September"></div><div class="fg"><label class="fl">Jenis paket</label><select class="fs" id="serviceAuditPackageType">${typeOptions}</select></div><button type="button" class="btn btn-primary btn-full" id="serviceCreateHistoryAuditPackageBtn" data-action="Servis.createHistoryAuditPackage" disabled>📦 Jadikan Paket Pekerjaan</button><div class="fg"><label class="fl">Paket tersimpan</label>${packageRows}</div><div class="fg"><div class="u-fw700 u-fs12">🔎 Kandidat Sesi</div><div class="u-fs11 u-t2" style="margin-top:4px">Kandidat hanya bahan review; aplikasi tidak menyimpulkan jenis pekerjaan tanpa konfirmasi.</div>${candidateRows}</div>`;
panel.querySelectorAll('input[data-service-audit-id]').forEach(el=>el.addEventListener('change',()=>{Servis.setEditHistoryAuditSelection(String(el.getAttribute('data-service-audit-id')||''),!!el.checked);}));
Servis.updateHistoryAuditSelection();
};
})();

// S1974: Job Type editor kept in the already-loaded bulk extension so no new
// runtime bundle entry is required. Job Type is service-level classification;
// Package remains a separate reference/group layer.
(function(){
if(typeof Servis==='undefined')return;
const JobTypeEditorS1974={
_selectedHistoryJobTypeIds(){
 const panel=document.getElementById('servisAuditPanel')||document.getElementById('servisHistoryPanel');
 if(typeof Servis.getHistoryAuditSelectionIds==='function')return Servis.getHistoryAuditSelectionIds(curVehicleId);
 return panel?Array.from(panel.querySelectorAll('input[data-service-audit-id]:checked')).map(x=>String(x.getAttribute('data-service-audit-id')||'')).filter(Boolean):[];
},
openHistoryJobTypeEditor(){
 try{
 const ids=JobTypeEditorS1974._selectedHistoryJobTypeIds();
 if(!ids.length){toast('⚠️ Pilih minimal 1 riwayat terlebih dahulu');return;}
 if(ids.length>100){toast('⚠️ Maksimal 100 riwayat per operasi.');return;}
 const jobs=typeof ServiceSessionSOT!=='undefined'&&Array.isArray(ServiceSessionSOT.JOB_TYPES)?ServiceSessionSOT.JOB_TYPES:[];
 let box=document.getElementById('serviceHistoryJobTypeEditor');if(box)box.remove();
 const current=(D.servisLogs||[]).find(x=>x&&x.id===Servis.editId)||null;
 const common=ids.map(id=>(D.servisLogs||[]).find(x=>x&&String(x.id)===id)).filter(Boolean);
 const commonType=common.length&&common.every(x=>String(x.serviceJobType||'')===String(common[0].serviceJobType||''))?String(common[0].serviceJobType||''):'';
 box=document.createElement('div');box.id='serviceHistoryJobTypeEditor';box.className='overlay open';box.style.cssText='z-index:440;position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;';
 box.innerHTML=`<div class="modal" style="width:100%;max-width:520px;box-sizing:border-box;margin:0 auto;max-height:100dvh;overflow-y:auto"><div class="modal-title"><span>🔧 Tetapkan Jenis Pekerjaan</span><button class="modal-close" data-action="Servis.closeHistoryJobTypeEditor">✕</button></div><div class="u-fs11 u-t2" style="margin-bottom:10px">${ids.length} riwayat dipilih. Jenis pekerjaan adalah klasifikasi service-level; tidak mengubah kategori/komponen SOT dan tidak membuat paket.</div><div class="fg"><label class="fl">Jenis Pekerjaan</label><select class="fs" id="serviceHistoryJobType"><option value="">— Hapus jenis pekerjaan —</option>${jobs.map(j=>`<option value="${escapeHtml(String(j.id))}"${String(j.id)===commonType?' selected':''}>${escapeHtml(j.label||j.name||j.id)}</option>`).join('')}</select></div><div class="u-fs11 u-t2" style="margin:8px 0 12px;line-height:1.5">KM, tanggal, biaya, checklist, kategori, komponen, part, dan reminder interval tidak ikut berubah.</div><div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn btn-ghost" data-action="Servis.closeHistoryJobTypeEditor">Batal</button><button type="button" class="btn btn-primary" data-action="Servis.commitHistoryJobTypeEditor">Simpan</button></div></div>`;
 document.body.appendChild(box);
 }catch(err){
  console.error('[S1976] openHistoryJobTypeEditor failed',err);
  if(typeof toast==='function')toast('⚠️ Editor jenis pekerjaan tidak dapat dibuka. Pilihan riwayat tetap aman.',5000);
 }
},
closeHistoryJobTypeEditor(){let box=document.getElementById('serviceHistoryJobTypeEditor');if(box)box.remove();},
async commitHistoryJobTypeEditor(){
 const ids=JobTypeEditorS1974._selectedHistoryJobTypeIds();const jobId=document.getElementById('serviceHistoryJobType')?.value||'';
 if(!ids.length)return;
 if(typeof ServiceSessionSOT==='undefined'||typeof ServiceSessionSOT.jobType!=='function'||typeof ServiceSessionSOT.setJobType!=='function'){toast('⚠️ ServiceSessionSOT belum siap');return;}
 if(ids.length>100){toast('⚠️ Maksimal 100 riwayat per operasi.');return;}
 const logs=ids.map(id=>(D.servisLogs||[]).find(x=>x&&String(x.id)===id)).filter(Boolean);
 if(logs.length!==ids.length){toast('⚠️ Sebagian riwayat tidak ditemukan');return;}
 const vehicles=new Set(logs.map(x=>String(x.vehicleId||'')).filter(Boolean));
 if(vehicles.size>1){toast('⚠️ Semua riwayat harus berasal dari kendaraan yang sama');return;}
 if(jobId&&!ServiceSessionSOT.jobType(jobId)){toast('⚠️ Jenis pekerjaan tidak valid');return;}
 const before=logs.map(x=>({id:x.id,serviceJobType:x.serviceJobType||null,serviceJobLabel:x.serviceJobLabel||null,serviceJobEvidence:x.serviceJobEvidence||null,serviceSessionSotVersion:x.serviceSessionSotVersion||null,masterCategoryId:x.masterCategoryId||null,editHistory:Array.isArray(x.editHistory)?x.editHistory.slice():x.editHistory}));
 const type=jobId?ServiceSessionSOT.jobType(jobId):null;
 const label=type?type.label:'Tanpa jenis pekerjaan';
 if(typeof askConfirm==='function'&&!await askConfirm(`Tetapkan “${label}” untuk ${logs.length} riwayat? KM, tanggal, biaya, checklist, part, dan interval reminder tidak diubah.`))return;
 try{
   const now=new Date().toISOString();
   for(const log of logs){
     const old={serviceJobType:log.serviceJobType||null,serviceJobLabel:log.serviceJobLabel||null,serviceJobEvidence:log.serviceJobEvidence||null};
     if(jobId){const r=ServiceSessionSOT.setJobType(log,jobId,'manual');if(!r||!r.ok)throw new Error(r&&r.code||'job_type_rejected');}
     else{log.serviceJobType=null;log.serviceJobLabel=null;log.serviceJobEvidence=null;}
     if(!Array.isArray(log.editHistory))log.editHistory=[];
     log.editHistory.push({changedAt:now,changedBy:'self',source:'history-job-type-editor-s1974',fields:['serviceJobType'],before:old,after:{serviceJobType:log.serviceJobType||null,serviceJobLabel:log.serviceJobLabel||null,serviceJobEvidence:log.serviceJobEvidence||null}});
     if(log.editHistory.length>50)log.editHistory=log.editHistory.slice(-50);
   }
   const saved=typeof save==='function'?await Promise.resolve(save({domain:'servis',financeMutation:false})):true;
   if(saved===false)throw new Error('persistence_failed');
   if(typeof saveFlush==='function'&&saveFlush()===false)throw new Error('persistence_flush_failed');
   const verify=D.servisLogs||[];
   if(logs.some(log=>{const live=verify.find(r=>r&&String(r.id)===String(log.id));return !live||String(live.serviceJobType||'')!==String(log.serviceJobType||'')||String(live.serviceJobLabel||'')!==String(log.serviceJobLabel||'');}))throw new Error('persistence_verify_failed');
 }catch(err){
   logs.forEach((log,i)=>Object.assign(log,before[i]));
   toast('⚠️ Jenis pekerjaan tidak disimpan');
   console.warn('S1974 history job type rollback',err);
   return;
 }
 toast(`✅ Jenis pekerjaan diperbarui untuk ${logs.length} riwayat`);
 JobTypeEditorS1974.closeHistoryJobTypeEditor();
 Servis.renderEditAuditTab();
}
};
Object.assign(Servis,JobTypeEditorS1974);
})();

})();
