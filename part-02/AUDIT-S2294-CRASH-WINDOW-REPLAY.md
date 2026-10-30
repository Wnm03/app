# S2294 — Crash-Window / Idempotent Replay Audit

## Scope
Audit the window between a successful post-commit side effect and durable removal of its outbox entry. A real process crash in that window can cause the same outbox event to be delivered again after restart.

## Result
14/14 deterministic contract checks PASS.

The audit found no new substantive defect requiring a production runtime change. The relevant handlers have existing idempotency boundaries:

- Service create/update normalize the canonical `D.servisLogs` record rather than creating a second service store.
- Service remove is an event bridge only.
- Vehicle Catalog service attachment replaces the canonical reference set for the same service row and does not create a new service row.
- Finance outbox events retain stable `eventId` and serialized replay.
- AI consumer has both in-flight and durable `processedEventIds` protection.
- Service outbox identities are stable for the supported event types, preventing duplicate enqueue of the same operation.

## Boundary
This is a source-contract and deterministic replay audit. It does not emulate a physical power loss at an exact instruction boundary. Full browser/device crash testing remains a release-environment task.
