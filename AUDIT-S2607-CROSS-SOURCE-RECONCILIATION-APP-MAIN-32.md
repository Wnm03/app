# Audit S2607 — Kontrak Rekonsiliasi Lintas Sumber Keuangan

## Ringkasan

S2607 meneruskan patch kumulatif S2606 dengan audit kontrak read-only. Tidak ada source produksi, bundle, schema/storage, aturan SOT, `OwnershipEngine`, atau formula saldo yang diubah.

## Temuan kontrak yang diverifikasi

1. **Pembayaran tagihan:** `getBillPaidThisPeriodInfo()` menggunakan transaksi dengan `billLinkId === bill.id` dan frekuensi tagihan untuk menentukan periode pembayaran. Pencocokan transaksi legacy berdasarkan nama/nominal/tanggal adalah jalur fallback terpisah; kandidat ambigu tidak boleh di-self-heal diam-diam. Karena fallback lama bukan relasi identitas sekuat `billLinkId`, ia tidak layak menjadi dasar nominal kas bebas otomatis.
2. **Cicilan dan utang:** `DebtStrategy.activeDebts()` menggabungkan utang riil dengan bentuk debt-like dari cicilan tagihan; bentuk cicilan mempertahankan identitas sumber lewat `id: 'bill:' + b.id` dan `_billId`. `DebtOptimizerAPI` memakai `activeDebts()` untuk hitung jumlah aktif tanpa menambah jumlah cicilan sekali lagi.
3. **DSR:** kontrak sekarang memisahkan cicilan utang formal (`Debt.totalCicilanBulanan()`) dan cicilan non-utang dari `D.bills`. Ini sumber perhitungan milik modul DebtStrategy; alokasi dana tidak boleh menyalin rumusnya.
4. **Akun tertaut aset/investasi:** `linkedAssetAccountIds()` menggabungkan ID akun dari `D.assets` dan holding investasi yang memiliki `accountId`; `totalSaldoAkun()` tetap mengecualikan akun tertaut dan menerapkan aturan kepemilikan SELF yang ada.
5. **Dana darurat:** `FinancialRiskDashboardAPI` memakai `recalcAccBalance(dd.accountId)` jika target tertaut ke akun dan fungsi kanonis tersedia; target manual tetap memakai `dd.saved`.

## Batas yang belum dapat dibuktikan

Sumber-sumber yang ada memiliki kontrak lokal masing-masing, tetapi belum menyediakan satu kontrak kanonis lintas domain yang membuktikan sekaligus: kas aktual bebas, pembayaran tagihan pada periode yang tepat, relasi cicilan/utang tanpa overlap, pengecualian akun aset/holding, serta cadangan dana darurat. Kunci `billLinkId` kuat untuk pembayaran tagihan yang tertaut, tetapi tidak menyelesaikan seluruh rekonsiliasi lintas domain.

Karena itu S2607 **tidak membuka nominal investasi**. `safeInvestableAmount` tetap `null`, `investmentAllowed` tetap `false`, dan status surplus tetap hanya klasifikasi proyeksi bulanan. Ini keputusan fail-closed, bukan klaim bahwa nominal kas bebas sudah dihitung.

## Perubahan S2607

- Menambahkan `tests/s2607-finance-cross-source-reconciliation-contract.test.js` berisi enam tes kontrak.
- Tidak mengubah source produksi, bundle, SOT, OwnershipEngine, formula saldo, ataupun penyimpanan.
- Baseline ZIP asli tetap tidak berubah.

## Hasil verifikasi

- Tes alokasi kumulatif S2601–S2607 terpilih: **30 lulus, 0 gagal, 0 dilewati**.
- `release-ui-gate.js`: lulus (domain-contract 12/12, critical-ui 15/15, critical-integrity 6/6).
- `sot-integrity-gate.js`: lulus; runtimeSources=413, versi HTML/SW=2602.
- `verify-bundle-freshness.js`: kedua bundle segar.
- `verify-patch-contamination.js`: lulus.
- `performance-budget.js`: lulus. Catatan: `pwa-ui-layer.css` 14.983/15.000 byte, tersisa 17 byte dari batas.
- `architecture-integrity-gate.js`: lulus; runtime entries=413.
- ZIP: diperiksa dengan `unzip -t`.
- **Full test suite tidak dijalankan** pada tahap ini. Tidak ada klaim lulus untuk full suite atau E2E Chromium.

## Integritas baseline

SHA-256 `app-main (32).zip`: `2ac36b3381fcb22ec1ae8cf8cda8e9df540b6c5bc4ec1629b59202567ac9f781` — sama dengan hash baseline yang tercatat sebelumnya.
