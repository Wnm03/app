# S2290 — Cross-Domain Consumer Idempotency Sweep

## Finding

A concrete retry/idempotency gap was found in `modules/vehicle/servis.js`, `Servis.markServiced()`.

The durable idempotency lookup for the reminder-service operation existed, but it occurred **after** `FinanceTxSOT.create()` when the service had a non-zero cost. A crash/retry after the finance write but before the service row became durable could therefore create a duplicate finance transaction before the later duplicate service lookup rejected the service row.

## Fix

Move the durable `findServiceEventByIdempotencyKey()` check before any finance or stock side effect. The existing in-memory `_markServicedInFlight` guard remains only as a UI/runtime concurrency optimization; it is not the domain correctness boundary.

## Contract

For the same `(idempotencyKey, vehicleId)`:

1. existing service event is detected first;
2. duplicate invocation returns the canonical existing event;
3. no FinanceTxSOT write occurs;
4. no StockCommandSOT consume occurs;
5. no second `D.servisLogs` row is created.

## Validation boundary

Static source-order assertions plus deterministic contract checks. No browser/device crash injection or real IndexedDB power-loss test was performed.
