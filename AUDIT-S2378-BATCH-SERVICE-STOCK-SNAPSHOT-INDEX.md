# S2378 — Batch service stock snapshot index

## Finding
`Servis.markServicedBatch()` captured rollback quantities by calling `D.partsStock.find()` once for each stock ID. Batch operations can reference multiple stock rows, so the snapshot phase repeated full-array scans.

## Change
- Build one local `Map` from the stock array before capturing quantities.
- Retain first-match behavior for duplicate IDs and strict identity/type matching.
- Exclude `NaN` IDs to preserve `Array.find(x => x.id === sid)` semantics for `NaN`.
- Preserve quantity fallback (`Number(qty) || 0`), rollback map contents, and operation order.
- No persistent schema, UI, stock mutation, or rollback ordering changed.

## Validation
Focused regression tests verify source wiring and index semantics. This optimization reduces repeated snapshot lookup work from roughly O(k*n) to O(n+k), where n is stock rows and k is unique batch stock IDs; no wall-clock performance claim is made without a benchmark.
