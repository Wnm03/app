# PATCH-MANIFEST-S2537 — kumulatif S2530–S2536 + perbaikan gate release (non-SOT)

Terapkan: timpa ke root app-main, proses DELETE-FILES.txt (hapus path yang dilist). Bundle/HTML/sw.js SUDAH di-build (v2273), tidak perlu build ulang.

## Akar masalah CI gagal (commit 0130baf)
- app-bundle-a/b.min.js basi (hash source != hash bundle) -> di-build ulang, hash segar.
- modules/shop/modules-render.js (DELETE-FILES) masih ada -> dihapus.
- app_production.html menyimpang dari index.html (SOT) -> digenerate ulang oleh build.js.
- DELETE-FILES.txt patch sebelumnya menimpa entri pro-ui-layer.css -> dikembalikan (test dashboard-slim-performance-regression).
- FILE-HASHES-SHA256.txt di-refresh.

## Verifikasi (sandbox)
- verify-bundle-freshness: OK. verify-window-expose: OK. Test file patch (171): 170 pass + 1 diperbaiki (DELETE-FILES) -> 5/5 pass file terkait.
- NOT VERIFIED: ESLint (tidak terpasang), minify esbuild (bundle belum diminify; CI `build:release` akan menge-build ulang), full suite 32 shard (timeout di sandbox).

## Tambahan kumulatif: S2273 Startup TDZ Gate
- Ditambah: scripts/audit-startup-load-order.js, scripts/build-lints.js (lint blocking `startup-load-order-tdz`), tests/startup-load-order-tdz.test.js, PATCH-MANIFEST-S2273-STARTUP-TDZ-GATE-20261008.md.
- tests/s2388-cumulative-chain-manifest-completeness.test.js disinkronkan: DELETE-FILES kumulatif boleh memuat path retired lain, baris `pro-ui-layer.css` tetap wajib ada.
- Audit startup TDZ: PASS (412 sumber).
- Full suite (`run-full-test.js`, 32 shard, concurrency 1): 8692 tests, 8691 pass, 0 fail, 1 skipped.
- Gate rilis lokal tinggal 2 yang bergantung environment: lint (eslint tidak terpasang) dan minify (esbuild tidak terpasang); CI memasangnya sendiri.
