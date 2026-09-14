// modules/vehicle/servis.js — extracted mechanically from car-notes.js.
// Sesi pemisahan mekanis: 0 logic change. Runtime contract: window.Servis = Servis.
const Servis={
editId:null,
listPage:1,
lastFilterSig:null,
// Sesi 1C ralat: checklist sekarang hidup DI DALAM alur Catat Servis,
// bukan modal terpisah/Torsi-only. State ini in-memory dan mengikuti modal.
_serviceChecklistGroupIdx:null,
_serviceChecklistMasterCategoryIds:[],
// _photoDraft — BARU (Sesi F1, ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md
// §7 Sesi F "Foto di Service History"). Array dataURL string, in-memory
// draft SAJA selama modal servis terbuka (dipopulasi dari s.foto saat
// edit, dikosongkan saat tambah baru) -- baru ditulis ke D.servisLogs[].foto
// saat _saveInner() sukses. Pola construction sama seperti field lain di
// objek ini (editId dll): reset di openModal(), dibaca di _saveInner().
_photoDraft:[],
// activeActionTypeFilter — BARU (Sesi E6, ROADMAP-KONSOLIDASI-DATABASE-
// SERVIS-v2.md §7 Sesi E item 6 "filter riwayat by actionType"). State
// in-memory murni (bukan field D baru, tidak dipersist -- pola sama
// Torsi.activeCat). null = "Semua" (0 filter, 0 perubahan perilaku
// renderList() lama). Nilai lain: 'periksa'/'bersih'/'ganti'.
activeActionTypeFilter:null,
// activeMasterCategoryFilter — BARU (Sesi D-lanjutan4, ROADMAP-KONSOLIDASI-
// DATABASE-SERVIS-v2.md §7 Sesi D — item "filter/chip masterCategory di
// Servis.renderList() (Riwayat Servis)" yang SENGAJA ditunda di Sesi
// D-lanjutan3 (v1670, lihat SESSION-NOTE-sesi-d-lanjutan3-mastercategoryfilter-
// v1670.md "Sengaja TIDAK dikerjakan sesi ini") krn renderList() adalah
// daftar LOG (butuh join balik ke kategori dulu via resolveLogMasterCategoryId()
// di bawah), beda dari Sparepart.renderCatList() yg daftar KATEGORI langsung.
// State in-memory murni (bukan field D baru, tidak dipersist -- pola sama
// persis activeActionTypeFilter/Sparepart.activeMasterCategoryFilter). null =
// "Semua" (0 filter, 0 perubahan perilaku lama).
activeMasterCategoryFilter:null,
activeServiceComponentFilter:null,
// _masterCategoryFilterPrefsLoaded/_masterCategoryFilterStorageKey +
// _loadMasterCategoryFilterPrefsOnce()/_saveMasterCategoryFilterPrefs() --
// Sesi D-lanjutan5. Pola & alasan SAMA PERSIS versi Sparepart
// (modules/vehicle/sparepart-servis.js) -- lihat komentar lengkap di sana
// (kenapa bukan FilterPrefsStore apa adanya, dst). Key storage BEDA (khusus
// Servis, terpisah dari Sparepart) supaya preferensi filter kedua tab tidak
// saling timpa.
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
// localStorage korup/tidak tersedia -> abaikan, filter tetap default null
// ("Semua") -- 0 crash.
}
},
_saveMasterCategoryFilterPrefs(){
if(typeof localStorage==='undefined')return;
try{
localStorage.setItem(Servis._masterCategoryFilterStorageKey,JSON.stringify({activeMasterCategoryFilter:Servis.activeMasterCategoryFilter}));
}catch(err){
// localStorage penuh/diblokir -> abaikan (0 crash).
}
},
// resolveLogMasterCategoryId(s) -- Sesi D-lanjutan4. Join 1 entry riwayat
// servis (s, dari D.servisLogs) balik ke kategori masternya (13 kategori
// terkunci, DatabaseAPI.masterCategory). Reuse persis pola join yang SUDAH
// ADA di openServisModal() (lihat baris `linkedCat` jalur edit/prefill
// interval): s.categoryId (tautan langsung, entry baru sejak field ini ada)
// -> fallback resolveServisCatForVehicle(s.item, vehicleId) (match nama+
// kendaraan, utk entry lama tanpa categoryId) -> fallback match nama polos
// (fail-safe terakhir kalau resolveServisCatForVehicle tidak termuat). Begitu
// dapat kategori (cat), delegasi ke resolveCatGroup() apa adanya (SoT
// tunggal, 0 logic classify baru) utk masterCategoryId-nya -- pola sama
// persis Sparepart.dashReminderMasterCatBadgeHTML()/updateMasterCatBadge().
// 0 match kategori ATAU 0 match kategori master -> null (bukan ditebak),
// entry itu tidak akan cocok filter kategori master mana pun (tetap tampil
// normal saat filter "Semua").
resolveLogMasterCategoryId(s){
if(typeof resolveCatGroup!=='function')return null;
const vehicleId=s.vehicleId||curVehicleId;
const linkedCat=(s.categoryId&&D.sparepartCats.find(c=>c.id===s.categoryId))||(typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(s.item,vehicleId):D.sparepartCats.find(c=>c.name.toLowerCase()===(s.item||'').toLowerCase()));
if(!linkedCat)return null;
const r=resolveCatGroup(linkedCat,vehicleId);
return r?r.masterCategoryId:null;
},
// resolveLogServiceComponentId(s) — satu resolver komponen untuk seluruh
// riwayat servis. Prioritas: serviceComponentId tersimpan (SOT baru),
// checklist[].itemId (kompatibilitas data lama), lalu infer katalog hanya
// sebagai fallback legacy. Jangan hanya membaca checklist karena riwayat
// yang dibuat dari modal/pengingat dapat valid tanpa payload checklist.
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
// setMasterCategoryFilter(id) -- Sesi D-lanjutan4. Dipanggil dari klik chip
// filter (data-action="Servis.setMasterCategoryFilter") di Riwayat Servis.
// id: null ("Semua") atau salah satu id dari 13 kategori master. Pola sama
// persis setActionTypeFilter() di atas -- reset listPage ke 1 supaya
// pagination tidak nyangkut di halaman lama saat filter berganti.
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
  // FIX (audit rekomendasi N, Sep 2026 -- "filter waktu riwayat servis per
  // part"): sebelum ini, tombol "🧾 Riwayat" di kartu Pengingat cuma
  // men-set filter kategori/komponen TANPA menyentuh cnPeriode (chip
  // Harian/Mingguan/Bulanan/Tahunan/Selamanya di atas tab Catatan
  // Kendaraan -- dipakai bareng oleh Servis.renderList() lewat
  // getCnRange()). Kalau user sebelumnya sempat pindah periode ke yang
  // sempit (mis. "Bulanan") lalu tap "Riwayat" dari kartu part tertentu,
  // riwayat part itu bisa tampak KOSONG walau datanya ada -- padahal siklus
  // servis 1 part (bulan-tahun) jarang muat di jendela waktu sesempit itu.
  // Paksa 'selamanya' di sini (sama seperti setCnPeriode('selamanya',..)
  // tanpa memanggil ulang renderCnTab() yang lebih berat) supaya tap
  // "Riwayat" dari part MANAPUN selalu tampilkan histori lengkapnya dulu;
  // user tetap bebas mempersempit lagi manual via chip periode kalau perlu.
  // 0 perubahan ke setCnPeriode()/getCnRange() itu sendiri.
  // FIX-LANJUTAN (audit rekomendasi N-lanjutan, Sep 2026, saran #1): cnPeriode
  // dulu 1 variabel GLOBAL dipakai bareng sub-tab BBM & Servis, jadi paksa
  // 'selamanya' di sini ikut ke-reset filter periode BBM begitu user pindah
  // sub-tab (efek samping yang dilaporkan -- chip-nya tetap kesinkron
  // secara visual, cuma bikin bingung). SoT periode kini per sub-tab lewat
  // cnPeriodeByTab (features-helpers-global-security.js) + setCnTab()/
  // setCnPeriode() (vehicle-core.js) yang menyalin cnPeriodeByTab[tab] ->
  // cnPeriode tiap ganti tab. Di sini cukup timpa cnPeriodeByTab['servis']
  // (BUKAN 'bbm') supaya filter BBM tidak ikut kesentuh; setCnTab() akan
  // otomatis mengembalikan periode BBM begitu user pindah ke sana lagi.
  // saran #2: toast konfirmasi HANYA saat periode benar-benar berubah
  // (bukan sudah 'selamanya' dari sebelumnya) -- supaya tidak dobel-notif
  // tiap tap "Riwayat" beruntun dari part yang berbeda.
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
// renderMasterCategoryChips(beforeEl) -- Sesi D-lanjutan4. Chip row filter
// riwayat by kategori master (13 terkunci), DISISIPKAN lewat JS sebelum
// beforeEl (pola sama persis renderActionTypeChips() di atas &
// Sparepart.renderMasterCategoryChips() Sesi D-lanjutan3) -- 1x dibuat (cek
// getElementById dulu), tidak dobel-insert di render berikutnya. Guard: 0
// DatabaseAPI.masterCategory sama sekali -> row TIDAK dibuat sama sekali
// (bukan tampil kosong), pola sama "0/>1 kandidat = dilewati, tidak
// menebak" yang konsisten dipakai di seluruh fitur Sesi D.
renderMasterCategoryChips(beforeEl){
// Sesi UX: Riwayat Servis memakai dropdown kategori, bukan 15 chip sekaligus.
// Tetap mempertahankan ID container lama supaya tidak ada selector/cleanup
// yang bergantung pada nama elemen. Ini murni perubahan presentasi; SoT,
// sentinel UNCATEGORIZED_FILTER_ID, persistensi, dan setMasterCategoryFilter()
// tetap sama.
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
// Bugfix (laporan user): dropdown ini dulu tampil SEMUA D.partsStock tanpa
// pandang kendaraan aktif -- sekarang di-filter reuse Sparepart.isPartForVehicle()
// (part tanpa tautan katalog/kendaraan tetap tampil, lihat catatan di sana).
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
/** Muat daftar part Vehicle Catalog ke dropdown `servisCatalogPartId` (Tahap 6
 * Sesi 2 — UI picker, reuse VehicleCatalog.getAll() apa adanya, TIDAK ada
 * filter/rekomendasi otomatis berdasar jenis kendaraan/servis). Async karena
 * VehicleCatalog.getAll() async (baca IDBStore) — dipanggil fire-and-forget
 * dari openModal() (pola sama beberapa populate async lain di app), select
 * tetap kosong dulu sampai promise resolve. Guard typeof supaya modal servis
 * tetap berfungsi normal kalau VehicleCatalog belum sempat dimuat. */
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
// Bugfix (laporan user): dulu tampil SEMUA part katalog tanpa pandang
// kendaraan aktif -- reuse VehicleCatalog.filterForVehicle() yang sama
// dipakai VehicleCatalogUI.renderList().
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
/** Muat & tampilkan area rekomendasi part katalog (Tahap 6 Sesi 4 — chip
 * list, TIDAK mengubah dropdown/qty/servisLogs/stok apa pun, murni saran
 * yang bisa diklik). Reuse VehicleCatalog.recommend() apa adanya, dasar
 * rekomendasi: kendaraan aktif (curVehicleId) + isi field "Jenis Servis/
 * Item" saat ini. Guard typeof supaya modal servis tetap berfungsi normal
 * kalau VehicleCatalog belum sempat dimuat. Async (fire-and-forget, pola
 * sama populateCatalogPartSelect) — area disembunyikan dulu sampai
 * promise resolve & ada hasil. */
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
/** Klik 1 chip rekomendasi -> otomatis pilih part itu di dropdown
 * `servisCatalogPartId` (kalau opsinya sudah termuat) & tampilkan field
 * qty (reuse onCatalogPartChange() apa adanya). TIDAK menyimpan apa pun
 * (belum mengubah servisLogs/stok — sesuai cakupan sesi ini), murni bantu
 * isi form. */
selectCatalogRecommendation(catalogId){
const sel=document.getElementById('servisCatalogPartId');
if(!sel)return;
const hasOption=Array.from(sel.options||[]).some(o=>o.value===String(catalogId));
if(!hasOption)return;
sel.value=String(catalogId);
Servis.onCatalogPartChange();
},
// syncServiceChecklist() — satu pintu sinkronisasi UI checklist dengan
// field Jenis Servis/Item. Sumber kategori/item 100% SERVICE_CHECKLIST_GROUPS
// melalui ServisChecklist; D.sparepartCats/TORSI_DB hanya boleh membantu
// interval/kategori servis yang sudah ada, bukan membuat checklist kedua.
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
// BUGFIX (audit, laporan user; merged from PATCH-v1701-riwayat-servis-kategori-komponen-bocor-antar-record):
// populateCategorySelect/populateComponentSelect fallback ke `sel.value` saat argumen selectedId
// kosong ('') -- ini SoT yang benar hanya kalau dipanggil dari sync() manual (user lagi ngetik, mau
// PERTAHANKAN pilihan manual yang sudah ada). Tapi renderServiceInputSelectors() dipanggil tiap kali
// modal Riwayat Servis dibuka utk record APAPUN (openModal()), jadi kalau record yang dibuka TIDAK
// punya masterCategoryId/serviceComponentId (selectedMasterId/selectedComponentId kosong), fallback
// itu malah membaca value LAMA yang masih nempel di elemen <select> dari record sebelumnya yang
// barusan ditutup -- akibatnya Riwayat A kelihatan pakai kategori/komponen Riwayat B (atau sebaliknya)
// tiap kali gonta-ganti buka 2 riwayat berbeda. Fix: reset value select ke '' dulu SEBELUM populate,
// supaya fallback di dalam populateCategorySelect/populateComponentSelect tidak py apa pun buat
// dibaca selain argumen yang memang dikirim eksplisit dari sini.
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
// BUGFIX (audit): pakai resolveServisCatForVehicle() (sparepart-servis.js)
// supaya interval yang diautofill milik kategori kendaraan AKTIF, bukan
// ke-nyasar ke kategori privat kendaraan lain yang kebetulan nama-nya
// sama. Guard typeof supaya tetap aman kalau file itu belum termuat
// (mis. test yang load car-notes.js secara terisolasi).
const matched=item?(typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(item,curVehicleId):D.sparepartCats.find(c=>c.name.toLowerCase()===item.toLowerCase())):null;
intervalEl.value=matched?matched.intervalKm:'';
}
Servis.tryAutoLinkCatalogPart(item);
Servis.renderCatalogRecommendations();
Servis.syncServiceChecklist();
},
/** BUGFIX (laporan user, Sesi 545): render suggest-box custom untuk
 * "Jenis Servis/Item" (reuse pola simpleAutocompleteInput() yang sudah
 * dipakai field lain di app ini -- lihat catatan lengkap di
 * Sparepart.populateDatalist(), modules/vehicle/sparepart-servis.js).
 * Dipanggil dari oninput & onfocus field servisItem. Sumber data dari
 * Sparepart.getItemSuggestions() (kategori+stok+katalog, sama seperti
 * datalist lama). Maks 8 saran spy list tidak kepanjangan di layar HP. */
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
/** User tap 1 saran dari suggest-box -> isi field servisItem & tutup
 * suggest-box, lalu jalankan lagi alur autofill interval/auto-link katalog
 * yang sama seperti user ngetik manual persis nama itu (reuse
 * onItemAutofillInterval() apa adanya -- TIDAK ada logic baru). */
