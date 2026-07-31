// tagihan-kalender.js — Modul Tagihan/Bill (CRUD, riwayat, filter, arsip) & Kalender Jatuh Tempo
// Dipindah ke modules/finance/tagihan-kalender.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: data-default.js, features-helpers-global-security.js, diagnostik-versi.js, format-tema.js, error-handler.js, helper-teks.js, keamanan-pin.js, modal-navigasi.js, reset-gaji-mingguan.js, debug-console.js, pengaturan-search.js, onboarding.js, kalkulator-input.js, scan-ocr.js, filter-laporan.js, akun.js, gaji-calc.js, transaksi.js, profil-pengaturan.js, kategori.js, tagihan-kalender.js, backup-restore.js, payroll-absensi.js, tukang-absensi.js

// BUGFIX (s294, catatan tertunda dari FIX-v953-s293): openBillModal() manggil
// setBillType(b.kind) pas edit tagihan cicilan/utang yang sudah diarsipkan
// (billEditFromArchive) supaya curBillType kebentuk benar -- tapi toggle di
// modal ini cuma py 2 opsi (Tagihan/Langganan), TIDAK ADA indikator visual
// utk cicilan/utang. Klik salah satu tombol itu (kelihatan valid krn tidak
// ada yg nyala "active") diam-diam ganti curBillType jadi 'tagihan'/
// 'langganan' -> _saveBillInner() nyimpen kind yg salah ke record arsip.
// Fungsi murni ini nentuin kapan toggle harus dikunci -- dipisah dari
// setBillType() (yang baca/tulis DOM) supaya bisa dites tanpa DOM, pola sama
// fungsi murni lain (lihat tests/helpers/loadSource.js).
function isBillTypeLocked(kind){
return kind==='cicilan'||kind==='utang';
}
// BUGFIX (s295, audit tanggal-bayar-vs-jatuh-tempo): modal generik ✏️ Edit
// Tagihan (billModal) dulu SELALU menampilkan & mengizinkan edit field
// "Tanggal Jatuh Tempo Berikutnya" (billDue) walau tagihan itu sudah
// LUNAS/diarsip (billEditFromArchive) -- padahal utk record arsip, field
// itu cuma sisa nextDue lama yg TIDAK dipakai lagi (bukan tanggal bayar),
// dan mengeditnya di sini TIDAK sinkron sama sekali ke completedAt arsip
// maupun ke transaksi pembayaran aslinya (dua sumber data jadi beda
// sendiri-sendiri). Sync 2 arah tanggal bayar YANG BENAR sudah ada lewat
// jalur billHistoryEditModal (saveBillHistoryEdit(), lihat komentar di
// sana) -- fix ini menyatukan ke SATU jalur itu: field due-date generik
// disembunyikan utk billEditFromArchive, diganti ringkasan read-only +
// tombol yang redirect ke jalur sync 2 arah yang sudah ada (bukan bikin
// jalur sync baru yang kedua, supaya tidak ada dua sumber kebenaran).
// Fungsi murni ini nentuin field mana yg harus tampil, dipisah dari
// openBillModal() (yang baca/tulis DOM) supaya bisa dites tanpa DOM.
function shouldShowGenericDueField(billEditFromArchive){
return!billEditFromArchive;
}
// getLatestBillPaymentTxId(billId, transactions) -- cari id transaksi
// pembayaran TERAKHIR yg tertaut ke billId (billLinkId), dipakai
// openBillPaymentDateEdit() utk redirect ke Edit Pembayaran yg benar
// (billHistoryEditModal, sync 2 arah). Pola id pembanding sama seperti
// isLatestBillPaymentTx() -- uid()=timestamp monotonic, jadi id terbesar
// = transaksi terbaru. Fungsi murni, tidak sentuh DOM/D global supaya
// bisa dites langsung.
function getLatestBillPaymentTxId(billId,transactions){
const ids=(transactions||[]).filter(t=>t.billLinkId===billId).map(t=>t.id);
return ids.length?Math.max(...ids):null;
}
// findFallbackBillPaymentTxId(archivedBill, transactions) -- FIX (laporan user,
// gap "Transaksi tidak ditemukan"): getLatestBillPaymentTxId() di atas cuma bisa
// nemuin transaksi lewat billLinkId, yang HANYA diisi oleh markBillPaid() (jalur
// bayar tagihan normal). Transaksi yang dicatat lewat jalur LAIN -- misalnya
// dicatat manual sebelum fitur billLinkId ada, atau via txModal biasa (bukan
// tombol "Bayar" di kartu Tagihan) -- TIDAK PERNAH dapat billLinkId, jadi
// dead-end permanen di openBillPaymentDateEdit() (toast error, tidak bisa diedit
// sama sekali) walau transaksi aslinya ada persis di Keuangan. Fungsi murni ini
// jadi jaring pengaman: cari transaksi expense yang PALING MASUK AKAL (nominal
// sama persis + catatan menyebut nama tagihan ini + tanggal PALING DEKAT ke
// completedAt arsip) di antara transaksi yang belum bertaut ke bill manapun.
// Tidak menjamin 100% benar (makanya cuma dipakai sbg fallback SETELAH billLinkId
// asli tidak ketemu), tapi jauh lebih baik dari dead-end total -- dipakai
// openBillPaymentDateEdit() utk SELF-HEALING: sekali ketemu, billLinkId langsung
// ditautkan supaya jalur sync 2 arah normal berlaku mulai saat itu (pola
// self-healing sama seperti guard ScannerSession di scan-ocr.js, s310).
// fallbackMatchAmount(archivedBill) -- FIX ringkas (audit s306, saran #2):
// sebelum fix ini, matching nominal di findFallbackBillPaymentTxId() &
// countFallbackBillPaymentCandidates() SELALU pakai archivedBill.amount
// (nominal cicilan DEFAULT) -- tapi sejak s303 ("Jumlah Pembayaran" bisa
// diedit khusus kind==='utang'), nominal yg BENERAN dibayar (payAmount) bisa
// beda dari b.amount (mis. user lunasin utang sekaligus lebih besar dari
// cicilan biasa) -> fallback gagal cocok kalau pembayaran pelunasan itu
// SENDIRI tidak ter-billLinkId (kasus langka: cuma mungkin lewat impor data
// lama). markBillPaid() sekarang ikut nyimpen actualPayAmount di entry
// billsArchive (lihat 3 titik D.billsArchive.push di bawah) -- helper murni
// ini pakai actualPayAmount kalau ADA, fallback ke amount kalau tidak
// (backward-compat penuh utk entry arsip lama sebelum fix ini, yg belum py
// field actualPayAmount sama sekali -- `!=null` sengaja dipakai supaya 0
// tetap dianggap "ada nilai", bukan cuma undefined/null yg jatuh ke amount).
function fallbackMatchAmount(archivedBill){
return archivedBill.actualPayAmount!=null?archivedBill.actualPayAmount:archivedBill.amount;
}
function findFallbackBillPaymentTxId(archivedBill,transactions){
if(!archivedBill||!archivedBill.name)return null;
const nameLower=String(archivedBill.name).toLowerCase();
const targetAmount=fallbackMatchAmount(archivedBill);
const candidates=(transactions||[]).filter(t=>t.type==='expense'&&!t.billLinkId&&Math.abs((t.amount||0)-(targetAmount||0))<1&&t.note&&String(t.note).toLowerCase().includes(nameLower));
if(!candidates.length)return null;
if(!archivedBill.completedAt)return candidates[0].id;
const targetTime=new Date(archivedBill.completedAt).getTime();
if(isNaN(targetTime))return candidates[0].id;
candidates.sort((a,c)=>Math.abs(new Date(a.date).getTime()-targetTime)-Math.abs(new Date(c.date).getTime()-targetTime));
return candidates[0].id;
}
// countFallbackBillPaymentCandidates(archivedBill, transactions) -- FIX ringkas
// (audit lanjutan s306, saran #3): findFallbackBillPaymentTxId() di atas SELALU
// diam-diam pilih kandidat tanggal-terdekat tanpa kasih tahu user kalau ada
// kandidat LAIN yang sama masuk akalnya (mis. 2 tagihan "Cicilan Motor" beda
// unit, nominal & catatan mirip) -- resiko salah tautkan tanpa disadari. Fungsi
// murni ini cuma HITUNG jumlah kandidat (pakai filter PERSIS SAMA seperti
// findFallbackBillPaymentTxId, supaya konsisten), dipakai openBillPaymentDateEdit()
// SETELAH self-healing utk nambah catatan peringatan di toast kalau count>1 --
// TIDAK mengubah hasil link sama sekali (tetap pilih tanggal terdekat seperti
// biasa), murni info tambahan supaya user tahu perlu cek manual kalau salah.
function countFallbackBillPaymentCandidates(archivedBill,transactions){
if(!archivedBill||!archivedBill.name)return 0;
const nameLower=String(archivedBill.name).toLowerCase();
const targetAmount=fallbackMatchAmount(archivedBill);
return (transactions||[]).filter(t=>t.type==='expense'&&!t.billLinkId&&Math.abs((t.amount||0)-(targetAmount||0))<1&&t.note&&String(t.note).toLowerCase().includes(nameLower)).length;
}
// scanAllBillFallbackCandidates(billsArchive, transactions) -- FIX (audit lanjutan
// s306, saran #4: "Self-healing reaktif (satu-per-satu), tidak ada scan massal").
// openBillPaymentDateEdit() di atas cuma jalan REAKTIF, satu entri arsip per satu
// kali user buka modalnya -- kalau ada banyak data lama yang belum ter-billLinkId,
// tidak ada cara scan sekaligus dari UI. Fungsi murni ini scan SEMUA entri
// D.billsArchive yang belum ter-link (getLatestBillPaymentTxId null) sekaligus,
// pakai fallback yang SAMA PERSIS (findFallbackBillPaymentTxId), lalu SKIP entri
// yang ambigu (countFallbackBillPaymentCandidates>1) supaya tidak salah tautkan
// otomatis tanpa review -- beda dari openBillPaymentDateEdit() yang tetap
// auto-link kandidat ambigu (cuma dikasih toast peringatan), scan massal ini
// sengaja lebih konservatif krn tidak ada kesempatan user cek satu-satu sebelum
// commit. Hasilnya array kandidat {billId,billName,txId,txNote,txAmount,txDate}
// murni buat DITAMPILKAN sbg preview -- TIDAK menulis apa pun ke billLinkId
// (itu tugas BillFallbackScan.confirmSelected() di bawah, setelah user review).
function scanAllBillFallbackCandidates(billsArchive,transactions){
const result=[];
(billsArchive||[]).forEach(function(b){
if(getLatestBillPaymentTxId(b.id,transactions)!==null)return;
if(countFallbackBillPaymentCandidates(b,transactions)>1)return;
const txId=findFallbackBillPaymentTxId(b,transactions);
if(txId===null)return;
const t=(transactions||[]).find(function(x){return x.id===txId;});
if(!t)return;
result.push({billId:b.id,billName:b.name,txId:txId,txNote:t.note||'',txAmount:t.amount||0,txDate:t.date||''});
});
return result;
}
// BillFallbackScan -- UI wrapper utk scanAllBillFallbackCandidates() di atas: render
// preview list dgn checkbox (semua tercentang default), user bisa uncheck yg ragu,
// baru commit (tulis billLinkId) lewat confirmSelected(). Pola sama LinkTx (preview
// dulu, commit belakangan), bukan auto-save langsung sesuai saran audit di
// AUDIT-billlinkid-remaining-gaps.md poin 4.
const BillFallbackScan={
_candidates:[],
open(){
this._candidates=scanAllBillFallbackCandidates(D.billsArchive,D.transactions);
this.render();
openModal('billFallbackScanModal');
},
render(){
const el=document.getElementById('billFallbackScanBody');
if(!el)return;
if(!this._candidates.length){
el.innerHTML='<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">Tidak ada transaksi lama yang perlu ditautkan -- semua sudah tertaut atau tidak ditemukan kandidat yang aman (ambigu dilewati).</div></div>';
document.getElementById('billFallbackScanCommitBtn').disabled=true;
return;
}
el.innerHTML=this._candidates.map(function(c,i){
return '<label style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border)">'
+'<input type="checkbox" checked data-idx="'+i+'" class="billFallbackScanChk" style="width:18px;height:18px;margin-top:2px;accent-color:var(--accent)">'
+'<div style="flex:1;font-size:12.5px;line-height:1.5">'
+'<div style="font-weight:700">'+escapeHtml(c.billName)+'</div>'
+'<div style="color:var(--text2)">'+fmt(c.txAmount)+' &middot; '+escapeHtml(c.txDate)+'</div>'
+'<div style="color:var(--text3)">'+escapeHtml(c.txNote)+'</div>'
+'</div></label>';
}).join('');
document.getElementById('billFallbackScanCommitBtn').disabled=false;
},
confirmSelected(){
const checked=Array.from(document.querySelectorAll('.billFallbackScanChk:checked')).map(function(el){return parseInt(el.dataset.idx,10);});
if(!checked.length){toast('⚠️ Belum ada yang dicentang');return;}
let count=0;
checked.forEach(function(i){
const c=BillFallbackScan._candidates[i];
if(!c)return;
const t=D.transactions.find(function(x){return x.id===c.txId;});
if(t&&!t.billLinkId){t.billLinkId=c.billId;count++;}
});
save();
closeModal('billFallbackScanModal');
refreshBillEverywhere();
toast('🔗 '+count+' transaksi lama berhasil ditautkan');
}
};
function setBillType(t){
curBillType=t;
const locked=isBillTypeLocked(t);
const btnTagihan=document.getElementById('billBtnTagihan');
const btnLangganan=document.getElementById('billBtnLangganan');
btnTagihan.className='type-btn'+(t==='tagihan'?' at':'');
btnLangganan.className='type-btn'+(t==='langganan'?' ai':'');
// Kunci toggle (disabled -> klik tidak akan trigger data-action sama sekali)
// supaya kind cicilan/utang tidak bisa ke-timpa diam-diam lewat form generik
// ini. Satu-satunya jalur setBillType() dipanggil dgn 'cicilan'/'utang'
// adalah openBillModal() saat billEditFromArchive, jadi aman dikunci total
// tanpa mengganggu alur tambah/edit tagihan & langganan biasa.
btnTagihan.disabled=locked;
btnLangganan.disabled=locked;
const hintEl=document.getElementById('billTypeLockedHint');
if(hintEl){
hintEl.style.display=locked?'block':'none';
hintEl.textContent=locked?`🔒 Jenis "${t==='cicilan'?'Cicilan':'Utang'}" tidak bisa diubah lewat form ini — toggle di atas dinonaktifkan supaya tidak salah tap & kind tercatat diam-diam berubah.`:'';
}
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
// Fix ringkas: redirect ini diperluas dari KHUSUS 'cicilan' menjadi 'cicilan'/'langganan'/
// 'tagihan' — sebelumnya ✏️ Edit utk langganan & tagihan selalu buka modal generik
// (nama/jumlah/freq/jatuh tempo TEMPLATE), bukan transaksi pembayaran terakhirnya (beda
// perlakuan dari cicilan tanpa alasan kuat). Tagihan/langganan yang BELUM PERNAH dibayar
// (belum ada transaksi tertaut sama sekali, wajar krn bill baru dibuat) tetap fallback ke
// modal generik di bawah — TIDAK dianggap error seperti cicilan (cicilan selalu punya
// transaksi awal begitu dibuat, jadi kosongnya linkedTxIds utk cicilan memang anomali).
if((b.kind==='cicilan'||b.kind==='langganan'||b.kind==='tagihan')&&!billEditFromArchive){
const linkedTxIds=D.transactions.filter(t=>t.billLinkId===b.id).map(t=>t.id);
if(linkedTxIds.length){
editTx(Math.max(...linkedTxIds));
return;
}
if(b.kind==='cicilan'){
toast('⚠️ Riwayat pembayaran cicilan ini tidak ditemukan, tidak bisa dibuka edit lengkapnya');
return;
}
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
// BUGFIX (s295): utk tagihan LUNAS (billEditFromArchive), field
// "Tanggal Jatuh Tempo Berikutnya" disembunyikan total (bukan diisi dari
// b.nextDue yg sudah tidak relevan) -- diganti ringkasan read-only
// tanggal bayar ASLI (b.completedAt) + tombol ke jalur edit yg sudah
// sync 2 arah (openBillPaymentDateEdit -> billHistoryEditModal). Utk
// tagihan aktif (belum lunas), perilaku lama tetap sama persis.
const showDue=shouldShowGenericDueField(billEditFromArchive);
document.getElementById('billDueWrap').style.display=showDue?'block':'none';
document.getElementById('billPaidDateWrap').classList.toggle('u-dnone',showDue);
if(showDue){
document.getElementById('billDue').value=b.nextDue;
} else {
document.getElementById('billPaidDateLabel').textContent=b.completedAt?new Date(b.completedAt).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}):'-';
}
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
document.getElementById('billDueWrap').style.display='block';
document.getElementById('billPaidDateWrap').classList.add('u-dnone');
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
// BUGFIX (s295): utk tagihan LUNAS (billEditFromArchive), field due-date
// disembunyikan (lihat openBillModal) -- jangan baca/wajibkan #billDue
// sama sekali di sini, & jangan ikut tulis nextDue ke record arsip (biar
// tidak nimpa data dgn nilai basi/kosong). nextDue lama pada record arsip
// dibiarkan apa adanya -- satu-satunya jalur resmi utk ubah tanggal bayar
// tetap billHistoryEditModal (sync 2 arah ke completedAt & transaksi).
const due=billEditFromArchive?null:document.getElementById('billDue').value;
if(!name||!rawAmt||(!billEditFromArchive&&!due)){toast('⚠️ Lengkapi nama, jumlah, dan tanggal');return;}
const shared=document.getElementById('billShared').checked;
const sharedPct=shared?Math.min(99,Math.max(1,parseFloat(document.getElementById('billSharedPct').value)||50)):null;
const amt=shared?Math.round(rawAmt*sharedPct/100):rawAmt;
const sharedOtherNameEl=document.getElementById('billSharedOtherName');
const sharedAutoPiutangEl=document.getElementById('billSharedAutoPiutang');
const data={
name,amount:amt,
...(billEditFromArchive?{}:{nextDue:due}),
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
// FIX (audit user, sync 2 arah "Ditanggung Bersama"): kalau tagihan yang DIEDIT (bukan
// baru) masih shared+sharedAutoPiutang, sesuaikan piutang otomatis yang BELUM lunas ke
// sisa porsi terbaru -- lihat komentar lengkap di syncOutstandingSharedPiutang()
// (piutang-utang.js). Piutang yang sudah lunas (histori periode lalu) tidak disentuh.
let piutangSynced=0;
if(billEditId!==null&&shared&&data.sharedAutoPiutang&&typeof syncOutstandingSharedPiutang==='function'){
piutangSynced=syncOutstandingSharedPiutang(billEditId,rawAmt-amt);
}
save();closeModal('billModal');refreshBillEverywhere();
if(piutangSynced){if(typeof Piutang!=='undefined')Piutang.renderList();if(typeof renderKekayaanBersih==='function')renderKekayaanBersih();if(typeof hitungZakatMaal==='function')hitungZakatMaal();}
toast('✅ Tagihan tersimpan'+(piutangSynced?' (piutang terkait ikut disesuaikan)':''));
}
// openBillPaymentDateEdit() -- dipanggil dari tombol "✏️ Ubah Tanggal
// Bayar" di modal ✏️ Edit Tagihan (Lunas). SENGAJA tidak mengedit tanggal
// apapun di sini -- cuma redirect ke billHistoryEditModal (lewat
// editBillHistoryTx(), transaksi pembayaran TERAKHIR) yang SUDAH sync 2
// arah ke completedAt arsip (lihat saveBillHistoryEdit()). Menyatukan ke
// satu jalur ini mencegah dua sumber kebenaran tanggal bayar yang bisa
// beda sendiri-sendiri (lihat catatan di openBillModal()/_saveBillInner()).
function openBillPaymentDateEdit(){
if(!billEditFromArchive||billEditId===null)return;
let latestTxId=getLatestBillPaymentTxId(billEditId,D.transactions);
// FIX (laporan user, gap billLinkId): kalau tidak ketemu lewat billLinkId asli,
// coba fallback (lihat findFallbackBillPaymentTxId() di atas) sebelum menyerah --
// kalau ketemu, langsung tautkan (self-healing) supaya sync 2 arah normal
// berlaku mulai sekarang & tidak dead-end lagi tiap kali fitur ini dibuka.
if(latestTxId===null){
const archB=(D.billsArchive||[]).find(x=>x.id===billEditId);
const fallbackTxId=findFallbackBillPaymentTxId(archB,D.transactions);
if(fallbackTxId!==null){
// FIX ringkas (audit s306, saran #3): hitung DULU (sebelum billLinkId
// ditautkan di bawah, supaya tx yg baru ketemu ini masih ikut terhitung)
// apakah ada kandidat LAIN yang sama masuk akalnya (nominal+catatan cocok)
// -- supaya tidak diam-diam salah tautkan tanpa disadari. Tidak mengubah
// hasil link (tetap yg tanggal paling dekat), murni tambahan info.
const ambiguous=countFallbackBillPaymentCandidates(archB,D.transactions)>1;
const t=D.transactions.find(x=>x.id===fallbackTxId);
if(t){t.billLinkId=billEditId;save();}
latestTxId=fallbackTxId;
toast(ambiguous?'🔗 Transaksi pembayaran ditautkan (ditemukan dari tanggal terdekat) — ada transaksi mirip lain, cek lagi kalau salah':'🔗 Transaksi pembayaran ditemukan & otomatis ditautkan');
}
}
if(latestTxId===null){toast('⚠️ Transaksi pembayaran tagihan ini tidak ditemukan');return;}
closeModal('billModal');
editBillHistoryTx(latestTxId);
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
// FIX (audit user, sync 2 arah "Ditanggung Bersama"): bersihkan piutang otomatis
// yang autoBillId-nya nunjuk ke tagihan yg baru dihapus -- lihat komentar lengkap di
// removeOrphanedAutoPiutangForBill() (piutang-utang.js).
const removedPiutang=typeof removeOrphanedAutoPiutangForBill==='function'&&removeOrphanedAutoPiutangForBill(id);
save();refreshBillEverywhere();renderDebtList();
if(removedPiutang){if(typeof Piutang!=='undefined')Piutang.renderList();if(typeof renderKekayaanBersih==='function')renderKekayaanBersih();if(typeof hitungZakatMaal==='function')hitungZakatMaal();}
toast('🗑 Tagihan dihapus'+(removedPiutang?' (piutang otomatis terkait ikut dihapus)':''));
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
// FIX (audit user, sync 2 arah "Ditanggung Bersama"): sama seperti delBill() -- lihat
// komentar lengkap di removeOrphanedAutoPiutangForBill() (piutang-utang.js).
const removedPiutang=typeof removeOrphanedAutoPiutangForBill==='function'&&removeOrphanedAutoPiutangForBill(id);
save();renderBillArchive();
if(removedPiutang){if(typeof Piutang!=='undefined')Piutang.renderList();if(typeof renderKekayaanBersih==='function')renderKekayaanBersih();if(typeof hitungZakatMaal==='function')hitungZakatMaal();}
toast('🗑 Arsip dihapus'+(removedPiutang?' (piutang otomatis terkait ikut dihapus)':''));
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
// isLatestBillPaymentTx(billId,txId) — cek apakah txId adalah transaksi TERBARU di
// antara semua riwayat pembayaran (D.transactions dgn billLinkId===billId). Dipakai
// saveBillHistoryEdit() & deleteBillHistoryTx() (fix s288) supaya sync completedAt/
// sisaTenor/nextDue cuma jalan kalau yg diedit/dihapus itu pembayaran TERAKHIR —
// bukan sembarang transaksi historis yg kebetulan punya billLinkId sama. Pola
// perbandingan pakai id (uid()=timestamp monotonic, lihat features-helpers-global-
// security.js), sama seperti isLatestInstallment di transaksi.js — bukan pakai
// tanggal, karena tanggal justru field yang lagi diedit/tidak bisa diandalkan.
function isLatestBillPaymentTx(billId,txId){
const ids=D.transactions.filter(t=>t.billLinkId===billId).map(t=>t.id);
return!ids.length||txId>=Math.max(...ids);
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
const oldAmount=t.amount;
t.date=tanggal;
t.amount=jumlah;
t.note=catatan;
// sync completedAt arsip tagihan ke tanggal baru (Sesi 287, fix s288: tambah cek
// isLatestBillPaymentTx) — kalau transaksi ini pembayaran yg mengarsipkan tagihan
// (lunas), completedAt arsip harus ikut berubah pas tanggal riwayatnya diedit, biar
// konsisten dgn Riwayat Tagihan Lunas. TAPI cuma kalau transaksi yg diedit ini
// pembayaran TERAKHIR (lihat isLatestBillPaymentTx) — sebelumnya (s287) sync ini
// jalan utk transaksi MANAPUN yg billLinkId-nya cocok, jadi kalau user edit tanggal
// cicilan ke-3 dari 12 (bukan yg terakhir) pada cicilan yg sudah lunas, completedAt
// arsip malah ikut salah berubah ke tanggal cicilan ke-3, bukan tanggal pelunasan
// yang sebenarnya (cicilan ke-12).
if(t.billLinkId&&isLatestBillPaymentTx(t.billLinkId,t.id)){
const archB=(D.billsArchive||[]).find(b=>b.id===t.billLinkId);
if(archB&&archB.completedAt)archB.completedAt=tanggal;
}
// FIX (lanjutan audit user, sync 2 arah "Ditanggung Bersama"): kalau transaksi ini
// yang jadi sumber 1 piutang otomatis & piutangnya belum lunas, sesuaikan sisanya --
// lihat komentar lengkap di syncSharedPiutangOnPaymentEdit() (piutang-utang.js).
const piutangSynced=typeof syncSharedPiutangOnPaymentEdit==='function'&&syncSharedPiutangOnPaymentEdit(t.id,oldAmount,jumlah);
// FIX (audit user, item #4 lanjutan s299 -- Utang): edit jumlah lewat 📋 Riwayat
// Pembayaran utk transaksi bertaut bill kind:'utang' sebelumnya sama sekali tidak
// menyesuaikan sisa utang (D.debts[].nilai) -- beda arah dari sync piutang di atas
// yang sudah dibenerin (s298). Dibatasi ke pembayaran TERBARU & bill yang masih aktif
// (D.bills, belum lunas/diarsip) -- pola sama isLatestBillPaymentTx yg sudah dipakai
// sync completedAt di atas; kalau bill sudah lunas/diarsip, koreksi sisa utang dari
// histori lama di luar cakupan fix ringkas ini (kasus langka, beda dari alur normal
// "baru salah ketik jumlah, langsung dikoreksi").
let debtSynced=false;
if(t.billLinkId&&isLatestBillPaymentTx(t.billLinkId,t.id)){
const linkedBill=(D.bills||[]).find(b=>b.id===t.billLinkId);
debtSynced=typeof syncDebtBalanceOnPaymentEdit==='function'&&syncDebtBalanceOnPaymentEdit(linkedBill,oldAmount,jumlah);
}
save();
closeModal('billHistoryEditModal');
renderDashboard();renderKeuangan();renderBillHistory();renderBillArchive();
if(piutangSynced){if(typeof Piutang!=='undefined')Piutang.renderList();if(typeof renderKekayaanBersih==='function')renderKekayaanBersih();if(typeof hitungZakatMaal==='function')hitungZakatMaal();}
if(debtSynced){if(typeof renderDebtList==='function')renderDebtList();if(typeof renderKekayaanBersih==='function')renderKekayaanBersih();if(typeof hitungZakatMaal==='function')hitungZakatMaal();}
toast('✅ Riwayat pembayaran diperbarui'+(piutangSynced?' (piutang terkait ikut disesuaikan)':'')+(debtSynced?' (sisa utang ikut disesuaikan)':''));
}
// revertBillFromDeletedTx(t) — SSOT (audit sesi 291, "sync 2 arah Cicilan/Tagihan vs
// Transaksi"): logic pengembalian sisaTenor/nextDue/saldo utang/reaktivasi arsip saat
// SATU transaksi pembayaran bill (billLinkId) dihapus. Sebelumnya logic ini cuma ada
// INLINE di deleteBillHistoryTx() (hapus lewat modal 📋 Riwayat Pembayaran) -- kalau
// transaksi yg sama dihapus lewat delTx() (tombol 🗑 di List Transaksi biasa), bill
// terkait TIDAK ikut disinkron sama sekali (sisaTenor/nextDue basi, tagihan yg sudah
// lunas & masuk arsip tidak diaktifkan lagi, saldo utang tidak dikembalikan). Diextract
// jadi satu fungsi supaya kedua jalur hapus (deleteBillHistoryTx & delTx) pakai SATU
// sumber kebenaran yang sama persis -- bukan logic baru, isi identik dgn punya
// deleteBillHistoryTx sebelum fix ini (termasuk cek isLatestBillPaymentTx dari fix s288).
// Tambahan baru (sesi ini): bersihkan D.piutang yang autoTxId-nya nunjuk ke transaksi
// yg dihapus (dibuat oleh maybeCreateSharedPiutangFromBill() saat bayar cicilan/tagihan
// "Ditanggung Bersama") -- sebelumnya piutang otomatis ini jadi orphan (nyangkut permanen
// ikut kehitung di Kekayaan Bersih) tiap kali transaksi sumbernya dihapus, dari jalur
// manapun (bug lama, tidak ada hubungan dgn deleteBillHistoryTx/delTx spesifik).
// Return: {linkedBill, isLatest, restoredFromArchive, removedPiutang} -- dipakai caller
// buat susun pesan toast yang sesuai (masing2 delTx/deleteBillHistoryTx punya toast beda).
function revertBillFromDeletedTx(t){
if(!t||!t.billLinkId)return{linkedBill:null,isLatest:false,restoredFromArchive:false,removedPiutang:false};
const isLatest=isLatestBillPaymentTx(t.billLinkId,t.id);
let linkedBill=D.bills.find(b=>b.id===t.billLinkId);
let restoredFromArchive=false;
if(!linkedBill&&isLatest){
const archIdx=(D.billsArchive||[]).findIndex(b=>b.id===t.billLinkId);
if(archIdx>-1){
linkedBill=D.billsArchive[archIdx];
delete linkedBill.completedAt;
D.billsArchive.splice(archIdx,1);
D.bills.push(linkedBill);
restoredFromArchive=true;
}
}
if(linkedBill&&isLatest){
if(linkedBill.kind==='cicilan'&&linkedBill.sisaTenor!=null){
linkedBill.sisaTenor+=1;
const d=new Date(linkedBill.nextDue);
d.setMonth(d.getMonth()-1);
linkedBill.nextDue=d.toISOString().split('T')[0];
} else if(linkedBill.kind==='utang'&&linkedBill.debtId){
const dbt=D.debts.find(x=>sameId(x.id,linkedBill.debtId));
if(dbt){
dbt.nilai=(dbt.nilai||0)+t.amount;
if(dbt.lunas){dbt.lunas=false;dbt.billId=linkedBill.id;}
}
const d=new Date(linkedBill.nextDue);
d.setMonth(d.getMonth()-1);
linkedBill.nextDue=d.toISOString().split('T')[0];
} else if((linkedBill.kind==='langganan'||linkedBill.kind==='tagihan')&&linkedBill.freq){
const d=new Date(linkedBill.nextDue);
if(linkedBill.freq==='bulanan')d.setMonth(d.getMonth()-1);
else if(linkedBill.freq==='mingguan')d.setDate(d.getDate()-7);
else if(linkedBill.freq==='tahunan')d.setFullYear(d.getFullYear()-1);
linkedBill.nextDue=d.toISOString().split('T')[0];
}
}
const beforePiutang=D.piutang?D.piutang.length:0;
if(D.piutang&&D.piutang.length)D.piutang=D.piutang.filter(p=>p.autoTxId!==t.id);
const removedPiutang=!!(D.piutang&&D.piutang.length<beforePiutang);
return{linkedBill,isLatest,restoredFromArchive,removedPiutang};
}
async function deleteBillHistoryTx(){
if(!curBillHistoryEditTxId)return;
const t=D.transactions.find(x=>x.id===curBillHistoryEditTxId);
if(!t)return;
if(!await askConfirm('Hapus riwayat pembayaran ini? Kalau ini pembayaran TERAKHIR, sisa tenor/jatuh tempo tagihan akan dikembalikan.'))return;
// isLatest (fix s288) — sisaTenor/nextDue/reaktivasi arsip HANYA boleh dikembalikan
// kalau transaksi yg dihapus ini pembayaran TERAKHIR utk bill terkait. Sebelumnya
// (s287 ke bawah) semua efek ini jalan utk transaksi MANAPUN yg billLinkId-nya cocok:
// hapus riwayat pembayaran cicilan yg LAMA (bukan terakhir) tetap salah memundurkan
// jadwal, dan hapus riwayat pembayaran lama pada cicilan yg SUDAH lunas/diarsip malah
// ikut mereaktivasi tagihan dari arsip walau bill itu memang sudah selesai.
// (logic dipindah ke revertBillFromDeletedTx() -- lihat komentar di sana)
const{linkedBill,isLatest,restoredFromArchive}=revertBillFromDeletedTx(t);
D.transactions=D.transactions.filter(x=>x.id!==curBillHistoryEditTxId);
curBillHistoryEditTxId=null;
save();
closeModal('billHistoryEditModal');
renderDashboard();renderKeuangan();renderBillList();renderSettings();checkBills();renderBillHistory();renderBillArchive();
renderDebtList();renderKekayaanBersih();hitungZakatMaal();
if(typeof Piutang!=='undefined')Piutang.renderList();
const msg=restoredFromArchive?', tagihan diaktifkan lagi (belum lunas)':(linkedBill&&isLatest&&linkedBill.kind==='cicilan'?', sisa tenor dikembalikan':(linkedBill&&isLatest&&(linkedBill.kind==='langganan'||linkedBill.kind==='tagihan')&&linkedBill.freq?', jatuh tempo dikembalikan':''));
toast('🗑 Riwayat pembayaran dihapus'+msg);
}
// advanceBillNextDue(nextDue,freq,today) — FIX ringkas (audit lanjutan user, laporan
// "nunggak 2+ periode -> abis dibayar langsung Jatuh Tempo lagi"): dulu nextDue baru di
// markBillPaid() SELALU dihitung +1 periode dari nextDue LAMA, tanpa peduli apakah hasilnya
// masih di masa lalu. Kalau user nunggak 2+ bulan (nextDue lama sudah lewat jauh) lalu bayar
// SEKALI (SATU transaksi, sebesar b.amount seperti biasa), nextDue baru bisa TETAP jatuh di
// masa lalu -> badge "🔴 Jatuh Tempo" langsung nongol lagi walau baru saja dibayar, bikin
// kesan seolah masih nunggak padahal cuma efek tanggal.
// Fix INI SENGAJA minimal (bukan fitur penuh "bayar sekaligus utk N periode tertunggak" --
// itu di luar cakupan patch ringan ini, lihat catatan di FIX doc sesi ini): nextDue dimajukan
// periode-demi-periode SAMPAI hasilnya > hari ini, bukan cuma +1 kali dari nilai lama. Jumlah
// yang tercatat di transaksi TETAP SATU periode (b.amount) seperti sebelumnya -- periode-
// periode yang terlewat cuma dianggap "dilewati"/tidak ditagih lagi per tanggalnya masing-
// masing, bukan otomatis dianggap sudah dibayar satu-satu.
// guard iterasi (600x) jaga-jaga freq mingguan+nunggak sangat lama supaya tidak infinite loop.
// Fungsi murni (tidak baca/tulis D/DOM) supaya bisa dites tanpa DOM, pola sama fungsi murni
// lain di file ini (lihat tests/helpers/loadSource.js).
function advanceBillNextDue(nextDue,freq,today){
const d=new Date(nextDue);
const ref=today?new Date(today):new Date();
ref.setHours(0,0,0,0);
let guard=0;
while(guard<600){
if(freq==='bulanan')d.setMonth(d.getMonth()+1);
else if(freq==='mingguan')d.setDate(d.getDate()+7);
else if(freq==='tahunan')d.setFullYear(d.getFullYear()+1);
else return d;
guard++;
if(d>ref)break;
}
return d;
}
// markBillPaid(id, advance) — param `advance` (dipakai tombol "📅 Bayar Bulan Depan", user
// request Sesi 273) menandai bahwa user bayar SEKARANG tapi UNTUK periode berikutnya (sebelum
// jatuh tempo aslinya) -- transaksi dicatat dengan tanggal = b.nextDue (bukan hari ini), supaya
// getBillPaidThisPeriodInfo() (di bawah) tetap mendeteksinya jatuh di periode yang benar walau
// dibayar lebih awal. Sisa logic (advance tenor/nextDue, arsip, dst) TETAP SAMA persis seperti
// bayar biasa -- cuma tanggal transaksi & teks konfirmasi/toast yang beda.
async function markBillPaid(id,advance){
const b=D.bills.find(x=>x.id===id);
if(!b)return;
// Guard dobel-bayar (Sesi 292, fix laporan user) -- getBillPaidThisPeriodInfo() sudah ADA
// sejak S322 (dipakai murni utk badge visual "✅ Sudah dibayar bulan ini" di renderBillItemHtml/
// applyBillFilter), tapi TIDAK pernah dipanggil di sini, jadi tombol ✅ Bayar di kartu bisa
// ditekan berkali-kali di periode yang sama -> sisaTenor kepotong 2x, nextDue maju 2x, 2
// transaksi pengeluaran tercatat utk 1 periode. Dipasang di SINI (bukan cuma di
// renderBillItemHtml) supaya menutup SEMUA entry point ke markBillPaid sekaligus (SSOT),
// termasuk kalau nanti ada entry point lain selain tombol kartu. Dipanggil TANPA
// targetBulan/targetTahun (pakai default bulan/tahun AKTUAL skrg) krn ini soal "mau bayar
// SEKARANG", bukan soal filter/browsing bulan lain di UI. Kalau user tetap pilih lanjut,
// alur di bawah jalan seperti biasa (tidak ada logic baru selain guard konfirmasi ini).
const alreadyPaidInfo=getBillPaidThisPeriodInfo(b);
if(alreadyPaidInfo){
const paidDateLabel=alreadyPaidInfo.date.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
if(!await askConfirm(`"${escapeHtml(b.name)}" sudah dibayar utk periode ini (${paidDateLabel}). Tetap bayar lagi?`,{danger:true,okText:'Ya, Bayar Lagi',icon:'⚠️'}))return;
}
const label=b.kind==='cicilan'&&b.sisaTenor!=null?` (cicilan ke-${(b.tenor||0)-(b.sisaTenor||0)+1} dari ${b.tenor||'?'}x)`:'';
const sharedLabel=b.shared?` (porsi kamu ${b.sharedPct}% dari total ${fmtFull(b.totalAmount)})`:'';
// payDate — SATU sumber tanggal (Sesi 284 fix) dipakai konsisten utk transaksi pembayaran
// INI & completedAt kalau bill langsung diarsipkan LUNAS di bawah (utang lunas/cicilan
// tenor habis/tagihan sekali selesai).
// Fix ringkas (permintaan user): "Bayar Bulan Depan" (advance) TETAP terkunci ke jatuh
// tempo (b.nextDue) — TIDAK ada field tanggal pembayaran terpisah, sesuai maksud fitur
// "bayar di muka utk periode berikutnya" (Sesi 273/284, lihat komentar di atas). Untuk
// bayar BIASA (bukan advance), sekarang ada field "Tanggal Pembayaran" (editable, default
// hari ini) lewat showPromptModal — berlaku utk SEMUA kind (tagihan/cicilan/langganan/
// utang), sebelumnya selalu dipaksa new Date() tanpa bisa dikoreksi.
let payDate;
let payAmount=b.amount;
if(advance){
const confirmMsg=`Bayar "${escapeHtml(b.name)}"${label}${sharedLabel} sebesar ${fmtFull(b.amount)} UNTUK BULAN DEPAN (di muka, sebelum jatuh tempo ${b.nextDue})?`;
if(!await askConfirm(confirmMsg,{danger:false,okText:'Ya, Bayar Duluan',icon:'📅'}))return;
payDate=b.nextDue;
} else {
// FIX ringkas (item #3 lanjutan laporan user, sesi ini): khusus kind==='utang', jumlah
// bayar sekarang BISA diedit (default tetap b.amount, cicilan biasa) -- sebelumnya SELALU
// terkunci ke b.amount, jadi user yang mau lunasin lebih besar dari cicilan tetap (bayar
// sekaligus/di muka) harus muter lewat Buku Utang edit `nilai` manual, tanpa jalur dari
// sisi Tagihan. Kind lain (tagihan/langganan/cicilan) SENGAJA TIDAK diubah -- nominalnya
// memang sudah pasti/terjadwal (beda dari utang yang sisa saldonya fleksibel & bisa
// dilunasi sebagian besar kapan saja). validate>0 saja (bukan dibatasi <= sisa) supaya
// tetap konsisten dgn markBillPaid() yg sudah clamp dbt.nilai ke 0 di bawah kalau
// pembayaran > sisa -- user boleh input lebih dari sisa (mis. dibulatkan), tidak dianggap
// error.
if(b.kind==='utang'){
const dbtForSisa=b.debtId?D.debts.find(x=>sameId(x.id,b.debtId)):null;
const sisaLabel=dbtForSisa?` Sisa utang saat ini ${fmtFull(dbtForSisa.nilai||0)}.`:'';
const amtVal=await showPromptModal({
title:'Jumlah Pembayaran',
message:`Bayar "${escapeHtml(b.name)}"${sharedLabel} sebesar berapa? Cicilan biasa ${fmtFull(b.amount)}.${sisaLabel} Boleh diisi lebih besar kalau mau lunasin sekaligus.`,
inputType:'number',
defaultValue:b.amount,
okText:'Lanjut',
icon:'💰',
validate:v=>{const n=parsePzNum(v);return n>0?null:'Jumlah harus lebih dari 0';}
});
if(!amtVal)return;
payAmount=parsePzNum(amtVal);
}
const todayStr=new Date().toISOString().split('T')[0];
const val=await showPromptModal({
title:'Tanggal Pembayaran',
message:`Bayar "${escapeHtml(b.name)}"${label}${sharedLabel} sebesar ${fmtFull(payAmount)}?`,
inputType:'date',
defaultValue:todayStr,
okText:'Ya, Bayar',
icon:'💸',
validate:v=>v?null:'Tanggal wajib diisi'
});
if(!val)return;
payDate=val;
}
const _payTxId=uid();
D.transactions.push({id:_payTxId,type:'expense',amount:payAmount,category:b.category||'Tagihan',subcategory:'',accountId:b.accountId||D.accounts[0]?.id||'',note:(advance?'Bayar (bulan depan): ':'Bayar: ')+b.name,date:payDate,payMethod:b.kind,billLinkId:b.id});
// Ditanggung Bersama + auto-piutang (Sesi 341) -- lihat komentar helper di
// piutang-utang.js. Dipanggil di sini (SETELAH transaksi pembayaran dibuat,
// SEBELUM cabang kind-specific di bawah) supaya berlaku utk SEMUA jenis bill
// (tagihan/langganan/cicilan/utang) & tetap jalan meski bill ini langsung
// lunas/diarsip setelah ini.
if(typeof maybeCreateSharedPiutangFromBill==='function')maybeCreateSharedPiutangFromBill(b,_payTxId);
if(b.kind==='utang'&&b.debtId){
const dbt=D.debts.find(x=>sameId(x.id,b.debtId));
if(dbt){
dbt.nilai=Math.max(0,(dbt.nilai||0)-payAmount);
if(dbt.nilai<=0){
dbt.lunas=true;dbt.billId=null;
if(!D.billsArchive)D.billsArchive=[];
// FIX ringkas (audit s306, saran #2): simpan payAmount AKTUAL (bisa beda dari
// b.amount khusus kind==='utang', lihat prompt "Jumlah Pembayaran" di atas) di
// entry arsip -- dipakai fallbackMatchAmount()/findFallbackBillPaymentTxId()
// supaya fallback nominal-matching tetap akurat kalau pelunasan sekaligus ini
// SENDIRI kebetulan tidak ter-billLinkId (jarang, cuma lewat impor data lama).
// 3 titik push lain (cicilan tenor habis, tagihan sekali selesai) ikut disamakan
// biar konsisten, walau di situ payAmount SELALU sama dgn b.amount (kind lain
// tidak punya prompt edit nominal).
D.billsArchive.push({...b,completedAt:payDate,actualPayAmount:payAmount});
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
D.billsArchive.push({...b,completedAt:payDate,actualPayAmount:payAmount});
D.bills=D.bills.filter(x=>x.id!==id);
save();refreshBillEverywhere();
toast('🎉 Cicilan '+b.name+' LUNAS!');return;
}
}
if(b.freq!=='bulanan'&&b.freq!=='mingguan'&&b.freq!=='tahunan'){
if(!D.billsArchive)D.billsArchive=[];
D.billsArchive.push({...b,completedAt:payDate,actualPayAmount:payAmount});
D.bills=D.bills.filter(x=>x.id!==id);
save();refreshBillEverywhere();
toast('✅ Tagihan selesai & tercatat');return;
}
const d=advanceBillNextDue(b.nextDue,b.freq);
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
function getBillPaidThisPeriodInfo(b,targetBulan,targetTahun){
if(!b||!b.id||b.freq==='sekali')return null;
const history=(D.transactions||[]).filter(t=>t.billLinkId===b.id&&t.date).map(t=>({t,d:new Date(t.date)})).filter(x=>!isNaN(x.d.getTime())).sort((a,c)=>c.d-a.d);
if(!history.length)return null;
const{t,d}=history[0];
// targetBulan/targetTahun datang dari billFilterBulan/billFilterTahun (dropdown filter
// lanjutan Tagihan) -- kalau 'all'/tidak dikirim, fallback ke bulan/tahun AKTUAL (now),
// supaya perilaku default (tanpa filter) tetap sama seperti sebelumnya. FIX: sebelumnya
// selalu dibandingkan ke new Date() aktual, jadi saat user browsing bulan lain lewat
// filter/nav (‹ Juli 2026 ›), status "sudah dibayar periode ini" salah dibandingkan ke
// bulan berjalan asli, bukan bulan yg sedang dilihat.
const now=new Date();
const refMonth=(targetBulan===undefined||targetBulan===null||targetBulan==='all')?now.getMonth():parseInt(targetBulan);
const refYear=(targetTahun===undefined||targetTahun===null||targetTahun==='all')?now.getFullYear():parseInt(targetTahun);
let samePeriod=false;
if(b.freq==='bulanan')samePeriod=d.getMonth()===refMonth&&d.getFullYear()===refYear;
else if(b.freq==='tahunan')samePeriod=d.getFullYear()===refYear;
else if(b.freq==='mingguan'){
// Mingguan tetap dibandingkan ke minggu berjalan SEKARANG (bukan refMonth/refYear) --
// filter lanjutan Tagihan cuma granular bulan/tahun, tidak ada konsep "minggu yg dipilih".
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
// Aksi filter eksplisit (dropdown/nav dalam panel Filter) -- bukan lagi sekadar browsing lewat
// nav besar ‹bulan› di atas, lihat komentar billStatNavActive.
billStatNavActive=false;
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
billListTab='aktif';billStatNavActive=false;
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
// paidThisPeriod (fix ringkas) — kalau bill AKTIF ini sudah dibayar utk periode
// berjalan (lihat getBillPaidThisPeriodInfo/_paidPeriodOnly di renderBillItemHtml),
// baris "📅 Bayar Bulan Depan" disembunyikan juga dari menu ⋮ ini. Sebelumnya cuma
// tombol ✅ utama di kartu yg diganti jadi 📋 -- menu ⋮ TETAP menampilkan opsi ini
// tanpa guard, jadi bisa dipakai bayar 2x utk periode yang sama (sisaTenor kepotong
// 2x, nextDue maju 2x) — berlaku sama utk cicilan/tagihan/langganan.
const paidThisPeriod=!lunas&&getBillPaidThisPeriodInfo(b,billFilterBulan,billFilterTahun);
const payAdvanceRow=paidThisPeriod?'':`<div class="bill-action-row" data-action="billActionPayAdvance" data-args="[${id}]"><span class="bar-icon u-cacc4">📅</span> Bayar Bulan Depan</div>
     `;
const rows=lunas?
    `<div class="bill-action-row" data-action="billActionEdit" data-args="[${id}]"><span class="bar-icon u-cacc">✏️</span> Edit</div>
     <div class="bill-action-row danger" data-action="billActionDeleteArchive" data-args="[${id}]"><span class="bar-icon">🗑</span> Hapus dari Arsip</div>`
    :
    `${payAdvanceRow}<div class="bill-action-row" data-action="billActionShareWA" data-args="[${id}]"><span class="bar-icon" style="color:#25D366">💬</span> Kirim ke WhatsApp</div>
     <div class="bill-action-row" data-action="billActionHistory" data-args="[${id}]"><span class="bar-icon u-cacc3">📋</span> Riwayat Pembayaran</div>
     <div class="bill-action-row danger" data-action="billActionDelete" data-args="[${id}]"><span class="bar-icon">🗑</span> Hapus</div>`;
document.getElementById('billActionsList').innerHTML=rows;
openQS('qsBillActions');
}
let billCalYear=null, billCalMonth=null, billCalSelectedDate=null;
let billStatMonth=null, billStatYear=null;
// billStatNavActive — FIX (user report: geser ‹Agustus 2026› di kartu Tagihan bikin list kosong
// nyasar ke pesan "Tidak ada tagihan yang cocok dengan filter" + tombol "Reset Filter", padahal
// user cuma jalan-jalan lihat bulan lain, bukan pasang filter (beda dari Daftar Transaksi biasa
// yang navigasi bulannya TIDAK dihitung sbg "filter" -- lihat kf/hasFilter di renderKeuangan()).
// Akar masalah: changeBillStatMonth() (nav besar di atas) reuse billFilterBulan/billFilterTahun
// yang SAMA dipakai dropdown "Filter lanjutan" (utk sinkron list+ringkasan, lihat komentar di
// changeBillStatMonth), jadi isFiltering ikut true walau bukan aksi filter eksplisit. Flag ini
// menandai kapan billFilterBulan/Tahun diisi lewat nav besar (browsing biasa) vs lewat aksi
// filter eksplisit (dropdown/nav DALAM panel Filter, applyBillFilter()) -- isFiltering di
// renderBillList() cuma hitung billFilterBulan/Tahun kalau BUKAN dari nav besar ini.
let billStatNavActive=false;
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
// initBillStatMonthDefault() — FIX (user report + Screenshot 2026-07-31): dulu label besar
// "‹ Juli 2026 ›" (keuBillMonthLabel, diisi updateBillStatGrid()) langsung fallback ke bulan
// SEKARANG begitu billStatMonth masih null, TAPI billFilterBulan/billFilterTahun (yang beneran
// dipakai renderBillList() buat nyaring daftar di bawahnya) tetap default 'all' sampai user
// PERTAMA KALI geser panah ‹› (changeBillStatMonth). Akibatnya: pertama buka tab Uang, label
// sudah bilang "Juli 2026" tapi list di bawah masih nampilin SEMUA bulan tanpa pandang bulu
// (termasuk tagihan Agustus/September yg belum jatuh tempo) -- label & isi list jadi tidak
// sinkron. Sekarang disamakan: begitu renderBillList() pertama kali jalan & belum pernah ada
// interaksi nav/filter eksplisit (billStatMonth masih null, billStatNavActive masih false),
// billFilterBulan/billFilterTahun ikut di-set ke bulan berjalan (pola sama persis dgn
// changeBillStatMonth, minus increment dir) SEBELUM combined difilter -- supaya dari awal
// list & label selalu nunjuk bulan yg sama. Kalau user sudah pernah pilih "Semua Bulan" lewat
// dropdown Filter lanjutan (billFilterBulan==='all' via applyBillFilter), billStatMonth sudah
// keburu ke-set (bukan null lagi) jadi fungsi ini idempotent & tidak menimpa pilihan eksplisit.
function initBillStatMonthDefault(){
if(billStatMonth!==null||billStatNavActive)return;
const now=new Date();
billStatMonth=now.getMonth();billStatYear=now.getFullYear();
billFilterBulan=String(billStatMonth);billFilterTahun=String(billStatYear);
billStatNavActive=true;
const elB=document.getElementById('billFilterBulan'), elT=document.getElementById('billFilterTahun');
if(elB)elB.value=String(billStatMonth);
if(elT){
if(![...elT.options].some(o=>o.value===String(billStatYear))){
const opt=document.createElement('option');opt.value=String(billStatYear);opt.textContent=String(billStatYear);elT.appendChild(opt);
}
elT.value=String(billStatYear);
}
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
// Ini browsing lewat nav besar, BUKAN aksi filter eksplisit -- lihat komentar billStatNavActive.
billStatNavActive=true;
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
