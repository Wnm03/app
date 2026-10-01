# A-S2202 — Durable Event Outbox Recovery & Ordering

## Scope
- FIFO/casual ordering after reload and legacy+IndexedDB merge.
- Head-of-line failure must block later events.
- Atomic commit must not deliver events before state + outbox persistence succeeds.

## Findings
1. `FinanceEventOutbox.replay()` could continue after a failed event, allowing later events to run against stale state.
2. `FinanceCrossEntityAtomic.commit()` previously staged and immediately emitted deferred events before the persistence transaction completed.

## Repairs
- Add monotonic `seq` to normalized finance outbox entries and deterministic FIFO ordering.
- Stop replay at the first failed event; keep the failed head and all later events durable.
- Merge legacy localStorage events with IndexedDB queue without dropping entries.
- Atomic commit now stages events only; delivery is triggered only after `IDBStore.setMany()` succeeds.
- Failed delivery remains in the durable journal for retry.

## Validation
- S2202 targeted: 5/5 PASS.
- S2200: 4/4 PASS.
- S2201: 4/4 PASS.
- Syntax checks: PASS.
- Build: PASS, generated version 2197; generated bundles excluded from patch.
