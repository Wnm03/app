# PATCH — CAR NOTES: TOTAL THEME PRO ROLLBACK + ALL RECOMMENDATIONS

## Baseline
`app-main (18).zip` is the sole baseline for this patch. The pre-Theme-Pro Car Notes DOM reference is `app-main (12).zip`.

## Implemented
1. Golden Car Notes DOM/layout anchors and regression contracts.
2. Permanent active-implementation guard against the retired Theme Pro layer.
3. Duplicate-ID / duplicate-DOM guard and single canonical `Servis` declaration guard.
4. Car Notes business-logic regression coverage remains enabled for Servis/checklist/reminder/history/BBM/fuel/finance/stock/catalog/photo/persistence.
5. Service-worker fresh-install/precache contract and offline Response fallback contract.
6. HTML/SW cache-version synchronization fixed at release 1754.
7. Bundle source-hash freshness rebuilt for both production bundles.
8. Source-size guard: 1600-line warning threshold plus explicit safety caps for the two known legacy oversized files (`build.js` 2550, `self-test.js` 2750) so they cannot grow silently.
9. Release gate now invokes the Car Notes integrity guard and source-size guard.
10. Added npm shortcuts: `audit:carnotes`, `audit:source-size`, `test:critical`.
11. Removed retired Theme Pro production files, mockup presenter, Pro CSS and obsolete Pro-only test/fixture files listed in `HAPUS-FILE-INI.txt`.

## Important preservation rule
Only the presentation/theme/routing layer identified as Theme Pro was removed. Existing Car Notes business logic and cross-module linkage were preserved.

## Verification
- Critical Car Notes/rollback/fresh-install/source-size suite: **10/10 PASS**.
- Car Notes + fuel + service/checklist/Servis/finance/stock targeted cumulative suite: **831/831 PASS**.
- Production hardening + release-version/cache + bundle-hash/freshness contracts: **16/16 PASS**.
- JavaScript syntax check across source tree: **1188/1188 PASS**.
- Bundle A/B `node --check`: **PASS**.
- Bundle freshness: **PASS**.
- Window expose: **PASS**.
- Active Theme Pro residual guard: **PASS (0 hits)**.
- Duplicate IDs: **0** in index and production HTML.
- Canonical `Servis` declarations: **1**.

## Full-suite note
`node --test tests/*.test.js` was started against the patched tree. The sandbox execution limit stopped it after test **2904**; no failure was reported in the observed portion. The dedicated Car Notes/service suite above completed successfully.

## Build note
The sandbox does not have `esbuild`, so the rebuilt bundles are valid but unminified. Release gate minification remains intentionally blocking unless a real environment limitation is explicitly overridden. Install `esbuild` and rebuild in the production/CI environment before a size-sensitive release.

## Patch application
This ZIP is patch-only. Overlay changed files onto `app-main (18).zip`, then process `HAPUS-FILE-INI.txt` as filesystem deletions. Do not delete or modify unrelated business-logic files.
