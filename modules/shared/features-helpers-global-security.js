// features-helpers-global-security.js — Helper global (migrasi data, state D, save/load, event dispatcher)
// Dipindah ke modules/shared/features-helpers-global-security.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// CATATAN: 3 konstanta default (DEFAULT_COBEK_KATEGORI/DEFAULT_ACCOUNTS/DEFAULT_SPAREPARTS) dipindah ke
// data-default.js (v79) — file itu HARUS dimuat SEBELUM file ini karena dibaca langsung di `let D = {...}`.
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: data-default.js, features-helpers-global-security.js, diagnostik-versi.js, format-tema.js, error-handler.js, helper-teks.js, keamanan-pin.js, modal-navigasi.js, reset-gaji-mingguan.js, debug-console.js, pengaturan-search.js, onboarding.js, kalkulator-input.js, scan-ocr.js, akun.js, gaji-calc.js, transaksi.js, profil-pengaturan.js, kategori.js, tagihan-kalender.js, backup-restore.js, payroll-absensi.js, tukang-absensi.js

const SCHEMA_VERSION = 11;
const DATA_MIGRATIONS=[
{toVersion:2,desc:'Tambah kategori baku Investasi & Sedekah/Donasi (pengeluaran) utk user lama',migrate(d){
if(!d.categories||!d.categories.expense)return;
const exp=d.categories.expense;
if(!exp.some(c=>c.id==='cat_inv'||/^investasi$/i.test(c.name||''))){
exp.splice(Math.max(0,exp.length-1),0,{id:'cat_inv',name:'Investasi',emoji:'📈',subs:[]});
}
if(!exp.some(c=>c.id==='cat_sedekah'||/^sedekah\/?donasi$/i.test((c.name||'').replace(/\s+/g,'')))){
exp.splice(Math.max(0,exp.length-1),0,{id:'cat_sedekah',name:'Sedekah/Donasi',emoji:'🤲',subs:[]});
}
}},
{toVersion:3,desc:'Tambah id ke entri gajiMingguanHistory lama (dulu tidak punya id unik -- dibutuhkan sekarang karena modul ini ikut disync ke Google Sheets, yang butuh id per-baris utk diffing)',migrate(d){
if(!Array.isArray(d.gajiMingguanHistory))return;
d.gajiMingguanHistory.forEach(h=>{ if(!h.id) h.id=uid(); });
}},
{toVersion:4,desc:'Torsi: pindahkan D.torsiChecklist flat lama (jaring pengaman) ke kendaraan pertama -- lihat TorsiVehicleAPI._migrateFlatToPerVehicle() (modules/vehicle/torsi-vehicle-api.js). Sesi "Revisi migrasi" (DESIGN_torsi-vehicle-selector_shop-import-export.md, Bagian A.2): menggantikan mekanisme flag D._migratedTorsiVehicle -- 0 logic baru, cuma dipindah ke jalur migrasi formal supaya ikut ter-trigger juga saat restore JSON.',migrate(d){
if(typeof TorsiVehicleAPI!=='undefined'&&typeof TorsiVehicleAPI._migrateFlatToPerVehicle==='function'){
TorsiVehicleAPI._migrateFlatToPerVehicle(d);
}
}},
{toVersion:5,desc:'Lepas billLinkId dangling di D.transactions -- sebelum fix s353, delBillArchive() menghapus record arsip tanpa melepas billLinkId transaksi terkait, jadi transaksi lama bisa nyangkut nunjuk ke bill yang sudah tidak ada di D.bills maupun D.billsArchive. Transaksinya sendiri TIDAK dihapus, cuma link basi-nya dilepas (one-time cleanup, bill baru sejak s353 tidak akan kena ini lagi).',migrate(d){
if(!Array.isArray(d.transactions)||!d.transactions.length)return;
const liveIds=new Set([...(d.bills||[]),...(d.billsArchive||[])].map(b=>b.id));
d.transactions.forEach(t=>{ if(t.billLinkId!=null&&!liveIds.has(t.billLinkId)) delete t.billLinkId; });
}},
{toVersion:6,desc:'GAP3-AUD-001 (Sesi 545/546, docs/BUG_REGISTRY.md): holding Investasi legacy fundSource==="titipan" yang belum pernah lewat Investment.setOwners() selalu balik ownerId literal "titipan_investor" dari Investment.getOwners() apa pun titipanOwner-nya -- 2 orang beda jadi 1 identitas kalau dibandingkan lintas holding/domain. Investment.migrateLegacyTitipanOwners() (Sesi 545) derive ownerId real per nama lewat OwnerRegistry.findOrCreate() (idempotent, 0 efek kalau dijalankan ulang -- guard di dalam fungsi itu sendiri lewat Array.isArray(h.owners), bukan lewat SCHEMA_VERSION di sini, jadi aman dipanggil lagi manual/lewat restore JSON versi lama). app-bootstrap.js dimuat PALING TERAKHIR (lihat komentar di file itu) jadi Investment/OwnerRegistry sudah pasti terdefinisi saat migrate() ini jalan.',migrate(d){
if(typeof Investment!=='undefined'&&typeof Investment.migrateLegacyTitipanOwners==='function'){
Investment.migrateLegacyTitipanOwners();
}
}},
{toVersion:7,desc:'R2 (audit ownership/titipan, lanjutan GAP3-AUD-001): baris a.owners[]/h.owners[] non-SELF yang dibuat SEBELUM assetOwnersModal/investmentOwnersModal disambung ke OwnerRegistry (S490/S491) masih pakai ownerId ad-hoc lama -- 2 aset/holding dgn owner nama sama tidak otomatis ownerId sama. Aset.migrateOwnersToRegistry()/Investment.migrateOwnersToRegistry() derive ownerId kanonik per nama lewat OwnerRegistry.findOrCreate() (idempotent, guard tabrakan internal), relabel D.debts[].linkedOwnerId lebih dulu spy histori/status lunas utang titipan tidak hilang.',migrate(d){
if(typeof Aset!=='undefined'&&typeof Aset.migrateOwnersToRegistry==='function'){
Aset.migrateOwnersToRegistry();
}
if(typeof Investment!=='undefined'&&typeof Investment.migrateOwnersToRegistry==='function'){
Investment.migrateOwnersToRegistry();
}
}},
{toVersion:8,desc:'BUGFIX (audit backup user): D.partsStock id dulu dibuat lewat syncPartsStockFromCatalog() pakai \'st_\'+Date.now() MENTAH (bukan uid() SOT anti-tabrakan) -- kalau fungsi itu dipanggil banyak kali dlm loop sinkron (syncUnlinkedCatalogPartsToStock() saat bulk-import katalog), banyak baris ke-generate di milidetik yang sama & id-nya jadi TABRAKAN (temuan nyata di 1 backup: 292/296 baris cuma 40 id unik). Bug generation-nya sudah diperbaiki (lihat tx-stok-sparepart.js, _genId()), migrasi ini one-time cleanup utk backup LAMA yang sudah kena: baris pertama per id dipertahankan apa adanya, duplikatnya diberi id baru unik (pola _dupN) -- 0 baris dihapus, cuma id yang diganti.',migrate(d){
if(!Array.isArray(d.partsStock)||!d.partsStock.length)return;
const seen=new Set();
let suf=1;
d.partsStock.forEach(p=>{
if(!p||p.id==null)return;
if(!seen.has(p.id)){seen.add(p.id);return;}
let nid=p.id+'_dup'+suf;
while(seen.has(nid)){suf++;nid=p.id+'_dup'+suf;}
p.id=nid;seen.add(nid);suf++;
});
}},
{toVersion:9,desc:'BUGFIX (audit backup user, lanjutan toVersion:8): part hasil scan Katalog Suku Cadang dari SEBELUM sesi audit SOT vehicleId (lihat tx-stok-sparepart.js syncPartsStockFromCatalog()) tidak pernah distempel D.partsStock[].vehicleId -- part-nya jadi \"universal\" & bocor tampil di SEMUA tab kendaraan. Fix generation-nya forward-only (0 backfill retroaktif). Migrasi ini backfill vehicleId utk baris LAMA yang kosong, HANYA kalau bisa ditentukan dgn pasti: catalogId part cocok ke 1 entri _vehicleCatalogStore.items & entri itu compatibleVehicleIds isinya PERSIS 1 kendaraan (kalau 0/>1/ambigu, dilewati -- 0 tebakan). d._vehicleCatalogStore cuma tersedia sesaat di jalur restore JSON (lihat applyRestoredData(), backup-restore.js) -- migrasi ini no-op di jalur startup normal (app.load()), yg memang tidak punya sumber data katalog di titik ini.',migrate(d){
if(!Array.isArray(d.partsStock)||!d.partsStock.length)return;
const items=(d._vehicleCatalogStore&&Array.isArray(d._vehicleCatalogStore.items))?d._vehicleCatalogStore.items:null;
if(!items)return;
const byId={};
items.forEach(it=>{ if(it&&it.id!=null)byId[it.id]=it; });
d.partsStock.forEach(p=>{
if(!p||p.vehicleId||p.catalogId==null)return;
const it=byId[p.catalogId];
const compat=(it&&Array.isArray(it.compatibleVehicleIds))?it.compatibleVehicleIds:[];
if(compat.length===1)p.vehicleId=compat[0];
});
}},
{toVersion:10,desc:'AUDIT-SYNC-PIUTANG-UTANG-ARUS-KAS: tambah kategori baku Piutang (pengeluaran)/Utang (pemasukan) utk user lama, pola SAMA PERSIS toVersion:2 (Investasi/Sedekah) -- dipakai transaksi otomatis dari toggle "Catat juga sebagai transaksi arus kas" di piutangModal/debtModal (piutang-utang.js).',migrate(d){
if(!d.categories||!d.categories.income||!d.categories.expense)return;
const inc=d.categories.income;
const exp=d.categories.expense;
if(!inc.some(c=>c.id==='cat_utang'||/^utang$/i.test(c.name||''))){
inc.splice(Math.max(0,inc.length-1),0,{id:'cat_utang',name:'Utang',emoji:'🤝',subs:[]});
}
if(!exp.some(c=>c.id==='cat_piutang'||/^piutang$/i.test(c.name||''))){
exp.splice(Math.max(0,exp.length-1),0,{id:'cat_piutang',name:'Piutang',emoji:'🤝',subs:[]});
}
}},
{toVersion:11,desc:'ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi A1 (manufacturers/vehicle_models relasional, fondasi): backfill field modelId (opsional) di D.vehicles lama lewat DatabaseAPI.vehicleModel.findByName(v.name) -- pola guard typeof sama seperti migrasi toVersion:4/6/7 di atas (no-op kalau DatabaseAPI belum termuat, mis. test terisolasi). `name` TETAP jadi display fallback, modelId cuma metadata tambahan -- 0 field lama diubah/dihapus, entri yang sudah punya modelId (mis. dari input manual sesi berikutnya) dilewati.',migrate(d){
if(!Array.isArray(d.vehicles)||!d.vehicles.length)return;
if(typeof DatabaseAPI==='undefined'||!DatabaseAPI.vehicleModel||typeof DatabaseAPI.vehicleModel.findByName!=='function')return;
d.vehicles.forEach(v=>{
if(!v||v.modelId)return;
const m=DatabaseAPI.vehicleModel.findByName(v.name||'');
if(m)v.modelId=m.id;
});
}},
];
function runDataMigrations(fromVersion){
let v=Number.isFinite(fromVersion)?fromVersion:0;
let migrationBlocked=false;
const pending=DATA_MIGRATIONS.filter(m=>m.toVersion>v).sort((a,b)=>a.toVersion-b.toVersion);
for(const m of pending){
try{
  m.migrate(D);
  // Setelah ada satu kegagalan, migrasi berikutnya TETAP dijalankan sesuai
  // kontrak maintenance. Namun schemaVersion tidak boleh melompati versi
  // pertama yang gagal; pada boot/restore berikutnya titik gagal akan dicoba
  // lagi. Migrasi setelahnya wajib idempoten karena bisa dieksekusi ulang.
  if(!migrationBlocked)v=m.toVersion;
}catch(e){
  migrationBlocked=true;
  console.error(`Migrasi data ke versi ${m.toVersion} ("${m.desc}") gagal; migrasi berikutnya tetap dilanjutkan, schemaVersion ditahan di ${v}:`,e);
}
}
D.schemaVersion=v;
return D.schemaVersion;
}
// isDevMode() — satu sumber kebenaran untuk deteksi mode developer, dipakai di seluruh app
// (Diagnostik di Pengaturan, smoke-test.js, dll). Aktif kalau: ?dev=1 di URL, localStorage
// kw_dev='1', dibuka lewat file:// langsung, atau di localhost/127.0.0.1 (server dev lokal).
// Sengaja DISAMAKAN dengan logika isDevMode() di smoke-test.js supaya konsisten satu app.
function isDevMode(){
try{
if(new URLSearchParams(location.search).get('dev')==='1')return true;
if(localStorage.getItem('kw_dev')==='1')return true;
if(location.protocol==='file:')return true;
if(location.hostname==='localhost'||location.hostname==='127.0.0.1')return true;
}catch(e){ /* anggap bukan dev mode kalau gagal deteksi */ }
return false;
}
const APP_BUILD_VERSION = 's1956-service-history-audit-package-1999';
const PRODUCTION_BUILD_SYNCED_VERSION = 's1956-service-history-audit-package-1999';
let D = {
schemaVersion:SCHEMA_VERSION,
transactions:[],cobek:[],products:[],produsen:[],cobekKategori:JSON.parse(JSON.stringify(DEFAULT_COBEK_KATEGORI)),targets:[],eduFunds:[],reminders:[],bills:[],billsArchive:[],inventoryTransfers:[],productMovementOverride:{},purchaseOrders:[],productStockCorrections:[],
catatan:{anak:[]},
milestones:[false,false,false,false,false],
nextPulang:'',lastBackup:null,lastResetPromptDate:null,
profile:{nama:'W',gajiPokok:65000,kiriman:500000,theme:'dark',lemburMultiplier:1.5,tarifMinggu:139000,tanggalLahir:null,statusKawin:false,tanggungan:0,statusPekerjaan:null,targetGajiBulanan:null,insightMingguanAktif:true},
categories:{income:JSON.parse(JSON.stringify(DEFAULT_CATS.income)),expense:JSON.parse(JSON.stringify(DEFAULT_CATS.expense))},
accounts:JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS)),
vehicles:[{id:'veh_1',name:'Vario 125',emoji:'🏍️',serviceIntervalKm:3000,modelId:'vario-125'}],
simList:[],
bbmLogs:[],servisLogs:[],jalanLogs:[],kmLogs:[],workDays:[],gajiMingguanHistory:[],
tukangBorHargaMemory:{},
tukangWorkers:[],
tukangAbsensi:[],
sparepartCats:JSON.parse(JSON.stringify(DEFAULT_SPAREPARTS)),
partsStock:[],
torsiChecklist:{},
chatHistory:[],
aiWidgetReport:null,
budgets:[],
financeAuditAnnotations:[],
financeAuditSettings:{smallLeakMaxAmount:50000,smallLeakMinCount:3,recurringMinOccurrences:2,recurringTolerancePct:0.05},
notifSettings:{enabled:false,billDays:3,ldrDays:3},
dashCardPrefs:{},
favoritKeys:[],
googleDrive:{clientId:'',fileId:null,lastSync:null,autoSync:false},
googleSheets:{spreadsheetId:'',lastSync:null},
archiveHistory:[],
assets:[],
piutang:[],
debts:[],
renovProjects:[],
wishlist:[],
assetAllocation:{risk:null,dana:null},
debtStrategy:{method:'avalanche',extra:0},
budgetReko:{months:3,buffer:10},
finansialFreedom:{expenseCatIds:[],avgMonths:6,swr:4,assumsiReturn:8,assumsiInflasi:5,assetScope:'zakatable',scenarioRange:2},
pensiun:{aktif:false,usiaSekarang:null,usiaPensiun:58,targetDana:0,returnTahunan:6,accId:'',kontribusiBulanan:0,rekoPersen:20,rekoBulan:3,riwayatKontribusi:[]},
sewaKios:{units:[]},
wealthSnapshots:[],
lifeBalanceSnapshots:[],
refleksi:{gratitude:[],selfCareLog:{},privateNotes:[]},
pajakZakat:{
hargaEmasPerGram:2640000,
nisabPenghasilanBulan:7640144,
nisabPenghasilanTahun:91681728,
zakatFitrahPerJiwa:37500,
haulMaalMulai:null,
asetLain:0, utangJT:0,
pphBrutoBulan:0, pphIuranBulan:0,
pbb:{njoptkp:10000000,tarifPersen:0.5},
// KW-165: biaya perpanjangan SIM per jenis (dulu hardcode SIM_JENIS_DEFAULTS di vehicle-core.js) —
// dipindah ke sini biar bisa diupdate lewat tombol "🔍 Cek Update via AI" (RefAI) sama seperti
// hargaEmasPerGram/nisab, tanpa perlu edit source code kalau tarif PNBP resmi naik.
simTarifA:80000, simTarifB1:80000, simTarifB2:80000,
simTarifC:75000, simTarifC1:75000, simTarifC2:75000,
simTarifD:30000,
zakatLog:[],
refCheckedAt:null,
refSources:{}
}
};
let curVehicleId='veh_1', curCnTab='bbm', cnPeriode='selamanya';
let cnPeriodeByTab={bbm:'selamanya',servis:'selamanya'};
let curPayMethod='tunai';
let curMonth=new Date().getMonth(), curYear=new Date().getFullYear();
// lapMonthOffset (Fix slide bulan sebelum/sesudah di filter Laporan) —
// TERPISAH dari curMonth/curYear di atas (dipakai tab Keuangan/Daftar
// Transaksi lewat changeMonth()/changeTxListMonth()) karena ‹ › di panel
// filter Laporan cuma boleh geser bulan YANG SEDANG DILIHAT DI LAPORAN,
// tanpa ikut menggeser bulan aktif tab Keuangan/dashboard lain yang
// kebetulan baca curMonth/curYear yang sama. 0 = bulan berjalan (now),
// +1/-1 = N bulan sesudah/sebelum now. Direset ke 0 tiap chip "Bulan Ini"
// di-tap ulang (lihat setPeriode(), tx-list-cashflow.js) supaya user tidak
// nyangkut di bulan lampau kalau pindah lalu balik ke chip yang sama.
let lapMonthOffset=0;
let curTxType='income', curCatatan='anak', filterPeriode='bulan';
let cicilanLastInput='total';
let cicilanSharedLastInput='pct';
let cicilanDateLinked=false;
let curCatFilter='semua', curImportType='cashew';
let pinBuffer='', catEditIdx=null, curCatModalType='income';
let curBillType='tagihan', billEditId=null, billEditFromArchive=false, billListTab='aktif';
let subCatParentId=null, subCatParentType=null, subCatEditId=null;
let txEditId=null, catModalCallback=null, txEditLinkedBillId=null;
let _txSaving=false;
let _txAccManuallySet=false;
// _txAssetManuallySet — Sesi (patch akun-multi-owner-doublecount-datahealthcheck-restore):
// sama pola persis dgn _txAccManuallySet -- true kalau user SENGAJA mengubah
// dropdown #txAssetId sendiri (lewat onTxAssetChange()), supaya auto-select
// aset dari onTxAccChange() (lihat transaksi.js) TIDAK menimpa pilihan
// manual user setelah dia ganti sendiri.
let _txAssetManuallySet=false;
let _txCatLearnSource=null;
let _saveGuards={};
function withSaveGuard(key,modalId,fn){
if(_saveGuards[key])return;
const modalEl=modalId?document.getElementById(modalId):null;
if(modalEl && !modalEl.classList.contains('open'))return;
_saveGuards[key]=true;
try{
return fn();
} finally {
_saveGuards[key]=false;
}
}
async function withSaveGuardAsync(key,modalId,fn){
if(_saveGuards[key])return;
const modalEl=modalId?document.getElementById(modalId):null;
if(modalEl && !modalEl.classList.contains('open'))return;
_saveGuards[key]=true;
try{
return await fn();
} finally {
_saveGuards[key]=false;
}
}
let _saveErrorShown=false;
function safeSetItem(key,value){
try{
localStorage.setItem(key,value);
return true;
}catch(e){
console.error('Gagal menyimpan ('+key+'):',e);
const isQuota=e && (e.name==='QuotaExceededError'||e.code===22||e.code===1014);
const msg=isQuota?'⚠️ Penyimpanan HP penuh, gagal menyimpan perubahan ini.':'⚠️ Gagal menyimpan: '+(e&&e.message?e.message:'error tidak diketahui');
if(typeof toast==='function')toast(msg,4000); else showAlertModal(msg);
return false;
}
}
let _bigDataWarnShown=false;
let _saveDebounceTimer=null;
// S1850 PERF: mutation-versioned persistence snapshot. Lifecycle events on mobile can
// fire visibilitychange -> pagehide -> beforeunload in quick succession. Reusing the
// exact snapshot for the same save version avoids repeated full JSON.stringify(D) work.
let _saveStateVersion=0;
let _saveSnapshotVersion=-1;
let _saveSnapshotJson=null;
let _saveQueuedVersion=-1;
// MIGRASI STORAGE (LEVEL 3): IndexedDB sekarang jadi penyimpanan UTAMA untuk data besar (kw_v4_mirror).
// localStorage['kw_v4'] TIDAK lagi ditulis di tiap save() biasa (dulu ditulis dobel setiap ada
// perubahan data, padahal localStorage kapasitasnya kecil & write-nya blocking). localStorage
// sekarang hanya dipakai untuk: (a) setting/PIN/preferensi kecil yang memang cocok di sana,
// (b) snapshot cadangan sinkron di titik-titik KRITIS lewat _writeLocalSnapshot() -- lihat saveFlush().
// Kenapa masih perlu localStorage sinkron di titik kritis (bukan dihapus total): tulis ke IndexedDB
// itu ASYNC. Kalau tab HP ditutup/di-background (visibilitychange/pagehide) sebelum transaksi
// IndexedDB commit, datanya bisa hilang -- terutama di Safari iOS yang agresif suspend tab.
// localStorage.setItem() sinkron, jadi tetap jadi jaring pengaman di momen itu saja (lihat
// tryBackupOnClose() yang manggil saveFlush()), bukan di setiap keystroke.
function _buildSaveJson(){
D.schemaVersion=SCHEMA_VERSION;
let json;
if(D.profile && Object.prototype.hasOwnProperty.call(D.profile,'apiKey')){
const profileNoKey={...D.profile}; delete profileNoKey.apiKey;
json=JSON.stringify({...D,profile:profileNoKey});
} else {
json=JSON.stringify(D);
}
if(!_bigDataWarnShown && json.length>3.5*1024*1024){
_bigDataWarnShown=true;
if(typeof toast==='function')toast('⚠️ Data sudah cukup besar ('+(D.transactions?D.transactions.length:'?')+' transaksi). Disimpan di penyimpanan IndexedDB (kapasitas jauh lebih besar dari localStorage), tapi tetap disarankan backup manual sesekali lewat Pengaturan → Backup.',6000);
}
return json;
}
// Nulis snapshot ke localStorage['kw_v4'] secara SINKRON. Cuma dipanggil dari saveFlush()
// (titik kritis) atau sebagai fallback kalau IndexedDB gagal/tidak didukung browser.
function _writeLocalSnapshot(json){
try{
localStorage.setItem('kw_v4',json);
_saveErrorShown=false;
return true;
}catch(e){
console.error('Gagal menyimpan data (localStorage):',e);
if(!_saveErrorShown){
_saveErrorShown=true;
const isQuota=e && (e.name==='QuotaExceededError'||e.code===22||e.code===1014);
const msg=isQuota
? '⚠️ Penyimpanan localStorage HP ini penuh, tapi data TETAP tersimpan aman di penyimpanan cadangan (IndexedDB) yang kapasitasnya jauh lebih besar — tidak ada data yang hilang. Backup manual lewat Pengaturan tetap disarankan.'
: '⚠️ Gagal menyimpan data: '+(e&&e.message?e.message:'error tidak diketahui');
if(typeof toast==='function') toast(msg,4000);
else showAlertModal(msg);
}
return false;
}
}
// P28: serialize async persistence writes. Tanpa queue, dua save() yang berdekatan
// dapat menjalankan IDBStore.set() bersamaan; bila write lama selesai belakangan,
// snapshot LAMA bisa menimpa snapshot BARU di IndexedDB. Queue ini hanya mengatur
// urutan persistence, tidak menahan mutasi/render UI. Jika satu write gagal, queue
// tetap lanjut ke snapshot berikutnya dan snapshot yang gagal punya fallback LS.
let _savePersistChain=Promise.resolve();
let _savePersistSeq=0;
var _savePersistStamp=0;
var _saveQueuedStamp=0;
const _savePersistMetaKey='kw_v4_persist_meta';
function _readSavePersistMeta(){
try{const raw=localStorage.getItem(_savePersistMetaKey);const m=raw?JSON.parse(raw):null;return m&&typeof m==='object'?{localTs:Number(m.localTs)||0,idbTs:Number(m.idbTs)||0}:{localTs:0,idbTs:0};}catch(e){return {localTs:0,idbTs:0};}
}
function _nextSavePersistStamp(){
const m=_readSavePersistMeta();const now=Date.now();const stamp=Math.max(now,m.localTs,m.idbTs,_savePersistStamp)+1;_savePersistStamp=stamp;return stamp;
}
function _markSavePersistMeta(kind,stamp){
if(!stamp)return false;try{const m=_readSavePersistMeta();if(kind==='local')m.localTs=Math.max(m.localTs,stamp);else if(kind==='idb')m.idbTs=Math.max(m.idbTs,stamp);localStorage.setItem(_savePersistMetaKey,JSON.stringify(m));return true;}catch(e){return false;}
}

