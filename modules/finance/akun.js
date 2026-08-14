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
||(D.investments||[]).some(h=>h.accountId===acc.id);
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
const confirmMsg=hasLinkedData
?`Hapus akun "${acc.name}"? Transaksi, tagihan, catatan BBM/servis, transaksi Shop, Target Tabungan, Aset, dan Holding Investasi yang terkait akan dipindahkan ke akun "${target.name}".`
:`Hapus akun "${acc.name}"? Akun ini tidak punya data transaksi terkait.`;
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
AccOwners._renderList();
openModal('accountOwnersModal');
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
const owners=draft.map((o)=>{
let ownerId;
if(o.ownerId&&String(o.ownerId).trim()){
ownerId=String(o.ownerId).trim();
}else if(o.isSelf&&!selfIdUsed){
ownerId='SELF';
selfIdUsed=true;
}else if(!o.isSelf&&typeof OwnerRegistry!=='undefined'){
ownerId=OwnerRegistry.findOrCreate(o.ownerName.trim());
}else{
ownerId=String(uid());
}
return{ownerId,ownerName:o.ownerName.trim(),porsi:o.porsi,isSelf:!!o.isSelf};
});
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
AccOwners._renderList();
},
};

if(typeof window!=='undefined'){
window.AccOwners=AccOwners;
}
