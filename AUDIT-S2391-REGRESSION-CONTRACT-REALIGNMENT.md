# S2391 — regression contract realignment

## Scope

S2391 changes test assertions and measured residency metadata only; it does not modify runtime application source or generated bundles. The reported new failures were source-contract drift after existing single-pass/index optimizations, plus one GROUP_B measured-byte pin. They must not be treated as proof of runtime correctness on their own.

## Repairs

- Refresh GROUP_B source-byte pin from the checked-in audit script: 359 files, 4,914,176 bytes.
- Update stock matching contracts to assert the current single-pass ID/name traversal, vehicle scope, exact-vehicle preference, and rejection of ambiguous matches.
- Update checklist idempotency contract to assert the local Set index used to block duplicate keys, instead of requiring the removed repeated `ServiceEventIdempotencySOT.find(D.servisLogs, ...)` scan.
- Update rollback contract to the current `_rollbackLog.batchId === batchId` binding.
- Update deferred-save contract to assert the save guard and that the one batch save happens before the post-commit result loop; it no longer assumes the loop is the immediate next source line.

## Validation

The affected test files pass after the assertion updates. This is a static contract repair and does not establish full behavioral equivalence. The full suite, lint, minified build, and final release gate still need to run in an environment with the required tools.

## Risk / release status

No runtime behavior was changed in S2391. Do not mark the cumulative patch release-ready solely because the updated static tests pass.
