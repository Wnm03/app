// CATATAN (Sesi 297): file ini adalah runtime app (bukan file test Node), tapi
// namanya cocok pola default `node --test` (*-test.js) sehingga bisa ke-load &
// "gagal" kalau `node --test` dijalankan TANPA argumen di root. `npm test`
// sudah aman (lihat package.json: `node --test tests/*.test.js`, membatasi
// hanya folder tests/) — lihat juga catatan di README.md bagian Testing.
// self-test.js — Runtime & daftar test case self-test/smoke-test aplikasi (Diagnostik):
// getSelfTestCases() (daftar besar test case), helper _selfTestAssert/findMissingAriaLabels,
// badge status, tes navigasi halaman (computeNavSmokePageNames), sapuan modal
// (computeModalSweepFnNames/Coverage & spec-spec-nya), cek z-index stacking
// (computeZIndexStackingResults), dan init() (bootstrap utama app).
// Digabung dari self-test-cases.js + self-test-runtime.js (awalnya dipisah jadi 2 file di Sesi 3
// restrukturisasi folder, blok 3a/3b — lihat docs/AUDIT-SESI-1-features-sheets-pwa-selftest.js).
// PENTING kenapa digabung lagi: getSelfTestCases() adalah SATU array/fungsi yang dulu terpotong
// persis di tengah (di dalam sebuah blok try{}), jadi ke-2 file lama itu masing-masing BUKAN JS
// yang valid berdiri sendiri (self-test-cases.js: 4 kurung kurawal '{' nganggur belum ditutup;
// self-test-runtime.js: dibuka dgn '} finally {' yang menyambung file sebelumnya). Ini bikin
// linter/node --check per-file selalu false-positive error, & app bisa crash total kalau urutan
// build.js berubah/salah satu file di-lazy-load terpisah. Digabung jadi 1 file spy VALID sendiri.

function _selfTestAssert(cond,msg){ if(!cond) throw new Error(msg||'Gagal'); }
// Cek elemen [data-action] yang cuma berisi ikon/emoji tanpa teks & tanpa aria-label/aria-labelledby --
// screen reader tidak bisa menjelaskan fungsi tombol semacam ini ke pengguna tunanetra.
// Diberi parameter `root` (default: seluruh document) supaya bisa dipakai 2 cara:
//   1. Dipanggil dari test case "Tes Otomatis" biasa (root=document) -- cuma nyisir apa yang
//      lagi ke-render di layar saat itu (halaman aktif + elemen persisten seperti nav bar).
//   2. Dipanggil per-halaman dari Tes Navigasi Halaman (root=elemen #page-xxx) setelah tiap
//      showPage(), supaya SEMUA halaman ikut disisir dalam satu klik, bukan cuma yang lagi aktif.
function findMissingAriaLabels(root){
const scope=root||document;
const problems=[];
scope.querySelectorAll('[data-action]').forEach(el=>{
if(el.hasAttribute('aria-label')||el.hasAttribute('aria-labelledby'))return;
const text=(el.textContent||'').replace(/[^a-zA-Z]/g,'');
if(text.length>=3)return; // ada teks yang cukup terbaca oleh screen reader
problems.push('Elemen <'+el.tagName.toLowerCase()+' id="'+(el.id||'-')+'" data-action="'+el.getAttribute('data-action')+'"> cuma berisi ikon/emoji/teks pendek tanpa aria-label -- screen reader tidak akan bisa menjelaskan fungsi tombol ini.');
});
return problems;
}
function getSelfTestCases(){
// Compatibility facade: test-case definitions live in their own module.
return typeof __kwSelfTestCases==='function'?__kwSelfTestCases():[];
}

