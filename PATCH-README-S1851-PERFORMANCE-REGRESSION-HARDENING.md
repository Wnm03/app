# S1851 — Performance Regression Hardening

Cumulative follow-up to S1841–S1850.1.

## Findings fixed
- `txHTML()` had an S1846–S1849 regression: standalone callers could hit `ReferenceError: catsByName is not defined`. Added a local render-context/index fallback.
- `computeCashflowForecast()` used `getCachedTxDateMs()` without a standalone fallback, breaking isolated consumers/tests. Added `_txPerfDateMs()` fallback to native Date parsing.
- `showFilteredTx()` eagerly called `getAllCats()` even when isolated callers did not provide it. Added a safe empty-category fallback.
- Updated the persistence race contract for the S1850 flush path: mirror writes are now intentionally three sites (queued save, flush, startup recovery).

## Validation
- Targeted performance/regression suite: 21/21 PASS.
- S1841/S1843/S1844/S1845/S1846–S1849 tests included and passing.
- Full suite was attempted with 32 shards; the sandbox did not complete within the execution window. No full-suite PASS claim is made.

## Scope
No schema changes. No feature removal. No UI redesign. No intentional behavior change beyond restoring pre-regression compatibility and safe standalone fallbacks.
