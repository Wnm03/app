# S2474 — AI Recovery Journal Backup/Restore Atomicity

## Finding

S2473 introduced durable AI event recovery at `ai:event-outbox:v1`. Deep backup/restore audit found that the new recovery journal was not yet part of the backup auxiliary snapshot. A restore could therefore load a new application state while retaining an old pending AI event from the pre-restore state, causing a stale event to be replayed into restored data.

## Repair

- Include `ai:event-outbox:v1` in the atomic backup auxiliary snapshot.
- Serialize it into `_aiEventOutbox` in the backup payload.
- Snapshot the current AI recovery journal before restore.
- Restore the journal through the same `_persistAtomicSnapshotWithAux()` boundary as the other auxiliary stores.
- Remove temporary `_aiEventOutbox` from `D` before persistence.
- Include the previous AI recovery journal in the compensating rollback path.

## Validation

- S2474 targeted: **3/3 PASS**.
- Combined S2473 + S2474: **7/7 PASS**.
- Existing cross-domain replay/idempotency suites remain **67/67 PASS**.
- System Integrity: **7/7 PASS**.
- App-wide: **9/9 PASS**.
- SOT Production Wiring: **PASS**.
- SOT Drift: **6/6 PASS**.
- Patch contamination: **PASS**.

## Scope verdict

**0 gap substantif teridentifikasi pada AI event recovery + backup/restore boundary setelah S2474.**
