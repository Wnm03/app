# SA-I — Cumulative follow-up fixes

## Vehicle / Sparepart
- Scope service prefill stock lookup by active vehicle.
- Scope sparepart category CSV preview/commit to current vehicle, with global-category fallback.
- Stamp newly imported categories with `vehicleId`.

## Finance / performance
- `FinanceIntelligence.incomeVsExpense()` builds one account `Map` per computation instead of scanning accounts for every transaction.
- `FinancialHealthScoreAPI.summary()` reuses one score overview.
- `FinancialRiskDashboardAPI.summary()` reuses one risk-factor list.
- `BudgetRecommendationAPI.summary()` reuses one spending analysis.
- WorthIt explicitly warns when current balance is `<= 0` while the purchase requires cash/DP.
- Removed redundant filter-reset ternaries.

## Regression
- `tests/sa-c-category-csv-vehicle-scope.test.js`
- `tests/sa-e-cross-vehicle-stock-isolation.test.js`
- `tests/financial-health-score-api.test.js`
- `tests/financial-risk-dashboard-api.test.js`
- `tests/s653-budget-recommendation-api.test.js`
- `tests/worthit-numeric-guard-s403.test.js`
- `tests/ownership-sync-keuangan.test.js`

All targeted tests passed in the merged tree.
