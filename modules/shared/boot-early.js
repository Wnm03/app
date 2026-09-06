// modules/shared/boot-early.js
// SA10a (v1568) — konsolidasi 4 blok <script> inline paling awal di
// index.html/app_production.html (sebelum <script src="...bundle-load-
// guard.js" data-guard-src="app-bundle-a.min.js">) jadi 1 file eksternal.
//
// KENAPA DIGABUNG (bukan 4 file terpisah): keempatnya sama-sama boot-time
// setup TANPA saling bergantung isi satu sama lain, tapi SEMUANYA harus
// tetap jalan sinkron & dalam urutan yang sama seperti sebelumnya (sebelum
// app-bundle-a.min.js dimuat), supaya fungsi/flag global yang mereka pasang
// (_loadScriptOnce, window.__moduleLoadFail, window.__showRuntimeErrorBanner,
// listener 'error'/'unhandledrejection', reload-guard service worker) sudah
// siap dipakai oleh kode yang jalan sesudahnya. Digabung 1 file (bukan 4)
// supaya cuma 1 request tambahan, bukan 4, dan urutan relatif dijamin benar
// oleh urutan literal di file ini (identik dgn urutan 4 blok asal).
//
// FIX (SA10a): dipindah dari 4 blok inline ke sini SUPAYA TIDAK butuh
// 'unsafe-inline' di script-src -- tag pemanggilnya jadi
// <script src="modules/shared/boot-early.js?v=1568"></script> (TANPA
// defer/async, supaya tetap block parsing & jalan di posisi yang sama
// persis dgn 4 blok inline yang digantikannya).



// ===== Blok 1/4: Debug console (Eruda) =====
/* Debug console (Eruda) — aktifkan sekali lewat ?debug=1 di URL, nempel via localStorage.
   Matikan lagi lewat ?debug=0. Tidak aktif buat user biasa. */
(function(){
try{
var params=new URLSearchParams(location.search);
if(params.get('debug')==='1') localStorage.setItem('kw_debug_console','1');
if(params.get('debug')==='0') localStorage.removeItem('kw_debug_console');
if(localStorage.getItem('kw_debug_console')==='1'){
var s=document.createElement('script');
s.src='https://cdn.jsdelivr.net/npm/eruda';
s.onload=function(){ try{ eruda.init(); }catch(e){} };
(document.head||document.documentElement).appendChild(s);
}
}catch(e){}
})();


