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
// (s632-fix-catatan-anak, sesi 1/2): openCatatan(type) sekarang menerima
// editId opsional supaya bisa dipakai ulang utk mode Edit (dipanggil dari
// tombol ✏️ di #catatanAnakList, lihat renderCatatanAnakList() di
// transaksi-b.js). _editingCatatanAnakId dipakai saveCatatan() (juga di
// transaksi-b.js) utk tahu kapan harus update in-place vs push entry baru
// -- pola sama seperti _editingGratitudeId/_editingNoteId di Refleksi
// (lihat refleksi-selfcare.js) & _editingWorkerId di Tukang.
var _editingCatatanAnakId=null;
function openCatatan(type,editId){
curCatatan=type;
cancelEditCatatanAnak();
if(editId){
const list=D.catatan[type]||[];
const entry=list.find(function(e){return e.id===editId;});
if(entry){
_editingCatatanAnakId=editId;
document.getElementById('catatanTitle').textContent='Edit Catatan Anak';
document.getElementById('catatanDate').value=entry.date||new Date().toISOString().split('T')[0];
document.getElementById('catatanText').value=entry.text||'';
document.getElementById('catatanSaveBtn').textContent='💾 Update Catatan';
document.getElementById('catatanCancelEditBtn').classList.remove('u-dnone');
openModal('catatanModal');
renderCatatanAnakList();
return;
}
}
document.getElementById('catatanTitle').textContent='Catatan Anak';
document.getElementById('catatanDate').value=new Date().toISOString().split('T')[0];
document.getElementById('catatanText').value='';
openModal('catatanModal');
renderCatatanAnakList();
}
function cancelEditCatatanAnak(){
_editingCatatanAnakId=null;
const titleEl=document.getElementById('catatanTitle');
const saveBtn=document.getElementById('catatanSaveBtn');
const cancelBtn=document.getElementById('catatanCancelEditBtn');
if(titleEl)titleEl.textContent='Catatan Anak';
if(saveBtn)saveBtn.textContent='Simpan';
if(cancelBtn)cancelBtn.classList.add('u-dnone');
if(typeof renderCatatanAnakList==='function')renderCatatanAnakList();
}
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
// Sesi toggle hitungKas: field ini hanya berlaku utk transaksi Tunai biasa (scope
// disepakati di AUDIT-hitung-kas-toggle-dan-ringkasan-tagihan.md §1.2 -- cicilan/
// langganan/utang/tagihan punya efek samping lain di D.debts/D.bills yg belum tentu
// ikut "tidak dihitung"). Wrap disembunyikan & checkbox direset ke default ON (dihitung)
// begitu Cara Bayar bukan 'tunai', supaya _saveTxInner() (yg cuma membaca elemen ini utk
// jalur generik/tunai) tidak pernah membaca nilai basi dari state sebelumnya.
const txHitungKasWrapEl=document.getElementById('txHitungKasWrap');
if(txHitungKasWrapEl){
txHitungKasWrapEl.classList.toggle('u-dnone',m!=='tunai');
if(m!=='tunai'){const cb=document.getElementById('txHitungKas');if(cb)cb.checked=true;}
}
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
// isi ulang toggle "Hitung ke Saldo & Laporan" dari data tersimpan (absen=true,
// backward-compatible dgn transaksi lama) -- setPayMethod('tunai',...) di atas
// sudah menampilkan wrap-nya & default checkbox ke checked, jadi di sini cuma
// perlu override kalau transaksi ASLI memang tersimpan hitungKas:false.
const txHitungKasEditEl=document.getElementById('txHitungKas');
if(txHitungKasEditEl)txHitungKasEditEl.checked=(t.hitungKas!==false);
}
openModal('txModal');
}
function deleteTxFromModal(){
if(!txEditId)return;
const id=txEditId;
closeModal('txModal');
delTx(id);
}

// --- saveTx()/_saveTxInner() (mesin simpan transaksi) & sisa fungsi
// catatan/reminder/LDR/milestone dipindah ke modules/finance/transaksi-b.js
// (audit ukuran file, sesi lanjutan split sparepart-servis.js — lihat
// docs/CLAUDE.md catatan kerja "split transaksi.js bagian ke-12"). Fungsi
// global verbatim, tetap dipanggil sama persis dari sini/HTML.
