# PATCH-MANIFEST-S2529

- Baseline: `app-main (14).zip` / runtime v2272
- Cumulative lineage: S2520 + S2521 + S2522 + S2523 + S2524 + S2525 + S2526 + S2527 + S2528, **rebased safely onto app-main (14)**
- Scope: carry only changes from S2520–S2528 that do not overwrite later baseline-14 SOT/continuity/theme contracts.
- Generated production bundles from the old S2528 lineage are intentionally excluded.
- Apply files: 43 (S2529 refinement, verified: full test 8653 tests, 0 fail, after build + refresh-file-hashes)

## Rebase rules
- Preserve baseline-14 implementations when S2520–S2528 would overwrite a newer implementation.
- No authoritative SOT/schema/migration/ownership contract is replaced by this rebase.
- Full production minification remains blocked until the real build toolchain is available.

## S2529 refinement (post full-test)
- `modules/vehicle/sparepart-servis.js` DROPPED (keeps baseline-14): S2522-S2528 "no-history candidate" + historyRows fallback broke maintenance rules v2/v3 and master-category dashboard badge tests.
- `modules/shared/modules-calc.js`: kept Number()/date-local hardening; REMOVED the `hitungKas===false` skip in Pensiun avgSurplus (S2338 contract preserves legacy treatment).
- `modules/shared/modals.js`: kept CSP migration (data-on* + named wrappers). Three legacy source-text tests updated to the new wiring contract (titipan gap-check, S2034 modal selectors, sparepartName 4-call chain); behavior unchanged.
- After applying: run `npm run build` (needs esbuild) then `python3 scripts/refresh-file-hashes.py --write`.

BEGIN_APPLY_FILES
.github/workflows/production-release.yml
DEPLOY-GITHUB.md
FILE-HASHES-SHA256.txt
build.js
modules/asset/investasi.js
modules/dashboard-hub/dashboard-hub.js
modules/finance/akun.js
modules/finance/cicilan.js
modules/finance/piutang-utang.js
modules/finance/tagihan-kalender.js
modules/shared/modals.js
modules/shared/modules-calc.js
modules/vehicle/fuel-card.js
modules/vehicle/fuel-compare.js
modules/vehicle/fuel-dashboard.js
modules/vehicle/fuel-export-utils.js
modules/vehicle/fuel-fleet-selector.js
modules/vehicle/fuel-gauge-engine.js
modules/vehicle/fuel-insight-engine.js
modules/vehicle/fuel-intelligence-engine.js
modules/vehicle/fuel-intelligence-ui.js
modules/vehicle/fuel-storage.js
modules/vehicle/fuel-tank-profile.js
modules/vehicle/fuel-trend-dashboard.js
modules/vehicle/part-crud-s2041.js
modules/vehicle/service-history-bulk-identity-editor.js
modules/vehicle/service-history-legacy-multicomponent-reload-s2029.js
modules/vehicle/servis-checklist.js
modules/vehicle/servis.js
modules/vehicle/vehicle-core.js
package.json
scripts/verify-no-inline-event-attrs.js
scripts/verify-patch-integrity.js
tests/audit-dashboard-repairs-s2520.test.js
tests/audit-post-s2521.test.js
tests/audit-post-s2522.test.js
tests/audit-post-s2523.test.js
tests/audit-post-s2524.test.js
tests/audit-post-s2525.test.js
tests/audit-post-s2529.test.js
tests/s521-titipan-expense-ui.test.js
tests/service-category-component-history-audit-s2034.test.js
tests/servis-mastercategory-modalbadge-sesi-d-lanjutan2b.test.js
END_APPLY_FILES

BEGIN_DELETE_FILES
END_DELETE_FILES
