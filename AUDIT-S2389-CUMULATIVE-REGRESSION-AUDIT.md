# S2389 — Audit regresi kumulatif S2369–S2388

Tanggal: 2026-10-03
Baseline: `app-main (16).zip`
Ruang lingkup: audit gabungan atas source, bundle, manifest penghapusan, integritas navigasi/fitur, persistence, PWA recovery, arsitektur, dan anggaran ukuran.

## Hasil yang diverifikasi

- `verify-patch-integrity.js`: PASS; sebelum penambahan dokumen S2389, manifest melaporkan 56 apply files dan 2 delete entries.
- `verify-delete-manifest.js`: PASS; `pro-ui-layer.css` tetap tidak ada sesuai delete manifest.
- `verify-version-integrity.js`: PASS; source/runtime version `s2041-1-part-sot-hardening-2240`, HTML `?v=2240`, SW `kw-cache-v2240` sinkron.
- `verify-carnotes-integrity.js`: PASS; 517 source files scanned, tidak ada forbidden source atau duplicate IDs.
- `verify-carnotes-performance.js`: PASS.
- `verify-window-expose.js`: PASS; 83 modul data-action terverifikasi.
- `persistence-integrity-gate.js`: PASS.
- `pwa-recovery-integrity-gate.js`: PASS.
- `feature-regression-gate.js`: PASS.
- `architecture-integrity-gate.js`: PASS; 405 runtime entries.
- `release-ui-gate.js`: PASS, termasuk bundle freshness, patch contamination, dan performance budget.
- `verify-test-runner-determinism.js`: PASS.
- Tes terfokus S2369–S2388: 50 passed, 0 failed.

## Penghambat / risiko yang ditemukan

1. `verify-release-ready.js` tetap EXIT 1 karena ESLint tidak tersedia di environment dan bundle belum diminifikasi karena `esbuild` tidak tersedia. Ini adalah penghambat release gate yang nyata; jangan menganggap ZIP sebagai paket release-ready.
2. Full test runner `node scripts/run-full-test.js` tidak selesai dalam batas waktu 180 detik pada percobaan audit ini. Hasilnya tidak boleh dicatat sebagai pass atau fail; full-suite status tetap belum terkonfirmasi.
3. Anggaran ukuran mendekati batas: `index.html` 319791/320000 byte, `app_production.html` 319984/320000, `styles.css` 179550/180000, `pwa-ui-layer.css` 14987/15000, bundle B 4929172/5000000. Jangan menambahkan inline code/CSS besar tanpa mengukur ulang.
4. `modules/vehicle/servis.js` 1988 baris mendekati guard cap 2000. Refactor harus dilakukan terpisah dan diuji dengan kontrak perilaku servis/rollback.
5. Audit duplicate-symbol menghasilkan 264 nama simbol berulang pada 514 file JS; temuan ini advisory, bukan bukti 264 bug. Perlu triase manual sebelum deduplikasi karena sebagian merupakan salinan modul yang disengaja.

## Keputusan

S2389 tidak mengubah runtime source atau bundle. Gate fungsional utama yang dijalankan lulus, tetapi status release penuh tetap **BELUM TERVERIFIKASI** akibat lint/minification yang tidak tersedia dan full suite yang timeout. Tahap selanjutnya harus menyelesaikan lingkungan lint/minification dan memperoleh hasil full suite sebelum optimasi runtime baru ditambahkan.
