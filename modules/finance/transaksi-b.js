// transaksi-b.js — bagian KEDUA dari modules/finance/transaksi.js (audit ukuran
// file, sesi lanjutan setelah split modules/vehicle/sparepart-servis.js).
// Titik potong bersih: TEPAT SEBELUM `async function saveTx(){` (sisa
// deklarasi function/const top-level, bukan mixin di object literal, jadi
// TIDAK butuh Object.assign — cukup dimuat SETELAH transaksi.js, urutan
// dijaga di scripts/build.js, entri baru tepat setelah file utama).
//
// Isi: saveTx()/_saveTxInner() (mesin simpan transaksi — cicilan/langganan/
// piutang/servis/bbm/shop sync, ~600 baris satu fungsi), plus beberapa fungsi
// tak terkait domain transaksi yang sebelumnya menumpuk di ekor file yang
// sama: saveCatatan, saveReminder, saveLDR, toggleMs, delReminder.
//
// Referensi ke variabel top-level (let/var) yang dideklarasikan di file lain
// (features-helpers-global-security.js: curTxType, txEditId, _txSaving, dkk)
// maupun di transaksi.js (_txPayMethodTouchedByUser) tetap aman: di browser,
// let/var top-level pada <script> klasik berbagi satu global lexical scope
// lintas file, dan fungsi di sini baru dieksekusi (bukan diparse) setelah
// kedua file selesai dimuat.

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
// Sesi 394 (diperluas -- patch akun-multi-owner-doublecount-datahealthcheck-
// restore): field "Kaitkan ke Aset Multi-Owner" (#txAssetId, modals.js)
// dulu HANYA tampil & berlaku utk Pemasukan (txAssetIdVal SENGAJA
// dikosongkan utk Pengeluaran) -- sekarang field ini tampil utk Pemasukan
// MAUPUN Pengeluaran (lihat updateTxAssetWrapVisibility()), jadi
// txAssetIdVal diambil apa adanya dari dropdown tanpa filter tipe. Wrap-nya
// sendiri tetap tersembunyi kalau tidak ada aset multi-owner sama sekali,
// jadi txAssetIdSaveEl.value otomatis kosong di kasus itu -- 0 regresi.
const txAssetIdSaveEl=document.getElementById('txAssetId');
const txAssetIdVal=txAssetIdSaveEl?txAssetIdSaveEl.value:'';
// deductionOwnerIdVal — S574-D1 (lanjutan S574-A/B/C, lihat
// AUDIT-S574-PEMILIK-SUMBER-POTONGAN.md Tahap 4): nilai picker "Pemilik
// Sumber Potongan" (#txDeductionOwner, show/hide+repopulate sudah
// ditangani updateTxDeductionOwnerVisibility() -- S574-C, TIDAK disentuh
// sesi ini). Diambil apa adanya dari dropdown -- akun single-owner (wrap
// disembunyikan, dropdown dikosongkan oleh S574-C) otomatis menghasilkan
// string kosong di sini, jadi 0 friksi tambahan utk akun lama/single-owner.
const txDeductionOwnerSaveEl=document.getElementById('txDeductionOwner');
const deductionOwnerIdVal=txDeductionOwnerSaveEl?txDeductionOwnerSaveEl.value:'';
// hitungKasVal -- toggle "Hitung ke Saldo & Laporan" (AUDIT-hitung-kas-toggle-dan-
// ringkasan-tagihan.md, scope Tunai biasa saja). Wrap-nya (txHitungKasWrap) hanya
// tampil kalau curPayMethod==='tunai' (lihat setPayMethod()), jadi elemen checkbox
// tetap ada di DOM tapi disembunyikan utk cicilan/langganan -- dibaca "apa adanya"
// (pola sama txAssetIdVal/deductionOwnerIdVal), TIDAK dipakai sama sekali di cabang
// existingBill (cicilan/langganan/tagihan, return lebih awal sebelum titik ini
// dipakai) supaya scope tetap terkunci ke jalur generik/tunai saja.
const txHitungKasSaveEl=document.getElementById('txHitungKas');
const hitungKasVal=txHitungKasSaveEl?txHitungKasSaveEl.checked:true;
// txOwnerPorsiVal/#txOwnerPorsiWrap DIHAPUS (audit AUDIT-S540/B1-B12-DOUBLECOUNT,
// spesifikasi "relasi murni") — dropdown "Porsi Pemilik (akun patungan)"
// sudah tidak ada di modal ini. Transaksi LAMA yang masih punya
// `ownerPorsiId` tersimpan dibiarkan apa adanya (0 di-assign/delete di
// bawah), supaya laporan "Porsi Pemilik" lama di filter-laporan.js (di
// luar scope perubahan ini) tetap kompatibel lewat fallback yang sudah
// ada di sana.
if(cat==='__add_new_cat__'){toast('⚠️ Pilih atau buat kategori dulu');return;}
// VALIDASI S574-D1 (basis diganti Sesi S578, DL-Next-1 / Audit-3A --
// lihat DESIGN-LOCK-OWNER-RESOLVER-AUDIT-3-6-FOLLOWUP.md &
// AUDIT-1-7-OWNER-RESOLVER-LANJUTAN.md §3A): akun multi-owner (2+ kandidat
// owner) WAJIB pilih tepat 1 Pemilik Sumber Potongan sebelum transaksi
// boleh disimpan -- berlaku utk CREATE maupun EDIT (accId di atas sudah
// mewakili akun yang SEDANG dipilih di form, termasuk kalau user baru saja
// ganti akun). Assignment biner murni (siapa menanggung PENUH), TIDAK
// pernah split % (lihat §2.4/§5 audit) -- validasi ini juga TIDAK
// menyentuh saldo/formula.
//
// S578 FIX (source-mismatch): basis diganti dari getAccOwners(accId).
// isMultiOwner (S574-A, HANYA baca acc.owners[]/acc.ownership, BUTA
// terhadap aset tertaut) ke resolveOwnerDefaultForAccount(accId).owners.
// length>1 (Sesi Res-B) -- SUMBER SAMA PERSIS yang dipakai UI
// (updateTxDeductionOwnerVisibility(), Sesi Res-C). Sebelum fix ini, akun
// yang (a) tertaut aset multi-owner valid via a.accountId TAPI (b) belum
// pernah punya acc.owners[] sendiri (belum pernah "Jadikan permanen") bisa
// lolos simpan TANPA deductionOwnerId walau UI-nya sendiri menampilkan
// dropdown wajib pilih -- kontradiksi UI-vs-validasi, silent. Fix ini
// MURNI menyamakan sumber kandidat; 0 perubahan aturan pemilihan owner
// (Design Lock §2.1/§2.2 lama, termasuk "0 tie-break otomatis", tetap
// utuh sama sekali tidak disentuh).
const _deductionOwnerResolved=(accId&&typeof resolveOwnerDefaultForAccount==='function')?resolveOwnerDefaultForAccount(accId):null;
if(_deductionOwnerResolved&&_deductionOwnerResolved.ok&&_deductionOwnerResolved.owners.length>1&&!deductionOwnerIdVal){
toast('⚠️ Akun ini punya lebih dari 1 pemilik — pilih Pemilik Sumber Potongan dulu');
return;
}
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
// S629 (Bug B, audit s628 AUDIT-s628-bugB-atomicity-transaksi.md, Strategi A):
// snapshot+rollback SELURUH D utk jalur CREATE generik (existingTx null,
// curPayMethod 'tunai'), pola sama persis dgn applyRestoredData()
// (modules/shared/backup-restore.js) -- `const prevD=JSON.parse(JSON.stringify(D))`.
// _txCreateSnapshot HANYA diisi di titik SEBELUM D.transactions.push(newTx) pada
// cabang CREATE generik (else block di bawah) -- cabang EDIT/cicilan/tagihan/
// langganan/utang TIDAK mengisi variabel ini, jadi kalau exception terjadi di
// cabang-cabang itu, catch di bawah cuma throw ulang (0 perubahan perilaku,
// scope sesi ini murni Bug B/CREATE generik, tidak menyentuh Bug A/C/D/E).
let _txCreateSnapshot=null;
try{
if(existingTx&&(existingTx.stockProductId||(existingTx.stockItems&&existingTx.stockItems.length))){
const stillChecked=document.getElementById('txAddShopStock')&&document.getElementById('txAddShopStock').checked;
const panelVisible=document.getElementById('txShopStockPanel')&&document.getElementById('txShopStockPanel').style.display!=='none';
if(!stillChecked||!panelVisible){
if(existingTx.stockItems&&existingTx.stockItems.length){
existingTx.stockItems.forEach(si=>{
const prevP=D.products.find(p=>p.id===si.productId);
if(prevP){if(typeof ProductRepository!=='undefined')ProductRepository.mutateStockDelta(prevP,-(si.qty||0));else prevP.stock=Math.max(0,(prevP.stock||0)-(si.qty||0));}
});
} else if(existingTx.stockProductId){
const prevP=D.products.find(p=>p.id===existingTx.stockProductId);
if(prevP){if(typeof ProductRepository!=='undefined')ProductRepository.mutateStockDelta(prevP,-(existingTx.stockQty||0));else prevP.stock=Math.max(0,(prevP.stock||0)-(existingTx.stockQty||0));}
}
delete existingTx.stockProductId;delete existingTx.stockQty;delete existingTx.stockItems;
renderProductList();
}
}
if(existingTx&&existingTx.partStockId){
const stillChecked=document.getElementById('txAddStock')&&document.getElementById('txAddStock').checked;
const panelVisible=document.getElementById('txStockPanel')&&document.getElementById('txStockPanel').style.display!=='none';
if(!stillChecked||!panelVisible){
revertStockPurchase(existingTx.partStockId,existingTx.partStockQty,existingTx.id);
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
prevShop.items.forEach(it=>{const pp=D.products.find(x=>x.id===it.productId);if(pp){if(typeof ProductRepository!=='undefined')ProductRepository.mutateStockDelta(pp,it.qty);else pp.stock=(pp.stock||0)+it.qty;}});
}
D.cobek=D.cobek.filter(c=>c.id!==existingTx.cobekLinkId);
delete existingTx.cobekLinkId;
renderProductList();renderShop();renderShopRecent();
}
}
// FIX (audit user, lanjutan sync 2 arah "Ditanggung Bersama" -- kali ini utk Utang, item
// #4 dari laporan s299): existingBill.kind==='utang' TIDAK PERNAH match curPayMethod di
// cabang di bawah -- curPayMethod selalu jadi 'tunai' begitu editTx() membuka transaksi
// bertaut ke bill kind:'utang' (editTx() sengaja cuma setPayMethod(kind) utk 'cicilan'/
// 'langganan', lihat komentar di editTx()). Sebelum fix ini, transaksi pembayaran utang yang
// diedit lewat modal Transaksi biasa jatuh ke cabang paling generik (existingTx.billLinkId
// DIHAPUS diam-diam -- tautan ke tagihan pengingat & Buku Utang putus permanen -- dan sisa
// utang D.debts[].nilai TIDAK pernah disesuaikan ke jumlah baru). Sekarang: tautan
// dipertahankan, dan kalau ini pembayaran TERBARU utk bill tsb (pola sama isLatestInstallment
// yg dipakai cabang cicilan di bawah), sisa utang ikut disesuaikan sebesar selisih jumlah
// lama vs baru. Kalau bukan pembayaran terbaru, tautan tetap dipertahankan tapi sisa utang
// TIDAK disentuh (konsisten dgn toast "pembayaran cicilan lama" di cabang cicilan) --
// koreksi histori lama tetap lewat 📋 Riwayat Pembayaran.
if(existingBill&&existingBill.kind==='utang'&&existingBill.debtId){
const linkedTxIds=D.transactions.filter(t=>t.billLinkId===existingBill.id).map(t=>t.id);
const isLatestInstallment=linkedTxIds.length===0||existingTx.id>=Math.max(...linkedTxIds);
const oldAmount=existingTx.amount;
Object.assign(existingTx,{amount:amt,category:cat,subcategory:subCat,accountId:accId,date,note});
// S574-D1: persist deductionOwnerId di cabang utang (Object.assign 1/7) --
// pola sama txAssetIdVal (tag opsional, bukan input kalkulasi saldo).
if(deductionOwnerIdVal)existingTx.deductionOwnerId=deductionOwnerIdVal;else delete existingTx.deductionOwnerId;
const debtSynced=isLatestInstallment&&typeof syncDebtBalanceOnPaymentEdit==='function'&&syncDebtBalanceOnPaymentEdit(existingBill,oldAmount,amt);
const debtSyncedMsg=debtSynced?' (sisa utang ikut disesuaikan)':'';
txEditId=null;
rememberLastAccForCat(cat,accId);
if(_txCatLearnSource){learnCatFromItemName(_txCatLearnSource,cat);_txCatLearnSource=null;}
save();closeModal('txModal');renderDashboard();renderKeuangan();renderBillList();checkBills();renderDebtList();renderKekayaanBersih();hitungZakatMaal();
if(typeof AIBus!=="undefined")AIBus.emit("finance.updated",{category:cat,kind:"utang"});
toast(isLatestInstallment?('✅ Pembayaran utang diperbarui'+debtSyncedMsg):'ℹ️ Ini pembayaran utang lama — hanya catatan transaksi ini yang diubah, sisa utang tidak ikut disesuaikan (ubah lewat 📋 Riwayat Pembayaran kalau perlu).');
return;
}
// FIX (Sesi 316, laporan user): transaksi pembayaran tagihan kind:'tagihan' (mis. PBB --
// bukan cicilan/langganan/utang) -- baik masih aktif di D.bills MAUPUN sudah lunas/
// diarsip di D.billsArchive -- yang diedit lewat modal Transaksi biasa (bukan lewat
// 📋 Riwayat Pembayaran di tab Tagihan) sebelumnya jatuh ke cabang paling generik di
// bawah: billLinkId DIHAPUS diam-diam (delete existingTx.billLinkId) & completedAt
// arsip TIDAK PERNAH disinkron. Akibatnya tautan ke tagihan putus permanen begitu
// tanggal/jumlah diedit dari sisi Transaksi. Root cause: existingBill (di atas) cuma
// nyari D.bills (aktif) -- tagihan yang sudah diarsipkan LUNAS tidak pernah ketemu di
// sana, jadi selalu tembus ke cabang generik apapun kind aslinya. Arah sebaliknya
// (edit lewat 📋 Riwayat Pembayaran -> tanggal transaksi & completedAt arsip) sudah
// otomatis sinkron sejak fix s288 (lihat isLatestBillPaymentTx() & saveBillHistoryEdit()
// di tagihan-kalender.js) -- fix ini menyamakan arah edit dari modal Transaksi biasa
// supaya konsisten, reuse isLatestBillPaymentTx() yang sama (bukan logic baru).
const linkedTagihanBill=existingTx&&existingTx.billLinkId?(D.bills.find(b=>b.id===existingTx.billLinkId&&b.kind==='tagihan')||(D.billsArchive||[]).find(b=>b.id===existingTx.billLinkId&&b.kind==='tagihan')):null;
if(linkedTagihanBill){
const isLatestTagihan=typeof isLatestBillPaymentTx==='function'?isLatestBillPaymentTx(linkedTagihanBill.id,existingTx.id):true;
const keepPayMethodTagihan=_txPayMethodTouchedByUser?'tunai':(existingTx.payMethod||'tunai');
Object.assign(existingTx,{type:curTxType,amount:amt,category:cat,subcategory:subCat,accountId:accId,payMethod:keepPayMethodTagihan,note,date});
// S574-D1: persist deductionOwnerId di cabang tagihan (Object.assign 2/7).
if(deductionOwnerIdVal)existingTx.deductionOwnerId=deductionOwnerIdVal;else delete existingTx.deductionOwnerId;
// billLinkId SENGAJA dipertahankan (tidak dihapus) -- beda dari cabang generik di bawah.
let archiveSynced=false;
if(isLatestTagihan&&linkedTagihanBill.completedAt){linkedTagihanBill.completedAt=date;archiveSynced=true;}
txEditId=null;
rememberLastAccForCat(cat,accId);
if(_txCatLearnSource){learnCatFromItemName(_txCatLearnSource,cat);_txCatLearnSource=null;}
save();closeModal('txModal');renderDashboard();renderKeuangan();renderBillList();checkBills();
if(typeof AIBus!=="undefined")AIBus.emit("finance.updated",{category:cat,kind:"tagihan"});
toast(isLatestTagihan?('✅ Pembayaran tagihan diperbarui'+(archiveSynced?' (tanggal arsip ikut disinkron)':'')):'ℹ️ Ini pembayaran tagihan lama — hanya catatan transaksi ini yang diubah, tanggal arsip tidak ikut berubah (ubah lewat 📋 Riwayat Pembayaran kalau perlu).');
return;
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
const oldTxAmountForPiutangSync=existingTx.amount;
Object.assign(existingBill,{name:nama,amount:perBulanMine,nextDue:due,category:cat,accountId:accId,note,totalHarga:total,tenor,bunga,shared:cicilanShared,sharedPct:cicilanSharedPct,totalAmount:cicilanShared?perBulan:null,isKpr,sharedOtherName:cicilanSharedOtherName,sharedAutoPiutang:cicilanSharedAutoPiutang});
Object.assign(existingTx,{amount:perBulanMine,category:cat,subcategory:subCat,accountId:accId,date,note:nama+(note?' - '+note:'')});
// S574-D1: persist deductionOwnerId di cabang cicilan (isLatest, Object.assign 3/7).
if(deductionOwnerIdVal)existingTx.deductionOwnerId=deductionOwnerIdVal;else delete existingTx.deductionOwnerId;
// FIX s286: sebelum ini, menyalakan Ditanggung Bersama + Catat Otomatis Piutang
// saat EDIT transaksi cicilan yg sudah ada cuma nyimpen flag ke existingBill --
// piutang utk PEMBAYARAN yg sedang diedit ini sendiri tidak pernah dibuat, baru
// mulai muncul di pembayaran BERIKUTNYA (lewat markBillPaid()). Sekarang piutang
// utk transaksi ini juga langsung dibuat di sini, sama seperti alur cicilan
// BARU (lihat pemanggilan sejenis di bawah, kasus tenor>=2 saat create). Guard
// anti-dobel (kalau disimpan ulang) ada DI DALAM maybeCreateSharedPiutangFromBill()
// sendiri (skip kalau autoTxId ini sudah pernah punya entri Piutang).
// FIX s299 (gap ke-4, lanjutan audit user s298): kalau piutang otomatis utk
// transaksi INI sudah ada dari save sebelumnya (skenario: bayar cicilan shared
// via modal Transaksi biasa dulu -> piutang kebuat -> lalu total/tenor/bunga
// diedit ULANG lewat modal ini juga, bukan lewat 📋 Riwayat Pembayaran),
// maybeCreateSharedPiutangFromBill() di atas cuma SKIP (guard anti-dobel) tanpa
// menyesuaikan nilai piutangnya ke porsi baru -- beda jalur dari saveBillHistoryEdit
// (tagihan-kalender.js) yg sudah dibenerin di s298. Sekarang: kalau piutangnya
// sudah ada, panggil syncSharedPiutangOnPaymentEdit() (pola identik dgn
// saveBillHistoryEdit) supaya sisanya ikut disesuaikan; kalau belum ada, baru
// panggil maybeCreateSharedPiutangFromBill() spt semula.
const hasExistingAutoPiutang=D.piutang&&D.piutang.some(p=>p.autoTxId===existingTx.id);
if(hasExistingAutoPiutang){
// beda dgn maybeCreateSharedPiutangFromBill(), syncSharedPiutangOnPaymentEdit() TIDAK
// self-render -- render manual di sini spy Piutang & Kekayaan Bersih ikut update.
if(typeof syncSharedPiutangOnPaymentEdit==='function'&&syncSharedPiutangOnPaymentEdit(existingTx.id,oldTxAmountForPiutangSync,perBulanMine)){
if(typeof Piutang!=='undefined')Piutang.renderList();
if(typeof renderKekayaanBersih==='function')renderKekayaanBersih();
if(typeof hitungZakatMaal==='function')hitungZakatMaal();
}
} else if(typeof maybeCreateSharedPiutangFromBill==='function'){
maybeCreateSharedPiutangFromBill(existingBill,existingTx.id);
}
} else {
Object.assign(existingTx,{category:cat,subcategory:subCat,accountId:accId,date,note:nama+(note?' - '+note:'')});
// S574-D1: persist deductionOwnerId di cabang cicilan (bukan-latest, Object.assign 4/7).
if(deductionOwnerIdVal)existingTx.deductionOwnerId=deductionOwnerIdVal;else delete existingTx.deductionOwnerId;
toast('ℹ️ Ini pembayaran cicilan lama — hanya catatan transaksi ini yang diubah. Jadwal cicilan (total/tenor/jatuh tempo) tidak ikut berubah, ubah lewat 📋 Riwayat Pembayaran kalau perlu.');
}
} else {
const nama=document.getElementById('txLanggananNama').value.trim()||cat;
if(isLatestInstallment){
const freq=document.getElementById('txLanggananFreq').value;
const due=document.getElementById('txLanggananDue').value||date;
Object.assign(existingBill,{name:nama,amount:amt,freq,nextDue:due,category:cat,accountId:accId,note});
Object.assign(existingTx,{amount:amt,category:cat,subcategory:subCat,accountId:accId,date,note:nama+(note?' - '+note:'')});
// S574-D1: persist deductionOwnerId di cabang tagihan-lama (isLatest, Object.assign 5/7).
if(deductionOwnerIdVal)existingTx.deductionOwnerId=deductionOwnerIdVal;else delete existingTx.deductionOwnerId;
} else {
Object.assign(existingTx,{amount:amt,category:cat,subcategory:subCat,accountId:accId,date,note:nama+(note?' - '+note:'')});
// S574-D1: persist deductionOwnerId di cabang tagihan-lama (bukan-latest, Object.assign 6/7).
if(deductionOwnerIdVal)existingTx.deductionOwnerId=deductionOwnerIdVal;else delete existingTx.deductionOwnerId;
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
_amc015(nextDueDate,1); // BUG-015 (s406): clamp overflow tanggal
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
const _cicilanNewTx={id:billId+1,type:'expense',amount:perBulanMine,category:cat,subcategory:subCat,accountId:accId,payMethod:'cicilan',billLinkId:sisaTenor>0?billId:null,note:nama+(note?' - '+note:''),date};
// S574-D1: persist deductionOwnerId di jalur CREATE cicilan (1/3).
if(deductionOwnerIdVal)_cicilanNewTx.deductionOwnerId=deductionOwnerIdVal;
D.transactions.push(_cicilanNewTx);
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
if(freq==='bulanan')_amc015(dueNext,1); // BUG-015 (s406): clamp overflow tanggal
else if(freq==='mingguan')dueNext.setDate(dueNext.getDate()+7);
else if(freq==='tahunan')dueNext.setFullYear(dueNext.getFullYear()+1);
if(existingTx) D.transactions=D.transactions.filter(t=>t.id!==existingTx.id);
const billId=uid();
const alreadyExists=D.bills.find(b=>b.name===nama&&b.kind==='langganan');
if(!alreadyExists){
D.bills.push({id:billId,name:nama,amount:amt,nextDue:dueNext.toISOString().split('T')[0],freq,sisaTenor:null,category:cat,subcategory:subCat,accountId:accId,note:note,kind:'langganan'});
}
const _langgananNewTx={id:billId+1,type:'expense',amount:amt,category:cat,subcategory:subCat,accountId:accId,payMethod:'langganan',note:nama+(note?' - '+note:''),date};
// S574-D1: persist deductionOwnerId di jalur CREATE langganan (2/3).
if(deductionOwnerIdVal)_langgananNewTx.deductionOwnerId=deductionOwnerIdVal;
D.transactions.push(_langgananNewTx);
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
// Sesi 519 (LANJUTKAN-S519) — tangkap titipanLinkId/amount LAMA SEBELUM
// di-Object.assign di bawah (field ini sendiri TIDAK ada di daftar
// Object.assign, jadi otomatis dipertahankan apa adanya kalau tidak
// disentuh eksplisit di bawah — dipakai `applyTxTitipanLinkageOnSave()`/
// `syncTitipanTalanganPiutangOnEdit()` setelahnya).
const prevTxTitipanLinkId=existingTx.titipanLinkId||null;
const oldTxAmountForTitipanSync=existingTx.amount;
Object.assign(existingTx,{type:curTxType,amount:amt,category:cat,subcategory:subCat,accountId:accId,payMethod:keepPayMethod,note,date});
if(txAssetIdVal)existingTx.assetId=txAssetIdVal;else delete existingTx.assetId;
// S574-D1: persist deductionOwnerId di cabang generik (Object.assign 7/7).
if(deductionOwnerIdVal)existingTx.deductionOwnerId=deductionOwnerIdVal;else delete existingTx.deductionOwnerId;
// Toggle hitungKas: hanya ditulis/dipertahankan kalau payMethod HASIL edit ini
// 'tunai' (keepPayMethod, sudah dihitung di atas) -- transaksi yang keepPayMethod-nya
// balik ke cicilan/langganan (mis. bill-nya tidak aktif lagi tapi user re-pilih chip)
// TIDAK relevan dgn toggle ini, field dihapus supaya tidak ada nilai basi.
// absen=true (default dihitung, 0 breaking change), jadi field HANYA ditulis saat
// eksplisit false -- konsisten pola field opsional lain di cabang ini.
if(keepPayMethod==='tunai'&&!hitungKasVal)existingTx.hitungKas=false;else delete existingTx.hitungKas;
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
// Sesi 519 (LANJUTKAN-S519, Design Lock S518 §6 "EDIT NOMINAL"/"EDIT
// OWNER / UNLINK") — `titipanLinkId`/`titipanTalangan` sendiri TIDAK
// dibaca dari form di sesi ini (0 field modal baru ditambah, di luar
// scope resmi S519 — lihat LANJUTKAN-S519 §13 "JANGAN SENTUH":
// modals.js/app_production.html), jadi nilainya TIDAK PERNAH berubah di
// sini secara UI (tetap dipertahankan Object.assign di atas apa adanya).
// `applyTxTitipanLinkageOnSave()` tetap dipanggil UNCONDITIONAL supaya
// mekanisme guard/lifecycle-nya SIAP dipakai begitu sesi UI berikutnya
// menambahkan field form-nya (0 sentuhan file ini lagi diperlukan nanti)
// — no-op utk transaksi non-titipan (guard awal fungsi itu sendiri).
applyTxTitipanLinkageOnSave(existingTx,prevTxTitipanLinkId);
if((prevTxTitipanLinkId||null)===(existingTx.titipanLinkId||null)&&existingTx.titipanLinkId&&typeof syncTitipanTalanganPiutangOnEdit==='function'){
syncTitipanTalanganPiutangOnEdit(existingTx.id,oldTxAmountForTitipanSync,amt);
}
savedTxId=existingTx.id;
} else {
savedTxId=uid();
const newTx={
id:savedTxId,type:curTxType,amount:amt,
category:cat,subcategory:subCat,
accountId:accId,payMethod:'tunai',
note:note,date
};
if(txAssetIdVal)newTx.assetId=txAssetIdVal;
// S574-D1: persist deductionOwnerId di jalur CREATE generik (3/3). Akun
// single-owner (dropdown kosong) -> deductionOwnerIdVal='' -> field TIDAK
// diset sama sekali, sesuai pola existing txAssetIdVal di atas.
if(deductionOwnerIdVal)newTx.deductionOwnerId=deductionOwnerIdVal;
// Toggle hitungKas -- newTx di jalur CREATE generik ini SELALU payMethod:'tunai'
// (lihat literal di atas), jadi 0 guard tambahan diperlukan spt di cabang EDIT.
// absen=true (default dihitung), field HANYA ditulis saat eksplisit false.
if(!hitungKasVal)newTx.hitungKas=false;
// BEGIN transaction boundary (S629 Bug B): snapshot D SEBELUM mutasi CREATE
// pertama (push newTx) supaya bisa di-rollback total kalau ADA side-effect
// sesudahnya (langkah 4-13 audit s628) yang throw.
_txCreateSnapshot=JSON.stringify(D);
D.transactions.push(newTx);
applyTxTitipanLinkageOnSave(newTx,null);
WorthIt.applyBuyLink(savedTxId);
if(typeof SewaKios!=='undefined')SewaKios.applyPaymentLink(savedTxId);
Tukang.applyPendingPayment(savedTxId);
}
applyTxStockFromTx(note,savedTxId,date,amt,existingTx);
// Sesi ini (sync sparepart -> servis, permintaan user): dipanggil SETELAH
// applyTxStockFromTx() persis di atas (bukan menggantikan) -- kalau checkbox
// "Tambah ke Stok Sparepart" & "Sinkron ke Servis" dicentang bersamaan,
// urutannya SELALU stok ditambah dulu baru servis dicatat, net effect
// stoknya tetap benar krn applyStockUsage() (car-notes.js, dipanggil kalau
// user juga pilih "Gunakan Stok Sparepart" lewat Edit Detail Servis nanti)
// baca D.partsStock APA ADANYA saat itu dijalankan, bukan snapshot lama.
if(typeof applyTxServisFromTx==='function'){
const txObjForServis=existingTx||(D.transactions||[]).find(t=>t.id===savedTxId);
applyTxServisFromTx(savedTxId,amt,date,accId,note,txObjForServis,existingTx);
}
applyTxBbmFromTx(savedTxId,amt,date,accId,note,existingTx);
applyTxShopStockFromTx(savedTxId,note,existingTx);
applyTxShopSaleFromTx(savedTxId,date,accId,note,existingTx);
// BUGFIX (s433): dulu applyTxRenovFromTx() cuma dipanggil kalau `!existingTx`
// (transaksi BARU) -- akibatnya panel "🔨 Catat juga ke Proyek Renovasi?" bisa
// dicentang & diisi waktu EDIT transaksi yang sudah ada, tapi centangnya tidak
// pernah diproses sama sekali (silently diabaikan, tidak ada toast error).
// Fix: panggil juga saat edit, SELAMA transaksi yang diedit belum pernah
// ter-link ke item Renovasi (`existingTx.renovItemLinkId` kosong) -- kalau
// SUDAH ter-link, re-sync-nya sudah ditangani terpisah oleh
// `Renov.onLinkedTxEdited()` di atas (baris ~1080), jadi guard ini mencegah 1
// edit menghasilkan 2 item Renovasi dobel utk transaksi yang sama.
// BUGFIX (s436): dulu applyTxRenovFromTx() toast() sendiri, lalu toast()
// generik di akhir fungsi ini (✅ Transaksi diperbarui/tersimpan) LANGSUNG
// menimpanya (toast cuma 1 elemen, lihat format-tema.js) -- pesan Renov
// (baik sukses maupun peringatan "belum pilih proyek") tidak pernah sempat
// terbaca user. Sekarang applyTxRenovFromTx() cuma `return` pesannya,
// ditampung di sini & digabung ke toast final di bawah (pola sama seperti
// txAssetSplitMsg utk info "dibagi ke N pemilik" yg sudah ada duluan).
let txRenovMsg='';
if((!existingTx||!existingTx.renovItemLinkId)&&typeof applyTxRenovFromTx==='function')txRenovMsg=applyTxRenovFromTx(note,savedTxId,date,amt,cat,accId)||'';
txEditId=null;
rememberLastAccForCat(cat,accId);
if(_txCatLearnSource){learnCatFromItemName(_txCatLearnSource,cat);_txCatLearnSource=null;}
save();closeModal('txModal');renderDashboard();renderKeuangan();renderCnTab();
if(typeof AIBus!=="undefined")AIBus.emit("finance.updated",{txId:savedTxId,category:cat,type:curTxType,amount:amt});
// txAssetSplitMsg DIHAPUS (audit AUDIT-S540/B1-B12-DOUBLECOUNT) — toast
// sukses tidak lagi menampilkan info "(dibagi ke N pemilik)", karena
// resolveTxAssetSplit() sudah dihapus (kaitan aset kini relasi murni).
const txAssetSplitMsg='';
// (s436): kalau ada pesan Renov (sukses ATAU peringatan "belum pilih
// proyek"), gabung ke toast final ini alih-alih dua toast terpisah yg saling
// menimpa (lihat komentar txRenovMsg di atas) -- durasi dipanjangkan jadi
// 4000ms krn pesan gabungan lebih panjang dari toast biasa (pola sama dgn
// toast pesan panjang lain, mis. error-handler.js/features-helpers.js).
toast((existingTx?'✅ Transaksi diperbarui':'✅ Transaksi tersimpan')+txAssetSplitMsg+(txRenovMsg?' — '+txRenovMsg:''),txRenovMsg?4000:2200);
} catch(_txSaveErr){
// ERROR path (S629 Bug B): rollback HANYA kalau ini jalur CREATE generik
// (_txCreateSnapshot terisi di titik BEGIN di atas). Cabang lain (EDIT/
// cicilan/tagihan/langganan/utang) tidak pernah mengisi snapshot ini, jadi
// exception di cabang-cabang itu langsung throw ulang tanpa rollback --
// persis perilaku sebelum s629 (di luar scope Bug B, lihat AUDIT s628).
if(_txCreateSnapshot){
try{
const _restored=JSON.parse(_txCreateSnapshot);
// Restore IN-PLACE (bukan `D=_restored`) supaya identitas objek D tetap
// sama -- modul lain yang sudah pegang referensi D tidak "ketinggalan"
// versi lama (lihat catatan risiko §4 audit s628 ttg reassignment).
Object.keys(D).forEach(function(_k){delete D[_k];});
Object.assign(D,_restored);
}catch(_rollbackErr){
console.error('S629: rollback snapshot D gagal, state mungkin tidak konsisten:',_rollbackErr);
}
toast('⚠️ Gagal menyimpan transaksi, perubahan dibatalkan. Silakan coba lagi.',3000);
}
throw _txSaveErr;
}
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
// SESI TAMBAHAN (audit UI/UX "konfirmasi hapus tanpa undo" -- kalau user
// salah tap, data hilang permanen): delReminder() dipilih sbg contoh
// PERTAMA pemakaian toastUndo() (format-tema.js) krn hapusnya paling
// sederhana di seluruh app -- splice 1 index dari 1 array (`D.reminders`),
// 0 cascade ke modul lain (bandingkan delTx()/tx-list-cashflow.js yang
// punya banyak cascade *LinkId + transfer pairing -- BELUM diretrofit
// undo sesi ini, butuh audit terpisah per cascade). Pola: hapus DULU
// (state akhir langsung benar & tersimpan), baru tawarkan undo -- kalau
// user klik "Urungkan" di toast dlm 5 detik, item disisipkan balik ke
// index SEMULA (`splice(i,0,removed)`, bukan cuma `push()` ke akhir array
// -- urutan reminder lain tetap sama persis spt sebelum dihapus).
function delReminder(i){
const removed=D.reminders[i];
D.reminders.splice(i,1);
save();
renderSettings();
if(removed){
toastUndo('🗑 Reminder "'+removed.title+'" dihapus',function(){
D.reminders.splice(i,0,removed);
save();
renderSettings();
});
}
}

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
