# S2277 — Eager Consumer → Lazy Loader Contract Audit

## Scope
Audit lanjutan S2276 untuk memastikan consumer eager yang memakai API dari feature lazy selalu memiliki jalur demand-load sebelum penggunaan. Fokus pada edge yang nyata dan berisiko cold-start, bukan refactor spekulatif.

## Audited contracts
- `modules/shared/features-helpers-global-security.js`: dispatcher `data-action` untuk Honda PDF, Data Health, Laporan Export, dan Shop PDF harus memetakan owner lazy ke loader canonical.
- `modules/finance/tx-stok-sparepart.js`: `txStockScanPartVia()` harus menunggu `ensureVehicleCatalogFeatureScripts()` sebelum membaca/memanggil `SparepartScanner`.
- `modules/shared/modals.js`: `laporanFabExportPDF()` harus menunggu `ensureLaporanExportScripts()` sebelum `exportLaporanPDF()`.
- `modules/shared/feature-lazy-loader.js`: kelima loader harus mengosongkan promise setelah rejection agar retry tetap tersedia.

## Result
Deterministic contract suite: **4/4 PASS**.

Tidak ada runtime production file yang diubah. S2277 hanya menambah audit script, regression contract, dan session note.

## Boundary
Test ini membuktikan source-level ordering/ownership contract. Ini bukan browser UI E2E dan bukan bukti bahwa setiap kemungkinan DOM event di semua perangkat telah dieksekusi.
