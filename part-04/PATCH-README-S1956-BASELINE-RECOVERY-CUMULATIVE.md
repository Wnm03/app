# PATCH-S1956-BASELINE-RECOVERY-CUMULATIVE

## Scope
Restores 14 vehicle/shop SOT modules and their corresponding test files that were
missing from the `app-main (6)` baseline versus the previously-verified S1954/S1955
cumulative tree. Also updates finance/shop modules and `scripts/build.js`,
`scripts/verify-source-size.js`, and adds `scripts/service-advanced-integrity-gate.js`
(new `audit:carnotes-advanced` gate, 12 checks).

49 files total: modules/shared (1), modules/finance (2), modules/shop incl. generic (6),
modules/vehicle (18), scripts (3), tests (15 incl. 1 new test), package.json.

## File-loss verification
Applied to a **fresh, untouched copy** of `app-main (6)` in an independent working
directory (separate from any prior session state). Confirmed by `comm` diff:
every file in the `app-main (6)` baseline is still present after applying this patch.
No file was overwritten with a regression or silently dropped.

## Full test suite — run for real, independently
```
TEST_SHARDS=64 TEST_CONCURRENCY=8 TEST_SHARD_TIMEOUT_MS=100000 node scripts/run-full-test.js
FULL TEST: 7428 tests, 7428 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo; 90s
```
Includes the S1944/S1945/S1954 reminder target-coverage contract tests and the new
`carnotes-priority-recovery-s1954.test.js` / `servis-edit-reminder-tab-sot.test.js`.

## Build test — run for real
```
node scripts/build.js
```
Result: bundles regenerated (unminified — esbuild not available in this sandbox,
network egress disabled), syntax-checked with `node --check` (PASS), version synced
1953 → 1954 across index.html / app_production.html / sw.js / source version constants.

## Explicitly NOT run (per request — not a full release)
- `release:ui-gate`
- `release:final-gate`
- `release:preflight`
- `scripts/release.sh`
This patch has NOT gone through the full release pipeline. Do not treat the version
bump or rebuilt bundles from the build test above as a finalized release artifact —
run the full release gates separately before shipping.

## Known open item (unchanged since S1955)
`app-bundle-b.min.js` is at 4,998,204 / 5,000,000 bytes — 100.0% of its configured
performance budget. No headroom left; a future patch adding code to bundle B will
need a trim or esbuild minification before it can pass `audit:performance-budget`.

## Remaining gap vs full S1902–S1954 documentation trail
17 historical `.md`/`.txt` changelog/manifest files (S1909–S1953 patch READMEs and
manifests) are not part of this patch. Documentation only — no source, test, or
runtime impact.
