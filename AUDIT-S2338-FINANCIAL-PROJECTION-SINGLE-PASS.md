# S2338 — Financial projection aggregation pass reduction

## Finding
`FI.monthlySurplus()` filtered the selected transactions into a temporary array, then filtered that array separately for income and expense. `Pensiun.avgSurplus()` used the same multi-pass pattern. `SalaryAllocation.avgMonthlyIncome()` also parsed each eligible income transaction date twice.

## Change
- `FI.monthlySurplus()` now aggregates eligible income and expense in one transaction pass, retaining its selected month window, `hitungKas:false` exclusion, and treatment of missing `hitungKas` as eligible.
- `Pensiun.avgSurplus()` now aggregates income and expense in one pass while deliberately retaining the previous pension behavior, including its existing treatment of `hitungKas:false`.
- `SalaryAllocation.avgMonthlyIncome()` parses each eligible income date once and keeps the original date window and amount fallback (`amount || 0`).

## Validation
- Added `tests/s2338-financial-projection-single-pass.test.js` for output parity, filtering behavior, and source-level multi-pass regression checks.
- Ran S2333–S2338 focused tests, existing FI monthly-surplus tests, salary allocation tests, and `hitungkas-normalisasi-financial-calc.test.js`: 33/33 passed.
- Bundle freshness, performance budget, patch integrity, and contamination audits passed.

## Limits
This reduces array passes and repeated date parsing by algorithm inspection; no measured Android/WebView speed-up is claimed. Full test suite and production release gate still require the complete toolchain and target-device profiling. The build environment lacks `esbuild`, so generated bundles are valid but not minified.
