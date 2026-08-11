// helper-teks.js — Domain Helper Teks & Kalender: escape karakter HTML berbahaya biar aman
// Dipindah ke modules/shared/helper-teks.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// dimasukkan ke innerHTML (escapeHtml), daftar nama bulan singkat & lengkap dalam Bahasa Indonesia
// (MONTHS/MONTHS_FULL) utk format tanggal.
// Dipindah dari features-helpers-global-security.js (v78) — potongan KESEBELAS dari pembedahan
// yang sama (lanjutan kalkulator-input.js v69, keamanan-pin.js v70, modal-navigasi.js v71,
// reset-gaji-mingguan.js v72, debug-console.js/pengaturan-search.js v73, onboarding.js v74,
// diagnostik-versi.js v75, format-tema.js v76, error-handler.js v77). Domain kecil & mandiri:
// fungsi/konstanta murni tanpa dependensi ke D atau modul lain — cuma dipakai dari file lain
// (cobek.js, modules-render.js, dst) di DALAM function body yang baru jalan saat runtime
// (klik/render halaman), bukan saat file itu di-load, jadi aman dipindah walau file2 pemanggil
// itu ada di GROUP_A (dimuat lebih dulu dari GROUP_B, sebelum file ini ada).
// TIDAK ADA isi yang diubah, cuma dipindah file.
function escapeHtml(str){
if(str===null||str===undefined)return '';
return String(str)
.replaceAll('&','&amp;')
.replaceAll('<','&lt;')
.replaceAll('>','&gt;')
.replaceAll('"','&quot;')
.replaceAll("'",'&#39;');
}
const MONTHS=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const MONTHS_FULL=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
function dateToISO(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
