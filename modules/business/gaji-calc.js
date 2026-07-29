// gaji-calc.js — Kalkulator gaji harian/borongan (Tukang & karyawan lepas), catat sbg pemasukan
// Dipindah ke modules/business/gaji-calc.js (Sesi 15 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: data-default.js, features-helpers-global-security.js, diagnostik-versi.js, format-tema.js, error-handler.js, helper-teks.js, keamanan-pin.js, modal-navigasi.js, reset-gaji-mingguan.js, debug-console.js, pengaturan-search.js, onboarding.js, kalkulator-input.js, scan-ocr.js, filter-laporan.js, akun.js, gaji-calc.js, transaksi.js, profil-pengaturan.js, kategori.js, tagihan-kalender.js, backup-restore.js, payroll-absensi.js, tukang-absensi.js

let _gcLastTotal=0;
function openGajiCalc(){
const gajiHariDefault=D.profile.gajiPokok||0;
document.getElementById('gcUpahJam').value=gajiHariDefault>0?Math.round(gajiHariDefault/7):'';
document.getElementById('gcJamKerja').value=7;
document.getElementById('gcLemburJam').value='';
document.getElementById('gcLemburRate').value='';
document.getElementById('gcBonus').value='';
document.getElementById('gcPotongan').value='';
openModal('gajiCalcModal');
calcGaji();
}
function calcGaji(){
const upahJam=parseFloat(document.getElementById('gcUpahJam').value)||0;
const jamKerja=parseFloat(document.getElementById('gcJamKerja').value)||0;
const lemburJam=parseFloat(document.getElementById('gcLemburJam').value)||0;
const lemburRate=parseFloat(document.getElementById('gcLemburRate').value)||0;
const bonus=parseFloat(document.getElementById('gcBonus').value)||0;
const potongan=parseFloat(document.getElementById('gcPotongan').value)||0;
const gajiPokokTotal=upahJam*jamKerja;
const lemburTotal=lemburJam*lemburRate;
const total=Math.max(0,gajiPokokTotal+lemburTotal+bonus-potongan);
_gcLastTotal=total;
document.getElementById('gcTotal').textContent=fmtFull(total);
document.getElementById('gcBreakdown').textContent=`Pokok (${jamKerja} jam × ${fmtFull(upahJam)}) ${fmtFull(gajiPokokTotal)} + Lembur (${lemburJam} jam × ${fmtFull(lemburRate)}) ${fmtFull(lemburTotal)} + Bonus ${fmtFull(bonus)} − Potongan ${fmtFull(potongan)}`;
document.getElementById('gcSaveBtn').disabled=total<=0;
}
function saveGajiAsIncome(){
if(_gcLastTotal<=0)return;
const amount=_gcLastTotal;
closeModal('gajiCalcModal');
openTxModal('income');
setTimeout(()=>{
document.getElementById('txAmt').value=amount;
const gajiCat=D.categories.income.find(c=>/gaji/i.test(c.name));
if(gajiCat){
document.getElementById('txCat').value=gajiCat.name;
updateSubCatOptions();
// Auto-pilih subkategori yang paling cocok (mis. "Gaji Toko"), sama pola
// dgn confirmWeeklyReset() di reset-gaji-mingguan.js — dulu txSubCat
// selalu dibiarkan kosong walau kategori ini sudah punya subs yang cocok.
if(Array.isArray(gajiCat.subs)&&gajiCat.subs.length){
const subMatch=gajiCat.subs.find(s=>/toko/i.test(s.name))||gajiCat.subs.find(s=>/gaji/i.test(s.name))||gajiCat.subs[0];
if(subMatch) document.getElementById('txSubCat').value=subMatch.name;
}
}
document.getElementById('txNote').value='Hasil kalkulator gaji';
},60);
}
function openAbsensiModal(){return Payroll.openAbsensiModal();}
function changeAbsensiWeek(dir){return Payroll.changeAbsensiWeek(dir);}
