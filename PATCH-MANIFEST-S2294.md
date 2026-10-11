# PATCH MANIFEST — S2294 Recommendation Hardening

## Baseline and target
- Baseline: `app-main (15).zip`, application build `?v=2290`.
- Accumulated chain: S2291 → S2292 → S2293 → S2294.
- Target build: `s2041-1-part-sot-hardening-2294`, HTML `?v=2294`, service worker cache `kw-cache-v2294`.
- Patch type: cumulative delta from the stated baseline, not a standalone full application ZIP.

## S2294 changes
1. Smoke-test now recognizes owners registered in `lazyOwnerLoaders` and reports their `data-action` paths as deferred until the module is loaded, rather than reporting expected cold-start lazy methods as missing. Non-lazy missing methods remain errors.
2. Added tests for lazy-owner classification and for preserving true missing-action detection.
3. Hardened the release-hardening test so it accepts either a successful toolchain verification or a nonzero result that explicitly names the missing release tool. It no longer assumes the local environment must lack ESLint/esbuild.
4. Rebuilt bundles, synchronized HTML/SW versions, and regenerated build-derived file maps.

## Apply contract
Apply all files in this ZIP over the exact baseline above. Do not apply only HTML or `sw.js`. Verify all file hashes after extraction and run `npm run release-check`, the focused regression tests, `npm run test:critical`, and the complete test suite before production deployment.

## Verification status
- Release gate: PASS (exit 0), build/version/cache/bundle freshness consistent.
- Focused bug + Dashboard + S2294 tests: 31/31 PASS.
- Critical suite: 10/10 PASS.
- Bundle freshness: PASS.
- Window expose: PASS (83 action owners checked).
- Full suite: INCOMPLETE in this environment; 36 of 64 shards had valid passing checkpoints when the 300-second execution limit was reached. Do not infer full-suite PASS from partial shards.
- Chromium E2E: not rerun successfully; previous S2293 attempt was blocked at app-ready wait in this environment.

## Changed files
See `AUDIT-REKOMENDASI-S2294.md` for the exact changed-file inventory, tests, remaining evidence gaps, and acceptance decision.
