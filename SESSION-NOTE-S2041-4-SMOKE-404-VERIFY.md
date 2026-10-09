# S2041.4 — Verifikasi temuan smoke-test & 404 cold start (docs-only, 0 source diubah, tetap v2281)

## 102 temuan smoke-test (71 ID + 31 data-action) = FALSE POSITIVE
- Smoke-test (hanya mode dev/localhost) jalan sebelum bundle B / loader lazy selesai, jadi owner belum ada saat dipindai.
- Cek runtime (Chromium, 6 dtk setelah boot, lalu klik nyata tiap tombol): `Renov`, `SewaKios`, `SparepartScannerUI`, `VehicleCatalogImportUI`, `VehicleCatalogWebImportUI`, `SparepartOcrCatalogAdd`, `RenovCalc` sudah berupa object; `ShopPdfImportUI` dan `HondaPdfImportUI` dimuat lewat `lazyOwnerLoaders` dispatcher saat diklik (features-helpers-global-security.js) dan jadi object. Klik `Renov.openProjectModal`, `SewaKios.openUnitModal`, `ShopPdfImportUI.open`, `VehicleCatalogImportUI.open`, `VehicleCatalogWebImportUI.open`: tidak ada toast error. 0 tombol diam.
- ID "hilang" (dashAccList, servisChecklistBody, vehAlertBody, investmentAssetLinkAction, page-dashboard, dll.): semua dirujuk lewat `getElementById` dengan guard null (render dinamis / elemen legacy). Bukan bug.
- Catatan kecil (bukan bug): scanner kamera memuat `@zxing/library@0.21.3` dari cdn.jsdelivr.net; gagal bila offline (toast "Gagal scan"). Wajar, tapi tidak ter-cache di SW bila belum pernah dipakai online.
- Saran opsional (belum dikerjakan): smoke-test bisa menunggu `window.__kwBundleBReady`/idle sebelum memindai agar log dev bersih.

## 404 saat cold start
Tidak direproduksi: server statis sederhana tidak mencatat satu pun 404 untuk app_production.html. Kandidat kuat: `/favicon.ico` (tidak ada `<link rel=icon>`; browser meminta default). Belum dapat dipastikan tanpa log request audit asli. Cek cepat: tab Network -> filter status 404.

## Masih terbuka
7 tes gagal pra-eksisting; ukuran transfer terkompresi bundle; durasi tulis IndexedDB; scroll FPS & daftar stok/riwayat servis ribuan baris; uji HP fisik.
