# PATCH S1931 CUMULATIVE v2 — S1921 Car Notes Mobile Tab Regression Restore

Builds on `PATCH-S1931-CUMULATIVE-UI-SCROLL-NAV-FIX`. All prior S1931
(atomic navigation, scrollRoot/mainApp DOM nesting) and S1930 fixes are
retained unchanged. This addendum fixes a regression introduced by that
patch's `styles.css`.

## Root cause

The S1931 cumulative patch's `styles.css` was built from a baseline that
predates the S1921 fix ("mobile Car Notes top-level tabs must wrap so
BBM and Servis stay visible"). When S1931's mobile-rule consolidation
removed what it called a "duplicate Car Notes mobile-tab rule block," it
removed the *only* copy of that rule on the current codebase, silently
reverting S1921. `tests/s1921-carnotes-mobile-tab-visibility.test.js`
caught this on a full-suite run: 7336/7337 pass, 1 fail.

## Fix

- `styles.css`: restored a standalone
  `#page-carnotes > .cn-tabs:not(.cni-subtabs):not(.cnb-subtabs)` rule
  (3-col grid, `overflow:visible`) and its `.cn-tab{min-width:0}` rule
  inside the existing `@media(max-width:560px)` block, so Car Notes'
  mobile tab-visibility contract is met independently of the grouped
  multi-page rule.
- Condensed the long S1921 doc-comment to a single line to make room
  under the 180,000-byte `styles.css` release budget (the same budget
  `tests/s1931-navigation-atomic-transition.test.js` enforces).
- No HTML, JS, or renderer/business logic changed.

## Verification

Full suite via `node scripts/run-full-test.js` (64 shards):

```
FULL TEST ALL SHARDS: 7337 tests, 7337 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo.
```

`styles.css`: 179,727 B (budget 180,000 B).

## Files in this addendum

- `styles.css` (updated again, cumulative on top of S1931's version)
- `PATCH-README-S1931-CUMULATIVE-v2-CARNOTES-S1921-RESTORE.md` (this file)

All other files from the S1931 cumulative patch are carried forward
unchanged and are included here for a single-drop apply.
