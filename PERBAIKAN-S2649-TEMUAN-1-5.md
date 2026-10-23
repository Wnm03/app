
> **Catatan validasi ulang 2649 (2026-10-23):** klaim browser dan full-suite pada dokumen historis ini belum dapat direproduksi pada validasi akumulasi terbaru. Anggap klaim tersebut sebagai hasil terdahulu, bukan bukti gate rilis saat ini. Lihat `AUDIT-RANTAI-AKUMULASI-S2649-2649.md`.

# Perbaikan temuan audit patch S2649 (akumulatif)

Dasar: `app-main (35)` + patch `S2649-akumulatif`. Build akhir: 2646.

## Perbaikan
1. **Modal Order rusak.** Dekorator "Pelanggan (opsional)" mencari heading lewat `modal.children`, padahal anak overlay hanyalah `.modal`, sehingga seluruh `.modal` masuk ke `<details>`. Kini heading dicari di `.modal` dan harus berupa `div` tanpa anak.
2. **Modal Tambah Produk dan lipatan lain.** `directChild`/`groupDirectFields` dan lipatan STNK memakai overlay sebagai induk. Kini ada helper `sheetBody()` yang memakai `.modal` di dalam overlay (juga untuk `vehicleModal`, `vehTaxModal`).
3. **Halaman beku saat menambah ke keranjang Order.** `decorateRows` menulis `textContent` subtotal pada subtree yang diamati sendiri. Kini hanya menulis bila teksnya berubah.
4. **Halaman beku saat menyimpan proyek Renovasi.** Perbandingan `summary.textContent` tidak pernah sama dengan teks dua `<span>`, sehingga ditulis ulang tanpa henti. Kini memakai kunci `data-renov-summary-key`.
5. **P0-3 tuntas.** Dropdown proyek di form transaksi di-refresh setelah Simpan maupun Tutup (menunggu modal benar-benar tertutup), dan proyek yang baru dibuat dari form otomatis terpilih.

## Tes dan bundle
- 3 `catch` kosong di `pwa-ux-performance.js` diberi penanganan (lint `guard-empty-catch`, S1860).
- Aturan CSS `[data-action=...]` di `modern-ui-layer.css` dihapus (kontrak S2103/S256AD); lantai 40px sudah diset oleh helper JS. Tes `s2646` disesuaikan.
- Tes `s2646` memeriksa penanda runtime `__pwaOrderPoPresentationInstalled`, bukan komentar yang hilang saat minify.
- `app-bundle-a/b.min.js` dibuild ulang dari source (`node scripts/build.js --require-minify`), tidak diedit langsung. `FILE-HASHES-SHA256.txt` disegarkan.

## Hasil
- Tes penuh: 9.160 tes, semua lulus kecuali S256AU (hash) yang sudah dibereskan lewat `refresh-file-hashes.py`.
- Browser (Chromium 390×844 dan 360×640): modal Order dan Produk terbuka normal; tambah ke keranjang tidak beku (0 mutasi saat idle); simpan proyek tidak beku; transaksi Renovasi tersimpan dengan `renovProjectLinkId` dan item lunas; P0-1 (pita hilang setelah produk ditambahkan) dan P0-2 (label "Dihitung dari daftar produk … (sebelumnya …)") bekerja; P1-1, P1-3 sampai P1-5 dan P1-8 muncul sesuai rancangan.
- Tinggi modal Order kosong: 1,66 layar di 390×844 (baseline 2,31; target ≤1,75).