// S1765: stale-fallback guard; only the newest failed IDB snapshot may fall back to localStorage.
function _getSaveSnapshotForVersion(version){
if(_saveSnapshotVersion===version&&_saveSnapshotJson!==null)return _saveSnapshotJson;
const json=_buildSaveJson();
_saveSnapshotVersion=version;
_saveSnapshotJson=json;
return json;
}
// SA-L: direct state replacement (restore/import/rollback) must advance the
// persistence mutation clock just like save(). Otherwise saveFlush() can reuse
// the pre-restore JSON snapshot for the same version and persist stale data.
function _markPersistenceStateChanged(){
_saveStateVersion++;
_saveSnapshotVersion=-1;
_saveSnapshotJson=null;
return _saveStateVersion;
}
function _saveImmediate(snapshotJson){
// S1877 TESTABILITY: optional, side-effect-free observer for diagnostic tests.
// It observes an invocation without replacing the persistence function itself,
// avoiding brittle monkey-patching across concatenated/browser bundles.
try{
if(typeof globalThis!=='undefined'&&typeof globalThis.__kwSaveImmediateObserver==='function')
  globalThis.__kwSaveImmediateObserver(snapshotJson);
}catch(e){void e;}
const version=_saveStateVersion;
let json=snapshotJson;
try{if(json===undefined)json=_getSaveSnapshotForVersion(version);}catch(e){console.error('Gagal menyiapkan data untuk disimpan:',e);return;}
if(_saveQueuedVersion===version)return _saveQueuedStamp;
_saveQueuedVersion=version;
const stamp=_nextSavePersistStamp();
_saveQueuedStamp=stamp;
const seq=++_savePersistSeq;
_savePersistChain=_savePersistChain.then(()=>IDBStore.set('kw_v4_mirror',json)).then(()=>{_markSavePersistMeta('idb',stamp);_announcePersistenceWrite();}).catch(e=>{
console.error('Gagal menyimpan ke IndexedDB, fallback ke localStorage:',e);
if(seq===_savePersistSeq){const fallbackOk=_writeLocalSnapshot(json);if(fallbackOk){_markSavePersistMeta('local',stamp);_announcePersistenceWrite();}else{_saveQueuedVersion=-1;_saveQueuedStamp=0;}}
else console.warn('Fallback localStorage dilewati: snapshot IDB yang gagal sudah usang (seq '+seq+' < '+_savePersistSeq+').');
});
return stamp;
}

