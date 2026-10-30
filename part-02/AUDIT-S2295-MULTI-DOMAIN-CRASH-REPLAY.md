# S2295 — Multi-Domain Crash-Window / Idempotent Replay

## Scope
Deterministic Node/VM failure-injection audit for Service → Finance/Vehicle event delivery across a crash window after consumer completion but before outbox removal/persistence.

## Finding
A substantive recovery/idempotency gap was identified in the ServiceEventOutbox replay boundary:

1. ServiceEventOutbox replayed `service.*`, `finance.updated`, and `vehicle.updated` without preserving the durable outbox `eventId` into AIBus delivery metadata.
2. `AIDecision`'s durable `processedEventIds` / in-flight dedup therefore could not identify a duplicate replay of these ServiceEventOutbox deliveries.
3. ServiceEventOutbox used synchronous `AIBus.emit()` semantics, so an asynchronous consumer could reject after the outbox had already considered the handler successful and removed the event.

## Fix
- Preserve `eventId` as AIBus metadata on ServiceEventOutbox replay.
- Add async lifecycle delivery (`createAsync/updateAsync/removeAsync/unlinkAsync`) using `AIBus.emitAsync()` when available.
- Add `drainAsync()` so an outbox item is removed only after the async handler/consumer completes successfully.
- Keep the existing synchronous lifecycle API for normal non-replay callers.
- Preserve FIFO and retry-on-failure semantics.

## Verification
- `scripts/s2295-multi-domain-crash-replay.js`: 8/8 PASS
- `tests/s2295-multi-domain-crash-replay.test.js`: 1/1 PASS
- Deterministic scenarios cover:
  - crash after handler success before persistence/removal
  - replay with stable event identity
  - second replay without duplicate AI/domain delivery
  - finance event metadata preservation
  - async consumer rejection retaining the event for retry

## Boundary
This is deterministic Node/VM failure-injection simulation. It is not a real browser/device power-loss or OS-kill E2E test.
