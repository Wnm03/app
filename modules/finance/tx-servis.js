// tx-servis.js — logika panel "Sinkron ke Catatan Servis juga?" pada txModal
// (Tambah/Edit Transaksi Keuangan). Dipisah dari transaksi.js (Sesi ini,
// "sync sparepart -> servis"), pola SAMA PERSIS tx-bbm.js (populateTxBbmVehicleSelect/
// toggleTxBbmFields/applyTxBbmFromTx): panel Transaksi cuma bikin D.servisLogs
// yang TERTAUT ke transaksi yang SUDAH ADA (txId), TIDAK bikin transaksi baru
// -- beda arah dari Servis._saveInner (car-notes.js) yang justru transaksi-nya
// yang dibuat dari situ. Kedua arah tetap saling kompatibel karena SAMA-SAMA
// memakai field `servisLinkId` (di D.transactions) <-> `txLinkId` (di
// D.servisLogs) -- lihat catatan existingTx.servisLinkId di _saveTxInner()
// (transaksi.js) yang SUDAH lebih dulu menyinkronkan cost/date/accountId utk
// tx yang dibuat lewat Servis, sebelum sesi ini ada.
// "Tab edit servisnya" (permintaan user): tombol "✏️ Edit Detail Servis" di
// modal Transaksi (lihat editTx() di transaksi.js) yang muncul begitu
// tx.servisLinkId ada -- reuse 100% modal Servis yang sudah ada
// (Servis.openModal(servisId)), TIDAK ada modal/UI edit baru.
function populateTxServisVehicleSelect(){
const sel=document.getElementById('txServisVehicle');
if(!sel)return;
const cur=sel.value;
sel.innerHTML=(D.vehicles||[]).map(v=>`<option value="${v.id}">${v.emoji||'🏍️'} ${escapeHtml(v.name)}</option>`).join('');
const fallback=(typeof curVehicleId!=='undefined'&&curVehicleId&&D.vehicles.some(v=>v.id===curVehicleId))?curVehicleId:(D.vehicles[0]&&D.vehicles[0].id);
sel.value=cur&&D.vehicles.some(v=>v.id===cur)?cur:(fallback||'');
}
function toggleTxServisFields(){
const chk=document.getElementById('txSyncServis');
const fields=document.getElementById('txServisFields');
if(!chk||!fields)return;
fields.style.display=chk.checked?'block':'none';
if(chk.checked)populateTxServisVehicleSelect();
}
// recordServisLog(opts) — satu titik tunggal bikin/update 1 baris D.servisLogs
// dari sisi Transaksi Keuangan. Pola PERSIS recordBbmLog() (tx-bbm.js): TIDAK
// pernah push ke D.transactions (tx-nya sudah ada, dikelola _saveTxInner()),
// cuma push/Object.assign ke D.servisLogs & set opts.tx.servisLinkId begitu
// baris baru dibuat (existingServisId null) supaya link 2 arah langsung utuh
// sejak baris pertama (sama seperti Servis._saveInner() lakukan dari sisi
// sana). Dipanggil dari applyTxServisFromTx() di bawah.
function recordServisLog(opts){
if(opts.existingServisId){
const s=(D.servisLogs||[]).find(x=>x.id===opts.existingServisId);
if(s){
Object.assign(s,{date:opts.date,item:opts.item,km:opts.km,cost:opts.cost,note:opts.note,accountId:opts.accountId,vehicleId:opts.vehicleId||s.vehicleId});
return s.id;
}
}
const servisId=uid();
D.servisLogs.push({id:servisId,vehicleId:opts.vehicleId,date:opts.date,item:opts.item,categoryId:null,km:opts.km,cost:opts.cost,note:opts.note,accountId:opts.accountId,txLinkId:opts.txId,usedPartId:null,usedPartQty:0,catalogPartId:null,catalogPartQty:0,catalogPartOemCode:'',catalogPartLinkedStockId:null});
return servisId;
}
// applyTxServisFromTx(txId,amt,date,accId,note,tx,existingTx) — dipanggil dari
// _saveTxInner() (transaksi.js), pola sejajar applyTxBbmFromTx()/
// applyTxStockFromTx(). `tx` = objek transaksi yang baru saja dibuat/diedit
// (newTx atau existingTx) -- servisLinkId ditulis balik ke situ begitu baris
// D.servisLogs baru berhasil dibuat, biar tombol "✏️ Edit Detail Servis" di
// editTx() langsung kelihatan tanpa perlu tutup-buka modal dulu.
function applyTxServisFromTx(txId,amt,date,accId,note,tx,existingTx){
const chk=document.getElementById('txSyncServis');
if(!chk||!chk.checked)return;
const panel=document.getElementById('txServisPanel');
if(!panel||panel.style.display==='none')return;
const vehicleId=document.getElementById('txServisVehicle').value;
const item=document.getElementById('txServisItem').value.trim();
const km=parseFloat(document.getElementById('txServisKm').value)||null;
if(!vehicleId){toast('⚠️ Pilih kendaraan dulu utk sinkron ke Servis');return;}
if(!item){toast('⚠️ Isi Jenis Servis/Item dulu utk sinkron ke Servis');return;}
const existingServisId=(existingTx&&existingTx.servisLinkId)?existingTx.servisLinkId:null;
const servisId=recordServisLog({existingServisId,vehicleId,date,item,km,cost:amt,note,accountId:accId,txId});
if(tx)tx.servisLinkId=servisId;
if(typeof Sparepart!=='undefined'&&Sparepart.renderStockList)Sparepart.renderStockList();
if(typeof renderCnTab==='function')renderCnTab();
toast(existingServisId?'✅ Catatan Servis tertaut ikut diperbarui':'🔧 Catatan Servis dibuat & tertaut ke transaksi ini');
}
// openTxLinkedServisModal() — tombol "✏️ Edit Detail Servis" di modal Edit
// Transaksi (lihat editTx() di transaksi.js utk logic tampil/sembunyi
// tombolnya). Reuse 100% Servis.openModal() (car-notes.js) apa adanya --
// TIDAK ada modal/field edit baru di sini, cuma jembatan dari txEditId ke
// servisLinkId-nya. txModal ditutup dulu supaya servisModal (yang statusnya
// stacked overlay biasa) tidak numpuk di atas txModal yang masih terbuka.
function openTxLinkedServisModal(){
const t=(D.transactions||[]).find(x=>x.id===txEditId);
if(!t||!t.servisLinkId){toast('⚠️ Transaksi ini belum tertaut ke catatan Servis');return;}
const s=(D.servisLogs||[]).find(x=>x.id===t.servisLinkId);
if(!s){toast('⚠️ Catatan Servis tertaut sudah tidak ditemukan (mungkin sudah dihapus)');return;}
closeModal('txModal');
if(typeof Servis!=='undefined'&&Servis.openModal)Servis.openModal(s.id);
}
