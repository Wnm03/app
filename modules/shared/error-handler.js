// error-handler.js — Domain Error Handler Global: tangkap error tak tertangani (uncaught error &
// Dipindah ke modules/shared/error-handler.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// unhandled promise rejection) di seluruh app, catat ke console utk debugging, dan tampilkan toast
// singkat yang ramah ke pengguna (dibatasi maksimal 1x per 3 detik biar tidak spam kalau error
// beruntun) lewat `_friendlyErrorNotice`.
// Dipindah dari features-helpers-global-security.js (v77) — potongan KESEPULUH stlh
// kalkulator-input.js (v69), keamanan-pin.js (v70), modal-navigasi.js (v71),
// reset-gaji-mingguan.js (v72), debug-console.js/pengaturan-search.js (v73), onboarding.js (v74),
// diagnostik-versi.js (v75), format-tema.js (v76). Domain PALING mandiri sejauh ini: `_lastErrorToastAt`
// & `_friendlyErrorNotice` TIDAK dipakai/direferensi sama sekali dari file lain (dicek `grep -rn`,
// 0 hasil di luar file ini) — cuma dipanggil dari 2 listener `window.addEventListener` di bawah,
// yang juga ikut pindah.
// Satu2nya dependensi luar: `toast()` (format-tema.js), diakses lewat `typeof toast==='function'`
// (fallback ke console.warn kalau belum siap) — pola yang sama seperti sebelum dipindah.
// PENTING: file ini HARUS dimuat SETELAH format-tema.js (biar toast() sudah ada saat error
// pertama mungkin terjadi), walau tetap aman kalau belum krn ada typeof-check.
let _lastErrorToastAt=0;
function _friendlyErrorNotice(msg){
const now=Date.now();
if(now-_lastErrorToastAt<3000)return;
_lastErrorToastAt=now;
try{
const detail=msg?(': '+String(msg).slice(0,120)):'';
if(typeof toast==='function'){
toast('⚠️ Ada error kecil, coba ulangi aksi terakhir'+detail,5000);
}else{
console.warn('App error (toast belum siap):',msg);
}
}catch(_e){ }
}
window.addEventListener('error',function(e){
console.error('Uncaught error:',e.error||e.message,e.filename,e.lineno);
_friendlyErrorNotice(e.message);
});
window.addEventListener('unhandledrejection',function(e){
console.error('Unhandled promise rejection:',e.reason);
_friendlyErrorNotice(e.reason);
});
