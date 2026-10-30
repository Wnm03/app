// modules/shared/bundle-load-guard.js
// SA1-REKONSTRUKSI (sesi lanjutan) — pengganti inline
// `onerror="window.__moduleLoadFail('app-bundle-X.min.js')"` yang tadinya
// terpasang langsung di atribut HTML <script src="app-bundle-X.min.js">.
// Atribut onerror inline diblokir begitu CSP unsafe-inline dicabut (SA9),
// jadi logikanya dipindah ke sini -- file eksternal (bukan inline), aman
// dari pembatasan CSP tsb.
//
// Cara pakai (lihat index.html): taruh SATU <script src="...bundle-load-
// guard.js?v=N" data-guard-src="app-bundle-a.min.js?v=N"
// data-guard-id="appBundleAScript"></script> di posisi PERSIS yang sama
// dengan <script src="app-bundle-a.min.js"> yang lama (dan sekali lagi utk
// bundle-b). Guard ini men-DOCUMENT.WRITE tag <script> yang sebenarnya,
// supaya urutan & sifat "blocking" evaluasinya identik dengan tag statis
// yang digantikannya (bundle harus selesai load+eksekusi sebelum parser
// lanjut ke konten sesudahnya, karena banyak inline document.write(MODAL_
// HTML[...]) di bawahnya bergantung pada fungsi yang didefinisikan bundle).
// Listener 'error' dipasang SEGERA setelah document.write (bukan di
// sibling script terpisah sesudahnya) supaya tidak keduluan race: untuk
// script yang benar-benar blocking, event error/load baru diproses browser
// SETELAH script yang MEMANGGIL document.write ini selesai jalan -- jadi
// listener ini dijamin terpasang sebelum browser sempat memutuskan gagal.
(function(){
'use strict';
var cur = document.currentScript;
if(!cur) return;
var src = cur.getAttribute('data-guard-src');
var id = cur.getAttribute('data-guard-id');
if(!src || !id) return;
document.write('<script id="' + id + '" src="' + src + '"><\/script>');
var el = document.getElementById(id);
if(el){
el.addEventListener('error', function(){
if(typeof window.__moduleLoadFail === 'function') window.__moduleLoadFail(src);
});
}
})();
