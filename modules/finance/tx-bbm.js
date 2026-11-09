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
// Kapasitas dapat berasal dari profil tangki khusus atau field kendaraan lama.
// Profil khusus menang bila terisi; field legacy menjadi fallback agar validasi
// tidak melewatkan kendaraan yang diatur lewat formulir kendaraan umum.
if(o.vehicleId){
 const vehicle=(typeof D!=='undefined'&&Array.isArray(D.vehicles)?D.vehicles:[]).find(v=>String(v.id)===String(o.vehicleId));
 const profile=typeof FuelTankProfile!=='undefined'&&FuelTankProfile&&typeof FuelTankProfile.get==='function'?FuelTankProfile.get(o.vehicleId):null;
 const profileCapacity=profile&&Number(profile.tankCapacityLiter)>0?Number(profile.tankCapacityLiter):null;
 const legacyCapacity=vehicle&&Number(vehicle.fuelTankCapacityLiter)>0?Number(vehicle.fuelTankCapacityLiter):null;
 if(profileCapacity&&legacyCapacity&&Math.abs(profileCapacity-legacyCapacity)/Math.max(profileCapacity,legacyCapacity)>0.10)return{ok:false,reason:'Kapasitas tangki pada profil ('+profileCapacity+' L) berbeda dari data kendaraan ('+legacyCapacity+' L). Samakan profil sebelum mencatat BBM.'};
 const capacity=profileCapacity||legacyCapacity;
 if(capacity&&liter>capacity*1.1)return{ok:false,reason:'Isi BBM '+liter.toLocaleString('id-ID')+' L melebihi kapasitas tangki '+capacity.toLocaleString('id-ID')+' L (toleransi 10%). Periksa liter atau profil kendaraan.'};
}
if(o.date&&/^\d{4}-\d{2}-\d{2}$/.test(String(o.date))&&o.vehicleId){
 const sourceRows=typeof D!=='undefined'?[...(Array.isArray(D.kmLogs)?D.kmLogs:[]),...(Array.isArray(D.bbmLogs)?D.bbmLogs:[]),...(Array.isArray(D.servisLogs)?D.servisLogs:[])]:[];
 const logs=sourceRows.filter(x=>x&&String(x.vehicleId)===String(o.vehicleId)&&(!o.existingBbmId||String(x.id)!==String(o.existingBbmId))&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||''))&&Number.isFinite(Number(x.km))&&Number(x.km)>=0);
 // Tanpa timestamp, semua pembacaan pada tanggal sama diperlakukan sebagai
 // batas KM terakhir hari itu; tidak boleh memasukkan nilai yang lebih rendah.
 const prior=logs.filter(x=>String(x.date)<=String(o.date)).sort((a,b)=>String(b.date).localeCompare(String(a.date))||Number(b.km)-Number(a.km))[0];
 const next=logs.filter(x=>String(x.date)>String(o.date)).sort((a,b)=>String(a.date).localeCompare(String(b.date))||Number(a.km)-Number(b.km))[0];
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
// Tx ID adalah kunci idempotensi lintas retry. Jika UI/penyimpanan mengulang
// proses sebelum bbmLinkId sempat ditulis, jangan buat log BBM kedua.
if(!opts.existingBbmId&&opts.txId){
 const linked=D.bbmLogs.filter(x=>x&&String(x.txLinkId||'')===String(opts.txId));
 if(linked.length>1)return{ok:false,reason:'Transaksi ini memiliki lebih dari satu log BBM tertaut; periksa duplikasi sebelum menyimpan ulang'};
 if(linked.length===1)opts={...opts,existingBbmId:linked[0].id};
}
if(opts.existingBbmId){
const b=D.bbmLogs.find(x=>x.id===opts.existingBbmId);
if(b){
const previousFullTank=!!b.fullTank;
const previousVehicleId=b.vehicleId;
// Segmen full-to-full dapat berubah saat log diedit; jangan terus memakai
// kalibrasi yang dibangun dari sampel lama. Data historis tidak diubah.
if(typeof FuelAdaptiveCalibration!=='undefined'&&FuelAdaptiveCalibration&&typeof FuelAdaptiveCalibration.invalidate==='function')FuelAdaptiveCalibration.invalidate(previousVehicleId,'bbm-log-edited');
Object.assign(b,{date:opts.date,km:opts.km,liter:opts.liter,harga,cost:opts.cost,spbu:opts.spbu,fullTank:opts.fullTank,note:opts.note,accountId:opts.accountId,vehicleId:opts.vehicleId||b.vehicleId});
if(previousVehicleId&&opts.vehicleId&&String(previousVehicleId)!==String(opts.vehicleId)&&typeof FuelAdaptiveCalibration!=='undefined'&&FuelAdaptiveCalibration&&typeof FuelAdaptiveCalibration.invalidate==='function')FuelAdaptiveCalibration.invalidate(opts.vehicleId,'bbm-log-moved-in');
// TASK-jenis-BBM: simpan jenis kalau caller kirim -- JANGAN timpa dgn
// null/undefined kalau caller tidak kirim (mis. panggilan lama/lain yg
// belum tahu soal field ini), supaya jenis yg sudah tersimpan tidak hilang.
if(opts.jenis!==undefined&&opts.jenis!==null&&opts.jenis!=='')b.jenis=opts.jenis;
if(opts.fullTank){
 syncFuelStateFromFullTankBbm(opts.vehicleId||b.vehicleId,b);
 if(typeof FuelAdaptiveCalibration!=='undefined'&&FuelAdaptiveCalibration&&typeof FuelAdaptiveCalibration.invalidate==='function')FuelAdaptiveCalibration.invalidate(opts.vehicleId||b.vehicleId,'bbm-log-edited');
}else{
 // Log parsial TIDAK menulis fuelState: baseline dibangun ulang dari koreksi manual/full-tank
 // yang tersisa, sedangkan estimator memproyeksikan parsial langsung dari log (S2434 B2-B4).
 reconcileFuelStateFromLogs(opts.vehicleId||b.vehicleId);
}
// Perpindahan kendaraan pada edit BBM memerlukan rekonsiliasi kendaraan asal.
if(previousVehicleId&&opts.vehicleId&&String(previousVehicleId)!==String(opts.vehicleId))reconcileFuelStateFromLogs(previousVehicleId);
return{ok:true,bbmId:b.id,isNew:false,harga};
}
}
const bbmId=uid();
D.bbmLogs.push({id:bbmId,vehicleId:opts.vehicleId,date:opts.date,km:opts.km,liter:opts.liter,harga,cost:opts.cost,spbu:opts.spbu,fullTank:opts.fullTank,note:opts.note,accountId:opts.accountId,jenis:opts.jenis||undefined,txLinkId:opts.txId});
if(opts.fullTank){
 const savedLog=D.bbmLogs[D.bbmLogs.length-1];
 syncFuelStateFromFullTankBbm(opts.vehicleId,savedLog);
 if(typeof FuelAdaptiveCalibration!=='undefined'&&FuelAdaptiveCalibration&&typeof FuelAdaptiveCalibration.calibrate==='function')FuelAdaptiveCalibration.calibrate(opts.vehicleId,savedLog);
}else reconcileFuelStateFromLogs(opts.vehicleId);
return{ok:true,bbmId,isNew:true,harga};
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
// Rekonstruksi baseline ketika log BBM yang membentuk fuelState diubah/dihapus.
// Tidak mengubah riwayat BBM; hanya membangun ulang state turunan dari sumber
// tersisa. Koreksi manual yang lebih baru tetap diprioritaskan.
function _fuelSnapshotLegacyManual(veh){
// Koreksi manual lama hanya hidup di fuelState; salin additive ke manualFuelCorrection supaya
// tidak hilang saat baseline full-tank mengambil alih (S2434 B4).
if(veh&&veh.fuelState&&veh.fuelState.estimatedSource==='manual-bar-correction'&&!veh.manualFuelCorrection)veh.manualFuelCorrection={...veh.fuelState};
}
function _fuelAppliedIdsAtBaseline(vehicleId,referenceKm,anchorLog){
// ID log milik kendaraan yang sudah tercakup baseline full-tank: KM < acuan, atau KM sama dan
// tercatat pada/sebelum log acuan (tanggal lebih awal, atau urutan simpan lebih awal pada tanggal sama).
const logs=Array.isArray(D.bbmLogs)?D.bbmLogs:[];
const anchorIdx=anchorLog?logs.indexOf(anchorLog):-1;
const anchorDate=anchorLog&&anchorLog.date?String(anchorLog.date).slice(0,10):'';
const ids=[];
logs.forEach((x,i)=>{
if(!x||String(x.vehicleId)!==String(vehicleId)||x.id===undefined||x.id===null)return;
const km=Number(x.km);
if(!Number.isFinite(km)||!Number.isFinite(Number(referenceKm)))return;
if(km<referenceKm||(km===referenceKm&&(x===anchorLog||String(x.date||'').slice(0,10)<anchorDate||(String(x.date||'').slice(0,10)===anchorDate&&i<=anchorIdx))))ids.push(x.id);
});
return ids;
}
function reconcileFuelStateFromLogs(vehicleId){
if(!vehicleId||typeof D==='undefined'||!Array.isArray(D.vehicles))return{ok:false,reason:'vehicle-missing'};
const veh=D.vehicles.find(v=>String(v.id)===String(vehicleId));
if(!veh)return{ok:false,reason:'vehicle-missing'};
const state=veh.fuelState||null;
// Segmen konsumsi bisa berubah setelah delete/edit; invalidasi parameter turunan
// supaya estimator kembali ke historis sampai ada sampel full-to-full baru.
if(veh.fuelEfficiencyCalibration)delete veh.fuelEfficiencyCalibration;
// Baseline dihitung ulang dari log KANONIS (duplikat/isi melebihi kapasitas dikarantina; data asli tak diubah).
const fullLogs=(typeof getFuelCanonicalLogs==='function'?getFuelCanonicalLogs(vehicleId).canonical:(Array.isArray(D.bbmLogs)?D.bbmLogs:[])).filter(b=>b&&String(b.vehicleId)===String(vehicleId)&&b.fullTank&&/^\d{4}-\d{2}-\d{2}$/.test(String(b.date||''))&&Number.isFinite(Number(b.km))&&Number(b.km)>=0).sort((a,b)=>String(a.date).localeCompare(String(b.date))||Number(a.km)-Number(b.km));
const latestFull=fullLogs.length?fullLogs[fullLogs.length-1]:null;
const manualHistory=typeof FuelStateHistory!=='undefined'&&typeof FuelStateHistory.list==='function'
 ? FuelStateHistory.list(vehicleId).filter(h=>h&&h.estimatedSource==='manual-bar-correction'&&Number.isFinite(Number(h.currentFuelLiter))) : [];
const currentManual=state&&state.estimatedSource==='manual-bar-correction'?{vehicleId,currentFuelBar:state.currentFuelBar,currentFuelLiter:state.currentFuelLiter,estimatedSource:state.estimatedSource,confidenceScore:state.confidenceScore,referenceKm:state.referenceKm,recordedAt:state.correctedAt}:null;
_fuelSnapshotLegacyManual(veh);
const savedManual=veh.manualFuelCorrection&&Number.isFinite(Number(veh.manualFuelCorrection.currentFuelLiter))?{vehicleId,currentFuelBar:veh.manualFuelCorrection.currentFuelBar,currentFuelLiter:veh.manualFuelCorrection.currentFuelLiter,estimatedSource:'manual-bar-correction',confidenceScore:veh.manualFuelCorrection.confidenceScore,referenceKm:veh.manualFuelCorrection.referenceKm,appliedBbmIds:veh.manualFuelCorrection.appliedBbmIds,recordedAt:veh.manualFuelCorrection.correctedAt}:null;
const manualCandidates=manualHistory.concat(savedManual?[savedManual]:[]).concat(currentManual?[currentManual]:[]).sort((a,b)=>String(a.recordedAt||'').localeCompare(String(b.recordedAt||'')));
const latestManual=manualCandidates.length?manualCandidates[manualCandidates.length-1]:null;
const fullDate=latestFull?String(latestFull.date):'';
const manualDate=latestManual?String(latestManual.recordedAt||'').slice(0,10):'';
// Full tank pada hari yang sama tetap ground-truth; koreksi manual hanya
// menang bila benar-benar lebih baru dari tanggal full tank yang tersisa.
if(latestManual&&(!latestFull||manualDate>fullDate)){
 if(currentManual&&String(currentManual.recordedAt||'')===String(latestManual.recordedAt||''))return{ok:true,preserved:'manual'};
 veh.fuelState={currentFuelBar:latestManual.currentFuelBar,currentFuelLiter:latestManual.currentFuelLiter,correctedAt:latestManual.recordedAt||new Date().toISOString(),estimatedSource:'manual-bar-correction',confidenceScore:latestManual.confidenceScore,referenceKm:latestManual.referenceKm,...(Array.isArray(latestManual.appliedBbmIds)?{appliedBbmIds:latestManual.appliedBbmIds.slice()}:{})};
 return{ok:true,restored:'manual-history'};
}
if(latestFull){
 const profile=typeof FuelTankProfile!=='undefined'&&typeof FuelTankProfile.get==='function'?FuelTankProfile.get(vehicleId):null;
 if(!profile||!Number.isFinite(Number(profile.tankCapacityLiter))||Number(profile.tankCapacityLiter)<=0){delete veh.fuelState;return{ok:true,cleared:true,reason:'tank-profile-unavailable'};}
 syncFuelStateFromFullTankBbm(vehicleId,latestFull,true);
 return{ok:true,restored:'full-tank',bbmId:latestFull.id};
}
// fuelState 'auto-bbm-log' lama (parsial yang dulu dibekukan) tidak punya sumber pembanding; biarkan.
if(state&&state.estimatedSource==='auto-bbm-log')return{ok:true,preserved:'legacy-auto'};
// Tidak ada lagi sumber baseline yang dapat dipertanggungjawabkan.
// Hapus state turunan lama agar UI tidak menyajikan fuel bar palsu.
delete veh.fuelState;
return{ok:true,cleared:true};
}
// Alias kompatibilitas nama lama (S2746); satu-satunya implementasi adalah reconcileFuelStateFromLogs().
function reconcileFuelStateAfterBbmMutation(vehicleId){return reconcileFuelStateFromLogs(vehicleId);}

