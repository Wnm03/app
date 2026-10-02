# S2263 — Car Notes render-purity and nested-tab patch

## Implemented
- Removed service-history normalization and legacy migration from `Servis.renderList()` / `Servis.renderReminder()` render paths.
- Removed category provisioning and legacy category reconciliation from `Sparepart.renderCatList()`.
- Made Insight and BBM nested tabs compute only the active subtab's presenter group.
- Added the missing `renderServiceIntegrityCard()` presenter using the existing incremental Car Notes audit/reconciler, without introducing a new engine.
- Added source-level regression tests for render purity, subtab branching, and integrity-card wiring.
- Accumulated the S2262 self-test bootstrap patch files into this patch workspace.

## Remaining verification / known limits
- `modules/vehicle/servis.js` remains above the S1918 1,900-line budget. Splitting its large `Servis` object safely requires a separate extraction with explicit build-order and API-contract verification; this patch does not disguise the gate by changing its threshold.
- Production bundles must be regenerated with the repository's required minified build (`npm run build`) before deployment. The current environment did not include `esbuild` at patch preparation time, so bundle freshness and production-runtime performance are not claimed as verified.
- Removing render-time provisioning means category provisioning must be run by startup recovery, import, or explicit repair/mutation flows. Existing canonical data is still rendered read-only.

## Validation
Run:
- `node --test tests/s2263-carnotes-render-purity-lazy-subtabs.test.js`
- `npm run audit:carnotes-advanced`
- `npm run audit:carnotes-performance`
- `npm run build`
