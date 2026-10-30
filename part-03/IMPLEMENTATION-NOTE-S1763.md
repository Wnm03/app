# S1763 — Runtime Lifecycle Idempotency & Baseline Drift Cleanup

## Scope
Audit lanjutan setelah refactor `self-test.js` S1762, fokus pada global lifecycle/timer yang dapat terpasang ulang bila bootstrap `init()` dipanggil lebih dari sekali, serta drift baseline dokumentasi.

## Implementasi
1. `modules/shared/app-init-runtime.js`
   - Tambah guard idempotensi `__kwRuntimeMaintenanceTimer` agar maintenance `setInterval(5 menit)` hanya dipasang sekali.
   - Tambah guard idempotensi `__kwRuntimeLifecycleInstalled` agar listener `visibilitychange`, `freeze`, dan `pagehide` hanya dipasang sekali.
   - Memisahkan pemasangan maintenance dan lifecycle ke helper kecil, tanpa mengubah interval/fungsi callback yang ada.
2. `tests/runtime-lifecycle-idempotency-1763.test.js`
   - Regression contract memastikan guard dan titik pemasangan listener/timer tetap tunggal.
3. `docs/AUDIT_MATRIX.md`
   - Sinkronkan Coverage Baseline dengan inventory `build.js`: 2000 total, 1196 JS, 687 MD, 7 HTML, 40 JSON, 4 CSS.
4. Build release
   - Build menjadi `s748-carnotes-regression-1759`.
   - Bundle A/B, HTML, SW, dan source versioned module tersinkron otomatis oleh build.
5. S1762 tetap dibawa kumulatif, termasuk refactor `self-test.js`, split case registry, app-init extraction, stale cache-bust test fix, dan S1761 retired Theme Pro deletion manifest.

## Validation
- `node --check modules/shared/app-init-runtime.js` — PASS
- targeted regression suite — **19/19 PASS**
- `verify-bundle-freshness.js` — PASS
- `verify-window-expose.js` — PASS (82/82)
- `verify-carnotes-performance.js` — PASS
- `verify-carnotes-integrity.js` — PASS (341 scanned, 0 forbidden, 0 duplicate IDs, 1 ServisDeclarations)
- build lint — PASS, termasuk no active source JS >1600 lines
- `docs/AUDIT_MATRIX.md` drift warning — cleared after baseline update

## Environment note
`esbuild` tidak tersedia, sehingga bundle hasil build valid dan lolos `node --check` tetapi belum diminify.
