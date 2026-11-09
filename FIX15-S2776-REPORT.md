# FIX 15 KEGAGALAN — S2776 (v2776)
Basis: app-main (5) + PATCH-KUMULATIF S2775 (dipertahankan). Overlay; hapus 5 path retired via DELETE-FILES.txt (`node scripts/apply-delete-manifest.js`).

1. 3 tes retired-path (s1780, s1608, s2308): file lama dihapus lewat delete-manifest.
2. car-notes-json-roundtrip-s1829: harness tes memuat `_bbmImportKey`.
3. vehicle-odometer-advance-guard-s2742: jam sandbox dibekukan (tes tak lagi bergantung tanggal nyata).
4. 10 tes Fuel Bar Sync (S2434): `reconcileFuelStateFromLogs()` (alias lama dipertahankan), `appliedBbmIds` di estimator & baseline full-tank, snapshot koreksi manual legacy, parsial tidak menulis fuelState, impor CSV tidak menganggap semua baris full-tank, cascade/BBM.del memakai rekonsiliasi tunggal. 4 tes s420 disesuaikan ke desain baru.

Hasil: full suite 9572 tes, 0 gagal. Gate lulus: bundle-freshness, window-expose, service-sot, sot, architecture, persistence, pwa-recovery, hash 58/58.
Belum/tidak termasuk: lint & minify (sandbox), release-gate docs-sync & no-personal-data (gagal juga di baseline), browser.