selectItemSuggestion(name){
const el=document.getElementById('servisItem');
if(el)el.value=name;
if(typeof hideSuggestBox==='function')hideSuggestBox('servisItemSuggestBox');
Servis.onItemAutofillInterval();
},
/** Sesi 297 (permintaan eksplisit user, sinkron "Jenis Servis/Item" <-> Katalog Suku
 * Cadang supaya stok otomatis kepotong tanpa perlu pilih dua kali): kalau user
 * mengetik/pilih teks di "Jenis Servis/Item" yang PERSIS (case-insensitive) cocok
 * dengan SATU nama part di dropdown `servisCatalogPartId` (yang sudah dimuat via
 * populateCatalogPartSelect() saat modal dibuka), otomatis pilihkan part itu &
 * tampilkan field qty (reuse onCatalogPartChange() apa adanya) -- sama seperti user
 * pilih manual dari "Pilih dari Katalog" / chip rekomendasi, cukup lebih cepat.
 * Exact match tetap auto-pilih LANGSUNG tanpa konfirmasi (aman, tidak ambigu).
 * TIDAK menimpa pilihan yang sudah ada (kalau `servisCatalogPartId` sudah ada
 * value, dibiarkan -- user yang pegang kendali penuh begitu sudah pernah pilih/
 * ganti manual). Ambigu (2+ part nama sama persis) -> tidak auto-pilih, biar user
 * pilih sendiri lewat dropdown/chip (juga tidak dilanjutkan ke partial match,
 * supaya tidak makin salah pilih dari nama yang sudah ambigu duluan).
 *
 * Sesi berikutnya (permintaan eksplisit user): kalau TIDAK ada exact match tunggal,
 * coba cari partial match (nama part memuat teks item, atau sebaliknya) sebagai
 * SARAN -- TIDAK auto-pilih langsung seperti exact match, karena partial match bisa
 * salah tebak part & stok bisa kepotong tidak diinginkan. Sebagai gantinya
 * ditampilkan lewat renderPartialCatalogMatch() (area konfirmasi terpisah, chip per
 * kandidat) -- part katalog HANYA terpilih (dan stok HANYA kepotong saat simpan)
 * setelah user tap salah satu chip confirmPartialCatalogMatch(). */
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
/** Tampilkan chip konfirmasi untuk tiap kandidat partial match (lihat
 * tryAutoLinkCatalogPart()) di area `servisCatalogPartialWrap`. Murni render,
 * TIDAK mengubah `servisCatalogPartId` -- part baru terpilih setelah user tap
 * salah satu chip (lihat confirmPartialCatalogMatch()). */
