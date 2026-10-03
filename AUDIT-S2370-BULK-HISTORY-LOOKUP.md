# S2370 — Bulk service-history lookup optimization

## Finding
`modules/vehicle/service-history-bulk-identity-editor.js` repeatedly used `ids.map(id => D.servisLogs.find(...))` in five operations. For k selected records and n service logs, the lookup work could approach O(k*n) for each operation.

## Change
Build a first-match Map from the current `D.servisLogs` once per operation, then map selected IDs through it. This reduces lookup work to O(n+k) while preserving requested selection order and duplicates. The index is local to the operation, so there is no stale cross-call cache.

## Validation
- JavaScript syntax check passed.
- S2370 plus S1976/S1974 service-history tests: 15 passed, 0 failed.
- Full suite and release build not yet verified.
