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
function populateTxBbmVehicleSelect(){
const sel=document.getElementById('txBbmVehicle');
if(!sel||!D.vehicles)return;
const cur=sel.value;
sel.innerHTML=D.vehicles.map(v=>`<option value="${v.id}">${v.emoji} ${escapeHtml(v.name)}</option>`).join('');
const fallback=(typeof curVehicleId!=='undefined'&&D.vehicles.find(v=>v.id===curVehicleId))?curVehicleId:(D.vehicles[0]&&D.vehicles[0].id);
sel.value=cur&&D.vehicles.find(v=>v.id===cur)?cur:fallback;
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
function onTxBbmVehicleChange(){
const sel=document.getElementById('txBbmVehicle');
const kmEl=document.getElementById('txBbmKm');
if(!sel||!kmEl)return;
if(typeof getVehicleKm==='function'){
kmEl.value=getVehicleKm(sel.value)||'';
}
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
// Fungsi murni (tidak baca/tulis DOM) -- dipakai baik dari applyTxBbmFromTx di
// bawah (sinkron dari form Transaksi umum) maupun dari BBM._saveInner (modal
// "Catat Isi BBM" khusus Car Notes, di file lain).
function recordBbmLog(opts){
let harga=opts.harga;
if(!harga&&opts.liter)harga=Math.round(opts.cost/opts.liter);
if(!D.bbmLogs)D.bbmLogs=[];
if(opts.existingBbmId){
const b=D.bbmLogs.find(x=>x.id===opts.existingBbmId);
if(b){
Object.assign(b,{date:opts.date,km:opts.km,liter:opts.liter,harga,cost:opts.cost,spbu:opts.spbu,fullTank:opts.fullTank,note:opts.note,accountId:opts.accountId,vehicleId:opts.vehicleId||b.vehicleId});
if(opts.fullTank)syncFuelStateFromFullTankBbm(opts.vehicleId||b.vehicleId);else syncFuelStateFromEstimator(opts.vehicleId||b.vehicleId);
return{bbmId:b.id,isNew:false,harga};
}
}
const bbmId=uid();
D.bbmLogs.push({id:bbmId,vehicleId:opts.vehicleId,date:opts.date,km:opts.km,liter:opts.liter,harga,cost:opts.cost,spbu:opts.spbu,fullTank:opts.fullTank,note:opts.note,accountId:opts.accountId,txLinkId:opts.txId});
if(opts.fullTank)syncFuelStateFromFullTankBbm(opts.vehicleId);else syncFuelStateFromEstimator(opts.vehicleId);
return{bbmId,isNew:true,harga};
}
// syncFuelStateFromEstimator(vehicleId) — SESI 415b (FUEL-AUTOSYNC-05, Sesi 2
// asli rencana "Fuel Estimation Auto-Update"): SSOT write hook di
// recordBbmLog() -- dipanggil utk log BBM PARSIAL (opts.fullTank=false), yang
// SEBELUM sesi ini TIDAK PERNAH menulis fuelState sama sekali (cuma full tank
// yg ditangani syncFuelStateFromFullTankBbm(), s412). 100% REUSE
// FuelStateEstimator.estimateCurrentLiter() (s415, GROUP_A) -- 0 rumus
// akumulasi/konsumsi baru ditulis di sini, cuma nulis hasilnya ke fuelState.
// PENTING: hasil tulis ini JADI titik acuan baru (referenceKm=km SAAT ini) --
// artinya partial fill yg baru saja disimpan (& partial fill lama yg belum
// "dibaku"kan) langsung "dibekukan" ke baseline baru, supaya estimator TIDAK
// menghitung dobel akumulasi yang sama di panggilan berikutnya.
// confidenceScore 70 (di bawah full-tank/90 & manual/100) -- estimasi dari
// akumulasi partial fill + formula konsumsi km/L rata-rata historis, jadi
// generasi tidak langsung dgn margin error lebih besar drpd ground truth.
// Guard typeof FuelStateEstimator/D (pola sama syncFuelStateFromFullTankBbm):
// diam kalau modul belum dimuat -- TIDAK PERNAH menggagalkan recordBbmLog()
// gara-gara sync opsional ini. Diam juga kalau estimateCurrentLiter() gagal
// (mis. belum ada titik acuan sama sekali -- user belum pernah koreksi
// manual/full-tank fill) atau currentKm tidak diketahui (referenceKm baru
// tidak bisa ditentukan dgn valid).
function syncFuelStateFromEstimator(vehicleId){
if(typeof FuelStateEstimator==='undefined')return;
if(typeof D==='undefined'||!D.vehicles)return;
const veh=D.vehicles.find(v=>v.id===vehicleId);
if(!veh)return;
const est=FuelStateEstimator.estimateCurrentLiter(vehicleId);
if(!est.ok||typeof est.currentKm!=='number'||!isFinite(est.currentKm))return;
let bar=null;
if(typeof FuelGaugeEngine!=='undefined'){
const barRes=FuelGaugeEngine.calculateFuelBar(vehicleId,est.liter);
if(barRes.ok)bar=barRes.bar;
}
veh.fuelState={
currentFuelBar:bar,
currentFuelLiter:est.liter,
correctedAt:new Date().toISOString(),
estimatedSource:'auto-bbm-log',
confidenceScore:70,
referenceKm:est.currentKm,
};
if(typeof FuelStateHistory!=='undefined')FuelStateHistory.record(vehicleId,veh.fuelState);
}
// syncFuelStateFromFullTankBbm(vehicleId) — SESI FUEL-AUTOSYNC-01 (scoped,
// bagian dari rencana "Fuel Estimation Auto-Update"): kalau BBM log yang
// barusan disimpan/diedit itu FULL TANK, tulis PERMANEN
// D.vehicles[i].fuelState.currentFuelLiter = tankCapacityLiter (ground
// truth -- full tank = 100%, asumsi yang SAMA PERSIS yang sudah dipakai
// FuelBarCorrection._currentEstimate() fallback #2 di fuel-intelligence-
// ui.js, TAPI sebelumnya cuma dibaca on-the-fly saat FuelCard render, TIDAK
// PERNAH benar-benar ditulis ke fuelState). Ini menutup gap: sebelum sesi
// ini, FuelPredictionEngine/FuelInsightEngine.getReserveStatus() baca
// fuelState.currentFuelLiter LANGSUNG (0 fallback ke log BBM) -- field itu
// CUMA ditulis oleh FuelBarCorrection.save() (tombol "⚙️ Koreksi" manual),
// jadi prediksi jarak/status cadangan selalu "Data BBM saat ini belum ada
// (lakukan Koreksi BBM dulu)" walau user rajin catat full-tank fill.
// Sekarang ikut ditulis otomatis, confidence 90 (di bawah manual/100 --
// full tank itu ground truth objektif tapi tetap estimasi tidak langsung
// dibanding pembacaan speedometer fisik lewat "⚙️ Koreksi").
// SENGAJA TIDAK menangani isi BBM PARSIAL (opts.fullTank=false) -- itu
// butuh formula akumulasi/depletion berbasis km terpisah (rencana sesi
// lain, 1 task = 1 sesi) supaya tidak nulis angka yang salah. 100% REUSE
// FuelTankProfile.get()/FuelGaugeEngine.calculateFuelBar() (SUDAH ADA) --
// 0 rumus konversi baru ditulis di sini. Guard typeof FuelTankProfile/
// FuelGaugeEngine (pola sama semua konsumen fuel-* lain): kalau salah satu
// modul belum dimuat (mis. dipanggil dari test yang cuma load tx-bbm.js
// sendirian tanpa fuel-*.js), fungsi diam saja -- TIDAK PERNAH bikin
// recordBbmLog()/BBM._saveInner() gagal cuma gara-gara sync opsional ini.
function syncFuelStateFromFullTankBbm(vehicleId){
if(typeof FuelTankProfile==='undefined'||typeof FuelGaugeEngine==='undefined')return;
if(typeof D==='undefined'||!D.vehicles)return;
const veh=D.vehicles.find(v=>v.id===vehicleId);
if(!veh)return;
const profile=FuelTankProfile.get(vehicleId);
if(!profile||!profile.tankCapacityLiter)return;
const liter=profile.tankCapacityLiter;
const barRes=FuelGaugeEngine.calculateFuelBar(vehicleId,liter);
veh.fuelState={
currentFuelBar:barRes.ok?barRes.bar:profile.fuelBarCount,
currentFuelLiter:liter,
correctedAt:new Date().toISOString(),
estimatedSource:'auto-bbm-log-full',
confidenceScore:90,
// referenceKm -- FUEL-AUTOSYNC-04 (Sesi 1 asli rencana "Fuel Estimation
// Auto-Update"): km kendaraan SAAT titik acuan ini ditulis (log BBM full
// tank yg baru disimpan/diedit SUDAH masuk D.bbmLogs sebelum baris ini
// jalan -- lihat recordBbmLog() -- jadi getVehicleKm() ikut membaca km
// log itu), 100% REUSE getVehicleKm() global (vehicle-core.js, SUDAH
// ADA). Dibutuhkan FuelStateEstimator.estimateCurrentLiter() utk hitung
// km yg ditempuh sejak titik acuan. Guard typeof: null kalau
// getVehicleKm() belum dimuat -- estimator sudah menangani
// referenceKm:null, TIDAK PERNAH menggagalkan sync ini gara-gara itu.
referenceKm:(typeof getVehicleKm==='function')?getVehicleKm(vehicleId):null,
};
// Histori estimasi (opsional, lanjutan rencana Fuel Estimation Auto-
// Update): simpan snapshot fuelState yang barusan ditulis di atas.
// Guard typeof (sama prinsipnya dgn guard FuelTankProfile/FuelGaugeEngine
// di atas) -- diam kalau modul belum dimuat, TIDAK PERNAH menggagalkan
// recordBbmLog() gara-gara histori opsional ini.
if(typeof FuelStateHistory!=='undefined')FuelStateHistory.record(vehicleId,veh.fuelState);
}
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
const vehicleId=vehSel&&vehSel.value?vehSel.value:((typeof curVehicleId!=='undefined'&&curVehicleId)||(D.vehicles[0]&&D.vehicles[0].id));
const result=recordBbmLog({
vehicleId,date,km,liter,harga,cost:amt,spbu,fullTank,note,accountId:accId,
txId,existingBbmId:(existingTx&&existingTx.bbmLinkId)?existingTx.bbmLinkId:null
});
if(!existingTx||!existingTx.bbmLinkId){
const tx=existingTx||D.transactions.find(t=>t.id===txId);
if(tx)tx.bbmLinkId=result.bbmId;
}
toast('⛽ Catatan BBM tersinkron ke Catatan Mobil');
}
