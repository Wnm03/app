# Patch S2333 — Cumulative Baseline Performance Optimization

## Base
`app-main (52).zip` (includes cumulative S2331/S2332 fixes).

## Included change
Coalesces mobile viewport resize/orientation/visualViewport updates to one visual update per frame, with a timer fallback. Includes a focused regression test, updated generated bundles, synchronized version `2220`, and the S2333 audit report.

## Apply
Overlay the files in this ZIP onto the matching baseline, preserving all other files. Apply the included `DELETE-FILES.txt` manifest using the project's normal manifest procedure; it keeps the retired `pro-ui-layer.css` deletion explicit. Do not remove earlier cumulative fixes.

## Validation
Focused viewport/PWA/version regression tests pass (23/23); bundle freshness and performance budget pass. Full suite did not complete within the environment time limit. Release gate remains blocked because `eslint` and `esbuild` are unavailable, so generated bundles are syntactically valid/fresh but unminified.

## Status
Cumulative patch for testing/review, **not release-ready**. Run `npm run build:release`, `npm run test:full`, and `node scripts/verify-release-ready.js` in a toolchain-enabled environment before production deployment.