// Wrapper kompatibilitas (S2434): parsial tidak lagi membekukan hasil estimasi ke fuelState.
function syncFuelStateFromEstimator(vehicleId){return reconcileFuelStateFromLogs(vehicleId);}
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
function syncFuelStateFromFullTankBbm(vehicleId,bbmLog,forceRebuild){
if(typeof FuelTankProfile==='undefined'||typeof FuelGaugeEngine==='undefined')return;
if(typeof D==='undefined'||!D.vehicles)return;
const veh=D.vehicles.find(v=>v.id===vehicleId);
if(!veh)return;
const profile=FuelTankProfile.get(vehicleId);
const capacity=profile&&Number(profile.tankCapacityLiter)>0?Number(profile.tankCapacityLiter):(Number(veh.fuelTankCapacityLiter)>0?Number(veh.fuelTankCapacityLiter):null);
if(!capacity)return;
// Tanggal log adalah waktu kejadian, bukan waktu edit/simpan. Full tank
// pada tanggal yang sama menang atas koreksi manual (tie-break eksplisit),
// tetapi log lama tidak boleh menimpa koreksi yang lebih baru.
const logDate=bbmLog&&bbmLog.date?String(bbmLog.date).slice(0,10):new Date().toISOString().slice(0,10);
const existingDate=veh.fuelState&&veh.fuelState.correctedAt?String(veh.fuelState.correctedAt).slice(0,10):'';
if(!forceRebuild&&existingDate&&existingDate>logDate)return;
_fuelSnapshotLegacyManual(veh);
const liter=capacity;
const barRes=FuelGaugeEngine.calculateFuelBar(vehicleId,liter);
veh.fuelState={
currentFuelBar:barRes.ok?barRes.bar:(profile&&profile.fuelBarCount||8),
currentFuelLiter:liter,
correctedAt:logDate+'T23:59:59',
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
referenceKm:(bbmLog&&typeof bbmLog.km==='number'&&isFinite(bbmLog.km))?bbmLog.km:((typeof getVehicleKm==='function')?getVehicleKm(vehicleId):null),
};
if(Number.isFinite(Number(veh.fuelState.referenceKm)))veh.fuelState.appliedBbmIds=_fuelAppliedIdsAtBaseline(vehicleId,Number(veh.fuelState.referenceKm),bbmLog);
// Histori estimasi (opsional, lanjutan rencana Fuel Estimation Auto-
// Update): simpan snapshot fuelState yang barusan ditulis di atas.
// Guard typeof (sama prinsipnya dgn guard FuelTankProfile/FuelGaugeEngine
// di atas) -- diam kalau modul belum dimuat, TIDAK PERNAH menggagalkan
// recordBbmLog() gara-gara histori opsional ini.
if(typeof FuelStateHistory!=='undefined')FuelStateHistory.record(vehicleId,veh.fuelState);
}
async function applyTxBbmFromTx(txId,amt,date,accId,note,existingTx){
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
if(!validation.ok)throw new Error('TX_BBM_ODOMETER_INVALID:'+validation.reason);
if(typeof confirmVehicleOdometerAdvance==='function'){const odo=await confirmVehicleOdometerAdvance({vehicleId,km,date,excludeId:(existingTx&&existingTx.bbmLinkId)?existingTx.bbmLinkId:null,source:'transaksi BBM'});if(!odo.ok){if(odo.cancelled)return false;throw new Error('TX_BBM_ODOMETER_INVALID:'+(odo.reason||'KM tidak valid'));}}
const result=recordBbmLog({
vehicleId,date,km,liter,harga,cost:amt,spbu,fullTank,note,accountId:accId,jenis,
txId,existingBbmId:(existingTx&&existingTx.bbmLinkId)?existingTx.bbmLinkId:null
});
if(!result||result.ok===false)throw new Error('TX_BBM_ODOMETER_INVALID:'+((result&&result.reason)||'Catatan BBM tidak valid'));
if(!existingTx||!existingTx.bbmLinkId){
const tx=existingTx||D.transactions.find(t=>t.id===txId);
if(tx)tx.bbmLinkId=result.bbmId;
}
toast('⛽ Catatan BBM tersinkron ke Catatan Mobil');
}
