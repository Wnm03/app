// profil-pengaturan.js — Profil pengguna di Pengaturan: auto-save profil, status
// Dipindah ke modules/shared/profil-pengaturan.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// PTKP (kawin/tanggungan/pekerjaan) utk estimasi PPh21, preview usia, hint API key AI
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: data-default.js, features-helpers-global-security.js, diagnostik-versi.js, format-tema.js, error-handler.js, helper-teks.js, keamanan-pin.js, modal-navigasi.js, reset-gaji-mingguan.js, debug-console.js, pengaturan-search.js, onboarding.js, kalkulator-input.js, scan-ocr.js, akun.js, gaji-calc.js, transaksi.js, profil-pengaturan.js, kategori.js, tagihan-kalender.js, backup-restore.js, payroll-absensi.js, tukang-absensi.js

// onTipeGajiChange — Sesi "Mingguan Tetap"/"Bulanan Tetap": tampilkan field
// yang relevan sesuai D.profile.tipeGaji dipilih di dropdown #sTipeGaji.
// #sGajiHarianWrap (Gaji Pokok Harian) SENGAJA selalu terlihat apa pun
// tipeGaji-nya -- masih dipakai sbg default upah/jam di Kalkulator Gaji &
// input Absensi harian, tidak berubah dari perilaku lama.
function onTipeGajiChange(){
const tipe=document.getElementById('sTipeGaji').value;
const mgWrap=document.getElementById('sGajiMingguanWrap');
const mbWrap=document.getElementById('sGajiBulananWrap');
if(mgWrap) mgWrap.classList.toggle('u-dnone',tipe!=='mingguanTetap');
if(mbWrap) mbWrap.classList.toggle('u-dnone',tipe!=='bulananTetap');
}
function autoSaveProfile(){
D.profile.nama=document.getElementById('sNama').value||'W';
D.profile.gajiPokok=parseInt(document.getElementById('sGaji').value)||65000;
D.profile.kiriman=parseInt(document.getElementById('sKirim').value)||500000;
const sTipeGajiEl=document.getElementById('sTipeGaji'); if(sTipeGajiEl) D.profile.tipeGaji=sTipeGajiEl.value;
const sGajiPokokMingguanEl=document.getElementById('sGajiPokokMingguan'); if(sGajiPokokMingguanEl) D.profile.gajiPokokMingguan=parseInt(sGajiPokokMingguanEl.value)||0;
const sGajiBulananTetapEl=document.getElementById('sGajiBulananTetap'); if(sGajiBulananTetapEl) D.profile.gajiBulananTetap=parseInt(sGajiBulananTetapEl.value)||0;
const sGajiBulananTanggalEl=document.getElementById('sGajiBulananTanggal'); if(sGajiBulananTanggalEl) D.profile.gajiBulananTanggal=Math.max(1,Math.min(31,parseInt(sGajiBulananTanggalEl.value)||1));
const sLemburMxEl2=document.getElementById('sLemburMx'); if(sLemburMxEl2) D.profile.lemburMultiplier=parseFloat(sLemburMxEl2.value)||1.5;
const sTarifMingguEl2=document.getElementById('sTarifMinggu'); if(sTarifMingguEl2) D.profile.tarifMinggu=parseInt(sTarifMingguEl2.value)||139000;
const sTglLahirEl=document.getElementById('sTanggalLahir'); if(sTglLahirEl) D.profile.tanggalLahir=sTglLahirEl.value||null;
const sInsightMingguanEl=document.getElementById('sInsightMingguanAktif'); if(sInsightMingguanEl){ D.profile.insightMingguanAktif=sInsightMingguanEl.checked; if(typeof InsightTargetMingguan!=='undefined')InsightTargetMingguan.render(); }
const apiKeyEl=document.getElementById('sApiKey');
if(apiKeyEl){ D.profile.apiKey=apiKeyEl.value.trim(); persistApiKeyEncrypted(); }
const providerEl=document.getElementById('sApiProvider');
if(providerEl) D.profile.apiProvider=providerEl.value;
const aiThEl=document.getElementById('sAIFinanceThreshold');
if(aiThEl&&typeof setAIFinanceOverspendThreshold==='function') setAIFinanceOverspendThreshold(aiThEl.value);
const aiDelThEl=document.getElementById('sAIDeliveryThreshold');
if(aiDelThEl&&typeof setAIDeliveryThinMarginThreshold==='function') setAIDeliveryThinMarginThreshold(aiDelThEl.value);
const aiFinLowBalEl=document.getElementById('sAIFinanceLowBalance');
if(aiFinLowBalEl&&typeof setAIFinanceLowBalanceMultiplier==='function') setAIFinanceLowBalanceMultiplier(aiFinLowBalEl.value);
const aiVehFuelDropEl=document.getElementById('sAIVehicleFuelDrop');
if(aiVehFuelDropEl&&typeof setAIVehicleFuelDropThreshold==='function') setAIVehicleFuelDropThreshold(aiVehFuelDropEl.value);
const aiDelLowStockEl=document.getElementById('sAIDeliveryLowStock');
if(aiDelLowStockEl&&typeof setAIDeliveryLowStockThreshold==='function') setAIDeliveryLowStockThreshold(aiDelLowStockEl.value);
const aiAssetZakatMinEl=document.getElementById('sAIAssetZakatMin');
if(aiAssetZakatMinEl&&typeof setAIAssetZakatMinThreshold==='function') setAIAssetZakatMinThreshold(aiAssetZakatMinEl.value);
const ocrMinConfEl=document.getElementById('sOcrMinConfidence');
if(ocrMinConfEl&&typeof setOcrMinConfidence==='function') setOcrMinConfidence(ocrMinConfEl.value);
document.getElementById('hNama').textContent=D.profile.nama;
updateProfilPTKPPreview();
updateUsiaPreview();
save();
}
// renderSalaryAllocationSuggestion — UI wrapper utk SalaryAllocation.suggest()
// (modules-calc.js). Cuma nampilin saran angka ke hint box, TIDAK nulis ke
// D.targets / manapun — user isi manual sendiri kalau setuju (persis pola
// hint 6× di onTargetDanaDaruratToggle, tx-target.js).
function renderSalaryAllocationSuggestion(){
const hint=document.getElementById('salaryAllocHint');
if(!hint)return;
const s=(typeof SalaryAllocation!=='undefined')?SalaryAllocation.suggest():null;
if(!s||!s.bulanan){
hint.innerHTML='⚠️ Belum ada transaksi bertipe "Pemasukan" (+ Masuk) yang tercatat, jadi rata-rata bulanan belum bisa dihitung. Kalau gaji/pendapatanmu selama ini dicatat sbg "Transfer" atau langsung diedit saldo akun, coba catat ulang minimal 1 transaksi lewat tombol "+ Masuk" di Keuangan supaya kehitung di sini.';
hint.classList.remove('u-dnone');
return;
}
hint.innerHTML=`📊 Rata-rata Pemasukan: <b>${fmtFull(s.bulanan)}</b>/bulan (dari histori transaksi asli kamu)<br><br>`
+`💡 Saran umum alokasi (bukan aturan baku, sesuaikan kondisi kamu — tidak otomatis tersimpan):<br>`
+`🚨 Target Dana Darurat: <b>${fmtFull(s.danaDaruratTarget)}</b> (6× bulanan)<br>`
+`🏖️ Target Pensiun/FI: <b>${fmtFull(s.pensiunFiTarget)}</b> (${s.fiMultiplier.toFixed(1)}× bulanan, ikut asumsi SWR di Kebebasan Finansial)<br>`
+`🍽️ Biaya Hidup (kebutuhan sehari-hari, bukan "uang jajan"): <b>${fmtFull(s.biayaHarian)}</b>/bulan (50% dari total pemasukan)<br>`
+`📈 Investasi: <b>${fmtFull(s.investasi)}</b>/bulan (30%)<br>`
+`🎁 Self-Reward: <b>${fmtFull(s.selfReward)}</b>/bulan (20%)`;
hint.classList.remove('u-dnone');
}
function profilePTKPStatus(){
const kawin=!!(D.profile&&D.profile.statusKawin);
let tanggungan=(D.profile&&D.profile.tanggungan)||0;
tanggungan=Math.max(0,Math.min(3,parseInt(tanggungan)||0));
return (kawin?'K':'TK')+tanggungan;
}
function profileJiwaKeluarga(){
const kawin=!!(D.profile&&D.profile.statusKawin);
let tanggungan=(D.profile&&D.profile.tanggungan)||0;
tanggungan=Math.max(0,parseInt(tanggungan)||0);
return 1+(kawin?1:0)+tanggungan;
}
function updateProfilPTKPPreview(){
const el=document.getElementById('sPTKPPreview');
if(!el)return;
const status=profilePTKPStatus();
el.textContent=status.replace('TK','TK/').replace(/^K(\d)/,'K/$1');
}
function updateUsiaPreview(){
const wrap=document.getElementById('sUsiaPreview'),val=document.getElementById('sUsiaVal');
if(!wrap||!val)return;
const tgl=D.profile&&D.profile.tanggalLahir;
if(!tgl){wrap.style.display='none';return;}
wrap.classList.remove('u-dnone');wrap.style.display='block';
val.textContent=fiCalcAge(tgl)+' tahun';
}
function selectStatusKawin(val,el){
D.profile.statusKawin=!!val;
document.querySelectorAll('#sStatusKawinPicker .chip-btn').forEach(b=>b.classList.remove('active'));
el.classList.add('active');
updateProfilPTKPPreview();
save();
}
function selectTanggungan(val,el){
D.profile.tanggungan=Math.max(0,Math.min(3,parseInt(val)||0));
document.querySelectorAll('#sTanggunganPicker .chip-btn').forEach(b=>b.classList.remove('active'));
el.classList.add('active');
updateProfilPTKPPreview();
save();
}
function selectStatusPekerjaan(val,el){
D.profile.statusPekerjaan=val;
document.querySelectorAll('#sPekerjaanPicker .chip-btn').forEach(b=>b.classList.remove('active'));
el.classList.add('active');
save();
renderPajakRekomendasi(true);
}
/* moved to modules-render.js: renderPajakRekomendasi */
function toggleApiKeyHint(){
const provider=document.getElementById('sApiProvider').value;
const hint=document.getElementById('apiKeyHint');
const keyEl=document.getElementById('sApiKey');
if(!hint||!keyEl)return;
if(provider==='gemini'){
keyEl.placeholder='AIza...';
hint.innerHTML='Buat API key gratis di <a class="u-cacc" href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a>. Key disimpan terenkripsi di HP ini (PIN sebagai kunci), tidak dikirim ke mana pun selain ke Google, & tidak ikut ke file backup.';
} else {
keyEl.placeholder='sk-ant-...';
hint.innerHTML='Buat API key di <a class="u-cacc" href="https://console.anthropic.com" target="_blank">console.anthropic.com</a>. Key disimpan terenkripsi di HP ini (PIN sebagai kunci), tidak dikirim ke mana pun selain ke Anthropic, & tidak ikut ke file backup.';
}
}
