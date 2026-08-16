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
//
// BUGFIX (audit sesi ini, laporan user): waktu checkbox "📦 Tambah ke Stok
// Sparepart juga?" (txStockPanel) DAN "🔧 Sinkron ke Catatan Servis juga?"
// (txServisPanel) dicentang BERSAMAAN dalam 1 transaksi (beli part sekaligus
// langsung dipasang) -- yang memang didesain boleh aktif bareng, lihat
// catatan updateTxVehiclePanels() (transaksi.js) soal "efek stok net" -- baris
// D.servisLogs yang dibuat recordServisLog() di bawah SEBELUMNYA SELALU
// hardcode usedPartId:null/usedPartQty:0, TIDAK PERNAH ditautkan ke part yang
// baru saja dibeli (tx.partStockId/tx.partStockQty, ditulis
// applyTxStockFromTx() di tx-stok-sparepart.js TEPAT SEBELUM fungsi ini
// dipanggil di _saveTxInner()). Akibatnya:
//  1) "Stok Masuk" sinkron dengan benar (D.partsStock nambah), TAPI catatan
//     Servis yang memakai stok itu TIDAK ikut tersinkron -- usedPartId-nya
//     kosong selamanya walau secara logika part itu jelas "dibeli & dipakai"
//     di transaksi yang sama, dan "efek stok net" yang disebut komentar di
//     transaksi.js TIDAK PERNAH benar-benar terjadi (stok jadi kelebihan
//     dobel: nambah dari pembelian, TIDAK berkurang dari pemakaian).
//  2) Begitu transaksi ini dibuka lagi lewat "✏️ Edit Detail Servis" (modal
//     Servis di car-notes.js, openModal(editId) -> Servis.populatePartSelect
//     (s.usedPartId)) -- field "Gunakan Stok Sparepart" SELALU tampil kosong
//     ("Tidak pakai stok") walau baris Servis itu SUDAH ADA & riwayatnya
//     kelihatan normal di tab Servis Car Notes (item/tanggal/biaya-nya utuh,
//     cuma detail part-nya yang hilang) -- persis laporan user "tab servis
//     kosong padahal sudah diisi, tapi di tab servis carnotes muncul
//     riwayatnya".
// Fix: recordServisLog() sekarang menerima purchasedPartId/purchasedPartQty
// (dibaca applyTxServisFromTx() dari tx.partStockId/tx.partStockQty) & baris
// D.servisLogs otomatis ditautkan (usedPartId/usedPartQty) + stok yang baru
// ditambah dipotong balik sejumlah yang sama lewat _servisAutoLinkAdjustStock()
// -- net stok = 0 kalau part dibeli & langsung dipasang di transaksi yang
// sama, PERSIS niat awal comment "efek stok net" di transaksi.js. Field
// `autoLinkedPartStock:true` dipakai sbg penanda "usedPartId ini diisi
// otomatis dari sinkron pembelian di transaksi ini", supaya kalau user
// SUDAH pernah ganti manual part yang dipakai lewat "✏️ Edit Detail Servis"
// (usedPartId beda dari hasil auto-link / autoLinkedPartStock jadi false di
// sana), sinkron dari sisi Transaksi berikutnya TIDAK menimpa pilihan manual
// itu -- lihat _syncServisUsedPartFromPurchase() di bawah.
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
// _servisAutoLinkAdjustStock(partId,deltaQty) — helper murni (baca/tulis
// D.partsStock saja, TIDAK memanggil save()), dipakai _syncServisUsedPartFromPurchase()
// di bawah utk memotong/mengembalikan stok akibat auto-link usedPartId.
// deltaQty NEGATIF = part dipakai (stok berkurang), POSITIF = lepas
// pemakaian lama (stok dikembalikan). Sengaja TIDAK lewat
// Servis.applyStockUsage() (async, bisa munculkan konfirmasi "stok kurang")
// karena qty yang dipotong di sini SELALU persis qty yang BARU SAJA
// ditambah applyStockPurchase() beberapa baris sebelumnya di alur yang sama
// (_saveTxInner -> applyTxStockFromTx -> applyTxServisFromTx), jadi stok
// dijamin cukup & tidak perlu tanya konfirmasi ke user.
function _servisAutoLinkAdjustStock(partId,deltaQty){
if(!partId||!deltaQty)return;
const p=(D.partsStock||[]).find(x=>x.id===partId);
if(!p)return;
p.qty=(p.qty||0)+deltaQty;
}
// _syncServisUsedPartFromPurchase(log,purchasedPartId,purchasedPartQty) —
// satu titik tunggal yang menjaga usedPartId/usedPartQty 1 baris D.servisLogs
// tetap konsisten dengan part yang dibeli (tx.partStockId/tx.partStockQty)
// di transaksi Keuangan yang sama, dipanggil baik saat baris Servis baru
// dibuat maupun saat di-update ulang (edit transaksi). Aman dipanggil
// berkali-kali (idempotent): kalau part/qty pembelian tidak berubah,
// lepas-lalu-pasang-lagi dengan angka yang sama = no-op net stok.
function _syncServisUsedPartFromPurchase(log,purchasedPartId,purchasedPartQty){
const wasAuto=!!log.autoLinkedPartStock;
if(wasAuto){
// Lepas dulu pemakaian LAMA yang auto-linked dari sinkron ini sebelumnya
// (kembalikan stok yang sebelumnya dipotong), supaya ganti part/qty
// pembelian saat edit tidak dobel-potong ATAU meninggalkan potongan basi
// dari part/qty yang sudah tidak relevan lagi.
_servisAutoLinkAdjustStock(log.usedPartId,log.usedPartQty||0);
log.usedPartId=null;log.usedPartQty=0;log.autoLinkedPartStock=false;
} else if(log.usedPartId){
// Baris ini punya usedPartId yang DIPILIH MANUAL oleh user lewat "✏️ Edit
// Detail Servis" (modal Servis asli, car-notes.js) -- BUKAN hasil
// auto-link sinkron ini. Jangan disentuh sama sekali, hormati pilihan
// manual itu apa adanya.
return;
}
if(!purchasedPartId||!(purchasedPartQty>0))return;
log.usedPartId=purchasedPartId;
log.usedPartQty=purchasedPartQty;
log.autoLinkedPartStock=true;
_servisAutoLinkAdjustStock(purchasedPartId,-purchasedPartQty);
}
// recordServisLog(opts) — satu titik tunggal bikin/update 1 baris D.servisLogs
// dari sisi Transaksi Keuangan. Pola PERSIS recordBbmLog() (tx-bbm.js): TIDAK
// pernah push ke D.transactions (tx-nya sudah ada, dikelola _saveTxInner()),
// cuma push/Object.assign ke D.servisLogs & set opts.tx.servisLinkId begitu
// baris baru dibuat (existingServisId null) supaya link 2 arah langsung utuh
// sejak baris pertama (sama seperti Servis._saveInner() lakukan dari sisi
// sana). Dipanggil dari applyTxServisFromTx() di bawah.
// opts.purchasedPartId/opts.purchasedPartQty (BARU, opsional) — part+qty yang
// baru saja dibeli via panel "Tambah ke Stok Sparepart" di transaksi yang
// sama (lihat catatan bugfix di atas berkas ini), diteruskan ke
// _syncServisUsedPartFromPurchase() supaya usedPartId/usedPartQty baris ini
// otomatis tertaut & net efek stoknya benar.
function recordServisLog(opts){
if(opts.existingServisId){
const s=(D.servisLogs||[]).find(x=>x.id===opts.existingServisId);
if(s){
Object.assign(s,{date:opts.date,item:opts.item,km:opts.km,cost:opts.cost,note:opts.note,accountId:opts.accountId,vehicleId:opts.vehicleId||s.vehicleId});
_syncServisUsedPartFromPurchase(s,opts.purchasedPartId,opts.purchasedPartQty);
return s.id;
}
}
const servisId=uid();
const log={id:servisId,vehicleId:opts.vehicleId,date:opts.date,item:opts.item,categoryId:null,km:opts.km,cost:opts.cost,note:opts.note,accountId:opts.accountId,txLinkId:opts.txId,usedPartId:null,usedPartQty:0,catalogPartId:null,catalogPartQty:0,catalogPartOemCode:'',catalogPartLinkedStockId:null,autoLinkedPartStock:false};
D.servisLogs.push(log);
_syncServisUsedPartFromPurchase(log,opts.purchasedPartId,opts.purchasedPartQty);
return servisId;
}
// applyTxServisFromTx(txId,amt,date,accId,note,tx,existingTx) — dipanggil dari
// _saveTxInner() (transaksi.js), pola sejajar applyTxBbmFromTx()/
// applyTxStockFromTx(). `tx` = objek transaksi yang baru saja dibuat/diedit
// (newTx atau existingTx) -- servisLinkId ditulis balik ke situ begitu baris
// D.servisLogs baru berhasil dibuat, biar tombol "✏️ Edit Detail Servis" di
// editTx() langsung kelihatan tanpa perlu tutup-buka modal dulu.
// Dipanggil SETELAH applyTxStockFromTx() (tx-stok-sparepart.js) di
// _saveTxInner(), jadi tx.partStockId/tx.partStockQty (kalau ada, dari
// checkbox "Tambah ke Stok Sparepart" di transaksi yang sama) SUDAH terisi
// & siap dibaca di sini utk auto-link usedPartId (lihat catatan bugfix di
// atas berkas ini).
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
const purchasedPartId=(tx&&tx.partStockId)?tx.partStockId:null;
const purchasedPartQty=purchasedPartId?(tx.partStockQty||0):0;
const servisId=recordServisLog({existingServisId,vehicleId,date,item,km,cost:amt,note,accountId:accId,txId,purchasedPartId,purchasedPartQty});
if(tx)tx.servisLinkId=servisId;
if(typeof Sparepart!=='undefined'&&Sparepart.renderStockList)Sparepart.renderStockList();
if(typeof Sparepart!=='undefined'&&Sparepart.renderCatList)Sparepart.renderCatList();
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
