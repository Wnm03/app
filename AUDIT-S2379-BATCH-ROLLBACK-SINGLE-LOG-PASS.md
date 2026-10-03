# S2379 — Batch rollback service-log single pass

## Finding
`Servis.markServicedBatch()` rollback previously traversed `D.servisLogs` once to build the set of IDs belonging to the failed batch and then traversed it again to remove those rows. The same decision can produce both outputs in one pass.

## Change
The rollback now snapshots the current log-array reference, builds `batchIds`, and builds the retained log array in a single loop. Transaction cleanup and stock restoration remain in their original order after the log partition.

## Semantics retained
- Batch membership remains strict equality (`batchId === batchId` value captured by the operation).
- IDs are collected in encounter order into a Set; duplicate IDs remain deduplicated as before.
- Unrelated rows, including null/falsey entries, remain in their original relative order, matching the prior filter predicate.
- Transaction cleanup still uses the same `batchIds`; stock rollback order and APIs are unchanged.

## Validation
See `tests/s2379-batch-rollback-single-log-pass.test.js`. This is a source-level regression guard and semantic test; it does not replace the complete application test suite or release gate.