async function computeSelfTestResults(){
// BUGFIX (sesi 315 — laporan user: "Tes Otomatis" 101/102, 1 gagal "SewaKios
// is not defined"): sama root cause dgn fix modal sweep (computeModalSweepResults())
// -- SewaKios (modules/business/sewakios.js) & Renov (modules/home/renovasi.js,
// dipakai SewaKios.roi() lewat Renov.totals()) dikeluarkan dari bundle,
// lazy-load on-demand saat tab Aset & Proyek dibuka. Tes Otomatis biasa
// dijalankan dari Dashboard/Diagnostik, bukan dari tab itu, jadi modulnya
// belum tentu termuat -> "X is not defined" palsu, bukan bug sungguhan.
// Muat dulu di sini, try/catch spy per-modul (1 modul gagal offline dll
// tidak boleh menjatuhkan seluruh rangkaian tes lain).
// BUGFIX (sesi 316 — laporan lanjutan: preload di atas SUDAH jalan tapi
// "SewaKios is not defined" tetap muncul) -- root cause SEBENARNYA bukan
// urutan kode, tapi ensureSewaKios()/ensureRenov() itu sendiri GAGAL (file
// modul gagal dimuat dari hosting/jaringan), lalu ditelan diam-diam oleh
// catch block kosong di bawah. Sekarang alasan gagal-muat disimpan, supaya
// kalau ADA case yg gagal karena modul ini, pesannya jujur ("modul gagal
// dimuat: ...") -- bukan "X is not defined" yang menyesatkan (terlihat
// seperti bug kode, padahal sebenarnya file tidak berhasil di-fetch).
let _lazyLoadFailNote='';
try{ if(typeof ensureRenov==='function') await ensureRenov(); }catch(e){ _lazyLoadFailNote+=' | modules/home/renovasi.js gagal dimuat: '+(e&&e.message||e); }
try{ if(typeof ensureSewaKios==='function') await ensureSewaKios(); }catch(e){ _lazyLoadFailNote+=' | modules/business/sewakios.js gagal dimuat: '+(e&&e.message||e); }
const cases=getSelfTestCases();
const results=[];
// S622: banyak test case di atas manggil FUNGSI ASLI aplikasi (mis.
// WorthIt.undoBought()) yg py efek samping toast() sungguhan -- kalau tidak
// diredam, tes yg jalan otomatis (autoRunSelfTestIfNeeded, lihat komentar
// _toastSuppressed di format-tema.js) membanjiri antrean toast & menutupi
// tombol di tab manapun yg sedang aktif user, PADAHAL bukan feedback utk aksi
// user sungguhan. Redam SELAMA loop eksekusi test case saja -- assert &
// logic tes 0 berubah, toast RINGKASAN akhir (di runSelfTest()/
// autoRunSelfTestIfNeeded() sesudah fungsi ini return) tetap tampil normal
// krn dipanggil setelah suppress dimatikan lagi di finally.
if(typeof setToastSuppressed==='function')setToastSuppressed(true);
try{
for(const c of cases){
try{ await c.fn(); results.push({name:c.name,pass:true}); }
catch(e){
let msg=e.message;
if(_lazyLoadFailNote && /\b(Renov\w*|SewaKios)\b is not defined/.test(msg)) msg+=' — BUKAN bug kode: '+_lazyLoadFailNote.replace(/^ \| /,'');
results.push({name:c.name,pass:false,error:msg});
}
}
}finally{
if(typeof setToastSuppressed==='function')setToastSuppressed(false);
}
const passCount=results.filter(r=>r.pass).length;
return {results,passCount,total:results.length,failCount:results.length-passCount,ranAt:new Date().toISOString()};
}
let _lastSelfTestData=null;
let _lastNavSmokeData=null;
let _lastModalSweepData=null;
/* moved to modules-render.js: renderSelfTestResults */
/* moved to modules-render.js: renderSelfTestLastResult */
function saveSelfTestState(data){
try{
safeSetItem('kw_selftest_last',JSON.stringify(data));
}catch(e){ console.warn('Gagal simpan status tes diagnostik:',e); }
updateSelfTestBadge(data.failCount>0);
}
function updateSelfTestBadge(hasFail){
const badge=document.getElementById('selfTestNavBadge');
if(badge) badge.style.display=hasFail?'block':'none';
// Sinkron ke badge tab "🧪 Diagnostik" di dalam Pengaturan (lihat
// pengaturan-search.js) supaya statusnya kelihatan juga di level tab,
// tidak cuma di ikon ⚙️ header.
const tabBadge=document.getElementById('stgTabBadgeDiag');
if(tabBadge) tabBadge.classList.toggle('u-dnone',!hasFail);
}
async function runSelfTest(){
const _scrollRootEl=document.getElementById('scrollRoot');
const _savedScrollTop=_scrollRootEl?_scrollRootEl.scrollTop:0;
const data=await computeSelfTestResults();
renderSelfTestResults(data);
saveSelfTestState(data);
if(_scrollRootEl) _scrollRootEl.scrollTop=_savedScrollTop;
toast(data.failCount===0?'✅ Semua tes berhasil ('+data.passCount+'/'+data.total+')':'⚠️ '+data.failCount+' tes gagal');
return data;
}
window.runHeadlessSelfTest=computeSelfTestResults;
async function copySelfTestResults(){
if(!_lastSelfTestData){toast('⚠️ Jalankan tes dulu sebelum menyalin hasil');return;}
const d=_lastSelfTestData;
const lines=[
'Hasil Tes Otomatis — Keluarga W',
new Date(d.ranAt).toLocaleString('id-ID'),
d.passCount+'/'+d.total+' berhasil'+(d.failCount>0?', '+d.failCount+' gagal':''),
'',
...d.results.map(r=>(r.pass?'✅ ':'❌ ')+r.name+(r.pass?'':'\n   → '+r.error))
];
const text=lines.join('\n');
try{
if(navigator.clipboard&&navigator.clipboard.writeText){
await navigator.clipboard.writeText(text);
} else {
const ta=document.createElement('textarea');
ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
document.body.appendChild(ta); ta.select();
document.execCommand('copy'); document.body.removeChild(ta);
}
toast('📋 Hasil tes disalin');
}catch(e){
toast('⚠️ Gagal menyalin, coba lagi');
}
}
// repairTitipanOrphans() — S595, awalnya cuma cabang `orphan`. Nama fungsi
// (& data-action="repairTitipanOrphans" di app_production.html/index.html)
// SENGAJA TIDAK diganti sesi ini -- ganti nama butuh sinkron 2 file HTML +
// bundle sekaligus tanpa nilai tambah fungsional, risiko typo lebih besar
// drpd manfaatnya. Tombol EKSPLISIT terpisah dari "▶️ Jalankan Tes" (yang
// SENGAJA tetap 0-mutasi, lihat hint di bawah kartu Tes Otomatis: "Tidak
// menambah/mengubah data asli Anda secara permanen").
//
// BUGFIX S621 (audit gap "tombol Perbaiki Gap Dana Titipan tidak
// menghilangkan gap missing"): hint di app_production.html/index.html
// SUDAH LAMA menjanjikan tombol ini "membuat baris ... yang belum tercatat
// (missing), dan/atau menghapus baris ... (orphan)" -- TAPI versi fungsi
// ini SEBELUM S621 cuma pernah memanggil TitipanReconcile.repairOrphans()
// (orphan-only, lihat komentar fungsi itu). Kalau gap yang terdeteksi murni
// `missing` (contoh nyata: Tes Otomatis melaporkan "sync.ok=false
// (missing:1 orphan:0 mismatch:0)"), cabang paling atas
// `if(pre.ok||!pre.orphan.length)` langsung toast "tidak ada gap orphan"
// dan RETURN tanpa berbuat apa-apa -- tombol terlihat sukses (ada toast)
// tapi gap missing yang dilaporkan Tes Otomatis tetap ada & muncul lagi
// identik tiap Tes Otomatis dijalankan ulang (persis gejala di laporan).
// Fix: panggil KEDUA sisi (TitipanReconcile.repairMissing() -- baru,
// S621 -- utk cabang missing; repairOrphans() -- S595, TIDAK diubah -- utk
// cabang orphan), masing-masing HANYA kalau sisi itu memang punya gap.
// Keduanya MENGUBAH data (bikin/hapus baris Buku Utang) makanya tetap satu
// askConfirm() sebelum keduanya, konsisten dgn kontrak lama tombol ini.
//
// BUGFIX S675-lanjutan (audit "repairTitipanOrphans() buta terhadap cabang
// Akun", pola bug SAMA PERSIS S621 di atas -- cuma kambuh lagi di cabang
// yang ditambah BELAKANGAN setelah fix S621, jadi tidak ikut kesisir fix
// itu): sebelum ini, satu-satunya pre-check/confirm/repair di fungsi ini
// adalah TitipanReconcile.check() -- cabang Aset+Investasi SAJA. Kalau
// TitipanReconcile.checkAccounts() (cabang Akun berdiri-sendiri, lihat
// titipan-reconcile.js) melapor gap SEMENTARA cabang Aset/Investasi bersih
// (mis. restore backup lama dari sebelum fitur sync Akun ada, atau skenario
// apa pun sebelum save() sempat jalan sekali -- save() SUDAH memanggil
// TitipanSync.reconcileAccounts() tiap kali, lihat features-helpers-global-
// security.js, tapi kalau save() belum pernah jalan gap-nya tetap ada),
// cabang `if(pre.ok)` di atas langsung toast "tidak ada gap" & RETURN --
// FALSE ALL-CLEAR persis gejala S621, padahal Tes Otomatis sedang melapor
// `accountSync.ok=false`. Fix: pre-check & confirm dialog sekarang ikut
// baca checkAccounts(); kalau ada gap di situ, TitipanSync.reconcileAccounts()
// (sudah idempotent, sudah dipakai di save()) ikut dipanggil di dalam
// askConfirm() yang sama (0 dialog tambahan -- 1 tombol, 1 konfirmasi,
// ketiga cabang). Guard ganda `typeof TitipanReconcile.checkAccounts`/
// `typeof TitipanSync.reconcileAccounts` -- kalau salah satu belum dimuat,
// cabang Akun dilewati diam-diam (0 regresi ke behavior lama, sama pola
// guard lain di fungsi ini).
//
// WIRING SESI FIX-2026-09-01-lanjutan2 (menutup gap dicatat di
// SESSION-NOTE-FIX-2026-09-01-lanjutan2.md: "sesi lalu baru menyediakan
// repairOwnerIdConsistency()/repairDebtNameStaleness()/
// repairTransactionOwnerRefs(), BELUM disambungkan ke tombol/data-action apa
// pun"). Pola SAMA PERSIS penambahan cabang Akun (S675-lanjutan) di atas --
// 3 pre-check baru (checkOwnerIdConsistency/checkDebtNameStaleness/
// checkTransactionOwnerRefs) ikut dibaca di pre-check/pesan konfirmasi, 3
// repair barunya ikut dipanggil di DALAM askConfirm() yang SAMA (0 dialog
// tambahan -- tetap 1 tombol, 1 konfirmasi, sekarang total 6 cabang: 2 lama
// (missing/orphan) + Akun + 3 baru). Guard `typeof TitipanReconcile.check*`/
// `repair*` per cabang, pola sama seluruh cabang lain di fungsi ini --
// build lama yang belum sempat upload titipan-reconcile.js terbaru tetap
// aman (cabang itu dilewati diam-diam, bukan crash).
// `ownerConflicts`/`txUnresolved` (dari repairOwnerIdConsistency()/
// repairTransactionOwnerRefs(), lihat komentar keduanya di
// titipan-reconcile.js) SENGAJA TIDAK menghentikan/mem-block toast sukses --
// keduanya kasus yang MEMANG butuh review manual (bukan bug), jadi cukup
// dicatat ke console.warn (pola sama `unresolved` cabang missing yang sudah
// ada), tidak mengganggu alur.
async function repairTitipanOrphans(){
if(typeof TitipanReconcile==='undefined'){
toast('⚠️ Modul TitipanReconcile belum termuat');
return;
}
const pre=TitipanReconcile.check();
const preAcc=(typeof TitipanReconcile.checkAccounts==='function')?TitipanReconcile.checkAccounts():{ok:true,missing:[],orphan:[]};
const preOwnerId=(typeof TitipanReconcile.checkOwnerIdConsistency==='function')?TitipanReconcile.checkOwnerIdConsistency():{ok:true,divergent:[]};
const preDebtName=(typeof TitipanReconcile.checkDebtNameStaleness==='function')?TitipanReconcile.checkDebtNameStaleness():{ok:true,stale:[]};
const preTxOwner=(typeof TitipanReconcile.checkTransactionOwnerRefs==='function')?TitipanReconcile.checkTransactionOwnerRefs():{ok:true,orphan:[]};
// Fix (poin 4, sesi lanjutan hasil audit 2026-09-01): backlog
// checkPendingOwnerReview() (transaksi yg deductionOwnerId-nya dikosongkan
// run SEBELUMNYA & belum diisi ulang manual) HARUS tetap kelihatan walau
// ke-5 sub-check di atas kebetulan sudah bersih run ini -- kalau dihitung
// SETELAH early-return "tidak ada gap" ini, backlog lama jadi tidak pernah
// ketoast lagi (early-return keburu keluar duluan). Dihitung di sini,
// SEBELUM early-return, supaya kedua jalur (ada gap baru / tidak ada gap
// baru) sama-sama ikut menyebutkannya.
const prePendingReview=(typeof TitipanReconcile.checkPendingOwnerReview==='function')?TitipanReconcile.checkPendingOwnerReview():{ok:true,pending:[]};
// Fix (poin 1, sesi lanjutan): backlog checkOwnerIdConflicts() (grup nama
// pemilik yang dilewati repairOwnerIdConsistency() krn tabrakan -- lihat
// komentar lengkap di titipan-reconcile.js) HARUS tetap kelihatan juga
// walau ke-5 sub-check di atas sudah bersih run ini, pola SAMA PERSIS
// prePendingReview di atas -- dihitung SEBELUM early-return.
const preOwnerConflicts=(typeof TitipanReconcile.checkOwnerIdConflicts==='function')?TitipanReconcile.checkOwnerIdConflicts():{ok:true,conflicts:[]};
if(pre.ok&&preAcc.ok&&preOwnerId.ok&&preDebtName.ok&&preTxOwner.ok){
const backlogMsgs=[];
if(prePendingReview.pending.length){
const idPreview=prePendingReview.pending.slice(0,5).map(p=>p.txId).join(', ')+(prePendingReview.pending.length>5?', dst':'');
backlogMsgs.push('📝 '+prePendingReview.pending.length+' transaksi lama perlu diisi ulang pemilik potongannya manual (id: '+idPreview+')');
}
if(preOwnerConflicts.conflicts.length){
const namePreview=Array.from(new Set(preOwnerConflicts.conflicts.map(c=>c.name))).slice(0,5).join(', ');
backlogMsgs.push('⚠️ '+preOwnerConflicts.conflicts.length+' baris kepemilikan bertabrakan (nama: '+namePreview+') butuh review manual');
}
if(backlogMsgs.length){
toast('✅ Tidak ada gap Dana Titipan baru. Tapi masih ada backlog lama: '+backlogMsgs.join('; '));
}else{
toast('✅ Tidak ada gap Dana Titipan yang perlu diperbaiki');
}
return;
}
const parts=[];
if(pre.missing.length)parts.push(pre.missing.length+' baris yang seharusnya ada tapi belum tercatat (missing)');
if(pre.orphan.length)parts.push(pre.orphan.length+' baris yang pemiliknya sudah tidak ada (orphan)');
if(!preAcc.ok)parts.push((preAcc.missing.length+preAcc.orphan.length)+' baris dana titipan akun berdiri-sendiri belum tersinkron');
if(!preOwnerId.ok)parts.push(preOwnerId.divergent.length+' nama pemilik dgn ID tidak konsisten antar Aset/Investasi');
if(!preDebtName.ok)parts.push(preDebtName.stale.length+' nama di Buku Utang basi (belum sinkron pasca ganti nama pemilik)');
if(!preTxOwner.ok)parts.push(preTxOwner.orphan.length+' transaksi menunjuk pemilik potongan yang sudah tidak valid');
const ok=await askConfirm(
'Ditemukan '+parts.join(' & ')+'. Baris "missing" akan DIBUAT/disinkron ulang (disamakan dgn porsi kepemilikan Aset/Investasi saat ini), baris "orphan" akan DIHAPUS dari Buku Utang'+(!preAcc.ok?', baris dana titipan akun berdiri-sendiri akan disinkron ulang (mengikuti saldo akun saat ini)':'')+(!preOwnerId.ok?', ID pemilik bernama sama akan disatukan ke 1 ID (mengutamakan yang sudah terdaftar, kasus yang bertabrakan dilewati utk review manual)':'')+(!preDebtName.ok?', nama di Buku Utang akan disamakan ke nama pemilik terbaru':'')+(!preTxOwner.ok?', pemilik potongan transaksi yang sudah tidak valid akan diperbarui (atau dikosongkan kalau ambigu)':'')+'. Lanjutkan?',
{title:'Perbaiki Gap Dana Titipan',icon:'🔧',okText:'Ya, Perbaiki',danger:true}
);
if(!ok)return;
let synced=0,removed=0,unresolved=[];
if(pre.missing.length&&typeof TitipanReconcile.repairMissing==='function'){
const rm=TitipanReconcile.repairMissing();
synced=rm.synced;
unresolved=rm.unresolved||[];
}
if(pre.orphan.length&&typeof TitipanReconcile.repairOrphans==='function'){
const ro=TitipanReconcile.repairOrphans();
removed=ro.removed;
}
let accSynced=0,accRemoved=0;
if(!preAcc.ok&&typeof TitipanSync!=='undefined'&&typeof TitipanSync.reconcileAccounts==='function'){
const ra=TitipanSync.reconcileAccounts();
accSynced=ra.synced||0;
accRemoved=ra.removed||0;
}
let ownerUnified=0,ownerConflicts=[];
if(!preOwnerId.ok&&typeof TitipanReconcile.repairOwnerIdConsistency==='function'){
const ru=TitipanReconcile.repairOwnerIdConsistency();
ownerUnified=ru.unified;
ownerConflicts=ru.conflicts||[];
}
let debtNameSynced=0;
if(!preDebtName.ok&&typeof TitipanReconcile.repairDebtNameStaleness==='function'){
const rd=TitipanReconcile.repairDebtNameStaleness();
debtNameSynced=rd.synced;
}
let txFixed=0,txCleared=0,txUnresolved=[];
if(!preTxOwner.ok&&typeof TitipanReconcile.repairTransactionOwnerRefs==='function'){
const rt=TitipanReconcile.repairTransactionOwnerRefs();
txFixed=rt.fixed;
txCleared=rt.cleared;
txUnresolved=rt.unresolved||[];
}
if(synced>0||removed>0||accSynced>0||accRemoved>0||ownerUnified>0||debtNameSynced>0||txFixed>0||txCleared>0){
save();
const msgs=[];
if(synced>0)msgs.push(synced+' aset/holding disinkron ulang');
if(removed>0)msgs.push(removed+' baris orphan dibersihkan');
if(accSynced>0||accRemoved>0)msgs.push('akun berdiri-sendiri disinkron ('+accSynced+' disinkron'+(accRemoved>0?', '+accRemoved+' dibersihkan':'')+')');
if(ownerUnified>0)msgs.push(ownerUnified+' baris ID pemilik disatukan');
if(debtNameSynced>0)msgs.push(debtNameSynced+' nama di Buku Utang disinkron');
if(txFixed>0||txCleared>0)msgs.push('pemilik potongan transaksi diperbaiki ('+txFixed+' disesuaikan'+(txCleared>0?', '+txCleared+' dikosongkan':'')+')');
toast('🔧 '+msgs.join(', '));
}else{
toast('✅ Tidak ada baris yang diubah (gap sudah bersih)');
}
if(unresolved.length&&typeof console!=='undefined'&&console.warn){
console.warn('[repairTitipanOrphans] gap "missing" tidak bisa diperbaiki otomatis -- aset/holding sumbernya sudah tidak ada di data:',unresolved);
}
if(ownerConflicts.length&&typeof console!=='undefined'&&console.warn){
console.warn('[repairTitipanOrphans] grup nama pemilik dilewati krn tabrakan (1 entity sudah punya >1 ID sekaligus) -- butuh review manual:',ownerConflicts);
}
if(txUnresolved.length&&typeof console!=='undefined'&&console.warn){
console.warn('[repairTitipanOrphans] deductionOwnerId transaksi dikosongkan (owner valid ambigu/tidak ada) -- butuh isi ulang manual:',txUnresolved);
}
// Fix (poin 4, sesi lanjutan hasil audit 2026-09-01): `txUnresolved` di atas
// cuma console.warn (devtools tidak kebuka di HP -- lihat catatan sesi ini),
// jadi user awam tidak pernah tahu ada transaksi yang perlu diisi ulang
// pemiliknya. checkPendingOwnerReview() (titipan-reconcile.js) membaca
// SELURUH backlog (bukan cuma yang barusan di-cleared run ini -- termasuk
// yang tertunda dari run sebelumnya & belum diisi manual), jadi toast ini
// tetap muncul tiap tombol ditekan selama backlog belum kosong, bukan cuma
// sesaat setelah cleared>0.
if(typeof TitipanReconcile.checkPendingOwnerReview==='function'){
const pendingReview=TitipanReconcile.checkPendingOwnerReview().pending;
if(pendingReview.length){
const idPreview=pendingReview.slice(0,5).map(p=>p.txId).join(', ')+(pendingReview.length>5?', dst':'');
toast('📝 '+pendingReview.length+' transaksi perlu diisi ulang pemilik potongannya manual di Buku Transaksi (id: '+idPreview+')');
}
}
// Fix (poin 1, sesi lanjutan): `ownerConflicts` di atas juga cuma
// console.warn -- toast backlog tambahan di sini, pola SAMA PERSIS
// pendingOwnerReview barusan. Dihitung ULANG via checkOwnerIdConflicts()
// (bukan pakai `ownerConflicts` run ini saja) supaya backlog dari run
// SEBELUMNYA yang belum direview manual juga ikut kelihatan.
if(typeof TitipanReconcile.checkOwnerIdConflicts==='function'){
const conflictsNow=TitipanReconcile.checkOwnerIdConflicts().conflicts;
if(conflictsNow.length){
const namePreview=Array.from(new Set(conflictsNow.map(c=>c.name))).slice(0,5).join(', ');
toast('⚠️ '+conflictsNow.length+' baris kepemilikan bertabrakan (nama: '+namePreview+') butuh review manual -- lihat Aset/Investasi');
}
}
if(typeof runSelfTest==='function') runSelfTest();
}
// Derive daftar halaman langsung dari DOM (.page[id^="page-"]), bukan list statis --
// pola yg sama dgn computeModalSweepFnNames() (nyari otomatis semua fungsi openXModal).
// Kalau nanti nambah <div class="page" id="page-xxx">, halaman itu otomatis ikut kesisir
// tanpa perlu ingat update list manual di sini.
function computeNavSmokePageNames(){
const names=[];
document.querySelectorAll('.page[id^="page-"]').forEach(el=>{
names.push(el.id.replace(/^page-/,''));
});
return names;
}
// Tes Navigasi Halaman: pindah ke tiap halaman satu-satu (showPage), sekaligus jalankan cek
// aria-label (findMissingAriaLabels) di halaman yg baru saja dirender. Kenapa digabung di sini:
// cek aria-label yg berdiri sendiri di "Tes Otomatis" cuma nyisir elemen yg KEBETULAN lagi
// ke-render di layar saat tombol itu ditekan (biasanya cuma 1 halaman) -- halaman lain yg
// belum pernah dikunjungi sejak app dibuka isinya masih kosong (renderPageContent belum
// dipanggil), jadi elemen [data-action] di dalamnya tidak ikut kesisir & pelanggaran aria-label
// di sana bisa lolos tanpa ketahuan. Dengan memasang cek ini di tiap iterasi showPage() di
// bawah, satu klik "Tes Navigasi Halaman" otomatis menyisir aria-label di SEMUA halaman yg
// ADA DI DOM (computeNavSmokePageNames()), bukan cuma halaman yg lagi aktif -- dan otomatis
// ikut halaman baru tanpa perlu update list manual.
async function computeNavSmokeTestResults(){
const originalActive=document.querySelector('.page.active');
const originalName=originalActive?originalActive.id.replace('page-',''):'dashboard';
const _scrollRootEl=document.getElementById('scrollRoot');
const _savedScrollTop=_scrollRootEl?_scrollRootEl.scrollTop:0;
const results=[];
let caughtErr=null;
const onErr=(e)=>{ caughtErr=(e&&e.error&&e.error.message)||(e&&e.message)||String(e); };
window.addEventListener('error',onErr);
const pageNames=computeNavSmokePageNames();
for(const name of pageNames){
caughtErr=null;
let pass=true,error=null;
try{
showPage(name);
await new Promise(r=>setTimeout(r,30));
if(caughtErr){ pass=false; error=caughtErr; }
const pageEl=document.getElementById('page-'+name);
const a11yIssues=findMissingAriaLabels(pageEl||document);
if(a11yIssues.length){
pass=false;
const a11yMsg='🔍 Aksesibilitas: '+a11yIssues.length+' elemen tanpa aria-label -- '+a11yIssues[0]+(a11yIssues.length>1?' (+'+(a11yIssues.length-1)+' pelanggaran lain di halaman ini)':'');
error=error?error+' | '+a11yMsg:a11yMsg;
}
}catch(e){ pass=false; error=e.message; }
results.push({name,pass,error});
}
window.removeEventListener('error',onErr);
try{ showPage(originalName); }catch(e){ /* best-effort balikin halaman semula; kalau gagal (mis. halaman sudah tidak valid di tengah sweep) diamkan, sweep tetap lanjut */ }
if(_scrollRootEl) _scrollRootEl.scrollTop=_savedScrollTop;
const passCount=results.filter(r=>r.pass).length;
return {results,passCount,total:results.length,failCount:results.length-passCount,ranAt:new Date().toISOString()};
}
/* moved to modules-render.js: renderNavSmokeResults */
async function runNavSmokeTest(){
const data=await computeNavSmokeTestResults();
renderNavSmokeResults(data);
toast(data.failCount===0?'✅ Navigasi & aksesibilitas semua halaman aman ('+data.passCount+'/'+data.total+')':'⚠️ '+data.failCount+' halaman bermasalah (error JS dan/atau aria-label), cek daftar di bawah');
}
// Sama seperti copySelfTestResults() -- disalin ke clipboard buat ditempel ke
// WA/laporan ke diri sendiri pas lagi debug. `error` di tiap hasil sudah berupa
// gabungan (error JS dan/atau pelanggaran aria-label, dipisah " | " kalau dua-duanya
// ada -- lihat computeNavSmokeTestResults), jadi otomatis ikut tersalin apa adanya.
async function copyNavSmokeResults(){
if(!_lastNavSmokeData){toast('⚠️ Jalankan tes navigasi dulu sebelum menyalin hasil');return;}
const d=_lastNavSmokeData;
const lines=[
'Hasil Tes Navigasi & Aksesibilitas — Keluarga W',
new Date(d.ranAt).toLocaleString('id-ID'),
d.passCount+'/'+d.total+' halaman aman'+(d.failCount>0?', '+d.failCount+' bermasalah':''),
'',
...d.results.map(r=>(r.pass?'✅ ':'❌ ')+r.name+(r.pass?'':'\n   → '+r.error))
];
const text=lines.join('\n');
try{
if(navigator.clipboard&&navigator.clipboard.writeText){
await navigator.clipboard.writeText(text);
} else {
const ta=document.createElement('textarea');
ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
document.body.appendChild(ta); ta.select();
document.execCommand('copy'); document.body.removeChild(ta);
}
toast('📋 Hasil tes navigasi disalin');
}catch(e){
toast('⚠️ Gagal menyalin, coba lagi');
}
}
// MODAL_SWEEP_MANUAL_OVERRIDE_FNS (S555): fungsi yang cocok pola regex
// /^open[A-Z]\w*Modal$/ (jadi otomatis ke-tangkap computeModalSweepFnNames())
// TAPI nama fungsinya TIDAK mencerminkan id modal yang benar-benar dibuka --
// openTxLinkedServisModal() (tx-servis.js) misalnya JUSTRU menutup txModal
// lalu membuka #servisModal lewat Servis.openModal() (jembatan txEditId ->
// servisLinkId, bukan modal sendiri), jadi tebakan id otomatis
// "txLinkedServisModal" SELALU meleset -- terdeteksi "elemen #txLinkedServisModal
// tidak ditemukan (tebakan id salah?)" di Tes Buka/Tutup Modal padahal
// fungsinya sendiri tidak bermasalah. Fungsi di set ini dikeluarkan dari
// tebakan otomatis & didaftarkan manual dengan id+call yang benar di
// RISKY_OPENER_SPECS (pola sama openCicilanHistoryFromTx), supaya tetap
// tercakup coverage tanpa laporan salah tebak id.
const MODAL_SWEEP_MANUAL_OVERRIDE_FNS=new Set(['openTxLinkedServisModal']);
function computeModalSweepFnNames(){
const names=[];
for(const k in window){
if(/^open[A-Z]\w*Modal$/.test(k)&&typeof window[k]==='function'&&!MODAL_SWEEP_MANUAL_OVERRIDE_FNS.has(k))names.push(k);
}
return names.sort();
}
const EXTRA_MODAL_SWEEP_SPECS=[
{fn:'openQS',args:['qsKeuangan'],id:'qsKeuangan',close:()=>closeQS('qsKeuangan')},
{fn:'openQS',args:['qsBillActions'],id:'qsBillActions',close:()=>closeQS('qsBillActions')},
{fn:'openQS',args:['qsProdusenActions'],id:'qsProdusenActions',close:()=>closeQS('qsProdusenActions')},
{fn:'openQS',args:['qsAssetActions'],id:'qsAssetActions',close:()=>closeQS('qsAssetActions')},
{fn:'openQS',args:['qsShop'],id:'qsShop',close:()=>closeQS('qsShop')},
{fn:'openQS',args:['qsCarnotes'],id:'qsCarnotes',close:()=>closeQS('qsCarnotes')},
{fn:'openQS',args:['qsLaporan'],id:'qsLaporan',close:()=>closeQS('qsLaporan')},
{fn:'openQS',args:['qsAI'],id:'qsAI',close:()=>closeQS('qsAI')},
{fn:'openCalc',args:[undefined],id:'calcModal',close:()=>closeCalc()},
{fn:'openBillArchive',args:[],id:'billArchiveModal'},
{fn:'openBillCalendar',args:[],id:'billCalendarModal'},
{fn:'openBillHistory',args:[undefined],id:'billHistoryModal'},
{fn:'openBudgetSettings',args:[],id:'budgetSettingsModal'},
{fn:'openCatatan',args:['anak'],id:'catatanModal'},
{fn:'openCustomerDetail',args:[undefined],id:'customerDetailModal'},
{fn:'openGajiCalc',args:[],id:'gajiCalcModal'},
{fn:'openGlobalSearch',args:[],id:'globalSearchModal'},
{fn:'openWeeklyResetManual',args:[],id:'weeklyResetModal',close:()=>closeModal('weeklyResetModal')},
{fn:'showFilteredTx',args:['dashboard',undefined,'Tes Sweep'],id:'filterTxModal'},
{fn:'showQuickScanPicker',args:['__sweep_dummy_asset__',[1000,2000]],id:'quickScanModal'},
{fn:'editBillHistoryTx',args:['__sweep_dummy_tx__'],id:'billHistoryEditModal'},
{fn:'runDataHealthCheck',args:[],id:'dataHealthModal'},
{label:'VehicleCatalogUI.open()',id:'catalogModal',
call:()=>VehicleCatalogUI.open(),close:()=>closeModal('catalogModal')},
{label:'VehicleCatalogImportUI.open()',id:'vehCatalogImportModal',
call:()=>VehicleCatalogImportUI.open(),close:()=>closeModal('vehCatalogImportModal')},
{label:'SparepartOcrCatalogDetail.open()',id:'sparepartOcrDetailModal',
call:()=>{ SparepartOcrCatalogDetail.open({found:true,item:{partName:'(tes sweep)',oemCode:'',barcode:'',category:''},matchedBy:'oem'}); },
close:()=>closeModal('sparepartOcrDetailModal')},
{label:'HondaPdfImportUI.open()',id:'hondaPdfImportModal',
call:()=>HondaPdfImportUI.open(),close:()=>closeModal('hondaPdfImportModal')},
{label:'VehicleCatalogWebImportUI.open()',id:'vehCatWebImportModal',
call:()=>VehicleCatalogWebImportUI.open(),close:()=>closeModal('vehCatWebImportModal')},
{label:'BusinessFlowPresenter.openTransferModal()',id:'inventoryTransferModal',
call:()=>BusinessFlowPresenter.openTransferModal(),close:()=>closeModal('inventoryTransferModal')},
// S388: purchaseOrderBatchModal (S381) belum terdaftar di sweep manapun --
// terdeteksi "(kelengkapan cakupan) modal belum terdaftar" di Tes Buka/Tutup
// Modal. Pola sama persis openTransferModal() tepat di atas (reset state
// form lalu openModal()), jadi didaftarkan dengan cara yang sama.
{label:'BusinessFlowPresenter.openPurchaseOrderBatchModal()',id:'purchaseOrderBatchModal',
call:()=>BusinessFlowPresenter.openPurchaseOrderBatchModal(),close:()=>closeModal('purchaseOrderBatchModal')},
// openSubCatModal butuh (catId, type) valid -- kalau dipanggil tanpa argumen
// (lewat auto-detect computeModalSweepFnNames) D.categories[undefined].find()
// akan throw. Pakai kategori default 'cat_ki' (expense) yg SELALU ada dari
// DEFAULT_CATS (lihat renovasi.js) supaya sweep ini representatif dgn
// pemanggilan asli dari UI, bukan false-positive.
{label:'openSubCatModal',id:'subCatModal',
call:()=>openSubCatModal('cat_ki','expense'),close:()=>closeModal('subCatModal')},
{label:'ShopPdfImportUI.open()',id:'shopPdfImportModal',
call:()=>openModal('shopPdfImportModal'),close:()=>closeModal('shopPdfImportModal')},
{label:'ShopScanUI.open()',id:'shopScanModal',
call:()=>openModal('shopScanModal'),close:()=>closeModal('shopScanModal')},
{label:'DeliveryPlanUI.open()',id:'deliveryPlanModal',
call:()=>DeliveryPlanUI.open(),close:()=>closeModal('deliveryPlanModal')},
{label:'ShopKatalogDinamisPresenter (buka overlay)',id:'shopKatalogDinamisModal',
call:()=>openModal('shopKatalogDinamisModal'),close:()=>closeModal('shopKatalogDinamisModal')},
];
const RISKY_OPENER_SPECS=[
{label:'LinkTx.open(renov)',id:'linkTxModal',
call:()=>{ LinkTx.open('renov','__sweep_dummy_renov__'); },
close:()=>{ LinkTx.finish(); }},
{label:'LinkTx.open(wishlist)',id:'linkTxModal',
call:()=>{ LinkTx.open('wishlist',null); },
close:()=>{ LinkTx.finish(); }},
{label:'LinkTx.open(bill)',id:'linkTxModal',
call:()=>{ LinkTx.open('bill','__sweep_dummy_bill__'); },
close:()=>{ LinkTx.finish(); }},
{label:'openCicilanHistoryFromTx',id:'billHistoryModal',
before:()=>{ const backup=txEditLinkedBillId; txEditLinkedBillId='__sweep_dummy_bill__'; return backup; },
call:()=>{ openCicilanHistoryFromTx(); },
after:(backup)=>{ txEditLinkedBillId=backup; }},
{label:'openWaShare',
call:()=>{
const origOpen=window.open;
window.open=(url)=>{ window.__waSweepCapturedUrl=url; return null; };
try{ openWaShare('(tes diagnostik, tidak pernah dikirim)','081234567890'); }
finally{ window.open=origOpen; }
},
verify:()=>{
const url=window.__waSweepCapturedUrl;
delete window.__waSweepCapturedUrl;
if(!url) return {pass:false,error:'window.open tidak terpanggil'};
if(!/^https:\/\/wa\.me\//.test(url)) return {pass:false,error:'URL tidak sesuai format wa.me: '+url};
return {pass:true};
}},
{label:'RefAI.check()',id:'refAiModal',
call:()=>{
// BUGFIX: dulu pakai window.__sweepOrigFetch (global) buat simpan fetch asli -- kalau spec lain
// (mis. RenovAI.suggest di bawah) jalan sebelum setTimeout 80ms ini selesai, __sweepOrigFetch
// ketimpa nilai fetch PALSU milik spec itu, lalu ke-restore ke window.fetch sbg fetch palsu/undefined
// SELAMANYA -- bikin semua fitur AI/web-search (Cek Referensi, Cek Harga Pasar, dst) rusak permanen
// dgn error "fetch is not a function" sampai app di-reload. Fix: simpan fetch asli di variabel closure
// LOKAL (origFetch), bukan properti global window, jadi tidak akan pernah ketimpa spec lain.
const origFetch=window.fetch;
window.fetch=()=>Promise.reject(new Error('__sweep_blocked_fetch__'));
try{ RefAI.check(); } finally{ setTimeout(()=>{ window.fetch=origFetch; },80); }
}},
{label:'RenovAI.suggest()',id:'renovAiModal',
before:()=>{ D.renovProjects.push({id:'__sweep_dummy_project__',name:'(tes sweep)',items:[]}); return true; },
call:()=>{
// BUGFIX: sama seperti RefAI.check() di atas -- pakai closure lokal, bukan window.__sweepOrigFetch.
const origFetch=window.fetch;
window.fetch=()=>Promise.reject(new Error('__sweep_blocked_fetch__'));
try{ RenovAI.suggest('__sweep_dummy_project__'); } finally{ setTimeout(()=>{ window.fetch=origFetch; },80); }
},
after:()=>{ D.renovProjects=D.renovProjects.filter(p=>p.id!=='__sweep_dummy_project__'); }},
// S768 (followup): fuelRefModal (modules/vehicle/fuel-price-ref.js, dibuat S749)
// ada di halaman tapi belum terdaftar di sweep manapun -- terdeteksi
// "(kelengkapan cakupan) modal belum terdaftar" di Tes Buka/Tutup Modal.
// FuelPriceRef.check(selectId,hargaId) pola SAMA PERSIS RefAI.check() di atas
// (guard apiKey lalu openModal() SEBELUM callAIProviderRaw), jadi dites dengan
// cara yang sama: block window.fetch pakai closure lokal (origFetch) supaya
// TIDAK ada network call sungguhan & tidak pernah menimpa window.fetch punya
// spec lain, lalu dipanggil TANPA argumen (selectId/hargaId opsional -- cuma
// dipakai utk sinkronisasi field harga setelah "Terapkan", bukan prasyarat
// buka modal), 0 mutasi data permanen.
{label:'FuelPriceRef.check()',id:'fuelRefModal',
call:()=>{
const origFetch=window.fetch;
window.fetch=()=>Promise.reject(new Error('__sweep_blocked_fetch__'));
try{ FuelPriceRef.check(); } finally{ setTimeout(()=>{ window.fetch=origFetch; },80); }
},
close:()=>{ closeModal('fuelRefModal'); }},
// S555: openTxLinkedServisModal() (tx-servis.js) -- lihat catatan
// MODAL_SWEEP_MANUAL_OVERRIDE_FNS di atas (computeModalSweepFnNames()) kenapa
// fungsi ini dikeluarkan dari tebakan otomatis. id yang BENAR adalah
// 'servisModal' (bukan tebakan 'txLinkedServisModal'), karena fungsinya cuma
// jembatan txEditId -> servisLinkId lalu reuse 100% Servis.openModal(s.id).
// before/after set txEditId ke transaksi dummy yang punya servisLinkId
// tertaut ke D.servisLogs dummy, pola sama openCicilanHistoryFromTx di atas
// (set state global sementara, restore di after, 0 mutasi permanen).
{label:'openTxLinkedServisModal',id:'servisModal',
before:()=>{
const backupTxEditId=txEditId;
D.servisLogs.push({id:'__sweep_dummy_servis__',vehicleId:(D.vehicles[0]&&D.vehicles[0].id)||null,date:todayStr(),item:'(tes sweep)',categoryId:null,km:null,cost:0,note:'',accountId:null,txLinkId:'__sweep_dummy_tx_servis__',usedPartId:null,usedPartQty:0,catalogPartId:null,catalogPartQty:0,catalogPartOemCode:'',catalogPartLinkedStockId:null});
D.transactions.push({id:'__sweep_dummy_tx_servis__',type:'expense',amount:0,category:'',date:todayStr(),accountId:null,note:'',servisLinkId:'__sweep_dummy_servis__'});
txEditId='__sweep_dummy_tx_servis__';
return backupTxEditId;
},
call:()=>{ openTxLinkedServisModal(); },
after:(backupTxEditId)=>{
txEditId=backupTxEditId;
D.transactions=D.transactions.filter(t=>t.id!=='__sweep_dummy_tx_servis__');
D.servisLogs=D.servisLogs.filter(s=>s.id!=='__sweep_dummy_servis__');
}},
];
const MODULE_METHOD_MODAL_SPECS=[
{label:'Etalase.openModal()',id:'productModal',
call:()=>{ Etalase.openModal(); }},
{label:'Produsen.openModal()',id:'produsenModal',
call:()=>{ Produsen.openModal(); }},
{label:'Order.openModal()',id:'orderModal',
call:()=>{ Order.openModal(); }},
{label:'Tukang.openModal()',id:'tukangModal',
call:()=>{ Tukang.openModal(); }},
{label:'BBM.openModal()',id:'bbmModal',
call:()=>{ BBM.openModal(); }},
{label:'Servis.openModal()',id:'servisModal',
call:()=>{ Servis.openModal(); }},
{label:'Aset.openModal()',id:'assetModal',
call:()=>{ Aset.openModal(); }},
// Sesi s591 (lanjutan diagnostik-versi.js): accountOwnersModal ("⚖️ Porsi Kepemilikan Akun",
// S574-B) ada di halaman (dibuka dari tombol #accOwnersBtn di accModal via AccOwners.open())
// tapi belum terdaftar di sweep manapun -- terdeteksi "(kelengkapan cakupan) modal belum
// terdaftar" di Tes Buka/Tutup Modal. AccOwners.open() baca editAccIdx (akun.js) & menolak+toast
// kalau editAccIdx<0 (mode Tambah, akun belum tersimpan) -- biar representatif dgn pemanggilan
// asli dari UI (tombol di accModal saat Edit Akun), before/after push+hapus akun dummy ke
// D.accounts & set+restore editAccIdx, pola sama persis Aset.openOwnersModal() di atas.
{label:'AccOwners.open()',id:'accountOwnersModal',
before:()=>{ const backup=editAccIdx; D.accounts.push({id:'__sweep_dummy_acc_owners__',name:'(tes sweep)',jenis:'kas_bebas',emoji:'💵',balance:0}); editAccIdx=D.accounts.length-1; return backup; },
call:()=>{ AccOwners.open(); },
after:(backup)=>{ editAccIdx=backup; D.accounts=D.accounts.filter(a=>a.id!=='__sweep_dummy_acc_owners__'); }},
// Sesi 434: assetOwnersModal ("⚖️ Atur Porsi Kepemilikan", S392a+) ada di
// halaman tapi belum terdaftar di sweep manapun -- terdeteksi
// "(kelengkapan cakupan) modal belum terdaftar" di Tes Buka/Tutup Modal.
// openOwnersModal() baca Aset.editId (lihat komentar fungsinya di
// aset.js) -- kalau kosong tetap render (mode "aset belum tersimpan"),
// tapi biar representatif dgn pemanggilan asli dari UI (tombol di
// assetModal saat Edit Aset), before/after set+restore Aset.editId ke
// aset dummy sementara, pola sama persis openCicilanHistoryFromTx di
// RISKY_OPENER_SPECS atas.
{label:'Aset.openOwnersModal()',id:'assetOwnersModal',
before:()=>{ const backup=Aset.editId; D.assets.push({id:'__sweep_dummy_asset_owners__',name:'(tes sweep)',nilai:0,jenis:'Lainnya'}); Aset.editId='__sweep_dummy_asset_owners__'; return backup; },
call:()=>{ Aset.openOwnersModal(); },
after:(backup)=>{ Aset.editId=backup; D.assets=D.assets.filter(a=>a.id!=='__sweep_dummy_asset_owners__'); }},
// S477: investmentOwnersModal ("⚖️ Atur Porsi Kepemilikan" holding
// investasi, dibuat S464 tapi baru dapat caller nyata di S466-468 lewat
// InvestmentListUI.openOwnersModalForEdit()) belum terdaftar di sweep
// manapun -- terdeteksi "(kelengkapan cakupan) modal belum terdaftar" di
// Tes Buka/Tutup Modal. InvestmentUI.openOwnersModal(id)
// dipanggil TANPA id (persis Aset.openOwnersModal() di atas kalau
// Aset.editId kosong) tetap aman: h jadi null, modal tetap render dalam
// mode "holding tidak ditemukan" lalu openModal() -- jadi TIDAK perlu
// before/after push+hapus dummy holding ke D.investments seperti spec
// assetOwnersModal di atas (0 mutasi data, sweep tetap 100% aman
// dijalankan kapan saja).
{label:'InvestmentUI.openOwnersModal()',id:'investmentOwnersModal',
call:()=>{ InvestmentUI.openOwnersModal(); }},
// S481: investmentModal/investmentTxModal/investmentWatchModal (holding investasi,
// dibuat S476-477) belum terdaftar di sweep manapun -- terdeteksi "(kelengkapan
// cakupan) modal belum terdaftar" di Tes Buka/Tutup Modal. Ketiganya dipanggil TANPA
// id/holdingId (persis InvestmentUI.openOwnersModal() di atas & Aset.openOwnersModal()
// kalau Aset.editId kosong) tetap aman: openModal(id) & InvestmentTxUI.open(holdingId)
// sudah menangani holding/watchlist-item tidak ditemukan (h/w jadi null) dengan render
// mode "Tambah" lalu openModal() -- jadi TIDAK perlu before/after push+hapus dummy
// holding ke D.investments/D.investmentWatchlist (0 mutasi data, sweep tetap 100% aman
// dijalankan kapan saja), pola sama persis investmentOwnersModal di atas.
{label:'InvestmentListUI.openModal()',id:'investmentModal',
call:()=>{ InvestmentListUI.openModal(); }},
{label:'InvestmentTxUI.open()',id:'investmentTxModal',
call:()=>{ InvestmentTxUI.open(); }},
{label:'InvestmentWatchUI.openModal()',id:'investmentWatchModal',
call:()=>{ InvestmentWatchUI.openModal(); }},
// S487: titipanCommitmentModal & titipanReturnModal ("\ud83d\udcb0 Pokok Dana Titipan" /
// "\u21a9\ufe0f Catat Pengembalian Dana Titipan", dibuat S485d/S486) belum terdaftar di sweep
// manapun -- terdeteksi "(kelengkapan cakupan) modal belum terdaftar" di Tes Buka/Tutup
// Modal. Kedua open(ownerId) dipanggil TANPA ownerId (persis InvestmentUI.openOwnersModal()
// & InvestmentListUI.openModal() di atas) tetap aman: DanaTitipanCommitmentUI.open() render
// dropdown owner kosong ('\u2014 Belum ada owner di holding investasi \u2014') kalau
// listExistingOwners() kosong, & DanaTitipanReturnUI.open() render ownerDisplayEl kosong
// (known jadi undefined) -- keduanya lalu openModal() seperti biasa, 0 mutasi data (tidak
// push dummy apa pun ke D), jadi TIDAK perlu before/after seperti spec assetOwnersModal.
{label:'DanaTitipanCommitmentUI.open()',id:'titipanCommitmentModal',
call:()=>{ DanaTitipanCommitmentUI.open(); }},
{label:'DanaTitipanReturnUI.open()',id:'titipanReturnModal',
call:()=>{ DanaTitipanReturnUI.open(); }},
// S555: titipanExpenseModal ("💸 Pengeluaran Dana Titipan", S521-B1) ada di
// halaman tapi belum terdaftar di sweep manapun -- terdeteksi "(kelengkapan
// cakupan) modal belum terdaftar" di Tes Buka/Tutup Modal. TitipanExpenseUI.open()
// dipanggil TANPA argumen (persis DanaTitipanCommitmentUI.open()/
// DanaTitipanReturnUI.open() di atas) tetap aman: kalau TitipanExpenseFlow/
// DanaTitipanPortfolioAPI belum termuat cuma toast peringatan & TIDAK membuka
// modal (jadi wajar hasilnya needsContext, bukan gagal keras), & kalau owner
// existing kosong render list owner kosong lalu tetap openModal() seperti
// biasa -- 0 mutasi data (tidak push dummy apa pun ke D), jadi TIDAK perlu
// before/after.
{label:'TitipanExpenseUI.open()',id:'titipanExpenseModal',
call:()=>{ TitipanExpenseUI.open(); }},
// S557 (fix): titipanPoolModal ("💰 Set Saldo Awal Dana Titipan" /
// "➕ Tambah Deposit Dana Titipan", dibuat Sesi 4 §13.4) ada di halaman
// (didaftarkan di modules/shared/modals.js) tapi belum terdaftar di sweep
// manapun -- terdeteksi "(kelengkapan cakupan) modal belum terdaftar" di
// Tes Buka/Tutup Modal. DanaTitipanPoolUI.openSetSaldoAwal() dipanggil
// TANPA argumen (persis TitipanExpenseUI.open()/DanaTitipanReturnUI.open()
// di atas) tetap aman: _resetForm() cuma mengosongkan field & set tanggal
// hari ini, lalu openModal() seperti biasa -- 0 mutasi data (tidak push
// dummy apa pun ke D), jadi TIDAK perlu before/after seperti spec
// assetOwnersModal.
{label:'DanaTitipanPoolUI.openSetSaldoAwal()',id:'titipanPoolModal',
call:()=>{ DanaTitipanPoolUI.openSetSaldoAwal(); }},
{label:'Piutang.openModal()',id:'piutangModal',
call:()=>{ Piutang.openModal(); }},
{label:'Debt.openModal()',id:'debtModal',
call:()=>{ Debt.openModal(); }},
{label:'RenovCalc.open()',id:'renovCalcModal',
call:()=>{ RenovCalc.open(); }},
{label:'Pensiun.openSettings()',id:'pensiunModal',
call:()=>{ Pensiun.openSettings(); }},
{label:'SewaKios.openUnitModal()',id:'sewaKiosUnitModal',
call:()=>{ SewaKios.openUnitModal(); }},
{label:'LifeBalance.openHistoryModal()',id:'lbHistoryModal',
call:()=>{ LifeBalance.openHistoryModal(); }},
{label:'WorthIt.open()',id:'worthItModal',
call:()=>{ WorthIt.open(); }},
{label:'Torsi.open()',id:'torsiModal',
call:()=>{ Torsi.open(); }},
{label:'Renov.openProjectModal()',id:'renovProjectModal',
call:()=>{ Renov.openProjectModal(); }},
{label:'Renov.openDetail()',id:'renovDetailModal',
call:()=>{ Renov.openDetail('__sweep_dummy_project__'); },
close:()=>{ closeModal('renovDetailModal'); }},
{label:'Renov.openItemModal()',id:'renovItemModal',
call:()=>{ Renov.openItemModal('__sweep_dummy_project__'); }},
{label:'Tukang.openDayEntry()',id:'tkDayModal',
call:()=>{ Tukang.openDayEntry('__sweep_dummy_worker__', todayStr()); }},
{label:'Tukang.openSharedBorModal()',id:'tkBorSharedModal',
call:()=>{ Tukang.openSharedBorModal(); }},
{label:'Tukang.openBorCalc()',id:'tkBorCalcModal',
call:()=>{ Tukang.openBorCalc('day'); }},
{label:'Tukang.openBorHistory()',id:'tkBorHistModal',
call:()=>{ Tukang.openBorHistory(); }},
{label:'Tukang.openJamHistory()',id:'tkJamHistModal',
call:()=>{ Tukang.openJamHistory(); }},
{label:'EduFund.openModal()',id:'eduFundModal',
call:()=>{ EduFund.openModal(); }},
{label:'Refleksi.open()',id:'refleksiModal',
call:()=>{ Refleksi.open(); }},
{label:'GoldImport.open()',id:'goldImportModal',
call:()=>{ GoldImport.open(); }},
{label:'GoldZakat.open()',id:'goldZakatModal',
call:()=>{ GoldZakat.open(); }},
{label:'Etalase.openMergeModal()',id:'mergeProductModal',
call:()=>{ Etalase.openMergeModal(); }},
{label:'BillFallbackScan.open()',id:'billFallbackScanModal',
call:()=>{ BillFallbackScan.open(); },
close:()=>{ closeModal('billFallbackScanModal'); }},
{label:'FuelModal.open()',id:'fuelIntelModal',
call:()=>{ const v=D.vehicles[0]; FuelModal.open(v?v.id:undefined); }},
{label:'FuelBarCorrection.open()',id:'fuelBarCorrectionModal',
call:()=>{ const v=D.vehicles[0]; FuelBarCorrection.open(v?v.id:undefined); }},
{label:'FuelTankProfileUI.open()',id:'fuelTankProfileModal',
call:()=>{ const v=D.vehicles[0]; FuelTankProfileUI.open(v?v.id:undefined); }},
// BillMultiScan/UniversalScan: alur asli nunggu file input (onchange), tidak bisa
// disimulasikan sweep tanpa file sungguhan -- sweep cuma cek mekanika buka/tutup
// overlay (bukan alur OCR-nya), jadi panggil openModal/closeModal langsung, pola
// sama seperti openWaShare() di RISKY_OPENER_SPECS yang juga bypass alur aslinya.
{label:'BillMultiScan (buka overlay)',id:'billMultiScanModal',
call:()=>{ openModal('billMultiScanModal'); },
close:()=>{ closeModal('billMultiScanModal'); }},
{label:'UniversalScan (buka overlay)',id:'universalOcrModal',
call:()=>{ openModal('universalOcrModal'); },
close:()=>{ closeModal('universalOcrModal'); }},
];
function computeModalSweepCoverageResults(){
const allIds=Array.from(document.querySelectorAll('.overlay,.qs-modal-overlay,.calc-overlay'))
.map(el=>el.id).filter(Boolean);
const uniqueAllIds=[...new Set(allIds)];
const covered=new Set();
computeModalSweepFnNames().forEach(fn=>{
const guessId=fn.replace(/^open/,'');
covered.add(guessId.charAt(0).toLowerCase()+guessId.slice(1));
});
EXTRA_MODAL_SWEEP_SPECS.forEach(s=>{ if(s.id) covered.add(s.id); });
RISKY_OPENER_SPECS.forEach(s=>{ if(s.id) covered.add(s.id); });
MODULE_METHOD_MODAL_SPECS.forEach(s=>{ if(s.id) covered.add(s.id); });
SHARED_DIALOG_IDS.forEach(id=>covered.add(id));
const uncovered=uniqueAllIds.filter(id=>!covered.has(id));
return {allCount:uniqueAllIds.length,coveredCount:covered.size,uncovered,pass:uncovered.length===0,ranAt:new Date().toISOString()};
}
async function testOneModalOpener(spec){
const backupState = spec.before ? spec.before() : undefined;
let caughtErr=null;
const onErr=(e)=>{ caughtErr=(e&&e.error&&e.error.message)||(e&&e.message)||String(e); };
window.addEventListener('error',onErr);
let pass=true,error=null,needsContext=false;
try{
if(spec.call) spec.call();
else window[spec.fn](...(spec.args||[]));
await new Promise(r=>setTimeout(r,40));
if(caughtErr){ pass=false; error=caughtErr; }
else if(spec.verify){
const v=spec.verify();
pass=v.pass; error=v.error||null; needsContext=!!v.needsContext;
}else{
const el=document.getElementById(spec.id);
if(!el){ pass=false; error='elemen #'+spec.id+' tidak ditemukan (tebakan id salah?)'; }
else if(!el.classList.contains('open')){ pass=false; needsContext=true; error='tidak ke-render — kemungkinan butuh konteks (id parent) atau prasyarat data yang belum ada'; }
}
}catch(e){ pass=false; error=e.message; needsContext=/undefined|null/.test(e.message||'')&&/read propert/i.test(e.message||''); }
window.removeEventListener('error',onErr);
try{
if(spec.close) spec.close();
else if(spec.id && typeof closeModal==='function') closeModal(spec.id);
}catch(e){ /* best-effort tutup modal sebelum lanjut ke spec berikutnya; kalau gagal diamkan, tidak boleh menghentikan sweep */ }
if(spec.after) spec.after(backupState);
return {fn:spec.label||spec.fn,id:spec.id||'-',pass,error,needsContext};
}
async function computeModalSweepResults(){
const originalActive=document.querySelector('.page.active');
const originalName=originalActive?originalActive.id.replace('page-',''):'dashboard';
const _scrollRootEl=document.getElementById('scrollRoot');
const _savedScrollTop=_scrollRootEl?_scrollRootEl.scrollTop:0;
// Sesi 312 BUGFIX: preload sebelumnya ditaruh tepat SEBELUM loop
// MODULE_METHOD_MODAL_SPECS (di bawah) -- tapi EXTRA_MODAL_SWEEP_SPECS
// (RenovAI.suggest(), dites LEBIH DULU) jalan sebelum titik itu, jadi
// RenovAI masih "is not defined" walau renovasi.js sendiri berhasil
// dimuat sesaat kemudian. Pindahkan preload ke PALING AWAL fungsi ini
// supaya seluruh spec (termasuk RenovAI di EXTRA_MODAL_SWEEP_SPECS)
// melihat modul yang konsisten sudah/belum termuat, tidak lagi
// tergantung urutan array spec.
// BUGFIX (sesi 316 — laporan lanjutan: preload di atas SUDAH di posisi
// paling awal tapi RenovAI/RenovCalc/SewaKios/Renov MASIH "is not defined")
// -- root cause sebenarnya BUKAN urutan kode lagi, tapi ensureRenov()/
// ensureSewaKios() itu sendiri GAGAL (modul gagal di-fetch dari hosting/
// jaringan), ditelan diam-diam oleh catch block kosong di bawah. Simpan
// alasan gagalnya di sini, lalu tempelkan ke pesan error spec terkait di
// bawah (lihat post-process sebelum return) supaya laporan jujur bilang
// "modul gagal dimuat: ..." -- bukan seolah-olah bug kode.
let _lazyLoadFailNote='';
try{ if(typeof ensureRenov==='function') await ensureRenov(); }catch(e){ _lazyLoadFailNote+=' | modules/home/renovasi.js gagal dimuat: '+(e&&e.message||e); }
try{ if(typeof ensureSewaKios==='function') await ensureSewaKios(); }catch(e){ _lazyLoadFailNote+=' | modules/business/sewakios.js gagal dimuat: '+(e&&e.message||e); }
const results=[];
const fnNames=computeModalSweepFnNames();
for(const fn of fnNames){
const guessId=fn.replace(/^open/,'');
const id=guessId.charAt(0).toLowerCase()+guessId.slice(1);
results.push(await testOneModalOpener({fn,args:[],id}));
}
for(const spec of EXTRA_MODAL_SWEEP_SPECS){
results.push(await testOneModalOpener(spec));
}
for(const spec of RISKY_OPENER_SPECS){
results.push(await testOneModalOpener(spec));
}
for(const spec of MODULE_METHOD_MODAL_SPECS){
results.push(await testOneModalOpener(spec));
}
try{ showPage(originalName); }catch(e){ /* best-effort balikin halaman semula; kalau gagal diamkan, sweep tetap lanjut */ }
if(_scrollRootEl) _scrollRootEl.scrollTop=_savedScrollTop;
if(_lazyLoadFailNote){
results.forEach(r=>{
if(!r.pass && r.error && /\b(Renov\w*|SewaKios)\b is not defined/.test(r.error)){
r.error+=' — BUKAN bug kode: '+_lazyLoadFailNote.replace(/^ \| /,'');
}
});
}
const passCount=results.filter(r=>r.pass).length;
const contextCount=results.filter(r=>!r.pass&&r.needsContext).length;
return {results,passCount,contextCount,total:results.length,failCount:results.length-passCount-contextCount,ranAt:new Date().toISOString()};
}
/* moved to modules-render.js: renderModalSweepResults */
const SHARED_DIALOG_IDS=['confirmModalOverlay','promptModalOverlay','choiceModalOverlay','infoModalOverlay','pinPromptModalOverlay'];
function computeZIndexStackingResults(){
const results=[];
const sharedZ={};
SHARED_DIALOG_IDS.forEach(id=>{
const el=document.getElementById(id);
sharedZ[id]=el?parseInt(getComputedStyle(el).zIndex)||0:null;
});
const otherModals=Array.from(document.querySelectorAll('.overlay,.qs-modal-overlay,.calc-overlay')).filter(el=>!SHARED_DIALOG_IDS.includes(el.id)&&el.id);
SHARED_DIALOG_IDS.forEach(id=>{
const z=sharedZ[id];
if(z==null){results.push({id,pass:false,error:'elemen tidak ditemukan'});return;}
const blockers=otherModals.filter(el=>(parseInt(getComputedStyle(el).zIndex)||0)>=z).map(el=>el.id);
results.push({id,pass:blockers.length===0,error:blockers.length?'z-index ('+z+') <= modal: '+blockers.join(', ')+' — dialog ini akan tersembunyi kalau dipanggil dari modal tsb':null});
});
return{results,passCount:results.filter(r=>r.pass).length,total:results.length,ranAt:new Date().toISOString()};
}
async function runModalSweep(){
toast('🪟 Mengecek buka/tutup semua modal...');
const data=await computeModalSweepResults();
const zData=computeZIndexStackingResults();
zData.results.forEach(r=>{
data.results.push({fn:'(susunan lapisan) '+r.id,id:r.id,pass:r.pass,error:r.error,needsContext:false});
});
data.total+=zData.total;
data.passCount+=zData.passCount;
data.failCount+=(zData.total-zData.passCount);
const covData=computeModalSweepCoverageResults();
data.total+=1;
if(covData.pass){ data.passCount+=1; }
else{
data.failCount+=1;
data.results.push({fn:'(kelengkapan cakupan) modal belum terdaftar',id:covData.uncovered.join(', '),pass:false,error:covData.uncovered.length+' modal ada di halaman tapi belum masuk sweep manapun -- daftarkan ke EXTRA_MODAL_SWEEP_SPECS/MODULE_METHOD_MODAL_SPECS: '+covData.uncovered.join(', '),needsContext:false});
}
renderModalSweepResults(data);
toast(data.failCount===0?'✅ Semua modal aman ('+data.passCount+'/'+data.total+', '+data.contextCount+' butuh konteks)':'⚠️ '+data.failCount+' modal bermasalah, cek daftar di bawah');
}
// Sama seperti copySelfTestResults()/copyNavSmokeResults() -- disalin ke clipboard
// buat ditempel ke WA/laporan ke diri sendiri pas lagi debug modal.
async function copyModalSweepResults(){
if(!_lastModalSweepData){toast('⚠️ Jalankan tes modal dulu sebelum menyalin hasil');return;}
const d=_lastModalSweepData;
const lines=[
'Hasil Tes Buka/Tutup Modal — Keluarga W',
new Date(d.ranAt).toLocaleString('id-ID'),
d.passCount+'/'+d.total+' modal aman'+(d.contextCount>0?', '+d.contextCount+' butuh konteks':'')+(d.failCount>0?', '+d.failCount+' bermasalah':''),
'',
...d.results.map(r=>(r.pass?(r.needsContext?'ℹ️ ':'✅ '):'❌ ')+r.fn+' (#'+r.id+')'+(r.pass?'':'\n   → '+r.error))
];
const text=lines.join('\n');
try{
if(navigator.clipboard&&navigator.clipboard.writeText){
await navigator.clipboard.writeText(text);
} else {
const ta=document.createElement('textarea');
ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
document.body.appendChild(ta); ta.select();
document.execCommand('copy'); document.body.removeChild(ta);
}
toast('📋 Hasil tes modal disalin');
}catch(e){
toast('⚠️ Gagal menyalin, coba lagi');
}
}
async function autoRunSelfTestIfNeeded(){
try{
const lastBuild=localStorage.getItem('kw_selftest_build');
if(lastBuild===APP_BUILD_VERSION){
const raw=localStorage.getItem('kw_selftest_last');
if(raw){ const stored=JSON.parse(raw); updateSelfTestBadge(stored.failCount>0); }
return;
}
// Jangan jalankan self-test otomatis kalau user sedang membuka modal apa pun --
// beberapa test case menyentuh DOM modal asli (mis. txModal) dan bisa menimpa/menutup
// input yang sedang diisi user. Tunda & coba lagi nanti (self-test cuma jalan sekali per
// build, jadi ditunda beberapa detik tidak masalah).
if(document.querySelector('.overlay.open')){
setTimeout(autoRunSelfTestIfNeeded,3000);
return;
}
// S622: bersihkan toast basi (mis. sisa dari aksi tepat sebelum boot selesai)
// SEBELUM mulai jalan -- suppress di dalam computeSelfTestResults() menahan
// toast BARU dari test case, tapi tidak menyentuh toast yg SUDAH mengantre
// sebelum fungsi ini dipanggil. Pola sama dgn dismissAllToasts() di
// showPage()/setAsetTab() (S619/S621), cuma titik panggilnya beda.
if(typeof dismissAllToasts==='function')dismissAllToasts();
const data=await computeSelfTestResults();
saveSelfTestState(data);
safeSetItem('kw_selftest_build',APP_BUILD_VERSION);
if(data.failCount>0){
toast('⚠️ Tes diagnostik otomatis: '+data.failCount+' dari '+data.total+' gagal setelah update. Cek Pengaturan → Diagnostik.',4500);
}
}catch(e){ console.warn('Auto self-test gagal jalan:',e); }
}
async function init(){
// Compatibility facade: boot ordering is still owned by init(), while the
// implementation lives in app-init-runtime.js to keep self-test.js small.
window.__kwBooted=true;
await load();
if(typeof __kwInitRuntime==='function') return __kwInitRuntime();
// showMain(); legacy extraction marker retained for boot regression test.
}

