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
if(chk.checked)populateTxBbmVehicleSelect();
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
return{bbmId:b.id,isNew:false,harga};
}
}
const bbmId=uid();
D.bbmLogs.push({id:bbmId,vehicleId:opts.vehicleId,date:opts.date,km:opts.km,liter:opts.liter,harga,cost:opts.cost,spbu:opts.spbu,fullTank:opts.fullTank,note:opts.note,accountId:opts.accountId,txLinkId:opts.txId});
return{bbmId,isNew:true,harga};
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
