// transaksi.js — Form Tambah/Edit Transaksi Keuangan: autocomplete kategori/produk,
// Dipindah ke modules/finance/transaksi.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// panel kendaraan (BBM/sparepart/stok shop), target Dana Darurat, catatan/reminder/
// transfer, dan simpan transaksi (saveTx) — mesin utama halaman Keuangan.
// (v92): ditambah domain "List Transaksi & Cashflow Forecast" (txHTML/delTx/changeMonth/
// setTxListPeriode/getTxListRange/setPeriode/getRange/computeCashflowForecast), dipindah dari
// backup-restore.js — domainnya sama-sama seputar data transaksi,
// lihat blok di akhir file & PEMISAHAN-FILE-ROADMAP.md.
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: data-default.js, features-helpers-global-security.js, diagnostik-versi.js, format-tema.js, error-handler.js, helper-teks.js, keamanan-pin.js, modal-navigasi.js, reset-gaji-mingguan.js, debug-console.js, pengaturan-search.js, onboarding.js, kalkulator-input.js, scan-ocr.js, akun.js, gaji-calc.js, transaksi.js, profil-pengaturan.js, kategori.js, tagihan-kalender.js, backup-restore.js, payroll-absensi.js, tukang-absensi.js

function setTxType(t){
curTxType=t;
document.getElementById('btnI').className='type-btn'+(t==='income'?' ai':'');
document.getElementById('btnE').className='type-btn'+(t==='expense'?' ae':'');
hideSuggestBox('txCatSuggestBox');
hideSuggestBox('txSubCatSuggestBox');
if(typeof AutoKat!=='undefined'){AutoKat.hideSuggest();AutoKat._lastNoteQueried='';}
updateTxVehiclePanels();
}
function updateSubCatOptions(){
updateTxVehiclePanels();
}
function jsAttrEscape(s){
return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}
function hideSuggestBox(id){
const box=document.getElementById(id);
if(box){box.style.display='none';box.innerHTML='';}
}
function onTxCatInput(){
const raw=document.getElementById('txCat').value;
const q=raw.trim().toLowerCase();
const cats=getCatsByType(curTxType);
const matches=cats.filter(c=>!q||c.name.toLowerCase().includes(q));
const box=document.getElementById('txCatSuggestBox');
let html=matches.map(c=>`<div class="suggest-item" onmousedown="event.preventDefault();selectTxCat('${jsAttrEscape(c.name)}')">${escapeHtml(c.emoji||'📦')} ${escapeHtml(c.name)}</div>`).join('');
if(q && !cats.some(c=>c.name.toLowerCase()===q)){
html+=`<div class="suggest-item suggest-add" onmousedown="event.preventDefault();addNewCatFromInput()">➕ Tambah kategori baru: "${escapeHtml(raw.trim())}"</div>`;
}
if(!html) html='<div class="suggest-empty">Belum ada kategori. Ketik nama baru lalu pilih "Tambah kategori baru".</div>';
box.innerHTML=html;
box.style.display='block';
}
function selectTxCat(name){
const prev=document.getElementById('txCat').value;
document.getElementById('txCat').value=name;
if(prev!==name) document.getElementById('txSubCat').value='';
hideSuggestBox('txCatSuggestBox');
updateTxVehiclePanels();
applyLastAccForCat(name);
}
function applyLastAccForCat(catName){
if(_txAccManuallySet)return;
if(!D.lastAccByCategory)return;
const accId=D.lastAccByCategory[catName];
if(!accId)return;
const accEl=document.getElementById('txAcc');
if(!accEl)return;
const exists=[...accEl.options].some(o=>o.value===accId);
if(exists){accEl.value=accId;}
}
function addNewCatFromInput(){
const q=document.getElementById('txCat').value.trim();
hideSuggestBox('txCatSuggestBox');
const prevType=curTxType;
openCatModal(undefined,prevType,(newName)=>{
curTxType=prevType;
document.getElementById('txCat').value=newName;
updateTxVehiclePanels();
});
setTimeout(()=>{const el=document.getElementById('catName'); if(el&&q)el.value=q;},50);
}
function onTxSubCatInput(){
const box=document.getElementById('txSubCatSuggestBox');
const catName=document.getElementById('txCat').value.trim();
const q=document.getElementById('txSubCat').value.trim().toLowerCase();
const cats=getCatsByType(curTxType);
// Kumpulkan subkategori dari SEMUA kategori (tipe yg sama), bukan cuma kategori yang
// sudah diisi di atas -- supaya bisa ketik/pilih Subkategori duluan sebelum isi
// Kategori, atau langsung klik field ini buat lihat semua subkategori yg ada. Begitu
// salah satu dipilih, Kategori utama otomatis ke-sync (lihat selectTxSubCatWithCat).
let candidates=[];
cats.forEach(c=>{(c.subs||[]).forEach(s=>{candidates.push({catName:c.name,catEmoji:c.emoji,subName:s.name});});});
if(catName){
// Kategori yg sudah diisi diprioritaskan tampil duluan, tapi subkategori kategori
// lain tetap ikut muncul (biar bisa ganti kategori lewat Subkategori juga).
candidates.sort((a,b)=>(b.catName===catName)-(a.catName===catName));
}
const matches=candidates.filter(c=>!q||c.subName.toLowerCase().includes(q));
let html='<div class="suggest-item" onmousedown="event.preventDefault();selectTxSubCat(\'\')">— Tanpa subkategori —</div>';
html+=matches.slice(0,30).map(c=>`<div class="suggest-item" onmousedown="event.preventDefault();selectTxSubCatWithCat('${jsAttrEscape(c.catName)}','${jsAttrEscape(c.subName)}')">${escapeHtml(c.subName)} <span style="color:var(--text3);font-size:11px">— ${escapeHtml(c.catEmoji||'📦')} ${escapeHtml(c.catName)}</span></div>`).join('');
if(!matches.length && q) html+='<div class="suggest-empty">Tidak ada subkategori yang cocok.</div>';
box.innerHTML=html;
box.style.display='block';
}
function selectTxSubCatWithCat(catName,subName){
const catEl=document.getElementById('txCat');
if(catEl.value!==catName){
catEl.value=catName;
applyLastAccForCat(catName);
}
document.getElementById('txSubCat').value=subName;
hideSuggestBox('txSubCatSuggestBox');
updateTxVehiclePanels();
}
function selectTxSubCat(subName){
document.getElementById('txSubCat').value=subName;
hideSuggestBox('txSubCatSuggestBox');
updateTxVehiclePanels();
}
function recentUniqueStrings(list,getter,limit){
limit=limit||50;
const seen=new Set();const out=[];
for(let i=(list||[]).length-1;i>=0;i--){
const v=(getter(list[i])||'').trim();
if(v && !seen.has(v.toLowerCase())){seen.add(v.toLowerCase());out.push(v);}
if(out.length>=limit)break;
}
return out;
}
function simpleAutocompleteInput(inputId,boxId,sourceFn){
const el=document.getElementById(inputId);
const box=document.getElementById(boxId);
if(!el||!box)return;
const q=el.value.trim().toLowerCase();
let values=[];
try{values=sourceFn()||[];}catch(e){values=[];}
const matches=(q?values.filter(v=>v.toLowerCase().includes(q)):values).slice(0,8);
if(!matches.length){box.style.display='none';box.innerHTML='';return;}
box.innerHTML=matches.map(v=>`<div class="suggest-item" onmousedown="event.preventDefault();selectSimpleAutocomplete('${jsAttrEscape(inputId)}','${jsAttrEscape(boxId)}','${jsAttrEscape(v)}')">${escapeHtml(v)}</div>`).join('');
box.style.display='block';
}
function selectSimpleAutocomplete(inputId,boxId,value){
const el=document.getElementById(inputId);
if(el)el.value=value;
hideSuggestBox(boxId);
}
function acProductNames(){return recentUniqueStrings(D.products,p=>p.name);}
function acProdusenNames(){return recentUniqueStrings(D.produsen,p=>p.name);}
function acBillNames(){return recentUniqueStrings((D.bills||[]).concat(D.billsArchive||[]),b=>b.name);}
function acStockNames(){return recentUniqueStrings(D.partsStock,p=>p.name);}
function acStockCodes(){return recentUniqueStrings(D.partsStock,p=>p.code);}
function acSparepartCatNames(){return recentUniqueStrings(D.sparepartCats,c=>c.name);}
function acSparepartCatCodes(){return recentUniqueStrings(D.sparepartCats,c=>c.code);}
function acSpbuNames(){return recentUniqueStrings(D.bbmLogs,b=>b.spbu);}
function acTxNotes(){return recentUniqueStrings(D.transactions,t=>t.note);}
function isKendaraanCatName(catName){
return /kendaraan|transport|motor|vario|beat|grandmax/i.test(catName||'');
}
// isRenovCatName(catName) -- detektor kategori Renovasi utk panel "🔨 Catat
// juga ke Proyek Renovasi?" (lihat tx-renov.js). Pola sama persis dgn
// isKendaraanCatName di atas: cocok kalau nama kategori mengandung "Renov"
// (mis. "Renovasi"), case-insensitive.
function isRenovCatName(catName){
return /renov/i.test(catName||'');
}
function resolveVehicleTxCategory(vehicle){
const vehName=vehicle&&vehicle.name?vehicle.name:'';
const vehId=vehicle&&vehicle.id?vehicle.id:null;
// BUGFIX: dulu kategori per-kendaraan dicari HANYA lewat cocok nama persis
// (cat.name===vehicle.name). Begitu kategori itu di-rename lewat menu
// Kategori (lihat kategori.js:saveCat, yg SUDAH benar menyesuaikan
// transaksi LAMA ke nama baru), pencarian nama di sini jadi tidak ketemu
// lagi utk catatan BBM/servis BERIKUTNYA -> silently jatuh ke kategori
// "Transport" umum, tercampur dgn kendaraan lain, tanpa ada pesan apapun.
// Sekarang kategori kendaraan disimpan pakai link stabil `linkedVehicleId`
// begitu ketemu/dibuat pertama kali, jadi tetap ke-track walau nama
// kategori (atau nanti nama kendaraan, kalau suatu saat ada fitur rename
// kendaraan) berubah. Data lama tanpa `linkedVehicleId` tetap kompatibel
// lewat fallback cocok-nama seperti sebelumnya.
let cat=vehId?D.categories.expense.find(c=>c.linkedVehicleId===vehId):null;
if(!cat){
cat=D.categories.expense.find(c=>c.name.trim().toLowerCase()===vehName.trim().toLowerCase());
if(cat&&vehId)cat.linkedVehicleId=vehId;
}
if(!cat) cat=D.categories.expense.find(c=>/^transport$/i.test(c.name));
if(!cat){
cat={id:'cat_'+slugify('Transport')+'_'+uid(),name:'Transport',emoji:'🏍️',subs:[]};
D.categories.expense.push(cat);
}
if(!cat.subs)cat.subs=[];
['Bensin','Servis & Oli','Pajak'].forEach(subName=>{
if(!cat.subs.find(s=>s.name.trim().toLowerCase()===subName.toLowerCase())){
cat.subs.push({id:'sub_'+slugify(subName)+'_'+uid(),name:subName});
}
});
return cat.name;
}
function isBensinSubName(subName){
return /bensin|bbm|bahan bakar|pertalite|pertamax|solar/i.test(subName||'');
}
function isSparepartSubName(catName,subName){
if(!isKendaraanCatName(catName))return false;
if(isBensinSubName(subName))return false;
return true;
}
// Catatan: isShopStockCatName (detektor kategori Stok/Penjualan Shop/Shop)
// dipindah ke tx-cobek.js (lihat CLAUDE.md catatan kerja "split transaksi.js"
// bagian ke-9) -- tetap fungsi global, tetap dipanggil persis sama dari
// updateTxVehiclePanels() di bawah ini.
function updateTxVehiclePanels(){
const stockPanel=document.getElementById('txStockPanel');
const bbmPanel=document.getElementById('txBbmPanel');
const shopPanel=document.getElementById('txShopStockPanel');
const shopSalePanel=document.getElementById('txShopSalePanel');
const renovPanel=document.getElementById('txRenovPanel');
if(!stockPanel||!bbmPanel)return;
const catName=document.getElementById('txCat').value;
const subName=document.getElementById('txSubCat')?document.getElementById('txSubCat').value:'';
const isExpense=curTxType==='expense';
const showBbm=isExpense&&isKendaraanCatName(catName)&&isBensinSubName(subName);
const showStock=isExpense&&!showBbm&&isSparepartSubName(catName,subName);
const showShop=isExpense&&!showBbm&&!showStock&&isShopStockCatName(catName,subName);
const showShopSale=!isExpense&&isShopStockCatName(catName,subName);
const showRenov=isExpense&&isRenovCatName(catName);
bbmPanel.style.display=showBbm?'block':'none';
stockPanel.style.display=showStock?'block':'none';
if(shopPanel)shopPanel.style.display=showShop?'block':'none';
if(shopSalePanel)shopSalePanel.style.display=showShopSale?'block':'none';
if(renovPanel)renovPanel.style.display=showRenov?'block':'none';
if(showBbm){
populateTxBbmVehicleSelect();
} else {
const chk=document.getElementById('txSyncBbm');
if(chk)chk.checked=false;
toggleTxBbmFields();
}
if(showStock){
populateTxStockSelect();
} else {
const chk=document.getElementById('txAddStock');
if(chk)chk.checked=false;
toggleTxStockFields();
}
if(showShop){
populateTxShopStockSelect();
} else {
const chk=document.getElementById('txAddShopStock');
if(chk)chk.checked=false;
toggleTxShopStockFields();
resetShopStockCart();
}
if(showShopSale){
populateTxShopSaleSelect();
} else {
const chk=document.getElementById('txAddShopSale');
if(chk)chk.checked=false;
toggleTxShopSaleFields();
resetTxShopSaleCart();
}
if(showRenov){
if(typeof populateTxRenovSelect==='function')populateTxRenovSelect();
} else {
const rchk=document.getElementById('txAddRenov');
if(rchk)rchk.checked=false;
if(typeof toggleTxRenovFields==='function')toggleTxRenovFields();
}
}
// Catatan: fungsi-fungsi form BBM (populateTxBbmVehicleSelect, toggleTxBbmFields,
// syncTxBbmAmt, syncTxAmtToLiter, syncTxAmtToLiterForce, recordBbmLog,
// applyTxBbmFromTx) dipindah ke tx-bbm.js (lihat CLAUDE.md catatan kerja "split
// transaksi.js" bagian ke-6) -- tetap global, tetap dipanggil persis sama dari
// sini, dari HTML (modals.js), maupun dari file lain (BBM._saveInner di
// car-notes.js).
// Catatan: fungsi-fungsi panel "Tambah ke Stok Sparepart" (populateTxStockSelect,
// onTxStockItemChange, toggleTxStockFields, applyTxStockFromTx) dipindah ke
// tx-stok-sparepart.js (lihat CLAUDE.md catatan kerja "split transaksi.js"
// bagian ke-7) -- tetap global, tetap dipanggil persis sama dari sini, dari
// HTML (modals.js), maupun dari scan-ocr.js.
// Catatan: fungsi-fungsi domain Target/Tabungan (openTargetModal,
// onTargetAccChange, onTargetDanaDaruratToggle, saveTarget,
// showTargetAccountTx, addTarget, delTarget) dipindah ke tx-target.js
// (lihat CLAUDE.md catatan kerja "split transaksi.js" bagian ke-9) --
// tetap fungsi global, tetap dipanggil persis sama dari HTML (modals.js,
// modules-render.js), maupun dari modules-calc.js/aset.js.
function openCatatan(type){curCatatan=type;document.getElementById('catatanTitle').textContent='Catatan Anak';document.getElementById('catatanDate').value=new Date().toISOString().split('T')[0];document.getElementById('catatanText').value='';openModal('catatanModal');}
function openReminderModal(){['rTitle','rDesc'].forEach(id=>document.getElementById(id).value='');openModal('reminderModal');}
// Catatan: openTransferModal/saveTransfer dipindah ke tx-transfer.js (lihat
// CLAUDE.md catatan kerja "split transaksi.js") -- tetap fungsi global,
// tetap dipanggil persis sama dari HTML (modals.js).
// BUGFIX (bug: "Cara Bayar balik ke Tunai saat edit Cicilan"): setPayMethod() dulu
// dipanggil sama persis baik oleh tap user di chip Tunai/Cicilan/Rutin, MAUPUN oleh
// editTx() secara programatik saat modal dibuka (mis. dipaksa 'tunai' krn transaksi
// cicilan yg sudah tidak py bill aktif -- lihat editTx()). Karena tidak ada pembeda,
// _saveTxInner() menganggap 'tunai' itu SELALU pilihan sengaja user, lalu menimpa
// payMethod transaksi asli (yg sebenarnya 'cicilan'/'langganan') jadi 'tunai' permanen
// walau user cuma edit catatan/nominal tanpa pernah sentuh chip Cara Bayar. Param
// userInitiated (default true, sesuai pemanggilan dari HTML/tap user) menandai itu;
// dipanggil dgn `false` dari kode programatik di editTx().
let _txPayMethodTouchedByUser=false;
function setPayMethod(m,userInitiated=true){
if(userInitiated)_txPayMethodTouchedByUser=true;
curPayMethod=m;
['pmTunai','pmCicilan','pmLangganan'].forEach(id=>{
const el=document.getElementById(id); if(el) el.classList.remove('active');
});
const map={tunai:'pmTunai',cicilan:'pmCicilan',langganan:'pmLangganan'};
if(map[m]) document.getElementById(map[m]).classList.add('active');
document.getElementById('txCicilanPanel').style.display = m==='cicilan'?'block':'none';
document.getElementById('txLanggananPanel').style.display = m==='langganan'?'block':'none';
if(m==='cicilan'){syncCicilanDate('date');syncCicilanPreview();updateCicilanTenorUI();}
}
// BUGFIX s282 (v941) -- "Kenapa cicilan 1x tidak masuk Tagihan?" + "Kenapa masih ada
// Jatuh Tempo Pertama padahal cuma 1x bayar?" -- riwayat lama: waktu itu Tenor 1x berarti
// LUNAS SEKALIGUS lewat transaksi yang sedang diisi (sisaTenor=0, tidak ada entri Tagihan,
// field Jatuh Tempo disembunyikan krn tidak kepakai). Itu SENGAJA by design saat itu.
//
// FIX s284 (v942) -- "Ganti Tenor 1x jadi 'Bayar Bulan Depan'": permintaan user mengubah
// perilaku itu. Tenor 1x SEKARANG berarti pembayaran DITUNDA ke tanggal Jatuh Tempo (bukan
// lunas sekarang juga): transaksi ini BELUM tercatat sbg pengeluaran, hanya dijadwalkan sbg
// entri 🧾 Tagihan (sisaTenor:1) yg jatuh tempo sesuai tanggal & bulan yang diisi di field
// Jatuh Tempo -- baru benar2 tercatat sbg transaksi begitu ditandai Bayar di Tagihan (reuse
// penuh markBillPaid() yg sudah ada, lihat tagihan-kalender.js -- TIDAK ada logic baru di
// sana). Konsekuensinya field Jatuh Tempo SEKARANG JUSTRU wajib tetap tampil & terpakai utk
// tenor 1x (kebalikan dari fix s282 di atas yang menyembunyikannya) -- lihat _saveTxInner()
// utk detail perubahan logic simpan.
function updateCicilanTenorUI(){
const tenorEl=document.getElementById('txCicilanTenor');
const dueWrap=document.getElementById('txCicilanDueWrap');
const tenor1Hint=document.getElementById('txCicilanTenor1Hint');
const dueLabelEl=document.getElementById('txCicilanDueLabel');
if(!tenorEl||!dueWrap||!tenor1Hint)return;
const tenor=parseInt(tenorEl.value)||1;
const hasActiveBill=!!txEditLinkedBillId;
dueWrap.style.display='';
if(tenor===1&&!hasActiveBill){
tenor1Hint.style.display='block';
if(dueLabelEl)dueLabelEl.textContent='Jatuh Tempo (Bayar Bulan Depan)';
}else{
tenor1Hint.style.display='none';
if(!hasActiveBill&&dueLabelEl)dueLabelEl.textContent='Jatuh Tempo Pertama';
}
}
// onCicilanTenorSelectChange() (s284) -- dipanggil dari onchange dropdown Tenor
// (modules/shared/modals.js). Kalau user baru pindah ke Tenor 1x (bayar bulan depan) utk
// transaksi BARU (bukan sedang edit cicilan lama yg py bill aktif) dan field Jatuh Tempo
// masih di nilai default (hari ini) atau kosong, otomatis majukan 1 bulan supaya defaultnya
// benar2 "bulan depan" sesuai nama opsi tenornya -- tetap bisa diedit manual ke tanggal lain.
function onCicilanTenorSelectChange(){
const tenorEl=document.getElementById('txCicilanTenor');
const dueEl=document.getElementById('txCicilanDue');
if(tenorEl&&dueEl&&parseInt(tenorEl.value)===1&&!txEditLinkedBillId){
const todayStr=new Date().toISOString().split('T')[0];
if(!dueEl.value||dueEl.value===todayStr){
const d=new Date(dueEl.value||todayStr);
d.setMonth(d.getMonth()+1);
dueEl.value=d.toISOString().split('T')[0];
}
}
syncCicilanPreview();
updateCicilanTenorUI();
}
// Catatan: fungsi-fungsi cicilan (validateCicilanFields, calcCicilanPerBulanFromTotal,
// calcCicilanTotalFromPerBulan, syncCicilanPreview, getCicilanSharedMine,
// toggleCicilanSharedFields, syncCicilanDate, openCicilanHistoryFromTx) dipindah ke
// cicilan.js (lihat CLAUDE.md catatan kerja "split transaksi.js") -- tetap global
// (bukan module), tetap dipanggil persis sama dari sini & dari HTML (modals.js).
function openTxModal(type){
txEditId=null;
if(typeof WorthIt!=='undefined')WorthIt.pendingBuyId=null;
_txAccManuallySet=false;
_txCatLearnSource=null;
document.getElementById('txModalTitle').textContent='Tambah Transaksi';
document.getElementById('txDelBtn').style.display='none';
resetPayMethodLock();
curTxType=type;
document.getElementById('txDate').value=new Date().toISOString().split('T')[0];
document.getElementById('txAmt').value='';
document.getElementById('txCat').value='';
document.getElementById('txSubCat').value='';
document.getElementById('txNote').value='';
if(typeof AutoKat!=='undefined'){AutoKat.hideSuggest();AutoKat._lastNoteQueried='';}
const scanInsightEl=document.getElementById('txScanInsight'); if(scanInsightEl){scanInsightEl.style.display='none';scanInsightEl.innerHTML='';}
cicilanLastInput='total';
cicilanDateLinked=false;
txEditLinkedBillId=null;
document.getElementById('txCicilanDueLabel').textContent='Jatuh Tempo Pertama';
document.getElementById('txCicilanDueHint').style.display='none';
document.getElementById('txCicilanHistoryBtn').style.display='none';
['txCicilanNama','txCicilanTotal','txCicilanPerBulan','txCicilanBunga','txLanggananNama'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
document.getElementById('txCicilanTenor').value='6';
updateCicilanTenorUI();
document.getElementById('txCicilanShared').checked=false;
const txCicilanIsKprEl=document.getElementById('txCicilanIsKpr');if(txCicilanIsKprEl)txCicilanIsKprEl.checked=false;
document.getElementById('txCicilanSharedPct').value=50;
document.getElementById('txCicilanSharedNominal').value='';
const txCicilanSharedOtherNameEl=document.getElementById('txCicilanSharedOtherName');if(txCicilanSharedOtherNameEl)txCicilanSharedOtherNameEl.value='';
const txCicilanSharedAutoPiutangEl=document.getElementById('txCicilanSharedAutoPiutang');if(txCicilanSharedAutoPiutangEl)txCicilanSharedAutoPiutangEl.checked=false;
cicilanSharedLastInput='pct';
document.getElementById('txCicilanSharedWrap').style.display='none';
const prevMineRowEl=document.getElementById('prevMineRow'); if(prevMineRowEl)prevMineRowEl.style.display='none';
document.getElementById('txCicilanDue').value=new Date().toISOString().split('T')[0];
document.getElementById('txLanggananDue').value=new Date().toISOString().split('T')[0];
document.getElementById('txCicilanPreview').style.display='none';
populateAccFilters();
setTxType(type);
setPayMethod('tunai',false);
const stockChk=document.getElementById('txAddStock');
if(stockChk)stockChk.checked=false;
['txStockNewName'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
const stockQtyEl=document.getElementById('txStockQty'); if(stockQtyEl)stockQtyEl.value='1';
const stockUnitEl=document.getElementById('txStockUnit'); if(stockUnitEl)stockUnitEl.value='pcs';
toggleTxStockFields();
const bbmChk=document.getElementById('txSyncBbm');
if(bbmChk)bbmChk.checked=false;
['txBbmKm','txBbmLiter','txBbmHargaL','txBbmSpbu'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
const bbmFullEl=document.getElementById('txBbmFull'); if(bbmFullEl)bbmFullEl.checked=true;
toggleTxBbmFields();
const shopChk=document.getElementById('txAddShopStock');
if(shopChk)shopChk.checked=false;
['txShopStockNewName','txShopStockKategori','txShopStockHarga','txShopStockJual'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
const shopQtyEl=document.getElementById('txShopStockQty'); if(shopQtyEl)shopQtyEl.value='1';
resetShopStockCart();
toggleTxShopStockFields();
const shopSaleChk=document.getElementById('txAddShopSale');
if(shopSaleChk)shopSaleChk.checked=false;
const shopSaleQtyEl=document.getElementById('txShopSaleQty'); if(shopSaleQtyEl)shopSaleQtyEl.value='1';
const shopSaleHargaEl=document.getElementById('txShopSaleHarga'); if(shopSaleHargaEl)shopSaleHargaEl.value='';
['txShopSaleDiskon','txShopSaleOngkir','txShopSaleCustName','txShopSaleCustPhone','txShopSaleCustAddr'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
resetTxShopSaleCart();
toggleTxShopSaleFields();
const renovChk=document.getElementById('txAddRenov');
if(renovChk)renovChk.checked=false;
if(typeof setTxRenovStatus==='function')setTxRenovStatus('sudah');
if(typeof toggleTxRenovFields==='function')toggleTxRenovFields();
openModal('txModal');
}
function resetPayMethodLock(){
['pmTunai','pmCicilan','pmLangganan'].forEach(id=>{const el=document.getElementById(id);if(el){el.style.pointerEvents='';el.style.opacity='';}});
}
function editTx(id){
const t=D.transactions.find(x=>x.id===id);
if(!t)return;
if(t.type==='transfer_in'||t.type==='transfer_out'){toast('⚠️ Transfer antar akun tidak bisa diedit di sini. Hapus & buat ulang kalau salah.');return;}
txEditId=id;
_txPayMethodTouchedByUser=false;
document.getElementById('txModalTitle').textContent='Edit Transaksi';
document.getElementById('txDelBtn').style.display='flex';
resetPayMethodLock();
// BUGFIX (bug: "field Cicilan/Langganan kebawa dari transaksi lain saat Edit"): dulu
// editTx() cuma isi ulang field panel Cicilan/Langganan (Nama/Total/Tenor/Bunga/dst)
// KALAU transaksi ini punya bill aktif (linkedBill, lihat di bawah). Transaksi yang
// TIDAK punya bill aktif (mis. cicilan tenor terakhir yang billLinkId-nya sudah null,
// atau transaksi tunai biasa) tidak pernah kena reset -- jadi field2 itu masih nyimpen
// sisa isian dari transaksi CICILAN LAIN yang sebelumnya sempat dibuka Edit di sesi yang
// sama, lalu nongol lagi (data SALAH/nyasar) begitu user tap chip Cicilan di transaksi
// ini. Fix: samakan dengan openTxModal() -- reset semua field panel Cicilan/Langganan ke
// kosong/default di awal editTx(), SEBELUM cek linkedBill di bawah (yang nanti akan
// isi ulang field2 ini dgn data yang BENAR kalau transaksi ini memang punya bill aktif).
cicilanLastInput='total';
['txCicilanNama','txCicilanTotal','txCicilanPerBulan','txCicilanBunga','txLanggananNama'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
document.getElementById('txCicilanTenor').value='6';
document.getElementById('txCicilanShared').checked=false;
const txCicilanIsKprResetEl=document.getElementById('txCicilanIsKpr');if(txCicilanIsKprResetEl)txCicilanIsKprResetEl.checked=false;
document.getElementById('txCicilanSharedPct').value=50;
document.getElementById('txCicilanSharedNominal').value='';
const txCicilanSharedOtherNameResetEl=document.getElementById('txCicilanSharedOtherName');if(txCicilanSharedOtherNameResetEl)txCicilanSharedOtherNameResetEl.value='';
const txCicilanSharedAutoPiutangResetEl=document.getElementById('txCicilanSharedAutoPiutang');if(txCicilanSharedAutoPiutangResetEl)txCicilanSharedAutoPiutangResetEl.checked=false;
cicilanSharedLastInput='pct';
document.getElementById('txCicilanSharedWrap').style.display='none';
const prevMineRowResetEl=document.getElementById('prevMineRow'); if(prevMineRowResetEl)prevMineRowResetEl.style.display='none';
document.getElementById('txCicilanPreview').style.display='none';
const scanInsightElEdit=document.getElementById('txScanInsight'); if(scanInsightElEdit){scanInsightElEdit.style.display='none';scanInsightElEdit.innerHTML='';}
if(typeof AutoKat!=='undefined'){AutoKat.hideSuggest();AutoKat._lastNoteQueried='';}
populateAccFilters();
curTxType=t.type;
document.getElementById('btnI').className='type-btn'+(t.type==='income'?' ai':'');
document.getElementById('btnE').className='type-btn'+(t.type==='expense'?' ae':'');
document.getElementById('txCat').value=t.category||'';
document.getElementById('txSubCat').value=t.subcategory||'';
document.getElementById('txAcc').value=t.accountId;
document.getElementById('txAmt').value=t.amount;
document.getElementById('txNote').value=t.note||'';
document.getElementById('txDate').value=t.date;
updateTxVehiclePanels();
const stockChk=document.getElementById('txAddStock');
if(stockChk)stockChk.checked=false;
toggleTxStockFields();
const renovChkEdit=document.getElementById('txAddRenov');
if(renovChkEdit)renovChkEdit.checked=false;
if(typeof setTxRenovStatus==='function')setTxRenovStatus('sudah');
if(typeof toggleTxRenovFields==='function')toggleTxRenovFields();
const shopChk=document.getElementById('txAddShopStock');
const hasShopStock=(t.stockItems&&t.stockItems.length)||t.stockProductId;
if(hasShopStock&&shopChk){
shopChk.checked=true;
toggleTxShopStockFields();
if(t.stockItems&&t.stockItems.length){
curShopStockCart=t.stockItems.map(si=>({
productId:si.productId,isNew:false,
name:(D.products.find(p=>p.id===si.productId)||{}).name||si.name||'Produk',
qty:si.qty,hargaBeli:si.hargaBeli||0,produsenId:si.produsenId||'',kategoriInput:'',hargaJual:0
}));
} else {
const legacyP=D.products.find(p=>p.id===t.stockProductId);
curShopStockCart=[{
productId:t.stockProductId,isNew:false,
name:legacyP?legacyP.name:'Produk',
qty:t.stockQty||1,hargaBeli:legacyP?(legacyP.hargaBeli||0):0,produsenId:t.produsenId||'',kategoriInput:'',hargaJual:0
}];
}
renderShopStockCartList();
if(t.produsenId){
const prodSel=document.getElementById('txShopStockProdusen');
if(prodSel)prodSel.value=t.produsenId;
}
} else {
if(shopChk)shopChk.checked=false;
resetShopStockCart();
toggleTxShopStockFields();
}
const shopSaleChk=document.getElementById('txAddShopSale');
const linkedShopSale=t.cobekLinkId?D.cobek.find(c=>c.id===t.cobekLinkId):null;
if(linkedShopSale&&shopSaleChk){
shopSaleChk.checked=true;
toggleTxShopSaleFields();
curTxShopSaleCart=(linkedShopSale.items||[]).map(it=>({
productId:it.productId,
name:(D.products.find(p=>p.id===it.productId)||{}).name||it.name||'Produk',
qty:it.qty,harga:it.harga
}));
renderTxShopSaleCartList();
const diskonEl=document.getElementById('txShopSaleDiskon'); if(diskonEl)diskonEl.value=linkedShopSale.diskon||'';
const ongkirEl=document.getElementById('txShopSaleOngkir'); if(ongkirEl)ongkirEl.value=linkedShopSale.ongkir||'';
const cust=linkedShopSale.customer||{};
const custNameEl=document.getElementById('txShopSaleCustName'); if(custNameEl)custNameEl.value=cust.name||'';
const custPhoneEl=document.getElementById('txShopSaleCustPhone'); if(custPhoneEl)custPhoneEl.value=cust.phone||'';
const custAddrEl=document.getElementById('txShopSaleCustAddr'); if(custAddrEl)custAddrEl.value=cust.address||'';
} else {
if(shopSaleChk)shopSaleChk.checked=false;
resetTxShopSaleCart();
toggleTxShopSaleFields();
}
const bbmChk=document.getElementById('txSyncBbm');
const linkedBbm=t.bbmLinkId?(D.bbmLogs||[]).find(b=>b.id===t.bbmLinkId):null;
if(linkedBbm&&bbmChk){
bbmChk.checked=true;
toggleTxBbmFields();
const vehSel=document.getElementById('txBbmVehicle');
if(vehSel)vehSel.value=linkedBbm.vehicleId;
document.getElementById('txBbmKm').value=linkedBbm.km;
document.getElementById('txBbmLiter').value=linkedBbm.liter;
document.getElementById('txBbmHargaL').value=linkedBbm.harga||'';
document.getElementById('txBbmSpbu').value=linkedBbm.spbu||'';
document.getElementById('txBbmFull').checked=!!linkedBbm.fullTank;
} else {
if(bbmChk)bbmChk.checked=false;
toggleTxBbmFields();
}
const linkedBill=t.billLinkId?D.bills.find(b=>b.id===t.billLinkId):null;
cicilanDateLinked=!!(linkedBill&&linkedBill.kind==='cicilan');
txEditLinkedBillId=linkedBill?linkedBill.id:null;
if(linkedBill&&(linkedBill.kind==='cicilan'||linkedBill.kind==='langganan')){
setPayMethod(linkedBill.kind,false);
if(linkedBill.kind==='cicilan'){
cicilanLastInput='total';
document.getElementById('txCicilanNama').value=linkedBill.name;
document.getElementById('txCicilanTotal').value=linkedBill.totalHarga||t.amount;
document.getElementById('txCicilanTenor').value=linkedBill.tenor||6;
document.getElementById('txCicilanBunga').value=linkedBill.bunga||0;
document.getElementById('txCicilanDue').value=linkedBill.nextDue;
document.getElementById('txCicilanShared').checked=!!linkedBill.shared;
const txCicilanIsKprEditEl=document.getElementById('txCicilanIsKpr');if(txCicilanIsKprEditEl)txCicilanIsKprEditEl.checked=!!linkedBill.isKpr;
document.getElementById('txCicilanSharedPct').value=linkedBill.sharedPct||50;
document.getElementById('txCicilanSharedNominal').value=linkedBill.shared?linkedBill.amount:'';
const txCicilanSharedOtherNameEditEl=document.getElementById('txCicilanSharedOtherName');if(txCicilanSharedOtherNameEditEl)txCicilanSharedOtherNameEditEl.value=linkedBill.sharedOtherName||'';
const txCicilanSharedAutoPiutangEditEl=document.getElementById('txCicilanSharedAutoPiutang');if(txCicilanSharedAutoPiutangEditEl)txCicilanSharedAutoPiutangEditEl.checked=!!linkedBill.sharedAutoPiutang;
document.getElementById('txCicilanSharedWrap').style.display=linkedBill.shared?'block':'none';
cicilanSharedLastInput='pct';
syncCicilanPreview();
document.getElementById('txCicilanDueLabel').textContent='Jatuh Tempo Berikutnya (Tagihan)';
document.getElementById('txCicilanDueHint').style.display='block';
document.getElementById('txCicilanHistoryBtn').style.display='block';
updateCicilanTenorUI();
} else {
document.getElementById('txLanggananNama').value=linkedBill.name;
document.getElementById('txLanggananFreq').value=linkedBill.freq;
document.getElementById('txLanggananDue').value=linkedBill.nextDue;
}
const lockIds=['pmTunai','pmCicilan','pmLangganan'].filter(x=>x!==(linkedBill.kind==='cicilan'?'pmCicilan':'pmLangganan'));
lockIds.forEach(id=>{const el=document.getElementById(id);if(el){el.style.pointerEvents='none';el.style.opacity='0.4';}});
} else {
document.getElementById('txCicilanDue').value=t.date;
document.getElementById('txCicilanDueLabel').textContent='Jatuh Tempo Pertama';
document.getElementById('txCicilanDueHint').style.display='none';
document.getElementById('txCicilanHistoryBtn').style.display='none';
updateCicilanTenorUI();
// BUGFIX: transaksi cicilan/langganan yg bill-nya sudah tidak aktif lagi (mis.
// cicilan tenor terakhir/1x -- billLinkId sengaja null, lihat _saveTxInner())
// tidak punya bill utk direkonstruksi ke panel Cicilan/Rutin, jadi chip yg
// ditampilkan tetap 'tunai' (panel cicilan/langganan tidak bisa diisi ulang).
// Tapi panggilan ini TIDAK dianggap "user memilih Tunai" (userInitiated=false)
// -- kalau user simpan tanpa sentuh chip Cara Bayar, payMethod ASLI transaksi
// (cicilan/langganan) tetap dipertahankan di _saveTxInner(), tidak ditimpa
// jadi 'tunai'.
setPayMethod('tunai',false);
}
openModal('txModal');
}
function deleteTxFromModal(){
if(!txEditId)return;
const id=txEditId;
closeModal('txModal');
delTx(id);
}
async function saveTx(){
if(_txSaving)return;
const modalEl=document.getElementById('txModal');
if(modalEl && !modalEl.classList.contains('open'))return;
_txSaving=true;
try{
await _saveTxInner();
} finally {
_txSaving=false;
}
}
async function _saveTxInner(){
evalAmtExpr('txAmt');
const amt=parseFloat(document.getElementById('txAmt').value);
if(!amt||amt<=0){toast('⚠️ Masukkan jumlah valid');return;}
const MAX_AMOUNT=999000000000;
if(amt>MAX_AMOUNT){toast('⚠️ Jumlah terlalu besar (maks Rp 999.000.000.000)');return;}
const subCat=document.getElementById('txSubCat')?document.getElementById('txSubCat').value:'';
const date=document.getElementById('txDate').value;
const note=document.getElementById('txNote').value;
const cat=document.getElementById('txCat').value;
const accId=document.getElementById('txAcc').value;
if(cat==='__add_new_cat__'){toast('⚠️ Pilih atau buat kategori dulu');return;}
// Panel "🔨 Catat juga ke Proyek Renovasi?" dgn status "🛒 Belum Dibeli" (lihat
// tx-renov.js): barangnya belum benar-benar dibeli, jadi transaksi Keuangan
// SENGAJA tidak dicatat -- item renovasi (belum lunas) saja yang dibuat.
// Hanya berlaku utk transaksi BARU (bukan edit) & metode Tunai, supaya tidak
// bentrok dgn alur cicilan/langganan/edit transaksi yang sudah ada di bawah.
if(!txEditId&&curPayMethod==='tunai'&&typeof handleTxRenovBelumDibeli==='function'&&handleTxRenovBelumDibeli(note,cat)){
return;
}
if(curPayMethod==='cicilan'&&!validateCicilanFields())return;
if(!txEditId){
const dupe=findPossibleDuplicateTx(amt,date,note,curTxType);
if(dupe){
const ok=await askConfirm(
'Ada transaksi mirip: '+fmtFull(dupe.amount)+' pada '+dupe.date+(dupe.note?' ("'+dupe.note+'")':'')+'.\n\nKemungkinan ini transaksi yang sama (mis. ke-tap/ke-scan 2x). Tetap simpan sebagai transaksi baru?',
{title:'⚠️ Kemungkinan Duplikat',okText:'Ya, Simpan Juga',cancelText:'Batal'}
);
if(!ok)return;
}
}
const editingId=txEditId;
const existingTx=editingId?D.transactions.find(t=>t.id===editingId):null;
const existingBill=existingTx&&existingTx.billLinkId?D.bills.find(b=>b.id===existingTx.billLinkId):null;
if(existingTx&&(existingTx.stockProductId||(existingTx.stockItems&&existingTx.stockItems.length))){
const stillChecked=document.getElementById('txAddShopStock')&&document.getElementById('txAddShopStock').checked;
const panelVisible=document.getElementById('txShopStockPanel')&&document.getElementById('txShopStockPanel').style.display!=='none';
if(!stillChecked||!panelVisible){
if(existingTx.stockItems&&existingTx.stockItems.length){
existingTx.stockItems.forEach(si=>{
const prevP=D.products.find(p=>p.id===si.productId);
if(prevP)prevP.stock=Math.max(0,(prevP.stock||0)-(si.qty||0));
});
} else if(existingTx.stockProductId){
const prevP=D.products.find(p=>p.id===existingTx.stockProductId);
if(prevP)prevP.stock=Math.max(0,(prevP.stock||0)-(existingTx.stockQty||0));
}
delete existingTx.stockProductId;delete existingTx.stockQty;delete existingTx.stockItems;
renderProductList();
}
}
if(existingTx&&existingTx.partStockId){
const stillChecked=document.getElementById('txAddStock')&&document.getElementById('txAddStock').checked;
const panelVisible=document.getElementById('txStockPanel')&&document.getElementById('txStockPanel').style.display!=='none';
if(!stillChecked||!panelVisible){
revertStockPurchase(existingTx.partStockId,existingTx.partStockQty);
delete existingTx.partStockId;delete existingTx.partStockQty;delete existingTx.partStockUnit;
renderStockList();
}
}
if(existingTx&&existingTx.cobekLinkId){
const stillChecked=document.getElementById('txAddShopSale')&&document.getElementById('txAddShopSale').checked;
const panelVisible=document.getElementById('txShopSalePanel')&&document.getElementById('txShopSalePanel').style.display!=='none';
if(!stillChecked||!panelVisible){
const prevShop=D.cobek.find(c=>c.id===existingTx.cobekLinkId);
if(prevShop&&prevShop.items){
prevShop.items.forEach(it=>{const pp=D.products.find(x=>x.id===it.productId);if(pp)pp.stock=(pp.stock||0)+it.qty;});
}
D.cobek=D.cobek.filter(c=>c.id!==existingTx.cobekLinkId);
delete existingTx.cobekLinkId;
renderProductList();renderShop();renderShopRecent();
}
}
if(existingBill && curPayMethod===existingBill.kind){
// BUGFIX: D.bills entry (existingBill) is SHARED oleh SEMUA transaksi pembayaran cicilan/
// langganan yang sudah tercatat (semuanya punya billLinkId yang sama ke bill ini) — bill
// ini merepresentasikan JADWAL/SISA cicilan yang LIVE (dipakai buat hitung pembayaran
// BERIKUTNYA), bukan snapshot transaksi tertentu. Sebelum fix ini, mengedit transaksi
// cicilan LAMA (yg sudah lewat/histori, misal cuma mau betulin kategori bulan lalu) ikut
// menimpa total harga/tenor/bunga/jatuh tempo/KATEGORI bill secara diam-diam — akibatnya
// SEMUA cicilan berikutnya yang belum dibayar ikut berubah kategorinya tanpa disadari.
// Fix: field jadwal (total/tenor/bunga/jatuh tempo/kategori/akun bill) hanya boleh
// disinkron ke bill kalau transaksi yang diedit adalah transaksi TERBARU yang tertaut ke
// bill ini (id transaksi terbesar). Kalau bukan (transaksi lama), cuma catatan transaksi
// itu sendiri yang diubah — jadwal cicilan/langganan tidak ikut tersentuh.
const linkedTxIds=D.transactions.filter(t=>t.billLinkId===existingBill.id).map(t=>t.id);
const isLatestInstallment=linkedTxIds.length===0||existingTx.id>=Math.max(...linkedTxIds);
if(curPayMethod==='cicilan'){
const nama=document.getElementById('txCicilanNama').value.trim()||cat;
if(isLatestInstallment){
const total=parseFloat(document.getElementById('txCicilanTotal').value)||amt;
const tenor=parseInt(document.getElementById('txCicilanTenor').value)||6;
const bunga=parseFloat(document.getElementById('txCicilanBunga').value)||0;
const due=document.getElementById('txCicilanDue').value||date;
const totalBayar=total*(1+bunga/100);
const perBulan=Math.ceil(totalBayar/tenor);
const sh=getCicilanSharedMine(perBulan);
const cicilanShared=sh.shared;
const cicilanSharedPct=sh.pct;
const perBulanMine=sh.mine;
const txCicilanIsKprSaveEl=document.getElementById('txCicilanIsKpr');
const isKpr=txCicilanIsKprSaveEl?txCicilanIsKprSaveEl.checked:false;
const txCicilanSharedOtherNameSaveEl=document.getElementById('txCicilanSharedOtherName');
const txCicilanSharedAutoPiutangSaveEl=document.getElementById('txCicilanSharedAutoPiutang');
const cicilanSharedOtherName=cicilanShared&&txCicilanSharedOtherNameSaveEl?txCicilanSharedOtherNameSaveEl.value.trim():'';
const cicilanSharedAutoPiutang=!!(cicilanShared&&txCicilanSharedAutoPiutangSaveEl&&txCicilanSharedAutoPiutangSaveEl.checked);
// BUGFIX (sinkron Piutang "Ditanggung Bersama" utk cicilan): totalAmount HARUS jadi total
// PER PERIODE (perBulan, sama satuan dgn amount/perBulanMine), BUKAN total harga barang
// (total/totalHarga) -- sebelumnya salah pakai `total` di sini, jadi maybeCreateSharedPiutangFromBill()
// (piutang-utang.js) menghitung sisa = totalHarga - porsiSebulan (angka jutaan yg salah,
// harusnya cuma selisih cicilan/bulan spt di modal "Detail Cicilan"), dan badge "👫 X% dari Rp Y"
// (renderBillItemHtml) & dialog markBillPaid() ikut salah nunjukin total harga, bukan total/bulan.
Object.assign(existingBill,{name:nama,amount:perBulanMine,nextDue:due,category:cat,accountId:accId,note,totalHarga:total,tenor,bunga,shared:cicilanShared,sharedPct:cicilanSharedPct,totalAmount:cicilanShared?perBulan:null,isKpr,sharedOtherName:cicilanSharedOtherName,sharedAutoPiutang:cicilanSharedAutoPiutang});
Object.assign(existingTx,{amount:perBulanMine,category:cat,subcategory:subCat,accountId:accId,date,note:nama+(note?' - '+note:'')});
// FIX s286: sebelum ini, menyalakan Ditanggung Bersama + Catat Otomatis Piutang
// saat EDIT transaksi cicilan yg sudah ada cuma nyimpen flag ke existingBill --
// piutang utk PEMBAYARAN yg sedang diedit ini sendiri tidak pernah dibuat, baru
// mulai muncul di pembayaran BERIKUTNYA (lewat markBillPaid()). Sekarang piutang
// utk transaksi ini juga langsung dibuat di sini, sama seperti alur cicilan
// BARU (lihat pemanggilan sejenis di bawah, kasus tenor>=2 saat create). Guard
// anti-dobel (kalau disimpan ulang) ada DI DALAM maybeCreateSharedPiutangFromBill()
// sendiri (skip kalau autoTxId ini sudah pernah punya entri Piutang).
if(typeof maybeCreateSharedPiutangFromBill==='function'){
maybeCreateSharedPiutangFromBill(existingBill,existingTx.id);
}
} else {
Object.assign(existingTx,{category:cat,subcategory:subCat,accountId:accId,date,note:nama+(note?' - '+note:'')});
toast('ℹ️ Ini pembayaran cicilan lama — hanya catatan transaksi ini yang diubah. Jadwal cicilan (total/tenor/jatuh tempo) tidak ikut berubah, ubah lewat 📋 Riwayat Pembayaran kalau perlu.');
}
} else {
const nama=document.getElementById('txLanggananNama').value.trim()||cat;
if(isLatestInstallment){
const freq=document.getElementById('txLanggananFreq').value;
const due=document.getElementById('txLanggananDue').value||date;
Object.assign(existingBill,{name:nama,amount:amt,freq,nextDue:due,category:cat,accountId:accId,note});
Object.assign(existingTx,{amount:amt,category:cat,subcategory:subCat,accountId:accId,date,note:nama+(note?' - '+note:'')});
} else {
Object.assign(existingTx,{amount:amt,category:cat,subcategory:subCat,accountId:accId,date,note:nama+(note?' - '+note:'')});
toast('ℹ️ Ini pembayaran tagihan lama — hanya catatan transaksi ini yang diubah, jadwal tagihan tidak ikut berubah.');
}
}
txEditId=null;
rememberLastAccForCat(cat,accId);
if(_txCatLearnSource){learnCatFromItemName(_txCatLearnSource,cat);_txCatLearnSource=null;}
save();closeModal('txModal');renderDashboard();renderKeuangan();renderBillList();checkBills();
if(typeof AIBus!=="undefined")AIBus.emit("finance.updated",{category:cat,kind:"cicilan-lama"});
if(isLatestInstallment)toast('✅ Cicilan/tagihan diperbarui');
return;
}
if(curPayMethod==='cicilan'){
const nama=document.getElementById('txCicilanNama').value.trim()||cat;
const total=parseFloat(document.getElementById('txCicilanTotal').value)||amt;
const tenor=parseInt(document.getElementById('txCicilanTenor').value)||6;
const bunga=parseFloat(document.getElementById('txCicilanBunga').value)||0;
const due=document.getElementById('txCicilanDue').value||date;
const totalBayar=total*(1+bunga/100);
const perBulan=Math.ceil(totalBayar/tenor);
const sh=getCicilanSharedMine(perBulan);
const cicilanShared=sh.shared;
const cicilanSharedPct=sh.pct;
const perBulanMine=sh.mine;
if(tenor===1){
// FIX s284 -- Tenor 1x = "Bayar Bulan Depan": transaksi BELUM dibayar, dijadwalkan sbg
// tagihan cicilan (sisaTenor:1) jatuh tempo ke tanggal `due` (field Jatuh Tempo, sudah
// TIDAK disembunyikan lagi utk tenor 1x -- lihat updateCicilanTenorUI()). TIDAK ada
// transaksi yang langsung tercatat di sini (beda dari tenor>=2 di bawah yg mencatat
// pembayaran pertama LANGSUNG) -- transaksi baru tercatat begitu user tandai Bayar lewat
// 🧾 Tagihan (markBillPaid() di tagihan-kalender.js, yg sudah otomatis: catat expense,
// kurangi sisaTenor jadi 0, & arsipkan sbg LUNAS -- 100% reuse, TIDAK ada logic baru di
// sana). applyTxStockFromTx/applyTxShopStockFromTx/WorthIt.applyBuyLink() juga sengaja
// TIDAK dipanggil di sini (belum ada transaksi nyata utk ditautkan) -- sama seperti alur
// Tagihan biasa (bukan lewat form Transaksi), efek samping itu baru relevan saat dibayar.
if(existingTx) D.transactions=D.transactions.filter(t=>t.id!==existingTx.id);
const billId=uid();
const txCicilanIsKprNewEl=document.getElementById('txCicilanIsKpr');
const isKprNew=txCicilanIsKprNewEl?txCicilanIsKprNewEl.checked:false;
const txCicilanSharedOtherNameNewEl=document.getElementById('txCicilanSharedOtherName');
const txCicilanSharedAutoPiutangNewEl=document.getElementById('txCicilanSharedAutoPiutang');
const cicilanSharedOtherNameNew=cicilanShared&&txCicilanSharedOtherNameNewEl?txCicilanSharedOtherNameNewEl.value.trim():'';
const cicilanSharedAutoPiutangNew=!!(cicilanShared&&txCicilanSharedAutoPiutangNewEl&&txCicilanSharedAutoPiutangNewEl.checked);
D.bills.push({id:billId,name:nama,amount:perBulanMine,nextDue:due,freq:'bulanan',sisaTenor:1,category:cat,subcategory:subCat,accountId:accId,note:note,kind:'cicilan',totalHarga:total,tenor,bunga,shared:cicilanShared,sharedPct:cicilanSharedPct,totalAmount:cicilanShared?perBulan:null,isKpr:isKprNew,sharedOtherName:cicilanSharedOtherNameNew,sharedAutoPiutang:cicilanSharedAutoPiutangNew});
txEditId=null;
rememberLastAccForCat(cat,accId);
if(_txCatLearnSource){learnCatFromItemName(_txCatLearnSource,cat);_txCatLearnSource=null;}
save();closeModal('txModal');renderDashboard();renderKeuangan();renderBillList();checkBills();
if(typeof AIBus!=="undefined")AIBus.emit("finance.updated",{category:cat,kind:"cicilan-baru"});
toast(`✅ Cicilan ${nama} dijadwalkan bayar bulan depan (${due}). Belum tercatat sbg transaksi -- akan otomatis tercatat begitu ditandai Bayar di 🧾 Tagihan.`);
return;
}
if(existingTx) D.transactions=D.transactions.filter(t=>t.id!==existingTx.id);
const billId=uid();
const sisaTenor=tenor-1;
if(sisaTenor>0){
const nextDueDate=new Date(due);
nextDueDate.setMonth(nextDueDate.getMonth()+1);
const nextDue=nextDueDate.toISOString().split('T')[0];
const txCicilanIsKprNewEl=document.getElementById('txCicilanIsKpr');
const isKprNew=txCicilanIsKprNewEl?txCicilanIsKprNewEl.checked:false;
const txCicilanSharedOtherNameNewEl=document.getElementById('txCicilanSharedOtherName');
const txCicilanSharedAutoPiutangNewEl=document.getElementById('txCicilanSharedAutoPiutang');
const cicilanSharedOtherNameNew=cicilanShared&&txCicilanSharedOtherNameNewEl?txCicilanSharedOtherNameNewEl.value.trim():'';
const cicilanSharedAutoPiutangNew=!!(cicilanShared&&txCicilanSharedAutoPiutangNewEl&&txCicilanSharedAutoPiutangNewEl.checked);
// BUGFIX: sama seperti cabang edit di atas -- totalAmount = perBulan (total/periode), bukan total harga.
D.bills.push({id:billId,name:nama,amount:perBulanMine,nextDue,freq:'bulanan',sisaTenor,category:cat,subcategory:subCat,accountId:accId,note:note,kind:'cicilan',totalHarga:total,tenor,bunga,shared:cicilanShared,sharedPct:cicilanSharedPct,totalAmount:cicilanShared?perBulan:null,isKpr:isKprNew,sharedOtherName:cicilanSharedOtherNameNew,sharedAutoPiutang:cicilanSharedAutoPiutangNew});
}
D.transactions.push({id:billId+1,type:'expense',amount:perBulanMine,category:cat,subcategory:subCat,accountId:accId,payMethod:'cicilan',billLinkId:sisaTenor>0?billId:null,note:nama+(note?' - '+note:''),date});
applyTxStockFromTx(nama,billId+1,date,total,existingTx);
applyTxShopStockFromTx(billId+1,nama,null);
WorthIt.applyBuyLink(billId+1);
// Sesi 341 lanjutan (gap txCicilanShared): cicilan pertama kali dibuat lewat form
// Transaksi INI JUGA merupakan 1x pembayaran nyata (perBulanMine langsung tercatat sbg
// expense di atas) -- sama seperti markBillPaid() -- jadi kalau shared+autoPiutang aktif,
// sisa porsi pihak lain juga harus langsung tercatat sbg Piutang, bukan cuma mulai
// berlaku dari cicilan bulan ke-2 dst (yg baru kepakai via markBillPaid() nanti).
if(cicilanShared&&cicilanSharedAutoPiutangNew&&typeof maybeCreateSharedPiutangFromBill==='function'){
// BUGFIX: totalAmount di sini juga harus perBulan (total/periode, sama satuan dgn amount),
// bukan total harga barang -- lihat komentar BUGFIX di dua Object.assign/D.bills.push di atas.
maybeCreateSharedPiutangFromBill({shared:true,sharedAutoPiutang:true,totalAmount:perBulan,amount:perBulanMine,name:nama,id:billId},billId+1);
}
txEditId=null;
rememberLastAccForCat(cat,accId);
if(_txCatLearnSource){learnCatFromItemName(_txCatLearnSource,cat);_txCatLearnSource=null;}
save();closeModal('txModal');renderDashboard();renderKeuangan();renderBillList();checkBills();
if(typeof AIBus!=="undefined")AIBus.emit("finance.updated",{category:cat,kind:"cicilan-baru"});
toast(cicilanShared?`✅ Cicilan ${nama} ${tenor}x dimulai! Porsi kamu ${fmtFull(perBulanMine)}/bulan (total ${fmtFull(perBulan)}/bulan)`:`✅ Cicilan ${nama} ${tenor}x dimulai! ${fmtFull(perBulan)}/bulan`);
return;
}
if(curPayMethod==='langganan'){
const nama=document.getElementById('txLanggananNama').value.trim()||cat;
const freq=document.getElementById('txLanggananFreq').value;
const due=document.getElementById('txLanggananDue').value||date;
const dueNext=new Date(due);
if(freq==='bulanan')dueNext.setMonth(dueNext.getMonth()+1);
else if(freq==='mingguan')dueNext.setDate(dueNext.getDate()+7);
else if(freq==='tahunan')dueNext.setFullYear(dueNext.getFullYear()+1);
if(existingTx) D.transactions=D.transactions.filter(t=>t.id!==existingTx.id);
const billId=uid();
const alreadyExists=D.bills.find(b=>b.name===nama&&b.kind==='langganan');
if(!alreadyExists){
D.bills.push({id:billId,name:nama,amount:amt,nextDue:dueNext.toISOString().split('T')[0],freq,sisaTenor:null,category:cat,subcategory:subCat,accountId:accId,note:note,kind:'langganan'});
}
D.transactions.push({id:billId+1,type:'expense',amount:amt,category:cat,subcategory:subCat,accountId:accId,payMethod:'langganan',note:nama+(note?' - '+note:''),date});
applyTxStockFromTx(nama,billId+1,date,amt,existingTx);
applyTxShopStockFromTx(billId+1,nama,null);
WorthIt.applyBuyLink(billId+1);
txEditId=null;
rememberLastAccForCat(cat,accId);
if(_txCatLearnSource){learnCatFromItemName(_txCatLearnSource,cat);_txCatLearnSource=null;}
save();closeModal('txModal');renderDashboard();renderKeuangan();renderBillList();checkBills();
if(typeof AIBus!=="undefined")AIBus.emit("finance.updated",{category:cat,kind:"langganan"});
toast(`✅ ${nama} dicatat & dijadwalkan ${freq}`);
return;
}
let savedTxId;
if(existingTx){
// BUGFIX ("Cara Bayar balik ke Tunai saat edit Cicilan"): titik ini SELALU
// menimpa payMethod jadi 'tunai', termasuk saat chip 'tunai' cuma dipaksa
// tampil programatik oleh editTx() (transaksi cicilan/langganan yg bill-nya
// sudah tidak aktif -- lihat komentar BUGFIX di editTx()). Fix: kalau user
// TIDAK pernah sentuh chip Cara Bayar sendiri selama sesi edit ini, payMethod
// asli transaksi dipertahankan apa adanya, tidak dipaksa jadi 'tunai'.
const keepPayMethod=_txPayMethodTouchedByUser?'tunai':(existingTx.payMethod||'tunai');
Object.assign(existingTx,{type:curTxType,amount:amt,category:cat,subcategory:subCat,accountId:accId,payMethod:keepPayMethod,note,date});
delete existingTx.billLinkId;
if(existingTx.servisLinkId&&D.servisLogs){
const linkedServis=D.servisLogs.find(s=>s.id===existingTx.servisLinkId);
if(linkedServis)Object.assign(linkedServis,{cost:amt,date,accountId:accId});
}
// BUGFIX: dulu catatan BBM terkait cuma disinkron kalau checkbox "Sinkron
// ke Catatan Mobil" masih tercentang saat simpan (lihat applyTxBbmFromTx
// di bawah, yg early-return kalau checkbox mati/panel BBM disembunyikan
// mis. krn kategori diganti keluar dari BBM). Kalau user ubah jumlah/
// tanggal transaksi TAPI checkbox itu kebetulan mati, D.bbmLogs jadi basi
// (beda dgn amount/date transaksi) — Keuangan & Car Notes jadi tidak
// konsisten, padahal `bbmLinkId` masih menghubungkan keduanya. Field dasar
// (cost/date/accountId) sekarang SELALU disinkron tanpa syarat begitu ada
// link, persis pola `servisLinkId` di atas -- checkbox tetap cuma
// mengatur field detail BBM (km/liter/harga/spbu/fullTank/kendaraan) lewat
// applyTxBbmFromTx di bawah, bukan field dasar ini.
if(existingTx.bbmLinkId&&D.bbmLogs){
const linkedBbm=D.bbmLogs.find(b=>b.id===existingTx.bbmLinkId);
if(linkedBbm)Object.assign(linkedBbm,{cost:amt,date,accountId:accId});
}
if(existingTx.renovItemLinkId&&typeof Renov!=='undefined'){
Renov.onLinkedTxEdited(existingTx);
}
if(existingTx.wishlistLinkId){
WorthIt.onLinkedTxEdited(existingTx);
}
if(existingTx.sewaKiosLinkId&&typeof SewaKios!=='undefined'){
SewaKios.onLinkedTxEdited(existingTx);
}
savedTxId=existingTx.id;
} else {
savedTxId=uid();
D.transactions.push({
id:savedTxId,type:curTxType,amount:amt,
category:cat,subcategory:subCat,
accountId:accId,payMethod:'tunai',
note:note,date
});
WorthIt.applyBuyLink(savedTxId);
if(typeof SewaKios!=='undefined')SewaKios.applyPaymentLink(savedTxId);
Tukang.applyPendingPayment(savedTxId);
}
applyTxStockFromTx(note,savedTxId,date,amt,existingTx);
applyTxBbmFromTx(savedTxId,amt,date,accId,note,existingTx);
applyTxShopStockFromTx(savedTxId,note,existingTx);
applyTxShopSaleFromTx(savedTxId,date,accId,note,existingTx);
if(!existingTx&&typeof applyTxRenovFromTx==='function')applyTxRenovFromTx(note,savedTxId,date,amt,cat,accId);
txEditId=null;
rememberLastAccForCat(cat,accId);
if(_txCatLearnSource){learnCatFromItemName(_txCatLearnSource,cat);_txCatLearnSource=null;}
save();closeModal('txModal');renderDashboard();renderKeuangan();renderCnTab();
if(typeof AIBus!=="undefined")AIBus.emit("finance.updated",{txId:savedTxId,category:cat,type:curTxType,amount:amt});
toast(existingTx?'✅ Transaksi diperbarui':'✅ Transaksi tersimpan');
}
function saveCatatan(){
const text=document.getElementById('catatanText').value;
if(!text){toast('⚠️ Tulis catatan dulu');return;}
if(!D.catatan[curCatatan])D.catatan[curCatatan]=[];
D.catatan[curCatatan].push({id:uid(),date:document.getElementById('catatanDate').value,text});
save();closeModal('catatanModal');renderSettings();toast('✅ Catatan tersimpan');
}
function saveReminder(){
const title=document.getElementById('rTitle').value;
if(!title){toast('⚠️ Isi judul');return;}
D.reminders.push({id:uid(),title,desc:document.getElementById('rDesc').value,color:document.getElementById('rColor').value});
save();closeModal('reminderModal');renderSettings();toast('✅ Pengingat tersimpan');
}
function saveLDR(){D.nextPulang=document.getElementById('nextPulang').value;D.ldrCycleStart=new Date().toISOString().slice(0,10);save();renderLDR();}

// (v94): toggleMs/delReminder dipindah dari backup-restore.js — domain
// Milestone/Reminder di Pengaturan, gabung bareng saveCatatan/saveReminder/
// saveLDR di atas yang sudah lebih dulu ada di sini sejak v83.
// (showTargetAccountTx/addTarget/delTarget, juga awalnya gabung di sini,
// sudah dipindah lagi ke tx-target.js -- lihat catatan di atas openCatatan.)
function toggleMs(i){D.milestones[i]=!D.milestones[i];save();renderMs();}
/* moved to modules-render.js: renderMs */
/* moved to modules-render.js: renderTarget */
/* moved to modules-render.js: renderReminder */
function delReminder(i){D.reminders.splice(i,1);save();renderSettings();}

// --- List Transaksi (kartu tx, hapus tx) & filter periode Keuangan/Laporan
// + Cashflow Forecast: dipindah ke tx-list-cashflow.js (lihat CLAUDE.md
// catatan kerja "split transaksi.js" bagian ke-11) -- txHTML, delTx,
// changeMonth, txListPeriode, setTxListPeriode, getTxListRange, setPeriode,
// getRange, computeCashflowForecast, setKeuanganTab semuanya di sana
// sekarang, fungsi global verbatim, tetap dipanggil sama persis dari sini.
/* moved to modules-render.js: renderDashDanaDarurat */
/* moved to modules-render.js: renderKeuangan */
/* moved to modules-render.js: renderBudgets */
/* moved to modules-render.js: renderBudgetCatOptions */
/* moved to modules-render.js: renderCashflowForecast */
