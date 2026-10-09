# V13 — Cumulative lint hardening + full-test failure diagnostics

Patch root-relative, intended to apply over the V12 cumulative patch.

## Included
- Cumulative V12 lint hardening files, including strict `no-undef` / `no-redeclare`, minified bundle and generated docs ignores, browser/Node globals, and ESM test overrides.
- `scripts/run-full-test.js`: failed shards now print their captured TAP stdout/stderr, shard file list, and assertion/stack details in CI logs. Previously the runner only printed aggregate counts and shard exit codes, obscuring the failing tests.
- Existing V12 targeted source/test fixes and `DELETE-FILES.txt` are retained.

## Verified in this workspace
- `node --check eslint.config.js`: PASS.
- `node --check scripts/run-full-test.js`: PASS.
- `node --check modules/vehicle/vehicle-car-notes-sot-s2071.js`: PASS.
- `node scripts/verify-bundle-freshness.js`: FAILS for `app-bundle-b.min.js` in the provided repository snapshot. Current source hash is `2832e0b9affea2cf`; embedded hash is `5aab9bc82b23e371`. `app-bundle-a.min.js` passes.
- `esbuild` is declared in package.json but unavailable in this workspace; dependency installation timed out. Therefore bundles were deliberately NOT edited or re-stamped by hand, and minification/build is not claimed as passed.
- `fake.js` does not exist in the provided `app-main (5).zip` snapshot. Do not add it to delete-manifest unless the target branch actually contains it.
- Full tests could not be executed here because dependencies are unavailable. V13 makes the next CI run expose the real failing test details rather than only shard totals.

## Apply and validate
1. Apply the ZIP at repository root, preserving root-relative paths.
2. Run `npm run apply-delete-manifest` if available; ensure the obsolete root `collect-app-globals.js` is gone while `scripts/collect-app-globals.js` remains.
3. Install locked dependencies and verify `require.resolve('esbuild')` succeeds.
4. Run `npm run build:release` and `node scripts/verify-bundle-freshness.js`.
5. Run `npx eslint . --quiet --format unix`, then `npm run test:full`.
6. Inspect the newly printed `FULL TEST FAILURE DETAILS` blocks and fix failures based on assertions/stack traces. Do not weaken lint rules or alter tests merely to get a green result.
7. Run `npm run release-check` and the full CI workflow on the same commit.

This patch does not claim the release gate or all tests pass; it closes the diagnostics gap and retains the V12 hardening without bypassing gates.
