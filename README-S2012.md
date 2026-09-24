# S2012 — FIX ODOMETER VALIDATION DIRECTION

## Root cause
`Servis.validateServiceOdometer()` consumed the canonical `compareServiceHistoryRecency()` comparator with the wrong sign when assigning `previous` vs `next`.

The comparator is newer-first: `compare(a,b) < 0` means `a` is newer than `b`.
The validator previously interpreted `rel > 0` as `next`, reversing the meaning.

This caused valid historical service records to be compared against an older record as if it were the next service, producing `above_next_service` broadly during restore.

Observed S2011 runtime result:
- invalid: 80
- code: above_next_service=80
- veh_1=74
- veh_1782969767698=6

## Fix
Only the two relational branches were corrected:
- `rel < 0` => `next`
- `rel > 0` => `previous`

No backup data, KM values, service history, or reminder data are changed by this patch.

## Regression test
`tests/service-odometer-integrity-p22.test.js` now includes a production-comparator regression test.

Targeted tests:
- P22/P24 service odometer integrity: 10/10 PASS
- P23 service import/restore odometer integrity: 2/2 PASS

Build:
- app version: 2000
- both bundles: syntax-valid
- build completed successfully

Note: build environment did not have esbuild installed, so bundles are valid non-minified output.
