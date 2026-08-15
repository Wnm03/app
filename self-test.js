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
return [
{name:'fmt() angka lengkap (tidak disingkat/dibulatkan), titik ribuan', fn:()=>{
// S159: fmt() DIUBAH dari "singkat jt/rb" jadi 100% reuse fmtFull() (lihat
// format-tema.js) -- assertion di bawah diupdate mengikuti perilaku baru,
// bukan reintroduce singkatan lama.
_selfTestAssert(fmt(1500000)==='Rp 1.500.000','fmt(1500000) harus "Rp 1.500.000", dapat "'+fmt(1500000)+'"');
_selfTestAssert(fmt(2500)==='Rp 2.500','fmt(2500) harus "Rp 2.500", dapat "'+fmt(2500)+'"');
_selfTestAssert(fmt(500)==='Rp 500','fmt(500) harus "Rp 500", dapat "'+fmt(500)+'"');
}},
{name:'fmtFull() memakai format ribuan Indonesia', fn:()=>{
const r=fmtFull(1234567);
_selfTestAssert(r.indexOf('Rp')===0,'fmtFull harus diawali "Rp"');
_selfTestAssert(r.indexOf('.')>-1,'fmtFull harus ada pemisah ribuan');
}},
{name:'escapeHtml() menetralkan tag <script>', fn:()=>{
const r=escapeHtml('<script>alert(1)<\/script>');
_selfTestAssert(r.indexOf('<script>')===-1,'escapeHtml gagal menetralkan tag script');
}},
{name:'safeCalc() menghitung ekspresi kalkulator jumlah dengan benar', fn:()=>{
_selfTestAssert(safeCalc('5000+2500')===7500,'safeCalc("5000+2500") harus 7500, dapat '+safeCalc('5000+2500'));
_selfTestAssert(safeCalc('10000-2500')===7500,'safeCalc("10000-2500") harus 7500, dapat '+safeCalc('10000-2500'));
_selfTestAssert(safeCalc('2500*4')===10000,'safeCalc("2500*4") harus 10000, dapat '+safeCalc('2500*4'));
_selfTestAssert(safeCalc('10000/4')===2500,'safeCalc("10000/4") harus 2500, dapat '+safeCalc('10000/4'));
_selfTestAssert(safeCalc('(1000+500)*2')===3000,'safeCalc("(1000+500)*2") harus 3000, dapat '+safeCalc('(1000+500)*2'));
_selfTestAssert(isNaN(safeCalc('1000+abc')),'safeCalc harus menolak input yang bukan ekspresi angka murni');
}},
{name:'safeCalc() titik dianggap pemisah ribuan, kecuali 1-2 digit di akhir', fn:()=>{
_selfTestAssert(safeCalc('1.500.000')===1500000,'safeCalc("1.500.000") harus 1500000 (ribuan), dapat '+safeCalc('1.500.000'));
_selfTestAssert(safeCalc('1.500.000+2.000.000')===3500000,'safeCalc("1.500.000+2.000.000") harus 3500000, dapat '+safeCalc('1.500.000+2.000.000'));
_selfTestAssert(safeCalc('1.500')===1500,'safeCalc("1.500") (3 digit di akhir) harus dianggap ribuan = 1500, dapat '+safeCalc('1.500'));
_selfTestAssert(safeCalc('1500.5')===1500.5,'safeCalc("1500.5") (1 digit di akhir) harus dianggap desimal = 1500.5, dapat '+safeCalc('1500.5'));
_selfTestAssert(safeCalc('1500.50')===1500.5,'safeCalc("1500.50") (2 digit di akhir) harus dianggap desimal = 1500.5, dapat '+safeCalc('1500.50'));
}},
{name:'dateToISO() format YYYY-MM-DD 2 digit', fn:()=>{
const r=dateToISO(new Date(2026,0,5));
_selfTestAssert(r==='2026-01-05','dateToISO(5 Jan 2026) harus "2026-01-05", dapat "'+r+'"');
}},
{name:'todayStr() sama dengan dateToISO(sekarang)', fn:()=>{
_selfTestAssert(todayStr()===dateToISO(new Date()),'todayStr() tidak sinkron dengan dateToISO(new Date())');
}},
{name:'Struktur data utama (D) lengkap', fn:()=>{
_selfTestAssert(Array.isArray(D.transactions),'D.transactions harus array');
_selfTestAssert(Array.isArray(D.bills),'D.bills harus array');
_selfTestAssert(Array.isArray(D.accounts)&&D.accounts.length>0,'D.accounts harus array berisi minimal 1 akun');
_selfTestAssert(D.categories&&Array.isArray(D.categories.income)&&Array.isArray(D.categories.expense),'D.categories harus punya income & expense');
_selfTestAssert(Array.isArray(D.wishlist),'D.wishlist harus array (fitur Prioritas Belanja)');
}},
{name:'totalSaldoAkun() = jumlah manual saldo akun aktif', fn:()=>{
const linked=linkedAssetAccountIds();
const manual=D.accounts.filter(a=>a.includeInBalance!==false&&!linked.has(String(a.id))).reduce((s,a)=>s+recalcAccBalance(a.id),0);
_selfTestAssert(totalSaldoAkun()===manual,'totalSaldoAkun() ('+totalSaldoAkun()+') tidak sama dengan hitungan manual ('+manual+')');
}},
{name:'totalSaldoAkun() mengecualikan akun yang ditautkan dari Buku Aset (cegah dobel hitung Kekayaan Bersih)', fn:()=>{
if(!D.accounts.length)return;
const targetAcc=D.accounts[0];
const before=totalSaldoAkun();
const dummyAsset={id:'__selftest_asset_link__',name:'Tes Diagnostik',jenis:'Reksadana',nilai:1000000,accountId:targetAcc.id};
D.assets.push(dummyAsset);
if(typeof invalidateAccBalCache==='function')invalidateAccBalCache();
try{
_selfTestAssert(isAccLinkedToAsset(targetAcc.id),'isAccLinkedToAsset() harus true setelah akun ditautkan dari 1 aset');
const after=totalSaldoAkun();
const expected=before-recalcAccBalance(targetAcc.id);
_selfTestAssert(after===expected,'totalSaldoAkun() setelah akun ditautkan ('+after+') harus '+expected+' (saldo akun yg ditautkan dikecualikan)');
} finally {
D.assets=D.assets.filter(a=>a.id!=='__selftest_asset_link__');
if(typeof invalidateAccBalCache==='function')invalidateAccBalCache();
}
_selfTestAssert(totalSaldoAkun()===before,'totalSaldoAkun() harus balik ke nilai semula ('+before+') setelah tautan aset tes dihapus, dapat '+totalSaldoAkun());
}},
{name:'Perhitungan jatuh tempo tagihan (objek sementara, tidak disimpan)', fn:()=>{
const dummyBill={id:'__selftest__',name:'Tes Diagnostik',amount:10000,freq:'bulanan',nextDue:todayStr(),acc:D.accounts[0]?D.accounts[0].id:null};
const now=new Date();
const occ=getBillOccurrencesInMonth(dummyBill,now.getFullYear(),now.getMonth());
_selfTestAssert(Array.isArray(occ)&&occ.length>0,'getBillOccurrencesInMonth harus mengembalikan minimal 1 jadwal untuk tagihan bulanan yang jatuh tempo hari ini');
_selfTestAssert(!D.bills.some(b=>b.id==='__selftest__'),'Tes tidak boleh menambahkan tagihan sungguhan ke D.bills');
}},
{name:'Penyimpanan lokal (localStorage) bisa ditulis & dibaca', fn:()=>{
const testKey='kw_selftest_probe';
const testVal=String(Date.now());
const ok=safeSetItem(testKey,testVal);
_selfTestAssert(ok!==false,'safeSetItem gagal menulis ke localStorage');
const read=localStorage.getItem(testKey);
_selfTestAssert(read===testVal,'Nilai yang dibaca kembali dari localStorage tidak sama dengan yang ditulis');
localStorage.removeItem(testKey);
}},
{name:'Data tersimpan (kw_v4) valid JSON setelah saveFlush()', fn:()=>{
saveFlush();
const raw=localStorage.getItem('kw_v4');
_selfTestAssert(!!raw,'kw_v4 tidak ditemukan di localStorage setelah saveFlush()');
let parsed;
try{ parsed=JSON.parse(raw); }catch(e){ throw new Error('kw_v4 bukan JSON valid: '+e.message); }
_selfTestAssert(Array.isArray(parsed.transactions),'kw_v4 tersimpan tidak punya field transactions berupa array');
}},
{name:'MIGRASI STORAGE (LEVEL 3): save() biasa TIDAK menulis kw_v4 ke localStorage (IndexedDB jadi utama)', fn:async()=>{
if(_saveDebounceTimer){clearTimeout(_saveDebounceTimer);_saveDebounceTimer=null;}
localStorage.removeItem('kw_v4');
const original=_saveImmediate;
let called=false;
_saveImmediate=function(){called=true;original();};
try{
save();
const pollStart=Date.now();
while(!called && (Date.now()-pollStart)<3000){ await new Promise(r=>setTimeout(r,25)); }
_selfTestAssert(called,'_saveImmediate() seharusnya terpanggil lewat debounce save()');
await new Promise(r=>setTimeout(r,80));
} finally {
_saveImmediate=original;
}
_selfTestAssert(localStorage.getItem('kw_v4')===null,'save() biasa TIDAK BOLEH menulis kw_v4 ke localStorage -- itu tugas saveFlush() saja di titik kritis');
const mirror=await IDBStore.get('kw_v4_mirror');
_selfTestAssert(!!mirror,'save() biasa tetap harus menulis ke IndexedDB (kw_v4_mirror) sebagai penyimpanan utama');
saveFlush();
}},
{name:'IDBStore (migrasi #4): round-trip tulis/baca IndexedDB', fn:async()=>{
const testKey='kw_selftest_idb_probe';
const testVal=JSON.stringify({probe:Date.now()});
const wrote=await IDBStore.set(testKey,testVal);
_selfTestAssert(wrote===true,'IDBStore.set() harus mengembalikan true kalau berhasil');
const read=await IDBStore.get(testKey);
_selfTestAssert(read===testVal,'Nilai yang dibaca kembali dari IndexedDB tidak sama dengan yang ditulis');
}},
{name:'IDBStore (migrasi #4): mirror kw_v4_mirror sinkron dgn localStorage[kw_v4] setelah save()', fn:async()=>{
saveFlush();
await new Promise(res=>setTimeout(res,80));
const raw=localStorage.getItem('kw_v4');
const mirror=await IDBStore.get('kw_v4_mirror');
_selfTestAssert(!!mirror,'kw_v4_mirror tidak ditemukan di IndexedDB setelah save() -- mirror gagal jalan');
const parsedLocal=JSON.parse(raw), parsedMirror=JSON.parse(mirror);
_selfTestAssert(parsedLocal.transactions.length===parsedMirror.transactions.length,'Jumlah transactions di localStorage vs mirror IndexedDB harus sama persis');
}},
{name:'TimelineW.waterfall(): urutan & rentang bulan tiap tujuan konsisten (LEVEL 2 MAINTENANCE)', fn:()=>{
const{rows,surplus}=TimelineW.waterfall();
rows.forEach((r,i)=>{
if(r.endMonth!=null) _selfTestAssert(r.endMonth>=r.startMonth,'TimelineW baris "'+r.label+'": endMonth harus >= startMonth');
if(i>0 && rows[i-1].endMonth!=null) _selfTestAssert(r.startMonth===rows[i-1].endMonth,'TimelineW baris "'+r.label+'": startMonth harus tepat sama dgn endMonth baris sebelumnya (waterfall)');
});
if(surplus>0) rows.forEach(r=>_selfTestAssert(r.monthsNeeded==null||r.monthsNeeded>=0,'TimelineW baris "'+r.label+'": monthsNeeded tidak boleh negatif'));
}},
{name:'runDataMigrations(): jalur migrasi versi data formal (LEVEL 2 MAINTENANCE)', fn:()=>{
const before=DATA_MIGRATIONS.length;
let ranAgain=false;
const probe={toVersion:SCHEMA_VERSION,desc:'probe tidak boleh jalan',migrate(){ranAgain=true;}};
DATA_MIGRATIONS.push(probe);
try{
runDataMigrations(SCHEMA_VERSION);
_selfTestAssert(!ranAgain,'runDataMigrations() tidak boleh menjalankan migrasi yg toVersion-nya <= versi data saat ini');
_selfTestAssert(D.schemaVersion===SCHEMA_VERSION,'runDataMigrations() harus menyamakan D.schemaVersion ke SCHEMA_VERSION setelah selesai');
} finally { DATA_MIGRATIONS.length=before; }
const order=[];
const fake1={toVersion:9001,desc:'fake migrasi #1',migrate(){order.push(1);}};
const fake2={toVersion:9002,desc:'fake migrasi #2',migrate(){order.push(2);}};
DATA_MIGRATIONS.push(fake2,fake1);
const savedSchemaVersion=D.schemaVersion;
try{
runDataMigrations(0);
_selfTestAssert(order.length===2&&order[0]===1&&order[1]===2,'runDataMigrations() harus menjalankan migrasi terdaftar berurutan sesuai toVersion menaik, dapat urutan "'+order.join(',')+'"');
} finally {
DATA_MIGRATIONS.length=before;
D.schemaVersion=savedSchemaVersion;
}
let secondRan=false;
const willThrow={toVersion:9003,desc:'fake migrasi yg gagal',migrate(){throw new Error('sengaja gagal utk tes');}};
const afterThrow={toVersion:9004,desc:'fake migrasi setelahnya',migrate(){secondRan=true;}};
DATA_MIGRATIONS.push(willThrow,afterThrow);
const savedSchemaVersion2=D.schemaVersion;
try{
// Test ini SENGAJA memicu migrate() throw utk cek runDataMigrations() tetap
// lanjut ke migrasi berikutnya -- tapi catch block aslinya (features-helpers-
// global-security.js) selalu console.error(), yg kalau dibiarkan bocor ke
// console asli user akan kelihatan sprt bug produksi padahal cuma noise tes
// diagnostik. Redam console.error HANYA selama runDataMigrations() ini,
// selalu dikembalikan lewat finally walau assert di bawah gagal/throw.
const _origConsoleError=console.error;
console.error=function(){};
try{
runDataMigrations(9002);
} finally {
console.error=_origConsoleError;
}
_selfTestAssert(secondRan,'runDataMigrations() harus tetap lanjut ke migrasi berikutnya walau ada 1 migrasi yg gagal/throw');
} finally {
DATA_MIGRATIONS.length=before;
D.schemaVersion=savedSchemaVersion2;
}
}},
{name:'Pencarian global tidak error untuk kueri kosong/pendek', fn:()=>{
const q='ab';
D.transactions.filter(t=>(t.note||'').toLowerCase().includes(q)||(t.category||'').toLowerCase().includes(q));
D.bills.filter(b=>(b.name||'').toLowerCase().includes(q));
}},
{name:'Kalkulator cicilan: total harga → cicilan/bulan konsisten', fn:()=>{
const{perBulan}=calcCicilanPerBulanFromTotal(6000000,6,0);
_selfTestAssert(perBulan===1000000,'6.000.000 / 6x tanpa bunga harus jadi cicilan 1.000.000/bulan, dapat '+perBulan);
const{perBulan:perBulanBunga}=calcCicilanPerBulanFromTotal(6000000,6,10);
_selfTestAssert(Math.abs(perBulanBunga-1100000)<=1,'6.000.000 / 6x dengan bunga 10% harus ≈1.100.000/bulan, dapat '+perBulanBunga);
}},
{name:'Transfer antar akun seimbang (transaksi sementara, tidak disimpan)', fn:()=>{
if(D.accounts.length<2){ return; }
const accA=D.accounts[0], accB=D.accounts[1];
const countBefore=D.transactions.length;
const balABefore=recalcAccBalance(accA.id), balBBefore=recalcAccBalance(accB.id);
const amt=1000;
const txOut={id:'__selftest_trout__',type:'transfer_out',amount:amt,category:'Transfer',note:'tes diagnostik',date:todayStr(),accountId:accA.id};
const txIn={id:'__selftest_trin__',type:'transfer_in',amount:amt,category:'Transfer',note:'tes diagnostik',date:todayStr(),accountId:accB.id};
D.transactions.push(txOut,txIn);
if(typeof invalidateAccBalCache==='function')invalidateAccBalCache();
let balAAfter,balBAfter,err=null;
try{
balAAfter=recalcAccBalance(accA.id);
balBAfter=recalcAccBalance(accB.id);
}catch(e){ err=e; }
D.transactions=D.transactions.filter(t=>t.id!=='__selftest_trout__'&&t.id!=='__selftest_trin__');
if(typeof invalidateAccBalCache==='function')invalidateAccBalCache();
_selfTestAssert(D.transactions.length===countBefore,'Transaksi sementara tes transfer gagal dibersihkan dari D.transactions');
if(err) throw err;
_selfTestAssert(balAAfter===balABefore-amt,'Saldo akun asal harus berkurang sesuai jumlah transfer');
_selfTestAssert(balBAfter===balBBefore+amt,'Saldo akun tujuan harus bertambah sesuai jumlah transfer');
}},
{name:'Payload backup lengkap & tidak membocorkan API key', fn:async()=>{
const payload=await buildBackupPayload();
_selfTestAssert(Array.isArray(payload.transactions),'Payload backup harus punya transactions berupa array');
_selfTestAssert(payload.transactions.length===D.transactions.length,'Jumlah transaksi di payload backup harus sama dengan data asli');
_selfTestAssert(Array.isArray(payload.accounts)&&payload.accounts.length===D.accounts.length,'Jumlah akun di payload backup harus sama dengan data asli');
_selfTestAssert(!payload.profile||!('apiKey' in payload.profile),'Payload backup tidak boleh menyertakan API key AI');
const parsed=JSON.parse(JSON.stringify(payload));
_selfTestAssert(parsed.schemaVersion===SCHEMA_VERSION,'schemaVersion payload backup harus sama dengan SCHEMA_VERSION saat ini');
}},
{name:'Tombol Hubungkan/Backup/Restore Drive & Sheets tetap lengkap (tidak ke-hapus tak sengaja)', fn:()=>{
['gdriveEnsureAuth','gdriveConnectOnly','gdriveBackupNow','gdriveRestoreNow','uploadBackupToDrive','gdriveDownloadBackup','gdriveDisconnect','gdriveResetTokenState','gdriveHandleAuthSuccess','gdriveConnStatusLabel','gdriveFetchUserInfo','gdriveThrowForFailedRes'].forEach(fnName=>{
_selfTestAssert(typeof window[fnName]==='function','Fungsi '+fnName+'() harus ada (dipakai tombol Drive di Pengaturan)');
});
['sheetsEnsureAuth','sheetsConnectOnly','sheetsSyncNow','sheetsPullNow'].forEach(fnName=>{
_selfTestAssert(typeof window[fnName]==='function','Fungsi '+fnName+'() harus ada (dipakai tombol Sheets di Pengaturan)');
});
['gdriveConnect','gdriveRestoreConnect'].forEach(fnName=>{
_selfTestAssert(typeof window[fnName]==='undefined','Fungsi lama '+fnName+'() seharusnya sudah tidak dipakai lagi (gabungan connect+aksi, sumber bug lama)');
});
}},
{name:'State googleDrive & googleSheets punya bentuk yang benar', fn:()=>{
_selfTestAssert(D.googleDrive&&typeof D.googleDrive==='object','D.googleDrive harus object');
_selfTestAssert('clientId' in D.googleDrive && 'fileId' in D.googleDrive && 'autoSync' in D.googleDrive,'D.googleDrive harus punya clientId, fileId, autoSync');
_selfTestAssert(typeof D.googleDrive.autoSync==='boolean','D.googleDrive.autoSync harus boolean');
_selfTestAssert(D.googleSheets&&typeof D.googleSheets==='object','D.googleSheets harus object');
_selfTestAssert('spreadsheetId' in D.googleSheets,'D.googleSheets harus punya spreadsheetId');
_selfTestAssert(gdrivePendingAfterAuth===null||typeof gdrivePendingAfterAuth==='function','gdrivePendingAfterAuth harus null atau function, bukan tersangkut state lain');
_selfTestAssert(sheetsPendingAfterAuth===null||typeof sheetsPendingAfterAuth==='function','sheetsPendingAfterAuth harus null atau function, bukan tersangkut state lain');
}},
{name:'Konsistensi state token Google (scope, expiry, email) & label status', fn:()=>{
if(!gdriveAccessToken){
_selfTestAssert(gdriveTokenScope===null,'gdriveTokenScope harus null kalau belum ada token');
_selfTestAssert(gdriveTokenExpiresAt===null,'gdriveTokenExpiresAt harus null kalau belum ada token');
_selfTestAssert(gdriveUserEmail===null,'gdriveUserEmail harus null kalau belum ada token');
} else {
_selfTestAssert(gdriveTokenScope==='drive'||gdriveTokenScope==='sheets','gdriveTokenScope harus \'drive\' atau \'sheets\' kalau ada token');
}
_selfTestAssert(typeof gdriveConnStatusLabel()==='string'&&gdriveConnStatusLabel().length>0,'gdriveConnStatusLabel() harus selalu mengembalikan teks status, bukan kosong/undefined');
_selfTestAssert(typeof gdriveConnStatusLabel(true)==='string'&&gdriveConnStatusLabel(true).length>0,'gdriveConnStatusLabel(true) (mode Sheets) harus selalu mengembalikan teks status');
}},
{name:'getPTKP() menghitung PTKP PPh 21 sesuai status kawin & tanggungan', fn:()=>{
_selfTestAssert(getPTKP('TK0')===54000000,'PTKP TK/0 harus 54.000.000, dapat '+getPTKP('TK0'));
_selfTestAssert(getPTKP('TK1')===58500000,'PTKP TK/1 harus 58.500.000, dapat '+getPTKP('TK1'));
_selfTestAssert(getPTKP('K0')===58500000,'PTKP K/0 harus 58.500.000, dapat '+getPTKP('K0'));
_selfTestAssert(getPTKP('K3')===72000000,'PTKP K/3 harus 72.000.000, dapat '+getPTKP('K3'));
}},
{name:'profilePTKPStatus(): status PTKP diturunkan benar dari Profil Pribadi (statusKawin & tanggungan), tidak merusak profil asli', fn:()=>{
if(typeof profilePTKPStatus!=='function')return;
const backup={statusKawin:D.profile.statusKawin,tanggungan:D.profile.tanggungan};
try{
D.profile.statusKawin=false; D.profile.tanggungan=0;
_selfTestAssert(profilePTKPStatus()==='TK0','Belum kawin & 0 tanggungan harus jadi status TK0');
D.profile.statusKawin=true; D.profile.tanggungan=1;
_selfTestAssert(profilePTKPStatus()==='K1','Kawin & 1 tanggungan (mis. 1 anak) harus jadi status K1');
D.profile.statusKawin=true; D.profile.tanggungan=3;
_selfTestAssert(profilePTKPStatus()==='K3','Kawin & 3 tanggungan harus jadi status K3');
D.profile.statusKawin=true; D.profile.tanggungan=9;
_selfTestAssert(profilePTKPStatus()==='K3','Tanggungan di atas 3 harus di-cap ke 3 (maks PTKP resmi), bukan K9 yg tidak valid');
D.profile.statusKawin=false; D.profile.tanggungan=undefined;
_selfTestAssert(profilePTKPStatus()==='TK0','Tanggungan undefined/belum diisi harus dianggap 0, bukan error');
} finally {
D.profile.statusKawin=backup.statusKawin; D.profile.tanggungan=backup.tanggungan;
}
_selfTestAssert(D.profile.statusKawin===backup.statusKawin&&D.profile.tanggungan===backup.tanggungan,'Profil Pribadi asli harus balik seperti semula setelah tes');
}},
{name:'profileJiwaKeluarga(): jumlah jiwa Zakat Fitrah diturunkan benar dari Profil Pribadi, tidak merusak profil asli', fn:()=>{
if(typeof profileJiwaKeluarga!=='function')return;
const backup={statusKawin:D.profile.statusKawin,tanggungan:D.profile.tanggungan};
try{
D.profile.statusKawin=false; D.profile.tanggungan=0;
_selfTestAssert(profileJiwaKeluarga()===1,'Belum kawin & 0 tanggungan harus 1 jiwa (diri sendiri), dapat '+profileJiwaKeluarga());
D.profile.statusKawin=true; D.profile.tanggungan=0;
_selfTestAssert(profileJiwaKeluarga()===2,'Kawin & 0 tanggungan harus 2 jiwa (diri sendiri+pasangan), dapat '+profileJiwaKeluarga());
D.profile.statusKawin=true; D.profile.tanggungan=1;
_selfTestAssert(profileJiwaKeluarga()===3,'Kawin & 1 tanggungan harus 3 jiwa, dapat '+profileJiwaKeluarga());
D.profile.statusKawin=true; D.profile.tanggungan=3;
_selfTestAssert(profileJiwaKeluarga()===5,'Kawin & 3 tanggungan harus 5 jiwa, dapat '+profileJiwaKeluarga());
D.profile.statusKawin=false; D.profile.tanggungan=undefined;
_selfTestAssert(profileJiwaKeluarga()===1,'Tanggungan undefined/belum diisi harus dianggap 0, bukan error');
} finally {
D.profile.statusKawin=backup.statusKawin; D.profile.tanggungan=backup.tanggungan;
}
_selfTestAssert(D.profile.statusKawin===backup.statusKawin&&D.profile.tanggungan===backup.tanggungan,'Profil Pribadi asli harus balik seperti semula setelah tes');
}},
{name:'updateUsiaPreview(): usia di kartu Profil Pribadi ikut Tanggal Lahir & sembunyi kalau kosong', fn:()=>{
if(typeof updateUsiaPreview!=='function'||!document.getElementById('sUsiaPreview'))return;
const backup=D.profile.tanggalLahir;
try{
D.profile.tanggalLahir=null;
updateUsiaPreview();
_selfTestAssert(document.getElementById('sUsiaPreview').style.display==='none','Tanpa Tanggal Lahir, baris usia harus disembunyikan');
const b=new Date(); b.setFullYear(b.getFullYear()-29);
D.profile.tanggalLahir=b.toISOString().split('T')[0];
updateUsiaPreview();
_selfTestAssert(document.getElementById('sUsiaPreview').style.display==='block','Dengan Tanggal Lahir terisi, baris usia harus ditampilkan');
_selfTestAssert(document.getElementById('sUsiaVal').textContent==='29 tahun','Usia harus dihitung benar dari Tanggal Lahir (29 tahun), dapat '+document.getElementById('sUsiaVal').textContent);
} finally {
D.profile.tanggalLahir=backup;
updateUsiaPreview();
}
}},
{name:'renderPajakRekomendasi(): saran kalkulator pajak ikut Status Pekerjaan & sembunyi kalau belum diisi', fn:()=>{
if(typeof renderPajakRekomendasi!=='function'||!document.getElementById('pajakRekomendasiCard'))return;
const backup=D.profile.statusPekerjaan;
try{
D.profile.statusPekerjaan=null;
renderPajakRekomendasi();
_selfTestAssert(document.getElementById('pajakRekomendasiCard').style.display==='none','Belum pilih Status Pekerjaan -> kartu rekomendasi harus disembunyikan');
D.profile.statusPekerjaan='karyawan';
renderPajakRekomendasi();
_selfTestAssert(document.getElementById('pajakRekomendasiCard').style.display==='block','Status Karyawan -> kartu rekomendasi harus tampil');
_selfTestAssert(/PPh 21/.test(document.getElementById('pajakRekomendasiText').innerHTML),'Status Karyawan -> saran harus menyebut PPh 21');
D.profile.statusPekerjaan='freelance';
renderPajakRekomendasi();
_selfTestAssert(/UMKM/.test(document.getElementById('pajakRekomendasiText').innerHTML),'Status Freelance/UMKM -> saran harus menyebut UMKM');
} finally {
D.profile.statusPekerjaan=backup;
renderPajakRekomendasi();
}
}},
{name:'hitungPPh21Progresif() menerapkan tarif berjenjang dengan benar', fn:()=>{
_selfTestAssert(hitungPPh21Progresif(0).pajak===0,'PKP 0 harus menghasilkan pajak 0');
_selfTestAssert(hitungPPh21Progresif(60000000).pajak===3000000,'PKP 60jt (lapisan 5%) harus 3.000.000, dapat '+hitungPPh21Progresif(60000000).pajak);
const r=hitungPPh21Progresif(100000000);
_selfTestAssert(r.pajak===9000000,'PKP 100jt (60jt×5% + 40jt×15%) harus 9.000.000, dapat '+r.pajak);
}},
{name:'daysUntilDate() & dateStatusBadge() mendeteksi status jatuh tempo STNK/SIM dengan benar', fn:()=>{
_selfTestAssert(daysUntilDate(null)===null,'daysUntilDate(null) harus null');
_selfTestAssert(dateStatusBadge(null).label==='Belum diisi','Tanggal kosong harus berstatus "Belum diisi"');
const past=new Date(); past.setDate(past.getDate()-5);
_selfTestAssert(dateStatusBadge(dateToISO(past)).col==='red','Tanggal 5 hari lalu harus berstatus merah (lewat jatuh tempo)');
const soon=new Date(); soon.setDate(soon.getDate()+10);
_selfTestAssert(dateStatusBadge(dateToISO(soon)).col==='orange','Tanggal 10 hari lagi (≤30 hari) harus berstatus oranye (mendekati)');
const far=new Date(); far.setDate(far.getDate()+100);
_selfTestAssert(dateStatusBadge(dateToISO(far)).col==='green','Tanggal 100 hari lagi harus berstatus hijau (masih aktif)');
}},
{name:'sptTahunanDueDate() & sptStatusBadge(): batas lapor SPT Tahunan (31 Maret) dihitung & diberi status yang benar', fn:()=>{
if(typeof sptTahunanDueDate!=='function')return;
const due=new Date(sptTahunanDueDate());
_selfTestAssert(due.getMonth()===2&&due.getDate()===31,'sptTahunanDueDate() harus selalu jatuh di 31 Maret, dapat '+sptTahunanDueDate());
const now=new Date();now.setHours(0,0,0,0);
const diffDays=Math.round((now-due)/86400000);
_selfTestAssert(diffDays<=30,'sptTahunanDueDate() tidak boleh menunjuk tanggal yg sudah lewat >30 hari (harus sudah dimajukan ke tahun depan)');
const st=sptStatusBadge();
_selfTestAssert(typeof st.label==='string'&&st.label.length>0,'sptStatusBadge() harus selalu mengembalikan label, dapat kosong/undefined');
_selfTestAssert(['red','orange','green'].includes(st.col),'sptStatusBadge() harus salah satu warna red/orange/green, dapat '+st.col);
}},
{name:'hitungZakatPenghasilan(): wajib jika pemasukan bulan ini ≥ nisab, zakat = 2.5%', fn:()=>{
if(!document.getElementById('zpJumlah'))return;
hitungZakatPenghasilan();
const incomeBulan=parsePzNum(document.getElementById('zpIncomeBulan').textContent);
const nisab=parsePzNum(document.getElementById('zpNisabBulan').textContent);
const jumlah=parsePzNum(document.getElementById('zpJumlah').textContent);
const expected=(incomeBulan>=nisab)?Math.round(incomeBulan*0.025):0;
_selfTestAssert(jumlah===expected,'Zakat penghasilan seharusnya '+fmtFull(expected)+', dapat '+fmtFull(jumlah));
}},
{name:'Rumus Zakat Maal (85gr emas & 2.5%) konsisten dengan tampilan terakhir', fn:()=>{
if(!_pajakZakatRenderedOnce)return;
const nisabEl=document.getElementById('zmNisab'), hartaEl=document.getElementById('zmTotalHarta');
if(!nisabEl||!hartaEl||!nisabEl.textContent)return;
const pz=D.pajakZakat;
const expectedNisab=85*pz.hargaEmasPerGram;
_selfTestAssert(parsePzNum(nisabEl.textContent)===expectedNisab,'Nisab zakat maal tertampil harus = 85 × harga emas/gram ('+fmtFull(expectedNisab)+')');
const saldoAkun=totalSaldoAkun();
const asetZakatable=(D.assets||[]).filter(a=>a.zakatable).reduce((s,a)=>s+(typeof MultiOwnerEngine!=='undefined'?MultiOwnerEngine.selfOwnedValue(a,a.nilai||0):(a.nilai||0)),0);
const piutangZakatable=totalPiutangValue();
const utang=(pz.utangJT||0)+totalDebtValue()+totalCicilanOutstanding();
const expectedHarta=Math.max(0,saldoAkun+asetZakatable+piutangZakatable-utang);
_selfTestAssert(parsePzNum(hartaEl.textContent)===expectedHarta,'Total harta zakat maal tertampil harus = saldo akun + aset zakatable + piutang zakatable − utang (manual + Buku Utang + cicilan outstanding)');
}},
{name:'hitungZakatFitrah(): total = jumlah jiwa × tarif per jiwa', fn:()=>{
const jiwaEl=document.getElementById('zfJiwa');
if(!jiwaEl)return;
hitungZakatFitrah();
const jiwa=Math.max(1,parseInt(jiwaEl.value)||1);
const expected=jiwa*D.pajakZakat.zakatFitrahPerJiwa;
_selfTestAssert(parsePzNum(document.getElementById('zfTotal').textContent)===expected,'Total zakat fitrah harus '+fmtFull(expected));
}},
{name:'PPh21.hitung(): Penghasilan Bruto & Iuran Pensiun tersimpan ke D.pajakZakat supaya tidak reset tiap buka tab', fn:()=>{
const brutoEl=document.getElementById('pphBruto'),iuranEl=document.getElementById('pphIuran');
if(!brutoEl||!iuranEl)return;
hitungPPh21();
const brutoExpected=parsePzNum(brutoEl.value),iuranExpected=parsePzNum(iuranEl.value);
_selfTestAssert(D.pajakZakat.pphBrutoBulan===brutoExpected,'pphBrutoBulan tersimpan harus ikut nilai field Penghasilan Bruto ('+brutoExpected+'), dapat '+D.pajakZakat.pphBrutoBulan);
_selfTestAssert(D.pajakZakat.pphIuranBulan===iuranExpected,'pphIuranBulan tersimpan harus ikut nilai field Iuran Pensiun ('+iuranExpected+'), dapat '+D.pajakZakat.pphIuranBulan);
}},
{name:'renderUMKMPajak(): PPh Final UMKM = 0.5% dari omzet Shop bulan ini', fn:()=>{
if(!document.getElementById('umkmOmzet'))return;
renderUMKMPajak();
const omzet=parsePzNum(document.getElementById('umkmOmzet').textContent);
const pajak=parsePzNum(document.getElementById('umkmPajak').textContent);
_selfTestAssert(pajak===Math.round(omzet*0.005),'Pajak UMKM harus 0.5% dari omzet ('+fmtFull(Math.round(omzet*0.005))+'), dapat '+fmtFull(pajak));
}},
{name:'hitungPBB(): NJOP kena pajak & PBB terutang dihitung sesuai NJOPTKP & tarif', fn:()=>{
if(!document.getElementById('pbbNjopTotal'))return;
hitungPBB();
const bumi=parsePzNum(document.getElementById('pbbNjopBumi').value);
const bangunan=parsePzNum(document.getElementById('pbbNjopBangunan').value);
const njoptkp=parsePzNum(document.getElementById('pbbNjoptkp').value);
const tarif=parseFloat((document.getElementById('pbbTarif').value||'0').replace(',','.'))||0;
const expectedTotal=bumi+bangunan;
const expectedKenaPajak=Math.max(0,expectedTotal-njoptkp);
const expectedTerutang=Math.round(expectedKenaPajak*(tarif/100));
_selfTestAssert(parsePzNum(document.getElementById('pbbNjopTotal').textContent)===expectedTotal,'NJOP Total harus = NJOP Bumi + NJOP Bangunan');
_selfTestAssert(parsePzNum(document.getElementById('pbbNjopKenaPajak').textContent)===expectedKenaPajak,'NJOP Kena Pajak harus = NJOP Total − NJOPTKP (minimal 0)');
_selfTestAssert(parsePzNum(document.getElementById('pbbTerutang').textContent)===expectedTerutang,'PBB terutang harus = NJOP Kena Pajak × tarif%');
}},
{name:'Buku Aset: totalAssetValue() & Kekayaan Bersih konsisten (aset sementara, tidak disimpan)', fn:()=>{
const before=totalAssetValue();
const dummy={id:'__selftest_asset__',name:'Tes Diagnostik',jenis:'Lainnya',lokasi:'',nilai:1000,tanggal:'',zakatable:false};
D.assets.push(dummy);
let after;
try{ after=totalAssetValue(); } finally { D.assets=D.assets.filter(a=>a.id!=='__selftest_asset__'); }
_selfTestAssert(after===before+1000,'totalAssetValue() harus bertambah 1.000 setelah aset sementara ditambahkan');
_selfTestAssert(!D.assets.some(a=>a.id==='__selftest_asset__'),'Aset sementara tes gagal dibersihkan dari D.assets');
const netEl=document.getElementById('kbNetWorth');
if(netEl&&netEl.textContent){
renderKekayaanBersih();
const utangManual=D.pajakZakat.utangJT||parsePzNum(document.getElementById('zmUtang')?document.getElementById('zmUtang').value:0);
const utang=utangManual+totalDebtValue()+totalCicilanOutstanding();
// FIX (S482, laporan Tes Otomatis "Buku Aset: totalAssetValue() & Kekayaan Bersih
// konsisten"): formula ekspektasi di bawah ini ketinggalan zaman -- Kekayaan.renderBersih()
// (modules-calc.js) & SSOT Kekayaan.currentNetWorth() sejak S476a (Blocker A) SUDAH
// menambahkan Investment.selfOwnedTotalValue() (holding investasi porsi SELF) ke totalAset,
// tapi baris expected di sini tidak ikut diperbarui -- bikin test ini SELALU gagal (false
// positive) begitu ada holding investasi tersimpan, walau kodenya sendiri sudah benar &
// konsisten dgn SSOT. Disamakan persis dgn rumus renderBersih()/currentNetWorth().
const totalAsetExpected=totalAssetValue()+(typeof Investment!=='undefined'?Investment.selfOwnedTotalValue():0);
// FIX (S555, laporan Tes Otomatis "Buku Aset: totalAssetValue() & Kekayaan
// Bersih konsisten"): dapat 27328191 vs ekspektasi 27328191.083606 -- BUKAN
// bug kode, tapi false positive di test ini sendiri. netEl.textContent
// dihasilkan lewat fmtFullSigned() (renderBersih(), modules-calc.js) yang
// Math.round() nilainya SEBELUM ditampilkan (nominal rupiah tidak pernah
// pecahan), sedangkan `expected` di sini dihitung ulang langsung dari
// totalAssetValue()/Investment.selfOwnedTotalValue()/dst TANPA pembulatan --
// begitu ada holding investasi dgn harga/unit pecahan (mis. NAV reksadana),
// expected jadi py pecahan sementara hasil tampilan sudah dibulatkan,
// sehingga perbandingan strict (===) SELALU gagal walau rumusnya sendiri
// sudah 100% sama dgn renderBersih()/currentNetWorth(). Bulatkan expected
// dgn Math.round() supaya dibandingkan setara (apples-to-apples) dgn nilai
// yang benar-benar dirender ke layar.
const expected=Math.round(totalSaldoAkun()+totalAsetExpected+totalInventoriBisnisValue()+totalPiutangValue()-utang);
_selfTestAssert(parsePzNum(netEl.textContent)===expected,'Kekayaan Bersih harus = saldo akun + total aset (termasuk holding investasi porsi SELF) + inventori bisnis + total piutang − (utang manual + utang tercatat + sisa cicilan/paylater), dapat '+parsePzNum(netEl.textContent)+' vs ekspektasi '+expected);
}
}},
{name:'Regresi bug ID string vs number: pencarian & hapus di Aset/Piutang/Kekayaan/SIM/Zakat (sementara, tidak disimpan)', fn:()=>{
const numId=uid();
const strId=String(numId);
const dummyAsset={id:numId,name:'__selftest_id__',jenis:'Lainnya',lokasi:'',nilai:1,tanggal:'',zakatable:false};
D.assets.push(dummyAsset);
_selfTestAssert(D.assets.find(x=>sameId(x.id,strId))===dummyAsset,'Aset: pencarian dgn id STRING harus tetap ketemu walau id asli NUMBER');
D.assets=D.assets.filter(a=>!sameId(a.id,strId));
_selfTestAssert(!D.assets.some(a=>a.id===numId),'Aset: hapus dgn id STRING harus tetap menghapus walau id asli NUMBER');
const dummyPiutang={id:numId,name:'__selftest_id__',nilai:1,tanggal:'',jatuhTempo:'',catatan:'',lunas:false};
D.piutang.push(dummyPiutang);
_selfTestAssert(D.piutang.find(x=>sameId(x.id,strId))===dummyPiutang,'Piutang: pencarian dgn id STRING harus tetap ketemu walau id asli NUMBER');
D.piutang=D.piutang.filter(p=>!sameId(p.id,strId));
_selfTestAssert(!D.piutang.some(p=>p.id===numId),'Piutang: hapus dgn id STRING harus tetap menghapus walau id asli NUMBER');
if(!D.wealthSnapshots)D.wealthSnapshots=[];
const dummySnap={id:numId,date:'2000-01-01',netWorth:1,auto:false};
D.wealthSnapshots.push(dummySnap);
_selfTestAssert(D.wealthSnapshots.find(x=>sameId(x.id,strId))===dummySnap,'Kekayaan: pencarian snapshot dgn id STRING harus tetap ketemu walau id asli NUMBER');
D.wealthSnapshots=D.wealthSnapshots.filter(s=>!sameId(s.id,strId));
_selfTestAssert(!D.wealthSnapshots.some(s=>s.id===numId),'Kekayaan: hapus snapshot dgn id STRING harus tetap menghapus walau id asli NUMBER');
const dummySim={id:numId,nama:'__selftest_id__',jenis:'SIM C',tglAkhir:''};
D.simList.push(dummySim);
_selfTestAssert(D.simList.find(x=>sameId(x.id,strId))===dummySim,'SIM: pencarian dgn id STRING harus tetap ketemu walau id asli NUMBER');
D.simList=D.simList.filter(s=>!sameId(s.id,strId));
_selfTestAssert(!D.simList.some(s=>s.id===numId),'SIM: hapus dgn id STRING harus tetap menghapus walau id asli NUMBER');
if(!D.pajakZakat.zakatLog)D.pajakZakat.zakatLog=[];
const dummyZakat={id:numId,jenis:'maal',tanggal:'2000-01-01',jumlah:1};
D.pajakZakat.zakatLog.push(dummyZakat);
_selfTestAssert(D.pajakZakat.zakatLog.find(x=>sameId(x.id,strId))===dummyZakat,'Zakat: pencarian catatan dgn id STRING harus tetap ketemu walau id asli NUMBER');
D.pajakZakat.zakatLog=D.pajakZakat.zakatLog.filter(l=>!sameId(l.id,strId));
_selfTestAssert(!D.pajakZakat.zakatLog.some(l=>l.id===numId),'Zakat: hapus catatan dgn id STRING harus tetap menghapus walau id asli NUMBER');
}},
{name:'Regresi bug ID string vs number: Tagihan/BBM/Servis/Tukang tetap aman lewat pola pemanggilan yang benar (sementara, tidak disimpan)', fn:()=>{
const numId=uid();
const dummyBill={id:numId,name:'__selftest_id__',amount:1,nextDue:'2000-01-01',freq:'sekali',category:'Tagihan',subcategory:'',accountId:null,note:'',kind:'tagihan'};
D.bills.push(dummyBill);
const idFromJsonArgs=JSON.parse(JSON.stringify([numId]))[0];
_selfTestAssert(typeof idFromJsonArgs==='number','Bills: id yang lewat JSON.parse(data-args) harus tetap bertipe number, bukan string');
_selfTestAssert(D.bills.find(x=>x.id===idFromJsonArgs)===dummyBill,'Bills: pencarian id via jalur data-args (number) harus tetap ketemu');
D.bills=D.bills.filter(b=>b.id!==numId);
_selfTestAssert(!D.bills.some(b=>b.id===numId),'Bills: hapus id via jalur yang benar harus tetap berhasil');
const dummyBbm={id:numId,vehicleId:'v1',date:'2000-01-01',km:1,liter:1,harga:1,cost:1,spbu:'',fullTank:true,note:'',accountId:null,txLinkId:null};
D.bbmLogs.push(dummyBbm);
const bbmIdFromArgs=JSON.parse(JSON.stringify([numId]))[0];
_selfTestAssert(D.bbmLogs.find(x=>x.id===bbmIdFromArgs)===dummyBbm,'BBM: pencarian id via jalur data-args (number) harus tetap ketemu');
D.bbmLogs=D.bbmLogs.filter(b=>b.id!==numId);
const dummyServis={id:numId,vehicleId:'v1',date:'2000-01-01',item:'__selftest_id__',categoryId:null,km:1,cost:1,note:'',accountId:null,txLinkId:null};
D.servisLogs.push(dummyServis);
const servisIdFromArgs=JSON.parse(JSON.stringify([numId]))[0];
_selfTestAssert(D.servisLogs.find(x=>x.id===servisIdFromArgs)===dummyServis,'Servis: pencarian id via jalur data-args (number) harus tetap ketemu');
D.servisLogs=D.servisLogs.filter(s=>s.id!==numId);
const strId=String(numId);
const dummyWorker={id:numId,name:'__selftest_id__',upahJam:1,jamKerjaNormal:7,upahLemburJam:1};
D.tukangWorkers.push(dummyWorker);
_selfTestAssert(D.tukangWorkers.find(x=>x.id==strId)===dummyWorker,'Tukang: pencarian pekerja dgn id STRING harus tetap ketemu (loose ==) walau id asli NUMBER');
D.tukangWorkers=D.tukangWorkers.filter(x=>x.id!=strId);
_selfTestAssert(!D.tukangWorkers.some(w=>w.id===numId),'Tukang: hapus pekerja dgn id STRING harus tetap berhasil (loose ==)');
}},
{name:'Sewa Kios: catatSewa->applyPaymentLink (riwayat baru "diterima" HANYA setelah tx tersimpan), sync 2 arah edit/hapus, & ROI (sementara, tidak disimpan)', fn:()=>{
const dummyProj={id:'__selftest_renovproj__',name:'__selftest_renovproj__',catatan:'',createdAt:'2000-01-01',items:[{id:'__selftest_renovitem__',name:'x',harga:1000000,category:'',accountId:null,note:'',paid:true,txId:null,paidDate:null}]};
D.renovProjects.push(dummyProj);
const dummyUnit={id:'__selftest_sk_unit__',name:'__selftest_sk_unit__',renovProjectId:dummyProj.id,accountId:D.accounts[0]?.id||null,status:'disewa',penyewa:'',hargaSewaBulanan:200000,catatan:'',mulai:'2000-01-01',riwayat:[]};
D.sewaKios.units.push(dummyUnit);
try{
SewaKios.pendingUnitId=dummyUnit.id;
_selfTestAssert(dummyUnit.riwayat.length===0,'Sewa Kios: riwayat TIDAK boleh bertambah sebelum applyPaymentLink() dipanggil (tx belum beneran tersimpan)');
const fakeTxId=uid();
D.transactions.push({id:fakeTxId,type:'income',amount:200000,category:'Bisnis',subcategory:'',accountId:D.accounts[0]?.id||'',payMethod:'tunai',note:'__selftest_sk_tx__',date:'2000-02-01'});
SewaKios.applyPaymentLink(fakeTxId);
_selfTestAssert(dummyUnit.riwayat.length===1,'Sewa Kios: riwayat harus bertambah 1 setelah applyPaymentLink() dgn tx yg valid');
_selfTestAssert(dummyUnit.riwayat[0].txId===fakeTxId,'Sewa Kios: entri riwayat harus tersambung ke ID transaksi asli (txId)');
const linkedTx=D.transactions.find(x=>x.id===fakeTxId);
_selfTestAssert(linkedTx.sewaKiosLinkId===dummyUnit.id,'Transaksi harus tersambung balik ke unit (sewaKiosLinkId) — link 2 arah');
_selfTestAssert(SewaKios.pendingUnitId===null,'pendingUnitId harus direset ke null setelah applyPaymentLink() dipakai');
const r1=SewaKios.roi(dummyUnit);
_selfTestAssert(r1.modal===1000000,'ROI: modal harus diambil dari Renov.totals() proyek yg ditautkan');
_selfTestAssert(r1.diterima===200000,'ROI: diterima harus = jumlah semua riwayat sewa unit ini');
_selfTestAssert(r1.pctBalik===20,'ROI: persen balik modal harus 20% (200rb dari 1jt)');
_selfTestAssert(r1.paybackBulan===5,'ROI: estimasi balik modal harus ceil(modal/hargaSewaBulanan) = 5 bulan');
linkedTx.amount=250000;linkedTx.date='2000-03-01';
SewaKios.onLinkedTxEdited(linkedTx);
_selfTestAssert(dummyUnit.riwayat[0].jumlah===250000,'Sewa Kios: onLinkedTxEdited harus sinkronkan nominal riwayat sesuai transaksi yg diedit');
_selfTestAssert(dummyUnit.riwayat[0].tanggal==='2000-03-01','Sewa Kios: onLinkedTxEdited harus sinkronkan tanggal riwayat sesuai transaksi yg diedit');
SewaKios.onLinkedTxDeleted(linkedTx);
_selfTestAssert(dummyUnit.riwayat.length===0,'Sewa Kios: onLinkedTxDeleted harus menghapus entri riwayat terkait tapi TIDAK menghapus unit-nya');
_selfTestAssert(D.sewaKios.units.some(u=>u.id===dummyUnit.id),'Sewa Kios: unit tidak boleh ikut terhapus saat transaksi sewa terkait dihapus');
D.transactions=D.transactions.filter(t=>t.id!==fakeTxId);
} finally {
D.sewaKios.units=D.sewaKios.units.filter(u=>u.id!==dummyUnit.id);
D.renovProjects=D.renovProjects.filter(p=>p.id!==dummyProj.id);
SewaKios.pendingUnitId=null;
}
}},
{name:'Stok Sparepart (Shop): tambah/hapus item tidak merusak D.partsStock (sementara, tidak disimpan)', fn:()=>{
const before=D.partsStock.length;
const dummy={id:'__selftest_stock__',name:'Tes Diagnostik',catId:null,code:'TEST-000',qty:5,unit:'pcs',minStock:1,price:1000,note:''};
D.partsStock.push(dummy);
_selfTestAssert(D.partsStock.length===before+1,'D.partsStock harus bertambah 1 setelah item sementara ditambahkan');
D.partsStock=D.partsStock.filter(p=>p.id!=='__selftest_stock__');
_selfTestAssert(D.partsStock.length===before,'D.partsStock harus kembali ke jumlah semula setelah item sementara dihapus');
}},
{name:'getBudgetUsed() & getBudgetEffectiveLimit(): agregasi anggaran total sesuai transaksi bulan berjalan', fn:()=>{
const dummyBudget={id:'__selftest_budget__',catIds:['__total__'],limit:1,rollover:false};
const manual=D.transactions.filter(t=>{
const d=new Date(t.date);
return t.type==='expense'&&d.getMonth()===curMonth&&d.getFullYear()===curYear;
}).reduce((s,t)=>s+t.amount,0);
_selfTestAssert(getBudgetUsed(dummyBudget)===manual,'getBudgetUsed() untuk anggaran total harus sama dengan jumlah manual pengeluaran bulan ini');
_selfTestAssert(getBudgetEffectiveLimit(dummyBudget)===1,'getBudgetEffectiveLimit() tanpa rollover harus sama dengan limit anggaran');
_selfTestAssert(!D.budgets.some(b=>b.id==='__selftest_budget__'),'Tes tidak boleh menambahkan anggaran sungguhan ke D.budgets');
}},
{name:'Anggaran periode (bulanan/tahunan/1x nominal): getBudgetUsed() memakai jendela waktu yg tepat per periode', fn:()=>{
const manualBulan=D.transactions.filter(t=>{
const d=new Date(t.date);
return t.type==='expense'&&d.getMonth()===curMonth&&d.getFullYear()===curYear;
}).reduce((s,t)=>s+t.amount,0);
const manualTahun=D.transactions.filter(t=>{
const d=new Date(t.date);
return t.type==='expense'&&d.getFullYear()===curYear;
}).reduce((s,t)=>s+t.amount,0);
const bBulanan={id:'__selftest_budget_bulanan__',catIds:['__total__'],limit:1,rollover:false,period:'bulanan'};
const bTahunan={id:'__selftest_budget_tahunan__',catIds:['__total__'],limit:1,rollover:false,period:'tahunan'};
_selfTestAssert(getBudgetUsed(bBulanan)===manualBulan,'Anggaran period=bulanan harus hanya menjumlah transaksi bulan berjalan');
_selfTestAssert(getBudgetUsed(bTahunan)===manualTahun,'Anggaran period=tahunan harus menjumlah transaksi sepanjang tahun berjalan, bukan cuma bulan ini');
_selfTestAssert(manualTahun>=manualBulan,'Total pengeluaran setahun harus selalu >= total pengeluaran bulan berjalan (sanity check)');
const oldDate=new Date(); oldDate.setFullYear(oldDate.getFullYear()-5);
const oldDateStr=oldDate.toISOString().slice(0,10);
const dummyOldTx={id:'__selftest_tx_old__',type:'expense',amount:12345,category:'__selftest_cat__',subcategory:'',accountId:D.accounts[0]?D.accounts[0].id:'',payMethod:'tunai',note:'',date:oldDateStr};
const dummyNewTx={id:'__selftest_tx_new__',type:'expense',amount:6789,category:'__selftest_cat__',subcategory:'',accountId:D.accounts[0]?D.accounts[0].id:'',payMethod:'tunai',note:'',date:todayStr()};
D.transactions.push(dummyOldTx,dummyNewTx);
try{
const bSekali={id:'__selftest_budget_sekali__',catIds:['__total__'],limit:1,rollover:false,period:'sekali',createdAt:new Date().toISOString()};
const usedSekali=getBudgetUsed(bSekali);
_selfTestAssert(usedSekali>=6789,'Anggaran period=sekali harus ikut menghitung transaksi baru (dibuat setelah createdAt)');
const withoutOld=D.transactions.filter(t=>t.id!=='__selftest_tx_old__');

const D_transactionsBackup=D.transactions;
D.transactions=withoutOld;
const usedWithoutOld=getBudgetUsed(bSekali);
D.transactions=D_transactionsBackup;
_selfTestAssert(usedSekali===usedWithoutOld,'Anggaran period=sekali tidak boleh ikut menghitung transaksi yang tanggalnya sebelum anggaran dibuat (createdAt)');
} finally {
D.transactions=D.transactions.filter(t=>t.id!=='__selftest_tx_old__'&&t.id!=='__selftest_tx_new__');
}
_selfTestAssert(!D.transactions.some(t=>t.id==='__selftest_tx_old__'||t.id==='__selftest_tx_new__'),'Transaksi sementara tes periode anggaran gagal dibersihkan dari D.transactions');
const bTahunanRollover={id:'__selftest_budget_tr__',catIds:['__total__'],limit:5000,rollover:true,period:'tahunan'};
_selfTestAssert(getBudgetEffectiveLimit(bTahunanRollover)===5000,'getBudgetEffectiveLimit() utk period=tahunan harus mengabaikan rollover & tetap sama dgn limit asli');
const bSekaliRollover={id:'__selftest_budget_sr__',catIds:['__total__'],limit:5000,rollover:true,period:'sekali'};
_selfTestAssert(getBudgetEffectiveLimit(bSekaliRollover)===5000,'getBudgetEffectiveLimit() utk period=sekali harus mengabaikan rollover & tetap sama dgn limit asli');
_selfTestAssert(!D.budgets.some(b=>String(b.id).indexOf('__selftest_budget')===0),'Tes tidak boleh menambahkan anggaran sungguhan ke D.budgets');
}},
{name:'getVehicleKm() & getLastServiceKm(): KM tertinggi & KM servis terakhir dihitung benar', fn:()=>{
if(!D.vehicles||!D.vehicles.length)return;
const v=D.vehicles[0];
const kms=[
...D.bbmLogs.filter(b=>b.vehicleId===v.id).map(b=>b.km),
...D.servisLogs.filter(s=>s.vehicleId===v.id&&s.km).map(s=>s.km),
...D.kmLogs.filter(k=>k.vehicleId===v.id).map(k=>k.km)
];
const expectedMax=kms.length?Math.max(...kms):0;
_selfTestAssert(getVehicleKm(v.id)===expectedMax,'getVehicleKm() harus mengembalikan KM tertinggi dari semua log (BBM/servis/KM manual)');
const servisLogs=D.servisLogs.filter(s=>s.vehicleId===v.id&&s.km).sort((a,b)=>new Date(b.date)-new Date(a.date)||b.km-a.km);
const expectedLast=servisLogs.length?servisLogs[0].km:0;
_selfTestAssert(getLastServiceKm(v.id)===expectedLast,'getLastServiceKm() harus mengembalikan KM dari servis paling terbaru');
}},
{name:'Arsip: archiveAvailableYears() & archiveCollectByYears() konsisten dengan data riwayat', fn:()=>{
const years=archiveAvailableYears();
_selfTestAssert(Array.isArray(years),'archiveAvailableYears() harus mengembalikan array');
if(!years.length)return;
const y=years[0];
const collected=archiveCollectByYears(new Set([y]));
const manualCount=ARCHIVE_MODULES.reduce((s,m)=>s+(D[m.key]||[]).filter(it=>archiveGetYear(it.date)===y).length,0);
const collectedCount=Object.values(collected).reduce((s,arr)=>s+arr.length,0);
_selfTestAssert(collectedCount===manualCount,'archiveCollectByYears() jumlah data tidak sama dengan hitungan manual per modul');
}},
{name:'buildLaporanExportData(): total per kategori sama dengan total pemasukan + pengeluaran', fn:()=>{
const {inc,exp,katRows}=buildLaporanExportData();
const sumKat=katRows.reduce((s,[,v])=>s+v.inc+v.exp,0);
_selfTestAssert(sumKat===inc+exp,'Jumlah per kategori pada Laporan harus sama dengan total pemasukan + pengeluaran keseluruhan');
}},
{name:'getProactiveReminders(): tagihan H-3 muncul di reminder, H-30 tidak (item sementara, tidak disimpan)', fn:()=>{
const before=D.bills.length;
const near=new Date();near.setDate(near.getDate()+3);
const far=new Date();far.setDate(far.getDate()+30);
const dummyNear={id:'__selftest_reminder_near__',name:'Tes Reminder Dekat',kind:'tagihan',amount:12345,nextDue:dateToISO(near)};
const dummyFar={id:'__selftest_reminder_far__',name:'Tes Reminder Jauh',kind:'tagihan',amount:99999,nextDue:dateToISO(far)};
D.bills.push(dummyNear,dummyFar);
try{
const reminders=getProactiveReminders();
_selfTestAssert(Array.isArray(reminders),'getProactiveReminders() harus mengembalikan array');
_selfTestAssert(reminders.some(r=>r.includes('Tes Reminder Dekat')),'Tagihan H-3 harus muncul di getProactiveReminders()');
_selfTestAssert(!reminders.some(r=>r.includes('Tes Reminder Jauh')),'Tagihan H-30 TIDAK boleh muncul di getProactiveReminders() (di luar jendela H-7)');
} finally {
D.bills=D.bills.filter(b=>b.id!=='__selftest_reminder_near__'&&b.id!=='__selftest_reminder_far__');
_selfTestAssert(D.bills.length===before,'D.bills harus kembali ke jumlah semula setelah tes reminder');
}
}},
{name:'extractChatAction(): parsing blok [[ACTION]] dari balasan AI (valid, tanpa action, & JSON rusak)', fn:()=>{
const withAction=extractChatAction('Oke dicatat ya!\n\n[[ACTION]]{"type":"add_transaksi","data":{"type":"expense","amount":50000}}[[/ACTION]]');
_selfTestAssert(withAction.text==='Oke dicatat ya!','extractChatAction() harus memisahkan teks bersih dari blok ACTION');
_selfTestAssert(withAction.action&&withAction.action.type==='add_transaksi','extractChatAction() harus mem-parsing tipe aksi dgn benar');
const noAction=extractChatAction('Cuma jawaban teks biasa tanpa usul aksi apa pun');
_selfTestAssert(noAction.action===null,'extractChatAction() harus mengembalikan action:null kalau tidak ada blok ACTION');
const broken=extractChatAction('Teks sebelum [[ACTION]]{ini bukan json valid}[[/ACTION]]');
_selfTestAssert(broken.action===null,'extractChatAction() harus fail-safe (action:null) kalau JSON di dalam blok ACTION rusak, bukan melempar error');
const unknownType=extractChatAction('Teks [[ACTION]]{"type":"hapus_semua_data","data":{}}[[/ACTION]]');
_selfTestAssert(unknownType.action===null,'extractChatAction() harus menolak tipe aksi yang tidak ada di whitelist CHAT_ACTION_HANDLERS');
}},
{name:'RefAI._parseJSON(): parsing balasan AI utk Cek Update Referensi (JSON bersih, dgn code fence, & rusak)', fn:()=>{
const clean=RefAI._parseJSON('{"hargaEmasPerGram":{"value":2700000,"source":"Antam","tanggal":"2026-07-01"}}');
_selfTestAssert(clean&&clean.hargaEmasPerGram&&clean.hargaEmasPerGram.value===2700000,'RefAI._parseJSON() harus bisa parse JSON bersih');
const fenced=RefAI._parseJSON('```json\n{"zakatFitrahPerJiwa":{"value":40000,"source":"BAZNAS","tanggal":"2026"}}\n```');
_selfTestAssert(fenced&&fenced.zakatFitrahPerJiwa&&fenced.zakatFitrahPerJiwa.value===40000,'RefAI._parseJSON() harus bisa lepas markdown code fence ```json ... ```');
const withPreamble=RefAI._parseJSON('Ini hasilnya:\n{"nisabPenghasilanBulan":{"value":8000000,"source":"x","tanggal":"y"}}\nSemoga membantu.');
_selfTestAssert(withPreamble&&withPreamble.nisabPenghasilanBulan&&withPreamble.nisabPenghasilanBulan.value===8000000,'RefAI._parseJSON() harus bisa ambil blok {...} walau ada teks pembuka/penutup di luar JSON');
const broken=RefAI._parseJSON('bukan JSON sama sekali, cuma teks biasa');
_selfTestAssert(broken===null,'RefAI._parseJSON() harus fail-safe (null) kalau teksnya bukan JSON, bukan melempar error');
}},
{name:'renderRefCheckReminder(): banner ⚠️ muncul kalau ≥180 hari sejak terakhir cek, disembunyikan kalau baru', fn:()=>{
const before=D.pajakZakat.refCheckedAt;
try{
const old=new Date(); old.setDate(old.getDate()-200);
D.pajakZakat.refCheckedAt=old.toISOString().split('T')[0];
renderRefCheckReminder();
const el=document.getElementById('refCheckReminder');
if(el)_selfTestAssert(el.style.display==='block','Banner reminder harus tampil kalau sudah ≥180 hari sejak terakhir cek');
D.pajakZakat.refCheckedAt=todayStr();
renderRefCheckReminder();
if(el)_selfTestAssert(el.style.display==='none','Banner reminder harus tersembunyi kalau baru saja dicek');
} finally {
D.pajakZakat.refCheckedAt=before;
renderRefCheckReminder();
}
}},
{name:'extractChatAction(): auto-repair JSON "hampir benar" dari AI (kutip tunggal, key tanpa kutip, trailing comma)', fn:()=>{
const singleQuote=extractChatAction("Oke [[ACTION]]{'type':'add_transaksi','data':{'amount':50000,'category':'bensin'}}[[/ACTION]]");
_selfTestAssert(singleQuote.action&&singleQuote.action.type==='add_transaksi'&&singleQuote.action.data.amount===50000,'extractChatAction() harus bisa perbaiki JSON yg pakai kutip tunggal');
const unquotedKey=extractChatAction('Oke [[ACTION]]{type:"add_transaksi",data:{amount:50000,category:"bensin"}}[[/ACTION]]');
_selfTestAssert(unquotedKey.action&&unquotedKey.action.type==='add_transaksi','extractChatAction() harus bisa perbaiki JSON yg key-nya tanpa kutip');
const trailingComma=extractChatAction('Oke [[ACTION]]{"type":"add_transaksi","data":{"amount":50000,}}[[/ACTION]]');
_selfTestAssert(trailingComma.action&&trailingComma.action.type==='add_transaksi','extractChatAction() harus bisa perbaiki JSON dgn trailing comma');
const stillBroken=extractChatAction('Oke [[ACTION]]{ini bukan json valid}[[/ACTION]]');
_selfTestAssert(stillBroken.action===null&&stillBroken.actionError===true,'extractChatAction() tidak boleh memaksa parse teks yg sama sekali bukan JSON');
}},
{name:'CHAT_ACTION_HANDLERS: menolak input tidak valid sebelum sempat menyimpan apa pun', fn:()=>{
const beforeTx=D.transactions.length,beforeBills=D.bills.length,beforeAnak=(D.catatan.anak||[]).length;
let threw=false;
try{ CHAT_ACTION_HANDLERS.add_transaksi({type:'expense',amount:0}); }catch(e){ threw=true; }
_selfTestAssert(threw,'add_transaksi harus menolak nominal 0/tidak valid');
threw=false;
try{ CHAT_ACTION_HANDLERS.add_tagihan({name:'Tes',amount:10000,nextDue:'tanggal-ngawur'}); }catch(e){ threw=true; }
_selfTestAssert(threw,'add_tagihan harus menolak tanggal jatuh tempo yang tidak valid');
threw=false;
try{ CHAT_ACTION_HANDLERS.add_catatan_anak({text:'   '}); }catch(e){ threw=true; }
_selfTestAssert(threw,'add_catatan_anak harus menolak teks kosong');
_selfTestAssert(D.transactions.length===beforeTx&&D.bills.length===beforeBills&&(D.catatan.anak||[]).length===beforeAnak,'Validasi yang gagal TIDAK boleh menyisipkan data apa pun ke D');
}},
{name:'runDataHealthCheck(): mendeteksi transaksi Shop dengan produk terhapus & absensi dengan total tidak valid (sementara, dicadangkan & dikembalikan)', fn:()=>{
if(typeof runDataHealthCheck!=='function'||typeof openModal!=='function')return;
const backupShop=D.cobek,backupWorkDays=D.workDays;
try{
D.cobek=[{id:'__t_shop__',date:'2026-01-01',items:[{productId:'__nonexistent_product__',name:'Produk Hantu',qty:1}],customer:{name:'Tes'},accountId:'__nonexistent_acc__',txLinkId:'__nonexistent_tx__',total:1000,profit:100}];
D.workDays=[{id:'__t_wd__',date:'tanggal-ngawur',total:NaN}];
runDataHealthCheck();
const listHtml=document.getElementById('dataHealthList')?document.getElementById('dataHealthList').innerHTML:'';
_selfTestAssert(listHtml.includes('produk tidak valid'),'Harus mendeteksi item Shop yang produknya sudah dihapus');
_selfTestAssert(listHtml.includes('akun tidak valid')&&listHtml.includes('Shop'),'Harus mendeteksi transaksi Shop dengan akun tidak valid');
_selfTestAssert(listHtml.includes('kehilangan transaksi tertaut')&&listHtml.includes('Shop'),'Harus mendeteksi transaksi Shop yang txLinkId-nya hilang');
_selfTestAssert(listHtml.includes('Absensi dengan tanggal tidak valid'),'Harus mendeteksi absensi dengan tanggal rusak');
_selfTestAssert(listHtml.includes('Absensi dengan total gaji tidak valid'),'Harus mendeteksi absensi dengan total gaji NaN/negatif');
} finally {
D.cobek=backupShop; D.workDays=backupWorkDays;
closeModal('dataHealthModal');
}
}},
{name:'isNoSpendDay() & computeNoSpendLast30() menghitung dari D.transactions dengan benar (sementara, dicadangkan & dikembalikan)', fn:()=>{
if(typeof isNoSpendDay!=='function'||typeof computeNoSpendLast30!=='function')return;
const backupTx=D.transactions;
try{
const today=dateToISO(new Date());
const yest=dateToISO(new Date(Date.now()-86400000));
D.transactions=[{id:'__t_tx1__',type:'expense',amount:5000,category:'Tes',date:yest}];
_selfTestAssert(isNoSpendDay(today)===true,'Hari ini tanpa transaksi expense harus dianggap No Spend Day');
_selfTestAssert(isNoSpendDay(yest)===false,'Hari dengan transaksi expense TIDAK boleh dianggap No Spend Day');
const stats=computeNoSpendLast30();
_selfTestAssert(stats.total===30,'computeNoSpendLast30() harus selalu menghitung jendela 30 hari');
_selfTestAssert(stats.count===29,'Dari 30 hari dgn 1 hari ada expense (kemarin), harus ada 29 No Spend Day, dapat '+stats.count);
} finally {
D.transactions=backupTx;
}
}},
{name:'LifeBalance.compute() menghasilkan skor 0-100 dari 4 komponen 25 poin', fn:()=>{
if(typeof LifeBalance==='undefined')return;
const r=LifeBalance.compute();
_selfTestAssert(Array.isArray(r.parts)&&r.parts.length===4,'LifeBalance.compute() harus punya 4 komponen, dapat '+(r.parts&&r.parts.length));
r.parts.forEach(p=>{
_selfTestAssert(p.max===25,'Setiap komponen Skor Hidup Seimbang harus berbobot maks 25, dapat '+p.max+' utk "'+p.label+'"');
_selfTestAssert(p.pts>=0&&p.pts<=25,'Poin komponen "'+p.label+'" harus antara 0-25, dapat '+p.pts);
});
const sumParts=r.parts.reduce((s,p)=>s+p.pts,0);
_selfTestAssert(r.total===sumParts,'r.total harus sama dgn jumlah semua r.parts[].pts');
_selfTestAssert(r.total>=0&&r.total<=100,'Skor total harus antara 0-100, dapat '+r.total);
}},
{name:'runDataHealthCheck(): mendeteksi ID/tanggal snapshot kekayaan duplikat & nilai tidak valid (sementara, dicadangkan & dikembalikan)', fn:()=>{
if(typeof runDataHealthCheck!=='function')return;
const backup=D.wealthSnapshots;
try{
D.wealthSnapshots=[
{id:'__ws_dup__',date:'2026-01-01',netWorth:1000000,auto:false},
{id:'__ws_dup__',date:'2026-01-01',netWorth:1100000,auto:false},
{id:'__ws_baddate__',date:'tanggal-ngawur',netWorth:500000,auto:false},
{id:'__ws_badval__',date:'2026-02-01',netWorth:NaN,auto:false}
];
runDataHealthCheck();
const listHtml=document.getElementById('dataHealthList')?document.getElementById('dataHealthList').innerHTML:'';
_selfTestAssert(listHtml.includes('ID snapshot kekayaan duplikat'),'Harus mendeteksi ID snapshot kekayaan yang duplikat');
_selfTestAssert(listHtml.includes('Tanggal snapshot kekayaan duplikat'),'Harus mendeteksi tanggal snapshot kekayaan yang duplikat');
_selfTestAssert(listHtml.includes('Snapshot kekayaan dengan tanggal tidak valid'),'Harus mendeteksi snapshot dengan tanggal rusak');
_selfTestAssert(listHtml.includes('Snapshot kekayaan dengan nilai tidak valid'),'Harus mendeteksi snapshot dengan netWorth NaN/rusak');
} finally {
D.wealthSnapshots=backup;
closeModal('dataHealthModal');
}
}},
{name:'runDataHealthCheck(): mendeteksi ID/tanggal snapshot Skor Hidup Seimbang duplikat & nilai tidak valid (sementara, dicadangkan & dikembalikan)', fn:()=>{
if(typeof runDataHealthCheck!=='function')return;
const backup=D.lifeBalanceSnapshots;
try{
D.lifeBalanceSnapshots=[
{id:'__lb_dup__',date:'2026-01-01',score:70,auto:false},
{id:'__lb_dup__',date:'2026-01-01',score:75,auto:false},
{id:'__lb_baddate__',date:'tanggal-ngawur',score:60,auto:false},
{id:'__lb_badval__',date:'2026-02-01',score:150,auto:false}
];
runDataHealthCheck();
const listHtml=document.getElementById('dataHealthList')?document.getElementById('dataHealthList').innerHTML:'';
_selfTestAssert(listHtml.includes('ID snapshot Skor Hidup Seimbang duplikat'),'Harus mendeteksi ID snapshot Skor Hidup Seimbang yang duplikat');
_selfTestAssert(listHtml.includes('Tanggal snapshot Skor Hidup Seimbang duplikat'),'Harus mendeteksi tanggal snapshot Skor Hidup Seimbang yang duplikat');
_selfTestAssert(listHtml.includes('Snapshot Skor Hidup Seimbang dengan tanggal tidak valid'),'Harus mendeteksi snapshot dengan tanggal rusak');
_selfTestAssert(listHtml.includes('Snapshot Skor Hidup Seimbang dengan nilai tidak valid'),'Harus mendeteksi snapshot dengan skor NaN/luar rentang 0-100');
} finally {
D.lifeBalanceSnapshots=backup;
closeModal('dataHealthModal');
}
}},
{name:'LifeBalance.saveSnapshot() mencatat snapshot skor & idempoten di tanggal yang sama (sementara, dicadangkan & dikembalikan)', fn:()=>{
if(typeof LifeBalance==='undefined')return;
const backup=D.lifeBalanceSnapshots;
try{
D.lifeBalanceSnapshots=[];
const today=todayStr();
LifeBalance.saveSnapshot(true);
_selfTestAssert(D.lifeBalanceSnapshots.length===1,'Setelah saveSnapshot() 1x, harus ada 1 snapshot, dapat '+D.lifeBalanceSnapshots.length);
const snap=D.lifeBalanceSnapshots[0];
_selfTestAssert(snap.date===today,'Snapshot harus bertanggal hari ini');
_selfTestAssert(snap.auto===false,'Snapshot manual harus punya auto=false');
_selfTestAssert(snap.score>=0&&snap.score<=100,'Skor snapshot harus 0-100, dapat '+snap.score);
LifeBalance.saveSnapshot(true);
_selfTestAssert(D.lifeBalanceSnapshots.length===1,'saveSnapshot() 2x di tanggal yang sama harus menimpa, bukan menambah baris baru, dapat '+D.lifeBalanceSnapshots.length);
} finally {
D.lifeBalanceSnapshots=backup;
}
}},
{name:'applyRestoredDataMigrations(): D.wealthSnapshots dipulihkan jadi array kosong kalau hilang dari backup lama (sementara, dicadangkan & dikembalikan)', fn:()=>{
if(typeof applyRestoredDataMigrations!=='function')return;
const backup=D.wealthSnapshots;
try{
delete D.wealthSnapshots;
applyRestoredDataMigrations();
_selfTestAssert(Array.isArray(D.wealthSnapshots),'D.wealthSnapshots harus dipulihkan jadi array kosong setelah migrasi restore, meski backup lama tidak punya field ini');
} finally { D.wealthSnapshots=backup; }
}},
{name:'renderBbmList / render Car Notes BBM: log BBM dengan km:null tidak boleh membuat tab Car Notes crash (BUGFIX)', fn:()=>{
if(typeof renderCnTab!=='function'||typeof renderVehicleSelect!=='function')return;
const backupBbm=D.bbmLogs,backupVeh=curVehicleId;
try{
const veh=D.vehicles[0];
if(!veh)return;
curVehicleId=veh.id;
D.bbmLogs=[{id:'__bbm_nullkm__',date:'2026-01-01',vehicleId:veh.id,liter:2,harga:10000,cost:20000,km:null,spbu:'SPBU Tes',fullTank:true}];
let threw=false;
try{ renderVehicleSelect(); renderCnTab(); }catch(e){ threw=true; }
_selfTestAssert(!threw,'Render Car Notes/daftar BBM tidak boleh throw error saat ada log BBM dengan km:null (mis. dari data import lama)');
} finally { D.bbmLogs=backupBbm; curVehicleId=backupVeh; renderVehicleSelect(); renderCnTab(); }
}},
{name:'runDataHealthCheck(): mendeteksi piutang tanpa nama, nilai tidak valid, & jatuh tempo tidak valid (sementara, dicadangkan & dikembalikan)', fn:()=>{
if(typeof runDataHealthCheck!=='function')return;
const backup=D.piutang;
try{
D.piutang=[
{id:'__p_noname__',name:'',nilai:100000,tanggal:'2026-01-01',jatuhTempo:'',lunas:false},
{id:'__p_badval__',name:'Tes Piutang',nilai:NaN,tanggal:'2026-01-01',jatuhTempo:'',lunas:false},
{id:'__p_badjt__',name:'Tes Piutang 2',nilai:50000,tanggal:'2026-01-01',jatuhTempo:'tanggal-ngawur',lunas:false}
];
runDataHealthCheck();
const listHtml=document.getElementById('dataHealthList')?document.getElementById('dataHealthList').innerHTML:'';
_selfTestAssert(listHtml.includes('Piutang tanpa nama peminjam'),'Harus mendeteksi piutang tanpa nama peminjam');
_selfTestAssert(listHtml.includes('Piutang dengan nilai tidak valid'),'Harus mendeteksi piutang dengan nilai NaN/rusak');
_selfTestAssert(listHtml.includes('Piutang dengan tanggal jatuh tempo tidak valid'),'Harus mendeteksi piutang dengan jatuh tempo tidak terbaca sebagai tanggal');
} finally {
D.piutang=backup;
closeModal('dataHealthModal');
}
}},
{name:'CHAT_ACTION_EDIT_FIELDS: setiap tipe aksi chat AI punya konfigurasi form Edit yang lengkap', fn:()=>{
Object.keys(CHAT_ACTION_HANDLERS).forEach(type=>{
const fields=CHAT_ACTION_EDIT_FIELDS[type];
_selfTestAssert(Array.isArray(fields)&&fields.length>0,'CHAT_ACTION_EDIT_FIELDS harus punya daftar field untuk tipe aksi "'+type+'"');
fields.forEach(f=>{
_selfTestAssert(f.key&&f.label&&f.type,'Setiap field edit ("'+type+'") harus punya key, label, dan type');
});
});
}},
{name:'actualWealthCAGR(): kondisi belum cukup data (kurang dari 2 snapshot / rentang <25 hari) → null (sementara, D.wealthSnapshots dicadangkan & dikembalikan)', fn:()=>{
const backup=D.wealthSnapshots;
try{
D.wealthSnapshots=[];
_selfTestAssert(actualWealthCAGR()===null,'0 snapshot harus null');
D.wealthSnapshots=[{id:'__t1__',date:'2026-01-01',netWorth:1000000,auto:false}];
_selfTestAssert(actualWealthCAGR()===null,'1 snapshot harus null');
D.wealthSnapshots=[
{id:'__t1__',date:'2026-01-01',netWorth:1000000,auto:false},
{id:'__t2__',date:'2026-01-05',netWorth:1100000,auto:false}
];
_selfTestAssert(actualWealthCAGR()===null,'Rentang <25 hari antar snapshot harus null (belum absurd dihitung tahunan)');
} finally { D.wealthSnapshots=backup; }
}},
{name:'actualWealthCAGR(): basis awal negatif/nol → cagr:null reason "baseline-negative" (bukan NaN)', fn:()=>{
const backup=D.wealthSnapshots;
try{
D.wealthSnapshots=[
{id:'__t1__',date:'2026-01-01',netWorth:-500000,auto:false},
{id:'__t2__',date:'2026-03-01',netWorth:1000000,auto:false}
];
const r=actualWealthCAGR();
_selfTestAssert(r!==null&&r.cagr===null&&r.reason==='baseline-negative','Basis awal negatif harus mengembalikan {cagr:null, reason:"baseline-negative"}, bukan null/NaN');
} finally { D.wealthSnapshots=backup; }
}},
{name:'actualWealthCAGR(): kekayaan bersih TERAKHIR negatif → cagr:null reason "latest-negative" (BUGFIX, dulu NaN)', fn:()=>{
const backup=D.wealthSnapshots;
try{
D.wealthSnapshots=[
{id:'__t1__',date:'2026-01-01',netWorth:1000000,auto:false},
{id:'__t2__',date:'2026-04-01',netWorth:-250000,auto:false}
];
const r=actualWealthCAGR();
_selfTestAssert(r!==null,'Snapshot cukup (2, rentang ≥25 hari) harus tetap mengembalikan object, bukan null');
_selfTestAssert(r.cagr===null,'cagr harus null saat kekayaan bersih terakhir negatif (bukan NaN — ini bugfix utamanya)');
_selfTestAssert(!Number.isNaN(r.cagr),'cagr TIDAK BOLEH berupa NaN dalam kondisi apa pun');
_selfTestAssert(r.reason==='latest-negative','reason harus "latest-negative" saat basis awal positif tapi snapshot terakhir negatif');
} finally { D.wealthSnapshots=backup; }
}},
{name:'actualWealthCAGR(): kondisi normal (awal & akhir positif, rentang cukup) → cagr angka valid, reason null', fn:()=>{
const backup=D.wealthSnapshots;
try{
D.wealthSnapshots=[
{id:'__t1__',date:'2025-01-01',netWorth:1000000,auto:false},
{id:'__t2__',date:'2026-01-01',netWorth:1200000,auto:false}
];
const r=actualWealthCAGR();
_selfTestAssert(r!==null&&r.reason===null,'Kondisi normal harus mengembalikan reason:null');
_selfTestAssert(typeof r.cagr==='number'&&!Number.isNaN(r.cagr),'cagr harus berupa angka valid pada kondisi normal');
_selfTestAssert(r.cagr>0,'Kekayaan naik dari 1jt ke 1.2jt dlm ~1th harus menghasilkan cagr positif (≈20%)');
} finally { D.wealthSnapshots=backup; }
}},
{name:'renderBillHistory(): catatan transaksi (note) di-escape, tidak boleh membocorkan tag HTML mentah (XSS HARDENING)', fn:()=>{
if(typeof renderBillHistory!=='function'||typeof openBillHistory!=='function')return;
const backupTx=D.transactions,backupBillId=curBillHistoryId;
const payload='<img src=x onerror="1">';
try{
const billId='__xss_bill__';
D.transactions=[{id:'__xss_tx__',billLinkId:billId,date:'2026-01-01',amount:1000,note:payload,category:'Tes'}];
const modal=document.getElementById('billHistoryModal');
const hadOpen=modal&&modal.classList.contains('open');
if(modal)modal.classList.add('open');
curBillHistoryId=billId;
renderBillHistory();
const html=document.getElementById('billHistoryList')?document.getElementById('billHistoryList').innerHTML:'';
_selfTestAssert(!html.includes('<img'),'Catatan pembayaran tagihan harus di-escape (tidak boleh ada tag <img> mentah dari note)');
if(modal&&!hadOpen)modal.classList.remove('open');
} finally { D.transactions=backupTx; curBillHistoryId=backupBillId; }
}},
{name:'renderBbmList()/renderStockList()/renderServisList(): field bebas-teks (note/spbu/nama/kode/item) di-escape (XSS HARDENING)', fn:()=>{
if(typeof renderBbmList!=='function'||typeof renderStockList!=='function'||typeof renderServisList!=='function')return;
const veh=D.vehicles[0];
if(!veh)return;
const payload='<img src=x onerror="1">';
const backupBbm=D.bbmLogs,backupParts=D.partsStock,backupServis=D.servisLogs,backupCurVeh=curVehicleId;
try{
curVehicleId=veh.id;
D.bbmLogs=[{id:'__xss_bbm__',date:'2026-01-01',vehicleId:veh.id,km:100,liter:5,harga:10000,cost:50000,fullTank:true,spbu:payload,note:payload}];
renderBbmList();
const bbmHtml=document.getElementById('bbmList')?document.getElementById('bbmList').innerHTML:'';
_selfTestAssert(!bbmHtml.includes('<img'),'SPBU/catatan di daftar BBM harus di-escape');
D.partsStock=[{id:'__xss_part__',name:payload,code:payload,note:payload,qty:5,unit:'pcs',minStock:1,price:0}];
renderStockList();
const stockHtml=document.getElementById('stockList')?document.getElementById('stockList').innerHTML:'';
_selfTestAssert(!stockHtml.includes('<img'),'Nama/kode/catatan sparepart di daftar stok harus di-escape');
D.servisLogs=[{id:'__xss_servis__',date:'2026-01-01',vehicleId:veh.id,item:payload,note:payload,cost:1000}];
renderServisList();
const servisHtml=document.getElementById('servisList')?document.getElementById('servisList').innerHTML:'';
_selfTestAssert(!servisHtml.includes('<img'),'Item/catatan servis di daftar servis kendaraan harus di-escape');
} finally {
D.bbmLogs=backupBbm; D.partsStock=backupParts; D.servisLogs=backupServis; curVehicleId=backupCurVeh;
renderBbmList(); renderStockList(); renderServisList();
}
}},
{name:'Etalase.renderList(): nama produk/kategori/produsen di-escape (XSS HARDENING)', fn:()=>{
if(typeof Etalase==='undefined'||typeof Etalase.renderList!=='function')return;
const payload='<img src=x onerror="1">';
const backupProducts=D.products,backupProdusen=D.produsen,backupKategori=D.cobekKategori;
try{
D.produsen=[{id:'__xss_prod__',name:payload,contact:'',note:''}];
D.cobekKategori=[{id:'__xss_kat__',name:payload}];
D.products=[{id:'__xss_p__',name:payload,stock:5,kategoriId:'__xss_kat__',produsenId:'__xss_prod__',hargaBeli:1000,hargaJual:2000,hargaReseller:0,diskonPersen:0}];
Etalase.renderList();
const html=document.getElementById('productList')?document.getElementById('productList').innerHTML:'';
_selfTestAssert(!html.includes('<img'),'Nama produk/kategori/produsen di daftar Etalase harus di-escape');
} finally {
D.products=backupProducts; D.produsen=backupProdusen; D.cobekKategori=backupKategori;
Etalase.renderList();
}
}},
{name:'renderReminder(): judul & deskripsi pengingat di-escape (XSS HARDENING)', fn:()=>{
if(typeof renderReminder!=='function')return;
const payload='<img src=x onerror="1">';
const backupReminders=D.reminders;
try{
D.reminders=[{id:'__xss_reminder__',title:payload,desc:payload,color:'#7c6fef'}];
renderReminder();
const html=document.getElementById('reminderList')?document.getElementById('reminderList').innerHTML:'';
_selfTestAssert(!html.includes('<img'),'Judul/deskripsi pengingat harus di-escape');
} finally {
D.reminders=backupReminders;
renderReminder();
}
}},
{name:'Enkripsi API key (Web Crypto, kunci dari PIN): round-trip benar, PIN salah gagal dekripsi, save() tidak pernah simpan polos ke kw_v4 (HARDENING KEAMANAN)', fn:async()=>{
if(typeof encryptApiKeyWithPin!=='function'||typeof decryptApiKeyWithPin!=='function')return;
const backupProfile=JSON.parse(JSON.stringify(D.profile||{}));
const backupPin=localStorage.getItem('kw_pin');
const backupEnc=localStorage.getItem('kw_apikey_enc');
const backupKw4=localStorage.getItem('kw_v4');
const testPin='7391';
const testKey='sk-test-selftest-'+Date.now();
try{
const enc=await encryptApiKeyWithPin(testPin,testKey);
_selfTestAssert(enc&&enc.salt&&enc.iv&&enc.ct,'Hasil enkripsi harus punya salt, iv, & ciphertext');
const decrypted=await decryptApiKeyWithPin(testPin,enc);
_selfTestAssert(decrypted===testKey,'Dekripsi dgn PIN yang benar harus mengembalikan API key asli, dapat "'+decrypted+'"');
const wrongResult=await decryptApiKeyWithPin('0000',enc);
_selfTestAssert(wrongResult===null,'Dekripsi dengan PIN salah harus menghasilkan null (fail-safe), dapat "'+wrongResult+'"');
localStorage.setItem('kw_pin',testPin);
D.profile=D.profile||{};
D.profile.apiKey=testKey;
saveFlush();
const rawKw4=localStorage.getItem('kw_v4');
_selfTestAssert(!rawKw4.includes(testKey),'kw_v4 TIDAK BOLEH mengandung API key dalam bentuk teks polos setelah save()');
const parsedKw4=JSON.parse(rawKw4);
_selfTestAssert(!parsedKw4.profile||!('apiKey' in parsedKw4.profile),'Field "apiKey" TIDAK BOLEH ada sama sekali di objek profile dalam kw_v4');
} finally {
D.profile=backupProfile;
if(backupPin===null)localStorage.removeItem('kw_pin'); else localStorage.setItem('kw_pin',backupPin);
if(backupEnc===null)localStorage.removeItem('kw_apikey_enc'); else localStorage.setItem('kw_apikey_enc',backupEnc);
if(backupKw4===null)localStorage.removeItem('kw_v4'); else localStorage.setItem('kw_v4',backupKw4);
}
}},
{name:'save() di-debounce (PERFORMA): beberapa panggilan berturutan cuma menulis ke disk SATU KALI', fn:async()=>{
if(_saveDebounceTimer){clearTimeout(_saveDebounceTimer);_saveDebounceTimer=null;}
const original=_saveImmediate;
let callCount=0;
_saveImmediate=function(){callCount++;};
try{
save();save();save();save();save();
const pollStart=Date.now();
while(callCount===0 && (Date.now()-pollStart)<3000){ await new Promise(r=>setTimeout(r,25)); }
} finally {
_saveImmediate=original;
}
_selfTestAssert(callCount===1,'_saveImmediate() seharusnya cuma terpanggil 1x dari 5x panggilan save() berturutan (digabung debounce), malah terpanggil '+callCount+'x');
}},
{name:'saveFlush() (PERFORMA): menulis ke disk SEKARANG & membatalkan jeda debounce yang masih tertunda', fn:async()=>{
if(_saveDebounceTimer){clearTimeout(_saveDebounceTimer);_saveDebounceTimer=null;}
const original=_saveImmediate;
let callCount=0;
_saveImmediate=function(){callCount++;};
try{
save();
_selfTestAssert(callCount===0,'Sesaat setelah save(), _saveImmediate() belum boleh terpanggil (masih menunggu jeda debounce)');
saveFlush();
_selfTestAssert(callCount===1,'saveFlush() harus langsung memicu _saveImmediate() sekali, tanpa menunggu jeda debounce');
_selfTestAssert(_saveDebounceTimer===null,'saveFlush() harus membatalkan timer debounce yang masih tertunda (_saveDebounceTimer harus null sesudahnya)');
await new Promise(r=>setTimeout(r,500));
_selfTestAssert(callCount===1,'Tidak boleh ada _saveImmediate() tambahan setelah saveFlush() (timer debounce lama harusnya sudah dibatalkan)');
} finally {
_saveImmediate=original;
if(_saveDebounceTimer){clearTimeout(_saveDebounceTimer);_saveDebounceTimer=null;}
}
}},
{name:'gdriveTrySilentReconnectOnLoad(): TIDAK mencoba apa pun kalau belum diizinkan / sudah tersambung', fn:()=>{
const backupGDrive=D.googleDrive?JSON.parse(JSON.stringify(D.googleDrive)):null;
const backupToken=gdriveAccessToken;
const originalInitTC=gdriveInitTokenClient;
let callCount=0;
gdriveInitTokenClient=function(){callCount++;return null;};
try{
D.googleDrive={clientId:'123-abc.apps.googleusercontent.com',fileId:null,lastSync:null,autoSync:false};
gdriveAccessToken=null;
gdriveTrySilentReconnectOnLoad();
_selfTestAssert(callCount===0,'Tidak boleh mencoba reconnect kalau Sinkron Otomatis belum diaktifkan user');
D.googleDrive={clientId:'',fileId:null,lastSync:null,autoSync:true};
gdriveTrySilentReconnectOnLoad();
_selfTestAssert(callCount===0,'Tidak boleh mencoba reconnect kalau Client ID belum diisi');
D.googleDrive={clientId:'123-abc.apps.googleusercontent.com',fileId:null,lastSync:null,autoSync:true};
gdriveAccessToken='token-palsu-utk-tes';
gdriveTrySilentReconnectOnLoad();
_selfTestAssert(callCount===0,'Tidak perlu reconnect kalau gdriveAccessToken sudah ada (berarti masih tersambung sesi ini)');
} finally {
D.googleDrive=backupGDrive;
gdriveAccessToken=backupToken;
gdriveInitTokenClient=originalInitTC;
}
}},
{name:'WorthIt.computeScore(): kebutuhan+mendesak diberi skor lebih tinggi daripada keinginan+nice-to-have', fn:()=>{
if(typeof WorthIt==='undefined'||typeof WorthIt.computeScore!=='function')return;
const backupAccounts=JSON.parse(JSON.stringify(D.accounts));
try{
D.accounts=[{id:'__selftest_acc__',name:'Tes',emoji:'💰',baseBalance:1000000000,includeInBalance:true}];
const tinggi=WorthIt.computeScore({name:'A',price:10000,cat:'kebutuhan',urgensi:'mendesak',isDiskon:false,hargaNormal:0,sudahPunya:false});
const rendah=WorthIt.computeScore({name:'B',price:10000,cat:'keinginan',urgensi:'nice_to_have',isDiskon:false,hargaNormal:0,sudahPunya:false});
_selfTestAssert(tinggi.score>rendah.score,'Item kebutuhan+mendesak ('+tinggi.score+') harus lebih tinggi dari keinginan+nice-to-have ('+rendah.score+')');
_selfTestAssert(tinggi.score>=70,'Item kebutuhan+mendesak seharusnya masuk badge Prioritas Tinggi (skor>=70), dapat '+tinggi.score);
_selfTestAssert(rendah.score<40,'Item keinginan+nice-to-have seharusnya masuk badge Bisa Ditunda (skor<40), dapat '+rendah.score);
} finally { D.accounts=backupAccounts; }
}},
{name:'WorthIt.computeScore(): "sudah punya barang lama" menurunkan skor & diskon tipis ditandai merah', fn:()=>{
if(typeof WorthIt==='undefined'||typeof WorthIt.computeScore!=='function')return;
const backupAccounts=JSON.parse(JSON.stringify(D.accounts));
try{
D.accounts=[{id:'__selftest_acc__',name:'Tes',emoji:'💰',baseBalance:1000000000,includeInBalance:true}];
const base={name:'A',price:10000,cat:'keinginan',urgensi:'bisa_nunggu',isDiskon:false,hargaNormal:0};
const tanpaSudahPunya=WorthIt.computeScore({...base,sudahPunya:false});
const denganSudahPunya=WorthIt.computeScore({...base,sudahPunya:true,sudahPunyaAlasan:''});
_selfTestAssert(denganSudahPunya.score<tanpaSudahPunya.score,'Menandai "sudah punya barang lama" harus menurunkan skor dibanding tidak ditandai');
const diskonTipis=WorthIt.computeScore({name:'C',price:95000,cat:'keinginan',urgensi:'bisa_nunggu',isDiskon:true,hargaNormal:100000,sudahPunya:false});
const diskonGede=WorthIt.computeScore({name:'D',price:50000,cat:'keinginan',urgensi:'bisa_nunggu',isDiskon:true,hargaNormal:100000,sudahPunya:false});
_selfTestAssert(diskonGede.score>diskonTipis.score,'Diskon 50% harus mendorong skor lebih tinggi daripada diskon 5%');
const alasanText='<img src=x onerror=1> alasan custom';
const withReason=WorthIt.computeScore({...base,sudahPunya:true,sudahPunyaAlasan:alasanText});
const reasonHtml=withReason.reasons.map(r=>r.text).join(' ');
_selfTestAssert(!reasonHtml.includes('<img'),'Alasan custom "sudah punya barang" harus di-escape (XSS HARDENING)');
} finally { D.accounts=backupAccounts; }
}},
{name:'WorthIt.addToList()/editListItem()/deleteListItem(): CRUD D.wishlist tidak merusak data lain (sementara, dicadangkan & dikembalikan)', fn:()=>{
if(typeof WorthIt==='undefined'||typeof WorthIt.addToList!=='function')return;
const requiredIds=['wlName','wlPrice','wlIsDiskon','wlHargaNormal','wlCategory','wlUrgensi','wlSudahPunya','wlSudahPunyaAlasan','wlSubmitBtn','wlCancelEditBtn'];
if(requiredIds.some(id=>!document.getElementById(id)))return;
const backupWishlist=JSON.parse(JSON.stringify(D.wishlist||[]));
const backupEditId=WorthIt.editListId;
try{
WorthIt.cancelEditList();
const countBefore=D.wishlist.length;
document.getElementById('wlName').value='__selftest_item__';
document.getElementById('wlPrice').value='50000';
document.getElementById('wlIsDiskon').checked=false;
WorthIt.toggleDiskonList();
document.getElementById('wlCategory').value='kebutuhan';
document.getElementById('wlUrgensi').value='mendesak';
document.getElementById('wlSudahPunya').checked=false;
WorthIt.toggleSudahPunya();
WorthIt.addToList();
_selfTestAssert(D.wishlist.length===countBefore+1,'addToList() harus menambah tepat 1 item baru ke D.wishlist');
const added=D.wishlist.find(x=>x.name==='__selftest_item__');
_selfTestAssert(!!added,'Item baru harus ditemukan di D.wishlist berdasarkan nama');
_selfTestAssert(added.price===50000&&added.cat==='kebutuhan'&&added.urgensi==='mendesak','Field item baru (harga/kategori/urgensi) harus tersimpan sesuai input form');
WorthIt.editListItem(added.id);
_selfTestAssert(WorthIt.editListId===added.id,'editListItem() harus set WorthIt.editListId ke ID item yang diedit');
_selfTestAssert(document.getElementById('wlName').value==='__selftest_item__','Form harus terisi ulang dgn nama item saat mode edit');
document.getElementById('wlPrice').value='75000';
document.getElementById('wlSudahPunya').checked=true;
WorthIt.toggleSudahPunya();
document.getElementById('wlSudahPunyaAlasan').value='masih oke tapi mau upgrade';
WorthIt.addToList();
_selfTestAssert(D.wishlist.length===countBefore+1,'Simpan perubahan saat mode edit TIDAK boleh menambah item baru (harus update in-place)');
const updated=D.wishlist.find(x=>x.id===added.id);
_selfTestAssert(updated.price===75000,'Harga item harus terupdate setelah edit');
_selfTestAssert(updated.sudahPunya===true&&updated.sudahPunyaAlasan==='masih oke tapi mau upgrade','Status & alasan "sudah punya barang lama" harus tersimpan setelah edit');
_selfTestAssert(WorthIt.editListId===null,'WorthIt.editListId harus direset ke null setelah selesai simpan/edit');
WorthIt.deleteListItem(added.id);
_selfTestAssert(D.wishlist.length===countBefore,'deleteListItem() harus mengembalikan panjang D.wishlist ke semula');
_selfTestAssert(!D.wishlist.some(x=>x.id===added.id),'Item yang dihapus tidak boleh tersisa di D.wishlist');
} finally {
D.wishlist=backupWishlist;
WorthIt.editListId=backupEditId;
save();
}
}},
{name:'WorthIt.catatBeliList()+applyBuyLink(): item BELUM bought sebelum tx disimpan, & baru bought+ke-link setelah tx tersimpan', fn:()=>{
if(typeof WorthIt==='undefined'||typeof WorthIt.catatBeliList!=='function')return;
if(!document.getElementById('txAmt')||!document.getElementById('txNote')||!document.getElementById('txModal')||!document.getElementById('worthItModal'))return;
const backupWishlist=JSON.parse(JSON.stringify(D.wishlist||[]));
const backupTx=JSON.parse(JSON.stringify(D.transactions));
const backupPending=WorthIt.pendingBuyId;
const backupTxEditId=txEditId;
const txWasOpen=document.getElementById('txModal').classList.contains('open');
const wiWasOpen=document.getElementById('worthItModal').classList.contains('open');
try{
D.wishlist.push({id:'__selftest_wl_1__',name:'__selftest_barang_beli__',price:25000,isDiskon:false,hargaNormal:0,cat:'kebutuhan',urgensi:'mendesak',sudahPunya:false,sudahPunyaAlasan:'',createdAt:new Date().toISOString(),bought:false});
WorthIt.catatBeliList('__selftest_wl_1__');
const itAfterOpen=D.wishlist.find(x=>x.id==='__selftest_wl_1__');
_selfTestAssert(itAfterOpen.bought===false,'BUGFIX: item TIDAK BOLEH langsung bought:true cuma karena txModal dibuka (baru dianggap bought setelah tx beneran Simpan)');
_selfTestAssert(WorthIt.pendingBuyId==='__selftest_wl_1__','catatBeliList() harus menyimpan ID barang ke WorthIt.pendingBuyId, menunggu tx disimpan');
_selfTestAssert(document.getElementById('txAmt').value==='25000','Nominal txModal harus otomatis terisi sesuai harga barang wishlist');
closeModal('txModal');
_selfTestAssert(WorthIt.pendingBuyId===null,'BUGFIX: menutup txModal tanpa Simpan harus membatalkan pendingBuyId');
_selfTestAssert(D.wishlist.find(x=>x.id==='__selftest_wl_1__').bought===false,'Item wishlist harus TETAP belum-bought kalau txModal dibatalkan/ditutup');
WorthIt.catatBeliList('__selftest_wl_1__');
const fakeTxId='__selftest_tx_1__';
D.transactions.push({id:fakeTxId,type:'expense',amount:25000,category:'Lainnya',subcategory:'',accountId:D.accounts[0]?.id||'',payMethod:'tunai',note:'__selftest_barang_beli__',date:new Date().toISOString().split('T')[0]});
WorthIt.applyBuyLink(fakeTxId);
const itAfterBuy=D.wishlist.find(x=>x.id==='__selftest_wl_1__');
_selfTestAssert(itAfterBuy.bought===true,'Setelah transaksi beneran tersimpan & applyBuyLink() dipanggil, item baru boleh jadi bought:true');
_selfTestAssert(itAfterBuy.txId===fakeTxId,'Item harus tersambung ke ID transaksi asli (txId) setelah applyBuyLink()');
const linkedTx=D.transactions.find(x=>x.id===fakeTxId);
_selfTestAssert(linkedTx.wishlistLinkId==='__selftest_wl_1__','Transaksi harus tersambung balik ke item wishlist (wishlistLinkId) — link 2 arah');
_selfTestAssert(WorthIt.pendingBuyId===null,'pendingBuyId harus direset ke null setelah applyBuyLink() dipakai');
} finally {
D.wishlist=backupWishlist;
D.transactions=backupTx;
WorthIt.pendingBuyId=backupPending;
txEditId=backupTxEditId;
closeModal('txModal'); // BUGFIX: catatBeliList() dipanggil 2x di tes ini & membuka txModal lagi setelah closeModal() pertama -- tanpa baris ini modal tertinggal 'open' & muncul ke user begitu tes selesai
if(txWasOpen) document.getElementById('txModal').classList.add('open');
if(wiWasOpen) document.getElementById('worthItModal').classList.add('open');
save();
}
}},
{name:'WorthIt.onLinkedTxDeleted()/onLinkedTxEdited(): sync 2 arah saat transaksi terkait wishlist dihapus/diedit di Keuangan', fn:()=>{
if(typeof WorthIt==='undefined'||typeof WorthIt.onLinkedTxDeleted!=='function')return;
const backupWishlist=JSON.parse(JSON.stringify(D.wishlist||[]));
const backupTx=JSON.parse(JSON.stringify(D.transactions));
try{
const txId='__selftest_tx_2__';
D.wishlist.push({id:'__selftest_wl_2__',name:'__selftest_barang_2__',price:40000,isDiskon:false,hargaNormal:0,cat:'keinginan',urgensi:'bisa_nunggu',sudahPunya:false,sudahPunyaAlasan:'',createdAt:new Date().toISOString(),bought:true,boughtDate:'2025-01-01',txId});
D.transactions.push({id:txId,type:'expense',amount:40000,category:'Lainnya',subcategory:'',accountId:D.accounts[0]?.id||'',payMethod:'tunai',note:'__selftest_barang_2__',date:'2025-01-01',wishlistLinkId:'__selftest_wl_2__'});
const t=D.transactions.find(x=>x.id===txId);
t.amount=45000;t.date='2025-01-02';
WorthIt.onLinkedTxEdited(t);
const editedIt=D.wishlist.find(x=>x.id==='__selftest_wl_2__');
_selfTestAssert(editedIt.price===45000,'onLinkedTxEdited() harus menyinkronkan harga item ke nominal transaksi yang diedit');
_selfTestAssert(editedIt.boughtDate==='2025-01-02','onLinkedTxEdited() harus menyinkronkan tanggal beli ke tanggal transaksi yang diedit');
WorthIt.onLinkedTxDeleted(t);
const revertedIt=D.wishlist.find(x=>x.id==='__selftest_wl_2__');
_selfTestAssert(!!revertedIt,'Item wishlist TIDAK BOLEH ikut terhapus saat transaksi terkait dihapus');
_selfTestAssert(revertedIt.bought===false,'BUGFIX (sync 2 arah): item harus kembali bought:false saat transaksi terkait dihapus dari Keuangan');
_selfTestAssert(revertedIt.txId===null,'txId item harus direset ke null setelah transaksi terkait dihapus');
} finally {
D.wishlist=backupWishlist;
D.transactions=backupTx;
save();
}
}},
{name:'WorthIt.undoBought(): mengembalikan barang "sudah dibeli" ke list aktif tanpa menghapus transaksi terkait', fn:async()=>{
if(typeof WorthIt==='undefined'||typeof WorthIt.undoBought!=='function')return;
const backupWishlist=JSON.parse(JSON.stringify(D.wishlist||[]));
const backupTx=JSON.parse(JSON.stringify(D.transactions));
const backupAskConfirm=window.askConfirm;
try{
const txId='__selftest_tx_3__';
D.wishlist.push({id:'__selftest_wl_3__',name:'__selftest_barang_3__',price:15000,isDiskon:false,hargaNormal:0,cat:'kebutuhan',urgensi:'mendesak',sudahPunya:false,sudahPunyaAlasan:'',createdAt:new Date().toISOString(),bought:true,boughtDate:'2025-01-01',txId});
D.transactions.push({id:txId,type:'expense',amount:15000,category:'Lainnya',subcategory:'',accountId:D.accounts[0]?.id||'',payMethod:'tunai',note:'__selftest_barang_3__',date:'2025-01-01',wishlistLinkId:'__selftest_wl_3__'});
window.askConfirm=async()=>true;
await WorthIt.undoBought('__selftest_wl_3__');
const it=D.wishlist.find(x=>x.id==='__selftest_wl_3__');
_selfTestAssert(it.bought===false,'undoBought() harus mengembalikan item ke status belum-dibeli');
_selfTestAssert(it.txId===null,'undoBought() harus melepas link txId dari item');
const t=D.transactions.find(x=>x.id===txId);
_selfTestAssert(!!t,'undoBought() TIDAK BOLEH menghapus transaksi yang sudah tercatat di Keuangan (uangnya memang sudah keluar)');
_selfTestAssert(!t.wishlistLinkId,'undoBought() harus melepas wishlistLinkId dari transaksi supaya tidak lagi tersambung ke item yang sudah di-undo');
} finally {
D.wishlist=backupWishlist;
D.transactions=backupTx;
window.askConfirm=backupAskConfirm;
save();
}
}},
{name:'add_wishlist (Chat AI): validasi input & barang tersimpan ke D.wishlist sebagai rencana (bukan transaksi nyata)', fn:()=>{
if(typeof CHAT_ACTION_HANDLERS==='undefined'||typeof CHAT_ACTION_HANDLERS.add_wishlist!=='function')return;
const backupWishlist=JSON.parse(JSON.stringify(D.wishlist||[]));
const backupTxCount=D.transactions.length;
try{
let threw=false;
try{ CHAT_ACTION_HANDLERS.add_wishlist({name:'',price:10000}); }catch(e){ threw=true; }
_selfTestAssert(threw,'add_wishlist harus menolak nama barang kosong');
threw=false;
try{ CHAT_ACTION_HANDLERS.add_wishlist({name:'Tes',price:0}); }catch(e){ threw=true; }
_selfTestAssert(threw,'add_wishlist harus menolak harga yang tidak valid (0/kosong/negatif)');
CHAT_ACTION_HANDLERS.add_wishlist({name:'__selftest_chat_wl__',price:30000,cat:'kebutuhan',urgensi:'mendesak'});
const added=D.wishlist.find(x=>x.name==='__selftest_chat_wl__');
_selfTestAssert(!!added,'add_wishlist harus menambah item baru ke D.wishlist');
_selfTestAssert(added.bought===false,'Barang dari add_wishlist harus berstatus belum-dibeli (cuma rencana, bukan transaksi nyata)');
_selfTestAssert(D.transactions.length===backupTxCount,'add_wishlist TIDAK BOLEH ikut membuat transaksi nyata di D.transactions');
} finally {
D.wishlist=backupWishlist;
save();
}
}},
{name:'Torsi.scalePositionHtml()/scaleSvgHtml()/thimbleSvgHtml(): tidak crash & hasil valid untuk nilai batas kunci (min/max/tepat kelipatan/tengah garis)', fn:()=>{
const testVals=[
MY_WRENCH.minNm,
MY_WRENCH.maxNm,
MY_WRENCH_SCALE[2].nm,
45,
MY_WRENCH_SCALE[0].nm+MY_WRENCH_SCALE[0].nm/10*9.6
];
testVals.forEach(nm=>{
let html;
try{ html=Torsi.scalePositionHtml(nm); }
catch(e){ _selfTestAssert(false,'Torsi.scalePositionHtml('+nm+') melempar error: '+e.message); return; }
_selfTestAssert(typeof html==='string'&&html.includes('<svg'),'Torsi.scalePositionHtml('+nm+') harus mengembalikan HTML berisi ilustrasi SVG, dapat: '+String(html).slice(0,60));
});
let threwOutOfRange=false;
try{ Torsi.scalePositionHtml(MY_WRENCH.minNm-5); Torsi.scalePositionHtml(MY_WRENCH.maxNm+20); }
catch(e){ threwOutOfRange=true; }
_selfTestAssert(!threwOutOfRange,'Torsi.scalePositionHtml() tidak boleh crash walau dipanggil dengan nilai di luar jangkauan kunci');
let threwRenderNote=false;
try{
Torsi.renderWrenchNote(null);
Torsi.renderWrenchNote(NaN);
Torsi.renderWrenchNote(50);
}catch(e){ threwRenderNote=true; }
_selfTestAssert(!threwRenderNote,'Torsi.renderWrenchNote() tidak boleh crash untuk input null/NaN/nilai normal (elemen trsWrenchNote mungkin belum ada di DOM saat modal tertutup, harus fail-safe)');
}},
{name:'findVehicleSpec()/renderVehicleSpecCard(): tidak crash untuk model dikenal, model tidak dikenal, atau kendaraan kosong', fn:()=>{
const known=findVehicleSpec('Vario 125 KZR (test)');
_selfTestAssert(!!known,'findVehicleSpec() harus mengenali nama yang mengandung "vario 125" (case-insensitive)');
_selfTestAssert(known.ban&&known.ban.depan&&known.ban.belakang,'Data spek ban depan & belakang harus ada untuk Vario 125');
const unknown=findVehicleSpec('Motor Antah Berantah 999');
_selfTestAssert(unknown===null,'findVehicleSpec() harus mengembalikan null utk model yang tidak dikenal, BUKAN melempar error atau data ngawur');
_selfTestAssert(findVehicleSpec('')===null&&findVehicleSpec(undefined)===null,'findVehicleSpec() harus fail-safe (null) untuk input kosong/undefined');
let threw=false;
try{ renderVehicleSpecCard(); }catch(e){ threw=true; }
_selfTestAssert(!threw,'renderVehicleSpecCard() tidak boleh crash walau elemen #vehSpecCard belum ada di DOM (halaman Car Notes belum dibuka)');
}},
{name:'Regresi UI: semua id yang dipanggil getElementById() ada di HTML (deteksi typo id)', fn:()=>{
const snapshot=getHtmlSnapshotForSelfTest();
_selfTestAssert(snapshot.length>1000,'Snapshot HTML untuk tes regresi UI kosong/gagal terekam');
const scriptSrc=Array.from(document.scripts).map(s=>s.textContent||'').join('\n');
const idRe=/getElementById\(\s*['"]([\w-]+)['"]\s*\)/g;
// id-id berikut SENGAJA TIDAK ada di HTML statis -- dibuat/ditempel ke DOM secara dinamis lewat
// JS, BUKAN typo, jadi dikecualikan dari cek "missing" di bawah (bukan cuma ditambah ke set yang
// dicek -- itu bug lama, lihat riwayat fix):
//   - selfRewardModal/selfRewardModalBody: ditempel SelfRewardView.ensureMounted() ke
//     document.body sekali saat pertama dibuka (lihat self-reward-view.js).
//   - investAiWidget: dibuat document.createElement() oleh InvestAI.mountInto(), di-append ke
//     box Alokasi Aset SETELAH box.innerHTML preset ditulis (lihat invest-ai-widget.js).
const DYNAMIC_MOUNT_IDS=new Set(['selfRewardModal','selfRewardModalBody','investAiWidget']);
const ids=new Set();
let m;
while((m=idRe.exec(scriptSrc))){ ids.add(m[1]); }
const missing=[];
ids.forEach(id=>{
if(DYNAMIC_MOUNT_IDS.has(id))return;
const attrRe=new RegExp('id=["\']'+id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'["\']');
if(!attrRe.test(snapshot))missing.push(id);
});
_selfTestAssert(missing.length===0,'id berikut dipakai di getElementById() tapi TIDAK ditemukan di HTML (kemungkinan typo id): '+missing.join(', '));
}},
{name:'renderDashboard() ikut memanggil mini-card Anggaran di Beranda (dashBudgetMiniCard)', fn:()=>{
const card=document.getElementById('dashBudgetMiniCard');
if(!card)return;
const backupBudgets=D.budgets;
try{
D.budgets=[{id:'__selftest_dashbudget__',name:'Tes Diagnostik',icon:'💰',catIds:['__total__'],limit:100000,rollover:false,period:'bulanan'}];
renderDashboard();
_selfTestAssert(card.style.display!=='none','#dashBudgetMiniCard harus tampil (bukan display:none) setelah renderDashboard() saat D.budgets tidak kosong — cek renderDashboard() memanggil renderDashBudgetMini()/Budget.renderDashMini()');
} finally {
D.budgets=backupBudgets;
renderDashboard();
}
}},
{name:'DebtStrategy.computeOrder() urutkan Avalanche (bunga tertinggi) & Snowball (saldo terkecil) dengan benar', fn:()=>{
const dummy=[{id:'a',name:'A',nilai:5000000,bunga:6,cicilanBulanan:500000},{id:'b',name:'B',nilai:1000000,bunga:24,cicilanBulanan:200000},{id:'c',name:'C',nilai:10000000,bunga:12,cicilanBulanan:1000000}];
const avalanche=DebtStrategy.computeOrder(dummy,'avalanche');
_selfTestAssert(avalanche.map(d=>d.id).join(',')==='b,c,a','Avalanche harus urut bunga tertinggi dulu (b,c,a), dapat '+avalanche.map(d=>d.id).join(','));
const snowball=DebtStrategy.computeOrder(dummy,'snowball');
_selfTestAssert(snowball.map(d=>d.id).join(',')==='b,a,c','Snowball harus urut saldo terkecil dulu (b,a,c), dapat '+snowball.map(d=>d.id).join(','));
_selfTestAssert(dummy.map(d=>d.id).join(',')==='a,b,c','computeOrder() tidak boleh mengubah array asli (harus pakai salinan)');
}},
{name:'DebtStrategy.simulate() menghitung lama pelunasan & efek dana ekstra dengan benar', fn:()=>{
const single=[{id:'x',nilai:1200000,bunga:0,cicilanBulanan:100000}];
const simNoExtra=DebtStrategy.simulate(single,0);
_selfTestAssert(simNoExtra.months===12,'Utang 1.2jt tanpa bunga, cicilan 100rb/bln, tanpa dana ekstra, harus lunas dlm 12 bln, dapat '+simNoExtra.months);
const simWithExtra=DebtStrategy.simulate(single,100000);
_selfTestAssert(simWithExtra.months===6,'Utang 1.2jt tanpa bunga, cicilan 100rb + ekstra 100rb/bln, harus lunas dlm 6 bln, dapat '+simWithExtra.months);
const noCicilan=[{id:'y',nilai:1000000,bunga:10,cicilanBulanan:0}];
const simNone=DebtStrategy.simulate(noCicilan,0);
_selfTestAssert(simNone.months===null,'Utang tanpa cicilanBulanan harus dilewati simulasi (months=null), dapat '+simNone.months);
}},
{name:'(kw63) FI.assetFund()/totalDebt()/netAssetFund() konsisten & tidak exception', fn:()=>{
const assetFund=FI.assetFund(), totalDebt=FI.totalDebt(), net=FI.netAssetFund();
_selfTestAssert(typeof assetFund==='number'&&!Number.isNaN(assetFund),'FI.assetFund() harus berupa angka valid, dapat '+assetFund);
_selfTestAssert(typeof totalDebt==='number'&&!Number.isNaN(totalDebt),'FI.totalDebt() harus berupa angka valid, dapat '+totalDebt);
_selfTestAssert(net===assetFund-totalDebt,'FI.netAssetFund() harus sama dengan assetFund()-totalDebt(), dapat net='+net+' vs hitung manual='+(assetFund-totalDebt));
}},
{name:'(kw63) Kekayaan.currentNetWorth() menghasilkan angka valid tanpa exception', fn:()=>{
const nw=Kekayaan.currentNetWorth();
_selfTestAssert(typeof nw==='number'&&!Number.isNaN(nw),'Kekayaan.currentNetWorth() harus berupa angka valid, dapat '+nw);
}},
{name:'(kw63) DanaDaruratAI.computeRecommendation() mengembalikan bentuk & multiplier yang valid', fn:()=>{
const r=DanaDaruratAI.computeRecommendation();
_selfTestAssert([6,9,12].indexOf(r.multiplier)>-1,'multiplier harus salah satu dari 6/9/12, dapat '+r.multiplier);
_selfTestAssert(typeof r.recommended==='number'&&r.recommended>=0,'recommended harus angka >=0, dapat '+r.recommended);
_selfTestAssert(typeof r.reason==='string'&&r.reason.length>0,'reason harus berupa teks penjelasan, tidak boleh kosong');
}},
{name:'(kw63) Pensiun.sisaBulan()/proyeksi()/danaTerkumpul() konsisten dgn data dummy (backup & restore D.pensiun)', fn:()=>{
const backup=D.pensiun;
try{
D.pensiun={usiaSekarang:30,usiaPensiun:35,kontribusiBulanan:1000000,returnTahunan:0,accId:null};
_selfTestAssert(Pensiun.sisaBulan()===60,'sisaBulan() usia 30->35 harus 60 bulan, dapat '+Pensiun.sisaBulan());
_selfTestAssert(Pensiun.danaTerkumpul()===0,'danaTerkumpul() tanpa accId harus 0, dapat '+Pensiun.danaTerkumpul());
const proyeksi=Pensiun.proyeksi();
_selfTestAssert(proyeksi===1000000*60,'proyeksi() tanpa return (0%) & pv=0 harus sama dgn total setoran (60jt), dapat '+proyeksi);
D.pensiun={usiaSekarang:35,usiaPensiun:30,kontribusiBulanan:0,returnTahunan:6,accId:null};
_selfTestAssert(Pensiun.sisaBulan()===0,'sisaBulan() saat usiaPensiun<=usiaSekarang harus 0 (dianggap tidak valid), dapat '+Pensiun.sisaBulan());
} finally {
D.pensiun=backup;
}
}},
{name:'(kw64) computeFileSizeStatus() mengembalikan status ambang batas yang valid', fn:()=>{
const fs=computeFileSizeStatus();
_selfTestAssert(typeof fs.size==='number'&&fs.size>0,'size harus angka positif, dapat '+fs.size);
_selfTestAssert(['aman','warn','action'].indexOf(fs.level)>-1,'level harus salah satu dari aman/warn/action, dapat '+fs.level);
_selfTestAssert(fs.warnAt<fs.actionAt,'ambang warnAt harus lebih kecil dari actionAt');
}},
{name:'(kw66) computeModalSweepCoverageResults() mendeteksi modal yang belum terdaftar', fn:()=>{
const cov=computeModalSweepCoverageResults();
_selfTestAssert(typeof cov.allCount==='number'&&cov.allCount>0,'allCount harus angka positif (ada modal di DOM), dapat '+cov.allCount);
_selfTestAssert(Array.isArray(cov.uncovered),'uncovered harus array');
const fake=document.createElement('div');
fake.className='overlay';
fake.id='__selftest_fake_modal_kw66__';
document.body.appendChild(fake);
try{
const cov2=computeModalSweepCoverageResults();
_selfTestAssert(cov2.uncovered.includes('__selftest_fake_modal_kw66__'),'modal palsu yang sengaja belum didaftarkan harus muncul di uncovered[]');
} finally {
fake.remove();
}
}},
{name:'(kw67) computeProductionSyncStatus() mengembalikan status yang konsisten', fn:()=>{
const ps=computeProductionSyncStatus();
_selfTestAssert(typeof ps.inSync==='boolean','inSync harus boolean');
_selfTestAssert(ps.inSync===(ps.masterVersion===ps.syncedVersion),'inSync harus persis sama dgn (masterVersion===syncedVersion)');
_selfTestAssert(typeof ps.label==='string'&&ps.label.length>0,'label harus string tidak kosong');
}},
{name:'(kw68) PriceReko.roundNice()/calc() menghasilkan rekomendasi harga jual yang konsisten', fn:()=>{
_selfTestAssert(PriceReko.roundNice(0)===0,'roundNice(0) harus 0');
_selfTestAssert(PriceReko.roundNice(-100)===0,'roundNice(negatif) harus 0 (fail-safe)');
_selfTestAssert(PriceReko.roundNice(33200)===33000,'roundNice(33200) di skala 20rb-100rb (step 1000) harus 33000, dapat '+PriceReko.roundNice(33200));
_selfTestAssert(PriceReko.roundNice(1234567)===1250000,'roundNice(1234567) di skala >=1jt (step 50000) harus 1250000, dapat '+PriceReko.roundNice(1234567));
const pBeli=document.getElementById('pBeli'),pJual=document.getElementById('pJual'),pReseller=document.getElementById('pReseller');
const t=document.getElementById('prkTransport'),m=document.getElementById('prkMargin');
if(!pBeli||!pJual||!pReseller||!t||!m)return; // form belum ter-render (mis. modal produk belum pernah dibuka), lewati aman
const backup={pBeli:pBeli.value,pJual:pJual.value,pReseller:pReseller.value,t:t.value,m:m.value};
try{
pBeli.value='20000';t.value='2000';m.value='50';
const result=PriceReko.calc();
_selfTestAssert(result===33000,'calc() modal 20rb+transport 2rb margin 50% harus 33000, dapat '+result);
pReseller.value='';
PriceReko.apply();
_selfTestAssert(pJual.value==='33000','apply() harus isi pJual=33000, dapat '+pJual.value);
_selfTestAssert(pReseller.value!==''&&Number(pReseller.value)<Number(pJual.value),'apply() harus isi pReseller lebih rendah dari pJual kalau masih kosong, dapat '+pReseller.value);
} finally {
pBeli.value=backup.pBeli;pJual.value=backup.pJual;pReseller.value=backup.pReseller;t.value=backup.t;m.value=backup.m;
}
}},
{name:'UI: panel tab benar-benar terlihat (computed display) setelah tab diklik -- cegah bug "u-dnone (!important) menang lawan inline style display:block"', fn:()=>{
const groups=[
{page:'#page-carnotes',fn:(typeof setCnTab==='function')?setCnTab:null,paneId:t=>'cnTab-'+t},
{page:'#page-shop',fn:(typeof setShopTab==='function')?setShopTab:null,paneId:t=>'shopTab-'+t},
{page:'#page-pajak',fn:(typeof setPajakTab==='function')?setPajakTab:null,paneId:t=>'pajakTab-'+t},
{page:'#page-keuangan',fn:(typeof setKeuanganTab==='function')?setKeuanganTab:null,paneId:t=>'keuanganTab-'+t},
{page:'#page-keuangan',fn:(typeof BudgetTabs!=='undefined')?BudgetTabs.switchTo:null,paneId:t=>'budgetTabPane-'+t,btnClass:'.budget-tab-btn'},
{page:'#page-aset',fn:(typeof setAsetTab==='function')?setAsetTab:null,paneId:t=>'asetTab-'+t},
{page:'#keuanganTab-laporan',fn:(typeof setLaporanTab==='function')?setLaporanTab:null,paneId:t=>'laporanTab-'+t,btnClass:'.lap-subtab'},
{page:'#keuanganTab-kelola',fn:(typeof setKelolaTab==='function')?setKelolaTab:null,paneId:t=>'kelolaTab-'+t,btnClass:'.kel-subtab'},
{page:'#pajakTab-pajak',fn:(typeof setPjkTab==='function')?setPjkTab:null,paneId:t=>'pjkTab-'+t,btnClass:'.pjk-subtab'},
// Sesi 158 (permintaan eksplisit user): sub-tab bersarang BARU di dalam
// tab Insight AI/BBM (page-carnotes) — pola SAMA PERSIS 3 entry sub-tab
// di atas (laporan/kelola/pajak).
{page:'#cnTab-insight',fn:(typeof setCnInsightTab==='function')?setCnInsightTab:null,paneId:t=>'cniTab-'+t,btnClass:'.cni-subtab'},
{page:'#cnTab-bbm',fn:(typeof setCnBbmTab==='function')?setCnBbmTab:null,paneId:t=>'cnbTab-'+t,btnClass:'.cnb-subtab'}
];
groups.forEach(g=>{
if(!g.fn)return;
const btns=[...document.querySelectorAll(g.page+' '+(g.btnClass||'.cn-tab'))];
if(!btns.length)return;
const originalBtn=btns.find(b=>b.classList.contains('active'))||btns[0];
let originalTab=null;
try{ originalTab=JSON.parse(originalBtn.getAttribute('data-args')||'[]')[0]; }catch(e){ /* data-args tidak valid/kosong -- originalTab tetap null, aman diabaikan */ }
try{
btns.forEach(btn=>{
let tabName=null;
try{ tabName=JSON.parse(btn.getAttribute('data-args')||'[]')[0]; }catch(e){ /* data-args tidak valid/kosong -- tabName tetap null, di-skip guard di bawah */ }
if(!tabName)return;
g.fn(tabName,btn);
const pane=document.getElementById(g.paneId(tabName));
if(pane){
const disp=getComputedStyle(pane).display;
_selfTestAssert(disp!=='none','Panel #'+pane.id+' harus terlihat (computed display bukan "none") setelah tab "'+tabName+'" di '+g.page+' diaktifkan -- kalau ini gagal, kemungkinan class u-dnone (display:none !important) tidak dilepas walau JS sudah set display:block');
}
});
} finally {
if(originalTab) g.fn(originalTab,originalBtn);
}
});
}},
{name:'UI: konten daftar panjang tidak kepotong tanpa scrollbar (cegah bug "Riwayat Servis Vario 125 tidak bisa scroll")', fn:()=>{
document.querySelectorAll('.card-collapse-body').forEach(body=>{
if(body.classList.contains('collapsed'))return;
const scrollH=body.scrollHeight, clientH=body.clientHeight;
_selfTestAssert(scrollH<=clientH+2,'Kartu #'+body.id+': konten setinggi '+scrollH+'px tapi area yg kelihatan cuma '+clientH+'px & TIDAK ADA scroll internal -- sisanya kepotong permanen tanpa cara menjangkaunya (mis. karena max-height:2000px + overflow:hidden di .card-collapse-body). Kalau daftar di dalamnya bisa tumbuh panjang, beri elemen listnya sendiri overflow-y:auto + max-height (lihat pola #servisList/#bbmList/#assetList di styles.css).');
});
const knownLongLists=['bbmList','servisList','allTx','lapTx','zakatLogList','wealthSnapshotList','assetList','piutangList','debtList','renovList'];
knownLongLists.forEach(id=>{
const el=document.getElementById(id);
if(!el)return;
const style=getComputedStyle(el);
_selfTestAssert(style.overflowY==='auto'||style.overflowY==='scroll','Daftar #'+id+' harus punya overflow-y:auto/scroll sendiri (bisa tumbuh panjang seiring waktu & hidup di dalam .card-collapse-body yg overflow:hidden) -- kalau aturan CSS-nya kehapus/berubah tanpa sadar, ini akan gagal.');
});
}},
{name:'Kartu pengingat Backup (dashBackupReminderCard): muncul kalau belum pernah sync & data sudah banyak, sembunyi kalau sudah pernah sync/di-dismiss', fn:()=>{
if(typeof renderDashboardBackupReminder!=='function'||typeof dismissBackupReminder!=='function')throw new Error('renderDashboardBackupReminder()/dismissBackupReminder() harus ada');
const card=document.getElementById('dashBackupReminderCard');
if(!card)return; // halaman dashboard belum ke-render sama sekali, skip
const backupGD=D.googleDrive, backupGS=D.googleSheets, backupTx=D.transactions;
const backupDismissFlag=localStorage.getItem('kw_backup_reminder_dismissed');
try{
localStorage.removeItem('kw_backup_reminder_dismissed');
D.googleDrive={clientId:'',fileId:null,lastSync:null,autoSync:false};
D.googleSheets={spreadsheetId:'',lastSync:null};
D.transactions=Array.from({length:35},(_,i)=>({id:'__selftest_backup_tx_'+i,type:'expense',amount:1000,category:'Tes',date:todayStr()}));
renderDashboardBackupReminder();
_selfTestAssert(card.style.display==='block','Kartu Backup harus MUNCUL kalau belum pernah sync & data sudah >= 30 catatan');
D.googleDrive.lastSync=new Date().toISOString();
renderDashboardBackupReminder();
_selfTestAssert(card.style.display==='none','Kartu Backup harus SEMBUNYI kalau sudah pernah sync sekali lewat Drive/Sheets');
D.googleDrive.lastSync=null;
renderDashboardBackupReminder();
_selfTestAssert(card.style.display==='block','Kartu Backup harus muncul lagi kalau lastSync di-reset (memastikan bukan ke-cache)');
dismissBackupReminder();
_selfTestAssert(card.style.display==='none','Kartu Backup harus SEMBUNYI setelah tombol "Sudah Paham" (dismiss) dipencet');
_selfTestAssert(localStorage.getItem('kw_backup_reminder_dismissed')==='1','dismissBackupReminder() harus menyimpan flag dismiss ke localStorage');
} finally {
D.googleDrive=backupGD; D.googleSheets=backupGS; D.transactions=backupTx;
if(backupDismissFlag===null) localStorage.removeItem('kw_backup_reminder_dismissed'); else localStorage.setItem('kw_backup_reminder_dismissed',backupDismissFlag);
renderDashboardBackupReminder();
}
}},
{name:'UI: elemen interaktif (data-action) yang cuma berisi ikon/emoji/tanpa teks wajib punya aria-label (aksesibilitas screen reader)', fn:()=>{
findMissingAriaLabels(document).forEach(msg=>_selfTestAssert(false,msg));
}},
// S583 sesi-7: wiring TitipanReconcile.checkAll() (S583 sesi-6) ke Tes
// Otomatis -- sebelumnya cuma disiapkan sbg 1 titik panggil tunggal, belum
// benar-benar dipanggil dari mana pun (lihat PATCH-NOTES.md sesi-6, "Belum
// dikerjakan"). PURE baca-saja (0 mutasi D), guard typeof spy tidak crash
// kalau titipan-reconcile.js kebetulan belum ke-load duluan.
{name:'TitipanReconcile.checkAll(): audit sinkron Dana Titipan (Buku Utang vs Aset/Investasi) + konsistensi ownerId + staleness nama pasca-rename, semua 0 gap', fn:()=>{
if(typeof TitipanReconcile==='undefined')return;
const r=TitipanReconcile.checkAll();
_selfTestAssert(r.ok,'TitipanReconcile.checkAll() menemukan gap -- sync.ok='+r.sync.ok+' (missing:'+r.sync.missing.length+' orphan:'+r.sync.orphan.length+' mismatch:'+r.sync.mismatch.length+'), ownerIdConsistency.ok='+r.ownerIdConsistency.ok+' (divergent:'+r.ownerIdConsistency.divergent.length+'), debtNameStaleness.ok='+r.debtNameStaleness.ok+' (stale:'+r.debtNameStaleness.stale.length+')');
}},
];
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
for(const c of cases){
try{ await c.fn(); results.push({name:c.name,pass:true}); }
catch(e){
let msg=e.message;
if(_lazyLoadFailNote && /\b(Renov\w*|SewaKios)\b is not defined/.test(msg)) msg+=' — BUKAN bug kode: '+_lazyLoadFailNote.replace(/^ \| /,'');
results.push({name:c.name,pass:false,error:msg});
}
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
async function repairTitipanOrphans(){
if(typeof TitipanReconcile==='undefined'){
toast('⚠️ Modul TitipanReconcile belum termuat');
return;
}
const pre=TitipanReconcile.check();
if(pre.ok){
toast('✅ Tidak ada gap Dana Titipan yang perlu diperbaiki');
return;
}
const parts=[];
if(pre.missing.length)parts.push(pre.missing.length+' baris yang seharusnya ada tapi belum tercatat (missing)');
if(pre.orphan.length)parts.push(pre.orphan.length+' baris yang pemiliknya sudah tidak ada (orphan)');
const ok=await askConfirm(
'Ditemukan '+parts.join(' & ')+'. Baris "missing" akan DIBUAT/disinkron ulang (disamakan dgn porsi kepemilikan Aset/Investasi saat ini), baris "orphan" akan DIHAPUS dari Buku Utang. Lanjutkan?',
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
if(synced>0||removed>0){
save();
const msgs=[];
if(synced>0)msgs.push(synced+' aset/holding disinkron ulang');
if(removed>0)msgs.push(removed+' baris orphan dibersihkan');
toast('🔧 '+msgs.join(', '));
}else{
toast('✅ Tidak ada baris yang diubah (gap sudah bersih)');
}
if(unresolved.length&&typeof console!=='undefined'&&console.warn){
console.warn('[repairTitipanOrphans] gap "missing" tidak bisa diperbaiki otomatis -- aset/holding sumbernya sudah tidak ada di data:',unresolved);
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
const data=await computeSelfTestResults();
saveSelfTestState(data);
safeSetItem('kw_selftest_build',APP_BUILD_VERSION);
if(data.failCount>0){
toast('⚠️ Tes diagnostik otomatis: '+data.failCount+' dari '+data.total+' gagal setelah update. Cek Pengaturan → Diagnostik.',4500);
}
}catch(e){ console.warn('Auto self-test gagal jalan:',e); }
}
async function init(){
// FIX (2026-07-30): tandai boot sudah mulai SEBELUM apa pun lain -- dibaca oleh guard
// controllerchange di index.html/app_production.html supaya reload anti-flash SW tidak
// menembak lagi begitu init() (dan showPinScreen()) sudah jalan. Lihat komentar lengkap
// di blok controllerchange index.html soal bug "PIN muncul 2x".
window.__kwBooted=true;
await load();
if(typeof AIService!=='undefined'&&typeof AIService.wireEvents==='function'){
try{AIService.wireEvents();}catch(e){console.warn('[AIService] wireEvents gagal:',e);}
}
// Sesi 7: daftarkan rule domain FINANCE pertama ke AIDecision (lihat komentar
// registerFinanceAIRules() di modules/finance/tx-list-cashflow.js). Sama
// pola guard/try-catch dgn wireEvents() di atas — 1 domain gagal register
// tidak boleh menjatuhkan boot.
if(typeof registerFinanceAIRules==='function'){
try{registerFinanceAIRules();}catch(e){console.warn('[AIDecision] registerFinanceAIRules gagal:',e);}
}
// Sesi 8: lanjutan Sesi 7 — rule domain VEHICLE/ASSET/DELIVERY (lihat
// komentar masing-masing register*AIRules() di file domainnya).
if(typeof registerVehicleAIRules==='function'){
try{registerVehicleAIRules();}catch(e){console.warn('[AIDecision] registerVehicleAIRules gagal:',e);}
}
if(typeof registerAssetAIRules==='function'){
try{registerAssetAIRules();}catch(e){console.warn('[AIDecision] registerAssetAIRules gagal:',e);}
}
if(typeof registerDeliveryAIRules==='function'){
try{registerDeliveryAIRules();}catch(e){console.warn('[AIDecision] registerDeliveryAIRules gagal:',e);}
}
// TODO.md #1: rule Cross Module pertama (Finance + Delivery), lihat komentar
// registerCrossModuleAIRules() di modules/ai/ai-decision-engine.js. Dipanggil
// setelah domain rules di atas (urutan tidak wajib, tapi lebih runut dibaca).
if(typeof registerCrossModuleAIRules==='function'){
try{registerCrossModuleAIRules();}catch(e){console.warn('[AIDecision] registerCrossModuleAIRules gagal:',e);}
}
applyEffectiveTheme();
setupPWA();
enableSwipeToDismiss('txModal');
enableSwipeToDismiss('worthItModal');
if(navigator.storage&&navigator.storage.persist){
navigator.storage.persist().catch(()=>{});
}
const now=new Date();
document.getElementById('headerDate').textContent=now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'});
setInterval(()=>{applyEffectiveTheme();checkAndFireReminders();if(D.googleDrive.autoSync&&gdriveAccessToken)uploadBackupToDrive(true);},5*60*1000);
const tryBackupOnClose=()=>{
saveFlush();
if(D.googleDrive&&D.googleDrive.autoSync&&gdriveAccessToken){
uploadBackupToDrive(true);
}
};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')tryBackupOnClose();});
window.addEventListener('pagehide',tryBackupOnClose);
const pin=localStorage.getItem('kw_pin');
if(pin){showPinScreen();return;}
const setup=localStorage.getItem('kw_setup');
if(!setup){const ob=document.getElementById('onboard');ob.classList.remove('u-dnone');ob.style.display='flex';updateOnboardPreview();return;}
showMain();
}
