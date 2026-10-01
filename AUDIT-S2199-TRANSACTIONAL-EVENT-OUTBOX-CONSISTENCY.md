# A-S2199 — Transactional Event / Outbox Consistency

## Scope
Audit event emission around `FinanceCrossEntityAtomic`, with emphasis on transaction-delete cascades where state mutation can fail after an event would otherwise be emitted.

## Finding
Before S2199, `FinanceCrossEntityAtomic` protected canonical state rollback but had no event boundary. An event emitted from a cascade could therefore become visible before the enclosing mutation was committed.

## Repair
`modules/finance/finance-cross-entity-atomic.js` now provides a small transactional event queue:
- `emit(type, payload)` queues events while an atomic scope is active.
- `commit()` flushes queued events only after the state commit point.
- `rollback()` discards events generated inside the failed scope.
- Nested atomic scopes share the outer event queue; an inner rollback truncates only events created inside that scope.
- Events outside an atomic scope preserve the previous immediate-emission behavior.
- Listener failure during post-commit flush is logged and does not reopen/rollback committed state.

`modules/finance/tx-list-cashflow.js` now routes the investment-cascade event and final transaction-delete event through the atomic emitter.

## Invariants
1. Failed transaction-delete cascade cannot publish an investment/finance event for a state that was rolled back.
2. Successful delete publishes the deferred event after commit.
3. Existing direct `AIBus.emit` behavior outside atomic operations is preserved.
4. UI and data schema are unchanged.

## Validation
- S2199 targeted: 4/4 PASS.
- S2198 regression: 3/3 PASS.
- Cumulative S2186–S2199 checkpoint tests: PASS.
- Source syntax: PASS.
- Build: PASS.
- Both generated bundles: `node --check` PASS.

## Limitations
This is an in-process deferred-event boundary, not a durable persistent outbox. If the browser/process terminates between state persistence and event flush, the event is not durably recoverable. Durable outbox persistence remains a separate audit scope.

## Generated artifacts
Build-generated bundle/version/coverage artifacts are intentionally excluded from the S2199 patch.
