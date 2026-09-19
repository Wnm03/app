# S1844 — Performance Hot-Path Cumulative Patch

Cumulative on top of S1841 + S1842 + S1843. No prior patch files are intentionally removed.

## S1844 changes
- Cache parsed transaction dates with automatic invalidation when the source `t.date` value changes.
- Reuse cached timestamps in Dashboard, Finance, reports and cashflow forecast hot paths.
- Avoid repeated category-array scans during transaction row rendering by passing a `catsByName` index.
- Reuse category/account render indexes in Filter Transaksi and Target transaction lists.

## Compatibility
- No data schema changes.
- No feature/UI removal.
- Existing fallbacks remain for standalone callers that do not pass a render context.

## Validation
- S1841 + S1842 + S1843 targeted regression: 11/11 PASS.
- S1844 targeted hot-path tests: 3/3 PASS.
- Syntax checks: PASS for all modified JavaScript files.

Bundle A/B must be rebuilt by the project's normal build pipeline before deployment.
