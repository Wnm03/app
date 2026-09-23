# S1955 — Reminder Target-Coverage Compatibility Recovery

## Basis
Cumulative tree: `app-main (5)` → S1902–S1953 → S1954 → S1955.

This patch addresses the verified S1954 regression reported by the cumulative QA run:
- full suite on QA tree: 7427 tests, 7425 pass, 2 fail
- failures: `tests/service-reminder-package-sot-s1944.test.js` and `tests/s1945-finance-reminder-package-bridge.test.js`
- common root cause: `historyCoversTargets()` only inspected nested `checklist[]` evidence.

## Fix
`modules/vehicle/service-reminder-package-sot.js` now resolves coverage in this order:
1. explicit nested checklist evidence;
2. canonical target fields directly on the service-log row (`serviceComponentId`, `itemId`, `catalogPartId`, `masterCategoryId`, `categoryId`);
3. if a legacy history row has no target evidence at all, preserve the pre-S1954 completion contract instead of inventing a mismatch.

When explicit target evidence exists, every reminder target must still be covered. Therefore an unrelated structured same-vehicle history remains rejected.

## Regression tests
Added:
- `tests/service-reminder-package-s1955-target-coverage.test.js`

The following all pass after the fix:
- S1944 package SOT contract
- S1945 Finance/reminder bridge contract
- S1954 priority recovery tests
- S1955 target coverage tests (3/3)

## Build closure
Build regenerated bundle A/B and synchronized runtime version to `1953` because the source tree changed. `audit:sot` and `verify-bundle` pass after rebuild.

Important: esbuild is unavailable in the environment, so generated bundles are valid but not minified. Bundle B is at 4,998,204 / 5,000,000 bytes (100.0% of the configured budget). Do not add unnecessary bundle payload without another performance review.

## Verification
PASS:
- `audit:sot`
- `verify-bundle`
- `audit:carnotes-advanced` (12/12)
- `audit:app-wide` (9/9)
- `audit:performance-budget`
- `verify-window-expose`
- S1944 + S1945 + S1954 + S1955 targeted tests: 9/9

Full-suite rerun in this environment timed out; do not claim full-suite green from this patch. The prior QA full-suite baseline was 7425/7427 before S1955, with the two failures fixed by this patch.

Browser UI/reload/round-trip/performance click-through remains NOT VERIFIED in environments without a browser/headless browser.
