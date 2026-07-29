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
if(billEditId!==null){
const b=D.bills.find(x=>x.id===billEditId);
if(b&&b.kind==='cicilan'){
toast('💳 Cicilan diedit lewat transaksi terkait — buka 📋 Riwayat Pembayaran');
openBillHistory(billEditId);
return;
}
if(b&&b.kind==='utang'&&b.debtId){
toast('📕 Cicilan utang ini disinkron dari Buku Utang — edit di sana');
goToList('debtList',null);
return;
}
}
const cats=getCatsByType('expense');
document.getElementById('billCat').innerHTML='<option value="">Tanpa kategori</option>'+cats.map(c=>`<option value="${escapeHtml(c.name)}">${c.emoji} ${escapeHtml(c.name)}</option>`).join('');
document.getElementById('billAcc').innerHTML=D.accounts.map(a=>`<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
if(billEditId!==null){
const b=D.bills.find(x=>x.id===billEditId);
document.getElementById('billModalTitle').textContent='Edit Tagihan';
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
totalAmount:shared?rawAmt:null
};
if(billEditId!==null){
const idx=D.bills.findIndex(b=>b.id===billEditId);
D.bills[idx]={...D.bills[idx],...data};
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
D.transactions.push({id:uid(),type:'expense',amount:b.amount,category:b.category||'Tagihan',subcategory:'',accountId:b.accountId||D.accounts[0]?.id||'',note:'Bayar: '+b.name,date:new Date().toISOString().split('T')[0],payMethod:b.kind,billLinkId:b.id});
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
function openBillArchive(){
renderBillArchive();
openModal('billArchiveModal');
}
/* moved to modules-render.js: renderBillArchive */
let billFilterStatus='all', billFilterKategori='all', billFilterBulan='all', billFilterTahun='all';
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
renderBillList();
}
function resetBillFilter(){
billFilterStatus='all';billFilterKategori='all';billFilterBulan='all';billFilterTahun='all';
const elS=document.getElementById('billFilterStatus'), elK=document.getElementById('billFilterKategori'),
elB=document.getElementById('billFilterBulan'), elT=document.getElementById('billFilterTahun');
if(elS)elS.value='all';
if(elK)elK.value='all';
if(elB)elB.value='all';
if(elT)elT.value='all';
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
const tahuns=[...new Set(all.map(b=>{const d=new Date(b.kind==='cicilan'&&b.completedAt?b.completedAt:b.nextDue);return isNaN(d)?null:d.getFullYear();}).filter(Boolean))].sort((a,b)=>b-a);
const prevT=elT.value;
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
updateBillStatGrid('keuBill');
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
