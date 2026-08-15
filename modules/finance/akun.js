// akun.js — Kelola Akun (Cash/Bank/Ewallet dll): saldo, filter dropdown akun di seluruh app, CRUD akun
// Dipindah ke modules/finance/akun.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: data-default.js, features-helpers-global-security.js, diagnostik-versi.js, format-tema.js, error-handler.js, helper-teks.js, keamanan-pin.js, modal-navigasi.js, reset-gaji-mingguan.js, debug-console.js, pengaturan-search.js, onboarding.js, kalkulator-input.js, scan-ocr.js, filter-laporan.js, akun.js, gaji-calc.js, transaksi.js, profil-pengaturan.js, kategori.js, tagihan-kalender.js, backup-restore.js, payroll-absensi.js, tukang-absensi.js

// --- Cache saldo per siklus render (KW perf fix) --------------------------------------------
// Masalah: recalcAccBalance() di-forEach seluruh D.transactions TIAP kali dipanggil, dan dia
// dipanggil puluhan kali per siklus render (renderAccGrid+renderDashAccList+renderLapAccList+
// totalSaldoAkun dst semuanya baca akun yang sama, dari data yang sama, tanpa data berubah di
// antaranya). totalSaldoAkun() sendiri juga manggil recalcAccBalance() per akun dalam reduce().
// Fix: cache hasil per accId + total, di-invalidate otomatis di 2 titik siklus:
//   1) save() (features-helpers-global-security.js) -- titik tunggal SEBELUM burst render
//      manapun jalan (pola app ini selalu: mutasi data -> save() -> renderX();renderY();...).
//   2) renderPageContent() (modules-render.js) -- entry point ganti halaman/refresh page.
// Cache TIDAK pernah dibaca lintas siklus (selalu di-clear duluan di titik-titik atas), jadi
// tetap selalu dapat data ter-update, cuma tidak dihitung ulang per akun per titik render.
// --- Index transaksi per akun (KW perf fix lanjutan) -----------------------------------------
// Lanjutan dari cache di atas: cache cuma hindarin hitung ULANG utk akun yg SAMA dlm 1 siklus,
// tapi akun BEDA tetap forEach() semua D.transactions dari nol. Dgn index Map<accId,tx[]>
// (dibangun sekali per siklus, sama titik invalidate-nya dgn cache saldo di atas), tiap akun
// cuma iterasi transaksinya sendiri, bukan seluruh array.
let _txByAccIndex=null;
function _getTxByAccIndex(){
if(_txByAccIndex)return _txByAccIndex;
_txByAccIndex=new Map();
D.transactions.forEach(t=>{
const list=_txByAccIndex.get(t.accountId);
if(list)list.push(t);else _txByAccIndex.set(t.accountId,[t]);
});
return _txByAccIndex;
}
let _accBalCache=null;
let _totalSaldoCache=undefined;
function invalidateAccBalCache(){
_accBalCache=null;
_totalSaldoCache=undefined;
_txByAccIndex=null;
}
function recalcAccBalance(accId){
if(_accBalCache&&_accBalCache.has(accId))return _accBalCache.get(accId);
const acc=D.accounts.find(a=>a.id===accId);
let bal=0;
if(acc){
bal=acc.baseBalance!==undefined?acc.baseBalance:(acc.balance||0);
const list=_getTxByAccIndex().get(accId)||[];
list.forEach(t=>{
if(t.type==='income')bal+=t.amount;
else if(t.type==='expense')bal-=t.amount;
else if(t.type==='transfer_out')bal-=t.amount;
else if(t.type==='transfer_in')bal+=t.amount;
});
}
if(!_accBalCache)_accBalCache=new Map();
_accBalCache.set(accId,bal);
return bal;
}
// isAccOwnershipSelf(acc) — helper REUSE dari OwnershipEngine (Sesi 192, Ownership
// Sync Akun & Keuangan). Balikin true kalau kepemilikan EFEKTIF akun ini SELF
// (termasuk akun lama yg belum punya field `ownership` sama sekali — via
// OwnershipEngine.resolve() otomatis fallback ke SELF/DEFAULT, jadi 100%
// backward compatible, TIDAK ada akun existing yang tiba-tiba ke-exclude).
// Balikin false kalau ownership-nya salah satu dari INVESTOR/CUSTOMER/
// THIRD_PARTY/FAMILY (sesuai spesifikasi sesi ini: akun2 tipe ini WAJIB
// dikecualikan dari agregat Saldo Kas/Total Keuangan/Dashboard/Net Worth/
// AI Insight — tapi TIDAK dari recalcAccBalance() per-akun individual,
// transaksi & histori akun tetap tersimpan & tetap kehitung normal kalau
// dilihat per-akun).
// Guard typeof OwnershipEngine: kalau engine belum dimuat (urutan load /
// dipakai headless di test lama sebelum Sesi 192), fallback true (anggap
// SELF/tidak exclude apa pun) — SAMA PERSIS pola guard fungsi lain di file
// ini (mis. typeof totalSaldoAkun/totalDebtValue di modul lain).
function isAccOwnershipSelf(acc){
if(typeof OwnershipEngine==='undefined')return true;
return OwnershipEngine.resolve(acc).type==='SELF';
}
// --- S574-A: Data layer "Pemilik Sumber Potongan" (akun multi-owner) --------------------------
// Scope SESI INI (audit: AUDIT-S574-PEMILIK-SUMBER-POTONGAN.md, Tahap 1 di §9): HANYA data
// layer akun ikut MultiOwnerEngine (modules/shared/multi-owner-engine.js, S390) via field baru
// D.accounts[].owners -- 0 UI (accModal/accountOwnersModal), 0 picker transaksi, 0
// deductionOwnerId, 0 wiring ke transaksi.js/modals.js. Sesuai pola project "1 task = 1 sesi",
// tahap UI porsi akun (Tahap 2), picker transaksi (Tahap 3), dst SENGAJA ditunda ke sesi terpisah.
// Reuse PENUH MultiOwnerEngine.getOwners()/setOwners() apa adanya -- 0 logic porsi baru ditulis
// di sini (persis pola Aset/Investasi, lihat aset.js baris ~453/1353).
// Backward compat: akun lama tanpa field owners[] TETAP valid -- MultiOwnerEngine.getOwners()
// sudah toleran (sintesis 1 pemilik dari `ownership`/fallback SELF 100%, lihat multi-owner-
// engine.js), jadi TIDAK ADA migrasi massal apa pun dijalankan di sini. Formula saldo
// (recalcAccBalance()) & field `ownership` (OwnershipEngine, S191) juga TIDAK disentuh.
//
// getAccOwners(accId) — baca daftar pemilik EFEKTIF sebuah akun (wrapper tipis di atas
// MultiOwnerEngine.getOwners()).
// Parameter: accId (string) — id akun (D.accounts[].id).
// Return: {ok, owners, isSynthesized, isMultiOwner} — lihat kontrak MultiOwnerEngine.getOwners().
//   Akun tidak ditemukan -> {ok:true, owners:[], isSynthesized:true, isMultiOwner:false} (bukan
//   error, biar caller tidak perlu cabang khusus utk akun-tidak-ada). Engine belum dimuat (guard
//   typeof, sama pola isAccOwnershipSelf() di atas) -> fallback sintesis manual 1 pemilik SELF 100%.
function getAccOwners(accId){
const acc=D.accounts.find(a=>sameId(a.id,accId));
if(!acc)return{ok:true,owners:[],isSynthesized:true,isMultiOwner:false};
if(typeof MultiOwnerEngine==='undefined')return{ok:true,owners:[{ownerId:'SELF',porsi:100,ownerName:'Milik Sendiri',isSelf:true}],isSynthesized:true,isMultiOwner:false};
return MultiOwnerEngine.getOwners(acc);
}
// getAccOwnersRaw(accId) — S575: baca `acc.owners[]` APA ADANYA, TANPA syarat
// total porsi 100% dan TANPA syarat jumlah owner (>1). Beda sengaja dari
// getAccOwners()/MultiOwnerEngine.getOwners(): fungsi itu membungkus
// validateOwners() yang mensyaratkan total=100%, dan kalau gagal owners ASLI
// diganti diam-diam jadi owner sintetis (isSynthesized:true) -- kalau dipakai
// utk visibility field "Pemilik Sumber Potongan" di Transaksi, syarat 100%
// itu ikut menempel padahal field itu murni assignment (siapa menanggung),
// bukan pembagian porsi. Dipakai KHUSUS oleh
// updateTxDeductionOwnerVisibility() (transaksi.js, S574-C lanjutan S575) --
// TIDAK dipakai di tempat lain manapun (Buku Aset/Zakat/Kekayaan Bersih/
// validasi porsi tetap 100% via getAccOwners()/setAccOwners(), tidak disentuh).
// Parameter: accId (string) — id akun (D.accounts[].id).
// Return: {ok:true, owners} — owners = baris `acc.owners[]` apa adanya yang
//   punya `ownerId` (string, non-kosong setelah trim) — SATU-SATUNYA syarat
//   per-baris, karena field "Pemilik Sumber Potongan" murni assignment
//   siapa-menanggung, bukan pembagian porsi (`porsi` boleh tidak ada/tidak
//   valid/total bukan 100%, tidak mempengaruhi visibility maupun opsi
//   dropdown). Akun tidak ada / acc.owners bukan array / array kosong ->
//   {ok:true, owners:[]} (0 fallback sintesis SELF -- beda sengaja dari
//   getAccOwners(), karena tujuan fungsi ini justru mendeteksi apakah
//   owners ASLI ada, bukan menyamarkannya).
function getAccOwnersRaw(accId){
const acc=D.accounts.find(a=>sameId(a.id,accId));
if(!acc||!Array.isArray(acc.owners))return{ok:true,owners:[]};
const rows=acc.owners.filter(o=>o&&typeof o.ownerId==='string'&&o.ownerId.trim());
const owners=rows.map(o=>({ownerId:o.ownerId,porsi:o.porsi,ownerName:typeof o.ownerName==='string'?o.ownerName:o.ownerId}));
return{ok:true,owners};
}
// setAccOwners(accId, owners) — tulis daftar pemilik baru ke sebuah akun (wrapper tipis di atas
// MultiOwnerEngine.setOwners(), validasi & normalisasi 100% reuse, 0 logic baru). MURNI data-
// layer: TIDAK memanggil save()/render apa pun di sini (beda dari Aset.saveOwners() yang
// levelnya UI/modal) -- itu tanggung jawab caller di tahap UI berikutnya (S574 Tahap 2), sesuai
// scope sesi ini yang cuma data layer.
// Parameter: accId (string), owners (array) — lihat MultiOwnerEngine.validateOwners().
// Return: {ok:true, owners} kalau sukses (owners = array ternormalisasi yang baru ditulis ke
//   D.accounts[].owners, mutasi in-place pada objek akun yang sama). {ok:false, reason} kalau
//   akun tidak ditemukan, engine belum dimuat, atau owners tidak lolos validasi -- D.accounts
//   TIDAK diubah sama sekali kalau gagal.
// getAccOwnersEffective(accId) — Sesi Res-B (DESIGN-LOCK-LINKED-ASSET-
// ACCOUNT-OWNER-DEFAULT.md §3, spesifikasi SyncB dari lock lama DESIGN-
// LOCK-DEDUCTIONOWNER-VS-OWNERPORSI.md §5, diimplementasikan di sini
// tanpa modifikasi spesifikasi). Helper ADDITIVE, read-only, TIDAK
// mengganti kontrak getAccOwners()/getAccOwnersRaw() — keduanya tetap
// dipakai apa adanya di tempat lain.
// Prioritas:
//   1. getAccOwnersRaw(accId) tidak kosong -> kembalikan raw APA ADANYA,
//      needsConfirm:false (raw SELALU menang, tidak pernah ditimpa).
//   2. raw kosong DAN acc.ownership (via OwnershipEngine.resolve(),
//      isDefault:false -- field eksplisit terisi, bukan fallback DEFAULT)
//      mensintesis TEPAT 1 owner dengan porsi 100% -> kembalikan
//      sintesis itu, needsConfirm:true.
//   3. Selain itu (akun tidak ada, raw kosong & ownership belum diisi/
//      default, atau engine tidak tersedia) -> owners:[].
// Return: {ok:true, owners, needsConfirm}. TIDAK PERNAH memanggil
// setAccOwners() atau menulis apa pun ke D.accounts -- murni baca.
function getAccOwnersEffective(accId){
const raw=getAccOwnersRaw(accId);
if(raw.owners.length>0)return{ok:true,owners:raw.owners,needsConfirm:false};
const acc=D.accounts.find(a=>sameId(a.id,accId));
if(!acc)return{ok:true,owners:[],needsConfirm:false};
if(typeof OwnershipEngine==='undefined')return{ok:true,owners:[],needsConfirm:false};
const r=OwnershipEngine.resolve(acc);
if(!r||!r.ok||r.isDefault)return{ok:true,owners:[],needsConfirm:false};
const label=typeof OwnershipEngine.label==='function'?OwnershipEngine.label(r.type):r.type;
return{ok:true,owners:[{ownerId:r.type,porsi:100,ownerName:label}],needsConfirm:true};
}
// resolveAccOwnershipBadgeState(accId) — Sesi (patch delacc-titipan-debt susulan
// "1 SOT badge Kepemilikan & Filter Kepemilikan vs porsi Holding/acc.owners"):
// badge/chip "Kepemilikan" (acc-chip, OwnershipEngine.resolve()) & dropdown Filter
// Kepemilikan (renderAccGrid, accOwnFilterVal) SEBELUM patch ini baca field
// acc.ownership APA ADANYA -- field itu diisi manual lewat dropdown di modal Edit
// Akun (openAccModal, ownSel), TIDAK PERNAH disentuh oleh AccOwners.save() (porsi
// standalone, akun.js) maupun oleh Holding tertaut (findLinkedHoldingForAccount(),
// transaksi.js) -- 2 sumber data independen total, persis pola gap yang sudah
// berkali-kali diperbaiki di proyek ini utk sumber lain (dropdown Pemilik Sumber
// Potongan/Ditanggung Oleh) tapi belum pernah utk badge/filter Akun & Metode
// Pembayaran ini.
// Fungsi ini MURNI BACA (0 mutasi D.accounts). Prioritas owners real SAMA PERSIS
// resolveOwnerDefaultForAccount() (transaksi.js): Holding tertaut menang kalau
// ada, baru fallback ke acc.owners[] eksplisit (getAccOwnersRaw, S575) -- guard
// typeof findLinkedHoldingForAccount aman kalau transaksi.js belum dimuat.
// SENGAJA TIDAK auto-assign tipe spesifik (INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY)
// -- porsi real cuma punya nama pemilik, bukan tipe semantik, jadi kalau owners
// real non-SELF tapi acc.ownership masih DEFAULT (belum pernah diisi manual)
// caller cukup TANDAI "belum diklasifikasi" (idiom sama titipanGapLine yang
// sudah ada di modules-render.js -- warning read-only, bukan auto-tebak diam2).
// Return: {ok:true, owners, source, isAllSelf, isDefault, mismatch}
//   owners: pemilik real efektif (Holding > acc.owners eksplisit), [] kalau tidak
//     ada satupun sumber.
//   source: 'holding'|'account'|'none'.
//   isAllSelf: true kalau SEMUA owner di `owners` isSelf/ownerId==='SELF', false
//     kalau ada 1+ owner non-SELF, null kalau owners kosong (tidak ada info).
//   isDefault: OwnershipEngine.resolve(acc).isDefault (badge belum pernah diisi
//     manual). true kalau OwnershipEngine belum dimuat (fallback aman -- sama
//     pola isAccOwnershipSelf()).
//   mismatch: true HANYA kalau owners tidak kosong, isAllSelf===false, DAN
//     isDefault===true.
// Catatan implementasi: SENGAJA TIDAK memakai getAccOwnersRaw()/sameId() global
// di sini (beda dari fungsi lain di file ini) -- fungsi ini dipanggil dari
// renderAccGrid() utk SETIAP kartu akun (bukan cuma alur transaksi/modal yang
// sudah pasti sameId ter-load), jadi pencarian akun & baca acc.owners[] mentah
// diinlinekan pakai perbandingan String() langsung (identik perilaku sameId())
// supaya fungsi ini tetap aman dipanggil di halaman/test manapun tanpa
// bergantung urutan load features-helpers-global-security.js.
function resolveAccOwnershipBadgeState(accId){
const acc=D.accounts.find(a=>a&&String(a.id)===String(accId));
if(!acc)return{ok:true,owners:[],source:'none',isAllSelf:null,isDefault:true,mismatch:false};
let owners=[],source='none';
const holding=(typeof findLinkedHoldingForAccount==='function')?findLinkedHoldingForAccount(accId):null;
if(holding&&typeof Investment!=='undefined'){
const hOwners=Investment.getOwners(holding);
if(hOwners&&hOwners.length>0){owners=hOwners;source='holding';}
}
if(!owners.length&&Array.isArray(acc.owners)){
const rawOwners=acc.owners.filter(o=>o&&typeof o.ownerId==='string'&&o.ownerId.trim()).map(o=>({ownerId:o.ownerId,porsi:o.porsi,ownerName:typeof o.ownerName==='string'?o.ownerName:o.ownerId,isSelf:!!o.isSelf}));
if(rawOwners.length>0){owners=rawOwners;source='account';}
}
const isAllSelf=owners.length?owners.every(o=>o.isSelf||String(o.ownerId)==='SELF'):null;
const isDefault=(typeof OwnershipEngine!=='undefined')?OwnershipEngine.resolve(acc).isDefault:true;
const mismatch=owners.length>0&&isAllSelf===false&&isDefault===true;
return{ok:true,owners,source,isAllSelf,isDefault,mismatch};
}
function setAccOwners(accId,owners){
const acc=D.accounts.find(a=>sameId(a.id,accId));
if(!acc)return{ok:false,reason:'Akun tidak ditemukan'};
if(typeof MultiOwnerEngine==='undefined')return{ok:false,reason:'MultiOwnerEngine belum dimuat'};
const res=MultiOwnerEngine.setOwners(acc,owners);
if(!res.ok)return res;
acc.owners=res.entity.owners;
return{ok:true,owners:acc.owners};
}
function populateAccFilters(){
const opts=D.accounts.map(a=>`<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
const fAcc=document.getElementById('fAcc');
if(fAcc) fAcc.innerHTML='<option value="semua">Semua Akun</option>'+opts;
const txAcc=document.getElementById('txAcc');
if(txAcc) txAcc.innerHTML=opts;
const trFrom=document.getElementById('trFrom');
const trTo=document.getElementById('trTo');
if(trFrom) trFrom.innerHTML=opts;
if(trTo) trTo.innerHTML=opts;
const wrAcc=document.getElementById('wrAcc');
if(wrAcc) wrAcc.innerHTML=opts;
const tAcc=document.getElementById('tAcc');
if(tAcc){const cur=tAcc.value;tAcc.innerHTML='<option value="">— Tidak terkait akun, isi manual —</option>'+opts;if(cur)tAcc.value=cur;}
const assetAccId=document.getElementById('assetAccId');
if(assetAccId){const cur=assetAccId.value;assetAccId.innerHTML='<option value="">— Tidak ditautkan —</option><option value="__new__">➕ Buat Akun Baru dari Aset Ini</option>'+opts;if(cur)assetAccId.value=cur;}
// investAccId (S601-3, DL-S601-3): dropdown "🔗 Hubungkan ke Akun" di investmentModal
// (investasi-list-view.js) -- pola SAMA PERSIS assetAccId di atas TAPI tanpa opsi
// "__new__" (holding tidak punya alur "buat akun baru dari holding ini", beda dari
// aset yang punya saveAsset() sisi khusus utk itu).
const investAccId=document.getElementById('investAccId');
if(investAccId){const cur=investAccId.value;investAccId.innerHTML='<option value="">— Tidak ditautkan —</option>'+opts;if(cur)investAccId.value=cur;}
populateKeuFilters();
}
/* moved to modules-render.js: renderAccGrid */
// linkedAssetAccountIds() — SESI S603 (lanjutan S601-3/S602). Sebelum sesi ini
// fungsi ini HANYA baca D.assets[].accountId (tautan lewat Buku Aset). Sejak
// S601-3 nambah dropdown "🔗 Hubungkan ke Akun" di Holding Investasi
// (investasi-list-view.js, field baru `h.accountId`), akun yang ditautkan
// LANGSUNG ke Holding (skenario "Majoris", sama nama dipakai S566/S602) TIDAK
// PERNAH kena exclude di sini -- padahal fungsi ini dipakai totalSaldoAkun()/
// DanaKelolaan.sumAccounts()/quickToggleInclude()/hint modal Akun, jadi
// nilainya kehitung 2x di Kekayaan Bersih (S602 sendiri cuma benerin
// TAMPILAN di renderAccGrid() lewat findLinkedHoldingForAccount() terpisah --
// fix itu TIDAK menyentuh fungsi ini, jadi hitungan finansialnya masih bug).
// Fix: union dengan Investment.getHoldings()[].accountId (100% REUSE sumber
// data S601-3, 0 rumus baru) -- guard typeof Investment sama persis pola
// DanaKelolaan.sumAccounts()/isAccOwnershipSelf() dkk, supaya modul ini tetap
// aman kalau investasi.js belum dimuat (headless test/urutan load).
function linkedAssetAccountIds(){
const assetIds=(D.assets||[]).filter(a=>a.accountId).map(a=>String(a.accountId));
const holdingIds=(typeof Investment!=='undefined'&&typeof Investment.getHoldings==='function')?Investment.getHoldings().filter(h=>h.accountId).map(h=>String(h.accountId)):[];
return new Set([...assetIds,...holdingIds]);
}
function isAccLinkedToAsset(accId){
return linkedAssetAccountIds().has(String(accId));
}
// totalSaldoAkun() — Sesi 192 (Ownership Sync): TAMBAH 1 filter
// isAccOwnershipSelf(a) di atas filter includeInBalance/linked yang sudah ada
// (0 logic lama diubah, cuma nambah 1 syarat &&). Akun ber-ownership
// INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY dikecualikan dari Saldo Kas total
// (sesuai spesifikasi), tapi recalcAccBalance() per-akun (dipakai buku
// Akun Uang & histori transaksi) TIDAK disentuh sama sekali — saldo akun
// itu sendiri tetap kehitung normal, cuma tidak ikut dijumlah ke total.
// Sesi 422c (REVERT Sesi 396): blok "porsi SELF akun tertaut ikut kehitung"
// dari S396 DIHAPUS -- ternyata bikin DOUBLE-COUNT di Kekayaan Bersih:
// porsi SELF dari aset yg sama SUDAH ikut kehitung lewat Aset.totalValue()
// (S422c: pakai MultiOwnerEngine.selfOwnedValue() per-aset, lihat aset.js),
// jadi kalau akun tertautnya JUGA nambah porsi SELF di sini, porsi itu
// kehitung 2x (sekali dari sisi Aset, sekali dari sisi Akun). Akun yang
// tertaut ke Aset (linked) kembali ke perilaku SEBELUM S396: dikecualikan
// PENUH dari Total Saldo Akun apa pun status single/multi-owner-nya --
// representasi porsi SELF-nya SEPENUHNYA jadi tanggung jawab Aset.totalValue().
function totalSaldoAkun(){
if(_totalSaldoCache!==undefined)return _totalSaldoCache;
const linked=linkedAssetAccountIds();
const total=D.accounts.filter(a=>a.includeInBalance!==false&&!linked.has(String(a.id))&&isAccOwnershipSelf(a)).reduce((s,a)=>s+recalcAccBalance(a.id),0);
_totalSaldoCache=total;
return total;
}
/* moved to modules-render.js: renderDashAccList */
/* moved to modules-render.js: renderLapAccList */
function quickToggleInclude(id){
if(isAccLinkedToAsset(id)&&D.accounts.find(x=>x.id===id)?.includeInBalance!==false){
toast('🔗 Akun ini dikecualikan otomatis karena ditautkan dari 📋 Buku Aset — lepas tautannya dulu di modal Aset kalau mau atur manual di sini');
return;
}
const a=D.accounts.find(x=>x.id===id);
if(!a)return;
a.includeInBalance=a.includeInBalance===false?true:false;
save();renderLapAccList();renderDashAccList();renderAccGrid();
}
let editAccIdx=-1,accIncludeState=true;
// Field tambahan per Jenis Akun (KW-164, permintaan sesi ini) — Investasi butuh nama Platform
// (mis. Bibit/Ajaib), Dikunci butuh perkiraan Target Tanggal Buka (mis. dana darurat baru boleh
// dibuka saat tanggal tertentu). Kas Bebas tidak butuh field tambahan apa-apa.
function onAccJenisChange(){
const jenis=document.getElementById('accJenis')?.value||'kas_bebas';
const wrap=document.getElementById('accJenisFieldsWrap');
if(!wrap)return;
if(jenis==='investasi'){
wrap.innerHTML='<div class="fg"><label class="fl">Platform (opsional)</label><input type="text" class="fi" id="accPlatform" placeholder="Bibit, Ajaib, Pluang, dll"></div>';
} else if(jenis==='dikunci'){
wrap.innerHTML='<div class="fg"><label class="fl">Target Tanggal Buka (opsional)</label><input type="date" class="fi" id="accTargetTanggal"><div style="font-size:11px;color:var(--text2);margin-top:4px">Perkiraan kapan dana ini rencananya boleh dipakai/dicairkan, mis. dana darurat atau tabungan tujuan.</div></div>';
} else {
wrap.innerHTML='';
}
}
function openAccModal(idx){
editAccIdx=(typeof idx==='number')?idx:-1;
const a=editAccIdx>=0?D.accounts[editAccIdx]:null;
document.getElementById('accModalTitle').textContent=a?'Edit Akun':'Tambah Akun';
document.getElementById('accName').value=a?a.name:'';
document.getElementById('accEmoji').value=a?a.emoji:'💰';
document.getElementById('accBalance').value=a?recalcAccBalance(a.id):'';
document.getElementById('accBalanceLabel').textContent=a?'Saldo Sekarang (Rp)':'Saldo Awal (Rp)';
document.getElementById('accBalanceHint').style.display=a?'block':'none';
document.getElementById('accLinkedAssetHint').style.display=(a&&isAccLinkedToAsset(a.id))?'block':'none';
const accJenisEl=document.getElementById('accJenis');
if(accJenisEl)accJenisEl.value=a?(a.jenis||'kas_bebas'):'kas_bebas';
onAccJenisChange();
const platformEl=document.getElementById('accPlatform');
if(platformEl)platformEl.value=a?(a.platform||''):'';
const targetEl=document.getElementById('accTargetTanggal');
if(targetEl)targetEl.value=a?(a.targetTanggalBuka||''):'';
accIncludeState=a?(a.includeInBalance!==false):true;
updateAccIncludeBtn();
// Ownership (S231, reuse OwnershipEngine — single source of truth utk 5 tipe/label).
// Data lama tanpa field ownership: resolve() fallback ke SELF (DEFAULT), sesuai spesifikasi.
const ownSel=document.getElementById('accOwnership');
if(ownSel){
if(typeof OwnershipEngine!=='undefined'){
ownSel.innerHTML=OwnershipEngine.TYPES.map(t=>`<option value="${t}">${escapeHtml(OwnershipEngine.label(t))}</option>`).join('');
ownSel.value=OwnershipEngine.resolve(a||{}).type;
}else{
ownSel.innerHTML='<option value="SELF">Milik Sendiri</option>';
ownSel.value='SELF';
}
}
openModal('accModal');
}
function toggleAccInclude(){accIncludeState=!accIncludeState;updateAccIncludeBtn();}
function updateAccIncludeBtn(){
const btn=document.getElementById('accIncludeBtn');
if(!btn)return;
btn.classList.toggle('active',accIncludeState);
btn.textContent=accIncludeState?'✓ Aktif':'✕ Nonaktif';
}
function saveAcc(){return withSaveGuard('acc','accModal',_saveAccInner);}
function _saveAccInner(){
const name=document.getElementById('accName').value.trim();
const emoji=document.getElementById('accEmoji').value||'💰';
const nominal=parseFloat(document.getElementById('accBalance').value)||0;
const jenisEl=document.getElementById('accJenis');
const jenis=jenisEl?jenisEl.value:'kas_bebas';
// Field tambahan per jenis (KW-164) — hanya relevan salah satu tergantung jenis yang dipilih,
// yang tidak relevan disimpan kosong (undefined) supaya tidak nyimpen data basi kalau jenis diganti.
const platform=jenis==='investasi'?(document.getElementById('accPlatform')?.value.trim()||''):'';
const targetTanggalBuka=jenis==='dikunci'?(document.getElementById('accTargetTanggal')?.value||''):'';
// Ownership (S231) — dibaca dari dropdown, divalidasi/dinormalisasi via OwnershipEngine.
// Guard engine belum dimuat / value tidak valid: fallback DEFAULT (SELF), tidak pernah menolak simpan.
const ownRaw=document.getElementById('accOwnership')?.value;
const ownership=(typeof OwnershipEngine!=='undefined'&&OwnershipEngine.isValidType(ownRaw))?OwnershipEngine.normalize(ownRaw):(typeof OwnershipEngine!=='undefined'?OwnershipEngine.DEFAULT:'SELF');
if(!name){toast('⚠️ Isi nama akun');return;}
if(editAccIdx>=0){
const a=D.accounts[editAccIdx];
a.name=name;a.emoji=emoji;a.includeInBalance=accIncludeState;a.jenis=jenis;a.platform=platform;a.targetTanggalBuka=targetTanggalBuka;a.ownership=ownership;
const txDelta=recalcAccBalance(a.id)-(a.baseBalance!==undefined?a.baseBalance:(a.balance||0));
a.baseBalance=nominal-txDelta;
a.balance=nominal;
save();closeModal('accModal');renderAccGrid();populateAccFilters();renderDashAccList();renderLapAccList();toast('✅ Akun diperbarui');
} else {
D.accounts.push({id:'acc_'+Date.now(),name,emoji,baseBalance:nominal,balance:nominal,includeInBalance:accIncludeState,jenis,platform,targetTanggalBuka,ownership});
save();closeModal('accModal');renderAccGrid();populateAccFilters();renderDashAccList();renderLapAccList();toast('✅ Akun ditambahkan');
}
}
// openAccTxHistory(id) — klik kartu akun di 🏦 Akun & Metode Pembayaran (Pengaturan >
// Keuangan) sekarang menampilkan Riwayat Transaksi akun itu, bukan langsung buka modal
// Edit (yang sebelumnya jadi satu-satunya aksi klik kartu). Pakai ULANG scope 'account' di
// showFilteredTx() (modules/finance/filter-laporan.js) — persis fungsi yang sama dipakai
// Aset.openTxHistory() (modules/asset/aset.js) — 0 UI/logic baru, cuma titik panggil baru.
// Edit akun sekarang lewat tombol ✏️ terpisah (lihat renderAccGrid(), modules-render.js)
// yang tetap manggil openAccModal(idx) seperti sebelumnya.
function openAccTxHistory(id){
const acc=D.accounts.find(x=>sameId(x.id,id));
if(!acc){toast('⚠️ Akun tidak ditemukan');return;}
if(typeof showFilteredTx!=='function'){toast('⚠️ Fitur riwayat transaksi belum tersedia');return;}
showFilteredTx('account',undefined,'📜 Riwayat: '+acc.name,acc.id);
}
// delAcc(i) — hapus akun ke-i. SEBELUM sesi ini, data terkait (transaksi/
// tagihan/catatan BBM/servis/transaksi Shop) SELALU otomatis dipindah ke
// D.accounts[0] (akun pertama dalam daftar) tanpa user bisa memilih. Sesi
// ini: kalau akun yang dihapus MEMANG punya data terkait & ada lebih dari
// 1 akun tujuan yang mungkin, user diberi PILIHAN mau dipindah ke akun
// mana (reuse showChoiceModal() yang SUDAH ADA, modal generik pilihan
// button-list — TIDAK ada modal/UI baru dibuat). Kalau akun yang dihapus
// TIDAK punya data terkait sama sekali, atau cuma ada 1 kemungkinan akun
// tujuan (total akun = 2), langsung pakai satu-satunya akun itu tanpa
// modal pilihan tambahan (menghindari friksi tanya sesuatu yang jawabannya
// cuma 1 opsi) — perilaku ini MURNI presenter/keputusan UI, field data
// (accountId) TIDAK berubah sama sekali dari versi sebelumnya.
// PERBAIKAN LANJUTAN (audit sesi ini): titik migrasi SEBELUMNYA cuma 5
// array (transactions/bills/bbmLogs/servisLogs/cobek), padahal D.targets
// (Tabungan/Target Keuangan, field accountId di tx-target.js) & D.assets
// (Buku Aset, field accountId di aset.js -- aset yang ditautkan ke akun,
// mis. akun Reksadana yang dibuatkan otomatis dari aset) JUGA nyimpen
// accountId menunjuk ke D.accounts. Sebelum fix ini, hapus akun yang masih
// ditautkan ke Target/Aset bikin accountId-nya jadi dangling reference
// (nunjuk akun yang sudah tidak ada) -- progress Target/badge "via Aset"
// bisa salah baca krn kode di tx-target.js/aset.js asumsinya akun itu
// selalu ada. Ditambah ke deteksi hasLinkedData & migrasi di bawah, pola
// SAMA PERSIS 5 array yang sudah ada (TIDAK ada logic baru, cuma 2 baris
// forEach tambahan + 2 syarat .some() tambahan).
// SESI S604 (audit lanjutan S603, "bug serupa"): titik migrasi di atas MASIH belum
// tahu soal D.investments[].accountId (dropdown "🔗 Hubungkan ke Akun" di Holding
// Investasi, S601-3) -- ROOT CAUSE SAMA PERSIS S603 (linkedAssetAccountIds() dulu
// juga cuma baca D.assets). Sebelum fix ini, hapus akun yang tertaut LANGSUNG ke
// Holding (skenario "Majoris" tanpa Aset perantara) lolos sebagai "tidak punya data
// terkait" (hasLinkedData bisa false total kalau tidak ada transaksi/bill/dst lain)
// -- 0 peringatan ke user, dan D.investments[].accountId JADI DANGLING REFERENCE
// PERMANEN (menunjuk akun yang sudah dihapus, TIDAK PERNAH dimigrasikan seperti
// D.assets di baris forEach bawah). Fix: tambah 1 syarat .some() + 1 baris forEach
// migrasi + linkedHoldingsCount di pesan konfirmasi -- pola SAMA PERSIS
// linkedAssetsCount/D.assets forEach di atas, 0 logic baru selain sumber data.
async function delAcc(i){
if(D.accounts.length<=1){toast('⚠️ Minimal 1 akun harus ada');return;}
const acc=D.accounts[i];
if(!acc)return;
const others=D.accounts.filter((a,idx)=>idx!==i);
const hasLinkedData=D.transactions.some(t=>t.accountId===acc.id)
||(D.bills||[]).some(b=>b.accountId===acc.id)
||(D.bbmLogs||[]).some(b=>b.accountId===acc.id)
||(D.servisLogs||[]).some(s=>s.accountId===acc.id)
||(D.cobek||[]).some(c=>c.accountId===acc.id)
||(D.targets||[]).some(t=>t.accountId===acc.id)
||(D.assets||[]).some(a=>a.accountId===acc.id)
||(D.investments||[]).some(h=>h.accountId===acc.id)
||(D.debts||[]).some(d=>d&&d.linkedAccountId===acc.id);
// FIX (delacc-linked-titipan-debt-audit): baris Buku Utang "Dana titipan akun"
// (D.debts[].linkedAccountId, ditulis TitipanSync.reconcileAccounts() -- lihat
// modules/finance/titipan-sync.js) TIDAK PERNAH dicek/dimigrasikan di sini,
// pola gap SAMA PERSIS S603/S604 (sumber data baru ditambah, hasLinkedData()
// lupa diupdate) -- bedanya reconcileAccounts() lebih baru dari fix S604.
// Baris ini derivatif (recompute dari acc.owners[] tiap save(), lihat
// reconcileAccounts()), BUKAN data primer spt transaksi/aset -- tidak ada
// "target" yang masuk akal utk dipindahkan (porsi kepemilikan akun itu
// sendiri tidak ikut dimigrasikan ke akun lain), jadi TIDAK ditambah ke
// migrasi accountId di bawah. Cukup dihitung & DIPERINGATKAN eksplisit ke
// user di confirmMsg -- reconcileAccounts() (dipanggil dari save() di akhir
// fungsi ini) akan MENGHAPUS baris itu otomatis begitu akun sudah tidak ada
// di D.accounts (perilaku existing-nya, 0 diubah), tapi sebelumnya user
// SAMA SEKALI tidak diberi tahu baris Utang itu akan hilang.
const linkedTitipanDebtCount=(D.debts||[]).filter(d=>d&&d.linkedAccountId===acc.id).length;
let target=others[0];
if(hasLinkedData&&others.length>1){
const choices=others.map(a=>({label:`${a.emoji||'💰'} ${a.name} (saldo ${fmt(recalcAccBalance(a.id))})`}));
const linkedTargetsCount=(D.targets||[]).filter(t=>t.accountId===acc.id).length;
const linkedAssetsCount=(D.assets||[]).filter(a=>a.accountId===acc.id).length;
const linkedHoldingsCount=(D.investments||[]).filter(h=>h.accountId===acc.id).length;
let extraNote='';
if(linkedTargetsCount>0)extraNote+=` ${linkedTargetsCount} Target Tabungan`;
if(linkedAssetsCount>0)extraNote+=`${extraNote?' &':''} ${linkedAssetsCount} Aset`;
if(linkedHoldingsCount>0)extraNote+=`${extraNote?' &':''} ${linkedHoldingsCount} Holding Investasi`;
const pickedIdx=await showChoiceModal({title:'Pindahkan Data ke Akun Mana?',icon:'🔀',message:`Akun "${acc.name}" punya transaksi/tagihan/catatan yang terkait${extraNote?' (termasuk'+extraNote+' yang ditautkan)':''}. Pilih akun tujuan buat pindahin datanya sebelum akun ini dihapus:`,choices});
if(pickedIdx===null||pickedIdx===undefined)return; // dibatalkan, akun TIDAK jadi dihapus
target=others[pickedIdx];
}
let confirmMsg=hasLinkedData
?`Hapus akun "${acc.name}"? Transaksi, tagihan, catatan BBM/servis, transaksi Shop, Target Tabungan, Aset, dan Holding Investasi yang terkait akan dipindahkan ke akun "${target.name}".`
:`Hapus akun "${acc.name}"? Akun ini tidak punya data transaksi terkait.`;
if(linkedTitipanDebtCount>0)confirmMsg+=` ⚠️ ${linkedTitipanDebtCount} baris "Dana Titipan Akun" di Buku Utang milik akun ini akan IKUT TERHAPUS (porsi kepemilikannya tidak bisa dipindah ke akun lain secara otomatis).`;
if(!await askConfirm(confirmMsg))return;
D.accounts.splice(i,1);
D.transactions.forEach(t=>{if(t.accountId===acc.id)t.accountId=target.id;});
(D.bills||[]).forEach(b=>{if(b.accountId===acc.id)b.accountId=target.id;});
(D.bbmLogs||[]).forEach(b=>{if(b.accountId===acc.id)b.accountId=target.id;});
(D.servisLogs||[]).forEach(s=>{if(s.accountId===acc.id)s.accountId=target.id;});
(D.targets||[]).forEach(t=>{if(t.accountId===acc.id)t.accountId=target.id;});
(D.assets||[]).forEach(a=>{if(a.accountId===acc.id)a.accountId=target.id;});
(D.investments||[]).forEach(h=>{if(h.accountId===acc.id)h.accountId=target.id;});
(D.cobek||[]).forEach(c=>{if(c.accountId===acc.id)c.accountId=target.id;});
save();renderAccGrid();populateAccFilters();renderDashAccList();renderLapAccList();renderDashboard();renderKeuangan();refreshBillEverywhere();renderCnTab();toast(hasLinkedData?`🗑 Akun dihapus, semua data terkait dipindah ke "${target.name}"`:`🗑 Akun "${acc.name}" dihapus`);
}
// --- S574-B: UI "⚖️ Porsi Kepemilikan" pada modal Akun (accountOwnersModal) -------------------
// Scope sesi ini (lanjutan S574-A, lihat AUDIT-S574-PEMILIK-SUMBER-POTONGAN.md §9 Tahap 2): HANYA
// UI pengaturan owners[] akun (tambah/hapus/ubah porsi/simpan), reuse PENUH getAccOwners()/
// setAccOwners() (S574-A, MultiOwnerEngine) — 0 logic porsi baru. TIDAK ada deductionOwnerId,
// TIDAK ada picker transaksi, TIDAK menyentuh transaksi.js/formula saldo/ownership existing.
// Pola UI 100% mirror Aset.openOwnersModal()/_renderOwnersList()/addOwnerRow()/removeOwnerRow()/
// onOwnerNameInput()/onOwnerPorsiInput()/onOwnerIsSelfToggle()/updateOwnersTotal()/saveOwners()/
// resetOwners() (aset.js, S392a-d/393) — versi akun SENGAJA lebih sederhana (tanpa kolom Nominal
// Rp/kuota titipan seperti Aset, karena akun tidak punya field nilai dasar seperti aset) tapi
// validasi & simpan 100% lewat engine yang sama.
const AccOwners = {
_draft: [],
_accId: null,
// _rebalancePending -- FITUR "Auto-Rebalance Porsi Pemilik" (Agustus 2026, permintaan user,
// lanjutan wiring yang sudah dipasang di Aset.openOwnersModal()/aset.js): {editedIndex,method,
// manualIndex} kalau panel penyesuaian SEDANG tampil, null kalau tidak. 100% REUSE
// calculateRebalance() (modules-calc.js, SSOT sama yang dipakai Aset) -- 0 rumus baru di sini,
// method2 di bawah (_checkRebalanceTrigger/_renderRebalancePanel/setRebalanceMethod/
// setRebalanceManualOwner/applyRebalance/cancelRebalance) murni UI/state, copy pola PERSIS
// Aset.* (aset.js) dgn id elemen & radio name diganti versi Akun supaya tidak bentrok kalau
// kedua modal somehow tampil berurutan di DOM yang sama.
_rebalancePending: null,
// open() — baca akun yang SEDANG diedit (via editAccIdx, akun.js) & isi draft dari getAccOwners()
// (S574-A, toleran akun lama tanpa owners[]). Akun belum tersimpan (mode Tambah, editAccIdx===-1)
// -> tolak & toast, sama pola Aset.addOwnerRow()/saveOwners() (guard "simpan dulu").
// SESI S604 (audit lanjutan S603, "bug serupa"): SEBELUM fix ini, akun yang tertaut LANGSUNG ke
// Holding Investasi (findLinkedHoldingForAccount(), h.accountId, S601-3) tetap membuka modal ini
// dalam kondisi FULL EDITABLE, draft dimuat dari acc.owners (mentah/basi) -- BUKAN dari porsi live
// Holding. User bisa edit & tekan "Simpan Porsi", dapat toast sukses, TAPI perubahannya tidak
// pernah nyampe ke Investment.setOwners() (save() di bawah cuma sync ke Aset tertaut, tidak
// pernah ke Holding) -- SEMUA konsumen porsi (renderAccGrid/resolveOwnerDefaultForAccount/
// resolveTxOwnerSplitForAccount) toh selalu prioritaskan Holding di atas acc.owners, jadi edit
// user itu lenyap tanpa jejak walau modal bilang "tersimpan". FIX: 100% REUSE pola B2b
// Aset.openOwnersModal() (aset.js) -- alih navigasi LANGSUNG ke InvestmentUI.openOwnersModal(id),
// modal accountOwnersModal ini TIDAK dibuka sama sekali utk akun tertaut Holding (user langsung
// edit di sumber kebenarannya). Guard typeof InvestmentUI: kalau module investasi-view.js belum
// dimuat, fallback ke toast penjelasan (bukan diam-diam buka modal yang menyesatkan).
open(){
if(editAccIdx<0||!D.accounts[editAccIdx]){toast('⚠️ Simpan akun ini dulu sebelum mengatur porsi kepemilikan');return;}
const acc=D.accounts[editAccIdx];
const linkedHolding=(typeof findLinkedHoldingForAccount==='function')?findLinkedHoldingForAccount(acc.id):null;
if(linkedHolding){
if(typeof InvestmentUI!=='undefined'){InvestmentUI.openOwnersModal(linkedHolding.id);return;}
toast('🔗 Porsi akun ini diatur di Holding Investasi "'+linkedHolding.name+'" -- buka Buku Investasi untuk mengatur porsinya');
return;
}
AccOwners._accId=acc.id;
document.getElementById('accountOwnersAccName').textContent='🏦 '+(acc.emoji||'💰')+' '+acc.name;
const res=getAccOwners(acc.id);
AccOwners._draft=(res&&res.ok?res.owners:[]).map((o)=>({ownerId:o.ownerId,ownerName:o.ownerName,porsi:o.porsi,isSelf:!!o.isSelf}));
AccOwners._rebalancePending=null;
AccOwners._renderList();
openModal('accountOwnersModal');
// MIGRASI data lama (Agustus 2026, sesi lanjutan setelah Aset & Investasi -- lihat komentar
// identik di aset.js/investasi-view.js): akun yang sudah overflow >100% SEBELUM fitur
// Auto-Rebalance ini ada tidak akan pernah memicu _checkRebalanceTrigger() lewat ketikan user
// kalau user tidak menyentuh field porsi sama sekali sesudah buka modal -- panggil manual di
// sini pakai baris TERAKHIR draft sbg "editedIndex" (hasil kalkulasi tidak bergantung baris
// mana yang dianggap "diedit" utk kasus migrasi ini) supaya panel penyesuaian otomatis tampil
// begitu modal dibuka, bukan cuma saat user mulai mengetik. PURE (tidak menulis draft), aman
// dipanggil di sini.
AccOwners._checkRebalanceTrigger(AccOwners._draft.length-1);
},
// _renderList() — render ulang #accountOwnersList dari AccOwners._draft. Dipanggil tiap baris
// ditambah/dihapus (addRow/removeRow), TIDAK dipanggil tiap karakter diketik (sama disiplin
// _renderOwnersList() aset.js — supaya fokus/kursor input tidak hilang).
_renderList(){
const listBox=document.getElementById('accountOwnersList');
if(!listBox)return;
const draft=AccOwners._draft;
if(!draft.length){
listBox.innerHTML='<div class="empty"><div class="empty-text">Belum ada pemilik. Tap "➕ Tambah Pemilik" di bawah.</div></div>';
AccOwners.updateTotal();
return;
}
listBox.innerHTML=draft.map((o,i)=>{
const porsiNum=typeof o.porsi==='number'&&isFinite(o.porsi)?o.porsi:null;
return '<div style="margin-bottom:8px">'+
'<div class="u-flex u-gap8" style="align-items:center;margin-bottom:6px">'+
'<input type="text" class="fi" style="flex:1" placeholder="Nama pemilik" value="'+escapeHtml(o.ownerName||'')+'" oninput="AccOwners.onNameInput('+i+',this.value)">'+
'<button type="button" class="btn btn-ghost btn-sm" data-action="AccOwners.removeRow" data-args=\'['+i+']\' aria-label="Hapus pemilik">✕</button>'+
'</div>'+
'<div class="fg u-mb0"><label class="fl" style="margin-bottom:2px">Porsi (%)</label><input type="number" class="fi" id="accOwnerPorsi'+i+'" placeholder="%" inputmode="decimal" value="'+(porsiNum!==null?porsiNum:'')+'" oninput="AccOwners.onPorsiInput('+i+',this.value)"></div>'+
'<label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text2);margin-top:4px;cursor:pointer">'+
'<input type="checkbox" style="width:14px;height:14px"'+(o.isSelf?' checked':'')+' onchange="AccOwners.onIsSelfToggle('+i+',this.checked)"> 👤 Ini saya'+
'</label>'+
'</div>';
}).join('');
AccOwners.updateTotal();
// Panel "⚖️ Porsi melebihi 100%" dirender ulang tiap kali list ini di-render ulang penuh --
// lihat _renderRebalancePanel() (sama disiplin _renderOwnersList()/aset.js).
AccOwners._renderRebalancePanel();
},
// updateTotal() — hitung ulang & tampilkan total porsi AccOwners._draft di #accountOwnersTotalBox,
// warna hijau kalau pas 100% / merah kalau belum (100% reuse MultiOwnerEngine.totalPorsi()/
// remainingPorsi(), 0 rumus baru — sama persis Aset.updateOwnersTotal()). Tombol Simpan Porsi
// hanya aktif kalau total PAS 100% (sinkron syarat MultiOwnerEngine.validateOwners()).
updateTotal(){
const box=document.getElementById('accountOwnersTotalBox');
const saveBtn=document.getElementById('accountOwnersSaveBtn');
if(!box){if(saveBtn)saveBtn.disabled=true;return;}
const draft=AccOwners._draft;
if(!draft.length){
box.textContent='Belum ada pemilik ditambahkan.';
box.style.color='var(--text2)';
if(saveBtn)saveBtn.disabled=true;
return;
}
if(typeof MultiOwnerEngine==='undefined'){box.textContent='';box.style.color='';if(saveBtn)saveBtn.disabled=true;return;}
const total=MultiOwnerEngine.totalPorsi(draft);
const sisa=MultiOwnerEngine.remainingPorsi(draft);
const isValid=Math.abs(sisa)<=0.01;
box.style.color=isValid?'var(--accent3)':'var(--accent2)';
box.style.fontWeight='700';
box.textContent=isValid?('✅ Total porsi: '+total+'% (pas 100%)'):('⚠️ Total porsi: '+total+'% ('+(sisa>0?('kurang '+sisa+'%'):('lebih '+Math.abs(sisa)+'%'))+')');
if(saveBtn)saveBtn.disabled=!isValid;
},
// addRow()/removeRow(i) — tambah/hapus 1 baris draft di memori, render ulang list. Murni ubah
// draft — TIDAK menulis apa pun ke D.accounts sampai save() dipanggil (sama pola Aset).
addRow(){
AccOwners._draft.push({ownerId:'',ownerName:'',porsi:0,isSelf:AccOwners._draft.length===0});
AccOwners._renderList();
},
removeRow(i){
AccOwners._draft.splice(i,1);
// Index baris bisa bergeser setelah hapus -- buang panel rebalance yang sedang tampil (kalau
// ada) sama pola Aset.removeOwnerRow(), _renderList() di bawah akan render ulang panel dari
// kondisi bersih (_rebalancePending null) via _renderRebalancePanel().
AccOwners._rebalancePending=null;
AccOwners._renderList();
},
// onNameInput(i,val)/onPorsiInput(i,val)/onIsSelfToggle(i,checked) — tulis ketikan/toggle user ke
// AccOwners._draft[i]. onPorsiInput() juga panggil updateTotal() supaya indikator realtime (sama
// pola Aset.onOwnerPorsiInput()); onNameInput() TIDAK render ulang list (jaga fokus input, sama
// alasan aset.js). onIsSelfToggle() event diskrit, aman render ulang.
onNameInput(i,val){
if(!AccOwners._draft[i])return;
AccOwners._draft[i].ownerName=val;
},
onPorsiInput(i,val){
if(!AccOwners._draft[i])return;
const n=parseFloat(val);
AccOwners._draft[i].porsi=isFinite(n)?n:0;
AccOwners.updateTotal();
// FITUR "Auto-Rebalance Porsi Pemilik" (Agustus 2026): kalau ketikan ini bikin total porsi
// >100% DAN ada porsi pemilik lain yang bisa dikurangi, tawarkan penyesuaian (proporsional/dari
// terbesar/manual) lewat panel di bawah list -- TIDAK pernah mengubah porsi pemilik lain diam2,
// lihat _checkRebalanceTrigger()/_renderRebalancePanel(). Sama persis Aset.onOwnerPorsiInput().
AccOwners._checkRebalanceTrigger(i);
},
onIsSelfToggle(i,checked){
if(!AccOwners._draft[i])return;
AccOwners._draft[i].isSelf=!!checked;
},
// save() — tulis AccOwners._draft ke D.accounts[].owners lewat setAccOwners() (S574-A, yang di
// dalamnya reuse MultiOwnerEngine.setOwners()/validateOwners() — 0 logic validasi baru ditulis di
// sini). Baris baru (ownerId kosong) non-SELF -> OwnerRegistry.findOrCreate() kalau tersedia
// (konsisten nama pemilik lintas Aset/Investasi/Akun, S489), fallback uid(). Baris isSelf:true
// tanpa ownerId -> literal 'SELF' (S547 pattern, sama Aset.saveOwners()) supaya konsisten dgn
// identitas SELF universal, bukan per-nama seperti OwnerRegistry.
save(){
if(typeof MultiOwnerEngine==='undefined'){toast('⚠️ Fitur porsi kepemilikan belum siap dimuat');return;}
if(!AccOwners._accId){toast('⚠️ Akun tidak ditemukan, coba tutup dan buka lagi');return;}
// S604: jaring pengaman kedua -- open() SUDAH mengalihkan akun tertaut Holding ke
// InvestmentUI.openOwnersModal() di atas & tidak pernah sampai ke titik ini dalam alur normal,
// tapi dicek ULANG di sini (bukan cuma percaya open()) jaga-jaga _accId berubah status
// tertaut-Holding SETELAH modal dibuka (mis. user buka 2 tab/flow lain sempat link akun ini ke
// Holding baru saat modal masih terbuka) -- pola sama "dijaga di sini" pada
// Aset.addOwnerRow()/removeOwnerRow() (aset.js) yang toh tetap re-check _ownersReadOnly walau
// UI tombolnya sudah disembunyikan duluan.
if(typeof findLinkedHoldingForAccount==='function'&&findLinkedHoldingForAccount(AccOwners._accId)){toast('🔗 Porsi akun ini diatur di Holding Investasi, tidak bisa diedit di sini');return;}
const draft=AccOwners._draft;
if(!draft.length){toast('⚠️ Tambahkan minimal 1 pemilik sebelum menyimpan');return;}
for(let i=0;i<draft.length;i++){
if(!draft[i].ownerName||!draft[i].ownerName.trim()){toast('⚠️ Nama pemilik baris ke-'+(i+1)+' wajib diisi');return;}
}
let selfIdUsed=draft.some((o)=>o.ownerId&&String(o.ownerId).trim()==='SELF');
// S607 (OwnerRegistry.findOrCreate() wajib, mirror Aset.saveOwners()): baris
// pemilik BARU non-SELF WAJIB lolos OwnerRegistry -- OwnerRegistry gagal
// load / findOrCreate() bukan function -> save() FAIL-FAST (toast + return
// SEBELUM setAccOwners() dipanggil, D.accounts TIDAK disentuh), bukan diam-
// diam fallback uid() acak spt sebelumnya. Baris isSelf:true & baris yang
// ownerId-nya sudah ada TIDAK kena guard ini.
let owners;
try{
owners=draft.map((o)=>{
let ownerId;
if(o.ownerId&&String(o.ownerId).trim()){
ownerId=String(o.ownerId).trim();
}else if(o.isSelf&&!selfIdUsed){
ownerId='SELF';
selfIdUsed=true;
}else if(!o.isSelf){
if(typeof OwnerRegistry==='undefined'||typeof OwnerRegistry.findOrCreate!=='function'){
throw new Error('S607_OWNER_REGISTRY_UNAVAILABLE');
}
ownerId=OwnerRegistry.findOrCreate(o.ownerName.trim());
}else{
ownerId=String(uid());
}
return{ownerId,ownerName:o.ownerName.trim(),porsi:o.porsi,isSelf:!!o.isSelf};
});
}catch(e){
if(e&&e.message==='S607_OWNER_REGISTRY_UNAVAILABLE'){toast('⚠️ Fitur pemilik belum siap dimuat, coba lagi');return;}
throw e;
}
const res=setAccOwners(AccOwners._accId,owners);
if(!res.ok){toast('⚠️ '+res.reason);return;}
// BUGFIX (audit sync arah Akun->Aset, lanjutan patch Aset->Akun sesi sebelumnya):
// setAccOwners() di atas cuma nulis acc.owners -- aset tertaut (a.accountId ===
// akun ini) TIDAK ikut ter-update, jadi Buku Aset/Zakat/Kekayaan Bersih (baca
// a.owners) tetap porsi lama, & bisa KETIMPA BALIK kalau Aset.saveOwners()
// terpanggil lagi nanti (arah Aset->Akun menimpa acc.owners pakai a.owners basi).
// Fix: cari LANGSUNG (bukan getMultiOwnerAssets() -- itu memfilter HANYA yang
// SUDAH isMultiOwner, jadi kelewat kasus 1-owner->multi-owner), skip aset yang
// tertaut Holding Investasi (a.investmentId -- porsinya didikte Investment.
// getOwners(), lihat Aset._resolveLinkedInvestment()/_ownersReadOnly, menulis
// a.owners manual di sini akan konflik). 0 rumus baru -- 100% reuse
// MultiOwnerEngine.setOwners()/Aset._syncOwnerDebts() persis pola saveOwners().
const linkedAsset=(D.assets||[]).find(a=>sameId(a.accountId,AccOwners._accId));
if(linkedAsset&&!(typeof Aset!=='undefined'&&typeof Aset._resolveLinkedInvestment==='function'&&Aset._resolveLinkedInvestment(linkedAsset))){
const assetRes=MultiOwnerEngine.setOwners(linkedAsset,res.owners);
if(assetRes.ok){
Object.assign(linkedAsset,{owners:assetRes.entity.owners});
if(typeof TitipanSync!=='undefined'&&typeof TitipanSync.reconcile==='function'){TitipanSync.reconcile(linkedAsset);}else if(typeof Aset!=='undefined'&&typeof Aset._syncOwnerDebts==='function'){Aset._syncOwnerDebts(linkedAsset);}
if(typeof Aset!=='undefined'&&typeof Aset.renderList==='function')Aset.renderList();
if(typeof renderKekayaanBersih==='function')renderKekayaanBersih();
if(typeof hitungZakatMaal==='function')hitungZakatMaal();
}
}
save();
AccOwners._draft=res.owners.map((o)=>({ownerId:o.ownerId,ownerName:o.ownerName,porsi:o.porsi,isSelf:!!o.isSelf}));
AccOwners._renderList();
if(typeof renderAccGrid==='function')renderAccGrid();
if(typeof renderDashAccList==='function')renderDashAccList();
if(typeof renderLapAccList==='function')renderLapAccList();
// S583 sesi-9 (Rekomendasi #3 enforcement): audit checkAll() SETELAH simpan
// berhasil -- non-blocking (lihat komentar warnIfNotOk() di titipan-reconcile.js),
// TIDAK pernah menahan/menolak simpan yang di atas sudah selesai.
// S583 sesi-12: dipulihkan, sama alasan Aset.saveOwners() di aset.js (lihat
// komentar di sana + PATCH-NOTES.md sesi-12) -- hilang di akun.js sejak
// sesi-10b karena basis branch beda dgn sesi-9, bukan perubahan disengaja.
if(typeof TitipanReconcile!=='undefined')TitipanReconcile.warnIfNotOk('AccOwners.save');
// FIX (audit "3 titik Simpan Porsi tidak me-refresh widget Dana Titipan"):
// sama alasan Aset.saveOwners()/InvestmentUI.saveOwners() -- porsi titipan pada
// akun ini (termasuk sync ke aset tertaut di atas) ikut membentuk usedTotal/
// available di kartu "Dana Kelolaan" & tab "Dana Titipan"
// (DanaTitipanPortfolioPresenter), tapi jalur ini belum pernah memanggilnya.
// 0 logic baru, cuma menyamakan pola render()+renderInto() yang sudah baku
// di modul lain (tx-list-cashflow.js, dana-titipan-portfolio-render.js).
if(typeof DanaTitipanPortfolioPresenter!=='undefined')DanaTitipanPortfolioPresenter.render();
if(typeof DanaTitipanPortfolioPresenter!=='undefined'&&typeof DanaTitipanPortfolioPresenter.renderInto==='function')DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
toast('✅ Porsi kepemilikan akun tersimpan');
},
// resetDraft() — buang perubahan draft yang belum disimpan, muat ulang dari data TERSIMPAN di
// D.accounts (via getAccOwners(), sama logic openOwnersModal()). Dipakai kalau user salah edit &
// mau mulai ulang tanpa tutup modal.
resetDraft(){
if(!AccOwners._accId){return;}
const res=getAccOwners(AccOwners._accId);
AccOwners._draft=(res&&res.ok?res.owners:[]).map((o)=>({ownerId:o.ownerId,ownerName:o.ownerName,porsi:o.porsi,isSelf:!!o.isSelf}));
AccOwners._rebalancePending=null;
AccOwners._renderList();
// MIGRASI data lama (Agustus 2026) -- sama alasan open() di atas: draft dimuat ulang dari data
// tersimpan bisa saja masih overflow >100% (data lama), jadi panel penyesuaian perlu dicek
// ulang di sini juga, bukan cuma saat modal pertama dibuka.
AccOwners._checkRebalanceTrigger(AccOwners._draft.length-1);
},
// ============================================================================
// FITUR "Auto-Rebalance Porsi Pemilik" (Agustus 2026, permintaan user) -- wiring UI modal
// Akun (accountOwnersModal), sesi lanjutan setelah domain Aset (aset.js). Rumus murni 100%
// REUSE calculateRebalance() (modules-calc.js, SSOT yang sama dipakai Aset & disiapkan utk
// InvestmentUI juga) -- 0 rumus baru ditulis di sini, method2 di bawah PURE UI/state di
// sekitarnya, copy pola PERSIS Aset._checkRebalanceTrigger()/_renderRebalancePanel()/
// setRebalanceMethod()/setRebalanceManualOwner()/applyRebalance()/cancelRebalance() (aset.js)
// dgn penyesuaian: id elemen 'assetOwners*' -> 'accountOwners*', radio name
// 'assetRebalanceMethod' -> 'accountRebalanceMethod', & TIDAK ada sinkronisasi field Nominal
// (Rp) (akun tidak punya field nilai dasar seperti aset -- AccOwners._draft cuma
// {ownerId,ownerName,porsi,isSelf}, tidak ada _touched dipakai di tempat lain sejauh ini tapi
// tetap di-set konsisten dgn Aset supaya draft shape sama kalau nanti dibutuhkan).
// ============================================================================
// _checkRebalanceTrigger(editedIndex) -- dipanggil dari onPorsiInput() tiap ketik. Set/reset
// AccOwners._rebalancePending berdasarkan kondisi total porsi draft saat ini, TANPA pernah
// menulis ke draft[].porsi -- murni menentukan APAKAH panel penyesuaian perlu ditampilkan (&
// utk baris mana), penulisan porsi beneran hanya lewat applyRebalance().
_checkRebalanceTrigger(editedIndex){
if(typeof MultiOwnerEngine==='undefined'||typeof calculateRebalance!=='function')return;
const draft=Array.isArray(AccOwners._draft)?AccOwners._draft:[];
if(!draft[editedIndex])return;
const total=MultiOwnerEngine.totalPorsi(draft);
// Total masih <=100% -- tidak ada yang perlu dikurangi, bersihkan pending kalau ada (mis. user
// baru saja mengurangi lagi angka yang tadinya bikin overflow).
if(total<=100.0001){
if(AccOwners._rebalancePending){AccOwners._rebalancePending=null;AccOwners._renderRebalancePanel();}
return;
}
let oldTotal=0;
draft.forEach((o,k)=>{if(k===editedIndex||!o)return;oldTotal+=typeof o.porsi==='number'&&isFinite(o.porsi)?o.porsi:0;});
// Overflow tapi TIDAK ADA porsi pemilik lain yang bisa dikurangi (mis. cuma 1 baris terisi &
// user isi angka >100% sendiri) -- bukan kasus rebalance, biarkan updateTotal() (sudah
// dipanggil sebelum ini) yang tampilkan peringatan "lebih X%".
if(oldTotal<=0){
if(AccOwners._rebalancePending){AccOwners._rebalancePending=null;AccOwners._renderRebalancePanel();}
return;
}
if(!AccOwners._rebalancePending||AccOwners._rebalancePending.editedIndex!==editedIndex){
AccOwners._rebalancePending={editedIndex,method:'proporsional',manualIndex:null};
}
AccOwners._renderRebalancePanel();
},
// _rebalanceOwnerLabel(draft,i) -- nama tampilan 1 baris pemilik utk preview panel, fallback
// "Pemilik ke-N" (1-indexed) kalau nama masih kosong (baris baru yang belum diisi nama).
_rebalanceOwnerLabel(draft,i){
const nm=draft[i]&&typeof draft[i].ownerName==='string'?draft[i].ownerName.trim():'';
return nm?nm:('Pemilik ke-'+(i+1));
},
// _renderRebalancePanel() -- SATU titik render panel "⚖️ Porsi melebihi 100%" (pilihan metode
// + preview penyesuaian + tombol Terapkan/Batal), dipasang sbg elemen sibling TEPAT SETELAH
// #accountOwnersList (dibuat sekali via insertAdjacentElement, dipakai ulang di render
// berikutnya) supaya tidak perlu mengubah markup modal (modals.js) sama sekali. innerHTML
// dikosongkan kalau AccOwners._rebalancePending null (tidak ada apa2 utk ditampilkan).
_renderRebalancePanel(){
const listBox=document.getElementById('accountOwnersList');
if(!listBox)return;
let box=document.getElementById('accountOwnersRebalanceBox');
if(!box){
box=document.createElement('div');
box.id='accountOwnersRebalanceBox';
listBox.insertAdjacentElement('afterend',box);
}
const pending=AccOwners._rebalancePending;
if(!pending){box.innerHTML='';return;}
if(typeof calculateRebalance!=='function'){box.innerHTML='';return;}
const draft=Array.isArray(AccOwners._draft)?AccOwners._draft:[];
const calc=calculateRebalance(draft,pending.editedIndex,pending.method,pending.manualIndex);
let body='';
if(!calc||!calc.ok){
const errMsg=calc&&calc.error==='manual_owner_insufficient'
?('Porsi pemilik terpilih tidak cukup (kurang '+calc.shortfall+'%) -- pilih pemilik lain atau ganti metode.')
:(calc&&calc.error==='manual_owner_not_selected'?'Pilih dulu pemilik yang porsinya mau dikurangi.':'Penyesuaian tidak bisa diterapkan -- coba metode lain.');
body='<div style="font-size:12px;color:var(--accent2);font-weight:600;margin-bottom:10px;line-height:1.5">⚠️ '+escapeHtml(errMsg)+'</div>';
}else{
body='<div style="font-size:12px;line-height:1.6;margin-bottom:10px">'+
calc.adjustments.map((a)=>{
const label=AccOwners._rebalanceOwnerLabel(draft,a.index);
const changed=Math.abs(a.to-a.from)>0.0001;
return '<div style="display:flex;justify-content:space-between;gap:8px'+(changed?'':';opacity:.6')+'"><span>'+escapeHtml(label)+'</span><span style="font-weight:600">'+a.from+'% → '+a.to+'%</span></div>';
}).join('')+
'<div style="display:flex;justify-content:space-between;gap:8px;margin-top:6px;padding-top:6px;border-top:1px dashed var(--border);font-weight:700;color:var(--accent3)"><span>Total</span><span>'+calc.totalAfter+'%</span></div>'+
'</div>';
}
const eligibleOthers=draft.map((o,k)=>({o,k})).filter((x)=>x.k!==pending.editedIndex&&x.o&&typeof x.o.porsi==='number'&&x.o.porsi>0);
const manualSelectHtml=pending.method==='manual'?(
'<select class="fs u-mb10" onchange="AccOwners.setRebalanceManualOwner(this.value)">'+
'<option value="">— Pilih pemilik —</option>'+
eligibleOthers.map((x)=>'<option value="'+x.k+'"'+(pending.manualIndex===x.k?' selected':'')+'>'+escapeHtml(AccOwners._rebalanceOwnerLabel(draft,x.k))+' ('+x.o.porsi+'%)</option>').join('')+
'</select>'
):'';
box.innerHTML=
'<div style="background:var(--accent2-soft);border:1px solid var(--accent2);border-radius:12px;padding:12px 14px;margin-bottom:10px">'+
'<div style="font-size:12.5px;font-weight:700;color:var(--accent2);margin-bottom:4px">⚖️ Porsi melebihi 100%</div>'+
'<div style="font-size:11.5px;color:var(--text2);line-height:1.5;margin-bottom:10px">Porsi pemilik lama akan disesuaikan otomatis agar total kembali menjadi 100%.</div>'+
'<div style="font-size:11px;color:var(--text2);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Cara menyesuaikan porsi</div>'+
'<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:6px;cursor:pointer"><input type="radio" name="accountRebalanceMethod" value="proporsional"'+(pending.method==='proporsional'?' checked':'')+' onchange="AccOwners.setRebalanceMethod(this.value)"> Proporsional</label>'+
'<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:6px;cursor:pointer"><input type="radio" name="accountRebalanceMethod" value="largest"'+(pending.method==='largest'?' checked':'')+' onchange="AccOwners.setRebalanceMethod(this.value)"> Kurangi dari pemilik terbesar</label>'+
'<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:10px;cursor:pointer"><input type="radio" name="accountRebalanceMethod" value="manual"'+(pending.method==='manual'?' checked':'')+' onchange="AccOwners.setRebalanceMethod(this.value)"> Pilih pemilik manual</label>'+
manualSelectHtml+
'<div style="font-size:11px;color:var(--text2);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Penyesuaian porsi</div>'+
body+
'<div style="display:flex;gap:8px;margin-top:4px">'+
'<button type="button" class="btn btn-primary u-flex1" style="padding:11px" data-action="AccOwners.applyRebalance"'+((!calc||!calc.ok)?' disabled':'')+'>✅ Terapkan Penyesuaian</button>'+
'<button type="button" class="btn btn-ghost u-flex1" style="padding:11px" data-action="AccOwners.cancelRebalance">Batal</button>'+
'</div>'+
'</div>';
},
// setRebalanceMethod(method) -- ganti metode penyesuaian di panel yang sedang tampil & render
// ulang preview-nya. Pindah ke 'manual' otomatis pilih kandidat pertama (porsi terbesar dulu,
// pola sama default "largest") supaya preview langsung ada isinya tanpa user harus pilih dulu
// (tetap bisa diganti lewat dropdown).
setRebalanceMethod(method){
if(!AccOwners._rebalancePending)return;
AccOwners._rebalancePending.method=method;
if(method==='manual'&&AccOwners._rebalancePending.manualIndex==null){
const draft=Array.isArray(AccOwners._draft)?AccOwners._draft:[];
const editedIndex=AccOwners._rebalancePending.editedIndex;
let best=-1,bestPorsi=-1;
draft.forEach((o,k)=>{if(k===editedIndex||!o)return;const p=typeof o.porsi==='number'&&isFinite(o.porsi)?o.porsi:0;if(p>bestPorsi){bestPorsi=p;best=k;}});
AccOwners._rebalancePending.manualIndex=best>=0?best:null;
}
if(method!=='manual')AccOwners._rebalancePending.manualIndex=null;
AccOwners._renderRebalancePanel();
},
// setRebalanceManualOwner(val) -- dipanggil dari dropdown pemilih pemilik manual.
setRebalanceManualOwner(val){
if(!AccOwners._rebalancePending)return;
const idx=parseInt(val,10);
AccOwners._rebalancePending.manualIndex=isFinite(idx)?idx:null;
AccOwners._renderRebalancePanel();
},
// applyRebalance() -- tulis hasil calculateRebalance() (metode & pilihan manual yang SEDANG
// aktif di panel) ke AccOwners._draft, lalu render ulang list PENUH (aman -- ini aksi diskrit
// dari tap tombol, bukan tiap ketikan, jadi tidak ada masalah fokus/kursor input yang hilang
// sama seperti addRow/removeRow). Baris yang porsinya berubah ditandai _touched (konsisten shape
// draft dgn Aset, walau field ini belum dibaca di tempat lain pada AccOwners).
applyRebalance(){
const pending=AccOwners._rebalancePending;
if(!pending)return;
if(typeof calculateRebalance!=='function'){toast('⚠️ Fitur penyesuaian porsi belum siap dimuat');return;}
const draft=Array.isArray(AccOwners._draft)?AccOwners._draft:[];
const calc=calculateRebalance(draft,pending.editedIndex,pending.method,pending.manualIndex);
if(!calc||!calc.ok){toast('⚠️ Penyesuaian tidak bisa diterapkan, coba metode lain');return;}
calc.adjustments.forEach((a)=>{
if(!draft[a.index])return;
draft[a.index].porsi=a.to;
draft[a.index]._touched=true;
});
AccOwners._rebalancePending=null;
AccOwners._renderList();
toast('✅ Porsi pemilik lama disesuaikan otomatis');
},
// cancelRebalance() -- tutup panel TANPA mengubah draft sama sekali (porsi yang baru diketik
// user tetap seperti apa adanya, termasuk kalau totalnya masih >100% -- total box di atas akan
// terus tampilkan peringatan merah sampai user edit ulang sendiri).
cancelRebalance(){
AccOwners._rebalancePending=null;
AccOwners._renderRebalancePanel();
},
};

if(typeof window!=='undefined'){
window.AccOwners=AccOwners;
}
