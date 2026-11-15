# PATCH S2831 — Hapus/edit transaksi item Renovasi lama tidak meninggalkan payment yatim (AKUMULATIF S2821 s/d S2831)
Dasar: S2830 -> build 2849. Hasil audit 100 poin (temuan F-03, F-01). Tanpa flag baru, tanpa migrasi data.

## Masalah (F-03, HIGH, terbukti)
Item RAB lama lunas lewat `txId` yang kemudian dimigrasi ke `payments[]` (bill menunjuk item itu, S2825) punya baris payment bertaut `txId`, tetapi transaksi aslinya tidak punya `renovPaymentId`. `Renov.onLinkedTxDeleted` dan `onLinkedTxEdited` hanya bekerja bila `renovPaymentId` ada, sehingga menghapus/mengedit transaksi asli membuat payment yatim: realisasi proyek tetap Rp1.500 padahal kas Rp500.

## Perubahan
- `modules/home/renovasi.js`: `onLinkedTxDeleted` dan `onLinkedTxEdited` memakai `payments[]` bila array, mencocokkan lewat `renovPaymentId` ATAU `txId`; `txId` legacy item dibersihkan bila sama dengan transaksi yang dihapus. Jalur item tanpa `payments[]` tidak berubah.
- `modules/home/renovasi.js`: hapus definisi ganda `_renovSetStat` (F-01; definisi kedua yang selalu berlaku dipertahankan, perilaku tidak berubah).
- `tests/s2831-renov-hapus-edit-payment-legacy.test.js`: 4 tes baru (hapus, edit, jalur lama, definisi tunggal).
- Build ulang bundle, `?v=2849`, `CACHE_NAME kw-cache-v2849`.

## Bukti
- Probe audit (sebelum fix) gagal "payment yatim: 1"; setelah fix tes S2831 lulus.
- Tes terkait Renovasi/keuangan (s2767, s2822, s2825-s2827, s2830, s2606, s2196) lulus; suite penuh 9.885 lulus, 0 gagal, 1 skip; bundle segar (verify-bundle-freshness).

## Batas (tidak diubah di patch ini)
- R-05/R-06 (restore parsial tanpa modul Renovasi; tanpa rekonsiliasi relasi renov saat restore) masih terbuka — perlu keputusan desain.
- Skenario runtime browser, PDF/Excel, timer tengah malam belum diuji.
