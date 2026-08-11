// data-health-check.js — Cek integritas data lintas-domain (runDataHealthCheck): transaksi
// dengan akun/tanggal/jumlah tidak valid, ID duplikat, tagihan/aset/BBM dengan tautan akun atau
// kendaraan yang sudah dihapus, dll. Dipisah dari features-aiwidget-reminder-gdrive-search.js
// (Sesi 5 restrukturisasi folder, blok 2 — lihat AUDIT-STRUKTUR-FOLDER.md) murni pengelompokan
// ulang file, BUKAN perubahan perilaku. Taruh di /modules/shared karena baca lintas D.transactions/
// D.bills/D.assets/D.bbmLogs/D.vehicles/D.accounts.
//
// PERUBAHAN SESI INI (S268, audit ringan pra-migrasi bridge scan Keuangan->
// Stok — lihat NEXT_SESSION.md "Kandidat migrasi penuh"): tambah 1 cek warn
// baru "catalogId duplikat" di D.partsStock (baca-saja, 0 perubahan ke cek
// yang sudah ada). Rekomendasi lain hasil audit (audit 1-per-1 ke-9 file
// konsumen sync lain sebelum migrasi VehicleCatalog.getAll() penuh) SENGAJA
// belum dikerjakan sesi ini — di luar cakupan "paling ringan".

