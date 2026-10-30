# S1831 — Baseline Cleanup / Theme Pro Rollback Closure

## Scope
Close the two recurring baseline failures caused by the retired root-level `pro-ui-layer.css` remaining physically present in app-main__26.

## Findings
- `DELETE-FILES.txt` already declares `pro-ui-layer.css` retired.
- `modules/vehicle/pro-mockup-presenter.js` is already absent.
- root `run-full-test.js` is already absent.
- No active production source reference to `pro-ui-layer.css` was found outside test fixtures/documentation.
- The remaining physical file was therefore a stale retired artifact.

## Change
- Deleted `pro-ui-layer.css` from the working tree.
- No runtime/business logic was changed.
- No rollback test was weakened or removed.

## Validation
Baseline gates after deletion:
- `carnotes-theme-pro-rollback`: PASS (2/2)
- `delete-manifest-contract-s1780`: PASS (2/2)
- `pro-ui-theme-contract`: PASS (1/1)
- Combined baseline cleanup gate: **5/5 PASS**

Build validation:
- `node scripts/build.js`: PASS
- generated bundles syntax check: PASS
- HTML/SW version synchronization: PASS
- Build produced version 1818 artifacts; esbuild was unavailable, so bundles are valid but unminified.

Full-suite note:
- The local environment did not complete the entire `node --test tests/*.test.js` run within the available execution window after cleanup; therefore this report does **not** claim a new full-suite count.
- The immediately preceding S1830 full-suite result supplied for this cumulative line was 6,999 tests / 6,997 pass / 2 baseline failures, with 0 S1830 regressions. The two baseline failures are now directly closed by this deletion and the targeted gates above pass.

## Cumulative patch content
This release patch is cumulative at source/test/report level for S1826 → S1831. It carries the latest versions of:
- S1826 catalog write-SOT audit gate
- S1827 scan/import/export data integrity hardening
- S1828 import identity + restore schema gate
- S1829 Car Notes JSON round-trip identity/orphan hardening
- S1830 Shop JSON identity-first round-trip hardening
- S1831 retired Pro UI layer cleanup

The patch remains **source-only**; generated bundles/backups are intentionally excluded.
