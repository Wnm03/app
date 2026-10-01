# A-S2209 — Finance Event Outbox Concurrency / Race Audit

## Scope
Audit race windows between `save()` persistence, durable outbox replay, staged events, and FIFO delivery after S2208.

## Finding
A real event-loss race existed: `FinanceEventOutbox.replay()` could finish delivery and execute `IDBStore.set(KEY, [])` while a concurrent save had already persisted newer events to the same outbox key. The stale replay clear could therefore erase those newer events.

## Repair
Added a shared `FinanceEventOutbox.withPersistenceLock(fn)` promise-serialized critical section. Durable outbox persistence and replay now use the same lock. `_saveImmediate()` performs the mirror+outbox `setMany()` inside this lock; replay acquires the same lock before reading/delivering/clearing the journal.

This preserves FIFO and prevents a stale replay clear from racing a newer persistence write.

## Validation
- S2209 race tests: 3/3 PASS
- S2208 storage-failure tests: 4/4 PASS
- S2207 integration: PASS
- S2206 residual writer sweep: 2/2 PASS
- S2205 lifecycle: 5/5 PASS
- S2205 capacity rollback: PASS
- S2204 consumer/idempotency: 4/4 PASS
- S2203 idempotency: 3/3 PASS
- S2202 recovery ordering: 5/5 PASS
- S2201 atomic data+outbox: 4/4 PASS
- S2200 outbox: 4/4 PASS
- Build: PASS; generated version 2205 during build, then restored to the S2208 baseline version 2204 because generated artifacts are excluded from this patch.

## Environment limitation
`npm run check` cannot complete its lint stage because `eslint` is not installed in the sandbox. Direct targeted tests and `node scripts/build.js` pass. Build remains unminified because `esbuild` is unavailable.
