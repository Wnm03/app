# SA-L — IndexedDB / Persistence Restore Atomicity

## Confirmed finding
`applyRestoredData()` replaces `D` directly and then calls `saveFlush()`. The persistence layer caches the serialized snapshot by `_saveStateVersion`. Before this fix, a direct restore/rollback could leave the mutation version unchanged, so `saveFlush()` could reuse a JSON snapshot created before the restore.

## Fix
- Added `_markPersistenceStateChanged()` in `modules/shared/features-helpers-global-security.js`.
- The helper advances `_saveStateVersion` and invalidates `_saveSnapshotVersion` / `_saveSnapshotJson`.
- `save()` uses the same mutation gate.
- Backup restore explicitly invalidates the persistence snapshot before both successful restore commit and compensating rollback.

## Verification
- `node --check` on both touched source files: PASS.
- `tests/sa-l-restore-snapshot-invalidation.test.js`: PASS.
- `tests/backup-restore-regression-s266.test.js`: PASS.
- `tests/s1850-persistence-memory-audit.test.js`: PASS.
- Combined run: **26/26 PASS**.

## Scope note
This patch changes source/test/docs only. Production minified bundles were not regenerated because the audit environment does not provide the required minifier/esbuild toolchain. No stale bundle was represented as a newly generated build artifact.
