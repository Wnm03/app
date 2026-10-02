# S2311 — Backup/Restore Reality Test

## Status
**CLOSED — AUDIT / TEST ONLY — 0 production logic change**

## Baseline
`app-main (49)` + accumulated S2304–S2310.

## Scope
Audit nyata jalur backup/restore terhadap:
- canonical export `buildBackupPayload()`;
- restore `applyRestoredData()`;
- round-trip JSON stringify/parse;
- repeat restore / idempotency;
- Finance, Vehicle, Service, Shop/Stock, Asset/ownership, Renov/Titipan fields;
- auxiliary IndexedDB stores;
- malformed/legacy/newer backup handling;
- atomic restore, rollback, CAS/cross-tab protection;
- bundle/build inclusion.

## Evidence
### 1. Existing regression suite
Ran:

`node --test tests/backup-restore-regression-s266.test.js tests/s1828-import-identity-restore-gate.test.js tests/s1901-backup-integrity-and-error-safety.test.js tests/s2191-restore-bill-debt-piutang-integrity.test.js tests/s2215-restore-aux-cas.test.js tests/s2216-backup-snapshot-consistency.test.js tests/s2217-cross-tab-restore-convergence.test.js tests/s2220-final-restore-rollback-integrity.test.js tests/sa-l-restore-snapshot-invalidation.test.js tests/service-restore-backup-integrity-p11.test.js`

**Result: 46/46 PASS, 0 fail, 0 skipped.**

Coverage confirms:
- JSON backup round-trip preserves Finance, Asset, Vehicle, Shop, Family and ownership fields;
- stock correction / inventory movement / purchase orders survive backup/restore;
- old schema backups remain compatible;
- malformed restore shapes are rejected before merge;
- newer schema backup requires explicit confirmation;
- backup integrity seal/verify is enforced when available;
- Bill/Debt/Piutang reconciliation runs at restore boundary;
- auxiliary IndexedDB restore is atomic and CAS guarded;
- cross-tab restore conflict does not overwrite the winning tab;
- rollback remains atomic after post-commit failure;
- persistence snapshot cache is invalidated on restore/rollback;
- service↔Finance linkage and historical next-due snapshots are reconciled without creating/deleting records.

### 2. Additional S2311 runtime replay check
A temporary, non-committed test was executed against the real `backup-restore.js` source through the existing test harness.

Scenario:
1. Build a backup from a populated state containing Finance + Renov project + Dana Titipan owner/commitment fields.
2. JSON stringify/parse the backup (simulating an actual downloaded file).
3. Restore into a different target state.
4. Restore the exact same backup a second time.
5. Compare the resulting serialized state and verify IDs/linkages remain singular.

**Result: 24/24 PASS** in the temporary runtime harness, including the new S2311 replay case.

The existing test harness intentionally contains a rollback test whose simulated `init()` throws; its diagnostic output is expected by that test and the test itself passes. It is not a S2311 production failure.

### 3. Source-level atomicity review
`modules/shared/backup-restore.js` currently:
- snapshots current D before restore;
- snapshots auxiliary IndexedDB stores before mutation;
- merges backup data only after shape/integrity/version checks;
- runs migrations and service/financial integrity validation before commit;
- persists D + auxiliary stores through `_persistAtomicSnapshotWithAux()`;
- handles CAS conflict separately and reloads the winning durable state;
- rolls back D + affected auxiliary stores after post-commit failure;
- removes temporary auxiliary payload keys before the final D state;
- does not replay Finance/stock side effects during service reconciliation.

### 4. Backup snapshot consistency
`buildBackupPayload()` reads D plus the four auxiliary stores in one batch, verifies `_saveStateVersion` and writer token stability, and retries/fails closed when the snapshot cannot be proven consistent.

### 5. Build/runtime inclusion
`build.js` explicitly includes `modules/shared/backup-restore.js`.
`app-bundle-b.min.js` contains the current backup/restore implementation, including `buildBackupPayload()` and `applyRestoredData()` markers.

## Finding
**No active backup/restore defect was verified in S2311.**

The current implementation is materially stronger than a simple JSON dump: it has snapshot consistency, integrity verification, migration compatibility, ownership/linkage reconciliation, atomic persistence, CAS conflict handling, and rollback.

No production code, schema, UI, persistence contract, or service-worker change is required by this audit.

## Known separate blocker
The previously recorded S2302 release blockers (version-integrity mismatch / stale bundle freshness / bundle budget / unavailable build toolchain) remain separate from the correctness result of S2311 and are not reopened or modified here.

## Closure
**S2311 CLOSED.**

Production logic changed: **0 files**  
Schema changed: **0 files**  
UI changed: **0 files**  
Persistence logic changed: **0 files**  
Service worker changed: **0 files**
