# PATCH — Fix pre-existing gates on app-main (24)

Base: `app-main (24)`

## Changed files

- `index.html`
- `app_production.html`
- `modules/vehicle/sparepart-servis.js`
- `app-bundle-b.min.js`

## Fixes

1. **Cache/version synchronization**
   - `index.html` and `app_production.html` now use the canonical numeric release version `?v=2007` consistently.
   - This matches `APP_BUILD_VERSION = s2013-service-regression-hardening-2007` and `sw.js` `kw-cache-v2007` already present in the baseline.
   - No change to `sw.js` was necessary.

2. **Sparepart master-category filter fallback**
   - `Sparepart._loadMasterCategoryFilterPrefsOnce()` now falls back to `DatabaseAPI.masterCategory.getAll()` when `ServiceTaxonomySOT` is not available.
   - `renderMasterCategoryChips()` uses the same canonical DatabaseAPI fallback.
   - This preserves the ServiceTaxonomySOT path when available and avoids an unnecessary empty/invalid UI path during partial-load/test contexts.

3. **Runtime bundle**
   - `app-bundle-b.min.js` was rebuilt from the fixed source so production runtime receives the same fix.

## Verification

Targeted regression gate after the fix: **27/27 PASS, 0 FAIL** across:

- SA13 version/cache synchronization
- fresh-install cache integrity
- S1903/S1904 cache routing
- performance cache-busting synchronization
- sparepart master-category chip/persistence tests

Build syntax checks for both bundles: **PASS**.

Note: a complete `npm test` run was attempted in the environment but exceeded the execution time limit before producing a final suite summary; therefore no claim of full-suite 100% is made from that run.
