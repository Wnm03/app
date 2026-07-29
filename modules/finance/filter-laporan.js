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
const show=panel.style.display==='none';
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
function goToList(targetId, pageName, navIdx, shopTabName, cnTabName, keuTabName){
const jump=()=>{
if(shopTabName){const tabs=document.querySelectorAll('#page-shop .cn-tab');setShopTab(shopTabName,tabs[shopTabName==='etalase'?1:shopTabName==='produsen'?2:shopTabName==='riwayat'?3:shopTabName==='pelanggan'?4:0]);}
if(cnTabName){const tabs=document.querySelectorAll('#page-carnotes .cn-tab');setCnTab(cnTabName,tabs[cnTabName==='servis'?1:0]);}
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
function showFilteredTx(scope, type, label, accId){
let txs=[];
if(scope==='dashboard'){
const now=new Date(),m=now.getMonth(),y=now.getFullYear();
txs=D.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});
} else if(scope==='keuangan'){
const kf=getKeuFilters();
txs=D.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===curMonth&&d.getFullYear()===curYear&&txMatchesFilters(t,kf);});
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
txs=D.transactions.filter(t=>t.accountId===accId);
}
if(type==='income')txs=txs.filter(t=>t.type==='income');
else if(type==='expense')txs=txs.filter(t=>t.type==='expense');
else if(type==='all')txs=txs.filter(t=>t.type==='income'||t.type==='expense');
const sorted=[...txs].sort((a,b)=>new Date(b.date)-new Date(a.date));
const total=sorted.reduce((s,t)=>s+(t.type==='income'?t.amount:-t.amount),0);
document.getElementById('filterTxTitle').textContent=label||'Transaksi';
document.getElementById('filterTxSummary').textContent=sorted.length+' transaksi · Total '+(total<0?'-':'')+fmt(Math.abs(total));
const FTX_PAGE_SIZE=100;
const visibleCount=Math.min(sorted.length,FTX_PAGE_SIZE);
const visible=sorted.slice(0,visibleCount);
document.getElementById('filterTxList').innerHTML=visible.length?visible.map(txHTML).join(''):'<div class="empty"><div class="empty-icon">💸</div><div class="empty-text">Tidak ada transaksi</div></div>';
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
document.getElementById('filterTxList').insertAdjacentHTML('beforeend',nextBatch.map(txHTML).join(''));
ftxMoreWrap.dataset.shown=nextCount;
if(nextCount>=sorted.length){ftxMoreWrap.style.display='none';}
else{this.textContent=`⬇️ Tampilkan lebih banyak (${sorted.length-nextCount} lagi)`;}
};
} else ftxMoreWrap.style.display='none';
openModal('filterTxModal');
}
