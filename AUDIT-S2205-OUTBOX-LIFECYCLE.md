# A-S2205 — Finance Event Outbox Lifecycle / Cleanup Audit

## Scope
Audit retry lifecycle, stale/overflow handling, duplicate journal entries, queue bounds, and safe cleanup of the durable finance event outbox.

## Findings
- The outbox previously used `slice(-MAX)` on persistence/load paths, silently dropping the oldest pending event when the queue reached/exceeded the bound. This is unsafe for at-least-once delivery.
- Atomic staging could overflow and silently discard older staged events.
- Successful consumer delivery was followed by journal cleanup without treating persistence failure as a first-class failure state.
- Atomic commit could throw on outbox capacity failure after the business state had already been mutated, leaving a partial in-memory commit.
- `tests/s2202-outbox-recovery-ordering.test.js` contained a cross-VM `deepStrictEqual` false-negative; this is a test-harness defect, not a runtime defect.

## Repairs
- New events are rejected when the bounded queue is full instead of dropping pending events.
- Legacy queues larger than the nominal bound are preserved and replayed; they are not destructively truncated.
- Atomic staging preflights capacity and returns failure instead of dropping events.
- Save/persistence rejects an overflowed atomic queue rather than committing state without its event journal.
- Atomic root `commit()` rolls back the captured state when event staging fails.
- Journal cleanup occurs only after the persistence clear succeeds; in-memory completion state is retained on clear failure.
- S2202 cross-realm test assertion was normalized to compare serialized values.

## Semantics
The system remains **at-least-once + idempotent consumer**, not exactly-once delivery.

## Validation
- S2200: 4/4 PASS
- S2201: 4/4 PASS
- S2202: 5/5 PASS
- S2203: 3/3 PASS
- S2204: 4/4 PASS
- S2205 lifecycle: 5/5 PASS
- S2205 atomic capacity rollback: PASS
- Build: PASS, version 2201
- Bundle A/B syntax: PASS
- esbuild unavailable; generated bundles were not included in the patch.
