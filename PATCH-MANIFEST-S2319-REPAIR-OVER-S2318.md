# PATCH MANIFEST — S2319 REPAIR over BASELINE 49 + CUMULATIVE S2318

Hasil verifikasi full test + build di atas baseline `app-main (49)`.

## Perbaikan
1. `tests/helpers/loadSource.js` — auto-prepend `finance-tx-sot.js` untuk `car-notes.js` / `chat-action-handlers.js` (S2309 memakai `FinanceTxSOT.create`). Menutup 8 test BBM/fuel.
2. `tests/carnotes-transaction-integrity-audit-1739.test.js` — regex menerima `FinanceTxSOT.create`.
3. `tests/s2310-event-outbox-duplicate-replay.test.js` — `Array.from()` untuk menghindari mismatch array lintas realm VM di strict deepEqual.
4. `tests/s2275-service-worker-cache-contract.test.js` — nama cache dibaca dari `sw.js` (version-agnostic).
5. `s2308-shadow-module-runtime-guard.test.js` dipindah dari root ke `tests/`.
6. Konstanta versi di `modules-render.js`, `modals.js`, `modules-calc.js`, `chat-action-handlers.js` diselaraskan 2210 -> 2211 (preflight build gagal sebelumnya), lalu build menaikkan ke `s2041-1-part-sot-hardening-2212`.
7. `app-bundle-a/b.min.js` DIBANGUN ULANG. Bundle-b dari patch S2318 punya syntax error (`_buildServiceSessionEditContext` di luar objek, baris ~36837); itu penyebab `s2152-p4-7-final-gate` dan `production hardening gate` gagal.

## Hasil
- Full test: 8210 tests, 8208 pass, 1 fail, 1 skipped.
- 1 fail tersisa = `S2252 GROUP_B residency manifest` — SUDAH gagal di baseline, bukan dari patch.
- verify-bundle-freshness, verify-window-expose, production-hardening-gate: PASS.
- verify-release-ready: GAGAL hanya karena lint (eslint) dan minify (esbuild) tidak tersedia di sandbox. Jalankan `npm i -D esbuild eslint` lalu `npm run release:preflight` di mesin Anda.
