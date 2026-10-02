# S2292 — Finance ↔ Service ↔ Stock Side-Effect Matrix

## Scope
Audit CREATE / DELETE / RESTORE / REVERT / RETRY / concurrent mutation boundaries across Service History, Finance transaction and sparepart stock.

## Result
13/13 deterministic source-contract checks PASS. No new production defect was proven, therefore S2292 is audit/test-only and introduces no runtime mutation.

## Verified contracts
- Service reminder durable idempotency is checked before Finance and Stock side effects.
- Finance rows created by reminder/service are linked by `servisLinkId`.
- Service mutation rollback captures Finance and Stock state before mutation.
- Batch service mutation uses one batch identity, defers persistence until domain mutations complete, and restores Finance/Stock/Service snapshots on failure.
- Service-session rollback restores canonical Finance and Stock snapshots.
- Finance→Service lifecycle publication occurs after Finance commit; failures are routed to ServiceEventOutbox where available.
- Finance events retain stable `eventId` identity.
- Service idempotency keys encode vehicle/component/date/action/batch operation dimensions, preventing false cross-operation deduplication.

## Boundary
This is a static source-contract plus deterministic Node test. It is not a browser/device power-loss E2E test.
