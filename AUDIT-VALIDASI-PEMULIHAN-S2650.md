# Validasi pemulihan Beranda — S2650 (build 2650), 23 Okt 2026

Keputusan: Beranda dikembalikan ke baseline `app-main (35)`; seluruh perbaikan S2649 untuk Shop, Order/PO, Car Notes, dan Renovasi dipertahankan.

## Yang dipulihkan (dari baseline)
- `index.html`, `app_production.html`: 25 id Beranda (EIE, Dana Kelolaan, Personal Overview, Cross Widgets, Life Priority, ticker modern + anak/chev/cbody), Quick Action `dashHubQaFocusSearch`, hint pengaturan kartu.
- `modules/dashboard-hub/dashboard-hub.js` (render ticker + pipeline insight asli), `dashboard-hub-overview.js` (tanpa tile "Transaksi Terakhir"), `modules/shared/modules-render-b.js` (mode render `always`/`insight` asli), `modules/finance/financial-health-score-api.js` (teks pesan asli).
- Tes asli: `dashboard-hub-ticker-modern-s636.test.js`, `dashboard-hub-overview-s2612.test.js` (tanpa pelemahan ekspektasi).

## Bukti
- Perbandingan baseline vs hasil: **0 id hilang, 0 data-action hilang** di `index.html`. Perbaikan S2649 tidak ikut terhapus: 27 dari 46 file overlay identik byte-per-byte; selisih lain hanya stempel versi 2649→2650 dan keluaran build (bundle, HTML, sw.js, docs, hash) serta 6 file Beranda di atas.
- Build resmi `node scripts/build.js --require-minify` → 2650; `refresh-file-hashes --check`: 59 ok, 0 basi; bundle segar.
- Full test 32 shard: **9.160 tes, 9.159 lulus, 1 skip, 0 gagal** (`e2e/s2649/fulltest-2650.log`).
- `verify-release-ready.js`: **RELEASE GATE LOLOS** (`release-gate-2650.log`).
- Browser nyata 390×844 dan 360×640: semua id Beranda ada, "Cari Fitur" ada, 0 scroll horizontal, 0 error JS; Order (keranjang qty 2, 0 mutasi idle), Tambah Produk, tombol "＋ Buat proyek", simpan proyek, tx Renovasi tertaut; setelah reload `renovProjectLinkId`, `renovItemLinkId`, item lunas, dan transaksi identik (`hasil-*.json`).

## Belum terverifikasi
- Keyboard layar Android nyata (lingkungan ini hanya Chromium; mode `resizes-visual`, sticky di WebView, field DP di 360×640 butuh uji di perangkat).
- Jalur simpan Order/PO (hanya buka + keranjang yang diuji), OCR, dan baris hasil modal scan.
- Penghalang rilis dari audit S2649 tentang OTA/cache tetap: unggah SEMUA file yang berubah, bukan hanya HTML.
