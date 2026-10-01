# S2226 — Full-Test Regression / Atomic Restore Closure

## Scope
Investigated the 38 failures reported against baseline after S2180–S2225.

## Confirmed runtime defects fixed
1. **Post-commit synchronous save failure rollback**
   - `FinanceCrossEntityAtomic.commit()` previously closed the transaction immediately after staging events.
   - A later synchronous `save()` failure could therefore leave D mutated and staged outbox events alive.
   - Added `rollbackAfterCommit()` plus `FinanceEventOutbox.discardStaged()`.
   - Applied to bill payment, Titipan Expense, and transaction delete commit-before-save callers.

2. **Restore rollback snapshot scope**
   - `snapJson` was declared inside the pre-restore `try` block and was therefore unavailable to the outer restore catch.
   - Moved its declaration to the restore function scope so post-commit rollback can persist the pre-restore snapshot.

## Test-harness contract repairs
Updated isolated source-test harnesses to load the same canonical dependencies used by production:
- `FinanceCrossEntityAtomic`
- `FinanceTxSOT`
- `BillDebtPiutangCanonicalWriter`

Updated stale assertions from pre-S2201 persistence contracts (`IDBStore.set`, `_savePersistChain`) to the current atomic `setMany`/CAS contract.

Updated backup harnesses for `IDBStore.getMany()` and atomic restore persistence.

## Verification
- Production syntax: **6/6 PASS**
- Focused regression set: **106/106 PASS**
- Persistence/restore/concurrency cluster: **33/33 PASS**
- S2197 save-failure rollback: **PASS**
- BUG-007/S285/S292/S303/V24: **PASS**
- Backup/restore S266: **23/23 PASS**

## Full suite limitation
`npm test` (`node --test tests/*.test.js`) contains 1136 test files and exceeded the execution timeout in this environment before producing a final aggregate summary. No `not ok` failure was observed in the captured portion; therefore the full 8089-test suite is **not claimed PASS** here.

The captured shard logs contained known isolated-harness diagnostics such as `migrateAssetInvestmentsToHoldings is not defined` and `fmt is not defined`; these did not appear as `not ok` test failures in the captured output.

## Release/build status
The minified production artifact remains environment-blocked by missing `esbuild`. No generated bundle is included in this patch.
