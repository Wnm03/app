// backup-restore.js — Export/import/backup data (satu domain penuh: CSV/JSON export laporan, backup
// Dipindah ke modules/shared/backup-restore.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// terjadwal & manual per-modul, restore dari file backup, import dari Cashew/CSV lain, import Car Notes)
// (v89): blok "deteksi item checkout dari screenshot belanja" sudah dipindah ke scan-ocr.js — domainnya OCR.
// (v90): blok wrapper FI (kebebasan finansial) sudah digabung ke modules-calc.js, persis di sebelah objek FI
// yang dibungkusnya.
// (v91): blok wrapper Budget sudah digabung ke features-budget-laporan-carnotes-pelanggan.js, persis di
// sebelah objek Budget yang dibungkusnya. Lihat PEMISAHAN-FILE-ROADMAP.md.
// (v92): blok "list transaksi & cashflow forecast" (txHTML/delTx/computeCashflowForecast/dll) sudah
// dipindah ke transaksi.js — domainnya sama-sama seputar data transaksi.
// (v93): blok Payroll (const Payroll={...}, Absensi & Kalkulator Gaji Mingguan) sudah dipindah ke file
// baru payroll-absensi.js — sudah rapi sbg 1 objek modul, jadi dapat file domain sendiri.
// (v94): file di-rename dari features-fi-checkoutscan-importexport-payroll.js jadi backup-restore.js —
// langkah TERAKHIR dari pembedahan file lama ini. 2 sisa deklarasi nyasar juga dituntaskan lebih dulu:
// _lapLastFilterSig dipindah ke filter-laporan.js (gabung bareng lapTxPage yg memakainya bareng), dan
// toggleMs/showTargetAccountTx/addTarget/delTarget/delReminder dipindah ke transaksi.js (gabung bareng
// saveTarget/saveCatatan/saveReminder/saveLDR yang sudah ada di sana sejak v83). Setelah itu, tidak ada
// lagi kode yang perlu DIPINDAHKAN dari file ini — isinya sudah murni 1 domain (export/import/backup),
// jadi cukup rename + update semua referensi nama file. Lihat PEMISAHAN-FILE-ROADMAP.md.
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: data-default.js, features-helpers-global-security.js, diagnostik-versi.js, format-tema.js, error-handler.js, helper-teks.js, keamanan-pin.js, modal-navigasi.js, reset-gaji-mingguan.js, debug-console.js, pengaturan-search.js, onboarding.js, kalkulator-input.js, scan-ocr.js, filter-laporan.js, akun.js, gaji-calc.js, transaksi.js, profil-pengaturan.js, kategori.js, tagihan-kalender.js, backup-restore.js, payroll-absensi.js, tukang-absensi.js

