// App bootstrap runtime extracted from self-test.js.
// Kept separate so diagnostic tests do not own the application bootstrap.
// S1763: lifecycle/interval installation is explicitly idempotent. `init()` can
// be reached again by recovery/test harnesses; repeating global timers/listeners
// would otherwise multiply reminder/backup work and lifecycle flushes.
let __kwRuntimeMaintenanceTimer=null;

function __kwInstallRuntimeMaintenance(){
if(__kwRuntimeMaintenanceTimer!=null)return;
__kwRuntimeMaintenanceTimer=setInterval(()=>{
applyEffectiveTheme();
checkAndFireReminders();
if(D.googleDrive.autoSync&&gdriveAccessToken)uploadBackupToDrive(true);
},5*60*1000);
}

async function __kwInitRuntime(){
// FIX (2026-07-30): tandai boot sudah mulai SEBELUM apa pun lain -- dibaca oleh guard
// controllerchange di index.html/app_production.html supaya reload anti-flash SW tidak
// menembak lagi begitu init() (dan showPinScreen()) sudah jalan. Lihat komentar lengkap
// di blok controllerchange index.html soal bug "PIN muncul 2x".
window.__kwBooted=true;
await load();
if(typeof AIService!=='undefined'&&typeof AIService.wireEvents==='function'){
try{AIService.wireEvents();}catch(e){console.warn('[AIService] wireEvents gagal:',e);}
}
// Sesi 7: daftarkan rule domain FINANCE pertama ke AIDecision (lihat komentar
// registerFinanceAIRules() di modules/finance/tx-list-cashflow.js). Sama
// pola guard/try-catch dgn wireEvents() di atas — 1 domain gagal register
// tidak boleh menjatuhkan boot.
if(typeof registerFinanceAIRules==='function'){
try{registerFinanceAIRules();}catch(e){console.warn('[AIDecision] registerFinanceAIRules gagal:',e);}
}
// Sesi 8: lanjutan Sesi 7 — rule domain VEHICLE/ASSET/DELIVERY (lihat
// komentar masing-masing register*AIRules() di file domainnya).
if(typeof registerVehicleAIRules==='function'){
try{registerVehicleAIRules();}catch(e){console.warn('[AIDecision] registerVehicleAIRules gagal:',e);}
}
if(typeof registerAssetAIRules==='function'){
try{registerAssetAIRules();}catch(e){console.warn('[AIDecision] registerAssetAIRules gagal:',e);}
}
if(typeof registerDeliveryAIRules==='function'){
try{registerDeliveryAIRules();}catch(e){console.warn('[AIDecision] registerDeliveryAIRules gagal:',e);}
}
// TODO.md #1: rule Cross Module pertama (Finance + Delivery), lihat komentar
// registerCrossModuleAIRules() di modules/ai/ai-decision-engine.js. Dipanggil
// setelah domain rules di atas (urutan tidak wajib, tapi lebih runut dibaca).
if(typeof registerCrossModuleAIRules==='function'){
try{registerCrossModuleAIRules();}catch(e){console.warn('[AIDecision] registerCrossModuleAIRules gagal:',e);}
}
applyEffectiveTheme();
setupPWA();
enableSwipeToDismiss('txModal');
enableSwipeToDismiss('worthItModal');
if(navigator.storage&&navigator.storage.persist){
navigator.storage.persist().catch(()=>{});
}
const now=new Date();
document.getElementById('headerDate').textContent=now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'});
__kwInstallRuntimeMaintenance();
const pin=localStorage.getItem('kw_pin');
if(pin){showPinScreen();return;}
const setup=localStorage.getItem('kw_setup');
if(!setup){const ob=document.getElementById('onboard');ob.classList.remove('u-dnone');ob.style.display='flex';updateOnboardPreview();return;}
showMain();
}
