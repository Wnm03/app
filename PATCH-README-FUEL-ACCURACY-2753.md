# Patch Kumulatif Fuel Accuracy — build 2753 (menggantikan 2749, 2751, 2752)

Baseline: `app-main (3).zip`. Berisi file berubah saja (kumulatif 2741–2753). Bukan full release. Tidak berisi data/backup pengguna.
Isi lengkap perbaikan sebelumnya: lihat `PATCH-README-FUEL-ACCURACY-2752.md` (mencakup 2751) dan `PATCH-README-FUEL-ACCURACY-2749.md`.

## Tambahan S2753
1. `vehicle-trend-api.js` `_costLogs()`: tren biaya BBM (per kendaraan maupun seluruh armada) memakai log kanonis; duplikat lintas impor dan isi melebihi kapasitas tidak dijumlah. Data asli tidak diubah.
2. `vehicle-reminder.js`: pengingat isi BBM mengambil full tank terakhir dari log kanonis (satu sumber dengan estimator).
3. Tes baru: `tests/fuel-trend-reminder-canonical-s2753.test.js` (3 tes).

## Langkah wajib setelah menerapkan (pembersihan baseline, bukan bagian patch)
ZIP tidak dapat membawa penghapusan file. Baseline `app-main (3).zip` masih memuat 5 file yang menurut `DELETE-FILES.txt` sudah pensiun:
`modules/modals.js`, `modules/asset/features-helpers-global-security.js`, `modules/finance/features-helpers-global-security.js`, `modules/shop/features-helpers-global-security.js`, `modules/shop/modals.js`.
Jalankan sekali: `node scripts/apply-delete-manifest.js` (aman diulang). Tanpa langkah ini, 3 tes penjaga (S1780, s1608, S2308) gagal — kegagalan yang sama sudah ada pada baseline murni.

## Validasi
- Full test suite: 9484 tes. Tanpa langkah hapus: 9480 lulus, 3 gagal (bawaan baseline). Setelah `apply-delete-manifest`: 9483 lulus, 0 gagal, 1 dilewati.
- ESLint file yang disentuh: 0 error. Build minified lulus; bundle A/B segar; window-expose OK.
- Backup asli Vario 125: km/L 58,08; estimasi sisa 4,24 L; backup & transaksi tidak berubah.
- Belum dijalankan: Android PWA nyata, kalibrasi di perangkat nyata.
