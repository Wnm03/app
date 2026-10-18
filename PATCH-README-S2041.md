# PATCH S2041 — Service Interval SOT Consistency (Cumulative)

Baseline: `app-main (22).zip`. This patch accumulates S2038, S2039, S2040 plus S2041.

## Root cause grounded in the user's 2026-10-17 backup
For Xenia / Oli Mesin, service log at 2026-10-13 KM 235066 stores `intervalKmAtService=4000` while `nextDueKm=238066`, only 3000 km after the service. The active `ServiceIntervalSOT`/manual interval was 3000 km, while the checklist/master projection still supplied 4000 km. The reminder calculation used the active SOT interval but checklist history persisted the stale master interval.

## Fix
- Added `resolveServiceEventIntervalSnapshotValue()` so event interval snapshots resolve the active canonical interval first. Master/category interval values are fallback only when no canonical SOT value exists.
- Updated checklist service-history writes to use the same resolved interval for `intervalKmAtService` / `intervalBulanAtService` as the reminder engine and next-due snapshot.
- Preserved prior S2038–S2040 replacement-vs-cleaning-vs-inspection semantics.

## Verification
- Targeted interval/SOT/history/full-flow tests: 38/38 pass.
- `node scripts/build.js --require-minify`: passed; production bundles syntax checked; version 2561.
- `npm run verify-bundle`: passed.
- `npm run verify-window-expose`: passed.
- Full suite and `service-sot-gate` are not claimed as passed.

## Deployment
Overlay every file in this ZIP. Upload source, both bundles, HTML and `sw.js` together; hard-reload/clear service-worker cache. This patch does not rewrite old history automatically; existing contradictory snapshots remain historical records unless explicitly migrated.
