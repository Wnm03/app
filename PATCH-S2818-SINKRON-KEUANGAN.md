# PATCH S2818 — Perbaikan audit sinkron keuangan (F1–F4, F7–F9), akumulatif di atas S2817 (build 2829)

## PENTING — cara pasang
Zip ini **source-only, tanpa bundle**. Basis `app-main (9)` yang saya terima tidak sama dengan `app-main (10)` milikmu
(contoh: `FinanceTxSOT.patchMetaById` tidak ada di (9), ada di bundle patch S2817), jadi bundle yang saya build dari (9)
akan menghilangkan isi (10). Jangan pakai bundle dari saya. Di folder (10) + patch S2816/S2817:
1. Timpa 5 file penuh: `modules/home/renovasi.js`, `modules/finance/transaksi-b.js`, `tests/s2817-renov-excel-export-import.test.js`, `tests/s2818-sinkron-keuangan-perbaikan.test.js`.
2. `git apply S2818-SOURCE.patch` (atau `patch -p1 < S2818-SOURCE.patch`): mengubah `piutang-utang.js`, `titipan-reconcile.js`, `data-health-check.js` dan 4 tes lama.
3. `node scripts/build.js --require-minify`, lalu `node --test tests/*.test.js`.

## Perubahan
- F1: pembayaran item Renovasi memakai kategori pengeluaran valid (`Renov._renovExpenseCategory`); item hasil impor dan item lama tertolong. Label grup RAB disimpan di `item.grup` (dipakai tampilan, laporan, export, dedup impor).
- F2: baris PROFIT/margin/keuntungan/laba tidak jadi item biaya; nilainya di `p.profit`, tampil di preview impor dan panel Arus Dana. Total impor v18 = biaya riil ±5.327.664.
- F3: nominal impor dan nominal bayar dibulatkan ke rupiah.
- F4: `syncTitipanPinjamUtangOnEdit` arahnya dibalik (`nilai + baru − lama`) dan dipasang di jalur edit transaksi (`transaksi-b.js`). `syncTitipanTalanganPiutangOnEdit` punya cacat arah yang sama dan ikut dibalik (perubahan perilaku di luar audit; 4 tes lama diperbarui). `syncDebtBalanceOnPaymentEdit` (tagihan bersama) tidak diubah.
- F4 data lama: `TitipanReconcile.repairPinjamUtangLinkage()` + tombol "Sinkronkan utang" di Cek Kesehatan Data (pakai konfirmasi; utang lunas tidak disentuh).
- F7: pengecekan kategori servis memprioritaskan kategori ber-ID sama yang cocok dengan kendaraan log (false positive veh_1 vs veh_…698).
- F8: `Renov.reconcileItemAccounts()` + tombol "Samakan akun item".
- F9: temuan + tombol "Pakai tanggal pembuatan" untuk transaksi bertanggal ≥5 tahun ke depan yang ber-ID timestamp.
- Tidak dikerjakan: F10 (saldo `balance` basi di file backup; tidak merusak data karena baseBalance dipakai), F5, F6 (butuh keputusan data).

## Hasil tes (di basis (9)+S2817)
Full suite 9773 tes (sebelum tes integrasi): 9765 lulus, 7 gagal, 1 skip.

## Uji tambahan
`tests/s2818-bayar-item-integrasi.test.js`: FinanceTxSOT + FinanceCategorySOT asli, kategori ber-id seperti backup, shim patchMetaById (hanya di tes). Terbukti gagal di kode lama (FINANCE_CATEGORY_UNRESOLVED), lulus di kode baru. Belum bisa diuji di sini: browser Chromium, SheetJS asli, Android (tidak ada browser/jaringan di sandbox).
