// transaksi.js — Form Tambah/Edit Transaksi Keuangan: autocomplete kategori/produk,
// Dipindah ke modules/finance/transaksi.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// panel kendaraan (BBM/sparepart/stok shop), target Dana Darurat, catatan/reminder/
// transfer, dan simpan transaksi (saveTx) — mesin utama halaman Keuangan.
// (v92): ditambah domain "List Transaksi & Cashflow Forecast" (txHTML/delTx/changeMonth/
// setTxListPeriode/getTxListRange/setPeriode/getRange/computeCashflowForecast), dipindah dari
// backup-restore.js — domainnya sama-sama seputar data transaksi,
// lihat blok di akhir file & PEMISAHAN-FILE-ROADMAP.md.
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: data-default.js, features-helpers-global-security.js, diagnostik-versi.js, format-tema.js, error-handler.js, helper-teks.js, keamanan-pin.js, modal-navigasi.js, reset-gaji-mingguan.js, debug-console.js, pengaturan-search.js, onboarding.js, kalkulator-input.js, scan-ocr.js, akun.js, gaji-calc.js, transaksi.js, profil-pengaturan.js, kategori.js, tagihan-kalender.js, backup-restore.js, payroll-absensi.js, tukang-absensi.js

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

function setTxType(t){
curTxType=t;
document.getElementById('btnI').className='type-btn'+(t==='income'?' ai':'');
document.getElementById('btnE').className='type-btn'+(t==='expense'?' ae':'');
hideSuggestBox('txCatSuggestBox');
hideSuggestBox('txSubCatSuggestBox');
if(typeof AutoKat!=='undefined'){AutoKat.hideSuggest();AutoKat._lastNoteQueried='';}
updateTxVehiclePanels();
updateTxAssetWrapVisibility();
}
// resolveTxAssetSplit() DIHAPUS (audit AUDIT-S540/B1-B12-DOUBLECOUNT,
// spesifikasi "relasi murni") — kaitan #txAssetId ke aset multi-owner
// sekarang HANYA dipakai sbg referensi/pelacakan riwayat, TIDAK lagi
// menghasilkan split nominal per pemilik (0 preview, 0 badge "N pemilik").
// tx-list-cashflow.js berhenti menampilkan badge/breakdown itu otomatis
// lewat guard typeof resolveTxAssetSplit==='function' yang sudah ada di
// sana -- 0 perlu disentuh terpisah.
// resolveTxTitipanOwner(ownerId) — Sesi 519 (LANJUTKAN-S519, Design Lock
// S518). Guard **existing-owner-only** utk `titipanLinkId` transaksi --
// pola SAMA PERSIS `saveCommitment()`/`recordReturn()`
// (dana-titipan-portfolio-presenter.js): TIDAK PERNAH mempercayai identity
// owner yang tidak dikenal `DanaTitipanPortfolioAPI.listExistingOwners()`.
// Return record `{ownerId,ownerName}` kalau valid, `null` kalau
// `ownerId` kosong/tidak dikenal/dependency belum dimuat (0 throw --
// caller yang menentukan reaksinya, pola sama fungsi resolve* murni lain
// di file ini).
function resolveTxTitipanOwner(ownerId){
if(!ownerId||typeof DanaTitipanPortfolioAPI==='undefined')return null;
if(typeof DanaTitipanPortfolioAPI.listExistingOwners!=='function')return null;
return DanaTitipanPortfolioAPI.listExistingOwners().find(o=>o.ownerId===ownerId)||null;
}
// applyTxTitipanLinkageOnSave(tx,prevTitipanLinkId) — Sesi 519 (LANJUTKAN-S519,
// Design Lock S518 §5-6, scope resmi: transaksi.js+piutang-utang.js+
// dana-titipan-portfolio-presenter.js+tx-list-cashflow.js). Fungsi MURNI
// (0 baca/tulis DOM) -- dipanggil SETELAH `tx.titipanLinkId`/
// `tx.titipanTalangan` final diset ke `tx` (baik CREATE baru maupun EDIT),
// `prevTitipanLinkId` = nilai `titipanLinkId` SEBELUM save ini (`null` utk
// transaksi baru/tanpa tautan sebelumnya).
//
// Guard existing-owner-only (Hard Invariant, pola sama saveCommitment()):
// kalau `tx.titipanLinkId` diisi tapi BUKAN owner yang dikenal
// (resolveTxTitipanOwner null), field ini DIBUANG (0 identity hantu
// pernah tersimpan) & `titipanTalangan` ikut direset false.
//
// Lifecycle (Design Lock S518, LANJUTKAN-S519 §6 "EDIT OWNER / UNLINK"):
// owner BERUBAH (termasuk link baru dari kosong, atau unlink ke kosong) --
// piutang otomatis LAMA (by `tx.id`) yang belum lunas dihapus DULU
// (`removeUnpaidTitipanTalanganPiutangForTx`, no-op kalau tidak ada), BARU
// kalau `tx.titipanLinkId` (final) masih ada & `tx.titipanTalangan===true`,
// piutang baru dibuat (`maybeCreateTitipanTalanganPiutang`) -- urutan ini
// WAJIB (hapus dulu) supaya guard idempotency `autoTxId` di
// `maybeCreateTitipanTalanganPiutang` tidak memblokir relink ke owner
// baru. Owner TIDAK berubah -- 0 hapus, `maybeCreateTitipanTalanganPiutang`
// dipanggil apa adanya (idempotency internalnya sendiri yang mencegah
// duplikat kalau piutangnya sudah ada; delta nominal disinkron TERPISAH
// oleh caller lewat `syncTitipanTalanganPiutangOnEdit()`, 0 logic itu di
// sini -- pola sama pemisahan create/sync di cabang cicilan shared-piutang
// existing).
function applyTxTitipanLinkageOnSave(tx,prevTitipanLinkId){
if(!tx)return;
if(!tx.titipanLinkId&&!prevTitipanLinkId)return;
if(tx.titipanLinkId&&!resolveTxTitipanOwner(tx.titipanLinkId)){
delete tx.titipanLinkId;
tx.titipanTalangan=false;
}
if(!tx.titipanLinkId)tx.titipanTalangan=false;
const ownerChanged=(prevTitipanLinkId||null)!==(tx.titipanLinkId||null);
if(ownerChanged&&typeof removeUnpaidTitipanTalanganPiutangForTx==='function'){
removeUnpaidTitipanTalanganPiutangForTx(tx.id);
}
if(tx.titipanLinkId&&tx.titipanTalangan===true&&typeof maybeCreateTitipanTalanganPiutang==='function'){
maybeCreateTitipanTalanganPiutang(tx);
}
}
// updateTxAssetWrapVisibility() — show/hide blok "#txAssetWrap" (dropdown
// "Kaitkan ke Aset Multi-Owner" + preview, modals.js). Sebelumnya (S394)
// HANYA tampil utk Pemasukan -- diperluas (patch akun-multi-owner-
// doublecount-datahealthcheck-restore) supaya tampil juga utk Pengeluaran,
// karena justru pengeluaran dari dana titipan/patungan itu yang paling
// sering butuh dicatat porsinya (audit menemukan gap ini: split porsi
// sebelumnya cuma bisa dilihat di transaksi Pemasukan). Syarat tetap sama:
// minimal 1 aset multi-owner ada (getMultiOwnerAssets(), 100% reuse dari
// piutang-utang.js S394 — 0 duplikasi). Dipanggil dari
// setTxType()/openTxModal()/editTx() supaya field ke-reset/terisi benar
// tiap ganti tipe transaksi atau buka modal.
// PATCH (akun-majoris-selflink-redundant, permintaan user via screenshot):
// akun/metode yang SUDAH langsung tertaut ke aset multi-owner lewat
// accountId (findMultiOwnerAssetForAccount() -- SAMA sumber dgn blok
// "PORSI PEMILIK (AKUN PATUNGAN)", resolveTxOwnerSplitForAccount() di
// filter-laporan.js) tidak perlu lagi ditawari "Kaitkan ke Aset
// Multi-Owner" ke ASET ITU JUGA -- akun "Majoris" yg accountId-nya
// tertaut ke aset "Majoris" bikin dropdown itu auto-terisi "Majoris"
// (nautkan diri sendiri ke dirinya sendiri), murni duplikasi UI/preview
// yg membingungkan krn owner & split-nya SAMA PERSIS dgn yg sudah
// ditampilkan blok "PORSI PEMILIK (AKUN PATUNGAN)" di bawahnya. Aset
// self-linked ini sekarang DIKECUALIKAN dari pilihan (excludeId), wrap
// disembunyikan total kalau itu satu-satunya aset multi-owner yang ada
// (0 aset LAIN yg relevan utk ditautkan manual). Aset multi-owner LAIN
// (mis. proyek/holding terpisah yg TIDAK jadi akun ini) tetap tampil
// spt biasa -- 0 regresi utk kasus itu.
function updateTxAssetWrapVisibility(){
const wrap=document.getElementById('txAssetWrap');
if(!wrap)return;
const accId=document.getElementById('txAcc')?document.getElementById('txAcc').value:'';
const selfLinkedAsset=typeof findMultiOwnerAssetForAccount==='function'?findMultiOwnerAssetForAccount(accId):null;
const excludeId=selfLinkedAsset?selfLinkedAsset.id:null;
const allMultiOwnerAssets=typeof getMultiOwnerAssets==='function'?getMultiOwnerAssets():[];
const otherAssets=excludeId?allMultiOwnerAssets.filter(a=>!sameId(a.id,excludeId)):allMultiOwnerAssets;
const show=otherAssets.length>0;
wrap.style.display=show?'block':'none';
if(show&&typeof populateEntryAssetSelect==='function'){
const sel=document.getElementById('txAssetId');
populateEntryAssetSelect('txAssetId',sel?sel.value:'',excludeId);
}
updateTxAssetHintText();
}
// updateTxAssetHintText() — (patch s558) sinkronkan copy hint di bawah
// dropdown #txAssetId (modals.js, elemen #txAssetHint) dgn tipe transaksi
// aktif (curTxType). Sebelumnya teks hint hardcode "pemasukan" padahal
// logic di atasnya (updateTxAssetWrapVisibility) sudah berlaku utk
// Pemasukan MAUPUN Pengeluaran (lihat komentar di atas) — gap kosmetik
// murni, 0 perubahan logic split porsi. Dipanggil dari
// updateTxAssetWrapVisibility() supaya ikut ke-refresh tiap ganti tipe
// transaksi (setTxType()) atau buka modal (openTxModal()/editTx()).
function updateTxAssetHintText(){
const hint=document.getElementById('txAssetHint');
if(!hint)return;
const label=curTxType==='income'?'pemasukan':(curTxType==='expense'?'pengeluaran':'transaksi');
hint.textContent=`Kalau ${label} ini terkait aset patungan (⚖️ Atur Porsi Kepemilikan di Buku Aset), rincian pembagian ke semua pemilik ditampilkan di riwayat transaksi.`;
}
// findMultiOwnerAssetForAccount(accId) — Sesi (patch akun-multi-owner-
// doublecount-datahealthcheck-restore): cari SATU aset multi-owner
// (getMultiOwnerAssets(), 100% reuse) yang field `accountId`-nya menunjuk
// ke akun `accId` (pola sama `a.accountId` yang dipakai Aset.openTxHistory()
// & recalcAssetLinkedAccounts() di aset.js). Ini jembatan yang SEBELUMNYA
// tidak ada sama sekali antara dropdown "Akun/Metode" (#txAcc) & dropdown
// "Kaitkan ke Aset Multi-Owner" (#txAssetId) -- keduanya dulu independen
// total, user harus tahu & pilih manual aset yang benar sendiri walau
// akunnya sudah eksplisit ditautkan ke 1 aset tertentu. Return aset
// pertama yang cocok, atau null (0 match / accId kosong / engine belum
// dimuat -- 0 regresi, guard sama pola getMultiOwnerAssets()).
function findMultiOwnerAssetForAccount(accId){
if(!accId||typeof getMultiOwnerAssets!=='function')return null;
return getMultiOwnerAssets().find(a=>sameId(a.accountId,accId))||null;
}
// findLinkedAssetForAccount(accId) — Sesi Res-B (DESIGN-LOCK-LINKED-ASSET-
// ACCOUNT-OWNER-DEFAULT.md), varian findMultiOwnerAssetForAccount() TANPA
// syarat isMultiOwner -- fungsi itu query lewat getMultiOwnerAssets() jadi
// HANYA balikin aset yg owners-nya >1 (lihat catatan Sesi Res-A), padahal
// Owner Resolver §2.1 butuh aset tertaut apa pun yg py `a.owners[]`
// eksplisit termasuk yg cuma 1 baris. Pola pencarian by `a.accountId`
// direuse, syarat isMultiOwner dilepas -- 0 logic baru selain itu.
// Return: aset pertama (D.assets) yang a.accountId===accId, atau null.
function findLinkedAssetForAccount(accId){
if(!accId)return null;
return (D.assets||[]).find(a=>sameId(a.accountId,accId))||null;
}
// findLinkedHoldingForAccount(accId) — S601-3 (DL-S601-3, Temuan #1 AUDIT-
// S600-HOLDING-GAP-OWNER-DROPDOWNS.md). Varian findLinkedAssetForAccount()
// TAPI query ke Investment.getHoldings() lewat field baru `h.accountId`
// (skema, lihat investasi.js addHolding()/updateHolding()) -- pola pencarian
// direuse 100% (sameId(), fallback null), 0 logic baru selain sumber data.
// Return: holding pertama (D.investments) yang h.accountId===accId, atau null.
function findLinkedHoldingForAccount(accId){
if(!accId||typeof Investment==='undefined')return null;
return Investment.getHoldings().find(h=>sameId(h.accountId,accId))||null;
}
// findLinkedHoldingsForAccount(accId) — S638, perbaikan kasus 2+ holding
// berbagi 1 akun yang sama (ditemukan lewat pertanyaan user "3 aset holding
// ditautkan ke 1 akun metode pembayaran"). Varian PLURAL
// findLinkedHoldingForAccount() di atas -- balikin SEMUA holding yang
// h.accountId===accId, bukan cuma yang pertama. findLinkedHoldingForAccount()
// (singular) TETAP ADA APA ADANYA & TIDAK diubah (dipakai badge/guard UI yang
// cuma butuh tahu "ada/tidak ada holding tertaut", 0 regresi) -- fungsi baru
// ini dipakai jalur yang butuh porsi/owners AGREGAT (resolveOwnerDefaultForAccount()
// di bawah, resolveTxOwnerSplitForAccount() filter-laporan.js, resolveAccOwnershipBadgeState()
// akun.js), supaya kalau 2+ holding kebetulan nunjuk akun yang sama, TIDAK ADA
// lagi holding yang "hilang" diam-diam dari perhitungan porsi/owner (root cause
// sebelum fix ini: singular .find() cuma ambil yang pertama di array
// D.investments -- urutan array bukan sesuatu yang user kontrol/sadari).
// Return: array holding (bisa kosong), TIDAK termasuk null filter (aman
// di-.length/.reduce/.forEach langsung oleh caller).
function findLinkedHoldingsForAccount(accId){
if(!accId||typeof Investment==='undefined')return[];
return Investment.getHoldings().filter(h=>sameId(h.accountId,accId));
}
// aggregateOwnersAcrossHoldings(holdings) — S638. Merge owners[] dari N holding
// (semuanya tertaut ke akun yang sama) jadi 1 daftar owners gabungan, DIBOBOT
// NILAI tiap holding (Investment.holdingValue(h), fungsi yang SUDAH ADA -- 0
// rumus nilai baru) relatif ke total nilai SELURUH holding yang ditautkan.
// Kenapa dibobot nilai (bukan rata-rata porsi mentah/jumlah baris): holding A
// senilai 90jt porsi Owner X 100%, holding B senilai 10jt (akun SAMA) porsi
// Owner Y 100% -- kalau dirata-rata mentah (50/50) hasilnya menyesatkan (seolah
// kontribusi keduanya ke akun itu sama besar), padahal Owner X mewakili 90%
// NILAI riil yang mengalir ke akun itu. Owner yang sama (ownerId sama) muncul
// di >1 holding -- porsi kontribusinya DIJUMLAH (bukan ditimpa), supaya total
// tetap konsisten kalau semua holding sumbernya solid (bisa <100% kalau
// satu/lebih holding-nya sendiri belum 100% teralokasi -- perilaku sama
// seperti owners[] tunggal manapun, 0 beda kontrak). Fallback bobot SAMA RATA
// (1/N) kalau totalValue<=0 (semua holding nilainya 0/minus -- hindari
// div-by-zero, tetap balikin owners yang masuk akal drpd crash).
// holdings.length===1: jalur pintas balikin Investment.getOwners(holdings[0])
// apa adanya (0 pembobotan/pembulatan, identik perilaku lama sebelum fix ini
// -- 0 regresi kasus paling umum, 1 holding per akun).
// PURE, 0 mutasi. Return: array {ownerId, porsi, ownerName, isSelf} (porsi
// terbobot, dibulatkan 2 desimal spy noise floating-point tidak nyeret ke UI).
function aggregateOwnersAcrossHoldings(holdings){
if(!holdings||!holdings.length||typeof Investment==='undefined')return[];
if(holdings.length===1){
const o=Investment.getOwners(holdings[0]);
return(o&&o.length)?o:[];
}
const totalValue=holdings.reduce((s,h)=>s+Investment.holdingValue(h),0);
const map=new Map();
holdings.forEach((h)=>{
const weight=totalValue>0?(Investment.holdingValue(h)/totalValue):(1/holdings.length);
const hOwners=Investment.getOwners(h)||[];
hOwners.forEach((o)=>{
if(!o||!o.ownerId)return;
const contrib=(Number(o.porsi)||0)*weight;
if(map.has(o.ownerId)){
map.get(o.ownerId).porsi+=contrib;
}else{
map.set(o.ownerId,{ownerId:o.ownerId,porsi:contrib,ownerName:o.ownerName||o.ownerId,isSelf:!!o.isSelf});
}
});
});
return Array.from(map.values()).filter((o)=>o.porsi>0).map((o)=>({...o,porsi:Math.round(o.porsi*100)/100}));
}
// resolveOwnerDefaultForAccount(accId) — Sesi Res-B (DESIGN-LOCK-LINKED-
// ASSET-ACCOUNT-OWNER-DEFAULT.md §2.1/§2.2). Owner Resolver: tentukan
// kandidat default `deductionOwnerId` untuk akun `accId`, TANPA menulis
// apa pun (read-only, 0 setAccOwners(), 0 mutasi D.assets/D.accounts).
// Prioritas (berhenti di langkah pertama yang menghasilkan kandidat,
// TIDAK digabung/dijumlah antar langkah):
//   0. SESI S601-3 (DL-S601-3, Temuan #1): Holding tertaut LANGSUNG ke akun
//      (findLinkedHoldingForAccount(), field baru `h.accountId`) -- baca
//      owners via Investment.getOwners(h) (0 rumus baru, fungsi getOwners()
//      SUDAH ADA sejak AUD-008/Sesi 462). source:'holding'. Kalau Holding
//      DAN Aset SAMA-SAMA tertaut ke akun yang sama (konflik), Holding
//      MENANG -- keputusan Design Lock, karena Holding adalah sumber
//      kebenaran porsi LIVE (lihat catatan Aset._resolveLinkedInvestmentOwners()
//      di langkah 1 di bawah -- kalau aset tertaut Holding, porsinya sendiri
//      sudah delegasi ke Holding juga, jadi konsisten: Holding selalu jadi
//      SATU sumber kebenaran final ketika keduanya terlibat).
//   1. Aset tertaut (findLinkedAssetForAccount()) yang punya `a.owners[]`
//      EKSPLISIT (guard sama persis _asetOwnersForTitipan() di
//      dana-titipan-aggregation-api.js -- HANYA percaya
//      MultiOwnerEngine.getOwners(asset) yg !isSynthesized, TIDAK PERNAH
//      sintesis dari a.ownership -- lihat DESIGN-LOCK-...-DEFAULT.md
//      §1.11). source:'asset'.
//      SESI S601-2 (AUDIT-S600-HOLDING-GAP-OWNER-DROPDOWNS.md, Temuan #3):
//      kalau aset tertaut ITU SENDIRI sudah ditautkan ke Holding Investasi
//      (`asset.investmentId`), `a.owners[]` mentah BASI -- porsi asli
//      hidup live di Holding (lihat komentar `Aset._resolveLinkedInvestmentOwners()`
//      di aset.js, "porsi aset yang tertaut jadi SATU sumber kebenaran di
//      holding investasi"). Sebelum sesi ini, fungsi ini baca `a.owners`
//      mentah tanpa cek itu -- BEDA dari `resolveTxOwnerSplitForAccount()`
//      (filter-laporan.js, Sesi A) yang SUDAH benar cek `investmentId` &
//      baca live lewat `Aset._resolveLinkedInvestmentOwners()`. Fix: cek
//      tautan Holding LEBIH DULU (reuse 100% fungsi yang sama, 0 rumus
//      baru), baru fallback ke `a.owners` mentah kalau aset TIDAK tertaut
//      Holding (0 regresi kasus lama). source tetap 'asset' di kedua
//      cabang (keduanya data eksplisit/persisted, 0 beda needsConfirm).
//   2. getAccOwnersEffective(accId) (akun.js, Sesi Res-B) -- raw owners[]
//      ATAU sintesis 1-owner-100% dari acc.ownership. source:'account'.
//   3. Tidak ada kandidat -> owners:[], source:'none'.
// needsConfirm HANYA true kalau source==='account' DAN hasil
// getAccOwnersEffective() itu sendiri needsConfirm:true (sintesis dari
// acc.ownership) -- source:'asset' TIDAK PERNAH needsConfirm (owners[]
// aset sudah eksplisit/persisted, 0 konfirmasi tambahan dibutuhkan,
// sesuai DESIGN-LOCK-...-DEFAULT.md §4 Res-C).
// autoSelectId diisi HANYA kalau owners.length===1 (§2.2) -- 2+ owner
// balik null, TIDAK ADA tie-break otomatis (porsi terbesar/urutan array).
// Return: {ok:true, source, owners, needsConfirm, autoSelectId}.
function resolveOwnerDefaultForAccount(accId){
if(!accId||typeof MultiOwnerEngine==='undefined')return{ok:true,source:'none',owners:[],needsConfirm:false,autoSelectId:null};
// S638: dulu findLinkedHoldingForAccount() (singular, .find()) -- kalau 2+
// holding kebetulan tertaut ke akun yang sama, holding ke-2/ke-3 dst DIAM-DIAM
// diabaikan (bukan cuma dari label, dari PORSI/OWNER juga -- deductionOwnerId
// default yang dihasilkan cuma mewakili 1 holding). Sekarang pakai varian
// plural + aggregateOwnersAcrossHoldings() (lihat komentar keduanya di atas)
// supaya owners gabungan (dibobot nilai) yang jadi kandidat, bukan cuma
// holding pertama di array. holdings.length===1 -- hasil PERSIS sama seperti
// sebelum fix ini (0 regresi kasus paling umum).
const holdings=findLinkedHoldingsForAccount(accId);
if(holdings.length&&typeof Investment!=='undefined'){
const hOwners=aggregateOwnersAcrossHoldings(holdings);
if(hOwners&&hOwners.length>0){
return{ok:true,source:'holding',owners:hOwners,needsConfirm:false,autoSelectId:hOwners.length===1?hOwners[0].ownerId:null};
}
}
const asset=findLinkedAssetForAccount(accId);
if(asset){
let owners=null;
if(asset.investmentId&&typeof Aset!=='undefined'&&typeof Aset._resolveLinkedInvestmentOwners==='function'){
owners=Aset._resolveLinkedInvestmentOwners(asset);
}
if(owners&&owners.length>0){
return{ok:true,source:'asset',owners,needsConfirm:false,autoSelectId:owners.length===1?owners[0].ownerId:null};
}
const r=MultiOwnerEngine.getOwners(asset);
if(r&&r.ok&&!r.isSynthesized&&r.owners.length>0){
return{ok:true,source:'asset',owners:r.owners,needsConfirm:false,autoSelectId:r.owners.length===1?r.owners[0].ownerId:null};
}
}
if(typeof getAccOwnersEffective==='function'){
const eff=getAccOwnersEffective(accId);
if(eff&&eff.ok&&eff.owners.length>0){
return{ok:true,source:'account',owners:eff.owners,needsConfirm:eff.needsConfirm,autoSelectId:eff.owners.length===1?eff.owners[0].ownerId:null};
}
}
return{ok:true,source:'none',owners:[],needsConfirm:false,autoSelectId:null};
}
// onTxAccChange() — dipanggil onchange #txAcc (dropdown Akun/Metode,
// modals.js). Selain menandai _txAccManuallySet=true (perilaku lama, dipakai
// applyLastAccForCat() supaya tidak menimpa pilihan manual user), sekarang
// JUGA auto-suggest aset multi-owner yang akunnya cocok
// (findMultiOwnerAssetForAccount()) ke dropdown #txAssetId -- SATU-satunya
// jembatan otomatis akun→aset yang ada di form ini (lihat audit gap #2).
// Guard _txAssetManuallySet: kalau user SUDAH pernah pilih sendiri aset di
// dropdown itu (lewat onTxAssetChange()), auto-suggest ini TIDAK menimpanya
// (pola sama persis applyLastAccForCat() vs _txAccManuallySet) -- 0 override
// paksa pilihan sadar user, cuma bantu isi kalau masih kosong/default.
function onTxAccChange(){
_txAccManuallySet=true;
updateTxAssetWrapVisibility();
updateTxDeductionOwnerVisibility();
// PATCH (akun-majoris-selflink-redundant): auto-suggest aset multi-owner
// yg dulu ada di sini DIBUANG -- aset yg accountId-nya cocok dgn akun
// terpilih SEKARANG SELALU jadi aset self-linked yg sengaja dikecualikan
// dari dropdown #txAssetId (lihat updateTxAssetWrapVisibility()), jadi 0
// lagi yg perlu di-auto-suggest ke situ. updateTxAssetWrapVisibility() di
// atas sudah cukup: repopulate #txAssetId (buang opsi self-link kalau
// ada) & reset value ke '' kalau pilihan lama sudah tidak valid lagi.
// updateTxOwnerPorsiOptions()/updateTxAssetSplitPreview() DIHAPUS (audit
// AUDIT-S540/B1-B12-DOUBLECOUNT) — dropdown "Porsi Pemilik (akun
// patungan)" & live preview split porsi sudah tidak ada di modal ini.
}
// updateTxDeductionOwnerVisibility() — S574-C (lanjutan S574-A/B data
// layer & UI porsi akun, lihat AUDIT-S574-PEMILIK-SUMBER-POTONGAN.md
// Tahap 3): show/hide + isi ulang picker "Pemilik Sumber Potongan"
// (#txDeductionOwnerWrap/#txDeductionOwner, modals.js) berdasarkan
// owners[] akun yang SEDANG dipilih di #txAcc. Reuse PENUH getAccOwners()
// (S574-A, akun.js -> MultiOwnerEngine.getOwners(), 0 logic porsi baru
// ditulis di sini) -- picker ini murni assignment biner (pilih 1 owner
// sbg penanggung penuh transaksi), TIDAK PERNAH menghitung
// nilai*porsi/100 & TIDAK menyentuh #txAssetId/ownership aset/investasi
// sama sekali (domain terpisah, lihat audit §2.5/§5).
// - Akun tanpa owners[] atau owners[] hanya 1 (termasuk SEMUA akun lama,
//   getAccOwners() sudah toleran/backward-compat) -> wrap disembunyikan,
//   dropdown dikosongkan, TIDAK wajib pilih apa pun (0 friksi tambahan
//   dibanding sebelum fitur ini ada -- transaksi lama tetap normal).
// - Akun dengan >1 owner -> wrap ditampilkan, opsi HANYA berasal dari
//   owners AKUN INI (bukan aset/investasi/akun lain manapun -- larangan
//   eksplisit scope sesi ini). Dropdown SELALU direpopulate dari nol tiap
//   dipanggil (value direset ke '') supaya pilihan owner dari akun
//   sebelumnya TIDAK pernah terbawa ke akun multi-owner yang baru dipilih
//   (persyaratan §3: ganti akun multi-owner A -> multi-owner B, owner A
//   tidak boleh nempel di B).
// Dipanggil dari onTxAccChange() (mekanisme existing, TIDAK ada
// listener/mutation-gate baru dibuat) + openTxModal()/editTx() supaya
// field ini ikut ke-reset/terisi benar tiap buka modal, persis pola
// updateTxAssetWrapVisibility() di atas.
// CATATAN SCOPE (S574-C): fungsi ini sendiri HANYA state UI (nilai
// dropdown), TIDAK menyimpan apa pun ke `existingTx`/`D.transactions`.
// Persistensi field `deductionOwnerId` (baca nilai dropdown ini +
// validasi wajib-pilih + tulis ke SEMUA cabang `_saveTxInner()`) sudah
// diselesaikan di S574-D1 (lihat audit §9 Tahap 4) -- fungsi ini masih
// TIDAK diubah sesi itu, murni dikonsumsi apa adanya oleh _saveTxInner().
// updateTxDeductionOwnerVisibility() — REVISI S575 (lanjutan S574-C): syarat
// tampil sekarang MURNI "akun punya owners[] asli dengan minimal 1 baris
// valid", dibaca lewat getAccOwnersRaw() (akun.js, S575) -- BUKAN lagi
// isMultiOwner (owners.length>1) dan BUKAN total porsi 100%, sesuai larangan
// eksplisit S575 (getAccOwners()/isMultiOwner membungkus syarat 100% yang
// tidak relevan utk field assignment biner ini, lihat komentar
// getAccOwnersRaw()). Perilaku baru:
// - 0 owner asli (termasuk SEMUA akun lama tanpa owners[]) -> wrap
//   disembunyikan, sama seperti sebelumnya (0 regresi akun lama).
// - 1 owner -> wrap TETAP ditampilkan, dropdown otomatis terisi ke satu-
//   satunya owner itu (tidak perlu pilih manual).
// - 2+ owner -> wrap ditampilkan, dropdown berisi semua opsi, value direset
//   ke '' (perilaku lama dipertahankan persis: pilihan owner dari akun
//   sebelumnya TIDAK boleh terbawa ke akun lain).
// Validasi wajib-pilih saat simpan (_saveTxInner(), masih pakai
// getAccOwners()/isMultiOwner) SENGAJA TIDAK diubah di sini -- itu domain
// "aturan validasi porsi kepemilikan" yang di luar scope S575.
// updateTxDeductionOwnerVisibility() — REVISI Sesi Res-C (DESIGN-LOCK-
// LINKED-ASSET-ACCOUNT-OWNER-DEFAULT.md §4): sumber kandidat sekarang
// resolveOwnerDefaultForAccount() (transaksi.js, Sesi Res-B) -- BUKAN lagi
// getAccOwnersRaw() langsung. resolveOwnerDefaultForAccount() SENDIRI
// sudah fallback ke account.owners[]/ownership kalau aset tertaut tidak
// py owners[] eksplisit (lihat §2.1), jadi 0 perubahan urutan prioritas
// perlu ditulis ulang di sini -- fungsi ini murni KONSUMEN.
// Auto-select vs dropdown (§2.2) TIDAK berubah dari pola S575: 1 kandidat
// -> auto-select, 2+ -> dropdown value direset. 0 kandidat -> wrap
// disembunyikan (REGRESI WAJIB: identik akun tanpa aset tertaut & tanpa
// owners[] apa pun, sama seperti S575 test [1/6]).
// Status "belum dikonfirmasi" + aksi "Jadikan permanen" (elemen
// #txDeductionOwnerStatus, modals.js) HANYA muncul kalau
// resolved.source==='account' DAN resolved.needsConfirm===true (owners[]
// hasil sintesis 1-owner-100% dari acc.ownership, lihat
// getAccOwnersEffective() akun.js) -- kandidat dari source:'asset' TIDAK
// PERNAH needsConfirm (owners[] aset sudah eksplisit/persisted, sesuai
// §4). Fallback defensif: kalau resolveOwnerDefaultForAccount() belum
// dimuat (guard sama pola existing di file ini), turun ke getAccOwnersRaw()
// langsung persis perilaku S575 lama -- 0 regresi kalau Res-B belum aktif.
function updateTxDeductionOwnerVisibility(){
const wrap=document.getElementById('txDeductionOwnerWrap');
const sel=document.getElementById('txDeductionOwner');
const status=document.getElementById('txDeductionOwnerStatus');
if(!wrap||!sel)return;
const accId=document.getElementById('txAcc')?document.getElementById('txAcc').value:'';
let owners=[];
let needsConfirm=false;
let source='none';
if(accId&&typeof resolveOwnerDefaultForAccount==='function'){
const resolved=resolveOwnerDefaultForAccount(accId);
if(resolved&&resolved.ok){owners=resolved.owners||[];needsConfirm=!!resolved.needsConfirm;source=resolved.source;}
}else if(accId&&typeof getAccOwnersRaw==='function'){
const res=getAccOwnersRaw(accId);
owners=(res&&res.ok)?(res.owners||[]):[];
}
if(owners.length<1){
wrap.style.display='none';
sel.innerHTML='';
sel.value='';
if(status){status.style.display='none';status.innerHTML='';}
return;
}
wrap.style.display='block';
sel.innerHTML='<option value="">— Pilih Pemilik —</option>'+owners.map(o=>'<option value="'+escapeHtml(String(o.ownerId))+'">'+escapeHtml(o.ownerName||String(o.ownerId))+'</option>').join('');
// FIX SESI (laporan user 2026-08-15, lanjutan fix resolveTxOwnerAssignment()
// di filter-laporan.js): SEBELUMNYA akun 1-owner auto-preselect
// owners[0].ownerId di sini -- jadi setiap transaksi baru pada akun
// single-owner otomatis tersimpan dgn deductionOwnerId terisi, seolah
// SEMUA transaksi di akun itu (belanja mingguan, pulsa, dst) memang utk
// pocket Dana Titipan itu. Field ini SEKARANG murni opsional utk akun
// single-owner juga (selalu default kosong, sama spt akun multi-owner) --
// user pilih SADAR hanya utk transaksi yg memang mau ditandai/dipotong ke
// pocket tsb. 0 perubahan validasi wajib-isi (tetap HANYA wajib kalau
// owners.length>1, lihat pemanggil _saveTxInner()).
sel.value='';
if(status){
if(source==='account'&&needsConfirm){
status.style.display='block';
status.innerHTML='⚠️ Belum dikonfirmasi (dari Kepemilikan akun) — <span style="text-decoration:underline;cursor:pointer" data-action="TxDeductionOwner.makePermanent" data-args=\'["'+jsAttrEscape(accId)+'"]\'>Jadikan permanen</span>';
}else{
status.style.display='none';
status.innerHTML='';
}
}
}
// TxDeductionOwner — Sesi Res-C (DESIGN-LOCK-LINKED-ASSET-ACCOUNT-OWNER-
// DEFAULT.md §4). makePermanent() adalah SATU-satunya titik tulis di sesi
// ini (reuse penuh setAccOwners(), akun.js -- 0 logic tulis baru), dipicu
// MURNI oleh klik eksplisit user di status "belum dikonfirmasi" (lihat
// updateTxDeductionOwnerVisibility() di atas). Owner Resolver
// (resolveOwnerDefaultForAccount()) sendiri TETAP read-only, sesuai §2.3.
// Guard: hanya jalan kalau source masih 'account' & needsConfirm masih
// true saat tombol ditekan (re-resolve, bukan percaya state lama) --
// mencegah double-write kalau user sempat ganti akun di antara render &
// klik. Re-render field ini via updateTxDeductionOwnerVisibility() setelah
// sukses supaya status "belum dikonfirmasi" langsung hilang (owners[] akun
// sekarang eksplisit/persisted, needsConfirm otomatis false).
var TxDeductionOwner={
makePermanent:function(accId){
if(!accId||typeof resolveOwnerDefaultForAccount!=='function'||typeof setAccOwners!=='function')return;
const resolved=resolveOwnerDefaultForAccount(accId);
if(!resolved||!resolved.ok||resolved.source!=='account'||!resolved.needsConfirm||!resolved.owners||resolved.owners.length<1)return;
const res=setAccOwners(accId,resolved.owners);
if(res&&res.ok)updateTxDeductionOwnerVisibility();
}
};
if(typeof window!=='undefined'){
window.TxDeductionOwner=TxDeductionOwner;
}
// updateTxOwnerPorsiOptions() DIHAPUS (audit AUDIT-S540/B1-B12-DOUBLECOUNT,
// spesifikasi "relasi murni") — dropdown "Porsi Pemilik (akun patungan)"
// (#txOwnerPorsiWrap/#txOwnerPorsi, modals.js) sudah dihapus dari modal;
// transaksi akun patungan sekarang SELALU tercatat penuh dari #txAcc yang
// dipilih, 0 lagi pemilihan porsi manual per transaksi.
// onTxAssetChange() — dipanggil onchange #txAssetId (dropdown aset
// multi-owner di form transaksi). Selain refresh live preview pembagian,
// sekarang juga menandai _txAssetManuallySet=true (patch akun-multi-owner-
// doublecount-datahealthcheck-restore) -- begitu user SENGAJA memilih aset
// sendiri (termasuk balik ke "— Tidak dikaitkan —"), auto-suggest dari
// onTxAccChange() berhenti menimpa pilihan itu di sesi form yang sama.
function onTxAssetChange(){
_txAssetManuallySet=true;
}
// updateTxAssetSplitPreview() DIHAPUS (audit AUDIT-S540/B1-B12-DOUBLECOUNT)
// bersama resolveTxAssetSplit() — 0 lagi live preview split porsi di modal
// Transaksi; #txAssetSplitPreview sudah dihapus dari modals.js.
function updateSubCatOptions(){
updateTxVehiclePanels();
}
function jsAttrEscape(s){
return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}
function hideSuggestBox(id){
const box=document.getElementById(id);
if(box){box.style.display='none';box.innerHTML='';}
}
function onTxCatInput(){
const raw=document.getElementById('txCat').value;
const q=raw.trim().toLowerCase();
const cats=getCatsByType(curTxType);
const matches=cats.filter(c=>!q||c.name.toLowerCase().includes(q));
const box=document.getElementById('txCatSuggestBox');
let html=matches.map(c=>`<div class="suggest-item" onmousedown="event.preventDefault();selectTxCat('${jsAttrEscape(c.name)}')">${escapeHtml(c.emoji||'📦')} ${escapeHtml(c.name)}</div>`).join('');
if(q && !cats.some(c=>c.name.toLowerCase()===q)){
html+=`<div class="suggest-item suggest-add" onmousedown="event.preventDefault();addNewCatFromInput()">➕ Tambah kategori baru: "${escapeHtml(raw.trim())}"</div>`;
}
if(!html) html='<div class="suggest-empty">Belum ada kategori. Ketik nama baru lalu pilih "Tambah kategori baru".</div>';
box.innerHTML=html;
box.style.display='block';
}
function selectTxCat(name){
const prev=document.getElementById('txCat').value;
document.getElementById('txCat').value=name;
if(prev!==name) document.getElementById('txSubCat').value='';
hideSuggestBox('txCatSuggestBox');
updateTxVehiclePanels();
applyLastAccForCat(name);
}
function applyLastAccForCat(catName){
if(_txAccManuallySet)return;
if(!D.lastAccByCategory)return;
const accId=D.lastAccByCategory[catName];
if(!accId)return;
const accEl=document.getElementById('txAcc');
if(!accEl)return;
const exists=[...accEl.options].some(o=>o.value===accId);
if(exists){accEl.value=accId;}
}
function addNewCatFromInput(){
const q=document.getElementById('txCat').value.trim();
hideSuggestBox('txCatSuggestBox');
const prevType=curTxType;
openCatModal(undefined,prevType,(newName)=>{
curTxType=prevType;
document.getElementById('txCat').value=newName;
updateTxVehiclePanels();
});
setTimeout(()=>{const el=document.getElementById('catName'); if(el&&q)el.value=q;},50);
}
function onTxSubCatInput(){
const box=document.getElementById('txSubCatSuggestBox');
const catName=document.getElementById('txCat').value.trim();
const q=document.getElementById('txSubCat').value.trim().toLowerCase();
const cats=getCatsByType(curTxType);
// Kumpulkan subkategori dari SEMUA kategori (tipe yg sama), bukan cuma kategori yang
// sudah diisi di atas -- supaya bisa ketik/pilih Subkategori duluan sebelum isi
// Kategori, atau langsung klik field ini buat lihat semua subkategori yg ada. Begitu
// salah satu dipilih, Kategori utama otomatis ke-sync (lihat selectTxSubCatWithCat).
let candidates=[];
cats.forEach(c=>{(c.subs||[]).forEach(s=>{candidates.push({catName:c.name,catEmoji:c.emoji,subName:s.name});});});
if(catName){
// Kategori yg sudah diisi diprioritaskan tampil duluan, tapi subkategori kategori
// lain tetap ikut muncul (biar bisa ganti kategori lewat Subkategori juga).
candidates.sort((a,b)=>(b.catName===catName)-(a.catName===catName));
}
const matches=candidates.filter(c=>!q||c.subName.toLowerCase().includes(q));
let html='<div class="suggest-item" onmousedown="event.preventDefault();selectTxSubCat(\'\')">— Tanpa subkategori —</div>';
html+=matches.slice(0,30).map(c=>`<div class="suggest-item" onmousedown="event.preventDefault();selectTxSubCatWithCat('${jsAttrEscape(c.catName)}','${jsAttrEscape(c.subName)}')">${escapeHtml(c.subName)} <span style="color:var(--text3);font-size:11px">— ${escapeHtml(c.catEmoji||'📦')} ${escapeHtml(c.catName)}</span></div>`).join('');
if(!matches.length && q) html+='<div class="suggest-empty">Tidak ada subkategori yang cocok.</div>';
box.innerHTML=html;
box.style.display='block';
}
function selectTxSubCatWithCat(catName,subName){
const catEl=document.getElementById('txCat');
if(catEl.value!==catName){
catEl.value=catName;
applyLastAccForCat(catName);
}
document.getElementById('txSubCat').value=subName;
hideSuggestBox('txSubCatSuggestBox');
updateTxVehiclePanels();
}
function selectTxSubCat(subName){
document.getElementById('txSubCat').value=subName;
hideSuggestBox('txSubCatSuggestBox');
updateTxVehiclePanels();
}
function recentUniqueStrings(list,getter,limit){
limit=limit||50;
const seen=new Set();const out=[];
for(let i=(list||[]).length-1;i>=0;i--){
const v=(getter(list[i])||'').trim();
if(v && !seen.has(v.toLowerCase())){seen.add(v.toLowerCase());out.push(v);}
if(out.length>=limit)break;
}
return out;
}
function simpleAutocompleteInput(inputId,boxId,sourceFn){
const el=document.getElementById(inputId);
const box=document.getElementById(boxId);
if(!el||!box)return;
const q=el.value.trim().toLowerCase();
let values=[];
try{values=sourceFn()||[];}catch(e){values=[];}
const matches=(q?values.filter(v=>v.toLowerCase().includes(q)):values).slice(0,8);
if(!matches.length){box.style.display='none';box.innerHTML='';return;}
box.innerHTML=matches.map(v=>`<div class="suggest-item" onmousedown="event.preventDefault();selectSimpleAutocomplete('${jsAttrEscape(inputId)}','${jsAttrEscape(boxId)}','${jsAttrEscape(v)}')">${escapeHtml(v)}</div>`).join('');
box.style.display='block';
}
function selectSimpleAutocomplete(inputId,boxId,value){
const el=document.getElementById(inputId);
if(el)el.value=value;
hideSuggestBox(boxId);
}
function acProductNames(){return recentUniqueStrings(D.products,p=>p.name);}
function acProdusenNames(){return recentUniqueStrings(D.produsen,p=>p.name);}
function acBillNames(){return recentUniqueStrings((D.bills||[]).concat(D.billsArchive||[]),b=>b.name);}
function acStockNames(){return recentUniqueStrings(D.partsStock,p=>p.name);}
function acStockCodes(){return recentUniqueStrings(D.partsStock,p=>p.code);}
function acSparepartCatNames(){return recentUniqueStrings(D.sparepartCats,c=>c.name);}
function acSparepartCatCodes(){return recentUniqueStrings(D.sparepartCats,c=>c.code);}
function acSpbuNames(){return recentUniqueStrings(D.bbmLogs,b=>b.spbu);}
function acTxNotes(){return recentUniqueStrings(D.transactions,t=>t.note);}
function isKendaraanCatName(catName){
return /kendaraan|transport|motor|vario|beat|grandmax/i.test(catName||'');
}
// isRenovCatName(catName) -- detektor kategori Renovasi utk panel "🔨 Catat
// juga ke Proyek Renovasi?" (lihat tx-renov.js). Pola sama persis dgn
// isKendaraanCatName di atas: cocok kalau nama kategori mengandung "Renov"
// (mis. "Renovasi"), case-insensitive.
function isRenovCatName(catName){
return /renov/i.test(catName||'');
}
function resolveVehicleTxCategory(vehicle){
const vehName=vehicle&&vehicle.name?vehicle.name:'';
const vehId=vehicle&&vehicle.id?vehicle.id:null;
// BUGFIX: dulu kategori per-kendaraan dicari HANYA lewat cocok nama persis
// (cat.name===vehicle.name). Begitu kategori itu di-rename lewat menu
// Kategori (lihat kategori.js:saveCat, yg SUDAH benar menyesuaikan
// transaksi LAMA ke nama baru), pencarian nama di sini jadi tidak ketemu
// lagi utk catatan BBM/servis BERIKUTNYA -> silently jatuh ke kategori
// "Transport" umum, tercampur dgn kendaraan lain, tanpa ada pesan apapun.
// Sekarang kategori kendaraan disimpan pakai link stabil `linkedVehicleId`
// begitu ketemu/dibuat pertama kali, jadi tetap ke-track walau nama
// kategori (atau nanti nama kendaraan, kalau suatu saat ada fitur rename
// kendaraan) berubah. Data lama tanpa `linkedVehicleId` tetap kompatibel
// lewat fallback cocok-nama seperti sebelumnya.
let cat=vehId?D.categories.expense.find(c=>c.linkedVehicleId===vehId):null;
if(!cat){
cat=D.categories.expense.find(c=>c.name.trim().toLowerCase()===vehName.trim().toLowerCase());
if(cat&&vehId)cat.linkedVehicleId=vehId;
}
if(!cat) cat=D.categories.expense.find(c=>/^transport$/i.test(c.name));
if(!cat){
cat={id:'cat_'+slugify('Transport')+'_'+uid(),name:'Transport',emoji:'🏍️',subs:[]};
D.categories.expense.push(cat);
}
if(!cat.subs)cat.subs=[];
['Bensin','Servis & Oli','Pajak'].forEach(subName=>{
if(!cat.subs.find(s=>s.name.trim().toLowerCase()===subName.toLowerCase())){
cat.subs.push({id:'sub_'+slugify(subName)+'_'+uid(),name:subName});
}
});
return cat.name;
}
function isBensinSubName(subName){
return /bensin|bbm|bahan bakar|pertalite|pertamax|solar/i.test(subName||'');
}
function isSparepartSubName(catName,subName){
if(!isKendaraanCatName(catName))return false;
if(isBensinSubName(subName))return false;
return true;
}
// Catatan: isShopStockCatName (detektor kategori Stok/Penjualan Shop/Shop)
// dipindah ke tx-cobek.js (lihat CLAUDE.md catatan kerja "split transaksi.js"
// bagian ke-9) -- tetap fungsi global, tetap dipanggil persis sama dari
// updateTxVehiclePanels() di bawah ini.
function updateTxVehiclePanels(){
const stockPanel=document.getElementById('txStockPanel');
const bbmPanel=document.getElementById('txBbmPanel');
const shopPanel=document.getElementById('txShopStockPanel');
const shopSalePanel=document.getElementById('txShopSalePanel');
const renovPanel=document.getElementById('txRenovPanel');
if(!stockPanel||!bbmPanel)return;
const catName=document.getElementById('txCat').value;
const subName=document.getElementById('txSubCat')?document.getElementById('txSubCat').value:'';
const isExpense=curTxType==='expense';
const showBbm=isExpense&&isKendaraanCatName(catName)&&isBensinSubName(subName);
const showStock=isExpense&&!showBbm&&isSparepartSubName(catName,subName);
const showShop=isExpense&&!showBbm&&!showStock&&isShopStockCatName(catName,subName);
const showShopSale=!isExpense&&isShopStockCatName(catName,subName);
const showRenov=isExpense&&isRenovCatName(catName);
// Sesi ini (sync sparepart -> servis, permintaan user): panel Servis muncul
// bareng kondisi panel Stok Sparepart (showStock) -- keduanya boleh aktif
// BERSAMAAN dalam 1 transaksi (mis. beli part sekaligus langsung dipasang),
// lihat catatan applyTxServisFromTx() di tx-servis.js soal efek stok net.
const showServis=showStock;
bbmPanel.style.display=showBbm?'block':'none';
stockPanel.style.display=showStock?'block':'none';
const servisPanel=document.getElementById('txServisPanel');
if(servisPanel)servisPanel.style.display=showServis?'block':'none';
if(shopPanel)shopPanel.style.display=showShop?'block':'none';
if(shopSalePanel)shopSalePanel.style.display=showShopSale?'block':'none';
if(renovPanel)renovPanel.style.display=showRenov?'block':'none';
if(showBbm){
populateTxBbmVehicleSelect();
} else {
const chk=document.getElementById('txSyncBbm');
if(chk)chk.checked=false;
toggleTxBbmFields();
}
if(showStock){
populateTxStockSelect();
} else {
const chk=document.getElementById('txAddStock');
if(chk)chk.checked=false;
toggleTxStockFields();
}
if(showServis){
if(typeof populateTxServisVehicleSelect==='function')populateTxServisVehicleSelect();
} else {
const servisChk=document.getElementById('txSyncServis');
if(servisChk)servisChk.checked=false;
if(typeof toggleTxServisFields==='function')toggleTxServisFields();
}
if(showShop){
populateTxShopStockSelect();
} else {
const chk=document.getElementById('txAddShopStock');
if(chk)chk.checked=false;
toggleTxShopStockFields();
resetShopStockCart();
}
if(showShopSale){
populateTxShopSaleSelect();
} else {
const chk=document.getElementById('txAddShopSale');
if(chk)chk.checked=false;
toggleTxShopSaleFields();
resetTxShopSaleCart();
}
if(showRenov){
if(typeof populateTxRenovSelect==='function')populateTxRenovSelect();
} else {
const rchk=document.getElementById('txAddRenov');
if(rchk)rchk.checked=false;
if(typeof toggleTxRenovFields==='function')toggleTxRenovFields();
}
}
// Catatan: fungsi-fungsi form BBM (populateTxBbmVehicleSelect, toggleTxBbmFields,
// syncTxBbmAmt, syncTxAmtToLiter, syncTxAmtToLiterForce, recordBbmLog,
// applyTxBbmFromTx) dipindah ke tx-bbm.js (lihat CLAUDE.md catatan kerja "split
// transaksi.js" bagian ke-6) -- tetap global, tetap dipanggil persis sama dari
// sini, dari HTML (modals.js), maupun dari file lain (BBM._saveInner di
// car-notes.js).
// Catatan: fungsi-fungsi panel "Tambah ke Stok Sparepart" (populateTxStockSelect,
// onTxStockItemChange, toggleTxStockFields, applyTxStockFromTx) dipindah ke
// tx-stok-sparepart.js (lihat CLAUDE.md catatan kerja "split transaksi.js"
// bagian ke-7) -- tetap global, tetap dipanggil persis sama dari sini, dari
// HTML (modals.js), maupun dari scan-ocr.js.
// Catatan: fungsi-fungsi domain Target/Tabungan (openTargetModal,
// onTargetAccChange, onTargetDanaDaruratToggle, saveTarget,
// showTargetAccountTx, addTarget, delTarget) dipindah ke tx-target.js
// (lihat CLAUDE.md catatan kerja "split transaksi.js" bagian ke-9) --
// tetap fungsi global, tetap dipanggil persis sama dari HTML (modals.js,
// modules-render.js), maupun dari modules-calc.js/aset.js.
function openCatatan(type){curCatatan=type;document.getElementById('catatanTitle').textContent='Catatan Anak';document.getElementById('catatanDate').value=new Date().toISOString().split('T')[0];document.getElementById('catatanText').value='';openModal('catatanModal');}
function openReminderModal(){['rTitle','rDesc'].forEach(id=>document.getElementById(id).value='');openModal('reminderModal');}
// Catatan: openTransferModal/saveTransfer dipindah ke tx-transfer.js (lihat
// CLAUDE.md catatan kerja "split transaksi.js") -- tetap fungsi global,
// tetap dipanggil persis sama dari HTML (modals.js).
// BUGFIX (bug: "Cara Bayar balik ke Tunai saat edit Cicilan"): setPayMethod() dulu
// dipanggil sama persis baik oleh tap user di chip Tunai/Cicilan/Rutin, MAUPUN oleh
// editTx() secara programatik saat modal dibuka (mis. dipaksa 'tunai' krn transaksi
// cicilan yg sudah tidak py bill aktif -- lihat editTx()). Karena tidak ada pembeda,
// _saveTxInner() menganggap 'tunai' itu SELALU pilihan sengaja user, lalu menimpa
// payMethod transaksi asli (yg sebenarnya 'cicilan'/'langganan') jadi 'tunai' permanen
// walau user cuma edit catatan/nominal tanpa pernah sentuh chip Cara Bayar. Param
// userInitiated (default true, sesuai pemanggilan dari HTML/tap user) menandai itu;
// dipanggil dgn `false` dari kode programatik di editTx().
let _txPayMethodTouchedByUser=false;
function setPayMethod(m,userInitiated=true){
if(userInitiated)_txPayMethodTouchedByUser=true;
curPayMethod=m;
['pmTunai','pmCicilan','pmLangganan'].forEach(id=>{
const el=document.getElementById(id); if(el) el.classList.remove('active');
});
const map={tunai:'pmTunai',cicilan:'pmCicilan',langganan:'pmLangganan'};
if(map[m]) document.getElementById(map[m]).classList.add('active');
document.getElementById('txCicilanPanel').style.display = m==='cicilan'?'block':'none';
document.getElementById('txLanggananPanel').style.display = m==='langganan'?'block':'none';
if(m==='cicilan'){syncCicilanDate('date');syncCicilanPreview();updateCicilanTenorUI();}
}
// BUGFIX s282 (v941) -- "Kenapa cicilan 1x tidak masuk Tagihan?" + "Kenapa masih ada
// Jatuh Tempo Pertama padahal cuma 1x bayar?" -- riwayat lama: waktu itu Tenor 1x berarti
// LUNAS SEKALIGUS lewat transaksi yang sedang diisi (sisaTenor=0, tidak ada entri Tagihan,
// field Jatuh Tempo disembunyikan krn tidak kepakai). Itu SENGAJA by design saat itu.
//
// FIX s284 (v942) -- "Ganti Tenor 1x jadi 'Bayar Bulan Depan'": permintaan user mengubah
// perilaku itu. Tenor 1x SEKARANG berarti pembayaran DITUNDA ke tanggal Jatuh Tempo (bukan
// lunas sekarang juga): transaksi ini BELUM tercatat sbg pengeluaran, hanya dijadwalkan sbg
// entri 🧾 Tagihan (sisaTenor:1) yg jatuh tempo sesuai tanggal & bulan yang diisi di field
// Jatuh Tempo -- baru benar2 tercatat sbg transaksi begitu ditandai Bayar di Tagihan (reuse
// penuh markBillPaid() yg sudah ada, lihat tagihan-kalender.js -- TIDAK ada logic baru di
// sana). Konsekuensinya field Jatuh Tempo SEKARANG JUSTRU wajib tetap tampil & terpakai utk
// tenor 1x (kebalikan dari fix s282 di atas yang menyembunyikannya) -- lihat _saveTxInner()
// utk detail perubahan logic simpan.
function updateCicilanTenorUI(){
const tenorEl=document.getElementById('txCicilanTenor');
const dueWrap=document.getElementById('txCicilanDueWrap');
const tenor1Hint=document.getElementById('txCicilanTenor1Hint');
const dueLabelEl=document.getElementById('txCicilanDueLabel');
if(!tenorEl||!dueWrap||!tenor1Hint)return;
const tenor=parseInt(tenorEl.value)||1;
const hasActiveBill=!!txEditLinkedBillId;
dueWrap.style.display='';
if(tenor===1&&!hasActiveBill){
tenor1Hint.style.display='block';
if(dueLabelEl)dueLabelEl.textContent='Jatuh Tempo (Bayar Bulan Depan)';
}else{
tenor1Hint.style.display='none';
if(!hasActiveBill&&dueLabelEl)dueLabelEl.textContent='Jatuh Tempo Pertama';
}
}
// onCicilanTenorSelectChange() (s284) -- dipanggil dari onchange dropdown Tenor
// (modules/shared/modals.js). Kalau user baru pindah ke Tenor 1x (bayar bulan depan) utk
// transaksi BARU (bukan sedang edit cicilan lama yg py bill aktif) dan field Jatuh Tempo
// masih di nilai default (hari ini) atau kosong, otomatis majukan 1 bulan supaya defaultnya
// benar2 "bulan depan" sesuai nama opsi tenornya -- tetap bisa diedit manual ke tanggal lain.
function onCicilanTenorSelectChange(){
const tenorEl=document.getElementById('txCicilanTenor');
const dueEl=document.getElementById('txCicilanDue');
if(tenorEl&&dueEl&&parseInt(tenorEl.value)===1&&!txEditLinkedBillId){
const todayStr=new Date().toISOString().split('T')[0];
if(!dueEl.value||dueEl.value===todayStr){
const d=new Date(dueEl.value||todayStr);
_amc015(d,1); // BUG-015 (s406): clamp overflow tanggal
dueEl.value=d.toISOString().split('T')[0];
}
}
syncCicilanPreview();
updateCicilanTenorUI();
}
// Catatan: fungsi-fungsi cicilan (validateCicilanFields, calcCicilanPerBulanFromTotal,
// calcCicilanTotalFromPerBulan, syncCicilanPreview, getCicilanSharedMine,
// toggleCicilanSharedFields, syncCicilanDate, openCicilanHistoryFromTx) dipindah ke
// cicilan.js (lihat CLAUDE.md catatan kerja "split transaksi.js") -- tetap global
// (bukan module), tetap dipanggil persis sama dari sini & dari HTML (modals.js).
function openTxModal(type){
txEditId=null;
if(typeof WorthIt!=='undefined')WorthIt.pendingBuyId=null;
_txAccManuallySet=false;
_txAssetManuallySet=false;
_txCatLearnSource=null;
document.getElementById('txModalTitle').textContent='Tambah Transaksi';
document.getElementById('txDelBtn').style.display='none';
const servisEditBtnNew=document.getElementById('txEditServisBtn');
if(servisEditBtnNew)servisEditBtnNew.style.display='none';
resetPayMethodLock();
curTxType=type;
document.getElementById('txDate').value=new Date().toISOString().split('T')[0];
document.getElementById('txAmt').value='';
document.getElementById('txCat').value='';
document.getElementById('txSubCat').value='';
document.getElementById('txNote').value='';
if(typeof AutoKat!=='undefined'){AutoKat.hideSuggest();AutoKat._lastNoteQueried='';}
const scanInsightEl=document.getElementById('txScanInsight'); if(scanInsightEl){scanInsightEl.style.display='none';scanInsightEl.innerHTML='';}
cicilanLastInput='total';
cicilanDateLinked=false;
txEditLinkedBillId=null;
document.getElementById('txCicilanDueLabel').textContent='Jatuh Tempo Pertama';
document.getElementById('txCicilanDueHint').style.display='none';
document.getElementById('txCicilanHistoryBtn').style.display='none';
['txCicilanNama','txCicilanTotal','txCicilanPerBulan','txCicilanBunga','txLanggananNama'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
document.getElementById('txCicilanTenor').value='6';
updateCicilanTenorUI();
document.getElementById('txCicilanShared').checked=false;
const txCicilanIsKprEl=document.getElementById('txCicilanIsKpr');if(txCicilanIsKprEl)txCicilanIsKprEl.checked=false;
document.getElementById('txCicilanSharedPct').value=50;
document.getElementById('txCicilanSharedNominal').value='';
const txCicilanSharedOtherNameEl=document.getElementById('txCicilanSharedOtherName');if(txCicilanSharedOtherNameEl)txCicilanSharedOtherNameEl.value='';
const txCicilanSharedAutoPiutangEl=document.getElementById('txCicilanSharedAutoPiutang');if(txCicilanSharedAutoPiutangEl)txCicilanSharedAutoPiutangEl.checked=false;
cicilanSharedLastInput='pct';
document.getElementById('txCicilanSharedWrap').style.display='none';
const prevMineRowEl=document.getElementById('prevMineRow'); if(prevMineRowEl)prevMineRowEl.style.display='none';
document.getElementById('txCicilanDue').value=new Date().toISOString().split('T')[0];
document.getElementById('txLanggananDue').value=new Date().toISOString().split('T')[0];
document.getElementById('txCicilanPreview').style.display='none';
populateAccFilters();
const txAssetIdResetEl=document.getElementById('txAssetId');if(txAssetIdResetEl)txAssetIdResetEl.value='';
updateTxDeductionOwnerVisibility();
setTxType(type);
setPayMethod('tunai',false);
const stockChk=document.getElementById('txAddStock');
if(stockChk)stockChk.checked=false;
['txStockNewName'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
const stockQtyEl=document.getElementById('txStockQty'); if(stockQtyEl)stockQtyEl.value='1';
const stockUnitEl=document.getElementById('txStockUnit'); if(stockUnitEl)stockUnitEl.value='pcs';
toggleTxStockFields();
const bbmChk=document.getElementById('txSyncBbm');
if(bbmChk)bbmChk.checked=false;
['txBbmKm','txBbmLiter','txBbmHargaL','txBbmSpbu'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
const bbmFullEl=document.getElementById('txBbmFull'); if(bbmFullEl)bbmFullEl.checked=true;
toggleTxBbmFields();
const shopChk=document.getElementById('txAddShopStock');
if(shopChk)shopChk.checked=false;
['txShopStockNewName','txShopStockKategori','txShopStockHarga','txShopStockJual'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
const shopQtyEl=document.getElementById('txShopStockQty'); if(shopQtyEl)shopQtyEl.value='1';
resetShopStockCart();
toggleTxShopStockFields();
const shopSaleChk=document.getElementById('txAddShopSale');
if(shopSaleChk)shopSaleChk.checked=false;
const shopSaleQtyEl=document.getElementById('txShopSaleQty'); if(shopSaleQtyEl)shopSaleQtyEl.value='1';
const shopSaleHargaEl=document.getElementById('txShopSaleHarga'); if(shopSaleHargaEl)shopSaleHargaEl.value='';
['txShopSaleDiskon','txShopSaleOngkir','txShopSaleCustName','txShopSaleCustPhone','txShopSaleCustAddr'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
resetTxShopSaleCart();
toggleTxShopSaleFields();
const renovChk=document.getElementById('txAddRenov');
if(renovChk)renovChk.checked=false;
if(typeof setTxRenovStatus==='function')setTxRenovStatus('sudah');
if(typeof toggleTxRenovFields==='function')toggleTxRenovFields();
openModal('txModal');
}
function resetPayMethodLock(){
['pmTunai','pmCicilan','pmLangganan'].forEach(id=>{const el=document.getElementById(id);if(el){el.style.pointerEvents='';el.style.opacity='';}});
}
function editTx(id){
const t=D.transactions.find(x=>x.id===id);
if(!t)return;
if(t.type==='transfer_in'||t.type==='transfer_out'){toast('⚠️ Transfer antar akun tidak bisa diedit di sini. Hapus & buat ulang kalau salah.');return;}
txEditId=id;
_txPayMethodTouchedByUser=false;
// _txAssetManuallySet=true kalau transaksi yang diedit sudah punya assetId
// tersimpan -- pilihan lama itu diperlakukan sama seperti pilihan manual
// user (0 auto-suggest onTxAccChange() yang menimpa data tersimpan begitu
// modal Edit dibuka, sebelum user sempat ganti akun apa pun).
_txAssetManuallySet=!!t.assetId;
document.getElementById('txModalTitle').textContent='Edit Transaksi';
document.getElementById('txDelBtn').style.display='flex';
resetPayMethodLock();
// BUGFIX (bug: "field Cicilan/Langganan kebawa dari transaksi lain saat Edit"): dulu
// editTx() cuma isi ulang field panel Cicilan/Langganan (Nama/Total/Tenor/Bunga/dst)
// KALAU transaksi ini punya bill aktif (linkedBill, lihat di bawah). Transaksi yang
// TIDAK punya bill aktif (mis. cicilan tenor terakhir yang billLinkId-nya sudah null,
// atau transaksi tunai biasa) tidak pernah kena reset -- jadi field2 itu masih nyimpen
// sisa isian dari transaksi CICILAN LAIN yang sebelumnya sempat dibuka Edit di sesi yang
// sama, lalu nongol lagi (data SALAH/nyasar) begitu user tap chip Cicilan di transaksi
// ini. Fix: samakan dengan openTxModal() -- reset semua field panel Cicilan/Langganan ke
// kosong/default di awal editTx(), SEBELUM cek linkedBill di bawah (yang nanti akan
// isi ulang field2 ini dgn data yang BENAR kalau transaksi ini memang punya bill aktif).
cicilanLastInput='total';
['txCicilanNama','txCicilanTotal','txCicilanPerBulan','txCicilanBunga','txLanggananNama'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
document.getElementById('txCicilanTenor').value='6';
document.getElementById('txCicilanShared').checked=false;
const txCicilanIsKprResetEl=document.getElementById('txCicilanIsKpr');if(txCicilanIsKprResetEl)txCicilanIsKprResetEl.checked=false;
document.getElementById('txCicilanSharedPct').value=50;
document.getElementById('txCicilanSharedNominal').value='';
const txCicilanSharedOtherNameResetEl=document.getElementById('txCicilanSharedOtherName');if(txCicilanSharedOtherNameResetEl)txCicilanSharedOtherNameResetEl.value='';
const txCicilanSharedAutoPiutangResetEl=document.getElementById('txCicilanSharedAutoPiutang');if(txCicilanSharedAutoPiutangResetEl)txCicilanSharedAutoPiutangResetEl.checked=false;
cicilanSharedLastInput='pct';
document.getElementById('txCicilanSharedWrap').style.display='none';
const prevMineRowResetEl=document.getElementById('prevMineRow'); if(prevMineRowResetEl)prevMineRowResetEl.style.display='none';
document.getElementById('txCicilanPreview').style.display='none';
const scanInsightElEdit=document.getElementById('txScanInsight'); if(scanInsightElEdit){scanInsightElEdit.style.display='none';scanInsightElEdit.innerHTML='';}
if(typeof AutoKat!=='undefined'){AutoKat.hideSuggest();AutoKat._lastNoteQueried='';}
populateAccFilters();
curTxType=t.type;
document.getElementById('btnI').className='type-btn'+(t.type==='income'?' ai':'');
document.getElementById('btnE').className='type-btn'+(t.type==='expense'?' ae':'');
document.getElementById('txCat').value=t.category||'';
document.getElementById('txSubCat').value=t.subcategory||'';
document.getElementById('txAcc').value=t.accountId;
document.getElementById('txAmt').value=t.amount;
document.getElementById('txNote').value=t.note||'';
document.getElementById('txDate').value=t.date;
const txAssetIdEditEl=document.getElementById('txAssetId');if(txAssetIdEditEl)txAssetIdEditEl.value=t.assetId||'';
updateTxAssetWrapVisibility();
updateTxDeductionOwnerVisibility();
// S574-D2 BUGFIX: updateTxDeductionOwnerVisibility() (S574-C) SELALU
// mereset #txDeductionOwner ke '' saat repopulate opsi (by design, supaya
// pilihan owner akun SEBELUMNYA tidak pernah terbawa ke akun multi-owner
// yang baru dipilih -- lihat komentar fungsi itu). Tapi editTx() sendiri
// tidak pernah membaca balik `t.deductionOwnerId` yang sudah tersimpan ke
// dropdown ini -- akibatnya membuka Edit transaksi multi-owner lalu
// simpan TANPA mengganti owner sama sekali akan kena tolak oleh validasi
// wajib-pilih di _saveTxInner() (S574-D1), padahal owner-nya sudah ada.
// Fix: prefill dropdown dari nilai tersimpan SETELAH opsi direpopulate,
// hanya kalau transaksi ini memang punya deductionOwnerId (transaksi
// lama/akun single-owner -> t.deductionOwnerId kosong -> 0 perubahan).
const txDeductionOwnerEditEl=document.getElementById('txDeductionOwner');
if(txDeductionOwnerEditEl&&t.deductionOwnerId)txDeductionOwnerEditEl.value=t.deductionOwnerId;
updateTxVehiclePanels();
const stockChk=document.getElementById('txAddStock');
if(stockChk)stockChk.checked=false;
toggleTxStockFields();
// BUGFIX (audit sesi ini, laporan user: "centang sparepart hilang pas
// dibuka lagi"): dulu stockChk SELALU dipaksa checked=false + dropdown/
// qty/satuan TIDAK PERNAH diisi ulang dari t.partStockId sama sekali --
// beda dgn shopChk/renovChkEdit di bawah yang sudah benar (cek dulu apakah
// tx ini memang ter-link sebelum tentukan status checkbox). Akibatnya
// PALING PARAH (bukan cuma kosmetik): blok `if(existingTx&&existingTx.
// partStockId)` di _saveTxInner() (lihat tx-stok-sparepart.js/transaksi.js)
// membaca checkbox yang terpaksa unchecked ini sbg "user MEMATIKAN
// centangnya" -> stok yang sudah ditambah otomatis DI-REVERT (qty
// dikurangi balik) & partStockId DIHAPUS begitu transaksi ini dibuka lewat
// Edit lalu Simpan -- APAPUN yang diubah (mis. cuma ganti tanggal/
// catatan), walau user TIDAK PERNAH menyentuh panel Stok Sparepart sama
// sekali. Fix: samakan pola dgn shopChk/renovChkEdit -- restore
// checked=true + isi ulang dropdown/qty/satuan dari data tersimpan KALAU
// transaksi ini memang ter-link ke stok (t.partStockId & baris
// D.partsStock-nya masih ada, belum dihapus manual dari tab Stok
// Sparepart).
const linkedStockPart=(t.partStockId&&D.partsStock)?D.partsStock.find(p=>p.id===t.partStockId):null;
if(linkedStockPart&&stockChk){
stockChk.checked=true;
const stockSelEdit=document.getElementById('txStockItem');
if(stockSelEdit){
// Pastikan opsi utk part ini ADA dulu di <select> sebelum di-assign value
// (kalau select-nya masih berisi opsi dari state form sebelumnya & part
// ini kebetulan belum ada di antaranya, assignment .value akan silently
// gagal/reset kosong) -- opsi sementara ini otomatis ditimpa jadi opsi
// "asli" begitu populateTxStockSelect() (lewat toggleTxStockFields() di
// bawah) membaca ulang cur=sel.value & merender ulang seluruh dropdown.
if(stockSelEdit.options&&!Array.from(stockSelEdit.options).some(o=>o.value===linkedStockPart.id)){
stockSelEdit.insertAdjacentHTML('beforeend',`<option value="${linkedStockPart.id}"></option>`);
}
stockSelEdit.value=linkedStockPart.id;
}
toggleTxStockFields();
if(typeof onTxStockItemChange==='function')onTxStockItemChange();
const stockQtyEditEl=document.getElementById('txStockQty');
if(stockQtyEditEl)stockQtyEditEl.value=(t.partStockQty!=null)?t.partStockQty:1;
const stockUnitEditEl=document.getElementById('txStockUnit');
if(stockUnitEditEl)stockUnitEditEl.value=t.partStockUnit||linkedStockPart.unit||'pcs';
}
// BUGFIX (s452): dulu renovChkEdit SELALU dipaksa checked=false di sini tanpa
// pengecualian -- beda dgn shopChk tepat di bawah (lihat blok hasShopStock)
// yang memang mengecek dulu apakah transaksi ini punya link stok sebelum
// centang ulang. Akibatnya: transaksi yang barusan disimpan dgn centang "🔨
// Catat juga ke Proyek Renovasi?" AKTIF (item-nya sudah benar ke-link &
// nongol di fitur Proyek Renovasi -- lihat applyTxRenovFromTx) tetap tampil
// TIDAK tercentang begitu transaksi yang sama dibuka lagi lewat Edit,
// walaupun `t.renovProjectLinkId`/`t.renovItemLinkId` sudah tersimpan valid
// di data. User jadi mengira centangnya "hilang"/gagal tersimpan, padahal
// datanya aman -- cuma representasi checkbox di form Edit yang tidak pernah
// disinkronkan balik ke data transaksi. Fix: samakan pola dgn shopChk --
// cek dulu apakah transaksi ini memang sudah ter-link ke item Renov (&
// proyeknya masih ada), baru tentukan status checkbox + isi ulang dropdown
// Proyek-nya, alih-alih selalu di-reset ke false.
const renovChkEdit=document.getElementById('txAddRenov');
const renovLinkedProject=(t.renovProjectLinkId&&t.renovItemLinkId&&D.renovProjects)
?D.renovProjects.find(p=>sameId(p.id,t.renovProjectLinkId))
:null;
if(renovChkEdit)renovChkEdit.checked=!!renovLinkedProject;
if(typeof setTxRenovStatus==='function')setTxRenovStatus('sudah');
if(typeof toggleTxRenovFields==='function')toggleTxRenovFields();
if(renovLinkedProject){
const renovProjSelEdit=document.getElementById('txRenovProject');
if(renovProjSelEdit)renovProjSelEdit.value=renovLinkedProject.id;
}
// Sesi ini (sync sparepart -> servis, permintaan user): pola SAMA PERSIS
// renovChkEdit tepat di atas -- tombol "✏️ Edit Detail Servis" cuma tampil
// kalau transaksi ini memang sudah ter-link (t.servisLinkId) & baris
// D.servisLogs-nya masih ada (bukan sudah dihapus manual dari tab Servis).
// Checkbox "Sinkron ke Servis" SENGAJA selalu direset ke false di sini
// (beda dgn renovChkEdit) -- centang itu cuma jalur bikin/re-sync tautan
// dari Transaksi, sedang utk transaksi yang SUDAH tertaut, editnya lewat
// tombol Edit Detail Servis (buka modal Servis asli), bukan re-centang.
const servisEditBtn=document.getElementById('txEditServisBtn');
const linkedServisLog=(t.servisLinkId&&D.servisLogs)?D.servisLogs.find(s=>s.id===t.servisLinkId):null;
if(servisEditBtn)servisEditBtn.style.display=linkedServisLog?'block':'none';
const servisChkEdit=document.getElementById('txSyncServis');
if(servisChkEdit)servisChkEdit.checked=false;
if(typeof toggleTxServisFields==='function')toggleTxServisFields();
const shopChk=document.getElementById('txAddShopStock');
const hasShopStock=(t.stockItems&&t.stockItems.length)||t.stockProductId;
if(hasShopStock&&shopChk){
shopChk.checked=true;
toggleTxShopStockFields();
if(t.stockItems&&t.stockItems.length){
curShopStockCart=t.stockItems.map(si=>({
productId:si.productId,isNew:false,
name:(D.products.find(p=>p.id===si.productId)||{}).name||si.name||'Produk',
qty:si.qty,hargaBeli:si.hargaBeli||0,produsenId:si.produsenId||'',kategoriInput:'',hargaJual:0
}));
} else {
const legacyP=D.products.find(p=>p.id===t.stockProductId);
curShopStockCart=[{
productId:t.stockProductId,isNew:false,
name:legacyP?legacyP.name:'Produk',
qty:t.stockQty||1,hargaBeli:legacyP?(legacyP.hargaBeli||0):0,produsenId:t.produsenId||'',kategoriInput:'',hargaJual:0
}];
}
renderShopStockCartList();
if(t.produsenId){
const prodSel=document.getElementById('txShopStockProdusen');
if(prodSel)prodSel.value=t.produsenId;
}
} else {
if(shopChk)shopChk.checked=false;
resetShopStockCart();
toggleTxShopStockFields();
}
const shopSaleChk=document.getElementById('txAddShopSale');
const linkedShopSale=t.cobekLinkId?D.cobek.find(c=>c.id===t.cobekLinkId):null;
if(linkedShopSale&&shopSaleChk){
shopSaleChk.checked=true;
toggleTxShopSaleFields();
curTxShopSaleCart=(linkedShopSale.items||[]).map(it=>({
productId:it.productId,
name:(D.products.find(p=>p.id===it.productId)||{}).name||it.name||'Produk',
qty:it.qty,harga:it.harga
}));
renderTxShopSaleCartList();
const diskonEl=document.getElementById('txShopSaleDiskon'); if(diskonEl)diskonEl.value=linkedShopSale.diskon||'';
const ongkirEl=document.getElementById('txShopSaleOngkir'); if(ongkirEl)ongkirEl.value=linkedShopSale.ongkir||'';
const cust=linkedShopSale.customer||{};
const custNameEl=document.getElementById('txShopSaleCustName'); if(custNameEl)custNameEl.value=cust.name||'';
const custPhoneEl=document.getElementById('txShopSaleCustPhone'); if(custPhoneEl)custPhoneEl.value=cust.phone||'';
const custAddrEl=document.getElementById('txShopSaleCustAddr'); if(custAddrEl)custAddrEl.value=cust.address||'';
} else {
if(shopSaleChk)shopSaleChk.checked=false;
resetTxShopSaleCart();
toggleTxShopSaleFields();
}
const bbmChk=document.getElementById('txSyncBbm');
const linkedBbm=t.bbmLinkId?(D.bbmLogs||[]).find(b=>b.id===t.bbmLinkId):null;
if(linkedBbm&&bbmChk){
bbmChk.checked=true;
toggleTxBbmFields();
const vehSel=document.getElementById('txBbmVehicle');
if(vehSel)vehSel.value=linkedBbm.vehicleId;
document.getElementById('txBbmKm').value=linkedBbm.km;
document.getElementById('txBbmLiter').value=linkedBbm.liter;
document.getElementById('txBbmHargaL').value=linkedBbm.harga||'';
document.getElementById('txBbmSpbu').value=linkedBbm.spbu||'';
document.getElementById('txBbmFull').checked=!!linkedBbm.fullTank;
} else {
if(bbmChk)bbmChk.checked=false;
toggleTxBbmFields();
}
const linkedBill=t.billLinkId?D.bills.find(b=>b.id===t.billLinkId):null;
cicilanDateLinked=!!(linkedBill&&linkedBill.kind==='cicilan');
txEditLinkedBillId=linkedBill?linkedBill.id:null;
if(linkedBill&&(linkedBill.kind==='cicilan'||linkedBill.kind==='langganan')){
setPayMethod(linkedBill.kind,false);
if(linkedBill.kind==='cicilan'){
cicilanLastInput='total';
document.getElementById('txCicilanNama').value=linkedBill.name;
document.getElementById('txCicilanTotal').value=linkedBill.totalHarga||t.amount;
document.getElementById('txCicilanTenor').value=linkedBill.tenor||6;
document.getElementById('txCicilanBunga').value=linkedBill.bunga||0;
document.getElementById('txCicilanDue').value=linkedBill.nextDue;
document.getElementById('txCicilanShared').checked=!!linkedBill.shared;
const txCicilanIsKprEditEl=document.getElementById('txCicilanIsKpr');if(txCicilanIsKprEditEl)txCicilanIsKprEditEl.checked=!!linkedBill.isKpr;
document.getElementById('txCicilanSharedPct').value=linkedBill.sharedPct||50;
document.getElementById('txCicilanSharedNominal').value=linkedBill.shared?linkedBill.amount:'';
const txCicilanSharedOtherNameEditEl=document.getElementById('txCicilanSharedOtherName');if(txCicilanSharedOtherNameEditEl)txCicilanSharedOtherNameEditEl.value=linkedBill.sharedOtherName||'';
const txCicilanSharedAutoPiutangEditEl=document.getElementById('txCicilanSharedAutoPiutang');if(txCicilanSharedAutoPiutangEditEl)txCicilanSharedAutoPiutangEditEl.checked=!!linkedBill.sharedAutoPiutang;
document.getElementById('txCicilanSharedWrap').style.display=linkedBill.shared?'block':'none';
cicilanSharedLastInput='pct';
syncCicilanPreview();
document.getElementById('txCicilanDueLabel').textContent='Jatuh Tempo Berikutnya (Tagihan)';
document.getElementById('txCicilanDueHint').style.display='block';
document.getElementById('txCicilanHistoryBtn').style.display='block';
updateCicilanTenorUI();
} else {
document.getElementById('txLanggananNama').value=linkedBill.name;
document.getElementById('txLanggananFreq').value=linkedBill.freq;
document.getElementById('txLanggananDue').value=linkedBill.nextDue;
}
const lockIds=['pmTunai','pmCicilan','pmLangganan'].filter(x=>x!==(linkedBill.kind==='cicilan'?'pmCicilan':'pmLangganan'));
lockIds.forEach(id=>{const el=document.getElementById(id);if(el){el.style.pointerEvents='none';el.style.opacity='0.4';}});
} else {
document.getElementById('txCicilanDue').value=t.date;
document.getElementById('txCicilanDueLabel').textContent='Jatuh Tempo Pertama';
document.getElementById('txCicilanDueHint').style.display='none';
document.getElementById('txCicilanHistoryBtn').style.display='none';
updateCicilanTenorUI();
// BUGFIX: transaksi cicilan/langganan yg bill-nya sudah tidak aktif lagi (mis.
// cicilan tenor terakhir/1x -- billLinkId sengaja null, lihat _saveTxInner())
// tidak punya bill utk direkonstruksi ke panel Cicilan/Rutin, jadi chip yg
// ditampilkan tetap 'tunai' (panel cicilan/langganan tidak bisa diisi ulang).
// Tapi panggilan ini TIDAK dianggap "user memilih Tunai" (userInitiated=false)
// -- kalau user simpan tanpa sentuh chip Cara Bayar, payMethod ASLI transaksi
// (cicilan/langganan) tetap dipertahankan di _saveTxInner(), tidak ditimpa
// jadi 'tunai'.
setPayMethod('tunai',false);
}
openModal('txModal');
}
function deleteTxFromModal(){
if(!txEditId)return;
const id=txEditId;
closeModal('txModal');
delTx(id);
}
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
function delReminder(i){D.reminders.splice(i,1);save();renderSettings();}

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
