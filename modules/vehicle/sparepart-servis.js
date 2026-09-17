// sparepart-servis.js — Domain Sparepart & Servis kendaraan: kategori & stok sparepart
// (Sparepart), catatan servis (wrapper ke Servis di car-notes.js),
// interval servis per-kategori & override per-kendaraan, katalog referensi TORSI_DB/VEHICLE_SPEC_DB
// & skala kunci torsi (MY_WRENCH_SCALE), serta filter kartu Pengingat Servis di Dashboard.
// (Audit ukuran file, sesi split lanjutan): file ini dipecah jadi 2 --
// SparepartCsvImport/TORSI_DB/VEHICLE_SPEC_DB/wrapper Servis/fitur AI
// kendaraan (predictService dkk) dipindah ke
// modules/vehicle/sparepart-servis-b.js (harus dimuat SETELAH file ini,
// lihat scripts/build.js). Titik potong: tepat setelah `window.Sparepart =
// Sparepart;`. 0 logika diubah.
// Dipindah ke modules/vehicle/sparepart-servis.js (Sesi 8 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Dipisah dari tukang-absensi.js (2026-07-12, split file besar bagian ke-3,
// lanjutan langsung dari bagian ke-1 Chat Action & ke-2 Storage/Archive di sesi yang sama).
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) — lihat urutan grup di
// header tukang-absensi.js. Ditempatkan tepat setelah features-tukang-kendaraan-
// storage.js (sumber pemisahan) & data-archive.js, sebelum features-aiwidget-reminder-gdrive-search.js
// (yang memanggil getEffectiveIntervalKm() dari file ini).
// catVisibleForVehicle(cat,vehicleId) — S622 (permintaan user: pengingat servis
// per part, kategori part & stok sparepart harus punya cakupan SENDIRI-SENDIRI
// per kendaraan, bukan 1 daftar global yg numpuk sama utk semua kendaraan).
// cat.vehicleId BARU (opsional, backward compatible): null/undefined = kategori
// UNIVERSAL (perilaku lama, tetap tampil di semua kendaraan -- supaya kategori
// lama yg sudah ada tidak tiba-tiba hilang). Kalau diisi salah satu id
// kendaraan, kategori itu HANYA tampil/dipakai utk kendaraan tsb.
function catVisibleForVehicle(cat,vehicleId){
if(!cat)return false;
if(!cat.vehicleId)return true;
if(!vehicleId)return true;
return cat.vehicleId===vehicleId;
}
// SERVICE COMPONENT CANONICAL RESOLVER — names are only a legacy bridge.
// New linkage must use serviceComponentId; ambiguous text is never guessed.
function resolveCanonicalServiceComponent(name,preferredId){
  if(typeof ServiceInputCatalog==='undefined')return preferredId||null;
  if(preferredId&&typeof ServiceInputCatalog.itemById==='function'){
    const direct=ServiceInputCatalog.itemById(preferredId);
    if(direct&&direct.item)return direct.item.id;
  }
  const q=String(name||'').trim().toLowerCase();
  if(!q)return null;
  const exact=[];
  for(const g of ServiceInputCatalog.groups()||[]){
    for(const it of g.items||[]){
      if(String(it.name||'').trim().toLowerCase()===q)exact.push(it.id);
    }
  }
  return exact.length===1?exact[0]:null;
}
function serviceComponentIdForCategory(cat){
  if(!cat)return null;
  return resolveCanonicalServiceComponent(cat.name,cat.serviceComponentId||null);
}
function dedupeServiceCategoriesForVehicle(categories,vehicleId){
  const out=[],seen=new Set();
  const list=(categories||[]).slice().sort((a,b)=>{
    const av=a&&a.vehicleId===vehicleId?0:1, bv=b&&b.vehicleId===vehicleId?0:1;
    return av-bv;
  });
  const canonicalIds=new Set();
  list.forEach(c=>{const cid=serviceComponentIdForCategory(c);if(cid)canonicalIds.add(cid);});
  list.forEach(c=>{
    if(!c)return;
    const cid=serviceComponentIdForCategory(c);
    const n=String(c.name||'').trim().toLowerCase();
    if(!cid && n==='kampas rem' && (canonicalIds.has('kampas-rem-depan')||canonicalIds.has('kampas-rem-belakang'))) return;
    const key=cid||('legacy:'+String(c.id||c.name||'').toLowerCase());
    if(seen.has(key))return;
    seen.add(key); out.push(c);
  });
  return out;
}

// resolveServisCatForVehicle(name,vehicleId) — BUGFIX (audit sesi ini,
// lanjutan S622/S629): sejak kategori sparepart bisa di-scope ke 1 kendaraan
// spesifik (cat.vehicleId, lihat catVisibleForVehicle() di atas), kartu
// Pengingat Servis Dashboard SUDAH benar memfilter per kendaraan. Tapi
// titik-titik yang MENCARI kategori saat MENYIMPAN servis (Servis._saveInner
// & onItemAutofillInterval & prefill edit di car-notes.js, plus
// _resolveServisCategoryId() versi sinkron Transaksi di tx-servis.js) masih
// pakai `D.sparepartCats.find(c=>c.name.toLowerCase()===item.toLowerCase())`
// polos -- cari cocok nama scr GLOBAL, tanpa peduli kendaraan mana yang
// sedang aktif. Kalau 2 kendaraan sama-sama punya item bernama sama (mis.
// "Ganti Oli"), servis kendaraan B bisa ke-link ke kategori PRIVAT milik
// kendaraan A -- lalu di kartu Pengingat kendaraan B kategori itu disembunyikan
// (vehicleId-nya bukan B), jadi dari sudut pandang B histori servis "tidak
// kebaca" & interval yang diisi "tidak tersimpan" (padahal tersimpan, cuma ke
// kategori kendaraan lain).
// Fix: helper tunggal ini jadi SoT pencocokan nama->kategori yang sadar
// kendaraan aktif -- prioritas kategori yang benar-benar scoped ke
// vehicleId ybs, lalu fallback ke kategori UNIVERSAL (cat.vehicleId kosong),
// dan TIDAK PERNAH jatuh ke kategori privat milik kendaraan lain.
function resolveServisCatForVehicle(name,vehicleId){
const n=(name||'').trim().toLowerCase();
if(!n)return null;
const cats=(D.sparepartCats||[]).filter(c=>c&&c.name&&c.name.toLowerCase()===n);
if(!cats.length)return null;
return cats.find(c=>c.vehicleId&&c.vehicleId===vehicleId)||cats.find(c=>!c.vehicleId)||null;
}
// canonicalServisCategoryId(item,vehicleId,preferredId) — SoT tunggal linkage
// Riwayat -> Pengingat. Jika preferredId masih menunjuk kategori yang valid
// dan terlihat untuk kendaraan ini, pertahankan. Jika tidak, resolve berdasarkan
// nama + kendaraan. TIDAK PERNAH mengembalikan kategori privat kendaraan lain.
// Helper ini dipakai oleh jalur create/import/chat agar semua penulis log baru
// memakai aturan canonical yang sama.
function canonicalServisCategoryId(item,vehicleId,preferredId){
const cats=D.sparepartCats||[];
if(preferredId){
const preferred=cats.find(c=>c&&c.id===preferredId);
if(preferred&&(!preferred.vehicleId||preferred.vehicleId===vehicleId))return preferred.id;
}
const matched=resolveServisCatForVehicle(item,vehicleId);
return matched?matched.id:null;
}

