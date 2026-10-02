# AUDIT S2322 — UPDATE / MIGRATION / BOOT RECOVERY HARDENING

## Status
**FIXED / VERIFIED — cumulative on S2320 + S2321**

## Recommendations implemented in one stage

### 1. Pre-migration immutable checkpoint
Before any schema migration, the current durable snapshot is copied to a dedicated recovery key:
- `kw_v4_pre_migration_backup`
- IndexedDB primary checkpoint
- localStorage secondary checkpoint

If neither checkpoint can be written, migration is not allowed to start.

### 2. Fail-closed migration safety
The loader now:
- rejects a snapshot whose schema is newer than the running app;
- runs migrations only after a checkpoint exists;
- detects an incomplete migration (`migrationResult < SCHEMA_VERSION`);
- restores the pre-migration in-memory snapshot and enters recovery mode;
- blocks normal boot/write continuation rather than persisting a partially migrated state.

### 3. Runtime upgrade diagnostics
A small non-sensitive metadata record is maintained under `kw_v4_runtime_meta` containing:
- current build version;
- schema version;
- origin;
- previous build version;
- last boot time;
- source used for loading;
- migration-applied flag.

This makes future reports of “data disappeared after update” diagnosable instead of guesswork. No application records are copied into this metadata.

### 4. Bootstrap watchdog
The eager runtime bootstrap now has a 15-second watchdog. A storage/resource hang therefore produces a visible runtime error instead of an apparently frozen/blank application.

### 5. Service Worker cache isolation
Old cache cleanup is now limited to the application's own `kw-cache-*` namespace. The Service Worker no longer deletes unrelated Cache Storage entries on the same origin.

### 6. Regression coverage
Added `tests/s2322-update-recovery-hardening.test.js` covering:
- pre-migration checkpoint;
- future-schema fail-closed behavior;
- partial-migration rollback/recovery;
- runtime build/origin diagnostics;
- bootstrap watchdog;
- scoped Service Worker cache cleanup.

## Verification

- S2320 persistence protection: **3/3 PASS**
- S2321 bootstrap contract: **3/3 PASS**
- S2322 update/recovery hardening: **6/6 PASS**
- Combined selected regression suite: **12/12 PASS**
- Bundle freshness: **PASS / A + B**
- `node --check` on modified production JS/SW: **PASS**
- `persistence-integrity-gate`: **PASS**
- `pwa-recovery-integrity-gate`: **PASS**

## Deployment note
The cumulative patch keeps build `s2041-1-part-sot-hardening-2213` and cache `kw-cache-v2213` to avoid introducing an unnecessary version change during this safety patch.

The audit environment did not have `esbuild` installed and network package installation timed out. Therefore the affected bundle sections were synchronized from the exact source changes and the embedded source hash was refreshed; a normal release environment should still run the project's required `npm install` + `node scripts/build.js --require-minify` before final production deployment.
