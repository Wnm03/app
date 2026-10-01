# A-S2198 — Transaction Delete Cascade Atomicity

## Scope
Audit `delTx()` in `modules/finance/tx-list-cashflow.js` for partial commits when a cross-feature delete cascade fails after one or more canonical collections have already been mutated.

## Finding
The delete path executed `runTxDeleteCascades(t)` before removing the transaction and had no atomic rollback boundary. The cascade can mutate multiple domains: transactions, Bill/Debt/Piutang, BBM, product stock, Shop, service logs/stock, investments, Renovasi, Sewa Kios, and Tukang attendance.

A failure in a later cascade could therefore leave earlier mutations committed while the source transaction remained or was later removed.

## Repair
Added `FinanceCrossEntityAtomic.begin()` around the full mutation portion of `delTx()` with snapshots for all collections directly mutated by the delete cascade. The boundary commits only after the cascade and transaction removal complete. Any synchronous cascade exception rolls back all snapshotted collections and aborts the delete.

`FinanceCrossEntityAtomic` was hardened to snapshot/restore both arrays and object-shaped collections (notably `D.sewaKios`) while preserving the existing `D` and collection/object identity where possible.

No UI or schema changes. No legacy path deletion.

## Validation
- S2198 targeted: 3/3 PASS.
- Rollback test: forced product-stock mutation failure; transaction and all snapshotted domain state restored exactly.
- Success test: transaction removed and stock cascade committed.
- S2196 atomic helper regression: 4/4 PASS.
- Build: PASS; both generated bundles pass `node --check`.
- `esbuild` unavailable, so local bundle output is unminified and excluded from the patch.

## Limitation
The boundary covers synchronous in-memory mutation failures. Persistence is still governed by the existing `save()` durability pipeline; this session does not introduce a distributed transaction across IndexedDB/localStorage. Events emitted by legacy cascade functions before a later exception are outside this in-memory rollback boundary and should be considered for a future event-transaction/outbox checkpoint if a concrete stale-event path is demonstrated.
