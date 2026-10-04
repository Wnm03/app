# Audit S2471 — Cross-Domain Event Recovery

## Scope

Post-commit event delivery across Vehicle, Service, Sparepart/Stock and Finance consumers:

`commit -> AIBus consumer -> consumer failure -> durable outbox -> replay -> event identity`

## Findings

### P1 — Vehicle CRUD/KM events could be lost after persistence

`modules/vehicle/vehicle-core.js` emitted `vehicle.updated` directly after `save()`. A throwing consumer could leave committed state without a replayable event.

**Repair:** post-commit vehicle edit/create/KM/delete emissions now catch consumer failures and enqueue the exact event in `ServiceEventOutbox`.

### P1 — Sparepart stock purchase/revert event could be lost after mutation

`modules/vehicle/stock-command-sot.js` emitted `finance.updated` directly after stock mutation. A throwing consumer could lose the cross-domain notification.

**Repair:** purchase-apply and purchase-revert now use durable fallback through `FinanceEventOutbox`, with `ServiceEventOutbox` compatibility fallback.

## Existing protections verified

`ServiceEventOutbox` already provides FIFO replay, stable event identity, async consumer awaiting, and persistence rollback on failed dequeue. Finance outbox provides durable journal, event identity, persistence locking and replay protection.

## Validation

- S2471 targeted: **3/3 PASS**
- `audit:system-integrity`: **PASS 7/7**
- `audit:app-wide`: **PASS 9/9**
- `audit:sot-production-wiring`: **PASS**
- `audit:sot-drift`: **PASS 6/6**

## Scope verdict

No additional substantive cross-domain event-recovery gap was identified after these repairs within the audited Vehicle/Service/Sparepart/Finance event boundary.

Global release closure remains a separate scope.
