# S2409 — VehicleSOTFleetIntegrity referenceAudit memory reduction

## Baseline
- app-main (53)
- cumulative through S2408

## Scope
`VehicleSOTFleetIntegrity.referenceAudit()` previously allocated a `refs` array for every service/transaction/stock catalog reference only to return `refs.length` as `referenceCount`.

## Change
- Replace the unused reference-object array with an O(1) `referenceCount` counter.
- Preserve `referenceCount`, `catalogCount`, issue ordering, and `missing_catalog_ref` semantics.
- Car-notes references remain non-counted exactly as before.
- No schema, persistence, SOT, or historical-data changes.

## Gates
- S2409 targeted: PASS
- S2409 differential old vs new: PASS
- Full vehicle suite: PASS
- Bundle-B residency contract: PASS after refreshing expected source size to actual measured value
- Cumulative replay mismatch: 0
- Production minified build: BLOCK / NOT COMPLETED because esbuild/node_modules unavailable
