// tagihan-kalender.js — Modul Tagihan/Bill (CRUD, riwayat, filter, arsip) & Kalender Jatuh Tempo
// Dipindah ke modules/finance/tagihan-kalender.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: data-default.js, features-helpers-global-security.js, diagnostik-versi.js, format-tema.js, error-handler.js, helper-teks.js, keamanan-pin.js, modal-navigasi.js, reset-gaji-mingguan.js, debug-console.js, pengaturan-search.js, onboarding.js, kalkulator-input.js, scan-ocr.js, filter-laporan.js, akun.js, gaji-calc.js, transaksi.js, profil-pengaturan.js, kategori.js, tagihan-kalender.js, backup-restore.js, payroll-absensi.js, tukang-absensi.js

function setBillType(t){
curBillType=t;
document.getElementById('billBtnTagihan').className='type-btn'+(t==='tagihan'?' at':'');
document.getElementById('billBtnLangganan').className='type-btn'+(t==='langganan'?' ai':'');
}
function updateBillSubCatOptions(){
const catName=document.getElementById('billCat').value;
const wrap=document.getElementById('billSubWrap');
const sel=document.getElementById('billSubCat');
if(!wrap||!sel)return;
const cat=catName?getCatByType(catName,'expense'):null;
if(cat&&cat.subs&&cat.subs.length){
wrap.style.display='block';
sel.innerHTML='<option value="">Tanpa subkategori</option>'+cat.subs.map(s=>`<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');
} else {
wrap.style.display='none';
sel.innerHTML='';
}
}
function openBillModal(editId){
billEditId=editId!==undefined?editId:null;
billEditFromArchive=false;
if(billEditId!==null){
// BUGFIX (tombol Edit tagihan LUNAS error "Terjadi error saat memproses tombol"):
// tagihan yang sudah lunas/selesai dipindah dari D.bills ke D.billsArchive oleh
// markBillPaid()/refreshBillEverywhere(), jadi D.bills.find() di sini SELALU
// undefined utk tagihan lunas -> b.name di bawah throw TypeError sinkron ->
// ketangkep catch generik di features-helpers-global-security.js yg cuma
// nunjukin toast "Terjadi error..." tanpa detail. Sekarang fallback cari di
// D.billsArchive & tandai billEditFromArchive supaya _saveBillInner() tahu
// harus nulis balik ke array yang benar (lihat komentar di sana).
let b=D.bills.find(x=>x.id===billEditId);
if(!b){
b=(D.billsArchive||[]).find(x=>x.id===billEditId);
if(b)billEditFromArchive=true;
}
if(!b){toast('⚠️ Tagihan tidak ditemukan (mungkin sudah dihapus)');return;}
if(b.kind==='utang'&&b.debtId&&!billEditFromArchive){
toast('📕 Cicilan utang ini disinkron dari Buku Utang — edit di sana');
goToList('debtList',null);
return;
}
// BUGFIX (gap "Edit Tagihan" vs "Detail Cicilan" — field TIDAK sama lengkapnya): bill
// kind:'cicilan' (aktif, bukan arsip) sebelumnya TIDAK ada redirect di sini sama sekali --
// beda dari kind:'utang' di atas -- jadi klik kartu/✏️ Edit di list "Tagihan, Cicilan &
// Langganan" (renderBillItemHtml, data-action="openBillModal" utk SEMUA kind tanpa kecuali)
// malah membuka modal Tagihan/Langganan GENERIK ini, yang cuma punya field "Jumlah Total per
// Periode" -- TIDAK PUNYA field Tenor/Total Harga/Cicilan per Bulan/Bunga/KPR sama sekali,
// jauh lebih tidak lengkap dibanding modal "🗂 Detail Cicilan" (txModal form cicilan,
// dibuka via editTx() di transaksi.js) yang memang didesain khusus utk cicilan. Sekarang
// diarahkan ke editor yang BENAR & lengkap: transaksi TERBARU yang tertaut ke bill ini
// (linkedTxIds, pola sama dgn isLatestInstallment di transaksi.js) dibuka lewat editTx(),
// yang otomatis mengisi Tenor/Total Harga/Bunga/Ditanggung Bersama/Catat Otomatis sbg
// Piutang dari data bill (lihat editTx()) -- 1 editor per jenis tagihan, bukan 2 versi
// beda kelengkapan utk data yang sama. Cicilan yang sudah LUNAS/diarsip (billEditFromArchive)
// TETAP lewat modal generik di bawah (sama seperti tagihan/langganan lain yang sudah
// diarsip -- cuma untuk koreksi nama/catatan, bukan lanjut nyicil).
if(b.kind==='cicilan'&&!billEditFromArchive){
const linkedTxIds=D.transactions.filter(t=>t.billLinkId===b.id).map(t=>t.id);
if(linkedTxIds.length){
editTx(Math.max(...linkedTxIds));
return;
}
toast('⚠️ Riwayat pembayaran cicilan ini tidak ditemukan, tidak bisa dibuka edit lengkapnya');
return;
}
}
const cats=getCatsByType('expense');
document.getElementById('billCat').innerHTML='<option value="">Tanpa kategori</option>'+cats.map(c=>`<option value="${escapeHtml(c.name)}">${c.emoji} ${escapeHtml(c.name)}</option>`).join('');
document.getElementById('billAcc').innerHTML=D.accounts.map(a=>`<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
if(billEditId!==null){
const b=billEditFromArchive?(D.billsArchive||[]).find(x=>x.id===billEditId):D.bills.find(x=>x.id===billEditId);
document.getElementById('billModalTitle').textContent=billEditFromArchive?'✏️ Edit Tagihan (Lunas)':'Edit Tagihan';
document.getElementById('billName').value=b.name;
document.getElementById('billAmt').value=b.shared?b.totalAmount:b.amount;
document.getElementById('billDue').value=b.nextDue;
document.getElementById('billFreq').value=b.freq;
document.getElementById('billCat').value=b.category||'';
updateBillSubCatOptions();
document.getElementById('billSubCat').value=b.subcategory||'';
document.getElementById('billAcc').value=b.accountId||D.accounts[0]?.id||'';
document.getElementById('billNote').value=b.note||'';
setBillType(b.kind);
document.getElementById('billShared').checked=!!b.shared;
document.getElementById('billSharedPct').value=b.sharedPct||50;
const otherNameEl=document.getElementById('billSharedOtherName');
if(otherNameEl)otherNameEl.value=b.sharedOtherName||'';
const autoPiutangEl=document.getElementById('billSharedAutoPiutang');
if(autoPiutangEl)autoPiutangEl.checked=!!b.sharedAutoPiutang;
toggleBillSharedFields();
} else {
document.getElementById('billModalTitle').textContent='Tambah Tagihan/Langganan';
document.getElementById('billName').value='';
document.getElementById('billAmt').value='';
document.getElementById('billDue').value=new Date().toISOString().split('T')[0];
document.getElementById('billFreq').value='bulanan';
document.getElementById('billCat').value='';
updateBillSubCatOptions();
document.getElementById('billAcc').value=D.accounts[0]?.id||'';
document.getElementById('billNote').value='';
setBillType('tagihan');
document.getElementById('billShared').checked=false;
document.getElementById('billSharedPct').value=50;
const otherNameEl2=document.getElementById('billSharedOtherName');
if(otherNameEl2)otherNameEl2.value='';
const autoPiutangEl2=document.getElementById('billSharedAutoPiutang');
if(autoPiutangEl2)autoPiutangEl2.checked=false;
toggleBillSharedFields();
}
openModal('billModal');
}
function toggleBillSharedFields(){
const shared=document.getElementById('billShared').checked;
document.getElementById('billSharedWrap').style.display=shared?'block':'none';
document.getElementById('billAmtLabel').textContent=shared?'Jumlah Total per Periode (Rp)':'Jumlah per Periode (Rp)';
updateBillSharedPreview();
}
function updateBillSharedPreview(){
const previewEl=document.getElementById('billSharedPreview');
if(!previewEl)return;
if(!document.getElementById('billShared').checked){previewEl.textContent='';return;}
const total=parseFloat(document.getElementById('billAmt').value)||0;
const pct=Math.min(99,Math.max(1,parseFloat(document.getElementById('billSharedPct').value)||50));
const porsi=Math.round(total*pct/100);
previewEl.textContent=total>0?`👫 Porsi kamu: ${fmt(porsi)} dari total ${fmt(total)} (sisanya ${fmt(total-porsi)} ditanggung pihak lain)`:'';
}
function saveBill(){return withSaveGuard('bill','billModal',_saveBillInner);}
function _saveBillInner(){
const name=document.getElementById('billName').value.trim();
const rawAmt=parseFloat(document.getElementById('billAmt').value);
const due=document.getElementById('billDue').value;
if(!name||!rawAmt||!due){toast('⚠️ Lengkapi nama, jumlah, dan tanggal');return;}
const shared=document.getElementById('billShared').checked;
const sharedPct=shared?Math.min(99,Math.max(1,parseFloat(document.getElementById('billSharedPct').value)||50)):null;
const amt=shared?Math.round(rawAmt*sharedPct/100):rawAmt;
const sharedOtherNameEl=document.getElementById('billSharedOtherName');
const sharedAutoPiutangEl=document.getElementById('billSharedAutoPiutang');
const data={
name,amount:amt,nextDue:due,
freq:document.getElementById('billFreq').value,
category:document.getElementById('billCat').value,
subcategory:document.getElementById('billSubCat')?document.getElementById('billSubCat').value:'',
accountId:document.getElementById('billAcc').value||D.accounts[0]?.id,
note:document.getElementById('billNote').value,
kind:curBillType,
shared:shared,
sharedPct:shared?sharedPct:null,
totalAmount:shared?rawAmt:null,
sharedOtherName:shared&&sharedOtherNameEl?sharedOtherNameEl.value.trim():'',
sharedAutoPiutang:!!(shared&&sharedAutoPiutangEl&&sharedAutoPiutangEl.checked)
};
if(billEditId!==null){
// BUGFIX: tagihan lunas (di D.billsArchive) HARUS ditulis balik ke array
// yang sama tempat dia ditemukan (lihat openBillModal) — bukan D.bills,
// supaya tidak menduplikasi record atau menghidupkan-kembali tagihan yang
// sudah lunas jadi aktif lagi tanpa disengaja.
if(billEditFromArchive){
const idx=(D.billsArchive||[]).findIndex(b=>b.id===billEditId);
if(idx>-1)D.billsArchive[idx]={...D.billsArchive[idx],...data};
} else {
const idx=D.bills.findIndex(b=>b.id===billEditId);
D.bills[idx]={...D.bills[idx],...data};
}
} else {
D.bills.push({id:uid(),...data});
}
save();closeModal('billModal');refreshBillEverywhere();toast('✅ Tagihan tersimpan');
}
async function delBill(id){
const b=D.bills.find(x=>x.id===id);
const msg=(b&&b.kind==='utang')?'Hapus tagihan ini? Utangnya di Buku Utang TETAP ada, cuma pengingat cicilan bulanannya yg hilang (akan dibuat ulang otomatis kalau data utang itu diedit/disimpan lagi).':'Hapus tagihan ini?';
if(!await askConfirm(msg))return;
if(b&&b.kind==='utang'&&b.debtId){
const dbt=D.debts.find(x=>sameId(x.id,b.debtId));
if(dbt&&sameId(dbt.billId,id))dbt.billId=null;
}
D.bills=D.bills.filter(b=>b.id!==id);
save();refreshBillEverywhere();renderDebtList();toast('🗑 Tagihan dihapus');
}
function refreshBillEverywhere(){
renderBillList();
renderSettings();
renderDashboard();
checkBills();
renderBillHistory();
const archModal=document.getElementById('billArchiveModal');
if(archModal&&archModal.classList.contains('open'))renderBillArchive();
}
let curBillHistoryId=null, curBillHistoryEditTxId=null;
// delBillArchive(id) — Hapus permanen entri Riwayat Tagihan Lunas (audit
// sesi 132: sebelumnya arsip cuma bisa dilihat via "Riwayat Pembayaran",
// tidak ada cara hapus langsung — satu-satunya jalan tidak langsung
// adalah hapus transaksi pembayaran terakhir, yang malah mengembalikan
// tagihan ke status aktif, bukan menghapusnya). Ini murni menghapus
// record arsipnya sendiri (metadata tagihan yang sudah lunas) — riwayat
// transaksi pembayaran terkait (D.transactions) TIDAK ikut dihapus,
// tetap jadi catatan keuangan yang sah (pola sama dgn delAsset/
// delSparepart yang juga tidak menghapus riwayat transaksi terkait).
async function delBillArchive(id){
const b=(D.billsArchive||[]).find(x=>x.id===id);
if(!b)return;
if(!await askConfirm(`Hapus permanen catatan arsip "${escapeHtml(b.name)}" dari Riwayat Tagihan Lunas? Riwayat pembayaran (transaksi) yang sudah tercatat TIDAK ikut terhapus.`,{title:'Hapus Arsip Tagihan',okText:'Ya, Hapus',icon:'🗑'}))return;
D.billsArchive=D.billsArchive.filter(x=>x.id!==id);
save();renderBillArchive();toast('🗑 Arsip dihapus');
}
function openBillHistory(billId){
curBillHistoryId=billId;
openModal('billHistoryModal');
renderBillHistory();
}
/* moved to modules-render.js: renderBillHistory */
function editBillHistoryTx(txId){
const t=D.transactions.find(x=>x.id===txId);
if(!t)return;
curBillHistoryEditTxId=txId;
document.getElementById('bhTanggal').value=t.date;
document.getElementById('bhJumlah').value=t.amount;
document.getElementById('bhCatatan').value=t.note||'';
openModal('billHistoryEditModal');
}
function saveBillHistoryEdit(){
if(!curBillHistoryEditTxId)return;
const t=D.transactions.find(x=>x.id===curBillHistoryEditTxId);
if(!t){toast('⚠️ Transaksi tidak ditemukan');return;}
const tanggal=document.getElementById('bhTanggal').value;
const jumlah=parseFloat(document.getElementById('bhJumlah').value);
const catatan=document.getElementById('bhCatatan').value;
if(!tanggal){toast('⚠️ Tanggal wajib diisi');return;}
if(!jumlah||jumlah<=0){toast('⚠️ Jumlah harus lebih dari 0');return;}
t.date=tanggal;
t.amount=jumlah;
t.note=catatan;
save();
closeModal('billHistoryEditModal');
renderDashboard();renderKeuangan();renderBillHistory();
toast('✅ Riwayat pembayaran diperbarui');
}
async function deleteBillHistoryTx(){
if(!curBillHistoryEditTxId)return;
const t=D.transactions.find(x=>x.id===curBillHistoryEditTxId);
if(!t)return;
if(!await askConfirm('Hapus riwayat pembayaran ini? Kalau ini cicilan, sisa tenor & jatuh tempo tagihan akan dikembalikan.'))return;
let linkedBill=t.billLinkId?D.bills.find(b=>b.id===t.billLinkId):null;
let restoredFromArchive=false;
if(!linkedBill&&t.billLinkId){
const archIdx=(D.billsArchive||[]).findIndex(b=>b.id===t.billLinkId);
if(archIdx>-1){
linkedBill=D.billsArchive[archIdx];
delete linkedBill.completedAt;
D.billsArchive.splice(archIdx,1);
D.bills.push(linkedBill);
restoredFromArchive=true;
}
}
if(linkedBill&&linkedBill.kind==='cicilan'&&linkedBill.sisaTenor!=null){
linkedBill.sisaTenor+=1;
const d=new Date(linkedBill.nextDue);
d.setMonth(d.getMonth()-1);
linkedBill.nextDue=d.toISOString().split('T')[0];
}
if(linkedBill&&linkedBill.kind==='utang'&&linkedBill.debtId){
const dbt=D.debts.find(x=>sameId(x.id,linkedBill.debtId));
if(dbt){
dbt.nilai=(dbt.nilai||0)+t.amount;
if(dbt.lunas){dbt.lunas=false;dbt.billId=linkedBill.id;}
}
const d=new Date(linkedBill.nextDue);
d.setMonth(d.getMonth()-1);
linkedBill.nextDue=d.toISOString().split('T')[0];
}
D.transactions=D.transactions.filter(x=>x.id!==curBillHistoryEditTxId);
curBillHistoryEditTxId=null;
save();
closeModal('billHistoryEditModal');
renderDashboard();renderKeuangan();renderBillList();renderSettings();checkBills();renderBillHistory();renderBillArchive();
renderDebtList();renderKekayaanBersih();hitungZakatMaal();
const msg=restoredFromArchive?', tagihan diaktifkan lagi (belum lunas)':(linkedBill&&linkedBill.kind==='cicilan'?', sisa tenor dikembalikan':'');
toast('🗑 Riwayat pembayaran dihapus'+msg);
}
async function markBillPaid(id){
const b=D.bills.find(x=>x.id===id);
if(!b)return;
const label=b.kind==='cicilan'&&b.sisaTenor!=null?` (cicilan ke-${(b.tenor||0)-(b.sisaTenor||0)+1} dari ${b.tenor||'?'}x)`:'';
const sharedLabel=b.shared?` (porsi kamu ${b.sharedPct}% dari total ${fmtFull(b.totalAmount)})`:'';
if(!await askConfirm(`Bayar "${escapeHtml(b.name)}"${label}${sharedLabel} sebesar ${fmtFull(b.amount)}?`,{danger:false,okText:'Ya, Bayar',icon:'💸'}))return;
const _payTxId=uid();
D.transactions.push({id:_payTxId,type:'expense',amount:b.amount,category:b.category||'Tagihan',subcategory:'',accountId:b.accountId||D.accounts[0]?.id||'',note:'Bayar: '+b.name,date:new Date().toISOString().split('T')[0],payMethod:b.kind,billLinkId:b.id});
// Ditanggung Bersama + auto-piutang (Sesi 341) -- lihat komentar helper di
// piutang-utang.js. Dipanggil di sini (SETELAH transaksi pembayaran dibuat,
// SEBELUM cabang kind-specific di bawah) supaya berlaku utk SEMUA jenis bill
// (tagihan/langganan/cicilan/utang) & tetap jalan meski bill ini langsung
// lunas/diarsip setelah ini.
if(typeof maybeCreateSharedPiutangFromBill==='function')maybeCreateSharedPiutangFromBill(b,_payTxId);
if(b.kind==='utang'&&b.debtId){
const dbt=D.debts.find(x=>sameId(x.id,b.debtId));
if(dbt){
dbt.nilai=Math.max(0,(dbt.nilai||0)-b.amount);
if(dbt.nilai<=0){
dbt.lunas=true;dbt.billId=null;
if(!D.billsArchive)D.billsArchive=[];
D.billsArchive.push({...b,completedAt:new Date().toISOString().split('T')[0]});
D.bills=D.bills.filter(x=>x.id!==id);
save();refreshBillEverywhere();renderDebtList();renderKekayaanBersih();hitungZakatMaal();
toast('🎉 Utang '+dbt.name+' LUNAS!');return;
}
}
}
if(b.kind==='cicilan'&&b.sisaTenor!=null){
b.sisaTenor-=1;
if(b.sisaTenor<=0){
if(!D.billsArchive)D.billsArchive=[];
D.billsArchive.push({...b,completedAt:new Date().toISOString().split('T')[0]});
D.bills=D.bills.filter(x=>x.id!==id);
save();refreshBillEverywhere();
toast('🎉 Cicilan '+b.name+' LUNAS!');return;
}
}
const d=new Date(b.nextDue);
if(b.freq==='bulanan')d.setMonth(d.getMonth()+1);
else if(b.freq==='mingguan')d.setDate(d.getDate()+7);
else if(b.freq==='tahunan')d.setFullYear(d.getFullYear()+1);
else{
if(!D.billsArchive)D.billsArchive=[];
D.billsArchive.push({...b,completedAt:new Date().toISOString().split('T')[0]});
D.bills=D.bills.filter(x=>x.id!==id);
save();refreshBillEverywhere();
toast('✅ Tagihan selesai & tercatat');return;
}
b.nextDue=d.toISOString().split('T')[0];
save();refreshBillEverywhere();
if(b.kind==='utang'){renderDebtList();renderKekayaanBersih();hitungZakatMaal();}
const sisaMsg=b.sisaTenor!=null?` Sisa ${b.sisaTenor}x lagi.`:'';
toast('✅ Dibayar & dijadwalkan ulang.'+sisaMsg);
}
// getBillPaidThisPeriodInfo(b) — cek apakah tagihan AKTIF (masih di D.bills, BUKAN
// D.billsArchive) ini SUDAH dibayar utk periode berjalan (cicilan bulan ini, langganan
// minggu/tahun ini, dst), meski tagihannya sendiri masih aktif (sisa tenor>0/masih
// berulang) -- dipakai renderBillList() (lanjutan S322 split tab Bayar/Lunas) supaya
// cicilan & tagihan yang sudah dibayar (baik pas tanggal MAUPUN dibayar lebih awal/di
// muka utk periode berikutnya, mis. "bayar bulan depan") ikut MUNCUL juga di tab
// "✅ Lunas" (sbg riwayat "sudah dibayar periode ini"), TANPA menghilangkannya dari tab
// "💳 Bayar" (karena tagihannya sendiri masih aktif -- beda dari D.billsArchive yang
// memang sudah 100% selesai/tidak berulang lagi). Deteksi berbasis histori pembayaran
// (D.transactions dgn billLinkId===b.id) yg TERBARU, dicocokkan ke periode SEKARANG
// (bukan ke b.nextDue, karena nextDue sudah kadung dimajukan oleh markBillPaid()).
// Sengaja TIDAK berlaku utk freq 'sekali' (begitu dibayar langsung pindah ke
// D.billsArchive lewat markBillPaid(), tidak pernah nyangkut di D.bills lagi).
function getBillPaidThisPeriodInfo(b){
if(!b||!b.id||b.freq==='sekali')return null;
const history=(D.transactions||[]).filter(t=>t.billLinkId===b.id&&t.date).map(t=>({t,d:new Date(t.date)})).filter(x=>!isNaN(x.d.getTime())).sort((a,c)=>c.d-a.d);
if(!history.length)return null;
const{t,d}=history[0];
const now=new Date();
let samePeriod=false;
if(b.freq==='bulanan')samePeriod=d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
else if(b.freq==='tahunan')samePeriod=d.getFullYear()===now.getFullYear();
else if(b.freq==='mingguan'){
const start=new Date(now);start.setDate(now.getDate()-now.getDay());start.setHours(0,0,0,0);
const end=new Date(start);end.setDate(start.getDate()+6);end.setHours(23,59,59,999);
samePeriod=d>=start&&d<=end;
}
return samePeriod?{tx:t,date:d}:null;
}
// navBillFilterMonth(dir) — navigasi ‹bulan sebelumnya/berikutnya› utk filter lanjutan
// Tagihan (billFilterBulan+billFilterTahun), konsisten dgn pola changeTxListMonth() di
// Daftar Transaksi. Dropdown "Semua Bulan"/"Semua Tahun" TETAP ada (tidak dihapus) --
// nav ini murni shortcut yang menulis ke 2 dropdown itu lalu reuse applyBillFilter() yang
// sudah ada, supaya user tetap bisa reset ke "Semua" lewat dropdown kalau perlu.
function navBillFilterMonth(dir){
const elB=document.getElementById('billFilterBulan'), elT=document.getElementById('billFilterTahun');
if(!elB||!elT)return;
const now=new Date();
let m=billFilterBulan==='all'?now.getMonth():parseInt(billFilterBulan);
let y=billFilterTahun==='all'?now.getFullYear():parseInt(billFilterTahun);
m+=dir;
if(m>11){m=0;y++;}
if(m<0){m=11;y--;}
elB.value=String(m);
if(![...elT.options].some(o=>o.value===String(y))){
const opt=document.createElement('option');opt.value=String(y);opt.textContent=String(y);elT.appendChild(opt);
}
elT.value=String(y);
applyBillFilter();
}
function openBillArchive(){
renderBillArchive();
openModal('billArchiveModal');
}
/* moved to modules-render.js: renderBillArchive */
// setBillListTab(tab) — tab "💳 Bayar" / "✅ Lunas" di atas list Tagihan (S322). Dulu tagihan
// aktif & lunas dicampur jadi 1 list panjang (cuma dibedakan opacity+badge), susah ditelusuri
// & jadi salah satu sumber bug tombol Edit lunas error (lihat catatan di openBillModal). Tab ini
// murni UI convenience di atas filter status yg SUDAH ADA (billFilterStatus) — jadi tetap
// kompatibel dgn dropdown Filter lanjutan (kategori/bulan/tahun) yg sudah ada.
function setBillListTab(tab){
billListTab=tab;
const btnBayar=document.getElementById('billTabBayarBtn'), btnLunas=document.getElementById('billTabLunasBtn');
if(btnBayar)btnBayar.className='type-btn'+(tab==='aktif'?' at':'');
if(btnLunas)btnLunas.className='type-btn'+(tab==='lunas'?' ai':'');
billFilterStatus=tab;
const elS=document.getElementById('billFilterStatus');
if(elS)elS.value=tab;
renderBillList();
}
// Default 'aktif' (bukan 'all') supaya konsisten dgn tab "💳 Bayar" yang aktif duluan saat
// halaman pertama dibuka (lihat setBillListTab & sinkronisasi UI tab di renderBillList).
let billFilterStatus='aktif', billFilterKategori='all', billFilterBulan='all', billFilterTahun='all';
function toggleBillFilterPanel(){
const panel=document.getElementById('billFilterPanel');
if(!panel)return;
const willOpen=panel.style.display==='none';
panel.style.display=willOpen?'block':'none';
const btn=document.getElementById('billFilterToggleBtn');
if(btn)btn.classList.toggle('active',willOpen);
}
function applyBillFilter(){
const elS=document.getElementById('billFilterStatus'), elK=document.getElementById('billFilterKategori'),
elB=document.getElementById('billFilterBulan'), elT=document.getElementById('billFilterTahun');
if(elS)billFilterStatus=elS.value;
if(elK)billFilterKategori=elK.value;
if(elB)billFilterBulan=elB.value;
if(elT)billFilterTahun=elT.value;
// Sinkronkan tombol tab Bayar/Lunas kalau user ubah lewat dropdown Filter lanjutan (mis. pilih
// "Semua Status") -- keduanya jadi non-aktif secara visual kalau statusnya bukan aktif/lunas.
billListTab=billFilterStatus;
const btnBayar=document.getElementById('billTabBayarBtn'), btnLunas=document.getElementById('billTabLunasBtn');
if(btnBayar)btnBayar.className='type-btn'+(billFilterStatus==='aktif'?' at':'');
if(btnLunas)btnLunas.className='type-btn'+(billFilterStatus==='lunas'?' ai':'');
renderBillList();
}
function resetBillFilter(){
billFilterStatus='aktif';billFilterKategori='all';billFilterBulan='all';billFilterTahun='all';
billListTab='aktif';
const elS=document.getElementById('billFilterStatus'), elK=document.getElementById('billFilterKategori'),
elB=document.getElementById('billFilterBulan'), elT=document.getElementById('billFilterTahun');
if(elS)elS.value='aktif';
if(elK)elK.value='all';
if(elB)elB.value='all';
if(elT)elT.value='all';
const btnBayar=document.getElementById('billTabBayarBtn'), btnLunas=document.getElementById('billTabLunasBtn');
if(btnBayar)btnBayar.className='type-btn at';
if(btnLunas)btnLunas.className='type-btn';
renderBillList();
}
function populateBillFilterOptions(){
const elK=document.getElementById('billFilterKategori'), elT=document.getElementById('billFilterTahun');
if(!elK||!elT)return;
const all=[...D.bills,...(D.billsArchive||[])];
const kategoris=[...new Set(all.map(b=>b.category).filter(Boolean))].sort();
const prevK=elK.value;
elK.innerHTML='<option value="all">Semua Kategori</option>'+kategoris.map(k=>`<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
elK.value=kategoris.includes(prevK)?prevK:'all';
billFilterKategori=elK.value;
const prevT=elT.value;
const tahuns=[...new Set([...all.map(b=>{const d=new Date(b.kind==='cicilan'&&b.completedAt?b.completedAt:b.nextDue);return isNaN(d)?null:d.getFullYear();}),prevT!=='all'&&!isNaN(parseInt(prevT))?parseInt(prevT):null].filter(Boolean))].sort((a,b)=>b-a);
elT.innerHTML='<option value="all">Semua Tahun</option>'+tahuns.map(t=>`<option value="${t}">${t}</option>`).join('');
elT.value=tahuns.map(String).includes(prevT)?prevT:'all';
billFilterTahun=elT.value;
}
/* moved to modules-render.js: renderBillList */
// openBillActionsMenu(id,lunas) — menu overflow "⋮" utk aksi sekunder kartu tagihan
// (S299 UI polish: ringkas baris ikon aksi di renderBillList()/modules-render.js —
// hanya 2 aksi paling sering dipakai yg tetap tampil langsung di kartu, sisanya
// dipindah ke sini). Param `lunas` dikirim dari renderBillList (sudah tahu status
// b._lunas), jadi TIDAK re-detect dari D.bills/D.billsArchive di sini (hindari
// lookup ganda) — cukup dipakai utk pilih set baris & routing delete yg benar.
function openBillActionsMenu(id,lunas){
const b=lunas?(D.billsArchive||[]).find(x=>x.id===id):D.bills.find(x=>x.id===id);
if(!b)return;
document.getElementById('billActionsTitle').textContent=`🔔 ${b.name}`;
const rows=lunas?
    `<div class="bill-action-row" data-action="billActionEdit" data-args="[${id}]"><span class="bar-icon u-cacc">✏️</span> Edit</div>
     <div class="bill-action-row danger" data-action="billActionDeleteArchive" data-args="[${id}]"><span class="bar-icon">🗑</span> Hapus dari Arsip</div>`
    :
    `<div class="bill-action-row" data-action="billActionShareWA" data-args="[${id}]"><span class="bar-icon" style="color:#25D366">💬</span> Kirim ke WhatsApp</div>
     <div class="bill-action-row" data-action="billActionHistory" data-args="[${id}]"><span class="bar-icon u-cacc3">📋</span> Riwayat Pembayaran</div>
     <div class="bill-action-row danger" data-action="billActionDelete" data-args="[${id}]"><span class="bar-icon">🗑</span> Hapus</div>`;
document.getElementById('billActionsList').innerHTML=rows;
openQS('qsBillActions');
}
let billCalYear=null, billCalMonth=null, billCalSelectedDate=null;
let billStatMonth=null, billStatYear=null;
const BILLCAL_MAX_ITER=600;
function getBillOccurrencesInRange(b,rangeStart,rangeEnd){
const occurrences=[];
if(!b.nextDue||isNaN(new Date(b.nextDue).getTime()))return occurrences;
if(b.freq==='sekali'){
const d=new Date(b.nextDue);
if(d>=rangeStart&&d<=rangeEnd)occurrences.push(new Date(d));
return occurrences;
}
const maxOcc=(b.kind==='cicilan'&&b.sisaTenor!=null)?b.sisaTenor:Infinity;
let d=new Date(b.nextDue);
let i=0;
while(i<maxOcc&&i<BILLCAL_MAX_ITER&&d<=rangeEnd){
if(d>=rangeStart&&d<=rangeEnd)occurrences.push(new Date(d));
const nd=new Date(d);
if(b.freq==='bulanan')nd.setMonth(nd.getMonth()+1);
else if(b.freq==='mingguan')nd.setDate(nd.getDate()+7);
else if(b.freq==='tahunan')nd.setFullYear(nd.getFullYear()+1);
else break;
d=nd;i++;
}
return occurrences;
}
// getBillActiveDateForFilter(b, billFilterBulan, billFilterTahun, fallbackDateStr) — dipakai
// renderBillList() (modules-render.js) utk tagihan/cicilan/langganan AKTIF (bukan arsip/bukan
// _paidPeriodOnly) saat filter bulan/tahun lanjutan (billFilterBulan/billFilterTahun) dipasang,
// TERMASUK saat digeser lewat nav ‹bulan› di kartu "Tagihan, Cicilan & Langganan" (lihat
// changeBillStatMonth). BUGFIX: dulu renderBillList() exact-match b.nextDue (SATU tanggal
// jatuh-tempo BERIKUTNYA saja) ke bulan/tahun filter -- jadi cicilan/tagihan berulang yang belum
// dibayar bulan ini (nextDue masih bulan sekarang) LENYAP total begitu user geser filter ke bulan
// depan, walau harusnya masih berjadwal di sana (laporan bug: "cicilan 3x tidak muncul di bulan
// depan", "cicilan baru tidak tampil", "ada bulan yang tidak menampilkan transaksi apapun").
// Sekarang reuse getBillOccurrencesInMonth() (SUDAH ADA, dipakai Kalender Jatuh Tempo -- hormati
// freq bulanan/mingguan/tahunan & batas sisaTenor cicilan) supaya list & kalender konsisten
// sesuai jadwal SEHARUSNYA. Return null = sembunyikan (tidak ada proyeksi di periode itu), atau
// string tanggal ISO occurrence pertama di periode filter (dipakai gantikan _dateForFilter utk
// urutan/badge "X hari lagi"). Tagihan LUNAS/arsip TIDAK lewat sini (tetap exact-match tanggal
// historis asli di renderBillList — event yg sudah pasti terjadi, bukan proyeksi).
function getBillActiveDateForFilter(b,billFilterBulan,billFilterTahun,fallbackDateStr){
if(billFilterBulan==='all'&&billFilterTahun==='all')return fallbackDateStr;
const ref=new Date(fallbackDateStr);
const y=billFilterTahun!=='all'?parseInt(billFilterTahun):ref.getFullYear();
const m=billFilterBulan!=='all'?parseInt(billFilterBulan):ref.getMonth();
if(isNaN(y)||isNaN(m))return null;
const occ=getBillOccurrencesInMonth(b,y,m);
if(!occ.length)return null;
return occ[0].toISOString().split('T')[0];
}
function cashflowActionSuggestion(deficitAmount,days){
if(!deficitAmount||deficitAmount<=0)return '';
const d=Math.max(1,Math.round(days||30));
const perDay=deficitAmount/d;
return `💡 Saran: kurangi pengeluaran non-wajib ≈${fmtFull(deficitAmount)} (≈${fmtFull(perDay)}/hari selama ${d} hari ke depan), atau geser/tunda sebagian tagihan/cicilan yang bisa ditunda.`;
}
/* moved to modules-render.js: renderDashCashflowForecast */
function getBillOccurrencesInMonth(b,year,month){
const monthStart=new Date(year,month,1);
const monthEnd=new Date(year,month+1,0,23,59,59);
const occurrences=[];
if(!b.nextDue||isNaN(new Date(b.nextDue).getTime()))return occurrences;
if(b.freq==='sekali'){
const d=new Date(b.nextDue);
if(d>=monthStart&&d<=monthEnd)occurrences.push(new Date(d));
return occurrences;
}
const maxOcc=(b.kind==='cicilan'&&b.sisaTenor!=null)?b.sisaTenor:Infinity;
let d=new Date(b.nextDue);
let i=0;
while(i<maxOcc&&i<BILLCAL_MAX_ITER&&d<=monthEnd){
if(d>=monthStart&&d<=monthEnd)occurrences.push(new Date(d));
const nd=new Date(d);
if(b.freq==='bulanan')nd.setMonth(nd.getMonth()+1);
else if(b.freq==='mingguan')nd.setDate(nd.getDate()+7);
else if(b.freq==='tahunan')nd.setFullYear(nd.getFullYear()+1);
else break;
d=nd;i++;
}
return occurrences;
}
function openBillCalendar(){
const now=new Date();
billCalYear=now.getFullYear();billCalMonth=now.getMonth();
billCalSelectedDate=now.toISOString().split('T')[0];
renderBillCalendar();
openModal('billCalendarModal');
}
function navBillCalendar(dir){
billCalMonth+=dir;
if(billCalMonth<0){billCalMonth=11;billCalYear--;}
else if(billCalMonth>11){billCalMonth=0;billCalYear++;}
billCalSelectedDate=null;
renderBillCalendar();
}
function selectBillCalDay(dateStr){
billCalSelectedDate=dateStr;
renderBillCalendar();
}
/* moved to modules-render.js: renderBillCalendar */
function getBillStats(month,year){
const now=new Date(),m=(month!=null?month:now.getMonth()),y=(year!=null?year:now.getFullYear());
const today=new Date();today.setHours(0,0,0,0);
const monthTotal=D.bills.reduce((sum,b)=>sum+getBillOccurrencesInMonth(b,y,m).reduce((s2,o)=>s2+(b.amount||0),0),0);
const withDiff=D.bills.map(b=>({b,diff:Math.ceil((new Date(b.nextDue)-today)/(1000*60*60*24))}));
const overdue=withDiff.filter(x=>x.diff<0);
const soon=withDiff.filter(x=>x.diff>=0&&x.diff<=7);
const outstanding=D.bills.filter(b=>b.kind==='cicilan'&&b.sisaTenor!=null).reduce((s,b)=>s+b.amount*b.sisaTenor,0);
const nearest=[...withDiff].sort((a,b)=>a.diff-b.diff).slice(0,3);
return{monthTotal,overdueCount:overdue.length,soonCount:soon.length,outstanding,nearest};
}
function changeBillStatMonth(dir){
if(billStatMonth===null){const now=new Date();billStatMonth=now.getMonth();billStatYear=now.getFullYear();}
billStatMonth+=dir;
if(billStatMonth<0){billStatMonth=11;billStatYear--;}
else if(billStatMonth>11){billStatMonth=0;billStatYear++;}
// BUGFIX: dulu nav ‹›/"Juni 2026" ini cuma update kartu ringkasan (updateBillStatGrid),
// TIDAK ikut menyaring daftar tagihan di bawahnya -- soalnya renderBillList() nyaring
// berdasarkan billFilterBulan/billFilterTahun (state punya dropdown Filter lanjutan yg
// TERPISAH), bukan billStatMonth/billStatYear di sini. Akibatnya geser bulan bikin label
// & pill "Bulan Ini"/"Sisa Cicilan" benar pindah bulan, tapi list kartu tagihan di bawah
// tetap nampilin SEMUA tagihan lintas bulan (bug screenshot). Sekarang disamakan: geser
// bulan di nav ini juga ikut set billFilterBulan/billFilterTahun (+ sinkron dropdown-nya,
// reuse pola dari navBillFilterMonth()) lalu panggil renderBillList() (yg juga otomatis
// updateBillStatGrid() ulang di akhir) supaya list & ringkasan selalu bulan yg sama.
billFilterBulan=String(billStatMonth);
billFilterTahun=String(billStatYear);
const elB=document.getElementById('billFilterBulan'), elT=document.getElementById('billFilterTahun');
if(elB)elB.value=String(billStatMonth);
if(elT){
if(![...elT.options].some(o=>o.value===String(billStatYear))){
const opt=document.createElement('option');opt.value=String(billStatYear);opt.textContent=String(billStatYear);elT.appendChild(opt);
}
elT.value=String(billStatYear);
}
renderBillList();
}
function updateBillStatGrid(prefix){
if(billStatMonth===null){const now=new Date();billStatMonth=now.getMonth();billStatYear=now.getFullYear();}
const s=getBillStats(billStatMonth,billStatYear);
const mt=document.getElementById(prefix+'MonthTotal'); if(mt)mt.textContent=fmt(s.monthTotal);
const sc=document.getElementById(prefix+'SoonCount'); if(sc)sc.textContent=s.soonCount;
const os=document.getElementById(prefix+'Outstanding'); if(os)os.textContent=fmt(s.outstanding);
const ml=document.getElementById(prefix+'MonthLabel'); if(ml)ml.textContent=MONTHS_FULL[billStatMonth]+' '+billStatYear;
}
// getBillAnomalyInfo — dipakai renderBillList() utk kasih badge peringatan "⚠️ Naik X% dari
// biasanya" di tagihan yang nominal terbarunya (b.amount, dipakai sbg preset saat markBillPaid())
// jauh lebih tinggi dari rata-rata histori pembayaran asli (D.transactions dgn billLinkId===b.id).
// Berguna utk tagihan yang nominalnya memang berubah tiap periode (listrik/pulsa/langganan naik
// harga), beda dari cicilan yang biasanya fix — bisa nunjukin salah catat ATAU tarif beneran naik,
// keduanya sama-sama layak dicek user sebelum bayar. Butuh minimal 2 histori pembayaran biar tidak
// false-positive dari kebetulan/variasi normal (baru 1x pembayaran belum ada "biasanya" yg valid).
// Rule-based & gratis (bukan panggilan AI), threshold 25% kenaikan dianggap "signifikan".
const BILL_ANOMALY_THRESHOLD_PCT=25;
function getBillAnomalyInfo(billId,currentAmount){
if(!currentAmount||currentAmount<=0)return null;
const history=D.transactions.filter(t=>t.billLinkId===billId).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,3);
if(history.length<2)return null;
const avgPrev=history.reduce((s,t)=>s+t.amount,0)/history.length;
if(avgPrev<=0)return null;
const pctChange=Math.round(((currentAmount-avgPrev)/avgPrev)*100);
if(pctChange<BILL_ANOMALY_THRESHOLD_PCT)return null;
return{avgPrev,pctChange,count:history.length};
}
/* moved to modules-render.js: renderDashboardBills */
function checkBills(){
const banner=document.getElementById('billBanner');
if(!banner)return;
const today=new Date();today.setHours(0,0,0,0);
const soon=D.bills.filter(b=>{const d=new Date(b.nextDue);const diff=Math.ceil((d-today)/(1000*60*60*24));return diff<=3;});
if(soon.length){
banner.classList.remove('hidden');
document.getElementById('billBannerTitle').textContent=soon.length+' tagihan akan jatuh tempo';
document.getElementById('billBannerSub').textContent=soon.map(b=>b.name).join(', ');
} else banner.classList.add('hidden');
}
/* moved to modules-render.js: renderLDR */
