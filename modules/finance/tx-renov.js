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
// S2830 — Dropdown pemilik/penanggung Proyek Renovasi: opsi "➕ Tambah / kelola pemilik akun…".
// Kenapa: dulu semua dropdown pemilik Renovasi (item RAB, DP/Termin, bayar item, form Tagihan) HANYA berisi pemilik akun terpilih
// & disembunyikan total bila akun belum punya pemilik -> tidak ada jalan menambah pemilik / memilih orang lain dari sini.
// Sumber kebenaran pemilik tetap acc.owners (porsi 100%, AccOwners/setAccOwners) -- opsi ini hanya MEMBUKA modal "Porsi
// Kepemilikan" akun yang dipilih (AccOwners.open(accId,onSaved)); sesudah Simpan, dropdown di-refresh. Nilai penanda
// '__manage_owners__' TIDAK PERNAH dibiarkan terpilih/tersimpan (handler langsung mengembalikan ke pilihan sebelumnya).
const RENOV_OWNER_MANAGE_VALUE='__manage_owners__';
function renovOwnerOptionsHtml(owners,placeholder){
return '<option value="">'+escapeHtml(placeholder)+'</option>'+(owners||[]).map(o=>'<option value="'+escapeHtml(o.ownerId)+'">'+escapeHtml(o.ownerName||o.ownerId)+'</option>').join('')+'<option value="'+RENOV_OWNER_MANAGE_VALUE+'">➕ Tambah / kelola pemilik akun…</option>';
}
// Isi <select> pemilik + pasang handler delegasi data-onchange (dispatcher global, tanpa addEventListener baru).
function renovFillOwnerSelect(sel,owners,accElId,refreshPath,withOwnersLabel){
if(!sel)return;
sel.innerHTML=renovOwnerOptionsHtml(owners,(owners&&owners.length)?(withOwnersLabel||'— Pilih pemilik —'):'— Tanpa pemilik (dana pribadi) —');
sel.setAttribute('data-onchange','renovOwnerSelectChange');
sel.setAttribute('data-onchange-args',JSON.stringify([sel.id,'$value',accElId,refreshPath]));
sel.setAttribute('data-prev-owner','');
}
function renovOpenAccountOwners(accId,onSaved){
if(typeof AccOwners==='undefined'||!AccOwners||typeof AccOwners.open!=='function'){toast('⚠️ Pengaturan pemilik akun belum siap dimuat');return false;}
AccOwners.open(accId,onSaved);
return true;
}
function renovOwnerSelectChange(selId,value,accElId,refreshPath){
const sel=document.getElementById(selId);if(!sel)return;
if(value!==RENOV_OWNER_MANAGE_VALUE){sel.setAttribute('data-prev-owner',value||'');return;}
const prev=sel.getAttribute('data-prev-owner')||'';
sel.value=prev;
const accEl=document.getElementById(accElId);const accId=accEl?accEl.value:'';
if(!accId){toast('⚠️ Pilih akun dulu sebelum mengatur pemilik');return;}
// S2832: refresh disimpan sbg "pending" -- akun tertaut Holding dialihkan AccOwners.open() ke modal Holding (tanpa onSaved);
// InvestmentUI.saveOwners() memanggil renovFlushOwnerRefresh() sehingga dropdown tetap ter-refresh utk jalur itu juga.
_renovPendingOwnerRefresh=()=>{
let fn=window;String(refreshPath||'').split('.').forEach(k=>{fn=fn?fn[k]:undefined;});
if(typeof fn==='function'){const ctx=String(refreshPath).indexOf('.')>0?window[String(refreshPath).split('.')[0]]:window;fn.call(ctx,prev);}
};
renovOpenAccountOwners(accId,renovFlushOwnerRefresh);
}
let _renovPendingOwnerRefresh=null;
function renovFlushOwnerRefresh(){
const f=_renovPendingOwnerRefresh;_renovPendingOwnerRefresh=null;
if(typeof f==='function'){try{f();}catch(e){console.warn('[Renov] refresh dropdown pemilik gagal',e);}}
}
// S2831 — 1 SOT pemilik/penanggung Renovasi: SEMUA dropdown, validasi simpan, resolve saat bayar, audit & perbaikan penanda
// membaca pemilik akun lewat SATU fungsi ini (resolveOwnerDefaultForAccount: Holding -> Aset tertaut -> acc.owners/ownership),
// SAMA dengan dropdown "Pemilik Sumber Potongan" transaksi biasa (#txDeductionOwner). Dulu dropdown item/DP/bayar di renovasi.js
// membaca getAccOwnersRaw (acc.owners mentah) -> beda dgn form Tagihan & transaksi utk akun tertaut Holding/Aset. Jangan baca
// getAccOwnersRaw langsung di modul Renovasi; pakai renovAccountOwners(). _renovBillOwners dipertahankan sbg alias kompatibilitas.
function _renovBillOwners(accId){return renovAccountOwners(accId);}
function renovAccountOwners(accId){
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
const owners=renovAccountOwners(accId);
if(!owners.length)return '';
if(bill&&bill.deductionOwnerId&&owners.some(o=>o.ownerId===bill.deductionOwnerId))return bill.deductionOwnerId;
if(owners.length===1)return owners[0].ownerId;
if(typeof showChoiceModal!=='function')return null;
resolveRenovBillOwner._managing=false;
const idx=await showChoiceModal({title:'Pemilik / Penanggung',message:'Akun ini punya lebih dari 1 pemilik. Siapa yang menanggung pembayaran "'+((bill&&bill.name)||'tagihan')+'" untuk proyek renovasi?',choices:owners.map(o=>({label:o.ownerName||o.ownerId})).concat([{label:'➕ Tambah / kelola pemilik akun…'}])});
// S2830: pilihan terakhir = atur pemilik akun dulu (pembayaran ditunda, user tekan Bayar lagi setelah menyimpan porsi).
if(idx===owners.length){resolveRenovBillOwner._managing=true;renovOpenAccountOwners(accId);return null;}
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
// S2844: ganti Proyek Renovasi -> placeholder dropdown pemilik ikut berubah (Ikut pemilik akun / Pilih saat bayar).
function updateBillRenovItemOptions(keepItemId){
_updateBillRenovItemOptionsCore(keepItemId);
if(typeof keepItemId!=='string'&&typeof updateBillRenovOwnerVisibility==='function')updateBillRenovOwnerVisibility();
}
function _updateBillRenovItemOptionsCore(keepItemId){
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
// S2850 item 4 — pilihan pemilik "ditalangi" untuk dropdown pemilik form Tagihan: pemilik Dana Titipan yang TIDAK punya porsi di akun sumber (mis. Cash).
// Akun yang memuat porsinya (mis. BRI) tidak menandainya (itu potong porsi). Proyek klien tidak menawarkannya (perilaku lama). Return [{ownerId,ownerName}].
// S2852: hanya pemilik yang punya kartu Dana Titipan nyata (holding/aset berporsi atau pokok tercatat = DanaTitipanPortfolioAPI.build().owners) yang ditawarkan;
// nama yang hanya ada di registri pemilik tidak lagi muncul. keepOwnerId (pemilik tersimpan di tagihan) tetap ditawarkan agar pilihan lama tidak hilang saat edit.
// build() tak tersedia/gagal -> daftar penuh (perilaku S2850).
function billTalanganActiveOwnerIds(){
try{
if(typeof DanaTitipanPortfolioAPI==='undefined'||!DanaTitipanPortfolioAPI||typeof DanaTitipanPortfolioAPI.build!=='function')return null;
const r=DanaTitipanPortfolioAPI.build();
if(!r||!Array.isArray(r.owners))return null;
return new Set(r.owners.filter(o=>o&&o.ownerId!=null).map(o=>String(o.ownerId)));
}catch(e){return null;}
}
function billTalanganOwnerChoices(accId,projectId,keepOwnerId){
if(!accId||typeof DanaTitipanPortfolioAPI==='undefined'||!DanaTitipanPortfolioAPI||typeof DanaTitipanPortfolioAPI.listExistingOwners!=='function')return [];
const p=projectId&&Array.isArray(D.renovProjects)?D.renovProjects.find(x=>sameId(x.id,projectId)):null;
if(p&&p.dana==='klien')return [];
const have=new Set(renovAccountOwners(accId).map(o=>String(o.ownerId)));
const active=billTalanganActiveOwnerIds(),keep=keepOwnerId?String(keepOwnerId):'';
return (DanaTitipanPortfolioAPI.listExistingOwners()||[]).filter(o=>o&&o.ownerId&&String(o.ownerId)!=='SELF'&&!have.has(String(o.ownerId))&&(!active||active.has(String(o.ownerId))||String(o.ownerId)===keep));
}
function updateBillRenovOwnerVisibility(keepOwnerId){
const wrap=document.getElementById('billRenovOwnerWrap'),sel=document.getElementById('billRenovOwner');if(!wrap||!sel)return;
const prev=(typeof keepOwnerId==='string')?keepOwnerId:sel.value;
const accId=document.getElementById('billAcc')?document.getElementById('billAcc').value:'';
const owners=renovAccountOwners(accId);
if(!accId){wrap.style.display='none';sel.innerHTML='';return;}
wrap.classList.remove('u-dnone');
wrap.style.display='block';
// S2844: tanpa Proyek Renovasi, kosong = ikut pemilik akun sumber (tidak ditanya saat bayar); dengan proyek, tetap "Pilih saat bayar".
const _projEl=document.getElementById('billRenovProject');
renovFillOwnerSelect(sel,owners,'billAcc','updateBillRenovOwnerVisibility',(_projEl&&!_projEl.value)?'— Ikut pemilik akun —':'— Pilih saat bayar —');
const _tal=billTalanganOwnerChoices(accId,_projEl&&_projEl.value,prev);// S2850 item 4: pemilik titipan yang tidak punya porsi di akun ini = "ditalangi"
if(_tal.length){const _mg=sel.querySelector('option[value="'+RENOV_OWNER_MANAGE_VALUE+'"]');_tal.forEach(o=>{const op=document.createElement('option');op.value=o.ownerId;op.textContent='🤝 '+(o.ownerName||o.ownerId)+' (ditalangi)';sel.insertBefore(op,_mg);});}
sel.value=(owners.some(o=>o.ownerId===prev)||_tal.some(o=>o.ownerId===prev))?prev:(owners.length===1?owners[0].ownerId:'');
sel.setAttribute('data-prev-owner',sel.value||'');
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
const owners=renovAccountOwners(tx.accountId),ownerId=tx.deductionOwnerId||'';
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
// S2831 — nama pemilik utk sebuah ownerId (registry -> baris owners akun/aset/investasi/komitmen titipan). '' bila tak ketemu.
function renovOwnerNameById(ownerId){
const id=String(ownerId==null?'':ownerId);if(!id)return '';
if(typeof OwnerRegistry!=='undefined'&&OwnerRegistry&&typeof OwnerRegistry.listAll==='function'){const r=OwnerRegistry.listAll().find(x=>x&&String(x.id)===id);if(r&&r.name)return String(r.name);}
const pools=[D.accounts,D.assets,D.investments,D.titipanCommitments];
for(const pool of pools){for(const e of (Array.isArray(pool)?pool:[])){for(const o of ((e&&Array.isArray(e.owners))?e.owners:[])){if(o&&String(o.ownerId)===id&&o.ownerName)return String(o.ownerName);}}}
return '';
}
// Penanggung "asing" yang sebenarnya orang yang SAMA (ownerId beda krn data lama, nama sama) -> petakan ke pemilik akun.
// Aman HANYA bila tepat 1 pemilik akun bernama sama (trim, tanpa beda huruf besar/kecil); selain itu tetap manual.
function renovMatchOwnerByName(foreignOwnerId,accOwners){
const nm=renovOwnerNameById(foreignOwnerId).trim().toLowerCase();if(!nm)return null;
const hit=(accOwners||[]).filter(o=>o&&String(o.ownerName||'').trim().toLowerCase()===nm);
return hit.length===1?hit[0]:null;
}
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
const owners=renovAccountOwners(t.accountId);
if(t.renovProjectLinkId){
if(!hasProj(t.renovProjectLinkId)){if(projectId==null)out.push({kind:'proyek-hilang',txId:t.id,fixable:false});return;}
if(!inScope(t.renovProjectLinkId))return;
if(owners.length&&!t.deductionOwnerId)out.push({kind:'tanpa-penanggung',txId:t.id,projectId:t.renovProjectLinkId,fixable:owners.length===1,ownerId:owners.length===1?owners[0].ownerId:''});
else if(owners.length&&t.deductionOwnerId&&t.titipanTalangan!==true&&!owners.some(o=>o.ownerId===t.deductionOwnerId)){const _m=renovMatchOwnerByName(t.deductionOwnerId,owners);out.push({kind:'penanggung-asing',txId:t.id,projectId:t.renovProjectLinkId,fixable:!!_m,ownerId:_m?_m.ownerId:''});}
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
// renovRepairMarkers(projectId?) -> perbaiki yang AMAN saja (akun tepat 1 pemilik -> isi penanggung; penanggung asing yang namanya sama dgn tepat 1 pemilik akun -> dipetakan). Sisanya hanya dilaporkan.
function renovRepairMarkers(projectId){
const before=renovMarkerAudit(projectId),ids=[];
before.forEach(m=>{if((m.kind==='tanpa-penanggung'||m.kind==='penanggung-asing')&&m.fixable&&m.ownerId&&typeof FinanceTxSOT!=='undefined'&&FinanceTxSOT){FinanceTxSOT.patchMetaById(m.txId,{deductionOwnerId:m.ownerId});ids.push(m.txId);}});
return{fixed:ids.length,ids,remaining:before.length-ids.length,total:before.length};
}
// ===== S2844 — Tagihan per KEPEMILIKAN (Pribadi / Titipan) =====
// (ditaruh di tx-renov.js bersama renovAccountOwners; dipakai tagihan-kalender.js & modules-render.js saat runtime)
// SSOT tunggal = bill.deductionOwnerId (sudah ada & ikut ke transaksi saat bayar) + pemilik akun sumber. 0 field baru.
// Identitas TIDAK pernah digabung: tiap pemilik titipan dihitung & ditampilkan sendiri-sendiri (mis. "renov" != "home in").
function billOwnerIdFromForm(){
const proj=document.getElementById('billRenovProject'),own=document.getElementById('billRenovOwner');
const v=(own&&own.value)||'';
if(!v||v==='__manage_owners__')return '';
if(proj&&proj.value)return v;
const accEl=document.getElementById('billAcc');
const owners=(typeof renovAccountOwners==='function')?renovAccountOwners(accEl?accEl.value:''):[];
const hit=owners.find(o=>String(o.ownerId)===String(v));
return (v==='SELF'||(hit&&hit.isSelf))?'':v;
}
// billOwnershipOf(b) -> {scope:'pribadi'|'titipan', ownerId, ownerName, source:'bill'|'akun'|'multi'|''}
// 1) pemilik tersimpan di tagihan (bukan SELF) -> titipan  2) akun dengan TEPAT 1 pemilik non-SELF -> titipan (otomatis, sama seperti
// penandaan transaksi saat bayar)  3) akun multi-pemilik non-SELF tanpa pilihan -> titipan "belum dipilih"  4) selain itu -> pribadi.
function billOwnershipOf(b){
const accId=(b&&b.accountId)||((D.accounts&&D.accounts[0])?D.accounts[0].id:'')||'';
const owners=(typeof renovAccountOwners==='function')?renovAccountOwners(accId):[];
const nameOf=id=>{const o=owners.find(x=>String(x.ownerId)===String(id));if(o&&(o.ownerName||o.ownerId))return String(o.ownerName||o.ownerId);
if(typeof OwnerRegistry!=='undefined'&&OwnerRegistry&&typeof OwnerRegistry.listAll==='function'){const r=(OwnerRegistry.listAll()||[]).find(x=>x&&String(x.id)===String(id));if(r&&r.name)return String(r.name);}
return String(id);};
const sid=b&&b.deductionOwnerId?String(b.deductionOwnerId):'';
if(sid&&sid!=='SELF')return{scope:'titipan',ownerId:sid,ownerName:nameOf(sid),source:'bill'};
const ext=owners.filter(o=>o&&!o.isSelf&&o.ownerId&&o.ownerId!=='SELF');
if(ext.length===1&&owners.length===1)return{scope:'titipan',ownerId:String(ext[0].ownerId),ownerName:String(ext[0].ownerName||ext[0].ownerId),source:'akun'};
if(ext.length>1)return{scope:'titipan',ownerId:'',ownerName:'Pemilik belum dipilih',source:'multi'};
return{scope:'pribadi',ownerId:'',ownerName:'',source:''};
}
// getBillOwnershipSplit(month,year) -> {total, pribadi, titipan, owners:[{ownerId,ownerName,amount,count}]}; total == getBillStats().monthTotal.
function getBillOwnershipSplit(month,year){
const now=new Date(),m=(month!=null?month:now.getMonth()),y=(year!=null?year:now.getFullYear());
const out={total:0,pribadi:0,titipan:0,owners:[]};const map=new Map();
(D.bills||[]).forEach(b=>{
const n=getBillOccurrencesInMonth(b,y,m).length;if(!n)return;
const amt=n*(b.amount||0);out.total+=amt;
const o=billOwnershipOf(b);
if(o.scope==='pribadi'){out.pribadi+=amt;return;}
out.titipan+=amt;
const key=o.ownerId||('__'+o.ownerName);
if(!map.has(key))map.set(key,{ownerId:o.ownerId,ownerName:o.ownerName,amount:0,count:0});
const e=map.get(key);e.amount+=amt;e.count+=n;
});
out.owners=Array.from(map.values()).sort((a,b)=>b.amount-a.amount);
return out;
}
// Ringkasan Pribadi / Titipan di bawah pill statistik. Elemen dibuat dinamis (index.html tidak diubah); hanya muncul bila ada tagihan
// titipan di bulan yang dibuka -- tanpa titipan, tampilan lama persis sama.
function _updateBillOwnershipCardCore(prefix){
const grid=document.getElementById(prefix+'StatGrid');if(!grid||!grid.parentNode)return;
const id=prefix+'OwnerSplit';let el=document.getElementById(id);
const sp=getBillOwnershipSplit(billStatMonth,billStatYear);
const tal=talanganBelumDiganti();
if(!sp.titipan&&!tal.total){if(el)el.remove();return;}
if(!el){el=document.createElement('div');el.id=id;el.className='bill-owner-split u-mb8';grid.parentNode.insertBefore(el,grid.nextSibling);}
const esc=typeof escapeHtml==='function'?escapeHtml:(x=>String(x));
const money=typeof fmt==='function'?fmt:(n=>'Rp '+Math.round(n||0));
const chips=sp.owners.map(o=>'<span class="acc-chip" title="Titipan atas nama '+esc(o.ownerName)+'">🤝 '+esc(o.ownerName)+' · '+money(o.amount)+'</span>').join(' ');
const talHtml=tal.total?'<div class="u-fs12 u-t2 u-mt4" data-talangan-belum style="display:flex;flex-wrap:wrap;gap:4px"><span class="acc-chip" style="color:var(--accent4)" title="Piutang talangan titipan yang belum diganti pemilik">Talangan belum diganti: '+money(tal.total)+'</span>'+tal.owners.map(o=>'<span class="acc-chip" title="Talangan atas nama '+esc(o.ownerName)+'">🤝 '+esc(o.ownerName)+' · '+money(o.amount)+'</span>').join(' ')+'</div>':'';
if(!sp.titipan){el.innerHTML=talHtml;return;}
el.innerHTML='<div class="bill-stat-pills"><div class="bill-stat-pill"><span class="stat-label">Pribadi</span><span class="stat-val">'+money(sp.pribadi)+'</span></div>'
+'<div class="bill-stat-pill"><span class="stat-label">Titipan</span><span class="stat-val orange">'+money(sp.titipan)+'</span></div></div>'
+'<div class="u-fs12 u-t2 u-mt4" style="display:flex;flex-wrap:wrap;gap:4px">'+chips+'</div>'+talHtml;
}
// ===== S2847 — Perbaiki penanda titipan pada PEMBAYARAN TAGIHAN lama (sebelum S2844) =====
// Kandidat: transaksi pengeluaran hasil bayar tagihan (billLinkId), belum punya deductionOwnerId, bukan tx proyek (itu urusan renovMarkerAudit),
// dan pemiliknya jelas: pemilik tersimpan di tagihan / akun dgn TEPAT 1 pemilik non-SELF; pemilik wajib masih pemilik akun tx. Transaksi biasa (non-tagihan) TIDAK disentuh.
function titipanLamaAudit(){
const bills=new Map();(D.bills||[]).concat(D.billsArchive||[]).forEach(b=>{if(b&&b.id!=null)bills.set(String(b.id),b);});
const out=[];
(D.transactions||[]).forEach(t=>{
if(!t||t.type!=='expense'||t.billLinkId==null||t.billLinkId===''||t.deductionOwnerId||t.renovProjectLinkId)return;
const owners=renovAccountOwners(t.accountId);if(!owners.length)return;
const b=bills.get(String(t.billLinkId));
let o=null;
if(b){const x=billOwnershipOf(Object.assign({},b,{accountId:t.accountId}));if(x.scope==='titipan'&&x.ownerId)o=x;}
else{const ext=owners.filter(q=>q&&!q.isSelf&&q.ownerId&&q.ownerId!=='SELF');if(ext.length===1&&owners.length===1)o={ownerId:String(ext[0].ownerId),ownerName:String(ext[0].ownerName||ext[0].ownerId)};}
if(!o||!owners.some(q=>String(q.ownerId)===String(o.ownerId)))return;
out.push({txId:t.id,ownerId:o.ownerId,ownerName:o.ownerName,amount:Number(t.amount)||0,date:t.date});
});
return out;
}
function titipanLamaRingkas(list){
const l=list||titipanLamaAudit(),m=new Map();let total=0;
l.forEach(x=>{total+=x.amount;const e=m.get(x.ownerId)||{ownerId:x.ownerId,ownerName:x.ownerName,count:0,amount:0};e.count++;e.amount+=x.amount;m.set(x.ownerId,e);});
return{count:l.length,total,owners:Array.from(m.values())};
}
function titipanLamaRepair(){
const list=titipanLamaAudit(),ids=[];
if(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT)return{fixed:0,ids,total:list.length};
list.forEach(x=>{FinanceTxSOT.patchMetaById(x.txId,{deductionOwnerId:x.ownerId});ids.push(x.txId);});
if(ids.length&&typeof save==='function')save();
return{fixed:ids.length,ids,total:list.length};
}
function updateBillOwnershipCard(prefix){
_updateBillOwnershipCardCore(prefix);
const grid=document.getElementById(prefix+'StatGrid');if(!grid||!grid.parentNode)return;
const id=prefix+'TitipanLamaFix';let el=document.getElementById(id);
const r=titipanLamaRingkas();
if(!r.count){if(el)el.remove();return;}
const money=typeof fmt==='function'?fmt:(n=>'Rp '+Math.round(n||0));
if(!el){el=document.createElement('div');el.id=id;el.className='u-fs12 u-t2 u-mb8';const anchor=document.getElementById(prefix+'OwnerSplit')||grid;grid.parentNode.insertBefore(el,anchor.nextSibling);}
el.innerHTML='🔧 '+r.count+' pembayaran tagihan lama ('+money(r.total)+') belum bertanda titipan. <button type="button" class="cn-tab" data-titipan-lama>Periksa &amp; perbaiki</button>';
const btn=el.querySelector('[data-titipan-lama]');
if(btn)btn.addEventListener('click',async()=>{
const cur=titipanLamaRingkas();if(!cur.count)return;
const per=cur.owners.map(o=>o.ownerName+': '+o.count+' transaksi, '+money(o.amount)).join('; ');
const ok=typeof askConfirm==='function'?await askConfirm('Tandai '+cur.count+' pembayaran tagihan lama ('+money(cur.total)+') sebagai titipan? '+per+'. Akibatnya total pengeluaran PRIBADI di Laporan/Hub turun sebesar itu (saldo tidak berubah). Transaksi biasa tidak disentuh.',{okText:'Ya, tandai',icon:'🔧'}):false;
if(!ok)return;
const res=titipanLamaRepair();
if(typeof toast==='function')toast('✅ '+res.fixed+' pembayaran ditandai titipan');
if(typeof refreshBillEverywhere==='function')refreshBillEverywhere();else updateBillOwnershipCard(prefix);
});
}
// billStoredOwnerForPay(b) -> ownerId tersimpan di tagihan NON-proyek bila masih pemilik akun sumber, selain itu '' (perilaku lama).
function billStoredOwnerForPay(b){
if(!b||!b.deductionOwnerId)return '';
const owners=renovAccountOwners(b.accountId||(D.accounts&&D.accounts[0]?D.accounts[0].id:'')||'');
return owners.some(o=>String(o.ownerId)===String(b.deductionOwnerId))?String(b.deductionOwnerId):'';
}
// ===== S2848 — Talangan titipan dari pembayaran tagihan (fase 1) =====
// Tagihan titipan "home in" dibayar dari akun yang TIDAK memuat porsi "home in" (mis. Cash) = uang pemilik app yang keluar -> "home in" berutang.
// Memakai mekanisme talangan Dana Titipan yang SUDAH ada (S519): tx.titipanLinkId + tx.titipanTalangan===true + maybeCreateTitipanTalanganPiutang()
// (piutang 1:1 via autoTxId, idempotent; edit/hapus transaksi sudah menyinkronkan piutang). deductionOwnerId ikut diisi (pola titipan-expense-flow)
// sehingga transaksi keluar dari basis PRIBADI lewat isTxDeductionNonSelfSafe (S2845). Potong porsi (akun memuat pemilik) TIDAK berubah.
// Identitas tidak pernah digabung: satu piutang per pemilik.
function billTalanganOwnerForPay(b){
if(!b||!b.deductionOwnerId)return '';
const sid=String(b.deductionOwnerId);
if(sid==='SELF')return '';
const accId=b.accountId||(D.accounts&&D.accounts[0]?D.accounts[0].id:'')||'';
const owners=renovAccountOwners(accId);
if(owners.some(o=>String(o.ownerId)===sid))return '';// pemilik punya porsi di akun sumber = potong porsi, bukan talangan
if(typeof resolveTxTitipanOwner!=='function'||!resolveTxTitipanOwner(sid))return '';// pemilik tak dikenal Dana Titipan: perilaku lama (tanpa piutang hantu)
return sid;
}
// Field transaksi pembayaran untuk talangan ({} bila bukan talangan). Dipanggil markBillPaid hanya untuk tagihan non-proyek tanpa pemilik porsi.
function billTalanganPayMeta(b){
const o=billTalanganOwnerForPay(b);
return o?{titipanLinkId:o,titipanTalangan:true,deductionOwnerId:o}:null;
}
// S2850 item 1 — tagihan tertaut Proyek Renovasi NON-klien: pemilik tersimpan di tagihan dihormati. Sebelumnya resolveRenovBillOwner memilih pemilik
// AKUN sumber (SELF) dan membuang "home in" -> pembayaran Cash/Gopay masuk pengeluaran pribadi tanpa piutang. Kini bila pemilik tersimpan bukan pemilik akun
// sumber = talangan (meta S2848, tanpa dialog pemilik) dan pembayaran TETAP tertaut ke item proyek (applyRenovBillPayment). Proyek dana==='klien' tetap
// perilaku lama (dialog pemilik + sumberDana klien) agar tidak dobel dengan piutang talangan-tagih (renovPaymentId). Return meta atau null.
function billRenovTalanganMeta(b,p){
if(!b||!p||p.dana==='klien')return null;
return billTalanganPayMeta(b);
}
// Buat piutang talangan untuk transaksi pembayaran yang sudah dibuat. Idempotent (autoTxId). Return baris piutang atau null.
function billEnsureTalanganPiutang(txId){
if(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT||typeof maybeCreateTitipanTalanganPiutang!=='function')return null;
const tx=FinanceTxSOT.findById(txId);
if(!tx||tx.titipanTalangan!==true||!tx.titipanLinkId)return null;
maybeCreateTitipanTalanganPiutang(tx);
return (D.piutang||[]).find(p=>p&&p.autoTxId===tx.id)||null;
}
// Teks tambahan toast bayar ("Dicatat sebagai talangan ke home in Rp212.000"); '' bila pembayaran ini bukan talangan.
function billTalanganNote(txId){
const p=(D.piutang||[]).find(x=>x&&x.autoTxId===txId&&x.autoTitipanOwnerId);
if(!p)return '';
const own=(typeof resolveTxTitipanOwner==='function'&&resolveTxTitipanOwner(p.autoTitipanOwnerId))||null;
const money=typeof fmtFull==='function'?fmtFull:(typeof fmt==='function'?fmt:(n=>'Rp '+Math.round(n||0)));
return ' · 🤝 Dicatat sebagai talangan ke '+((own&&own.ownerName)||'pemilik titipan')+' '+money(p.nilai);
}
// ===== S2848 fase 3-4 — pelunasan talangan (non-pribadi) + tampilan =====
// talanganBelumDiganti() -> {total, owners:[{ownerId,ownerName,amount,count}]}: piutang talangan titipan (autoTxId + autoTitipanOwnerId) yang belum lunas, per pemilik (tidak digabung).
function talanganBelumDiganti(){
const out={total:0,owners:[]},map=new Map();
(D.piutang||[]).forEach(p=>{
if(!p||p.lunas||p.autoTxId==null||!p.autoTitipanOwnerId)return;
const amt=Number(p.nilai)||0;if(!(amt>0))return;
out.total+=amt;
const k=String(p.autoTitipanOwnerId);
if(!map.has(k)){const r=(typeof resolveTxTitipanOwner==='function'&&resolveTxTitipanOwner(k))||null;map.set(k,{ownerId:k,ownerName:(r&&r.ownerName)||k,amount:0,count:0});}
const e=map.get(k);e.amount+=amt;e.count++;
});
out.owners=Array.from(map.values()).sort((a,b)=>b.amount-a.amount);
return out;
}
// Pelunasan: pemilik mengganti talangan -> kas naik, piutang turun (netral di kekayaan bersih). Pemasukan ini BUKAN pendapatan pribadi
// (talanganPelunasanOwnerId dikecualikan oleh isAliranKlienSafe). Masuk ke akun yang sama dengan transaksi talangan. Return txId atau null.
function talanganPayoffCreate(p,nilai,tgl){
if(!p||p.autoTxId==null||!p.autoTitipanOwnerId||typeof FinanceTxSOT==='undefined'||!FinanceTxSOT)return null;
const orig=FinanceTxSOT.findById(p.autoTxId);
if(!orig||!orig.accountId)return null;
const n=Math.round(Number(nilai==null?p.nilai:nilai));if(!(n>0))return null;
if(typeof FinanceCategorySOT!=='undefined'&&FinanceCategorySOT&&typeof FinanceCategorySOT.ensureCategory==='function')FinanceCategorySOT.ensureCategory('income',{name:'Piutang',emoji:'🤝'});// taksonomi pemasukan tidak selalu punya 'Piutang' (backup lama)
const tx={id:uid(),type:'income',amount:n,category:'Piutang',subcategory:'',accountId:orig.accountId,payMethod:'tunai',note:'Talangan diganti: '+(p.name||'titipan'),date:(typeof tgl==='string'&&/^\d{4}-\d{2}-\d{2}/.test(tgl))?tgl.slice(0,10):todayStr()};
FinanceTxSOT.create(tx);
FinanceTxSOT.patchMetaById(tx.id,{talanganPelunasanOwnerId:String(p.autoTitipanOwnerId),talanganPiutangId:p.id});
return tx.id;
}
// Dibuka lagi (Lunas -> Belum Lunas): pemasukan pelunasan dibatalkan supaya kas tidak dobel.
function talanganPayoffReverse(p){
if(!p||!p.linkedPayoffTxId||typeof FinanceTxSOT==='undefined'||!FinanceTxSOT)return false;
const t=FinanceTxSOT.findById(p.linkedPayoffTxId);
if(!t||!t.talanganPelunasanOwnerId)return false;
return !!FinanceTxSOT.removeById(p.linkedPayoffTxId);
}
// S2849 — pelunasan SEBAGIAN talangan. Piutang.nilai = SISA. Nilai turun (tanpa lunas) + dicatat sebagai pelunasan = pemasukan non-pribadi sebesar selisih
// (talanganPayoffCreate, bertanda talanganPiutangId). Pelunasan akhir = pemasukan sebesar sisa (linkedPayoffTxId). Pelunasan lain dicari lewat tx: tanpa field baru di piutang.
function talanganPartialTxs(p){
if(!p||typeof FinanceTxSOT==='undefined'||!FinanceTxSOT)return [];
return (D.transactions||[]).filter(t=>t&&t.type==='income'&&t.talanganPelunasanOwnerId&&t.talanganPiutangId!=null&&sameId(t.talanganPiutangId,p.id)&&!(p.linkedPayoffTxId!=null&&sameId(p.linkedPayoffTxId,t.id)));
}
// Edit transaksi talangan lewat cabang tagihan/cicilan/langganan (return awal) -> sinkronkan sisa piutang sebesar selisih nominal.
function talanganSyncOnTxEdit(tx,oldAmt){
const base=_talEditBase&&tx&&_talEditBase.id===tx.id?_talEditBase:null;_talEditBase=null;
if(base){try{talanganSyncOnAccountChange(tx,base.acc,base.own);}catch(e){console.warn('[talangan] sinkron pindah akun gagal',e);}billRenovPaymentSyncOnEdit(tx);}
if(!tx||tx.titipanTalangan!==true||!tx.titipanLinkId||typeof syncTitipanTalanganPiutangOnEdit!=='function')return false;
const n=Number(tx.amount)||0,o=Number(oldAmt)||0;
if(n===o)return false;
return syncTitipanTalanganPiutangOnEdit(tx.id,o,n);
}
// S2851 — dasar edit: akun asal transaksi dicatat SEBELUM Object.assign di _saveTxInner; dibaca talanganSyncOnTxEdit (cabang tagihan/cicilan/langganan).
let _talEditBase=null;
function talanganRememberEditBase(tx){_talEditBase=tx?{id:tx.id,acc:tx.accountId,own:tx.deductionOwnerId}:null;}
// Cabang edit umum (bukan utang/cicilan/langganan): tanda pemilik pembayaran tagihan dipertahankan; sinkron pindah akun dijalankan setelahnya.
function talanganKeepsOwnerOnEdit(tx){return !!(tx&&tx.billLinkId&&_talEditBase&&_talEditBase.id===tx.id&&_talEditBase.own&&String(_talEditBase.own)!=='SELF');}
function talanganAfterGenericEdit(tx){
const base=_talEditBase&&tx&&_talEditBase.id===tx.id?_talEditBase:null;
if(!base)return null;
_talEditBase=null;
try{return talanganSyncOnAccountChange(tx,base.acc,base.own);}catch(e){console.warn('[talangan] sinkron pindah akun gagal',e);return null;}
}
// S2852 — edit lewat modal (cabang umum _saveTxInner) dulu SELALU melepas billLinkId. Kini tautan ke tagihan dipertahankan bila tagihan masih ada
// (aktif atau arsip lunas), transaksi tetap pengeluaran, dan pengguna tidak sengaja mengganti Cara Bayar (touched=false). Ganti Cara Bayar / ubah jadi
// pemasukan / tagihan sudah tak ada = lepas tautan (perilaku lama). Cabang tagihan/utang/cicilan/langganan aktif sudah mempertahankan tautan sendiri.
function billLinkKeepOnGenericEdit(tx,payMethodTouched){
if(!tx||tx.billLinkId==null||payMethodTouched||tx.type!=='expense')return false;
const has=(arr)=>Array.isArray(arr)&&arr.some(b=>b&&sameId(b.id,tx.billLinkId));
return has(D.bills)||has(D.billsArchive);
}
function talanganOwnerHasShare(ownerId,accId){return renovAccountOwners(accId).some(o=>String(o.ownerId)===String(ownerId));}
// Pindah akun sumber pada pembayaran tagihan titipan: talangan <-> potong porsi mengikuti porsi pemilik di akun BARU.
// - Talangan dipindah ke akun yang memuat porsi pemilik -> bukan talangan lagi: piutang belum lunas dihapus, penanda talangan dilepas (deductionOwnerId tetap = tidak pribadi).
//   Bila piutang sudah lunas / sudah ada pelunasan sebagian -> TIDAK diubah (pemasukan pelunasan tidak dihapus diam-diam), pengguna diberi tahu.
// - Potong porsi dipindah ke akun tanpa porsi pemilik -> menjadi talangan (penanda + piutang otomatis).
// Hanya pembayaran tagihan (billLinkId) bertanda pemilik non-SELF yang dikenal Dana Titipan. Return 'toTalangan'|'toPorsi'|'kept'|null.
function talanganSyncOnAccountChange(tx,oldAcc,oldOwner){
if(!tx||tx.type!=='expense'||String(oldAcc||'')===String(tx.accountId||'')||typeof FinanceTxSOT==='undefined'||!FinanceTxSOT)return null;
// Arah talangan -> potong porsi cukup berpegang pada penanda talangan (edit lewat modal bisa melepas billLinkId lebih dulu); arah sebaliknya tetap butuh billLinkId.
if(tx.titipanTalangan===true&&tx.titipanLinkId){
if(!talanganOwnerHasShare(tx.titipanLinkId,tx.accountId))return null;
const pi=(D.piutang||[]).find(x=>x&&x.autoTxId===tx.id);
if(pi&&(pi.lunas||talanganPartialTxs(pi).length>0)){if(typeof toast==='function')toast('⚠️ Akun baru memuat porsi pemilik, tetapi piutang talangan sudah ada pelunasan — dibiarkan sebagai talangan. Tinjau di Buku Piutang.',6500);return 'kept';}
if(typeof removeUnpaidTitipanTalanganPiutangForTx==='function')removeUnpaidTitipanTalanganPiutangForTx(tx.id);
FinanceTxSOT.patchMetaById(tx.id,{titipanTalangan:undefined,titipanLinkId:undefined});
if(typeof toast==='function')toast('ℹ️ Akun baru memuat porsi pemilik: bukan talangan lagi, piutang talangan dibatalkan',4500);
return 'toPorsi';
}
if(!tx.billLinkId)return null;
const own=(tx.deductionOwnerId||oldOwner)?String(tx.deductionOwnerId||oldOwner):'';// form edit bisa menghapus deductionOwnerId lebih dulu -> pakai nilai sebelum edit
if(!own||own==='SELF'||tx.titipanLinkId||typeof resolveTxTitipanOwner!=='function'||!resolveTxTitipanOwner(own))return null;
if(talanganOwnerHasShare(own,tx.accountId))return null;
FinanceTxSOT.patchMetaById(tx.id,{titipanLinkId:own,titipanTalangan:true,deductionOwnerId:own});
billEnsureTalanganPiutang(tx.id);
if(typeof toast==='function')toast('ℹ️ Akun baru tanpa porsi pemilik: dicatat sebagai talangan'+billTalanganNote(tx.id),5000);
return 'toTalangan';
}
// Muat modul Renovasi (lazy, boot-early.js) bila transaksi bertaut proyek dan Renov belum ada. Tanpa ini cascade hapus/edit di Keuangan
// (guard typeof Renov) lolos diam-diam dan meninggalkan payment yatim di item proyek. Return true bila siap / tidak perlu.
function renovTxNeedsModule(t){return !!(t&&(t.renovItemLinkId||t.renovPaymentId!=null||t.renovDpProjectId!=null||t.renovRefundProjectId!=null));}
async function renovEnsureForTx(t){
if(!renovTxNeedsModule(t)||typeof Renov!=='undefined')return true;
if(typeof ensureRenov!=='function')return false;
try{await ensureRenov();}catch(e){console.warn('[Renov] gagal memuat modul untuk sinkron transaksi',e);return false;}
return typeof Renov!=='undefined';
}
// Cabang tagihan/cicilan/langganan di _saveTxInner kembali sebelum Renov.onLinkedTxEdited -> payment item proyek basi (nominal/tanggal/akun). Sinkronkan di sini.
function billRenovPaymentSyncOnEdit(tx){
if(!tx||!tx.renovItemLinkId||typeof Renov==='undefined'||!Renov||typeof Renov.onLinkedTxEdited!=='function')return false;
Renov.onLinkedTxEdited(tx);return true;
}
function talanganIsPiutang(p){return !!(p&&p.autoTxId!=null&&p.autoTitipanOwnerId);}
// Transaksi pemasukan pelunasan dihapus langsung -> piutang menyesuaikan (tak ada pemasukan hilang diam-diam / piutang lunas tanpa kas).
// Akhir dihapus -> piutang dibuka lagi (sisa tetap). Sebagian dihapus -> sisa bertambah; bila piutang sudah lunas, dibuka lagi dengan sisa = nilai sebagian itu (pelunasan akhir lama menjadi riwayat).
function talanganPayoffTxDeleted(t){
if(!t||t.type!=='income'||!t.talanganPelunasanOwnerId||t.talanganPiutangId==null||!Array.isArray(D.piutang))return false;
const p=D.piutang.find(x=>x&&sameId(x.id,t.talanganPiutangId));
if(!p||!talanganIsPiutang(p))return false;
const isFinal=p.linkedPayoffTxId!=null&&sameId(p.linkedPayoffTxId,t.id);
const amt=Math.max(0,Math.round(Number(t.amount)||0));
BillDebtPiutangCanonicalWriter.updateById('piutang',p.id,p0=>{
if(isFinal){p0.lunas=false;p0.linkedPayoffTxId=null;}
else if(p0.lunas){p0.lunas=false;p0.linkedPayoffTxId=null;p0.nilai=amt;}
else p0.nilai=Math.max(0,Math.round(Number(p0.nilai)||0))+amt;
});
return true;
}
