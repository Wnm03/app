# S2310 — Event / Outbox Duplicate & Replay Audit

## Status
**CLOSED — AUDIT / TEST ONLY**

## Baseline
`app-main (49)` + cumulative S2304–S2309.

## Scope
- AIBus duplicate subscription behavior
- FinanceEventOutbox durable replay/idempotency
- ServiceEventOutbox durable replay/idempotency
- stable eventId propagation
- async consumer failure / retry ordering
- duplicate vehicle-event identity
- event consumer idempotency boundary

## Evidence

### 1. AIBus
`AIBus.on()` rejects identical handler references, so duplicate wiring of the same handler does not create duplicate subscriptions. `AIService.wireEvents()` also has `_wired` guard and stores unsubscribe handles.

### 2. FinanceEventOutbox
The durable replay path carries the stable `eventId` as delivery metadata and uses `emitAsync()` when available. Failed consumer delivery leaves the remaining queue durable. Existing S2203/S2204/S2205/S2208/S2210/S2211 tests all pass.

### 3. ServiceEventOutbox
Service-event outbox identity is canonicalized from event type plus stable payload identity. `vehicle.updated` additionally retains `action` and `kind`, preventing legitimate edit/delete/unlink operations on the same entity from collapsing into one event. `drainAsync()` processes FIFO and stops at the first failed event.

### 4. Consumer idempotency
`AIService` forwards delivery metadata to `AIDecision`. `AIDecision` has both an in-flight eventId map and a persisted `processedEventIds` ledger. Existing S2203/S2204 consumer-idempotency tests pass.

### 5. Event wiring regression
Existing event-bus / AI wiring / service-event / Dana Titipan event tests pass. No duplicate subscription regression was found.

## Targeted execution

- S2199 transactional outbox: PASS
- S2200 finance outbox: PASS
- S2203 outbox idempotency: PASS
- S2204 consumer idempotency: PASS
- S2205 lifecycle: PASS
- S2208 storage failure: PASS
- S2210 staged race: PASS
- S2211 crash-window: PASS
- Event bus / AI wiring / service / Dana Titipan regression: **37/37 PASS**
- S2310 new contract tests: **4/4 PASS**

Combined executed tests: **52/52 PASS**.

## Findings

**No active duplicate/replay defect was verified in the audited paths.**

One compatibility observation was reviewed: `chat-action-handlers.js` contains fallback references to `ServiceEventOutbox` if `ServiceEventLifecycle`/AIBus delivery throws. The canonical `ServiceEventOutbox` is defined by `modules/vehicle/service-event-adapter.js` and exposed globally; therefore this is not an undefined production symbol in the normal build path. No code change was required.

## Production impact
- Production logic changes: **0**
- Schema changes: **0**
- Persistence model changes: **0**
- UI changes: **0**
- Service worker changes: **0**

## Release distinction
S2302's separate release blockers (version synchronization, Bundle-B freshness/budget, and unavailable production minification toolchain) remain outside S2310 and are not reclassified by this audit.

## Conclusion
**S2310 CLOSED.**
