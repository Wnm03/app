// tx-renov.js — logika panel "🔨 Catat juga ke Proyek Renovasi?" pada txModal
// (Tambah/Edit Transaksi Keuangan). Pola panel kondisional PERSIS SAMA dengan
// tx-stok-sparepart.js (lihat file itu utk pola aslinya "Tambah ke Stok
// Sparepart juga?") -- panel ini otomatis muncul kalau kategori transaksi
// mengandung "Renov" (lihat isRenovCatName() & updateTxVehiclePanels() di
// transaksi.js), berlaku sama persis utk input manual maupun hasil Scan Struk
// (keduanya lewat updateTxVehiclePanels()).
//
// Beda dgn panel stok (yg selalu ikut mencatat transaksi Keuangan-nya), panel
// ini punya toggle status yg menentukan APAKAH transaksi Keuangan ikut
// dicatat atau tidak:
//  - ✅ Sudah Dibeli (default): item renovasi baru dibuat & LANGSUNG ditandai
//    lunas, otomatis ter-link ke transaksi Keuangan yang barusan disimpan --
//    pola sama persis seperti fitur "🔗 Hubungkan Transaksi Lama" yang sudah
//    ada di Renov.confirmLinkTx (lihat modules/home/renovasi.js), cuma di sini
//    terjadi OTOMATIS (tanpa perlu buka linkTxModal manual). Lihat
//    applyTxRenovFromTx() di bawah, dipanggil dari _saveTxInner (transaksi.js)
//    persis di titik yang sama dengan applyTxStockFromTx dkk, SETELAH
//    transaksi Keuangan tersimpan -- berlaku utk transaksi BARU maupun EDIT
//    transaksi yang sudah ada (BUGFIX s433: dulu cuma dipanggil utk transaksi
//    baru, jadi centang panel ini waktu Edit Transaksi tidak pernah tersimpan;
//    guard `existingTx.renovItemLinkId` di transaksi.js mencegah dobel kalau
//    transaksi yang diedit memang SUDAH ter-link sebelumnya).
//  - 🛒 Belum Dibeli: item masuk daftar belanja proyek sbg BELUM lunas
//    (estimasi harga = nominal yang diisi di form Jumlah), TAPI transaksi
//    Keuangan-nya SENGAJA TIDAK ikut dicatat (barangnya belum benar-benar
//    dibeli, cuma baru didata rincian belanjanya). Lihat
//    handleTxRenovBelumDibeli() di bawah, dipanggil di AWAL _saveTxInner
//    (transaksi.js) -- kalau return true, _saveTxInner early-return persis
//    pola cabang cicilan/langganan yg juga early-return, supaya SISA proses
//    (bikin transaksi Keuangan) tidak ikut jalan.
//
// Catatan modal Renov (modules/home/renovasi.js, Renov.renderDetail): modal
// detail proyek SUDAH punya pemisahan otomatis "🛒 Perlu Dibeli" vs "✅ Sudah
// Dibeli" berdasarkan field `it.paid` tiap item (lihat renovItemList) -- jadi
// item yang dibuat dari panel ini otomatis nongol di seksi yang sesuai tanpa
// perlu tab/UI baru sama sekali, cukup set `paid:true`/`paid:false` seperti
// biasa.
let _txRenovStatus='sudah';
function populateTxRenovSelect(){
const sel=document.getElementById('txRenovProject');
if(!sel)return;
const cur=sel.value;
if(!D.renovProjects||!D.renovProjects.length){
sel.innerHTML='<option value="">— Belum ada proyek, buat dulu di 🔨 Proyek Renovasi —</option>';
sel.disabled=true;
return;
}
sel.disabled=false;
sel.innerHTML=D.renovProjects.map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
if(cur&&D.renovProjects.find(p=>sameId(p.id,cur)))sel.value=cur;
}
function setTxRenovStatus(status){
_txRenovStatus=(status==='belum')?'belum':'sudah';
const btnSudah=document.getElementById('txRenovStatusSudah');
const btnBelum=document.getElementById('txRenovStatusBelum');
if(btnSudah)btnSudah.classList.toggle('active',_txRenovStatus==='sudah');
if(btnBelum)btnBelum.classList.toggle('active',_txRenovStatus==='belum');
const hint=document.getElementById('txRenovStatusHint');
if(hint)hint.textContent=_txRenovStatus==='sudah'
?'💡 Item baru langsung ditandai lunas & otomatis ter-link ke transaksi Keuangan ini.'
:'💡 Item masuk daftar belanja proyek sbg belum lunas (estimasi = nominal Jumlah di atas). Transaksi Keuangan ini TIDAK ikut dicatat, karena barangnya belum benar-benar dibeli.';
}
function toggleTxRenovFields(){
const chk=document.getElementById('txAddRenov');
const fields=document.getElementById('txRenovFields');
if(!chk||!fields)return;
fields.style.display=chk.checked?'block':'none';
if(chk.checked){
populateTxRenovSelect();
setTxRenovStatus(_txRenovStatus);
}
updateTxRenovItemOptions();
}
// S2826: cicilan dari form Transaksi boleh mengisi item RAB yang sudah ada (bukan membuat item bentukan bill -> total rencana dobel).
// Hanya tampil bila Cara Bayar = Cicilan, panel dicentang, dan proyek punya item belum lunas yang bukan item bentukan bill.
function updateTxRenovItemOptions(presetId){
const wrap=document.getElementById('txRenovItemWrap'),sel=document.getElementById('txRenovItem');if(!wrap||!sel)return;
const prev=sel.value;
const chk=document.getElementById('txAddRenov'),projSel=document.getElementById('txRenovProject');
const isCicilan=(typeof curPayMethod!=='undefined'&&curPayMethod==='cicilan');
const p=(isCicilan&&chk&&chk.checked&&projSel&&projSel.value&&Array.isArray(D.renovProjects))?D.renovProjects.find(x=>sameId(x.id,projSel.value)):null;
// S2827: saat edit cicilan, item yang sedang tertaut pada bill ikut dimuat (walau sudah lunas / item bentukan bill) agar bisa dipilih ulang.
const hasPreset=presetId!=null&&presetId!=='';
const items=p?(p.items||[]).filter(x=>x&&((x.billLinkId==null&&!x.paid)||(hasPreset&&sameId(x.id,presetId)))):[];
if(!items.length){wrap.style.display='none';sel.innerHTML='';return;}
wrap.style.display='block';
sel.innerHTML='<option value="">— Buat item baru otomatis —</option>'+items.map(x=>`<option value="${escapeHtml(String(x.id))}">${escapeHtml(x.name||'Item')}</option>`).join('');
const want=hasPreset?presetId:prev;
sel.value=items.some(x=>sameId(x.id,want))?String(items.find(x=>sameId(x.id,want)).id):'';
}
// S2827: edit cicilan lewat form Transaksi -> pilihan item RAB disimpan ke bill (sama seperti form Tagihan, S2825).
// Berlaku untuk pembayaran BERIKUTNYA; pembayaran yang sudah tercatat tetap di item lamanya. Return true bila bill berubah.
function applyTxRenovBillItemChange(bill){
if(!bill||bill.renovProjectLinkId==null||bill.renovProjectLinkId==='')return false;
const wrap=document.getElementById('txRenovItemWrap'),sel=document.getElementById('txRenovItem'),chk=document.getElementById('txAddRenov'),projSel=document.getElementById('txRenovProject');
if(!wrap||!sel||!chk||!projSel||!chk.checked||wrap.style.display==='none')return false;
if(!sameId(projSel.value,bill.renovProjectLinkId))return false;
const p=Array.isArray(D.renovProjects)?D.renovProjects.find(x=>sameId(x.id,bill.renovProjectLinkId)):null;if(!p)return false;
const pick=sel.value||'';
const next=(pick&&(p.items||[]).some(x=>x&&sameId(x.id,pick)))?pick:'';
const cur=(bill.renovItemLinkId==null)?'':String(bill.renovItemLinkId);
if(String(next)===cur)return false;
if(next)bill.renovItemLinkId=next;else delete bill.renovItemLinkId;
return true;
}
// S2779 (Pola B): centang "Catat juga ke Proyek Renovasi" dimatikan pada transaksi yang SUDAH tertaut item
// proyek = permintaan melepas tautan (form edit mencentang ulang panel tertaut, jadi mematikannya disengaja).
function _txRenovLinkedItem(existingTx){
if(!existingTx||!existingTx.renovProjectLinkId||!existingTx.renovItemLinkId||!Array.isArray(D.renovProjects))return null;
const p=D.renovProjects.find(x=>sameId(x.id,existingTx.renovProjectLinkId));
const it=p&&Array.isArray(p.items)?p.items.find(x=>sameId(x.id,existingTx.renovItemLinkId)):null;
return it?{project:p,item:it}:null;
}
function txRenovUnlinkRequested(existingTx){
if(!_txRenovLinkedItem(existingTx))return false;
const chk=document.getElementById('txAddRenov');
const panel=document.getElementById('txRenovPanel');
return !!(chk&&!chk.checked&&panel&&panel.style.display!=='none');
}
// Item proyek TIDAK dihapus (bisa sudah diedit di Renovasi: rincian hitung, absensi tukang) -- ia kembali ke
// "Perlu Dibeli" persis seperti saat transaksinya dihapus (Renov.onLinkedTxDeleted). Transaksi Keuangan tetap ada.
function unlinkTxRenovFromTx(existingTx){
const link=_txRenovLinkedItem(existingTx);
const payId=existingTx.renovPaymentId;
if(link){
if(payId&&Array.isArray(link.item.payments)){
// Cicilan: buang baris payment milik tx ini (1 SOT: tx yang terlepas tidak boleh tetap dihitung), item tetap punya sisa cicilan lain.
link.item.payments=link.item.payments.filter(x=>!(sameId(x.id,payId)||sameId(x.txId,existingTx.id)));
link.item.paid=link.item.payments.reduce((sum,x)=>sum+Math.max(0,Number(x&&x.amount)||0),0)>=(Number(link.item.harga)||0)&&(Number(link.item.harga)||0)>0;
}else{
link.item.paid=false;link.item.txId=null;link.item.paidDate=null;
}
if(typeof Renov!=='undefined'){
Renov.render();
if(sameId(Renov.curId,link.project.id))Renov.renderDetail();
}
}
if(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT)throw new Error('FINANCE_TX_SOT_REQUIRED');
const detached=FinanceTxSOT.patchMetaById(existingTx.id,{renovProjectLinkId:undefined,renovItemLinkId:undefined,renovPaymentId:undefined});
if(!detached)throw new Error('FINANCE_TX_META_UNLINK_FAILED');
return link;
}
// applyTxRenovFromTx(note,txId,date,amt,cat,accId) -- dipanggil SETELAH
// transaksi Keuangan tersimpan (persis titik yg sama dgn applyTxStockFromTx
// dkk di _saveTxInner), khusus utk status "✅ Sudah Dibeli". Kalau status
// "🛒 Belum Dibeli", sudah ditangani lebih awal oleh
// handleTxRenovBelumDibeli() (yg early-return sblm transaksi dibuat sama
// sekali) -- jadi di sini cukup early-return supaya tidak dobel proses.
//
// BUGFIX (s436): dulu fungsi ini panggil toast() sendiri di akhir (baik jalur
// sukses maupun jalur "⚠️ Pilih dulu Proyek Renovasi-nya") -- tapi pemanggil
// (_saveTxInner di transaksi.js) SELALU panggil toast() lagi tepat
// sesudahnya ("✅ Transaksi diperbarui"/"✅ Transaksi tersimpan"). toast() cuma
// pegang 1 elemen #toast (lihat format-tema.js) jadi toast kedua LANGSUNG
// menimpa toast pertama dlm hitungan milidetik -- user tidak pernah sempat
// baca konfirmasi/peringatan Renov ini, padahal datanya (atau justru
// TIDAK-tersimpannya data, utk kasus "belum pilih proyek") sudah valid di
// balik layar. Fix: fungsi ini sekarang `return` string pesan alih-alih
// toast sendiri; early-return (panel tidak aktif/status "belum") tetap
// return undefined tanpa pesan apapun (sama seperti sebelumnya -- memang
// tidak ada apapun yg perlu diberitahukan). _saveTxInner yg menggabungkan
// pesan ini ke toast final-nya (lihat komentar di transaksi.js).
function applyTxRenovFromTx(note,txId,date,amt,cat,accId){
const chk=document.getElementById('txAddRenov');
if(!chk||!chk.checked)return;
const panel=document.getElementById('txRenovPanel');
if(!panel||panel.style.display==='none')return;
if(_txRenovStatus==='belum')return;
const projSel=document.getElementById('txRenovProject');
// BUGFIX (s446): dulu projId cuma diambil dari projSel.value -- kalau karena alasan apapun
// (mis. re-render lain sempat mengosongkan select tepat sebelum Simpan ditekan) value-nya
// kosong padahal user SUDAH centang & isi panel ini, hasilnya warning "Pilih dulu Proyek
// Renovasi-nya" nongol meski user merasa sudah pilih proyeknya (lihat screenshot laporan:
// dropdown kelihatan sudah terisi "Renov" waktu modal dibuka lagi). Fix: fallback ke opsi
// pertama yang benar-benar ada di DOM select (persis logika default population di
// populateTxRenovSelect()) sebelum baru dianggap "belum pilih" -- projId hanya kosong kalau
// select memang tidak punya opsi sama sekali (D.renovProjects kosong).
const projId=(projSel&&projSel.value)?projSel.value:(projSel&&projSel.options&&projSel.options.length?projSel.options[0].value:'');
// BUGFIX (s447): dulu perbandingan id pakai `x.id===projId` (strict equality) -- tapi id
// proyek dibuat oleh uid() yg return NUMBER, sedangkan projId selalu STRING (semua value
// DOM <select>/<option> otomatis di-stringify browser). Akibatnya find() SELALU gagal walau
// user sudah benar pilih proyeknya di dropdown (lihat screenshot laporan: dropdown kelihatan
// terisi "Renov", tapi tetap muncul warning "Pilih dulu Proyek Renovasi-nya" pas Simpan).
// Semua perbandingan id proyek Renov di modules/home/renovasi.js sudah benar pakai sameId()
// (helper global yg bandingkan String(a)===String(b)) -- fix: samakan di sini juga.
const p=projId?D.renovProjects.find(x=>sameId(x.id,projId)):null;
if(!p)return '⚠️ Pilih dulu Proyek Renovasi-nya (item tidak dicatat ke Renovasi, transaksi Keuangan tetap tersimpan)';
const itemName=(note||cat||'Item Renovasi').trim()||'Item Renovasi';
const it={id:uid(),name:itemName,ukuran:'',harga:amt,hargaTotal:null,category:cat,accountId:accId,note:'',tglBayar:date,calcDetail:null,paid:true,txId:txId,paidDate:date};
p.items.push(it);
if(typeof FinanceTxSOT!=='undefined'&&FinanceTxSOT&&FinanceTxSOT.findById(txId))FinanceTxSOT.patchMetaById(txId,{renovProjectLinkId:p.id,renovItemLinkId:it.id});
save();
if(typeof Renov!=='undefined'){
Renov.render();
if(sameId(Renov.curId,p.id))Renov.renderDetail();
}
if(typeof FinanceEventOutbox!=="undefined"&&FinanceEventOutbox&&typeof FinanceEventOutbox.emitOrEnqueue==="function")FinanceEventOutbox.emitOrEnqueue("finance.updated",{kind:"renov",action:"link-paid",projectId:p.id,itemId:it.id,txId:txId,amount:amt});
return `🔨 Item "${escapeHtml(itemName)}" otomatis dicatat & lunas di proyek "${escapeHtml(p.name)}"`;
}
// handleTxRenovBelumDibeli(note,cat) -- dipanggil di AWAL _saveTxInner
// (transaksi.js), SEBELUM transaksi Keuangan dibuat, khusus utk transaksi
// BARU (bukan edit) dgn status "🛒 Belum Dibeli". Return true kalau berhasil
// ditangani di sini (utk sinyal ke _saveTxInner supaya early-return & TIDAK
// lanjut mencatat transaksi Keuangan, sesuai desain: barangnya belum
// benar-benar dibeli, jadi bukan pengeluaran nyata). Return false kalau panel
// tidak aktif/status bukan "belum" -- _saveTxInner lanjut proses normal.
function handleTxRenovBelumDibeli(note,cat){
const chk=document.getElementById('txAddRenov');
const panel=document.getElementById('txRenovPanel');
if(!chk||!chk.checked||!panel||panel.style.display==='none')return false;
if(_txRenovStatus!=='belum')return false;
const projSel=document.getElementById('txRenovProject');
// BUGFIX (s446): fallback sama seperti applyTxRenovFromTx (lihat komentar di sana).
// BUGFIX (s447): samakan pakai sameId() juga (lihat komentar detail di applyTxRenovFromTx).
const projId=(projSel&&projSel.value)?projSel.value:(projSel&&projSel.options&&projSel.options.length?projSel.options[0].value:'');
const p=projId?D.renovProjects.find(x=>sameId(x.id,projId)):null;
if(!p){toast('⚠️ Pilih dulu Proyek Renovasi-nya');return false;}
evalAmtExpr('txAmt');
const amt=parseFloat(document.getElementById('txAmt').value)||0;
if(amt<=0){toast('⚠️ Masukkan jumlah valid');return false;}
const date=document.getElementById('txDate').value||todayStr();
const accId=document.getElementById('txAcc').value;
const itemName=(note||cat||'Item Renovasi').trim()||'Item Renovasi';
const it={id:uid(),name:itemName,ukuran:'',harga:amt,hargaTotal:null,category:cat,accountId:accId,note:'',tglBayar:date,calcDetail:null,paid:false,txId:null,paidDate:null};
p.items.push(it);
save();closeModal('txModal');renderDashboard();
if(typeof Renov!=='undefined'){
Renov.render();
if(sameId(Renov.curId,p.id))Renov.renderDetail();
}
if(typeof FinanceEventOutbox!=="undefined"&&FinanceEventOutbox&&typeof FinanceEventOutbox.emitOrEnqueue==="function")FinanceEventOutbox.emitOrEnqueue("finance.updated",{kind:"renov",action:"belum-dibeli",projectId:p.id,itemId:it.id,amount:amt});
toast(`🛒 Item "${escapeHtml(itemName)}" masuk daftar belanja proyek "${escapeHtml(p.name)}" (belum lunas) — transaksi Keuangan TIDAK dicatat`);
return true;
}
// S2822 — Cicilan & Tagihan yang ditautkan ke Proyek Renovasi.
// Kenapa: dulu tautan proyek HANYA lahir dari jalur transaksi tunai (panel "Catat juga ke Proyek Renovasi"
// + pembayaran item di layar Renovasi). Pembayaran cicilan/tagihan (txModal cicilan, tombol Bayar di Tagihan)
// kategorinya Renovasi tapi TANPA renovProjectLinkId & TANPA deductionOwnerId -> belanja proyek lolos dari
// "Terbayar" proyek dan potongan akun titipan tak punya penanggung.
// Sekarang bill boleh membawa `renovProjectLinkId` (+ `deductionOwnerId`); tiap pembayarannya (transaksi) ikut
// ditautkan sebagai PEMBAYARAN pada 1 item proyek per bill (it.billLinkId) -- memakai model item.payments yang
// sudah ada, sehingga hapus/edit transaksi ikut menyinkronkan lewat Renov.onLinkedTxDeleted/onLinkedTxEdited.
function _renovBillOwners(accId){
if(!accId)return[];
let owners=[];
if(typeof resolveOwnerDefaultForAccount==='function'){
const r=resolveOwnerDefaultForAccount(accId);
if(r&&r.ok&&Array.isArray(r.owners))owners=r.owners;
}
if(!owners.length&&typeof getAccOwnersRaw==='function'){
const r=getAccOwnersRaw(accId);
if(r&&r.ok&&Array.isArray(r.owners))owners=r.owners;
}
return owners.filter(o=>o&&o.ownerId);
}
// resolveRenovBillOwner(bill, accId) -> '' (akun tanpa pemilik), ownerId, atau null (user batal memilih).
// Urutan: pilihan tersimpan di bill (kalau masih pemilik akun) -> pemilik tunggal otomatis -> tanya user.
async function resolveRenovBillOwner(bill,accId){
const owners=_renovBillOwners(accId);
if(!owners.length)return '';
if(bill&&bill.deductionOwnerId&&owners.some(o=>o.ownerId===bill.deductionOwnerId))return bill.deductionOwnerId;
if(owners.length===1)return owners[0].ownerId;
if(typeof showChoiceModal!=='function')return null;
const idx=await showChoiceModal({title:'Pemilik / Penanggung',message:'Akun ini punya lebih dari 1 pemilik. Siapa yang menanggung pembayaran "'+((bill&&bill.name)||'tagihan')+'" untuk proyek renovasi?',choices:owners.map(o=>({label:o.ownerName||o.ownerId}))});
return (idx===null||idx===undefined||!owners[idx])?null:owners[idx].ownerId;
}
// applyRenovBillPayment(bill, tx) -- tx: {id,amount,date,accountId,label}. Dipanggil SETELAH transaksi pembayaran dibuat.
// Return {projectId,itemId,paymentId} atau null (bill tak bertaut / proyek sudah dihapus -> transaksi tak ditautkan).
function applyRenovBillPayment(bill,tx){
if(!bill||!bill.renovProjectLinkId||!tx||!Array.isArray(D.renovProjects))return null;
const p=D.renovProjects.find(x=>sameId(x.id,bill.renovProjectLinkId));
if(!p)return null;
if(!Array.isArray(p.items))p.items=[];
const amt=Math.max(0,Math.round(Number(tx.amount)||0));
// S2825: bill boleh menunjuk item RAB yang SUDAH ada (bill.renovItemLinkId) -> pembayaran mengisi item itu, bukan membuat item baru
// (mencegah total rencana dobel). Tanpa pilihan / item sudah hilang -> perilaku lama (1 item per bill lewat billLinkId).
let it=null,_existingRab=false;
if(bill.renovItemLinkId!=null&&bill.renovItemLinkId!==''){
it=p.items.find(x=>x&&sameId(x.id,bill.renovItemLinkId))||null;
if(it)_existingRab=true;
}
if(!it)it=p.items.find(x=>x&&x.billLinkId!=null&&sameId(x.billLinkId,bill.id))||null;
if(!it){
it={id:uid(),name:bill.name||(bill.kind==='cicilan'?'Cicilan':'Tagihan'),ukuran:'',harga:0,hargaTotal:null,category:bill.category||'',accountId:tx.accountId,note:'',tglBayar:tx.date,calcDetail:null,paid:false,txId:null,paidDate:null,billLinkId:bill.id,payments:[]};
p.items.push(it);
}
if(!Array.isArray(it.payments)){
// Item RAB lama berstatus lunas lewat model 1-transaksi (txId) -> pertahankan sebagai pembayaran pertama, jangan hilang.
it.payments=(it.paid&&it.txId)?[{id:uid(),txId:it.txId,amount:Math.max(0,Number(it.harga)||0),date:it.paidDate||it.tglBayar||tx.date,accountId:it.accountId||tx.accountId,label:'Pembayaran'}]:[];
}
const paymentId=uid();
it.payments.push({id:paymentId,txId:tx.id,amount:amt,date:tx.date,accountId:tx.accountId,label:tx.label||(bill.kind==='cicilan'?'Cicilan':'Tagihan')});
const paidSum=it.payments.reduce((s,x)=>s+Math.max(0,Number(x&&x.amount)||0),0);
// Harga item: cicilan = porsi per periode x tenor (rencana total); tagihan berulang tak punya total pasti -> ikut total terbayar.
const planned=(bill.kind==='cicilan'&&Number(bill.tenor)>0)?Math.round((Number(bill.amount)||amt)*Number(bill.tenor)):0;
// Item RAB yang sudah ada: harga rencana TIDAK diubah kecuali terbayar melebihi rencana.
it.harga=_existingRab?Math.max(Number(it.harga)||0,paidSum):Math.max(planned,paidSum);
it.paid=it.harga>0&&paidSum>=it.harga;
if(it.paid)it.paidDate=tx.date;
if(typeof FinanceTxSOT!=='undefined'&&FinanceTxSOT&&FinanceTxSOT.findById(tx.id)){
if(!FinanceTxSOT.patchMetaById(tx.id,{renovProjectLinkId:p.id,renovItemLinkId:it.id,renovPaymentId:paymentId}))throw new Error('Gagal menautkan pembayaran ke item Renovasi');
}
if(typeof Renov!=='undefined'&&Renov&&typeof Renov.render==='function'){
try{Renov.render();if(sameId(Renov.curId,p.id)&&typeof Renov.renderDetail==='function')Renov.renderDetail();}catch(e){console.warn('[Renov] render setelah pembayaran bill gagal',e);}
}
return{projectId:p.id,itemId:it.id,paymentId};
}
// S2825: kategori bawaan pembayaran bill yang tertaut proyek (bill tanpa kategori) = kategori pengeluaran Renovasi, bukan "Tagihan".
function renovBillDefaultCategory(){
const pool=(typeof D!=='undefined'&&D&&D.categories&&Array.isArray(D.categories.expense))?D.categories.expense:[];
const c=pool.find(x=>x&&x.name&&typeof isRenovCatName==='function'&&isRenovCatName(x.name));
return c?String(c.name):'';
}
// getTxRenovPanelProject() -- proyek yang dipilih di panel "Catat juga ke Proyek Renovasi" txModal (null bila panel
// tak aktif / belum ada proyek). Dipakai jalur cicilan, yang tidak lewat applyTxRenovFromTx (khusus tunai).
function getTxRenovPanelProject(){
const chk=document.getElementById('txAddRenov');
const panel=document.getElementById('txRenovPanel');
if(!chk||!chk.checked||!panel||panel.style.display==='none')return null;
const projSel=document.getElementById('txRenovProject');
const projId=(projSel&&projSel.value)?projSel.value:(projSel&&projSel.options&&projSel.options.length?projSel.options[0].value:'');
return projId&&Array.isArray(D.renovProjects)?(D.renovProjects.find(x=>sameId(x.id,projId))||null):null;
}
// --- Form Tagihan (billModal): pilih Proyek Renovasi + penanggung. Dipindah ke sini agar tagihan-kalender.js tetap <=1600 baris. ---
// S2822: tautan Proyek Renovasi (+ pemilik/penanggung) pada bill. Dipakai markBillPaid() utk menautkan tiap pembayaran ke proyek.
function _populateBillRenovProjectSelect(){
const sel=document.getElementById('billRenovProject');if(!sel)return;
const ps=Array.isArray(D.renovProjects)?D.renovProjects:[];
sel.innerHTML='<option value="">— Tidak ditautkan —</option>'+ps.map(p=>`<option value="${escapeHtml(String(p.id))}">${escapeHtml(p.name||'Proyek')}</option>`).join('');
}
function _setBillRenovFields(projectId,ownerId,itemId){
const sel=document.getElementById('billRenovProject');
if(sel)sel.value=(projectId!=null&&projectId!==''&&(D.renovProjects||[]).some(p=>sameId(p.id,projectId)))?String(projectId):'';
updateBillRenovItemOptions(itemId||'');
updateBillRenovOwnerVisibility(ownerId||'');
}
// S2825: pilih item RAB yang diisi pembayaran bill (opsional). Hanya item rencana yang belum lunas & bukan item bentukan bill lain.
function updateBillRenovItemOptions(keepItemId){
const wrap=document.getElementById('billRenovItemWrap'),sel=document.getElementById('billRenovItem');if(!wrap||!sel)return;
const prev=(typeof keepItemId==='string')?keepItemId:sel.value;
const projSel=document.getElementById('billRenovProject');
const p=(projSel&&projSel.value&&Array.isArray(D.renovProjects))?D.renovProjects.find(x=>sameId(x.id,projSel.value)):null;
const items=p?(p.items||[]).filter(x=>x&&x.billLinkId==null&&(!x.paid||sameId(x.id,prev))):[];
if(!p||!items.length){wrap.style.display='none';sel.innerHTML='';return;}
wrap.style.display='block';
sel.innerHTML='<option value="">— Buat item baru otomatis —</option>'+items.map(x=>`<option value="${escapeHtml(String(x.id))}">${escapeHtml(x.name||'Item')}</option>`).join('');
sel.value=items.some(x=>sameId(x.id,prev))?String(prev):'';
}
function updateBillRenovOwnerVisibility(keepOwnerId){
const wrap=document.getElementById('billRenovOwnerWrap'),sel=document.getElementById('billRenovOwner');if(!wrap||!sel)return;
const prev=(typeof keepOwnerId==='string')?keepOwnerId:sel.value;
const accId=document.getElementById('billAcc')?document.getElementById('billAcc').value:'';
const owners=typeof _renovBillOwners==='function'?_renovBillOwners(accId):[];
if(!owners.length){wrap.style.display='none';sel.innerHTML='';return;}
wrap.style.display='block';
sel.innerHTML='<option value="">— Pilih saat bayar —</option>'+owners.map(o=>`<option value="${escapeHtml(o.ownerId)}">${escapeHtml(o.ownerName||o.ownerId)}</option>`).join('');
sel.value=owners.some(o=>o.ownerId===prev)?prev:(owners.length===1?owners[0].ownerId:'');
}

