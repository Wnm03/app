// pengaturan-search.js — Domain Pencarian Pengaturan: buka/tutup grup pengaturan (toggleStgGroup), cari
// Dipindah ke modules/shared/pengaturan-search.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// & sorot kartu pengaturan yang cocok teks pencarian (stgSearch), dan dukungan keyboard (Enter/Spasi)
// utk buka grup pengaturan lewat kepala grup yang sedang fokus.
// Dipindah dari features-helpers-global-security.js (v73) — potongan KEENAM stlh kalkulator-input.js
// (v69), keamanan-pin.js (v70), modal-navigasi.js (v71), reset-gaji-mingguan.js (v72),
// debug-console.js (v73, potongan sebelum ini di sesi yang sama). Dipilih krn domain kecil & mandiri:
// cuma pakai document.querySelectorAll/getElementById (DOM murni), TIDAK bergantung ke D atau modul
// lain sama sekali.
// CATATAN: blok ini menyertakan 1 `document.addEventListener('keydown',...)` top-level yang jalan saat
// file dimuat (bukan cuma deklarasi function) — ini AMAN dipindah krn cuma daftarkan event listener
// baru ke window/document, tidak bergantung urutan modul lain siap atau tidak.
// Dipanggil dari: `onclick="toggleStgGroup(...)"` & `oninput="stgSearch(...)"` di halaman Pengaturan
// (index.html/app_production.html).
// PENTING: file ini HARUS dimuat SETELAH features-helpers-global-security.js.
// setSettingsTab: split-tab utk halaman Pengaturan (#page-settings), gantiin accordion 6 grup
// lama (stgGroup1..6) yang sekarang jadi .stg-tabpanel + .cn-tabs. Pola PERSIS SAMA dgn
// setKeuanganTab/setShopTab/setPajakTab/setAsetTab (lihat aset.js) -- toggle 'active' di tombol
// .cn-tab & toggle 'u-dnone' di panel yg cocok data-tab. toggleStgGroup() di bawah TETAP ada &
// TIDAK diubah -- masih dipakai apa adanya utk accordion lain (dashSecondaryGroup di Beranda,
// pzPiutangUtangGroup di Pajak & Zakat), cuma sudah tidak dipakai lagi utk stgGroup1..6.
// FIX (audit lanjutan S679): array ini sebelumnya cuma 6 entry, hilang
// 'pengingat' -- padahal ada 7 tombol .cn-tab nyata di #page-settings
// (urutan DOM: profil, keuangan, pengingat, notifbackup, keamanan,
// kepemilikan, diagnostik). Array ini dipakai sbg fallback index saat
// setSettingsTab(tab) dipanggil TANPA `el` eksplisit (bukan dari klik
// tombol) -- terbukti terjadi dari 3 pemanggil: stgSearch() di file ini
// (baris di bawah), DashboardHub deep-link (dashboard-hub.js, blok
// `target.group`), & _lifeOSHighlightSettingsCard (lifeos-nav.js). Saat
// tab='pengingat', indexOf() sebelumnya balikin -1 -> fallback ke index 0
// -> tombol 'Profil' yang ke-highlight active, padahal panel yang
// ditampilkan tetap 'Pengingat' (baris `p.dataset.tab!==tab` di bawah
// pakai `tab` asli, jadi ini bug visual: tombol aktif salah, bukan salah
// panel). Urutan array HARUS sama persis dgn urutan tombol di DOM krn
// `settingsTabBtns[idx]` mengandalkan itu.
const SETTINGS_TAB_ORDER=['profil','keuangan','pengingat','notifbackup','keamanan','kepemilikan','diagnostik'];
const SETTINGS_TAB_LABEL={profil:'Profil',keuangan:'Keuangan',pengingat:'Pengingat',notifbackup:'Notif&Backup',keamanan:'Keamanan',kepemilikan:'Kepemilikan',diagnostik:'Diagnostik'};
function setSettingsTab(tab,el){
// BUGFIX (audit bug serupa S619 -- lihat dismissAllToasts() di
// modules/shared/format-tema.js & setAsetTab() di modules/asset/aset-misc.js):
// toast basi dari halaman/aksi sebelumnya bisa nyangkut menutupi tombol di
// sub-tab baru begitu user pindah sub-tab TANPA lewat showPage() (mis. ganti
// sub-tab di dalam halaman Settings yang sama). Pola sama persis dgn semua
// fungsi set*Tab lain, lihat CHANGELOG-S620.md.
if(typeof dismissAllToasts==='function')dismissAllToasts();
const settingsTabBtns=document.querySelectorAll('#page-settings .cn-tabs .cn-tab');
settingsTabBtns.forEach(b=>b.classList.remove('active'));
let _activeBtn=el;
if(el) el.classList.add('active');
else { const idx=SETTINGS_TAB_ORDER.indexOf(tab); const btn=settingsTabBtns[idx>=0?idx:0]; if(btn){btn.classList.add('active');_activeBtn=btn;} }
if(typeof scrollTabBarIntoView==='function') scrollTabBarIntoView(_activeBtn);
const settingsBc=document.getElementById('settingsBreadcrumbSub');
if(settingsBc)settingsBc.textContent=SETTINGS_TAB_LABEL[tab]||tab;
document.querySelectorAll('#page-settings .stg-tabpanel').forEach(p=>{
p.classList.toggle('u-dnone', p.dataset.tab!==tab);
p.style.display='';
});
}
function toggleStgGroup(id){
var g=document.getElementById(id);
if(!g)return;
const isOpen=g.classList.toggle('open');
const head=g.querySelector('.stg-group-head');
if(head)head.setAttribute('aria-expanded',isOpen?'true':'false');
}
// Collapse per-kartu (beda dari toggleStgGroup yg collapse seluruh grup) — dipakai kartu tunggal
// yg isinya panjang, mis. "Kartu di Beranda". `id` = id elemen .card-collapse pembungkusnya.
// PENTING: nama fungsi ini SENGAJA dibedakan dari toggleCardCollapse(key,ev) di modal-navigasi.js
// (dipakai ~40+ kartu lain lewat data-action="toggleCardCollapse" dengan skema id `key+'-cbody'`/
// `key+'-chev'`). SEBELUMNYA file ini juga mendeklarasikan global bernama `toggleCardCollapse`
// dengan signature & skema DOM yang beda (toggle class 'open' di elemen pembungkus + cari child
// `.card-collapse-head`) — karena file ini dimuat SETELAH modal-navigasi.js, deklarasi function
// di sini MENIMPA punya modal-navigasi.js secara global, jadi SEMUA kartu lain (Beranda, Keuangan,
// Laporan, Car Notes, Pajak/Zakat, dst) yang pakai data-action="toggleCardCollapse" ikut manggil
// fungsi versi sini yang salah skema — akibatnya tombol collapse-nya diam saja / tidak berfungsi.
// Jangan pakai nama `toggleCardCollapse` lagi di file ini.
function toggleSingleCardCollapse(id){
var c=document.getElementById(id);
if(!c)return;
const isOpen=c.classList.toggle('open');
const head=c.querySelector('.card-collapse-head');
if(head)head.setAttribute('aria-expanded',isOpen?'true':'false');
}
// STG_EXTERNAL_SETTINGS_INDEX — daftar kecil "pengaturan referensi" yang TIDAK
// tinggal di dalam #page-settings (dipindah ke halaman fiturnya masing-masing,
// pola yang sama dgn kartu "🔗 Pengaturan Lanjutan per Fitur"). stgSearch() ikut
// mencocokkan query ke sini supaya orang yang cari "emas"/"self reward"/"pbb"/
// dsb di kotak cari Pengaturan tetap dapat hasil (arahkan ke halaman tujuan),
// bukan "Tidak ada pengaturan yang cocok" padahal fiturnya beneran ada.
// Setiap entry: label (teks tombol), keywords (dicocokkan ke q, lowercase),
// lalu SALAH SATU dari:
//   - page: dibuka lewat showPage(page, navBtn) — navBtn diambil otomatis dari
//     .nav-item yang data-args-nya match nama page tsb.
//   - action: dipanggil langsung (dieval sbg "Namespace.method" atau nama
//     fungsi global), dipakai utk fitur yang bentuknya modal (bukan halaman),
//     sama kayak target FEATURE_REGISTRY.
const STG_EXTERNAL_SETTINGS_INDEX=[
{label:'💰 Kategori & Import Transaksi → Keuangan',keywords:'kategori import transaksi csv excel',page:'keuangan'},
{label:'🏍️ Kategori Sparepart → Car Notes',keywords:'kategori sparepart mobil motor car notes',page:'carnotes'},
{label:'🛒 Katalog Sparepart per Kendaraan (Shop)',keywords:'katalog sparepart kendaraan shop dinamis interval servis',action:'openShopKatalogDinamis'},
{label:'🕌 Harga Emas, Nisab & PBB → Pajak & Zakat',keywords:'emas nisab zakat pbb pajak njoptkp tarif referensi harga emas',page:'pajak'},
{label:'🎁 Level & Toleransi → Self Reward',keywords:'self reward hadiah level toleransi telat',action:'SelfRewardView.open'},
{label:'📊 Pengaturan Anggaran → Keuangan (tab Budget)',keywords:'budget anggaran atur anggaran',page:'keuangan'}
];
function _stgOpenExternal(item){
if(item.action){
try{
const fn=item.action.split('.').reduce((o,k)=>o&&o[k],window);
if(typeof fn==='function') fn();
else console.warn('stgSearch: action tidak ditemukan -',item.action);
}catch(e){console.warn('stgSearch: gagal panggil action -',item.action,e);}
return;
}
if(item.page && typeof showPage==='function'){
const navBtn=document.querySelector('.nav-item[data-args*="\\"'+item.page+'\\""]');
showPage(item.page,navBtn);
}
}
let _stgSearchHighlighted=[];
function stgSearch(qRaw){
const q=(qRaw||'').trim().toLowerCase();
const resultEl=document.getElementById('stgSearchResult');
_stgSearchHighlighted.forEach(c=>{c.style.outline='';c.style.outlineOffset='';});
_stgSearchHighlighted=[];
if(!q){ if(resultEl){resultEl.style.display='none';resultEl.innerHTML='';} return; }
const cards=document.querySelectorAll('#page-settings .stg-group-body-inner .card');
let matches=[];
cards.forEach(card=>{
if(card.textContent.toLowerCase().indexOf(q)!==-1) matches.push(card);
});
const externalMatches=STG_EXTERNAL_SETTINGS_INDEX.filter(item=>item.keywords.indexOf(q)!==-1);
if(resultEl){
resultEl.classList.remove('u-dnone');resultEl.style.display='block';
let html='';
if(matches.length) html+='✅ '+matches.length+' hasil ditemukan di sini<br>';
else if(!externalMatches.length) html+='⚠️ Tidak ada pengaturan yang cocok';
if(externalMatches.length){
html+='🔗 Ditemukan di halaman lain:<br>'+externalMatches.map(item=>
'<button type="button" class="btn btn-ghost btn-sm u-mt6" style="display:block;width:100%;text-align:left" data-stg-ext-idx="'+STG_EXTERNAL_SETTINGS_INDEX.indexOf(item)+'">'+item.label+'</button>'
).join('');
}
resultEl.innerHTML=html;
resultEl.querySelectorAll('[data-stg-ext-idx]').forEach(btn=>{
btn.addEventListener('click',function(){
const item=STG_EXTERNAL_SETTINGS_INDEX[parseInt(btn.dataset.stgExtIdx,10)];
if(item) _stgOpenExternal(item);
});
});
}
matches.forEach((card,i)=>{
const panel=card.closest('.stg-tabpanel');
if(i===0 && panel && panel.classList.contains('u-dnone')) setSettingsTab(panel.dataset.tab);
if(card.classList.contains('card-collapse') && !card.classList.contains('open')) toggleSingleCardCollapse(card.id);
card.style.outline='2px solid var(--accent)';
card.style.outlineOffset='3px';
_stgSearchHighlighted.push(card);
if(i===0) setTimeout(()=>card.scrollIntoView({behavior:'smooth',block:'center'}),120);
});
}
document.addEventListener('keydown',function(e){
if(e.key!=='Enter'&&e.key!==' ')return;
const head=e.target.closest&&e.target.closest('.stg-group-head,.card-collapse-head');
if(!head)return;
e.preventDefault();
head.click();
});