renderPartialCatalogMatch(matches){
const wrap=document.getElementById('servisCatalogPartialWrap');
const list=document.getElementById('servisCatalogPartialList');
if(!wrap||!list)return;
list.innerHTML=matches.map(o=>`<button type="button" class="chip-btn" style="font-size:11px" data-action="Servis.confirmPartialCatalogMatch" data-args="${escapeHtml(JSON.stringify([o.value]))}">${escapeHtml(o.dataset.name||'(Tanpa nama)')}${o.dataset.oem?' · '+escapeHtml(o.dataset.oem):''}</button>`).join('');
wrap.classList.remove('u-dnone');
wrap.style.display='block';
},
/** User tap 1 chip kandidat partial match -> BARU di sini part katalog beneran
 * dipilihkan ke `servisCatalogPartId` (reuse onCatalogPartChange() apa adanya,
 * sama seperti exact match/chip rekomendasi) & area konfirmasi ditutup. Sebelum
 * ini dipanggil, TIDAK ada apa pun yang berubah di dropdown/stok -- exactly kenapa
 * partial match butuh langkah konfirmasi tambahan ini (beda dari exact match yang
 * auto-pilih langsung), supaya stok tidak salah kepotong dari tebakan yang keliru. */
confirmPartialCatalogMatch(catalogId){
const sel=document.getElementById('servisCatalogPartId');
if(!sel)return;
const hasOption=Array.from(sel.options||[]).some(o=>o.value===String(catalogId));
if(!hasOption)return;
sel.value=String(catalogId);
Servis.onCatalogPartChange();
Servis.dismissPartialCatalogMatch();
},
/** Tutup/kosongkan area konfirmasi partial match (dipanggil saat user tap
 * "Bukan ini, abaikan", saat re-run tryAutoLinkCatalogPart() dgn item baru, atau
 * kapan pun modal servis dibuka ulang) -- TIDAK menyentuh `servisCatalogPartId`. */
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
// BUGFIX (audit): sama seperti onItemAutofillInterval() -- fallback by-nama
// dulu polos & global, sekarang lewat resolveServisCatForVehicle() supaya
// prefill interval saat edit tidak ke-nyasar ke kategori privat kendaraan lain.
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
// _renderKmEditHint(isEdit) — BARU (rekomendasi audit S749/S750). Info kecil di
// bawah field Odometer/KM: HANYA muncul saat mode Edit, supaya user tahu kenapa
// koreksi KM boleh lebih rendah dari servis sebelumnya di sini padahal Tambah
// Baru tetap wajib urutan kronologis (lihat validateServiceOdometer(), cabang
// below_previous_service dilewati saat excludeId/edit terisi). Batas "tidak
// boleh melebihi odometer sekarang" & "tidak boleh melebihi servis sesudahnya"
// TETAP berlaku & TIDAK disebut longgar di sini -- teks cuma menjelaskan urutan
// kronologis ke BELAKANG yang dilonggarkan. Pola pembuatan elemen dinamis 1x
// (cek getElementById dulu) sama persis servisMoreWrap/bbmMoreWrap di file ini.
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
if(!partId||!qty)return;
const p=D.partsStock.find(x=>x.id===partId);
if(p)p.qty=(p.qty||0)+qty;
},
/** Cari 1 item Stok Sparepart (D.partsStock) yang `catalogId`-nya PERSIS
 * sama dengan part katalog terpilih di form Servis (Sesi 273, tindak
 * lanjut audit S272) — match presisi via ID, TIDAK terpengaruh user
 * mengedit nama baris stok lewat "Edit Stok Sparepart"
 * (Sparepart.saveStock() menjaga catalogId tetap utuh meski name
 * berubah). Dipakai LEBIH DULU di _saveInner() sebelum fallback ke
 * findMatchingStockByName(). */
findMatchingStockByCatalogId(catalogId){
if(!catalogId)return null;
return D.partsStock.find(p=>p.catalogId===catalogId)||null;
},
/** Cari 1 item Stok Sparepart (D.partsStock) yang namanya PERSIS sama
 * (case-insensitive) dengan nama part katalog terpilih — dipakai untuk
 * ikut mengurangi stok fisik saat part dari Vehicle Catalog dipakai di
 * servis (Tahap 7E-3). Exact match saja (bukan substring) supaya tidak
 * salah kurangi stok item yang mirip tapi beda.
 * Sesi 273: sekarang jadi FALLBACK saja (dipanggil hanya kalau
 * findMatchingStockByCatalogId() gagal) — untuk baris stok lama yang
 * dibuat sebelum bridge `catalogId` ada (Sesi 266) dan belum pernah
 * punya field itu. Lihat CHANGELOG.md § Sesi 272/273. */
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
// ===== Foto Riwayat Servis (Sesi F1) =====
// Cakupan sengaja dipersempit ke: tambah/lihat/hapus foto di form Servis +
// simpan/muat dari D.servisLogs[].foto. TIDAK termasuk sesi ini (backlog
// Sesi F lanjutan): thumbnail/badge di daftar Riwayat Servis, kompresi
// gambar sebelum jadi dataURL, atau batas ukuran per-foto selain guard
// kasar di bawah. Field `foto` OPSIONAL & backward-compatible -- entry
// lama tanpa field ini tetap kebaca normal (fallback `s.foto||[]`).
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
/* P22: SERVICE ODOMETER INTEGRITY — canonical guards for create/edit. */
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
  // S749: saat EDIT riwayat servis lama (excludeId terisi), koreksi KM ke
  // angka lebih rendah dari servis sebelumnya tetap diizinkan -- pengguna
  // sering perlu membetulkan data historis yang salah input. Batas aman
  // "above_current_odometer" di atas tetap berlaku (KM tidak boleh melebihi
  // odometer kendaraan sekarang), jadi ini bukan menghapus validasi sama
  // sekali, cuma melonggarkan urutan-kronologis SAAT edit. Untuk catatan
  // BARU (excludeId kosong), aturan urutan tetap wajib seperti semula.
  if(prev&&n<Number(prev.km)&&!excludeId)return{ok:false,code:'below_previous_service',message:`KM servis (${n.toLocaleString('id-ID')}) lebih rendah dari servis sebelumnya (${Number(prev.km).toLocaleString('id-ID')} km pada ${prev.date}).`};
  if(next&&n>Number(next.km))return{ok:false,code:'above_next_service',message:`KM servis (${n.toLocaleString('id-ID')}) lebih tinggi dari servis sesudahnya (${Number(next.km).toLocaleString('id-ID')} km pada ${next.date}).`};
  return{ok:true,currentKm:Number.isFinite(current)?current:null,previousKm:prev?Number(prev.km):null,nextKm:next?Number(next.km):null};
},