// ===== S2823 — SUMBER DANA pembayaran Proyek Renovasi (audit #3-#5) =====
// 1 SOT: TIDAK ada field baru. Sumber dana DITURUNKAN dari transaksi pembayarannya:
//  - 'titipan'  : tx punya deductionOwnerId, ATAU akunnya berpemilik (Dana Titipan) dan bukan rekening proyek.
//  - 'proyek'   : akun tempat DP/Termin klien masuk (income renovDpProjectId = proyek ini) = "rekening proyek".
//  - 'talangan' : akun lain (dana pribadi yang menalangi proyek).
// Tanpa DP tercatat, tak ada rekening proyek -> semua non-titipan = 'talangan' (belum ada uang klien).
function renovProjectAccountIds(pid){
const s=new Set();
(D.transactions||[]).forEach(t=>{if(t&&t.type==='income'&&t.renovDpProjectId!=null&&t.renovDpProjectId!==''&&String(t.renovDpProjectId)===String(pid)&&t.accountId)s.add(String(t.accountId));});
return s;
}
function renovFundSource(tx,projAccIds){
if(!tx)return{kind:'tanpa',ownerId:'',ownerName:''};
const owners=_renovBillOwners(tx.accountId),ownerId=tx.deductionOwnerId||'';
const nameOf=id=>{const o=owners.find(x=>x.ownerId===id);return(o&&(o.ownerName||o.ownerId))||id||'';};
if(ownerId)return{kind:'titipan',ownerId,ownerName:nameOf(ownerId)};
if(projAccIds&&projAccIds.has(String(tx.accountId)))return{kind:'proyek',ownerId:'',ownerName:''};
if(owners.length)return{kind:'titipan',ownerId:'',ownerName:''};
return{kind:'talangan',ownerId:'',ownerName:''};
}
// renovFundBreakdown(p) -> total terbayar per sumber dana; jumlah semua sumber == total "Terbayar Item" proyek.
function renovFundBreakdown(p){
const projAcc=renovProjectAccountIds(p&&p.id);
const r={proyek:0,talangan:0,titipan:0,tanpa:0,titipanOwners:{},projAcc};
const findTx=id=>{if(id==null||id==='')return null;return (typeof FinanceTxSOT!=='undefined'&&FinanceTxSOT&&FinanceTxSOT.findById)?FinanceTxSOT.findById(id):((D.transactions||[]).find(t=>t&&sameId(t.id,id))||null);};
((p&&p.items)||[]).forEach(it=>{
if(!it)return;
let pays;
if(Array.isArray(it.payments))pays=it.payments;
else if(it.paid)pays=[{txId:it.txId,amount:Math.max(0,Number(it.harga)||0)}];
else return;
pays.forEach(pay=>{
const amt=Math.max(0,Number(pay&&pay.amount)||0);if(!amt)return;
const tx=findTx(pay.txId)||(pay.accountId?{accountId:pay.accountId}:null);
if(!tx){r.tanpa+=amt;return;}
const s=renovFundSource(tx,projAcc);
if(s.kind==='titipan'){r.titipan+=amt;const k=s.ownerName||'(penanggung belum dipilih)';r.titipanOwners[k]=(r.titipanOwners[k]||0)+amt;}
else r[s.kind]+=amt;
});
});
return r;
}
// Dana Proyek = DP/Termin masuk - belanja yang benar-benar keluar dari rekening proyek (+ yang tak punya catatan transaksi).
function renovProjectFund(p,incoming){const b=renovFundBreakdown(p);return{fund:incoming-b.proyek-b.tanpa,breakdown:b};}
// renovMarkerAudit(projectId?) -> daftar transaksi yang 3 penandanya (proyek, penanggung, tautan payment) tidak sinkron.
// kind: 'tanpa-penanggung' (akun berpemilik, tx proyek tanpa deductionOwnerId; fixable bila 1 pemilik),
//       'penanggung-asing' (penanggung bukan pemilik akun), 'tanpa-proyek' (kategori Renovasi + penanggung, tanpa tautan proyek),
//       'proyek-hilang' (tautan ke proyek yang sudah tidak ada), 'payment-yatim' (payment/item menunjuk tx yang tak ada),
//       'tanpa-payment' (tx bertaut item tapi payment-nya tidak ada di item).
function renovMarkerAudit(projectId){
const out=[],txs=D.transactions||[],projs=D.renovProjects||[];
const hasProj=id=>projs.some(p=>sameId(p.id,id));
const inScope=id=>projectId==null||(id!=null&&String(id)===String(projectId));
txs.forEach(t=>{
if(!t||t.type!=='expense')return;
const owners=_renovBillOwners(t.accountId);
if(t.renovProjectLinkId){
if(!hasProj(t.renovProjectLinkId)){if(projectId==null)out.push({kind:'proyek-hilang',txId:t.id,fixable:false});return;}
if(!inScope(t.renovProjectLinkId))return;
if(owners.length&&!t.deductionOwnerId)out.push({kind:'tanpa-penanggung',txId:t.id,projectId:t.renovProjectLinkId,fixable:owners.length===1,ownerId:owners.length===1?owners[0].ownerId:''});
else if(owners.length&&t.deductionOwnerId&&!owners.some(o=>o.ownerId===t.deductionOwnerId))out.push({kind:'penanggung-asing',txId:t.id,projectId:t.renovProjectLinkId,fixable:false});
if(t.renovItemLinkId){
const p=projs.find(x=>sameId(x.id,t.renovProjectLinkId)),it=p&&(p.items||[]).find(x=>sameId(x.id,t.renovItemLinkId));
const ok=it&&(Array.isArray(it.payments)?it.payments.some(x=>sameId(x.txId,t.id)):sameId(it.txId,t.id));
if(it&&!ok)out.push({kind:'tanpa-payment',txId:t.id,projectId:p.id,fixable:false});
}
}else if(projectId==null&&t.deductionOwnerId&&typeof isRenovCatName==='function'&&isRenovCatName(t.category)){
out.push({kind:'tanpa-proyek',txId:t.id,fixable:false});
}
});
projs.forEach(p=>{
if(!inScope(p.id))return;
(p.items||[]).forEach(it=>{
const ids=Array.isArray(it.payments)?it.payments.map(x=>x&&x.txId):(it.paid&&it.txId?[it.txId]:[]);
ids.forEach(id=>{if(id!=null&&id!==''&&!txs.some(t=>t&&sameId(t.id,id)))out.push({kind:'payment-yatim',txId:id,projectId:p.id,fixable:false});});
});
});
return out;
}
// renovRepairMarkers(projectId?) -> perbaiki yang AMAN saja (akun tepat 1 pemilik -> isi penanggung). Sisanya hanya dilaporkan.
function renovRepairMarkers(projectId){
const before=renovMarkerAudit(projectId),ids=[];
before.forEach(m=>{if(m.kind==='tanpa-penanggung'&&m.fixable&&m.ownerId&&typeof FinanceTxSOT!=='undefined'&&FinanceTxSOT){FinanceTxSOT.patchMetaById(m.txId,{deductionOwnerId:m.ownerId});ids.push(m.txId);}});
return{fixed:ids.length,ids,remaining:before.length-ids.length,total:before.length};
}
