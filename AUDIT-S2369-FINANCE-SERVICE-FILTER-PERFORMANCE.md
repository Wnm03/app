# S2369 — Optimasi filter transaksi berdasarkan kategori/komponen servis

## Temuan

`modules/finance/filter-laporan.js::txMatchesFilters(t, f)` melakukan lookup `D.servisLogs.find(...)` secara terpisah untuk filter `serviceCategory` dan `serviceComponent`. Ketika kedua filter aktif (jalur yang lazim saat pengguna memilih kategori servis dan komponen sekaligus), setiap transaksi yang dievaluasi dapat memindai `D.servisLogs` dua kali untuk memperoleh record servis yang sama.

## Perubahan

- Resolve `servisLinkId` paling banyak satu kali per pemanggilan `txMatchesFilters` saat salah satu filter servis aktif.
- Tidak melakukan lookup bila filter servis tidak aktif.
- Tetap menolak transaksi tanpa `servisLinkId`, referensi servis hilang, kategori tidak cocok, atau checklist/komponen tidak cocok.
- Tidak menambahkan cache lintas panggilan; perubahan data servis langsung tercermin pada evaluasi berikutnya.
- Tidak mengubah data, persistence, urutan filter lain, atau bentuk hasil.

## Validasi

- `node --check modules/finance/filter-laporan.js`: PASS.
- Tes terfokus S2369 + filter laporan/keuangan + S2339/S2340: 30 passed, 0 failed.
- Tes gabungan S2361/S2362/S2366/S2369: 10 passed, 0 failed.
- `scripts/audit-lazy-boundaries.js`: 99/99 PASS.
- `scripts/performance-budget.js`: PASS pada baseline sebelum perubahan source; perubahan ini tidak mengubah bundle/aset.
- Full suite: tidak selesai dalam batas waktu 120 detik pada lingkungan ini; log parsial mencapai 2.788 subtes, jadi tidak mengklaim full-suite PASS.

## Status rilis

**SOURCE PATCH — NOT RELEASE READY.** Perubahan source membuat bundle yang ada tidak lagi dapat diasumsikan segar. Build produksi/minifikasi dan tes penuh harus dijalankan di lingkungan yang menyediakan toolchain proyek (`esbuild` dan `eslint`), lalu jalankan bundle-freshness dan release gates. Jangan deploy bundle dari baseline bersama source yang telah diubah ini.
