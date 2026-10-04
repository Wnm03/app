# Audit S2472 — Async Consumer Durable Fallback

## Scope
Cross-domain event delivery after a Finance/Service mutation has already committed.
Focus: AIBus `emit()` vs `emitAsync()`, async consumer rejection, durable outbox fallback, and replay safety.

## Finding
P1: `FinanceEventOutbox.emitOrEnqueue()` used `AIBus.emit()`. `AIBus.emit()` intentionally swallows Promise rejections from async listeners, so a consumer could reject after commit without triggering the synchronous catch block. The event could therefore be lost instead of entering the durable outbox.

P1: `ServiceEventLifecycle.emit()` had the same semantic weakness for async consumers.

## Repair
- FinanceEventOutbox prefers `AIBus.emitAsync()` when available.
- Async rejection is caught and the exact event is queued for durable retry.
- ServiceEventLifecycle uses `emitAsync()` when available and queues the service event on failure.
- Existing synchronous compatibility paths remain for legacy harnesses.
- Existing durable replay paths remain unchanged.

## Validation
- S2472 targeted: 3/3 PASS.
- S2466–S2469 regression: 11/11 PASS.
- Combined Finance/SOT/event regression set: 60/60 PASS.
- System Integrity: 7/7 PASS.
- App-wide: 9/9 PASS.
- SOT Production Wiring: PASS.
- SOT Drift: 6/6 PASS.
- ZIP integrity: PASS.

## Verdict
For the audited async-consumer durable-fallback boundary: **0 substantive gaps identified after S2472**.

Global application/release zero-gap is not claimed; remaining domains and release/bundle closure must still be audited separately.
