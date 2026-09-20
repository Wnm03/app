// Self-test case registry part A.
function __kwSelfTestCasesA(){
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
const previousStale=typeof _crossTabStateStale!=='undefined'?_crossTabStateStale:false;
const previousObserver=typeof globalThis!=='undefined'?globalThis.__kwSaveImmediateObserver:undefined;
let called=false;
if(typeof globalThis!=='undefined')globalThis.__kwSaveImmediateObserver=function(){called=true;};
if(typeof _crossTabStateStale!=='undefined')_crossTabStateStale=false;
try{
save();
const pollStart=Date.now();
while(!called && (Date.now()-pollStart)<3000){ await new Promise(r=>setTimeout(r,25)); }
_selfTestAssert(called,'_saveImmediate() seharusnya terpanggil lewat debounce save()');
await new Promise(r=>setTimeout(r,80));
} finally {
if(typeof globalThis!=='undefined')globalThis.__kwSaveImmediateObserver=previousObserver;
if(typeof _crossTabStateStale!=='undefined')_crossTabStateStale=previousStale;
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
// SESI 393/s476a/B8 (pajak-pbb-zakat.js, Zakat.hitungMaal()): asetZakatable sekarang
// exclude aset yg sudah ditautkan ke Holding Investasi (`_migratedToInvestmentId`/
// `investmentId`, dihitung lewat Investment.zakatableValue() supaya 0 dobel-hitung),
// dan utang memprioritaskan FI.totalDebt() (Financial Intelligence, SSOT total utang)
// kalau tersedia. Formula test SEBELUMNYA ketinggalan dari kode asli -- disamakan di
// sini persis dgn Zakat.hitungMaal(), bukan mengubah kode asli (kode asli benar/lebih
// baru, test-nya yang stale).
const asetZakatable=(D.assets||[]).filter(a=>a.zakatable&&!a._migratedToInvestmentId&&!a.investmentId).reduce((s,a)=>s+(typeof MultiOwnerEngine!=='undefined'?MultiOwnerEngine.selfOwnedValue(a,a.nilai||0):(a.nilai||0)),0)+(typeof Investment!=='undefined'?Investment.zakatableValue():0);
const piutangZakatable=totalPiutangValue();
const utang=(typeof FI!=='undefined')?FI.totalDebt():((pz.utangJT||0)+totalDebtValue()+totalCicilanOutstanding());
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
 ];
}
