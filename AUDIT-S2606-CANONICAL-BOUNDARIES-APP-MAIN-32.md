# S2606 — Audit Batas Sumber Kanonis Alokasi Dana

## Ruang lingkup
Tahap ini melanjutkan patch kumulatif S2605. Perubahan baru hanya menambah `tests/s2606-finance-canonical-source-boundaries.test.js`; source produksi, bundle, aturan SOT, `OwnershipEngine`, kategori, formula saldo, struktur data, dan penyimpanan tidak diubah. Baseline `app-main (32).zip` tetap tidak diubah.

## Kontrak yang dikunci
1. `recalcAccBalance()` tetap menjadi sumber saldo per akun dan menghormati `hitungKas:false`, transfer masuk, dan transfer keluar.
2. `totalSaldoAkun()` tetap memakai `includeInBalance`, pengecualian akun tertaut aset, dan `isAccOwnershipSelf()` yang menggunakan `OwnershipEngine`.
3. Status pembayaran tagihan per periode tetap ditentukan helper `getBillPaidThisPeriodInfo()` dan digunakan oleh proyeksi yang sudah ada; API alokasi tidak membaca atau menjumlahkan `D.bills` secara mandiri.
4. Integrasi cicilan dan utang tetap berada di kontrak `DebtOptimizerAPI`/`DebtStrategy`; API alokasi tidak menjumlahkan utang/tagihan lagi.
5. Sumber dana darurat tetap berada pada `FinancialRiskDashboardAPI`; API alokasi tidak membuat hitungan cadangan tandingan.
6. `safeInvestableAmount` tetap `null` dan `investmentAllowed` tetap `false` sampai kas bebas aktual dibuktikan dari kontrak sumber kanonis tanpa duplikasi.

## Hasil tes
- Tes terpilih lintas S2601–S2606: **24 lulus, 0 gagal, 0 dilewati**.
- `release-ui-gate.js`: lulus (domain-contract 12/12; critical-ui 15/15; critical-integrity 6/6).
- `sot-integrity-gate.js`: lulus, runtimeSources=413, HTML/SW versi 2602.
- `verify-bundle-freshness.js`: bundle A dan B segar.
- `verify-patch-contamination.js`: lulus.
- `performance-budget.js`: lulus; seluruh berkas dalam batas. `pwa-ui-layer.css` 14,983/15,000 byte, margin 17 byte.
- `architecture-integrity-gate.js`: lulus, runtime entries=413.
- Full suite tidak dijalankan pada tahap ini; hasil di atas bukan klaim kelulusan full suite.

## Keputusan
Belum ada dasar aman untuk menampilkan nominal investasi. Tahap S2606 sengaja menambah kontrak regresi, bukan menambahkan rumus kas bebas atau mengubah aturan SOT/kepemilikan. Seluruh nominal investasi tetap dikunci sampai sumber kanonis yang ada dapat membuktikan rekonsiliasi end-to-end.
