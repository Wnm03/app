// cicilan.js — logika form Cicilan pada txModal (Tambah/Edit Transaksi Keuangan).
// Dipindah ke modules/finance/cicilan.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Dipisah dari transaksi.js (2026-07-11, lihat CLAUDE.md catatan kerja "split
// transaksi.js") murni sebagai pengelompokan ulang file, BUKAN perubahan
// perilaku. Semua fungsi di sini tetap global (bukan module/namespace, sama
// seperti sebelumnya di transaksi.js) karena dipanggil langsung dari HTML lewat
// atribut `data-action`/`onchange`/`oninput` di modals.js (mis. txCicilanNama
// pakai oninput="syncCicilanPreview()"), dan juga dipanggil dari transaksi.js
// sendiri (setPayMethod, openTxModal, editTx, _saveTxInner). Variabel state
// cicilanLastInput/cicilanSharedLastInput/cicilanDateLinked tetap dideklarasikan
// di features-helpers-global-security.js (dimuat sebelum file ini di build.js),
// TIDAK dipindah, supaya file lain yang sudah menulis ke variabel itu
// (transaksi.js, worthit.js) tidak perlu diubah.
function validateCicilanFields(){
const totalEl=document.getElementById('txCicilanTotal');
const tenorEl=document.getElementById('txCicilanTenor');
const bungaEl=document.getElementById('txCicilanBunga');
const total=parseFloat(totalEl.value);
const tenor=parseInt(tenorEl.value);
const bungaRaw=bungaEl.value.trim();
const bunga=bungaRaw===''?0:parseFloat(bungaRaw);
if(!totalEl.value.trim()||isNaN(total)||total<=0){toast('⚠️ Total harga cicilan harus lebih dari 0');totalEl.focus();return false;}
if(isNaN(tenor)||tenor<=0){toast('⚠️ Tenor cicilan tidak valid');return false;}
if(isNaN(bunga)||bunga<0){toast('⚠️ Bunga/biaya cicilan tidak boleh negatif');bungaEl.focus();return false;}
return true;
}
// Logika hitung murni (tanpa sentuh DOM) -- dipakai oleh syncCicilanPreview() di bawah
// DAN oleh self-test (lihat features-sheets-pwa-selftest.js), supaya self-test cukup panggil fungsi
// ini langsung tanpa perlu buka txModal asli / mengganggu form yang sedang diisi user.
function calcCicilanPerBulanFromTotal(hargaPokok,tenor,bungaPct){
const totalBayar=hargaPokok*(1+bungaPct/100);
return{perBulan:Math.ceil(totalBayar/tenor),totalBayar};
}
function calcCicilanTotalFromPerBulan(perBulan,tenor,bungaPct){
const totalBayar=perBulan*tenor;
return{hargaPokok:Math.round(totalBayar/(1+bungaPct/100)),totalBayar};
}
function syncCicilanPreview(src){
if(src==='total'||src==='perbulan') cicilanLastInput=src;
if(src==='sharedPct'||src==='sharedNominal') cicilanSharedLastInput=src==='sharedPct'?'pct':'nominal';
const totalEl=document.getElementById('txCicilanTotal');
const perBulanEl=document.getElementById('txCicilanPerBulan');
const tenor=parseInt(document.getElementById('txCicilanTenor').value)||6;
const bunga=parseFloat(document.getElementById('txCicilanBunga').value)||0;
const prev=document.getElementById('txCicilanPreview');
let totalBayar, perBulan, hargaPokok;
if(cicilanLastInput==='perbulan'){
perBulan=parseFloat(perBulanEl.value)||0;
if(!perBulan||perBulan<=0){prev.style.display='none';document.getElementById('txAmt').value='';totalEl.value='';return;}
({hargaPokok,totalBayar}=calcCicilanTotalFromPerBulan(perBulan,tenor,bunga));
totalEl.value=hargaPokok;
} else {
hargaPokok=parseFloat(totalEl.value)||0;
if(!hargaPokok||hargaPokok<=0){prev.style.display='none';document.getElementById('txAmt').value='';perBulanEl.value='';return;}
({perBulan,totalBayar}=calcCicilanPerBulanFromTotal(hargaPokok,tenor,bunga));
perBulanEl.value=perBulan;
}
const sisaTenor=tenor-1;
document.getElementById('prevPerBulan').textContent=fmtFull(perBulan);
document.getElementById('prevTotal').textContent=fmtFull(totalBayar);
document.getElementById('prevSisa').textContent=sisaTenor>0?`${sisaTenor}x lagi (${fmtFull(perBulan*sisaTenor)})`: 'Lunas setelah ini';
prev.style.display='block';
const mineWrap=document.getElementById('prevMineRow');
const sharedPrevEl=document.getElementById('txCicilanSharedPreview');
const sh=getCicilanSharedMine(perBulan);
let perBulanMine=perBulan;
if(sh.shared){
perBulanMine=sh.mine;
if(cicilanSharedLastInput==='nominal'){document.getElementById('txCicilanSharedPct').value=sh.pct;}
else{document.getElementById('txCicilanSharedNominal').value=sh.mine;}
document.getElementById('prevPerBulanMine').textContent=fmtFull(perBulanMine);
mineWrap.style.display='block';
if(sharedPrevEl)sharedPrevEl.textContent=`👫 Porsi kamu: ${fmt(perBulanMine)}/bulan (${sh.pct}%) dari total ${fmt(perBulan)}/bulan (sisanya ${fmt(perBulan-perBulanMine)} ditanggung pihak lain)`;
} else {
mineWrap.style.display='none';
if(sharedPrevEl)sharedPrevEl.textContent='';
}
document.getElementById('txAmt').value=perBulanMine;
}
function getCicilanSharedMine(perBulanFull){
const chk=document.getElementById('txCicilanShared');
const shared=chk&&chk.checked;
if(!shared)return{shared:false,pct:null,mine:perBulanFull};
let pct,mine;
if(cicilanSharedLastInput==='nominal'){
mine=parseFloat(document.getElementById('txCicilanSharedNominal').value)||0;
mine=Math.min(Math.max(mine,0),perBulanFull);
pct=perBulanFull>0?Math.min(99,Math.max(1,Math.round((mine/perBulanFull*100)*10)/10)):50;
} else {
pct=Math.min(99,Math.max(1,parseFloat(document.getElementById('txCicilanSharedPct').value)||50));
mine=Math.round(perBulanFull*pct/100);
}
return{shared:true,pct,mine};
}
function toggleCicilanSharedFields(){
const shared=document.getElementById('txCicilanShared').checked;
document.getElementById('txCicilanSharedWrap').style.display=shared?'block':'none';
if(shared) cicilanSharedLastInput='pct';
syncCicilanPreview();
}
function syncCicilanDate(src){
if(curPayMethod!=='cicilan'||cicilanDateLinked)return;
const dateEl=document.getElementById('txDate');
const dueEl=document.getElementById('txCicilanDue');
if(!dateEl.value&&!dueEl.value)return;
if(src==='date') dueEl.value=dateEl.value;
else dateEl.value=dueEl.value;
}
function openCicilanHistoryFromTx(){
if(!txEditLinkedBillId)return;
closeModal('txModal');
openBillHistory(txEditLinkedBillId);
}
