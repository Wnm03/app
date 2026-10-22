# S2605 — Fail-Closed Validation Alokasi Dana (read-only)

## Batas perubahan
- Meneruskan patch kumulatif S2604.
- Menambahkan `tests/s2605-finance-allocation-fail-closed.test.js` untuk menguji kondisi input proyeksi hilang/tidak valid, fallback forecast tidak tersedia/gagal, serta proyeksi positif besar.
- Tidak mengubah source produksi, bundle, aturan SOT, `OwnershipEngine`, kategori, formula saldo kanonis, struktur data, atau penyimpanan.
- Baseline `app-main (32).zip` tidak diubah.

## Temuan alur sumber
1. `FinanceDashboard.render()` mengambil satu `FinanceIntelligence.summary()` dan meneruskan `hook.cashflow` ke kartu alokasi pada render yang sama.
2. `FinanceIntelligence.cashflowSummary()` adalah wrapper atas `computeCashflowForecast()`; ini proyeksi, bukan bukti kas bebas aktual.
3. `totalSaldoAkun()` sudah menerapkan `includeInBalance`, pengecualian akun tertaut aset, dan `isAccOwnershipSelf()`. Menghitung ulang total di API alokasi akan membuat jalur SOT tandingan.
4. `DebtOptimizerAPI`/`DebtStrategy` menggabungkan jenis utang dan cicilan tagihan tertentu. Menjumlahkan raw bill dan debt terpisah tanpa kontrak ID kanonis berisiko duplikasi.
5. `getBillPaidThisPeriodInfo()` mengandalkan histori transaksi tertaut dan periode target; status `paid` sederhana bukan pengganti pemeriksaan per periode.

## Hasil tes
- Finance allocation + forecast + debt/budget/goal/SOT/residency terpilih: **113 lulus, 0 gagal, 0 dilewati**.
- `release-ui-gate.js`: lulus.
- `sot-integrity-gate.js`: lulus; runtime sources 413, HTML/SW versi 2602.
- `verify-bundle-freshness.js`: bundle A dan B segar.
- `verify-patch-contamination.js`: lulus.
- `performance-budget.js`: lulus; semua file di bawah batas.
- `architecture-integrity-gate.js`: lulus; 413 entri runtime.
- Full suite tidak dijalankan pada tahap ini; hasil di atas hanya suite terpilih dan gate yang tercantum.

## Perilaku yang dikunci
- Proyeksi pemanggil hilang, malformed, non-finite, atau forecast gagal -> `INSUFFICIENT_DATA`.
- Input proyeksi yang sudah disediakan pemanggil tidak memicu fallback diam-diam ke sumber kedua.
- Proyeksi positif hanya dapat diberi status `SURPLUS` proyeksi; `actualFreeCashVerified` tetap false, `safeInvestableAmount` tetap null, `investmentAllowed` tetap false.
- Tidak ada rumus kas bebas/kewajiban baru; SOT dan kepemilikan tetap menjadi satu-satunya sumber kanonis.

## Keputusan
Belum boleh menampilkan nominal investasi aman. Untuk mengubah keputusan ini, diperlukan kontrak rekonsiliasi eksplisit dari sumber kanonis yang sudah ada (termasuk periode pembayaran tagihan, overlap cicilan/utang, akun tertaut aset, dan cadangan), tanpa mengubah aturan SOT atau kepemilikan.
