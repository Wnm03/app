# AUDIT S2203 — Durable Outbox Idempotency / Duplicate Delivery

## Scope
Audit crash window after an outbox event is delivered successfully but before its journal entry is removed.

## Finding
A durable outbox can provide at-least-once delivery, but cannot guarantee exactly-once side effects across an arbitrary consumer without a transactional consumer-side dedupe/commit boundary. Marking an event delivered before invoking the handler would create an event-loss window on crash.

## Repair
- Added stable `eventId` to normalized outbox entries.
- Outbox replay passes `{ eventId, source: 'finance-event-outbox' }` as optional AIBus delivery metadata.
- AIBus forwards optional metadata as a second handler argument while preserving the existing payload argument and listener compatibility.
- The outbox intentionally does not mark an event delivered before the handler returns.

## Semantics
The system remains **at-least-once**. Consumers that perform non-idempotent side effects must use `meta.eventId` at their own atomic persistence boundary for dedupe. This session does not claim exactly-once semantics.

## Tests
- Stable eventId survives normalization/replay metadata: PASS
- Duplicate replay after simulated handler crash carries the same eventId: PASS
- Event remains pending when handler fails: PASS
- Source syntax checks: PASS
- Cumulative build: PASS (version 2198)

## Known non-S2203 warnings
- `modules/asset/aset-misc.js:476` empty catch warning is pre-existing.
- `docs/AUDIT_MATRIX.md` coverage counts are stale per build warning.
- `modules/vehicle/servis.js` and `build.js` exceed the oversized-file threshold; pre-existing.
- esbuild is unavailable in the environment, so generated bundles are unminified and excluded from the patch.
