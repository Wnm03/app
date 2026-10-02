# S2308 — Duplicate / Shadow Module Audit

## Scope
Audit `app-main (49)+S2304+S2305+S2306+S2307` for duplicate/shadow runtime modules, focused on `features-helpers-global-security.js`.

## Finding
Four files exist:
1. `modules/shared/features-helpers-global-security.js` — CANONICAL
2. `modules/finance/features-helpers-global-security.js` — historical copy
3. `modules/shop/features-helpers-global-security.js` — historical copy
4. `modules/asset/features-helpers-global-security.js` — historical copy

The three domain copies explicitly state that the implementation was moved to `modules/shared/...`. They are materially older and contain older schema/build versions.

## Runtime proof
`scripts/build.js` includes only `modules/shared/features-helpers-global-security.js`.
`scripts/architecture-integrity-gate.js` explicitly rejects the three domain copies if they enter the runtime list.

Results:
- Architecture integrity: PASS — runtime entries=405
- S1860 app-wide hardening: 9 contracts pass, 0 fail
- S1843/S1851/S1852/S1853/S2093 regression set: 14/14 PASS
- S2308 guard: 2/2 PASS

## Why not delete
Existing audit/regression tests and historical tooling reference the old files. Deleting them would be test-fixture cleanup, not a proven runtime correctness fix.
No runtime consumer was found that loads the three copies from `index.html`, `app_production.html`, or `scripts/build.js`.

## Guard added
`tests/s2308-shadow-module-runtime-guard.test.js` prevents the three shadow copies from entering the production build and verifies their historical-copy marker remains present.

## Production changes
Production logic: 0
Schema/UI/persistence: 0
Runtime source: 0

## Status
**CLOSED — duplicate/shadow runtime source contained and future contamination guarded.**
