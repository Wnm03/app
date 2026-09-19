// debug-console.js — explicit opt-in developer console.
// Production does not initialize Eruda merely because this module is loaded.
// The only activation path in this module is the explicit Settings toggle.
const KW_DEBUG_CONSOLE_KEY='kw_debug_console';
function _isDebugConsoleOptedIn(){
try{return localStorage.getItem(KW_DEBUG_CONSOLE_KEY)==='1';}catch(e){return false;}
}
function updateDebugConsoleBtn(){
const btn=document.getElementById('btnToggleDebugConsole');
if(!btn)return;
const active=_isDebugConsoleOptedIn();
btn.textContent=active?'🐞 Matikan Debug Console':'🐞 Aktifkan Debug Console';
btn.setAttribute('aria-pressed',active?'true':'false');
}
function toggleDebugConsole(){
// Explicit user action only: this function is the opt-in boundary.
const active=_isDebugConsoleOptedIn();
if(active){
try{localStorage.removeItem(KW_DEBUG_CONSOLE_KEY);}catch(e){void e;}
try{if(window.eruda)eruda.destroy();}catch(e){void e;}
toast('🐞 Debug console dimatikan');
updateDebugConsoleBtn();
return;
}
try{localStorage.setItem(KW_DEBUG_CONSOLE_KEY,'1');}catch(e){
console.warn('Debug console tidak dapat diaktifkan: localStorage tidak tersedia.',e);
updateDebugConsoleBtn();
return;
}
if(window.eruda){
try{eruda.init();}catch(e){void e;}
toast('🐞 Debug console diaktifkan');
updateDebugConsoleBtn();
return;
}
const s=document.createElement('script');
s.src='https://cdn.jsdelivr.net/npm/eruda';
s.async=true;
s.onload=function(){
try{eruda.init();toast('🐞 Debug console diaktifkan');}
catch(e){try{localStorage.removeItem(KW_DEBUG_CONSOLE_KEY);}catch(_e){void _e;}toast('⚠️ Gagal menyalakan debug console: '+e.message);}
updateDebugConsoleBtn();
};
s.onerror=function(){
try{localStorage.removeItem(KW_DEBUG_CONSOLE_KEY);}catch(e){void e;}
toast('⚠️ Gagal memuat debug console (butuh internet saat pertama kali aktif)');
updateDebugConsoleBtn();
};
(document.head||document.documentElement).appendChild(s);
}
