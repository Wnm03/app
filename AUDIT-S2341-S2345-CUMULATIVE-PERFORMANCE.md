# S2341–S2350 — Cumulative performance audit and optimization

## Scope

Continue the S2338–S2340 cumulative source patch with an additional low-risk optimization, record the next verified performance bottlenecks, and keep production bundle freshness as a release blocker until rebuilt.

## S2341 — Bundle/startup budget audit

Measured by `scripts/performance-budget.js` on the supplied baseline plus S2339/S2340 source patch:

- `index.html`: 319,791 / 320,000 bytes (99.9%).
- `app_production.html`: 319,984 / 320,000 bytes (100.0%).
- `styles.css`: 179,550 / 180,000 bytes (99.8%).
- `pwa-ui-layer.css`: 14,987 / 15,000 bytes (99.9%).
- `app-bundle-a.min.js`: 1,532,085 / 1,600,000 bytes (95.8%).
- `app-bundle-b.min.js`: 4,923,336 / 5,000,000 bytes (98.5%).

The existing budget gate passes, but HTML/CSS and bundle B have very little remaining headroom. This session does not raise budgets or rewrite production bundles. Bundle freshness verification fails because source changed after the bundle markers were generated. Fresh production bundles must be built with the pinned/minifying toolchain before deployment.

## S2342 — Reuse Car Notes domain signatures (implemented)

`CarNotesPerformance.domainSignatures()` previously called `arraySignature()` repeatedly for arrays reused across the `service`, `fuel`, `finance`, `tax`, and `final` signatures. Each call JSON-serializes and hashes the entire array. The function now computes each array fingerprint once per `domainSignatures()` invocation and reuses it to compose the same output signature fields.

Compatibility intentionally preserved:

- signature field names and composition remain unchanged;
- `rideLogs` remains preferred over `rides` according to existing behavior;
- no data mutation, persistence, event, or cache revision behavior is changed.

Regression test `tests/s2342-carnotes-domain-signature-reuse.test.js` asserts one fingerprint per input array and the legacy ride signature selection.

## S2343 — Car Notes/navigation follow-up audit

Existing performance guards and lazy-tab rendering are retained. Do not remove or defer listeners without browser evidence: photo lightbox, scanner lifecycle, online/offline status, and service-session recovery listeners have lifecycle-specific semantics. Next safe action is device profiling for repeated tab navigation, open/close cycles, and scanner start/stop cycles; then patch only confirmed duplicate work.

## S2344 — Dashboard/analytics follow-up audit

S2333–S2338 and S2339 already reduce repeated aggregation in selected finance and recommendation paths. Additional shared snapshots should only be introduced where identical input windows and invalidation events are demonstrated. No global cache or stale-result risk is introduced in this session.

## S2345 — PWA/memory follow-up audit

Existing audit scripts flag several runtime I/O and event-listener call sites, but static call-site counts do not prove a leak. Validate heap/listener growth across repeated feature open/close, offline/online, and service-worker update cycles before changing lifecycle code.


## S2346 — Reuse ownership resolution within finance aggregation (implemented)

`FinanceIntelligence.incomeVsExpense()` already builds an account lookup map and scans transactions once, but it still resolved the ownership classification for every transaction. When many transactions belong to the same account, that repeats the same account-only resolution work. The aggregation now uses a short-lived `Map` to resolve each encountered account once per call. The cache is not retained across calls, so account ownership edits are reflected immediately; transactions with missing/unknown account IDs retain the existing SELF fallback, explicit ranges remain uncached, and transaction data is not mutated.

Regression test `tests/s2346-finance-ownership-resolution-reuse.test.js` verifies one resolution per account, unchanged totals/txCount, and immediate reflection of an ownership edit on the next call.

## S2347 — Reuse budget category metadata per scan (implemented)

`Budget.getUsed()` previously called `Budget.matchesTx()` for every in-period transaction, and `matchesTx()` re-traversed `D.categories` for each selected category on every expense transaction. It now lazily builds a per-call matcher on the first in-period expense and resolves each selected category once for that scan. The matcher is not retained across calls, so category edits are visible on the next call. It preserves the early expense-type check, `__total__` handling, subcategory matching, and category/categoryId fallbacks; if there are no in-period expenses, category metadata is not resolved at all.

Regression test `tests/s2347-budget-category-matcher-reuse.test.js` verifies the same totals, one category lookup per selected category, fresh category edits on subsequent calls, `__total__`, and no eager resolution for income-only data.

## S2348–S2350 — Additional audit decisions

- S2348: do not cache `OwnershipEngine.resolve()` beyond one aggregation; account ownership is editable and stale classifications would corrupt totals.
- S2349: keep finance transaction source records untouched; optimizations only memoize derived metadata for the duration of one call.
- S2350: full runtime and device profiling remain required to quantify end-user improvement; deterministic tests prove reduced repeated resolver/category lookups, not a claimed wall-clock percentage.

## Validation

- Focused budget/category, finance ownership/cache, and Car Notes signature tests: 10 passed, 0 failed in the latest targeted run (including S2347); broader prior focused tests remain as previously recorded.
- `node --check budget.js`, `modules/vehicle/car-notes-performance.js`, and `modules/finance/finance-intelligence.js`: passed.
- `scripts/verify-patch-integrity.js`: passed.
- `scripts/verify-patch-contamination.js`: passed.
- `scripts/performance-budget.js`: passed; current files are close to budget limits as listed above.
- `scripts/verify-bundle-freshness.js`: failed as expected; existing production bundles are stale relative to changed source.
- Full `node --test tests/*.test.js` did not finish within the execution window; no full-suite pass is claimed.
- `esbuild` and ESLint are not installed in the extracted environment. No production bundles are included in this source patch.

## Release status

**NOT READY TO DEPLOY.** Apply this source patch to the matching baseline, restore the project's pinned build toolchain, generate fresh minified bundles, run bundle freshness/version/release gates and the full test suite, then profile on a representative Android/WebView device. Do not deploy the existing stale bundles from the baseline.
