# S2262 — Fix recurring runtime banner on refresh

## Evidence
The screenshot reports `autoRunSelfTestIfNeeded is not defined`. The diagnostic harness (`self-test.js`) is lazy-loaded by `ensureSelfTest()` in `modules/shared/boot-early.js`, but four older direct timers still referenced the function from feature initialization paths before the lazy-loaded script was guaranteed to exist:

- `modules/shared/features-helpers-global-security.js`
- `modules/finance/features-helpers-global-security.js`
- `modules/asset/features-helpers-global-security.js`
- `modules/shop/features-helpers-global-security.js`

## Implementation
- Removed those four legacy direct timers.
- Kept the single guarded bootstrap path in `modules/shared/boot-early.js`: it loads `self-test.js`, checks `typeof autoRunSelfTestIfNeeded === 'function'`, and catches load failures without creating an unhandled rejection.
- Added `tests/s2262-self-test-single-bootstrap.test.js` to prevent the race from returning.
- Rebuilt generated bundles from the source files.

## Validation
Run the targeted regression test and bundle freshness verification. This patch contains only changed source/test/report files and generated bundles, not a full release archive.
