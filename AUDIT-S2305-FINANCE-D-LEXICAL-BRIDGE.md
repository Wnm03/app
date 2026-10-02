# S2305 — Finance D Lexical/Global Boundary Hardening

## Trigger
User-visible error on `markBillPaid`:
`Gagal menjalankan "markBillPaid": FinanceCrossEntityAtomic: D belum tersedia`

## Root cause
`D` is declared as a top-level lexical binding (`let D`). A top-level
`let D` is available as the global lexical binding `D`, but is not
automatically exposed as `globalThis.D`.

The affected Finance SOT boundaries used `g.D`. Existing tests injected
`globalThis.D`, so they did not reproduce the browser shape.

## Fixed
- `modules/finance/finance-tx-sot.js`
- `modules/finance/finance-cross-entity-atomic.js`

Both now resolve lexical `D` first and fall back to `g.D` for harness
compatibility.

`app-bundle-a.min.js` was updated to mirror these two runtime fixes.

## Regression
- S2305 lexical-D regression: 3/3 PASS
- S2196 Finance atomicity: PASS
- S2207 atomic persistence integration: PASS
- BUG-007 overpayment/revert: 4/4 PASS
- S292 markBillPaid guard: PASS
- S303 custom utang payment: PASS

Executed combined subtests: 18/18 PASS.

## Scope
Targeted Finance runtime fix only.
Schema/UI/persistence schema: 0 change.
New feature: 0.

## Note
Vehicle modules contain additional historical `g.D` patterns. They were not
changed in S2305 to keep this fix evidence-backed and minimal.

## Status
CLOSED — targeted Finance runtime bug fixed.
