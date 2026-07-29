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
populateKeuFilters();
}
/* moved to modules-render.js: renderAccGrid */
function linkedAssetAccountIds(){
return new Set((D.assets||[]).filter(a=>a.accountId).map(a=>String(a.accountId)));
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
||(D.assets||[]).some(a=>a.accountId===acc.id);
let target=others[0];
if(hasLinkedData&&others.length>1){
const choices=others.map(a=>({label:`${a.emoji||'💰'} ${a.name} (saldo ${fmt(recalcAccBalance(a.id))})`}));
const linkedTargetsCount=(D.targets||[]).filter(t=>t.accountId===acc.id).length;
const linkedAssetsCount=(D.assets||[]).filter(a=>a.accountId===acc.id).length;
let extraNote='';
if(linkedTargetsCount>0)extraNote+=` ${linkedTargetsCount} Target Tabungan`;
if(linkedAssetsCount>0)extraNote+=`${extraNote?' &':''} ${linkedAssetsCount} Aset`;
const pickedIdx=await showChoiceModal({title:'Pindahkan Data ke Akun Mana?',icon:'🔀',message:`Akun "${acc.name}" punya transaksi/tagihan/catatan yang terkait${extraNote?' (termasuk'+extraNote+' yang ditautkan)':''}. Pilih akun tujuan buat pindahin datanya sebelum akun ini dihapus:`,choices});
if(pickedIdx===null||pickedIdx===undefined)return; // dibatalkan, akun TIDAK jadi dihapus
target=others[pickedIdx];
}
const confirmMsg=hasLinkedData
?`Hapus akun "${acc.name}"? Transaksi, tagihan, catatan BBM/servis, transaksi Shop, Target Tabungan, dan Aset yang terkait akan dipindahkan ke akun "${target.name}".`
:`Hapus akun "${acc.name}"? Akun ini tidak punya data transaksi terkait.`;
if(!await askConfirm(confirmMsg))return;
D.accounts.splice(i,1);
D.transactions.forEach(t=>{if(t.accountId===acc.id)t.accountId=target.id;});
(D.bills||[]).forEach(b=>{if(b.accountId===acc.id)b.accountId=target.id;});
(D.bbmLogs||[]).forEach(b=>{if(b.accountId===acc.id)b.accountId=target.id;});
(D.servisLogs||[]).forEach(s=>{if(s.accountId===acc.id)s.accountId=target.id;});
(D.targets||[]).forEach(t=>{if(t.accountId===acc.id)t.accountId=target.id;});
(D.assets||[]).forEach(a=>{if(a.accountId===acc.id)a.accountId=target.id;});
(D.cobek||[]).forEach(c=>{if(c.accountId===acc.id)c.accountId=target.id;});
save();renderAccGrid();populateAccFilters();renderDashAccList();renderLapAccList();renderDashboard();renderKeuangan();refreshBillEverywhere();renderCnTab();toast(hasLinkedData?`🗑 Akun dihapus, semua data terkait dipindah ke "${target.name}"`:`🗑 Akun "${acc.name}" dihapus`);
}
