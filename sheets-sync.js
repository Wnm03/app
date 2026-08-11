// sheets-sync.js — Integrasi Google Sheets: koneksi OAuth, sinkronisasi push/pull data D.* ke/dari
// Google Spreadsheet. Dipisah dari features-sheets-pwa-selftest.js (Sesi 2 restrukturisasi folder,
// blok 1/5 — lihat docs/AUDIT-SESI-1-features-sheets-pwa-selftest.js) murni pengelompokan ulang
// file, BUKAN perubahan perilaku. PENTING: file ini HARUS dimuat sesuai urutan build.js
// (GROUP_A/GROUP_B) karena beberapa modul saling referensi — cek scripts/build.js untuk urutan
// lengkap terkini.

/* moved to modules-render.js: renderSheetsSettings */
let sheetsTokenClient=null;
let sheetsPendingAfterAuth=null;
function sheetsInitTokenClient(){
if(!D.googleDrive.clientId){toast('⚠️ Isi Google OAuth Client ID dulu di kartu "Backup Otomatis ke Google Drive" di atas');return null;}
ensureGoogleGSI().catch(()=>{});
if(location.protocol==='file:'){toast('❌ App ini harus dibuka lewat https:// dulu (bukan file lokal) supaya Google Sign-In bisa jalan.');return null;}
if(typeof google==='undefined'||!google.accounts||!google.accounts.oauth2){toast('⚠️ Modul Google sedang dimuat, coba pencet lagi dalam 1-2 detik. Cek koneksi internet atau matikan Brave Shields untuk situs ini kalau tetap gagal.');return null;}
if(!sheetsTokenClient){
sheetsTokenClient=google.accounts.oauth2.initTokenClient({
client_id:D.googleDrive.clientId,
scope:'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets '+GDRIVE_EMAIL_SCOPE,
callback:(resp)=>{
if(resp.error){toast('❌ Gagal hubungkan Google Sheets: '+resp.error);sheetsPendingAfterAuth=null;return;}
gdriveHandleAuthSuccess(resp,'sheets');
const fn=sheetsPendingAfterAuth;sheetsPendingAfterAuth=null;
if(fn)fn();
},
error_callback:(err)=>{
console.error('GSI error_callback (sheets):',err);
toast('❌ Google Sign-In gagal dibuka: '+(err&&err.type?err.type:'unknown'));
sheetsPendingAfterAuth=null;
}
});
}
return sheetsTokenClient;
}
function sheetsEnsureAuth(afterAuth){
if(gdriveAccessToken && gdriveTokenScope==='sheets'){ if(afterAuth)afterAuth(); return; }
const tc=sheetsInitTokenClient();
if(!tc)return;
sheetsPendingAfterAuth=afterAuth||null;
try{ tc.requestAccessToken(); }
catch(e){ console.error('sheetsEnsureAuth error:',e); toast('❌ Gagal membuka Google Sign-In: '+e.message); sheetsPendingAfterAuth=null; }
}
function sheetsConnectOnly(){
if(gdriveAccessToken && gdriveTokenScope==='sheets'){toast('✅ Sudah terhubung (scope Sheets)');return;}
sheetsEnsureAuth(()=>toast('✅ Terhubung ke Google Sheets'));
}
async function sheetsFetch(url,opts){
const res=await fetch(url,{...opts,headers:{...(opts&&opts.headers),'Authorization':'Bearer '+gdriveAccessToken}});
if(res.status===401){
gdriveResetTokenState();
throw new Error('Token kadaluarsa/tidak valid (401), coba Sync Sekarang lagi untuk re-auth.');
}
if(!res.ok){ const t=await res.text().catch(()=>''); throw new Error('HTTP '+res.status+(t?': '+t.slice(0,200):'')); }
return res.json();
}
async function sheetsGetOrCreateSpreadsheet(){
if(D.googleSheets.spreadsheetId) return D.googleSheets.spreadsheetId;
const body={properties:{title:'Data Keluarga '+(D.profile.nama||'W')}};
const data=await sheetsFetch('https://sheets.googleapis.com/v4/spreadsheets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
D.googleSheets.spreadsheetId=data.spreadsheetId;
save();
return data.spreadsheetId;
}
const SHEETS_ROW_BUFFER=200;
async function sheetsEnsureTabs(ssId){
const meta=await sheetsFetch(`https://sheets.googleapis.com/v4/spreadsheets/${ssId}?fields=sheets.properties.title,sheets.properties.sheetId,sheets.properties.gridProperties.rowCount`);
const sheetMetaMap={};
(meta.sheets||[]).forEach(s=>{ sheetMetaMap[s.properties.title]={sheetId:s.properties.sheetId,rowCount:(s.properties.gridProperties&&s.properties.gridProperties.rowCount)||1000}; });
const missing=SHEETS_MODULES.filter(m=>!(m in sheetMetaMap));
if(missing.length){
const addRequests=missing.map(m=>{
const needed=(D[m]||[]).length+1+SHEETS_ROW_BUFFER;
return {addSheet:{properties:{title:m,gridProperties:{rowCount:Math.max(1000,needed),columnCount:26}}}};
});
const addRes=await sheetsFetch(`https://sheets.googleapis.com/v4/spreadsheets/${ssId}:batchUpdate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requests:addRequests})});
(addRes.replies||[]).forEach(r=>{ if(r.addSheet) sheetMetaMap[r.addSheet.properties.title]={sheetId:r.addSheet.properties.sheetId,rowCount:(r.addSheet.properties.gridProperties&&r.addSheet.properties.gridProperties.rowCount)||1000}; });
}
const headerData=SHEETS_MODULES.map(m=>{
const header=sheetsHeaderFor(m);
const lastCol=sheetsColLetter(header.length);
return {range:`${m}!A1:${lastCol}1`,values:[header]};
});
await sheetsFetch(`https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values:batchUpdate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({valueInputOption:'RAW',data:headerData})});
return sheetMetaMap;
}
async function sheetsSyncNow(){
if(_saveGuards['sheetsSync'])return;
if(!D.googleSheets.lastSync){
const confirmed=await askConfirm('Sync akan menyalin data dari HP ini ke Google Sheets. Setelah ini, kalau kamu menghapus sesuatu di HP lalu Sync lagi, baris yang sama di Sheets ikut TERHAPUS otomatis (supaya kedua sisi tetap sinkron). Jangan tambah baris manual sembarangan di Sheets. Lanjutkan sync pertama kali?',{title:'📊 Sebelum Sync Pertama Kali',okText:'Ya, Lanjutkan Sync',danger:false,icon:'📊'});
if(!confirmed){toast('Sync dibatalkan.');return;}
}
_saveGuards['sheetsSync']=true;
try{
sheetsEnsureAuth(async ()=>{
try{
await _sheetsSyncInner();
}catch(e){
console.error('sheetsSyncNow error:',e);
toast('❌ Gagal sync ke Sheets: '+e.message);
}finally{
_saveGuards['sheetsSync']=false;
}
});
}catch(e){
_saveGuards['sheetsSync']=false;
toast('❌ Gagal sync ke Sheets: '+e.message);
}
}
const SHEETS_WRITE_CHUNK=400;
async function _sheetsSyncInner(silent){
toast('⏳ Menyiapkan Spreadsheet...');
const ssId=await sheetsGetOrCreateSpreadsheet();
const sheetMetaMap=await sheetsEnsureTabs(ssId);
const ranges=SHEETS_MODULES.map(m=>`ranges=${encodeURIComponent(m+'!A2:'+sheetsLastColFor(m))}`).join('&');
const bg=await sheetsFetch(`https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values:batchGet?${ranges}`);
const sheetsHasExistingRows=(bg.valueRanges||[]).some(vr=>vr.values&&vr.values.length>0);
if(sheetsHasExistingRows && _gdriveLocalDataLooksEmpty()){
if(silent){
console.warn('Sync ke Sheets dilewati: data lokal kosong tapi Spreadsheet sudah ada isi.');
toast('⚠️ Sync ke Sheets dilewati: data di HP ini kosong tapi Spreadsheet sudah ada isi. Buka Pengaturan → Google Sheets → "Tarik dari Sheets" dulu kalau mau ambil data lama itu.');
return false;
}
const confirmed=await askConfirm('Data di HP ini sekarang KOSONG, tapi Spreadsheet Google Sheets kamu sudah ada isi (kemungkinan data asli). Kalau lanjut, SEMUA baris yang ada di Sheets tapi tidak ada di HP akan DIHAPUS PERMANEN dari Sheets. Kalau tujuanmu memang mau mengambil/restore data lama, batalkan ini lalu pakai tombol "Tarik dari Sheets" (bukan Sync). Tetap lanjut & hapus data di Sheets?',{title:'⚠️ Sync akan menghapus data di Sheets',danger:true,okText:'Ya, Lanjut & Hapus',icon:'⚠️'});
if(!confirmed){toast('Sync dibatalkan.');return false;}
}
let totalUpdated=0, totalAdded=0, totalSkipped=0, totalOrphanDeleted=0;
const failedModules=[];
const nowIso=new Date().toISOString();
for(let idx=0;idx<SHEETS_MODULES.length;idx++){
const modKey=SHEETS_MODULES[idx];
try{
const vr=(bg.valueRanges||[])[idx]||{};
const lastCol=sheetsLastColFor(modKey);
const items=D[modKey]||[];
const localIds=new Set(items.map(it=>it.id));
const idMap={};
(vr.values||[]).forEach((row,i)=>{ if(row[0]) idMap[row[0]]={row:i+2, cellsJson:JSON.stringify(row.slice(2))}; });
let nextRow=(vr.values?vr.values.length:0)+2;
const writeData=[];
items.forEach(item=>{
const cells=sheetsItemToCells(modKey,item);
const newCellsJson=JSON.stringify(cells);
const existing=idMap[item.id];
if(existing){
if(existing.cellsJson===newCellsJson){ totalSkipped++; return; }
writeData.push({range:`${modKey}!A${existing.row}:${lastCol}${existing.row}`,values:[[item.id,nowIso,...cells]]});
totalUpdated++;
}else{
const row=nextRow++;
writeData.push({range:`${modKey}!A${row}:${lastCol}${row}`,values:[[item.id,nowIso,...cells]]});
totalAdded++;
}
});
const lastRowNeeded=nextRow-1;
const meta=sheetMetaMap[modKey];
if(meta&&lastRowNeeded>meta.rowCount){
toast(`⏳ Memperbesar tab "${modKey}" (kapasitas baris kurang)...`);
await sheetsFetch(`https://sheets.googleapis.com/v4/spreadsheets/${ssId}:batchUpdate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requests:[{updateSheetProperties:{properties:{sheetId:meta.sheetId,gridProperties:{rowCount:lastRowNeeded+SHEETS_ROW_BUFFER}},fields:'gridProperties.rowCount'}}]})});
}
for(let i=0;i<writeData.length;i+=SHEETS_WRITE_CHUNK){
const chunk=writeData.slice(i,i+SHEETS_WRITE_CHUNK);
toast(`⏳ Menulis ${modKey}: baris ${i+1}-${i+chunk.length} dari ${writeData.length}...`);
await sheetsFetch(`https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values:batchUpdate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({valueInputOption:'RAW',data:chunk})});
}
const orphanRows=Object.entries(idMap).filter(([id])=>!localIds.has(id)).map(([,v])=>v.row);
if(orphanRows.length){
const sheetId=meta?meta.sheetId:undefined;
const deleteRequests=orphanRows.sort((a,b)=>b-a).map(row=>({deleteDimension:{range:{sheetId,dimension:'ROWS',startIndex:row-1,endIndex:row}}}));
toast(`⏳ Menghapus ${deleteRequests.length} baris yatim di "${modKey}" (item yg sudah dihapus di HP)...`);
await sheetsFetch(`https://sheets.googleapis.com/v4/spreadsheets/${ssId}:batchUpdate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requests:deleteRequests})});
totalOrphanDeleted+=deleteRequests.length;
}
}catch(e){
console.error(`sheetsSyncNow: modul "${modKey}" gagal ditulis:`,e);
failedModules.push(modKey+': '+e.message);
}
}
D.googleSheets.lastSync=new Date().toISOString();
save();
renderSheetsSettings();
if(failedModules.length){
toast(`⚠️ Sync sebagian gagal (${failedModules.length} modul error, modul lain tetap tersimpan): ${failedModules.join(' | ').slice(0,300)}`);
}else{
const totalWritten=totalUpdated+totalAdded+totalOrphanDeleted;
toast(totalWritten? `✅ Sync ke Sheets selesai (${totalUpdated} ditimpa, ${totalAdded} baru, ${totalOrphanDeleted} dihapus, ${totalSkipped} tidak berubah)` : `✅ Sudah sinkron, tidak ada perubahan (${totalSkipped} item sama persis)`);
}
return true;
}
async function sheetsPullNow(){
if(_saveGuards['sheetsPull'])return;
_saveGuards['sheetsPull']=true;
try{
sheetsEnsureAuth(async ()=>{
try{
if(!_gdriveLocalDataLooksEmpty()){
toast('⏳ Sync perubahan lokal dulu sebelum menarik...');
await _sheetsSyncInner();
}
await _sheetsPullInner();
}
catch(e){ console.error('sheetsPullNow error:',e); toast('❌ Gagal tarik dari Sheets: '+e.message); }
finally{ _saveGuards['sheetsPull']=false; }
});
}catch(e){
_saveGuards['sheetsPull']=false;
toast('❌ Gagal tarik dari Sheets: '+e.message);
}
}
async function _sheetsPullInner(){
const ssId=D.googleSheets.spreadsheetId;
toast('⏳ Mengambil data dari Sheets...');
const ranges=SHEETS_MODULES.map(m=>`ranges=${encodeURIComponent(m+'!A2:'+sheetsLastColFor(m))}`).join('&');
const bg=await sheetsFetch(`https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values:batchGet?${ranges}`);
const pulled={}; let totalItems=0, totalBadRows=0;
(bg.valueRanges||[]).forEach((vr,idx)=>{
const modKey=SHEETS_MODULES[idx];
const arr=[];
(vr.values||[]).forEach(row=>{
if(!row[0])return;
try{
arr.push(sheetsCellsToItem(modKey,row[0],row.slice(2)));
}catch(e){ totalBadRows++; }
});
pulled[modKey]=arr;
totalItems+=arr.length;
});
let msg=`Data di HP untuk ${SHEETS_MODULES.length} modul (transaksi, shop, etalase produk, bbm, servis, km, stok sparepart, tagihan, target tabungan, dana pendidikan, absensi/gaji harian, data SIM, data tukang & absensinya, riwayat gaji mingguan — total ${totalItems} item dari Sheets) akan DITIMPA TOTAL dengan isi Spreadsheet. Modul lain (perjalanan/jalanLogs -- fitur lama, budget, produsen, aset, profil, akun, kategori) tidak disentuh.`;
if(totalBadRows) msg+=`\n\n⚠️ ${totalBadRows} baris di Sheets tidak terbaca (format rusak) dan akan dilewati/hilang.`;
const confirmed=await askConfirm(msg,{title:'Tarik dari Google Sheets',danger:true,okText:'Ya, Timpa dari Sheets',icon:'📥'});
if(!confirmed)return;
const ok=await applyRestoredData(pulled);
if(ok){
D.googleSheets.lastSync=new Date().toISOString();
save();
renderSheetsSettings();
toast(`✅ ${totalItems} item berhasil ditarik dari Sheets`);
}
}
