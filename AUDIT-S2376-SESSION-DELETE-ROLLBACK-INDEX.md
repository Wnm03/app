# S2376 — Single Index for Session-Delete Rollback

## Finding
When deleting a service session fails, the rollback path previously used `Array.find()` over `D.servisLogs` for each saved service row and over `D.transactions` for each saved transaction. Large sessions or transaction batches therefore repeated full-array scans on an error-recovery path.

## Change
- Build local first-match `Map` indexes for current service rows and transactions once inside the rollback handler.
- Reuse those indexes while restoring snapshots; add newly restored rows to the index so subsequent rows do not trigger duplicate insertion for the same ID.
- Preserve first-match behavior for duplicate IDs, snapshot restoration order, `FinanceTxSOT.create()` fallback behavior, and stock rollback ordering.
- No normal successful-delete path, persistence schema, event contract, or business rule changed.

## Validation
`tests/s2376-session-delete-rollback-single-index.test.js` checks the source contract and first-match semantics. This is a recovery-path complexity improvement, not a benchmark claim. Full-suite and release readiness must be reported separately.
