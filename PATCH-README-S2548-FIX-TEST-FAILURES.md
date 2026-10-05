# PATCH S2548 — Perbaikan kegagalan test (370 → 10)

Baseline: app-main__8_ + PATCH-S2282-S2548-PATCH-ONLY-CUMULATIVE.
Full suite sebelum: 8538 tes / 370 gagal (104 file). Sesudah: 8538 tes / 10 gagal (semua gate bundle).

## Perubahan source (4 file)
- data-health-check.js — runDataHealthCheck() tidak lagi crash tanpa DOM; kembalikan `issues` bila elemen tidak ada (~100 tes).
- modules/finance/finance-category-sot.js — updateSubcategory(): tx legacy tanpa categoryId dicocokkan lewat nama kategori induk (S2461).
- modules/finance/tx-stok-sparepart.js — applyStockPurchase/revertStockPurchase kembali emit `finance.updated` {kind:'stok-sparepart'} lewat StockCommandSOT (kontrak S2296).
- modules/shared/backup-restore.js — invalidasi snapshot ulang sebelum `atomic-restore-persist` (rekonsiliasi taksonomi S2509 memutasi D setelah invalidasi pertama).

## Perubahan test/harness (13 file)
- tests/helpers/loadSource.js — auto-load FinanceTxSOT, `document` inert, `crypto`, cluster UI Sparepart; taksonomi lenient HANYA untuk SOT yang di-autoload (tes yang memuat FinanceCategorySOT sendiri tetap fail-closed). Export `installLenientTaxonomy`.
- 12 tes disesuaikan dengan kontrak/DOM terkini (lihat daftar di bawah).

## WAJIB sebelum rilis (belum bisa di sandbox — esbuild tidak tersedia)
Source berubah, bundle belum di-rebuild:
    node scripts/build.js --require-minify
    node scripts/verify-bundle-freshness.js
10 tes yang tersisa (s1904, s1906, s1930, s2152-p4-7, s2252, s2391, s2423, s2511, s2519, servis-s1973) membaca bundle .min.js / cache-bust dan diharapkan lulus setelah rebuild.
