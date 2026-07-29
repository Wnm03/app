// profil-pengaturan.js — Profil pengguna di Pengaturan: auto-save profil, status
// Dipindah ke modules/shared/profil-pengaturan.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// PTKP (kawin/tanggungan/pekerjaan) utk estimasi PPh21, preview usia, hint API key AI
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: data-default.js, features-helpers-global-security.js, diagnostik-versi.js, format-tema.js, error-handler.js, helper-teks.js, keamanan-pin.js, modal-navigasi.js, reset-gaji-mingguan.js, debug-console.js, pengaturan-search.js, onboarding.js, kalkulator-input.js, scan-ocr.js, akun.js, gaji-calc.js, transaksi.js, profil-pengaturan.js, kategori.js, tagihan-kalender.js, backup-restore.js, payroll-absensi.js, tukang-absensi.js

function autoSaveProfile(){
D.profile.nama=document.getElementById('sNama').value||'W';
D.profile.gajiPokok=parseInt(document.getElementById('sGaji').value)||65000;
D.profile.kiriman=parseInt(document.getElementById('sKirim').value)||500000;
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
