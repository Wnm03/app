# PATCH S1931 — ScrollRoot/MainApp DOM Nesting Fix

## Root cause

Real browser testing exposed a structural HTML nesting regression in both runtime shells:

- `#scrollRoot` is the canonical vertical scroller.
- `#mainApp` must remain inside `#scrollRoot` and wrap all 8 primary pages.
- The source had premature `</div>` closures at four page boundaries.
- As a result, Shop was outside `#mainApp`, and Car Notes/Pajak/Aset (and then downstream pages) could escape `#scrollRoot` entirely.
- This explains the observed Android/WebView behavior: content height existed, but the actual scroll container was capped at the viewport and the lower page content became unreachable.

## Fix

Applied symmetrically to:

- `index.html`
- `app_production.html`

Removed the premature shell-closing `</div>` at the boundaries before:

1. Shop
2. Car Notes
3. Pajak & Zakat
4. Aset

No renderer/business logic was changed.

## Structural verification

A new regression test was added:

- `tests/s1931-mainapp-scrollroot-nesting.test.js`

It verifies all 8 primary pages resolve at the expected nesting:

`#scrollRoot -> #mainApp -> #page-*`

and verifies the shell div depth closes cleanly.

## Verification results

PASS:

- S1931 structural nesting test
- S1920 mobile Dashboard/Settings contracts
- S1929 mobile scroll/UI contracts
- S1930 cache/transition contracts
- Dashboard Settings regression tests
- Dashboard performance regression test
- SA16 wiring tests
- Bundle freshness
- Window expose
- Feature regression
- Architecture integrity
- Persistence integrity
- PWA recovery integrity

The selected regression suite executed: **68/68 PASS**.

## Full build/test limitation

The production build command could not execute in this runtime because the repository's `esbuild` devDependency is not installed and package installation timed out. The existing JS bundles were not modified by this patch, and `verify-bundle-freshness.js` still reports both bundles fresh.

A full `npm test` run was attempted but exceeded the execution window; therefore this patch does **not** claim a full-suite PASS.

## Remaining release gate

The existing release UI gate still reports the previously known performance-budget issue:

- `styles.css`: 180,912 B > 180,000 B

This is independent of the DOM nesting fix and is intentionally not altered in this surgical patch.