async _saveInner(){
const item=document.getElementById('servisItem').value.trim();
const actionTypeEl=document.getElementById('servisActionType');
const actionType=actionTypeEl&&['periksa','bersih','ganti'].includes(actionTypeEl.value)?actionTypeEl.value:'ganti';
// BUGFIX (laporan user, Sesi 545): dulu `!cost` menolak simpan kalau Biaya
// diisi 0 (mis. servis gratis/klaim garansi) karena 0 falsy di JS -- field
// biaya jadi WAJIB diisi angka >0 padahal seharusnya boleh 0/kosong. Fix:
// treat kolom kosong sbg 0 (bukan wajib diisi), validasi eksplisit pakai
// isNaN() (nilai bukan angka valid) & cost<0 (negatif tidak masuk akal utk
// biaya) -- item (Jenis Servis) tetap wajib diisi, cuma Biaya yang
// sekarang boleh 0.
const costRaw=document.getElementById('servisCost').value.trim();
const cost=costRaw===''?0:Number(costRaw);
if(!Number.isFinite(cost)||cost<0){toast('⚠️ Cek Biaya, harus 0 atau lebih');return;}
// BUGFIX (audit): idem -- pencarian kategori by-nama saat SIMPAN servis
// sekarang scoped ke kendaraan aktif (curVehicleId) lewat
// resolveServisCatForVehicle(), supaya servis kendaraan B tidak ke-link ke
// kategori privat milik kendaraan A hanya karena nama item sama persis.
let matched=typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(item,curVehicleId):D.sparepartCats.find(c=>c.name.toLowerCase()===item.toLowerCase());
let masterCategoryId=document.getElementById('servisCategory')?.value||null;
let serviceComponentId=document.getElementById('servisComponent')?.value||null;
if(typeof resolveServiceCategoryComponent==='function'){const svcLink=resolveServiceCategoryComponent(masterCategoryId,serviceComponentId,item);masterCategoryId=svcLink.masterCategoryId;serviceComponentId=svcLink.serviceComponentId;}
const note=document.getElementById('servisNote').value;
const accId=document.getElementById('servisAcc')?document.getElementById('servisAcc').value:D.accounts[0]?.id;
const kmRaw=document.getElementById('servisKm').value.trim();
const km=kmRaw===''?null:Number(kmRaw);
const date=document.getElementById('servisDate').value;
// S750: edit histori lama hanya untuk kategori/komponen tidak boleh
// diblokir oleh urutan odometer terhadap histori setelahnya. Validasi
// odometer tetap wajib untuk create atau perubahan KM/tanggal.
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
// Sesi 180 (Tahap 6B2): snapshot ringan opsional {catalogPartId,catalogPartQty,
// catalogPartOemCode} langsung di D.servisLogs (pola sama usedPartId/usedPartQty
// di bawah) -- TIDAK menggantikan/mengubah mekanisme catalogPartRefs (Tahap 6
// Sesi 1, VehicleCatalogServisLink) yang tetap dipanggil apa adanya di bawah.
// catalogPartOemCode diambil dari atribut data-oem opsi terpilih (diisi
// populateCatalogPartSelect()) -- sinkron, TIDAK memanggil VehicleCatalog
// lagi di sini, supaya tidak dobel-sumber-kebenaran/dobel call IDB.
const catalogPartOemCode=(catalogPartId&&catalogPartSelEl&&catalogPartSelEl.selectedOptions&&catalogPartSelEl.selectedOptions[0]&&catalogPartSelEl.selectedOptions[0].dataset)?(catalogPartSelEl.selectedOptions[0].dataset.oem||''):'';
const catalogPartName=(catalogPartId&&catalogPartSelEl&&catalogPartSelEl.selectedOptions&&catalogPartSelEl.selectedOptions[0]&&catalogPartSelEl.selectedOptions[0].dataset)?(catalogPartSelEl.selectedOptions[0].dataset.name||''):'';
// Sesi 273: catalogId dulu (match presisi, tahan terhadap rename baris
// stok manual), findMatchingStockByName() jadi fallback SAJA untuk baris
// stok lama yang belum pernah punya catalogId (dibuat sebelum Sesi 266).
const catalogStockMatch=catalogPartId?(Servis.findMatchingStockByCatalogId(catalogPartId)||Servis.findMatchingStockByName(catalogPartName)):null;
const catalogLinkedStockId=catalogStockMatch?catalogStockMatch.id:null;
const itemIsVehicleName=!!matchingVehicleName(item);
// Sesi 3A (integrity): categoryId pada EDIT tidak boleh tertinggal dari
// kategori lama ketika user mengganti Jenis Servis/Item ke nama yang tidak
// punya kategori. Kalau item tetap sama dan kategori lama masih valid, boleh
// dipertahankan untuk backward compatibility; kalau item berubah, linkage
// lama wajib dilepas agar Riwayat tidak lagi mereset Pengingat kategori yang
// salah. Jika interval baru valid, blok di bawah tetap boleh membuat kategori
// baru dan mengisi categoryId baru.
let catIdForLog=matched?matched.id:null;
if(Servis.editId!==null&&!matched){
  const existing=D.servisLogs.find(x=>x.id===Servis.editId);
  const oldCat=existing&&existing.categoryId?D.sparepartCats.find(c=>c.id===existing.categoryId):null;
  const sameItem=existing&&String(existing.item||'').trim().toLowerCase()===item.toLowerCase();
  if(oldCat&&sameItem)catIdForLog=oldCat.id;
}
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
  // P18: kategori baru/interval belum boleh meninggalkan mutasi parsial
  // ketika target service ternyata sudah hilang. Rollback snapshot lokal.
  restore();
  toast('⚠️ Data tidak ditemukan');
  return;
}
// P18: Edit Service adalah satu transaksi domain. Jangan melakukan restore
// stok lama secara parsial lalu mencoba membaliknya manual pada setiap
// failure branch; snapshot canonical di wrapper adalah sumber rollback.
Servis.revertStockUsage(s.usedPartId,s.usedPartQty);
Servis.revertStockUsage(s.catalogPartLinkedStockId,s.catalogPartQty);
if(usedPartId&&!await Servis.applyStockUsage(usedPartId,usedPartQty)){
  restore();
  return;
}
if(catalogLinkedStockId&&!await Servis.applyStockUsage(catalogLinkedStockId,catalogPartQty)){
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
// Metadata-only edits must never rewrite the historical due snapshot. Keep a small audit trail.
if(_metadataOnlyEdit){
  if(!Array.isArray(s.editHistory))s.editHistory=[];
  s.editHistory.push({changedAt:new Date().toISOString(),changedBy:'self',fields:['categoryId','masterCategoryId','serviceComponentId','item','note','foto','checklist','cost','accountId']});
  if(s.editHistory.length>50)s.editHistory=s.editHistory.slice(-50);
}
let _postCommitFinanceEvent=null;
if(s.txLinkId){
const tx=D.transactions.find(t=>t.id===s.txLinkId);
if(cost===0){
// v13: Rp0 adalah servis valid, tetapi BUKAN transaksi Finance.
// Jika sebelumnya punya txLinkId lalu biaya diedit menjadi 0, hapus
// transaksi lama agar Finance tidak menyimpan transaksi Rp0 palsu.
D.transactions=D.transactions.filter(t=>t.id!==s.txLinkId);
s.txLinkId=null;
_postCommitFinanceEvent={txId:null,deletedId:tx.id,category:tx.category,type:'expense',amount:0,kind:'servis'};
}else if(tx){
Object.assign(tx,{amount:cost,date,accountId:accId,note:noteFull});
_postCommitFinanceEvent={txId:tx.id,category:tx.category,type:'expense',amount:cost,kind:'servis'};
}else if(cost>0){
// P10 FIX: transaksi Finance tertaut bisa hilang lebih dulu (mis. dihapus
// dari modul Finance). Jangan biarkan D.servisLogs menyimpan txLinkId yatim.
// Rekonsiliasi dengan membuat transaksi pengganti yang menunjuk ke servis
// yang sama, sehingga edit servis kembali menjadi konsisten.
const repairTxId=uid();
const repairTxCat=resolveVehicleTxCategory(veh);
D.transactions.push({id:repairTxId,type:'expense',amount:cost,category:repairTxCat,subcategory:'Servis & Oli',accountId:accId,payMethod:'tunai',note:noteFull,date,servisLinkId:s.id});
s.txLinkId=repairTxId;
_postCommitFinanceEvent={txId:repairTxId,category:repairTxCat,type:'expense',amount:cost,kind:'servis',action:'relink'};
}
}else if(cost>0){
// v13: transaksikan hanya biaya > 0. Servis Rp0 tetap tersimpan di
// D.servisLogs tanpa membuat transaksi Finance kosong.
const txId=uid();
const txCat=resolveVehicleTxCategory(veh);
D.transactions.push({id:txId,type:'expense',amount:cost,category:txCat,subcategory:'Servis & Oli',accountId:accId,payMethod:'tunai',note:noteFull,date,servisLinkId:s.id});
s.txLinkId=txId;
_postCommitFinanceEvent={txId,category:txCat,type:'expense',amount:cost,kind:'servis'};
}
try{
  // V24 G2: catalog linkage is a post-commit side effect, never part of the pre-commit critical path.
  // P18: persistence commit happens before lifecycle notification.
  // Lifecycle is an event bridge only; it must never announce an edit that
  // failed to persist.
  save();
}catch(err){
  restore();
  // Best-effort persistence of the pre-edit snapshot. If storage itself is
  // unavailable, keep the in-memory rollback and rethrow the original error.
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
if(usedPartId&&!await Servis.applyStockUsage(usedPartId,usedPartQty))return;
if(catalogLinkedStockId&&!await Servis.applyStockUsage(catalogLinkedStockId,catalogPartQty)){
// BUGFIX (audit S324): dulu applyStockUsage() lagi di sini (dobel-potong
// stok usedPartId yang barusan sukses dipotong 1 baris di atas) padahal
// seharusnya revertStockUsage() -- catatan servis ini batal disimpan
// (return di bawah), jadi potongan usedPartId di atas harus dikembalikan.
if(usedPartId)Servis.revertStockUsage(usedPartId,usedPartQty);
return;
}
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
const checklistPayload=(typeof ServisChecklist!=='undefined'&&typeof ServisChecklist.toLogPayload==='function')?ServisChecklist.toLogPayload():[];
// Sesi Konsolidasi Servis 2A: bila checklist berisi beberapa item, satu sesi
// menghasilkan N log service yang masing-masing tetap berbentuk legacy single-log.
// Jalur CREATE saja; EDIT multi-log ditahan ke tahap berikutnya agar migrasi/edit/
// delete batch tidak setengah matang. Biaya dan stok top-level hanya record pertama.
const _serviceSessionId=uid();
const _checkedServiceRows=checklistPayload.slice();
const _hasChecklistRows=_checkedServiceRows.length>0;
const _effectiveItem=item||(_hasChecklistRows?_checkedServiceRows[0].itemName:'');
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
// V24 G1/G2/G9: persist the service domain BEFORE emitting lifecycle/catalog/AI side effects.
// If persistence fails, the surrounding P16 snapshot wrapper restores all service-domain mutations.
save();
const _newServisLog=D.servisLogs[D.servisLogs.length-1];
if(typeof ServiceEventLifecycle!=='undefined'){try{ServiceEventLifecycle.create(_newServisLog);}catch(_lifecycleCreateErr){console.error('V25: post-commit service create lifecycle failed; reconciliation required',_lifecycleCreateErr);if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'service.create',payload:_newServisLog});}}
if(typeof VehicleCatalogServisLink!=='undefined'&&VehicleCatalogServisLink&&typeof VehicleCatalogServisLink.attachToServis==='function'){
  try{VehicleCatalogServisLink.attachToServis(servisId,catalogPartId?[{catalogId:catalogPartId,qty:catalogPartQty}]:[]);}
  catch(_catalogErr){console.error('V24: post-commit catalog service link failed; queued for reconciliation',_catalogErr);if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'catalog.attach',payload:{servisId:servisId,links:catalogPartId?[{catalogId:catalogPartId,qty:catalogPartQty}]:[]}});}
}
// v13: finance.updated hanya untuk transaksi Finance yang benar-benar dibuat (cost>0).
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
// _renderEditHistoryHtml(s) — BARU (rekomendasi audit S749/S750). s.editHistory[]
// sudah ditulis oleh _saveInner() untuk edit metadata-only (lihat komentar di
// sana), tapi sebelum ini tidak ada tempat melihatnya. Read-only murni (0 tulis
// D di sini) -- tampilkan maks 5 entri terbaru, terbaru dulu, di tab Pengingat
// modal Edit Servis (bukan tab Detail, supaya tidak menambah gesekan alur isi
// form utama). String kosong kalau riwayat kosong/tidak ada -- 0 dampak visual
// ke entry lama yang belum pernah diedit metadata-only.
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
// P17: capture immutable linkage + domain snapshots BEFORE mutation.
// Delete must behave as one service-domain mutation and must not leave a
// half-deleted log/finance/stock state if a later step throws.
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
  // Sesi E2: restore automatic stock deduction created by "ganti".
  if(s.autoGantiStockId)Servis.revertStockUsage(s.autoGantiStockId,1);
  // Keep the captured tx id in the lifecycle payload. Do NOT null s.txLinkId
  // before lifecycle.remove(): that used to erase the only deletion linkage.
  D.servisLogs=D.servisLogs.filter(x=>x.id!==id);
  save();
  // V25 G11/G12: lifecycle removal is strictly post-commit. A lifecycle
  // failure must not turn a committed delete into a false rollback.
  if(typeof ServiceEventLifecycle!=='undefined'&&typeof ServiceEventLifecycle.remove==='function'){
    try{ServiceEventLifecycle.remove(s,{deletedTxId,categoryId:s.categoryId||null,vehicleId:s.vehicleId||null});}
    catch(_lifecycleDeleteErr){console.error('V25: post-commit service delete lifecycle failed; queued for reconciliation',_lifecycleDeleteErr);if(typeof ServiceEventOutbox!=='undefined')ServiceEventOutbox.enqueue({type:'service.remove',payload:s,options:{deletedTxId,categoryId:s.categoryId||null,vehicleId:s.vehicleId||null}});}
  }
}catch(err){
  // P17 atomic delete rollback: restore only service-domain arrays.
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
// markServiced(catId, actionType) — actionType FITUR BARU (opsional, backward
// compatible; PERBAIKAN-JENIS-TINDAKAN-CHECKLIST-SERVIS.md §2a/§6-poin1):
// dulu cuma dipanggil markServiced(catId) dari tombol "✅ Sudah Servis" di
// kartu Pengingat Servis (renderReminder(), tetap 1-arg, tidak berubah).
// Disiapkan supaya checklist servis (rencana Sesi 2 -- lihat dokumen §2d)
// bisa REUSE fungsi ini apa adanya + kirim actionType ('periksa'/'bersih'/
// 'ganti'), bukan bikin jalur simpan sendiri (0 logic duplikat, kartu
// reminder & stok otomatis ikut ter-update). actionType kosong/undefined =
// persis perilaku lama (disimpan sbg null, diperlakukan 'ganti' oleh
// getLastServiceKmForCat/getLastServiceDateForCat, lihat §2a).
// markServiced(catId, actionType, opts) — opts FITUR BARU (Sesi E1,
// ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi E item 1): opsional,
// backward compatible -- dipanggil markServiced(catId) atau
// markServiced(catId,actionType) spt sebelumnya = 0 perubahan perilaku.
// Tujuan opts: kasih fondasi supaya checklist multi-item (rencana Sesi
// 1C/2A, belum ada kodenya) bisa nanti REUSE fungsi ini per-item lewat
// markServicedBatch() di bawah, tanpa jalur simpan duplikat.
//   opts.skipConfirm    — lewati askConfirm() (dipakai batch: 1 konfirmasi
//                          di pemanggil, bukan per-item)
//   opts.skipEarlyGuard — (Sesi E5, sebelumnya placeholder di E1) lewati
//                          guard "ganti terlalu dini" (lihat
//                          `_checkTooEarlyGanti()` di bawah) -- dipakai
//                          `markServicedBatch()` supaya batch tetap "1
//                          konfirmasi total", bukan 1 dialog guard per item.
//                          Independen dari opts.skipConfirm (2 knob
//                          terpisah, sesuai desain E1).
//   opts.presetCost     — angka biaya yg sudah diketahui pemanggil, lewati
//                          showPromptModal() (dipakai batch: 1 prompt total
//                          di pemanggil kalau perlu, atau 0 kalau memang
//                          mau 0 tanpa tanya)
//   opts.batchId        — (Sesi E3, sebelumnya placeholder di E1) ID batch
//                          yang sama utk seluruh item dari 1x pemanggilan
//                          markServicedBatch(), disimpan sbg entry.batchId
//                          di D.servisLogs & ditandai "🔗 batch" di riwayat
//                          (Servis.renderList()) -- 0 efek kalau dipanggil
//                          langsung tanpa lewat markServicedBatch() (opts
//                          kosong = batchId null, sama spt sebelum Sesi E3).
// Sesi E4 (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi E item 4
// "default cost per actionType"): kalau opts.presetCost TIDAK diisi DAN
// actionType eksplisit 'periksa' atau 'bersih' (bukan 'ganti', bukan
// kosong/undefined), cost otomatis 0 TANPA showPromptModal() -- alasan:
// item "periksa"/"bersih" biasanya tidak ada biaya (cuma cek/lap), jadi
// prompt biaya cuma gesekan tambahan. actionType 'ganti' atau kosong
// (tombol "✅ Sudah Servis" lama di kartu Pengingat Servis, SELALU
// dipanggil tanpa actionType) TETAP prompt seperti biasa -- 0 regresi ke
// jalur lama. opts.presetCost (dipakai markServicedBatch()) tetap prioritas
// PALING TINGGI di atas default actionType ini, tidak berubah dari E1.
// _findAutoGantiStock(cat, vehicleId) — BARU (Sesi E2, ROADMAP-KONSOLIDASI-
// DATABASE-SERVIS-v2.md §7 Sesi E item 2 "auto-potong stok saat ganti").
// Cari 1 kandidat Stok Sparepart (D.partsStock) yang cocok kategori (catId
// sama persis dgn kategori pengingat yg ditandai) DAN kendaraan (lewat
// Sparepart.isPartForVehicle(), fungsi yg SUDAH ADA & dipakai dropdown
// "Gunakan Stok Sparepart" -- 0 skema baru, reuse logic vehicle-scoping yg
// sudah teruji). SENGAJA hanya auto-potong kalau PERSIS 1 kandidat cocok
// -- 0 kandidat (tidak ada stok utk kategori ini) atau >1 kandidat
// (ambigu, mis. ada 2 baris "Oli Mesin" beda merek) DILEWATI (return null,
// tidak menebak) supaya tidak salah motong stok yang salah. Ini FINDER
// murni (0 efek samping, 0 tulis D) -- pemotongan qty dilakukan terpisah
// oleh pemanggil (lihat markServiced() di bawah).
_findAutoGantiStock(cat,vehicleId){
if(!cat||!Array.isArray(D.partsStock))return null;
const candidates=D.partsStock.filter(p=>p.catId===cat.id&&(typeof Sparepart!=='undefined'&&typeof Sparepart.isPartForVehicle==='function'?Sparepart.isPartForVehicle(p,vehicleId):true));
return candidates.length===1?candidates[0]:null;
},
// _checkTooEarlyGanti(cat, vehicleId, curKm) — BARU (Sesi E5, ROADMAP-
// KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi E item 5 "guard 'ganti terlalu
// dini'"). FINDER murni (0 efek samping, 0 tulis D) -- cari log "ganti"
// TERAKHIR utk kategori+kendaraan ini (reuse getLastServiceKmForCat() apa
// adanya dgn actionTypeFilter:'ganti', SAMA fungsi yg sudah dipakai basis
// reset pengingat -- 0 logic baca log duplikat), lalu bandingkan jarak KM
// yg sudah ditempuh sejak itu dgn ambang batas 20% dari intervalKm
// kategori. Kalau jarak tempuh < ambang (mis. interval 3000km, ambang
// 600km, baru jalan 300km sejak ganti terakhir) -> dianggap "terlalu
// dini", return detail supaya pemanggil bisa tanya konfirmasi tambahan.
// SENGAJA return null (tidak menganggap dini) kalau: kategori tidak
// punya intervalKm valid, belum pernah ada log "ganti" sebelumnya
// (lastKm null -- servis pertama kali, wajar), atau odometer curKm <
// lastKm (data KM tidak konsisten/mundur -- tidak ditebak, biar tidak
// salah blokir gara2 data aneh, bukan tanggung jawab guard ini).
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
// v12: idempotency guard untuk tap/click ganda saat markServiced masih menunggu
// konfirmasi/prompt async. Guard hanya berlaku selama operasi yang sama masih
// in-flight; setelah selesai key dilepas sehingga servis berikutnya tetap boleh.
Servis._markServicedInFlight=Servis._markServicedInFlight instanceof Set?Servis._markServicedInFlight:new Set();
const _markGuardKey=`${curVehicleId||''}::${cat.id}::${actionType||'default'}`;
if(Servis._markServicedInFlight.has(_markGuardKey))return;
Servis._markServicedInFlight.add(_markGuardKey);
const _clearMarkGuard=()=>Servis._markServicedInFlight.delete(_markGuardKey);
const curKm=getVehicleKm(curVehicleId);
const actLabel=actionType==='periksa'?'diperiksa':(actionType==='bersih'?'dibersihkan':'diservis');
// willReset — HANYA relevan utk pola 4/periksa-conditional (§2c): kalau
// item ini punya gantiResetsInterval:false & yg ditandai actionType
// 'ganti', reset TIDAK terjadi (basis jatuh-tempo tetap dari log
// 'periksa') -- teks konfirmasi/toast disesuaikan supaya user tidak
// dikasih janji palsu "pengingat direset" padahal tidak.
const willReset=!(cat.actionMode==='periksa-conditional'&&cat.gantiResetsInterval===false&&(actionType||'ganti')==='ganti');
// Sesi E5 (guard "ganti terlalu dini"): HANYA saat actionType eksplisit
// 'ganti' (bukan kosong/'periksa'/'bersih' -- checklist lama/tombol
// "✅ Sudah Servis" tanpa actionType TIDAK pernah masuk cabang ini, 0
// regresi) DAN opts.skipEarlyGuard tidak di-set. Dialog guard ini TERPISAH
// dari konfirmasi utama di bawah (independen dari opts.skipConfirm) --
// kalau user batal di sini, fungsi berhenti SEBELUM konfirmasi utama
// ditampilkan (0 dialog dobel utk kasus batal).
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
// Sesi E4: default cost per actionType -- periksa/bersih auto 0, 0 prompt.
cost=0;
}else{
const costStr=await showPromptModal({title:'Biaya Servis',message:'Biaya servis ini (opsional, boleh dikosongkan/0):',icon:'💵',inputType:'number',defaultValue:0});
cost=parseFloat(costStr)||0;
}
const date=(typeof formatServiceDateOnly==='function'&&typeof parseServiceDateOnly==='function')?formatServiceDateOnly(parseServiceDateOnly(new Date())):new Date().toISOString().split('T')[0];
const accId=D.accounts[0]?.id;
// V26 G26/G31: quick-service uses the canonical service date helper when available.
// V25 G14/G15: quick-action must use the same service mutation boundary as
// the main Service modal. Keep a domain snapshot and shared mutation lock.
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
// Sesi E2 (auto-potong stok saat "ganti"): HANYA saat actionType eksplisit
// 'ganti' (bukan actionType kosong/'periksa'/'bersih') -- 0 dampak ke
// tombol "✅ Sudah Servis" lama di kartu Pengingat Servis (dipanggil tanpa
// actionType sama sekali, jadi tidak pernah masuk cabang ini, 0 regresi).
// Auto-potong 1 qty SAJA kalau stok cukup (qty>=1) -- kalau stok
// tidak cukup/0, DILEWATI DIAM-DIAM (bukan nge-prompt konfirmasi minus
// spt applyStockUsage() manual) krn ini aksi otomatis di balik tombol
// "tandai selesai", bukan input eksplisit user pilih part -- munculin
// dialog konfirmasi tak terduga di sini (apalagi saat dipanggil dari
// markServicedBatch() dgn skipConfirm) akan mengejutkan/menghalangi user.
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
// V25 G11/G12/G15: lifecycle and AI events are post-commit only and
// lifecycle exceptions do not invalidate an already committed service.
// BUGFIX (audit "✅ Sudah Servis" tidak emit AIBus event): markServiced() menulis
// langsung ke D.servisLogs/D.transactions tanpa lewat saveServis() (sparepart-servis-b.js)
// -- alur submit modal servis biasa emit AIBus 'vehicle.updated' lewat wrapper itu, tapi
// jalur cepat ini (tombol di kartu Pengingat Servis) TIDAK, jadi listener AI (mis. audit
// overdue servis) tidak pernah tahu ada servis baru kalau user cuma tap tombol ini.
// Fix: emit event yang sama di titik ini, sama persis polanya dgn saveServis() utk
// 'vehicle.updated' (selalu) & pola BBM (car-notes.js baris ~180) utk 'finance.updated'
// (cuma kalau benar ada transaksi baru yg tercatat, yaitu saat cost>0/txLinkId terisi).
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
// markServicedBatch(items) — BARU (Sesi E1). items: array of
// {catId, actionType, cost}. REUSE markServiced() apa adanya per item
// (0 logic simpan duplikat) dgn opts.skipConfirm:true (1 konfirmasi di
// pemanggil nanti, bukan per-item) & opts.presetCost (dari `cost` per
// item kalau diisi, kalau tidak diisi tetap 0 tanpa prompt -- checklist
// multi-item belum ada UI-nya, jadi fondasi ini sengaja tidak nge-prompt
// per-item, itu akan bikin batch >1 item butuh N kali showPromptModal).
// opts.skipEarlyGuard:true (Sesi E5) juga selalu di-set -- guard "ganti
// terlalu dini" per-item akan bertentangan dgn prinsip "1 konfirmasi
// total" batch ini (sama alasannya dgn skipConfirm).
// Fondasi ini disiapkan utk checklist multi-item (rencana Sesi 1C/2A,
// belum ada kodenya) -- dipakai apa adanya begitu checklist dibangun.
async markServicedBatch(items){
if(!Array.isArray(items)||!items.length)return[];
// V26 G33/G34: a batch is one atomic domain mutation. Each item still reuses
// markServiced() for its business rules, but a failure restores the entire
// pre-batch domain snapshot rather than leaving a partial checklist.
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
      // Invalid/stale category IDs are skipped; valid siblings remain part of the atomic batch.
      // markServiced() already treats an unresolved category as a no-op, so batch orchestration
      // must not convert that expected per-item validation result into a whole-batch failure.
      if(entry)results.push(entry);
    }
    // V28: no item-level persistence. Commit the whole batch once, then publish side-effects once.
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
// V33: explicit Finance ownership diagnostic. Repair is intentionally not
// automatic because ambiguous legacy ownership must never be guessed.
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

