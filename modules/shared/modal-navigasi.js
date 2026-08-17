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
//
// BUGFIX (audit "tombol Bayar/Riwayat macet, 0 toast", laporan user): kelima dialog custom
// di bawah (confirm/prompt/choice/alert/pin) dulu masing-masing cuma punya SATU variabel
// resolver module-scope (mis. `_confirmResolve`). Kalau fungsi show-nya terpanggil 2x
// sebelum jawaban pertama masuk (mis. double-tap tombol "Bayar" di layar sentuh -- SANGAT
// umum -- atau 2 alur berbeda yang kebetulan sama-sama minta konfirmasi), panggilan kedua
// MENIMPA resolver panggilan pertama: Promise pertama jadi orphan, tidak pernah
// resolve/reject, tidak ada error/toast (dispatcher klik di features-helpers-global-
// security.js cuma nangkep REJECT, bukan promise yang cuma diam menggantung selamanya).
// Fix: _queueDialog() di bawah menyimpan SEMUA permintaan (bukan cuma yang terakhir) di
// antrean per-jenis dialog; permintaan berikutnya BARU ditampilkan setelah yang sebelumnya
// dijawab, jadi tidak ada satupun Promise yang hilang/orphan. 0 perubahan pada pemanggil
// (askConfirm()/showPromptModal()/dst tetap 1 pemanggilan = 1 Promise seperti sebelumnya).
// BUGFIX (audit lanjutan v1026 — celah ScannerSession self-heal, laporan
// user "confirmModalOverlay tidak melewati openModal()"): v1026 memasang
// self-heal ScannerSession (ScannerSession.isActive(), lihat komentar
// lengkap di openModal() bawah) TAPI cuma di openModal(). 5 dialog custom
// (askConfirm/showPromptModal/showChoiceModal/showAlertModal/
// showPinPromptModal) semuanya TIDAK lewat openModal() -- overlay-nya
// langsung di-classList.add('open') sendiri lewat _queueDialog() di bawah.
// Kalau body.scanner-session-active nyangkut (skenario SAMA PERSIS spt
// fix v1026: proses tutup kamera scan terputus), dialog2 ini kena gejala
// identik -- classList 'open' sukses ditambahkan scr JS, tapi CSS
// _scannerSessionEnsureStyle() men-display:none!important overlay-nya DAN
// #toast, jadi dialog "macet total" tanpa jejak. Ini serius krn askConfirm()
// dipakai di ~20 file utk konfirmasi aksi DESTRUKTIF (hapus transaksi/akun/
// dll) -- user bisa kejebak tanpa jalan keluar selain reload penuh.
// Fix: 1 titik guard (_dialogSelfHeal()) dipanggil dari _queueDialog() --
// otomatis meng-cover SEMUA 5 dialog di atas krn semuanya lewat helper ini,
// dipanggil lagi di _resolveDialog() saat dialog berikutnya di antrean
// digilir (supaya self-heal juga jalan utk dialog yang sempat menunggu di
// antrean, bukan cuma dialog pertama). Pola SAMA PERSIS openModal()/
// showPage() (fix v1026) -- 0 perubahan API, 0 breaking change ke pemanggil
// existing (askConfirm()/showPromptModal()/dst tetap 1 pemanggilan = 1
// Promise seperti sebelumnya).
function _dialogSelfHeal(){
if(typeof ScannerSession!=='undefined' && ScannerSession && typeof ScannerSession.isActive==='function'){
ScannerSession.isActive();
}
}
// FIX (audit opacity-stuck-0): helper dipakai 5 dialog custom di bawah
// (askConfirm/showPromptModal/showChoiceModal/showAlertModal/showPinPromptModal),
// semuanya classList.add('open') langsung tanpa lewat openModal() -- pola identik
// yg kena race "animation overlayIn gagal terinstansiasi, opacity macet 0
// permanen" (lihat komentar lengkap di openModal()). Titik tunggal ini dipakai
// supaya fix-nya otomatis cover semua 5 dialog sekaligus.
function _openDialogOverlay(el){
el.classList.add('open');
void el.offsetWidth;
// FIX (audit UI/UX aksesibilitas keyboard, lanjutan sesi focus-trap
// openModal/closeModal): titik tunggal ini dipakai SEMUA 5 dialog custom
// (askConfirm/showPromptModal/showChoiceModal/showAlertModal/
// showPinPromptModal, lihat komentar di atas), jadi cukup 1 pemanggilan
// di sini utk cover semuanya sekaligus -- reuse penuh
// _focusTrapActivate() yang sudah ada (dipakai openModal() juga), 0 fungsi
// baru ditambah.
_focusTrapActivate(el);
}
function _queueDialog(store,renderFn){
return new Promise((resolve)=>{
store.queue.push({resolve,renderFn});
if(store.queue.length===1){ _dialogSelfHeal(); renderFn(); }
});
}
function _resolveDialog(store,overlayId,val){
const el=document.getElementById(overlayId);
el.classList.remove('open');
_focusTrapDeactivate(el);
const cur=store.queue.shift();
if(cur)cur.resolve(val);
if(store.queue.length) setTimeout(()=>{ _dialogSelfHeal(); store.queue[0].renderFn(); },0);
}
const _confirmStore={queue:[]};
function askConfirm(message,opts){
opts=opts||{};
return _queueDialog(_confirmStore,()=>{
document.getElementById('confirmModalIcon').textContent=opts.icon||'⚠️';
document.getElementById('confirmModalTitle').textContent=opts.title||'Konfirmasi';
document.getElementById('confirmModalMsg').textContent=message;
const okBtn=document.getElementById('confirmModalOk');
okBtn.textContent=opts.okText||'Ya, Lanjutkan';
okBtn.className='btn btn-full '+(opts.danger===false?'btn-primary':'btn-danger');
document.getElementById('confirmModalCancel').textContent=opts.cancelText||'Batal';
_openDialogOverlay(document.getElementById('confirmModalOverlay'));
});
}
function _confirmModalAnswer(val){
_resolveDialog(_confirmStore,'confirmModalOverlay',val);
}
const _promptStore={queue:[]};
function showPromptModal(opts){
opts=opts||{};
const overlay=document.getElementById('promptModalOverlay');
if(!overlay){ return Promise.resolve(prompt(opts.message||'',opts.defaultValue!=null?String(opts.defaultValue):'')); }
return _queueDialog(_promptStore,()=>{
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
_openDialogOverlay(overlay);
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
_resolveDialog(_promptStore,'promptModalOverlay',val);
}
function _promptModalAnswer(val){
_resolveDialog(_promptStore,'promptModalOverlay',val);
}
const _choiceStore={queue:[]};
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
return _queueDialog(_choiceStore,()=>{
document.getElementById('choiceModalTitle').textContent=opts.title||'Pilih';
const msgEl=document.getElementById('choiceModalMsg');
msgEl.textContent=opts.message||'';
msgEl.style.display=opts.message?'':'none';
const list=document.getElementById('choiceModalList');
list.innerHTML=choices.map((c,i)=>`<button class="btn btn-ghost btn-full" style="justify-content:flex-start;text-align:left" data-action="_choiceModalAnswer" data-args="${escapeHtml(JSON.stringify([i]))}">${escapeHtml(c.label)}</button>`).join('');
_openDialogOverlay(document.getElementById('choiceModalOverlay'));
});
}
function _choiceModalAnswer(idx){
_resolveDialog(_choiceStore,'choiceModalOverlay',idx);
}
const _infoStore={queue:[]};
function showAlertModal(message,opts){
opts=opts||{};
const overlay=document.getElementById('infoModalOverlay');
if(!overlay){ alert(message); return Promise.resolve(); }
return _queueDialog(_infoStore,()=>{
document.getElementById('infoModalIcon').textContent=opts.icon||'⚠️';
document.getElementById('infoModalTitle').textContent=opts.title||'Perhatian';
document.getElementById('infoModalMsg').textContent=message;
document.getElementById('infoModalOk').textContent=opts.okText||'Mengerti';
_openDialogOverlay(overlay);
});
}
function _infoModalAnswer(){
_resolveDialog(_infoStore,'infoModalOverlay',true);
}
const _pinPromptStore={queue:[]};
function showPinPromptModal(opts){
opts=opts||{};
const overlay=document.getElementById('pinPromptModalOverlay');
if(!overlay){ return Promise.resolve(prompt(opts.message||'PIN baru (4 digit):')); }
return _queueDialog(_pinPromptStore,()=>{
document.getElementById('pinPromptModalTitle').textContent=opts.title||'Ganti PIN';
document.getElementById('pinPromptModalMsg').textContent=opts.message||'Masukkan PIN baru (4 digit angka)';
const input=document.getElementById('pinPromptInput');
input.value='';
document.getElementById('pinPromptError').textContent='';
_openDialogOverlay(overlay);
setTimeout(()=>input.focus(),50);
});
}
function _pinPromptSubmit(){
const input=document.getElementById('pinPromptInput');
const val=(input.value||'').trim();
if(val.length!==4){ document.getElementById('pinPromptError').textContent='PIN harus 4 digit angka.'; return; }
_resolveDialog(_pinPromptStore,'pinPromptModalOverlay',val);
}
function _pinPromptAnswer(val){
_resolveDialog(_pinPromptStore,'pinPromptModalOverlay',val);
}
function showPage(name,el){
// BUGFIX (audit "semua tombol di Car Notes tidak respon", laporan user, v1025):
// root cause -- showPage() (dipanggil tiap pindah tab bawah) TIDAK PERNAH
// membersihkan overlay/modal yang masih class="open" (mis. catalogModal
// ditinggal terbuka krn user pindah tab lewat nav/gesture back, bukan lewat
// tombol ✕ / closeModal() eksplisit). Overlay itu full-viewport & selalu di
// atas konten halaman manapun -- dispatcher klik global
// (features-helpers-global-security.js) resolve lewat
// e.target.closest('[data-action]'); overlay yg nyangkut selalu jadi target
// duluan & TIDAK match [data-action], jadi handler `return` diam-diam (nol
// error, nol toast) utk SEMUA tombol di halaman manapun, bukan cuma tab yg
// sedang dibuka. Fix: paksa tutup semua overlay yg masih 'open'/'closing'
// tiap kali user pindah tab bawah -- pindah tab = keluar dari konteks modal
// manapun, jadi aman ditutup paksa tanpa animasi (bukan closeModal() biasa,
// supaya tidak nunggu 260ms/animationend & tidak konflik state modal lain).
document.querySelectorAll('.overlay.open,.calc-overlay.open,.qs-modal-overlay.open').forEach(o=>{
o.classList.remove('open');
o.classList.remove('closing');
});
document.body.classList.remove('has-open-modal');
// BUGFIX (audit "semua tombol Car Notes & Tagihan tidak respon, 0 toast",
// laporan user): ScannerSession bisa nyangkut _scannerSessionActive=true
// permanen kalau proses tutup kamera terputus (app di-minimize saat prompt
// izin kamera, tab di-suspend, dll) -- lihat modules/shared/scanner-session.js.
// Selama itu, body.scanner-session-active nempel & CSS
// (_scannerSessionEnsureStyle) men-display:none SEMUA .overlay/.qs-modal-
// overlay/.calc-overlay/.keu-fab/#toast SELAMANYA -- termasuk toast error
// dispatcher sendiri, jadi tombol kelihatan "mati total" tanpa jejak apa pun.
// Self-heal (_scannerSessionSelfHeal) sebelumnya CUMA jalan lewat
// ScannerSession.enter()/isActive(), yang cuma dipanggil saat user coba buka
// scanner LAGI -- kalau user cuma pindah tab (showPage(), seperti di laporan
// ini), state nyangkut ini tidak pernah ke-heal. Fix: panggil isActive() di
// sini juga -- pindah tab = titik aman utk self-heal (bukan lagi dalam
// konteks scanner manapun), 0 perubahan API ScannerSession, 0 breaking
// change ke pemanggil existing.
if(typeof ScannerSession!=='undefined' && ScannerSession && typeof ScannerSession.isActive==='function'){
ScannerSession.isActive();
}
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
// FOCUS TRAP (audit UI/UX aksesibilitas keyboard, Agustus 2026): sebelum ini,
// Tab/Shift+Tab masih bisa "bocor" dari dalam modal ke elemen di belakang
// overlay (elemen halaman yang tertutup visual tapi tetap ada di DOM & masih
// fokusable) — menyulitkan pengguna keyboard/screen reader, fokus terasa
// hilang/lompat tak terduga. Implementasi MINIMAL & additive: TIDAK mengubah
// alur openModal()/closeModal() yang sudah ada (cuma 1 baris panggilan
// ditambah di titik yang sudah ada, lihat _focusTrapActivate/_focusTrapDeactivate
// di bawah), 0 perubahan pada pemanggil openModal/closeModal di file lain.
// Ditumpuk pakai array (bukan 1 variabel tunggal) supaya modal bertumpuk
// (lihat komentar `_stacked` di openModal() bawah) tetap benar: Tab dikunci
// ke modal PALING ATAS saja, & saat modal teratas ditutup, trap otomatis
// kembali berlaku ke modal di bawahnya kalau masih ada yg terbuka.
// Cakupan sengaja dibatasi ke openModal()/closeModal() (modal fitur generik)
// dulu di sesi ini — 5 dialog custom (askConfirm/showPromptModal/
// showChoiceModal/showAlertModal/showPinPromptModal) yang lewat
// _queueDialog() BELUM disentuh, supaya perubahan tetap kecil & mudah
// diverifikasi. Bisa disusulkan sesi terpisah kalau audit ini terbukti aman.
const _focusTrapStack=[];
function _focusTrapFocusableEls(container){
if(!container||typeof container.querySelectorAll!=='function')return [];
return Array.prototype.slice.call(container.querySelectorAll(
'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
)).filter(function(el){return !!(el.offsetWidth||el.offsetHeight||el.getClientRects().length);});
}
function _focusTrapKeydown(e){
if(e.key!=='Tab')return;
const top=_focusTrapStack[_focusTrapStack.length-1];
if(!top)return;
const focusables=_focusTrapFocusableEls(top.container);
if(!focusables.length)return;
const first=focusables[0],last=focusables[focusables.length-1];
if(e.shiftKey && document.activeElement===first){
e.preventDefault();last.focus();
}else if(!e.shiftKey && document.activeElement===last){
e.preventDefault();first.focus();
}
}
function _focusTrapActivate(container){
if(!container)return;
_focusTrapStack.push({container:container,lastFocused:document.activeElement});
if(_focusTrapStack.length===1){
document.addEventListener('keydown',_focusTrapKeydown,true);
}
const focusables=_focusTrapFocusableEls(container);
if(focusables.length){
focusables[0].focus();
}else if(typeof container.focus==='function'){
if(typeof container.setAttribute==='function'&&(typeof container.hasAttribute!=='function'||!container.hasAttribute('tabindex')))container.setAttribute('tabindex','-1');
container.focus();
}
}
function _focusTrapDeactivate(container){
const idx=_focusTrapStack.map(function(x){return x.container;}).lastIndexOf(container);
if(idx===-1)return;
const entry=_focusTrapStack[idx];
_focusTrapStack.splice(idx,1);
if(_focusTrapStack.length===0){
document.removeEventListener('keydown',_focusTrapKeydown,true);
}
if(entry.lastFocused && typeof entry.lastFocused.focus==='function' && document.contains(entry.lastFocused)){
try{entry.lastFocused.focus();}catch(e){}
}
}
function openModal(id){
const el=document.getElementById(id);
if(!el){
console.warn(`Modal #${id} tidak ditemukan di DOM — cek document.write index (lihat modals.js MODAL_HTML[] vs document.write(MODAL_HTML[i]) di index.html/app_production.html, urutan/jumlahnya harus persis sama).`);
return;
}
// FIX (audit: openModal() langsung dari tombol, mis. openVehicleModal()/
// VehicleCatalogUI.open(), tanpa lewat showPage() dulu — laporan user "tab
// Kelola Kendaraan/Katalog Suku Cadang tidak respon, 0 toast"): self-heal
// ScannerSession SEBELUMNYA cuma dipanggil dari showPage() (pindah tab) atau
// ScannerSession.enter() (coba buka scanner lagi) — kalau _scannerSessionActive
// nyangkut true (kamera scan kependam: izin ditolak/app di-minimize/tab
// di-suspend saat scan) TAPI user cuma tap tombol buka modal biasa (bukan
// pindah tab, bukan buka scanner), state nyangkut ini tidak pernah ke-heal.
// Akibatnya el.classList.add('open') di bawah tetap jalan (modal "berhasil"
// dibuka secara JS), tapi CSS body.scanner-session-active memaksa
// display:none ke SEMUA .overlay.open DAN #toast (lihat
// scanner-session.js/_scannerSessionEnsureStyle) — user tidak lihat modal
// atau toast apa pun. Fix: panggil isActive() di sini juga, pola SAMA PERSIS
// showPage() — 0 perubahan API ScannerSession, 0 breaking change.
if(typeof ScannerSession!=='undefined' && ScannerSession && typeof ScannerSession.isActive==='function'){
ScannerSession.isActive();
}
// FIX (audit: race condition scan-ocr.js async vs pindah record) — naikkan
// epoch tiap modal dibuka (termasuk dibuka ULANG utk record berbeda, mis. edit
// Tagihan A lalu edit Tagihan B, sama-sama lewat openBillModal->openModal
// 'billModal'). scan-ocr.js pakai epoch ini utk tahu kalau OCR yang sedang
// berjalan sudah "basi" krn modal/record sudah berpindah sebelum hasil scan
// selesai -- lihat komentar lengkap di _scanEpochNow()/_scanEpochStale().
window._modalEpoch=(window._modalEpoch||0)+1;
// FIX (audit "dropdown Pilih Pemilik tidak bisa dipilih", laporan user Agustus
// 2026): kalau modal ini dibuka SEBAGAI TUMPUKAN di atas modal lain yang masih
// terbuka (mis. assetOwnersModal dari dalam assetModal -- lihat
// Aset.openOwnersModal()), tandai `.modal` di dalamnya dengan class `.no-anim`
// (lihat styles.css) supaya animasi slideUp/transform TIDAK dipasang -- mencegah
// compositing layer tumpukan yang jadi pemicu native <select> di dalamnya gagal
// merespons tap opsi selain opsi yang sedang aktif. Modal yang dibuka sendirian
// (tanpa modal lain yang masih `.open`) tidak terpengaruh sama sekali -- animasi
// tetap seperti semula. querySelector('.overlay.open') dicek SEBELUM class
// 'open' baru ditambahkan ke `el` di bawah, supaya `el` sendiri tidak ikut
// terhitung sebagai "modal lain yang masih terbuka".
const _stacked=!!document.querySelector('.overlay.open');
const _modalInner=(typeof el.querySelector==='function')?el.querySelector('.modal'):null;
if(_modalInner)_modalInner.classList.toggle('no-anim',_stacked);
el.classList.remove('closing');
el.classList.add('open');
// FIX (audit opacity-stuck-0, laporan user "vehicleModal keluar tapi opacity 0
// permanen walau display:flex & class .open benar, prefers-reduced-motion OFF"):
// .overlay.open melakukan 2 perubahan sekaligus dlm 1 rule yg sama, dipicu 1
// classList.add('open') ini -- display:none->flex DAN mulai animasi CSS overlayIn
// (opacity 0->1). Kalau browser sempat menggabungkan 2 perubahan itu jadi 1 style
// recalc (tanpa reflow di antaranya), instansiasi Animation utk overlayIn bisa
// gagal total: computed style tetap "mengaku" animationName:overlayIn &
// animationPlayState:running (krn itu cuma refleksi rule CSS yg match), TAPI
// el.getAnimations() kosong & currentTime tidak pernah maju -- elemen macet
// permanen di keyframe from{opacity:0}. Fix: paksa 1 synchronous reflow di
// antara display berubah & animasi mulai, supaya browser tidak sempat
// menggabungkan 2 perubahan itu. void sengaja dipakai supaya linter/minifier
// tidak membuang baris ini krn dikira "unused expression" -- efek sampingnya
// (memaksa reflow) yg memang dibutuhkan, bukan nilainya.
void el.offsetWidth;
_syncNavVisibilityForModals();
_focusTrapActivate(el);
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
_focusTrapDeactivate(el);
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
// BUGFIX (audit lanjutan v1026, sama persis kasus _queueDialog() di atas):
// openQS() juga langsung classList.add('open') tanpa lewat openModal(),
// jadi Quick Switcher kena celah self-heal ScannerSession yang sama.
function openQS(id){
_dialogSelfHeal();
const el=document.getElementById(id);
el.classList.add('open');
void el.offsetWidth; // FIX opacity-stuck-0: pola sama persis openModal(), lihat komentar lengkap di sana
_syncNavVisibilityForModals();
}
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
