// features-helpers-global-security.js — Helper global (migrasi data, state D, save/load, event dispatcher)
// Dipindah ke modules/shared/features-helpers-global-security.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// CATATAN: 3 konstanta default (DEFAULT_COBEK_KATEGORI/DEFAULT_ACCOUNTS/DEFAULT_SPAREPARTS) dipindah ke
// data-default.js (v79) — file itu HARUS dimuat SEBELUM file ini karena dibaca langsung di `let D = {...}`.
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: data-default.js, features-helpers-global-security.js, diagnostik-versi.js, format-tema.js, error-handler.js, helper-teks.js, keamanan-pin.js, modal-navigasi.js, reset-gaji-mingguan.js, debug-console.js, pengaturan-search.js, onboarding.js, kalkulator-input.js, scan-ocr.js, akun.js, gaji-calc.js, transaksi.js, profil-pengaturan.js, kategori.js, tagihan-kalender.js, backup-restore.js, payroll-absensi.js, tukang-absensi.js

const SCHEMA_VERSION = 10;
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
];
function runDataMigrations(fromVersion){
let v=Number.isFinite(fromVersion)?fromVersion:0;
const pending=DATA_MIGRATIONS.filter(m=>m.toVersion>v).sort((a,b)=>a.toVersion-b.toVersion);
pending.forEach(m=>{
try{ m.migrate(D); v=m.toVersion; }
catch(e){ console.error(`Migrasi data ke versi ${m.toVersion} ("${m.desc}") gagal:`,e); }
});
D.schemaVersion=SCHEMA_VERSION;
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
const APP_BUILD_VERSION = 's703-akumulasi-collapse-26kartu';
const PRODUCTION_BUILD_SYNCED_VERSION = 's703-akumulasi-collapse-26kartu';
let D = {
schemaVersion:SCHEMA_VERSION,
transactions:[],cobek:[],products:[],produsen:[],cobekKategori:JSON.parse(JSON.stringify(DEFAULT_COBEK_KATEGORI)),targets:[],eduFunds:[],reminders:[],bills:[],billsArchive:[],inventoryTransfers:[],productMovementOverride:{},purchaseOrders:[],productStockCorrections:[],
catatan:{anak:[]},
milestones:[false,false,false,false,false],
nextPulang:'',lastBackup:null,lastResetPromptDate:null,
profile:{nama:'W',gajiPokok:65000,kiriman:500000,theme:'dark',lemburMultiplier:1.5,tarifMinggu:139000,tanggalLahir:null,statusKawin:false,tanggungan:0,statusPekerjaan:null,targetGajiBulanan:null,insightMingguanAktif:true},
categories:{income:JSON.parse(JSON.stringify(DEFAULT_CATS.income)),expense:JSON.parse(JSON.stringify(DEFAULT_CATS.expense))},
accounts:JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS)),
vehicles:[{id:'veh_1',name:'Vario 125',emoji:'🏍️',serviceIntervalKm:3000}],
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
function _saveImmediate(){
try{
const json=_buildSaveJson();
IDBStore.set('kw_v4_mirror',json).catch(e=>{
console.error('Gagal menyimpan ke IndexedDB, fallback ke localStorage:',e);
_writeLocalSnapshot(json);
});
}catch(e){
console.error('Gagal menyimpan data:',e);
}
}
function save(){
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
if(typeof TitipanSync!=='undefined'&&typeof TitipanSync.reconcileAccounts==='function')TitipanSync.reconcileAccounts();
if(typeof syncLinkedAssetNilaiFromAkun==='function')syncLinkedAssetNilaiFromAkun();
if(typeof invalidateCashflowForecastCache==='function')invalidateCashflowForecastCache();
if(typeof FinanceIntelligence!=='undefined'&&typeof FinanceIntelligence.invalidateCache==='function')FinanceIntelligence.invalidateCache();
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
if(typeof renderKekayaanBersih==='function'&&typeof document!=='undefined'&&document.getElementById('kbNetWorth'))renderKekayaanBersih();
if(_saveDebounceTimer)clearTimeout(_saveDebounceTimer);
_saveDebounceTimer=setTimeout(()=>{_saveDebounceTimer=null;_saveImmediate();},400);
}
// saveFlush(): dipakai di titik KRITIS (tutup/background app, sebelum import/reset, sebelum
// upload backup Drive). Beda dari save() biasa: di sini localStorage['kw_v4'] TETAP ditulis
// sinkron sebagai jaring pengaman, karena IndexedDB async-nya belum tentu sempat commit kalau
// tab langsung ditutup/di-suspend setelah ini.
function saveFlush(){
if(_saveDebounceTimer){clearTimeout(_saveDebounceTimer);_saveDebounceTimer=null;}
_saveImmediate();
_writeLocalSnapshot(_buildSaveJson());
}
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
if(el.dataset.stop) e.stopPropagation();
{
const path = el.dataset.action.split('.');
let owner = window, fn = window;
for(const p of path){ owner = fn; fn = fn ? fn[p] : undefined; }
if(typeof fn !== 'function'){
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
let s=null, fromIdb=false;
try{
const idbVal=await IDBStore.get('kw_v4_mirror');
if(idbVal){ s=idbVal; fromIdb=true; }
}catch(e){ console.error('Gagal baca IndexedDB, fallback ke localStorage:',e); }
if(!s) s=localStorage.getItem('kw_v4');
if(s){
let p;
try{
p=JSON.parse(s);
}catch(parseErr){
console.error('Data tersimpan corrupt:',parseErr);
showAlertModal('Data tersimpan di HP ini rusak/tidak terbaca (corrupt). Aplikasi akan dibuka dengan data kosong agar tidak error.\n\nKalau punya file backup (.json) dari menu Pengaturan → Backup, silakan import ulang lewat menu tersebut setelah aplikasi terbuka.',{icon:'⚠️',title:'Data Tersimpan Rusak'});
return;
}
D={...D,...p};
if(!fromIdb) IDBStore.set('kw_v4_mirror',s).catch(e=>console.error('Gagal migrasi awal ke IndexedDB:',e));
const _fromSchemaVersion=D.schemaVersion===undefined?0:D.schemaVersion;
runDataMigrations(_fromSchemaVersion);
if(!D.categories) D.categories={income:JSON.parse(JSON.stringify(DEFAULT_CATS.income)),expense:JSON.parse(JSON.stringify(DEFAULT_CATS.expense))};
if(!D.accounts || !D.accounts.length) D.accounts=JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
if(!D.pajakZakat) D.pajakZakat={hargaEmasPerGram:2640000,nisabPenghasilanBulan:7640144,nisabPenghasilanTahun:91681728,zakatFitrahPerJiwa:37500,haulMaalMulai:null,zakatLog:[]};
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
D.debts.forEach(d=>{try{if(typeof Debt!=='undefined')Debt.syncBill(d);}catch(e){}});
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
if(!D.vehicles||!D.vehicles.length) D.vehicles=[{id:'veh_1',name:'Vario 125',emoji:'🏍️',serviceIntervalKm:3000}];
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
try{prefs=JSON.parse(localStorage.getItem('cardCollapsePrefs')||'{}');}catch(e){}
if('dashHubMainGrid' in prefs)return; // user sudah pernah pilih manual, hormati pilihannya
const body=document.getElementById('dashHubMainGrid-cbody');
const chev=document.getElementById('dashHubMainGrid-chev');
if(body)body.classList.add('collapsed');
if(chev)chev.classList.add('collapsed');
}
function showMain(){
document.getElementById('onboard').style.display='none';
document.getElementById('pinScreen').style.display='none';
document.getElementById('pinScreen').classList.add('u-dnone');
const mh=document.getElementById('mainHeader');mh.classList.remove('u-dnone');mh.style.display='flex';
const ma=document.getElementById('mainApp');ma.classList.remove('u-dnone');ma.style.display='block';
const mn=document.getElementById('mainNav');mn.classList.remove('u-dnone');mn.style.display='flex';
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
refreshCurrentPage();
setTimeout(autoRunSelfTestIfNeeded,800);
setTimeout(gdriveTrySilentReconnectOnLoad,900);
}
async function clearChat(){
if(!await askConfirm('Reset semua riwayat chat AI?'))return;
D.chatHistory=[];save();
chatInited=false;
document.getElementById('chatBox').innerHTML='';
initChat();
toast('🗑 Chat direset');
}