// getLastServiceKmForCat(vehicleId, cat, actionTypeFilter, forReminder) —
// actionTypeFilter & forReminder FITUR BARU (opsional, backward compatible;
// PERBAIKAN-JENIS-TINDAKAN-CHECKLIST-SERVIS.md §2c). Dipanggil TANPA 2 param
// baru ini (mis. dari riwayat/servisList) = 0 perubahan perilaku lama.
// Delegasi filter ke Servis._matchesActionTypeForReset() di bawah supaya
// logic-nya persis 1 tempat (twin di modules/vehicle/sparepart-servis.js
// getLastServiceDateForCat() punya salinan yang HARUS tetap identik).
getLastServiceKmForCat(vehicleId,cat,actionTypeFilter,forReminder){
const logs=D.servisLogs.filter(s=>s.vehicleId===vehicleId&&s.km&&servisLogMatchesCat(s,cat)&&Servis._matchesActionTypeForReset(s,cat,actionTypeFilter,forReminder));
logs.sort(typeof compareServiceHistoryRecency==='function'?compareServiceHistoryRecency:(a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.km||0)-Number(a.km||0)||String(b.id||'').localeCompare(String(a.id||'')));
return logs.length?logs[0].km:null;
},
// _matchesActionTypeForReset(log, cat, actionTypeFilter, forReminder) — lihat
// dokumentasi lengkap di twin-nya modules/vehicle/sparepart-servis.js
// (matchesActionTypeForReset(), top-level function, dipakai getLastServiceDateForCat()
// di file itu). Duplikasi SENGAJA (bukan reuse cross-file) krn file ini
// (car-notes.js) dimuat SEBELUM sparepart-servis.js di build.js & beberapa
// test harness (mis. sparepart-interval-bulan.test.js) memuat sparepart-servis.js
// TANPA car-notes.js sama sekali -- kalau salah satu diubah, cek ulang yang lain.
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
// activeReminderSeverityFilter -- BARU (audit rekomendasi N, Sep 2026:
// "Pengingat Servis" sebelumnya SELALU menampilkan SEMUA kategori aktif
// -- aman s/d terlewat -- tanpa cara mempersempit ke yang mendesak saja,
// beda dgn Riwayat yang sudah punya chip actionType. null = 'Semua'
// (perilaku lama, 0 regresi kalau chip baru ini tidak pernah disentuh).
// Nilai lain: 'lewat' (terlewat+jatuh_tempo), 'segera', 'mendekati', 'aman'.
activeReminderSeverityFilter:null,
setReminderMasterCategoryFilter(id){Servis.activeReminderMasterCategoryFilter=String(id||'');Servis.activeReminderComponentFilter='';Servis.renderReminder();},
setReminderComponentFilter(id){Servis.activeReminderComponentFilter=String(id||'');Servis.renderReminder();},
setReminderSeverityFilter(v){Servis.activeReminderSeverityFilter=v||null;Servis._saveReminderSeverityFilterPrefs();Servis.renderReminder();},
// _reminderSeverityFilterPrefsLoaded/_reminderSeverityFilterStorageKey +
// _loadReminderSeverityFilterPrefsOnce()/_saveReminderSeverityFilterPrefs()
// -- BARU (audit rekomendasi N-lanjutan, Sep 2026, saran #5). Sebelum ini,
// activeReminderSeverityFilter (chip status kartu Pengingat) SELALU reset
// ke null ("Semua") tiap pindah tab/reload -- beda dari
// activeMasterCategoryFilter (chip kategori master di Riwayat Servis) yang
// sudah dipersist lewat _saveMasterCategoryFilterPrefs() di atas. Pola &
// alasan (kenapa localStorage manual, bukan FilterPrefsStore) SAMA PERSIS
// versi itu -- cuma key storage beda supaya tidak tabrakan. TRADE-OFF
// (disadari, didiskusikan eksplisit): kalau preferensi tersimpan BUKAN
// null (mis. sesi lalu terakhir pilih "🔴 Terlewat"), part berstatus lain
// tidak akan tampil sampai user sadar & ganti chip -- bisa terkesan "part
// hilang" padahal cuma ketutup filter lama. Fail-open ke null/"Semua" kalau
// nilai storage rusak/tak dikenal, supaya paling buruk balik ke perilaku
// lama (tampil semua, 0 crash).
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
// localStorage korup/tidak tersedia -> abaikan, filter tetap default null ("Semua") -- 0 crash.
}
},
_saveReminderSeverityFilterPrefs(){
if(typeof localStorage==='undefined')return;
try{
localStorage.setItem(Servis._reminderSeverityFilterStorageKey,JSON.stringify({activeReminderSeverityFilter:Servis.activeReminderSeverityFilter}));
}catch(err){
// localStorage penuh/diblokir -> abaikan (0 crash).
}
},
// reminderSeverityChipsHtml(counts) -- render chip filter status kartu
// Pengingat. Reuse class "chip" apa adanya (pola sama persis
// renderActionTypeChips()/Sparepart chip kategori master di file ini --
// 0 CSS baru). Angka di tiap chip dihitung dari kategori yang SUDAH lolos
// filter kategori master/komponen (lihat pemanggil), supaya tetap relevan
// dgn konteks filter yang sedang aktif.
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
// Sesi 295 (bugfix "Pengingat Servis" kebanjiran kategori sampah): dulu SEMUA
// D.sparepartCats ditampilkan tanpa filter -- termasuk kategori yg auto-dibuat
// syncPartsStockFromCatalog() (tx-stok-sparepart.js) saat scan Katalog Suku
// Cadang, yg sengaja diberi intervalKm:0 & showInReminder:false karena itu
// cuma kategori PENGELOMPOKAN STOK, bukan jadwal servis. Tanpa filter ini,
// kategori spt "E-2 Cylinder Head Cover" (dari scan torsi/katalog) numpuk di
// Pengingat dgn "Interval 0 km" & selalu "Lewat" (0-jarakTempuh selalu <=0).
// Filter: hanya kategori dgn interval valid (>0) DAN belum ditandai
// disembunyikan manual dari 🔧 Kelola Kategori (lihat renderCatList()).
// S622 (permintaan user: pengingat servis per part/kategori/stok sparepart
// harus sendiri-sendiri per kendaraan): tambah filter catVisibleForVehicle()
// (modules/vehicle/sparepart-servis.js) -- kategori khusus kendaraan LAIN
// (cat.vehicleId terisi tapi beda dari curVehicleId) tidak lagi ikut numpuk
// di kartu Pengingat Servis kendaraan ini. Kategori universal (vehicleId
// kosong, mayoritas data lama) tetap tampil di semua kendaraan (fail-open,
// 0 data lama berubah perilaku).
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
// v21: condition-only maintenance gets its own read-only section.
// It deliberately stays outside filteredRemindableCats so condition rules
// never enter the interval/overdue calculation path.
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
// Sesi 3D — Reminder ↔ History Sync: baseline KM yang DITAMPILKAN harus
// memakai aturan reset yang SAMA dengan computeServiceUrgency(). Sebelumnya
// lastKm di sini mengambil log kategori terakhir tanpa actionTypeFilter,
// sementara status urgency memfilter (mis. periksa-conditional). Hasilnya
// satu kartu bisa menampilkan angka sisa dari log "ganti" tetapi status
// jatuh-tempo dari log "periksa". Satukan ke canonical reset baseline.
const resetFilter=(typeof resolveResetActionTypeFilter==='function')?resolveResetActionTypeFilter(cat):null;
const lastKm=Servis.getLastServiceKmForCat(curVehicleId,cat,resetFilter,true);
const intervalKm=getEffectiveIntervalKm(curVehicleId,cat);
const overridden=hasIntervalOverride(curVehicleId,cat);
const jarakTempuh=lastKm===null?curKm:curKm-lastKm;
// FITUR BARU (Maintenance Rule v2): computeServiceUrgency() menjadi resolver
// action-aware. Untuk kategori KZR yang punya rule, intervalKm di bawah
// mengikuti action yang paling mendesak (inspect/replace), bukan angka
// interval kategori lama yang bisa berbeda.
// FITUR BARU (Interval Waktu): 100% reuse computeServiceUrgency()
// (modules/vehicle/sparepart-servis.js) -- SATU-SATUNYA titik hitung
// status/sisa yg sadar 2 sumbu (km & bulan opsional per kategori). sisa/pct/
// col/msg/severity di bawah TETAP dihitung dari sisaKm (utk progress bar &
// label km yg sudah ada, 0 perubahan tampilan lama), cuma status
// 'lewat'/'segera' (severity) skrg ikut u.status supaya axis bulan yg lebih
// mendesak (mis. Minyak Rem sudah >6 bln walau km masih jauh) TETAP kebaca.
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
// Kalau axis bulan yang membatasi, jangan tempel estimasi tanggal berbasis
// sisa-KM karena itu memberi dua baseline berbeda pada kartu yang sama.
const estDateISO=monthLimited?null:(u&&u.estDateISO!==undefined?u.estDateISO:estimateServiceDateISO(sisa,kmPerDay));
const estLabel=estDateISO?` · ~${fmtDateID(estDateISO)}`:'';
// FITUR BARU (audit, gap "reminder tidak nyambung ke VehicleActionRecommendation"):
// 100% reuse VehicleActionRecommendation.actionFor() (vehicle-action-recommendation.js,
// Sesi 82) -- TIDAK menghitung ulang severity apa pun, cuma numpang teks aksi
// konkret yang sudah ada utk severity 'overdue'/'due-soon' yang SAMA PERSIS
// dgn yang dipakai VehicleAlertPanel/VehicleInsightFeed di Dashboard. Guard
// typeof spy tetap aman kalau file itu belum termuat (mis. test terisolasi).
const action=(severity&&typeof VehicleActionRecommendation!=='undefined')?VehicleActionRecommendation.actionFor({type:'service',severity}).label:null;
const nextAction=u&&u.nextAction&&u.nextAction!=='event_based'?u.nextAction:null;
const condition=u&&u.condition?u.condition:null;
const actionText=nextAction?((nextAction==='periksa'?'Periksa':'Ganti')+(condition?' — '+condition:'')):action;
const scheduleLabel=(u&&u.intervalHari&&u.limitingAxis==='hari')?`Setiap ${u.intervalHari} hari`:((effectiveIntervalKm!=null&&effectiveIntervalKm>0)?`Interval ${effectiveIntervalKm.toLocaleString('id-ID')} km`:'Berbasis kondisi/event');
const nextDueKm=u&&u.nextDueKm!=null?u.nextDueKm:null;
const nextDueDate=u&&u.nextDueDate?u.nextDueDate:null;
const dueLabel=nextDueKm!==null&&nextDueDate?`Berikutnya: ${nextDueKm.toLocaleString('id-ID')} km / ${fmtDateID(nextDueDate)}`:nextDueKm!==null?`Berikutnya: ${nextDueKm.toLocaleString('id-ID')} km`:nextDueDate?`Berikutnya: ${fmtDateID(nextDueDate)}`:'';
// FIX (historySummary is not defined -- ReferenceError bikin renderReminder()
// crash setiap kali kartu Pengingat Servis dirender, mis. saat pindah tab):
// var ini dulu dipakai di object literal & template riwayat di bawah tanpa
// pernah dideklarasikan. Hitung ringkasan singkat total riwayat kategori ini
// (semua actionType, semua waktu -- BUKAN dibatasi resetFilter spt lastKm)
// dari D.servisLogs, reuse servisLogMatchesCat() yg sudah dipakai di atas.
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
card.innerHTML=`<div class="card-title">🔔 Pengingat Servis per Part${reminderBadgeHtml} <span class="card-collapse-toggle" id="servisReminderCard-chev" data-action="toggleCardCollapse" data-args='["servisReminderCard","$event"]' aria-label="Buka/tutup bagian">▾</span></div><div class="card-collapse-body" id="servisReminderCard-cbody">`+(kmPerDay?`<div class="u-fs11 u-t2 u-mb10">📊 Estimasi tanggal dihitung dari rata-rata pemakaian ~${kmPerDay.toFixed(1)} km/hari (histori Catatan KM & BBM).</div>`:'')+(rows.length?Servis.reminderSeverityChipsHtml(reminderSeverityCounts):'')+(rfSeverity&&!displayRows.length&&rows.length?`<div class="u-fs12 u-t2" style="padding:8px 0">Tidak ada part dengan status ini pada kategori yang dipilih.</div>`:'')+displayRows.map(r=>`
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
      </div>`).join('')+(filteredConditionCats.length?`<div class="u-mt12 u-pt10" style="border-top:1px solid var(--border,#ddd)">
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
// setActionTypeFilter(type) — BARU (Sesi E6). Dipanggil dari klik chip
// filter (data-action="Servis.setActionTypeFilter"). type: null ("Semua")
// atau 'periksa'/'bersih'/'ganti'. Reset listPage ke 1 (pola sama BBM/
// Torsi.setCat()) supaya pagination tidak nyangkut di halaman lama saat
// filter berganti (bisa beda jumlah total item).
setActionTypeFilter(type){
Servis.activeActionTypeFilter=type||null;
Servis.listPage=1;
Servis.renderList();
},
// renderOdometerIntegrityBadge(beforeEl) — BARU (rekomendasi audit S749/S750).
// getServiceOdometerIntegrity() sudah ada (deteksi km_regression/missing_km/
// invalid_km lintas riwayat) tapi sebelum ini tidak dipanggil dari UI mana pun
// -- murni tersembunyi di belakang test. Read-only, 0 tulis D. Tampil HANYA
// kalau ada temuan (ok:false) supaya tidak menambah noise visual saat data
// bersih (0 dampak ke tampilan normal). Pola pembuatan elemen dinamis 1x sama
// persis renderActionTypeChips(beforeEl) di bawah ini.
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
// renderActionTypeChips(beforeEl) — BARU (Sesi E6). Chip row filter
// riwayat by actionType, DISISIPKAN lewat JS sebelum #servisList (bukan
// markup statis di index.html -- beda dgn Torsi.chips() yg pakai
// container #trsChipRow yang SUDAH ada di markup). Pola pembuatan elemen
// dinamis 1x (cek getElementById dulu, buat kalau belum ada) SAMA PERSIS
// dgn servisMoreWrap di bawah (renderList()), supaya tidak dobel-insert
// tiap kali renderList() dipanggil ulang.
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
// Sesi D-lanjutan5: baca preferensi filter tersimpan SEKALI per lifetime
// halaman, SEBELUM filterSig/logs dihitung di bawah -- supaya render
// pertama tab ini langsung mencerminkan pilihan filter sesi sebelumnya
// (pola sama persis Sparepart.renderCatList()).
Servis._loadMasterCategoryFilterPrefsOnce();
const {from,to}=getCnRange();
// filterSig -- Sesi D-lanjutan4: activeMasterCategoryFilter ditambahkan sbg
// komponen (pola sama persis penambahan activeActionTypeFilter di E6),
// supaya listPage ikut direset otomatis saat filter kategori master
// berganti (jumlah total item bisa beda).
const filterSig=curVehicleId+'|'+(+from)+'|'+(+to)+'|'+Servis.activeActionTypeFilter+'|'+Servis.activeMasterCategoryFilter+'|'+Servis.activeServiceComponentFilter;
if(filterSig!==Servis.lastFilterSig){Servis.listPage=1;Servis.lastFilterSig=filterSig;}
// Sesi D-lanjutan4: kondisi filter tambahan by kategori master, reuse
// resolveLogMasterCategoryId(s) apa adanya (0 logic classify baru).
// activeMasterCategoryFilter===null (default) = 0 perubahan hasil filter
// dari sebelum sesi ini -- 0 regresi, sama persis pola E6.
// Sesi D-lanjutan5: opsi dropdown "❔ Belum dikategorikan" (UNCATEGORIZED_FILTER_ID)
// -- cocokkan entry yang resolveLogMasterCategoryId(s)-nya null (baik krn
// classify 0 keyword cocok, maupun krn 0 kategori yang bisa di-join sama
// sekali), BUKAN dibandingkan literal ke salah satu dari 13 id terkunci.
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
// renderMasterCategoryChips(el) -- Sesi D-lanjutan4. Dipanggil SETELAH
// renderActionTypeChips(el) (keduanya pakai insertAdjacentElement
// 'beforebegin' relatif ke el) supaya urutan tampil konsisten: chip
// actionType (E6) di atas, dropdown kategori master (sesi ini) di bawahnya,
// baru #servisList. Dipanggil sebelum cek logs.length supaya filter tetap
// tampil walau hasil filter 0 entry (user bisa ganti filter lagi), pola
// sama persis renderActionTypeChips(el) di atas.
Servis.renderMasterCategoryChips(el);
Servis.renderServiceComponentFilter(el);
if(!logs.length){
// Sesi D-lanjutan4: pesan empty state dibedakan saat filter kategori
// master aktif & 0 match, supaya user tidak salah kira riwayat servis
// kendaraannya benar-benar kosong -- pola sama persis pembedaan pesan di
// Sparepart.renderCatList() (Sesi D-lanjutan3). Filter actionType/rentang
// tanggal 0 match tetap pakai pesan default lama (0 perubahan, di luar
// scope sesi ini).
const emptyText=Servis.activeMasterCategoryFilter?'Tidak ada catatan servis utk kategori master ini':'Belum ada catatan servis';
el.innerHTML=`<div class="empty"><div class="empty-icon">🔧</div><div class="empty-text">${escapeHtml(emptyText)}</div></div>`;
return;
}
const visibleCount=Math.min(logs.length,Servis.listPage*TX_PAGE_SIZE);
const visible=logs.slice(0,visibleCount);
// Stage 2B — group records produced by one checklist session into one
// history card. Legacy logs without sessionId stay one-card-per-record.
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
const fotoThumb=s.foto&&s.foto.length?`<img src="${s.foto[0]}" alt="" style="width:38px;height:38px;object-fit:cover;border-radius:var(--r-lg);border:1px solid var(--border2);flex-shrink:0">`:'';
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
// Ekspos ke window — WAJIB supaya delegasi klik global (data-action, di
// features-helpers-global-security.js) bisa menemukan modul ini lewat
// window['Servis'][method]. `const Servis = {...}` di atas HANYA membuat
// binding lexical-scope (bukan properti window), pola fix sama persis
// window.FuelModal di fuel-modal.js (bug yang sama pernah terjadi &
// diperbaiki di sana). Tanpa baris ini, semua tombol data-action="Servis.xxx"
// (termasuk chip rekomendasi part) gagal diam-diam.
if (typeof Servis !== 'undefined') window.Servis = Servis;
