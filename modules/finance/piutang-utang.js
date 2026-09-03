// piutang-utang.js — Domain Piutang & Utang: catatan piutang (uang dipinjamkan), utang (uang dipinjam) beserta status lunas/cicilan, dan DebtStrategy (simulasi strategi pelunasan Avalanche/Snowball).
// Dipindah ke modules/finance/piutang-utang.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Juga berisi Bill (helper hubungkan transaksi lama ke riwayat tagihan) — domain tagihan/cicilan, dipindah dari file etalase.
// Dipisah dari: features-etalase-piutang-renovai.js (sesi pemisahan domain Piutang/Utang, lanjutan roadmap PEMISAHAN-FILE-ROADMAP.md).
// DebtStrategy dipindah dari features-edukasi-pajak-utang-sewakios.js (v56) — gabung ke sini krn 1 domain (utang) & sudah dipakai Debt.renderList() di file yang sama.
// PENTING: harus dimuat sesuai urutan build.js (GROUP_A) — Debt.renderList() memanggil DebtStrategy.render() (sekarang di file yang sama, tidak perlu lagi guarded typeof check tapi tetap dipertahankan untuk jaga-jaga).
// PENTING: DebtStrategy.computeDSR() memanggil WorthIt (di worthit.js, guarded typeof check, aman krn runtime call — walau worthit.js sekarang dimuat SETELAH piutang-utang.js di urutan GROUP_A, tetap aman krn guard & dipanggil runtime setelah semua file ter-load, bukan saat load).
// PENTING: Bill.openLinkTxModal() memakai curBillHistoryId (dideklarasikan di tagihan-kalender.js) & LinkTx (di linktx.js) — dipanggil saat runtime (dari klik tombol), bukan saat load, jadi aman walau dideklarasikan di file lain asalkan semua file ikut ter-load (selalu, lewat build.js).

// _amc015: fallback lokal addMonthsClamped() (BUG-015, s406) -- file ini kadang dimuat berdiri
// sendiri lewat harness test (tests/helpers/loadSource.js) TANPA modules/shared/
// features-helpers-global-security.js ikut dimuat di sandbox yang sama, jadi addMonthsClamped()
// global belum tentu ada. Fallback ini pakai algoritma identik dgn versi global supaya hasil
// selalu sama persis di manapun dipanggil (bukan re-implementasi logic baru).
function _amc015(base,months){
if(typeof addMonthsClamped==='function')return addMonthsClamped(base,months);
if(!(base instanceof Date)||isNaN(base.getTime()))return base;
const day=base.getDate();
base.setDate(1);
base.setMonth(base.getMonth()+months);
const lastDayOfTargetMonth=new Date(base.getFullYear(),base.getMonth()+1,0).getDate();
base.setDate(Math.min(day,lastDayOfTargetMonth));
return base;
}

