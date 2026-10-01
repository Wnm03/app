# A-S2212 — Snapshot ↔ Outbox Durability Ordering

## Scope
Audit race dan ordering antara versioned state snapshot (`_saveStateVersion` / `_saveSnapshotJson`), serialized persistence (`_savePersistChain`), atomic FinanceEventOutbox preparation/marking, stale localStorage fallback, dan restore snapshot invalidation.

## Findings
- No new production durability defect reproduced.
- `_saveStateVersion` invalidates the cached snapshot on mutation/restore.
- `_savePersistChain` serializes persistence writes, preventing an older IDB write from overtaking a newer queued write.
- Atomic state + finance outbox persistence remains guarded by `IDBStore.setMany()` and `FinanceEventOutbox.withPersistenceLock()`.
- Stale localStorage fallback remains restricted to the newest persistence sequence and is additionally blocked while an atomic outbox remains staged.

## Test maintenance
`tests/persistence-stale-fallback-s1765.test.js` was stale: it asserted the historical inline fallback expression. The assertion now verifies the current invariant: newest persistence sequence **and** no pending atomic outbox before localStorage fallback.

This is test-contract maintenance, not a runtime defect fix.

## Result
Targeted S2212/persistence/outbox chain: 8/8 PASS.
