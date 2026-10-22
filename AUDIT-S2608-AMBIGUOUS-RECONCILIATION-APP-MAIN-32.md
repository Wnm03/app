# S2608 — Audit kasus rekonsiliasi ambigu lintas sumber

## Ruang lingkup
Audit read-only atas pembayaran tagihan lama/tidak tertaut, kemungkinan pembayaran parsial atau nominal sama, saldo akun yang tertaut ke aset/holding, dan target dana darurat. Tidak mengubah source produksi, SOT, OwnershipEngine, formula saldo, bundle, atau skema data.

## Temuan dari source
1. `getBillPaidThisPeriodInfo()` memeriksa riwayat transaksi berdasarkan `billLinkId` dan periode pembayaran. Itu adalah jalur kanonis untuk status pembayaran periode.
2. `findFallbackBillPaymentTxId()` mencari transaksi expense tanpa `billLinkId` dengan kemiripan nominal dan nama/catatan. Komentar implementasi sendiri menyatakan pencocokan ini tidak menjamin 100%; karenanya kecocokan fuzzy tidak boleh dianggap bukti rekonsiliasi kas.
3. `DebtOptimizerAPI` menggunakan kontrak `DebtStrategy` untuk identitas cicilan dan menghindari penghitungan active count ganda. API alokasi tidak boleh menambahkan penjumlahan utang/tagihan kedua.
4. `linkedAssetAccountIds()` menggabungkan akun dari `D.assets` dan investment holdings; `totalSaldoAkun()` tetap menerapkan pengecualian akun tertaut dan aturan ownership kanonis.
5. Risiko dana darurat memakai `recalcAccBalance(accountId)` bila target tertaut akun dan fungsi tersedia; jika tidak, ia menggunakan `saved`. API alokasi tidak boleh menjumlahkan kedua representasi.
6. Tidak ditemukan satu kontrak kanonis yang membuktikan rekonsiliasi menyeluruh antara kas aktual, pembayaran parsial/legacy, kewajiban periode, akun aset tertaut, dan cadangan dana darurat. Maka nominal investasi tetap terkunci.

## Perubahan S2608
- Menambahkan `tests/s2608-finance-ambiguous-reconciliation-fail-closed.test.js`.
- Tidak ada perubahan source produksi atau bundle.
- Memperbarui manifest dan laporan kumulatif.

## Hasil tes
- Tes alokasi terpilih S2601–S2608: **36 lulus, 0 gagal, 0 dilewati**.
- `release-ui-gate.js`: lulus (domain-contract 12/12, critical-ui 15/15, critical-integrity 6/6).
- `sot-integrity-gate.js`: lulus; runtimeSources=413, versi HTML/SW=2602.
- `verify-bundle-freshness.js`: kedua bundle segar.
- `verify-patch-contamination.js`: lulus.
- `performance-budget.js`: lulus; `pwa-ui-layer.css` 14.983/15.000 byte (tersisa 17 byte).
- `architecture-integrity-gate.js`: lulus, runtime entries=413.
- Full test suite dan E2E Chromium **belum dijalankan**.

## Integritas baseline
Baseline `/mnt/data/app-main (32).zip` SHA-256: `2ac36b3381fcb22ec1ae8cf8cda8e9df540b6c5bc4ec1629b59202567ac9f781` (tidak berubah).

## Status
Audit lanjutan lulus pada kontrak yang diuji, tetapi ini bukan bukti bahwa kas bebas aktual sudah dapat dihitung. `actualFreeCashVerified=false`, `safeInvestableAmount=null`, `investmentAllowed=false` tetap wajib dipertahankan.
