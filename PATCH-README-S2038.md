# S2038 — Per-component service interval reset semantics

Baseline: `app-main (22).zip`.

## Fix
- A scheduled action resets only the interval axis it represents.
- `bersih` resets the interval for a clean-only schedule when `bersih` is its configured schedule action.
- `periksa` (including `baik`, `mulai-aus`, or `aus` condition outcomes) does not reset replacement age unless the component's configured schedule explicitly uses that action as its own interval axis.
- For non-reset actions, due snapshots derive their baseline from the latest matching event on the relevant axis rather than treating any service history row as a reset.
- Existing historical snapshot behavior for `ganti`, `pasang`, and `overhaul` remains covered by regression tests.

## Changed files
See `PATCH-MANIFEST-S2038.txt`. The archive contains only files changed relative to the baseline, plus this README and manifest. Build-generated backup bundles and test-run checkpoints are intentionally excluded.

## Verification
- Targeted interval/reminder tests: **30/30 PASS**.
- ESLint on edited JS files: **0 errors**, 15 unused-variable warnings in `modules/vehicle/sparepart-servis.js`.
- `npm run verify-bundle`: **PASS**.
- `npm run verify-window-expose`: **PASS**.
- `node scripts/build.js --require-minify`: **PASS**, synchronized build version `2555`.
- Full test suite: **NOT VERIFIED** — full-suite runner exceeded the available execution window. Do not treat this patch as full-suite green.
- `npm run service-sot-gate`: **NOT VERIFIED** — command exceeded the available execution window.

## Apply
Extract this ZIP over the same baseline, preserving paths. Then run the targeted tests and full verification gates in an environment with sufficient execution time.
