// debug-console.js — Domain Debug Console: toggle tombol status (updateDebugConsoleBtn) & aktifkan/matikan
// Dipindah ke modules/shared/debug-console.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// panel debug pihak ketiga "eruda" (toggleDebugConsole), termasuk lazy-load skrip eruda dari CDN kalau
// belum pernah dipakai.
// Dipindah dari features-helpers-global-security.js (v73) — potongan KELIMA stlh kalkulator-input.js
// (v69), keamanan-pin.js (v70), modal-navigasi.js (v71), reset-gaji-mingguan.js (v72). Dipilih krn
// domain kecil & mandiri: cuma pakai localStorage/window.eruda/document (DOM), TIDAK bergantung ke D
// atau modul lain kecuali toast() (tetap di features-helpers-global-security.js, dipanggil saat
// runtime tombol diklik).
// Dipanggil dari: tombol "Aktifkan/Matikan Debug Console" di Pengaturan (data-action="toggleDebugConsole"
// di index.html/app_production.html), dan updateDebugConsoleBtn() dipanggil dari modules-render.js saat
// render halaman Pengaturan.
// PENTING: file ini HARUS dimuat SETELAH features-helpers-global-security.js (butuh toast()).
function updateDebugConsoleBtn(){
const btn=document.getElementById('btnToggleDebugConsole');
if(!btn)return;
const active=localStorage.getItem('kw_debug_console')==='1';
btn.textContent=active?'🐞 Matikan Debug Console':'🐞 Aktifkan Debug Console';
}
function toggleDebugConsole(){
const active=localStorage.getItem('kw_debug_console')==='1';
if(active){
localStorage.removeItem('kw_debug_console');
try{ if(window.eruda) eruda.destroy(); }catch(e){}
toast('🐞 Debug console dimatikan');
updateDebugConsoleBtn();
return;
}
localStorage.setItem('kw_debug_console','1');
if(window.eruda){
try{ eruda.init(); }catch(e){}
toast('🐞 Debug console diaktifkan');
updateDebugConsoleBtn();
return;
}
const s=document.createElement('script');
s.src='https://cdn.jsdelivr.net/npm/eruda';
s.onload=function(){
try{ eruda.init(); toast('🐞 Debug console diaktifkan'); }
catch(e){ toast('⚠️ Gagal menyalakan debug console: '+e.message); }
updateDebugConsoleBtn();
};
s.onerror=function(){
localStorage.removeItem('kw_debug_console');
toast('⚠️ Gagal memuat debug console (butuh internet saat pertama kali aktif)');
updateDebugConsoleBtn();
};
(document.head||document.documentElement).appendChild(s);
}
