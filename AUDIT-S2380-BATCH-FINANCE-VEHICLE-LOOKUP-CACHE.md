# Audit S2380 — Cache vehicle lookups during batch finance event projection

## Finding
`Servis.markServicedBatch()` resolved each finance event's vehicle category with `D.vehicles.find(...)` inside the post-commit results loop. When a batch contains multiple service entries for the same vehicle, this repeats the same linear scan.

## Change
Add a local `Map` cache keyed by `entry.vehicleId`. The first encounter for each ID performs the same `Array.find(v => v.id === id)` lookup; subsequent entries for that ID reuse the result. This keeps strict equality and first-match duplicate-ID behavior, including caching an `undefined` result for missing IDs. The cache is local to this batch invocation and does not persist stale vehicle objects across calls.

## Safety boundaries
- Does not alter transaction writes, rollback paths, save timing, event ordering, or payload fields.
- The lookup remains lazy at the same finance-event branch, rather than eagerly scanning the whole vehicle list before lifecycle effects.
- Distinct IDs still perform their own lookup; only repeated IDs are avoided.

## Validation
Focused S2369–S2380 tests and bundle/version/delete-manifest checks are run for this cumulative artifact. Full-suite and release-gate status are reported separately; this audit does not claim release readiness unless those gates pass.