/* moved to modules-render.js: renderLaporan */
/* moved to modules-render.js: renderGrafik */
function exportCSV(){
const {from,to}=getRange();
const f=getLaporanFilters();
const txs=D.transactions.filter(t=>{const d=new Date(t.date);return d>=from&&d<=to&&t.type!=='transfer_in'&&t.type!=='transfer_out'&&txMatchesFilters(t,f);});
const rows=[['Tanggal','Tipe','Kategori','Subkategori','Akun','Metode','Jumlah','Keterangan'],...txs.map(t=>{
const accName=D.accounts.find(a=>a.id===t.accountId)?.name||'';
return[t.date,t.type==='income'?'Pemasukan':'Pengeluaran',t.category,t.subcategory||'',accName,t.payMethod||'tunai',t.amount,t.note||''];
})];
const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='laporan-W-'+new Date().toISOString().split('T')[0]+'.csv';a.click();
}
function exportJSON(){
const {from,to}=getRange();
const f=getLaporanFilters();
const txs=D.transactions.filter(t=>{const d=new Date(t.date);return d>=from&&d<=to&&t.type!=='transfer_in'&&t.type!=='transfer_out'&&txMatchesFilters(t,f);});
const blob=new Blob([JSON.stringify(txs,null,2)],{type:'application/json'});
const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='laporan-W-'+new Date().toISOString().split('T')[0]+'.json';a.click();
}
async function buildBackupPayload(){
const backupD={...D,chatHistory:[]};
if(backupD.profile){
backupD.profile={...backupD.profile};
delete backupD.profile.apiKey;
}
// BUGFIX-INTEGRASI: LifeOS (projects/reviewLog/knowledge) & EIE (macroCache/
// insights/scoreHistory/notificationsEnabled/dst) disimpan di IndexedDB
// terpisah dari D (key 'lifeos:store'/'eie:store', lihat lifeos-store.js/
// eie-store.js) — sebelumnya TIDAK pernah ikut ke file backup sama sekali,
// walau {...D} di atas terlihat lengkap. Field `_lifeosStore`/`_eieStore` di
// bawah ini murni titipan utk restore, BUKAN properti D — jangan pernah
// merge langsung `{...D,...imp}` tanpa menyaring 2 key ini (lihat
// applyRestoredData()).
try{
const lifeosStore=await IDBStore.get('lifeos:store');
if(lifeosStore)backupD._lifeosStore=lifeosStore;
}catch(e){console.warn('Backup: gagal baca lifeos:store dari IndexedDB (dilewati):',e);}
try{
const eieStore=await IDBStore.get('eie:store');
if(eieStore)backupD._eieStore=eieStore;
}catch(e){console.warn('Backup: gagal baca eie:store dari IndexedDB (dilewati):',e);}
// Vehicle Catalog (Milestone 0 Phase 1, key 'vehicle-catalog:store',
// lihat modules/vehicle/vehicle-catalog.js & ACR-001) — pola SAMA PERSIS
// lifeos:store/eie:store di atas: data terpisah dari D, wajib didaftarkan
// manual di sini atau tidak akan ikut ter-backup (FOUNDATION_AUDIT.md §3).
try{
const vehicleCatalogStore=await IDBStore.get('vehicle-catalog:store');
if(vehicleCatalogStore)backupD._vehicleCatalogStore=vehicleCatalogStore;
}catch(e){console.warn('Backup: gagal baca vehicle-catalog:store dari IndexedDB (dilewati):',e);}
// Honda PDF Import (Tahap 7D-1, key 'honda-pdf-import:store', lihat
// modules/vehicle/honda-pdf-import.js) — pola SAMA PERSIS vehicle-catalog:store
// di atas: data terpisah dari D, wajib didaftarkan manual di sini atau tidak
// akan ikut ter-backup (FOUNDATION_AUDIT.md §3).
try{
const hondaPdfImportStore=await IDBStore.get('honda-pdf-import:store');
if(hondaPdfImportStore)backupD._hondaPdfImportStore=hondaPdfImportStore;
}catch(e){console.warn('Backup: gagal baca honda-pdf-import:store dari IndexedDB (dilewati):',e);}
return backupD;
}
async function exportData(){
const backupD=await buildBackupPayload();
const blob=new Blob([JSON.stringify(backupD,null,2)],{type:'application/json'});
const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='backup-keluarga-W-'+new Date().toISOString().split('T')[0]+'.json';a.click();
D.lastBackup=new Date().toISOString();save();
document.getElementById('lastBackup').textContent=new Date().toLocaleDateString('id-ID');
document.getElementById('backupBadge').textContent='💾 Backup';
document.getElementById('backupBanner')?.classList.add('hidden');
if(typeof BackupHistoryAPI!=='undefined')BackupHistoryAPI.recordEntry({type:'local',status:'success',done:['File lokal (JSON)']});
toast('✅ Backup berhasil!');
}
async function runFullBackup(){
if(_saveGuards['fullBackup']){toast('⏳ Backup sebelumnya masih berjalan...');return;}
_saveGuards['fullBackup']=true;
const btn=document.getElementById('backupBadge');
const btnOriginal=btn?btn.textContent:null;
if(btn)btn.textContent='⏳ Backup...';
const done=[];
const skipped=[];
const errors=[];
try{
try{
const backupD=await buildBackupPayload();
const blob=new Blob([JSON.stringify(backupD,null,2)],{type:'application/json'});
const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='backup-keluarga-W-'+new Date().toISOString().split('T')[0]+'.json';a.click();
D.lastBackup=new Date().toISOString();save();
const lb=document.getElementById('lastBackup'); if(lb)lb.textContent=new Date().toLocaleDateString('id-ID');
const bn=document.getElementById('backupBanner'); if(bn)bn.classList.add('hidden');
done.push('File lokal (JSON)');
}catch(e){
console.error('Backup file lokal gagal:',e);
errors.push('File lokal: '+(e.message||e));
}
if(gdriveAccessToken){
try{
const ok=await _uploadBackupToDriveInner(true);
if(ok)done.push('Google Drive'); else skipped.push('Google Drive (dilewati, lihat notifikasi)');
}catch(e){
console.error('Backup Drive gagal:',e);
errors.push('Google Drive: '+(e.message||e));
}
} else {
skipped.push('Google Drive (belum terhubung)');
}
if(gdriveAccessToken && D.googleSheets){
try{
const ok=await _sheetsSyncInner(true);
if(ok)done.push('Google Sheets'); else skipped.push('Google Sheets (dilewati, lihat notifikasi)');
}catch(e){
console.error('Sync Sheets gagal:',e);
errors.push('Google Sheets: '+(e.message||e));
}
} else {
skipped.push('Google Sheets (belum terhubung)');
}
if(!errors.length){
let msg='✅ Backup semua berhasil: '+done.join(', ')+'.';
if(skipped.length)msg+=' (Dilewati: '+skipped.join(', ')+')';
toast(msg,3200);
}else{
let msg='❌ Backup SEBAGIAN gagal. ';
if(done.length)msg+='Berhasil: '+done.join(', ')+'. ';
msg+='Gagal: '+errors.join(' | ');
toast(msg,6000);
}
if(typeof BackupHistoryAPI!=='undefined'){
const status=errors.length?(done.length?'partial':'failed'):'success';
BackupHistoryAPI.recordEntry({type:'full',status,done,skipped,errors});
}
} finally {
_saveGuards['fullBackup']=false;
if(btn)btn.textContent=done.includes('File lokal (JSON)')?'💾 Backup':(btnOriginal||'⚠️ Backup');
}
}
let backupModules={keuangan:true,carnotes:true,shop:true,aset:true,renov:true,pensiunZakat:true,habit:true,lain:true};
function openBackupModal(){
document.getElementById('bPeriode').value='selamanya';
document.getElementById('bCustomRange').style.display='none';
document.getElementById('bTipe').value='semua';
document.getElementById('bFormat').value='json';
backupModules={keuangan:true,carnotes:true,shop:true,aset:true,renov:true,pensiunZakat:true,habit:true,lain:true};
['bModKeuangan','bModCarnotes','bModShop','bModAset','bModRenov','bModPensiunZakat','bModHabit','bModLain'].forEach(id=>document.getElementById(id).classList.add('active'));
openModal('backupModal');
}
function toggleBackupModule(mod,el){
backupModules[mod]=!backupModules[mod];
el.classList.toggle('active',backupModules[mod]);
}
function onBackupPeriodeChange(){
document.getElementById('bCustomRange').style.display=document.getElementById('bPeriode').value==='custom'?'block':'none';
}
function getBackupRange(){
const p=document.getElementById('bPeriode').value;
const now=new Date();
if(p==='hari')return{from:new Date(now.getFullYear(),now.getMonth(),now.getDate()),to:now};
if(p==='bulan')return{from:new Date(now.getFullYear(),now.getMonth(),1),to:now};
if(p==='tahun')return{from:new Date(now.getFullYear(),0,1),to:now};
if(p==='custom'){
const f=document.getElementById('bFrom').value,t=document.getElementById('bTo').value;
return{from:f?new Date(f):new Date(0),to:t?new Date(t+'T23:59:59'):now};
}
return{from:new Date(0),to:now};
}
function inRange(dateStr,from,to){const d=new Date(dateStr);return d>=from&&d<=to;}
function runBackup(){
const{from,to}=getBackupRange();
const tipe=document.getElementById('bTipe').value;
const format=document.getElementById('bFormat').value;
const out={schemaVersion:SCHEMA_VERSION,backupCreatedAt:new Date().toISOString()};
if(backupModules.keuangan){
out.transactions=D.transactions.filter(t=>inRange(t.date,from,to)&&(tipe==='semua'||t.type===tipe));
out.accounts=D.accounts;out.categories=D.categories;out.bills=D.bills;out.targets=D.targets;out.eduFunds=D.eduFunds||[];
out.billsArchive=(D.billsArchive||[]).filter(b=>inRange(b.tanggal||b.nextDue||b.createdAt||new Date().toISOString(),from,to)||true);
}
if(backupModules.carnotes){
out.vehicles=D.vehicles;out.sparepartCats=D.sparepartCats;out.partsStock=D.partsStock;
out.bbmLogs=D.bbmLogs.filter(b=>inRange(b.date,from,to));
out.servisLogs=D.servisLogs.filter(s=>inRange(s.date,from,to));
out.jalanLogs=D.jalanLogs.filter(j=>inRange(j.date,from,to));
out.kmLogs=D.kmLogs.filter(k=>inRange(k.date,from,to));
out.simList=D.simList||[];
}
if(backupModules.shop){
out.products=D.products;
out.produsen=D.produsen;
out.cobekKategori=D.cobekKategori;
out.cobek=D.cobek.filter(c=>inRange(c.date,from,to));
}
if(backupModules.aset){
out.assets=D.assets||[];
out.debts=D.debts||[];
out.piutang=D.piutang||[];
out.wealthSnapshots=(D.wealthSnapshots||[]).filter(s=>inRange(s.date,from,to));
}
if(backupModules.renov){
out.renovProjects=D.renovProjects||[];
out.sewaKios=D.sewaKios||{units:[]};
}
if(backupModules.pensiunZakat){
out.pensiun=D.pensiun||null;
out.finansialFreedom=D.finansialFreedom||null;
out.pajakZakat=D.pajakZakat?{...D.pajakZakat,zakatLog:(D.pajakZakat.zakatLog||[]).filter(z=>inRange(z.tanggal,from,to))}:null;
out.assetAllocation=D.assetAllocation||null;
out.budgetReko=D.budgetReko||null;
}
if(backupModules.habit){
out.wishlist=D.wishlist||[];
out.lifeBalanceSnapshots=(D.lifeBalanceSnapshots||[]).filter(s=>inRange(s.date,from,to));
}
if(backupModules.lain){
// FIX (lihat CHANGELOG): apiKey WAJIB dihapus sebelum diekspor -- dulu D.profile
// ditaruh langsung tanpa disaring, beda sendiri dari buildBackupPayload() yang
// sudah benar menghapusnya. Kalau tidak, API key AI ikut nyangkut di file JSON.
if(D.profile && Object.prototype.hasOwnProperty.call(D.profile,'apiKey')){
out.profile={...D.profile}; delete out.profile.apiKey;
} else {
out.profile=D.profile;
}
out.workDays=D.workDays.filter(w=>inRange(w.date,from,to));
out.catatan={
anak:(D.catatan.anak||[]).filter(c=>inRange(c.date,from,to))
};
out.milestones=D.milestones;
out.nextPulang=D.nextPulang;
out.reminders=D.reminders;
out.budgets=D.budgets;
out.notifSettings=D.notifSettings;
out.archiveHistory=D.archiveHistory||[];
// FIX: field berikut sebelumnya TIDAK ikut modul manapun sehingga selalu
// hilang dari backup custom ini (beda dari tombol Backup utama yang pakai
// buildBackupPayload() / {...D} sehingga otomatis lengkap). Ditambahkan di
// sini (modul "lain") supaya kedua jalur backup konsisten cakupannya.
out.refleksi=D.refleksi||{gratitude:[],selfCareLog:{},privateNotes:[]};
out.gajiMingguanHistory=D.gajiMingguanHistory||[];
out.tukangBorHargaMemory=D.tukangBorHargaMemory||{};
out.tukangWorkers=D.tukangWorkers||[];
out.tukangAbsensi=D.tukangAbsensi||[];
out.torsiChecklist=D.torsiChecklist||{};
out.debtStrategy=D.debtStrategy||{method:'avalanche',extra:0};
out.favoritKeys=(typeof getFavoritKeys==='function'?getFavoritKeys():[])||[];
out.dashCardPrefs=D.dashCardPrefs||{};
}
if(!Object.keys(out).length){toast('⚠️ Pilih minimal 1 modul');return;}
const dateTag=new Date().toISOString().split('T')[0];
if(format==='json'){
const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});
const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='backup-W-'+dateTag+'.json';a.click();
} else {
const csvParts=[];
const toCSVRow=arr=>arr.map(v=>{v=(v===null||v===undefined)?'':String(v);return v.includes(',')||v.includes('"')?'"'+v.replace(/"/g,'""')+'"':v;}).join(',');
if(out.transactions){
csvParts.push('=== KEUANGAN: TRANSAKSI ===');
csvParts.push(toCSVRow(['Tanggal','Tipe','Kategori','Subkategori','Akun','Jumlah','Keterangan']));
out.transactions.forEach(t=>{
const accName=D.accounts.find(a=>a.id===t.accountId)?.name||'';
csvParts.push(toCSVRow([t.date,t.type==='income'?'Pemasukan':'Pengeluaran',t.category,t.subcategory||'',accName,t.amount,t.note||'']));
});
csvParts.push('');
}
if(out.bbmLogs){
csvParts.push('=== CAR NOTES: ISI BBM ===');
csvParts.push(toCSVRow(['Tanggal','Kendaraan','KM','Liter','Harga/Liter','Total Biaya','SPBU','Full Tank','Catatan']));
out.bbmLogs.forEach(b=>{
const vehName=D.vehicles.find(v=>v.id===b.vehicleId)?.name||'';
csvParts.push(toCSVRow([b.date,vehName,b.km,b.liter,b.harga||'',b.cost,b.spbu||'',b.fullTank?'Ya':'Tidak',b.note||'']));
});
csvParts.push('');
csvParts.push('=== CAR NOTES: SERVIS ===');
csvParts.push(toCSVRow(['Tanggal','Kendaraan','Item','KM','Biaya','Catatan']));
out.servisLogs.forEach(s=>{
const vehName=D.vehicles.find(v=>v.id===s.vehicleId)?.name||'';
csvParts.push(toCSVRow([s.date,vehName,s.item,s.km||'',s.cost,s.note||'']));
});
csvParts.push('');
csvParts.push('=== CAR NOTES: PERJALANAN ===');
csvParts.push(toCSVRow(['Tanggal','Kendaraan','Rute','Jarak (KM)','Catatan']));
out.jalanLogs.forEach(j=>{
const vehName=D.vehicles.find(v=>v.id===j.vehicleId)?.name||'';
csvParts.push(toCSVRow([j.date,vehName,j.rute,j.jarak||'',j.note||'']));
});
csvParts.push('');
}
if(out.cobek){
csvParts.push('=== SHOP: TRANSAKSI ===');
csvParts.push(toCSVRow(['Tanggal','Konsumen','No HP','Alamat','Item','Tipe Harga','Subtotal','Diskon','Ongkir','Total','Untung','Catatan']));
out.cobek.forEach(c=>{
if(c.items){
csvParts.push(toCSVRow([c.date,c.customer?.name||'',c.customer?.phone||'',c.customer?.address||'',c.items.map(i=>i.name+' x'+i.qty).join('; '),c.priceType||'',c.subtotal,c.diskon||0,c.ongkir||0,c.total,c.profit,c.note||'']));
} else {
csvParts.push(toCSVRow([c.date,'','','',(c.sets||'')+' set (data lama)','','','','',c.profit,c.profit,c.note||'']));
}
});
csvParts.push('');
csvParts.push('=== SHOP: ETALASE PRODUK ===');
csvParts.push(toCSVRow(['Nama Produk','Stok','Harga Beli','Harga Jual','Harga Reseller','Diskon %']));
(out.products||[]).forEach(p=>csvParts.push(toCSVRow([p.name,p.stock,p.hargaBeli,p.hargaJual,p.hargaReseller||'',p.diskonPersen||0])));
}
if(out.assets){
csvParts.push('=== ASET (BUKU ASET) ===');
csvParts.push(toCSVRow(['Nama','Jenis','Lokasi','Nilai Saat Ini','Modal Investasi','Tanggal Perolehan','Hitung ke Zakat Maal','Kadar Emas (per mil)','Berat Emas (gram)','Harga Emas/gram (Rp)','Jenis Perhiasan','Toko Emas']));
out.assets.forEach(a=>csvParts.push(toCSVRow([a.name,a.jenis||'',a.lokasi||'',a.nilai||0,a.modalInvestasi||'',a.tanggal||'',a.zakatable?'Ya':'Tidak',a.goldKadar||'',a.goldBeratGram||'',a.goldHargaPerGram||'',a.goldJenis||'',a.goldToko||''])));
csvParts.push('');
csvParts.push('=== BUKU UTANG ===');
csvParts.push(toCSVRow(['Pemberi Pinjaman','Sisa Pokok','Bunga %/thn','Cicilan/Bulan','Jatuh Tempo','Lunas','Catatan']));
(out.debts||[]).forEach(d=>csvParts.push(toCSVRow([d.name,d.nilai||0,d.bunga||0,d.cicilanBulanan||'',d.jatuhTempo||'',d.lunas?'Ya':'Tidak',d.catatan||''])));
csvParts.push('');
csvParts.push('=== PIUTANG ===');
csvParts.push(toCSVRow(['Nama Peminjam','Jumlah','Tanggal Pinjam','Jatuh Tempo','Lunas','Catatan']));
(out.piutang||[]).forEach(p=>csvParts.push(toCSVRow([p.name,p.nilai||0,p.tanggal||'',p.jatuhTempo||'',p.lunas?'Ya':'Tidak',p.catatan||''])));
csvParts.push('');
}
if(out.renovProjects){
csvParts.push('=== PROYEK RENOVASI ===');
csvParts.push(toCSVRow(['Nama Proyek','Item','Ukuran/Kebutuhan','Harga','Sudah Dibeli','Tanggal Bayar','Catatan']));
out.renovProjects.forEach(p=>(p.items||[]).forEach(it=>csvParts.push(toCSVRow([p.name,it.name,it.ukuran||'',it.harga||0,it.paid?'Ya':'Belum',it.paidDate||'',it.note||'']))));
csvParts.push('');
}
if(out.pensiun||out.pajakZakat){
csvParts.push('=== DANA PENSIUN & ZAKAT/PAJAK (RINGKASAN) ===');
csvParts.push(toCSVRow(['Target Dana Pensiun','Usia Pensiun','Kontribusi Bulanan','Harga Emas/gram (Zakat)']));
csvParts.push(toCSVRow([out.pensiun?.targetDana||'',out.pensiun?.usiaPensiun||'',out.pensiun?.kontribusiBulanan||'',out.pajakZakat?.hargaEmasPerGram||'']));
csvParts.push('');
if(out.pajakZakat?.zakatLog?.length){
csvParts.push('=== RIWAYAT ZAKAT ===');
csvParts.push(toCSVRow(['Tanggal','Jenis','Jumlah']));
out.pajakZakat.zakatLog.forEach(z=>csvParts.push(toCSVRow([z.tanggal,z.jenis,z.jumlah])));
csvParts.push('');
}
}
if(out.wishlist){
csvParts.push('=== PRIORITAS BELANJA (WISHLIST) ===');
csvParts.push(toCSVRow(['Nama Barang','Harga','Kategori','Urgensi','Sudah Dibeli']));
(out.wishlist||[]).forEach(w=>csvParts.push(toCSVRow([w.name,w.price||0,w.cat||'',w.urgensi||'',w.bought?'Ya':'Belum'])));
csvParts.push('');
}
if(out.workDays){
csvParts.push('');
csvParts.push('=== GAJI / ABSENSI HARIAN ===');
csvParts.push(toCSVRow(['Tanggal','Jenis','Masuk','Pulang','Istirahat(menit)','Total Jam','Jam Lembur','Gaji Pokok/Borongan','Lembur','Total','Catatan Borongan']));
out.workDays.forEach(w=>csvParts.push(toCSVRow([w.date,w.jenis||'',w.masuk||'',w.pulang||'',w.istirahatMin??'',w.totalJam??'',w.jamLembur??'',w.pokok??'',w.lembur??'',w.total??'',w.borNote||''])));
csvParts.push('');
csvParts.push('=== PROFIL & GAJI POKOK ===');
csvParts.push(toCSVRow(['Nama','Gaji Pokok/Hari','Kiriman']));
if(out.profile)csvParts.push(toCSVRow([out.profile.nama||'',out.profile.gajiPokok||'',out.profile.kiriman||'']));
}
if(out.catatan){
csvParts.push('');
csvParts.push('=== CATATAN ANAK ===');
csvParts.push(toCSVRow(['Tanggal','Catatan']));
(out.catatan.anak||[]).forEach(c=>csvParts.push(toCSVRow([c.date,c.text||''])));
}
const blob=new Blob([csvParts.join('\n')],{type:'text/csv'});
const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='backup-W-'+dateTag+'.csv';a.click();
}
D.lastBackup=new Date().toISOString();save();
const lb=document.getElementById('lastBackup');if(lb)lb.textContent=new Date().toLocaleDateString('id-ID');
document.getElementById('backupBadge').textContent='💾 Backup';
document.getElementById('backupBanner')?.classList.add('hidden');
if(typeof BackupHistoryAPI!=='undefined')BackupHistoryAPI.recordEntry({type:'custom',status:'success',done:['Backup custom ('+format+')']});
closeModal('backupModal');
toast('✅ Backup berhasil di-download!');
}
async function applyRestoredData(imp){
if(!imp||typeof imp!=='object'){await showAlertModal('File backup tidak dikenali (bukan format yang valid).',{icon:'❌',title:'Backup Tidak Valid'});return false;}
const knownKeys=['transactions','accounts','categories','bills','vehicles','products','cobek','catatan','workDays','profile','targets','eduFunds','sewaKios'];
if(!knownKeys.some(k=>imp[k]!==undefined)){await showAlertModal('File ini sepertinya bukan file backup aplikasi ini. Restore dibatalkan.',{icon:'❌',title:'Backup Tidak Valid'});return false;}
const backupVersion=imp.schemaVersion||0;
if(backupVersion>SCHEMA_VERSION){
const lanjut=await askConfirm('⚠️ File backup ini dibuat dari versi aplikasi yang LEBIH BARU dari yang sedang dipakai sekarang. Me-restore-nya mungkin membuat sebagian data tidak terbaca dengan benar.\n\nTetap lanjutkan restore?',{title:'Versi Backup Lebih Baru',okText:'Ya, Tetap Restore'});
if(!lanjut)return false;
}
try{
let snapJson;
if(D.profile && Object.prototype.hasOwnProperty.call(D.profile,'apiKey')){
const profileNoKey={...D.profile}; delete profileNoKey.apiKey;
snapJson=JSON.stringify({...D,profile:profileNoKey});
} else {
snapJson=JSON.stringify(D);
}
safeSetItem('kw_v4_prerestore',snapJson);
}catch(e){console.error('Gagal simpan snapshot pengaman:',e);}
const prevD=JSON.parse(JSON.stringify(D));
// BUGFIX-INTEGRASI: `_lifeosStore`/`_eieStore` (lihat buildBackupPayload())
// adalah titipan data IndexedDB, BUKAN properti D — disimpan dulu sebelum
// merge, lalu dihapus dari D supaya tidak nyangkut sbg field liar di D.
const _restoredLifeosStore=imp._lifeosStore;
const _restoredEieStore=imp._eieStore;
// Vehicle Catalog (Milestone 0 Phase 1) — titipan sama seperti
// _lifeosStore/_eieStore di atas, BUKAN properti D.
const _restoredVehicleCatalogStore=imp._vehicleCatalogStore;
// Honda PDF Import (Tahap 7D-1) — titipan sama seperti
// _lifeosStore/_eieStore/_vehicleCatalogStore di atas, BUKAN properti D.
const _restoredHondaPdfImportStore=imp._hondaPdfImportStore;
try{
D={...D,...imp};
delete D._lifeosStore;
delete D._eieStore;
delete D._vehicleCatalogStore;
delete D._hondaPdfImportStore;
applyRestoredDataMigrations();
runDataMigrations(backupVersion);
saveFlush();init();
try{
if(_restoredLifeosStore!==undefined){
await IDBStore.set('lifeos:store',_restoredLifeosStore);
if(typeof lifeOSInvalidateCache==='function')lifeOSInvalidateCache();
}
if(_restoredEieStore!==undefined){
await IDBStore.set('eie:store',_restoredEieStore);
if(typeof eieInvalidateCache==='function')eieInvalidateCache();
}
if(_restoredVehicleCatalogStore!==undefined){
await IDBStore.set('vehicle-catalog:store',_restoredVehicleCatalogStore);
if(typeof vehicleCatalogInvalidateCache==='function')vehicleCatalogInvalidateCache();
}
if(_restoredHondaPdfImportStore!==undefined){
await IDBStore.set('honda-pdf-import:store',_restoredHondaPdfImportStore);
if(typeof hondaPdfImportInvalidateCache==='function')hondaPdfImportInvalidateCache();
}
}catch(e){console.error('Restore data LifeOS/EIE/Vehicle Catalog/Honda PDF Import (IndexedDB) gagal (data D lain tetap ter-restore):',e);}
return true;
}catch(e){
console.error('Restore gagal, mengembalikan data sebelumnya:',e);
D=prevD;
saveFlush();init();
await showAlertModal('Terjadi error saat restore, data dikembalikan ke sebelum restore agar tidak corrupt. Detail error ada di console.',{icon:'❌',title:'Restore Gagal'});
return false;
}
}
function applyRestoredDataMigrations(){
if(!D.categories)D.categories={income:JSON.parse(JSON.stringify(DEFAULT_CATS.income)),expense:JSON.parse(JSON.stringify(DEFAULT_CATS.expense))};
if(!D.accounts||!D.accounts.length)D.accounts=JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
if(!D.bills)D.bills=[];
if(!D.billsArchive)D.billsArchive=[];
if(!D.vehicles||!D.vehicles.length)D.vehicles=[{id:'veh_1',name:'Vario 125',emoji:'🏍️',serviceIntervalKm:3000}];
D.vehicles.forEach(v=>{if(!v.serviceIntervalKm)v.serviceIntervalKm=3000;});
if(!D.bbmLogs)D.bbmLogs=[];
if(!D.servisLogs)D.servisLogs=[];
if(!D.jalanLogs)D.jalanLogs=[];
if(!D.kmLogs)D.kmLogs=[];
if(!D.sparepartCats||!D.sparepartCats.length)D.sparepartCats=JSON.parse(JSON.stringify(DEFAULT_SPAREPARTS));
D.sparepartCats.forEach(c=>{if(!c.code)c.code=codeFromName(c.name);});
if(!D.partsStock)D.partsStock=[];
if(!D.workDays)D.workDays=[];
if(!D.catatan)D.catatan={anak:[]};
if(!D.milestones)D.milestones=[false,false,false,false,false];
if(!D.chatHistory)D.chatHistory=[];
if(!D.cobek)D.cobek=[];
if(!D.products)D.products=[];
if(!D.produsen)D.produsen=[];
if(!D.cobekKategori||!D.cobekKategori.length)D.cobekKategori=JSON.parse(JSON.stringify(DEFAULT_COBEK_KATEGORI));
D.products.forEach(p=>{if(!p.hargaByProdusen)p.hargaByProdusen={};if(p.kategoriId===undefined)p.kategoriId='';if(p.produsenId===undefined)p.produsenId='';});
if(!D.categories.expense.some(c=>c.id==='cat_cbb'||/^bisnis$/i.test(c.name))){
D.categories.expense.push({id:'cat_cbb',name:'Bisnis',emoji:'🪨',subs:[{id:'sub_cbb_cobek',name:'Cobek'}]});
}
migrateShopCategory();
if(!D.targets)D.targets=[];
if(!D.eduFunds)D.eduFunds=[];
if(!D.reminders)D.reminders=[];
if(!D.transactions)D.transactions=[];
if(!D.notifSettings)D.notifSettings={enabled:false,billDays:3,ldrDays:3};
if(!D.googleDrive)D.googleDrive={clientId:'',fileId:null,lastSync:null,autoSync:false};
if(!D.wealthSnapshots)D.wealthSnapshots=[];
if(!D.wishlist)D.wishlist=[];
D.cobek.forEach(c=>{if(c.delivered===undefined)c.delivered=true;});
}
async function importData(e){
const file=e.target.files[0];if(!file)return;
const r=new FileReader();
r.onload=async ev=>{
let imp;
try{
imp=JSON.parse(ev.target.result);
}catch{toast('❌ File tidak valid / rusak (bukan JSON)!');e.target.value='';return;}
const ok=await applyRestoredData(imp);
if(ok)toast('✅ Data di-restore! (semua tab: keuangan, kendaraan, bisnis shop, dll)');
e.target.value='';
};
r.readAsText(file);
}
let _autoBackupTriggered=false;
function _autoBackupIfOverdue(){
if(_autoBackupTriggered)return;
_autoBackupTriggered=true;
setTimeout(()=>{
try{
runFullBackup();
toast('📦 Backup otomatis dijalankan (sudah lewat 7 hari)',4000);
}catch(e){console.error('Auto-backup gagal:',e);}
},900);
}
function checkBackup(){
if(!D.lastBackup){document.getElementById('backupBanner')?.classList.remove('hidden');document.getElementById('backupBadge').textContent='⚠️ Backup';_autoBackupIfOverdue();return;}
const days=Math.floor((new Date()-new Date(D.lastBackup))/(1000*60*60*24));
if(days>=7){document.getElementById('backupBanner')?.classList.remove('hidden');const lbd=document.getElementById('lastBackupDate');if(lbd)lbd.textContent=new Date(D.lastBackup).toLocaleDateString('id-ID');document.getElementById('backupBadge').textContent='⚠️ Backup';_autoBackupIfOverdue();}
if(D.lastBackup)document.getElementById('lastBackup').textContent=new Date(D.lastBackup).toLocaleDateString('id-ID');
}
function setImportType(type,el){
curImportType=type;
document.querySelectorAll('#importChips .chip-btn').forEach(b=>b.classList.remove('active'));
if(el)el.classList.add('active');
const guides={
cashew:`<div class="u-fs12 u-fw700 u-mb6">📱 Cara export dari Cashew:</div><div class="u-fs12 u-t2 u-lh16">1. Buka Cashew → Settings<br>2. Export → pilih format CSV<br>3. Kirim file ke HP Anda<br>4. Upload di sini</div>`,
csv:`<div class="u-fs12 u-fw700 u-mb6">📄 Format CSV yang didukung:</div><div class="u-fs12 u-t2 u-lh16">Kolom wajib: tanggal, jumlah, kategori<br>Kolom opsional: keterangan, tipe<br>Format tanggal: YYYY-MM-DD atau DD/MM/YYYY</div>`,
money:`<div class="u-fs12 u-fw700 u-mb6">📱 Cara export dari Money Manager:</div><div class="u-fs12 u-t2 u-lh16">1. Buka Money Manager → More<br>2. Backup/Restore → Export to Excel<br>3. Upload file CSV/XLS di sini</div>`,
spendee:`<div class="u-fs12 u-fw700 u-mb6">📱 Cara export dari Spendee:</div><div class="u-fs12 u-t2 u-lh16">1. Buka Spendee → Settings → Export Data<br>2. Pilih format CSV<br>3. Upload di sini</div>`
};
const g=document.getElementById('importGuide'); if(g) g.innerHTML=guides[type];
}
function handleImport(e){
const file=e.target.files[0];if(!file)return;
const r=new FileReader();
r.onload=async ev=>{
try{
const content=ev.target.result;
let imported=[];
let taxonomySummary=null;
if(file.name.endsWith('.json')){
const parsed=JSON.parse(content);
imported=Array.isArray(parsed)?parsed:(parsed.transactions||[]);
} else {
if(curImportType==='cashew'){
taxonomySummary=ensureCashewTaxonomy(content);
}
imported=parseCSVImport(content,curImportType);
}
if(imported.length===0){document.getElementById('importResult').innerHTML='<div class="u-cacc2 u-fs12" style="padding:8px">⚠️ Tidak ada data valid ditemukan</div>';return;}
let confirmMsg=`Ditemukan ${imported.length} transaksi.`;
if(taxonomySummary){
const {newAccounts,newCats,newSubs}=taxonomySummary;
if(newAccounts.length) confirmMsg+=`\n\n🆕 Akun baru dibuat (${newAccounts.length}): ${newAccounts.join(', ')}`;
if(newCats.length) confirmMsg+=`\n\n🆕 Kategori baru dibuat (${newCats.length}): ${newCats.join(', ')}`;
if(newSubs.length) confirmMsg+=`\n\n🆕 Subkategori baru (${newSubs.length}): ${newSubs.join(', ')}`;
if(!newAccounts.length && !newCats.length && !newSubs.length) confirmMsg+=`\n\n✅ Semua akun & kategori sudah cocok dengan yang ada, tidak ada yang baru dibuat.`;
confirmMsg+=`\n\nSetiap transaksi otomatis dicatat ke akun & kategori aslinya dari Cashew. Akun/kategori yang sudah ada TIDAK ditimpa.\n\nImport sekarang?`;
} else {
const defAccName=D.accounts[0]?.name||'akun pertama';
confirmMsg+=` Akan dicatat ke akun "${defAccName}" (bisa dipindah manual nanti). Import sekarang?`;
}
const confirmed=await askConfirm(confirmMsg,{danger:false,okText:'Ya, Import',icon:'📥'});
if(!confirmed){
if(curImportType==='cashew') await load();
return;
}
D.transactions=[...D.transactions,...imported];
save();renderDashboard();
let resultHTML=`<div class="u-cacc3 u-fs12 u-r8" style="padding:8px;background:var(--accent3-soft)">✅ Berhasil import ${imported.length} transaksi!`;
if(taxonomySummary){
const n=taxonomySummary.newAccounts.length+taxonomySummary.newCats.length+taxonomySummary.newSubs.length;
resultHTML+=n?` (${taxonomySummary.newAccounts.length} akun, ${taxonomySummary.newCats.length} kategori, ${taxonomySummary.newSubs.length} subkategori baru dibuat otomatis)`:' (semua akun & kategori sudah cocok)';
}
resultHTML+=`</div>`;
document.getElementById('importResult').innerHTML=resultHTML;
toast('✅ Import berhasil! '+imported.length+' transaksi');
populateCatFilter();
}catch(err){document.getElementById('importResult').innerHTML='<div class="u-cacc2 u-fs12" style="padding:8px">❌ Gagal baca file: '+err.message+'</div>';}
};
r.readAsText(file);
}
function importCarData(e){
const file=e.target.files[0]; if(!file)return;
const resultEl=document.getElementById('carImportResult');
resultEl.innerHTML='⏳ Memproses file...';
const reader=new FileReader();
reader.onload=function(ev){
try{
const content=ev.target.result;
if(!D.vehicles||!D.vehicles.length) D.vehicles=[{id:'veh_1',name:'Vario 125',emoji:'🏍️',serviceIntervalKm:3000}];
const selectedVehId=document.getElementById('carImportVehicle')?document.getElementById('carImportVehicle').value:'';
const vehId=(selectedVehId&&D.vehicles.find(v=>v.id===selectedVehId))?selectedVehId:D.vehicles[0].id;
let bbmCount=0, servisCount=0, skipCount=0, autoDetectCount=0, vehColDetected=false;
function matchVehicleFromText(text){
if(!text)return null;
const t=text.toString().trim().toLowerCase();
if(!t)return null;
return D.vehicles.find(v=>v.name.toLowerCase()===t)
||D.vehicles.find(v=>t.includes(v.name.toLowerCase())||v.name.toLowerCase().includes(t))
||D.vehicles.find(v=>v.emoji&&t.includes(v.emoji))
||null;
}
if(file.name.toLowerCase().endsWith('.json')){
const parsed=JSON.parse(content);
if(Array.isArray(parsed.bbmLogs)){
parsed.bbmLogs.forEach(b=>{
if(D.bbmLogs.find(x=>x.id===b.id))return;
D.bbmLogs.push({...b,id:uid(),vehicleId:b.vehicleId||vehId});
bbmCount++;
});
}
if(Array.isArray(parsed.servisLogs)){
parsed.servisLogs.forEach(s=>{
if(D.servisLogs.find(x=>x.id===s.id))return;
D.servisLogs.push({...s,id:uid(),vehicleId:s.vehicleId||vehId});
servisCount++;
});
}
if(!Array.isArray(parsed.bbmLogs)&&!Array.isArray(parsed.servisLogs)){
resultEl.innerHTML='⚠️ File JSON ini tidak mengandung data BBM/Servis (bbmLogs/servisLogs).';
return;
}
} else {
const lines=content.split(/\r?\n/).filter(l=>l.trim().length);
if(lines.length<2){resultEl.innerHTML='⚠️ File CSV kosong atau format tidak terbaca.';return;}
const header=splitCSVLine(lines[0]).map(h=>h.trim().toLowerCase());
const idxDate=header.findIndex(h=>/tanggal|date/.test(h));
const idxJenis=header.findIndex(h=>/^jenis$|^tipe$|^type$/.test(h));
const idxKet=header.findIndex(h=>/keterangan|note|kategori|category|deskripsi|^item$/.test(h));
const idxJumlah=header.findIndex(h=>/jumlah|amount|total|biaya|harga|cost/.test(h));
const idxLiter=header.findIndex(h=>/liter|litre/.test(h));
const idxKm=header.findIndex(h=>/^km$|odometer/.test(h));
const idxVeh=header.findIndex(h=>/kendaraan|vehicle|^motor$|^mobil$/.test(h));
vehColDetected=idxVeh>=0;
for(let i=1;i<lines.length;i++){
const cols=splitCSVLine(lines[i]);
if(!cols.length)continue;
const matchedVeh=idxVeh>=0?matchVehicleFromText(cols[idxVeh]):null;
const rowVehId=matchedVeh?matchedVeh.id:vehId;
if(matchedVeh)autoDetectCount++;
let date=idxDate>=0?cols[idxDate].trim():'';
const dm=date.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
if(dm){let[,d,m,y]=dm;if(y.length===2)y='20'+y;date=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
const ket=(idxKet>=0?cols[idxKet]:'').toString();
const ketLower=ket.toLowerCase();
const jenis=(idxJenis>=0?cols[idxJenis]:'').toString().toLowerCase().trim();
const amount=idxJumlah>=0?parseFloat(String(cols[idxJumlah]).replace(/[^\d.-]/g,''))||0:0;
const liter=idxLiter>=0?parseFloat(String(cols[idxLiter]).replace(',','.'))||0:0;
const km=idxKm>=0?parseFloat(String(cols[idxKm]).replace(/[^\d.]/g,''))||0:0;
if(!date||isNaN(new Date(date).getTime())){skipCount++;continue;}
const isBbm=jenis?/bbm/.test(jenis):(liter>0||/bbm|bensin|pertalite|pertamax|solar|spbu|isi.*bensin/.test(ketLower));
const isServis=jenis?/servis/.test(jenis):/servis|oli|ban|sparepart|ganti|tune|cvt|kampas|aki|busi/.test(ketLower);
if(isBbm){
D.bbmLogs.push({id:uid(),vehicleId:rowVehId,date,km:km||null,liter,harga:liter?Math.round(amount/liter):0,cost:amount,spbu:ket,fullTank:true,note:'Import: '+ket,accountId:D.accounts[0]?.id,txLinkId:null});
bbmCount++;
} else if(isServis){
D.servisLogs.push({id:uid(),vehicleId:rowVehId,date,item:ket||'Servis (import)',categoryId:null,km:km||null,cost:amount,note:'Import: '+ket,accountId:D.accounts[0]?.id,txLinkId:null});
servisCount++;
} else {
skipCount++;
}
}
}
save();
if(typeof renderCnTab==='function')renderCnTab();
const vehName=(D.vehicles.find(v=>v.id===vehId)||{}).name||'kendaraan terpilih';
resultEl.innerHTML=`✅ Import selesai untuk <b>${escapeHtml(vehName)}</b> (default): <b>${bbmCount}</b> catatan BBM, <b>${servisCount}</b> catatan servis ditambahkan otomatis (dikelompokkan sesuai tanggal & kata kunci). ${vehColDetected?`<br>🚗 Kolom kendaraan terdeteksi di CSV: <b>${autoDetectCount}</b> baris otomatis dicocokkan ke kendaraannya masing-masing, sisanya masuk ke "${escapeHtml(vehName)}".`:''} ${skipCount?`<br>⚠️ ${skipCount} baris dilewati karena tidak cocok format/kata kunci.`:''}`;
toast('✅ Import Car Notes selesai');
}catch(err){
resultEl.innerHTML='❌ Gagal import: '+(err&&err.message?err.message:'format file tidak dikenali');
}
};
reader.readAsText(file);
}
function splitCSVLine(line){
const out=[];let cur='';let inQ=false;
for(let i=0;i<line.length;i++){
const ch=line[i];
if(ch==='"'){inQ=!inQ;}
else if(ch===','&&!inQ){out.push(cur);cur='';}
else cur+=ch;
}
out.push(cur);
return out.map(v=>v.trim().replace(/^"|"$/g,''));
}
const CAT_EMOJI_GUESS=[
[/gaji|penghasilan|salary/i,'💼'],[/bonus/i,'🎁'],[/bisnis|usaha|jual|dagang|shop/i,'🪨'],
[/hadiah|donasi|kurban|thr|tahlilan/i,'🎁'],[/investasi|invest/i,'📈'],[/kebun|tani/i,'🌾'],
[/kiriman|istri/i,'👩'],[/kendaraan|motor|vario|beat|grandmax|transport/i,'🏍️'],
[/bpjs|kesehatan|obat|apotik/i,'💊'],[/tagihan|listrik|wifi|pulsa|kuota|telepon|handphone|hp/i,'🧾'],
[/makan|bahan makanan|kopi|lauk/i,'🍽️'],[/anak/i,'👶'],[/renov|rumah|pipa|cat\b/i,'🔨'],
[/belanja|dapur|sabun/i,'🛒'],[/bepergian|wisata|hotel|tiket|toll/i,'✈️'],[/keluarga|orang tua|saudara/i,'👪'],
[/perawatan|salon|potong|olahraga/i,'💇'],[/shopping|baju|outfit|pakaian|aksesoris/i,'👕'],
[/elektronik/i,'🔌'],[/hewan/i,'🐾'],[/kamera/i,'📷'],[/mesin/i,'⚙️'],[/jasa|servis/i,'🔧'],
[/koreksi/i,'⚖️']
];
function guessCatEmoji(name,type){
const hit=CAT_EMOJI_GUESS.find(([re])=>re.test(name));
return hit?hit[1]:(type==='income'?'💰':'📦');
}
function slugify(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')||'x';}
function ensureCashewTaxonomy(content){
const lines=content.split('\n').filter(l=>l.trim());
const summary={newAccounts:[],newCats:[],newSubs:[]};
if(lines.length<2)return summary;
const headers=splitCSVLine(lines[0]).map(h=>h.toLowerCase());
const idxAccount=headers.indexOf('account');
const idxIncome=headers.indexOf('income');
const idxCat=headers.indexOf('category name');
const idxSub=headers.indexOf('subcategory name');
if(idxCat<0)return summary;
const findAccByName=(n)=>D.accounts.find(a=>a.name.trim().toLowerCase()===n.trim().toLowerCase());
const findCatByName=(type,n)=>D.categories[type].find(c=>c.name.trim().toLowerCase()===n.trim().toLowerCase());
const findSubByName=(cat,n)=>(cat.subs||[]).find(s=>s.name.trim().toLowerCase()===n.trim().toLowerCase());
for(let i=1;i<lines.length;i++){
const vals=splitCSVLine(lines[i]);
if(vals.length<headers.length)continue;
const accName=(idxAccount>=0?vals[idxAccount]:'').trim();
if(accName && !findAccByName(accName)){
const newAcc={id:'acc_'+slugify(accName)+'_'+uid(),name:accName,emoji:'💰',balance:0};
D.accounts.push(newAcc);
summary.newAccounts.push(accName);
}
const isIncome=(idxIncome>=0?vals[idxIncome].toLowerCase():'false')==='true';
const type=isIncome?'income':'expense';
const catName=(idxCat>=0?vals[idxCat]:'').trim();
if(!catName)continue;
let cat=findCatByName(type,catName);
if(!cat){
cat={id:'cat_'+slugify(catName)+'_'+uid(),name:catName,emoji:guessCatEmoji(catName,type),subs:[]};
D.categories[type].push(cat);
summary.newCats.push(`${cat.emoji} ${catName} (${type==='income'?'Pemasukan':'Pengeluaran'})`);
}
const subName=(idxSub>=0?vals[idxSub]:'').trim();
if(subName && !findSubByName(cat,subName)){
if(!cat.subs)cat.subs=[];
cat.subs.push({id:'sub_'+slugify(subName)+'_'+uid(),name:subName});
summary.newSubs.push(`${catName} → ${subName}`);
}
}
return summary;
}
function parseCashewDate(raw){
if(!raw)return new Date().toISOString().split('T')[0];
raw=raw.trim();
const isoMatch=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
if(isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
if(raw.includes('/')){
const p=raw.split(' ')[0].split('/');
if(p.length===3) return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
}
return new Date().toISOString().split('T')[0];
}
function parseCSVImport(content,type){
const lines=content.split('\n').filter(l=>l.trim());
if(lines.length<2)return[];
const headers=splitCSVLine(lines[0]).map(h=>h.toLowerCase());
const results=[];
if(type==='cashew'){
const idxDate=headers.indexOf('date');
const idxAmt=headers.indexOf('amount');
const idxIncome=headers.indexOf('income');
const idxCat=headers.indexOf('category name');
const idxSub=headers.indexOf('subcategory name');
const idxTitle=headers.indexOf('title');
const idxNote=headers.indexOf('note');
const idxAccount=headers.indexOf('account');
for(let i=1;i<lines.length;i++){
const vals=splitCSVLine(lines[i]);
if(vals.length<headers.length)continue;
const dateRaw=idxDate>=0?vals[idxDate]:'';
const date=parseCashewDate(dateRaw);
const amtRaw=idxAmt>=0?vals[idxAmt]:'0';
const amount=Math.abs(parseFloat(amtRaw)||0);
if(amount<=0)continue;
const incomeRaw=idxIncome>=0?vals[idxIncome].toLowerCase():'false';
const isIncome=incomeRaw==='true'||incomeRaw==='1';
const category=idxCat>=0&&vals[idxCat]?vals[idxCat]:'Lainnya';
const sub=idxSub>=0?vals[idxSub]:'';
const title=idxTitle>=0?vals[idxTitle]:'';
const noteV=idxNote>=0?vals[idxNote]:'';
const acc=idxAccount>=0?vals[idxAccount]:'';
const matchedAcc=acc?D.accounts.find(a=>a.name.toLowerCase()===acc.toLowerCase()):null;
results.push({id:uid(),date,type:isIncome?'income':'expense',amount,category,subcategory:sub,accountId:(matchedAcc?matchedAcc.id:D.accounts[0]?.id),payMethod:'tunai',note:[title,noteV].filter(Boolean).join(' - ')});
}
return results;
}
for(let i=1;i<lines.length;i++){
const vals=splitCSVLine(lines[i]);
const row={};
headers.forEach((h,j)=>row[h]=vals[j]||'');
let tx={id:uid(),note:'',category:'Lainnya'};
const dateKey=headers.find(h=>h.includes('date')||h==='tanggal'||h==='waktu');
tx.date=dateKey?parseCashewDate(row[dateKey]):new Date().toISOString().split('T')[0];
const amtKey=headers.find(h=>h.includes('amount')||h.includes('jumlah')||h==='nilai'||h==='total');
if(amtKey){const raw=row[amtKey].replace(/[^0-9.-]/g,'');tx.amount=Math.abs(parseFloat(raw)||0);}
const typeKey=headers.find(h=>h.includes('type')||h==='tipe'||h==='income'||h==='jenis');
if(typeKey){const tv=row[typeKey].toLowerCase();tx.type=(tv.includes('income')||tv.includes('masuk')||tv.includes('pemasukan')||tv==='true')?'income':'expense';}
else tx.type='expense';
const catKey=headers.find(h=>h.includes('categ')||h==='kategori');
if(catKey&&row[catKey])tx.category=row[catKey];
const noteKey=headers.find(h=>h.includes('note')||h==='keterangan'||h==='deskripsi'||h==='memo'||h==='title');
if(noteKey&&row[noteKey])tx.note=row[noteKey];
tx.accountId=D.accounts[0]?.id;
tx.payMethod='tunai';
if(tx.amount>0)results.push(tx);
}
return results;
}
// (v94): toggleMs/showTargetAccountTx/addTarget/delTarget/delReminder sudah dipindah ke transaksi.js
// (gabung bareng saveTarget/saveCatatan/saveReminder/saveLDR yang sudah ada di sana sejak v83).
