# S2475 — AI Recovery Journal Snapshot Flush

## Finding

Deep audit of the new `ai:event-outbox:v1` persistence boundary found an async timing gap: `AIBus.emit()` journals consumer failures asynchronously. A backup or restore snapshot could read IndexedDB before that journal write completed, producing a backup missing a newly queued recovery event or allowing restore to race with an in-flight journal write.

## Repair

- Expose `aiEventOutboxFlush()` as an awaitable persistence barrier.
- `buildBackupPayload()` waits for the AI recovery journal writer before reading auxiliary IndexedDB state.
- `applyRestoredData()` waits for the same barrier before taking the current AI journal rollback snapshot.
- Existing serialized enqueue/replay ordering remains unchanged.

## Validation

- S2475 targeted: **3/3 PASS**.
- Combined S2473–S2475: **10/10 PASS**.
- Existing cross-domain replay/idempotency suites: **67/67 PASS**.
- System Integrity: **7/7 PASS**.
- App-wide: **9/9 PASS**.
- SOT Production Wiring: **PASS**.
- SOT Drift: **6/6 PASS**.
- Patch contamination: **PASS**.

## Scope verdict

**0 gap substantif teridentifikasi pada AI recovery journal persistence + backup/restore snapshot boundary setelah S2475.**
