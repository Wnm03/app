# S2816 — rebuild bundle di atas basis app-main (10), build 2826
Ditemukan saat verifikasi: bundle di PATCH-S2816 (build 2825) tidak cocok dengan source basis app-main (10), sehingga 31 tes bundle-freshness/parity gagal. Bundle, index.html, app_production.html, sw.js dan konstanta versi dibangun ulang dengan `node scripts/build.js` (2825 -> 2826). Source B1-B8 tidak berubah.

Hasil full suite (node --test): 9796 tes, 9792 lulus, 3 gagal. Tiga kegagalan identik dengan basis app-main (10) tanpa patch (S1780, S2308, s1608), bukan regresi.

Uji dengan backup asli (backup-keluarga-W-2026-11-12) di Chromium 360px:
- 1.257 transaksi utuh; total income 121.205.475 dan expense 130.745.194 sama persis; 0 nominal berubah.
- B8: tanpa patch total saldo 0 (cache basi); dengan patch Cash -4.897.159, cocok dengan hitungan independen dari file.
- B5: toast "ID kategori dirapikan (1 referensi servis); nominal tidak berubah." muncul; 1 transaksi ganti categoryId (cat_bisnis_1782816414991 -> cat_cb, nama tetap Bisnis).
B9 tidak diubah (menunggu konfirmasi).

## Tambahan (akumulasi)
- HAPUS 5 file sisa S2720 yang masih ada di app-main (10): lihat DELETE-FILES-S2816-APPLY.txt (sudah tercantum di DELETE-FILES.txt; jalankan `npm run apply-delete-manifest` atau hapus manual). ZIP tidak bisa membawa penghapusan.
- tests/s2816-laporan-bug-uji-backup.test.js: batas sisa font <11px diperketat dari 4 jadi 2 (hanya .nav-item).
- Full suite setelah penghapusan: 9796 tes, 9795 lulus, 0 gagal (3 kegagalan bawaan basis hilang).
