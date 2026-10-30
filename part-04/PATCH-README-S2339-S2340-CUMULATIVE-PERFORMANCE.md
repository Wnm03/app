# S2339 + S2340 — Cumulative performance source patch

Includes the prior S2338 cumulative patch contents plus these changes:

- **S2339** `modules/finance/finance-intelligence.js`: `incomeVsExpense()` aggregates income, expense, and `txCount` in one pass over transactions while retaining date range, account ownership filtering, and the existing implicit-range cache behavior.
- **S2340** `modules/finance/cash-projection.js`: computes bill paid status once per bill and reuses occurrence counts where needed; preserves calendar-mode `getBillStats()` as the gross-total source and cycle-mode gross total behavior. Paid bills are not occurrence-counted in calendar mode.
- Adds `tests/s2339-s2340-finance-single-pass.test.js`.

## Validation

- Focused S2339/S2340 tests: **3 passed, 0 failed**.
- Focused finance/cash-projection regression set: **136 passed, 0 failed**.
- `node --check` passed for both changed source files.
- A full `node --test tests/*.test.js` run exceeded the available 120-second command window; no full-suite pass is claimed.
- Build toolchain installation timed out; `esbuild` and ESLint are unavailable in this environment. Therefore this archive deliberately excludes `app-bundle-a.min.js` and `app-bundle-b.min.js` rather than shipping stale generated bundles.

## Release status — NOT READY TO DEPLOY

This is a cumulative **source/test patch**, not a production-ready release ZIP. Restore the project's pinned build toolchain, apply this patch to the matching baseline, run the production build, bundle-freshness/release gates, and full tests before deployment. Do not deploy until fresh bundles have been generated and verified.
