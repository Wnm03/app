# PATCH S2819 — Nominal rupiah utuh + guard kategori (akumulatif di atas S2818, build 2831)

## Perubahan
- **Utang titipan dibulatkan ke rupiah** di semua penulis & pembanding: `Aset._syncOwnerDebts` (aset-owners.js), `TitipanSync` akun (titipan-sync.js), `Investment._syncTitipanDebt` (investasi.js), dan `TitipanReconcile._expectedFromAssets/_expectedFromInvestments`. Contoh Majoris 10.845.758 (84,3257% / 15,6743%) -> renov 9.145.761 + mas sihab 1.699.997 = 10.845.758. Porsi tersimpan tidak diubah.
- **Cek Kesehatan Data**: temuan baru "Nominal pecahan" (transaksi, utang, piutang) + tombol "🔢 Bulatkan nominal" (`DataHealth.roundFractionalAmounts`, pakai konfirmasi, transaksi lewat `FinanceTxSOT.updateById`, utang/piutang lewat `BillDebtPiutangCanonicalWriter`). Unit/harga satuan aset sengaja tidak dicek. Di backup 2026-11-12 terdeteksi: 2 transaksi (49.028,5 dan 50.149,5), 2 utang (renov, mas sihab).
- **F10**: `buildBackupPayload` menghitung ulang `balance` akun di SALINAN backup (hanya akun ber-`baseBalance`); D asli dan restore tidak berubah.
- **Guard kategori** (`tests/s2819-nominal-bulat-dan-guard-kategori.test.js`): `FinanceTxSOT.create/createMany` menolak kategori tak dikenal (mis. label grup BAHAN), `categoryId` basi diganti ID canonical, `createMany` atomik. Mencegah bug F1 dari modul mana pun.

## Hasil
- Full suite: 9817 tes, 9816 lulus, 0 gagal, 1 skip. Build 2830 -> 2831.
- Belum diuji di browser/SheetJS/Android.

## Catatan
- Setelah pasang, buka Cek Kesehatan Data: backup dulu, lalu tekan "Bulatkan nominal". Utang titipan akan ikut rapi saat rekonsiliasi Titipan berikutnya.
- Belum dikerjakan (butuh keputusan data): F5/F6, rekomendasi 2, 5, 6, 7.