// resolveEntryAssetSelfPorsi(entry) — Sesi 394 (lanjutan S390 MultiOwnerEngine
// & S393 Zakat Self-Owned Portion): kalau piutang/utang ini ditautkan ke aset
// multi-owner lewat field `assetId` (opsional), balikin porsi % milik sendiri
// dari aset itu (lewat MultiOwnerEngine.selfPorsi()) -- dipakai supaya
// piutang/utang yang terkait aset patungan tidak dihitung PENUH ke Total
// Piutang/Utang (yang mengalir ke Kekayaan Bersih). BEDA sengaja dari Dana
// Titipan (dana-kelolaan.js, S195/S255): Dana Titipan mengecualikan SELURUH
// entity ber-ownership non-SELF (OwnershipEngine, 1 tipe per entity), sedang
// ini men-split porsi piutang/utang mengikuti SPLIT porsi kepemilikan aset
// terkait (MultiOwnerEngine, bisa >1 pemilik beda porsi) -- dua mekanisme
// TERPISAH, tidak saling menggantikan. Guard: assetId kosong/tidak ketemu/
// aset single-owner/engine belum dimuat -> fallback 100 (0 regresi kasus
// umum, piutang/utang tanpa assetId dihitung penuh spt sebelumnya).
function resolveEntryAssetSelfPorsi(entry){
if(!entry||!entry.assetId)return 100;
if(typeof MultiOwnerEngine==='undefined')return 100;
const asset=(D.assets||[]).find(a=>sameId(a.id,entry.assetId));
if(!asset)return 100;
const res=MultiOwnerEngine.getOwners(asset);
if(!res||!res.ok||!res.isMultiOwner)return 100;
return MultiOwnerEngine.selfPorsi(asset);
}
// getMultiOwnerAssets() — daftar aset (D.assets) yang punya >1 pemilik lewat
// MultiOwnerEngine.getOwners() (isMultiOwner true), dipakai isi pilihan
// "Kaitkan ke Aset Multi-Owner" di modal Piutang/Utang. Guard typeof
// MultiOwnerEngine -> array kosong kalau engine belum dimuat.
// FIX (ghost-asset-migrated-investment): aset lama yang sudah dimigrasi ke
// Holding Investasi (s476a, migrateAssetInvestmentsToHoldings()) ditandai
// _migratedToInvestmentId & disembunyikan dari daftar Buku Aset, TAPI masih
// ikut kefilter isMultiOwner di sini -> muncul dobel di dropdown ("Majoris"
// x2) padahal recordnya sendiri sudah tidak bisa dibuka/diedit dari UI aset.
// Filter !a._migratedToInvestmentId di bawah membuang record ghost ini dari
// SEMUA pemanggil (Piutang, Utang, Transaksi -- 1 fungsi, reuse penuh).
// 0 pengaruh ke totalValue()/zakat (sudah exclude field ini duluan).
function getMultiOwnerAssets(){
if(typeof MultiOwnerEngine==='undefined')return [];
return (D.assets||[]).filter(a=>{
if(a._migratedToInvestmentId)return false;
const r=MultiOwnerEngine.getOwners(a);
return r&&r.ok&&r.isMultiOwner;
});
}
// populateEntryAssetSelect(selId, curAssetId, excludeAssetId) — isi <select>
// pilihan aset multi-owner, dipakai SAMA PERSIS oleh modal Piutang & Utang &
// (sejak patch akun-majoris-selflink-redundant) modal Transaksi (1 fungsi,
// tidak diduplikasi). Opsi pertama selalu "Tidak dikaitkan" (assetId kosong
// -> resolveEntryAssetSelfPorsi() fallback 100, perilaku lama).
// excludeAssetId (opsional, string/null) — kalau diisi, aset dgn id itu
// DIBUANG dari daftar pilihan (dipakai transaksi.js utk exclude aset yang
// accountId-nya SAMA dgn akun/metode yg lagi dipilih di form -- lihat
// findMultiOwnerAssetForAccount() & komentar updateTxAssetWrapVisibility(),
// 0 pengaruh ke pemanggil lama piutang/utang yang tidak mengisi parameter
// ini (default undefined -> filter di-skip, perilaku 100% sama spt
// sebelumnya).
function populateEntryAssetSelect(selId,curAssetId,excludeAssetId){
const sel=document.getElementById(selId);
if(!sel)return;
let assets=getMultiOwnerAssets();
if(excludeAssetId)assets=assets.filter(a=>!sameId(a.id,excludeAssetId));
sel.innerHTML='<option value="">— Tidak dikaitkan —</option>'+assets.map(a=>`<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
sel.value=(curAssetId&&assets.some(a=>sameId(a.id,curAssetId)))?curAssetId:'';
}
// isPiutangOwnershipSelf(p) — helper REUSE dari OwnershipEngine (Sesi 255,
// Ownership Sync Piutang & Utang), pola SAMA PERSIS isAssetOwnershipSelf()
// (Sesi 193, modules/asset/aset.js). Guard typeof OwnershipEngine: kalau
// engine belum dimuat, SEMUA piutang dianggap SELF (regresi lama tetap
// jalan, tidak pernah dikecualikan).
function isPiutangOwnershipSelf(p){
if(typeof OwnershipEngine==='undefined')return true;
return OwnershipEngine.resolve(p).type==='SELF';
}
// maybeCreateSharedPiutangFromBill(b, txId) — Sesi 341 (fitur baru, lihat
// docs/CLAUDE.md § "Ditanggung Bersama → Piutang"): dipanggil SETIAP KALI
// tagihan/cicilan/langganan "Ditanggung Bersama" ini dibayar (markBillPaid,
// tagihan-kalender.js). Field bill: shared (bool), totalAmount (Rp penuh),
// amount (porsi SAYA yang sudah dicatat sbg expense), sharedOtherName
// (opsional), sharedAutoPiutang (bool, toggle di modal Edit Tagihan).
// Kalau aktif, sisa porsi (totalAmount - amount) yang DITALANGI dari kantong
// sendiri otomatis dicatat sbg 1 entri Piutang baru berstatus belum lunas
// (bukan mengubah bill/transaksi yg sudah ada) -- supaya kelihatan di 🤝
// Piutang & bisa ditagih/ditandai lunas terpisah dari alur Tagihan. 0
// perubahan pada `amount`/`totalAmount` yang sudah ada (murni tambahan).
// Guard: field baru (shared/sharedAutoPiutang) undefined di semua bill LAMA
// (dibuat sebelum fitur ini ada) -> otomatis skip, 100% backward compatible.
// Guard dobel (fix s286): fungsi ini sekarang juga dipanggil dari alur EDIT
// transaksi cicilan (transaksi.js, cabang isLatestInstallment) supaya piutang
// utk transaksi yg SEDANG diedit langsung tercatat -- sebelumnya baru muncul
// di pembayaran BERIKUTNYA. Krn edit yg sama bisa disimpan ulang (mis. user
// cuma ganti kategori lalu Simpan lagi), tanpa guard ini tiap simpan ulang
// bakal bikin entri Piutang baru lagi utk txId yg SAMA (dobel/berkali-kali).
// -> skip kalau txId ini sudah pernah punya entri Piutang otomatis.
function maybeCreateSharedPiutangFromBill(b,txId){
if(!b||!b.shared||!b.sharedAutoPiutang)return;
if(D.piutang&&D.piutang.some(p=>p.autoTxId===txId))return;
const sisa=Math.round((b.totalAmount||0)-(b.amount||0));
if(sisa<=0)return;
if(!D.piutang)D.piutang=[];
D.piutang.push({
id:uid(),
name:b.sharedOtherName?b.sharedOtherName:('Porsi bersama: '+(b.name||'Tagihan')),
nilai:sisa,
tanggal:todayStr(),
jatuhTempo:'',
catatan:'Otomatis dari pembayaran "'+(b.name||'Tagihan')+'" (Ditanggung Bersama)',
lunas:false,
autoBillId:b.id,
autoTxId:txId
});
// Self-contained refresh (bukan cuma save() di caller) -- markBillPaid()
// punya beberapa titik early-return (utang lunas/cicilan lunas/tagihan
// sekali-selesai) SEBELUM refreshBillEverywhere() dipanggil di sana, jadi
// render di sini supaya Piutang & Kekayaan Bersih tetap ikut update di
// SEMUA jalur, bukan cuma jalur "normal" (dijadwalkan ulang).
if(typeof Piutang!=='undefined')Piutang.renderList();
if(typeof renderKekayaanBersih==='function')renderKekayaanBersih();
if(typeof hitungZakatMaal==='function')hitungZakatMaal();
}
// removeOrphanedAutoPiutangForBill(billId) — FIX (audit user, sync 2 arah "Ditanggung
// Bersama"): dulu hapus TAGIHAN itu sendiri (delBill/delBillArchive, tagihan-kalender.js)
// tidak pernah membersihkan D.piutang yang autoBillId-nya nunjuk ke tagihan tsb -- beda dgn
// hapus TRANSAKSI pembayarannya (revertBillFromDeletedTx, sudah sync lewat autoTxId). Piutang
// otomatis jadi orphan permanen, tetap kehitung di Kekayaan Bersih walau sumbernya sudah tidak
// ada. Reuse pola sama (filter + hitung selisih panjang array) dipisah jadi fungsi sendiri
// biar dipakai kedua jalur hapus (aktif & arsip) tanpa duplikasi.
function removeOrphanedAutoPiutangForBill(billId){
if(!billId||!D.piutang||!D.piutang.length)return false;
const before=D.piutang.length;
D.piutang=D.piutang.filter(p=>p.autoBillId!==billId);
return D.piutang.length<before;
}
// syncOutstandingSharedPiutang(billId,newSisa) — FIX (audit user, sync 2 arah "Ditanggung
// Bersama"): dulu edit tagihan shared (_saveBillInner, koreksi totalAmount/sharedPct) tidak
// pernah menulis balik ke piutang yang SUDAH terlanjur dibuat dari pembayaran sebelumnya --
// piutang lama tetap kepatok ke nominal sisa yg salah. Sekarang, kalau tagihan itu masih
// shared+sharedAutoPiutang setelah diedit, piutang otomatis yang BELUM lunas (masih ditagih,
// bukan riwayat yg sudah kelar) ikut disesuaikan ke sisa porsi terbaru. Piutang yang SUDAH
// lunas (histori valid dari periode lalu) sengaja TIDAK disentuh -- itu catatan historis yang
// sudah selesai, bukan proyeksi yang perlu dikoreksi ke belakang.
// FIX (lanjutan audit user, gap #2): sebelumnya fungsi ini nge-flatten SEMUA piutang
// belum-lunas dgn autoBillId yg sama ke nilai baru yg SAMA PERSIS. Kalau langganan/cicilan
// shared ini nunggak ditagih 2-3 periode sekaligus (ada beberapa piutang belum lunas dgn
// nilai historis beda-beda per periode), edit tagihan sekarang bakal menyamaratakan
// semuanya -- menimpa data periode lama yg sebenarnya valid. Sekarang dibatasi ke piutang
// PERIODE TERBARU saja (autoTxId terbesar di antara yg belum lunas), pola sama seperti
// isLatestInstallment/isLatestBillPaymentTx yg sudah dipakai di transaksi.js/tagihan-kalender.js.
function syncOutstandingSharedPiutang(billId,newSisa){
if(!billId||!D.piutang||!D.piutang.length)return 0;
const sisa=Math.max(0,Math.round(newSisa||0));
const outstanding=D.piutang.filter(p=>p.autoBillId===billId&&!p.lunas);
if(!outstanding.length)return 0;
const latest=outstanding.reduce((a,b)=>((b.autoTxId||0)>(a.autoTxId||0)?b:a));
latest.nilai=sisa;
return 1;
}
// getAutoPiutangIdForBill(billId,piutangList) — FIX ringkas (audit lanjutan user, laporan
// "chip 🧾 satu arah aja (Piutang->Tagihan)"): s300 nambah chip "🧾 Tagihan asal" di kartu
// Piutang otomatis (p.autoBillId) yang buka balik ke tagihan sumbernya (openBillModal), tapi
// arah sebaliknya belum ada -- kartu Tagihan yang jadi sumber piutang otomatis
// (sharedAutoPiutang) tidak punya link cepat ke piutangnya. Fungsi murni ini nentuin SATU
// piutang mana yang harus ditautkan balik dari sisi Tagihan (dipakai renderBillItemHtml,
// modules-render.js) -- prioritas ke piutang yang BELUM lunas (masih perlu ditagih, paling
// actionable buat user), kalau semua entri utk billId ini sudah lunas baru fallback ke entri
// TERBARU (autoTxId terbesar, pola sama isLatestBillPaymentTx/syncOutstandingSharedPiutang di
// atas) sbg riwayat. Fungsi murni (tidak baca/tulis D/DOM) supaya bisa dites tanpa DOM.
function getAutoPiutangIdForBill(billId,piutangList){
if(!billId||!piutangList||!piutangList.length)return null;
const matches=piutangList.filter(p=>p.autoBillId===billId);
if(!matches.length)return null;
const unlunas=matches.filter(p=>!p.lunas);
const pool=unlunas.length?unlunas:matches;
return pool.reduce((a,b)=>((b.autoTxId||0)>(a.autoTxId||0)?b:a)).id;
}
// syncSharedPiutangOnPaymentEdit(txId,oldAmount,newAmount) — FIX (lanjutan audit user,
// sync 2 arah "Ditanggung Bersama"): edit jumlah di 📋 Riwayat Pembayaran
// (saveBillHistoryEdit, tagihan-kalender.js) mengoreksi porsi SAYA pada 1 transaksi
// historis (t.amount) -- kalau transaksi itu yang jadi sumber 1 piutang otomatis
// (autoTxId cocok) & piutang itu belum lunas, sisa piutang disesuaikan supaya TOTAL
// periode itu (porsi saya + sisa pihak lain) tetap sama seperti semula: total lama =
// nilai_lama + oldAmount, sisa baru = total lama - newAmount = nilai_lama + oldAmount -
// newAmount. Piutang yang sudah lunas TIDAK disentuh (histori yang sudah selesai).
function syncSharedPiutangOnPaymentEdit(txId,oldAmount,newAmount){
if(!txId||!D.piutang||!D.piutang.length)return false;
const p=D.piutang.find(x=>x.autoTxId===txId&&!x.lunas);
if(!p)return false;
p.nilai=Math.max(0,Math.round((p.nilai||0)+(oldAmount||0)-(newAmount||0)));
return true;
}
// syncDebtBalanceOnPaymentEdit(bill,oldAmount,newAmount) — FIX (audit user, item #4 dari
// laporan s299 -- pola "sync 2 arah" yang sama kayak Piutang di atas, tapi arah Utang):
// D.debts[].nilai adalah SATU angka sisa yang berkurang tiap kali `bill.kind==='utang'`
// dibayar (lihat markBillPaid(), tagihan-kalender.js: `dbt.nilai-=b.amount`). Kalau jumlah
// SATU transaksi pembayaran itu dikoreksi belakangan (lewat 📋 Riwayat Pembayaran ATAU
// modal Transaksi biasa), sisa utang harus ikut disesuaikan sebesar selisihnya -- kalau
// tidak, sisa utang jadi basi permanen (tetap mencerminkan jumlah LAMA, bukan yang baru).
// Beda dari Piutang (s299 gap #2): di sana ada BANYAK entri piutang independen per-periode
// (perlu dibatasi ke "periode terbaru saja" biar histori lama tidak ketimpa) -- di sini
// cuma SATU angka running total, jadi selisihnya berlaku langsung tanpa perlu pembatasan
// itu. Pembatasan "pembayaran TERBARU saja" tetap dipakai oleh caller (isLatestInstallment/
// isLatestBillPaymentTx) supaya scope fix ini konsisten & konservatif (edit pembayaran lama
// pada utang yang sudah lunas/diarsip -- kasus langka -- di luar cakupan, caller cukup skip
// panggil fungsi ini kalau bukan pembayaran terbaru).
function syncDebtBalanceOnPaymentEdit(bill,oldAmount,newAmount){
if(!bill||bill.kind!=='utang'||!bill.debtId)return false;
const dbt=D.debts.find(x=>sameId(x.id,bill.debtId));
if(!dbt)return false;
dbt.nilai=Math.max(0,(dbt.nilai||0)+(oldAmount||0)-(newAmount||0));
return true;
}
// maybeCreateTitipanTalanganPiutang(tx) — Sesi 519 (LANJUTKAN-S519, Design
// Lock S518, Gap #3 lanjutan). Pola SAMA PERSIS
// maybeCreateSharedPiutangFromBill() (di atas) tapi utk 1 transaksi expense
// yang ditandai "talangan Dana Titipan" (`tx.titipanLinkId` +
// `tx.titipanTalangan===true`, field baru transaksi.js S519) -- BUKAN
// Ditanggung Bersama tagihan (mekanisme TERPISAH, 0 field lama disentuh).
// Idempotency SAMA PERSIS (skip kalau `tx.id` ini sudah pernah punya entri
// Piutang otomatis manapun -- Hard Invariant #11 "CREATE ulang/idempotent
// tidak menghasilkan duplicate").
// ISOLASI: HANYA menyentuh `D.piutang` (+ `uid()`/`todayStr()` existing,
// 0 utility baru) -- tidak menyentuh `D.titipanCommitments`/`principalAmount`
// (Hard Invariant #1-3, "principal immutable").
function maybeCreateTitipanTalanganPiutang(tx){
if(!tx||tx.type!=='expense'||!tx.titipanLinkId||tx.titipanTalangan!==true)return;
if(D.piutang&&D.piutang.some(p=>p.autoTxId===tx.id))return;
if(!D.piutang)D.piutang=[];
const known=(typeof DanaTitipanPortfolioAPI!=='undefined'&&typeof DanaTitipanPortfolioAPI.listExistingOwners==='function')?DanaTitipanPortfolioAPI.listExistingOwners().find(o=>o.ownerId===tx.titipanLinkId):null;
const ownerName=known?known.ownerName:'Pemilik dana titipan';
D.piutang.push({
id:uid(),
name:'Talangan Dana Titipan: '+ownerName,
nilai:tx.amount,
tanggal:todayStr(),
jatuhTempo:'',
catatan:'Otomatis dari transaksi talangan Dana Titipan ('+(tx.note||'')+')',
lunas:false,
autoTxId:tx.id,
autoTitipanOwnerId:tx.titipanLinkId
});
}
// syncTitipanTalanganPiutangOnEdit(txId,oldAmount,newAmount) — Sesi 519,
// pola SAMA PERSIS syncSharedPiutangOnPaymentEdit() (di atas) tapi dicari
// via `autoTxId===txId` langsung (bukan lewat `autoBillId`+"periode
// terbaru") -- 1 transaksi talangan Dana Titipan SELALU 1:1 dgn maksimal 1
// piutang otomatis (idempotency di atas), beda dari shared-piutang tagihan
// yang bisa py banyak entri per periode. Piutang yang SUDAH lunas TIDAK
// disentuh (Hard Invariant #14).
function syncTitipanTalanganPiutangOnEdit(txId,oldAmount,newAmount){
if(!txId||!D.piutang||!D.piutang.length)return false;
const p=D.piutang.find(x=>x.autoTxId===txId&&!x.lunas);
if(!p)return false;
p.nilai=Math.max(0,(p.nilai||0)+(oldAmount||0)-(newAmount||0));
return true;
}
// removeUnpaidTitipanTalanganPiutangForTx(txId) — Sesi 519. Hapus piutang
// otomatis talangan Dana Titipan (by `autoTxId===txId`) HANYA kalau BELUM
// lunas -- piutang yang SUDAH lunas dipertahankan sbg historical record
// (Hard Invariant #16/#18/#20, pola konsisten seluruh lifecycle piutang
// otomatis di codebase ini). Dipakai jalur EDIT owner/UNLINK (transaksi.js)
// & DELETE transaksi (tx-list-cashflow.js, delTx()) -- SATU fungsi dipakai
// kedua jalur (0 duplikasi logic "hapus kalau belum lunas").
// Return `true` kalau ada yang terhapus.
function removeUnpaidTitipanTalanganPiutangForTx(txId){
if(!txId||!D.piutang||!D.piutang.length)return false;
const before=D.piutang.length;
D.piutang=D.piutang.filter(p=>!(p.autoTxId===txId&&!p.lunas));
return D.piutang.length<before;
}
// maybeCreateTitipanPinjamUtang(tx) — Sesi 714 (lanjutan rencana "arah dana
// eksplisit Piutang vs Utang", lihat catatan status di
// titipan-expense-flow.js). Pola SAMA PERSIS
// maybeCreateTitipanTalanganPiutang() (di atas) tapi utk arah Utang --
// transaksi expense yang ditandai `tx.titipanLinkId` + `tx.titipanPinjamUtang
// ===true` (field baru transaksi.js, diset TitipanExpenseFlow/UI) otomatis
// bikin 1 utang ("Pinjam Dana Titipan") di `D.debts`, BUKAN piutang.
// Talangan/Piutang menang kalau kedua flag kebetulan sama-sama true (defensif,
// seharusnya mutually exclusive dari UI) -- 0 utang dibuat kalau
// `tx.titipanTalangan===true` (Hard Invariant konsistensi jalur talangan).
// Idempotency SAMA PERSIS (skip kalau `tx.id` ini sudah pernah punya entri
// Utang otomatis manapun). ISOLASI: HANYA menyentuh `D.debts` (+
// `uid()`/`todayStr()` existing, 0 utility baru) -- tidak menyentuh
// `D.titipanCommitments`/`principalAmount` (principal immutable).
function maybeCreateTitipanPinjamUtang(tx){
if(!tx||tx.type!=='expense'||!tx.titipanLinkId||tx.titipanPinjamUtang!==true)return;
if(tx.titipanTalangan===true)return;
if(D.debts&&D.debts.some(d=>d.autoTxId===tx.id))return;
if(!D.debts)D.debts=[];
const known=(typeof DanaTitipanPortfolioAPI!=='undefined'&&typeof DanaTitipanPortfolioAPI.listExistingOwners==='function')?DanaTitipanPortfolioAPI.listExistingOwners().find(o=>o.ownerId===tx.titipanLinkId):null;
const ownerName=known?known.ownerName:'Pemilik dana titipan';
D.debts.push({
id:uid(),
name:'Pinjam Dana Titipan: '+ownerName,
jenis:'pribadi',
nilai:tx.amount,
bunga:0,
cicilanBulanan:0,
tanggal:todayStr(),
jatuhTempo:'',
catatan:'Otomatis dari transaksi pinjam Dana Titipan ('+(tx.note||'')+')',
lunas:false,
autoTxId:tx.id,
autoTitipanOwnerId:tx.titipanLinkId
});
}
// syncTitipanPinjamUtangOnEdit(txId,oldAmount,newAmount) — Sesi 714, pola
// SAMA PERSIS syncTitipanTalanganPiutangOnEdit() (di atas) tapi dicari di
// `D.debts`. Utang yang SUDAH lunas TIDAK disentuh (Hard Invariant #14).
function syncTitipanPinjamUtangOnEdit(txId,oldAmount,newAmount){
if(!txId||!D.debts||!D.debts.length)return false;
const d=D.debts.find(x=>x.autoTxId===txId&&!x.lunas);
if(!d)return false;
d.nilai=Math.max(0,(d.nilai||0)+(oldAmount||0)-(newAmount||0));
return true;
}
// removeUnpaidTitipanPinjamUtangForTx(txId) — Sesi 714. Hapus utang
// otomatis "Pinjam Dana Titipan" (by `autoTxId===txId`) HANYA kalau BELUM
// lunas -- utang yang SUDAH lunas dipertahankan sbg historical record (pola
// SAMA PERSIS removeUnpaidTitipanTalanganPiutangForTx()). Dipakai jalur EDIT
// owner/UNLINK (transaksi.js) & DELETE transaksi (tx-list-cashflow.js,
// delTx()). Return `true` kalau ada yang terhapus.
function removeUnpaidTitipanPinjamUtangForTx(txId){
if(!txId||!D.debts||!D.debts.length)return false;
const before=D.debts.length;
D.debts=D.debts.filter(d=>!(d.autoTxId===txId&&!d.lunas));
return D.debts.length<before;
}
// populateSyncTxAccSelect(selId) — AUDIT-SYNC-PIUTANG-UTANG-ARUS-KAS §5.1:
// isi <select> Akun di piutangModal/debtModal, pola SAMA PERSIS billAcc
// (tagihan-kalender.js) -- 1 fungsi dipakai kedua modal (0 duplikasi).
function populateSyncTxAccSelect(selId){
const el=document.getElementById(selId);
if(!el)return;
el.innerHTML=(D.accounts||[]).map(a=>`<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
}
// togglePiutangSyncTxFields()/toggleDebtSyncTxFields() — tampil/sembunyi
// wrap Akun sesuai toggle "🧾 Catat juga sebagai transaksi arus kas"
// (§5.1). Default OFF (dikonfirmasi user) -- lihat openModal() masing2.
function togglePiutangSyncTxFields(){
const on=document.getElementById('piutangSyncTx').checked;
document.getElementById('piutangSyncTxWrap').classList.toggle('u-dnone',!on);
if(on)populateSyncTxAccSelect('piutangSyncTxAcc');
}
function toggleDebtSyncTxFields(){
const on=document.getElementById('debtSyncTx').checked;
document.getElementById('debtSyncTxWrap').classList.toggle('u-dnone',!on);
if(on)populateSyncTxAccSelect('debtSyncTxAcc');
}
// createPiutangUtangAutoTx(entry,type,category,accountId,note) — AUDIT-SYNC-
// PIUTANG-UTANG-ARUS-KAS §5.1/§5.2: dorong 1 transaksi arus kas LANGSUNG ke
// D.transactions (pola SAMA PERSIS titik push lain se-codebase, mis.
// tagihan-kalender.js:1014/kasir.js:367 -- 0 generator baru). Nilai dicatat
// PENUH (100%, TIDAK ikut logic porsi assetId -- keputusan §6.4) ke akun
// yang dipilih user. Balikin tx.id yang baru dibuat.
function createPiutangUtangAutoTx(type,amount,accountId,category,note,date){
const tx={id:uid(),type,amount,category,subcategory:'',accountId,payMethod:'tunai',note,date:date||todayStr()};
D.transactions.push(tx);
return tx.id;
}
const Piutang={
editId:null,
_lunasState:false,
openModal(id){
Piutang.editId=id||null;
const p=id?D.piutang.find(x=>sameId(x.id,id)):null;
document.getElementById('piutangModalTitle').textContent=p?'Edit Piutang':'Tambah Piutang';
document.getElementById('piutangName').value=p?p.name:'';
document.getElementById('piutangNilai').value=p?p.nilai:'';
document.getElementById('piutangTanggal').value=p?(p.tanggal||''):todayStr();
document.getElementById('piutangJatuhTempo').value=p?(p.jatuhTempo||''):'';
document.getElementById('piutangCatatan').value=p?(p.catatan||''):'';
populateEntryAssetSelect('piutangAssetId',p?p.assetId:'');
Piutang._lunasState=p?!!p.lunas:false;
const btn=document.getElementById('piutangLunasBtn');
btn.textContent=Piutang._lunasState?'✓ Lunas':'Belum Lunas';
btn.className='chip-btn'+(Piutang._lunasState?' active':'');
// AUDIT-SYNC-PIUTANG-UTANG-ARUS-KAS §5.5: toggle SELALU default OFF saat
// buka modal (baik tambah baru maupun edit) -- ini toggle "buat transaksi
// SEKALI saat disimpan", bukan field data piutang yang persist, jadi tidak
// pernah di-restore dari `p` (entry lama sudah lewat titik itu, edit ulang
// tidak boleh bikin transaksi kedua secara tidak sengaja).
const syncEl=document.getElementById('piutangSyncTx');
if(syncEl)syncEl.checked=false;
document.getElementById('piutangSyncTxWrap').classList.add('u-dnone');
openModal('piutangModal');
},
toggleLunas(){
Piutang._lunasState=!Piutang._lunasState;
const btn=document.getElementById('piutangLunasBtn');
btn.textContent=Piutang._lunasState?'✓ Lunas':'Belum Lunas';
btn.className='chip-btn'+(Piutang._lunasState?' active':'');
},
save(){return withSaveGuard('piutang','piutangModal',Piutang._saveInner);},
_saveInner(){
const name=document.getElementById('piutangName').value.trim();
if(!name){toast('⚠️ Nama peminjam wajib diisi');return;}
const nilai=parsePzNum(document.getElementById('piutangNilai').value);
// FIX (BUG-FIN-001): guard nilai<=0 -- sebelumnya parsePzNum() bisa
// menghasilkan 0 (kosong/non-digit) atau NEGATIF (input diawali "-") tanpa
// peringatan, lolos tersimpan & ikut ke Total Piutang/Net Worth. Pola sama
// persis dgn save() lain se-codebase (mis. tagihan-kalender.js:683).
if(!nilai||nilai<=0){toast('⚠️ Nilai piutang harus lebih dari 0');return;}
const tanggal=document.getElementById('piutangTanggal').value||'';
const jatuhTempo=document.getElementById('piutangJatuhTempo').value||'';
const catatan=document.getElementById('piutangCatatan').value.trim();
const assetIdEl=document.getElementById('piutangAssetId');
const assetId=assetIdEl?assetIdEl.value:'';
// AUDIT-SYNC-PIUTANG-UTANG-ARUS-KAS §5.1: toggle "🧾 Catat juga sebagai
// transaksi arus kas" HANYA berlaku saat piutang BARU dibuat (bukan edit
// -- edit tidak boleh nyipta transaksi kedua, konsisten §5.5/toggle default
// OFF saat openModal()). Idempotency alami: toggle selalu balik OFF tiap
// buka modal, jadi tidak ada jalur user tanpa sadar bikin tx dobel.
const syncTxEl=document.getElementById('piutangSyncTx');
const doSyncTx=!Piutang.editId&&syncTxEl&&syncTxEl.checked;
const syncTxAccEl=document.getElementById('piutangSyncTxAcc');
const syncTxAcc=syncTxAccEl?syncTxAccEl.value:'';
if(doSyncTx&&!syncTxAcc){toast('⚠️ Pilih Akun dulu untuk mencatat transaksi arus kas');return;}
let linkedTxId=null;
if(doSyncTx)linkedTxId=createPiutangUtangAutoTx('expense',nilai,syncTxAcc,'Piutang','Piutang: '+name,tanggal);
if(Piutang.editId){
const p=D.piutang.find(x=>sameId(x.id,Piutang.editId));
if(!p){toast('⚠️ Piutang tidak ditemukan, coba tutup dan buka lagi');return;}
// AUDIT-SYNC-PIUTANG-UTANG-ARUS-KAS §5.2: transisi Belum Lunas -> Lunas
// pada piutang yang PUNYA linkedTxId (dibuat lewat §5.1) otomatis mencatat
// 1 transaksi pelunasan (income, ke akun YANG SAMA persis dgn transaksi
// awal -- reuse tx.accountId, tidak minta pilih akun lagi). Idempotent via
// linkedPayoffTxId (pola sama autoTxId di maybeCreateTitipanTalanganPiutang
// di atas) -- sekali dibuat, edit ulang tidak pernah nyipta transaksi
// pelunasan kedua.
const becameLunas=!p.lunas&&Piutang._lunasState;
if(becameLunas&&p.linkedTxId&&!p.linkedPayoffTxId){
const origTx=D.transactions.find(t=>sameId(t.id,p.linkedTxId));
if(origTx){
p.linkedPayoffTxId=createPiutangUtangAutoTx('income',nilai,origTx.accountId,'Piutang','Piutang lunas: '+name,todayStr());
}
}
Object.assign(p,{name,nilai,tanggal,jatuhTempo,catatan,assetId,lunas:Piutang._lunasState});
} else {
const newP={id:uid(),name,nilai,tanggal,jatuhTempo,catatan,assetId,lunas:Piutang._lunasState};
if(linkedTxId)newP.linkedTxId=linkedTxId;
D.piutang.push(newP);
}
save();
closeModal('piutangModal');
Piutang.renderList();renderKekayaanBersih();hitungZakatMaal();
toast('✅ Piutang tersimpan');
},
// FIX (BUG-DEL-TITIPAN lanjutan, audit 2026-08 — bug SERUPA ditemukan di sisi
// Piutang): entri piutang otomatis (autoBillId/autoTxId dari
// maybeCreateSharedPiutangFromBill(), atau autoTxId/autoTitipanOwnerId dari
// maybeCreateTitipanTalanganPiutang()) BUKAN piutang manual -- dia
// AUTO-GENERATE ULANG kalau transaksi sumbernya (pembayaran cicilan/tagihan
// "Ditanggung Bersama", atau transaksi "talangan Dana Titipan") diedit &
// disimpan ulang lagi (lihat cabang `hasExistingAutoPiutang` di
// transaksi.js dekat syncSharedPiutangOnPaymentEdit(), & applyTxTitipanLinkageOnSave()
// -- keduanya panggil ulang maybeCreateSharedPiutangFromBill()/
// maybeCreateTitipanTalanganPiutang() yang idempotency-nya cuma cek "apa
// tx.id ini SUDAH punya entri Piutang" -- kalau user hapus manual duluan,
// guard itu lolos & entri BARU dibuat lagi). Pola identik Debt.delete() di
// atas: delete "tampak sukses" (tidak error), tapi baris balik lagi begitu
// transaksi sumbernya disentuh lagi -- bukan langsung, tapi tetap silent
// resurrection, bukan penghapusan permanen yang user kira. Piutang manual
// (tanpa autoBillId/autoTxId/autoTitipanOwnerId) tidak kena masalah ini.
// Fix pola SAMA PERSIS Debt.delete(): cegah SEBELUM proses hapus jalan,
// toast jelaskan cara benarnya -- edit/batalkan dari transaksi atau tagihan
// sumbernya (bukan dari baris piutang ini langsung).
async delete(id){
const p=D.piutang.find(x=>sameId(x.id,id));
// AUDIT-SYNC-PIUTANG-UTANG-ARUS-KAS §5.4: reuse guard yang sama -- piutang
// yang punya `linkedTxId` (dibuat lewat toggle §5.1) juga tidak bisa
// dihapus langsung dari sini, biar transaksi arus kas terkait tidak jadi
// yatim tanpa piutang sumbernya.
if(p&&(p.autoBillId||p.autoTxId||p.autoTitipanOwnerId||p.linkedTxId)){
if(typeof toast==='function')toast('Piutang ini tercatat otomatis dari transaksi/pembayaran tagihan terkait, tidak bisa dihapus langsung. Batalkan/edit dari transaksi atau tagihan sumbernya (tombol 🧾 di atas) supaya piutangnya ikut disesuaikan.',3600);
return;
}
if(!await askConfirm('Hapus catatan piutang ini?',{okText:'Ya, Hapus'}))return;
D.piutang=D.piutang.filter(p=>!sameId(p.id,id));
save();
Piutang.renderList();renderKekayaanBersih();hitungZakatMaal();
},
// totalValue() — Sesi 255 (Ownership Sync): TAMBAH 1 filter
// isPiutangOwnershipSelf(p) di atas filter lunas yang sudah ada (pola
// SAMA PERSIS Aset.totalValue(), Sesi 193) — piutang ber-ownership
// INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY DIKECUALIKAN dari Total Piutang
// (yang mengalir ke Net Worth/Dashboard/Report/AI lewat totalPiutangValue()),
// TAPI TIDAK dihapus dari D.piutang (histori tetap tersimpan, masih
// tampil di Piutang.renderList()). 0 rumus diubah.
// S394: kalikan tiap piutang dgn resolveEntryAssetSelfPorsi(p)/100 --
// piutang tanpa assetId (mayoritas) selalu porsi 100, jadi rumus TETAP
// PERSIS `nilai` seperti sebelumnya (0 regresi kasus umum).
totalValue(){return(D.piutang||[]).filter(isPiutangOwnershipSelf).filter(p=>!p.lunas).reduce((s,p)=>s+(p.nilai||0)*(resolveEntryAssetSelfPorsi(p)/100),0);},
overdueDays(p){
if(p.lunas||!p.jatuhTempo)return 0;
const jt=new Date(p.jatuhTempo);
if(isNaN(jt.getTime()))return 0;
const today=new Date();today.setHours(0,0,0,0);jt.setHours(0,0,0,0);
const diff=Math.round((today-jt)/86400000);
return diff>0?diff:0;
},
sortedActive(){
const active=(D.piutang||[]).filter(p=>!p.lunas);
return active.slice().sort((a,b)=>{
const oa=Piutang.overdueDays(a),ob=Piutang.overdueDays(b);
if(oa>0&&ob>0)return(ob*(b.nilai||0))-(oa*(a.nilai||0));
if(oa>0)return -1;
if(ob>0)return 1;
if(a.jatuhTempo&&b.jatuhTempo)return new Date(a.jatuhTempo)-new Date(b.jatuhTempo);
if(a.jatuhTempo)return -1;
if(b.jatuhTempo)return 1;
return(b.nilai||0)-(a.nilai||0);
});
},
renderList(){
if(typeof PiutangUtangInsight!=='undefined')PiutangUtangInsight.render();
const el=document.getElementById('piutangList');
if(!el)return;
const list=D.piutang||[];
if(!list.length){el.innerHTML='<div class="empty"><div class="empty-icon">🤝</div><div class="empty-text">Belum ada piutang tercatat</div></div>';return;}
const today=new Date().toISOString().slice(0,10);
const active=Piutang.sortedActive();
const lunas=list.filter(p=>p.lunas);
const topOverdueDays=active.length?Piutang.overdueDays(active[0]):0;
let summaryHtml='';
if(topOverdueDays>0){
summaryHtml=`<div class="u-fs12 u-cacc2 u-r10 u-mb10 u-lh15" style="padding:9px 11px;background:var(--accent2-soft)">🔥 <b>Prioritas tagih: ${escapeHtml(active[0].name)}</b> — ${fmt(active[0].nilai)}, sudah lewat jatuh tempo ${topOverdueDays} hari. Piutang yang telat lama & nominalnya besar makin berisiko jadi macet, tagih ini duluan.</div>`;
}
const ordered=[...active,...lunas];
el.innerHTML=summaryHtml+ordered.map((p,idx)=>{
// BUGFIX (audit pola sama S601 InvestmentListUI._renderList "0 reaksi"): baris ini
// panggil resolveEntryAssetSelfPorsi()/overdueDays() per-piutang TANPA try/catch --
// 1 piutang error bikin SELURUH .map() throw sebelum el.innerHTML ke-assign, daftar
// piutang tetap nampilin render sukses SEBELUMNYA (tap = 0 reaksi). Fix: bungkus,
// fallback ke baris aman ber-badge ⚠️ kalau gagal.
try{
const overdue=!p.lunas&&p.jatuhTempo&&p.jatuhTempo<today;
const isPrioritas=idx===0&&topOverdueDays>0&&!p.lunas;
const od=overdue?Piutang.overdueDays(p):0;
const metaParts=[];
if(p.jatuhTempo)metaParts.push(overdue?`⚠️ Telat ${od} hari (jatuh tempo ${p.jatuhTempo})`:'Jatuh tempo '+p.jatuhTempo);
if(p.catatan)metaParts.push(escapeHtml(p.catatan));
// UX (non-urgent, laporan audit sync Piutang↔Tagihan): piutang otomatis (autoBillId)
// sebelumnya cuma bisa dibedain dari yang manual lewat field internal, tidak kelihatan
// di UI -- gampang salah edit/hapus dikira piutang manual biasa. Tambah chip kecil
// "🧾 Lihat tagihan asal" yang buka modal tagihan sumbernya langsung (reuse openBillModal,
// yang sudah handle tagihan yang sudah diarsip/dihapus -- lihat tagihan-kalender.js).
// data-stop="1" wajib supaya klik chip tidak ikut trigger data-action="openPiutangModal"
// milik parent tx-item (pola sama dgn tombol 🗑 Hapus di bawah).
if(p.autoBillId)metaParts.push(`<span class="u-fs10 u-pointer u-r6" style="color:var(--text2);background:var(--bg3);padding:1px 6px;border:1px solid var(--border)" data-stop="1" data-action="openBillModal" data-args="${escapeHtml(JSON.stringify([p.autoBillId]))}" title="Lihat tagihan asal">🧾 Tagihan asal</span>`);
// FIX (BUG-DEL-TITIPAN lanjutan): badge SAMA jenisnya utk piutang "Talangan
// Dana Titipan" (autoTxId+autoTitipanOwnerId, TANPA autoBillId -- sumbernya
// transaksi biasa, bukan tagihan, jadi tidak dapat chip "🧾 Tagihan asal" di
// atas). Sebelumnya piutang ini TIDAK PUNYA penanda visual apa pun -- kelihatan
// persis piutang manual biasa, padahal auto-sync dari transaksi (lihat
// maybeCreateTitipanTalanganPiutang(), guard di Piutang.delete() di atas).
if(p.autoTitipanOwnerId&&!p.autoBillId)metaParts.push('🔒 Talangan Dana Titipan — otomatis dari transaksi');
// S394: badge porsi kepemilikan kalau piutang ini ditautkan ke aset
// multi-owner (assetId) & porsinya < 100 -- kasus umum (tanpa assetId)
// tidak pernah menampilkan badge ini.
if(p.assetId){const _porsi=resolveEntryAssetSelfPorsi(p);if(_porsi<100)metaParts.push(`👥 Porsi Anda ${_porsi}% dari aset multi-owner`);}
const badge=p.lunas?' <span class="bill-due-badge bill-due-ok u-ml4">Lunas</span>'
:(isPrioritas?' <span class="u-fs10 u-r6 u-ml4" style="color:#fff;background:var(--accent2);padding:1px 5px">🔥 Prioritas</span>'
:(overdue?' <span class="bill-due-badge bill-due-urgent u-ml4">Jatuh Tempo</span>':''));
// FIX (BUG-DEL-TITIPAN lanjutan): sembunyikan tombol 🗑 utk piutang otomatis
// (autoBillId/autoTxId/autoTitipanOwnerId), pola SAMA PERSIS Debt.renderList()
// -- ganti ikon 🔒 kecil ber-tooltip, defense in depth thd guard di
// Piutang.delete() (yang sudah tolak hapusnya lebih dulu).
const isAutoPiutang=!!(p.autoBillId||p.autoTxId||p.autoTitipanOwnerId||p.linkedTxId);
const delBtnHtml=isAutoPiutang
?'<span class="tx-del" data-stop="1" style="cursor:default;opacity:.55" title="Tercatat otomatis dari transaksi/pembayaran tagihan terkait — batalkan/edit dari sana untuk menghapus baris ini">🔒</span>'
:`<button class="tx-del" data-stop="1" data-action="delPiutang" data-args="${escapeHtml(JSON.stringify([p.id]))}" aria-label="Hapus">🗑</button>`;
return `<div class="tx-item u-pointer" data-action="openPiutangModal" data-args="${escapeHtml(JSON.stringify([p.id]))}"><div class="tx-icon u-bgaccsoft">🤝</div><div class="tx-info"><div class="tx-name">${escapeHtml(p.name)}${badge}</div><div class="tx-meta">${metaParts.join(' · ')}</div></div><div class="tx-amount${p.lunas?'':' green'}">${fmt(p.nilai)}</div>${delBtnHtml}</div>`;
}catch(err){
if(typeof console!=='undefined'&&console.error)console.error('[Piutang.renderList] gagal render piutang',p&&p.id,err);
return `<div class="tx-item u-pointer" data-action="openPiutangModal" data-args="${escapeHtml(JSON.stringify([p.id]))}"><div class="tx-icon u-bgaccsoft">🤝</div><div class="tx-info"><div class="tx-name">${escapeHtml(p.name||'(tanpa nama)')} <span class="u-fs10 u-r6 u-ml4" style="border:1px solid var(--accent4);color:var(--accent4);padding:1px 5px" title="Gagal menghitung data piutang ini — tap untuk buka & cek">⚠️</span></div></div><div class="tx-amount">⚠️</div></div>`;
}
}).join('');
}
};
// isDebtOwnershipSelf(d) — helper REUSE dari OwnershipEngine (Sesi 255,
// Ownership Sync Piutang & Utang), pola SAMA PERSIS isAssetOwnershipSelf()/
// isPiutangOwnershipSelf() di atas. Guard typeof OwnershipEngine: kalau
// engine belum dimuat, SEMUA utang dianggap SELF (regresi lama tetap jalan).
function isDebtOwnershipSelf(d){
if(typeof OwnershipEngine==='undefined')return true;
return OwnershipEngine.resolve(d).type==='SELF';
}
const Debt={
editId:null,
_lunasState:false,
// Perkiraan bunga %/tahun per jenis utang (KW-163) — angka umum di pasar Indonesia,
// murni titik awal buat diisi otomatis di field Bunga; user tetap bebas edit sendiri.
// bunga:null artinya tidak ada default yang masuk akal (mis. pinjaman pribadi/lainnya
// biasanya kesepakatan langsung, tidak ada tarif pasar baku).
JENIS_DEFAULTS:{
kta:{label:'KTA (Kredit Tanpa Agunan)',bunga:18},
kartu_kredit:{label:'Kartu Kredit',bunga:24},
pinjol:{label:'Pinjaman Online (Pinjol)',bunga:36},
pribadi:{label:'Pinjaman Pribadi',bunga:null},
koperasi:{label:'Koperasi',bunga:12},
lainnya:{label:'Lainnya',bunga:null}
},
getJenisDefault(jenis){
return Debt.JENIS_DEFAULTS[jenis]||null;
},
onJenisChange(){
const sel=document.getElementById('debtJenis');
const bungaEl=document.getElementById('debtBunga');
if(!sel||!bungaEl)return;
const def=Debt.getJenisDefault(sel.value);
// Jangan timpa kalau field Bunga sudah diisi manual (baik pas edit maupun user sudah ngetik) — autofill cuma buat bantu titik awal.
if(def&&def.bunga!=null&&!bungaEl.value.trim())bungaEl.value=def.bunga;
},
openModal(id){
Debt.editId=id||null;
const d=id?D.debts.find(x=>sameId(x.id,id)):null;
document.getElementById('debtModalTitle').textContent=d?'Edit Utang':'Tambah Utang';
document.getElementById('debtName').value=d?d.name:'';
document.getElementById('debtJenis').value=d?(d.jenis||'lainnya'):'lainnya';
document.getElementById('debtNilai').value=d?d.nilai:'';
document.getElementById('debtBunga').value=d?(d.bunga||''):'';
document.getElementById('debtCicilan').value=d?(d.cicilanBulanan||''):'';
document.getElementById('debtTanggal').value=d?(d.tanggal||''):todayStr();
document.getElementById('debtJatuhTempo').value=d?(d.jatuhTempo||''):'';
document.getElementById('debtCatatan').value=d?(d.catatan||''):'';
populateEntryAssetSelect('debtAssetId',d?d.assetId:'');
updateAmtPreview('debtNilai','debtNilaiPreview');
updateAmtPreview('debtCicilan','debtCicilanPreview');
Debt._lunasState=d?!!d.lunas:false;
const btn=document.getElementById('debtLunasBtn');
btn.textContent=Debt._lunasState?'✓ Lunas':'Belum Lunas';
btn.className='chip-btn'+(Debt._lunasState?' active':'');
// AUDIT-SYNC-PIUTANG-UTANG-ARUS-KAS §5.5: toggle sync selalu default OFF
// tiap buka modal (tambah/edit), pola sama Piutang.openModal() di atas.
const dSyncEl=document.getElementById('debtSyncTx');
if(dSyncEl)dSyncEl.checked=false;
document.getElementById('debtSyncTxWrap').classList.add('u-dnone');
openModal('debtModal');
},
toggleLunas(){
Debt._lunasState=!Debt._lunasState;
const btn=document.getElementById('debtLunasBtn');
btn.textContent=Debt._lunasState?'✓ Lunas':'Belum Lunas';
btn.className='chip-btn'+(Debt._lunasState?' active':'');
},
save(){return withSaveGuard('debt','debtModal',Debt._saveInner);},
_saveInner(){
const name=document.getElementById('debtName').value.trim();
if(!name){toast('⚠️ Nama pemberi pinjaman wajib diisi');return;}
const jenis=document.getElementById('debtJenis').value||'lainnya';
const nilai=parsePzNum(document.getElementById('debtNilai').value);
// FIX (BUG-FIN-001): guard nilai<=0 -- pola sama persis dgn Piutang.save()
// di atas (lihat komentar di sana).
if(!nilai||nilai<=0){toast('⚠️ Nilai utang harus lebih dari 0');return;}
const bungaRaw=parseFloat(document.getElementById('debtBunga').value)||0;
// FIX (BUG-FIN-002): guard bunga<0 -- sebelumnya parseFloat()||0 meloloskan
// bunga NEGATIF (mis. input diawali "-") tanpa peringatan, lolos tersimpan &
// langsung dipakai sbg suku bunga majemuk di Debt.simulate() (dipakai
// debt-optimizer-*, snowball/avalanche) -- bunga negatif bikin proyeksi
// pelunasan & total bunga salah arah. Pola guard sama semangat dgn
// BUG-FIN-001 di atas (nilai<=0), tapi bunga 0 tetap valid (utang tanpa
// bunga itu wajar), makanya cuma clamp ke 0, bukan tolak simpan.
const bunga=bungaRaw<0?0:bungaRaw;
const cicilanBulananRaw=parsePzNum(document.getElementById('debtCicilan').value);
// FIX (BUG-FIN-002): guard cicilanBulanan<0 -- parsePzNum() membolehkan tanda
// minus lolos (dipakai jg utk field lain yg boleh negatif), tapi di sini nilai
// negatif ikut ke Debt.syncBill() (shouldHaveBill jadi salah) & Debt.simulate()
// (baris balance-=Math.min(cicilanBulanan,balance) malah MENAMBAH saldo utang).
// cicilanBulanan 0 tetap valid (utang tanpa cicilan tetap/lunas manual).
const cicilanBulanan=cicilanBulananRaw<0?0:cicilanBulananRaw;
const tanggal=document.getElementById('debtTanggal').value||'';
const jatuhTempo=document.getElementById('debtJatuhTempo').value||'';
const catatan=document.getElementById('debtCatatan').value.trim();
const assetIdEl=document.getElementById('debtAssetId');
const assetId=assetIdEl?assetIdEl.value:'';
// AUDIT-SYNC-PIUTANG-UTANG-ARUS-KAS §5.1: sama pola Piutang._saveInner()
// di atas -- HANYA berlaku saat utang BARU dibuat, type income (uang
// pinjaman MASUK ke akun yang dipilih).
const dSyncTxEl=document.getElementById('debtSyncTx');
const dDoSyncTx=!Debt.editId&&dSyncTxEl&&dSyncTxEl.checked;
const dSyncTxAccEl=document.getElementById('debtSyncTxAcc');
const dSyncTxAcc=dSyncTxAccEl?dSyncTxAccEl.value:'';
if(dDoSyncTx&&!dSyncTxAcc){toast('⚠️ Pilih Akun dulu untuk mencatat transaksi arus kas');return;}
let dLinkedTxId=null;
if(dDoSyncTx)dLinkedTxId=createPiutangUtangAutoTx('income',nilai,dSyncTxAcc,'Utang','Utang: '+name,tanggal);
let d;
if(Debt.editId){
d=D.debts.find(x=>sameId(x.id,Debt.editId));
if(!d){toast('⚠️ Utang tidak ditemukan, coba tutup dan buka lagi');return;}
// AUDIT-SYNC-PIUTANG-UTANG-ARUS-KAS §5.2: transisi Belum Lunas -> Lunas
// pada utang yang PUNYA linkedTxId otomatis mencatat 1 transaksi
// pelunasan (expense, ke akun sama dgn transaksi awal). Idempotent via
// linkedPayoffTxId, pola sama Piutang di atas.
const dBecameLunas=!d.lunas&&Debt._lunasState;
if(dBecameLunas&&d.linkedTxId&&!d.linkedPayoffTxId){
const dOrigTx=D.transactions.find(t=>sameId(t.id,d.linkedTxId));
if(dOrigTx){
d.linkedPayoffTxId=createPiutangUtangAutoTx('expense',nilai,dOrigTx.accountId,'Utang','Utang lunas: '+name,todayStr());
}
}
Object.assign(d,{name,jenis,nilai,bunga,cicilanBulanan,tanggal,jatuhTempo,catatan,assetId,lunas:Debt._lunasState});
} else {
d={id:uid(),name,jenis,nilai,bunga,cicilanBulanan,tanggal,jatuhTempo,catatan,assetId,lunas:Debt._lunasState};
if(dLinkedTxId)d.linkedTxId=dLinkedTxId;
D.debts.push(d);
}
Debt.syncBill(d);
save();
closeModal('debtModal');
Debt.renderList();renderKekayaanBersih();hitungZakatMaal();renderBillList();checkBills();
toast('✅ Utang tersimpan');
},
syncBill(d){
const shouldHaveBill=!d.lunas&&(d.cicilanBulanan||0)>0;
let bill=(d.billId?D.bills.find(b=>sameId(b.id,d.billId)):null)||D.bills.find(b=>b.kind==='utang'&&sameId(b.debtId,d.id));
if(!shouldHaveBill){
// FIX (BUG-006, audit 2026-08): dulu tagihan auto langsung dihapus tanpa
// membersihkan piutang auto ("Ditanggung Bersama") yang autoBillId-nya
// nunjuk ke tagihan ini -- piutang jadi orphan permanen (pola sama persis
// gap yang sudah diperbaiki utk delBill()/delBillArchive(), lihat komentar
// removeOrphanedAutoPiutangForBill() di atas). Reuse fungsi yang sama,
// dipanggil SEBELUM bill dihapus dari D.bills. Piutang manual (autoBillId
// beda/kosong) tidak tersentuh krn filter di fungsi tsb match persis billId.
if(bill){removeOrphanedAutoPiutangForBill(bill.id);D.bills=D.bills.filter(b=>b!==bill);}
d.billId=null;
return;
}
const today=new Date().toISOString().slice(0,10);
const defaultNextDue=()=>{const dt=new Date();_amc015(dt,1);return dt.toISOString().split('T')[0];}; // BUG-015 (s406): clamp overflow tanggal
if(bill){
bill.name='Cicilan: '+d.name;
bill.amount=d.cicilanBulanan;
bill.debtId=d.id;
if(!bill.nextDue||bill.nextDue<today)bill.nextDue=(d.jatuhTempo&&d.jatuhTempo>=today)?d.jatuhTempo:defaultNextDue();
} else {
bill={id:uid(),name:'Cicilan: '+d.name,amount:d.cicilanBulanan,nextDue:(d.jatuhTempo&&d.jatuhTempo>=today)?d.jatuhTempo:defaultNextDue(),freq:'bulanan',category:'Utang',subcategory:'',accountId:(D.accounts[0]&&D.accounts[0].id)||'',note:'Auto tersinkron dari Buku Utang — bayar di sini otomatis mengurangi sisa utang',kind:'utang',debtId:d.id};
D.bills.push(bill);
}
d.billId=bill.id;
},
// FIX (BUG-DEL-TITIPAN, audit 2026-08): baris utang "🔒 Titipan" (linkedAssetId/
// linkedInvestmentId/linkedAccountId terisi) BUKAN entri manual -- dia
// AUTO-GENERATE ULANG oleh save() itu sendiri lewat Aset._syncOwnerDebts(),
// Investment._syncTitipanDebt(), atau TitipanSync.reconcileAccounts(), YANG
// SEMUANYA DIPANGGIL DARI DALAM save() (gerbang tunggal). Urutan bug lama:
// (1) baris dihapus dari D.debts, (2) save() dipanggil, (3) save() sendiri
// langsung re-sync & mendeteksi aset/akun/investasi sumbernya masih
// berporsi non-SELF > 0 -- baris itu DIBUAT LAGI sebelum render berikutnya.
// Efeknya: delete "tampak sukses" (tidak error) tapi baris balik lagi --
// looks-fixed-but-isnt persis pola BUG-016/S455/S460 di atas. Utang manual
// (bukan titipan) TIDAK kena masalah ini -- tetap dihapus permanen seperti
// biasa. Fix: cegah SEBELUM proses hapus jalan (bukan sesudah), kasih toast
// yang jelas cara benarnya -- ubah porsi kepemilikan Aset/Akun/Investasi
// terkait ke 0% atau lepas tautannya, baru baris ini otomatis hilang lewat
// sync yang sama. Konsisten dgn tombol 🗑 yang sudah disembunyikan utk baris
// ini di renderList() (lihat komentar di sana).
async delete(id){
const d=D.debts.find(x=>sameId(x.id,id));
if(d&&(d.linkedAssetId||d.linkedInvestmentId||d.linkedAccountId)){
if(typeof toast==='function')toast('Entri ini tersinkron otomatis dari porsi kepemilikan Aset/Akun/Investasi patungan, tidak bisa dihapus langsung. Ubah porsi kepemilikannya ke 0% atau lepas tautannya di menu Aset/Akun/Investasi terkait.',3600);
return;
}
// AUDIT-SYNC-PIUTANG-UTANG-ARUS-KAS §5.4: guard TERPISAH (field beda,
// semantik beda) utk utang yang punya transaksi arus kas terkait
// (`linkedTxId`, dibuat lewat toggle §5.1) -- biar transaksinya tidak
// jadi yatim tanpa utang sumbernya.
if(d&&d.linkedTxId){
if(typeof toast==='function')toast('Utang ini tercatat otomatis ke transaksi arus kas terkait, tidak bisa dihapus langsung. Hapus/edit dari transaksinya di Keuangan terlebih dulu.',3600);
return;
}
if(!await askConfirm('Hapus catatan utang ini?',{okText:'Ya, Hapus'}))return;
if(d&&d.billId){D.bills=D.bills.filter(b=>!sameId(b.id,d.billId));}
D.debts=D.debts.filter(d=>!sameId(d.id,id));
save();
Debt.renderList();renderKekayaanBersih();hitungZakatMaal();renderBillList();checkBills();
},
// totalValue()/totalCicilanBulanan() — Sesi 255 (Ownership Sync): TAMBAH 1
// filter isDebtOwnershipSelf(d) di atas filter lunas yang sudah ada (pola
// SAMA PERSIS Aset.totalValue(), Sesi 193) — utang ber-ownership INVESTOR/
// CUSTOMER/THIRD_PARTY/FAMILY DIKECUALIKAN dari Total Utang & DSR (yang
// mengalir ke Net Worth/Dashboard/Report/AI lewat totalDebtValue()/
// DebtStrategy.computeDSR()), TAPI TIDAK dihapus dari D.debts (histori
// tetap tersimpan, masih tampil di Debt.renderList()). 0 rumus diubah.
// S394: kalikan tiap utang dgn resolveEntryAssetSelfPorsi(d)/100 -- pola
// SAMA PERSIS Piutang.totalValue(), utang tanpa assetId (mayoritas) selalu
// porsi 100 (0 regresi kasus umum).
// BUG-016 FIX (Sesi 463, opsi (a) dari 2 kandidat di docs/BUG_REGISTRY.md):
// TAMBAH 1 filter lagi -- exclude entry `linkedAssetId`/`linkedInvestmentId`
// (auto-sync dari Aset._syncOwnerDebts()/Investment._syncTitipanDebt(),
// pola exclude SAMA PERSIS DebtStrategy.activeDebts() yang sudah lebih dulu
// mengecualikan kedua tag ini sejak S455/S460 -- 0 filter baru, REUSE
// kondisi yang sama). Alasan: porsi non-SELF/whole-entity aset/holding
// terkait entry ini SUDAH dikecualikan di sisi aset lewat
// Aset.totalValue()/Investment.portfolioSummary() (selfOwnedValue()/
// isHoldingOwnershipSelf(), S193/S393/S422d) -- kalau entry utangnya IKUT
// dihitung di sini juga, porsi yang sama kepotong DUA KALI dari Kekayaan
// Bersih (double-subtraction, lihat BUG-016). Entry ini TETAP tampil apa
// adanya di Debt.renderList() (histori/badge "🔒 Titipan" tidak berubah)
// -- cuma tidak ikut diakumulasi ke Total Utang/Kekayaan Bersih lagi.
totalValue(){return(D.debts||[]).filter(isDebtOwnershipSelf).filter(d=>!d.lunas).filter(d=>!d.linkedAssetId&&!d.linkedInvestmentId).reduce((s,d)=>s+(d.nilai||0)*(resolveEntryAssetSelfPorsi(d)/100),0);},
totalCicilanBulanan(){return(D.debts||[]).filter(isDebtOwnershipSelf).filter(d=>!d.lunas).reduce((s,d)=>s+(d.cicilanBulanan||0),0);},
// billCicilanAktif() — KW-170: cicilan barang aktif dari Buku Tagihan
// (D.bills kind:'cicilan', sisaTenor>0) — dianggap "utang beneran": ikut
// tampil sbg baris di Buku Utang & ikut disimulasikan pelunasannya di
// DebtStrategy (lihat DebtStrategy.billCicilanAsDebtLike()). Filter SAMA
// PERSIS dgn yg sudah dipakai DebtStrategy.computeDSR() (totalCicilanLain)
// & DebtOptimizerAPI._overview() (billCicilan) — 0 filter baru, 1 sumber.
// Langganan (kind:'langganan') SENGAJA tidak ikut — tidak punya sisaTenor/
// tenor, tidak ada "pokok" yang bisa dilunasi, jadi tidak cocok masuk
// model utang (konsisten sama computeDSR() yg juga selalu exclude langganan).
billCicilanAktif(){
return(D.bills||[]).filter(b=>b.kind==='cicilan'&&b.sisaTenor!=null&&b.sisaTenor>0);
},
renderList(){
if(typeof PiutangUtangInsight!=='undefined')PiutangUtangInsight.render();
const el=document.getElementById('debtList');
if(!el)return;
const list=D.debts||[];
// S583 sesi-11 (Rekomendasi #4): badge read-only "⚠️ nama belum sinkron" utk
// baris utang yang linkedOwnerId-nya sudah di-rename lewat OwnerRegistry
// tapi d.name (snapshot lama) belum ikut ter-update -- reuse PENUH
// TitipanReconcile.checkDebtNameStaleness() (S583 sesi-5, sudah ada & sudah
// diaudit sendiri, 0 rumus baru ditulis di sini). Dipanggil 1x DI LUAR
// map() (bukan per-baris) supaya tidak overhead berulang. PURELY VISUAL --
// badge ini TIDAK ADA tombol/aksi, TIDAK menulis apa pun ke D; cara
// perbaikannya tetap sama seperti sebelum sesi ini (re-sync manual lewat
// edit ulang aset/investasi terkait). typeof-guard supaya halaman/test yang
// belum load titipan-reconcile.js tidak error (0 regresi).
const staleDebtIds=(typeof TitipanReconcile!=='undefined')
?new Set(TitipanReconcile.checkDebtNameStaleness().stale.map(s=>String(s.debtId)))
:new Set();
const billCicilan=Debt.billCicilanAktif();
const billOutstanding=billCicilan.reduce((s,b)=>s+(b.amount||0)*(b.sisaTenor||0),0);
const billBulanan=billCicilan.reduce((s,b)=>s+(b.amount||0),0);
document.getElementById('debtTotalVal').textContent=fmtFull(Debt.totalValue()+billOutstanding);
document.getElementById('debtCicilanVal').textContent=fmtFull(Debt.totalCicilanBulanan()+billBulanan);
if(!list.length&&!billCicilan.length){el.innerHTML='<div class="empty"><div class="empty-icon">📕</div><div class="empty-text">Belum ada utang tercatat</div></div>';return;}
const today=new Date().toISOString().slice(0,10);
const debtRowsHtml=list.map(d=>{
// BUGFIX (audit pola sama S601 "0 reaksi"): try/catch per-utang, 1 baris error
// tidak lagi menjatuhkan seluruh Buku Utang.
try{
const overdue=!d.lunas&&d.jatuhTempo&&d.jatuhTempo<today;
const metaParts=[];
if(d.jenis&&Debt.JENIS_DEFAULTS[d.jenis]&&d.jenis!=='lainnya')metaParts.push(Debt.JENIS_DEFAULTS[d.jenis].label);
if(d.bunga)metaParts.push('Bunga '+d.bunga+'%/th');
if(d.cicilanBulanan)metaParts.push('Cicilan '+fmt(d.cicilanBulanan)+'/bln');
if(d.jatuhTempo)metaParts.push((overdue?'⚠️ Lewat jatuh tempo ':'Jatuh tempo ')+d.jatuhTempo);
if(d.catatan)metaParts.push(escapeHtml(d.catatan));
// S394: badge porsi kepemilikan kalau utang ini ditautkan ke aset
// multi-owner (assetId) & porsinya < 100 — pola sama Piutang.renderList().
if(d.assetId){const _porsi=resolveEntryAssetSelfPorsi(d);if(_porsi<100)metaParts.push(`👥 Porsi Anda ${_porsi}% dari aset multi-owner`);}
// FIX (S455): badge beda utk entri titipan (linkedAssetId, auto-sync dari
// Aset._syncOwnerDebts()) -- bukan kewajiban dibayar, biar user tidak
// bingung kenapa tidak ada tombol strategi/cicilan (memang sengaja
// exclude dari activeDebts(), lihat komentar di sana).
// FIX (S460): badge SAMA juga utk entri titipan investasi (linkedInvestmentId,
// auto-sync dari Investment._syncTitipanDebt()) -- pola identik, cuma
// sumbernya beda modul (aset vs investasi).
// FIX (BUG-DEL-TITIPAN, audit 2026-08): badge sebelumnya cuma cek
// linkedAssetId/linkedInvestmentId -- kelupaan linkedAccountId (titipan
// akun, ditulis TitipanSync.reconcileAccounts(), lihat akun.js). Baris
// titipan akun jadi lolos tanpa badge & tombol 🗑 masih tampil -- padahal
// sama-sama auto-sync & sama-sama kena bug delete di atas. Tambah 1 kondisi,
// 0 filter/badge lain diubah.
const isTitipanLinked=!!(d.linkedAssetId||d.linkedInvestmentId||d.linkedAccountId);
if(isTitipanLinked)metaParts.push('🔒 Titipan — bukan kewajiban dibayar');
// AUDIT-SYNC-PIUTANG-UTANG-ARUS-KAS §5.4: badge terpisah (semantik beda
// dari titipan di atas) utk utang yang tercatat lewat toggle §5.1.
if(d.linkedTxId&&!isTitipanLinked)metaParts.push('🔒 Tercatat otomatis dari transaksi arus kas');
const isTxLinked=!!d.linkedTxId;
// FIX (BUG-DEL-TITIPAN): sembunyikan tombol 🗑 utk baris titipan auto-sync,
// konsisten dengan baris "Cicilan Barang" (billRowsHtml) yang memang sudah
// read-only -- ganti jadi ikon 🔒 kecil ber-tooltip, biar user tidak
// tap-delete lalu bingung baris itu balik lagi (root cause: Debt.delete()
// di atas). Debt.delete() sendiri TETAP punya guard-nya sendiri (defense in
// depth) kalau tombol ini terpanggil lewat jalur lain.
const delBtnHtml=isTitipanLinked
?'<span class="tx-del" data-stop="1" style="cursor:default;opacity:.55" title="Tersinkron otomatis dari porsi kepemilikan Aset/Akun/Investasi patungan — ubah porsinya ke 0% atau lepas tautannya di sana untuk menghapus baris ini">🔒</span>'
:(isTxLinked
?'<span class="tx-del" data-stop="1" style="cursor:default;opacity:.55" title="Tercatat otomatis dari transaksi arus kas terkait — hapus/edit dari transaksinya di Keuangan untuk menghapus baris ini">🔒</span>'
:`<button class="tx-del" data-stop="1" data-action="delDebt" data-args="${escapeHtml(JSON.stringify([d.id]))}" aria-label="Hapus">🗑</button>`);
return `<div class="tx-item u-pointer" data-action="openDebtModal" data-args="${escapeHtml(JSON.stringify([d.id]))}"><div class="tx-icon" style="background:var(--accent2-soft)">📕</div><div class="tx-info"><div class="tx-name">${escapeHtml(d.name)}${d.lunas?' <span class="bill-due-badge bill-due-ok u-ml4">Lunas</span>':(overdue?' <span class="bill-due-badge bill-due-urgent u-ml4">Jatuh Tempo</span>':'')}${staleDebtIds.has(String(d.id))?' <span class="bill-due-badge bill-due-urgent u-ml4" title="Nama pemilik sudah diubah lewat Pengaturan Pemilik, entri ini masih pakai nama lama">⚠️ nama belum sinkron</span>':''}</div><div class="tx-meta">${metaParts.join(' · ')}</div></div><div class="tx-amount${d.lunas?'':' red'}">${fmt(d.nilai)}</div>${delBtnHtml}</div>`;
}catch(err){
if(typeof console!=='undefined'&&console.error)console.error('[Debt.renderList] gagal render utang',d&&d.id,err);
return `<div class="tx-item u-pointer" data-action="openDebtModal" data-args="${escapeHtml(JSON.stringify([d.id]))}"><div class="tx-icon" style="background:var(--accent2-soft)">📕</div><div class="tx-info"><div class="tx-name">${escapeHtml(d.name||'(tanpa nama)')} <span class="u-fs10 u-r6 u-ml4" style="border:1px solid var(--accent4);color:var(--accent4);padding:1px 5px" title="Gagal menghitung data utang ini — tap untuk buka & cek">⚠️</span></div></div><div class="tx-amount">⚠️</div></div>`;
}
}).join('');
// KW-170: baris cicilan barang — read-only dari sini (edit/hapus/riwayat
// pembayaran tetap lewat alur Tagihan yang sudah ada, krn datanya D.bills
// bukan D.debts). Klik baris -> Riwayat Pembayaran (openBillHistory, sama
// persis alur yg sudah dipakai utk cicilan di Buku Tagihan).
const billRowsHtml=billCicilan.map(b=>{
// BUGFIX (audit pola sama S601 "0 reaksi"): try/catch per-baris cicilan barang juga.
try{
const overdue=b.nextDue&&b.nextDue<today;
const outstanding=(b.amount||0)*(b.sisaTenor||0);
const metaParts=['🛒 Cicilan Barang','Cicilan '+fmt(b.amount)+'/bln','Sisa '+b.sisaTenor+'x'];
if(b.nextDue)metaParts.push((overdue?'⚠️ Lewat jatuh tempo ':'Jatuh tempo ')+b.nextDue);
return `<div class="tx-item u-pointer" data-action="openBillHistory" data-args="${escapeHtml(JSON.stringify([b.id]))}"><div class="tx-icon" style="background:var(--accent2-soft)">🛒</div><div class="tx-info"><div class="tx-name">${escapeHtml(b.name)}${overdue?' <span style=\\"font-size:10px;color:var(--accent2);border:1px solid var(--accent2);border-radius:6px;padding:1px 5px;margin-left:4px\\">Jatuh Tempo</span>':''}</div><div class="tx-meta">${metaParts.join(' · ')}</div></div><div class="tx-amount red">${fmt(outstanding)}</div></div>`;
}catch(err){
if(typeof console!=='undefined'&&console.error)console.error('[Debt.renderList] gagal render cicilan barang',b&&b.id,err);
return `<div class="tx-item u-pointer" data-action="openBillHistory" data-args="${escapeHtml(JSON.stringify([b.id]))}"><div class="tx-icon" style="background:var(--accent2-soft)">🛒</div><div class="tx-info"><div class="tx-name">${escapeHtml(b.name||'(tanpa nama)')} <span class="u-fs10 u-r6 u-ml4" style="border:1px solid var(--accent4);color:var(--accent4);padding:1px 5px" title="Gagal menghitung data cicilan ini">⚠️</span></div></div><div class="tx-amount">⚠️</div></div>`;
}
}).join('');
el.innerHTML=debtRowsHtml+billRowsHtml;
if(typeof DebtStrategy!=='undefined')DebtStrategy.render();
}
};
const DebtStrategy={
setMethod(method){
D.debtStrategy=D.debtStrategy||{};
D.debtStrategy.method=method;
save();
DebtStrategy.render();
},
onExtraInput(){
const el=document.getElementById('dsExtra');
if(!el)return;
D.debtStrategy=D.debtStrategy||{};
D.debtStrategy.extra=parsePzNum(el.value);
save();
DebtStrategy.render();
},
activeDebts(){
// FIX (S455): entri utang "dana titipan" (linkedAssetId terisi, auto-sync
// dari Aset._syncOwnerDebts()) BUKAN kewajiban yang perlu strategi
// pelunasan (bunga/cicilan selalu 0, tidak ada jatuh tempo) -- exclude dari
// activeDebts() supaya tidak nongol di computeOrder() (snowball/avalanche)
// & tidak menaikkan activeCount di Debt Optimizer. Debt.totalValue()
// (Kekayaan Bersih) TIDAK disentuh -- titipan tetap harus terhitung di
// situ, cuma bukan target "dibayar".
// FIX (S460): exclude SAMA juga utk entri titipan investasi
// (linkedInvestmentId, auto-sync dari Investment._syncTitipanDebt()) --
// SEBELUM sesi ini, titipan investasi TIDAK punya penanda apa pun di
// object utangnya sendiri (beda dari titipan aset yang sudah ditandai
// linkedAssetId sejak awal), jadi salah masuk activeDebts() & ikut
// disimulasikan snowball/avalanche padahal bukan kewajiban riil.
const real=(D.debts||[]).filter(d=>!d.lunas&&(d.nilai||0)>0&&!d.linkedAssetId&&!d.linkedInvestmentId);
return real.concat(DebtStrategy.billCicilanAsDebtLike());
},
// billCicilanAsDebtLike() — KW-170: map cicilan barang aktif (Debt.
// billCicilanAktif(), Buku Tagihan kind:'cicilan') jadi bentuk mirip
// D.debts biar bisa ikut computeOrder()/simulate() APA ADANYA (0 rumus
// baru di simulate() sendiri, cuma titik masuk data tambahan).
// bunga SENGAJA di-set 0: bunga cicilan barang itu bunga flat SEKALI di
// awal, sudah dibakar ke nominal cicilan/bulan (amount) sejak dibuat di
// transaksi.js — beda dari Debt.bunga (%/tahun, dihitung MAJEMUK tiap
// bulan oleh simulate()). Kalau ikut dipakein compounding simulate(),
// bunganya kehitung dobel. nilai ("pokok" versi simulasi) = amount ×
// sisaTenor, SAMA PERSIS formula outstanding di getBillStats()
// (tagihan-kalender.js) — 0 rumus baru.
billCicilanAsDebtLike(){
if(typeof Debt==='undefined')return[];
return Debt.billCicilanAktif().map(b=>({
id:'bill:'+b.id,
name:b.name,
bunga:0,
cicilanBulanan:b.amount,
nilai:(b.amount||0)*(b.sisaTenor||0),
lunas:false,
_isBillCicilan:true,
_billId:b.id
}));
},
computeOrder(list,method){
const arr=list.slice();
if(method==='snowball')arr.sort((a,b)=>(a.nilai||0)-(b.nilai||0));
else arr.sort((a,b)=>(b.bunga||0)-(a.bunga||0));
return arr;
},
computeDSR(){
const totalCicilanUtang=(typeof Debt!=='undefined')?Debt.totalCicilanBulanan():0;
const totalCicilanLain=(D.bills||[]).filter(b=>b.kind==='cicilan'&&b.sisaTenor!=null).reduce((s,b)=>s+(b.amount||0),0);
const totalCicilan=totalCicilanUtang+totalCicilanLain;
const incAvg=(typeof WorthIt!=='undefined')?WorthIt.incomeAvg():0;
const pct=incAvg>0?(totalCicilan/incAvg)*100:null;
return{totalCicilanUtang,totalCicilanLain,totalCicilan,incAvg,pct};
},
simulate(orderedDebts,extraMonthly){
const simDebts=orderedDebts.filter(d=>(d.cicilanBulanan||0)>0).map(d=>({id:d.id,bunga:d.bunga||0,cicilanBulanan:d.cicilanBulanan,balance:d.nilai||0}));
if(!simDebts.length)return{months:null,totalInterest:0,payoffMonth:{}};
extraMonthly=extraMonthly||0;
const MAX_MONTHS=600;
let month=0,totalInterest=0;
const payoffMonth={};
while(simDebts.some(d=>d.balance>0.5)&&month<MAX_MONTHS){
month++;
simDebts.forEach(d=>{
if(d.balance<=0)return;
const interest=d.balance*(d.bunga/100/12);
totalInterest+=interest;
d.balance+=interest;
});
let pool=extraMonthly;
simDebts.forEach(d=>{if(d.balance<=0)pool+=d.cicilanBulanan;});
simDebts.forEach(d=>{
if(d.balance<=0)return;
d.balance-=Math.min(d.cicilanBulanan,d.balance);
});
for(const d of simDebts){
if(pool<=0)break;
if(d.balance<=0)continue;
const pay=Math.min(pool,d.balance);
d.balance-=pay;
pool-=pay;
}
simDebts.forEach(d=>{if(d.balance<=0.5&&payoffMonth[d.id]==null)payoffMonth[d.id]=month;});
}
return{months:month>=MAX_MONTHS?null:month,totalInterest:Math.round(totalInterest),payoffMonth};
},
render(){
const box=document.getElementById('dsResult');
if(!box)return;
D.debtStrategy=D.debtStrategy||{method:'avalanche',extra:0};
const chips=document.querySelectorAll('#dsMethodChips .chip-btn');
chips.forEach(b=>b.classList.remove('active'));
const method=D.debtStrategy.method==='snowball'?'snowball':'avalanche';
const idx={avalanche:0,snowball:1}[method];
if(chips[idx])chips[idx].classList.add('active');
const extraEl=document.getElementById('dsExtra');
if(extraEl&&!extraEl.matches(':focus'))extraEl.value=D.debtStrategy.extra||'';
const active=DebtStrategy.activeDebts();
if(!active.length){
box.innerHTML='<div class="empty"><div class="empty-icon">🎯</div><div class="empty-text">Belum ada utang aktif buat disusun strategi pelunasannya</div></div>';
return;
}
const dsr=DebtStrategy.computeDSR();
let dsrHtml;
if(dsr.incAvg>0){
const pct=dsr.pct;
const level=pct>35?'red':(pct>30?'orange':'green');
const msg=level==='red'?'⚠️ Sudah lewat batas aman (30–35%) — total cicilan/tagihan bulanan menekan cukup berat. Pertimbangkan percepat pelunasan lewat dana ekstra di bawah, atau tunda dulu kewajiban baru.':
level==='orange'?'Mendekati batas aman 30–35% — masih terkendali, tapi mulai hati-hati sebelum nambah utang baru.':
'✅ Masih di zona aman.';
dsrHtml=`<div style="font-size:12px;line-height:1.5;margin-bottom:12px;padding:10px;border-radius:10px;background:${level==='green'?'var(--accent3-soft)':'var(--accent2-soft)'}">💳 <b>DSR (Rasio Cicilan): ${pct.toFixed(0)}%</b> dari rata-rata income ${fmtFull(dsr.incAvg)}/bln (total cicilan/tagihan ${fmtFull(dsr.totalCicilan)}/bln)<br>${msg}</div>`;
} else {
dsrHtml='<div class="u-fs11 u-t2 u-mb12">Belum cukup data pemasukan buat hitung DSR (rasio cicilan) otomatis.</div>';
}
const order=DebtStrategy.computeOrder(active,method);
const listHtml=order.map((d,i)=>{
const meta=[];
if(d.bunga)meta.push('Bunga '+d.bunga+'%/th');
if(d.cicilanBulanan)meta.push('Cicilan '+fmt(d.cicilanBulanan)+'/bln');
else meta.push('Belum ada cicilan/bulan diisi');
return`<div class="u-flex u-aic u-gap10" style="padding:8px 0;border-bottom:1px solid var(--border)">
        <div class="u-bgaccsoft u-flex u-aic u-jcc u-fs12 u-fw700" style="width:24px;height:24px;border-radius:50%;flex-shrink:0">${i+1}</div>
        <div class="u-flex1"><div class="u-fs13 u-fw600">${escapeHtml(d.name)}${d._isBillCicilan?' <span class="u-fs10 u-t2" style="border:1px solid var(--border);border-radius:6px;padding:1px 5px;margin-left:2px">🛒 Cicilan Barang</span>':''}</div><div class="u-fs11 u-t2">${meta.join(' · ')}</div></div>
        <div class="u-fw700 u-fs13" style="white-space:nowrap;padding-left:8px">${fmt(d.nilai)}</div>
      </div>`;
}).join('');
const extra=D.debtStrategy.extra||0;
const sim=DebtStrategy.simulate(order,extra);
let simHtml;
if(sim.months==null){
simHtml=order.every(d=>!(d.cicilanBulanan>0))?
'<div class="u-fs11 u-t2 u-mt10">💡 Isi "Cicilan/Bulan" di masing-masing utang (edit dari 📕 Buku Utang di atas) buat bisa lihat simulasi kapan lunasnya.</div>':
'<div class="u-fs11 u-t2 u-mt10">⚠️ Simulasi lebih dari 50 tahun / tidak konvergen — cek lagi cicilan & bunga yang diisi, kemungkinan cicilan terlalu kecil dibanding bunganya.</div>';
} else {
const years=Math.floor(sim.months/12),months=sim.months%12;
const durText=years>0?(years+' thn '+months+' bln'):(months+' bln');
simHtml=`<div class="u-mt12" style="padding-top:10px;border-top:1px dashed var(--border)">
        <div class="u-fs12 u-lh16"><b>⏱️ Estimasi lunas semua: ${durText} lagi</b>${extra>0?' (dgn dana ekstra '+fmtFull(extra)+'/bln)':''}<br>💸 Estimasi total bunga yang masih akan dibayar: <b>${fmtFull(sim.totalInterest)}</b></div>
      </div>`;
const otherMethod=method==='avalanche'?'snowball':'avalanche';
const otherOrder=DebtStrategy.computeOrder(active,otherMethod);
const otherSim=DebtStrategy.simulate(otherOrder,extra);
if(otherSim.months!=null){
const interestDiff=sim.totalInterest-otherSim.totalInterest;
const monthDiff=sim.months-otherSim.months;
if(Math.abs(interestDiff)>=1000||monthDiff!==0){
const label=otherMethod==='avalanche'?'Avalanche':'Snowball';
let cmp=interestDiff>0?('bayar bunga <b>'+fmtFull(interestDiff)+' lebih banyak</b>'):(interestDiff<0?('hemat bunga <b>'+fmtFull(-interestDiff)+'</b>'):'bunga sama');
if(monthDiff>0)cmp+=' & lunas <b>'+monthDiff+' bln lebih lambat</b>';
else if(monthDiff<0)cmp+=' & lunas <b>'+(-monthDiff)+' bln lebih cepat</b>';
simHtml+=`<div class="u-fs11 u-t2 u-mt8">🔎 Dibanding strategi ${label}: pakai metode saat ini kamu ${cmp}.</div>`;
}
}
}
box.innerHTML=dsrHtml+listHtml+simHtml+'<div class="u-fs10 u-ctext3 u-mt10 u-lh15">⚠️ Simulasi berdasarkan asumsi bunga & pembayaran konsisten tiap bulan — perkiraan kasar buat bahan pertimbangan, bukan angka pasti dari bank/lembaga pemberi pinjaman.</div>';
}
};
const Bill={
openLinkTxModal(){
if(curBillHistoryId==null){toast('⚠️ Buka dulu Riwayat Pembayaran tagihan yang mau dihubungkan');return;}
LinkTx.open('bill',curBillHistoryId);
}
};
if (typeof Bill !== 'undefined') window.Bill = Bill;
