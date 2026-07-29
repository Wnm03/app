// onboarding.js — Domain Onboarding: preview perkiraan kasar gaji/kiriman saat setup awal
// Dipindah ke modules/shared/onboarding.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// (updateOnboardPreview) & proses selesai onboarding — simpan profil awal + PIN (finishOnboard).
// Dipindah dari features-helpers-global-security.js (v74) — potongan KETUJUH stlh
// kalkulator-input.js (v69), keamanan-pin.js (v70), modal-navigasi.js (v71),
// reset-gaji-mingguan.js (v72), debug-console.js & pengaturan-search.js (v73). Dipilih krn
// domain kecil & mandiri: cuma dipakai saat layar onboarding pertama kali dibuka, tidak ada
// modul lain yang gantung ke fungsi ini selain lewat data-action/oninput di HTML.
// Bergantung ke (semua diakses lewat variabel global saat runtime, BUKAN referensi lokal file):
// D/save() (features-helpers-global-security.js), fmtFull/fmtFullSigned/safeSetItem/showMain
// (features-helpers-global-security.js), hashPin/_sessionRawPin (keamanan-pin.js),
// showAlertModal (modals.js).
// Dipanggil dari: `oninput="updateOnboardPreview()"` di input gaji/kiriman onboarding &
// `data-action="finishOnboard"` di tombol "Mulai Sekarang" (index.html/app_production.html),
// juga dipanggil sekali dari features-sheets-pwa-selftest.js saat cek status setup pertama load.
// PENTING: file ini HARUS dimuat SETELAH features-helpers-global-security.js (butuh fmtFull/
// fmtFullSigned/safeSetItem/showMain) & keamanan-pin.js (butuh hashPin/_sessionRawPin).
function updateOnboardPreview(){
const box=document.getElementById('obPreviewBox'); if(!box)return;
const gaji=parseInt(document.getElementById('ob_gaji').value)||0;
const kirim=parseInt(document.getElementById('ob_kirim').value)||0;
const estBulanan=gaji*26;
const estSisaKirim=estBulanan-(kirim*4);
box.innerHTML='📊 <b>Perkiraan kasar</b> (26 hari kerja/bulan):<br>'
+'Gaji sebulan: <b>'+fmtFull(estBulanan)+'</b><br>'
+'Setelah kiriman rutin: <b style="color:'+(estSisaKirim>=0?'#22c55e':'#ef4444')+'">'+fmtFullSigned(estSisaKirim)+'</b><br>'
+'<span class="u-ctext3">Nanti bisa diatur presisi lewat Absensi harian</span>';
}
async function finishOnboard(){
// FIX (2026-07-26): guard SW controllerchange-reload dipindah ke PALING AWAL finishOnboard(),
// SEBELUM operasi async apa pun (hashPin, dsb). Sebelumnya guard ini baru diset di akhir fungsi,
// jadi ada celah waktu (selama await hashPin() dkk) di mana event 'controllerchange' bisa keburu
// nembak reload() sebelum guard sempat terpasang -- itu penyebab PIN "muncul 2x" (init() jalan
// ulang, lihat kw_pin baru tersimpan, showPinScreen() lagi sebelum user lihat halaman utama).
// Set guard duluan di sini menutup celah race tsb; reload SW normal utk update berikutnya tetap
// jalan seperti biasa (guard cuma berlaku sekali per sesi transisi onboarding->main ini).
try{sessionStorage.setItem('kw_sw_reloaded','1');}catch(e){}
const nama=document.getElementById('ob_nama').value||'W';
const gaji=parseInt(document.getElementById('ob_gaji').value)||65000;
const kirim=parseInt(document.getElementById('ob_kirim').value)||500000;
const pin=document.getElementById('ob_pin').value;
const tema=document.getElementById('ob_tema').value;
if(pin.length!==4){showAlertModal('PIN harus 4 digit!',{icon:'🔒',title:'PIN Belum Valid'});return;}
try{
D.profile={nama,gajiPokok:gaji,kiriman:kirim,theme:tema,tanggalLahir:null,statusKawin:false,tanggungan:0,statusPekerjaan:null};
safeSetItem('kw_pin',await hashPin(pin));
_sessionRawPin=pin;
safeSetItem('kw_setup','1');
save(); document.getElementById('onboard').style.display='none'; showMain();
}catch(e){
console.error('finishOnboard gagal:',e);
showAlertModal('Gagal menyimpan profil awal: '+(e&&e.message?e.message:'error tidak diketahui')+'. Coba lagi, atau buka app ini di browser biasa (bukan preview) kalau masalah berlanjut.',{icon:'⚠️',title:'Gagal Setup'});
}
}
