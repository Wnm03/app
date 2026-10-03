# S2336 — Budget Period Context Reuse

Date: 2026-10-03  
Baseline: `app-main (52).zip` + cumulative S2333–S2335  
Build identity: `s2041-1-part-sot-hardening-2223` / `?v=2223` / `kw-cache-v2223`

## Finding

`Budget.getUsed()` called `Budget.matchesPeriod()` once per transaction. For weekly budgets, each call recomputed the same Monday/Sunday boundaries with multiple `Date` allocations. `Budget.getEffectiveLimit()` separately scanned all transactions for prior-month rollover usage.

## Change

- Add a render-local period context that computes weekly boundaries once per `getUsed()` call.
- Reuse the context while scanning transactions and preserve the existing period rules for monthly, weekly, annual, and one-time budgets.
- Keep `matchesPeriod()` as a compatible public helper by delegating through the new context.
- Rewrite rollover calculation as a single explicit scan while preserving expense/category matching and the prior-month boundary logic.
- No storage schema, transaction data, budget settings, category labels, or save behavior changes.

## Validation

- `tests/s2336-budget-period-context-reuse.test.js`: **3/3 PASS**, including period parity, weekly boundary-construction count, and rollover category math.
- Selected cumulative tests for S2333–S2336, existing budget recommendation contracts, and PWA performance budget: **43/43 PASS**.
- Bundle freshness: **PASS** for both generated bundles.
- Performance budget: **PASS**. `index.html` 319,791/320,000 bytes; `app_production.html` 319,984/320,000; `styles.css` 179,550/180,000; Bundle A 1,534,934/1,600,000; Bundle B 4,923,431/5,000,000.
- Build syntax checks: **PASS**. Build version is synchronized to `?v=2223` / `kw-cache-v2223`.
- `esbuild` is unavailable, so bundles are valid but **not minified**. Full test suite and real Android/WebView timing are not confirmed in this stage.

## Scope and expected impact

For weekly budgets, repeated weekly-boundary construction is reduced from once per transaction to once per aggregation. Transaction dates are still parsed individually, so this is a targeted allocation/traversal optimization rather than a claim of a measured wall-clock speedup.

## Deployment status

Cumulative review/test patch only; **not release-ready** until production minification and the release gate/full suite complete successfully. Browser/device profiling with representative large transaction histories remains necessary.
