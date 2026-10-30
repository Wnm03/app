# Audit S2364–S2367 — Cache, Lifecycle, and Forecast Scan

## Scope
Follow-up static/targeted audit after cumulative S2341–S2363. This pass checks cache invalidation contracts, repeated transaction scans, and listener cleanup. It is not a substitute for device profiling or a full release gate.

## S2364 — Listener lifecycle
- The service-photo lightbox uses a retained keydown handler and removes it through the close path.
- Regression coverage includes 50 open/close cycles and the case where another UI path removes the overlay before the close function runs.
- This verifies the tested lightbox path only; static `addEventListener` counts do not prove runtime leaks elsewhere.

## S2365 — Cache invalidation contract
- Finance Intelligence and cashflow forecast caches are intended for no-argument render-burst calls.
- Explicit range/options calls bypass the singleton cache.
- Canonical `save()` is the mutation boundary for invalidating account-balance, forecast, and Finance Intelligence caches when `financeMutation` is enabled.
- Existing tests cover cache reuse, explicit bypass, and manual invalidation. Runtime mutation flows still require browser/device validation.

## S2366 — Cashflow forecast scan reduction
- `computeCashflowForecast()` previously filtered transactions by date/cash flag, optionally filtered by account, then filtered again for income and expense totals.
- The aggregation now performs one transaction loop, applying the same date, `hitungKas`, and account conditions before adding to income/expense totals.
- Transaction order within each aggregate and the existing amount addition semantics are preserved. Non-income/expense types remain excluded from totals.

## S2367 — Validation
- Added behavioral tests for account-specific forecasts, `accountId: 'semua'`, `hitungKas:false`, transfer exclusion, and the single-loop contract.
- Focused tests do not claim full-suite or Android/WebView success.

## Release status
Source patch only. Do not release until the project-pinned build toolchain is restored, bundles are regenerated, bundle freshness/version/delete-manifest/release gates pass, the full test suite completes, and key Android/WebView flows are profiled.
