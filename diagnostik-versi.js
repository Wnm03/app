// diagnostik-versi.js — Domain Diagnostik & Sinkronisasi Versi: snapshot HTML utk self-test
// (getHtmlSnapshotForSelfTest), cek status sinkron versi produksi vs master
// (computeProductionSyncStatus), cek status sinkron versi antar file modul
// (computeModuleSyncStatus + IIFE `_checkModuleVersionSync` yang jalan otomatis saat file
// dimuat & kasih toast peringatan kalau ada modul ketinggalan versi), dan cek ukuran file HTML
// terhadap ambang batas mulai-pecah-file (computeFileSizeStatus + FILE_SIZE_WARN_BYTES/
// FILE_SIZE_ACTION_BYTES).
// Dipindah dari features-helpers-global-security.js (v75) — potongan KEDELAPAN stlh
// kalkulator-input.js (v69), keamanan-pin.js (v70), modal-navigasi.js (v71),
// reset-gaji-mingguan.js (v72), debug-console.js/pengaturan-search.js (v73), onboarding.js (v74).
// CATATAN: `APP_BUILD_VERSION` & `PRODUCTION_BUILD_SYNCED_VERSION` SENGAJA TETAP di
// features-helpers-global-security.js (TIDAK ikut dipindah) krn build.js membaca
// `APP_BUILD_VERSION` langsung dari file itu lewat regex (`detectCurrentVersion()`) — memindahkannya
// akan merusak build.js. Fungsi-fungsi di file ini cukup mengaksesnya sbg variabel global saat
// runtime (pola yang sama seperti akses MODULE_CALC_VERSION/MODAL_VERSION/dst dari file lain).
// PENTING soal urutan: IIFE `_checkModuleVersionSync` di bawah jalan OTOMATIS begitu file ini
// dimuat (bukan cuma deklarasi function) & butuh APP_BUILD_VERSION, MODULE_CALC_VERSION (GROUP_A:
// modules-calc.js), MODULE_FEATURES_VERSION (GROUP_A: chat-action-handlers.js),
// MODAL_VERSION (GROUP_A: modals.js), MODULE_RENDER_VERSION (GROUP_A: modules-render.js) — semua
// SUDAH tersedia karena app-bundle-a.min.js (GROUP_A) dimuat lebih dulu di index.html/
// app_production.html sebelum app-bundle-b.min.js (GROUP_B). File ini juga HARUS dimuat SETELAH
// features-helpers-global-security.js (butuh APP_BUILD_VERSION/PRODUCTION_BUILD_SYNCED_VERSION/toast()).
// Dipanggil dari: modules-render.js (computeProductionSyncStatus/computeFileSizeStatus, saat render
// halaman Tentang/Pengaturan), features-sheets-pwa-selftest.js (getHtmlSnapshotForSelfTest/
// computeProductionSyncStatus/computeFileSizeStatus/computeModuleSyncStatus, dipakai smoke-test).
function getHtmlSnapshotForSelfTest(){ return document.documentElement.outerHTML; }
function computeProductionSyncStatus(){
const inSync = PRODUCTION_BUILD_SYNCED_VERSION===APP_BUILD_VERSION;
return {
masterVersion:APP_BUILD_VERSION,
syncedVersion:PRODUCTION_BUILD_SYNCED_VERSION,
inSync,
label: inSync
? '✅ Sinkron (v'+PRODUCTION_BUILD_SYNCED_VERSION+')'
: '⚠️ Ketinggalan -- terakhir sinkron di '+PRODUCTION_BUILD_SYNCED_VERSION+', master sudah '+APP_BUILD_VERSION+'. Kalau distribusi ke user pakai file produksi, regenerate dulu.',
};
}
function computeModuleSyncStatus(){
const calcV=(typeof MODULE_CALC_VERSION!=='undefined')?MODULE_CALC_VERSION:null;
const featV=(typeof MODULE_FEATURES_VERSION!=='undefined')?MODULE_FEATURES_VERSION:null;
const modalV=(typeof MODAL_VERSION!=='undefined')?MODAL_VERSION:null;
const renderV=(typeof MODULE_RENDER_VERSION!=='undefined')?MODULE_RENDER_VERSION:null;
const calcOk=calcV===APP_BUILD_VERSION;
const featOk=featV===APP_BUILD_VERSION;
const modalOk=modalV===APP_BUILD_VERSION;
const renderOk=renderV===APP_BUILD_VERSION;
return {
calcVersion:calcV, featVersion:featV, modalVersion:modalV, renderVersion:renderV, masterVersion:APP_BUILD_VERSION,
calcOk, featOk, modalOk, renderOk, allOk: calcOk&&featOk&&modalOk&&renderOk,
};
}
(function _checkModuleVersionSync(){
try{
const s=computeModuleSyncStatus();
if(!s.allOk){
const detail=[];
if(!s.calcOk) detail.push('modules-calc.js (v'+(s.calcVersion||'tidak terbaca')+')');
if(!s.featOk) detail.push('file features-*.js (GROUP_A/B, v'+(s.featVersion||'tidak terbaca')+')');
if(!s.modalOk) detail.push('modals.js (v'+(s.modalVersion||'tidak terbaca')+')');
if(!s.renderOk) detail.push('modules-render.js (v'+(s.renderVersion||'tidak terbaca')+')');
console.warn('⚠️ Versi modul tidak sinkron dengan app_production.html (v'+s.masterVersion+'):',detail.join(', '));
if(typeof toast==='function'){
toast('⚠️ Versi file modul beda dari app_production.html: '+detail.join(', ')+'. Pastikan semua file di-upload dari build yang sama.',6000);
}
}
}catch(e){ console.error('Gagal cek sinkronisasi versi modul:',e); }
})();
const FILE_SIZE_WARN_BYTES = 2.0*1024*1024;
const FILE_SIZE_ACTION_BYTES = 2.5*1024*1024;
function computeFileSizeStatus(){
const size = document.documentElement.outerHTML.length;
let level='aman', label='✅ Aman', color='var(--accent3)';
if(size>=FILE_SIZE_ACTION_BYTES){ level='action'; label='🔴 Sudah lewat ambang — mulai pecah file'; color='var(--accent2)'; }
else if(size>=FILE_SIZE_WARN_BYTES){ level='warn'; label='⚠️ Mendekati ambang — mulai rencanakan pemisahan'; color='#e0a030'; }
return {size,level,label,color,warnAt:FILE_SIZE_WARN_BYTES,actionAt:FILE_SIZE_ACTION_BYTES};
}
