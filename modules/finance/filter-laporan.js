// filter-laporan.js — Filter transaksi/keuangan (panel filter Keuangan & Laporan), pencarian, paginasi list transaksi, navigasi antar-list (goToList/showFilteredTx)
// Dipindah ke modules/finance/filter-laporan.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: data-default.js, features-helpers-global-security.js, diagnostik-versi.js, format-tema.js, error-handler.js, helper-teks.js, keamanan-pin.js, modal-navigasi.js, reset-gaji-mingguan.js, debug-console.js, pengaturan-search.js, onboarding.js, kalkulator-input.js, scan-ocr.js, filter-laporan.js, akun.js, gaji-calc.js, transaksi.js, profil-pengaturan.js, kategori.js, tagihan-kalender.js, backup-restore.js, payroll-absensi.js, tukang-absensi.js

function txMatchesFilters(t,f){
if(f.tipe&&f.tipe!=='semua'){
if(f.tipe==='transfer'){if(t.type!=='transfer_in'&&t.type!=='transfer_out')return false;}
else if(t.type!==f.tipe)return false;
}
if(f.kat&&f.kat!=='semua'&&t.category!==f.kat)return false;
if(f.sub&&f.sub!=='semua'&&(t.subcategory||'')!==f.sub)return false;
if(f.acc&&f.acc!=='semua'&&t.accountId!==f.acc)return false;
if(f.method&&f.method!=='semua'&&(t.payMethod||'tunai')!==f.method)return false;
return true;
}
function populateCatFilter(){
populateCatSelect('fKat');
populateSubSelect('fSub','fKat');
}
function onFKatChange(){
populateSubSelect('fSub','fKat');
renderLaporan();
}
function resetLaporanFilter(){
['fTipe','fKat','fSub','fAcc','fMethod'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=el.id==='fAcc'?'semua':'semua';});
populateSubSelect('fSub','fKat');
renderLaporan();
toast('↺ Filter laporan direset');
}
function getLaporanFilters(){
return{
tipe:document.getElementById('fTipe')?.value||'semua',
kat:document.getElementById('fKat')?.value||'semua',
sub:document.getElementById('fSub')?.value||'semua',
acc:document.getElementById('fAcc')?.value||'semua',
method:document.getElementById('fMethod')?.value||'semua'
};
}
function populateKeuFilters(){
populateCatSelect('kfKat');
populateSubSelect('kfSub','kfKat');
const opts=D.accounts.map(a=>`<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
const kfAcc=document.getElementById('kfAcc');
if(kfAcc){const cur=kfAcc.value;kfAcc.innerHTML='<option value="semua">Semua Akun</option>'+opts;kfAcc.value=[...kfAcc.options].some(o=>o.value===cur)?cur:'semua';}
}
function onKfKatChange(){
populateSubSelect('kfSub','kfKat');
resetTxPageAndRender();
}
function toggleKeuFilter(){
const panel=document.getElementById('keuFilterPanel');
if(!panel)return;
// FIX (BUG-009, audit 2026-08): panel ini disembunyikan DEFAULT lewat class CSS
// 'u-dnone' (lihat index.html/app_production.html), BUKAN inline style -- jadi
// panel.style.display kosong ('') di kondisi awal, bukan 'none'. Deteksi lama
// (style.display==='none') salah baca kondisi awal sbg "sudah kebuka" (show=false),
// jadi tap PERTAMA malah nge-set ulang jadi 'none' (keliatan no-op ke user) --
// baru tap KEDUA panel benar-benar kebuka. Ganti ke classList/getComputedStyle
// (fallback kalau class-nya sudah dilepas manual, mis. baris updateKfBadge() di
// bawah yang langsung set style.display='block' saat ada filter aktif tersimpan).
const show=panel.classList.contains('u-dnone')||getComputedStyle(panel).display==='none';
panel.classList.remove('u-dnone');
panel.style.display=show?'block':'none';
if(show)populateKeuFilters();
updateKfBadge();
}
function resetKeuFilter(){
['kfTipe','kfKat','kfSub','kfAcc','kfMethod'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=id==='kfAcc'?'semua':'semua';});
const s=document.getElementById('kfSearch');if(s)s.value='';
populateSubSelect('kfSub','kfKat');
saveKeuFilterPrefs();
resetTxPageAndRender();
toast('↺ Filter direset');
}
function getKeuFilters(){
return{
tipe:document.getElementById('kfTipe')?.value||'semua',
kat:document.getElementById('kfKat')?.value||'semua',
sub:document.getElementById('kfSub')?.value||'semua',
acc:document.getElementById('kfAcc')?.value||'semua',
method:document.getElementById('kfMethod')?.value||'semua',
search:(document.getElementById('kfSearch')?.value||'').trim().toLowerCase()
};
}
function txMatchesSearch(t,q){
if(!q)return true;
const acc=D.accounts.find(a=>a.id===t.accountId);
const hay=[t.category,t.subcategory,t.note,acc?acc.name:''].filter(Boolean).join(' ').toLowerCase();
return hay.includes(q);
}
let txListPage=1;
const TX_PAGE_SIZE=50;
let lapTxPage=1;
function loadMoreLapTx(){lapTxPage++;renderLaporan();}
// (v94): _lapLastFilterSig dipindah dari backup-restore.js (skrg
// backup-restore.js) — dipakai renderLaporan() bareng lapTxPage di atas utk dedup filter Laporan.
let _lapLastFilterSig=null;
function resetTxPageAndRender(){
txListPage=1;
saveKeuFilterPrefs();
renderKeuangan();
}
function onKfSearchInput(){
clearTimeout(window._kfSearchDebounce);
window._kfSearchDebounce=setTimeout(resetTxPageAndRender,250);
}
function loadMoreTx(){
txListPage++;
renderKeuangan();
}
function saveKeuFilterPrefs(){
try{
const prefs={
tipe:document.getElementById('kfTipe')?.value||'semua',
kat:document.getElementById('kfKat')?.value||'semua',
sub:document.getElementById('kfSub')?.value||'semua',
acc:document.getElementById('kfAcc')?.value||'semua',
method:document.getElementById('kfMethod')?.value||'semua',
search:document.getElementById('kfSearch')?.value||'',
periode:txListPeriode,
from:document.getElementById('txListFrom')?.value||'',
to:document.getElementById('txListTo')?.value||''
};
safeSetItem('kw_keuFilterPrefs',JSON.stringify(prefs));
}catch(e){console.error('Gagal simpan preferensi filter:',e);}
}
let _keuFilterPrefsLoaded=false;
function loadKeuFilterPrefsIntoDOM(){
if(_keuFilterPrefsLoaded)return;
_keuFilterPrefsLoaded=true;
let prefs;
try{prefs=JSON.parse(localStorage.getItem('kw_keuFilterPrefs')||'null');}catch{prefs=null;}
if(!prefs)return;
if(document.getElementById('kfTipe'))document.getElementById('kfTipe').value=prefs.tipe||'semua';
if(document.getElementById('kfKat'))document.getElementById('kfKat').value=prefs.kat||'semua';
populateSubSelect('kfSub','kfKat');
if(document.getElementById('kfSub'))document.getElementById('kfSub').value=prefs.sub||'semua';
if(document.getElementById('kfAcc'))document.getElementById('kfAcc').value=prefs.acc||'semua';
if(document.getElementById('kfMethod'))document.getElementById('kfMethod').value=prefs.method||'semua';
if(document.getElementById('kfSearch'))document.getElementById('kfSearch').value=prefs.search||'';
if(prefs.periode){
txListPeriode=prefs.periode;
const idxMap={hari:0,minggu:1,bulan:2,tahun:3,selamanya:4,custom:5};
const btns=document.querySelectorAll('#txListPeriodeChips .chip-btn');
btns.forEach(b=>b.classList.remove('active'));
const idx=idxMap[prefs.periode];
if(btns[idx])btns[idx].classList.add('active');
const customRangeEl=document.getElementById('txListCustomRange');
if(customRangeEl)customRangeEl.style.display=prefs.periode==='custom'?'block':'none';
if(prefs.from&&document.getElementById('txListFrom'))document.getElementById('txListFrom').value=prefs.from;
if(prefs.to&&document.getElementById('txListTo'))document.getElementById('txListTo').value=prefs.to;
}
const hasActive=['tipe','kat','sub','acc','method'].some(k=>prefs[k]&&prefs[k]!=='semua')||prefs.search;
if(hasActive){const panel=document.getElementById('keuFilterPanel');if(panel)panel.style.display='block';}
}
function updateKfBadge(){
const btn=document.getElementById('kfToggleBtn');
if(!btn)return;
const f=getKeuFilters();
const n=Object.values(f).filter(v=>v&&v!=='semua').length;
btn.textContent=n?`🔍 Filter (${n})`:'🔍 Filter';
}
const SHOP_TAB_ORDER=['kasir','jual','etalase','produsen','riwayat','pelanggan','laporan','bi'];
const CN_TAB_ORDER=['insight','bbm','servis','pajak'];
function goToList(targetId, pageName, navIdx, shopTabName, cnTabName, keuTabName){
const jump=()=>{
if(shopTabName){const tabs=document.querySelectorAll('#page-shop .cn-tab');const idx=SHOP_TAB_ORDER.indexOf(shopTabName);setShopTab(shopTabName,tabs[idx>=0?idx:0]);}
if(cnTabName){const tabs=document.querySelectorAll('#page-carnotes .cn-tab');const idx=CN_TAB_ORDER.indexOf(cnTabName);setCnTab(cnTabName,tabs[idx>=0?idx:0]);}
if(keuTabName&&typeof setKeuanganTab==='function'){
const tabs=document.querySelectorAll('#page-keuangan .cn-tab');
const idx=(typeof KEU_TAB_ORDER!=='undefined')?KEU_TAB_ORDER.indexOf(keuTabName):-1;
setKeuanganTab(keuTabName,tabs[idx>=0?idx:0]);
}
const el=document.getElementById(targetId);
if(!el)return;
setTimeout(()=>{
el.scrollIntoView({behavior:'smooth',block:'start'});
el.classList.remove('flash-highlight');void el.offsetWidth;el.classList.add('flash-highlight');
setTimeout(()=>el.classList.remove('flash-highlight'),1200);
},pageName?150:0);
};
if(pageName){showPage(pageName,document.querySelectorAll('.nav-item')[navIdx]);jump();}
else jump();
}
// BUGFIX (audit menyeluruh "tab nav tidak respon"): tombol "🏦 Akun → Keuangan" di Pengaturan
// (stgGroup2, index.html) pakai data-action="goToKeuanganAkunTab", tapi fungsinya TIDAK PERNAH
// ditulis -- mati total sejak awal, persis kelas bug yang sama dgn changeTxListMonth di atas.
// Reuse goToList() apa adanya (0 logic baru): pindah ke #page-keuangan, buka tab "akun", scroll
// + flash-highlight #accGrid supaya user langsung lihat kartu Akun & Metode Pembayaran.
function goToKeuanganAkunTab(){goToList('accGrid','keuangan',null,null,null,'akun');}
// S568: handler tab pemilik di blok "Porsi per Pemilik" (lihat showFilteredTx). Ganti
// tampilan detail ke pemilik yang diklik + toggle class active pada tombolnya, murni
// baca dari window._filterTxOwnerSplitRows yang sudah dihitung, tanpa hitung ulang split.
function selectFilterTxOwnerSplit(idx){
const rows=window._filterTxOwnerSplitRows||[];
const r=rows[idx];
if(!r)return;
const detail=document.getElementById('filterTxOwnerSplitDetail');
if(detail)detail.innerHTML=r.detailHtml;
document.querySelectorAll('#filterTxOwnerSplit .cn-tab').forEach(b=>b.classList.remove('active'));
const btn=document.querySelector(`#filterTxOwnerSplit .cn-tab[data-owner-idx="${idx}"]`);
if(btn)btn.classList.add('active');
}
// resolveTxOwnerSplitForAccount(accountId) -- Sesi A (AUDIT-DANA-TITIPAN-MAJORIS-PORSI-SYNC.md,
// acceptance criterion P0 "owner source setelah link"). SATU titik baca owner utk transaksi 1
// akun, mengunci URUTAN SUMBER supaya porsi TIDAK diam-diam stale setelah Aset di-link ke Holding
// Investasi:
//   0. FIX (laporan user Agustus 2026 -- "riwayat transaksi akun tertaut tidak terhitung di Dana
//      Titipan" -- lihat AUDIT-S600-HOLDING-GAP-OWNER-DROPDOWNS.md Temuan #1/S601-3): Holding
//      yang tertaut LANGSUNG ke akun (`findLinkedHoldingForAccount()`, transaksi.js, field
//      `h.accountId`) DICEK LEBIH DULU, SEBELUM langkah 1 di bawah -- pola SAMA PERSIS urutan
//      prioritas `resolveOwnerDefaultForAccount()` (transaksi.js, Sesi Res-B: "Holding MENANG
//      kalau Holding & Aset SAMA-SAMA tertaut ke akun yang sama"). ROOT CAUSE bug ini: fungsi ini
//      SEBELUMNYA HANYA mencari lewat `D.assets[].accountId` (langkah 1) -- akun yang ditautkan
//      langsung ke Holding lewat "🔗 Hubungkan ke Akun" (investasi-list-view.js, S601-3) TANPA
//      ada Aset perantara sama sekali balik `null` di sini, jadi `_expenseComparisonForOwner()`/
//      `majorisRenovReconciliation()` (dana-titipan-portfolio-render.js/
//      dana-titipan-aggregation-api.js, konsumen SATU-SATUNYA fungsi ini utk baris "Estimasi dari
//      Transaksi <Akun>"/"Pengeluaran Majoris") diam-diam skip akun itu -- transaksi cicilan/renov
//      yang dibayar dari akun tertaut TIDAK PERNAH ikut terhitung ke Dana Titipan walau holding-nya
//      sendiri sudah type 'titipan'. Investment.getOwners(h) (SUDAH ADA sejak AUD-008/Sesi 462)
//      dipakai apa adanya -- 0 rumus split baru.
//   1. Aset ketemu (D.assets[].accountId===accountId) DAN tertaut ke Holding Investasi
//      (a.investmentId, holding masih ada di D.investments) -> BACA LIVE lewat
//      Aset._resolveLinkedInvestmentOwners() (SUDAH ADA sejak Sesi B2a/462, reuse
//      Investment.getOwners() -- 0 rumus baru). Ini yang menutup celah: sebelum sesi ini,
//      showFilteredTx() baca MultiOwnerEngine.getOwners(a) LANGSUNG dari a.owners -- padahal
//      a.owners cuma disalin SEKALI saat link lalu tidak ikut berubah kalau porsi Holding
//      diedit belakangan (lihat §2 audit). Investment.getOwners(h) selalu baca live dari
//      h.owners tiap panggilan, jadi porsi terbaru otomatis kepakai di sini juga.
//   2. Aset TIDAK tertaut (investmentId kosong) ATAU tautan orphan (holding sudah dihapus) ATAU
//      module investasi.js belum dimuat -> fallback MultiOwnerEngine.getOwners(a) (PERSIS
//      perilaku showFilteredTx() sebelum sesi ini -- 0 regresi utk akun yang belum pernah
//      di-link ke Holding Investasi).
// PURE, 0 side-effect, 0 tulis ke D. Balikin null kalau: tidak ada Holding/Aset yang match
// accountId, ATAU MultiOwnerEngine tidak dimuat. Balikin {asset,owners} (langkah 1/2, `asset`
// terisi) ATAU {holding,owners} (langkah 0, `asset` null -- caller yang butuh nama akun/aset utk
// label tetap fallback ke `holding.name`, lihat `_expenseComparisonForOwner()`) kalau ketemu
// (owners selalu >=1 baris -- baik dari Investment.getOwners() maupun MultiOwnerEngine.getOwners(),
// keduanya mensintesis minimal 1 baris SELF 100% kalau tidak ada data owner eksplisit, sama
// persis kontrak lama).
// SESI S620 (laporan user -- "Uang motor" (Dana Titipan, hanya Pokok Dikomit
// ke akun BRI multi-owner, 0 Holding/Aset sama sekali) tidak pernah kepotong
// walau `deductionOwnerId` transaksinya sudah benar): fungsi ini SEBELUMNYA
// HANYA mengenali akun lewat Aset (langkah 1) atau Holding tertaut (langkah
// 0) -- akun yang owner-nya di-set LANGSUNG di `D.accounts[].owners[]`
// (dropdown "Porsi Kepemilikan Akun", `AccOwners`/`setAccOwners()`, akun.js)
// TANPA Aset/Holding perantara sama sekali balik `null` di sini, persis pola
// gap yang sudah diperbaiki utk `resolveOwnerDefaultForAccount()` (Sesi
// Res-B, transaksi.js) tapi belum pernah utk fungsi ini. FIX: tambah
// fallback tier ke-3 (`getAccOwnersEffective()`, akun.js) SEBELUM balik
// null -- urutan prioritas SAMA PERSIS `resolveOwnerDefaultForAccount()`
// (Holding menang > Aset > owners akun sendiri). 0 rumus split baru.
function resolveTxOwnerSplitForAccount(accountId){
if(typeof MultiOwnerEngine==='undefined')return null;
// S638 (perbaikan kasus 2+ holding tertaut ke 1 akun yang sama): dulu
// findLinkedHoldingForAccount() (singular) cuma ambil holding PERTAMA yang
// cocok -- transaksi di akun yang ditautkan 2+ holding sekaligus keliru
// dihitung seolah cuma 1 holding yang menyumbang. Sekarang pakai varian
// plural + aggregateOwnersAcrossHoldings() (transaksi.js, S638) -- owners
// gabungan dibobot nilai tiap holding. `holding` (tunggal) TETAP diisi
// holding PERTAMA demi kompatibilitas konsumen lama yang baca `.holding.name`
// utk label (mis. _expenseComparisonForOwner()) -- field baru `holdings`
// (array lengkap) ditambahkan utk konsumen yang mau tampilkan semua nama.
if(typeof findLinkedHoldingsForAccount==='function'&&typeof Investment!=='undefined'){
const linkedHoldings=findLinkedHoldingsForAccount(accountId);
if(linkedHoldings.length){
const hOwners=(typeof aggregateOwnersAcrossHoldings==='function')?aggregateOwnersAcrossHoldings(linkedHoldings):Investment.getOwners(linkedHoldings[0]);
if(hOwners&&hOwners.length)return{asset:null,holding:linkedHoldings[0],holdings:linkedHoldings,owners:hOwners};
}
}
const a=(D.assets||[]).find(x=>sameId(x.accountId,accountId));
if(a){
let owners=null;
if(typeof Aset!=='undefined'&&typeof Aset._resolveLinkedInvestmentOwners==='function'){
owners=Aset._resolveLinkedInvestmentOwners(a);
}
if(!owners||!owners.length){
const res=MultiOwnerEngine.getOwners(a);
owners=(res&&res.ok&&res.owners&&res.owners.length)?res.owners:null;
}
if(owners&&owners.length)return{asset:a,owners};
}
if(typeof getAccOwnersEffective==='function'){
const eff=getAccOwnersEffective(accountId);
if(eff&&eff.ok&&eff.owners&&eff.owners.length)return{asset:null,holding:null,owners:eff.owners};
}
return null;
}
// resolveTxOwnerAssignment(t, owners) — permintaan user (audit "Porsi per
// Pemilik bukan sistem patungan, ada field pilihan di transaksi porsi mana
// yg dipakai"): balikin ownerId yg transaksi `t` ini SENGAJA ditandai.
//
// FIX SESI S608 (audit user "apakah data dari akun transaksi yg ditautkan
// dari dana titipan sync otomatis ke dashboard Dana Titipan" — laporan:
// total "Pengeluaran" per pemilik di kartu "Porsi per Pemilik" TIDAK
// pernah cocok dgn badge "👤 Ditanggung: <owner>" yg tampil di baris
// transaksinya sendiri). ROOT CAUSE: fungsi ini SEBELUMNYA membaca
// `t.ownerPorsiId` -- field itu HANYA PERNAH ditulis lewat dropdown
// "Porsi Pemilik (akun patungan)"/`updateTxOwnerPorsiOptions()`, yg SUDAH
// DIHAPUS TOTAL sejak AUDIT-S540/B1-B12-DOUBLECOUNT (lihat komentar
// `onTxAccChange()`, transaksi.js) -- sejak saat itu `t.ownerPorsiId` TIDAK
// PERNAH ditulis lagi oleh kode manapun (grep whole-repo: 0 write-site),
// jadi fungsi ini SELALU jatuh ke fallback `owners[0].ownerId` utk SEMUA
// transaksi, apa pun assignment aslinya. Penanggung transaksi yg
// SEBENARNYA aktif & tersimpan sekarang adalah `t.deductionOwnerId`
// (picker "Pemilik Sumber Potongan", S574-C/D1 — persistensi penuh via
// `_saveTxInner()`, dibaca `tx-list-cashflow.js` utk badge "👤 Ditanggung:
// <owner>" yg tampil di tiap baris riwayat). Akibatnya kartu "Porsi per
// Pemilik" (ringkasan) & badge per-baris (detail) BISA MENAMPILKAN OWNER
// YG BERBEDA utk transaksi yg sama -- dan baris "Estimasi dari Transaksi
// <Akun>" di dashboard Dana Titipan (`_expenseComparisonForOwner()`,
// dana-titipan-portfolio-render.js) yg proporsional (splitByPorsi) juga
// jadi tidak sinkron dgn keduanya (lihat fix terpisah di file itu, sesi
// yg sama).
// FIX: baca `t.deductionOwnerId` LEBIH DULU (sumber aktif/live) --
// `t.ownerPorsiId` dipertahankan sbg fallback kedua murni utk data lama/
// edge-case (0 salahnya dicek, tidak pernah ada sekarang tapi tidak
// menutup kemungkinan format lama).
// Guard existing-owner-only dipertahankan apa adanya (ownerId basi/dr akun
// lain tidak nyasar ke owner yg salah).
//
// FIX SESI (laporan user 2026-08-15 -- "BRI"/"Uang motor": transaksi rumah
// tangga biasa yg dibayar dari akun tsb (Anak·sekolah, Belanja, Pulsa, dst
// -- TIDAK PERNAH ditandai `deductionOwnerId` scr eksplisit) ikut memotong
// "Estimasi dari Transaksi <Akun>"/Pokok Dikomit pemilik Dana Titipan,
// murni krn akun itu 100% owner tunggal). ROOT CAUSE: fallback terakhir di
// bawah SEBELUMNYA `return owners[0].ownerId` -- transaksi yg TIDAK PERNAH
// ditandai penanggungnya scr eksplisit tetap otomatis "dianggap" milik
// owner pertama (utk akun 1-owner, itu artinya SEMUA transaksi otomatis
// ikut). Ini keliru: porsi kepemilikan AKUN (siapa yg berhak atas saldo)
// beda konsep dgn assignment PER-TRANSAKSI (pengeluaran ini utk pocket yg
// mana) -- 1 akun 100% "Uang motor" tidak berarti tiap transaksi yg lewat
// situ otomatis pengeluaran dana motor.
// FIX: HAPUS fallback owners[0] -- transaksi tanpa `deductionOwnerId`/
// `ownerPorsiId` eksplisit yg valid balik `null` (TIDAK diassign ke siapa
// pun). Konsumen (`_linkedExpenseTotalForOwner()`, kartu "Porsi per
// Pemilik", badge "👤 Ditanggung") semua membandingkan hasil fungsi ini
// dgn `=== o.ownerId` -- `null` otomatis tidak pernah match owner manapun,
// jadi 0 perubahan kontrak caller diperlukan, transaksi tsb murni
// dikecualikan dari SEMUA total per-pemilik (bukan cuma Dana Titipan).
// PURE, 0 side-effect.
function resolveTxOwnerAssignment(t,owners){
if(!Array.isArray(owners)||!owners.length)return null;
if(t&&typeof t.deductionOwnerId==='string'&&t.deductionOwnerId&&owners.some(o=>o.ownerId===t.deductionOwnerId)){
return t.deductionOwnerId;
}
if(t&&typeof t.ownerPorsiId==='string'&&t.ownerPorsiId&&owners.some(o=>o.ownerId===t.ownerPorsiId)){
return t.ownerPorsiId;
}
return null;
}
function showFilteredTx(scope, type, label, accId){
let txs=[];
if(scope==='dashboard'){
const now=new Date(),m=now.getMonth(),y=now.getFullYear();
txs=D.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});
} else if(scope==='keuangan'){
const kf=getKeuFilters();
// FIX (BUG-010, audit 2026-08): scope 'keuangan' di sini dulu cuma pakai
// txMatchesFilters(t,kf) -- TIDAK ikut txMatchesSearch(t,kf.search), padahal
// renderKeuangan() (modules-render.js, bagian render #txList) sudah lebih dulu
// benar pakai KEDUANYA (txMatchesFilters(t,kf)&&txMatchesSearch(t,kf.search)).
// Akibatnya: user ketik kata kunci di kolom cari filter Keuangan, badge/list utama
// (renderKeuangan) sudah kefilter sesuai pencarian, TAPI tap kartu ringkasan
// (mis. "Pemasukan"/"Pengeluaran" bulan ini) yang memanggil showFilteredTx() masih
// nampilin transaksi TANPA filter pencarian itu -- summary/list-nya jadi tidak
// nyambung 1:1 dengan apa yang user cari. Tambah &&txMatchesSearch(t,kf.search),
// pola sama persis modules-render.js -- 0 rumus pencarian baru, cuma dipakai juga
// di titik ini.
txs=D.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===curMonth&&d.getFullYear()===curYear&&txMatchesFilters(t,kf)&&txMatchesSearch(t,kf.search);});
} else if(scope==='laporan'){
const {from,to}=getRange();
const f=getLaporanFilters();
txs=D.transactions.filter(t=>{
const d=new Date(t.date);
if(d<from||d>to)return false;
if(t.type==='transfer_in'||t.type==='transfer_out')return false;
if(!txMatchesFilters(t,f))return false;
return true;
});
} else if(scope==='account'){
// Riwayat Transaksi 1 akun (dipakai a.l. dari Buku Aset -- lihat Aset.openTxHistory di
// aset.js). SENGAJA tidak exclude transfer_in/transfer_out spt scope 'laporan' di atas,
// karena di sini tujuannya lihat riwayat LENGKAP akun tsb (termasuk transfer keluar/masuk),
// bukan cuma pemasukan/pengeluaran biasa.
// BUGFIX (Sesi 434, audit "riwayat transaksi tidak muncul saat akun diklik"): sebelumnya
// pakai strict equality (t.accountId===accId) -- accId yang masuk ke fungsi ini kadang
// berupa angka (dari data lama/import) sedangkan t.accountId string (atau sebaliknya),
// jadi tidak pernah match & list selalu kosong walau transaksinya ADA. Ganti ke sameId()
// (helper global, sudah dipakai HAMPIR di semua tempat lain di codebase ini persis untuk
// menghindari bug tipe data id berbeda ini -- lihat mis. aset.js/akun.js) -- 0 logic baru,
// cuma reuse pola yang sudah ada.
txs=D.transactions.filter(t=>sameId(t.accountId,accId));
}
if(type==='income')txs=txs.filter(t=>t.type==='income');
else if(type==='expense')txs=txs.filter(t=>t.type==='expense');
else if(type==='all')txs=txs.filter(t=>t.type==='income'||t.type==='expense');
// type==='gaji' (Sesi klik-nominal-proyeksi-kas): REUSE isGajiTransaction() apa adanya
// (cash-projection.js, SATU-SATUNYA predikat gaji di app ini) — dipakai kartu "Proyeksi
// Kas Bulan Ini" utk klik "Gaji Tercatat", supaya daftar yg tampil PERSIS sama transaksi
// yg dihitung sbg recordedGaji di getMonthlyCashProjection(), 0 predikat baru.
else if(type==='gaji')txs=txs.filter(t=>typeof isGajiTransaction==='function'&&isGajiTransaction(t));
const sorted=[...txs].sort((a,b)=>new Date(b.date)-new Date(a.date));
// Guard hitungKas!==false (pola sama computeCashflowForecast() di tx-list-cashflow.js):
// baris "📝 Catatan saja" (hitungKas:false) TETAP tampil di daftar (sorted tidak difilter,
// user tetap lihat catatannya) -- yang di-guard cuma agregat moneter (total & split per
// pemilik di bawah), konsisten dgn arti toggle "Hitung ke Saldo & Laporan" dan kartu
// ringkasan lain yang sudah pakai guard ini.
const total=sorted.reduce((s,t)=>s+(t.hitungKas!==false?(t.type==='income'?t.amount:-t.amount):0),0);
document.getElementById('filterTxTitle').textContent=label||'Transaksi';
document.getElementById('filterTxSummary').textContent=sorted.length+' transaksi · Total '+(total<0?'-':'')+fmt(Math.abs(total));
// filterTxOwnerSplit (permintaan user: "riwayat transaksi ... tiap transaksi (modal/
// pengeluaran) dipecah per porsi pemilik lalu ditotal per orang") -- HANYA muncul utk
// scope 'account' YANG akunnya tertaut ke Aset multi-owner (0 perubahan utk scope lain/
// akun biasa). Modal = total income, Pengeluaran = total expense, Total = net (sama
// definisi dgn `total` di atas) -- masing-masing dipecah per porsi lewat REUSE
// MultiOwnerEngine.splitByPorsi() (0 rumus baru, sama fungsi yg dipakai
// resolveTxAssetSplit() per-transaksi di transaksi.js). Guard elemen null (modal ini
// belum tentu ada di semua halaman/test), guard scope/typeof/asset/porsi sama pola
// linkedPorsiLine di renderAccGrid() (modules-render.js).
const ownerSplitEl=document.getElementById('filterTxOwnerSplit');
if(ownerSplitEl){
let ownerSplitHtml='';
if(scope==='account'){
// Sesi A: sebelumnya baca MultiOwnerEngine.getOwners(linkedAssetForSplit) LANGSUNG dari
// a.owners (bisa stale kalau aset sudah di-link ke Holding Investasi & porsinya diubah
// belakangan di sana -- lihat AUDIT-DANA-TITIPAN-MAJORIS-PORSI-SYNC.md §2). Ganti ke
// resolveTxOwnerSplitForAccount() -- SATU titik baca yang urutan sumbernya sudah
// mengunci prioritas Investment.getOwners() (kalau linked) > MultiOwnerEngine.getOwners()
// (kalau belum linked) -- 0 rumus split baru, cuma sumber owners-nya yang benar.
const resolvedSplit=resolveTxOwnerSplitForAccount(accId);
if(resolvedSplit){
const ownersRes={owners:resolvedSplit.owners};
// Sesi (audit user "Porsi per Pemilik ini bukan sistem patungan"): DULU
// modal/pengeluaran/total dipecah PROPORSIONAL per porsi kepemilikan %
// (MultiOwnerEngine.splitByPorsi) -- 1 transaksi otomatis "nyicip" ke semua
// pemilik sesuai % walau transaksinya cuma buat 1 pemilik tertentu (mis.
// belanja utk proyek "renov" ikut kepotong ke porsi "mas sihab" juga).
// Permintaan user: tiap transaksi PUNYA pemilihan eksplisit sendiri
// (tx.ownerPorsiId, diisi di modal Transaksi) -- jadi di sini SEKARANG
// dijumlah per assignment SEBENARNYA (resolveTxOwnerAssignment(), fallback
// owners[0] utk transaksi lama/belum dipilih), bukan proporsi lagi. 0
// perubahan ke `total`/`sorted` di atas (tetap dipakai ringkasan umum) --
// cuma cara pecah per-pemilik di sini yang diganti.
// S568: sebelumnya semua pemilik ditampilkan sekaligus (mode "patungan" — semua baris
// muncul bersamaan). Permintaan user: ubah jadi PILIHAN per pemilik (mis. "renov" saja
// atau "mas sihab" saja), bukan digabung. Reuse pola tab .cn-tab/.cn-tab.active yang
// sudah dipakai di tempat lain (styles.css) supaya konsisten, 0 CSS baru. Data disimpan
// di window._filterTxOwnerSplitRows lalu dibaca oleh selectFilterTxOwnerSplit() saat tab
// diklik -- 0 refetch, cuma switch tampilan dari array yang sudah dihitung sekali di atas.
const rows=ownersRes.owners.map(o=>{
const ownerTxs=sorted.filter(t=>resolveTxOwnerAssignment(t,ownersRes.owners)===o.ownerId);
const m=ownerTxs.filter(t=>t.type==='income'&&t.hitungKas!==false).reduce((s,t)=>s+t.amount,0);
const e=ownerTxs.filter(t=>t.type==='expense'&&t.hitungKas!==false).reduce((s,t)=>s+t.amount,0);
const t=m-e;
// Baris tambahan (permintaan user: "tambahkan modal dikomit dan total setelah
// dikurangi pengeluaran hanya ditampilkan per navigasi pemilik porsi") -- "Modal
// Dikomit" DI SINI BUKAN `m` di atas (yang murni sum tx.type==='income' akun ini,
// lihat komentar S568 di atas): ini pokok yang dicatat MANUAL lewat modal "💰 Pokok
// Dana Titipan" (DanaTitipanPortfolioAPI.getCommitments(), dana-titipan-commitment-
// return-api.js) -- 2 entitas beda sumber, SENGAJA ditampilkan berdampingan (bukan
// menggantikan `t`/Total existing) supaya user bisa lihat sendiri kalau ada selisih,
// pola sama "Pokok Dikomit" vs "Estimasi dari Transaksi <Akun>" di dashboard Dana
// Titipan (dana-titipan-portfolio-render.js, _expenseComparisonForOwner()). REUSE
// getCommitments() apa adanya, 0 rumus split baru; sameId() (bukan ===) krn
// D.titipanCommitments store terpisah dari ownersRes.owners, pola sama alasan
// resolveTxOwnerSplitForAccount() pakai sameId() utk accountId lintas store.
let commitHtml='';
if(typeof DanaTitipanPortfolioAPI!=='undefined'&&typeof DanaTitipanPortfolioAPI.getCommitments==='function'){
const commit=DanaTitipanPortfolioAPI.getCommitments().find(c=>sameId(c.ownerId,o.ownerId));
if(commit&&isFinite(commit.principalAmount)){
const sisa=commit.principalAmount-e;
commitHtml=`<div style="margin-top:2px">Modal Dikomit ${fmt(commit.principalAmount)} · Total setelah dikurangi pengeluaran ${sisa<0?'-':''}${fmt(Math.abs(sisa))}</div>`;
}else{
commitHtml=`<div style="margin-top:2px">Modal Dikomit <span class="u-t2">Belum dicatat</span></div>`;
}
}
return{name:o.ownerName,detailHtml:`<div style="margin-top:4px">${escapeHtml(o.ownerName)} (${o.porsi}%): Modal ${fmt(m)} · Pengeluaran ${fmt(e)} · Total ${t<0?'-':''}${fmt(Math.abs(t))}</div>${commitHtml}`};
});
window._filterTxOwnerSplitRows=rows;
const tabsHtml=rows.map((r,idx)=>`<button type="button" class="cn-tab${idx===0?' active':''}" data-owner-idx="${idx}" onclick="selectFilterTxOwnerSplit(${idx})" style="flex:none;padding:6px 14px;margin-right:6px">${escapeHtml(r.name)}</button>`).join('');
ownerSplitHtml=`<div style="font-weight:600;margin-bottom:6px">👥 Porsi per Pemilik</div><div style="display:flex;flex-wrap:wrap">${tabsHtml}</div><div id="filterTxOwnerSplitDetail">${rows[0].detailHtml}</div>`;
}
}
ownerSplitEl.innerHTML=ownerSplitHtml;
ownerSplitEl.style.display=ownerSplitHtml?'block':'none';
}
const FTX_PAGE_SIZE=100;
const visibleCount=Math.min(sorted.length,FTX_PAGE_SIZE);
const visible=sorted.slice(0,visibleCount);
// S641 (lanjutan RENCANA-PERLUASAN-LEDGER-PRO-RIWAYAT-TITIPAN.md, pola
// identik s637/modules-render.js): tema "modern" pakai jalur tabel Ledger
// Pro (txTableHTML, sudah ada sejak s637 di tx-list-cashflow.js) utk
// #filterTxList. REUSE 100% -- 0 fungsi/CSS baru. Kolom saldo berjalan
// HANYA valid saat scope==='account' (1 akun spesifik, dipanggil dari
// Aset.openTxHistory) -- scope lain (dashboard/keuangan/laporan) bisa
// lintas-akun sehingga "saldo berjalan" tidak bermakna; txTableHTML sudah
// py param accIdForBalance yg kalau null otomatis sembunyikan kolom Saldo
// (lihat showSaldo di tx-list-cashflow.js), jadi tinggal pakai
// `scope==='account'?accId:null` -- 0 percabangan tambahan di sini. 10
// tema lama 0 dampak, tetap jalur txHTML() kartu apa adanya di else.
const ftxEmpty='<div class="empty"><div class="empty-icon">💸</div><div class="empty-text">Tidak ada transaksi</div></div>';
if(D.profile&&D.profile.theme==='modern'&&typeof txTableHTML==='function'){
document.getElementById('filterTxList').innerHTML=visible.length?txTableHTML(visible,scope==='account'?accId:null):ftxEmpty;
}else{
document.getElementById('filterTxList').innerHTML=visible.length?visible.map(txHTML).join(''):ftxEmpty;
}
let ftxMoreWrap=document.getElementById('filterTxLoadMoreWrap');
if(!ftxMoreWrap){
ftxMoreWrap=document.createElement('div');
ftxMoreWrap.id='filterTxLoadMoreWrap';
ftxMoreWrap.style.cssText='text-align:center;margin-top:10px';
document.getElementById('filterTxList').insertAdjacentElement('afterend',ftxMoreWrap);
}
if(visibleCount<sorted.length){
ftxMoreWrap.style.display='block';
ftxMoreWrap.innerHTML=`<button class="btn btn-ghost btn-sm">⬇️ Tampilkan lebih banyak (${sorted.length-visibleCount} lagi)</button>`;
ftxMoreWrap.dataset.shown=visibleCount;
ftxMoreWrap.querySelector('button').onclick=function(){
const shown=parseInt(ftxMoreWrap.dataset.shown||String(FTX_PAGE_SIZE),10);
const nextCount=Math.min(sorted.length,shown+FTX_PAGE_SIZE);
const nextBatch=sorted.slice(shown,nextCount);
// S641: batch "muat lebih banyak" ikut jalur yg sama dgn render awal di
// atas -- tabel modern append <tr> lewat txTableRowHTML per item (bukan
// txTableHTML penuh, supaya tidak nyisipin <table>/<thead> baru di
// tengah tbody yang sudah ada), kartu lama append txHTML apa adanya.
if(D.profile&&D.profile.theme==='modern'&&typeof txTableRowHTML==='function'){
const balMap=scope==='account'&&typeof computeAccRunningBalances==='function'?computeAccRunningBalances(accId):null;
const tbody=document.querySelector('#filterTxList .tx-tbl tbody');
if(tbody)tbody.insertAdjacentHTML('beforeend',nextBatch.map(t=>txTableRowHTML(t,balMap?balMap.get(t.id):undefined)).join(''));
else document.getElementById('filterTxList').insertAdjacentHTML('beforeend',nextBatch.map(txHTML).join(''));
}else{
document.getElementById('filterTxList').insertAdjacentHTML('beforeend',nextBatch.map(txHTML).join(''));
}
ftxMoreWrap.dataset.shown=nextCount;
if(nextCount>=sorted.length){ftxMoreWrap.style.display='none';}
else{this.textContent=`⬇️ Tampilkan lebih banyak (${sorted.length-nextCount} lagi)`;}
};
} else ftxMoreWrap.style.display='none';
openModal('filterTxModal');
}
