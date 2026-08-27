// tx-stok-sparepart.js — logika panel "Tambah ke Stok Sparepart juga?" pada
// Dipindah ke modules/finance/tx-stok-sparepart.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// txModal (Tambah/Edit Transaksi Keuangan). Dipisah dari transaksi.js
// (2026-07-11, lihat CLAUDE.md catatan kerja "split transaksi.js" bagian
// ke-7) murni sebagai pengelompokan ulang file, BUKAN perubahan perilaku.
// Semua fungsi di sini tetap global karena dipanggil dari:
//  - transaksi.js sendiri (updateTxVehiclePanels, _saveTxInner)
//  - HTML lewat atribut onchange di modals.js (mis. txStockItem pakai
//    onchange="onTxStockItemChange()")
//  - scan-ocr.js (auto-centang & isi panel stok saat hasil scan struk
//    terdeteksi sparepart)
// _genId() — BUGFIX (audit backup, temuan user): id partsStock/sparepartCats
// hasil sync katalog dulu pakai 'st_'/'sp_'+Date.now() MENTAH -- kalau
// syncPartsStockFromCatalog() dipanggil banyak kali dlm loop sinkron
// (syncUnlinkedCatalogPartsToStock() saat bulk-import katalog/Honda PDF
// Import), banyak record ke-generate di milidetik yg sama -> id TABRAKAN
// (temuan nyata: 292/296 baris partsStock berbagi cuma 40 id unik di 1
// backup produksi). Fix: reuse uid() (SOT anti-tabrakan app, monotonic via
// _lastUid, sudah dipakai di tempat lain) kalau tersedia; fallback ke
// counter lokal monotonic (pola sama uid()) kalau file ini di-load berdiri
// sendiri (mis. test unit lewat loadSource() yg tidak inject uid()) -- 0
// regresi utk pemanggil lama, TIDAK ada lagi Date.now() mentah dipakai jadi id.
let _genIdLocalLast = 0;
function _genId(){
if(typeof uid==='function')return uid();
let n=Date.now();
if(n<=_genIdLocalLast)n=_genIdLocalLast+1;
_genIdLocalLast=n;
return n;
}
// revertStockPurchase(partId,qty,txId) — Tahap 8B, DIPERBAIKI sesi Bug C
// (audit lanjutan s625): kebalikan applyStockPurchase(), dipakai saat
// transaksi Keuangan yang menambah stok Inventaris DIEDIT (checkbox
// dimatikan/qty-harga diganti) atau DIHAPUS.
//
// SEBELUM PERBAIKAN: fungsi ini cuma p.qty-=qty, TIDAK PERNAH menyentuh
// avgPrice/price/priceHistory/txRefs/lastTxId -- akibatnya setiap kali
// pembelian sparepart di-EDIT/DIHAPUS, avgPrice jadi basi (masih menghitung
// pembelian yang sudah tidak ada lagi) & priceHistory/txRefs numpuk entry
// orphan yang txId-nya sudah tidak ada di D.transactions -- ini juga ikut
// membuat "Total Pembelian Sparepart" (Sparepart.calcFinanceStats(), jumlah
// SEMUA priceHistory tanpa syarat) jadi lebih besar dari kenyataan.
//
// SUMBER KEBENARAN: qty tetap murni akumulatif (dikurangi persis argumen
// `qty` yg dikirim, TIDAK berubah -- pemakaian stok via revertStockUsage()
// di car-notes.js sama sekali tidak menyentuh priceHistory jadi aman
// dicampur). avgPrice TIDAK bisa direkonstruksi total dari nol dari
// priceHistory saja (ada kemungkinan "stok awal" qty+harga manual yang
// dibuat sebelum ada pembelian tercatat, tidak pernah masuk priceHistory)
// -- karena itu applyStockPurchase() di bawah (mulai sesi ini) menyimpan
// SNAPSHOT `qtyBefore`/`avgPriceBefore` (state PERSIS sebelum pembelian itu
// diterapkan) di tiap entry priceHistory baru. Revert lalu tinggal: hapus
// entry priceHistory milik txId ybs, lalu REPLAY MAJU entry-entry
// SESUDAHNYA (urutan array priceHistory = urutan kejadian pembelian, tidak
// tergantung urutan pemanggilan revert/reapply) mulai dari snapshot
// tersebut -- ini merekonstruksi avgPrice yang benar utk kasus edit/delete
// di transaksi manapun (pembelian pertama/tengah/terakhir), TANPA perlu
// tahu histori sebelum snapshot (jadi aman walau ada stok awal yang tidak
// tercatat di priceHistory).
//
// Entry priceHistory LAMA (dibuat SEBELUM sesi ini, tidak punya field
// qtyBefore/avgPriceBefore) SENGAJA tidak dipaksa direcompute -- fallback
// ke perilaku lama (qty saja, avgPrice/price dibiarkan apa adanya) supaya
// tidak salah hitung dari data yang tidak lengkap. txId juga tetap
// dibersihkan dari txRefs/priceHistory di kasus ini (murni cleanup
// referensi basi, aman dilakukan tanpa syarat).
//
// Parameter txId BARU, opsional & ditaruh di akhir (backward-compatible):
// pemanggil lama yang cuma kirim 2 argumen (partId,qty) tetap berperilaku
// PERSIS SAMA seperti sebelum sesi ini (qty-only revert, early-return
// sebelum menyentuh priceHistory/txRefs sama sekali).
function revertStockPurchase(partId,qty,txId){
if(!partId||!qty)return;
const p=D.partsStock.find(x=>x.id===partId);
if(!p)return;
p.qty=Math.max(0,(p.qty||0)-qty);
if(!txId||!Array.isArray(p.priceHistory))return;
const idx=p.priceHistory.findIndex(h=>h&&h.txId===txId);
if(idx===-1){
// tidak ada entry priceHistory yg cocok (mis. sudah pernah direvert, atau
// data lama sebelum priceHistory ada) -- tetap bersihkan referensi txRefs
// basi kalau ada, sisanya no-op (tidak menebak-nebak avgPrice).
if(Array.isArray(p.txRefs))p.txRefs=p.txRefs.filter(id=>id!==txId);
if(p.lastTxId===txId)p.lastTxId=null;
return;
}
const entry=p.priceHistory[idx];
const after=p.priceHistory.slice(idx+1);
p.priceHistory.splice(idx,1);
if(Array.isArray(p.txRefs))p.txRefs=p.txRefs.filter(id=>id!==txId);
if(p.lastTxId===txId){
const last=p.priceHistory[p.priceHistory.length-1];
p.lastTxId=last?(last.txId||null):null;
}
if(typeof entry.qtyBefore==='number'){
let curQty=entry.qtyBefore;
let curAvg=(typeof entry.avgPriceBefore==='number'&&entry.avgPriceBefore>0)?entry.avgPriceBefore:null;
after.forEach(h=>{
const hq=(h&&typeof h.qty==='number')?h.qty:0;
const hp=(h&&typeof h.price==='number')?h.price:0;
const newQty=curQty+hq;
if(hp>0){
const prevAvgEff=(typeof curAvg==='number'&&curAvg>0)?curAvg:hp;
curAvg=newQty>0?(((prevAvgEff*curQty)+(hp*hq))/newQty):hp;
}
curQty=newQty;
});
if(typeof curAvg==='number'&&curAvg>0){p.avgPrice=curAvg;p.price=curAvg;}
}
}
// applyStockPurchase(p,qty,unitPrice,purchaseDate,txId) — Tahap 8A: satu titik
// tunggal utk update field pembelian di item D.partsStock (dipanggil dari
// applyTxStockFromTx di bawah, integrasi Keuangan -> Inventaris/Vehicle
// Catalog/Car Notes). TIDAK mengubah cara qty ditambah (masih p.qty+=qty,
// perilaku lama persis), cuma MENAMBAH field baru: lastPrice (harga satuan
// pembelian terakhir), avgPrice (rata-rata tertimbang lintas semua pembelian
// — dipakai juga sbg p.price utk perhitungan "Nilai Persediaan" yg sudah ada
// di Dashboard Sparepart 7E-5), lastPurchaseDate, priceHistory[] (riwayat
// harga per transaksi), txRefs[]/lastTxId (referensi transaksi Keuangan).
// unitPrice<=0 (mis. transaksi tanpa jumlah valid) -> qty tetap nambah tapi
// field harga TIDAK disentuh (menghindari harga 0 mengotori rata-rata).
// Sesi Bug C (audit lanjutan s625, lihat catatan lengkap di
// revertStockPurchase() di atas): tiap entry priceHistory SEKARANG juga
// menyimpan snapshot `qtyBefore`/`avgPriceBefore` -- state PERSIS SEBELUM
// pembelian ini diterapkan -- supaya revertStockPurchase() bisa
// merekonstruksi avgPrice dgn benar kalau pembelian ini di-EDIT/DIHAPUS
// nanti. Field ini MURNI TAMBAHAN (additive, backward-compatible): tidak
// mengubah SAMA SEKALI rumus qty/avgPrice/price/lastPrice yang sudah ada
// di bawah, cuma merekam nilai yang sudah dihitung inline sebagai `prevAvg`
// (skrg `prevAvgEffective`) SEBELUM p.qty/p.avgPrice dimutasi.
function applyStockPurchase(p,qty,unitPrice,purchaseDate,txId){
const prevQty=p.qty||0;
const prevAvgEffective=(typeof p.avgPrice==='number'&&p.avgPrice>0)?p.avgPrice:((p.price>0)?p.price:null);
p.qty=prevQty+qty;
if(unitPrice>0){
p.lastPrice=unitPrice;
const prevAvg=(typeof prevAvgEffective==='number')?prevAvgEffective:unitPrice;
const totalQtyForAvg=prevQty+qty;
p.avgPrice=totalQtyForAvg>0?(((prevAvg*prevQty)+(unitPrice*qty))/totalQtyForAvg):unitPrice;
p.price=p.avgPrice;
}
p.lastPurchaseDate=purchaseDate;
if(!Array.isArray(p.priceHistory))p.priceHistory=[];
p.priceHistory.push({date:purchaseDate,qty,price:unitPrice||0,txId:txId||null,qtyBefore:prevQty,avgPriceBefore:prevAvgEffective});
if(txId){
if(!Array.isArray(p.txRefs))p.txRefs=[];
if(!p.txRefs.includes(txId))p.txRefs.push(txId);
p.lastTxId=txId;
}
}
// syncPartsStockFromCatalog(catalogItem) — Tahap 9 (Jembatan Vehicle
// Catalog <-> Stok Sparepart Keuangan): cari-atau-buat 1 baris D.partsStock
// yang TERHUBUNG (field `catalogId`) ke 1 part di VehicleCatalog (katalog
// suku cadang, IDBStore terpisah — lihat modules/vehicle/vehicle-catalog.js).
// Pola bridge ini SAMA PERSIS `catalogPartLinkedStockId` yang sudah dipakai
// alur Servis di car-notes.js (VehicleCatalog TETAP identitas/OEM/barcode,
// D.partsStock TETAP satu-satunya pemilik qty/harga/riwayat pembelian —
// konsisten aturan ACR-001 "VehicleCatalog tidak pernah menyentuh D").
// Fungsi MURNI terhadap D (baca/tulis D.partsStock & D.sparepartCats saja,
// TIDAK memanggil save() -- pemanggil yang sudah punya 1 titik save() per
// alur, sama seperti applyTxStockFromTx() di bawah).
function syncPartsStockFromCatalog(catalogItem){
if(!catalogItem||!catalogItem.id)return null;
const existing=D.partsStock.find(p=>p.catalogId===catalogItem.id);
if(existing){
if(catalogItem.partName&&existing.name!==catalogItem.partName)existing.name=catalogItem.partName;
return existing;
}
const catName=(catalogItem.category||'Umum').trim()||'Umum';
// AUDIT SOT lanjutan (permintaan user): lookup kategori dulu GLOBAL by-name
// tanpa peduli kendaraan -- bug SAMA PERSIS yang sudah diperbaiki S629/
// resolveServisCatForVehicle() (lihat sparepart-servis.js) utk titik lain:
// kalau kendaraan lain sudah punya kategori PRIVAT bernama sama, part hasil
// scan kendaraan ini ikut ke-link ke kategori privat kendaraan lain itu.
// Fix: reuse resolveServisCatForVehicle() (SoT pencocokan nama->kategori
// yang sadar kendaraan aktif, SUDAH ADA di sparepart-servis.js) kalau
// tersedia; fallback ke lookup lama kalau file itu belum dimuat (mis. test
// unit file ini berdiri sendiri) -- 0 regresi utk pemanggil lama.
const vidSync=(typeof curVehicleId!=='undefined')?curVehicleId:null;
let cat=(typeof resolveServisCatForVehicle==='function')
?resolveServisCatForVehicle(catName,vidSync)
:D.sparepartCats.find(c=>c.name.toLowerCase()===catName.toLowerCase());
if(!cat){
// Sesi 295 (bugfix, permintaan eksplisit user): kategori auto dari scan
// Katalog Suku Cadang ini TUJUANNYA cuma pengelompokan stok (biar
// D.partsStock punya catId) -- BUKAN jadwal servis, makanya intervalKm
// sengaja 0. Dulu tidak ada showInReminder, jadi kategori "sampah" spt
// "E-2 Cylinder Head Cover" (nama kategori part dari katalog/torsi) ikut
// numpuk di 🔔 Pengingat Servis dgn "Interval 0 km" & selalu "Lewat".
// showInReminder:false = default disembunyikan dari Pengingat sampai user
// SENGAJA mengaktifkannya (isi interval + toggle di 🔧 Kelola Kategori
// Sparepart & Interval Servis) -- lihat filter di Servis.renderReminder()
// (car-notes.js) & renderDashboardServisReminder() (modules-render.js).
// AUDIT SOT lanjutan: kategori BARU (bukan reuse) juga distempel vehicleId
// -- pola SAMA PERSIS saveCat() (S629) -- supaya kategori auto-scan ikut
// ter-scope ke kendaraan aktif di 🔧 Kelola Kategori Sparepart, konsisten
// dgn kategori hasil input manual.
const vehicleIdCatSync=(vidSync&&Array.isArray(D.vehicles)&&D.vehicles.some(v=>v.id===vidSync))?vidSync:null;
cat={id:'sp_'+_genId(),name:catName,code:codeFromName(catName),intervalKm:0,showInReminder:false,vehicleId:vehicleIdCatSync};
D.sparepartCats.push(cat);
}
const prefix=cat.code||codeFromName(catName);
const seq=D.partsStock.filter(p=>p.code&&p.code.startsWith(prefix+'-')).length+1;
const code=(catalogItem.barcode||catalogItem.oemCode||(prefix+'-'+String(seq).padStart(3,'0')));
// AUDIT SOT (permintaan user): part BARU hasil scan dulu tidak pernah
// distempel vehicleId (beda dgn Sparepart.saveStock() manual, S629, yang
// SELALU mengunci ke curVehicleId) -- akibatnya part hasil scan jadi
// "universal" (isPartForVehicle() fallback ke catalogId/compatibleVehicleIds,
// yang buat draft hasil handleScan() kosong) & bocor tampil di SEMUA tab
// kendaraan, beda perilaku dgn part hasil input manual. Fix: stempel
// vehicleId=curVehicleId juga di sini (kalau ada & valid), pola SAMA PERSIS
// saveStock() -- part existing (reuse di atas) TIDAK disentuh vehicleId-nya.
const vehicleIdSync=(vidSync&&Array.isArray(D.vehicles)&&D.vehicles.some(v=>v.id===vidSync))?vidSync:null;
// BUGFIX (audit backup): id dulu pakai 'st_'+Date.now() mentah -- kalau fungsi ini
// dipanggil banyak kali dlm loop sinkron (syncUnlinkedCatalogPartsToStock() saat
// bulk-import katalog), banyak part ke-generate di milidetik sama -> id tabrakan.
// Ganti ke uid() (SOT anti-tabrakan app, sudah dipakai di tempat lain).
const np={id:'st_'+_genId(),name:catalogItem.partName||'Part dari Katalog',catId:cat.id,code,qty:0,unit:'pcs',minStock:1,price:catalogItem.price||0,note:'Terhubung dari Katalog Suku Cadang (scan)',catalogId:catalogItem.id,vehicleId:vehicleIdSync};
D.partsStock.push(np);
return np;
}
// txStockScanPartVia(adapterName) — inti bersama tombol "📷 Scan Kode Part"
// (adapter 'camera') & "🖼️ Scan dari Galeri" (adapter 'gallery') di
// txStockPanel (modal Tambah/Edit Transaksi Keuangan). Reuse 100%
// SparepartScanner.scan(adapterName) -- 'camera' & 'gallery' SUDAH ADA sbg
// adapter terdaftar di sparepart-scanner.js (Tahap 7B-1/7B-2), TIDAK ada
// adapter/logic scan baru di sini -- lalu VehicleCatalog.handleScan()
// (sudah ada) utk cari/bikin draft part, lalu syncPartsStockFromCatalog()
// di atas utk hubungkan ke baris stok yg dipilih di dropdown txStockItem
// yg SUDAH ADA -- TIDAK ada UI/dropdown baru. Ditarik jadi 1 fungsi supaya
// txStockScanPart()/txStockScanPartGallery() TIDAK duplikasi alur
// draft->resolveDraft->syncPartsStockFromCatalog->populate dropdown,
// bedanya cuma nama adapter & ikon toast sukses (📷 vs 🖼️).
async function txStockScanPartVia(adapterName){
if(typeof SparepartScanner==='undefined'||!SparepartScanner){toast('⚠️ Fitur scan belum tersedia');return;}
const result=await SparepartScanner.scan(adapterName);
if(!result)return;
let item=result.item;
if(result.draft&&item){
const name=await showPromptModal({title:'Nama Part Baru',message:'Kode "'+(item.barcode||item.oemCode||'')+'" belum ada di Katalog Suku Cadang. Isi nama part-nya dulu:',icon:'📦'});
if(!name)return;
const res=await VehicleCatalog.resolveDraft(item.id,{partName:name,category:'Umum'});
if(!res||!res.success){toast('⚠️ '+((res&&res.errors&&res.errors[0])||'Gagal menyimpan part ke katalog'));return;}
item=res.item;
}
if(!item){toast('⚠️ Part tidak ditemukan/gagal dibuat');return;}
const p=syncPartsStockFromCatalog(item);
if(!p){toast('⚠️ Gagal menghubungkan part ke stok');return;}
const chk=document.getElementById('txAddStock');
if(chk){chk.checked=true;toggleTxStockFields();}
populateTxStockSelect();
const sel=document.getElementById('txStockItem');
if(sel){sel.value=p.id;onTxStockItemChange();}
toast((adapterName==='gallery'?'🖼️':'📷')+' Part "'+p.name+'" siap ditambah ke stok');
}
// txStockScanPart() — tombol "📷 Scan Kode Part" (adapter kamera, perilaku
// TIDAK berubah dari sebelumnya, cuma diteruskan ke txStockScanPartVia()).
async function txStockScanPart(){
return txStockScanPartVia('camera');
}
// txStockScanPartGallery() — tombol baru "🖼️ Scan dari Galeri" di
// txStockPanel, pola SAMA PERSIS SparepartScannerUI.scanGallery() (dipakai
// tombol serupa di catalogModal) tapi diarahkan ke alur stok Keuangan lewat
// txStockScanPartVia() di atas, bukan VehicleCatalogUI.openForm().
async function txStockScanPartGallery(){
return txStockScanPartVia('gallery');
}
// syncUnlinkedCatalogPartsToStock() — Tahap 10 (lanjutan Tahap 9): setiap
// kali panel stok dibuka, part yang SUDAH ADA di Vehicle Catalog (dari
// 📦 Katalog Suku Cadang, mis. ditambah manual/scan/import di sana) tapi
// BELUM punya baris D.partsStock terhubung (catalogId) otomatis dibikinkan
// baris stoknya (qty:0, reuse syncPartsStockFromCatalog() 100% apa adanya)
// supaya part itu ikut muncul di dropdown "Pilih Sparepart" form transaksi
// Keuangan -- sebelumnya HANYA part yang sudah ada di D.partsStock (baik
// manual maupun dari alur Keuangan) yang tampil di sana, part yang baru
// ditambah lewat Katalog saja tidak pernah muncul sampai di-scan ulang.
// Sync SATU ARAH (Katalog -> D.partsStock, TIDAK sebaliknya) & tidak
// pernah menimpa qty/harga yang sudah ada (existing branch di
// syncPartsStockFromCatalog cuma sinkronkan nama). VehicleCatalog diakses
// async (IDBStore) jadi fungsi ini juga async -- pemanggil (populateTxStockSelect)
// TIDAK menunggu hasilnya (fire-and-forget), render ulang cuma dipanggil
// kalau memang ada part baru yang berhasil ditautkan, biar tidak flicker
// dropdown pas tidak ada perubahan.
async function syncUnlinkedCatalogPartsToStock(){
if(typeof VehicleCatalog==='undefined'||!VehicleCatalog||typeof VehicleCatalog.ensureLoaded!=='function')return false;
try{
await VehicleCatalog.ensureLoaded();
const store=(typeof VehicleCatalog.getStore==='function')?VehicleCatalog.getStore():null;
const items=(store&&Array.isArray(store.items))?store.items:[];
let added=false;
items.filter(it=>it&&!it.isDraft).forEach(it=>{
const already=D.partsStock.some(p=>p.catalogId===it.id);
if(!already){syncPartsStockFromCatalog(it);added=true;}
});
if(added&&typeof save==='function')save();
return added;
}catch(e){return false;}
}
function populateTxStockSelect(){
const sel=document.getElementById('txStockItem');
if(!sel)return;
const cur=sel.value;
// Bugfix (laporan user, in/out transaksi sparepart harus sesuai kendaraan):
// dulu tampil SEMUA D.partsStock tanpa pandang kendaraan aktif -- reuse
// Sparepart.isPartForVehicle() (sama dipakai Stok Sparepart & dropdown
// servis), di-scope ke curVehicleId (kendaraan aktif Car Notes saat ini).
const vid=typeof curVehicleId!=='undefined'?curVehicleId:null;
const list=D.partsStock.filter(p=>p.id===cur||Sparepart.isPartForVehicle(p,vid));
sel.innerHTML='<option value="__new__">➕ Sparepart Baru</option>'+list.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} (stok ${p.qty}${p.unit?' '+p.unit:''})</option>`).join('');
sel.value=cur&&list.find(p=>p.id===cur)?cur:'__new__';
onTxStockItemChange();
// Best-effort: kalau ada part di Katalog Suku Cadang yang belum tertaut
// ke D.partsStock, tautkan dulu lalu render ulang dropdown supaya
// langsung kelihatan (tidak perlu tunggu scan kode part dulu).
syncUnlinkedCatalogPartsToStock().then(added=>{
if(!added)return;
const sel2=document.getElementById('txStockItem');
if(!sel2)return; // modal sudah ditutup / elemen sudah tidak ada
const cur2=sel2.value;
const list2=D.partsStock.filter(p=>p.id===cur2||Sparepart.isPartForVehicle(p,vid));
sel2.innerHTML='<option value="__new__">➕ Sparepart Baru</option>'+list2.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} (stok ${p.qty}${p.unit?' '+p.unit:''})</option>`).join('');
sel2.value=cur2&&list2.find(p=>p.id===cur2)?cur2:cur2;
onTxStockItemChange();
});
}
function onTxStockItemChange(){
const sel=document.getElementById('txStockItem');
const wrap=document.getElementById('txStockNewWrap');
if(!sel||!wrap)return;
const isNew=sel.value==='__new__';
wrap.style.display=isNew?'block':'none';
if(isNew){
const noteVal=document.getElementById('txNote').value.trim();
const nameEl=document.getElementById('txStockNewName');
if(nameEl&&!nameEl.value) nameEl.value=noteVal;
}
}
function toggleTxStockFields(){
const chk=document.getElementById('txAddStock');
const fields=document.getElementById('txStockFields');
if(!chk||!fields)return;
fields.style.display=chk.checked?'block':'none';
if(chk.checked) populateTxStockSelect();
}
// applyTxStockFromTx(note,txId,date,priceBasis,existingTx) — txId/date/
// priceBasis/existingTx baru di Tahap 8A/8B (opsional, dipanggil dgn 1
// argumen saja masih tetap berfungsi spt sebelumnya). priceBasis = nilai
// Rupiah transaksi yg jadi dasar hitung harga satuan (dibagi qty).
// existingTx (Tahap 8B, pola sama applyTxShopStockFromTx) -> kalau transaksi
// yg diedit sebelumnya sudah pernah nambah stok (existingTx.partStockId),
// rollback dulu qty lama sebelum apply yg baru, supaya edit TIDAK dobel
// nambah stok (single source of truth D.partsStock tetap akurat).
function applyTxStockFromTx(note,txId,date,priceBasis,existingTx){
const chk=document.getElementById('txAddStock');
if(!chk||!chk.checked)return;
const panel=document.getElementById('txStockPanel');
if(!panel||panel.style.display==='none')return;
const itemSel=document.getElementById('txStockItem').value;
const qty=parseFloat(document.getElementById('txStockQty').value)||0;
const unit=document.getElementById('txStockUnit').value.trim()||'pcs';
if(qty<=0){toast('⚠️ Jumlah stok yang ditambah harus lebih dari 0');return;}
if(existingTx&&existingTx.partStockId){
revertStockPurchase(existingTx.partStockId,existingTx.partStockQty,existingTx.id);
}
const unitPrice=(priceBasis>0)?(priceBasis/qty):0;
const purchaseDate=date||new Date().toISOString().split('T')[0];
let targetPart=null;
if(itemSel==='__new__'){
const name=(document.getElementById('txStockNewName').value.trim())||note||'Sparepart Baru';
// AUDIT SOT lanjutan (permintaan user): sama seperti syncPartsStockFromCatalog()
// di atas, lookup kategori jalur ini juga GLOBAL by-name tanpa peduli
// kendaraan -- reuse resolveServisCatForVehicle() (SoT, sparepart-servis.js)
// kalau tersedia, fallback ke lookup lama kalau belum dimuat.
const vidNewCat=(typeof curVehicleId!=='undefined')?curVehicleId:null;
let cat=(typeof resolveServisCatForVehicle==='function')
?resolveServisCatForVehicle(name,vidNewCat)
:D.sparepartCats.find(c=>c.name.toLowerCase()===name.toLowerCase());
if(!cat){
const vehicleIdNewCat=(vidNewCat&&Array.isArray(D.vehicles)&&D.vehicles.some(v=>v.id===vidNewCat))?vidNewCat:null;
cat={id:'sp_'+_genId(),name,code:codeFromName(name),intervalKm:0,vehicleId:vehicleIdNewCat};
D.sparepartCats.push(cat);
}
const prefix=cat.code||codeFromName(name);
const seq=D.partsStock.filter(p=>p.code&&p.code.startsWith(prefix+'-')).length+1;
const code=prefix+'-'+String(seq).padStart(3,'0');
const existing=D.partsStock.find(p=>p.catId===cat.id&&p.name.toLowerCase()===name.toLowerCase());
if(existing){
applyStockPurchase(existing,qty,unitPrice,purchaseDate,txId);
targetPart=existing;
} else {
// AUDIT SOT (permintaan user, lanjutan fix syncPartsStockFromCatalog di
// atas): jalur "__new__" ketik manual di panel Transaksi Keuangan JUGA
// tidak pernah menyetel vehicleId -- gap SAMA PERSIS, fix pola SAMA PERSIS.
const vidNew=(typeof curVehicleId!=='undefined')?curVehicleId:null;
const vehicleIdNew=(vidNew&&Array.isArray(D.vehicles)&&D.vehicles.some(v=>v.id===vidNew))?vidNew:null;
const np={id:'st_'+_genId(),name,catId:cat.id,code,qty:0,unit,minStock:1,price:0,note:'Otomatis dari transaksi keuangan',vehicleId:vehicleIdNew};
D.partsStock.push(np);
applyStockPurchase(np,qty,unitPrice,purchaseDate,txId);
targetPart=np;
// Tahap 9: part baru yg diketik manual di Keuangan JUGA otomatis dibuatkan
// entri di Vehicle Catalog (best-effort, tidak menunggu/tidak memblokir
// alur simpan transaksi yg sync) supaya part yg sama bisa dikenali lewat
// scan barcode/OEM di sesi berikutnya. Kegagalan (mis. VehicleCatalog
// belum ada) diabaikan diam-diam -- ini pelengkap, bukan syarat simpan.
if(typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.create==='function'){
VehicleCatalog.create({partName:name,category:cat.name}).then(res=>{
if(res&&res.success&&res.item){np.catalogId=res.item.id;if(typeof save==='function')save();}
}).catch(()=>{});
}
}
toast(`📦 Kategori & stok "${name}" otomatis dibuat (+${qty} ${unit})`);
} else {
const p=D.partsStock.find(x=>x.id===itemSel);
if(p){
applyStockPurchase(p,qty,unitPrice,purchaseDate,txId);
targetPart=p;
toast(`📦 Stok "${escapeHtml(p.name)}" bertambah +${qty} ${unit}`);
}
}
if(targetPart&&txId){
const tx=(existingTx&&existingTx.id===txId)?existingTx:(D.transactions||[]).find(t=>t.id===txId);
if(tx){tx.partStockId=targetPart.id;tx.partStockQty=qty;tx.partStockUnit=unit;}
}
renderStockList();
}
