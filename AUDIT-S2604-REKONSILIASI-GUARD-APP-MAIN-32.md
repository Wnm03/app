# S2604 — Pengamanan Rekonsiliasi Alokasi Dana (read-only)

## Tujuan dan batasan
Tahap ini memperkuat kontrak agar API alokasi tidak menafsirkan ulang saldo, kepemilikan, kategori SOT, tagihan, utang, atau dana darurat. Aturan SOT, `OwnershipEngine`, sumber saldo kanonis, skema data, penyimpanan, dan source produksi tidak diubah.

## Perubahan kumulatif
- Menambahkan `tests/s2604-finance-allocation-reconciliation-guard.test.js`.
- Skenario uji memuat akun kas bebas, investasi, dana dikunci, akun dengan kepemilikan campuran, akun tertaut aset, transfer internal, transaksi `hitungKas:false`, tagihan lunas, cicilan yang beririsan dengan utang, dan dana darurat tertaut.
- Untuk proyeksi positif besar, surplus kecil, nol, dan negatif, API tetap tidak mengklaim kas bebas aktual; `safeInvestableAmount` tetap `null`, dan `investmentAllowed` tidak menjadi `true`.
- Sentinel memastikan API alokasi tidak memanggil `OwnershipEngine`, `FinanceCategorySOT`, `recalcAccBalance`, atau `DebtOptimizerAPI` untuk membuat perhitungan tandingan. Dashboard tetap memakai proyeksi yang diberikan pemanggil pada render yang sama.

## Hasil tes dan gate
- Tes terpilih finance, proyeksi, kepemilikan, SOT, dan residency bundle: **114 lulus, 0 gagal, 0 dilewati**.
- `release-ui-gate.js`: lulus.
- `sot-integrity-gate.js`: lulus; 413 sumber runtime, versi `s2595-carnotes-null-interval-guard-2602`, HTML/SW 2602.
- `verify-bundle-freshness.js`: bundle A dan B segar.
- `verify-patch-contamination.js`: lulus.
- `performance-budget.js`: lulus.
- `architecture-integrity-gate.js`: lulus; 413 entri runtime.
- Full-suite runner dicoba, tetapi proses melampaui batas waktu lingkungan dan tidak menghasilkan ringkasan akhir. Karena itu hasil full suite **tidak dinyatakan lulus**.

## Keputusan
Belum aman mengeluarkan nominal kas bebas atau nominal investasi. Proyeksi tetap hanya indikasi proyeksi. Rekonsiliasi aktual memerlukan pembuktian dari sumber kanonis, terutama overlap cicilan/tagihan/utang, status pembayaran per periode, akun tertaut aset, kepemilikan, dan dana darurat tertaut. S2604 sengaja tidak menambah formula baru maupun mengubah source produksi.

## Integritas baseline
Baseline `app-main (32).zip` tidak diubah. Patch kumulatif membawa patch S2603 sebelumnya dan menambahkan tes serta laporan tahap ini. Tidak ada file yang dihapus; `DELETE-FILES.txt` tidak diperlukan.
