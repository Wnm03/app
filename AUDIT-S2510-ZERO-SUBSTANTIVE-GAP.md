# S2510 — Cumulative audit / zero substantive functional gap closure

## Scope

Follow-up to S2451/S2455/S2461/S2501-S2509. Focus: restore-chain integrity, Finance legacy taxonomy, source↔bundle drift, deploy/version continuity, and regression gates.

## Findings closed

1. **Finance restore failure** `FINANCE_CATEGORY_UNRESOLVED` was caused by deterministic legacy shapes in the 2026-10-04 backup.
   - `Tagihan / Pulsa/Kuota` now maps through the canonical `Tagihan & Biaya` category and a stable legacy subcategory.
   - `Dana Titipan` provisions a stable `NON_BELANJA` Finance category when absent.
   - Unknown legacy categories remain fail-closed.
2. **Source↔bundle drift** was found: the accumulated bundle contained S2509 reconciliation logic while `modules/finance/finance-category-sot.js` and `modules/shared/backup-restore.js` did not. Source was repaired and bundles rebuilt.
3. **Deploy version continuity** was advanced to build `2235`, above the previously deployed/observed `2234`, avoiding cache/version rollback.
4. **Bundle freshness** is now PASS after rebuild.

## Real-backup verification

Backup: `backup-keluarga-W-2026-10-04.json`

- Transactions: 1,219
- Finance legacy reconciliation issues: 0
- Deterministic taxonomy changes: 2
- Finance SOT restored rows: 1,219
- Rows without canonical `categoryId`: 0

## Targeted regression result

14/14 PASS covering S2287 continuity, S2451/S2455 restore SOT, S2463 accounting boundary, S2501/S2503/S2504-S2508 Finance taxonomy gates, and S2509 legacy restore closure.

## Build result

`node scripts/build.js 2235` completed successfully.

- Version: `s2041-1-part-sot-hardening-2235`
- HTML query versions: 2235
- Service-worker cache: `kw-cache-v2235`
- Bundle A/B syntax: PASS
- Bundle freshness: PASS

The environment does not contain `esbuild`, so the generated bundles are valid but **not minified**. This is a release-environment limitation, not a functional restore/data-integrity failure.

## Full-suite limitation

The repository's resumable full-test runner was exercised, but a complete green aggregate could not be certified within the execution window. Several failures are isolated to tests that pass individually but conflict when multiple browser/global-state test files share one Node process; therefore those aggregate failures are not treated as proven product regressions without reproduction in isolated execution.

## Remaining release-hygiene blockers (not substantive restore/data-loss gaps)

- `eslint` unavailable in this environment.
- `esbuild` unavailable, so minification/reproducible minified build is blocked.
- No package-lock/npm-shrinkwrap is present, so dependency graph is not reproducibly pinned by lockfile.
- Performance budget: `index.html` and `app_production.html` are ~0.2–0.3% over the configured 320 KB budget.
- Source-size guard flags `modules/vehicle/servis.js` and `modules/shared/features-helpers-global-security.js`; these are architectural maintenance items and were not changed as part of the Finance restore fix.

## Release decision

**Substantive functional/data-restore gate: PASS for the audited chain.**

**Global production release gate: NOT CERTIFIED** until the normal release environment supplies the pinned toolchain (`eslint`, `esbuild`, and lockfile/dependency policy) and the complete test suite is run with isolated test execution. Do not label the overall application "0 gaps in every category" based solely on this audit.
