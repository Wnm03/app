// tx-bbm.js — logika panel "Sinkron ke Catatan Mobil (BBM)" pada txModal
// Dipindah ke modules/finance/tx-bbm.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// (Tambah/Edit Transaksi Keuangan). Dipisah dari transaksi.js (2026-07-11,
// lihat CLAUDE.md catatan kerja "split transaksi.js" bagian ke-6) murni
// sebagai pengelompokan ulang file, BUKAN perubahan perilaku. Semua fungsi di
// sini tetap global (bukan module/namespace) karena dipanggil dari:
//  - transaksi.js sendiri (updateTxVehiclePanels, editTx, openTxModal, _saveTxInner)
//  - HTML lewat atribut oninput/onchange di modals.js (mis. txBbmLiter pakai
//    oninput="syncTxBbmAmt()")
//  - file lain lintas-bundle: recordBbmLog dipanggil dari BBM._saveInner di
//    car-notes.js (GROUP_A) -- ini AMAN
//    walau tx-bbm.js ada di GROUP_B (dimuat setelah GROUP_A), karena
//    pemanggilannya baru terjadi saat user berinteraksi (lazy), bukan saat
//    file GROUP_A pertama kali di-parse/load.
function populateTxBbmVehicleSelect(preferredVehicleId){
const sel=document.getElementById('txBbmVehicle');
if(!sel||!D.vehicles)return;
const cur=sel.value;
sel.innerHTML=D.vehicles.map(v=>`<option value="${escapeHtml(v.id)}">${escapeHtml(v.emoji)} ${escapeHtml(v.name)}</option>`).join('');
const fallback=(typeof VehicleScopedSOT!=='undefined'&&VehicleScopedSOT.ensureActive)?((VehicleScopedSOT.ensureActive()||{}).id||''):(typeof curVehicleId!=='undefined'&&D.vehicles.find(v=>v.id===curVehicleId)?curVehicleId:'');
// S2729: konteks kategori kendaraan eksplisit mengalahkan kendaraan aktif/stale.
sel.value=preferredVehicleId&&D.vehicles.some(v=>v.id===preferredVehicleId)?preferredVehicleId:(cur&&D.vehicles.find(v=>v.id===cur)?cur:fallback);
}
function toggleTxBbmFields(){
const chk=document.getElementById('txSyncBbm');
const fields=document.getElementById('txBbmFields');
if(!chk||!fields)return;
fields.style.display=chk.checked?'block':'none';
if(chk.checked){
populateTxBbmVehicleSelect();
onTxBbmVehicleChange();
}
}
// BUGFIX (lihat catatan diagnosa): kmModal punya onKmVehicleChange() yg
// mengisi ulang field KM tiap ganti kendaraan (vehicle-core.js). Panel BBM
// di txModal ini TIDAK punya ekuivalennya -- txBbmKm dibiarkan diam saat
// txBbmVehicle diganti, sehingga km yg tersimpan lewat recordBbmLog() bisa
// jadi km kendaraan lain (kalau user lupa update manual) atau field kelihatan
// "tidak sync". Fix: reuse getVehicleKm() persis seperti onKmVehicleChange(),
// dipanggil dari onchange="onTxBbmVehicleChange()" di txBbmVehicle (modals.js)
// & dari toggleTxBbmFields() di atas supaya nilai awal saat panel dibuka juga benar.
// Sesi 755: fungsi ini JUGA yang sekarang bertanggung jawab isi ulang dropdown
// "Jenis BBM" (txBbmJenis) tiap kali kendaraan di txBbmVehicle diganti, dgn
// vehicleId dikirim ke FuelPriceRef.populateSelect()/onSelectChange() supaya
// tiap kendaraan pakai default jenis BBM-nya sendiri (D.fuelPriceRef.
// lastTypeByVehicle), bukan 1 lastType global yang saling menimpa antar
// kendaraan beda jenis BBM (mis. motor Pertalite vs mobil Pertamax).
function onTxBbmVehicleChange(){
const sel=document.getElementById('txBbmVehicle');
const kmEl=document.getElementById('txBbmKm');
if(!sel)return;
if(kmEl&&typeof getVehicleKm==='function'){
kmEl.value=getVehicleKm(sel.value)||'';
}
if(typeof FuelPriceRef!=='undefined'){
FuelPriceRef.populateSelect('txBbmJenis',sel.value);
FuelPriceRef.onSelectChange('txBbmJenis','txBbmHargaL',sel.value);
}
}
// SESI (fix CSP script-src-attr 'none' -- migrasi txBbmJenis dari inline
// onchange= ke data-onchange=): wrapper ini menggantikan inline lama
// onchange="FuelPriceRef.onSelectChange('txBbmJenis','txBbmHargaL',
// document.getElementById('txBbmVehicle').value)" -- dibutuhkan krn
// data-onchange-args di-resolve dari JSON statis (tidak bisa membawa
// pemanggilan document.getElementById(...) secara langsung), jadi nilai
// kendaraan aktif dibaca ulang di sini tiap kali txBbmJenis berubah.
function onTxBbmJenisChange(){
const vehSel=document.getElementById('txBbmVehicle');
const vehicleId=vehSel?vehSel.value:undefined;
if(typeof FuelPriceRef!=='undefined'){
FuelPriceRef.onSelectChange('txBbmJenis','txBbmHargaL',vehicleId);
}
}
// _txBbmSpbuOnBlur() — wrapper utk migrasi atribut inline onblur #txBbmSpbu
// (txModal, Sesi 4, lanjutan PATCH-SESI1-SESI2-SESI3-fix-csp-inline-handlers).
// Inline asli pakai arrow function
// (onblur="setTimeout(()=>hideSuggestBox('txBbmSpbuBox'),150)") -- dispatcher
// data-onblur cuma bisa panggil NAMA FUNGSI, jadi dipakai wrapper kecil sama
// persis pola _txCatOnBlur/_txSubCatOnBlur (transaksi.js), delay 150ms tetap.
function _txBbmSpbuOnBlur(){
setTimeout(()=>hideSuggestBox('txBbmSpbuBox'),150);
}
function syncTxBbmAmt(){
const liter=parseFloat(document.getElementById('txBbmLiter').value);
const harga=parseFloat(document.getElementById('txBbmHargaL').value);
if(liter&&harga){
document.getElementById('txAmt').value=Math.round(liter*harga);
}else{
syncTxAmtToLiterForce();
}
}
function syncTxAmtToLiter(){
const chk=document.getElementById('txSyncBbm');
if(!chk||!chk.checked)return;
syncTxAmtToLiterForce();
}
function syncTxAmtToLiterForce(){
const hargaEl=document.getElementById('txBbmHargaL');
const literEl=document.getElementById('txBbmLiter');
const harga=parseFloat(hargaEl.value);
const amt=parseFloat(document.getElementById('txAmt').value);
if(harga>0&&amt>0){
literEl.value=(amt/harga).toFixed(2);
}
}
// Gerbang validasi bersama untuk kedua jalur simpan BBM (Car Notes dan Transaksi).
// Tidak mengubah data/SOT; duplikat persis tetap boleh disimpan demi kompatibilitas
// historis, tetapi dicatat oleh getFuelDataQuality() sebagai possible-duplicate.
function validateFuelLogInput(opts){
const o=opts||{};
const km=Number(o.km),liter=Number(o.liter);
if(!Number.isFinite(km)||km<=0)return{ok:false,reason:'KM harus berupa angka lebih dari 0'};
if(!Number.isFinite(liter)||liter<=0)return{ok:false,reason:'Liter harus berupa angka lebih dari 0'};
if(liter>200)return{ok:false,reason:'Liter BBM melebihi batas kewajaran 200 L'};
if(o.date&&/^\d{4}-\d{2}-\d{2}$/.test(String(o.date))&&o.vehicleId){
 const logs=(typeof D!=='undefined'&&Array.isArray(D.bbmLogs)?D.bbmLogs:[]).filter(x=>x&&String(x.vehicleId)===String(o.vehicleId)&&(!o.existingBbmId||String(x.id)!==String(o.existingBbmId))&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||''))&&Number.isFinite(Number(x.km))&&Number(x.km)>0);
 const prior=logs.filter(x=>String(x.date)<String(o.date)).sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0];
 const next=logs.filter(x=>String(x.date)>String(o.date)).sort((a,b)=>String(a.date).localeCompare(String(b.date)))[0];
 if(prior&&km<Number(prior.km))return{ok:false,reason:'KM lebih kecil dari catatan BBM sebelumnya ('+Number(prior.km).toLocaleString('id-ID')+' km)'};
 if(next&&km>Number(next.km))return{ok:false,reason:'KM melebihi catatan BBM setelah tanggal ini ('+Number(next.km).toLocaleString('id-ID')+' km)'};
}
return{ok:true,km,liter};
}
// Fungsi murni (tidak baca/tulis DOM) -- dipakai baik dari applyTxBbmFromTx di
// bawah (sinkron dari form Transaksi umum) maupun dari BBM._saveInner (modal
// "Catat Isi BBM" khusus Car Notes, di file lain).
function recordBbmLog(opts){
const validation=validateFuelLogInput(opts);
if(!validation.ok)return{ok:false,reason:validation.reason};
let harga=opts.harga;
if(!harga&&opts.liter)harga=Math.round(opts.cost/opts.liter);
if(!D.bbmLogs)D.bbmLogs=[];
if(opts.existingBbmId){
const b=D.bbmLogs.find(x=>x.id===opts.existingBbmId);
if(b){
const previousVehicleId=b.vehicleId;
Object.assign(b,{date:opts.date,km:opts.km,liter:opts.liter,harga,cost:opts.cost,spbu:opts.spbu,fullTank:opts.fullTank,note:opts.note,accountId:opts.accountId,vehicleId:opts.vehicleId||b.vehicleId});
// TASK-jenis-BBM: simpan jenis kalau caller kirim -- JANGAN timpa dgn
// null/undefined kalau caller tidak kirim (mis. panggilan lama/lain yg
// belum tahu soal field ini), supaya jenis yg sudah tersimpan tidak hilang.
if(opts.jenis!==undefined&&opts.jenis!==null&&opts.jenis!=='')b.jenis=opts.jenis;
reconcileFuelStateFromLogs(previousVehicleId);
if(String(previousVehicleId)!==String(opts.vehicleId||b.vehicleId))reconcileFuelStateFromLogs(opts.vehicleId||b.vehicleId);
return{ok:true,bbmId:b.id,isNew:false,harga};
}
}
const bbmId=uid();
D.bbmLogs.push({id:bbmId,vehicleId:opts.vehicleId,date:opts.date,km:opts.km,liter:opts.liter,harga,cost:opts.cost,spbu:opts.spbu,fullTank:opts.fullTank,note:opts.note,accountId:opts.accountId,jenis:opts.jenis||undefined,txLinkId:opts.txId});
reconcileFuelStateFromLogs(opts.vehicleId);
return{ok:true,bbmId,isNew:true,harga};
}
// SESI FUEL-BAR-SYNC: model rekonsiliasi tunggal.
// Titik acuan adalah koreksi manual terbaru atau log isi penuh terbaru yang
// masih tersimpan. `appliedBbmIds` mencatat log parsial yang sudah berada di
// sisi sebelum baseline; log sesudah baseline, termasuk KM yang sama,
// dihitung estimator tepat satu kali. Saat km/L belum tersedia, baseline
// tidak dimajukan dan seluruh log parsial tetap menunggu estimasi berikutnya.
// Perhitungan konsumsi tetap milik FuelStateEstimator/fuelEfficiency().
function reconcileFuelStateFromLogs(vehicleId){
try{
if(typeof D==='undefined'||!Array.isArray(D.vehicles)||!vehicleId)return{ok:false,reason:'Kendaraan tidak tersedia'};
const veh=D.vehicles.find(v=>String(v.id)===String(vehicleId));
if(!veh)return{ok:false,reason:'Kendaraan tidak ditemukan'};
const logs=Array.isArray(D.bbmLogs)?D.bbmLogs.filter(x=>x&&String(x.vehicleId)===String(vehicleId)):[];
const manualCandidate=veh.manualFuelCorrection||(veh.fuelState&&/manual/.test(String(veh.fuelState.estimatedSource||''))?veh.fuelState:null);
const manual=manualCandidate&&Number.isFinite(Number(manualCandidate.currentFuelLiter))?manualCandidate:null;
if(manual&&!veh.manualFuelCorrection)veh.manualFuelCorrection={...manual};
const fulls=logs.map((log,index)=>({log,index})).filter(x=>x.log.fullTank&&Number.isFinite(Number(x.log.km))&&Number(x.log.km)>=0&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.log.date||''))).sort((a,b)=>String(a.log.date).localeCompare(String(b.log.date))||Number(a.log.km)-Number(b.log.km)||a.index-b.index);
const latestFull=fulls.length?fulls[fulls.length-1]:null;
let useManual=!!manual;
if(manual&&latestFull){
const manualTime=Date.parse(manual.correctedAt||'')||0;
const fullTime=Date.parse(String(latestFull.log.date)+'T00:00:00')||0;
useManual=manualTime>=fullTime;
}
// Tanpa estimator, log parsial tidak boleh mengubah snapshot yang ada.
// Log tetap tersimpan dan akan dihitung saat FuelStateEstimator tersedia.
if(!latestFull&&manual&&typeof FuelStateEstimator==='undefined')return{ok:true,baseline:veh.fuelState};
let baseline=null;
if(useManual){
baseline={...manual};
if(!Array.isArray(baseline.appliedBbmIds))baseline.appliedBbmIds=logs.filter(x=>!x.fullTank&&Number(x.km)<=Number(baseline.referenceKm)).map(x=>x.id);
}else if(latestFull){
if(typeof FuelTankProfile==='undefined'||typeof FuelGaugeEngine==='undefined')return{ok:false,reason:'Modul profil BBM belum tersedia'};
const profile=FuelTankProfile.get(vehicleId);
if(!profile||!Number(profile.tankCapacityLiter))return{ok:false,reason:'Profil tangki belum tersedia'};
const bar=FuelGaugeEngine.calculateFuelBar(vehicleId,Number(profile.tankCapacityLiter));
baseline={currentFuelBar:bar&&bar.ok?bar.bar:profile.fuelBarCount,currentFuelLiter:Number(profile.tankCapacityLiter),correctedAt:new Date().toISOString(),estimatedSource:'auto-bbm-log-full',confidenceScore:90,referenceKm:Number(latestFull.log.km),appliedBbmIds:logs.filter((x,i)=>String(x.date||'')<String(latestFull.log.date||'')||(String(x.date||'')===String(latestFull.log.date||'')&&(Number(x.km)||0)<=(Number(latestFull.log.km)||0)&&((Number(x.km)||0)<(Number(latestFull.log.km)||0)||i<=latestFull.index))).map(x=>x.id)};
}else{
delete veh.fuelState;
return{ok:true,empty:true};
}
if(!Number.isFinite(Number(baseline.currentFuelLiter)))return{ok:false,reason:'Titik acuan BBM tidak valid'};
veh.fuelState=baseline;
if(typeof FuelStateHistory!=='undefined'&&typeof FuelStateHistory.record==='function')FuelStateHistory.record(vehicleId,baseline);
// Estimator membaca semua partial setelah baseline. Jangan simpan hasil
// sementara sebagai baseline: terutama saat estimationLimited, itu akan
// menghilangkan delta KM dan mengunci angka yang belum dapat dihitung.
if(typeof FuelStateEstimator!=='undefined'&&typeof FuelStateEstimator.estimateCurrentLiter==='function'){
const estimate=FuelStateEstimator.estimateCurrentLiter(vehicleId);
if(estimate&&estimate.ok&&!estimate.estimationLimited&&typeof FuelGaugeEngine!=='undefined'){
const bar=FuelGaugeEngine.calculateFuelBar(vehicleId,estimate.liter);
if(bar&&bar.ok)veh.fuelState.currentFuelBar=bar.bar;
}
}
return{ok:true,baseline:veh.fuelState};
}catch(err){return{ok:false,reason:err&&err.message?err.message:'Rekonsiliasi fuel bar gagal'};}
}
// Wrapper kompatibilitas pemanggil lama; semua jalur diarahkan ke rekonsiliasi.
function syncFuelStateFromEstimator(vehicleId){return reconcileFuelStateFromLogs(vehicleId);}
function syncFuelStateFromFullTankBbm(vehicleId,km,tanggal){return reconcileFuelStateFromLogs(vehicleId);}
function applyTxBbmFromTx(txId,amt,date,accId,note,existingTx){
const chk=document.getElementById('txSyncBbm');
if(!chk||!chk.checked)return;
const panel=document.getElementById('txBbmPanel');
if(!panel||panel.style.display==='none')return;
const km=parseFloat(document.getElementById('txBbmKm').value);
const liter=parseFloat(document.getElementById('txBbmLiter').value);
const harga=parseFloat(document.getElementById('txBbmHargaL').value);
if(!km||!liter){toast('⚠️ Isi KM & Liter BBM dulu, atau hilangkan centang sinkron BBM');return;}
const spbu=document.getElementById('txBbmSpbu').value.trim();
const fullTank=document.getElementById('txBbmFull').checked;
const vehSel=document.getElementById('txBbmVehicle');
const vehicleId=vehSel&&vehSel.value?vehSel.value:((typeof VehicleScopedSOT!=='undefined'&&VehicleScopedSOT.ensureActive)?((VehicleScopedSOT.ensureActive()||{}).id||''):(typeof curVehicleId!=='undefined'&&curVehicleId)||'');
const jenisEl=document.getElementById('txBbmJenis');
const jenis=jenisEl?jenisEl.value:undefined;
const validation=validateFuelLogInput({vehicleId,date,km,liter,existingBbmId:(existingTx&&existingTx.bbmLinkId)?existingTx.bbmLinkId:null});
if(!validation.ok){toast('⚠️ '+validation.reason);return false;}
const result=recordBbmLog({
vehicleId,date,km,liter,harga,cost:amt,spbu,fullTank,note,accountId:accId,jenis,
txId,existingBbmId:(existingTx&&existingTx.bbmLinkId)?existingTx.bbmLinkId:null
});
if(!result||result.ok===false){toast('⚠️ '+((result&&result.reason)||'Catatan BBM tidak valid'));return false;}
if(!existingTx||!existingTx.bbmLinkId){
const tx=existingTx||D.transactions.find(t=>t.id===txId);
if(tx)tx.bbmLinkId=result.bbmId;
}
toast('⛽ Catatan BBM tersinkron ke Catatan Mobil');
}
