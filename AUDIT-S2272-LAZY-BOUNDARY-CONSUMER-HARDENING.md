# S2272 — Lazy Boundary Consumer Hardening

## Temuan

Audit terhadap `app-main (48)` setelah S2271 menemukan satu regression runtime yang serupa dengan bug Google Drive S2271:

1. `modules/finance/tx-stok-sparepart.js` (`txStockScanPartVia`) adalah consumer eager, sedangkan `SparepartScanner` berada di cluster Vehicle Catalog yang sengaja lazy-loaded. Pada cold start, fungsi hanya memeriksa `SparepartScanner` dan dapat berhenti dengan `Fitur scan belum tersedia` tanpa pernah meminta lazy feature loader.
2. `computeModalSweepResults()` menjalankan beberapa opener yang berasal dari lazy Vehicle Catalog/Data Health/Laporan Export tanpa memastikan boundary lazy tersebut sudah dimuat. Ini dapat menghasilkan false failure `is not defined` pada diagnostic cold start.
3. Beberapa case Data Health pada `modules/shared/self-test-cases-a.js` dan `self-test-cases-b.js` sebelumnya melakukan silent `return` bila `runDataHealthCheck` belum tersedia. Ini dapat membuat coverage terlihat selesai tanpa case benar-benar dieksekusi.

## Perbaikan

- `txStockScanPartVia()` sekarang melakukan `await ensureVehicleCatalogFeatureScripts()` sebelum mengakses `SparepartScanner`.
- `computeSelfTestResults()` melakukan demand-load Data Health, Vehicle Catalog feature cluster, dan Laporan Export sebelum menjalankan case registry.
- `computeModalSweepResults()` melakukan demand-load boundary lazy yang relevan sebelum opener specs.
- Silent return Data Health diganti assertion eksplisit agar missing lazy dependency menjadi failure yang terlihat, bukan false-positive coverage.
- Lazy loader, SOT, storage, dan runtime ownership tidak dipindahkan atau diduplikasi.

## Verifikasi

- S2272 targeted lazy-boundary regression: **5/5 PASS**.
- Combined S2253/S2264/S2267/S2272 + stock + S2270 registration: **26/26 PASS**.
- `npm run build`: **PASS**, bundle syntax **PASS**.
- Build menghasilkan release version **2210** setelah replay S2271 (S2271 sudah membawa source version 2209).
- GROUP_B source residency setelah S2272: **369 files / 4,893,976 bytes raw** (naik 480 bytes dari S2271 karena self-test boundary preload guard).
- `eslint`/`esbuild` tidak tersedia; bundle valid tetapi belum diminify.
- Full aggregate suite tetap tidak dinyatakan PASS tanpa run yang selesai sampai final aggregate.

## Lineage

`app-main (47)` → S2254-REWORK2 → S2258 → S2261 → S2262 → S2264 → S2266 → S2267 → S2268 → S2269 → S2270 → S2271 → **S2272**.
