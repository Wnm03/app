# Audit S2361–S2365 — Release Readiness & Runtime Hotspots

## Ruang lingkup

Audit lanjutan terhadap baseline `app-main (52)` setelah patch kumulatif S2341–S2360 diterapkan. Sesi ini memprioritaskan gerbang arsitektur/fitur, anggaran ukuran, siklus listener, I/O runtime, kualitas tes, serta kesiapan build. Ini adalah audit statis; tanpa toolchain build dan perangkat Android/WebView, laporan ini tidak mengklaim hasil profiling runtime.

## Hasil yang berhasil diverifikasi

- `audit-production-readiness.js`: 14/14 PASS.
- `architecture-integrity-gate.js`: PASS; 405 runtime entries terdeteksi.
- `feature-regression-gate.js`: PASS; wiring finance/theme/navigation/backup/AI/vehicle/fuel/servis masih terdeteksi.
- `verify-carnotes-performance.js`: PASS untuk 4 file inti.
- `verify-patch-integrity.js`: PASS untuk 56 apply files, fingerprint `1863b3d255eea986` pada patch sebelum dokumen sesi ini ditambahkan.
- `verify-patch-contamination.js`: PASS.

## Temuan dan batas interpretasi

### S2361 — Anggaran aset hampir penuh

Snapshot pemeriksaan: `index.html` 319,791/320,000 byte (99.9%); `app_production.html` 319,984/320,000 (99.995%); `styles.css` 179,550/180,000 (99.8%); `pwa-ui-layer.css` 14,987/15,000 (99.9%); bundle A 1,532,085/1,600,000 (95.8%); bundle B 4,923,336/5,000,000 (98.5%). Gerbang ukuran lulus, tetapi aset dekat batas memiliki headroom sangat rendah. Jangan menaikkan limit untuk mengatasi kegagalan; cari sumber ukuran dan ukur ulang setelah build segar.

### S2362 — Siklus listener

Audit statis melaporkan 132 lokasi `addEventListener`. Angka ini adalah lokasi source, bukan jumlah listener aktif saat runtime. Fokus profiling berikutnya: buka/tutup modal, perpindahan tab, scanner start/stop, serta navigasi berulang; ukur apakah jumlah listener dan heap terus bertambah setelah siklus berulang.

### S2363 — I/O dan skalabilitas Car Notes/servis

Audit statis menemukan beberapa pola persistence/save pada modul servis. Pemeriksa skalabilitas menunjukkan `modules/vehicle/servis.js` sekitar 1,934 baris, 145 pola loop, dan 30 pola JSON; `servis-b.js` sekitar 774 baris, 87 pola loop, dan 27 pola JSON. Ini hanya indikator untuk memilih hotspot profiling, bukan bukti bahwa semua loop atau serialisasi mahal. Jangan mengubah jalur persistence/keuangan tanpa tes semantik dan data profiling.

### S2364 — Ketahanan tes

Pemeriksa hygiene menemukan 43 pola tes yang berpotensi rapuh karena memeriksa literal atau urutan teks sumber. Temuan bersifat advisory. Refactor satu per satu hanya ketika tersedia tes perilaku yang setara; jangan menghapus kontrak sumber yang memang melindungi urutan startup, transaksi atomik, atau batas build.

### S2365 — Penghambat build/rilis

- `verify-bundle-freshness.js` gagal untuk `app-bundle-a.min.js` dan `app-bundle-b.min.js`: hash sumber saat ini berbeda dari hash yang tertanam di bundle.
- `node build.js --require-minify` belum dapat menyelesaikan preflight karena `esbuild` tidak tersedia di lingkungan ini.
- Tidak ada bundle yang dibangun ulang pada sesi ini; versi/build marker tidak dinaikkan.
- Percobaan suite penuh sebelumnya timeout dan bukan hasil kelulusan penuh.

## Tindakan berikutnya

1. Pulihkan toolchain yang dikunci proyek dari lockfile/lingkungan build yang dipercaya; jangan mengambil versi acak atau melakukan build tanpa minifikasi.
2. Bangun bundle A/B dan jalankan `verify-bundle-freshness.js`, version/reproducible-build checks, `release-check`, serta tes penuh.
3. Profilkan alur Android/WebView yang sama sebelum/sesudah perubahan: startup, perpindahan tab, modal, scanner, dan dataset servis besar.
4. Catat median dan p95, penggunaan heap, long tasks, serta listener aktif setelah siklus berulang.
5. Baru pilih optimasi runtime berdasarkan profil; pertahankan tes regresi data, ownership, tanggal, dan persistence.

## Status

Audit sesi ini menambahkan bukti release-readiness dan prioritas profiling, bukan perubahan runtime. Patch tetap `SOURCE-NOT-RELEASE` sampai build segar, suite penuh, seluruh release gates, dan uji perangkat dinyatakan lulus.
