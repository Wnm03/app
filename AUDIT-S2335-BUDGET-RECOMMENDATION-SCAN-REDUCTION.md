# S2335 — Budget Recommendation Transaction Scan Reduction

Date: 2026-10-03  
Baseline: `app-main (52).zip` + cumulative S2333/S2334  
Build identity: `s2041-1-part-sot-hardening-2222` / `?v=2222` / `kw-cache-v2222`

## Finding

`BudgetReko.render()` previously asked for available history, income average, and category averages separately. `incomeAvgPerMonth()` and `computeCategoryAverages()` each called `effectiveMonths()` and `rangeFrom()`, which each call `monthsAvailable()`; the render therefore repeated complete transaction-history traversals while also filtering the history separately for income and expense categories.

## Change

- Add `BudgetReko.analyticsSnapshot()` to calculate the available-month count, selected analysis window, income total, and expense-category aggregates in two passes over the transaction array.
- `BudgetReko.render()` creates one snapshot and passes it to the income/category metric methods.
- Existing public `incomeAvgPerMonth()` and `computeCategoryAverages()` behavior is retained when callers do not pass a snapshot.
- No transaction data, category labels, storage schema, save behavior, or budget-application behavior is changed.

## Complexity / expected impact

For the recommendation render path, repeated scans used to derive the same month window are replaced with two snapshot passes, and the existing income/category aggregation reuses the snapshot. This is a source-level traversal reduction, not a claim about a specific millisecond improvement on Android/WebView.

## Validation

- `tests/s2335-budget-reko-analytics-snapshot.test.js`: **2/2 PASS**. Checks parity with legacy math on empty and mixed histories and verifies the render-local snapshot uses two transaction traversals.
- Cumulative selected performance tests: **33/33 PASS** across S2333, S2334, S2335, Car Notes deep performance, and the existing performance contracts.
- Bundle freshness: **PASS** for both generated bundles.
- Performance budget: **PASS**. `index.html` 319,791/320,000 bytes; `app_production.html` 319,984/320,000; `styles.css` 179,550/180,000; Bundle A 1,534,232/1,600,000; Bundle B 4,923,431/5,000,000.
- Patch integrity and contamination checks: **PASS**.
- Build generated syntactically valid bundles, but `esbuild` is unavailable; generated bundles are **not minified**.
- Full test suite and browser/device timing are not confirmed in this stage.

## Deployment status

Cumulative review/test patch only; **not release-ready** until production minification and the release gate/full suite complete successfully. Browser profiling with synthetic large datasets remains necessary to measure real-device latency and storage pressure.