// ===== Blok 2/4: _loadScriptOnce & ensure*() lazy-load helpers =====
window._loadedScripts=window._loadedScripts||{};
// Sesi 312 BUGFIX (scanner-fatal-perframe-fix): sebelum ini SATU kali gagal
// (404 sesaat/CDN belum sinkron/hiccup jaringan) langsung reject permanen --
// module lazy-load (renovasi.js/sewakios.js/business-intelligence-presenter.js)
// jadi tampil banner "gagal dimuat" walau file-nya ADA, cuma request pertama
// yang gagal. Sekarang retry otomatis 1x dengan cache-buster baru sebelum
// benar-benar menyerah, dan promise gagal dihapus dari cache supaya tab
// dibuka ulang bisa coba lagi (bukan tersangkut gagal selamanya per sesi).
function _loadScriptOnce(src,_isRetry){
if(!_isRetry && window._loadedScripts[src])return window._loadedScripts[src];
const p=new Promise((resolve,reject)=>{
const s=document.createElement('script');
s.src=_isRetry?(src+(src.indexOf('?')>-1?'&':'?')+'_retry='+Date.now()):src;
s.async=true;
let done=false;
const timeoutId=setTimeout(()=>{
if(done)return;done=true;
delete window._loadedScripts[src];
reject(new Error('Timeout memuat '+src+' — cek koneksi internet, atau kalau pakai Brave coba matikan Shields untuk situs ini, lalu coba lagi'));
},12000);
s.onload=()=>{if(done)return;done=true;clearTimeout(timeoutId);resolve();};
s.onerror=()=>{
if(done)return;done=true;clearTimeout(timeoutId);
delete window._loadedScripts[src];
if(!_isRetry){
// satu kali percobaan ulang otomatis sebelum melaporkan gagal
_loadScriptOnce(src,true).then(resolve).catch(reject);
}else{
reject(new Error('Gagal memuat '+src));
}
};
document.head.appendChild(s);
});
if(!_isRetry) window._loadedScripts[src]=p;
return p;
}
function ensureTesseract(){return _loadScriptOnce('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');}
function ensureJsPDF(){return _loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');}
function ensureHtml2Canvas(){return _loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');}
function ensureGoogleGSI(){return _loadScriptOnce('https://accounts.google.com/gsi/client');}
function ensureXLSX(){return _loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');}
function ensureZXing(){return _loadScriptOnce('https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js');}
// Sesi 13 Tahap 1b (lazy-load internal module, DESIGN_lazy-load-modules.md):
// renovasi.js dikeluarkan dari app-bundle-a.min.js (scripts/build.js GROUP_A),
// dimuat on-demand lewat pola _loadScriptOnce() yang sama dgn CDN di atas.
// Dipanggil dari setKeuanganTab() (tx-list-cashflow.js) saat tab Aset & Proyek
// > Proyek Renovasi pertama dibuka.
function ensureRenov(){return _loadScriptOnce('modules/home/renovasi.js?v=1568');}
// sewakios.js dikeluarkan dari app-bundle-a.min.js (scripts/build.js GROUP_A),
// dimuat on-demand lewat pola _loadScriptOnce() yang sama dgn Renov di atas.
// Dipanggil dari setKeuanganTab() (tx-list-cashflow.js) saat tab Aset & Proyek
// pertama dibuka.
function ensureSewaKios(){return _loadScriptOnce('modules/business/sewakios.js?v=1568');}
// business-intelligence-presenter.js dikeluarkan dari app-bundle-b.min.js
// (scripts/build.js GROUP_B), dimuat on-demand lewat pola sama.
// Dipanggil dari setShopTab() (cobek-io.js) saat tab Shop > Business
// Intelligence pertama dibuka.
function ensureBusinessIntelligence(){return _loadScriptOnce('modules/shop/business-intelligence-presenter.js?v=1568');}


// ===== Blok 3/4: __moduleLoadFail & global runtime error banner =====
window.__moduleLoadFail=function(name){
try{
var b=document.createElement('div');
b.setAttribute('data-module-fail-banner','1');
b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:#c0392b;color:#fff;padding:10px 14px;font:600 13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.3);';
b.textContent='⚠️ File '+name+' gagal dimuat -- fitur aplikasi bisa error/blank. Cek koneksi internet lalu refresh, atau pastikan file '+name+' ada di hosting yang sama.';
var closeBtn=document.createElement('span');
closeBtn.textContent=' ✕';
closeBtn.style.cssText='cursor:pointer;margin-left:10px;font-weight:900;';
closeBtn.onclick=function(){b.remove();};
b.appendChild(closeBtn);
(document.body||document.documentElement).appendChild(b);
}catch(_e){ console.error('Gagal tampilkan banner error modul:',_e); }
};
// BUGFIX: sebelum ini TIDAK ADA penangkap error runtime global -- kalau ada SATU exception
// tak tertangkap di mana pun (paling sering di app-bootstrap.js saat Object.assign(window,{...})
// atau di dalam init()), sisa kode boot script langsung berhenti TANPA pesan apa pun ke user.
// Efeknya: banyak fitur yang sama sekali tidak berhubungan (mis. semua tombol Scan & semua
// notifikasi) "mati" bersamaan dalam satu kali reload, dan satu-satunya jejak errornya cuma ada
// di DevTools Console (yang mayoritas user tidak buka) -- gejalanya jadi "app diam total", susah
// dibedakan dari sekadar lambat/loading. Handler di bawah menampilkan banner yang sama dengan
// __moduleLoadFail supaya SETIAP error runtime tak tertangkap langsung kelihatan oleh user &
// gampang dilaporkan, alih-alih diam senyap.
window.__runtimeErrorBannerShown=false;
window.__showRuntimeErrorBanner=function(msg){
try{
if(window.__runtimeErrorBannerShown)return; // 1 banner cukup, jangan spam kalau errornya beruntun
window.__runtimeErrorBannerShown=true;
var b=document.createElement('div');
b.setAttribute('data-runtime-error-banner','1');
b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:#c0392b;color:#fff;padding:10px 14px;font:600 13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.3);';
b.textContent='⚠️ Terjadi error yang membuat sebagian/seluruh fitur (termasuk Scan & Notifikasi) mungkin tidak berfungsi: '+msg+'. Coba refresh halaman; kalau masih berulang, laporkan pesan ini ke pengembang.';
var closeBtn=document.createElement('span');
closeBtn.textContent=' ✕';
closeBtn.style.cssText='cursor:pointer;margin-left:10px;font-weight:900;';
closeBtn.onclick=function(){b.remove();};
b.appendChild(closeBtn);
(document.body||document.documentElement).appendChild(b);
}catch(_e){ console.error('Gagal tampilkan banner error runtime:',_e); }
};
window.addEventListener('error',function(ev){
try{
var msg=(ev&&ev.message)?ev.message:'Unknown error';
var loc=(ev&&ev.filename)?(' ('+ev.filename+':'+ev.lineno+')'):'';
console.error('[Global Error]',msg+loc,ev&&ev.error);
window.__showRuntimeErrorBanner(msg+loc);
}catch(_e){}
});
window.addEventListener('unhandledrejection',function(ev){
try{
var reason=ev&&ev.reason;
var msg=(reason&&reason.message)?reason.message:String(reason);
console.error('[Unhandled Promise Rejection]',reason);
window.__showRuntimeErrorBanner(msg);
}catch(_e){}
});


// ===== Blok 4/4: Anti-flash reload saat Service Worker controllerchange =====
/* FIX: tab yang sudah kebuka duluan bisa masih dikontrol SW versi lama
   (skipWaiting/clients.claim ga instan ganti controller tab yg lagi aktif),
   jadi HTML lama sempat ke-paint dulu sebelum JS baru koreksi tampilan
   (nyebabin "flash" onboard->pin atau sebaliknya). Reload sekali otomatis
   begitu controller SW berganti, guard sessionStorage biar ga infinite loop.
   FIX (2026-07-30): guard TAMBAHAN window.__kwBooted -- sebelumnya listener ini
   reload TANPA syarat kapan pun controllerchange nyala, termasuk SETELAH init()
   sempat jalan & showPinScreen() sudah tampil (controllerchange SW baru aktif/
   claim client-nya sering baru nyala beberapa saat SETELAH init() selesai, bukan
   cuma sebelum paint pertama). Efeknya: user sudah lihat/mulai ketik PIN, tiba-tiba
   ke-reload paksa -> app boot ulang dari nol -> layar PIN "muncul 2x" + reload
   bundle besar bikin serasa "loading lama". Guard ini di-set oleh init()
   (self-test.js) PERSIS begitu init() mulai jalan -- kalau boot sudah lewat
   titik itu, reload anti-flash ini dilewati (tujuan awalnya cuma menghindari
   flash SEBELUM boot, bukan menginterupsi sesi yang sudah berjalan). Update SW
   berikutnya tetap otomatis kepakai di sesi/reload berikutnya seperti biasa. */
(function(){
try{
if(!('serviceWorker' in navigator))return;
navigator.serviceWorker.addEventListener('controllerchange',function(){
if(sessionStorage.getItem('kw_sw_reloaded')==='1')return;
if(window.__kwBooted)return;
sessionStorage.setItem('kw_sw_reloaded','1');
window.location.reload();
});
}catch(e){}
})();