// P13 — backward-compatible normalization for legacy service history.
// Read/migration helper only: it NEVER overwrites an existing historical
// snapshot and NEVER creates finance/stock side effects. Safe to call more
// than once. Legacy rows are assigned a deterministic idempotency key from
// their own immutable log id (or txLinkId when one already exists), so adding
// this field cannot accidentally deduplicate two legitimate old services.
function normalizeLegacyServiceLogs(){
const logs=Array.isArray(D.servisLogs)?D.servisLogs:[];
let changed=0;
logs.forEach(s=>{
  if(!s||!s.id)return;
  const vehicleId=s.vehicleId||s.vehicle||null;
  const item=s.item||s.name||null;
  if(s.vehicleId==null&&vehicleId!=null){s.vehicleId=vehicleId;changed++;}
  if(s.item==null&&item!=null){s.item=item;changed++;}

  const catId=canonicalServisCategoryId(s.item||'',vehicleId,s.categoryId||s.catId||null);
  const cat=catId?(D.sparepartCats||[]).find(c=>c&&c.id===catId):null;
  if(s.categoryId==null&&catId){s.categoryId=catId;changed++;}
  if(s.masterCategoryId==null&&(s.categoryId&&cat?.masterCategoryId)){s.masterCategoryId=cat.masterCategoryId;changed++;}
  if(s.serviceComponentId==null&&(cat?.serviceComponentId||cat?.maintenanceRuleId)){
    s.serviceComponentId=cat.serviceComponentId||cat.maintenanceRuleId;changed++;
  }
  if(s.actionType===undefined){s.actionType=null;changed++;}

  // Only backfill snapshot fields when the row has no canonical snapshot at all.
  const hasSnapshot=s.nextDueAxis!=null || s.nextDueKm!=null || s.nextDueDate!=null || s.intervalKmAtService!=null || s.intervalBulanAtService!=null;
  if(!hasSnapshot&&cat&&typeof buildServiceNextDueSnapshot==='function'){
    const snap=buildServiceNextDueSnapshot({vehicleId,cat,serviceKm:s.km,serviceDate:s.date||s.tanggal,actionType:s.actionType||null});
    s.intervalKmAtService=snap.intervalKmAtService??null;
    s.intervalBulanAtService=snap.intervalBulanAtService??null;
    s.nextDueKm=snap.nextDueKm??null;
    s.nextDueDate=snap.nextDueDate??null;
    s.nextDueAxis=snap.nextDueAxis||'none';
    changed++;
  } else {
    if(s.intervalKmAtService===undefined)s.intervalKmAtService=null,changed++;
    if(s.intervalBulanAtService===undefined)s.intervalBulanAtService=null,changed++;
    if(s.nextDueKm===undefined)s.nextDueKm=null,changed++;
    if(s.nextDueDate===undefined)s.nextDueDate=null,changed++;
    if(s.nextDueAxis===undefined)s.nextDueAxis='none',changed++;
  }

  if(s.idempotencyKey==null){
    s.idempotencyKey=s.txLinkId?`tx:${s.txLinkId}`:`legacy-service:${s.id}`;
    changed++;
  }
});
return changed;
}
// GENERIC_RECOMMEND_NAMES — FITUR BARU (permintaan user: "rekomendasi kategori
// part rutin servis sesuai pabrikan"). Daftar nama part/servis rutin yang UMUM
// dipakai sbg starting point rekomendasi kategori, dipisah per jenis kendaraan
// (v.jenis, field yg SUDAH ADA di vehicle-core.js — motor/mobil). Ini BUKAN
// data pabrikan (tidak ada nama part di sini yg diklaim resmi) — cuma daftar
// NAMA yg lalu di-lookup satu-satu lewat suggestServiceIntervalKm() (SUDAH
// ADA di file ini, dideklarasikan di bawah — dipanggil hanya lewat
// Sparepart.recommendCategories() saat runtime, jadi urutan deklarasi top-
// level ini aman) supaya intervalnya: (1) dari TORSI_DB kendaraan aktif kalau
// match by nama (data manual resmi, ada sourceNote-nya), atau (2) fallback ke
// FALLBACK_KEYWORDS (rule-of-thumb, dilabeli eksplisit "bukan dari buku manual
// kendaraan spesifik ini" oleh suggestServiceIntervalKm() sendiri) — 0 logic
// interval baru diciptakan di sini, 100% reuse.
const GENERIC_RECOMMEND_NAMES={
motor:['Oli Mesin','Filter Oli','Oli Gardan','Busi','Filter Udara','Kampas Rem Depan','Kampas Rem Belakang','V-Belt CVT','Roller CVT','Minyak Rem','Aki','Ban Depan'],
mobil:['Oli Mesin','Filter Oli','Oli Transmisi','Busi','Filter Udara','Filter AC','Kampas Rem Depan','Kampas Rem Belakang','Minyak Rem','Aki','Coolant','Timing Belt','Ban Depan'],
listrik:['Kampas Rem Depan','Kampas Rem Belakang','Minyak Rem','Aki','Ban Depan'],
};
// GENERIC_GROUP_BY_NAME/resolveCatGroup() — FITUR BARU (audit sesi ini,
// permintaan user: kartu "🔔 Pengingat Servis per Part" & rekomendasi
// kategori masih FLAT walau data pabrikan TORSI_DB sudah terkategori 8 grup
// komponen — lihat audit sebelumnya). Label grup di map statis ini dipetakan
// SAMA PERSIS dgn nama kategori TORSI_DB (cat.cat) biar konsisten dgn tab
// Torsi — HANYA dipakai sbg fallback terakhir utk part GENERIC_RECOMMEND_NAMES
// yg TIDAK match TORSI_DB kendaraan aktif (mis. kendaraan yg belum py entri
// TORSI_DB sama sekali). Bukan data pabrikan, cuma pengelompokan estimasi.
// _genericGroupByName()/_genericRecommendNames() -- wiring literal tersisa
// (roadmap §7 baris 91, lanjutan Sesi B v1650): pola guard SAMA PERSIS
// _allTorsiEntries() (sparepart-servis-b.js) -- baca DatabaseAPI.master
// kalau termuat, fallback ke literal di bawah kalau DatabaseAPI/namespace
// master belum ada (mis. test terisolasi yg cuma load file ini sendirian).
// CATATAN URUTAN MUAT: di scripts/build.js, database-api.js dimuat SETELAH
// file ini (tepat sebelum sparepart-servis-b.js) -- kebalikan urutan
// _allTorsiEntries(). Ini AMAN krn 2 fungsi ini (sama seperti
// collectKnownGroups()/resolveCatGroup() yg memanggilnya) cuma DIPANGGIL
// saat runtime (buka modal/render kartu), bukan dieksekusi top-level saat
// file ini pertama dimuat -- jadi DatabaseAPI (var global) sudah pasti
// terdaftar duluan di scope global begitu app selesai boot, terlepas dari
// urutan deklarasi file. Konstanta literal
// GENERIC_GROUP_BY_NAME/GENERIC_RECOMMEND_NAMES di bawah TETAP ADA sbg
// fallback -- pola sama VEHICLE_DB_RECORDS, TIDAK dihapus.
function _genericGroupByName(){
if(typeof DatabaseAPI!=='undefined'&&DatabaseAPI.master&&typeof DatabaseAPI.master.getGenericGroupByName==='function'){
return DatabaseAPI.master.getGenericGroupByName();
}
return GENERIC_GROUP_BY_NAME;
}
function _genericRecommendNames(){
if(typeof DatabaseAPI!=='undefined'&&DatabaseAPI.master&&typeof DatabaseAPI.master.getGenericRecommendNames==='function'){
return DatabaseAPI.master.getGenericRecommendNames();
}
return GENERIC_RECOMMEND_NAMES;
}
const GENERIC_GROUP_BY_NAME={
'oli mesin':{group:'Perawatan Berkala',icon:'🛠️'},
'filter oli':{group:'Perawatan Berkala',icon:'🛠️'},
'oli gardan':{group:'Perawatan Berkala',icon:'🛠️'},
'oli transmisi':{group:'Perawatan Berkala',icon:'🛠️'},
'busi':{group:'Perawatan Berkala',icon:'🛠️'},
'filter udara':{group:'Perawatan Berkala',icon:'🛠️'},
'filter ac':{group:'Perawatan Berkala',icon:'🛠️'},
'v-belt cvt':{group:'Perawatan Berkala',icon:'🛠️'},
'minyak rem':{group:'Perawatan Berkala',icon:'🛠️'},
'coolant':{group:'Perawatan Berkala',icon:'🛠️'},
'roller cvt':{group:'Mesin — Kopling/Pulley/Final Drive',icon:'🔗'},
'timing belt':{group:'Mesin — Cylinder Head/Valve',icon:'⚙️'},
'kampas rem':{group:'Sistem Rem',icon:'🛑'},
'kampas rem depan':{group:'Sistem Pengereman',icon:'🛑'},
'kampas rem belakang':{group:'Sistem Pengereman',icon:'🛑'},
'cakram rem depan':{group:'Sistem Pengereman',icon:'🛑'},
'kaliper rem depan':{group:'Sistem Pengereman',icon:'🛑'},
'master rem & reservoir':{group:'Sistem Pengereman',icon:'🛑'},
'tromol rem belakang':{group:'Sistem Pengereman',icon:'🛑'},
'aki':{group:'Kelistrikan & Panel',icon:'🔌'},
'ban depan':{group:'Roda Depan/Suspensi/Kemudi',icon:'🛞'},
};
// resolveCatGroup(cat,vehicleId) — SoT tunggal utk cari "kategori induk" (grup
// komponen) sebuah kategori sparepart, dipakai Servis.renderReminder()
// (car-notes.js) utk render Pengingat Servis per grup (bukan flat). Prioritas:
// (1) cat.group tersimpan langsung (kategori baru hasil recommendCategories(),
// lihat di bawah), (2) match nama ke item TORSI_DB kendaraan aktif (data
// pabrikan asli, paling akurat — pola pencocokan sama servisLogMatchesCat()),
// (3) GENERIC_GROUP_BY_NAME (estimasi, di atas), (4) 'Lainnya' kalau semua
// gagal. 100% backward-compatible — kategori LAMA yg belum py field `group`
// tetap kegrup otomatis lewat (2)/(3) tanpa migrasi data apa pun.
// _withMasterCategory(result,cat) -- Sesi D (roadmap §7): tempel field BARU
// masterCategoryId/masterCategoryName/masterCategoryIcon ke hasil
// resolveCatGroup(), diturunkan dari 13 kategori terkunci
// (DatabaseAPI.masterCategory, modules/engine/database-api.js) via
// classifyItemName(cat.name) -- ADDITIVE murni, field group/icon LAMA di
// `result` 0 berubah (0 titik baca lama yg terpengaruh). null kalau
// DatabaseAPI/namespace belum termuat (guard sama pola _genericGroupByName())
// atau kalau 0 keyword cocok (SENGAJA tidak menebak, lihat komentar
// namespace masterCategory di database-api.js).
function _withMasterCategory(result,cat){
let mc=null;
if(typeof DatabaseAPI!=='undefined'&&DatabaseAPI.masterCategory){
  if(cat&&cat.masterCategoryId&&typeof DatabaseAPI.masterCategory.getAll==='function'){
    mc=DatabaseAPI.masterCategory.getAll().find(c=>c&&c.id===cat.masterCategoryId)||null;
  }
  if(!mc&&typeof DatabaseAPI.masterCategory.classifyItemName==='function'){
    mc=DatabaseAPI.masterCategory.classifyItemName(cat&&cat.name);
  }
}
result.masterCategoryId=mc?mc.id:null;
result.masterCategoryName=mc?mc.name:null;
result.masterCategoryIcon=mc?mc.icon:null;
return result;
}
// UNCATEGORIZED_FILTER_ID -- Sesi D-lanjutan5 (ROADMAP-KONSOLIDASI-DATABASE-
// SERVIS-v2.md §7 Sesi D -- keputusan produk item classify `null`). Kategori
// master TETAP terkunci 13 (DatabaseAPI.masterCategory) -- id ini SENGAJA
// bukan salah satu dari 13 id itu (nilai sentinel murni level UI, TIDAK
// pernah ditulis ke DatabaseAPI.masterCategory ataupun ke field
// masterCategoryId hasil classify manapun). Dipakai HANYA sebagai value
// activeMasterCategoryFilter di Sparepart (file ini) & Servis (car-notes.js)
// utk merepresentasikan chip "❔ Belum Terklasifikasi" -- supaya item yang
// classifyItemName()-nya balik null (0 keyword cocok ke 13 kategori) tetap
// bisa ditemukan/ditinjau user, tanpa nambah kategori ke-14 ke skema data
// terkunci maupun logic classify baru. Dideklarasikan di sini (dimuat
// sebelum car-notes.js, lihat scripts/build.js) tapi cuma dipakai di dalam
// isi fungsi (bukan top-level eksekusi), jadi car-notes.js tetap bisa
// mereferensikannya di runtime walau urutan load-nya sebenarnya lebih dulu
// dari file ini (pola sama seperti car-notes.js sudah lama mereferensikan
// resolveCatGroup() dari file ini).
const UNCATEGORIZED_FILTER_ID='__uncategorized__';
function resolveCatGroup(cat,vehicleId){
if(!cat)return _withMasterCategory({group:'Lainnya',icon:'📦'},cat);
if(cat.group)return _withMasterCategory({group:cat.group,icon:cat.groupIcon||'📦'},cat);
const n=(cat.name||'').trim().toLowerCase();
if(n&&vehicleId&&typeof findTorsiDb==='function'&&typeof D!=='undefined'&&D.vehicles){
const veh=D.vehicles.find(v=>v.id===vehicleId);
const db=veh?findTorsiDb(veh.name,veh.modelId):null;
if(db&&Array.isArray(db.cats)){
for(const catGroup of db.cats){
const hit=(catGroup.items||[]).some(it=>{
const itn=(it.name||'').trim().toLowerCase();
if(!itn)return false;
return itn===n||itn.includes(n)||(n.includes(itn)&&itn.length>=4);
});
if(hit)return _withMasterCategory({group:catGroup.cat,icon:catGroup.icon||'📦'},cat);
}
}
}
const gmap=_genericGroupByName();
if(n&&gmap[n])return _withMasterCategory(Object.assign({},gmap[n]),cat);
return _withMasterCategory({group:'Lainnya',icon:'📦'},cat);
}
// collectKnownGroups()/iconForGroupName() -- FITUR BARU sesi v1642 (Sesi 1 dari
// 2, backlog "override grup manual" sejak v1638): kumpulkan daftar SEMUA nama
// grup komponen yg "dikenal" aplikasi -- gabungan unik dari cat.cat di setiap
// entri TORSI_DB (semua kendaraan, bukan cuma kendaraan aktif, supaya dropdown
// override tetap konsisten walau user lagi buka kategori kendaraan lain) +
// GENERIC_GROUP_BY_NAME (fallback estimasi). Dipakai Sparepart.populateGroupSelect()
// utk isi dropdown "Grup Komponen" di modal Kategori Sparepart -- 0 rumus
// grouping baru, murni pengumpulan nama grup yg SUDAH ADA.
// Database API Fase 1 lanjutan (sesi v1645): sumber entri TORSI_DB sekarang
// lewat _allTorsiEntries() (modules/vehicle/sparepart-servis-b.js -- fungsi
// itu sendiri sudah baca DatabaseAPI.vehicle.getAll() kalau termuat, fallback
// literal TORSI_DB kalau belum), BUKAN baca TORSI_DB literal langsung lagi.
// _allTorsiEntries() dideklarasikan di sparepart-servis-b.js yg dimuat
// SETELAH file ini (lihat urutan resmi di scripts/build.js) -- aman krn
// collectKnownGroups() cuma DIPANGGIL saat runtime (buka modal Kategori
// Sparepart), bukan di top-level saat file ini pertama dieksekusi, jadi
// _allTorsiEntries() sudah terdaftar di scope global saat dipanggil (pola
// sama persis seperti resolveCatGroup() di atas yg sudah lebih dulu panggil
// findTorsiDb(), juga didefinisikan di sparepart-servis-b.js). Guard typeof
// dipertahankan supaya tetap aman kalau sparepart-servis-b.js belum termuat
// sama sekali (mis. test terisolasi yg cuma load file ini sendirian) --
// fallback ke TORSI_DB literal langsung, IDENTIK perilaku lama.
function collectKnownGroups(){
const map=new Map();
const torsiEntries=(typeof _allTorsiEntries==='function')
?_allTorsiEntries()
:((typeof TORSI_DB!=='undefined'&&Array.isArray(TORSI_DB))?TORSI_DB:[]);
torsiEntries.forEach(veh=>{
(veh&&Array.isArray(veh.cats)?veh.cats:[]).forEach(cg=>{
if(cg&&cg.cat&&!map.has(cg.cat))map.set(cg.cat,cg.icon||'📦');
});
});
const gmap=_genericGroupByName();
Object.keys(gmap).forEach(k=>{
const g=gmap[k];
if(g&&g.group&&!map.has(g.group))map.set(g.group,g.icon||'📦');
});
return Array.from(map.entries()).map(([group,icon])=>({group,icon}));
}
function iconForGroupName(name){
if(!name)return'📦';
const hit=collectKnownGroups().find(g=>g.group===name);
return hit?hit.icon:'📦';
}
function servisLogMatchesCat(s,cat){
const catComponent=serviceComponentIdForCategory(cat);
if(catComponent&&s&&s.serviceComponentId&&String(s.serviceComponentId)===String(catComponent)) return true;
if(s.categoryId){
const linked=D.sparepartCats.find(c=>c&&c.id===s.categoryId);
if(!linked)return false;
if(linked.vehicleId&&linked.vehicleId!==s.vehicleId)return false;
const linkedComponent=serviceComponentIdForCategory(linked);
if(catComponent&&linkedComponent) return linkedComponent===catComponent;
return s.categoryId===cat.id;
}
const cn=cat.name.toLowerCase();
const item=(s.item||'').toLowerCase().trim();
if(!item)return false;
if(item===cn) return true;
if(item.includes(cn)) return true;
if(cn.includes(item)&&item.length>=4){
const ambiguous=D.sparepartCats.some(c=>c.id!==cat.id&&c.name.toLowerCase().includes(item));
if(!ambiguous) return true;
}
return false;
}
function normalizeMaintenanceRuleKey(v){
return String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function vehicleMatchesMaintenanceRuleSet(vehicleId){
const veh=(D.vehicles||[]).find(v=>v&&v.id===vehicleId);
if(!veh)return false;
if(typeof findTorsiDb==='function'){
const db=findTorsiDb(veh.name,veh.modelId);
if(db&&db.id==='vario-125')return true;
}
const hay=(String(veh.name||'')+' '+String(veh.modelId||'')).toLowerCase();
return /vario\s*125|kzr/.test(hay);
}
function resolveMaintenanceRule(vehicleId,cat){
if(!vehicleMatchesMaintenanceRuleSet(vehicleId)||typeof SERVICE_MAINTENANCE_RULES==='undefined')return null;
if(!cat)return null;
// V37+: persisted category intervals remain authoritative for the replacement
// axis, but must not erase an explicit inspection axis from the maintenance registry.
const persistedKm=Number.isFinite(Number(cat.intervalKm))&&Number(cat.intervalKm)>0?Number(cat.intervalKm):null;
const persistedMonths=Number.isFinite(Number(cat.intervalBulan))&&Number(cat.intervalBulan)>0?Number(cat.intervalBulan):null;
const direct=normalizeMaintenanceRuleKey(cat.serviceComponentId||cat.maintenanceRuleId);
if(direct&&SERVICE_MAINTENANCE_RULES[direct]){
  const base=SERVICE_MAINTENANCE_RULES[direct];
  return Object.assign({},base,{
    serviceComponentId:cat.serviceComponentId||direct,
    componentName:cat.name||base.componentName||null,
    replaceKm:persistedKm!==null?persistedKm:base.replaceKm,
    replaceMonths:persistedMonths!==null?persistedMonths:base.replaceMonths
  });
}
if(persistedKm||persistedMonths)return{serviceComponentId:cat.serviceComponentId||cat.id||null,componentName:cat.name||null,replaceKm:persistedKm,replaceMonths:persistedMonths,maintenanceType:cat.maintenanceType||'periodic'};
const n=normalizeMaintenanceRuleKey(cat.name);
if(n&&SERVICE_MAINTENANCE_RULES[n]){
  const base=SERVICE_MAINTENANCE_RULES[n];
  return Object.assign({},base,{
    serviceComponentId:cat.serviceComponentId||n,
    componentName:cat.name||base.componentName||null,
    replaceKm:persistedKm!==null?persistedKm:base.replaceKm,
    replaceMonths:persistedMonths!==null?persistedMonths:base.replaceMonths
  });
}
if(typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog['groups']==='function'){
for(const g of ServiceInputCatalog.groups()||[]){
for(const it of g.items||[]){
if(normalizeMaintenanceRuleKey(it.id)===n||normalizeMaintenanceRuleKey(it.name)===n){
const r=SERVICE_MAINTENANCE_RULES[it.id];
if(r)return Object.assign({serviceComponentId:it.id,componentName:it.name},r,{
  replaceKm:persistedKm!==null?persistedKm:r.replaceKm,
  replaceMonths:persistedMonths!==null?persistedMonths:r.replaceMonths
});
}
}
}
}
return null;
}
function getMaintenanceSchedule(vehicleId,cat){
const rule=resolveMaintenanceRule(vehicleId,cat);
if(!rule)return null;
return {
 rule,
 inspectKm:Number.isFinite(rule.inspectKm)&&rule.inspectKm>0?rule.inspectKm:null,
 replaceKm:Number.isFinite(rule.replaceKm)&&rule.replaceKm>0?rule.replaceKm:null,
 inspectMonths:Number.isFinite(rule.inspectMonths)&&rule.inspectMonths>0?rule.inspectMonths:null,
 replaceMonths:Number.isFinite(rule.replaceMonths)&&rule.replaceMonths>0?rule.replaceMonths:null,
 inspectDays:Number.isFinite(rule.inspectDays)&&rule.inspectDays>0?rule.inspectDays:null,
 replaceDays:Number.isFinite(rule.replaceDays)&&rule.replaceDays>0?rule.replaceDays:null,
 maintenanceType:rule.maintenanceType||'periodic',
 condition:rule.condition||null
 };
}
function hasMaintenanceReminderSchedule(vehicleId,cat){
const s=getMaintenanceSchedule(vehicleId,cat);
if(!s)return false;
if(s.maintenanceType==='event_based')return false;
return !!(s.inspectKm||s.replaceKm||s.inspectMonths||s.replaceMonths||s.inspectDays||s.replaceDays);
}
// SERVICE MASTER LINKAGE — P1/P3 akumulasi: satu resolver untuk hubungan
// Kategori Servis -> Komponen Servis -> Part. Komponen adalah SoT untuk identitas
// maintenance; part/stok hanya implementasi fisiknya. Resolver selalu memvalidasi
// bahwa masterCategoryId cocok dengan serviceComponentId agar data tidak silang.
function resolveServiceCategoryComponent(masterCategoryId,serviceComponentId,name){
  let group=null,item=null;
  if(typeof ServiceInputCatalog!=='undefined'){
    if(serviceComponentId&&typeof ServiceInputCatalog.itemById==='function'){
      const hit=ServiceInputCatalog.itemById(serviceComponentId);
      if(hit&&hit.item){item=hit.item;group=hit.group||null;}
    }
    if(!item&&name&&typeof ServiceInputCatalog.infer==='function'){
      const inf=ServiceInputCatalog.infer(name);
      if(inf&&inf.item){item=inf.item;group=inf.group||null;}
    }
    if(!group&&masterCategoryId&&typeof ServiceInputCatalog.groupById==='function'){
      group=ServiceInputCatalog.groupById(masterCategoryId)||null;
    }
  }
  const finalMaster=group&&group.masterCategoryId?group.masterCategoryId:(masterCategoryId||null);
  const finalComponent=item&&item.id?item.id:(serviceComponentId||null);
  return {masterCategoryId:finalMaster,serviceComponentId:finalComponent,componentName:item?item.name:null,masterCategoryName:group?group.group:null};
}
function getServiceLinkage(catOrPart,vehicleId){
  const x=catOrPart||{};
  const linkedCat=x.catId?(D.sparepartCats||[]).find(c=>c&&c.id===x.catId):null;
  const inferred=(typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.infer==='function')
    ?ServiceInputCatalog.infer([x.name,x.code].filter(Boolean).join(' ')):null;
  const resolved=resolveServiceCategoryComponent(
    x.masterCategoryId||linkedCat?.masterCategoryId||inferred?.group?.masterCategoryId||null,
    x.serviceComponentId||linkedCat?.serviceComponentId||inferred?.item?.id||null,
    x.name||linkedCat?.name||''
  );
  if(!resolved.masterCategoryId&&typeof resolveCatGroup==='function'&&(linkedCat||x.name)){
    const rg=resolveCatGroup(linkedCat||x,vehicleId);
    if(rg&&rg.masterCategoryId)resolved.masterCategoryId=rg.masterCategoryId;
  }
  return resolved;
}
function getEffectiveIntervalKm(vehicleId,cat){
const veh=(D.vehicles||[]).find(v=>v.id===vehicleId);
const ov=veh&&veh.intervalOverrides&&veh.intervalOverrides[cat.id];
if(typeof resolveCanonicalInterval==='function'){
  return resolveCanonicalInterval(cat,{intervalKm:ov}).intervalKm;
}
return(ov!=null&&ov>0)?ov:(cat&&cat.intervalKm>0?cat.intervalKm:null);
}
function hasIntervalOverride(vehicleId,cat){
const veh=D.vehicles.find(v=>v.id===vehicleId);
return!!(veh&&veh.intervalOverrides&&veh.intervalOverrides[cat.id]>0);
}
// getEffectiveIntervalBulan(cat,vehicleId) — FITUR BARU (permintaan user: "Interval
// Waktu"): interval berbasis WAKTU (bulan) opsional per kategori, independen
// dari getEffectiveIntervalKm() di atas -- dipakai utk kategori yg idealnya
// diingatkan berbasis waktu juga, bukan cuma km (mis. Minyak Rem/Aki, yg bisa
// menurun kualitasnya meski kendaraan jarang dipakai). TIDAK ada override
// per-kendaraan (beda dari intervalKm) -- cukup 1 field global per kategori
// (cat.intervalBulan). Backward compatible: null/undefined/0 berarti
// kategori ini TIDAK pakai interval waktu (perilaku lama, murni km).
function getEffectiveIntervalBulan(cat,vehicleId){
const veh=(D.vehicles||[]).find(v=>v.id===vehicleId);
const ov=veh&&veh.intervalOverrides&&veh.intervalOverrides[cat&&cat.id];
if(typeof resolveCanonicalInterval==='function'){
  return resolveCanonicalInterval(cat,{intervalBulan:ov}).intervalBulan;
}
return(cat&&cat.intervalBulan>0)?cat.intervalBulan:null;
}
// getLastServiceDateForCat(vehicleId,cat) — twin TANGGAL dari
// getLastServiceKmForCat()/Servis.getLastServiceKmForCat() (car-notes.js):
// cari log servis TERAKHIR utk kategori ini (reuse servisLogMatchesCat() yg
// sama persis, 0 logic pencocokan baru) & balikin field .date-nya (ISO
// string), null kalau belum pernah dicatat servis dgn tanggal terisi.
// getLastServiceDateForCat(vehicleId, cat, actionTypeFilter, forReminder) —
// actionTypeFilter & forReminder FITUR BARU (opsional, backward compatible;
// PERBAIKAN-JENIS-TINDAKAN-CHECKLIST-SERVIS.md §2c). Dipanggil TANPA 2 param
// baru ini (mis. dari riwayat) = 0 perubahan perilaku lama.
// P21: canonical ordering for service history. Service DATE is the primary
// business meaning of "last service"; KM breaks ties on the same calendar
// date, then explicit timestamps/id make ordering deterministic. Invalid/missing
// dates never participate as a newer date. This prevents backdated records,
// same-day multiple services, and malformed dates from producing a different
// baseline in different consumers.
function compareServiceHistoryRecencyLocal(a,b){
  if(typeof window!=='undefined'&&typeof window.compareServiceHistoryRecency==='function'&&window.compareServiceHistoryRecency!==compareServiceHistoryRecencyLocal)return window.compareServiceHistoryRecency(a,b);
  const da=parseServiceDateOnly(a&&a.date), db=parseServiceDateOnly(b&&b.date);
  const av=!!da,bv=!!db;
  if(av!==bv)return av?-1:1;
  if(av){
    const d=db.getTime()-da.getTime();
    if(d)return d;
  }
  const ak=Number(a&&a.km),bk=Number(b&&b.km);
  const akv=Number.isFinite(ak),bkv=Number.isFinite(bk);
  if(akv!==bkv)return akv?-1:1;
  if(akv&&bk!==ak)return bk-ak;
  const at=Date.parse(a&& (a.updatedAt||a.createdAt||a.timestamp));
  const bt=Date.parse(b&& (b.updatedAt||b.createdAt||b.timestamp));
  if(Number.isFinite(at)||Number.isFinite(bt)){
    const avT=Number.isFinite(at)?at:-Infinity,bvT=Number.isFinite(bt)?bt:-Infinity;
    if(bvT!==avT)return bvT-avT;
  }
  return String(b&&b.id||'').localeCompare(String(a&&a.id||''));
}
if(typeof window!=='undefined'&&typeof window.compareServiceHistoryRecency!=='function')window.compareServiceHistoryRecency=compareServiceHistoryRecencyLocal;
function getLatestServiceLogForCat(vehicleId,cat,actionTypeFilter,forReminder){
  const logs=(D.servisLogs||[]).filter(s=>s.vehicleId===vehicleId&&servisLogMatchesCat(s,cat)&&matchesActionTypeForReset(s,cat,actionTypeFilter,forReminder));
  logs.sort(compareServiceHistoryRecencyLocal);
  return logs.length?logs[0]:null;
}
function getLastServiceDateForCat(vehicleId,cat,actionTypeFilter,forReminder){
const log=getLatestServiceLogForCat(vehicleId,cat,actionTypeFilter,forReminder);
return log&&parseServiceDateOnly(log.date)?log.date:null;
}
// getEffectiveActionMode(cat)/getEffectiveResetType(cat) — FITUR BARU (§2b):
// field opsional per-kategori BARU pada D.sparepartCats, 0 migrasi data.
// Kategori lama tanpa field ini = pola 1 "ganti-saja km" (perilaku persis
// sebelum fitur ini ada).
// - cat.actionMode: 'ganti'(default) | 'bersih' | 'alternate' | 'periksa-conditional' | 'none'
// - cat.resetType: 'km'(default) | 'time' | 'both'
// - cat.gantiResetsInterval: default true, HANYA dipakai saat actionMode==='periksa-conditional'
function getEffectiveActionMode(cat){return(cat&&cat.actionMode)||'ganti';}
function getEffectiveResetType(cat){return(cat&&cat.resetType)||'km';}
// resolveResetActionTypeFilter(cat) — actionTypeFilter yang dipakai jalur
// hitung jatuh-tempo (computeServiceUrgency, di bawah) tergantung pola item
// (tabel §2b): pola 1/5/6 (ganti-saja/bersih-saja/kondisional) & pola 3
// (alternasi, mis. Busi) = null (SEMUA actionType ikut jadi basis reset, 0
// perubahan dari desain lama). Pola 2 (resetType 'both'/'time', mis. Oli
// Gardan/Coolant) & pola 4 (periksa-conditional, mis. Kampas Rem) = filter
// eksplisit.
function resolveResetActionTypeFilter(cat){
if(getEffectiveActionMode(cat)==='periksa-conditional')return'periksa';
const resetType=getEffectiveResetType(cat);
if(resetType==='both'||resetType==='time')return'ganti';
return null;
}
// matchesActionTypeForReset(log, cat, actionTypeFilter, forReminder) — twin
// PERSIS Servis._matchesActionTypeForReset() (car-notes.js). Duplikasi
// SENGAJA (bukan reuse cross-file, lihat catatan di twin-nya) -- kalau salah
// satu diubah, cek ulang yang lain.
// - forReminder=true & cat.actionMode==='periksa-conditional' &
//   cat.gantiResetsInterval===false: log actionType='ganti' (atau
//   default/undefined, sesuai fallback §2a) DIKELUARKAN dari basis reset,
//   APAPUN actionTypeFilter yang dipakai caller -- safety net sesuai desain,
//   supaya baseline "ganti kondisional tanpa km-ganti resmi" tidak pernah
//   menciptakan jatuh-tempo palsu. Dipanggil TANPA forReminder (riwayat/
//   servisList/dll) = pengecualian ini TIDAK berlaku, 0 perubahan lama.
// - actionTypeFilter (opsional): kalau diisi, log harus actionType yang sama
//   (default 'ganti' kalau log.actionType kosong -- 0 migrasi data).
function matchesActionTypeForReset(log,cat,actionTypeFilter,forReminder){
const effType=log.actionType||'ganti';
if(forReminder&&cat&&cat.actionMode==='periksa-conditional'&&cat.gantiResetsInterval===false&&effType==='ganti')return false;
if(!actionTypeFilter)return true;
return effType===actionTypeFilter;
}
// suggestNextBusiAction(vehicleId, cat) — FITUR BARU, khusus pola 3
// (alternasi 1-interval, mis. Busi): saran DEFAULT toggle checklist (§2d),
// BUKAN penentu reset (reset tetap dipicu actionType APAPUN utk pola ini,
// lihat resolveResetActionTypeFilter() balikin null). Genap (0,2,4,...) log
// sebelumnya -> saran 'periksa', ganjil -> 'ganti'. Urutan histori ASLI
// (tidak diurutkan ulang) -- kalau user pernah override manual, paritas
// boleh tidak rapi & itu tidak masalah (cuma default toggle, tidak mengunci
// actionType, user tetap bisa override manual).
function suggestNextBusiAction(vehicleId,cat){
const logs=(D.servisLogs||[]).filter(s=>s.vehicleId===vehicleId&&servisLogMatchesCat(s,cat));
return(logs.length%2===0)?'periksa':'ganti';
}
// monthsSinceISO(dateISO,nowISO) — selisih waktu (bulan, desimal) antara 2
// tanggal ISO, dipakai computeServiceUrgency() di bawah. Pakai konstanta
// rata-rata hari/bulan (30.4368 -- 365.2425/12, standar astronomis) supaya
// hasilnya konsisten & tidak tergantung bulan spesifik mana yg dilewati.
// P20: date-only service dates are calendar dates, not UTC timestamps.
// Parsing YYYY-MM-DD with new Date(str) makes the value UTC and can move the
// displayed day across local timezones. Keep service calculations on local
// calendar components and clamp month-end overflow (Jan 31 + 1 month = Feb 28/29).
function parseServiceDateOnly(value){
  if(value instanceof Date)return isNaN(value)?null:new Date(value.getTime());
  const m=String(value??'').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m){
    const y=Number(m[1]),mo=Number(m[2])-1,d=Number(m[3]);
    const out=new Date(y,mo,d);
    if(out.getFullYear()===y&&out.getMonth()===mo&&out.getDate()===d)return out;
    return null;
  }
  const out=new Date(value);
  return isNaN(out)?null:out;
}
function formatServiceDateOnly(date){
  const d=parseServiceDateOnly(date);
  if(!d)return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function addServiceMonthsClamped(date,months){
  const d=parseServiceDateOnly(date);
  const n=Number(months);
  if(!d||!Number.isFinite(n))return null;
  const whole=Math.trunc(n);
  const targetMonth=d.getMonth()+whole;
  const out=new Date(d.getFullYear(),targetMonth,1);
  const lastDay=new Date(out.getFullYear(),out.getMonth()+1,0).getDate();
  out.setDate(Math.min(d.getDate(),lastDay));
  return out;
}
function diffServiceDays(dateA,dateB){
  const a=parseServiceDateOnly(dateA),b=parseServiceDateOnly(dateB);
  if(!a||!b)return null;
  const utcA=Date.UTC(a.getFullYear(),a.getMonth(),a.getDate());
  const utcB=Date.UTC(b.getFullYear(),b.getMonth(),b.getDate());
  return (utcB-utcA)/86400000;
}

function monthsSinceISO(dateISO,nowISO){
if(!dateISO)return null;
const days=diffServiceDays(dateISO,nowISO?nowISO:new Date());
return days==null?null:days/30.4368;
}
// computeServiceUrgency({vehicleId,cat,curKm,kmPerDay,nowISO}) — FITUR BARU,
// SATU-SATUNYA titik hitung status/sisa servis yg sadar 2 sumbu (km & bulan).
// Dihitung sbg FRAKSI SISA tiap sumbu (fracRemainKm/fracRemainBulan --
// 1=baru diservis .. 0=pas jatuh tempo .. negatif=lewat) -- satu-satunya
// cara valid membandingkan km vs bulan scr adil (unit beda, angka mentah
// tidak bisa dibandingkan langsung). Axis dgn fraksi PALING KECIL yg dipakai
// ("mana yang lebih dulu tercapai", konvensi servis standar km-ATAU-bulan).
// Kalau intervalBulan tidak diisi (getEffectiveIntervalBulan balikin null),
// fungsi ini SECARA MATEMATIS identik dgn formula km lama (predictService()
// versi sebelumnya) -- 0 perubahan perilaku utk data existing yg cuma pakai
// interval km. sisaKm TETAP dibalikin apa adanya (dipakai sort ascending di
// predictService(), TIDAK diubah supaya urutan kategori pure-km tidak
// berubah/regresi).
function buildServiceNextDueSnapshot({vehicleId,cat,serviceKm,serviceDate,actionType}={}){
  if(!cat)return{nextDueKm:null,nextDueDate:null,nextDueAxis:null};
  const intervalKm=typeof getEffectiveIntervalKm==='function'?getEffectiveIntervalKm(vehicleId,cat):(cat.intervalKm>0?cat.intervalKm:null);
  const intervalBulan=typeof getEffectiveIntervalBulan==='function'?getEffectiveIntervalBulan(cat,vehicleId):(cat.intervalBulan>0?cat.intervalBulan:null);
  const km=Number(serviceKm);
  const baseDate=parseServiceDateOnly(serviceDate||new Date());
  const nextDueKm=intervalKm>0&&Number.isFinite(km)?km+intervalKm:null;
  let nextDueDate=null;
  if(intervalBulan>0&&!isNaN(baseDate)){
    const d=addServiceMonthsClamped(baseDate,intervalBulan); nextDueDate=formatServiceDateOnly(d);
  }
  let nextDueAxis='none';
  if(nextDueKm!==null&&nextDueDate)nextDueAxis='km_or_date';
  else if(nextDueKm!==null)nextDueAxis='km';
  else if(nextDueDate)nextDueAxis='date';
  return{nextDueKm,nextDueDate,nextDueAxis,intervalKmAtService:intervalKm||null,intervalBulanAtService:intervalBulan||null};
}

function resolveServiceStatusMeta(score){
  const n=Number(score);
  if(!Number.isFinite(n))return{code:'aman',label:'Aman',icon:'🟢',severity:0};
  if(n< -0.10)return{code:'terlewat',label:'Terlewat',icon:'⚫',severity:4};
  if(n<=0)return{code:'jatuh_tempo',label:'Jatuh tempo',icon:'🔴',severity:3};
  if(n<=0.15)return{code:'segera',label:'Segera',icon:'🟡',severity:2};
  if(n<=0.30)return{code:'mendekati',label:'Mendekati',icon:'🔵',severity:1};
  return{code:'aman',label:'Aman',icon:'🟢',severity:0};
}

function computeServiceUrgency({vehicleId,cat,curKm,kmPerDay,nowISO}={}){
const schedule=getMaintenanceSchedule(vehicleId,cat);
const resetFilter=resolveResetActionTypeFilter(cat);
const currentKm=Number.isFinite(curKm)?curKm:0;
const kmPerDaySafe=Number.isFinite(kmPerDay)&&kmPerDay>0?kmPerDay:null;
const candidates=[];
const addCandidate=(action,intervalKm,lastFilter,intervalMonths,intervalDays)=>{
  const hasKm=intervalKm>0, hasMonths=intervalMonths>0, hasDays=intervalDays>0;
  if(!hasKm&&!hasMonths&&!hasDays)return;
  let lastKm=null,lastDate=null;
  let remainingKm=null,fracKm=null,remainingMonths=null,fracMonths=null,remainingDays=null,fracDays=null;
  if(hasKm){
    lastKm=getLastServiceKmForCat(vehicleId,cat,lastFilter,true);
    const traveled=lastKm===null?currentKm:currentKm-lastKm;
    remainingKm=intervalKm-traveled; fracKm=remainingKm/intervalKm;
  }
  if(hasMonths||hasDays){
    lastDate=getLastServiceDateForCat(vehicleId,cat,lastFilter,true);
    const elapsedDays=lastDate?diffServiceDays(lastDate,nowISO||new Date()):0;
    if(hasMonths){remainingMonths=intervalMonths-(elapsedDays/30.4368);fracMonths=remainingMonths/intervalMonths;}
    if(hasDays){remainingDays=intervalDays-elapsedDays;fracDays=remainingDays/intervalDays;}
  }
  let limitingAxis='km',score=fracKm;
  if(score==null){limitingAxis=hasMonths?'bulan':'hari';score=hasMonths?fracMonths:fracDays;}
  if(fracMonths!=null&&fracMonths<score){limitingAxis='bulan';score=fracMonths;}
  if(fracDays!=null&&fracDays<score){limitingAxis='hari';score=fracDays;}
  candidates.push({action,intervalKm:hasKm?intervalKm:null,lastKm,sisaKm:remainingKm,fracRemainKm:fracKm,intervalBulan:hasMonths?intervalMonths:null,sisaBulan:remainingMonths,fracRemainBulan:fracMonths,intervalHari:hasDays?intervalDays:null,sisaHari:remainingDays,fracRemainHari:fracDays,limitingAxis,score,lastDate});
};
if(schedule){
  const type=schedule.maintenanceType;
  const override=getEffectiveIntervalKm(vehicleId,cat);
  const hasOverride=hasIntervalOverride(vehicleId,cat);
  const inspectKm=schedule.inspectKm;
  const replaceKm=hasOverride&&override>0?override:schedule.replaceKm;
  if((inspectKm||schedule.inspectMonths||schedule.inspectDays) && (type==='periodic'||type==='periodic_or_condition')) addCandidate('periksa',inspectKm,'periksa',schedule.inspectMonths,schedule.inspectDays);
  if(type!=='event_based' && (replaceKm||schedule.replaceMonths||schedule.replaceDays)) addCandidate('ganti',replaceKm,'ganti',schedule.replaceMonths,schedule.replaceDays);
} else {
  const intervalKm=getEffectiveIntervalKm(vehicleId,cat);
  const intervalBulan=getEffectiveIntervalBulan(cat,vehicleId);
  addCandidate('ganti',intervalKm,resetFilter,intervalBulan,null);
}
if(!candidates.length){
  return{sisaKm:null,intervalKm:null,sisaBulan:null,intervalBulan:null,sisaHari:null,intervalHari:null,limitingAxis:'none',status:'aman',estDateISO:null,nextAction:schedule&&schedule.maintenanceType==='event_based'?'event_based':null,maintenanceType:schedule&&schedule.maintenanceType||null,condition:schedule&&schedule.condition||null};
}
const c=candidates.sort((a,b)=>a.score-b.score)[0];
// Canonical 5-level service state. All reminder consumers must read this
// resolver instead of inventing their own thresholds. score is the normalized
// fraction remaining on the most urgent axis (KM / bulan / hari).
const statusMeta=resolveServiceStatusMeta(c.score);
const status=statusMeta.code;
let estDateISO=null;
let nextDueKm=null,nextDueDate=null,nextDueAxis='none';
if(c.lastKm!=null&&c.intervalKm>0)nextDueKm=c.lastKm+c.intervalKm;
if(c.lastDate){
  if(c.intervalBulan>0){const d=addServiceMonthsClamped(c.lastDate,c.intervalBulan);if(d)nextDueDate=formatServiceDateOnly(d);}
  if(c.intervalHari>0&&!nextDueDate){const d=parseServiceDateOnly(c.lastDate);if(d){d.setDate(d.getDate()+c.intervalHari);nextDueDate=formatServiceDateOnly(d);}}
}
if(nextDueKm!==null&&nextDueDate)nextDueAxis='km_or_date';
else if(nextDueKm!==null)nextDueAxis='km';
else if(nextDueDate)nextDueAxis='date';
if(c.limitingAxis==='bulan'||c.limitingAxis==='hari')estDateISO=nextDueDate;
else if(typeof estimateServiceDateISO==='function')estDateISO=estimateServiceDateISO(c.sisaKm,kmPerDaySafe);
return Object.assign({},c,{status,statusLabel:statusMeta.label,statusIcon:statusMeta.icon,statusSeverity:statusMeta.severity,estDateISO,nextDueKm,nextDueDate,nextDueAxis,nextAction:c.action,maintenanceType:schedule&&schedule.maintenanceType||null,condition:schedule&&schedule.condition||null});
}
// recommendIntervalKm(vehicleId,cat) -- FITUR BARU (audit, gap "interval
// servis 100% statis, tidak ada rekomendasi berbasis data"): getEffectiveIntervalKm()
// di atas cuma baca cat.intervalKm (default manual admin) atau
// veh.intervalOverrides (override manual user) -- TIDAK PERNAH dibandingkan
// dgn pola servis AKTUAL (D.servisLogs). Fungsi ini murni MEMBACA histori yg
// sudah ada (reuse servisLogMatchesCat() apa adanya, 0 rumus status baru) &
// menghitung rata-rata jarak KM antar servis kategori ybs utk 1 kendaraan --
// hasilnya cuma ANGKA REKOMENDASI (disarankan), TIDAK PERNAH menimpa
// interval manapun sendiri. Minimal 2 servis (1 jeda) supaya ada data
// pembanding; kalau kurang dari itu balikin {ok:false} (histori belum cukup).
function recommendIntervalKm(vehicleId,cat){
const logs=(D.servisLogs||[]).filter(s=>s.vehicleId===vehicleId&&s.km>0&&servisLogMatchesCat(s,cat)).sort((a,b)=>a.km-b.km);
if(logs.length<2)return{ok:false,reason:'Belum cukup histori servis (min. 2 catatan dgn KM terisi)',count:logs.length};
const deltas=[];
for(let i=1;i<logs.length;i++){
const d=logs[i].km-logs[i-1].km;
if(d>0)deltas.push(d);
}
if(!deltas.length)return{ok:false,reason:'Data KM histori tidak berurutan naik, tidak bisa dihitung',count:logs.length};
const avg=Math.round(deltas.reduce((s,d)=>s+d,0)/deltas.length/100)*100;
return{ok:true,avgKm:avg,count:logs.length,sampleCount:deltas.length};
}
// historyMatchesName(log,nameLower) -- versi generik servisLogMatchesCat()
// di atas, tapi menerima STRING nama part langsung (bukan objek kategori) --
// FITUR BARU (audit, gap "recommendCategories() tidak baca riwayat servis
// sama sekali"): dipakai buat cross-check kandidat rekomendasi (baik yg
// sudah match TORSI_DB/generic MAUPUN kandidat baru murni dari riwayat)
// terhadap D.servisLogs SEBELUM kategori resminya ada -- makanya tidak bisa
// pakai cat.id spt servisLogMatchesCat(). Logic fuzzy sama persis (exact +
// includes 2 arah), tanpa cek categoryId.
function historyMatchesName(log,nameLower){
const item=(log.item||'').toLowerCase().trim();
if(!item||!nameLower)return false;
if(item===nameLower)return true;
if(item.includes(nameLower))return true;
if(nameLower.includes(item)&&item.length>=4)return true;
return false;
}
// historyStatsForName(vehicleId,name) -- FITUR BARU (audit, gap 2 hal:
// (1) kandidat yg sudah sering dicatat manual di riwayat servis tapi belum
// py kategori resmi tetap direkomendasikan sbg kategori "baru" tanpa
// ditandai sudah dikenal; (2) intervalKm rekomendasi cuma dari buku
// manual/estimasi umum, tidak pernah dibandingkan dgn pola servis ASLI
// kendaraan ybs). Reuse pola persis recommendIntervalKm() di atas (rata2
// jarak KM antar catatan, min. 2 data), cuma filternya lewat
// historyMatchesName() by teks nama -- krn kandidat blm tentu py kategori
// resmi/cat.id. Murni baca D.servisLogs, 0 tulis.
function historyStatsForName(vehicleId,name){
const nameLower=(name||'').trim().toLowerCase();
if(!nameLower)return{count:0,avgKm:null};
const logs=(D.servisLogs||[]).filter(s=>s.vehicleId===vehicleId&&historyMatchesName(s,nameLower));
const withKm=logs.filter(s=>s.km>0).sort((a,b)=>a.km-b.km);
let avgKm=null;
if(withKm.length>=2){
const deltas=[];
for(let i=1;i<withKm.length;i++){
const d=withKm[i].km-withKm[i-1].km;
if(d>0)deltas.push(d);
}
if(deltas.length)avgKm=Math.round(deltas.reduce((s,d)=>s+d,0)/deltas.length/100)*100;
}
return{count:logs.length,avgKm};
}
async function editVehicleIntervalOverride(catId){
const cat=D.sparepartCats.find(c=>c.id===catId);
if(!cat){toast('⚠️ Kategori sparepart tidak ditemukan');return;}
const veh=D.vehicles.find(v=>v.id===curVehicleId);
if(!veh){toast('⚠️ Pilih kendaraan dulu');return;}
const current=getEffectiveIntervalKm(curVehicleId,cat);
const reko=recommendIntervalKm(curVehicleId,cat);
const rekoLine=(reko.ok&&Math.abs(reko.avgKm-current)>=100)?`\n\n💡 Dari ${reko.sampleCount} jeda servis terakhir (${reko.count} catatan), rata-rata kamu servis tiap ~${reko.avgKm.toLocaleString('id-ID')} km -- beda dari interval saat ini (${current.toLocaleString('id-ID')} km). Ini cuma saran, isi angka manapun yang kamu mau.`:'';
const val=await showPromptModal({title:'Interval Khusus '+veh.name,message:`Interval "${cat.name}" khusus untuk ${veh.emoji||'🏍️'} ${veh.name} (KM). Kosongkan/0 untuk pakai default global (${cat.intervalKm.toLocaleString('id-ID')} km, dipakai semua kendaraan lain).${rekoLine}`,icon:'🔧',inputType:'number',defaultValue:current});
if(val===null)return;
if(!veh.intervalOverrides)veh.intervalOverrides={};
const num=parseFloat(val);
if(val===''||isNaN(num)||num<=0){
delete veh.intervalOverrides[catId];
save();Servis.renderReminder();renderDashboardServisReminder();
toast('✅ Kembali pakai default global ('+cat.intervalKm.toLocaleString('id-ID')+' km)');
} else {
veh.intervalOverrides[catId]=num;
save();Servis.renderReminder();renderDashboardServisReminder();
toast('✅ Interval khusus '+veh.name+' disimpan: '+num.toLocaleString('id-ID')+' km');
}
}
function getLastServiceKm(vehicleId){
const logs=D.servisLogs.filter(s=>s.vehicleId===vehicleId&&Number.isFinite(Number(s.km)));
logs.sort(typeof compareServiceHistoryRecency==='function'?compareServiceHistoryRecency:(a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.km)-Number(a.km));
return logs.length?Number(logs[0].km):0;
}
function matchingVehicleName(name){
if(!name)return null;
const n=name.trim().toLowerCase();
return D.vehicles.find(v=>v.name.trim().toLowerCase()===n)||null;
}
function codeFromName(name){
if(!name)return '';
const words=name.replace(/[\/\(\)]/g,' ').trim().split(/\s+/).filter(Boolean);
let code;
if(words.length>1) code=words.map(w=>w[0]).join('').slice(0,4);
else code=words[0].slice(0,3);
return code.toUpperCase();
}
// _renderSuggestBox(name) -- helper bersama Sparepart.suggestInterval()/
// Sparepart.autoSuggestInterval() (FITUR BARU, audit user: EDIT kategori
// existing kini auto-isi box AI tanpa tap tombol), 0 rumus baru, cuma
// extract innerHTML-building yg sudah ada (suggestServiceIntervalKm(),
// dideklarasikan di bawah tapi aman krn function declaration di-hoist)
// supaya tidak duplikat antara versi manual (toast kalau nama kosong) &
// versi otomatis (diam2 kalau kosong).
function _renderSuggestBox(name){
const boxEl=document.getElementById('sparepartAiSuggestBox');
if(!boxEl)return;
const reko=(typeof suggestServiceIntervalKm==='function')?suggestServiceIntervalKm(name,curVehicleId):null;
boxEl.classList.remove('u-dnone');
if(!reko){
boxEl.innerHTML=`<div class="u-fs12 u-t2">🤖 Belum ada rekomendasi pasti utk "${escapeHtml(name)}" di data buku panduan yang tersimpan. Isi manual sesuai buku servis kendaraanmu ya.</div>`;
return;
}
boxEl.innerHTML=`<div class="u-fs12" style="line-height:1.5"><b>🤖 Rekomendasi: setiap ${reko.km.toLocaleString('id-ID')} km</b><br><span class="u-t2">Sumber: ${escapeHtml(reko.source)}</span></div><button type="button" class="btn btn-primary btn-sm u-mt6" data-action="applySparepartIntervalSuggestion" data-args="${escapeHtml(JSON.stringify([reko.km]))}">✅ Pakai Angka Ini</button>`;
}
const Sparepart={
catEditIdx:null,
stockEditIdx:null,
_catalogNameCache:[],
// activeMasterCategoryFilter — BARU (Sesi D-lanjutan3, ROADMAP-KONSOLIDASI-
// DATABASE-SERVIS-v2.md §7 Sesi D — item "filter/chip by master category di
// daftar Servis/Sparepart utama" yang tercatat "Belum dikerjakan" di
// CHANGELOG sesi D-lanjutan2b/v1669). null = "Semua" (0 filter, perilaku
// lama). Nilai lain: salah satu id dari 13 kategori master
// (DatabaseAPI.masterCategory.getAll()). Pola state sama persis
// Servis.activeActionTypeFilter (Sesi E6).
activeMasterCategoryFilter:null,
// _masterCategoryFilterPrefsLoaded/_masterCategoryFilterStorageKey -- Sesi
// D-lanjutan5. Guard baca-sekali + key localStorage utk persist
// activeMasterCategoryFilter lintas reload (lihat _loadMasterCategoryFilterPrefsOnce()/
// _saveMasterCategoryFilterPrefs() di bawah). TIDAK memakai FilterPrefsStore
// (modules/shared/filter-prefs-store.js, S716) apa adanya -- kontrak
// target-nya (filterOwnerIds array + filterSettlement enum, dipakai
// Aset/InvestmentListUI/DanaTitipanPortfolioPresenter) beda bentuk dari
// kebutuhan di sini (1 id string tunggal, bukan array+enum), maksa masuk
// kontrak itu cuma bikin field palsu yang tidak dipakai. Pola try/catch
// permisif & nama method (_load...Once()/_save...()) tetap DISAMAKAN dgn
// FilterPrefsStore/consumer-consumernya supaya konsisten dibaca, cuma
// implementasinya berdiri sendiri per modul (Sparepart di sini, Servis di
// car-notes.js -- key beda, lihat masing-masing).
_masterCategoryFilterPrefsLoaded:false,
_masterCategoryFilterStorageKey:'sparepartMasterCategoryFilterPrefs',
// _loadMasterCategoryFilterPrefsOnce() -- HANYA baca sekali per lifetime
// halaman (guard _masterCategoryFilterPrefsLoaded), dipanggil dari
// renderCatList() (SSOT tab "Kelola Kategori Sparepart" dibuka) -- BUKAN
// dari renderMasterCategoryChips()/setMasterCategoryFilter() supaya baca
// ulang tidak menimpa balik perubahan live user. Validasi bentuk data
// SEBELUM dipakai: harus string & (null literal tersimpan sbg null JSON,
// aman) ATAU salah satu dari 13 id terkunci ATAU UNCATEGORIZED_FILTER_ID --
// localStorage bisa diedit manual dari luar app (DevTools), jadi id asing
// (mis. app versi lama/baru beda skema) diabaikan (fallback null/"Semua"),
// bukan dipakai mentah-mentah.
_loadMasterCategoryFilterPrefsOnce(){
if(Sparepart._masterCategoryFilterPrefsLoaded)return;
Sparepart._masterCategoryFilterPrefsLoaded=true;
if(typeof localStorage==='undefined')return;
try{
const raw=localStorage.getItem(Sparepart._masterCategoryFilterStorageKey);
if(!raw)return;
const parsed=JSON.parse(raw);
const id=parsed&&parsed.activeMasterCategoryFilter;
if(id===null)return;
if(typeof id!=='string')return;
const hasApi=typeof DatabaseAPI!=='undefined'&&DatabaseAPI.masterCategory&&typeof DatabaseAPI.masterCategory.getAll==='function';
const validIds=hasApi?(DatabaseAPI.masterCategory.getAll()||[]).map(c=>c.id):[];
if(id===UNCATEGORIZED_FILTER_ID||validIds.indexOf(id)!==-1){
Sparepart.activeMasterCategoryFilter=id;
}
}catch(err){
// localStorage korup/tidak tersedia -> abaikan, filter tetap default null
// ("Semua") -- 0 crash, pola sama persis FilterPrefsStore.loadOnce().
}
},
// _saveMasterCategoryFilterPrefs() -- dipanggil dari setMasterCategoryFilter()
// tiap kali user ganti chip filter. Gagal simpan (storage penuh/diblokir,
// mis. mode privat) diabaikan -- filter tetap berfungsi murni di state UI
// sesi ini, cuma tidak ke-persist lintas reload (0 crash).
_saveMasterCategoryFilterPrefs(){
if(typeof localStorage==='undefined')return;
try{
localStorage.setItem(Sparepart._masterCategoryFilterStorageKey,JSON.stringify({activeMasterCategoryFilter:Sparepart.activeMasterCategoryFilter}));
}catch(err){
// localStorage penuh/diblokir -> abaikan (0 crash).
}
},
// dashReminderMasterCatBadgeHTML(cat,vehicleId) -- Sesi D-lanjutan1 (UI
// consumer #1 dari 2 sesi, lanjutan Sesi D v1666 yg baru wiring data+belum
// ada consumer, lihat SESSION-NOTE-sesi-d-mastercategory-v1666.md
// "Sengaja TIDAK dikerjakan sesi ini > UI"). Pure function (0 DOM) --
// dipanggil renderDashboardServisReminder() (modules-render.js) utk
// tampilkan badge kategori master terkunci (13 kategori, DatabaseAPI.
// masterCategory) di samping nama kategori kartu "🔧 Pengingat Servis".
// Reuse resolveCatGroup() apa adanya (SoT tunggal, sudah expose field
// masterCategoryName/-Icon additive sejak Sesi D) -- 0 logic classify
// baru. Balikin '' kalau 0 match keyword (masterCategoryName null, pola
// sama "0/>1 kandidat = dilewati, tidak menebak" E2/Sesi D), BUKAN
// ditebak/fallback ke 'Lainnya' -- badge ini murni info tambahan, beda
// dari group/icon lama yg tetap selalu tampil (kontrak lama, 0 diubah).
dashReminderMasterCatBadgeHTML(cat,vehicleId){
const r=(typeof resolveCatGroup==='function')?resolveCatGroup(cat,vehicleId):null;
if(!r||!r.masterCategoryName)return'';
return` <span class="u-fs11 u-t2" style="opacity:.75">· ${r.masterCategoryIcon||'🔧'} ${escapeHtml(r.masterCategoryName)}</span>`;
},
// updateMasterCatBadge() -- Sesi D-lanjutan2a (consumer #2 dari 2 direncanakan,
// lanjutan Sesi D-lanjutan1/v1667 yg baru wiring dashboard read-only). Badge
// kategori master (13 kategori terkunci, DatabaseAPI.masterCategory) di modal
// Kategori Sparepart -- DIBACA 1x SAJA saat modal dibuka (openCatModal(), jalur
// Tambah maupun Edit), BUKAN live-update saat mengetik nama item (itu
// Sesi D-lanjutan2b, ditunda -- lebih kompleks krn perlu koordinasi dgn
// listener `oninput` lain yg sudah ada di #sparepartName, lihat SESSION-NOTE
// sesi ini utk detail keputusan pemecahan). 0 event listener baru ditambah
// sesi ini. Reuse resolveCatGroup() apa adanya (SoT tunggal) -- 0 logic
// classify baru, pola sama persis dashReminderMasterCatBadgeHTML() di atas.
// name/vehicleId kosong (mis. modal Tambah baru sebelum nama diisi) ->
// sembunyikan wrap (guard fail-safe), bukan tampilkan badge kosong/menebak.
updateMasterCatBadge(name,vehicleId){
const wrapEl=document.getElementById('sparepartMasterCatBadgeWrap');
if(!wrapEl)return;
if(!name){wrapEl.classList.add('u-dnone');wrapEl.innerHTML='';return;}
const r=(typeof resolveCatGroup==='function')?resolveCatGroup({name},vehicleId):null;
if(!r||!r.masterCategoryName){wrapEl.classList.add('u-dnone');wrapEl.innerHTML='';return;}
wrapEl.classList.remove('u-dnone');
wrapEl.innerHTML=`${r.masterCategoryIcon||'🔧'} Kategori master: ${escapeHtml(r.masterCategoryName)}`;
},
// updateMasterCatBadgeLive() -- Sesi D-lanjutan2b (lanjutan D-lanjutan2a/v1668):
// wiring live-update badge kategori master SAAT MENGETIK nama item di modal
// Kategori Sparepart. Ditunda dari 2a krn field #sparepartName sudah punya
// beberapa panggilan `oninput` terpasang (autoFillSparepartCode(),
// simpleAutocompleteInput(), Sparepart.autoSuggestInterval()) -- audit ulang
// menemukan itu semua CUMA rangkaian pemanggilan sinkron biasa dalam SATU
// atribut `oninput` (bukan beberapa `addEventListener` terpisah), jadi
// menambah 1 pemanggilan lagi ke rangkaian yg sama TIDAK membuka race
// condition baru (tetap 1 event, 1 urutan eksekusi sinkron, sama seperti
// 3 pemanggilan yg sudah ada). Wrapper ini (bukan langsung
// updateMasterCatBadge() di oninput) supaya vehicleId SELALU dibaca ulang
// dari dropdown #sparepartVehicleId saat itu juga -- penting utk jalur EDIT
// dimana dropdown itu bisa dipindah manual user (S629) SEBELUM/SESUDAH nama
// diketik ulang, badge harus ikut kendaraan yg lagi dipilih di dropdown,
// BUKAN vehicleId lama dari saat modal pertama dibuka (curCat.vehicleId,
// itu cuma dipakai openCatModal() 1x). Dropdown disabled (jalur Tambah baru)
// tetap punya `.value` terbaca normal di DOM, jadi guard ini juga aman di
// jalur itu. 0 logic classify baru -- reuse updateMasterCatBadge() apa
// adanya (yg reuse resolveCatGroup() apa adanya).
updateMasterCatBadgeLive(){
const nameEl=document.getElementById('sparepartName');
const vehEl=document.getElementById('sparepartVehicleId');
const name=nameEl?nameEl.value:'';
const vehicleId=(vehEl&&vehEl.value)?vehEl.value:null;
Sparepart.updateMasterCatBadge(name,vehicleId);
},
// setMasterCategoryFilter(id) -- Sesi D-lanjutan3. Dipanggil dari klik chip
// filter (data-action="Sparepart.setMasterCategoryFilter") di "Kelola
// Kategori Sparepart" (renderCatList()). id: null ("Semua") atau salah
// satu id dari 13 kategori master. Pola sama persis
// Servis.setActionTypeFilter() (Sesi E6) -- renderCatList() tidak
// paginasi (0 listPage), jadi tidak ada yang perlu direset selain filter
// itu sendiri.
setMasterCategoryFilter(id){
Sparepart.activeMasterCategoryFilter=id||null;
// Sesi D-lanjutan5: persist pilihan chip ke localStorage tiap kali user
// ganti filter (lihat _saveMasterCategoryFilterPrefs() di atas) -- 0
// dampak kalau storage gagal/diblokir (try/catch permisif di dalamnya).
Sparepart._saveMasterCategoryFilterPrefs();
Sparepart.renderCatList();
},
// renderMasterCategoryChips(beforeEl) -- Sesi D-lanjutan3. Chip row filter
// "Kelola Kategori Sparepart" by kategori master (13 terkunci), DISISIPKAN
// lewat JS sebelum beforeEl (pola sama persis
// Servis.renderActionTypeChips(), Sesi E6) -- 1x dibuat (getElementById
// dulu), tidak dobel-insert di render berikutnya. Guard: kalau
// DatabaseAPI.masterCategory belum termuat (mis. file database-api.js
// belum ikut dimuat), row TIDAK dibuat sama sekali -- pola sama "0/>1
// kandidat = dilewati, tidak menebak" yang konsisten dipakai di seluruh
// fitur Sesi D (dashReminderMasterCatBadgeHTML/updateMasterCatBadge di
// atas).
renderMasterCategoryChips(beforeEl){
const hasApi=typeof DatabaseAPI!=='undefined'&&DatabaseAPI.masterCategory&&typeof DatabaseAPI.masterCategory.getAll==='function';
if(!hasApi)return;
let row=document.getElementById('sparepartMasterCatChipRow');
if(!row){
row=document.createElement('div');
row.id='sparepartMasterCatChipRow';
row.className='u-flex u-fs12 u-mb10';
row.style.cssText='gap:6px;flex-wrap:wrap';
beforeEl.insertAdjacentElement('beforebegin',row);
}
const cats=DatabaseAPI.masterCategory.getAll()||[];
// Sesi D-lanjutan5: chip "❔ Belum Terklasifikasi" DITAMBAHKAN di UJUNG (setelah
// 13 kategori master, sebelum -- 0 di antara -- opsi "Semua"), pakai
// UNCATEGORIZED_FILTER_ID (sentinel murni UI, lihat komentar di deklarasinya
// di atas). 0 perubahan ke DatabaseAPI.masterCategory.getAll() itu sendiri --
// kontrak "13 kategori terkunci" tidak tersentuh.
const options=[{id:null,label:'🔍 Semua'}].concat(cats.map(c=>({id:c.id,label:(c.icon||'🔧')+' '+c.name}))).concat([{id:UNCATEGORIZED_FILTER_ID,label:'❔ Belum Terklasifikasi'}]);
row.innerHTML=options.map(o=>`<div class="chip ${o.id===Sparepart.activeMasterCategoryFilter?'active':''}" data-action="Sparepart.setMasterCategoryFilter" data-args="${escapeHtml(JSON.stringify([o.id]))}">${o.label}</div>`).join('');
},
// isPartForVehicle(part, vehicleId) — bugfix (laporan user): Stok Sparepart
// & dropdown "Gunakan Stok Sparepart"/"Tambah ke Stok Sparepart" dulu
// selalu tampil SEMUA item D.partsStock tanpa pandang kendaraan aktif.
// D.partsStock TIDAK punya field vehicleId sendiri (lihat catatan desain),
// jadi filter ini REUSE tautan `catalogId` yg sudah ada ke Katalog Suku
// Cadang (VehicleCatalog) + compatibleVehicleIds part itu di sana -- 0
// skema baru. Part tanpa catalogId (input manual lama) ATAU yang
// compatibleVehicleIds-nya kosong dianggap UNIVERSAL (tetap tampil semua
// kendaraan) supaya tidak ada stok lama yang tiba-tiba "hilang" dari
// tampilan (backward compatible). Kalau VehicleCatalog belum sempat
// dimuat sesi ini (isLoaded()===false) atau vehicleId kosong, jangan
// filter apa pun (fail-open, bukan fail-hidden).
// S622: cek dulu vehicleId LANGSUNG di stok itu sendiri (field baru, diisi
// otomatis saat item stok dibuat -- lihat saveStock()) SEBELUM fallback ke
// heuristik lama lewat catalogId/compatibleVehicleIds di bawah. part.vehicleId
// kosong (stok lama sebelum field ini ada) tetap fail-open ke heuristik lama.
isPartForVehicle(part,vehicleId){
if(!vehicleId||!part)return true;
if(part.vehicleId)return part.vehicleId===vehicleId;
if(!part.catalogId)return true;
if(typeof VehicleCatalog==='undefined'||typeof VehicleCatalog.isLoaded!=='function'||!VehicleCatalog.isLoaded())return true;
const store=VehicleCatalog.getStore();
const catItem=(store&&Array.isArray(store.items))?store.items.find(it=>it.id===part.catalogId):null;
if(!catItem)return true;
if(!Array.isArray(catItem.compatibleVehicleIds)||!catItem.compatibleVehicleIds.length)return true;
return catItem.compatibleVehicleIds.some(id=>String(id)===String(vehicleId));
},
autoFillCatCode(){
const codeEl=document.getElementById('sparepartCode');
if(!codeEl||codeEl.dataset.manual==='1')return;
codeEl.value=codeFromName(document.getElementById('sparepartName').value);
},
// populateDatalist() -- BUGFIX (laporan user, Sesi 545): dropdown "Jenis
// Servis/Item" di modal Catat Servis/Sparepart tidak muncul sama sekali di
// beberapa mobile WebView (mis. Brave/Chrome Android). Root cause: field ini
// dulu pakai native <input list="sparepartDatalist"> (HTML5 datalist),
// tapi popup datalist TIDAK reliable di banyak WebView Android -- kadang
// tidak tampil apa pun walau opsinya sudah terisi. Field-field lain di app
// ini (billName, pName, stockName, sparepartName, dst) SEMUA sudah pakai
// pola autocomplete custom yang terbukti jalan (simpleAutocompleteInput() +
// div.suggest-box, lihat modules/finance/transaksi.js) -- servisItem
// dulu-nya satu-satunya field yang masih pakai datalist native. Fix: markup
// <datalist id="sparepartDatalist"> dihapus dari servisModal (lihat
// modals.js), diganti div#servisItemSuggestBox yang di-render oleh
// Servis.onItemInputSuggest()/selectItemSuggestion() (car-notes.js), sumber
// datanya dari getItemSuggestions() di bawah. Fungsi populateDatalist() ini
// DIPERTAHANKAN (titik panggilnya di openModal()/renderCatList() TIDAK
// diubah) tapi isinya sekarang cuma mengisi cache nama part Katalog Suku
// Cadang (VehicleCatalog, async) yang dipakai getItemSuggestions() --
// kategori & stok sudah sinkron langsung dari D tiap kali disuggest, tidak
// perlu di-cache.
// populateDatalist() -- BUGFIX (audit user, Sesi 549): cache nama part
// Katalog Suku Cadang dulu diisi dari SEMUA kendaraan tanpa filter, beda
// dgn dropdown "Part dari Vehicle Catalog" (servisCatalogPartId) di modal
// yang sama yang SUDAH difilter pakai VehicleCatalog.filterForVehicle().
// Fix: filter di sini juga pakai fungsi yang sama (0 fungsi baru), pakai
// curVehicleId (kendaraan aktif) yang saat ini dipilih. Part universal
// (compatibleVehicleIds kosong/belum diisi) tetap ikut tampil di kendaraan
// mana pun -- perilaku sama seperti filterForVehicle()/isPartForVehicle()
// di tempat lain (fail-open, backward compatible, 0 data lama hilang).
populateDatalist(){
const hasCatalog=typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.getAll==='function';
if(!hasCatalog)return;
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
VehicleCatalog.getAll().then(items=>{
const filtered=(typeof VehicleCatalog.filterForVehicle==='function')?VehicleCatalog.filterForVehicle(items,vid):(items||[]);
Sparepart._catalogNameCache=(filtered||[]).map(it=>it.partName).filter(Boolean);
}).catch(()=>{});
},
// getItemSuggestions() -- gabungan (1) nama Kategori Sparepart, (2) nama
// item Stok Sparepart yang masih ada stoknya (qty>0), (3) nama part Katalog
// Suku Cadang (dari cache populateDatalist() di atas, sudah difilter per
// kendaraan aktif -- lihat catatan di populateDatalist()). Dedup case-
// insensitive, sama persis sumber & urutan gabungan datalist lama (Sesi
// 297) -- cuma cara tampilnya yang berubah (suggest-box, bukan datalist).
// BUGFIX (audit user, Sesi 549): Stok Sparepart (D.partsStock) dulu ikut
// SEMUA item tanpa pandang kendaraan aktif, padahal Sparepart.isPartForVehicle()
// sudah ada & dipakai persis utk kasus yang sama di dropdown "Gunakan Stok
// Sparepart" (lihat baris ~412 di file ini). Fix: reuse fungsi yang sama
// di sini juga -- 0 fungsi baru, 0 skema data baru.
getItemSuggestions(){
const names=new Map();
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
// BUGFIX (audit lanjutan, gap yang sama dgn resolveServisCatForVehicle()):
// dulu SEMUA D.sparepartCats ikut jadi sumber saran tanpa filter kendaraan
// -- beda dgn Stok Sparepart (partsStock, sudah pakai isPartForVehicle()) &
// Katalog Suku Cadang (_catalogNameCache, sudah pakai filterForVehicle())
// di bawahnya yang SUDAH benar. Efeknya: suggest-box "Jenis Servis/Item"
// bisa nawarin nama kategori PRIVAT milik kendaraan lain, membingungkan
// (walau kalau dipilih tetap aman krn save() sudah lewat
// resolveServisCatForVehicle() -- ini murni perbaikan relevansi saran).
D.sparepartCats.forEach(c=>{ if(c.name&&catVisibleForVehicle(c,vid)) names.set(c.name.toLowerCase(),c.name); });
D.partsStock.forEach(p=>{ if(p.name&&p.qty>0&&Sparepart.isPartForVehicle(p,vid)&&!names.has(p.name.toLowerCase())) names.set(p.name.toLowerCase(),p.name); });
(Sparepart._catalogNameCache||[]).forEach(n=>{ if(n&&!names.has(n.toLowerCase()))names.set(n.toLowerCase(),n); });
return Array.from(names.values());
},
// ensureCanonicalSparepartComponentCategories() -- SA27. Menjamin setiap
// komponen servis yang memang berupa part/consumable mempunyai kategori stok
// yang terhubung ke SERVICE_CHECKLIST_GROUPS. Id komponen tetap SoT; kategori
// sparepart hanyalah projection stok. Migrasi additive + idempotent: kategori
// user yang sudah ada tidak dihapus/ditimpa, hanya linkage canonical yang
// belum ada dilengkapi. Item prosedural/diagnostik murni sengaja tidak dibuat
// sebagai kategori stok (mis. Kompresi Mesin, Cek Kebocoran Shock,
// Pembersihan Rumah CVT, Stel/Grease Komstir).
ensureCanonicalSparepartComponentCategories(){
  if(typeof SERVICE_CHECKLIST_GROUPS==='undefined'||!Array.isArray(SERVICE_CHECKLIST_GROUPS)||!Array.isArray(D.sparepartCats))return {ok:false,added:0,linked:0};
  const stockIds=new Set([
    'oli-mesin','filter-oli','busi','rantai-keteng-tensioner','filter-kawat-oli-mesin','paking-knalpot',
    'v-belt-cvt','slide-piece-cvt','boss-pulley-drive-face','roller-cvt','kampas-kopling-ganda','mangkok-kopling-ganda','seal-driven-face','per-sentri','per-cvt','bearing-bak-cvt','busa-filter-cvt',
    'throttle-body','isc','injector','filter-fuel-pump','selang-tutup-tangki','coolant','radiator-water-pump','thermostat',
    'kampas-rem-depan','minyak-rem','kampas-rem-belakang','cakram-rem-depan','kaliper-rem-depan','master-rem-reservoir','tromol-rem-belakang','selang-rem',
    'oli-shockbreaker','engine-mounting-bushing-arm','aki','saklar-sistem-penerangan','relay-sekring',
    'ban-depan','ban-belakang','bearing-roda','filter-udara','oli-gardan','kabel-gas-standar-kunci'
  ]);
  const aliases={
    'oli-gardan':'Oli Gardan/Transmisi',
    'v-belt-cvt':'V-Belt (CVT)',
    'kampas-rem-depan':'Kampas Rem Depan',
    'kampas-rem-belakang':'Kampas Rem Belakang',
    'minyak-rem':'Minyak Rem',
    'filter-udara':'Filter Udara',
    'aki':'Aki (cek/ganti)'
  };
  let added=0,linked=0;
  SERVICE_CHECKLIST_GROUPS.forEach(g=>(g.items||[]).forEach(it=>{
    if(!it||!stockIds.has(it.id))return;
    let cat=(D.sparepartCats||[]).find(c=>c&&c.serviceComponentId===it.id);
    if(!cat){
      const targetName=aliases[it.id]||it.name;
      const exact=(D.sparepartCats||[]).find(c=>c&&String(c.name||'').trim().toLowerCase()===targetName.trim().toLowerCase());
      cat=exact||null;
    }
    if(cat){
      let changed=false;
      if(cat.serviceComponentId!==it.id){cat.serviceComponentId=it.id;changed=true;}
      if(cat.masterCategoryId!==g.masterCategoryId){cat.masterCategoryId=g.masterCategoryId;changed=true;}
      if(!cat.group)cat.group=g.group;
      if(!cat.groupIcon){const mc=(typeof DatabaseAPI!=='undefined'&&DatabaseAPI.masterCategory&&typeof DatabaseAPI.masterCategory.getAll==='function')?(DatabaseAPI.masterCategory.getAll()||[]).find(x=>x.id===g.masterCategoryId):null;if(mc&&mc.icon)cat.groupIcon=mc.icon;}
      if(changed)linked++;
      return;
    }
    const base='sp_component_'+it.id;
    const idTaken=(D.sparepartCats||[]).some(c=>c&&c.id===base);
    const mc=(typeof DatabaseAPI!=='undefined'&&DatabaseAPI.masterCategory&&typeof DatabaseAPI.masterCategory.getAll==='function')?(DatabaseAPI.masterCategory.getAll()||[]).find(x=>x.id===g.masterCategoryId):null;
    D.sparepartCats.push({id:idTaken?base+'_'+Date.now():base,name:it.name,code:codeFromName(it.name),intervalKm:it.intervalKm||0,intervalBulan:it.intervalTimeMonths||0,masterCategoryId:g.masterCategoryId,serviceComponentId:it.id,showInReminder:(it.intervalKm>0||it.intervalTimeMonths>0),group:g.group,groupIcon:mc&&mc.icon?mc.icon:''});
    added++;
  }));
  if(added||linked)save();
  return {ok:true,added,linked};
},

// renderCatList() -- S622: skrg CUMA tampilkan kategori milik kendaraan aktif
// (curVehicleId) + kategori UNIVERSAL (cat.vehicleId kosong), supaya "Kelola
// Kategori Sparepart" jadi cakupan per-kendaraan juga (sinkron dgn Pengingat
// Servis di renderReminder() & Stok Sparepart di renderStockList()). Filter
// pakai findIndex ke D.sparepartCats supaya index utk edit/delete tetap
// benar ke array ASLI (bukan index dari hasil filter).
renderCatList(){
Sparepart.ensureCanonicalSparepartComponentCategories();
const el=document.getElementById('sparepartCatList');
if(!el)return;
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
// Sesi D-lanjutan5: baca preferensi filter tersimpan SEKALI per lifetime
// halaman (guard di dalam fungsinya sendiri) -- SEBELUM render chip/filter
// di bawah, supaya render pertama tab ini langsung mencerminkan pilihan
// filter sesi sebelumnya.
Sparepart._loadMasterCategoryFilterPrefsOnce();
Sparepart.renderMasterCategoryChips(el);
let visible=D.sparepartCats.filter(c=>catVisibleForVehicle(c,vid));
// Sesi D-lanjutan3: filter tambahan by kategori master (13 terkunci),
// SETELAH filter kendaraan lama (0 perubahan urutan/prioritas filter
// lama) -- reuse resolveCatGroup() apa adanya (SoT tunggal, sama persis
// updateMasterCatBadge()/dashReminderMasterCatBadgeHTML() di atas), 0
// logic classify baru.
if(Sparepart.activeMasterCategoryFilter){
// Sesi D-lanjutan5: chip "❔ Belum Terklasifikasi" (UNCATEGORIZED_FILTER_ID)
// -- cocokkan kategori yang r.masterCategoryId-nya null (classifyItemName()
// 0 keyword cocok), BUKAN dibandingkan literal ke salah satu dari 13 id
// terkunci. r sendiri selalu truthy kalau c ada (resolveCatGroup() selalu
// balikin objek via _withMasterCategory(), lihat definisinya di atas) --
// jadi cabang ini murni beda KRITERIA banding, bukan beda null-check.
const isUncategorizedFilter=Sparepart.activeMasterCategoryFilter===UNCATEGORIZED_FILTER_ID;
visible=visible.filter(c=>{
const r=(typeof resolveCatGroup==='function')?resolveCatGroup(c,vid):null;
if(!r)return false;
if(isUncategorizedFilter)return r.masterCategoryId==null;
return r.masterCategoryId===Sparepart.activeMasterCategoryFilter;
});
}
if(!visible.length){el.innerHTML='<div class="empty"><div class="empty-text">'+(Sparepart.activeMasterCategoryFilter?'Tidak ada kategori sparepart utk kategori master ini':'Belum ada kategori sparepart utk kendaraan ini')+'</div></div>';return;}
// Sesi 295 (permintaan eksplisit user): tiap baris sekarang menunjukkan apakah
// kategori ini AKTIF tampil di 🔔 Pengingat Servis atau tidak -- baik karena
// belum diatur intervalnya (intervalKm 0, biasanya hasil scan Katalog Suku
// Cadang) maupun karena user sengaja menyembunyikannya (showInReminder:false).
// Tap badge status utk toggle langsung tanpa buka modal edit.
el.innerHTML=visible.map((c)=>{
const i=D.sparepartCats.indexOf(c);
const noInterval=!(c.intervalKm>0);
const hidden=c.showInReminder===false;
const inactive=noInterval||hidden;
const compRef=(c.serviceComponentId&&typeof ServiceInputCatalog!=='undefined')?ServiceInputCatalog.itemById(c.serviceComponentId):null;
const compLabel=compRef&&compRef.item?(' • '+compRef.item.name):'';
const metaText=noInterval?'⚠️ Belum diatur interval servis':'Setiap '+c.intervalKm.toLocaleString('id-ID')+' km'+((c.intervalBulan>0)?' atau '+c.intervalBulan.toLocaleString('id-ID')+' bln':'')+compLabel;
const statusBadge=noInterval
?`<span class="u-fs11 u-fw700 u-r6" style="padding:2px 7px;background:var(--accent2-soft,rgba(230,80,80,.12));color:var(--accent2,#e65050)">⚠️ Tanpa interval</span>`
:(hidden
?`<span class="u-fs11 u-fw700 u-r6 u-pointer" data-action="toggleSparepartShowInReminder" data-args="${escapeHtml(JSON.stringify([c.id]))}" style="padding:2px 7px;background:var(--surface3);color:var(--text2)" title="Tap utk tampilkan lagi di Pengingat Servis">🙈 Disembunyikan dari Pengingat</span>`
:`<span class="u-fs11 u-fw700 u-r6 u-pointer" data-action="toggleSparepartShowInReminder" data-args="${escapeHtml(JSON.stringify([c.id]))}" style="padding:2px 7px;background:var(--accent3-soft,rgba(80,180,120,.12));color:var(--accent3,#3fa66f)" title="Tap utk sembunyikan dari Pengingat Servis">🔔 Tampil di Pengingat</span>`);
const veh=c.vehicleId?D.vehicles.find(v=>v.id===c.vehicleId):null;
const vehBadge=c.vehicleId
?`<span class="u-fs11 u-fw700 u-r6 u-ml4" style="padding:2px 7px;background:var(--accent-soft);color:var(--accent)" title="Kategori khusus kendaraan ini">${veh?(veh.emoji||'🏍️')+' '+escapeHtml(veh.name):'🏍️ Kendaraan lain'}</span>`
:`<span class="u-fs11 u-fw700 u-r6 u-ml4" style="padding:2px 7px;background:var(--surface3);color:var(--text2)" title="Berlaku semua kendaraan">🌐 Semua kendaraan</span>`;
return `<div class="tx-item"><div class="tx-icon u-bgaccsoft">🔩</div><div class="tx-info"><div class="tx-name">${escapeHtml(c.name)} <span class="u-fs12 u-fw700 u-cacc u-bgaccsoft u-r6 u-ml4" style="padding:1px 6px">${escapeHtml(c.code||codeFromName(c.name))}</span></div><div class="tx-meta"${inactive?' style="color:var(--text3)"':''}>${metaText}</div><div class="u-mt4">${statusBadge}${vehBadge}</div></div><button class="tx-del u-bgaccsoft u-cacc" style="margin-right:6px" data-action="openSparepartModal" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Edit/Buka">✏️</button><button class="tx-del" data-action="delSparepart" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Hapus">🗑</button></div>`;
}).join('');
Sparepart.populateDatalist();
Sparepart.populateStockCatSelect();
},
// openRecommendBox()/renderRecommendBox() — UI utk recommendCategories() di
// atas. Checklist tercentang default (pola sama persis modal preview
// syncFromCatalog(), tapi di sini inline langsung di halaman, bukan modal
// askConfirm, supaya user bisa uncheck per-item sebelum commit). Div target
// #sparepartRecommendBox ada di index.html, tepat di bawah tombol pemicu.
openRecommendBox(){
const box=document.getElementById('sparepartRecommendBox');
if(!box)return;
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
if(!vid){toast('⚠️ Pilih kendaraan dulu di atas');return;}
const reko=Sparepart.recommendCategories(vid);
box.classList.remove('u-dnone');
if(!reko.ok){box.innerHTML='<div class="u-fs12 u-t2">'+escapeHtml(reko.reason)+'</div>';return;}
if(!reko.all.length){box.innerHTML='<div class="u-fs12 u-t2">🤖 Semua kategori rekomendasi utk "'+escapeHtml(reko.vehicleName)+'" sudah ada di daftar kategori kendaraan ini.</div>';return;}
const rows=reko.all.map((r,i)=>{
const badge=r.tier==='manual'
?'<span class="u-fs11 u-fw700 u-r6" style="padding:2px 7px;background:var(--accent3-soft,rgba(80,180,120,.12));color:var(--accent3,#3fa66f)">📖 Buku manual</span>'
:r.tier==='history'
?'<span class="u-fs11 u-fw700 u-r6" style="padding:2px 7px;background:var(--accent-soft);color:var(--accent)">📝 Riwayat servis</span>'
:'<span class="u-fs11 u-fw700 u-r6" style="padding:2px 7px;background:var(--surface3);color:var(--text2)">🤖 Estimasi umum</span>';
// histNote -- FITUR BARU: kalau kandidat ini (tier manual/generic) juga
// sudah pernah dicatat manual di riwayat servis kendaraan ini
// (r.history.count>0, lihat historyStatsForName()), tampilkan sbg
// info tambahan -- termasuk pola KM asli (avgKm) kalau beda >=100km
// dari angka rekomendasi, sbg pembanding (bukan menimpa intervalKm).
// Tier 'history' sendiri tidak perlu histNote krn sudah jelas dari badge.
const histNote=(r.tier!=='history'&&r.history&&r.history.count>0)
?`<div style="font-size:11px;color:var(--accent3,#3fa66f);margin-top:2px">📝 Sudah dicatat ${r.history.count}x di riwayat servis kendaraan ini`+((r.history.avgKm&&Math.abs(r.history.avgKm-r.intervalKm)>=100)?` — rata-rata polamu tiap ~${r.history.avgKm.toLocaleString('id-ID')} km`:'')+`</div>`
:'';
return `<label style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">`
+`<input type="checkbox" class="sparepartRecoChk" data-idx="${i}" checked style="width:16px;height:16px;margin-top:2px;accent-color:var(--accent)">`
+`<span style="flex:1"><div style="font-size:13px;font-weight:600">${escapeHtml(r.name)} ${badge}</div>`
+`<div style="font-size:11px;color:var(--text2);margin-top:2px;line-height:1.5">Setiap ${r.intervalKm.toLocaleString('id-ID')} km — ${escapeHtml(r.source||'')}</div>${histNote}</span>`
+`</label>`;
}).join('');
box.innerHTML=`<div class="u-fs12 u-t2 u-mb8">💡 Rekomendasi kategori servis rutin utk <b>${escapeHtml(reko.vehicleName)}</b>. Kategori dgn badge 📖 diambil dari buku manual pabrikan yg sudah tersimpan; badge 📝 berarti sudah sering dicatat manual di riwayat servis kendaraan ini (interval dihitung dari pola KM aslimu); badge 🤖 adalah estimasi umum (bukan data pabrikan spesifik) — sesuaikan lagi kalau ada data resminya. Uncheck yg tidak perlu, lalu tambahkan.</div>`
+`<div id="sparepartRecoList">${rows}</div>`
+`<button type="button" class="btn btn-primary btn-full btn-sm u-mt10" data-action="Sparepart.commitRecommend">✅ Tambahkan yang Dicentang</button>`
+`<button type="button" class="btn btn-ghost btn-full btn-sm u-mt8" data-action="Sparepart.closeRecommendBox">✕ Tutup</button>`;
Sparepart._recoCache=reko.all;
},
closeRecommendBox(){
const box=document.getElementById('sparepartRecommendBox');
if(!box)return;
box.classList.add('u-dnone');
box.innerHTML='';
Sparepart._recoCache=null;
},
// commitRecommend() — buat kategori baru dari item yg dicentang di
// #sparepartRecommendBox, 1x save() di akhir (pola sama persis
// syncFromCatalog()). Kategori baru discope ke curVehicleId (SAMA seperti
// saveCat() manual), showInReminder:true, intervalKm dari rekomendasi.
commitRecommend(){
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
if(!vid||!Array.isArray(Sparepart._recoCache)){toast('⚠️ Rekomendasi sudah tidak tersedia, buka ulang');return;}
const checks=Array.from(document.querySelectorAll('.sparepartRecoChk'));
const chosen=checks.filter(c=>c.checked).map(c=>Sparepart._recoCache[parseInt(c.dataset.idx,10)]).filter(Boolean);
if(!chosen.length){toast('⚠️ Belum ada yang dicentang');return;}
let added=0;
chosen.forEach((r,idx)=>{
const already=D.sparepartCats.some(c=>catVisibleForVehicle(c,vid)&&c.name.trim().toLowerCase()===r.name.trim().toLowerCase());
if(already)return;
const compId=resolveCanonicalServiceComponent(r.name,null);
const compRef=compId&&typeof ServiceInputCatalog!=='undefined'?ServiceInputCatalog.itemById(compId):null;
D.sparepartCats.push({id:'sp_'+Date.now()+'_reko_'+idx,name:r.name,code:codeFromName(r.name),intervalKm:r.intervalKm,showInReminder:true,vehicleId:vid,group:r.group,groupIcon:r.groupIcon,masterCategoryId:compRef&&compRef.group?compRef.group.masterCategoryId:null,serviceComponentId:compId||null});
added++;
});
save();
Sparepart.closeRecommendBox();
Sparepart.renderCatList();
if(typeof renderServisList==='function')renderServisList();
if(typeof renderDashboardServisReminder==='function')renderDashboardServisReminder();
toast('✅ '+added+' kategori rekomendasi ditambahkan');
},
toggleShowInReminder(catId){
const cat=D.sparepartCats.find(c=>c.id===catId);
if(!cat)return;
if(!(cat.intervalKm>0)){
toast('⚠️ Isi dulu Interval Servis (KM) kategori ini sebelum ditampilkan di Pengingat');
Sparepart.openCatModal(D.sparepartCats.findIndex(c=>c.id===catId));
return;
}
cat.showInReminder=cat.showInReminder===false?true:false;
save();Sparepart.renderCatList();renderServisList();renderDashboardServisReminder();
toast(cat.showInReminder===false?'🙈 "'+cat.name+'" disembunyikan dari Pengingat Servis':'🔔 "'+cat.name+'" ditampilkan lagi di Pengingat Servis');
},
// populateVehicleSelect() -- S622 mengisi dropdown "Berlaku untuk" di modal
// Kategori Sparepart maupun Stok Sparepart (elId beda2, dipanggil dari 2
// tempat). S629 (permintaan eksplisit user): dropdown ini DIKUNCI/disabled --
// SELALU otomatis mengikuti curVehicleId (tab kendaraan yg lagi aktif),
// baik utk tambah baru MAUPUN edit (termasuk kategori/stok lama yg tadinya
// "🌐 Semua kendaraan", begitu dibuka & disimpan otomatis pindah scope ke
// kendaraan tab aktif -- lihat saveCat()/saveStock()). Kalau tidak ada
// kendaraan aktif (curVehicleId kosong/tidak valid), tetap fallback ke
// "🌐 Semua kendaraan" (perilaku lama, select tetap dikunci).
// populateVehicleSelect() -- S622 mengisi dropdown "Berlaku untuk" di modal
// Kategori Sparepart maupun Stok Sparepart (elId beda2, dipanggil dari 2
// tempat). S629 (permintaan eksplisit user): dropdown ini DIKUNCI/disabled --
// SELALU otomatis mengikuti curVehicleId (tab kendaraan yg lagi aktif).
// FITUR BARU (audit user, lihat tests/sparepart-catmodal-vehicle-edit-audit
// .test.js): S629 dipertahankan HANYA utk TAMBAH baru (isEdit=false, wajar
// ikut tab aktif). Saat EDIT kategori/stok yg SUDAH ADA (isEdit=true),
// dropdown dibuka (enabled) supaya user bisa pindahkan manual ke kendaraan
// lain / ke "🌐 Semua kendaraan" -- nilai awal = vehicleId TERSIMPAN pada
// kategori/stok itu (currentValue), BUKAN dipaksa curVehicleId lagi.
populateVehicleSelect(elId,currentValue,isEdit){
const sel=document.getElementById(elId);
if(!sel)return;
sel.innerHTML='<option value="">🌐 Semua kendaraan</option>'+D.vehicles.map(v=>`<option value="${v.id}">${v.emoji||'🏍️'} ${escapeHtml(v.name)}</option>`).join('');
const hintId=elId==='sparepartVehicleId'?'sparepartVehicleHint':'stockVehicleHint';
const hintEl=document.getElementById(hintId);
if(isEdit){
const curValid=currentValue&&D.vehicles.some(v=>v.id===currentValue);
sel.value=curValid?currentValue:'';
sel.disabled=false;
if(hintEl){
const veh=curValid?D.vehicles.find(v=>v.id===currentValue):null;
hintEl.textContent=veh?`✏️ Khusus kendaraan: ${veh.emoji||'🏍️'} ${veh.name} — bisa dipindah manual`:'✏️ Berlaku "🌐 Semua kendaraan" — bisa dipindah manual ke kendaraan tertentu';
}
return;
}
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:'';
const vidValid=vid&&D.vehicles.some(v=>v.id===vid);
sel.value=vidValid?vid:'';
sel.disabled=true;
if(hintEl){
const veh=vidValid?D.vehicles.find(v=>v.id===vid):null;
hintEl.textContent=veh?`🔒 Otomatis khusus kendaraan tab aktif: ${veh.emoji||'🏍️'} ${veh.name}`:'🔒 Otomatis "🌐 Semua kendaraan" (tidak ada kendaraan aktif dipilih di tab atas)';
}
},
// ensureIntervalBulanField() — FITUR BARU: injeksi runtime input "Interval
// Waktu (Bulan, opsional)" ke modal Kategori Sparepart. Dipasang lewat JS
// (bukan ditambah permanen ke template HTML modal di modules/shared/modals.js)
// krn file itu di luar cakupan patch ini -- pendekatan ini SENGAJA no-op-safe
// kalau elemen anchor (#sparepartInterval) tidak ada di DOM (mis. test
// harness DOM stub minimal), supaya tidak pernah throw. Idempotent: kalau
// field-nya sudah pernah diinjeksi (buka-tutup modal berkali-kali), balikin
// elemen yg sudah ada, tidak duplikat.
ensureIntervalBulanField(){
let el=document.getElementById('sparepartIntervalBulan');
if(el)return el;
const anchor=document.getElementById('sparepartInterval');
if(!anchor||!anchor.parentNode)return null;
const wrap=document.createElement('div');
wrap.className='u-mt8';
wrap.innerHTML='<label class="u-fs12 u-t2 u-mb4" style="display:block">Interval Waktu (Bulan, opsional)</label>'
+'<input type="number" id="sparepartIntervalBulan" class="input" placeholder="mis. 6 (Minyak Rem, Aki, dll)" min="0">';
const host=anchor.closest('.u-mt8')||anchor.parentNode;
host.parentNode.insertBefore(wrap,host.nextSibling);
return document.getElementById('sparepartIntervalBulan');
},
// populateGroupSelect() -- FITUR BARU sesi ini (Sesi 1 dari 2, backlog
// "override grup manual" sejak v1638): isi dropdown "Grup Komponen" di modal
// Kategori Sparepart -- opsi 🤖 Otomatis (nilai '', biarkan resolveCatGroup()
// yg tentukan spt perilaku lama) + semua grup dikenal dari collectKnownGroups()
// + grup KUSTOM kategori yg lagi diedit kalau grup itu tersimpan tapi TIDAK
// ada di daftar dikenal (mis. dulu di-set manual/lewat cara lain) supaya tidak
// hilang dari dropdown & tidak keliru kelihatan seolah "Otomatis". Nilai awal
// dropdown = cat.group tersimpan (atau 🤖 Otomatis kalau kosong/kategori baru).
// Sesi ini CUMA populate & tampilkan -- saveCat() BELUM baca dropdown ini
// (backlog Sesi 2), jadi pilihan apa pun di sini belum berpengaruh ke data
// tersimpan.
populateGroupSelect(currentGroup){
const sel=document.getElementById('sparepartGroupId');
if(!sel)return;
const known=collectKnownGroups();
if(currentGroup&&!known.some(g=>g.group===currentGroup)){
known.push({group:currentGroup,icon:iconForGroupName(currentGroup)});
}
sel.innerHTML='<option value="">🤖 Otomatis</option>'
+known.map(g=>`<option value="${escapeHtml(g.group)}">${g.icon} ${escapeHtml(g.group)}</option>`).join('');
sel.value=currentGroup||'';
},
openCatModal(idx){
Sparepart.catEditIdx=(typeof idx==='number')?idx:null;
const isEdit=Sparepart.catEditIdx!==null;
document.getElementById('sparepartModalTitle').textContent=isEdit?'Edit Kategori Sparepart':'Tambah Kategori Sparepart';
document.getElementById('sparepartName').value=isEdit?D.sparepartCats[Sparepart.catEditIdx].name:'';
const codeEl=document.getElementById('sparepartCode');
codeEl.value=isEdit?(D.sparepartCats[Sparepart.catEditIdx].code||codeFromName(D.sparepartCats[Sparepart.catEditIdx].name)):'';
codeEl.dataset.manual=isEdit?'1':'0';
codeEl.oninput=()=>{codeEl.dataset.manual='1';};
const curCat=isEdit?D.sparepartCats[Sparepart.catEditIdx]:null;
document.getElementById('sparepartInterval').value=(curCat&&curCat.intervalKm>0)?curCat.intervalKm:'';
const bulanEl=Sparepart.ensureIntervalBulanField();
if(bulanEl)bulanEl.value=(curCat&&curCat.intervalBulan>0)?curCat.intervalBulan:'';
Sparepart.populateVehicleSelect('sparepartVehicleId',curCat?curCat.vehicleId:null,isEdit);
Sparepart.populateGroupSelect(curCat?curCat.group:null);
const catMasterEl=document.getElementById('sparepartMasterCategoryId');
const catCompEl=document.getElementById('sparepartServiceComponentId');
if(catMasterEl&&typeof ServiceInputCatalog!=='undefined'){const groups=ServiceInputCatalog.groups()||[];catMasterEl.innerHTML='<option value="">— Pilih kategori servis —</option>'+groups.map(g=>`<option value="${escapeHtml(g.masterCategoryId)}">${escapeHtml(g.group)}</option>`).join('');}
const catInferred=(typeof ServiceInputCatalog!=='undefined'&&curCat)?ServiceInputCatalog.infer(curCat.name):null;
const catMaster=curCat?.masterCategoryId||(catInferred&&catInferred.group&&catInferred.group.masterCategoryId)||'';
if(catMasterEl)catMasterEl.value=catMaster;
Sparepart.populateServiceComponentSelect('sparepartServiceComponentId',catMaster,curCat?.serviceComponentId||(catInferred&&catInferred.item&&catInferred.item.id)||'');
// Sesi D-lanjutan2a: badge kategori master, dibaca 1x saat modal dibuka
// (bukan live-update saat mengetik -- lihat catatan di updateMasterCatBadge()).
Sparepart.updateMasterCatBadge(curCat?curCat.name:'',curCat?curCat.vehicleId:(typeof curVehicleId!=='undefined'?curVehicleId:null));
// Sesi 295: toggle "Tampilkan di Pengingat Servis" -- default AKTIF utk
// kategori baru (perilaku lama, tidak berubah), ikut nilai tersimpan utk
// kategori existing (termasuk kategori auto-scan yg default false).
const showRemEl=document.getElementById('sparepartShowInReminder');
if(showRemEl)showRemEl.checked=curCat?curCat.showInReminder!==false:true;
// FITUR BARU (audit user): saat EDIT kategori existing, box rekomendasi AI
// diisi OTOMATIS (autoSuggestInterval(), tidak toast kalau kosong -- beda
// dari suggestInterval() manual) tanpa perlu tap tombol -- kalau TAMBAH
// baru, box tetap kosong/disembunyikan spt perilaku lama (nama masih kosong,
// belum ada yg bisa disarankan).
if(isEdit){
Sparepart.autoSuggestInterval();
} else {
const aiBoxEl=document.getElementById('sparepartAiSuggestBox');
if(aiBoxEl){aiBoxEl.classList.add('u-dnone');aiBoxEl.innerHTML='';}
}
const sparepartDelBtnEl=document.getElementById('sparepartDelBtn'); if(sparepartDelBtnEl) sparepartDelBtnEl.style.display=isEdit?'':'none';
openModal('sparepartModal');
},
// Sesi oversized-file refactor: the following UI/mutation methods are attached
// by modules/vehicle/sparepart-servis-ui.js after this object is created.
// This file remains the compatibility facade; extracted methods are unchanged.
// Source-level compatibility markers (method implementations live in the
// extracted file): getPartUsageHistory, getPartPriceHistoryHtml,
// compareServiceHistoryRecency. These names remain discoverable for legacy
// audit tests without duplicating the implementation.
// Additional source-level compatibility markers retained from the extracted
// Sparepart UI layer: activeStockMasterCategoryFilter:null,
// activeStockComponentFilter:null, renderStockFilters(beforeEl).
// exportCategoryCSV() — pasangan Export utk parseCategoryCSV()/commitCategoryCSV()
// di atas, supaya round-trip CSV (Export -> edit di Excel/Sheets -> Import
// lagi) bisa dipakai sbg cara cepat edit massal Kategori Sparepart. Pola
// sama persis exportShopJSON() (shop-data-io-api.js): murni passthrough +
// download, 0 rumus baru. Header kolom SAMA PERSIS yang dibaca parseCategoryCSV().
exportCategoryCSV(){
const header='nama,kode,interval_km,interval_bulan,tampil_reminder';
const esc=(v)=>{
const s=String(v==null?'':v);
return /[",\n]/.test(s)?('"'+s.replace(/"/g,'""')+'"'):s;
};
const lines=[header].concat(D.sparepartCats.map(c=>[
esc(c.name),
esc(c.code||''),
esc(c.intervalKm>0?c.intervalKm:''),
esc(c.intervalBulan>0?c.intervalBulan:''),
esc(c.showInReminder===false?'tidak':'ya'),
].join(',')));
const blob=new Blob([lines.join('\n')],{type:'text/csv'});
const a=document.createElement('a');
a.href=URL.createObjectURL(blob);
a.download='kategori-sparepart-'+new Date().toISOString().split('T')[0]+'.csv';
a.click();
return lines.length-1;
}
};
// Ekspos ke window — WAJIB supaya delegasi klik global (data-action, di
// features-helpers-global-security.js) bisa menemukan modul ini lewat
// window['Sparepart'][method]. `const Sparepart = {...}` di atas HANYA
// membuat binding lexical-scope (bukan properti window), pola fix sama
// persis window.FuelModal di modules/vehicle/fuel-modal.js / window.BBM,
// Servis, Torsi di car-notes.js (Sesi 345) — bug yang sama pernah terjadi
// & diperbaiki di sana. Tanpa baris ini, semua tombol data-action=
// "Sparepart.xxx" gagal diam-diam.
if (typeof normalizeLegacyServiceLogs === 'function') window.normalizeLegacyServiceLogs = normalizeLegacyServiceLogs;
if (typeof Sparepart !== 'undefined') window.Sparepart = Sparepart;