// S1841: scoped post-mutation rendering.
// save() remains the persistence/reconciliation gate, but callers must not redraw
// unrelated domains after every mutation. On mobile this is especially important:
// a single transaction/service save used to synchronously redraw Dashboard + Finance +
// Car Notes + Sparepart even when only one page was visible.
// The helper preserves synchronous freshness for the currently visible page while
// deliberately skipping hidden/unrelated pages. It is intentionally global so legacy
// feature modules can migrate incrementally without changing their public APIs.
// S1842 PERF: tiny in-memory profiler. It is disabled by default and only records
// timings when window.__APP_PERF_ENABLED is explicitly true, so production users pay
// essentially zero cost. Tests/diagnostics can enable it to identify real mobile hot spots.
// S1844 PERF: cache parsed transaction dates per object. Date parsing is a surprisingly
// hot path because the same transaction is visited by Dashboard, Finance, reports and
// ledger rendering. Cache is invalidated automatically when t.date changes.
const _txDateCache=typeof WeakMap!=='undefined'?new WeakMap():null;
function getCachedTxDateMs(t){
  if(!t)return NaN;
  const raw=t.date;
  if(_txDateCache){
    const hit=_txDateCache.get(t);
    if(hit&&hit.raw===raw)return hit.ms;
    const ms=new Date(raw).getTime();
    _txDateCache.set(t,{raw,ms});
    return ms;
  }
  return new Date(raw).getTime();
}

function _perfMark(name,start){
  if(typeof window==='undefined'||window.__APP_PERF_ENABLED!==true)return;
  try{
    const ms=performance.now()-start;
    const P=window.__APP_PERF||(window.__APP_PERF={count:0,totalMs:0,byName:{}});
    P.count++;P.totalMs+=ms;
    const x=P.byName[name]||(P.byName[name]={count:0,totalMs:0,maxMs:0});
    x.count++;x.totalMs+=ms;x.maxMs=Math.max(x.maxMs,ms);
  }catch(_e){ /* perf telemetry must never affect app flow */ }
}
// S1846 PERF: reusable tiny indexes for hot-path display lookups. They are keyed by
// the current array identity + length; callers that replace/mutate the collection can
// invalidate explicitly via clearPerfIndexes(). No data is changed.
let _perfAccountIndex={src:null,len:-1,map:null};
let _perfCategoryIndex={src:null,len:-1,map:null};
function _getPerfAccountIndex(){
  const src=(typeof D!=='undefined'&&Array.isArray(D.accounts))?D.accounts:[];
  if(_perfAccountIndex.src!==src||_perfAccountIndex.len!==src.length){
    const m=new Map(); for(const a of src){if(a&&a.id!=null)m.set(a.id,a);} 
    _perfAccountIndex={src,len:src.length,map:m};
  }
  return _perfAccountIndex.map;
}
function _getPerfCategoryIndex(){
  const src=typeof getAllCats==='function'?getAllCats():[];
  if(_perfCategoryIndex.src!==src||_perfCategoryIndex.len!==src.length){
    const m=new Map(); for(const c of src){if(c&&c.name!=null)m.set(c.name,c);} 
    _perfCategoryIndex={src,len:src.length,map:m};
  }
  return _perfCategoryIndex.map;
}
function clearPerfIndexes(){_perfAccountIndex={src:null,len:-1,map:null};_perfCategoryIndex={src:null,len:-1,map:null};}

function refreshCarNotesAfterMutation(opts){
  opts=opts||{};
  const isVisible=(id)=>{
    if(typeof document==='undefined')return false;
    const el=document.getElementById(id);
    if(!el||el.hidden)return false;
    if(el.style&&el.style.display==='none')return false;
    if(el.classList&&el.classList.contains('u-dnone'))return false;
    return true;
  };
  if(!isVisible('page-carnotes'))return;
  const safe=(name,fn)=>{
    const t0=(typeof performance!=='undefined'&&performance.now)?performance.now():0;
    try{if(typeof fn==='function')fn();}
    catch(e){console.error('Car Notes scoped refresh failed: '+name,e);}
    finally{if(t0)_perfMark('render:cn:'+name,t0);}
  };
  const tab=typeof curCnTab==='string'?curCnTab:'bbm';
  if(tab==='servis'){
    safe('serviceIntegrity',typeof renderServiceIntegrityCard==='function'?renderServiceIntegrityCard:null);
    safe('serviceList',typeof renderServisList==='function'?renderServisList:null);
    safe('serviceReminder',typeof refreshServiceReminderState==='function'?refreshServiceReminderState:null);
    if(typeof Sparepart!=='undefined'){
      if(opts.stock!==false)safe('stockList',typeof Sparepart.renderStockList==='function'?()=>Sparepart.renderStockList():null);
      if(opts.categories)safe('categoryList',typeof Sparepart.renderCatList==='function'?()=>Sparepart.renderCatList():null);
    }
    return;
  }
  if(tab==='bbm'&&opts.bbm&&typeof renderBbmList==='function')safe('bbmList',renderBbmList);
  else if(tab==='insight'&&opts.insight&&typeof CarNotesPerformance!=='undefined'&&typeof CarNotesPerformance.render==='function')safe('insight',()=>CarNotesPerformance.render('insight'));
}

function refreshAfterMutation(opts){
  opts=opts||{};
  const isVisible=(id)=>{
    if(typeof document==='undefined')return false;
    const el=document.getElementById(id);
    if(!el)return false;
    if(el.hidden)return false;
    if(el.style&&el.style.display==='none')return false;
    if(el.classList&&el.classList.contains('u-dnone'))return false;
    return true;
  };
  const safe=(name,fn)=>{
    const t0=(typeof performance!=='undefined'&&performance.now)?performance.now():0;
    try{if(typeof fn==='function')fn();}
    catch(e){console.error('S1841 scoped mutation refresh failed: '+name,e);}
    finally{if(t0)_perfMark('render:'+name,t0);}
  };
  // If a specific domain is requested, render it only when its page/container is live.
  if(opts.domain==='servis'){
    refreshCarNotesAfterMutation(opts);
    return;
  }
  if(opts.domain==='finance'){
    if(isVisible('page-keuangan')){
      safe('renderKeuangan',typeof renderKeuangan==='function'?renderKeuangan:null);
      if(opts.bills!==false)safe('renderBillList',typeof renderBillList==='function'?renderBillList:null);
      if(opts.bills!==false)safe('checkBills',typeof checkBills==='function'?checkBills:null);
      if(opts.debt)safe('renderDebtList',typeof renderDebtList==='function'?renderDebtList:null);
    }else if(isVisible('page-dashboard')){
      // A finance mutation made while the dashboard is the visible page only needs
      // the dashboard refresh; renderKeuangan() would be completely hidden work.
      safe('renderDashboard',typeof renderDashboard==='function'?renderDashboard:null);
    }else if(isVisible('page-carnotes')&&opts.carNotes){
      safe('renderCnTab',typeof renderCnTab==='function'?renderCnTab:null);
    }
    return;
  }
  // Generic explicit requests. If several domains are requested by a legacy caller,
  // refresh only the currently visible expensive page. This prevents a save in Shop,
  // Investment, Renovasi, etc. from synchronously repainting hidden Dashboard/Finance.
  // Callers that explicitly need a second visible domain can still request it via a
  // domain-specific branch above.
  if(opts.dashboard&&isVisible('page-dashboard'))
    safe('renderDashboard',typeof renderDashboard==='function'?renderDashboard:null);
  if(opts.finance&&isVisible('page-keuangan')&&!isVisible('page-dashboard'))
    safe('renderKeuangan',typeof renderKeuangan==='function'?renderKeuangan:null);
  if(opts.carNotes&&isVisible('page-carnotes')&&!isVisible('page-dashboard')&&!isVisible('page-keuangan'))
    safe('renderCnTab',typeof renderCnTab==='function'?renderCnTab:null);
}

