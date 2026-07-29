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
//    transaksi Keuangan tersimpan.
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
sel.innerHTML=D.renovProjects.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
if(cur&&D.renovProjects.find(p=>p.id===cur))sel.value=cur;
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
}
// applyTxRenovFromTx(note,txId,date,amt,cat,accId) -- dipanggil SETELAH
// transaksi Keuangan tersimpan (persis titik yg sama dgn applyTxStockFromTx
// dkk di _saveTxInner), khusus utk status "✅ Sudah Dibeli". Kalau status
// "🛒 Belum Dibeli", sudah ditangani lebih awal oleh
// handleTxRenovBelumDibeli() (yg early-return sblm transaksi dibuat sama
// sekali) -- jadi di sini cukup early-return supaya tidak dobel proses.
function applyTxRenovFromTx(note,txId,date,amt,cat,accId){
const chk=document.getElementById('txAddRenov');
if(!chk||!chk.checked)return;
const panel=document.getElementById('txRenovPanel');
if(!panel||panel.style.display==='none')return;
if(_txRenovStatus==='belum')return;
const projId=document.getElementById('txRenovProject').value;
const p=projId?D.renovProjects.find(x=>x.id===projId):null;
if(!p){toast('⚠️ Pilih dulu Proyek Renovasi-nya (item tidak dicatat ke Renovasi, transaksi Keuangan tetap tersimpan)');return;}
const itemName=(note||cat||'Item Renovasi').trim()||'Item Renovasi';
const it={id:uid(),name:itemName,ukuran:'',harga:amt,hargaTotal:null,category:cat,accountId:accId,note:'',tglBayar:date,calcDetail:null,paid:true,txId:txId,paidDate:date};
p.items.push(it);
const t=D.transactions.find(x=>x.id===txId);
if(t){t.renovProjectLinkId=p.id;t.renovItemLinkId=it.id;}
save();
if(typeof Renov!=='undefined'){
Renov.render();
if(sameId(Renov.curId,p.id))Renov.renderDetail();
}
toast(`🔨 Item "${escapeHtml(itemName)}" otomatis dicatat & lunas di proyek "${escapeHtml(p.name)}"`);
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
const projId=document.getElementById('txRenovProject').value;
const p=projId?D.renovProjects.find(x=>x.id===projId):null;
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
toast(`🛒 Item "${escapeHtml(itemName)}" masuk daftar belanja proyek "${escapeHtml(p.name)}" (belum lunas) — transaksi Keuangan TIDAK dicatat`);
return true;
}
