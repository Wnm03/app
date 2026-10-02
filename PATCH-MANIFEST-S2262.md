# Patch manifest — S2262

Patch purpose: stop the recurring `autoRunSelfTestIfNeeded is not defined` runtime banner caused by legacy startup timers racing the lazy-loaded diagnostic harness.

## Changed files only
- `modules/shared/features-helpers-global-security.js`
- `modules/finance/features-helpers-global-security.js`
- `modules/asset/features-helpers-global-security.js`
- `modules/shop/features-helpers-global-security.js`
- `app-bundle-b.min.js`
- `docs/app-bundle-b.min.js`
- `tests/s2262-self-test-single-bootstrap.test.js`
- `AUDIT-S2262-SELF-TEST-BOOT-ERROR-FIX.md`
- `PATCH-MANIFEST-S2262.md`

## Change summary
Removed four legacy direct self-test timers from source modules and removed their compiled equivalents from the checked-in bundles. The guarded `ensureSelfTest()` path in `modules/shared/boot-early.js` remains the sole auto-run entry point. No unrelated application files are included.

## Validation
- `tests/s2261-self-test-lazy-residency.test.js`: PASS
- `tests/s2262-self-test-single-bootstrap.test.js`: PASS
- Grep check: no remaining `setTimeout(autoRunSelfTestIfNeeded, ...)` in source modules or root/docs bundles.
- Full minified rebuild could not run because the uploaded repository has no installed `esbuild` dependency. The compiled bundle edits were therefore applied as narrowly scoped removals matching the source changes; install dependencies and run `npm run build` before a full release.
