// modal-navigasi.js — Domain Modal Generik & Navigasi Halaman: modal konfirmasi/prompt/pilihan/info/pin
// Dipindah ke modules/shared/modal-navigasi.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// (askConfirm/showPromptModal/showChoiceModal/showAlertModal/showPinPromptModal & pasangan _xxxAnswer/_xxxSubmit-nya),
// buka/tutup modal & quick-switcher (openModal/closeModal/openQS/closeQS/_syncNavVisibilityForModals),
// swipe-to-dismiss modal (enableSwipeToDismiss), pindah halaman (showPage/refreshCurrentPage), dan
// collapse/expand kartu di halaman (toggleCardCollapse/applyOneCardCollapsePref/applyCardCollapsePrefs).
// Dipindah dari features-helpers-global-security.js (v71) — potongan KETIGA stlh kalkulator-input.js
// (v69) & keamanan-pin.js (v70). Blok ini dipilih krn 1 domain UI generik yang murni, kontigu (tidak
// diselang domain lain seperti 2 potongan sebelumnya), murni DOM + localStorage, TIDAK bergantung ke D
// atau state aplikasi lain sama sekali. Cuma 2 pengecualian aman: `closeModal()` cek
// `typeof WorthIt!=='undefined'` (guarded, pola lama) sebelum akses WorthIt.pendingBuyId, dan
// `showPage()` memanggil `renderPageContent()` (di modules-render.js, GROUP_A) lewat variabel global saat
// tombol nav diklik — bukan saat file dimuat. TIDAK ada kode top-level yang jalan sendiri saat file
// di-load (semua cuma deklarasi function/let).
// Dipanggil dari HAMPIR SEMUA file lain (askConfirm/openModal/closeModal dipakai di ~20 file, dst) —
// semua lewat nama global saat runtime (klik tombol / data-action di HTML / dalam fungsi lain), bukan
// referensi lokal ke file, jadi aman dipindah ke file sendiri.
// PENTING: file ini HARUS dimuat SETELAH features-helpers-global-security.js (butuh escapeHtml(), dipakai
// showChoiceModal utk render tombol pilihan).
let _confirmResolve=null;
function askConfirm(message,opts){
opts=opts||{};
return new Promise((resolve)=>{
_confirmResolve=resolve;
document.getElementById('confirmModalIcon').textContent=opts.icon||'⚠️';
document.getElementById('confirmModalTitle').textContent=opts.title||'Konfirmasi';
document.getElementById('confirmModalMsg').textContent=message;
const okBtn=document.getElementById('confirmModalOk');
okBtn.textContent=opts.okText||'Ya, Lanjutkan';
okBtn.className='btn btn-full '+(opts.danger===false?'btn-primary':'btn-danger');
document.getElementById('confirmModalCancel').textContent=opts.cancelText||'Batal';
document.getElementById('confirmModalOverlay').classList.add('open');
});
}
function _confirmModalAnswer(val){
document.getElementById('confirmModalOverlay').classList.remove('open');
if(_confirmResolve){const r=_confirmResolve;_confirmResolve=null;r(val);}
}
let _promptModalResolve=null;
function showPromptModal(opts){
opts=opts||{};
const overlay=document.getElementById('promptModalOverlay');
if(!overlay){ return Promise.resolve(prompt(opts.message||'',opts.defaultValue!=null?String(opts.defaultValue):'')); }
return new Promise((resolve)=>{
_promptModalResolve=resolve;
overlay._validateFn=opts.validate||null;
document.getElementById('promptModalIcon').textContent=opts.icon||'✏️';
document.getElementById('promptModalTitle').textContent=opts.title||'Isi Data';
const msgEl=document.getElementById('promptModalMsg');
msgEl.textContent=opts.message||'';
msgEl.style.display=opts.message?'':'none';
const input=document.getElementById('promptModalInput');
input.type=opts.inputType||'text';
input.inputMode=opts.inputMode||(opts.inputType==='number'?'decimal':'text');
input.placeholder=opts.placeholder||'';
input.value=opts.defaultValue!=null?String(opts.defaultValue):'';
document.getElementById('promptModalError').textContent='';
document.getElementById('promptModalOkBtn').textContent=opts.okText||'Simpan';
document.getElementById('promptModalCancelBtn').textContent=opts.cancelText||'Batal';
overlay.classList.add('open');
setTimeout(()=>{input.focus();input.select();},50);
});
}
function _promptModalSubmit(){
const overlay=document.getElementById('promptModalOverlay');
const input=document.getElementById('promptModalInput');
const val=input.value;
if(overlay._validateFn){
const err=overlay._validateFn(val);
if(err){ document.getElementById('promptModalError').textContent=err; return; }
}
overlay.classList.remove('open');
if(_promptModalResolve){const r=_promptModalResolve;_promptModalResolve=null;r(val);}
}
function _promptModalAnswer(val){
document.getElementById('promptModalOverlay').classList.remove('open');
if(_promptModalResolve){const r=_promptModalResolve;_promptModalResolve=null;r(val);}
}
let _choiceModalResolve=null;
function showChoiceModal(opts){
opts=opts||{};
const choices=opts.choices||[];
const overlay=document.getElementById('choiceModalOverlay');
if(!overlay){
const pilihan=choices.map((c,i)=>`${i+1}. ${c.label}`).join('\n');
const idxStr=prompt((opts.message||'Pilih:')+'\n'+pilihan+'\n\nKetik nomor:','1');
if(idxStr===null)return Promise.resolve(null);
const idx=parseInt(idxStr)-1;
return Promise.resolve(choices[idx]?idx:null);
}
return new Promise((resolve)=>{
_choiceModalResolve=resolve;
document.getElementById('choiceModalTitle').textContent=opts.title||'Pilih';
const msgEl=document.getElementById('choiceModalMsg');
msgEl.textContent=opts.message||'';
msgEl.style.display=opts.message?'':'none';
const list=document.getElementById('choiceModalList');
list.innerHTML=choices.map((c,i)=>`<button class="btn btn-ghost btn-full" style="justify-content:flex-start;text-align:left" data-action="_choiceModalAnswer" data-args="${escapeHtml(JSON.stringify([i]))}">${escapeHtml(c.label)}</button>`).join('');
document.getElementById('choiceModalOverlay').classList.add('open');
});
}
function _choiceModalAnswer(idx){
document.getElementById('choiceModalOverlay').classList.remove('open');
if(_choiceModalResolve){const r=_choiceModalResolve;_choiceModalResolve=null;r(idx);}
}
let _infoModalResolve=null;
function showAlertModal(message,opts){
opts=opts||{};
const overlay=document.getElementById('infoModalOverlay');
if(!overlay){ alert(message); return Promise.resolve(); }
return new Promise((resolve)=>{
_infoModalResolve=resolve;
document.getElementById('infoModalIcon').textContent=opts.icon||'⚠️';
document.getElementById('infoModalTitle').textContent=opts.title||'Perhatian';
document.getElementById('infoModalMsg').textContent=message;
document.getElementById('infoModalOk').textContent=opts.okText||'Mengerti';
overlay.classList.add('open');
});
}
function _infoModalAnswer(){
document.getElementById('infoModalOverlay').classList.remove('open');
if(_infoModalResolve){const r=_infoModalResolve;_infoModalResolve=null;r(true);}
}
let _pinPromptResolve=null;
function showPinPromptModal(opts){
opts=opts||{};
const overlay=document.getElementById('pinPromptModalOverlay');
if(!overlay){ return Promise.resolve(prompt(opts.message||'PIN baru (4 digit):')); }
return new Promise((resolve)=>{
_pinPromptResolve=resolve;
document.getElementById('pinPromptModalTitle').textContent=opts.title||'Ganti PIN';
document.getElementById('pinPromptModalMsg').textContent=opts.message||'Masukkan PIN baru (4 digit angka)';
const input=document.getElementById('pinPromptInput');
input.value='';
document.getElementById('pinPromptError').textContent='';
overlay.classList.add('open');
setTimeout(()=>input.focus(),50);
});
}
function _pinPromptSubmit(){
const input=document.getElementById('pinPromptInput');
const val=(input.value||'').trim();
if(val.length!==4){ document.getElementById('pinPromptError').textContent='PIN harus 4 digit angka.'; return; }
document.getElementById('pinPromptModalOverlay').classList.remove('open');
if(_pinPromptResolve){const r=_pinPromptResolve;_pinPromptResolve=null;r(val);}
}
function _pinPromptAnswer(val){
document.getElementById('pinPromptModalOverlay').classList.remove('open');
if(_pinPromptResolve){const r=_pinPromptResolve;_pinPromptResolve=null;r(val);}
}
function showPage(name,el){
document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
document.querySelectorAll('.nav-item').forEach(n=>{n.classList.remove('active');n.setAttribute('aria-current','false');});
const pageEl=document.getElementById('page-'+name);
if(!pageEl){
console.warn(`showPage: halaman #page-${name} tidak ditemukan di DOM -- cek nama page/id (mis. typo, atau halaman belum dirender).`);
return;
}
pageEl.classList.add('active');
const activeBtn=el||document.querySelector(`.nav-item[onclick*="'${name}'"]`);
if(activeBtn){activeBtn.classList.add('active');activeBtn.setAttribute('aria-current','page');}
renderPageContent(name);
const sr=document.getElementById('scrollRoot');
if(sr)sr.scrollTop=0;
}
/* moved to modules-render.js: renderPageContent */
function refreshCurrentPage(){
const active=document.querySelector('.page.active');
if(!active)return;
renderPageContent(active.id.replace('page-',''));
}
function _syncNavVisibilityForModals(){
const anyOpen=document.querySelector('.overlay.open,.qs-modal-overlay.open,.calc-overlay.open');
document.body.classList.toggle('has-open-modal',!!anyOpen);
}
function openModal(id){
const el=document.getElementById(id);
if(!el){
console.warn(`Modal #${id} tidak ditemukan di DOM — cek document.write index (lihat modals.js MODAL_HTML[] vs document.write(MODAL_HTML[i]) di index.html/app_production.html, urutan/jumlahnya harus persis sama).`);
return;
}
el.classList.remove('closing');
el.classList.add('open');
_syncNavVisibilityForModals();
}
// CARD_COLLAPSE_DEFAULT_CLOSED (Sesi 156b, permintaan eksplisit user):
// key card yang defaultnya TERTUTUP kalau user belum pernah tap toggle-nya
// sama sekali (belum ada entry di localStorage cardCollapsePrefs). Card di
// luar daftar ini defaultnya tetap TERBUKA seperti sebelumnya (0 perubahan
// perilaku). Reuse penuh mekanisme toggleCardCollapse/localStorage yang
// sudah ada — TIDAK ada storage/mekanisme collapse baru, cuma nilai default
// saat prefs[key] belum pernah diset.
const CARD_COLLAPSE_DEFAULT_CLOSED=['vehAnalyticsCard','fuelDashCard','fuelCompareCard','fuelTrendCard'];
function _cardCollapseShouldBeCollapsed(key,prefs){
if(Object.prototype.hasOwnProperty.call(prefs,key))return !!prefs[key];
return CARD_COLLAPSE_DEFAULT_CLOSED.indexOf(key)!==-1;
}
function toggleCardCollapse(key,ev){
if(ev)ev.stopPropagation();
const body=document.getElementById(key+'-cbody');
const chev=document.getElementById(key+'-chev');
if(!body)return;
const collapsed=body.classList.toggle('collapsed');
if(chev)chev.classList.toggle('collapsed',collapsed);
try{
const prefs=JSON.parse(localStorage.getItem('cardCollapsePrefs')||'{}');
prefs[key]=collapsed;
localStorage.setItem('cardCollapsePrefs',JSON.stringify(prefs));
}catch(e){ }
}
function applyOneCardCollapsePref(key){
let prefs={};
try{prefs=JSON.parse(localStorage.getItem('cardCollapsePrefs')||'{}');}catch(e){}
const body=document.getElementById(key+'-cbody');
const chev=document.getElementById(key+'-chev');
if(_cardCollapseShouldBeCollapsed(key,prefs)){
if(body)body.classList.add('collapsed');
if(chev)chev.classList.add('collapsed');
}else{
if(body)body.classList.remove('collapsed');
if(chev)chev.classList.remove('collapsed');
}
}
function applyCardCollapsePrefs(){
let prefs={};
try{prefs=JSON.parse(localStorage.getItem('cardCollapsePrefs')||'{}');}catch(e){}
const keys=new Set(Object.keys(prefs).concat(CARD_COLLAPSE_DEFAULT_CLOSED));
keys.forEach(key=>applyOneCardCollapsePref(key));
}
function closeModal(id){
const el=document.getElementById(id);
if(!el)return;
if(id==='txModal'&&typeof WorthIt!=='undefined'&&WorthIt.pendingBuyId){
WorthIt.pendingBuyId=null;
}
if(el.classList.contains('closing'))return;
el.classList.add('closing');
let done=false;
function finish(){
if(done)return;
done=true;
if(el.removeEventListener)el.removeEventListener('animationend',onAnimEnd);
// Kalau di antara closeModal() & sini modal ini sempat dibuka lagi
// (openModal melepas class 'closing'), jangan ikut menutup modal yang
// baru saja dibuka ulang itu.
if(el.classList.contains('closing')){
el.classList.remove('open');
el.classList.remove('closing');
_syncNavVisibilityForModals();
}
}
function onAnimEnd(e){ if(e.target===el)finish(); }
if(el.addEventListener)el.addEventListener('animationend',onAnimEnd);
setTimeout(finish,260);
}
function enableSwipeToDismiss(overlayId){
const overlay=document.getElementById(overlayId);
if(!overlay)return;
const sheet=overlay.querySelector('.modal');
const handle=overlay.querySelector('.modal-handle');
if(!sheet||!handle)return;
const THRESHOLD=90;
let startY=0,lastDy=0,dragging=false;
function pointY(e){return e.touches?e.touches[0].clientY:e.clientY;}
function onStart(e){
dragging=true;
startY=pointY(e);
lastDy=0;
sheet.style.transition='none';
}
function onMove(e){
if(!dragging)return;
const dy=pointY(e)-startY;
if(dy<=0)return;
lastDy=dy;
sheet.style.transform=`translateY(${dy}px)`;
}
function onEnd(){
if(!dragging)return;
dragging=false;
sheet.style.transition='transform 0.2s ease';
if(lastDy>THRESHOLD){
sheet.style.transform='translateY(100%)';
setTimeout(()=>{ closeModal(overlayId); sheet.style.transform=''; },160);
} else {
sheet.style.transform='';
}
lastDy=0;
}
handle.addEventListener('touchstart',onStart,{passive:true});
handle.addEventListener('touchmove',onMove,{passive:true});
handle.addEventListener('touchend',onEnd);
handle.addEventListener('touchcancel',onEnd);
handle.addEventListener('mousedown',onStart);
window.addEventListener('mousemove',onMove);
window.addEventListener('mouseup',onEnd);
}
function openQS(id){document.getElementById(id).classList.add('open');_syncNavVisibilityForModals();}
function closeQS(id){document.getElementById(id).classList.remove('open');_syncNavVisibilityForModals();}

