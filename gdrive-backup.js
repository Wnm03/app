// gdrive-backup.js — Integrasi Google Drive: OAuth connect/disconnect, backup manual/otomatis
// (uploadBackupToDrive), restore (gdriveDownloadBackup). Dipisah dari
// features-aiwidget-reminder-gdrive-search.js (Sesi 5 restrukturisasi folder, blok 1 — lihat
// AUDIT-STRUKTUR-FOLDER.md) murni pengelompokan ulang file, BUKAN perubahan perilaku.

const GDRIVE_EMAIL_SCOPE='https://www.googleapis.com/auth/userinfo.email';
let _gdriveSilentReconnectInProgress=false;
function gdriveTrySilentReconnectOnLoad(){
if(!D.googleDrive||!D.googleDrive.autoSync||!D.googleDrive.clientId)return;
if(gdriveAccessToken)return;
ensureGoogleGSI().catch(()=>{});
let attemptsLeft=15;
const tryNow=()=>{
if(gdriveAccessToken)return;
if(typeof google==='undefined'||!google.accounts||!google.accounts.oauth2){
if(--attemptsLeft>0)setTimeout(tryNow,400);
return;
}
const tc=gdriveInitTokenClient();
if(!tc)return;
_gdriveSilentReconnectInProgress=true;
try{
tc.requestAccessToken({prompt:''});
}catch(e){
_gdriveSilentReconnectInProgress=false;
console.warn('Auto-reconnect Google Drive (diam-diam) gagal dipanggil:',e);
}
};
tryNow();
}
function gdriveHandleAuthSuccess(resp,scopeLevel){
gdriveAccessToken=resp.access_token;
gdriveTokenScope=scopeLevel;
const expiresInSec=Number(resp.expires_in)||3500;
gdriveTokenExpiresAt=Date.now()+expiresInSec*1000;
gdriveFetchUserInfo();
renderGDriveSettings();
renderSheetsSettings();
}
async function gdriveFetchUserInfo(){
if(!gdriveAccessToken)return;
try{
const res=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{'Authorization':'Bearer '+gdriveAccessToken}});
if(!res.ok)return;
const info=await res.json();
gdriveUserEmail=info.email||null;
}catch(e){ }
renderGDriveSettings();
renderSheetsSettings();
}
function gdriveResetTokenState(){
gdriveAccessToken=null;
gdriveTokenScope=null;
gdriveTokenExpiresAt=null;
gdriveUserEmail=null;
gdrivePendingAfterAuth=null;
sheetsPendingAfterAuth=null;
renderGDriveSettings();
renderSheetsSettings();
}
function gdriveDisconnect(){
if(!gdriveAccessToken){toast('ℹ️ Belum terhubung ke akun Google manapun');return;}
const tok=gdriveAccessToken;
try{
if(typeof google!=='undefined'&&google.accounts&&google.accounts.oauth2&&google.accounts.oauth2.revoke){
google.accounts.oauth2.revoke(tok,()=>{});
}
}catch(e){ console.error('gdriveDisconnect revoke error:',e); }
gdriveResetTokenState();
toast('✅ Koneksi Google diputuskan');
}
function gdriveConnStatusLabel(requireSheetsScope){
if(!gdriveAccessToken)return '⚪ Belum terhubung sesi ini';
const now=Date.now();
if(gdriveTokenExpiresAt&&now>=gdriveTokenExpiresAt)return '⏰ Token kadaluarsa — pencet Hubungkan lagi';
if(requireSheetsScope&&gdriveTokenScope!=='sheets')return '🟡 Terhubung tapi scope belum cukup untuk Sheets — pencet Hubungkan/Sync lagi utk upgrade';
const who=gdriveUserEmail?(' sebagai '+gdriveUserEmail):'';
let expiryLabel='';
if(gdriveTokenExpiresAt){
const minsLeft=Math.max(0,Math.round((gdriveTokenExpiresAt-now)/60000));
expiryLabel=minsLeft>=1?(' (berlaku ±'+minsLeft+' menit lagi)'):(' (segera kadaluarsa)');
}
return '🔗 Terhubung'+who+expiryLabel;
}
function gdriveSaveClientId(){
D.googleDrive.clientId=document.getElementById('gdClientId').value.trim();
save();toast('✅ Client ID disimpan');
}
function gdriveInitTokenClient(){
if(!D.googleDrive.clientId){toast('⚠️ Isi Google Client ID dulu (lihat petunjuk di bawah)');return null;}
ensureGoogleGSI().catch(()=>{});
if(location.protocol==='file:'){
toast('❌ App ini dibuka langsung dari file HP (file://), Google Sign-In TIDAK BISA jalan di mode ini. App harus di-hosting di alamat https:// (misal GitHub Pages/Netlify/Vercel) baru Google Drive bisa terhubung. Lihat petunjuk di bawah.');
return null;
}
if(!/^[\w-]+\.apps\.googleusercontent\.com$/.test(D.googleDrive.clientId)){
toast('⚠️ Format Client ID sepertinya salah, harus diakhiri ".apps.googleusercontent.com" (jangan copy Client Secret)');
return null;
}
if(typeof google==='undefined'||!google.accounts||!google.accounts.oauth2){toast('⚠️ Modul Google sedang dimuat, coba pencet lagi dalam 1-2 detik. Kalau tetap gagal dan pakai Brave, coba matikan Shields (ikon 🦁 di address bar) untuk situs ini, lalu reload. Bisa juga karena koneksi internet.');return null;}
if(!gdriveTokenClient){
gdriveTokenClient=google.accounts.oauth2.initTokenClient({
client_id:D.googleDrive.clientId,
scope:'https://www.googleapis.com/auth/drive.file '+GDRIVE_EMAIL_SCOPE,
callback:(resp)=>{
const wasSilent=_gdriveSilentReconnectInProgress;_gdriveSilentReconnectInProgress=false;
if(resp.error){
gdrivePendingAfterAuth=null;
if(wasSilent){console.warn('Auto-reconnect Google Drive (diam-diam) tidak berhasil:',resp.error);return;}
toast('❌ Gagal hubungkan Google Drive: '+resp.error+(resp.error==='popup_closed_by_user'?' (jendela pilih akun ditutup sebelum selesai)':resp.error==='popup_failed_to_open'?' (popup diblokir browser, izinkan popup untuk situs ini)':resp.error==='origin_mismatch'?' (alamat situs ini belum ditambahkan sebagai Authorized JavaScript Origin di Google Cloud Console)':''));
return;
}
gdriveHandleAuthSuccess(resp,'drive');
const fn=gdrivePendingAfterAuth;gdrivePendingAfterAuth=null;
if(fn){fn();}
else if(wasSilent){toast('🔄 Google Drive tersambung otomatis');uploadBackupToDrive(true);}
else{toast('✅ Terhubung ke Google Drive');}
},
error_callback:(err)=>{
const wasSilent=_gdriveSilentReconnectInProgress;_gdriveSilentReconnectInProgress=false;
gdrivePendingAfterAuth=null;
if(wasSilent){console.warn('Auto-reconnect Google Drive (diam-diam) gagal dibuka:',err);return;}
console.error('GSI error_callback:',err);
toast('❌ Google Sign-In gagal dibuka: '+(err&&err.type?err.type:'unknown')+(err&&err.type==='popup_failed_to_open'?' — popup diblokir, cek pengaturan popup browser/Brave Shields':''));
}
});
}
return gdriveTokenClient;
}
function gdriveEnsureAuth(afterAuth){
if(gdriveAccessToken){ if(afterAuth)afterAuth(); return; }
const tc=gdriveInitTokenClient();
if(!tc)return;
gdrivePendingAfterAuth=afterAuth||null;
try{
tc.requestAccessToken();
}catch(e){
console.error('gdriveEnsureAuth error:',e);
gdrivePendingAfterAuth=null;
toast('❌ Gagal membuka Google Sign-In: '+e.message);
}
}
function gdriveConnectOnly(){
if(gdriveAccessToken){toast('✅ Sudah terhubung ke Google Drive');return;}
gdriveEnsureAuth(null);
}
function gdriveBackupNow(){
gdriveEnsureAuth(uploadBackupToDrive);
}
function gdriveRestoreNow(){
gdriveEnsureAuth(gdriveDownloadBackup);
}
function gdriveThrowForFailedRes(res){
if(res.status===401){
gdriveResetTokenState();
throw new Error('Sesi Google kadaluarsa/tidak valid (401). Silakan pencet Hubungkan lagi.');
}
throw new Error('HTTP '+res.status);
}
async function uploadBackupToDrive(silent){
if(_saveGuards['driveUpload'])return;
_saveGuards['driveUpload']=true;
try{
await _uploadBackupToDriveInner(silent);
} finally {
_saveGuards['driveUpload']=false;
}
}
function _gdriveLocalDataLooksEmpty(){
return (D.transactions||[]).length===0 && (D.accounts||[]).length===0 &&
(D.products||[]).length===0 && (D.assets||[]).length===0 &&
(D.bbmLogs||[]).length===0 && (D.servisLogs||[]).length===0;
}
async function _gdriveFindExistingBackupFileId(){
const q=encodeURIComponent("name='backup-keluarga-W.json' and trashed=false");
const res=await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,{
headers:{'Authorization':'Bearer '+gdriveAccessToken}
});
if(!res.ok) gdriveThrowForFailedRes(res);
const data=await res.json();
return (data.files&&data.files.length)?data.files[0].id:null;
}
async function _uploadBackupToDriveInner(silent){
if(!gdriveAccessToken){ if(silent)throw new Error('Belum terhubung ke Google Drive'); gdriveEnsureAuth(uploadBackupToDrive); return; }
// BUGFIX: buildBackupPayload() itu async function (baca IndexedDB lifeos:store/
// eie:store), tapi dulu dipanggil TANPA await -- backupD jadi Promise, dan
// JSON.stringify(Promise) menghasilkan "{}" kosong. Akibatnya SETIAP backup ke
// Google Drive (auto-sync maupun manual) mengupload file JSON kosong, menimpa
// backup lama yang valid tanpa peringatan apa pun. Backup lokal (exportData()/
// runFullBackup() jalur "File lokal") tidak kena karena sudah pakai await.
const backupD=await buildBackupPayload();
const content=JSON.stringify(backupD,null,2);
const KEEPALIVE_LIMIT=60000;
const contentSizeBytes=new Blob([content]).size;
const useKeepalive=contentSizeBytes<KEEPALIVE_LIMIT;
try{
let fileId=D.googleDrive.fileId;
if(!fileId){
fileId=await _gdriveFindExistingBackupFileId();
}
if(fileId && _gdriveLocalDataLooksEmpty()){
if(silent){
console.warn('Auto-backup dilewati: data lokal kosong tapi ada backup lama di Drive (fileId '+fileId+').');
toast('⚠️ Auto-sync dilewati: data di HP ini kosong tapi ada backup lama di Drive. Buka Pengaturan → Google Drive → "Restore dari Drive" dulu kalau mau ambil data lama itu.');
return false;
}
const confirmed=await askConfirm('Data di HP ini sekarang KOSONG, tapi sudah ada backup lain (kemungkinan berisi data asli kamu) di Google Drive. Kalau lanjut, backup lama itu akan TERTIMPA data kosong ini dan tidak bisa dikembalikan. Disarankan tap "Restore dari Drive" dulu, bukan Backup. Tetap lanjut backup dengan data kosong ini?',{title:'⚠️ Backup akan menimpa data lama',danger:true,okText:'Ya, Timpa dengan Data Kosong',icon:'⚠️'});
if(!confirmed)return false;
}
if(fileId){
const res=await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,{
method:'PATCH',
headers:{'Authorization':'Bearer '+gdriveAccessToken,'Content-Type':'application/json'},
body:content,
keepalive:useKeepalive
});
if(!res.ok) gdriveThrowForFailedRes(res);
D.googleDrive.fileId=fileId;
} else {
const metadata={name:'backup-keluarga-W.json',mimeType:'application/json'};
const boundary='kwboundary'+Date.now();
const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
const res=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{
method:'POST',
headers:{'Authorization':'Bearer '+gdriveAccessToken,'Content-Type':'multipart/related; boundary='+boundary},
body,
keepalive:useKeepalive
});
if(!res.ok) gdriveThrowForFailedRes(res);
const data=await res.json();
D.googleDrive.fileId=data.id;
}
D.googleDrive.lastSync=new Date().toISOString();
save();
renderGDriveSettings();
if(!silent)toast('✅ Backup tersimpan ke Google Drive');
return true;
}catch(e){
if(silent)throw e;
toast('❌ Gagal backup ke Drive: '+e.message);
}
}
function gdriveToggleAutoSync(checked){
D.googleDrive.autoSync=checked;save();
if(checked && !gdriveAccessToken){toast('ℹ️ Hubungkan Google Drive dulu. Auto-sync berjalan tiap beberapa menit selama app terbuka, & sekali lagi pas app ditutup/pindah (bukan saat sudah tertutup total)');}
}
async function gdriveDownloadBackup(){
if(_saveGuards['driveDownload'])return;
_saveGuards['driveDownload']=true;
try{
await _gdriveDownloadBackupInner();
} finally {
_saveGuards['driveDownload']=false;
}
}
async function _gdriveDownloadBackupInner(){
toast('⏳ Mencari file backup di Google Drive...');
try{
let fileId=D.googleDrive.fileId;
if(!fileId){
const q=encodeURIComponent("name='backup-keluarga-W.json' and trashed=false");
const res=await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,{
headers:{'Authorization':'Bearer '+gdriveAccessToken}
});
if(!res.ok) gdriveThrowForFailedRes(res);
const data=await res.json();
if(!data.files||!data.files.length){toast('⚠️ Tidak ditemukan file backup di Google Drive akun ini.');return;}
fileId=data.files[0].id;
}
const fileRes=await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,{
headers:{'Authorization':'Bearer '+gdriveAccessToken}
});
if(!fileRes.ok) gdriveThrowForFailedRes(fileRes);
const imp=await fileRes.json();
const confirmed=await askConfirm('Data yang ada di HP ini sekarang akan digabung/ditimpa dengan data dari Drive. Lanjutkan?',{title:'Restore dari Google Drive',danger:false,okText:'Ya, Restore',icon:'☁️'});
if(!confirmed)return;
const ok=await applyRestoredData(imp);
if(ok){D.googleDrive.fileId=fileId;saveFlush();}
if(ok)toast('✅ Data berhasil di-restore dari Google Drive!');
}catch(e){
toast('❌ Gagal restore dari Drive: '+e.message);
}
}
