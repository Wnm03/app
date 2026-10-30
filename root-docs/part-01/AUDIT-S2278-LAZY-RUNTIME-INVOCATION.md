# S2278 — Lazy Feature Runtime Invocation Matrix

## Scope
Validate the next layer above S2274/S2277: after a real lazy-loader function completes, the representative API owned by that feature must be present and callable. Also verify a failed load does not create a falsely-ready API and remains retryable.

## Method
Deterministic Node VM contract using the production `modules/shared/feature-lazy-loader.js`. `_loadScriptOnce()` is stubbed only at the script-loading boundary and registers representative globals for the scripts that own those APIs. This is **not** a browser/Service Worker E2E test and does not replace manual/browser testing.

## Matrix
- Vehicle Catalog / Scanner → `SparepartScanner.scan()`
- Honda PDF → `HondaPdfImportUI.open()`
- Data Health → `runDataHealthCheck()` / `DataHealth.run()`
- Laporan Export → `exportLaporanPDF()` / `exportLaporanImage()`
- Shop PDF → `ShopPdfImportUI.open()`
- Failure path → rejected Data Health loader leaves API unavailable and permits retry

## Exit
PASS requires all representative APIs to be callable after demand-load and the failure path to remain retryable. No production runtime file is changed by S2278.