// SARAN (dari review sebelumnya): dukung tombol Escape utk nutup modal, tidak cuma tap ✕/backdrop.
// Urutan prioritas: kalkulator popup (di atas modal lain) -> quick-switcher (qsXxx) -> modal
// sistem generik (confirm/prompt/choice/info/pinPrompt -- ini WAJIB lewat resolver `_xxxAnswer`-nya
// masing2, BUKAN closeModal() biasa, supaya Promise yg lagi nunggu (await askConfirm(), dst) tetap
// ke-resolve, bukan nge-hang selamanya) -> modal fitur generik (.overlay.open biasa, dipilih yg
// z-index paling tinggi kalau lebih dari 1 yg terbuka bertumpuk, spt renovItemModal di atas
// renovDetailModal). Escape TIDAK dipakai kalau fokus lagi di input/textarea yg sedang autocomplete
// suggest-box terbuka (biar tidak nutup modal saat user cuma mau tutup dropdown saran).
document.addEventListener('keydown', function(e){
if(e.key!=='Escape')return;
const calc=document.getElementById('calcModal');
if(calc&&calc.classList.contains('open')){ closeCalc(); return; }
const qs=document.querySelector('.qs-modal-overlay.open');
if(qs){ closeQS(qs.id); return; }
const pinPrompt=document.getElementById('pinPromptModalOverlay');
if(pinPrompt&&pinPrompt.classList.contains('open')){ _pinPromptAnswer(null); return; }
const promptM=document.getElementById('promptModalOverlay');
if(promptM&&promptM.classList.contains('open')){ _promptModalAnswer(null); return; }
const choiceM=document.getElementById('choiceModalOverlay');
if(choiceM&&choiceM.classList.contains('open')){ _choiceModalAnswer(null); return; }
const confirmM=document.getElementById('confirmModalOverlay');
if(confirmM&&confirmM.classList.contains('open')){ _confirmModalAnswer(false); return; }
const infoM=document.getElementById('infoModalOverlay');
if(infoM&&infoM.classList.contains('open')){ _infoModalAnswer(); return; }
const openOverlays=Array.from(document.querySelectorAll('.overlay.open'));
if(!openOverlays.length)return;
openOverlays.sort((a,b)=>(parseInt(getComputedStyle(b).zIndex)||0)-(parseInt(getComputedStyle(a).zIndex)||0));
closeModal(openOverlays[0].id);
});

