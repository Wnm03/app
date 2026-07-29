// format-tema.js — Domain Format Angka & Tema: format rupiah singkat (fmt, mis. "Rp 1.5 jt"),
// Dipindah ke modules/shared/format-tema.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// format rupiah penuh (fmtFull/fmtFullSigned), notifikasi toast di bawah layar (toast), dan
// ganti/terapkan tema warna app termasuk mode "auto" ikut jam HP (setTheme/applyEffectiveTheme).
// Dipindah dari features-helpers-global-security.js (v76) — potongan KESEMBILAN stlh
// kalkulator-input.js (v69), keamanan-pin.js (v70), modal-navigasi.js (v71),
// reset-gaji-mingguan.js (v72), debug-console.js/pengaturan-search.js (v73), onboarding.js (v74),
// diagnostik-versi.js (v75). Domain ini DIPILIH TERAKHIR (bukan paling awal seperti biasanya)
// justru krn PALING BANYAK dipakai di seluruh app (`toast()` saja dipanggil 900+ kali dari
// puluhan file lain) — supaya polanya sudah teruji dulu di domain2 kecil sebelum pindahkan
// utilitas inti sepenting ini.
// TIDAK ADA isi yang diubah, cuma dipindah file. Semua pemanggil di file lain mengakses fungsi2
// ini sbg variabel global saat runtime (tombol diklik/render halaman), BUKAN saat file di-load —
// jadi aman terlepas dari urutan pasti file ini di dalam GROUP_B, asalkan tetap di GROUP_B (satu
// bundle yang sama dgn D/save() yg dipakai setTheme, & dimuat sebelum app dipakai user).
// PENTING: file ini HARUS dimuat SETELAH features-helpers-global-security.js (butuh `D`/`save()`).
// S159 (bugfix — permintaan user "nominal jangan disingkat/dibulatkan, komplit dgn
// titik"): fmt() SEBELUMNYA menyingkat & membulatkan (>=1jt -> "Rp 1.5 jt" 1 desimal,
// >=1rb -> "Rp 500rb" tanpa desimal) -- dipakai di ~40 file (kasir, cicilan, aset,
// vehicle, shop, dashboard presenter, dll) utk tampilkan nominal, jadi 1 fungsi ini
// yg nentuin tampilan "disingkat" di HAMPIR SEMUA fitur. fmtFull() (di bawah) SUDAH
// lengkap & pakai titik ribuan (toLocaleString('id-ID')) sejak awal, tapi cuma
// dipakai sebagian tempat. Drpd edit 40 file satu-satu (resiko regresi & duplikasi
// logic), fmt() sekarang 100% REUSE fmtFull() sbg satu-satunya sumber format nominal
// -- seluruh pemanggil fmt() di 40 file otomatis dapat angka lengkap tanpa disentuh.
// fmtFull()/fmtFullSigned() itu sendiri TIDAK diubah sama sekali.
function fmt(n){return fmtFull(n);}
function fmtFull(n){return'Rp '+Number(Math.abs(n||0)).toLocaleString('id-ID');}
function fmtFullSigned(n){n=Number(n||0);return(n<0?'-':'')+'Rp '+Math.abs(n).toLocaleString('id-ID');}
// BUGFIX (laporan user: toast pesan error scan sparepart "hilang"/tidak
// kebaca): dulu tiap panggilan toast() bikin setTimeout sendiri TANPA
// membatalkan timer dari panggilan sebelumnya -- kalau toast ke-2 (mis.
// "❌ Gagal scan: ...", durasi default 2200ms) dipanggil SAAT toast ke-1
// masih tampil (mis. "🔍 Membuka kamera...", durasi custom 4000ms), timer
// toast ke-1 tetap jalan & menyembunyikan box tepat di detik ke-4 --
// memotong toast ke-2 sebelum sempat kebaca (kalau toast ke-2 muncul di
// antara detik 2-4). Sekarang timer sebelumnya di-clearTimeout() dulu tiap
// toast() dipanggil, jadi durasi SELALU dihitung dari toast yang PALING
// BARU tampil -- tidak ada lagi timer basi yang nyembunyikan toast baru.
let _toastHideTimer=null;
function toast(msg,dur=2200){const t=document.getElementById('toast');if(_toastHideTimer)clearTimeout(_toastHideTimer);t.textContent=msg;t.classList.add('show');_toastHideTimer=setTimeout(()=>{t.classList.remove('show');_toastHideTimer=null;},dur);}
function setTheme(t){
D.profile.theme=t; save();
applyEffectiveTheme();
document.querySelectorAll('.theme-card').forEach(c=>c.classList.toggle('active',c.dataset.t===t));
toast(t==='auto'?'Tema otomatis aktif 🌗 (ikut jam HP)':'Tema '+t+' aktif ✨');
}
function applyEffectiveTheme(){
let t=D.profile.theme||'dark';
if(t==='auto'){
const h=new Date().getHours();
t=(h>=6&&h<18)?'light':'dark';
}
document.body.setAttribute('data-theme',t);
}