function save(opts){
opts=opts||{};
_markPersistenceStateChanged();
if(_crossTabStateStale){if(!_crossTabWarnShown){_crossTabWarnShown=true;const _msg='⚠️ Tab ini memakai data lama setelah perubahan dari tab lain. Muat ulang aplikasi sebelum menyimpan lagi.';if(typeof toast==='function')toast(_msg,6500);else console.warn(_msg);}return false;}
const _saveDomain=opts.domain||null;
const _saveFinanceMutation=opts.financeMutation!==false;
const _saveAccountIds=Array.isArray(opts.accountIds)?opts.accountIds.filter(Boolean):null;
// KW perf fix: save() adalah titik tunggal yang selalu dipanggil SEBELUM burst render
// (renderAccGrid/renderDashAccList/renderLapAccList/dll) tiap ada mutasi data akun/transaksi.
// Invalidate cache saldo akun di sini supaya burst render sesudahnya baca data akun terbaru,
// tapi tiap fungsi di dalam burst yang sama tidak hitung ulang dari nol. Lihat akun.js.
if(typeof invalidateAccBalCache==='function')invalidateAccBalCache();
// 2026-08-14 sesi lanjutan (Rekomendasi #2, PATCH-NOTES-akun-dana-titipan-sync.md §2):
// gerbang tunggal utk sinkron Buku Utang akun BERDIRI SENDIRI (bukan tertaut Aset --
// itu sudah ditangani syncLinkedAssetNilaiFromAkun() di bawah) ke Dana Titipan, nominal
// = saldo akun saat ini (real-time, keputusan desain eksplisit -- lihat komentar
// TitipanSync.reconcileAccounts()). Ditaruh SETELAH invalidateAccBalCache() supaya
// recalcAccBalance() di dalamnya baca saldo TERBARU, bukan cache basi dari siklus lalu.
if(_saveFinanceMutation&&typeof TitipanSync!=='undefined'&&typeof TitipanSync.reconcileAccounts==='function'){
const _tTitipan=(typeof performance!=='undefined'&&performance.now)?performance.now():0;
TitipanSync.reconcileAccounts({accountIds:_saveAccountIds});
if(_tTitipan)_perfMark('save:TitipanSync',_tTitipan);
}
if(_saveFinanceMutation&&typeof syncLinkedAssetNilaiFromAkun==='function')syncLinkedAssetNilaiFromAkun({accountIds:_saveAccountIds});
if(_saveFinanceMutation&&typeof invalidateCashflowForecastCache==='function')invalidateCashflowForecastCache();
if(_saveFinanceMutation&&typeof FinanceIntelligence!=='undefined'&&typeof FinanceIntelligence.invalidateCache==='function')FinanceIntelligence.invalidateCache();
// S1752: one mutation clock for Car Notes caches/audits. All feature engines remain the SoT.
if(typeof CarNotesPerformance!=='undefined'&&typeof CarNotesPerformance.bump==='function')CarNotesPerformance.bump('save');
// s422g: guard di titik tunggal ini (bukan nambal tiap pemanggil save() satu-satu)
// supaya panel/kalkulasi turunan yang bergantung ke nilai aset/saldo akun (mis.
// Kekayaan Bersih) otomatis ikut refresh tiap ada mutasi data -- pola sama dgn
// invalidateAccBalCache() di atas.
// s422h: guard DOM (#kbNetWorth) SEBELUM manggil renderKekayaanBersih() --
// save() dipanggil dari SEMUA halaman, bukan cuma yang nampilin panel Kekayaan
// Bersih, dan renderBersih() (beda dari 3 guard cache di atas) beneran hitung
// ulang totalSaldoAkun()+totalAssetValue()+totalInventoriBisnisValue()+
// totalPiutangValue() tiap dipanggil (bukan cuma baca cache) -- guard ini bikin
// hitungan itu cuma jalan kalau panelnya memang lagi di-render, bukan di tiap
// mutasi data di halaman manapun.
// s422i: sengaja TIDAK menambahkan guard utk hitungZakatMaal() di sini (sempat
// ditambahkan lalu di-revert sesi ini) -- beda dari renderKekayaanBersih(),
// Zakat.hitungMaal() (modules/finance/pajak-pbb-zakat.js): (1) baca
// document.getElementById('zmUtang').value TANPA guard `if(el)` -- throw
// TypeError kalau modal Zakat Maal tidak sedang terbuka, yaitu praktis di
// SEMUA pemanggilan save() lain di seluruh app; (2) memanggil save() lagi di
// dalam dirinya sendiri (pz.utangJT=...; save();) -- kalau dipanggil dari
// save(), ini bikin rekursi save()->hitungZakatMaal()->save()->... tak
// terbatas. Auto-refresh Zakat Maal dari save() TIDAK dikerjakan sesi ini;
// perlu refactor Zakat.hitungMaal() dulu (pisahkan baca input DOM dari
// kalkulasi murni, hilangkan panggilan save() rekursif) sebelum aman
// digerbangi dari titik tunggal ini. Lihat FIX-...-s422i-*.md.
if(typeof renderKekayaanBersih==='function'&&typeof document!=='undefined'&&document.getElementById('kbNetWorth')){
const _tKB=(typeof performance!=='undefined'&&performance.now)?performance.now():0;
renderKekayaanBersih();
if(_tKB)_perfMark('save:KekayaanBersih',_tKB);
}
if(_saveDebounceTimer)clearTimeout(_saveDebounceTimer);
_saveDebounceTimer=setTimeout(()=>{_saveDebounceTimer=null;_saveImmediate();},400);
}
// saveFlush(): dipakai di titik KRITIS (tutup/background app, sebelum import/reset, sebelum
// upload backup Drive). Beda dari save() biasa: di sini localStorage['kw_v4'] TETAP ditulis
// sinkron sebagai jaring pengaman, karena IndexedDB async-nya belum tentu sempat commit kalau
// tab langsung ditutup/di-suspend setelah ini.
function saveFlush(){
if(_crossTabStateStale){if(!_crossTabWarnShown){_crossTabWarnShown=true;const _msg='⚠️ Tab ini memakai data lama setelah perubahan dari tab lain. Muat ulang aplikasi sebelum flush.';if(typeof toast==='function')toast(_msg,6500);else console.warn(_msg);}return false;}
if(_saveDebounceTimer){clearTimeout(_saveDebounceTimer);_saveDebounceTimer=null;}
// S1843 PERF: build the critical snapshot ONCE. Previously _saveImmediate() serialized D,
// then _buildSaveJson() ran a second full JSON.stringify(D) immediately for localStorage.
// Keep both durability paths, but reuse the exact same snapshot bytes.
const version=_saveStateVersion;
let json;
try{json=_getSaveSnapshotForVersion(version);}catch(e){console.error('Gagal menyiapkan data untuk flush:',e);return;}
// Keep the public hard-flush contract: saveFlush() must synchronously invoke
// _saveImmediate() once. Passing the already-built snapshot prevents a second
// JSON.stringify(D) while preserving the existing persistence queue/dedupe.
const persistStamp=_saveImmediate(json);
const localOk=_writeLocalSnapshot(json);
if(localOk)_markSavePersistMeta('local',persistStamp);
}
// P29: flush the latest synchronous snapshot at mobile/page lifecycle boundaries.
// visibilitychange is the primary signal on Android/iOS when an app is backgrounded;
// pagehide/beforeunload cover navigation/tab-close paths where supported. Guards keep
// isolated test harnesses and partial WebViews safe when document/window events are absent.
let _lifecycleFlushInstalled=false;
function _installPersistenceLifecycleFlush(){
if(_lifecycleFlushInstalled||typeof window==='undefined'||typeof document==='undefined')return;
_lifecycleFlushInstalled=true;
const flush=()=>{try{saveFlush();}catch(e){console.error('Gagal flush persistence saat lifecycle:',e);}};
if(typeof document.addEventListener==='function'){
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush();});
 document.addEventListener('freeze',flush);
}
if(typeof window.addEventListener==='function'){
 window.addEventListener('pagehide',flush);
 window.addEventListener('beforeunload',flush);
}
}
_installPersistenceLifecycleFlush();
// P30: detect writes coming from another app tab/window without blindly replacing
// in-memory D. Auto-merging a full finance snapshot is unsafe (it can silently
// delete changes made in the other tab), so cross-instance writes are surfaced as
// a stale-state warning and the current tab keeps its own state until the user
// reloads deliberately. BroadcastChannel covers modern Android/WebView; storage
// event covers browsers where a same-origin localStorage marker is available.
let _crossTabStateStale=false;
let _crossTabWarnShown=false;
let _crossTabChannel=null;
const _crossTabInstance='cn_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
function _markCrossTabStale(){
 if(_crossTabStateStale)return;
 _crossTabStateStale=true;
 if(!_crossTabWarnShown){
  _crossTabWarnShown=true;
  const msg='⚠️ Data aplikasi berubah dari tab/perangkat aplikasi lain. Tab ini tidak otomatis menimpa data tersebut. Muat ulang sebelum melakukan perubahan lanjutan agar data terbaru tetap aman.';
  if(typeof toast==='function')toast(msg,6500); else console.warn(msg);
 }
}
function _announcePersistenceWrite(){
 try{ if(typeof localStorage!=='undefined') localStorage.setItem('kw_v4_writer',_crossTabInstance+'|'+Date.now()); }catch(e){void e;}
 try{ if(_crossTabChannel) _crossTabChannel.postMessage({type:'kw-v4-write',source:_crossTabInstance,ts:Date.now()}); }catch(e){void e;}
}
function _installCrossTabPersistenceGuard(){
 if(typeof window==='undefined')return;
 if(typeof BroadcastChannel==='function'){
  try{
   _crossTabChannel=new BroadcastChannel('kw_v4_persistence');
   _crossTabChannel.addEventListener('message',e=>{if(e&&e.data&&e.data.type==='kw-v4-write'&&e.data.source!==_crossTabInstance)_markCrossTabStale();});
  }catch(e){_crossTabChannel=null;}
 }
 if(typeof window.addEventListener==='function'){
  window.addEventListener('storage',e=>{
   if(e&&e.key==='kw_v4_writer'&&e.newValue&&e.newValue.indexOf(_crossTabInstance+'|')!==0)_markCrossTabStale();
  });
 }
}
_installCrossTabPersistenceGuard();
let _lastUid=0;
function uid(){let n=Date.now();if(n<=_lastUid)n=_lastUid+1;_lastUid=n;return n;}
function sameId(a,b){return String(a)===String(b);}
function _dataActionClickHandler(e){
try{
const el = e.target.closest('[data-action]');
if(!el) return;
// FIX (audit UI/UX 2026-08, Ronde 7): sebagian tombol data-action (mis.
// #backupBadge) adalah <div>, bukan <button> -- properti .disabled pada div
// tidak berefek apa2 ke klik, jadi state busy yg dipasang _scanBtnBusy()
// (disabled=true + aria-busy) tidak akan mencegah dispatch ulang tanpa guard
// eksplisit ini. Cek dua2nya (disabled beneran utk <button>, aria-busy utk
// elemen non-form spt div/span) supaya konsisten utk semua jenis elemen.
// FIX (audit UI/UX 2026-08, Ronde 7): sebagian tombol data-action (mis.
// #backupBadge) adalah <div>, bukan <button> -- properti .disabled pada div
// tidak berefek apa2 ke klik, jadi state busy yg dipasang _scanBtnBusy()
// (dataset.scanBusy='1') tidak akan mencegah dispatch ulang tanpa guard
// eksplisit ini. Cek lewat dataset saja (bukan .disabled/.getAttribute)
// supaya konsisten dgn kontrak elemen yg dibaca handler ini (lihat
// tests/data-action-dispatcher-toast.test.js: elemen tiruan cuma py
// dataset+closest()).
if(el.dataset&&el.dataset.scanBusy==='1') return;
// S1984: disabled action controls must never dispatch, even when a WebView
// or synthetic click reaches the document listener. aria-disabled covers
// non-button controls that intentionally expose a disabled state.
if(el.disabled===true || (el.getAttribute&&el.getAttribute('aria-disabled')==='true')) return;
if(el.dataset.stop) e.stopPropagation();
{
const path = el.dataset.action.split('.');
let owner = window, fn = window;
for(const p of path){ owner = fn; fn = fn ? fn[p] : undefined; }
if(typeof fn !== 'function'){
// FIX (real E2E / lazy-module race): Renov & SewaKios sengaja lazy-load.
// Saat user mengetuk tombol segera setelah masuk ke sub-tab Aset/Proyek, render
// sudah bisa menampilkan markup lebih dulu sementara module promise masih pending.
// Dispatcher lama menganggap action hilang permanen -> toast "belum berfungsi".
// Retry tepat sekali setelah loader modul selesai, tanpa mengubah kontrak
// data-action dan tanpa membuat module eager-load kembali.
const lazyOwnerLoaders={
  Renov: typeof ensureRenov==='function'?ensureRenov:null,
  SewaKios: typeof ensureSewaKios==='function'?ensureSewaKios:null
};
const lazyLoader=path.length>1?lazyOwnerLoaders[path[0]]:null;
if(lazyLoader&&!el.dataset.lazyActionPending){
  el.dataset.lazyActionPending='1';
  Promise.resolve().then(()=>lazyLoader()).then(()=>{
    delete el.dataset.lazyActionPending;
    let retryOwner=window, retryFn=window;
    for(const p of path){ retryOwner=retryFn; retryFn=retryFn?retryFn[p]:undefined; }
    if(typeof retryFn!=='function'){
      console.error('data-action tetap tidak ditemukan setelah lazy-load:',el.dataset.action);
      if(typeof toast==='function') toast('⚠️ Tombol belum siap ('+el.dataset.action+'). Coba lagi.',5000);
      return;
    }
    let retryArgs=[];
    if(el.dataset.args){
      try{ retryArgs=JSON.parse(el.dataset.args); }
      catch(err){ console.error('data-args JSON tidak valid:',el.dataset.args,err); return; }
    }
    retryArgs=retryArgs.map(a=>{
      if(a==='$el')return el;
      if(a==='$event')return e;
      if(typeof a==='string'&&a.indexOf('$nav:')===0){
        const navItems=document.querySelectorAll('.nav-item');
        return navItems[Number(a.slice(5))]||null;
      }
      return a;
    });
    try{
      const retryResult=retryFn.apply(retryOwner,retryArgs);
      if(retryResult&&typeof retryResult.catch==='function'){
        el.dataset.pendingAction='1';
        retryResult.catch(err=>{
          console.error('[data-action] lazy retry async handler error:',el.dataset.action,err);
          if(typeof toast==='function') toast('⚠️ Gagal menjalankan "'+el.dataset.action+'": '+(err&&err.message?err.message:'error tidak diketahui'),5000);
        }).finally(()=>{delete el.dataset.pendingAction;});
      }
    }catch(err){
      console.error('[data-action] lazy retry handler error:',el.dataset.action,err);
      if(typeof toast==='function') toast('⚠️ Terjadi error saat memproses tombol.',4000);
    }
  }).catch(err=>{
    delete el.dataset.lazyActionPending;
    console.error('[data-action] lazy module load failed:',el.dataset.action,err);
    if(typeof toast==='function') toast('⚠️ Modul fitur belum dapat dimuat. Coba lagi.',5000);
  });
  return;
}
console.error('data-action tidak ditemukan/bukan fungsi:', el.dataset.action);
if(typeof toast==='function') toast('⚠️ Tombol ini belum berfungsi ('+el.dataset.action+'). Tolong laporkan ke pengembang.',5000);
return;
}
let args = [];
if(el.dataset.args){
try{ args = JSON.parse(el.dataset.args); }
catch(err){ console.error('data-args JSON tidak valid:', el.dataset.args, err); return; }
}
args = args.map(a=>{
if(a==='$el')return el;
if(a==='$event')return e;
if(typeof a==='string' && a.indexOf('$nav:')===0){
const navItems=document.querySelectorAll('.nav-item');
return navItems[Number(a.slice(5))]||null;
}
return a;
});
// BUGFIX (Fitur Scan Sparepart "tidak bisa dibuka, 0 toast"): fn di sini bisa
// berupa async function (mis. txStockScanPart/txStockScanPartGallery -> scan
// kamera/galeri sparepart). Untuk async function, error di dalamnya TIDAK
// pernah "throw" sinkron ke caller -- selalu jadi Promise yang REJECTED.
// try/catch di sekeliling fn.apply() ini HANYA menangkap error sinkron, jadi
// rejection dari action async lolos begitu saja jadi "unhandled promise
// rejection": tidak ada toast, tidak ada dialog, hanya baris merah di
// console yang user awam tidak pernah buka -- persis gejala "tombol scan
// tidak bisa dibuka, tidak ada error, 0 toast". Fix: tangkap Promise hasil
// fn.apply() (kalau ada) & munculkan toast yang sama seperti error sinkron.
// BUGFIX (audit "tombol Bayar/Riwayat macet, 0 toast", laporan user): dulu tidak ada
// guard apa pun terhadap klik ganda (double-tap) pada tombol yang action-nya async
// (mis. markBillPaid() -> askConfirm()/showPromptModal()). Double-tap memicu fn.apply()
// DUA KALI hampir bersamaan -> 2 pemanggilan concurrent ke dialog custom yang sama,
// yang (sebelum fix di modal-navigasi.js) saling menimpa resolver-nya & bikin salah satu
// nyangkut selamanya tanpa toast. Guard ini SATU baris pertahanan tambahan (independen
// dari fix antrean di modal-navigasi.js): selagi Promise dari action ini masih pending,
// klik ulang pada ELEMEN YANG SAMA diabaikan -- bukan didiamkan tanpa jejak (masih bisa
// diklik lagi normal begitu action pertama selesai/gagal).
if (el.dataset.pendingAction) return;
const result = fn.apply(owner, args);
if (result && typeof result.catch === 'function') {
el.dataset.pendingAction = '1';
result.catch((err) => {
console.error('[data-action] async handler error:', el.dataset.action, err);
if (typeof toast === 'function') toast('⚠️ Gagal menjalankan "' + el.dataset.action + '": ' + (err && err.message ? err.message : 'error tidak diketahui'), 5000);
}).finally(() => { delete el.dataset.pendingAction; });
}
}
}catch(err){
// BUGFIX (audit klik "0 reaksi"): sebelumnya tidak ada try/catch di sini -- kalau SATU
// action (mis. render() lanjutan setelah navigasi) throw, error itu bisa "membisukan"
// sisa proses klik itu tanpa jejak jelas ke user. Sekarang minimal selalu ke-log +
// dikasih toast, tidak pernah diam total.
console.error('[data-action] handler error:', err);
// SESI 649: sambungkan ke toggle "Debug Console" yang SUDAH ADA di
// Pengaturan (kw_debug_console, lihat modules/shared/debug-console.js) --
// bukan bikin toggle baru. Kalau lagi aktif, toast langsung kasih pesan+
// lokasi error persis (tanpa perlu buka console/eruda dulu, berguna di
// HP saat console susah diakses). Default (toggle mati) tetap toast
// generik seperti semula -- tidak ganggu pemakaian sehari-hari.
if(typeof localStorage!=='undefined' && localStorage.getItem('kw_debug_console')==='1'){
const _loc=err&&err.stack?String(err.stack).split('\n').slice(0,2).join(' | '):((err&&err.message)||String(err));
if(typeof toast==='function') toast('⚠️ DEBUG: '+_loc,9000);
}else{
if(typeof toast==='function') toast('⚠️ Terjadi error saat memproses tombol. Cek console.',4000);
}
}
}
// BUGFIX (audit klik "0 reaksi"): didaftarkan di CAPTURE phase (argumen ke-3 = true), bukan
// bubble phase seperti sebelumnya. Alasan: kalau ada elemen lain di antara target klik dan
// <document> yang memanggil e.stopPropagation() saat bubbling (mis. listener lain yang
// ditambah di sesi berikutnya untuk gesture/swipe/ripple), listener BUBBLE lama bisa tidak
// pernah kebagian giliran sama sekali -- closest('[data-action]') tidak pernah dievaluasi,
// hasilnya klik terasa "0 reaksi" total (tanpa toast/console error, karena kode di dalam
// dispatcher ini memang tidak pernah jalan). Capture phase berjalan LEBIH DULU dari listener
// manapun di bawahnya (termasuk yang stopPropagation di fase bubble), jadi data-action selalu
// diproses lebih dulu. Perilaku untuk kasus normal (tanpa listener lain yang mengganggu) 100%
// sama seperti sebelumnya -- 1x klik = 1x eksekusi action, tidak ada duplikasi.
document.addEventListener('click', _dataActionClickHandler, true);
if(typeof console!=='undefined' && console.debug) console.debug('[app] data-action click dispatcher terpasang (capture phase).');
// FIX (audit dropdown Kategori/Subkategori/autocomplete "tap 0 reaksi", CSP
// script-src-attr 'none'): item .suggest-item (saran kategori/subkategori/SPBU/
// catatan/pelanggan Shop dll) dulu di-generate dgn onclick=/ontouchstart= inline --
// attribute inline itu SEKARANG diblokir browser oleh CSP script-src-attr 'none'
// (lapisan pertahanan XSS ke-2, lihat app_production.html), jadi tap pada item saran
// 0 reaksi meski dropdown-nya kelihatan normal (bug dilaporkan lewat rekaman layar:
// item ter-highlight saat disentuh tapi field tetap kosong). Semua generator
// .suggest-item sudah dimigrasi ke data-action/data-args (pola yang sama dgn tombol
// lain di app) supaya lolos CSP -- dispatcher click di atas SUDAH cukup utk itu di
// desktop/mouse. Listener touchstart terpisah ini menjaga perilaku S1601/S1602 (lihat
// komentar _txCatOnBlur() di modules/finance/transaksi.js): di device sentuh, blur
// field input (yg memicu hideSuggestBox via setTimeout 150ms) bisa balapan dgn event
// click yg baru muncul setelah touchend -- preventDefault() pada touchstart menjalankan
// aksi SAAT ITU JUGA (sebelum blur sempat menutup dropdown/keyboard) & sekaligus
// mencegah browser mensintesis event click susulan utk elemen yg sama, jadi TIDAK ada
// dobel-eksekusi (mouse/desktop tetap lewat jalur click biasa krn tidak memicu
// touchstart sama sekali). Discoped KHUSUS ke '.suggest-item[data-action]' (bukan semua
// [data-action]) supaya tombol data-action lain (yg tidak punya masalah race blur ini)
// tidak ikut berubah perilaku.
document.addEventListener('touchstart', function(e){
const el = e.target.closest('.suggest-item[data-action]');
if(!el) return;
if(el.dataset && el.dataset.scanBusy==='1') return;
e.preventDefault();
_dataActionClickHandler(e);
}, {capture:true, passive:false});
if(typeof console!=='undefined' && console.debug) console.debug('[app] .suggest-item touchstart dispatcher terpasang (capture phase).');
// SA1 (s741): fondasi dispatcher `data-oninput`/`data-onchange` -- 89 dari 90
// inline handler yang mau dimigrasi (SA2-SA9) justru oninput/onchange, bukan
// click, dan _dataActionClickHandler di atas cuma menangkap event click.
// Dibangun SEBELUM index.html disentuh supaya sesi migrasi per-halaman
// berikutnya tinggal ganti atribut tanpa perlu mikirin infrastruktur.
// Sengaja DIPISAH TOTAL dari _dataActionClickHandler (bukan direfactor jadi
// 1 fungsi generik) supaya dispatcher click yang sudah stabil & terkunci
// test tidak ikut berisiko di sesi fondasi ini.
function _dataActionResolveArgs(argsRaw, el, e){
let args = [];
if(argsRaw){
try{ args = JSON.parse(argsRaw); }
catch(err){ console.error('data-oninput/data-onchange args JSON tidak valid:', argsRaw, err); return null; }
}
return args.map(a=>{
if(a==='$el') return el;
if(a==='$event') return e;
if(a==='$value') return el.value;
if(a==='$checked') return el.checked;
if(typeof a==='string' && a.indexOf('$nav:')===0){
const navItems=document.querySelectorAll('.nav-item');
return navItems[Number(a.slice(5))]||null;
}
return a;
});
}
function _dataActionInputChangeHandler(e){
try{
// SA1-REKONSTRUKSI (sesi lanjutan): dispatcher awalnya cuma menangani
// 'input'/'change'. Diperluas ke 'blur'/'keydown' (event.type -> atribut
// data-* yang sesuai) untuk menutup 3 dari 5 inline handler yang ditemukan
// DI LUAR cakupan audit 92 (lihat SESSION-NOTE-SA1-REKONSTRUKSI-BASELINE.md
// bagian "Temuan tambahan"): #dsExtra/#aaDana (onblur) & #chatInput
// (onkeydown). Pola resolve & error handling tetap identik, cuma nama
// atribut yang dibaca yang berbeda per event.type.
const attrName = {input:'oninput', change:'onchange', blur:'onblur', keydown:'onkeydown', focus:'onfocus'}[e.type];
if(!attrName) return;
const el = e.target.closest('[data-'+attrName+']');
if(!el) return;
const namesRaw = el.dataset[attrName];
if(!namesRaw) return;
const argsRaw = el.dataset[attrName+'Args'];
const args = _dataActionResolveArgs(argsRaw, el, e);
// JSON args tidak valid -> silent no-op (bukan throw): _dataActionResolveArgs
// sudah console.error sendiri, di sini cukup berhenti tanpa toast supaya
// user tidak dibanjiri toast tiap kali mengetik di input yang argsnya salah.
if(args===null) return;
// SESI (konversi simpleAutocompleteInput data-onfocus, 10 field txCat/txSubCat-style):
// data-onfocus-args mengirim nama variabel daftar saran (mis. "acTxNotes") sebagai
// STRING biasa di JSON (bukan referensi array -- JSON tidak bisa membawa referensi
// variabel), karena simpleAutocompleteInput(fieldId, boxId, list) butuh ARRAY asli
// di parameter ke-3, bukan nama variabelnya. Di sinilah satu-satunya tempat
// stringnya di-dereference ke variabel global aslinya -- khusus utk fungsi ini saja,
// supaya _dataActionResolveArgs generik di atas TIDAK perlu tahu soal konvensi
// "nama variabel list" ini (yang cuma dipakai simpleAutocompleteInput).
if(namesRaw.trim()==='simpleAutocompleteInput' && args.length>=3 && typeof args[2]==='string' && typeof window[args[2]]!=='undefined'){
args[2] = window[args[2]];
}
// Dukung comma-separated function names (mis. inline lama
// `onTipeGajiChange();autoSaveProfile()` -> data-onchange="onTipeGajiChange,autoSaveProfile"),
// urutan eksekusi dipertahankan persis seperti urutan pemanggilan inline asli.
const names = namesRaw.split(',');
for(const rawName of names){
const name = rawName.trim();
const path = name.split('.');
let owner = window, fn = window;
for(const p of path){ owner = fn; fn = fn ? fn[p] : undefined; }
if(typeof fn !== 'function'){
console.error('data-'+attrName+' tidak ditemukan/bukan fungsi:', name);
if(typeof toast==='function') toast('⚠️ Input ini belum berfungsi ('+name+'). Tolong laporkan ke pengembang.',5000);
continue;
}
try{
const result = fn.apply(owner, args);
if(result && typeof result.catch==='function'){
result.catch((err)=>{
console.error('[data-'+attrName+'] async handler error:', name, err);
if(typeof toast==='function') toast('⚠️ Gagal menjalankan "'+name+'": '+(err && err.message ? err.message : 'error tidak diketahui'), 5000);
});
}
}catch(err){
console.error('[data-'+attrName+'] handler error:', name, err);
if(typeof localStorage!=='undefined' && localStorage.getItem('kw_debug_console')==='1'){
const _loc=err&&err.stack?String(err.stack).split('\n').slice(0,2).join(' | '):((err&&err.message)||String(err));
if(typeof toast==='function') toast('⚠️ DEBUG: '+_loc,9000);
}else{
if(typeof toast==='function') toast('⚠️ Terjadi error saat memproses input. Cek console.',4000);
}
}
}
}catch(err){
console.error('[data-oninput/data-onchange] handler error:', err);
if(typeof toast==='function') toast('⚠️ Terjadi error saat memproses input. Cek console.',4000);
}
}
// Dipasang di document utk event 'input' DAN 'change', capture phase --
// pola sama seperti dispatcher click di atas (lihat komentar di
// document.addEventListener('click', ...) soal alasan capture phase).
document.addEventListener('input', _dataActionInputChangeHandler, true);
document.addEventListener('change', _dataActionInputChangeHandler, true);
// SA1-REKONSTRUKSI (sesi lanjutan): 'blur' & 'keydown' TIDAK bubble, tapi
// capture phase tetap menangkapnya turun ke elemen manapun di bawah
// document (blur/keydown punya bubbles:false tapi capture:true di spec DOM),
// jadi listener document-level dgn capture=true ini tetap benar utk kasus ini.
document.addEventListener('blur', _dataActionInputChangeHandler, true);
document.addEventListener('keydown', _dataActionInputChangeHandler, true);
// FIX (audit txCat/txSubCat dropdown hilang): 'focus' juga TIDAK bubble (sama
// spt blur), tapi capture phase document-level tetap menangkapnya turun ke
// elemen manapun -- pola identik dgn blur/keydown di atas. Diperlukan supaya
// atribut data-onfocus= (pengganti inline onfocus=) ikut ke-dispatch; tanpa ini
// field yg konversi ke data-onfocus= kehilangan trigger buka-dropdown saat
// pertama kali di-tap (cuma jalan saat mulai ngetik lewat data-oninput=).
document.addEventListener('focus', _dataActionInputChangeHandler, true);
if(typeof console!=='undefined' && console.debug) console.debug('[app] data-oninput/data-onchange/data-onblur/data-onkeydown/data-onfocus dispatcher terpasang (capture phase).');
function migrateShopCategory(){
let incCat=D.categories.income.find(c=>c.id==='cat_cb'||/^bisnis cobek$/i.test(c.name)||/^bisnis$/i.test(c.name));
if(incCat){
const oldName=incCat.name;
incCat.name='Bisnis';
if(!incCat.subs)incCat.subs=[];
if(!incCat.subs.find(s=>/^cobek$/i.test(s.name))) incCat.subs.push({id:'sub_cb_cobek',name:'Cobek'});
if(/^bisnis cobek$/i.test(oldName)){
D.transactions.forEach(t=>{
if(t.type==='income'&&t.category===oldName){t.category='Bisnis';if(!t.subcategory)t.subcategory='Cobek';}
});
}
}
let expCat=D.categories.expense.find(c=>c.id==='cat_cbb'||/^belanja stok cobek$/i.test(c.name)||/^bisnis$/i.test(c.name));
if(expCat){
const oldName=expCat.name;
expCat.name='Bisnis';
if(!expCat.subs)expCat.subs=[];
if(!expCat.subs.find(s=>/^cobek$/i.test(s.name))) expCat.subs.push({id:'sub_cbb_cobek',name:'Cobek'});
if(/^belanja stok cobek$/i.test(oldName)){
D.transactions.forEach(t=>{
if(t.type==='expense'&&t.category===oldName){t.category='Bisnis';if(!t.subcategory)t.subcategory='Cobek';}
});
}
}
}
async function load(){
try{
let s=null, fromIdb=false, idbRaw=null, lsRaw=null;
// P31: recovery source-by-source. Snapshot IDB yang corrupt TIDAK boleh
// langsung menghentikan startup bila localStorage masih punya snapshot valid.
// Sebaliknya, localStorage yang corrupt juga tidak boleh menghalangi IDB valid.
// Ini mencegah satu media penyimpanan rusak membuat data valid di media lain
// tidak pernah dicoba.
try{
const idbVal=await IDBStore.get('kw_v4_mirror');
if(idbVal) idbRaw=idbVal;
}catch(e){ console.error('Gagal baca IndexedDB, coba localStorage:',e); }
try{
if(typeof localStorage!=='undefined') lsRaw=localStorage.getItem('kw_v4');
}catch(e){ console.error('Gagal baca localStorage:',e); }
const _parseStoredSnapshot=(raw,label)=>{
if(!raw)return null;
try{
const parsed=JSON.parse(raw);
if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('root snapshot bukan object');
return parsed;
}catch(parseErr){
console.error('Snapshot '+label+' corrupt/tidak terbaca:',parseErr);
return null;
}
};
let p=null;
if(idbRaw){
 p=_parseStoredSnapshot(idbRaw,'IndexedDB');
 if(p) fromIdb=true;
}
if(!p&&lsRaw){
 p=_parseStoredSnapshot(lsRaw,'localStorage');
 if(p){
  s=lsRaw;
  // Jangan set fromIdb: snapshot LS yang lolos recovery perlu dimigrasikan
  // kembali ke mirror IDB, tetapi hanya setelah JSON tervalidasi.
 }
}
if(idbRaw&&lsRaw){
 try{const _pm=_readSavePersistMeta();if(_pm.localTs>_pm.idbTs){const _lp=_parseStoredSnapshot(lsRaw,'localStorage-newer');if(_lp){p=_lp;s=lsRaw;fromIdb=false;}}}catch(e){void e;}
}
if(!p){
 if(idbRaw||lsRaw){
  const msg='Data tersimpan di HP ini tidak dapat dibaca dari IndexedDB maupun localStorage (corrupt). Aplikasi akan dibuka dengan data kosong agar tidak error.\n\nKalau punya file backup (.json) dari menu Pengaturan → Backup, silakan import ulang lewat menu tersebut setelah aplikasi terbuka.';
  console.error(msg);
  showAlertModal(msg,{icon:'⚠️',title:'Data Tersimpan Rusak'});
 }
 return;
}
if(p){
D={...D,...p};
if(!fromIdb) IDBStore.set('kw_v4_mirror',s||lsRaw).catch(e=>console.error('Gagal memulihkan mirror IndexedDB dari localStorage:',e));
// Sesi B (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §4 Fase 1 poin 2):
// muat Vehicle Database aktif dari IndexedDB SEBELUM migrasi jalan --
// migrasi toVersion:11 (DatabaseAPI.vehicleModel.findByName) baca dari
// VEHICLE_MODELS (statis, tidak berubah oleh langkah ini), jadi urutan ini
// tidak wajib untuknya, tapi ditaruh di sini (bukan di titik lain) supaya
// SATU tempat startup yang menjamin Vehicle Database siap sebelum fitur
// lain (Servis dkk) mulai baca -- pola guard sama seperti pemanggilan
// migrasi lain di load(), 0 efek ke app kalau DatabaseAPI belum termuat
// (mis. build tanpa modul ini ikut, atau test terisolasi).
if(typeof DatabaseAPI!=='undefined'&&DatabaseAPI.vehicle&&typeof DatabaseAPI.vehicle.ensureLoaded==='function'){
try{ await DatabaseAPI.vehicle.ensureLoaded(); }
catch(e){ console.error('Gagal ensureLoaded DatabaseAPI.vehicle:',e); }
}
// Canonical 13-category/50-component service master. Reuse the existing IDBStore
// infrastructure; the master is loaded before service UI/reminder consumers run.
if(typeof ServiceMasterDB!=='undefined'&&ServiceMasterDB&&typeof ServiceMasterDB.ensureLoaded==='function'){
try{ await ServiceMasterDB.ensureLoaded(); }
catch(e){ console.error('Gagal ensureLoaded ServiceMasterDB:',e); }
}
const _fromSchemaVersion=D.schemaVersion===undefined?0:D.schemaVersion;
runDataMigrations(_fromSchemaVersion);
if(!D.categories) D.categories={income:JSON.parse(JSON.stringify(DEFAULT_CATS.income)),expense:JSON.parse(JSON.stringify(DEFAULT_CATS.expense))};
if(!D.accounts || !D.accounts.length) D.accounts=JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
if(!D.pajakZakat) D.pajakZakat={hargaEmasPerGram:2640000,nisabPenghasilanBulan:7640144,nisabPenghasilanTahun:91681728,zakatFitrahPerJiwa:37500,haulMaalMulai:null,zakatLog:[]};
// Sesi 749: referensi harga BBM nasional (1 angka per jenis) dipakai FuelPriceRef
// (modules/vehicle/fuel-price-ref.js) — pola sama persis D.pajakZakat di atas.
// Sesi S757-followup5: Pertalite & Bio Solar diseed dgn harga subsidi resmi nasional
// (flat, tidak berubah per SPBU/wilayah, beda dgn 4 jenis nonsubsidi lain yg sengaja
// dibiarkan null krn berubah tiap bulan & beda per provinsi -- lihat rekomendasi sesi
// ini). User BARU (belum py D.fuelPriceRef sama sekali) langsung dapat 2 angka ini.
if(!D.fuelPriceRef) D.fuelPriceRef={pertalite:10000,pertamax:null,pertamaxTurbo:null,pertaminaDex:null,dexlite:null,solar:6800,lastType:'pertalite',lastTypeByVehicle:{},lastCheckedAt:null,refSources:{pertalite:{source:'Harga BBM subsidi resmi Pertamina/BPH Migas (seed awal aplikasi)',tanggal:todayStr()},solar:{source:'Harga Bio Solar subsidi resmi Pertamina/BPH Migas (seed awal aplikasi)',tanggal:todayStr()}}};
// User LAMA (D.fuelPriceRef sudah ada dari sebelum seed ini ditambahkan): seed HANYA
// kalau field itu masih null DAN belum py refSources tersimpan (artinya user belum
// pernah isi manual atau Cek Update via AI utk jenis itu) -- supaya tidak menimpa
// data yg sudah ada/sengaja dikosongkan.
// ⚠️ REMINDER (baca ini kalau nilai di bawah kelihatan basi): 10000/6800 di
// baris-baris seed ini adalah SNAPSHOT MANUAL, BUKAN data live -- kalau
// pemerintah merevisi harga Pertalite/Bio Solar subsidi, kedua angka ini
// (di 3 titik: default D.fuelPriceRef di atas + 2 blok migrasi user lama di
// bawah) WAJIB diupdate manual di source. Detail & checklist lengkap ada di
// docs/REMINDER-UPDATE-HARGA-SUBSIDI-BBM.md.
if(!D.fuelPriceRef.refSources) D.fuelPriceRef.refSources={};
if((D.fuelPriceRef.pertalite===null||D.fuelPriceRef.pertalite===undefined)&&!D.fuelPriceRef.refSources.pertalite){
D.fuelPriceRef.pertalite=10000;
D.fuelPriceRef.refSources.pertalite={source:'Harga BBM subsidi resmi Pertamina/BPH Migas (seed awal aplikasi)',tanggal:todayStr()};
}
if((D.fuelPriceRef.solar===null||D.fuelPriceRef.solar===undefined)&&!D.fuelPriceRef.refSources.solar){
D.fuelPriceRef.solar=6800;
D.fuelPriceRef.refSources.solar={source:'Harga Bio Solar subsidi resmi Pertamina/BPH Migas (seed awal aplikasi)',tanggal:todayStr()};
}
if(!D.pajakZakat.zakatLog) D.pajakZakat.zakatLog=[];
if(!D.pajakZakat.pbb) D.pajakZakat.pbb={njoptkp:10000000,tarifPersen:0.5};
if(D.pajakZakat.pbb.njoptkp===undefined) D.pajakZakat.pbb.njoptkp=10000000;
if(D.pajakZakat.pbb.tarifPersen===undefined) D.pajakZakat.pbb.tarifPersen=0.5;
if(D.pajakZakat.pphBrutoBulan===undefined) D.pajakZakat.pphBrutoBulan=0;
if(D.pajakZakat.pphIuranBulan===undefined) D.pajakZakat.pphIuranBulan=0;
if(D.pajakZakat.refCheckedAt===undefined) D.pajakZakat.refCheckedAt=null;
if(!D.pajakZakat.refSources) D.pajakZakat.refSources={};
if(D.pajakZakat.simTarifA===undefined) D.pajakZakat.simTarifA=80000;
if(D.pajakZakat.simTarifB1===undefined) D.pajakZakat.simTarifB1=80000;
if(D.pajakZakat.simTarifB2===undefined) D.pajakZakat.simTarifB2=80000;
if(D.pajakZakat.simTarifC===undefined) D.pajakZakat.simTarifC=75000;
if(D.pajakZakat.simTarifC1===undefined) D.pajakZakat.simTarifC1=75000;
if(D.pajakZakat.simTarifC2===undefined) D.pajakZakat.simTarifC2=75000;
if(D.pajakZakat.simTarifD===undefined) D.pajakZakat.simTarifD=30000;
if(!D.assets) D.assets=[];
if(!D.piutang) D.piutang=[];
if(!D.inventoryTransfers) D.inventoryTransfers=[];
if(!D.productMovementOverride) D.productMovementOverride={};
// Sesi 378 — Purchase Order (record beli dari supplier, module Inventory
// Movement lanjutan S377). Pola migration guard SAMA PERSIS inventoryTransfers.
if(!D.purchaseOrders) D.purchaseOrders=[];
// Sesi s478 — Koreksi Stok / Stok Opname (module Inventory Movement lanjutan).
// Pola migration guard SAMA PERSIS purchaseOrders di atas.
if(!D.productStockCorrections) D.productStockCorrections=[];
if(!D.debts) D.debts=[];
D.debts.forEach(d=>{try{if(typeof Debt!=='undefined')Debt.syncBill(d);}catch(e){void e;}});
if(!D.renovProjects) D.renovProjects=[];
if(!D.sewaKios) D.sewaKios={units:[]};
if(!D.sewaKios.units) D.sewaKios.units=[];
D.sewaKios.units.forEach(u=>{if(!u.riwayat)u.riwayat=[];if(!u.statusLog||!u.statusLog.length)u.statusLog=[{status:u.status,tanggal:u.mulai||todayStr()}];});
if(!D.wishlist) D.wishlist=[];
if(!D.finansialFreedom) D.finansialFreedom={expenseCatIds:[],avgMonths:6,swr:4,assumsiReturn:8,assumsiInflasi:5};
if(D.finansialFreedom.expenseCatIds===undefined) D.finansialFreedom.expenseCatIds=[];
if(D.finansialFreedom.avgMonths===undefined) D.finansialFreedom.avgMonths=6;
if(D.finansialFreedom.swr===undefined) D.finansialFreedom.swr=4;
if(D.finansialFreedom.assumsiReturn===undefined) D.finansialFreedom.assumsiReturn=8;
if(D.finansialFreedom.assumsiInflasi===undefined) D.finansialFreedom.assumsiInflasi=5;
if(!D.finansialFreedom.assetScope) D.finansialFreedom.assetScope='zakatable';
if(!isFinite(Number(D.finansialFreedom.scenarioRange))||Number(D.finansialFreedom.scenarioRange)<0.5||Number(D.finansialFreedom.scenarioRange)>15) D.finansialFreedom.scenarioRange=2;
if(!D.wealthSnapshots) D.wealthSnapshots=[];
if(!D.refleksi) D.refleksi={gratitude:[],selfCareLog:{},privateNotes:[]};
if(!D.refleksi.gratitude) D.refleksi.gratitude=[];
if(!D.refleksi.selfCareLog) D.refleksi.selfCareLog={};
if(!D.refleksi.privateNotes) D.refleksi.privateNotes=[];
if(!D.pensiun) D.pensiun={aktif:false,usiaSekarang:null,usiaPensiun:58,targetDana:0,returnTahunan:6,accId:'',kontribusiBulanan:0,rekoPersen:20,rekoBulan:3,riwayatKontribusi:[]};
if(D.pensiun.usiaSekarang===undefined) D.pensiun.usiaSekarang=null;
if(D.pensiun.usiaPensiun===undefined) D.pensiun.usiaPensiun=58;
if(D.pensiun.targetDana===undefined) D.pensiun.targetDana=0;
if(D.pensiun.returnTahunan===undefined) D.pensiun.returnTahunan=6;
if(D.pensiun.accId===undefined) D.pensiun.accId='';
if(D.pensiun.kontribusiBulanan===undefined) D.pensiun.kontribusiBulanan=0;
if(D.pensiun.rekoPersen===undefined) D.pensiun.rekoPersen=20;
if(D.pensiun.rekoBulan===undefined) D.pensiun.rekoBulan=3;
if(!D.pensiun.riwayatKontribusi) D.pensiun.riwayatKontribusi=[];
if(D.profile&&D.profile.tanggalLahir===undefined) D.profile.tanggalLahir=null;
if(D.profile&&D.profile.statusKawin===undefined) D.profile.statusKawin=false;
if(D.profile&&D.profile.tanggungan===undefined) D.profile.tanggungan=0;
if(D.profile&&D.profile.statusPekerjaan===undefined) D.profile.statusPekerjaan=null;
if(!D.bills) D.bills=[];
if(!D.billsArchive) D.billsArchive=[];
if(!D.vehicles||!D.vehicles.length) D.vehicles=[{id:'veh_1',name:'Vario 125',emoji:'🏍️',serviceIntervalKm:3000,modelId:'vario-125'}];
D.vehicles.forEach(v=>{if(!v.serviceIntervalKm)v.serviceIntervalKm=3000;});
if(!D.torsiChecklist||typeof D.torsiChecklist!=='object'||Array.isArray(D.torsiChecklist)) D.torsiChecklist={};
// Sesi "Revisi migrasi" (torsi-vehicle-selector, Bagian A): migrasi jaring
// pengaman D.torsiChecklist flat->per-kendaraan SUDAH ditangani otomatis
// lewat DATA_MIGRATIONS (toVersion:4) + runDataMigrations() di atas (baris
// ~318, dipanggil SEBELUM blok default ini) -- lihat
// TorsiVehicleAPI._migrateFlatToPerVehicle(). Tidak perlu pemanggilan ad hoc
// terpisah di sini lagi (dulu initTorsiVehicleMigration() + flag
// D._migratedTorsiVehicle, sekarang dihapus).
if(!D.simList) D.simList=[];
if(!D.bbmLogs) D.bbmLogs=[];
if(!D.servisLogs) D.servisLogs=[];
if(!D.jalanLogs) D.jalanLogs=[];
if(!D.kmLogs) D.kmLogs=[];
if(!D.sparepartCats||!D.sparepartCats.length) D.sparepartCats=JSON.parse(JSON.stringify(DEFAULT_SPAREPARTS));
D.sparepartCats.forEach(c=>{if(!c.code)c.code=codeFromName(c.name);});
if(!D.partsStock) D.partsStock=[];
if(!D.workDays) D.workDays=[];
if(!D.payrollDismissedWeeks) D.payrollDismissedWeeks=[];
if(!D.gajiMingguanHistory) D.gajiMingguanHistory=[];
if(!D.tukangWorkers) D.tukangWorkers=[];
if(!D.tukangAbsensi) D.tukangAbsensi=[];
if(!D.aiWidgetReport) D.aiWidgetReport=null;
if(D.lastResetPromptDate===undefined) D.lastResetPromptDate=null;
if(!D.products) D.products=[];
if(!D.produsen) D.produsen=[];
if(!D.cobekKategori||!D.cobekKategori.length) D.cobekKategori=JSON.parse(JSON.stringify(DEFAULT_COBEK_KATEGORI));
D.products.forEach(p=>{if(!p.hargaByProdusen)p.hargaByProdusen={};if(p.kategoriId===undefined)p.kategoriId='';if(p.produsenId===undefined)p.produsenId='';});
if(!D.categories.expense.some(c=>c.id==='cat_cbb'||/^bisnis$/i.test(c.name))){
D.categories.expense.push({id:'cat_cbb',name:'Bisnis',emoji:'🪨',subs:[{id:'sub_cbb_cobek',name:'Cobek'}]});
}
migrateShopCategory();
if(!D.cobek) D.cobek=[];
if(!D.targets) D.targets=[];
if(!D.eduFunds) D.eduFunds=[];
if(D.profile&&D.profile.lemburMultiplier==null) D.profile.lemburMultiplier=1.5;
if(D.profile&&D.profile.tarifMinggu==null) D.profile.tarifMinggu=139000;
if(!D.reminders) D.reminders=[];
if(!D.chatHistory) D.chatHistory=[];
if(!D.budgets) D.budgets=[];
D.budgets.forEach(b=>{if(!b.catIds){b.catIds=b.catId?[b.catId]:['__total__'];}});
D.budgets.forEach(b=>{if(!b.period)b.period='bulanan';});
if(D.ldrCycleStart===undefined) D.ldrCycleStart=null;
if(!D.notifSettings) D.notifSettings={enabled:false,billDays:3,ldrDays:3};
if(!D.googleDrive) D.googleDrive={clientId:'',fileId:null,lastSync:null,autoSync:false};
if(!D.archiveHistory) D.archiveHistory=[];
if(!D.lifeBalanceSnapshots) D.lifeBalanceSnapshots=[];
D.cobek.forEach(c=>{if(c.delivered===undefined)c.delivered=true;});
['income','expense'].forEach(t=>{D.categories[t].forEach(c=>{if(!c.subs)c.subs=[];});});
['income','expense'].forEach(type=>{
const seen={};
D.categories[type].forEach(c=>{
const key=c.name.trim().toLowerCase();
if(seen[key]){
(c.subs||[]).forEach(s=>{
if(!seen[key].subs.find(x=>x.name.trim().toLowerCase()===s.name.trim().toLowerCase())){
seen[key].subs.push(s);
}
});
} else {
seen[key]=c;
}
});
D.categories[type]=Object.values(seen);
});
if(D.categories.expense.some(c=>c.id==='cat_kn')){
D.categories.expense=D.categories.expense.filter(c=>c.id!=='cat_kn');
}
(function(){
const vehNames=(D.vehicles||[]).map(v=>v.name.trim().toLowerCase());
D.categories.expense.forEach(c=>{
const nameLc=c.name.trim().toLowerCase();
if(vehNames.includes(nameLc)||/^transport$/i.test(c.name)){
if(!c.subs)c.subs=[];
['Bensin','Servis & Oli','Pajak'].forEach(subName=>{
if(!c.subs.find(s=>s.name.trim().toLowerCase()===subName.toLowerCase())){
c.subs.push({id:'sub_'+subName.toLowerCase().replace(/[^a-z0-9]+/g,'_')+'_'+uid(),name:subName});
}
});
}
});
})();
}
}catch(e){
console.error('Gagal load data:',e);
showAlertModal('Terjadi error saat membuka data tersimpan: '+(e&&e.message?e.message:'unknown'),{icon:'⚠️',title:'Gagal Membuka Data'});
}
}
function todayStr(){const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');}
// addMonthsClamped() — BUG-015 (s406): pengganti pola native `d.setMonth(d.getMonth()+n)` yang
// dipakai di berbagai tempat untuk menghitung jatuh tempo bulanan berikutnya (cicilan/langganan/
// tagihan/sewa). Masalahnya: Date.setMonth() TIDAK clamp -- kalau tanggal asal tidak ada di bulan
// tujuan (mis. 31 Jan +1 bulan -> Februari cuma py 28/29 hari), JS overflow otomatis ke bulan
// berikutnya (31 Jan -> 3 Mar, BUKAN 28/29 Feb seperti ekspektasi user). Fungsi ini mereplikasi
// hasil kalender yang wajar: clamp ke hari TERAKHIR bulan tujuan kalau hari asal melebihi jumlah
// hari bulan itu (31 Jan -> 28 Feb / 29 Feb kabisat -> 31 Mar dst). Berlaku juga utk months negatif
// (mundur -1 bulan, dipakai di jalur "batalkan pembayaran" tagihan-kalender.js).
// Mutasi in-place & return objek Date yang sama (bukan clone baru) supaya kompatibel drop-in dgn
// pola pemanggilan lama `d.setMonth(...)` yang sering dipakai di tengah ekspresi/const d.
// Algoritma: geser dulu ke tanggal 1 (setDate(1)) SEBELUM setMonth() supaya perpindahan bulan itu
// sendiri tidak pernah overflow (tanggal 1 selalu valid di bulan manapun), baru hitung jumlah hari
// di bulan tujuan lalu clamp tanggal asli ke situ.
function addMonthsClamped(base,months){
if(!(base instanceof Date)||isNaN(base.getTime()))return base;
const day=base.getDate();
base.setDate(1);
base.setMonth(base.getMonth()+months);
const lastDayOfTargetMonth=new Date(base.getFullYear(),base.getMonth()+1,0).getDate();
base.setDate(Math.min(day,lastDayOfTargetMonth));
return base;
}
function applyDashHubMainGridDefaultCollapse(){
let prefs={};
try{prefs=JSON.parse(localStorage.getItem('cardCollapsePrefs')||'{}');}catch(e){void e;}
if('dashHubMainGrid' in prefs)return; // user sudah pernah pilih manual, hormati pilihannya
const body=document.getElementById('dashHubMainGrid-cbody');
const chev=document.getElementById('dashHubMainGrid-chev');
if(body)body.classList.add('collapsed');
if(chev)chev.classList.add('collapsed');
}
function showMain(){
const onboard=document.getElementById('onboard'); if(onboard) onboard.style.display='none';
const pinScreen=document.getElementById('pinScreen'); if(pinScreen){pinScreen.style.display='none';pinScreen.classList.add('u-dnone');}
const mh=document.getElementById('mainHeader'); if(mh){mh.classList.remove('u-dnone');mh.style.display='flex';}
const ma=document.getElementById('mainApp'); if(ma){ma.classList.remove('u-dnone');ma.style.display='block';}
const mn=document.getElementById('mainNav'); if(mn){mn.classList.remove('u-dnone');mn.style.display='flex';}
document.getElementById('hNama').textContent=D.profile.nama||'W';
applyEffectiveTheme();
applyCardCollapsePrefs();
applyDashHubMainGridDefaultCollapse();
autoSnapshotWealthIfNeeded();
autoSnapshotLifeBalanceIfNeeded();
// PERF (unblock PIN-unlock freeze): sebelumnya renderDashboard()+checkBackup()+checkBills()+
// populateCatFilter()+populateAccFilters()+renderSiapPulang()+checkAndFireReminders() semuanya
// jalan SINKRON balik ke belakang di sini sebelum layar PIN sempat hilang dari layar — makin
// banyak transaksi/data, makin kerasa jedanya (freeze sesaat pas PIN benar). renderDashboard()
// sendiri sudah dipecah: bagian intinya (kartu ringkasan/DASH_RENDER_ORDER) tetap sinkron di sini
// supaya Beranda langsung kelihatan, sedangkan ~25 presenter tambahannya dijadwalkan lewat
// runDeferredOrNow() di dalam modules-render.js (lihat catatan di sana). 6 pemanggilan di bawah
// ini (checkBackup/checkBills/populateCatFilter/populateAccFilters/renderSiapPulang/
// checkAndFireReminders) BUKAN bagian dari tampilan inti Beranda yang langsung terlihat (populate
// filter dipakai di halaman Laporan, checkBackup/checkBills/checkAndFireReminders cuma
// menampilkan banner/notifikasi, renderSiapPulang widget halaman Shop) — jadi disusulkan lewat
// runDeferredOrNow() yang sama supaya tidak ikut menahan cat pertama Beranda. refreshCurrentPage()
// TETAP sinkron (di bawah, tidak berubah) krn itu yang benar-benar merender halaman aktif yang
// sedang dilihat user. 0 perubahan logika/hasil masing-masing fungsi — cuma KAPAN dipanggil.
//
// GAP FIX (Sesi 135): renderDashboard() DI SINI selalu dipanggil SINKRON tanpa syarat — padahal
// `page-dashboard` (Beranda) BUKAN landing page default; landing page default adalah
// `page-dashboard-hub` (lihat docs/PROJECT_STATE.md), yang
// dirender lewat refreshCurrentPage() beberapa baris di bawah (renderPageContent('dashboard-hub')
// -> DashboardHub.render(), sendiri sinkron & berat: bangun ulang seluruh grid fitur + 15+
// presenter). Jadi pada kasus paling umum (buka app dari kondisi tertutup, PIN muncul di landing
// page default) baris renderDashboard() di sini menghitung & menggambar SELURUH konten Beranda
// (Advisor/LifeBalance/AIWidget/FinCoach/AIRecommendCard/AIDailyBriefingCard/loop
// DASH_RENDER_ORDER 17 kartu) ke halaman yang TIDAK kelihatan sama sekali (ketutup halaman
// Dashboard Hub) — kerja terbuang persis sebelum DashboardHub.render() yang justru berat & yang
// BENERAN dilihat user. Sebaliknya kalau Beranda memang halaman aktif (PIN cuma overlay, BUKAN
// reload, jadi .page.active tetap keingat kalau user lagi di Beranda saat mengunci app),
// renderDashboard() di sini JUSTRU dobel dgn refreshCurrentPage() -> renderPageContent('dashboard')
// -> renderDashboard() lagi beberapa baris di bawah (gap yang sama, sudah ada dari sebelum sesi
// ini, ikut dibereskan sekalian). Solusi: kalau Beranda aktif, biarkan refreshCurrentPage() yang
// merender (BUKAN dihapus, cuma dipindah biar 1x saja) — tetap sinkron & sama-sama di tick yang
// sama jadi TIDAK ada regresi "Beranda langsung kelihatan". Kalau Beranda TIDAK aktif,
// renderDashboard() disusulkan lewat runDeferredOrNow() yang sama dgn 6 pemanggilan non-inti di
// bawah (state-nya tetap fresh begitu user pindah ke Beranda nanti via showPage(), yang juga
// manggil renderPageContent('dashboard')->renderDashboard() seperti biasa — 0 perubahan di jalur
// itu). 0 perubahan logika/hasil renderDashboard() itu sendiri — murni KAPAN/berapa kali dipanggil.
const _berandaAktifSaatUnlock=!!document.querySelector('.page.active#page-dashboard');
runDeferredOrNow(function(){
if(!_berandaAktifSaatUnlock)renderDashboard();
checkBackup(); checkBills(); populateCatFilter(); populateAccFilters();
renderSiapPulang();
checkAndFireReminders();
});
setTimeout(checkWeeklySalaryReset,600);
setTimeout(checkMonthlySalaryReminder,600);
refreshCurrentPage();
// S1811: diagnostic/self-test dan silent Google Drive reconnect dipindah keluar dari
// critical first-second startup window. Keduanya tetap otomatis sekali per boot, tetapi
// diberi jeda agar render awal, input PIN, dan first interaction mendapat prioritas.
setTimeout(autoRunSelfTestIfNeeded,2500);
setTimeout(gdriveTrySilentReconnectOnLoad,3000);
}
async function clearChat(){
if(!await askConfirm('Reset semua riwayat chat AI?'))return;
D.chatHistory=[];save();
chatInited=false;
document.getElementById('chatBox').innerHTML='';
initChat();
toast('🗑 Chat direset');
}