// PD-007 (docs/PRODUCT_DECISIONS.md "Scanner — Exclusive Scanner Mode via
// ScannerSession"): blok DOM-Detection reaktif yang dulu ada di sini
// (MutationObserver + document.querySelector('video') + setInterval 400ms +
// class body 'camera-scan-active', dipasang utk mencegah preview kamera
// scanner ketiban modal/toast lain yang masih 'open' -- lihat riwayat bugfix
// di CHANGELOG) DIHAPUS & digantikan ScannerSession.pauseUI()/resumeUI()
// (modules/shared/scanner-session.js), dipanggil EKSPLISIT dari
// ScannerSession.enter()/exit() -- satu-satunya titik masuk/keluar scanner
// (VehicleScanner.scan()/SparepartScanner.scan() & scanner masa depan).
// State "scanner aktif" sekarang eksplisit (di-set enter()/exit() sendiri),
// bukan lagi ditebak dari keberadaan elemen <video> di DOM.

// openShopKatalogDinamis() — trigger tipis utk modal shopKatalogDinamisModal
// (modals.js) + render pertama ShopKatalogDinamisPresenter (modules/vehicle/
// shop-katalog-dinamis-presenter.js). 100% REUSE openModal() yang SUDAH ADA
// di atas — TIDAK ada mekanisme modal baru dibuat.
function openShopKatalogDinamis(){
  openModal('shopKatalogDinamisModal');
  if (typeof ShopKatalogDinamisPresenter !== 'undefined') ShopKatalogDinamisPresenter.render();
}