function runDataHealthCheck(){
const issues=[];
const accIds=new Set(D.accounts.map(a=>a.id));
const vehIds=new Set(D.vehicles.map(v=>v.id));
const txIds=new Set();
const dupTxIds=[];
D.transactions.forEach(t=>{
if(txIds.has(t.id))dupTxIds.push(t.id); else txIds.add(t.id);
if(t.accountId && !accIds.has(t.accountId)){
issues.push({level:'error',title:'Transaksi dengan akun tidak valid',detail:`"${t.note||t.category||t.id}" (${t.date||'?'}) menunjuk ke akun yang sudah dihapus.`});
}
if(!t.amount || isNaN(t.amount) || t.amount<=0){
issues.push({level:'error',title:'Transaksi dengan jumlah tidak valid',detail:`"${t.note||t.category||t.id}" (${t.date||'?'}) punya jumlah kosong/0/negatif.`});
}
if(!t.date || isNaN(new Date(t.date).getTime())){
issues.push({level:'error',title:'Transaksi dengan tanggal tidak valid',detail:`"${t.note||t.category||t.id}" punya tanggal kosong/rusak.`});
}
// PERUBAHAN SESI 402 (audit ringan, gap sama persis pola assetId Piutang/
// Utang di S401b): D.transactions[].assetId (dipilih via dropdown "Kaitkan
// ke Aset Multi-Owner" di modal Transaksi, lihat modules/finance/
// transaksi.js resolveTxAssetSplit()) bisa jadi orphan kalau asetnya sudah
// dihapus -- rincian pembagian ke pemilik (badge/preview "👥 N pemilik")
// otomatis "hilang" diam-diam (resolveTxAssetSplit balikin {ok:false},
// bukan crash), jadi user tidak pernah diberi tahu tautannya putus. Murni
// baca, sameId() sama persis cek assetId Piutang/Utang di atas (field ini
// juga dibaca lewat sameId() di resolveTxAssetSplit()), 0 perubahan ke cek
// lain.
if(t.assetId && !(D.assets||[]).some(a=>sameId(a.id,t.assetId))){
issues.push({level:'warn',title:'Transaksi tertaut ke Aset Multi-Owner yang sudah dihapus',detail:`"${t.note||t.category||t.id}" (${t.date||'?'}) masih menyimpan tautan ke aset multi-owner yang sudah dihapus -- rincian pembagian ke pemilik tidak lagi ditampilkan, cek/lepas tautannya di modal Transaksi.`});
}
});
if(dupTxIds.length){
issues.push({level:'error',title:'ID transaksi duplikat',detail:`${dupTxIds.length} transaksi punya ID yang sama (bisa bikin data ganda/salah hitung). ID: ${[...new Set(dupTxIds)].slice(0,5).join(', ')}${dupTxIds.length>5?'...':''}`});
}
D.bills.forEach(b=>{
if(b.accountId && !accIds.has(b.accountId)){
issues.push({level:'warn',title:'Tagihan dengan akun tidak valid',detail:`"${escapeHtml(b.name)}" menunjuk ke akun yang sudah dihapus.`});
}
});
(D.assets||[]).forEach(a=>{
if(a.accountId && !accIds.has(a.accountId)){
issues.push({level:'warn',title:'Aset dengan akun tautan tidak valid',detail:`"${escapeHtml(a.name)}" ditautkan ke akun yang sudah dihapus — akun tautan otomatis dianggap kosong, cek/lepas tautannya di modal Aset.`});
}
// PERUBAHAN SESI B6 (gap sama persis cek accountId di atas, follow-up B1-B5
// Aset<->Investasi bridge): a.investmentId (dropdown "🔗 Hubungkan ke Holding
// Investasi", B1) bisa jadi ORPHAN kalau holding-nya sudah dihapus dari Investasi
// -- baris bridge "🔗 Terhubung ke Investasi" (B3) & read-only Atur Porsi (B2a/B2b)
// otomatis fallback ke perilaku lama (Aset._resolveLinkedInvestment() balikin null,
// 0 crash), tapi user tidak pernah diberi tahu tautannya putus. Murni baca
// (sameId(), pola sama cek assetId orphan Transaksi/Piutang/Utang di atas), 0
// perubahan ke cek lain.
if(a.investmentId && !(D.investments||[]).some(h=>sameId(h.id,a.investmentId))){
// PERUBAHAN SESI B8 (update teks, konsekuensi dari fix Aset.totalValue() --
// lihat komentar Opsi A di aset.js): SEBELUM B8, field investmentId orphan
// cuma bikin baris bridge UI hilang (tampilan doang). SESUDAH B8, Aset.
// totalValue()/asetZakatable EXCLUDE aset SELAMA `a.investmentId` masih
// terisi -- TIDAK dicek dulu apa holding-nya masih ada -- jadi aset orphan
// begini nilainya SEKARANG juga hilang sementara dari Kekayaan Bersih/Zakat
// Maal, bukan cuma dari baris bridge UI. Teks diupdate supaya user tahu
// dampaknya lebih besar dari sebelumnya -- level tetap 'warn' (bukan
// 'error'), sama pola cek accountId orphan Aset di atas yg juga level warn.
// PERUBAHAN SESI B11 (QoL #5 dari rencana B1-B10, ide user): tambah field
// `assetId` di issue -- BUKAN render tombol di sini (file ini murni logic/
// data, 0 HTML/DOM). Konsumen render list (di luar cakupan patch ini, lihat
// FIX-B11 md) bisa reuse dispatcher data-action="openAssetModal" data-args=
// "[assetId]" yang SUDAH ADA (pola sama persis baris list Aset di aset.js)
// utk bikin tombol "Buka Aset" langsung dari saran ini, tanpa user cari
// manual. 0 perubahan ke title/detail/level issue yang sudah ada.
issues.push({level:'warn',title:'Aset tertaut ke Holding Investasi yang sudah dihapus',detail:`"${escapeHtml(a.name)}" masih menyimpan tautan ke Holding Investasi yang sudah dihapus -- baris "🔗 Terhubung ke Investasi" & porsi kepemilikan tertaut otomatis dianggap kosong, DAN nilai aset ini (${fmtFull(a.nilai||0)}) untuk sementara TIDAK ikut dihitung di Kekayaan Bersih/Zakat Maal (dianggap masih "milik" holding yang sudah terhapus). Cek/lepas tautannya di modal Aset (dropdown "🔗 Hubungkan ke Holding Investasi") supaya nilainya terhitung lagi.`,assetId:a.id});
}
// SESI B7 (audit) menambahkan warn "berpotensi dihitung 2x di Kekayaan Bersih"
// di sini -- SESI B8 sudah MEMPERBAIKI rumusnya (Aset.totalValue() &
// Zakat.hitungMaal() sekarang exclude aset yg `a.investmentId`-nya resolve ke
// holding yg masih ada, lihat komentar Opsi A di totalValue()/asetZakatable
// masing-masing). Warn B7 DIHAPUS di sesi ini krn sudah tidak akurat lagi --
// dulu ngasih tau "ini dobel-hitung", sekarang KALAU dibiarkan nyala isinya
// jadi bohong (rumus sudah tidak dobel-hitung). 0 pengganti: link B1 yg
// resolve ke holding valid sekarang perilaku NORMAL/diharapkan (bukan lagi
// gejala bug), tidak perlu warning apapun.
// PERUBAHAN SESI 501 (F3, AUDIT-SESI-B-PERLUASAN-ASET.md §3.2, follow-up
// dari Sesi B1/B2): aset yang punya KEDUANYA `a.ownership` non-SELF
// (whole-entity, dropdown Kepemilikan) DAN `a.owners[]` EKSPLISIT non-SELF
// (porsi majemuk, modal "Atur Porsi Kepemilikan") sekaligus -- kartu
// "Dana Kelolaan" (DanaKelolaan.sumAssets(), 100% a.nilai sbg 1 tipe
// generik) vs tab "Dana Titipan" (DanaTitipanPortfolioAPI.build(), HANYA
// porsi owners[] per orang) bisa menampilkan pecahan BERBEDA utk aset yang
// sama -- BUKAN dobel-hitung di mana pun (2 angka ini tidak pernah
// dijumlah bareng), tapi bisa bikin user bingung ("kok di Dana Kelolaan
// keitung 100rb, di Dana Titipan cuma 60rb"). Murni deteksi+beritahu
// (level warn, 0 mutasi data, 0 perubahan ke sumAssets()/build() itu
// sendiri -- REKOMENDASI audit F3 SENGAJA bukan mengubah rumus salah satu
// sisi, karena keduanya "benar" utk definisi masing-masing/whole-entity vs
// porsi eksplisit, cuma perlu USER TAHU ada 2 sumber kebenaran berbeda utk
// aset itu). Guard ganda typeof OwnershipEngine/MultiOwnerEngine (pola
// sama semua guard lain di file ini) -- kalau salah satu belum dimuat, cek
// ini diam saja (0 false-positive).
if(typeof OwnershipEngine!=='undefined' && typeof MultiOwnerEngine!=='undefined' && typeof MultiOwnerEngine.getOwners==='function'){
const ownType=OwnershipEngine.resolve?OwnershipEngine.resolve(a).type:'SELF';
if(ownType && ownType!=='SELF'){
const res=MultiOwnerEngine.getOwners(a);
if(res && res.ok && !res.isSynthesized){
const nonSelfPorsi=(res.owners||[]).filter(o=>o&&!o.isSelf&&o.porsi>0).reduce((s,o)=>s+o.porsi,0);
if(nonSelfPorsi>0){
issues.push({level:'warn',title:'Aset dengan kepemilikan ganda (Kepemilikan + Porsi Majemuk) berpotensi tidak sinkron',detail:`"${escapeHtml(a.name)}" punya dropdown Kepemilikan non-SELF (dihitung 100% di kartu Dana Kelolaan) SEKALIGUS Porsi Kepemilikan eksplisit (${nonSelfPorsi}% dihitung di tab Dana Titipan) -- 2 tempat ini bisa menampilkan pecahan berbeda utk aset yang sama. Bukan bug hitung ganda, tapi cek konsistensinya di modal Aset kalau angka terasa janggal.`});
}
}
}
}
});
// PERUBAHAN SESI 554 (restore rule S551 — lihat
// FIX-s551-asset-investasi-duplicate-name-owner-mismatch-audit.md &
// tests/data-health-check-asset-investasi-owner-mismatch-s551.test.js):
// rule ini SUDAH terdokumentasikan lengkap sejak S551 (termasuk 9 test
// permanen) tapi kodenya sendiri tidak pernah benar-benar masuk ke file
// ini — audit S540-D menemukan 3/9 test regresinya FAIL persis di titik
// ini. Diimplementasikan sekarang, 0 rumus baru (100% reuse
// MultiOwnerEngine.getOwners(), murni baca, 0 mutasi D.assets/D.investments).
//
// Deteksi (BUKAN link resmi B1/investmentId — itu kasusnya sudah
// tertangani cek orphan B6/B7-B8 di atas): instrumen nama sama tercatat
// SEKALIGUS di Buku Aset & sbg Holding Investasi TANPA ditautkan, dgn
// susunan pemilik BERBEDA di kedua sisi (mis. laporan user: "Schorder" —
// di Aset dimiliki investor "renov" 100%, di Investasi dimiliki "Milik
// Sendiri" 100%) — indikasi instrumen yang sama tercatat 2x dgn data
// kepemilikan tidak sinkron (risiko dobel-hitung nilai & porsi dana
// titipan salah, akar masalah yang sama dgn fix dobel-hitung Dana Titipan
// Sesi 554 di dana-titipan-portfolio-presenter.js).
//
// Match nama EXACT (trim+lowercase, SENGAJA bukan fuzzy — hindari
// false-positive, beda dari saran mirip-nama B4 di bawah yang memang
// fuzzy). "Signature" pemilik = daftar {ownerId,porsi} disortir supaya
// urutan array tidak mempengaruhi perbandingan; porsi dibulatkan 2
// desimal (toleransi floating point, pola sama PORSI_EPSILON di
// multi-owner-engine.js). Guard `typeof MultiOwnerEngine` (pola sama
// semua guard lain di file ini) — kalau engine belum dimuat, cek diam
// saja (0 crash, 0 false-positive).
if(typeof MultiOwnerEngine!=='undefined' && typeof MultiOwnerEngine.getOwners==='function'){
const ownerSignature=(entity)=>{
const res=MultiOwnerEngine.getOwners(entity);
if(!res||!res.ok)return '';
return (res.owners||[])
.map(o=>({id:String((o&&o.ownerId)||'').trim().toLowerCase(),porsi:Math.round(((o&&o.porsi)||0)*100)/100}))
.sort((x,y)=>x.id<y.id?-1:(x.id>y.id?1:0))
.map(o=>o.id+':'+o.porsi)
.join('|');
};
(D.investments||[]).forEach(h=>{
if(!h||!h.name)return;
const hName=String(h.name).trim().toLowerCase();
if(!hName)return;
const hSig=ownerSignature(h);
(D.assets||[]).forEach(a=>{
if(!a||!a.name)return;
if(String(a.name).trim().toLowerCase()!==hName)return;
if(ownerSignature(a)===hSig)return;
issues.push({level:'warn',title:'Nama sama di Buku Aset & Investasi dgn kepemilikan berbeda',detail:`"${escapeHtml(a.name)}" tercatat DUA KALI dgn nama yang sama -- 1x di Buku Aset, 1x sbg Holding Investasi -- tapi susunan pemiliknya BERBEDA di kedua sisi. Kemungkinan instrumen yang sama tercatat 2x dengan data kepemilikan tidak sinkron (risiko dobel-hitung nilai & porsi dana titipan salah). Cek kedua sisi di modal Aset & modal Investasi -- kalau memang instrumen yang sama, samakan datanya atau tautkan lewat dropdown "🔗 Hubungkan ke Holding Investasi".`,assetId:a.id});
});
});
}
// PERUBAHAN SESI 552 (gap FIX-s552-asset-investasi-link-badge.md bag. "Data
// Health Check tambahan", lihat tests/data-health-check-investment-asset-
// link-orphan-s552.test.js): orphan check utk `D.investments[].assetId` --
// field link RESMI baru (arah kebalikan dari `a.investmentId` yang sudah
// dicek orphan di atas) yang menunjuk entry Buku Aset yang sudah dihapus.
// Pola SAMA PERSIS orphan check S506 utk `vehicle.assetId` (lihat cek
// Kendaraan di bawah) -- level warn, murni baca, 0 auto-repair
// (h.assetId TIDAK di-null-kan otomatis).
(D.investments||[]).forEach(h=>{
if(!h)return;
if(h.assetId && !(D.assets||[]).some(a=>sameId(a.id,h.assetId))){
issues.push({level:'warn',title:'Link Buku Aset investasi tidak ditemukan',detail:`Holding Investasi "${escapeHtml(h.name||'?')}" masih menyimpan tautan ke entry Buku Aset yang sudah dihapus -- cek/lepas tautannya di modal Investasi (dropdown "🔗 Hubungkan ke Holding Investasi" di modal Aset).`});
}
});
// PERUBAHAN SESI B4 (RENCANA-SESI-RINGKAS.md, alat bantu migrasi B1-B3 field
// investmentId): saran (BUKAN auto-link) utk pasangan Aset & Holding Investasi
// yang namanya mirip & belum ditautkan lewat dropdown "🔗 Hubungkan ke Holding
// Investasi" (B1) -- kemungkinan instrumen yang sama tercatat 2x (1x manual di
// Buku Aset, 1x di Holding Investasi). Guard typeof Aset (pola sama guard lain
// di file ini) -- kalau module belum dimuat, cek ini diam saja. 100% REUSE
// Aset._findInvestmentMigrationCandidates() (PURE, baca-saja) -- 0 logic
// pencocokan baru di sini, cuma merangkai hasilnya jadi issue level 'warn' 1
// per pasangan. User tetap memutuskan link-nya manual di modal Aset.
if(typeof Aset!=='undefined' && typeof Aset._findInvestmentMigrationCandidates==='function'){
Aset._findInvestmentMigrationCandidates().forEach(c=>{
const holdingValueTxt=c.holdingValue!=null?` (nilai holding ${fmtFull(c.holdingValue)})`:'';
// PERUBAHAN SESI B11: tambah `assetId:c.assetId` (sudah ada di return
// _findInvestmentMigrationCandidates(), tinggal diteruskan) -- pola sama
// persis komentar B11 di cek orphan investmentId di atas.
issues.push({level:'warn',title:'Kemungkinan Aset & Investasi dobel-catat (belum ditautkan)',detail:`Aset "${escapeHtml(c.assetName)}" (${fmtFull(c.assetNilai)}) namanya mirip Holding Investasi "${escapeHtml(c.holdingName)}"${holdingValueTxt} yang belum ditautkan -- kemungkinan instrumen yang sama tercatat 2x. Ini cuma SARAN, bukan otomatis ditautkan; kalau memang sama, buka modal Aset ini lalu pilih holding tersebut di dropdown "🔗 Hubungkan ke Holding Investasi".`,assetId:c.assetId});
});
}
// PERUBAHAN SESI 293 (audit lanjutan Sesi 292 akun-del-targets-assets-gapfix):
// D.targets punya accountId (dipakai progress "via Akun" — lihat akun.js
// delAcc() & modules-calc.js) tapi belum pernah dicek orphan di sini, gap
// yang sama persis seperti D.assets di atas. Pola SAMA PERSIS cek Aset di
// atas (1 syarat, 1 issue, level warn, 0 logic baru).
(D.targets||[]).forEach(t=>{
if(t.accountId && !accIds.has(t.accountId)){
issues.push({level:'warn',title:'Target Tabungan dengan akun tautan tidak valid',detail:`"${escapeHtml(t.name||'?')}" ditautkan ke akun yang sudah dihapus — saldo tautan otomatis dianggap kosong, cek/lepas tautannya di modal Target Tabungan.`});
}
});
// PERUBAHAN SESI 401b (audit ringan, gap sama persis pola D.targets di atas):
// D.eduFunds[].accountId (Dana Pendidikan) & D.sewaKios.units[].accountId
// (akun tujuan pembayaran sewa) belum pernah dicek orphan, walau field-nya
// sudah ada & dipakai sync saldo (lihat modules/finance/edukasi-dana.js &
// modules/business/sewakios.js). Pola & level SAMA PERSIS cek Target di
// atas. Murni baca, 0 perubahan ke cek lain.
(D.eduFunds||[]).forEach(f=>{
if(f.accountId && !accIds.has(f.accountId)){
issues.push({level:'warn',title:'Dana Pendidikan dengan akun tautan tidak valid',detail:`"${escapeHtml(f.name||'?')}" ditautkan ke akun yang sudah dihapus — "Sudah Terkumpul" tautan otomatis dianggap kosong, cek/lepas tautannya di modal Dana Pendidikan.`});
}
});
((D.sewaKios&&D.sewaKios.units)||[]).forEach(u=>{
if(u.accountId && !accIds.has(u.accountId)){
issues.push({level:'warn',title:'Unit Sewa Kios dengan akun tujuan tidak valid',detail:`"${escapeHtml(u.name||'?')}" menunjuk ke akun tujuan pembayaran sewa yang sudah dihapus, cek/lepas tautannya di modal Unit Kios.`});
}
});
D.bbmLogs.forEach(b=>{
if(b.vehicleId && !vehIds.has(b.vehicleId)){
issues.push({level:'error',title:'Catatan BBM dengan kendaraan tidak valid',detail:`Catatan BBM tgl ${b.date||'?'} menunjuk ke kendaraan yang sudah dihapus.`});
}
if(b.accountId && !accIds.has(b.accountId)){
issues.push({level:'warn',title:'Catatan BBM dengan akun tidak valid',detail:`Catatan BBM tgl ${b.date||'?'} menunjuk ke akun yang sudah dihapus.`});
}
if(b.txLinkId && !txIds.has(b.txLinkId)){
issues.push({level:'warn',title:'Catatan BBM kehilangan transaksi tertaut',detail:`Catatan BBM tgl ${b.date||'?'} seharusnya tertaut ke transaksi keuangan, tapi transaksinya tidak ditemukan.`});
}
});
D.servisLogs.forEach(s=>{
if(s.vehicleId && !vehIds.has(s.vehicleId)){
issues.push({level:'error',title:'Catatan servis dengan kendaraan tidak valid',detail:`Servis "${s.item||'?'}" tgl ${s.date||'?'} menunjuk ke kendaraan yang sudah dihapus.`});
}
if(s.accountId && !accIds.has(s.accountId)){
issues.push({level:'warn',title:'Catatan servis dengan akun tidak valid',detail:`Servis "${s.item||'?'}" tgl ${s.date||'?'} menunjuk ke akun yang sudah dihapus.`});
}
if(s.txLinkId && !txIds.has(s.txLinkId)){
issues.push({level:'warn',title:'Catatan servis kehilangan transaksi tertaut',detail:`Servis "${s.item||'?'}" tgl ${s.date||'?'} seharusnya tertaut ke transaksi keuangan, tapi transaksinya tidak ditemukan.`});
}
});
D.products.forEach(p=>{
if((p.stock||0)<0){
issues.push({level:'error',title:'Stok produk minus',detail:`"${escapeHtml(p.name)}" stoknya ${p.stock} (minus). Cek riwayat transaksi Shop terkait.`});
}
});
const prodIds=new Set(D.products.map(p=>p.id));
(D.cobek||[]).forEach(c=>{
(c.items||[]).forEach(it=>{
if(it.productId && !prodIds.has(it.productId)){
issues.push({level:'error',title:'Transaksi Shop dengan produk tidak valid',detail:`Transaksi Shop tgl ${c.date||'?'} (pelanggan: ${(c.customer&&c.customer.name)||'-'}) berisi item "${it.name||it.productId}" yang produknya sudah dihapus dari etalase.`});
}
});
if(c.accountId && !accIds.has(c.accountId)){
issues.push({level:'warn',title:'Transaksi Shop dengan akun tidak valid',detail:`Transaksi Shop tgl ${c.date||'?'} menunjuk ke akun yang sudah dihapus.`});
}
if(c.txLinkId && !txIds.has(c.txLinkId)){
issues.push({level:'warn',title:'Transaksi Shop kehilangan transaksi tertaut',detail:`Transaksi Shop tgl ${c.date||'?'} seharusnya tertaut ke transaksi keuangan, tapi transaksinya tidak ditemukan.`});
}
});
(D.workDays||[]).forEach(w=>{
if(!w.date || isNaN(new Date(w.date).getTime())){
issues.push({level:'error',title:'Absensi dengan tanggal tidak valid',detail:`Catatan absensi (ID ${w.id}) punya tanggal kosong/rusak.`});
}
if(w.total==null || isNaN(w.total) || w.total<0){
issues.push({level:'error',title:'Absensi dengan total gaji tidak valid',detail:`Absensi tgl ${w.date||'?'} punya total gaji kosong/negatif/rusak.`});
}
});
const wsIds=new Set(),dupWsIds=[],wsDates=new Set(),dupWsDates=[];
(D.wealthSnapshots||[]).forEach(s=>{
if(wsIds.has(s.id))dupWsIds.push(s.id); else wsIds.add(s.id);
if(wsDates.has(s.date))dupWsDates.push(s.date); else wsDates.add(s.date);
if(!s.date || isNaN(new Date(s.date).getTime())){
issues.push({level:'error',title:'Snapshot kekayaan dengan tanggal tidak valid',detail:`Snapshot (ID ${s.id}) punya tanggal kosong/rusak.`});
}
if(s.netWorth==null || isNaN(s.netWorth)){
issues.push({level:'error',title:'Snapshot kekayaan dengan nilai tidak valid',detail:`Snapshot tgl ${s.date||'?'} punya nilai Kekayaan Bersih kosong/rusak (bukan angka). Ini bisa bikin CAGR ikut rusak.`});
}
});
if(dupWsIds.length){
issues.push({level:'error',title:'ID snapshot kekayaan duplikat',detail:`${dupWsIds.length} snapshot punya ID yang sama (kemungkinan dari restore/sync yang tidak bersih). ID: ${[...new Set(dupWsIds)].slice(0,5).join(', ')}${dupWsIds.length>5?'...':''}`});
}
if(dupWsDates.length){
issues.push({level:'warn',title:'Tanggal snapshot kekayaan duplikat',detail:`${dupWsDates.length} tanggal punya lebih dari 1 snapshot (seharusnya cuma 1 snapshot per tanggal). Tanggal: ${[...new Set(dupWsDates)].slice(0,5).join(', ')}${dupWsDates.length>5?'...':''}. Ini bisa bikin CAGR keliru karena tidak jelas snapshot mana yang dipakai sbg titik data.`});
}
const lbIds=new Set(),dupLbIds=[],lbDates=new Set(),dupLbDates=[];
(D.lifeBalanceSnapshots||[]).forEach(s=>{
if(lbIds.has(s.id))dupLbIds.push(s.id); else lbIds.add(s.id);
if(lbDates.has(s.date))dupLbDates.push(s.date); else lbDates.add(s.date);
if(!s.date || isNaN(new Date(s.date).getTime())){
issues.push({level:'error',title:'Snapshot Skor Hidup Seimbang dengan tanggal tidak valid',detail:`Snapshot (ID ${s.id}) punya tanggal kosong/rusak.`});
}
if(s.score==null || isNaN(s.score) || s.score<0 || s.score>100){
issues.push({level:'error',title:'Snapshot Skor Hidup Seimbang dengan nilai tidak valid',detail:`Snapshot tgl ${s.date||'?'} punya skor kosong/rusak/luar rentang 0-100.`});
}
});
if(dupLbIds.length){
issues.push({level:'error',title:'ID snapshot Skor Hidup Seimbang duplikat',detail:`${dupLbIds.length} snapshot punya ID yang sama (kemungkinan dari restore/sync yang tidak bersih). ID: ${[...new Set(dupLbIds)].slice(0,5).join(', ')}${dupLbIds.length>5?'...':''}`});
}
if(dupLbDates.length){
issues.push({level:'warn',title:'Tanggal snapshot Skor Hidup Seimbang duplikat',detail:`${dupLbDates.length} tanggal punya lebih dari 1 snapshot (seharusnya cuma 1 per tanggal). Tanggal: ${[...new Set(dupLbDates)].slice(0,5).join(', ')}${dupLbDates.length>5?'...':''}.`});
}
(D.piutang||[]).forEach(p=>{
if(!p.name || !p.name.trim()){
issues.push({level:'error',title:'Piutang tanpa nama peminjam',detail:`Catatan piutang (ID ${p.id}) tidak punya nama peminjam.`});
}
if(p.nilai==null || isNaN(p.nilai) || p.nilai<0){
issues.push({level:'error',title:'Piutang dengan nilai tidak valid',detail:`Piutang "${p.name||'?'}" punya nilai kosong/negatif/rusak, ikut memengaruhi Kekayaan Bersih & Zakat Maal.`});
}
if(p.jatuhTempo && isNaN(new Date(p.jatuhTempo).getTime())){
issues.push({level:'warn',title:'Piutang dengan tanggal jatuh tempo tidak valid',detail:`Piutang "${p.name||'?'}" punya tanggal jatuh tempo yang tidak terbaca sebagai tanggal.`});
}
// PERUBAHAN SESI 401b (audit ringan): assetId (Kaitkan ke Aset Multi-Owner,
// lihat modules/finance/piutang-utang.js resolveEntryAssetSelfPorsi()) bisa
// jadi orphan kalau asetnya sudah dihapus -- porsi kepemilikan jadi salah
// hitung diam-diam. Pola sama persis cek assetId lain di file ini.
if(p.assetId && !(D.assets||[]).some(a=>sameId(a.id,p.assetId))){
issues.push({level:'warn',title:'Piutang tertaut ke Aset Multi-Owner yang sudah dihapus',detail:`Piutang "${p.name||'?'}" masih menyimpan tautan ke aset multi-owner yang sudah dihapus -- porsi kepemilikan yang dihitung bisa salah, cek/lepas tautannya di modal Piutang.`});
}
// PERUBAHAN SESI 553 (gap dari rekomendasi audit S551/S552, lihat
// FIX-s553-debt-piutang-nonmultiowner-link-audit.md &
// tests/data-health-check-debt-piutang-nonmultiowner-link-s553.test.js):
// field assetId di Piutang berlabel "Kaitkan ke Aset Multi-Owner", tapi
// kalau asetnya ternyata SINGLE-owner, tautan itu silent no-op
// (resolveEntryAssetSelfPorsi() fallback 100%, sama spt tidak ditautkan) --
// sebelumnya 0 peringatan soal ini. Guard `linkedAsset` (asetnya harus
// ADA -- orphan case sudah ditangani cek di atas, 0 tumpang tindih).
if(p.assetId){
const linkedAsset=(D.assets||[]).find(a=>sameId(a.id,p.assetId));
if(linkedAsset){
const ownersArr=Array.isArray(linkedAsset.owners)?linkedAsset.owners:[];
if(ownersArr.length<2){
issues.push({level:'warn',title:'Piutang tertaut ke aset yang bukan multi-owner',detail:`Piutang "${p.name||'?'}" ditautkan ke aset "${escapeHtml(linkedAsset.name||'?')}" yang BUKAN aset multi-owner -- porsi kepemilikan tidak berpengaruh apa-apa (tautannya silent no-op), cek ulang di modal Piutang.`});
}
}
}
});
(D.partsStock||[]).forEach(p=>{
if((p.qty||0)<0){
issues.push({level:'error',title:'Stok sparepart minus',detail:`"${escapeHtml(p.name)}" stoknya ${p.qty} (minus). Cek riwayat pemakaian di catatan servis.`});
}
});
// Cek tambahan (S506 — Vehicle ↔ Asset Identity Link, lihat PROMPT
// IMPLEMENTASI S506 §9): D.vehicles[].assetId (opsional, dibuat lewat "🔗
// Hubungkan ke Buku Aset" di modal Kelola Kendaraan, lihat modules/vehicle/
// vehicle-core.js resolveVehicleAssetLink()/saveVehicle()) bisa jadi orphan
// kalau asetnya sudah dihapus dari Buku Aset -- tautannya "diam-diam putus"
// (field tetap ada di D.vehicles tapi tidak match apa pun, bukan crash).
// Pola & level SAMA PERSIS cek assetId Transaksi/Piutang/Utang di atas.
// Murni baca, TIDAK auto-repair/auto-null/auto-delete (guardrail S506 §9 —
// level warn saja, bukan error yang blokir app).
D.vehicles.forEach(v=>{
if(v.assetId && !(D.assets||[]).some(a=>sameId(a.id,v.assetId))){
issues.push({level:'warn',title:'Kendaraan tertaut ke Buku Aset yang sudah dihapus',detail:`"${escapeHtml(v.name||'?')}" masih menyimpan tautan ke entry Buku Aset yang sudah dihapus -- cek/lepas tautannya di modal Kelola Kendaraan.`});
}
});
// Cek tambahan (S506 §10, duplicate link safety): 1 entry Buku Aset TIDAK
// seharusnya jadi identity >1 kendaraan sekaligus (assetId kependa dipakai
// dobel) -- pola sama persis cek catalogId duplikat (D.partsStock) di bawah.
// Murni deteksi/warning, TIDAK ada aturan bisnis baru yang memblokir/
// menghapus/mengubah data (guardrail S506 §10: "jangan merusak data
// existing").
const vehAssetIdCount={};
D.vehicles.forEach(v=>{
if(v.assetId)vehAssetIdCount[v.assetId]=(vehAssetIdCount[v.assetId]||0)+1;
});
Object.keys(vehAssetIdCount).forEach(aid=>{
if(vehAssetIdCount[aid]>1){
const names=D.vehicles.filter(v=>v.assetId===aid).map(v=>v.name).join(', ');
issues.push({level:'warn',title:'Entry Buku Aset ditautkan ke lebih dari 1 kendaraan',detail:`${vehAssetIdCount[aid]} kendaraan menunjuk ke entry Buku Aset yang sama (${names}) -- cek apakah memang disengaja, lepas tautan salah satunya di modal Kelola Kendaraan kalau keliru.`});
}
});
// Cek tambahan (S268 — bridge scan Keuangan->Stok, lihat NEXT_SESSION.md
// "Kandidat migrasi penuh"): syncPartsStockFromCatalog() di modules/finance/
// tx-stok-sparepart.js MENGASUMSIKAN 1 catalogId cuma nempel ke 1 baris
// D.partsStock (dia pakai .find() pertama yang cocok). Kalau ada 2+ baris
// dgn catalogId sama (mis. dari restore data lama/edit manual), sync jadi
// ambigu (baris mana yg dianggap "sumber kebenaran" berubah-ubah tergantung
// urutan array) -- dan ini juga PERSIS jenis data yang bakal bikin migrasi
// penuh ke VehicleCatalog.getAll() makin berisiko. Cek murni read-only,
// TIDAK mengubah data, TIDAK menyentuh alur sync yang sudah ada.
const catalogIdCount={};
(D.partsStock||[]).forEach(p=>{
if(p.catalogId)catalogIdCount[p.catalogId]=(catalogIdCount[p.catalogId]||0)+1;
});
Object.keys(catalogIdCount).forEach(cid=>{
if(catalogIdCount[cid]>1){
const names=(D.partsStock||[]).filter(p=>p.catalogId===cid).map(p=>p.name).join(', ');
issues.push({level:'warn',title:'Part katalog terhubung ke lebih dari 1 baris stok',detail:`${catalogIdCount[cid]} baris stok sparepart menunjuk ke part katalog yang sama (${names}). Sinkronisasi scan bisa jadi tidak konsisten -- gabungkan/lepas tautan salah satunya.`});
}
});
// Cek tambahan (S276 — audit sinkronisasi lintas-fitur, temuan lanjutan
// dari S274/275): catalogId di D.partsStock bisa jadi ORPHAN kalau part-nya
// sudah dihapus dari Katalog Suku Cadang (VehicleCatalog.remove()) --
// badge "🔗 Katalog" & "📦 Stok N" di VehicleCatalogUI otomatis "hilang"
// begitu itemnya tak ketemu (bukan crash, cuma silently tidak match), jadi
// user tidak pernah diberi tahu tautannya sudah putus. Guard ganda: cuma
// jalan kalau VehicleCatalog sudah dimuat (isLoaded(), Sesi 276) SEKALIGUS
// tersedia (typeof) -- kalau belum/tidak dimuat, cek ini diam saja (0
// false-positive), sama prinsipnya dgn guard typeof lain di seluruh file
// ini. Murni baca (VehicleCatalog.getStore() + D.partsStock), 0 tulis.
if(typeof VehicleCatalog!=='undefined' && typeof VehicleCatalog.isLoaded==='function' && VehicleCatalog.isLoaded() && typeof VehicleCatalog.getStore==='function'){
const catalogIds=new Set((VehicleCatalog.getStore().items||[]).map(it=>it.id));
(D.partsStock||[]).forEach(p=>{
if(p.catalogId && !catalogIds.has(p.catalogId)){
issues.push({level:'warn',title:'Stok sparepart tertaut ke part katalog yang sudah dihapus',detail:`"${escapeHtml(p.name)}" masih menyimpan tautan catalogId ke part di Katalog Suku Cadang yang sudah dihapus/tidak ditemukan -- badge "🔗 Katalog"/"📦 Stok" terkait jadi tidak muncul. Data stok sendiri tetap aman, cek/lepas tautannya kalau perlu.`});
}
});
}
(D.debts||[]).forEach(d=>{
if(!d.name || !d.name.trim()){
issues.push({level:'error',title:'Utang tanpa nama pemberi pinjaman',detail:`Catatan utang (ID ${d.id}) tidak punya nama pemberi pinjaman.`});
}
if(d.nilai==null || isNaN(d.nilai) || d.nilai<0){
issues.push({level:'error',title:'Utang dengan nilai tidak valid',detail:`Utang "${d.name||'?'}" punya nilai kosong/negatif/rusak, ikut memengaruhi Kekayaan Bersih & Zakat Maal.`});
}
if(d.jatuhTempo && isNaN(new Date(d.jatuhTempo).getTime())){
issues.push({level:'warn',title:'Utang dengan tanggal jatuh tempo tidak valid',detail:`Utang "${d.name||'?'}" punya tanggal jatuh tempo yang tidak terbaca sebagai tanggal.`});
}
// PERUBAHAN SESI 401b (audit ringan): sama persis cek assetId Piutang di
// atas, utk Utang.
if(d.assetId && !(D.assets||[]).some(a=>sameId(a.id,d.assetId))){
issues.push({level:'warn',title:'Utang tertaut ke Aset Multi-Owner yang sudah dihapus',detail:`Utang "${d.name||'?'}" masih menyimpan tautan ke aset multi-owner yang sudah dihapus -- porsi kepemilikan yang dihitung bisa salah, cek/lepas tautannya di modal Utang.`});
}
// PERUBAHAN SESI 553: sama persis cek non-multi-owner Piutang di atas, utk Utang.
if(d.assetId){
const linkedAsset=(D.assets||[]).find(a=>sameId(a.id,d.assetId));
if(linkedAsset){
const ownersArr=Array.isArray(linkedAsset.owners)?linkedAsset.owners:[];
if(ownersArr.length<2){
issues.push({level:'warn',title:'Utang tertaut ke aset yang bukan multi-owner',detail:`Utang "${d.name||'?'}" ditautkan ke aset "${escapeHtml(linkedAsset.name||'?')}" yang BUKAN aset multi-owner -- porsi kepemilikan tidak berpengaruh apa-apa (tautannya silent no-op), cek ulang di modal Utang.`});
}
}
}
});
// Cek tambahan (S283 — audit data integrity, temuan gap): D.renovProjects[].
// items[] punya accountId & txId (lihat modules/finance/tx-renov.js) persis
// spt bills/wishlist, tapi belum pernah dicek orphan di sini. Pola & level
// disamakan persis dgn cek bills (accountId) & wishlist (txId) di atas.
// Murni baca, 0 perubahan ke cek lain.
(D.renovProjects||[]).forEach(p=>{
(p.items||[]).forEach(it=>{
if(it.accountId && !accIds.has(it.accountId)){
issues.push({level:'warn',title:'Item Renovasi dengan akun tidak valid',detail:`"${escapeHtml(it.name||'?')}" (proyek "${escapeHtml(p.name||'?')}") menunjuk ke akun yang sudah dihapus.`});
}
if(it.txId && !txIds.has(it.txId)){
issues.push({level:'warn',title:'Item Renovasi kehilangan transaksi tertaut',detail:`"${escapeHtml(it.name||'?')}" (proyek "${escapeHtml(p.name||'?')}") ditandai sudah dibayar & tertaut ke transaksi keuangan, tapi transaksinya tidak ditemukan.`});
}
});
});
const catNames=new Set([...D.categories.income,...D.categories.expense].flatMap(c=>[c.id,c.name,...(c.subs||[]).map(s=>s.id)]));
(D.budgets||[]).forEach(b=>{
const ids=b.catIds||(b.catId?[b.catId]:[]);
const invalid=ids.filter(id=>id!=='__total__' && !catNames.has(id));
if(invalid.length){
issues.push({level:'warn',title:'Anggaran dengan kategori tidak valid',detail:`Anggaran "${escapeHtml(b.name)}" merujuk ke kategori yang sudah dihapus/diubah. Buka & simpan ulang anggaran ini untuk memperbaiki.`});
}
});
(D.wishlist||[]).forEach(w=>{
if(!w.name || !w.name.trim()){
issues.push({level:'error',title:'Barang Prioritas Belanja tanpa nama',detail:`Item wishlist (ID ${w.id}) tidak punya nama.`});
}
if(w.price==null || isNaN(w.price) || w.price<=0){
issues.push({level:'error',title:'Barang Prioritas Belanja dengan harga tidak valid',detail:`"${w.name||'?'}" punya harga kosong/0/negatif/rusak.`});
}
if(w.isDiskon && (w.hargaNormal==null || isNaN(w.hargaNormal) || w.hargaNormal<=(w.price||0))){
issues.push({level:'warn',title:'Barang Prioritas Belanja dengan info diskon tidak konsisten',detail:`"${w.name||'?'}" ditandai diskon tapi harga normalnya kosong/lebih kecil-sama dgn harga bayar. Skor prioritasnya bisa jadi kurang akurat.`});
}
if(w.bought && w.txId && !txIds.has(w.txId)){
issues.push({level:'warn',title:'Barang "Sudah Beli" kehilangan transaksi tertaut',detail:`"${w.name||'?'}" ditandai sudah dibeli & tertaut ke transaksi keuangan, tapi transaksinya tidak ditemukan (mungkin terhapus di luar jalur normal). Buka Prioritas Belanja → Sudah Dibeli → ↺ buat kembalikan barang ini ke list aktif kalau memang belum jadi dibeli.`});
}
if(w.bought && !w.txId){
issues.push({level:'warn',title:'Barang "Sudah Beli" tanpa transaksi tertaut',detail:`"${w.name||'?'}" berstatus sudah dibeli tapi tidak punya catatan transaksi terkait di Keuangan (kemungkinan data lama dari sebelum fitur sync 2 arah ditambahkan).`});
}
});
const wlDupCheck=new Map();
(D.wishlist||[]).filter(w=>!w.bought).forEach(w=>{
const key=(w.name||'').trim().toLowerCase();
if(!key)return;
wlDupCheck.set(key,(wlDupCheck.get(key)||0)+1);
});
const wlDupNames=[...wlDupCheck.entries()].filter(([,c])=>c>1).map(([n])=>n);
if(wlDupNames.length){
issues.push({level:'warn',title:'Barang Prioritas Belanja kemungkinan duplikat',detail:`Nama barang yang sama muncul lebih dari 1x di list aktif: ${wlDupNames.slice(0,5).join(', ')}${wlDupNames.length>5?'...':''}. Cek apakah memang 2 barang berbeda atau kepencet tambah dobel.`});
}
const errCount=issues.filter(i=>i.level==='error').length;
const warnCount=issues.filter(i=>i.level==='warn').length;
const summaryEl=document.getElementById('dataHealthSummary');
const listEl=document.getElementById('dataHealthList');
if(!issues.length){
summaryEl.innerHTML='✅ Tidak ditemukan masalah. Data terlihat sehat!';
listEl.innerHTML='';
} else {
summaryEl.innerHTML=`Ditemukan <b>${errCount} error</b> & <b>${warnCount} peringatan</b> dari ${D.transactions.length} transaksi, ${D.bbmLogs.length+D.servisLogs.length} catatan kendaraan, ${(D.cobek||[]).length} transaksi Shop, ${(D.workDays||[]).length} catatan absensi, ${(D.wealthSnapshots||[]).length} snapshot kekayaan, ${(D.piutang||[]).length} piutang, ${(D.debts||[]).length} utang, ${(D.budgets||[]).length} anggaran, ${(D.lifeBalanceSnapshots||[]).length} snapshot Skor Hidup Seimbang & ${(D.wishlist||[]).length} barang Prioritas Belanja.`;
// PERUBAHAN SESI B11 (QoL #5 dari rencana B1-B10): kalau issue punya
// `assetId` (baru ditambahkan di 2 cek Aset<->Investasi B4/B6/B8 di atas),
// render 1 tombol "Buka Aset" yang reuse dispatcher data-action=
// "openAssetModal" data-args="[assetId]" yang SUDAH ADA (pola sama persis
// baris list Aset di aset.js, lihat FIX-B11 md) -- 0 dispatcher baru, 0
// logic buka-modal baru di sini. Issue lain (tanpa assetId) tampilannya
// tidak berubah sama sekali.
listEl.innerHTML=issues.map(i=>`<div style="padding:10px;border-radius:10px;margin-bottom:8px;background:${i.level==='error'?'var(--accent2-soft)':'var(--accent4-soft)'}">
      <div style="font-weight:700;font-size:13px;color:${i.level==='error'?'var(--accent2)':'var(--accent4)'}">${i.level==='error'?'❌':'⚠️'} ${escapeHtml(i.title)}</div>
      <div class="u-fs12 u-t2 u-mt2">${escapeHtml(i.detail)}</div>
      ${i.assetId?`<button class="u-fs11 u-r6 u-mt6" style="padding:4px 10px;border:1px solid var(--accent4);background:transparent;color:var(--accent4)" data-action="openAssetModal" data-args="${escapeHtml(JSON.stringify([i.assetId]))}">📦 Buka Aset</button>`:''}
    </div>`).join('');
}
openModal('dataHealthModal');
return issues;
}
