# A-S2210 — Durable Outbox Staged-Event Concurrency Audit

## Scope
Audit crash/concurrency boundary between `FinanceEventOutbox.replay()` and a concurrent atomic mutation that calls `stageBatch()` while an async consumer is still being awaited.

## Finding
A real event-loss race existed. `replay()` held the durable persistence lock, but `stageBatch()` is synchronous and did not use that lock. During an `await AIBus.emitAsync(...)`, a new atomic event could be appended to `staged`. The older replay then executed `staged=[]` after clearing the durable journal, erasing the newer event before its next `save()` could persist it.

## Repair
`replay()` now snapshots the staged events it owns at replay start (`replayStaged` + IDs). After successful delivery it clears only those staged IDs and preserves events staged after replay began. Failed replay likewise leaves newly staged events available for retry.

This keeps the existing persistence lock semantics and does not require making `stageBatch()` asynchronous.

## Validation
- `tests/s2210-outbox-staged-race.test.js`: **3/3 PASS**
- `tests/s2209-outbox-concurrency-race.test.js`: **3/3 PASS**
- `tests/s2208-outbox-storage-failure.test.js`: **4/4 PASS**
- `tests/s2207-atomic-persistence-integration.test.js`: **PASS**
- S2196/S2198/S2199 and S2200–S2206 relevant regression chain: **20/20 test files PASS**
- `tests/s1850-persistence-memory-audit.test.js`: **7/7 PASS** after updating its stale assertion from pre-S2201 `IDBStore.set()` to the current serialized async persistence contract and shared persistence lock.
- Modified source/test files: `node --check` PASS.

## Build note
`npm run build` did not reach source generation because the repository's pre-build version preflight is already inconsistent:
`modules/shared/modules-calc.js` reports `MODULE_CALC_VERSION='s2041-1-part-sot-hardening-2202'` while canonical `oldV` is `s2041-1-part-sot-hardening-2204`. The build reports no files written before aborting. This version mismatch is outside S2210 and was not changed in this checkpoint.
